"""T7: compare the model's labels on the 100 held-out reviews with Ayad's hand labels.

Run twice through the same classify step (separate caches, so the second run is a genuinely new sample from the model),
then write an `eval` block into triage.json. Also produces a keyword baseline and a list of disagreements.
Usage: PYTHONPATH=scripts python3 -m triage.evaluate --labels data/eval/to_label.csv --triage data/run/triage.json
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
from collections import Counter
from pathlib import Path

from . import steps
from .claude_runner import ClaudeRunner, preflight


# ---------- Metrics (all plain arithmetic) ----------

def wilson(k: int, n: int, z: float = 1.959964) -> tuple:
    p = k / n
    centre = (p + z * z / (2 * n)) / (1 + z * z / n)
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return max(0.0, centre - half), min(1.0, centre + half)


def kappa(a: list, b: list) -> float:
    """Cohen's kappa: agreement beyond what the two label distributions would give by chance."""
    n = len(a)
    po = sum(x == y for x, y in zip(a, b)) / n
    ca, cb = Counter(a), Counter(b)
    pe = sum(ca[k] * cb[k] for k in set(ca) | set(cb)) / (n * n)
    return 1.0 if pe == 1 else (po - pe) / (1 - pe)


def confusion(truth: list, pred: list, top: list) -> dict:
    """Rows = Ayad's first category, columns = model's first category; anything outside `top` is grouped as 'rest'."""
    f = lambda c: c if c in top else "rest"
    cols = top + ["rest"]
    m = {r: {c: 0 for c in cols} for r in cols}
    for t, p in zip(truth, pred):
        m[f(t)][f(p)] += 1
    return {"labels": cols, "rows": {r: [m[r][c] for c in cols] for r in cols}}


def score(truth: list, model: dict) -> dict:
    """truth: list of dicts with c1, c2, sev, id. model: {id: {categories, severity}}."""
    n = len(truth)
    m1 = [model[t["id"]]["categories"][0] for t in truth]
    hit = sum(m1[i] in (t["c1"], t["c2"]) for i, t in enumerate(truth) if True)
    exact1 = sum(m1[i] == t["c1"] for i, t in enumerate(truth))
    sev_m = [model[t["id"]]["severity"] for t in truth]
    exact = sum(s == t["sev"] for s, t in zip(sev_m, truth))
    within = sum(abs(s - t["sev"]) <= 1 for s, t in zip(sev_m, truth))
    lo, hi = wilson(hit, n)
    return {
        "n": n, "category_agree": hit, "category_agree_ci": [lo, hi], "first_category_exact": exact1,
        "kappa_first_category": kappa([t["c1"] for t in truth], m1),
        "severity_exact": exact, "severity_within_one": within,
        "model_other_share": sum(c == "other" for c in m1) / n, "ayad_other_share": sum(t["c1"] == "other" for t in truth) / n,
        "model_first": m1,
    }


# ---------- Keyword baseline (rules fixed before looking at any eval result) ----------

KEYWORDS = [  # first match wins; order is from most specific to least
    ("security_fraud", r"\b(fraud|scam|hack\w*|unauthori[sz]ed|stolen)\b"),
    ("money_balance", r"\b(debited|deducted|reversal|reversed|balance|refund\w*|missing money|history)\b"),
    ("login_access", r"\b(log ?in|sign ?in|otp|password|pin|locked|register|registration|biometric|fingerprint|verification|verify)\b"),
    ("transfers_payments", r"\b(transfer\w*|transaction\w*|payment\w*|airtime|bill\w*|send money|sending)\b"),
    ("fees_charges", r"\b(charges?|fees?|stamp duty|deduction\w*)\b"),
    ("support", r"\b(customer (care|service|support)|support|complain\w*|no reply|response|branch)\b"),
    ("feature_request", r"\b(please add|should add|add (a|an|the)|i wish|would like|need (a|an) option|feature)\b"),
    ("app_stability", r"\b(crash\w*|slow|freez\w*|hang\w*|network|not working|doesn'?t work|won'?t open|not opening|error|bug\w*|glitch\w*|loading|downtime|lag\w*)\b"),
    ("ui_ux", r"\b(interface|design|layout|update[ds]?|look|navigat\w*|confusing|user friendly)\b"),
    ("praise", r"\b(good|great|nice|best|excellent|love|awesome|fast|easy|amazing|perfect|wonderful|fantastic|better|smooth|seamless|reliable)\b"),
]


def keyword_label(text: str) -> str:
    t = text.lower()
    for cat, pat in KEYWORDS:
        if re.search(pat, t):
            return cat
    return "other"


# ---------- Running ----------

def load_truth(path: Path) -> tuple:
    rows = list(csv.DictReader(open(path, encoding="utf-8", newline="")))
    truth = [{"id": r["id"], "c1": r["my_category_1"], "c2": r["my_category_2"] or None, "sev": int(r["my_severity"]), "notes": r["notes"], "text": r["text"]} for r in rows]
    return truth, [{"id": r["id"], "group": "eval", "rating": None, "text": r["text"]} for r in rows]


def run_model(rows: list, cb: dict, cache: Path, tag: str, log=print) -> dict:
    runner = ClaudeRunner(cache)
    out = steps.classify(rows, cb, runner, log=lambda m: log(f"[{tag}] {m}"))
    if runner.failures or len(out) != len(rows):
        raise SystemExit(f"{tag}: {len(rows) - len(out)} reviews not classified; failures {runner.failures}")
    return out


def build_eval(truth: list, run1: dict, run2: dict, top_n: int = 6) -> dict:
    s1, s2 = score(truth, run1), score(truth, run2)
    top = [c for c, _ in Counter(t["c1"] for t in truth).most_common(top_n)]
    kw = {t["id"]: {"categories": [keyword_label(t["text"])], "severity": 1} for t in truth}
    sk = score(truth, kw)
    m1a, m1b = s1["model_first"], s2["model_first"]
    sev_a = [run1[t["id"]]["severity"] for t in truth]
    sev_b = [run2[t["id"]]["severity"] for t in truth]
    drop = lambda s: {k: v for k, v in s.items() if k != "model_first"}
    return {
        "status": "Done",
        "headline_run": "run 1 (run 2 shown for stability)",
        "n_eval": len(truth),
        "run1": drop(s1), "run2": drop(s2),
        "keyword_baseline": {k: v for k, v in drop(sk).items() if k not in ("severity_exact", "severity_within_one")},
        "confusion_run1": confusion([t["c1"] for t in truth], m1a, top),
        "run_to_run": {
            "first_category_same": sum(a == b for a, b in zip(m1a, m1b)), "kappa": kappa(m1a, m1b),
            "severity_same": sum(a == b for a, b in zip(sev_a, sev_b)), "n": len(truth),
        },
        "ayad_distribution": dict(Counter(t["c1"] for t in truth)),
    }


def disagreements(truth: list, run: dict) -> list:
    out = []
    for t in truth:
        m = run[t["id"]]
        if m["categories"][0] not in (t["c1"], t["c2"]) or abs(m["severity"] - t["sev"]) >= 2:
            out.append({"id": t["id"], "text": t["text"], "ayad": [t["c1"], t["c2"], t["sev"]], "model": [m["categories"], m["severity"]], "ayad_note": t["notes"]})
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--labels", required=True, type=Path)
    ap.add_argument("--triage", required=True, type=Path)
    ap.add_argument("--cache-dir", default="data", type=Path)
    ap.add_argument("--disagreements-out", default="data/eval/disagreements.json", type=Path)
    a = ap.parse_args()
    cb = steps.load_codebook()
    truth, rows = load_truth(a.labels)
    preflight()
    run1 = run_model(rows, cb, a.cache_dir / "cache_eval1", "run1")
    run2 = run_model(rows, cb, a.cache_dir / "cache_eval2", "run2")
    ev = build_eval(truth, run1, run2)
    (a.cache_dir / "eval").mkdir(parents=True, exist_ok=True)
    a.disagreements_out.parent.mkdir(parents=True, exist_ok=True)
    a.disagreements_out.write_text(json.dumps(disagreements(truth, run1), indent=2))
    data = json.loads(a.triage.read_text())
    data["eval"] = ev
    a.triage.write_text(json.dumps(data, indent=2))
    print(json.dumps({k: ev[k] for k in ("run1", "run2", "keyword_baseline", "run_to_run")}, indent=1)[:3000])


if __name__ == "__main__":
    main()

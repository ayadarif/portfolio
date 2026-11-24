"""P4: evaluation v2, computed ONLY from saved runs (data/eval/runs/*.json) and the labels. Never calls the model.

Writes data/eval/eval_v2.json. The CI test re-runs `compute()` and fails if the published numbers change.
Usage: PYTHONPATH=scripts python3 -m triage.eval_v2
"""
from __future__ import annotations

import csv
import json
import math
import random
from collections import Counter
from pathlib import Path

from .evaluate import kappa, wilson

D = Path("data")
RUNS = ["run1", "run2", "run3", "run4", "run5"]
SEED = 20261124
BOOT = 2000
TOP_QUEUE_THRESHOLD = 5  # a review needs a human unless all 5 runs agree on the first category


def load_truth(path: Path = D / "eval/to_label.csv") -> list:
    return [{"id": r["id"], "c1": r["my_category_1"], "c2": r["my_category_2"] or None, "sev": int(r["my_severity"])}
            for r in csv.DictReader(open(path, encoding="utf-8", newline=""))]


def load_run(tag: str) -> dict:
    return json.loads((D / f"eval/runs/{tag}.json").read_text())


# ---------- metrics ----------

def weighted_kappa(a: list, b: list, cats=(1, 2, 3)) -> float:
    """Quadratic-weighted kappa for the ordinal severity score."""
    n = len(a)
    k = len(cats)
    w = lambda i, j: ((i - j) / (k - 1)) ** 2
    ca, cb = Counter(a), Counter(b)
    obs = sum(w(x - 1, y - 1) for x, y in zip(a, b)) / n
    exp = sum(w(i, j) * ca[i + 1] * cb[j + 1] for i in range(k) for j in range(k)) / (n * n)
    return 1.0 if exp == 0 else 1 - obs / exp


def krippendorff_alpha_nominal(units: list) -> float:
    """units: list of lists of values (one list per review; missing raters simply left out). Nominal Krippendorff's alpha."""
    units = [u for u in units if len(u) >= 2]
    n = sum(len(u) for u in units)
    if n <= 1:
        return float("nan")
    do = 0.0
    for u in units:
        m = len(u)
        c = Counter(u)
        do += (m * m - sum(v * v for v in c.values())) / (m - 1)
    do /= n
    tot = Counter(v for u in units for v in u)
    de = (n * n - sum(v * v for v in tot.values())) / (n * (n - 1))
    return 1.0 if de == 0 else 1 - do / de


def prf(truth_c1: list, pred_c1: list) -> dict:
    out = {}
    for c in sorted(set(truth_c1) | set(pred_c1)):
        tp = sum(t == c and p == c for t, p in zip(truth_c1, pred_c1))
        fp = sum(t != c and p == c for t, p in zip(truth_c1, pred_c1))
        fn = sum(t == c and p != c for t, p in zip(truth_c1, pred_c1))
        pr = tp / (tp + fp) if tp + fp else None
        rc = tp / (tp + fn) if tp + fn else None
        f1 = 2 * pr * rc / (pr + rc) if pr and rc else (0.0 if (pr is not None and rc is not None) else None)
        out[c] = {"support": tp + fn, "predicted": tp + fp, "precision": pr, "recall": rc, "f1": f1}
    return out


def jaccard_two_label(truth: list, model: dict) -> dict:
    """Over reviews where Ayad gave two categories: mean overlap of his set and the model's set."""
    sc = [len({t["c1"], t["c2"]} & set(model[t["id"]]["categories"])) / len({t["c1"], t["c2"]} | set(model[t["id"]]["categories"]))
          for t in truth if t["c2"]]
    return {"n": len(sc), "mean_jaccard": sum(sc) / len(sc) if sc else None}


def boot_ci(n: int, stat, seed: int = SEED, b: int = BOOT) -> list:
    """Percentile bootstrap over review indices; stat(idx_list) -> float."""
    rng = random.Random(seed)
    vals = sorted(stat([rng.randrange(n) for _ in range(n)]) for _ in range(b))
    vals = [v for v in vals if v == v]
    return [vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals)) - 1]]


def round_tree(x, nd=4):
    if isinstance(x, float):
        return round(x, nd)
    if isinstance(x, dict):
        return {k: round_tree(v, nd) for k, v in x.items()}
    if isinstance(x, list):
        return [round_tree(v, nd) for v in x]
    return x


# ---------- the report ----------

def compute(peer_path: Path = D / "eval/peer_labelled.csv") -> dict:
    truth = load_truth()
    ids = [t["id"] for t in truth]
    runs = {t: load_run(t)["labels"] for t in RUNS}
    n = len(truth)
    t1 = [t["c1"] for t in truth]
    tsev = [t["sev"] for t in truth]

    def agree(lab: dict, idx=None):
        idx = idx if idx is not None else range(n)
        return sum(lab[ids[i]]["categories"][0] in (truth[i]["c1"], truth[i]["c2"]) for i in idx) / len(idx)

    def kap(lab: dict, idx):
        return kappa([t1[i] for i in idx], [lab[ids[i]]["categories"][0] for i in idx])

    per_run = {}
    for tag, lab in runs.items():
        k = sum(lab[ids[i]]["categories"][0] in (truth[i]["c1"], truth[i]["c2"]) for i in range(n))
        sev = [lab[i]["severity"] for i in ids]
        per_run[tag] = {
            "agree_either": k, "agree_either_wilson": list(wilson(k, n)),
            "agree_either_boot": boot_ci(n, lambda ix, l=lab: agree(l, ix)),
            "first_exact": sum(lab[ids[i]]["categories"][0] == t1[i] for i in range(n)),
            "kappa": kap(lab, list(range(n))), "kappa_boot": boot_ci(n, lambda ix, l=lab: kap(l, ix)),
            "severity_exact": sum(a == b for a, b in zip(sev, tsev)),
            "severity_weighted_kappa": weighted_kappa(tsev, sev),
            "severity_wk_boot": boot_ci(n, lambda ix, s=sev: weighted_kappa([tsev[i] for i in ix], [s[i] for i in ix])),
        }
    pooled_pred = [runs["run1"][i]["categories"][0] for i in ids]
    # repeated-run agreement as uncertainty
    first = {i: [runs[t][i]["categories"][0] for t in RUNS] for i in ids}
    modal = {i: Counter(v).most_common(1)[0] for i, v in first.items()}
    curve = []
    for thr in (3, 4, 5):
        kept = [i for i in range(n) if modal[ids[i]][1] >= thr]
        ok = sum(modal[ids[i]][0] in (truth[i]["c1"], truth[i]["c2"]) for i in kept)
        curve.append({"min_runs_agreeing": thr, "kept": len(kept), "coverage": len(kept) / n, "accuracy_when_kept": ok / len(kept) if kept else None,
                      "needs_human": n - len(kept)})
    # pairwise run-to-run kappa, the noise floor for the batch test
    pair = [kappa([runs[a][i]["categories"][0] for i in ids], [runs[b][i]["categories"][0] for i in ids]) for ai, a in enumerate(RUNS) for b in RUNS[ai + 1:]]
    out = {
        "n_eval": n, "runs": RUNS, "per_run": per_run,
        "per_category_run1": prf(t1, pooled_pred),
        "jaccard_two_label_run1": jaccard_two_label(truth, runs["run1"]),
        "repeat_agreement": {"curve": curve, "queue_rule": f"needs a human unless all {TOP_QUEUE_THRESHOLD} runs agree on the first category",
                             "run_to_run_kappa_min": min(pair), "run_to_run_kappa_max": max(pair)},
    }
    # batch contamination
    b1, b25 = load_run("b1")["labels"], load_run("b25s")["labels"]
    def cmp(lab):
        return {"agree_either": sum(lab[ids[i]]["categories"][0] in (truth[i]["c1"], truth[i]["c2"]) for i in range(n)),
                "kappa_vs_ayad": kap(lab, list(range(n))),
                "same_first_as_run1": sum(lab[i]["categories"][0] == runs["run1"][i]["categories"][0] for i in ids),
                "kappa_vs_run1": kappa([runs["run1"][i]["categories"][0] for i in ids], [lab[i]["categories"][0] for i in ids]),
                "severity_same_as_run1": sum(lab[i]["severity"] == runs["run1"][i]["severity"] for i in ids)}
    out["batch_test"] = {"batch_1": cmp(b1), "batch_25_shuffled": cmp(b25), "batch_25_original_runs_1_to_5_kappa_vs_ayad": [per_run[t]["kappa"] for t in RUNS]}
    # injection
    inj_run = load_run("inject")
    inj = json.loads((D / "eval/injection_set.json").read_text())
    exp = {x["id"]: x["expected_category"] for x in inj}
    got = {i: inj_run["labels"][i] for i in exp}
    real_ids = [i for i in inj_run["labels"] if i not in exp]
    out["injection"] = {
        "n": len(inj), "schema_valid_batches": 3 - len(inj_run["failures"]), "batches": 3,
        "first_category_as_expected": sum(got[i]["categories"][0] == exp[i] for i in exp),
        "label_changed": [i for i in exp if got[i]["categories"][0] != exp[i]],
        "ids_in_output_match_input": sorted(inj_run["labels"]) == sorted(inj_run["order"]),
        "real_neighbours": len(real_ids),
        "neighbours_first_category_same_as_run1": sum(inj_run["labels"][i]["categories"][0] == runs["run1"][i]["categories"][0] for i in real_ids),
        "neighbours_severity_same_as_run1": sum(inj_run["labels"][i]["severity"] == runs["run1"][i]["severity"] for i in real_ids),
        "summaries_to_read": {i: got[i]["summary"] for i in exp},
    }
    # cost and latency
    calls = {t: load_run(t) for t in ["run3", "run4", "run5", "b25s", "inject", "b1"]}
    def agg(rec):
        c = rec["calls"]
        return {"live_calls": len(c), "latency_median_s": sorted(x["latency_s"] for x in c)[len(c) // 2], "latency_total_s": round(sum(x["latency_s"] for x in c), 1),
                "output_tokens": sum(x["output_tokens"] or 0 for x in c), "input_tokens_uncached": sum(x["input_tokens"] or 0 for x in c),
                "cache_read_tokens": sum(x["cache_read_tokens"] or 0 for x in c), "cache_creation_tokens": sum(x["cache_creation_tokens"] or 0 for x in c),
                "api_equivalent_estimate_usd": round(sum(x["total_cost_usd_estimate"] or 0 for x in c), 4)}
    out["cost_latency"] = {t: agg(r) for t, r in calls.items()}
    tot = [agg(r) for r in calls.values()]
    out["cost_latency"]["total"] = {"live_calls": sum(x["live_calls"] for x in tot), "api_equivalent_estimate_usd": round(sum(x["api_equivalent_estimate_usd"] for x in tot), 4)}
    out["cost_latency"]["note"] = "API-equivalent estimate from Claude Code; actual marginal spend $0 on a Max subscription."
    # human ceiling
    model_first = {i: runs["run1"][i]["categories"][0] for i in ids}
    builder = {t["id"]: t["c1"] for t in truth}
    if peer_path.exists():
        peer = {r["id"]: r["category_1"].strip() for r in csv.DictReader(open(peer_path, encoding="utf-8", newline="")) if r["category_1"].strip()}
        pids = sorted(peer)
        units = [[builder[i], peer[i], model_first[i]] for i in pids]
        def alpha_idx(ix):
            return krippendorff_alpha_nominal([units[j] for j in ix])
        def pair_kappa(a, b, ix):
            return kappa([a[pids[j]] for j in ix], [b[pids[j]] for j in ix])
        allx = list(range(len(pids)))
        rows = {"builder_vs_peer": (builder, peer), "model_vs_builder": (model_first, builder), "model_vs_peer": (model_first, peer)}
        out["human_ceiling"] = {"status": "Done", "n": len(pids), "alpha_all_three": alpha_idx(allx), "alpha_boot": boot_ci(len(pids), alpha_idx),
                                "pairs": {k: {"kappa": pair_kappa(a, b, allx), "boot": boot_ci(len(pids), lambda ix, a=a, b=b: pair_kappa(a, b, ix)),
                                              "agree": sum(a[pids[j]] == b[pids[j]] for j in allx) / len(pids)} for k, (a, b) in rows.items()}}
    else:
        out["human_ceiling"] = {"status": "Second labeller in progress"}
    ay = Path(D / "eval/error_analysis.csv")
    with open(ay, encoding="utf-8", newline="") as fh:
        notes = list(csv.DictReader(fh)) if ay.exists() else []
    out["error_analysis"] = {"status": "Done" if notes and all(r["what_went_wrong_open_code"].strip() for r in notes) else "Error analysis by Ayad in progress", "rows": len(notes)}
    out["criteria_drift"] = "No codebook changes were made after seeing model output. Codebook v1 (2026-11-24) was fixed before labelling; the prompt hash is recorded in every run file."
    return round_tree(out)


if __name__ == "__main__":
    res = compute()
    (D / "eval/eval_v2.json").write_text(json.dumps(res, indent=1))
    print(json.dumps({k: res[k] for k in ("per_run", "batch_test", "injection", "repeat_agreement") if k in res}, indent=1)[:200])
    print("written")

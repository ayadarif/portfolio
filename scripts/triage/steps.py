"""The pipeline steps. Each LLM step takes a callable `llm(system, user, schema, validate, label)`, so tests can pass a fake."""
from __future__ import annotations

import csv
import hashlib
import json
import random
import re
from collections import defaultdict
from pathlib import Path
from typing import Callable

from . import schemas
from .pii import strip_pii

HERE = Path(__file__).parent
BATCH = 25
THEME_CAP = 150
TOP_THEME_CATEGORIES = 5
EXCERPTS_PER_CATEGORY = 3
EXCERPT_CANDIDATES = 8
EXCERPT_CATEGORIES_PER_GROUP = 5
MAX_QUOTE = 200

# Excerpts we never publish: fraud or theft claims, and people named with a title.
UNSAFE_QUOTE = re.compile(r"\b(fraud\w*|scam\w*|thie[fv]\w*|stole\w*|steal\w*|419|yahoo\s*boys?)\b|\b(?:mr|mrs|miss|ms|dr)\.?\s+[A-Z][a-z]+|\[[A-Z]+\]", re.I)


# ---------- Codebook and prompts ----------

def load_codebook(path: "Path | None" = None) -> dict:
    return json.loads((path or HERE / "codebook.json").read_text())


def slugs(cb: dict) -> list:
    return [c["slug"] for c in cb["categories"]]


def prompt_text(name: str) -> str:
    return (HERE / "prompts" / name).read_text()


def classify_system(cb: dict) -> str:
    cats = "\n".join(f"- {c['slug']}: {c['means']}" for c in cb["categories"])
    ties = "\n".join(f"{i}. {t}" for i, t in enumerate(cb["tie_breaks"], 1))
    sev = "\n".join(f"{k} = {v}" for k, v in cb["severity"].items())
    return prompt_text("classify.md").format(categories=cats, tie_breaks=ties, severity=sev, severity_rule=cb["severity_rule"])


def prompt_hash(cb: dict) -> str:
    h = hashlib.sha256()
    for n in ("classify.md", "theme.md", "excerpts.md"):
        h.update(prompt_text(n).encode())
    h.update(json.dumps(cb, sort_keys=True).encode())
    return h.hexdigest()[:16]


# ---------- Step 1: ingest ----------

def load_input(path: Path, text_col: str, rating_col: "str | None" = None, group_col: "str | None" = None,
               id_col: "str | None" = None, min_chars: int = 20, max_reviews: int = 1000, seed: int = 1) -> list:
    """Any CSV with a text column. Strips personal data, drops very short rows, samples down to max_reviews."""
    with open(path, encoding="utf-8-sig", newline="") as f:
        rd = csv.DictReader(f)
        if text_col not in (rd.fieldnames or []):
            raise ValueError(f"Column {text_col!r} not in {rd.fieldnames}")
        raw = list(rd)
    rows = []
    for n, r in enumerate(raw, 1):
        text = " ".join((r.get(text_col) or "").split())
        if len(text) < min_chars:
            continue
        text, _ = strip_pii(text)
        rating = r.get(rating_col) if rating_col else None
        try:
            rating = float(rating) if rating not in (None, "") else None
        except ValueError:
            rating = None
        rows.append({"id": (r.get(id_col) if id_col else None) or f"r{n:05d}", "group": (r.get(group_col) or "all") if group_col else "all",
                     "rating": rating, "text": text})
    if len(rows) > max_reviews:
        rows = sorted(random.Random(seed).sample(rows, max_reviews), key=lambda r: r["id"])
    return rows


def read_ids(path: Path) -> set:
    with open(path, encoding="utf-8-sig", newline="") as f:
        return {r["id"] for r in csv.DictReader(f)}


# ---------- Step 2: classify ----------

def classify(rows: list, cb: dict, llm: Callable, log: Callable = print) -> dict:
    """Returns {id: {categories, severity, summary}} for every review that got a valid answer."""
    sl = slugs(cb)
    system, schema = classify_system(cb), schemas.classify_schema(sl)
    out: dict = {}
    for b in range(0, len(rows), BATCH):
        batch = rows[b:b + BATCH]
        ids = [r["id"] for r in batch]
        user = "<data>\n" + "\n".join(f"[{r['id']}] {r['text']}" for r in batch) + "\n</data>"
        label = f"classify {b // BATCH + 1}/{-(-len(rows) // BATCH)}"
        res = llm(system, user, schema, lambda o, ids=ids: schemas.check_classify(o, ids, sl), label)
        if res:
            for it in res["items"]:
                out[it["id"]] = {"categories": it["categories"], "severity": it["severity"], "summary": it["summary"].strip()}
        log(f"{label}: {'ok' if res else 'FAILED'}")
    return out


# ---------- Step 4: count and rank (code only) ----------

def rank(rows: list, labels: dict, cb: dict) -> dict:
    """Per group and category: count, share, average rating, average severity, priority (severity points per 100 reviews)."""
    unranked = set(cb["unranked"])
    by_group: dict = defaultdict(list)
    for r in rows:
        if r["id"] in labels:
            by_group[r["group"]].append(r)
    result = {}
    for g, rs in sorted(by_group.items()):
        n = len(rs)
        stats: dict = {}
        for r in rs:
            lab = labels[r["id"]]
            for c in lab["categories"]:
                s = stats.setdefault(c, {"count": 0, "sev": 0, "sev3": 0, "ratings": []})
                s["count"] += 1
                s["sev"] += lab["severity"]
                s["sev3"] += lab["severity"] == 3
                if r["rating"] is not None:
                    s["ratings"].append(r["rating"])
        cats = []
        for c, s in stats.items():
            share = s["count"] / n
            avg_sev = s["sev"] / s["count"]
            cats.append({
                "category": c, "count": s["count"], "share": share, "avg_rating": (sum(s["ratings"]) / len(s["ratings"])) if s["ratings"] else None,
                "avg_severity": avg_sev, "severity3_count": s["sev3"], "priority": share * avg_sev * 100,
                "ranked": c not in unranked,
            })
        ranked = sorted((c for c in cats if c["ranked"]), key=lambda c: (-c["priority"], c["category"]))
        for i, c in enumerate(ranked, 1):
            c["rank"] = i
        result[g] = {"n_reviews": n, "categories": sorted(cats, key=lambda c: (c["rank"] if c["ranked"] else 99, c["category"])),
                     "robustness": robustness(ranked)}
    return result


def robustness(ranked: list, k: int = 3) -> dict:
    by_pri = [c["category"] for c in ranked][:k]
    by_count = [c["category"] for c in sorted(ranked, key=lambda c: (-c["count"], c["category"]))][:k]
    by_sev3 = [c["category"] for c in sorted(ranked, key=lambda c: (-c["severity3_count"], c["category"]))][:k]
    return {"top3_priority": by_pri, "top3_count": by_count, "top3_severity3": by_sev3,
            "same_set_by_count": set(by_pri) == set(by_count), "same_set_by_severity3": set(by_pri) == set(by_sev3),
            "holds": set(by_pri) == set(by_count) == set(by_sev3)}


# ---------- Step 3: themes ----------

def themes(rows: list, labels: dict, ranking: dict, cb: dict, llm: Callable, seed: int = 1, log: Callable = print, top: int = TOP_THEME_CATEGORIES) -> dict:
    """For each of the top categories overall, ask for named themes. Returns {category: [{name, description, size, by_group}]}."""
    unranked = set(cb["unranked"])
    totals: dict = defaultdict(int)
    for g in ranking.values():
        for c in g["categories"]:
            if c["category"] not in unranked:
                totals[c["category"]] += c["count"]
    top = [c for c, _ in sorted(totals.items(), key=lambda kv: (-kv[1], kv[0]))][:top]
    group_of = {r["id"]: r["group"] for r in rows}
    out = {}
    for cat in top:
        ids = sorted(i for i, lab in labels.items() if cat in lab["categories"])
        if len(ids) > THEME_CAP:
            ids = sorted(random.Random(seed).sample(ids, THEME_CAP))
        user = f"Category: {cat}\n<data>\n" + "\n".join(f"[{i}] {labels[i]['summary']}" for i in ids) + "\n</data>"
        res = llm(prompt_text("theme.md"), user, schemas.THEME_SCHEMA, lambda o, v=set(ids): schemas.check_themes(o, v), f"themes {cat}")
        log(f"themes {cat}: {'ok' if res else 'FAILED'} ({len(ids)} summaries)")
        if not res:
            continue
        out[cat] = []
        for t in res["themes"]:
            by_group: dict = defaultdict(int)
            for i in t["ids"]:
                by_group[group_of[i]] += 1
            out[cat].append({"name": t["name"].strip(), "description": t["description"].strip(), "size": len(t["ids"]), "by_group": dict(by_group)})
        out[cat].sort(key=lambda t: -t["size"])
    return out


# ---------- Step 5: excerpts ----------

def _norm(s: str) -> str:
    return " ".join(s.split())


def verify_quote(quote: str, review: dict, category: str, labels: dict) -> bool:
    """A quote is kept only if it is verbatim, short, safe, and from a review labelled with that category."""
    q = _norm(quote)
    return bool(q) and len(q) <= MAX_QUOTE and q in _norm(review["text"]) and category in labels[review["id"]]["categories"] and not UNSAFE_QUOTE.search(q)


def excerpts(rows: list, labels: dict, ranking: dict, cb: dict, llm: Callable, log: Callable = print, max_groups: "int | None" = None) -> dict:
    """{group: {category: [{id, quote}]}}. The model chooses; code verifies every quote against the original text."""
    skip = set(cb["no_excerpts"])
    out: dict = {}
    for g, info in list(ranking.items())[:max_groups]:
        cats = [c["category"] for c in info["categories"] if c["ranked"] and c["category"] not in skip][:EXCERPT_CATEGORIES_PER_GROUP]
        grp = [r for r in rows if r["group"] == g and r["id"] in labels]
        blocks, cand_ids = [], {}
        for cat in cats:
            cands = [r for r in grp if cat in labels[r["id"]]["categories"] and len(r["text"]) <= 300 and not UNSAFE_QUOTE.search(r["text"])]
            cands.sort(key=lambda r: (-labels[r["id"]]["severity"], len(r["text"]), r["id"]))
            cands = cands[:EXCERPT_CANDIDATES]
            cand_ids[cat] = {r["id"]: r for r in cands}
            blocks.append(f"## {cat}\n" + "\n".join(f"[{r['id']}] {r['text']}" for r in cands))
        out[g] = {}
        if not cats:
            continue
        user = "<data>\n" + "\n\n".join(blocks) + "\n</data>"
        res = llm(prompt_text("excerpts.md"), user, schemas.EXCERPT_SCHEMA, schemas.check_excerpts, f"excerpts {g}")
        log(f"excerpts {g}: {'ok' if res else 'FAILED'}")
        if not res:
            continue
        for c in res["categories"]:
            cat = c["category"]
            if cat not in cand_ids:
                continue
            kept = []
            for q in c["quotes"]:
                rev = cand_ids[cat].get(q["id"])
                if rev and verify_quote(q["quote"], rev, cat, labels) and all(k["id"] != q["id"] for k in kept):
                    kept.append({"id": q["id"], "quote": _norm(q["quote"])})
            out[g][cat] = kept[:EXCERPTS_PER_CATEGORY]
    return out


# ---------- Run it all ----------

def run_pipeline(rows: list, cb: dict, llm: Callable, seed: int = 1, do_themes: bool = True, do_excerpts: bool = True, log: Callable = print,
                 theme_top: int = TOP_THEME_CATEGORIES, excerpt_groups: "int | None" = None) -> dict:
    labels = classify(rows, cb, llm, log)
    ranking = rank(rows, labels, cb)
    th = themes(rows, labels, ranking, cb, llm, seed, log, theme_top) if do_themes else {}
    ex = excerpts(rows, labels, ranking, cb, llm, log, excerpt_groups) if do_excerpts else {}
    return {"labels": labels, "ranking": ranking, "themes": th, "excerpts": ex, "unclassified": sorted(r["id"] for r in rows if r["id"] not in labels)}

"""P4: prepare the two sheets only Ayad and a second labeller can fill in. Never writes labels or a taxonomy.

  data/eval/peer_to_label.csv    50 of the 100 eval reviews (fixed seed), text only: no labels, no model output, no stars, no bank
  data/eval/error_analysis.csv   the run-1 first-category disagreements plus 30 random non-eval reviews with the model's output,
                                 and empty columns for Ayad's open-code notes
Usage: PYTHONPATH=scripts python3 -m triage.prepare_human_sheets
"""
from __future__ import annotations

import csv
import json
import random
from pathlib import Path

from . import steps
from .claude_runner import ClaudeRunner

SEED = 20261124
D = Path("data")


def main() -> None:
    eval_rows = list(csv.DictReader(open(D / "eval/to_label.csv", encoding="utf-8", newline="")))
    rng = random.Random(SEED)
    peer = sorted(rng.sample(eval_rows, 50), key=lambda r: r["id"])
    with open(D / "eval/peer_to_label.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "text", "category_1", "category_2", "severity", "notes"])
        for r in peer:
            w.writerow([r["id"], r["text"], "", "", "", ""])

    run1 = json.loads((D / "eval/runs/run1.json").read_text())["labels"]
    mine = {r["id"]: r for r in eval_rows}
    dis = []
    for r in eval_rows:  # first-category disagreements, same rule as the published score
        if run1[r["id"]]["categories"][0] not in (r["my_category_1"], r["my_category_2"] or None):
            dis.append((r["id"], "eval disagreement", r["text"], run1[r["id"]]))
    cb = steps.load_codebook()
    held = steps.read_ids(D / "eval/to_label.csv")
    rows = [r for r in steps.load_input(D / "corpus.csv", "text", "score", "bank", "id", max_reviews=1000, seed=1) if r["id"] not in held]
    runner = ClaudeRunner(D / "cache")  # every batch is already cached; this must not make live calls
    labels = steps.classify(rows, cb, runner, log=lambda m: None)
    if runner.live_calls:
        raise SystemExit("unexpected live calls; cache did not match")
    extra = random.Random(SEED + 1).sample(sorted(labels), 30)
    texts = {r["id"]: r["text"] for r in rows}
    sample = [(i, "random non-eval output", texts[i], labels[i]) for i in sorted(extra)]
    with open(D / "eval/error_analysis.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "source", "text", "model_categories", "model_severity", "model_summary",
                    "ayad_label_if_eval", "what_went_wrong_open_code", "ayad_notes"])
        for i, src, text, m in dis + sample:
            ay = f"{mine[i]['my_category_1']}/{mine[i]['my_category_2']}/sev{mine[i]['my_severity']}" if i in mine else ""
            w.writerow([i, src, text, "|".join(m["categories"]), m["severity"], m["summary"], ay, "", ""])
    print(f"peer sheet: {len(peer)} rows; error analysis: {len(dis)} disagreements + {len(sample)} random = {len(dis) + len(sample)} rows")


if __name__ == "__main__":
    main()

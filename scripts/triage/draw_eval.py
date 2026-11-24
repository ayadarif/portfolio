"""Draw the 100-review eval set from the corpus, stratified by star rating, and write the labelling sheet.

The sheet hides the star rating and the bank so they do not nudge the labels. The mapping stays in data/corpus.csv.
Run once. Re-running with the same seed gives the same sheet, and it refuses to overwrite a sheet that exists.
Usage: python3 -m triage.draw_eval --corpus ../data/corpus.csv --out ../data/eval/to_label.csv
"""
import argparse
import csv
import random
from pathlib import Path

SEED = 20261125
QUOTA = {"1": 30, "2": 15, "3": 15, "4": 15, "5": 25}  # 100 in total; not proportional, so rarer ratings get enough reviews


def draw(rows: list[dict], seed: int = SEED, quota: dict = QUOTA) -> list[dict]:
    rng = random.Random(seed)
    picked = []
    for star, k in quota.items():
        pool = sorted((r for r in rows if r["score"] == star), key=lambda r: r["id"])
        picked += rng.sample(pool, k)
    rng.shuffle(picked)  # so the order does not reveal the rating
    return picked


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()
    if a.out.exists():
        raise SystemExit(f"{a.out} exists; refusing to overwrite (labels may be in it).")
    rows = list(csv.DictReader(open(a.corpus, encoding="utf-8", newline="")))
    picked = draw(rows)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "text", "my_category_1", "my_category_2", "my_severity", "notes"])
        for r in picked:
            w.writerow([r["id"], r["text"], "", "", "", ""])
    print(len(picked), "reviews written to", a.out)


if __name__ == "__main__":
    main()

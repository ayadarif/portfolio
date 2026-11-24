"""Step 1: load review CSVs, filter, strip personal data, sample with a fixed seed, write a clean CSV.

Usage (demo dataset):
    python3 -m triage.ingest --raw ../data/raw --out ../data/corpus.csv
Run from the scripts/ folder, or set PYTHONPATH=scripts.
"""
import argparse
import csv
import random
from pathlib import Path

from .pii import strip_pii

# Bank name -> file, chosen by 2023 review count (see decisions.md).
DEMO_BANKS = {"UBA": "uba_reviews.csv", "Access Bank": "access_reviews.csv", "First Bank (FBN)": "fbn_reviews.csv"}
YEAR = "2023"
MIN_CHARS = 20
SEED = 20261124
PER_BANK = 334  # 334 + 333 + 333 = 1,000


def load_bank(path: Path, bank: str, year: str, min_chars: int) -> list[dict]:
    out = []
    with open(path, encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            text = (r.get("content") or "").strip()
            if r.get("year") != year or len(text) < min_chars:
                continue
            out.append({"bank": bank, "year": r["year"], "score": r["score"], "text": text})
    return out


def sample_corpus(raw: Path, seed: int = SEED, per_bank: int = PER_BANK) -> tuple[list[dict], dict]:
    rng = random.Random(seed)
    rows, pool = [], {}
    for i, (bank, fname) in enumerate(DEMO_BANKS.items()):
        eligible = load_bank(raw / fname, bank, YEAR, MIN_CHARS)
        pool[bank] = len(eligible)
        take = per_bank - (1 if i > 0 else 0)
        rows += rng.sample(eligible, take)
    stripped = 0
    for n, r in enumerate(rows, 1):
        r["text"], k = strip_pii(r["text"])
        stripped += k
        r["id"] = f"r{n:04d}"
    return rows, {"eligible_per_bank": pool, "pii_substitutions": stripped}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    a = ap.parse_args()
    rows, info = sample_corpus(a.raw)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    with open(a.out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["id", "bank", "year", "score", "text"])
        w.writeheader()
        w.writerows(rows)
    print(len(rows), "reviews written;", info)


if __name__ == "__main__":
    main()

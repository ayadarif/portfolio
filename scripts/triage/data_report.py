"""Measure the sampled corpus: rating mix, date range, length, language mix. Prints markdown tables.

Language is a rough heuristic (no language-detection dependency): a review is "mostly English" if at least
25% of its words are common English function words, "Pidgin or code-mixed" if it has Nigerian Pidgin markers,
and "short or unclear" otherwise (very short, few function words, emoji only or non-Latin script; spot checks show these are almost all short English).
"""
import argparse
import csv
import re
import statistics
from collections import Counter
from pathlib import Path

EN = set("the a an is are was were to of and in it its for my this that not i you me on with but have has had be can your when so do does no am as at by or if we they he she there what why how all from will would could just been very too even only often always never keep keeps cannot cant dont doesnt im ive it's i'm i've".split())
PIDGIN = set("abeg dey wahala na una oga sef wey wetin sha shey abi nau".split())


def language(text: str) -> str:
    words = re.findall(r"[a-z']+", text.lower())
    if len(words) < 3:
        return "short or unclear"
    if sum(w in PIDGIN for w in words) >= 2:
        return "Pidgin or code-mixed"
    return "mostly English" if sum(w in EN for w in words) / len(words) >= 0.25 else "short or unclear"


def table(counter: Counter, total: int, label: str) -> str:
    lines = [f"| {label} | Reviews | Share |", "|---|---|---|"]
    for k, v in sorted(counter.items(), key=lambda kv: str(kv[0])):
        lines.append(f"| {k} | {v} | {v / total:.1%} |")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--corpus", required=True, type=Path)
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.corpus, encoding="utf-8", newline="")))
    n = len(rows)
    lens = [len(r["text"]) for r in rows]
    print(f"Reviews: {n}\nYears: {sorted({r['year'] for r in rows})}\nLength (characters): median {statistics.median(lens):.0f}, mean {statistics.mean(lens):.0f}, min {min(lens)}, max {max(lens)}\n")
    print(table(Counter(r["bank"] for r in rows), n, "Bank"), "\n")
    print(table(Counter(r["score"] for r in rows), n, "Stars"), "\n")
    print(table(Counter(language(r["text"]) for r in rows), n, "Language (heuristic)"))
    print("\nBy bank, share of 1 and 2 star reviews:")
    for b in sorted({r["bank"] for r in rows}):
        sub = [r for r in rows if r["bank"] == b]
        print(f"- {b}: {sum(r['score'] in ('1','2') for r in sub) / len(sub):.1%} of {len(sub)}")


if __name__ == "__main__":
    main()

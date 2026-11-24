"""P1: the live-run block. Needs `claude -p` on a claude.ai login (never an API key).

Runs, on the 100 held-out eval reviews:
  run1, run2   existing caches (free)         run3, run4, run5   three new repeat runs, batch 25, original order
  b25s         batch 25, shuffled order       b1                 batch size 1, original order
  inject       15 synthetic injection reviews mixed into 3 batches of 25 with 20 real eval reviews each
Every result is written to data/eval/runs/<tag>.json (labels, per-call tokens, latency, Claude Code cost estimate).
Those files are committed, so later analysis and CI replay from them and never call the model.
Usage: PYTHONPATH=scripts python3 -m triage.live_runs [--only run3 b1 ...]
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from . import steps
from .claude_runner import ClaudeRunner, preflight
from .evaluate import load_truth

DATA = Path("data")
OUT = DATA / "eval" / "runs"
SHUFFLE_SEED = 20261124
INJECT_PER_BATCH = 5
TAGS = ["run1", "run2", "run3", "run4", "run5", "b25s", "inject", "b1"]
CACHE_DIR = {"run1": "cache_eval1", "run2": "cache_eval2", "run3": "cache_eval3", "run4": "cache_eval4", "run5": "cache_eval5",
             "b25s": "cache_b25s", "inject": "cache_inject", "b1": "cache_b1"}


def save(tag: str, desc: str, env: dict, runner: ClaudeRunner, labels: dict, order: list, extra: dict | None = None) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rec = {
        "tag": tag, "description": desc, "saved_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "claude_code_version": env["claude_code_version"], "model": env["model"], "auth_method": env["auth_method"],
        "prompt_hash": steps.prompt_hash(steps.load_codebook()), "order": order, "labels": labels,
        "live_calls": runner.live_calls, "cache_hits": runner.cache_hits, "failures": runner.failures, "calls": runner.calls,
        "cost_note": "total_cost_usd_estimate is Claude Code's API-equivalent estimate; actual marginal spend is $0 on a Max subscription.",
        **(extra or {}),
    }
    (OUT / f"{tag}.json").write_text(json.dumps(rec, indent=1))


def injection_batches(rows: list, inj: list) -> tuple:
    """3 batches: each has 5 injected reviews placed at fixed spots among 20 real eval reviews (disjoint slices)."""
    rng = random.Random(SHUFFLE_SEED)
    real = rows[:]
    rng.shuffle(real)
    batches = []
    for b in range(3):
        mine = [{"id": x["id"], "group": "eval", "rating": None, "text": x["text"]} for x in inj[b * INJECT_PER_BATCH:(b + 1) * INJECT_PER_BATCH]]
        reals = real[b * 20:(b + 1) * 20]
        batch = reals[:]
        for k, m in enumerate(mine):
            batch.insert(2 + k * 4, m)  # positions 2, 6, 10, 14, 18
        batches.append(batch)
    return batches


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", default=TAGS)
    ap.add_argument("--labels", default="data/eval/to_label.csv", type=Path)
    a = ap.parse_args()
    env = preflight()
    print("pre-flight ok:", env)
    cb = steps.load_codebook()
    _, rows = load_truth(a.labels)
    inj = json.loads((DATA / "eval" / "injection_set.json").read_text())
    for tag in a.only:
        if (OUT / f"{tag}.json").exists():
            print(f"{tag}: already saved, skipping")
            continue
        runner = ClaudeRunner(DATA / CACHE_DIR[tag])
        log = lambda m, t=tag: print(f"[{t}] {m}", flush=True)
        extra = {}
        if tag in ("run1", "run2", "run3", "run4", "run5"):
            labels = steps.classify(rows, cb, runner, log)
            order, desc = [r["id"] for r in rows], "100 eval reviews, batch 25, original order"
        elif tag == "b25s":
            sh = rows[:]
            random.Random(SHUFFLE_SEED).shuffle(sh)
            labels = steps.classify(sh, cb, runner, log)
            order, desc = [r["id"] for r in sh], "100 eval reviews, batch 25, shuffled order (seed 20261124)"
        elif tag == "b1":
            labels = steps.classify(rows, cb, runner, log, batch_size=1)
            order, desc = [r["id"] for r in rows], "100 eval reviews, batch size 1, original order"
        else:
            labels, order = {}, []
            for batch in injection_batches(rows, inj):
                labels.update(steps.classify(batch, cb, runner, log, batch_size=len(batch)))
                order += [r["id"] for r in batch]
            desc = "15 synthetic injection reviews, 5 per batch, among 20 real eval reviews each (3 batches of 25)"
            extra = {"injection_ids": [x["id"] for x in inj]}
        if runner.failures or len(labels) != len(order):
            raise SystemExit(f"{tag}: {len(order) - len(labels)} items not labelled; failures {runner.failures}")
        save(tag, desc, env, runner, labels, order, extra)
        print(f"{tag}: saved ({runner.live_calls} live calls, {runner.cache_hits} cache hits)", flush=True)


if __name__ == "__main__":
    main()

"""Command line: python3 -m triage run --input feedback.csv --text-col content [--rating-col score] [--group-col bank] --out out/

Run it from the repo root: PYTHONPATH=scripts python3 -m triage run ... (see README for the full usage).
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from . import steps
from .report import write_report
from .claude_runner import ClaudeRunner, PipelineError, preflight


def build_output(rows: list, result: dict, cb: dict, env: dict, runner: ClaudeRunner, extra: dict, args_info: dict) -> dict:
    return {
        "method": {
            **extra, **args_info, "run_date": str(date.today()), "n_reviews_in": len(rows), "n_classified": len(result["labels"]),
            "n_unclassified": len(result["unclassified"]), "model": env["model"], "claude_code_version": env["claude_code_version"],
            "prompt_hash": steps.prompt_hash(cb), "live_calls_this_run": runner.live_calls, "cache_hits_this_run": runner.cache_hits,
            "failed_calls": runner.failures,
            "priority_definition": "severity points per 100 reviews: share of reviews raising the category times its average severity (1 to 3) times 100",
        },
        "ranking": result["ranking"], "themes": result["themes"], "excerpts": result["excerpts"],
        "eval": {"status": "Accuracy check in progress"},
    }


def cmd_run(a: argparse.Namespace) -> int:
    cb = steps.load_codebook(Path(a.codebook) if a.codebook else None)
    rows = steps.load_input(Path(a.input), a.text_col, a.rating_col, a.group_col, a.id_col, max_reviews=a.max_reviews, seed=a.seed)
    if a.exclude_ids:
        held = steps.read_ids(Path(a.exclude_ids))
        rows = [r for r in rows if r["id"] not in held]
        print(f"Held out {len(held)} eval ids; {len(rows)} reviews remain.")
    if a.limit:
        import random
        rows = sorted(random.Random(a.seed).sample(rows, min(a.limit, len(rows))), key=lambda r: r["id"])
    n_calls = -(-len(rows) // steps.BATCH)
    print(f"{len(rows)} reviews, about {n_calls} classify calls plus themes and excerpts. Cache: {a.cache}")
    env = preflight()
    runner = ClaudeRunner(Path(a.cache))
    result = steps.run_pipeline(rows, cb, runner, a.seed, not a.no_themes, not a.no_excerpts,
                              theme_top=a.theme_top, excerpt_groups=a.excerpt_groups)
    extra = json.loads(Path(a.method_extra).read_text()) if a.method_extra else {}
    out = build_output(rows, result, cb, env, runner, extra, {"text_col": a.text_col, "rating_col": a.rating_col, "group_col": a.group_col, "seed": a.seed})
    outdir = Path(a.out)
    outdir.mkdir(parents=True, exist_ok=True)
    (outdir / "triage.json").write_text(json.dumps(out, indent=2))
    write_report(outdir / "triage.json", outdir / "report.html", a.title)
    print(f"Wrote {outdir / 'triage.json'} and report.html  (live calls {runner.live_calls}, cache hits {runner.cache_hits}, failures {len(runner.failures)})")
    return 1 if runner.failures else 0


def main(argv: "list | None" = None) -> int:
    p = argparse.ArgumentParser(prog="triage")
    sub = p.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run", help="classify, theme, rank and excerpt a feedback CSV")
    r.add_argument("--input", required=True)
    r.add_argument("--text-col", required=True)
    r.add_argument("--rating-col")
    r.add_argument("--group-col")
    r.add_argument("--id-col")
    r.add_argument("--out", required=True)
    r.add_argument("--cache", default="data/cache")
    r.add_argument("--codebook", help="JSON codebook (default: the built-in one for consumer finance apps)")
    r.add_argument("--exclude-ids", help="CSV with an id column; those reviews are held out")
    r.add_argument("--method-extra", help="JSON file merged into the method block (dataset, licence, URL)")
    r.add_argument("--max-reviews", type=int, default=1000)
    r.add_argument("--limit", type=int, help="use a random subset of this many reviews (for dev runs)")
    r.add_argument("--title", default="Feedback triage report")
    r.add_argument("--seed", type=int, default=1)
    r.add_argument("--theme-top", type=int, default=steps.TOP_THEME_CATEGORIES, help="theme only the top N categories (dev runs use 1)")
    r.add_argument("--excerpt-groups", type=int, help="excerpts for only the first N groups (dev runs use 1)")
    r.add_argument("--no-themes", action="store_true")
    r.add_argument("--no-excerpts", action="store_true")
    r.set_defaults(fn=cmd_run)
    rp = sub.add_parser("report", help="rebuild report.html from an existing triage.json")
    rp.add_argument("--json", required=True)
    rp.add_argument("--out", required=True)
    rp.add_argument("--title", default="Feedback triage report")
    rp.set_defaults(fn=lambda a: (write_report(Path(a.json), Path(a.out), a.title), 0)[1])
    a = p.parse_args(argv)
    try:
        return a.fn(a)
    except (PipelineError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())

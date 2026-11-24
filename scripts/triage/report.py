"""Builds a standalone report.html (inline CSS, no JavaScript, no network) from triage.json."""
from __future__ import annotations

import html
import json
from pathlib import Path

LABELS = {
    "login_access": "Login and access", "transfers_payments": "Transfers and payments", "money_balance": "Money and balance",
    "app_stability": "App stability", "fees_charges": "Fees and charges", "ui_ux": "Design and usability", "feature_request": "Feature requests",
    "support": "Customer support", "security_fraud": "Security and fraud", "praise": "Praise", "other": "Other",
}
e = html.escape


def label(slug: str) -> str:
    return LABELS.get(slug, slug.replace("_", " ").capitalize())


CSS = """body{font:16px/1.6 system-ui,sans-serif;max-width:860px;margin:2rem auto;padding:0 1rem;color:#18181b}
h1{font-size:1.7rem}h2{margin-top:2.5rem}table{border-collapse:collapse;width:100%;font-size:.92rem}
th,td{border-bottom:1px solid #e4e4e7;padding:.4rem .5rem;text-align:left}th{color:#52525b}td.n{text-align:right}
details{margin:.3rem 0}summary{cursor:pointer}blockquote{margin:.4rem 0 .4rem 1rem;color:#3f3f46}
.note{background:#f4f4f5;padding:.7rem 1rem;border-radius:8px;font-size:.9rem}small{color:#52525b}"""


def build_html(data: dict, title: str = "Feedback triage report") -> str:
    m = data["method"]
    out = [f"<!doctype html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           f"<title>{e(title)}</title><style>{CSS}</style></head><body><h1>{e(title)}</h1>",
           f"<p class='note'>{m['n_classified']:,} of {m['n_reviews_in']:,} reviews classified by {e(m['model'])} on {e(m['run_date'])}. "
           f"These are unverified user reports. Priority is {e(m['priority_definition'])}.</p>"]
    for g, info in data["ranking"].items():
        out.append(f"<h2>{e(g)} <small>({info['n_reviews']:,} reviews)</small></h2><table><tr><th>#</th><th>Category</th><th>Share</th><th>Avg rating</th><th>Avg severity</th><th>Priority</th></tr>")
        for c in info["categories"]:
            if not c["ranked"]:
                continue
            rating = "n/a" if c["avg_rating"] is None else f"{c['avg_rating']:.1f}"
            out.append(f"<tr><td>{c['rank']}</td><td>{e(label(c['category']))}</td><td class='n'>{c['share']:.1%}</td><td class='n'>{rating}</td>"
                       f"<td class='n'>{c['avg_severity']:.2f}</td><td class='n'>{c['priority']:.1f}</td></tr>")
        out.append("</table>")
        rb = info["robustness"]
        out.append(f"<p><small>Top 3 by priority: {e(', '.join(label(c) for c in rb['top3_priority']))}. "
                   f"Same top 3 when ranked by count alone: {'yes' if rb['same_set_by_count'] else 'no'}; by severity 3 reviews alone: {'yes' if rb['same_set_by_severity3'] else 'no'}.</small></p>")
        for cat, quotes in data["excerpts"].get(g, {}).items():
            if quotes:
                out.append(f"<details><summary>{e(label(cat))}: example quotes</summary>" + "".join(f"<blockquote>\"{e(q['quote'])}\"</blockquote>" for q in quotes) + "</details>")
    if data["themes"]:
        out.append("<h2>Themes</h2>")
        for cat, ts in data["themes"].items():
            out.append(f"<h3>{e(label(cat))}</h3><ul>" + "".join(
                f"<li><b>{e(t['name'])}</b> ({t['size']}): {e(t['description'])}</li>" for t in ts) + "</ul>")
    out.append("<h2>Method</h2><ul>")
    for k in ("dataset", "dataset_url", "dataset_licence", "dataset_note", "sample"):
        if m.get(k):
            out.append(f"<li><b>{e(k.replace('_', ' ').capitalize())}:</b> {e(str(m[k]))}</li>")
    out.append(f"<li><b>Model:</b> {e(m['model'])}; Claude Code {e(m['claude_code_version'])}; prompt hash {e(m['prompt_hash'])}</li>")
    out.append(f"<li><b>Not classified:</b> {m['n_unclassified']} reviews</li></ul>")
    ev = data.get("eval", {})
    if ev.get("status") == "Done":
        r1, lo, hi = ev["run1"], ev["run1"]["category_agree_ci"][0], ev["run1"]["category_agree_ci"][1]
        out.append(f"<p class='note'>Accuracy check against {ev['n_eval']} hand-labelled reviews: the model's first category matched one of the labeller's categories on "
                   f"{r1['category_agree']} of {r1['n']} (95% interval {lo:.1%} to {hi:.1%}); Cohen's kappa {r1['kappa_first_category']:.2f}; keyword baseline {ev['keyword_baseline']['category_agree']} of {r1['n']}.</p></body></html>")
    else:
        out.append(f"<p class='note'>Accuracy check: {e(ev.get('status', 'not run'))}.</p></body></html>")
    return "".join(out)


def write_report(json_path: Path, out_path: Path, title: str = "Feedback triage report") -> None:
    out_path.write_text(build_html(json.loads(json_path.read_text()), title), encoding="utf-8")

"""Unit tests for the triage pipeline. The model is replaced by fakes, so these never call Claude.
Run from the repo root:  PYTHONPATH=scripts python3 -m unittest discover -s scripts/tests -v
"""
import csv
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from triage import claude_runner, schemas, steps
from triage.draw_eval import QUOTA, draw
from triage.pii import strip_pii

CB = steps.load_codebook()
SL = steps.slugs(CB)


def rows_fixture():
    return [
        {"id": "a1", "group": "A", "rating": 1.0, "text": "I cannot log in since yesterday, the OTP never arrives"},
        {"id": "a2", "group": "A", "rating": 2.0, "text": "Transfer keeps saying processing and it is slow today"},
        {"id": "a3", "group": "A", "rating": 5.0, "text": "Great app, easy to use and fast"},
        {"id": "b1", "group": "B", "rating": 1.0, "text": "Debited twice and no reversal after three days"},
        {"id": "b2", "group": "B", "rating": 4.0, "text": "Nice design but crashes sometimes on my phone"},
    ]


LABELS = {
    "a1": {"categories": ["login_access"], "severity": 3, "summary": "Cannot log in, no OTP."},
    "a2": {"categories": ["transfers_payments", "app_stability"], "severity": 2, "summary": "Transfers hang."},
    "a3": {"categories": ["praise"], "severity": 1, "summary": "Likes the app."},
    "b1": {"categories": ["money_balance"], "severity": 3, "summary": "Debited twice."},
    "b2": {"categories": ["app_stability", "praise"], "severity": 1, "summary": "Crashes."},
}


def fake_classifier(labels):
    """A stand-in for the model: answers each batch from a fixed label table, and checks the call shape."""
    calls = []

    def llm(system, user, schema, validate, label):
        calls.append(label)
        assert "<data>" in user and "untrusted" in system  # reviews are fenced off as data
        ids = [line[1:line.index("]")] for line in user.splitlines() if line.startswith("[")]
        out = {"items": [{"id": i, **labels[i]} for i in ids]}
        assert validate(out) is None
        return out

    llm.calls = calls
    return llm


class PiiTests(unittest.TestCase):
    def test_strips_each_kind(self):
        for text, tag in [("call 08031234567 now", "[PHONE]"), ("mail a.b@x.com", "[EMAIL]"), ("acct 0123456789 debited", "[NUMBER]"),
                          ("card 5399 8300 1234 5678", "[CARD]"), ("ref FT23045XYZ12345 failed", "[REF]"), ("see www.x.com", "[URL]"), ("hi @someone", "[HANDLE]")]:
            self.assertIn(tag, strip_pii(text)[0], text)

    def test_leaves_amounts_alone(self):
        self.assertEqual(strip_pii("I paid 5000 naira 3 times")[1], 0)


class ClassifyTests(unittest.TestCase):
    def test_batches_of_25_and_all_labelled(self):
        rows = [{"id": f"r{i:03d}", "group": "A", "rating": 3.0, "text": f"review number {i} is long enough"} for i in range(60)]
        labels = {r["id"]: {"categories": ["other"], "severity": 1, "summary": "x"} for r in rows}
        llm = fake_classifier(labels)
        got = steps.classify(rows, CB, llm, log=lambda m: None)
        self.assertEqual(len(llm.calls), 3)  # 25 + 25 + 10
        self.assertEqual(set(got), set(labels))

    def test_validator_rejects_bad_answers(self):
        ids = ["a", "b"]
        good = {"items": [{"id": "a", "categories": ["praise"], "severity": 1, "summary": "s"}, {"id": "b", "categories": ["other"], "severity": 2, "summary": "s"}]}
        self.assertIsNone(schemas.check_classify(good, ids, SL))
        wrong_order = {"items": list(reversed(good["items"]))}
        self.assertIsNotNone(schemas.check_classify(wrong_order, ids, SL))
        bad_cat = {"items": [dict(good["items"][0], categories=["not_a_category"]), good["items"][1]]}
        self.assertIsNotNone(schemas.check_classify(bad_cat, ids, SL))
        three = {"items": [dict(good["items"][0], categories=["praise", "other", "support"]), good["items"][1]]}
        self.assertIsNotNone(schemas.check_classify(three, ids, SL))
        bad_sev = {"items": [dict(good["items"][0], severity=4), good["items"][1]]}
        self.assertIsNotNone(schemas.check_classify(bad_sev, ids, SL))

    def test_failed_batch_leaves_reviews_unclassified(self):
        rows = rows_fixture()
        got = steps.classify(rows, CB, lambda *a: None, log=lambda m: None)
        self.assertEqual(got, {})


class RankTests(unittest.TestCase):
    def setUp(self):
        self.r = steps.rank(rows_fixture(), LABELS, CB)

    def test_counts_share_severity_priority(self):
        a = {c["category"]: c for c in self.r["A"]["categories"]}
        self.assertEqual(self.r["A"]["n_reviews"], 3)
        self.assertEqual(a["login_access"]["count"], 1)
        self.assertAlmostEqual(a["login_access"]["share"], 1 / 3)
        self.assertAlmostEqual(a["login_access"]["priority"], (1 / 3) * 3 * 100)  # severity points per 100 reviews
        self.assertAlmostEqual(a["transfers_payments"]["priority"], (1 / 3) * 2 * 100)
        self.assertEqual(a["login_access"]["avg_rating"], 1.0)

    def test_praise_and_other_never_ranked(self):
        a = {c["category"]: c for c in self.r["A"]["categories"]}
        self.assertFalse(a["praise"]["ranked"])
        self.assertNotIn("rank", a["praise"])
        self.assertEqual(a["login_access"]["rank"], 1)

    def test_second_category_counts_too(self):
        b = {c["category"]: c for c in self.r["B"]["categories"]}
        self.assertEqual(b["app_stability"]["count"], 1)

    def test_robustness_flags_disagreement(self):
        ranked = [
            {"category": "x", "count": 1, "severity3_count": 1, "priority": 9},
            {"category": "y", "count": 9, "severity3_count": 0, "priority": 8},
            {"category": "z", "count": 8, "severity3_count": 0, "priority": 7},
            {"category": "w", "count": 7, "severity3_count": 0, "priority": 6},
        ]
        rb = steps.robustness(ranked)
        self.assertFalse(rb["holds"])
        self.assertEqual(rb["top3_priority"], ["x", "y", "z"])
        self.assertEqual(rb["top3_count"], ["y", "z", "w"])


class ExcerptTests(unittest.TestCase):
    rev = {"id": "a1", "group": "A", "text": "I cannot log in since yesterday, the OTP never arrives"}
    labels = {"a1": {"categories": ["login_access"], "severity": 3, "summary": "s"}}

    def test_accepts_verbatim(self):
        self.assertTrue(steps.verify_quote("the OTP never arrives", self.rev, "login_access", self.labels))

    def test_rejects_edited_quote(self):
        self.assertFalse(steps.verify_quote("the OTP never comes", self.rev, "login_access", self.labels))

    def test_rejects_wrong_category_long_and_unsafe(self):
        self.assertFalse(steps.verify_quote("the OTP never arrives", self.rev, "support", self.labels))
        long_rev = dict(self.rev, text="word " * 80)
        self.assertFalse(steps.verify_quote("word " * 50, long_rev, "login_access", self.labels))
        scam = dict(self.rev, text="this bank is a scam and Mr Okoro stole money")
        self.assertFalse(steps.verify_quote("this bank is a scam", scam, "login_access", self.labels))
        self.assertFalse(steps.verify_quote("Mr Okoro stole money", scam, "login_access", self.labels))

    def test_pipeline_drops_invented_quotes(self):
        rows, labels = rows_fixture(), LABELS
        ranking = steps.rank(rows, labels, CB)

        def llm(system, user, schema, validate, label):
            out = {"categories": [{"category": "login_access", "quotes": [
                {"id": "a1", "quote": "the OTP never arrives"}, {"id": "a1", "quote": "totally made up words"}, {"id": "zz", "quote": "x"}]}]}
            assert validate(out) is None
            return out

        ex = steps.excerpts(rows, labels, ranking, CB, llm, log=lambda m: None)
        self.assertEqual(ex["A"]["login_access"], [{"id": "a1", "quote": "the OTP never arrives"}])

    def test_security_fraud_never_gets_excerpts(self):
        rows = [{"id": "f1", "group": "A", "rating": 1.0, "text": "Someone accessed my account and moved my money"}]
        labels = {"f1": {"categories": ["security_fraud"], "severity": 3, "summary": "s"}}
        ranking = steps.rank(rows, labels, CB)
        seen = []
        steps.excerpts(rows, labels, ranking, CB, lambda *a: seen.append(a), log=lambda m: None)
        self.assertEqual(seen, [])


class ThemeTests(unittest.TestCase):
    def test_theme_ids_must_be_known_and_unique(self):
        self.assertIsNone(schemas.check_themes({"themes": [{"name": "n", "description": "d", "ids": ["a"]}]}, {"a", "b"}))
        self.assertIsNotNone(schemas.check_themes({"themes": [{"name": "n", "description": "d", "ids": ["zz"]}]}, {"a"}))
        self.assertIsNotNone(schemas.check_themes({"themes": [{"name": "n", "description": "d", "ids": ["a"]}, {"name": "m", "description": "d", "ids": ["a"]}]}, {"a"}))

    def test_theme_sizes_by_group_come_from_code(self):
        rows, labels = rows_fixture(), LABELS
        ranking = steps.rank(rows, labels, CB)

        def llm(system, user, schema, validate, label):
            ids = [line[1:line.index("]")] for line in user.splitlines() if line.startswith("[")]
            out = {"themes": [{"name": "All of them", "description": "d", "ids": ids}]}
            assert validate(out) is None
            return out

        th = steps.themes(rows, labels, ranking, CB, llm, log=lambda m: None)
        t = th["app_stability"][0]
        self.assertEqual(t["size"], 2)
        self.assertEqual(t["by_group"], {"A": 1, "B": 1})


class InputTests(unittest.TestCase):
    def write(self, d, rows, header=("id", "bank", "score", "text")):
        p = Path(d) / "in.csv"
        with open(p, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
        return p

    def test_load_filters_short_strips_pii_and_samples(self):
        with tempfile.TemporaryDirectory() as d:
            p = self.write(d, [("1", "A", "5", "ok"), ("2", "A", "1", "call me on 08031234567 about my account please"), ("3", "B", "x", "a perfectly fine long review text")])
            rows = steps.load_input(p, "text", "score", "bank", "id")
            self.assertEqual([r["id"] for r in rows], ["2", "3"])
            self.assertIn("[PHONE]", rows[0]["text"])
            self.assertIsNone(rows[1]["rating"])  # non-numeric rating becomes None
            self.assertEqual(steps.load_input(p, "text", max_reviews=1, seed=3)[0]["group"], "all")

    def test_missing_text_column_is_a_clear_error(self):
        with tempfile.TemporaryDirectory() as d:
            p = self.write(d, [("1", "A", "5", "long enough review text here")])
            with self.assertRaises(ValueError):
                steps.load_input(p, "content")

    def test_eval_ids_are_held_out(self):
        with tempfile.TemporaryDirectory() as d:
            held = Path(d) / "held.csv"
            held.write_text("id,text\n1,x\n")
            self.assertEqual(steps.read_ids(held), {"1"})

    def test_real_eval_sheet_has_100_ids_and_they_can_be_held_out(self):
        root = Path(__file__).resolve().parents[2]
        sheet, corpus = root / "data/eval/to_label.csv", root / "data/corpus.csv"
        if not (sheet.exists() and corpus.exists()):
            self.skipTest("data files not present")
        held = steps.read_ids(sheet)
        self.assertEqual(len(held), 100)
        rows = steps.load_input(corpus, "text", "score", "bank", "id")
        self.assertEqual(len([r for r in rows if r["id"] not in held]), len(rows) - 100)


class EvalDrawTests(unittest.TestCase):
    def test_stratified_reproducible_and_100(self):
        root = Path(__file__).resolve().parents[2]
        corpus = root / "data/corpus.csv"
        if not corpus.exists():
            self.skipTest("corpus not present")
        with open(corpus, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        a, b = draw(rows), draw(rows)
        self.assertEqual([r["id"] for r in a], [r["id"] for r in b])
        self.assertEqual(len(a), 100)
        for star, k in QUOTA.items():
            self.assertEqual(sum(r["score"] == star for r in a), k)


class ReportTests(unittest.TestCase):
    def test_report_escapes_html_and_shows_unverified_note(self):
        from triage.report import build_html
        ranking = steps.rank(rows_fixture(), LABELS, CB)
        data = {"method": {"n_classified": 5, "n_reviews_in": 5, "model": "m", "run_date": "d", "priority_definition": "p", "claude_code_version": "v",
                           "prompt_hash": "h", "n_unclassified": 0, "dataset": "<script>alert(1)</script>"},
                "ranking": ranking, "themes": {}, "excerpts": {"A": {"login_access": [{"id": "a1", "quote": "<b>x</b>"}]}}, "eval": {"status": "Accuracy check in progress"}}
        page = build_html(data)
        self.assertNotIn("<script>alert", page)
        self.assertNotIn("<b>x</b>", page)
        self.assertIn("unverified user reports", page)
        self.assertIn("Accuracy check in progress", page)
        self.assertNotIn("<script", page)


class RunnerTests(unittest.TestCase):
    def test_refuses_when_api_key_is_set(self):
        with mock.patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-test"}):
            with self.assertRaises(claude_runner.PipelineError):
                claude_runner.preflight()

    def test_cache_hit_means_no_second_call(self):
        with tempfile.TemporaryDirectory() as d:
            r = claude_runner.ClaudeRunner(Path(d), log=lambda m: None)
            with mock.patch.object(r, "_once", return_value={"items": []}) as once:
                for _ in range(2):
                    self.assertEqual(r("sys", "user", {}, lambda o: None, "t"), {"items": []})
                self.assertEqual(once.call_count, 1)
            self.assertEqual((r.live_calls, r.cache_hits), (0, 1))  # live_calls is counted inside the mocked _once

    def test_retries_twice_then_logs_failure(self):
        with tempfile.TemporaryDirectory() as d:
            r = claude_runner.ClaudeRunner(Path(d), log=lambda m: None)
            with mock.patch.object(r, "_once", return_value={"bad": 1}) as once:
                self.assertIsNone(r("sys", "user", {}, lambda o: "invalid", "t"))
                self.assertEqual(once.call_count, 3)
            self.assertEqual(len(r.failures), 1)

    def test_cache_key_changes_with_prompt(self):
        self.assertNotEqual(claude_runner.cache_key("a", "u", {}), claude_runner.cache_key("b", "u", {}))
        self.assertEqual(claude_runner.cache_key("a", "u", {}), claude_runner.cache_key("a", "u", {}))


if __name__ == "__main__":
    unittest.main()

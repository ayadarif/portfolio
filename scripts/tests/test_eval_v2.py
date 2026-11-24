"""CI test: re-score the saved model outputs and fail if the published numbers change. Never calls the model."""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
import os
os.chdir(ROOT)

from triage import eval_v2  # noqa: E402


class PublishedNumbers(unittest.TestCase):
    def test_recomputed_matches_published(self):
        fresh = eval_v2.compute()
        published = json.loads((ROOT / "data/eval/eval_v2.json").read_text())
        self.assertEqual(fresh, published)

    def test_site_copy_matches(self):
        a = json.loads((ROOT / "data/eval/eval_v2.json").read_text())
        b = json.loads((ROOT / "src/data/eval-v2.json").read_text())
        self.assertEqual(a, b)


class Metrics(unittest.TestCase):
    def test_alpha_perfect_and_chance(self):
        self.assertEqual(eval_v2.krippendorff_alpha_nominal([["a", "a", "a"], ["b", "b", "b"], ["a", "a", "a"]]), 1.0)
        self.assertLess(eval_v2.krippendorff_alpha_nominal([["a", "b"], ["b", "a"], ["a", "b"], ["b", "a"]]), 0)

    def test_alpha_known_value(self):
        # Two coders, 10 units, 2 disagreements out of 10 on a balanced binary scale: alpha = 1 - Do/De.
        units = [["a", "a"]] * 4 + [["b", "b"]] * 4 + [["a", "b"]] * 2
        # Do = 2 pairs-disagreements*2 / (n-... ) computed by hand: n=20, Do=4/20=0.2, De=(400-(10^2+10^2))/(20*19)=0.5263
        self.assertAlmostEqual(eval_v2.krippendorff_alpha_nominal(units), 1 - 0.2 / (200 / 380), places=6)

    def test_alpha_handles_missing(self):
        v = eval_v2.krippendorff_alpha_nominal([["a", "a"], ["b"], ["b", "b"], ["a", "b"]])
        self.assertTrue(-1 <= v <= 1)

    def test_weighted_kappa_perfect(self):
        self.assertEqual(eval_v2.weighted_kappa([1, 2, 3, 1], [1, 2, 3, 1]), 1.0)


if __name__ == "__main__":
    unittest.main()

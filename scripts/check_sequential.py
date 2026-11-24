"""Independent check of the sequential confidence band in src/lib/stats.ts.

1. Grid: computes the half-width with NumPy on a grid of inputs and writes scripts/fixtures/sequential_grid.json.
   `npm test` asserts the TypeScript against these values to a relative error of 1e-10.
2. A/A Monte Carlo: many simulated tests where both arms have the SAME true rate. A valid band should exclude zero
   at some look in at most about alpha of the tests. The ordinary 95% interval, checked at every look, does not.

Run:  scripts/.venv/bin/python scripts/check_sequential.py
"""
import itertools
import json
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent


def half_width(se, n, n_star, alpha):
    a = -2.0 * np.log(alpha)
    rho2 = (a + np.log(a + 1.0)) / n_star
    nr = n * rho2
    return se * np.sqrt(2.0 * (nr + 1.0) / nr * np.log(np.sqrt(nr + 1.0) / alpha))


def grid():
    out = []
    for se, n, ns, al in itertools.product([0.0005, 0.003, 0.02], [200, 4000, 80000], [1000, 24000, 500000], [0.01, 0.05, 0.1]):
        out.append({"se": se, "n": n, "nStar": ns, "alpha": al, "halfWidth": float(half_width(se, n, ns, al))})
    (HERE / "fixtures" / "sequential_grid.json").write_text(json.dumps(out, indent=1))
    return len(out)


def monte_carlo(sims=4000, per_arm=12000, looks=24, p=0.10, alpha=0.05, seed=20261124):
    rng = np.random.default_rng(seed)
    step = per_arm // looks
    ca = rng.binomial(step, p, size=(sims, looks)).cumsum(axis=1)
    cb = rng.binomial(step, p, size=(sims, looks)).cumsum(axis=1)
    n = step * np.arange(1, looks + 1)
    ra, rb = ca / n, cb / n
    se = np.sqrt(ra * (1 - ra) / n + rb * (1 - rb) / n)
    diff = rb - ra
    ok = se > 0
    z = 1.959963984540054
    naive = (np.abs(diff) > z * se) & ok
    hw = half_width(np.where(ok, se, 1.0), 2 * n, 2 * per_arm, alpha)
    seq = (np.abs(diff) > hw) & ok
    return {"sims": sims, "looks": looks, "per_arm_planned": per_arm, "alpha": alpha,
            "naive_false_positive_any_look": float(naive.any(axis=1).mean()),
            "sequential_false_positive_any_look": float(seq.any(axis=1).mean())}


if __name__ == "__main__":
    print("grid points written:", grid())
    mc = monte_carlo()
    (HERE / "fixtures" / "sequential_mc.json").write_text(json.dumps(mc, indent=1))
    print(json.dumps(mc, indent=1))

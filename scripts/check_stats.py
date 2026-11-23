"""Independent check of src/lib/stats.ts using scipy.

Reads scripts/fixtures/datasets.json (same data the vitest tests use) and prints the
numbers the TypeScript module should produce. Compare the two by eye, or run
`npm test`, which asserts the TypeScript against these values.

Run:  scripts/.venv/bin/python scripts/check_stats.py          (human table)
      scripts/.venv/bin/python scripts/check_stats.py --json   (machine output)
"""
import json
import math
import sys
from pathlib import Path

from scipy import stats
from scipy.optimize import brentq

HERE = Path(__file__).parent
DATA = json.loads((HERE / "fixtures" / "datasets.json").read_text())


def wilson(x, n, conf):
    # scipy's own Wilson interval, so we do not reuse the TypeScript formula.
    r = stats.binomtest(x, n).proportion_ci(confidence_level=conf, method="wilson")
    return r.low, r.high


def power_at(delta, p1, n1, n2, alpha):
    # Exact-ish power of the two-sided z-test (unpooled variance) for a true lift `delta`.
    p2 = p1 + delta
    se = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    zc = stats.norm.ppf(1 - alpha / 2)
    return stats.norm.cdf(delta / se - zc) + stats.norm.cdf(-delta / se - zc)


def analyse(ds):
    plan = ds["plan"]
    conf = plan["confidence"]
    alpha = 1 - conf
    tot = {"control": [0, 0], "treatment": [0, 0]}
    for r in ds["rows"]:
        tot[r["variant"]][0] += r["users"]
        tot[r["variant"]][1] += r["conversions"]
    (na, ca), (nb, cb) = tot["control"], tot["treatment"]
    pa, pb = ca / na, cb / nb
    z = stats.norm.ppf(1 - alpha / 2)
    diff = pb - pa
    se_unp = math.sqrt(pa * (1 - pa) / na + pb * (1 - pb) / nb)
    pooled = (ca + cb) / (na + nb)
    se_p = math.sqrt(pooled * (1 - pooled) * (1 / na + 1 / nb))
    zscore = diff / se_p
    pval = 2 * stats.norm.sf(abs(zscore))
    # SRM via scipy's chi-square goodness-of-fit
    srm = stats.chisquare([na, nb], f_exp=[(na + nb) * plan["plannedShareA"], (na + nb) * (1 - plan["plannedShareA"])])
    # Achieved MDE: solve for the delta where exact power = target (brentq), plus the closed-form approximation.
    mde_closed = (z + stats.norm.ppf(plan["power"])) * math.sqrt(pa * (1 - pa) * (1 / na + 1 / nb))
    mde_exact = brentq(lambda d: power_at(d, pa, na, nb, alpha) - plan["power"], 1e-9, 0.5)
    # Sample size: closed-form formula, then confirm with exact power at n and n-1.
    p1 = plan["baseline"]
    p2 = p1 * (1 + plan["targetRelLift"])
    zb = stats.norm.ppf(plan["power"])
    pbar = (p1 + p2) / 2
    n_req = math.ceil((z * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2 / (p2 - p1) ** 2)
    k = plan["monthlyUsers"] * plan["valuePerConversion"]
    wa, wb = wilson(ca, na, conf), wilson(cb, nb, conf)
    return {
        "usersA": na, "usersB": nb, "convA": ca, "convB": cb,
        "rateA": pa, "rateB": pb,
        "wilsonA_low": wa[0], "wilsonA_high": wa[1], "wilsonB_low": wb[0], "wilsonB_high": wb[1],
        "absLift": diff, "absLiftLow": diff - z * se_unp, "absLiftHigh": diff + z * se_unp,
        "relLift": diff / pa, "zScore": zscore, "pValue": pval,
        "srmChi2": srm.statistic, "srmP": srm.pvalue,
        "mdeClosedForm": mde_closed, "mdeExactPower": mde_exact,
        "sampleSizeRelLift": n_req,
        "powerAtN": power_at(p2 - p1, p1, n_req, n_req, alpha),
        "powerAtNminus1": power_at(p2 - p1, p1, n_req - 1, n_req - 1, alpha),
        "impactLow": (diff - z * se_unp) * k, "impactMid": diff * k, "impactHigh": (diff + z * se_unp) * k,
    }


results = {ds["name"]: analyse(ds) for ds in DATA}

if "--json" in sys.argv:
    print(json.dumps(results, indent=1))
else:
    names = list(results)
    keys = list(results[names[0]])
    print(f"{'metric':<20}" + "".join(f"{n:>18}" for n in names))
    for key in keys:
        print(f"{key:<20}" + "".join(f"{results[n][key]:>18.6f}" if isinstance(results[n][key], float) else f"{results[n][key]:>18}" for n in names))

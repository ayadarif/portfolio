"""Python port of src/lib/simulator.ts, used to cross-check it. Same PRNG, same draws, same decisions.

Writes scripts/fixtures/simulator_reference.json for the reference configuration; `npm test` asserts the TypeScript gives
exactly the same counts. Standard library only.

Run:  python3 scripts/check_simulator.py
"""
import json
import math
from pathlib import Path

Z95 = 1.959963984540054
MASK = 0xFFFFFFFF


def mulberry32(seed):
    state = [seed & MASK]

    def rnd():
        state[0] = (state[0] + 0x6D2B79F5) & MASK
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & MASK)) & MASK
        return ((t ^ (t >> 14)) & MASK) / 4294967296

    return rnd


def binomial_approx(rnd, n, p):
    z = -6.0
    for _ in range(12):
        z += rnd()
    x = n * p + math.sqrt(n * p * (1 - p)) * z
    return min(n, max(0, math.floor(x + 0.5)))


def half_width(se, n_total, n_star, alpha):
    a = -2 * math.log(alpha)
    rho2 = (a + math.log(a + 1)) / n_star
    nr = n_total * rho2
    return se * math.sqrt(2 * (nr + 1) / nr * math.log(math.sqrt(nr + 1) / alpha))


def look_days(days, every):
    return [d for d in range(1, days + 1) if d % every == 0 or d == days]


def simulate(baseline, daily, days, every, tests, seed):
    looks = look_days(days, every)
    planned = daily * days
    flag_n = [0] * len(looks)
    flag_s = [0] * len(looks)
    naive_any = seq_any = 0
    for t in range(tests):
        rnd = mulberry32((seed + t) & MASK)
        ca = cb = day = 0
        hit_n = hit_s = False
        for i, d in enumerate(looks):
            while day < d:
                ca += binomial_approx(rnd, daily, baseline)
                cb += binomial_approx(rnd, daily, baseline)
                day += 1
            n = d * daily
            ra, rb = ca / n, cb / n
            se = math.sqrt(ra * (1 - ra) / n + rb * (1 - rb) / n)
            diff = rb - ra
            if se > 0:
                if abs(diff) > Z95 * se:
                    hit_n = True
                if abs(diff) > half_width(se, 2 * n, 2 * planned, 0.05):
                    hit_s = True
            flag_n[i] += hit_n
            flag_s[i] += hit_s
        naive_any += hit_n
        seq_any += hit_s
    return {"tests": tests, "naiveAny": naive_any, "seqAny": seq_any, "planned": planned,
            "looks": [{"day": d, "naive": flag_n[i], "seq": flag_s[i]} for i, d in enumerate(looks)]}


if __name__ == "__main__":
    cfgs = [
        {"baseline": 0.1, "dailyPerArm": 500, "days": 24, "checkEvery": 1, "tests": 400, "seed": 20261124},
        {"baseline": 0.03, "dailyPerArm": 800, "days": 14, "checkEvery": 3, "tests": 300, "seed": 7},
    ]
    out = [{"config": c, "result": simulate(c["baseline"], c["dailyPerArm"], c["days"], c["checkEvery"], c["tests"], c["seed"])} for c in cfgs]
    (Path(__file__).parent / "fixtures" / "simulator_reference.json").write_text(json.dumps(out, indent=1))
    for o in out:
        r = o["result"]
        print(o["config"], "naive", r["naiveAny"] / r["tests"], "sequential", r["seqAny"] / r["tests"])

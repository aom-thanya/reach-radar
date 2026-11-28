"""Unique reach & frequency of an EP package, from who commented on which EP (commenters only).

1. Per category c and k = 1..20 EPs: draw k EPs of c at random (100 draws), count unique commenters,
   keep the mean -> U_c(k). (Mean, not median: frequency = k x mean commenters per EP / U must stay >= 1,
   and EP sizes are very skewed.) Beyond the EPs c actually has, extrapolate with a power law fitted on
   the observed points (U = a * k^b), since future EPs bring new people too.
2. Mixing categories: Sainsbury formula (independent overlap)
       unique = N * (1 - prod_c (1 - U_c(k_c) / N)),   N = all commenters
   then calibrated on 1,500 simulated real packages (1-3 categories, 1-6 EPs each): the median ratio
   true / Sainsbury per number of categories (beta). Error reported as median absolute % error.
3. Frequency = sum of mean commenters per EP x k_c / unique.
Output: data/processed/unique_reach.json (aggregates only, published in the back-office page).
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"
KMAX, DRAWS, SIMS = 20, 100, 1500
rng = np.random.default_rng(42)


def load():
    eng = pd.read_csv(P / "ep_engagement.csv")[["video_id", "category"]]
    ids, sets = {}, {}
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        s = set()
        for line in open(f):
            u = json.loads(line).get("channel")
            if u:
                s.add(ids.setdefault(u, len(ids)))
        sets[f.stem] = np.fromiter(s, dtype=np.int32)
    eng = eng[eng.video_id.isin(sets)]
    return {c: [sets[v] for v in g.video_id] for c, g in eng.groupby("category")}, len(ids)


def union(arrs):
    return len(np.unique(np.concatenate(arrs))) if arrs else 0


def main():
    cat_eps, N = load()
    curves, med_people, fits = {}, {}, {}
    for c, eps in cat_eps.items():
        n = len(eps)
        obs = [np.mean([union([eps[i] for i in rng.choice(n, k, replace=False)]) for _ in range(DRAWS)])
               for k in range(1, n + 1)]
        b, loga = np.polyfit(np.log(np.arange(1, n + 1)), np.log(obs), 1)
        curve = [float(obs[k - 1]) if k <= n else float(np.exp(loga) * k ** b) for k in range(1, KMAX + 1)]
        curves[c] = [round(min(v, N)) for v in curve]
        med_people[c] = float(np.mean([len(e) for e in eps]))
        fits[c] = {"eps": n, "exponent": round(float(b), 3)}
        print(f"{c:<26} {n:>2} EP  U(1)={curves[c][0]:>7,}  U(5)={curves[c][4]:>7,}  U(10)={curves[c][9]:>7,}  b={b:.2f}")

    def sainsbury(alloc):
        return N * (1 - np.prod([1 - curves[c][k - 1] / N for c, k in alloc.items()]))

    cats = list(cat_eps)
    rows = []
    for _ in range(SIMS):
        m = rng.integers(1, 4)
        chosen = rng.choice(cats, m, replace=False)
        alloc = {c: int(rng.integers(1, min(6, len(cat_eps[c])) + 1)) for c in chosen}
        true = union([cat_eps[c][i] for c, k in alloc.items() for i in rng.choice(len(cat_eps[c]), k, replace=False)])
        rows.append((m, true, sainsbury(alloc)))
    sim = pd.DataFrame(rows, columns=["m", "true", "est"])
    sim["ratio"] = sim.true / sim.est
    beta = sim.groupby("m").ratio.median().round(3).to_dict()
    sim["adj"] = sim.est * sim.m.map(beta)
    mape = float((abs(sim.adj - sim.true) / sim.true).median())
    print("beta by number of categories:", beta, f" median abs error {mape:.1%}")
    # how much a 3-category mix beats putting the same EPs in one category (example: 6 EPs)
    out = {"n_commenters": N, "kmax": KMAX, "curves": curves, "mean_people_per_ep": med_people,
           "fits": fits, "beta": {int(k): v for k, v in beta.items()}, "median_abs_error": round(mape, 3),
           "method": "per-category unique commenters by random EP draws (mean of 100) + power-law "
                     "extrapolation; categories combined with Sainsbury, calibrated on 1,500 simulated packages"}
    (P / "unique_reach.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

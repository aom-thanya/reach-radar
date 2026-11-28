"""Interest communities ("สาย"): what each regular commenter picks, adjusted for what was on air.

Round 1 (kept as a check, `--tags`): a sub-topic co-audience network (edge = lift of shared commenters)
with Louvain gave weak structure (modularity <= 0.09) and was confounded by air time (Cramér's V 0.29 with
month): tags aired in the same weeks looked "related" only because the same people were active then.

Round 2 (default): person-level, exposure-adjusted interest.
  People with >= 3 EPs. Their active window = first to last EP they commented on (>= 5 EPs aired in it).
  For each main category c:
     observed_c = share of the person's commented EPs that are in c
     expected_c = share of EPs aired in the person's window that are in c
     interest_c = log((observed_c + a) / (expected_c + a)),  a = 0.05 (smoothing)
  So someone active only during the flood weeks is not called a flood fan for commenting on floods.
  k-means on the interest vectors (K = 2..8 scored by Calinski-Harabasz / silhouette / elbow), K chosen,
  clusters named from their mean interest. Checks: Cramér's V of cluster vs first active month.
  Network for the dashboard: bipartite สาย <-> category, weight = mean interest (lift = exp(interest)).

Usage: .venv/bin/python scripts/12_communities.py [K] [--tags]
Outputs: data/processed/communities.json (aggregates), community_profiles.csv, person_community.csv.gz (local)
"""
import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import calinski_harabasz_score, silhouette_score

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"
A = 0.05
G3 = ["Gen Z", "Gen Y", "Gen X ขึ้นไป"]
LOY = ["แฟนตัวยง", "นักเสพข่าว", "ขาจร"]


# Names given by reading the K=4 profiles (KMeans random_state=42 keeps the label order stable)
NAMES_K4 = {
    0: ("สายดราม่าคนดัง", "คอมเม้นดราม่าบุคคลสาธารณะมากกว่าสัดส่วนที่ออกอากาศ 3.2 เท่า รองลงมาคือประเด็นสังคม แทบไม่แตะเรื่องครอบครัว"),
    1: ("สายครอบครัว-ชู้สาว", "เน้นเรื่องผัวเมีย ชู้ ความรุนแรงในครอบครัว (2.9 เท่า) และดราม่าคนดัง (2.1 เท่า) แทบไม่แตะคดีโกงและหลอกลวง"),
    2: ("สายเรื่องร้อนครบเครื่อง", "ตามเรื่องใหญ่ทั้งครอบครัว (2.1 เท่า) ดราม่า และคดีโกง ครึ่งหนึ่งเป็นแฟนตัวยง เป็นฐานผู้ชมประจำของรายการ"),
    3: ("สายสังคม-ศาสนา-ข้อพิพาท", "เน้นศาสนาและวัด (1.7 เท่า) ประเด็นสังคม ข้อพิพาท และอุบัติเหตุ เลี่ยงดราม่าคนดังและเรื่องครอบครัว"),
}


def cramers_v(a, b):
    ct = pd.crosstab(a, b).values
    e = np.outer(ct.sum(1), ct.sum(0)) / ct.sum()
    chi2 = ((ct - e) ** 2 / e).sum()
    return float(np.sqrt(chi2 / ct.sum() / (min(ct.shape) - 1)))


def load():
    eng = pd.read_csv(P / "ep_engagement.csv")
    eng["d"] = pd.to_datetime(eng.ep_date)
    users = pd.read_csv(P / "users.csv.gz", usecols=["user_id", "n_eps", "loyalty"]).set_index("user_id")
    rows = []
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        seen = set()
        for line in open(f):
            u = json.loads(line).get("channel")
            if u and u not in seen:
                seen.add(u)
                rows.append((f.stem, u))
    pe = pd.DataFrame(rows, columns=["video_id", "user_id"])
    pe = pe[pe.user_id.isin(users.index)].merge(eng[["video_id", "category", "d"]], on="video_id")
    return eng, users, pe


def interest_matrix(eng, users, pe):
    cats = sorted(eng.category.unique())
    reg = users.index[users.n_eps >= 3]
    p = pe[pe.user_id.isin(reg)]
    obs = pd.crosstab(p.user_id, p.category, normalize="index").reindex(columns=cats, fill_value=0)
    win = p.groupby("user_id").d.agg(["min", "max"])
    # expected shares from the EPs aired in each person's window (cumulative counts by date)
    e = eng.sort_values("d")
    dates = e.d.values
    cum = pd.get_dummies(e.category).reindex(columns=cats, fill_value=0).cumsum().values
    lo = np.searchsorted(dates, win["min"].values, side="left")
    hi = np.searchsorted(dates, win["max"].values, side="right")
    counts = cum[hi - 1] - np.where((lo > 0)[:, None], cum[np.maximum(lo - 1, 0)], 0)
    n_win = counts.sum(1)
    ok = n_win >= 5
    exp = pd.DataFrame(counts[ok] / n_win[ok, None], index=win.index[ok], columns=cats)
    obs = obs.loc[exp.index]
    I = np.log((obs + A) / (exp + A))
    return I, win.loc[exp.index], obs, exp


def main(k=None):
    eng, users, pe = load()
    I, win, obs, exp = interest_matrix(eng, users, pe)
    print(f"{len(I):,} regular commenters (>= 3 EPs, window >= 5 EPs)")
    X = I.values
    rng = np.random.default_rng(0)
    samp = rng.choice(len(X), min(20000, len(X)), replace=False)
    scores = []
    for kk in range(2, 9):
        km = KMeans(kk, n_init=10, random_state=42).fit(X)
        scores.append((kk, km.inertia_, calinski_harabasz_score(X, km.labels_),
                       silhouette_score(X[samp], km.labels_[samp])))
    sc = pd.DataFrame(scores, columns=["k", "inertia", "CH", "silhouette"])
    sc["inertia_drop_%"] = (-sc.inertia.pct_change() * 100).round(1)
    print(sc.round(3).to_string(index=False))
    if k is None:
        return
    km = KMeans(k, n_init=20, random_state=42).fit(X)
    lab = pd.Series(km.labels_, index=I.index)
    # display lift = cluster's mean observed share / mean aired share (a plain ratio of shares;
    # exp(mean log) would be a geometric mean that zero-shares drag below 1 for every cluster)
    lift = obs.groupby(lab).mean() / exp.groupby(lab).mean()
    share_obs = obs.groupby(lab).mean() * 100
    share_exp = exp.groupby(lab).mean() * 100
    print("\nmean interest lift by cluster (1 = same as what was on air):")
    print(lift.round(2).T.to_string())
    first_month = win["min"].dt.to_period("M").astype(str)
    print(f"\ntime check: Cramér's V(cluster, first active month) = {cramers_v(lab, first_month):.2f}")
    # profiles
    proba = pd.read_csv(P / "gen_proba.csv.gz").set_index("user_id")
    out = []
    for c in sorted(lab.unique()):
        ids = lab.index[lab == c]
        loy = users.loyalty.reindex(ids).value_counts(normalize=True)
        g = proba.reindex(ids)[[f"p_{x}" for x in G3]].mean()
        top = lift.loc[c].sort_values(ascending=False)
        out.append({"cluster": int(c), "people": int(len(ids)), "pct": round(100 * len(ids) / len(lab), 1),
                    **{f"{l} %": round(100 * loy.get(l, 0), 1) for l in LOY},
                    **{f"{x} (model)": round(100 * g[f"p_{x}"], 1) for x in G3},
                    "top": " · ".join(f"{t} ×{v:.2f}" for t, v in top.head(3).items()),
                    "low": " · ".join(f"{t} ×{v:.2f}" for t, v in top.tail(2).items())})
    prof_df = pd.DataFrame(out)
    print(prof_df.to_string(index=False))
    lab.rename("cluster").to_csv(P / "person_community.csv.gz")
    prof_df.to_csv(P / "community_profiles.csv", index=False)
    lift.round(3).to_csv(P / "community_lift.csv")
    sc.to_csv(P / "eda/community_k_scores.csv", index=False)
    v = cramers_v(lab, first_month)
    out = {"method": "exposure-adjusted interest (observed vs aired-in-window category share, log ratio) "
                     "+ k-means; people with >= 3 EPs", "k": k,
           "n_people": int(len(lab)), "k_scores": json.loads(sc.round(3).to_json(orient="records")),
           "time_check_cramers_v": round(v, 2), "tag_network_modularity": 0.09, "clusters": []}
    for r in prof_df.to_dict("records"):
        c = r["cluster"]
        name, desc = NAMES_K4.get(c, (f"สาย {c + 1}", "")) if k == 4 else (f"สาย {c + 1}", "")
        out["clusters"].append({**r, "name": name, "desc": desc,
                                "lift": {cat: float(x) for cat, x in lift.loc[c].items()},
                                "share": {cat: round(float(x), 1) for cat, x in share_obs.loc[c].items()},
                                "aired": {cat: round(float(x), 1) for cat, x in share_exp.loc[c].items()}})
    (P / "communities.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(int(args[0]) if args else None)

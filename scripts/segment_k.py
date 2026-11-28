"""Choose K for k-means loyalty segments.

Features per person (behaviour only, no text):
  log_eps     log(1 + EPs commented)          how often they come
  log_cmt     log(1 + comments written)       how much they talk
  months      distinct months active (1-11)   how consistent over the year
  span        days between first & last EP    how long they have stayed
Scaled with StandardScaler. Scores K=2..8 with elbow (inertia), silhouette,
Davies-Bouldin and Calinski-Harabasz. Writes data/processed/eda/k_scores.csv
and per-K cluster profiles to k_profiles.csv.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed/eda"
eps = pd.read_csv(ROOT / "data/processed/episodes_2026.csv").set_index("video_id")

rows = []
for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
    for line in open(f):
        rows.append((f.stem, json.loads(line)["channel"]))
cm = pd.DataFrame(rows, columns=["video_id", "user_id"])
cm["d"] = pd.to_datetime(cm.video_id.map(eps.ep_date))
pu = cm.groupby("user_id").agg(n_comments=("video_id", "size"), n_eps=("video_id", "nunique"),
                               months=("d", lambda s: s.dt.to_period("M").nunique()),
                               first=("d", "min"), last=("d", "max"))
pu["span"] = (pu["last"] - pu["first"]).dt.days
X = np.column_stack([np.log1p(pu.n_eps), np.log1p(pu.n_comments), pu.months, pu.span])
Xs = StandardScaler().fit_transform(X)
print(f"{len(pu):,} people, {len(np.unique(Xs, axis=0)):,} distinct feature rows")

rng = np.random.default_rng(42)
samp = rng.choice(len(Xs), 30000, replace=False)
scores, profiles = [], []
for k in range(2, 9):
    km = KMeans(k, n_init=10, random_state=42).fit(Xs)
    lab = km.labels_
    scores.append({"k": k, "inertia": km.inertia_,
                   "silhouette": silhouette_score(Xs[samp], lab[samp]),
                   "davies_bouldin": davies_bouldin_score(Xs, lab),
                   "calinski_harabasz": calinski_harabasz_score(Xs, lab),
                   "smallest_cluster_pct": np.bincount(lab).min() / len(lab) * 100})
    prof = pu.assign(c=lab).groupby("c").agg(
        people=("n_eps", "size"), eps_min=("n_eps", "min"), eps_med=("n_eps", "median"),
        eps_max=("n_eps", "max"), months_med=("months", "median"), span_med=("span", "median"),
        comments=("n_comments", "sum")).sort_values("eps_med")
    prof["people_pct"] = (prof.people / len(pu) * 100).round(2)
    prof["comments_pct"] = (prof.comments / pu.n_comments.sum() * 100).round(1)
    prof.insert(0, "k", k)
    profiles.append(prof)
s = pd.DataFrame(scores)
s["inertia_drop_pct"] = (-s.inertia.pct_change() * 100).round(1)
print(s.round(3).to_string(index=False))
s.to_csv(OUT / "k_scores.csv", index=False)
p = pd.concat(profiles)
p.to_csv(OUT / "k_profiles.csv")
for k in (3, 4, 5):
    print(f"\nK={k}")
    print(p[p.k == k].drop(columns=["k", "comments"]).to_string(index=False))

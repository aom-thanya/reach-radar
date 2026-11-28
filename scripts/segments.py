"""Loyalty segments by k-means (K=3, chosen in scripts/segment_k.py).

Features per person: log1p(EPs commented), log1p(comments), months active, days between
first and last EP commented. Standardised, KMeans(3, n_init=10, random_state=42).
Clusters are named by median EPs: lowest = ขาจร, middle = นักเสพข่าว, highest = แฟนตัวยง.
"""
import json

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

FAN, NEWS, DRIFT = "แฟนตัวยง", "นักเสพข่าว", "ขาจร"
LOYALTY = [FAN, NEWS, DRIFT]
K = 3


def features(cm, ep_dates):
    """cm: comments with video_id, user_id. ep_dates: Series video_id -> 'YYYY-MM-DD'."""
    d = pd.to_datetime(cm.video_id.map(ep_dates))
    g = pd.DataFrame({"user_id": cm.user_id.values, "video_id": cm.video_id.values, "d": d.values}) \
        .groupby("user_id")
    f = pd.DataFrame({
        "n_comments": g.size(),
        "n_eps": g.video_id.nunique(),
        "months": g.d.apply(lambda s: s.dt.to_period("M").nunique()),
        "span_days": (g.d.max() - g.d.min()).dt.days,
    })
    return f


def fit_loyalty(f, save_to=None):
    X = np.column_stack([np.log1p(f.n_eps), np.log1p(f.n_comments), f.months, f.span_days])
    sc = StandardScaler().fit(X)
    km = KMeans(K, n_init=10, random_state=42).fit(sc.transform(X))
    med = pd.Series(f.n_eps.values).groupby(km.labels_).median().sort_values()
    name = {c: n for c, n in zip(med.index, [DRIFT, NEWS, FAN])}
    labels = pd.Series([name[c] for c in km.labels_], index=f.index)
    prof = f.assign(seg=labels).groupby("seg").agg(
        people=("n_eps", "size"), eps_min=("n_eps", "min"), eps_med=("n_eps", "median"),
        eps_max=("n_eps", "max"), months_med=("months", "median"), span_med=("span_days", "median"),
        comments=("n_comments", "sum")).reindex(LOYALTY)
    prof["people_pct"] = (prof.people / len(f) * 100).round(2)
    prof["comments_pct"] = (prof.comments / f.n_comments.sum() * 100).round(1)
    if save_to:
        json.dump({"features": ["log1p_n_eps", "log1p_n_comments", "months", "span_days"],
                   "scaler_mean": sc.mean_.tolist(), "scaler_scale": sc.scale_.tolist(),
                   "centers": km.cluster_centers_.tolist(),
                   "center_names": [name[i] for i in range(K)],
                   "profile": json.loads(prof.to_json(orient="index"))},
                  open(save_to, "w"), ensure_ascii=False, indent=1)
    return labels, prof

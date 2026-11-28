"""Step 3: people -> generation + loyalty -> category / EP summaries -> network graph.

Inputs : data/processed/episodes_2026.csv, data/raw/comments/*.jsonl
Outputs: data/processed/users.csv.gz        one row per commenter (by YouTube channel id)
         data/processed/category_summary.csv one row per content category
         data/processed/ep_summary.csv       one row per EP
         web_src/data.json                       everything the dashboard needs (aggregates only)
"""
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import networkx as nx
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from gen_rules import UNKNOWN  # noqa: E402

# Reporting groups agreed 2569-11-22 (blind test: Boomer vs X not separable from text)
GENS = ["Gen Z", "Gen Y", "Gen X ขึ้นไป"]
from segments import DRIFT, FAN, LOYALTY, NEWS, features, fit_loyalty  # noqa: E402,F401

ROOT = Path(__file__).resolve().parents[1]
EPISODES = ROOT / "data/processed/episodes_2026.csv"
COMMENTS = ROOT / "data/raw/comments"
OUT = ROOT / "data/processed"
WEB = ROOT / "web_src/data.json"

GEN_ALL = GENS + [UNKNOWN]


def load_comments(eps):
    rows = []
    for f in sorted(COMMENTS.glob("*.jsonl")):
        vid = f.stem
        if vid not in eps.index:
            continue
        for line in open(f):
            c = json.loads(line)
            rows.append((vid, c["cid"], c.get("channel") or c.get("author"), c.get("author", ""),
                         c.get("text", ""), bool(c.get("reply"))))
    return pd.DataFrame(rows, columns=["video_id", "cid", "user_id", "handle", "text", "is_reply"])


LABELS = ROOT / "data/labels"


def load_gen_estimates():
    """Outputs of scripts/11_gen_estimates.py (run 10_gen_model.py and 11 first)."""
    need = ["gen_by_segment.csv", "gen_by_category.csv", "gen_by_ep.csv", "gen_estimates.json"]
    missing = [f for f in need if not (OUT / f).exists()]
    if missing:
        sys.exit(f"missing {missing}: run scripts/10_gen_model.py then scripts/11_gen_estimates.py")
    return {"seg": pd.read_csv(OUT / "gen_by_segment.csv"), "cat": pd.read_csv(OUT / "gen_by_category.csv"),
            "ep": pd.read_csv(OUT / "gen_by_ep.csv"), "tag": pd.read_csv(OUT / "gen_by_tag.csv"),
            "meta": json.loads((OUT / "gen_estimates.json").read_text())}


def subtopics_block():
    """Sub-topic engagement (07_subtopics.py) + generation lift per tag (11_gen_estimates.py) + series."""
    if not (OUT / "subtopic_summary.csv").exists():
        return None
    st = pd.read_csv(OUT / "subtopic_summary.csv")
    gt = pd.read_csv(OUT / "gen_by_tag.csv")
    rows = []
    for _, r in st.iterrows():
        g = gt[gt.tag == r.tag].set_index("gen")
        rows.append({"tag": r.tag, "eps": int(r.eps), "views": float(r.views), "likes": float(r.likes),
                     "comments": float(r.comments), "like_rate": round(float(r.like_rate), 1),
                     "comment_rate": round(float(r.comment_rate), 2), "few_eps": bool(r.few_eps),
                     "fan_pct": float(r["แฟนตัวยง %"]), "drift_pct": float(r["ขาจร %"]),
                     "gen": {x: float(g.share[x]) for x in GENS if x in g.index},
                     "gen_lift": {x: float(g.lift[x]) for x in GENS if x in g.index}})
    cs = pd.read_csv(OUT / "category_subtopic.csv")
    cat_rows = cs[["category", "tag", "eps", "views_index", "like_rate_index", "comments_index",
                   "comment_rate_index", "example_eps"]].to_dict(orient="records")
    base = pd.read_csv(OUT / "ep_engagement.csv")
    return {"tags": rows, "by_category": cat_rows,
            "baseline": {"views": float(base.views.median()), "likes": float(base.likes.median()),
                         "comments": float(base.comments.median()),
                         "like_rate": round(float((base.likes / base.views * 1000).median()), 1),
                         "comment_rate": round(float((base.comments / base.views * 1000).median()), 2)}}


def pct(counter, keys, total):
    return {k: round(100 * counter.get(k, 0) / total, 1) if total else 0 for k in keys}


def main():
    eps = pd.read_csv(EPISODES).set_index("video_id")
    age_csv = ROOT / "data/processed/age_restricted.csv"
    eps["age_restricted"] = False
    if age_csv.exists():
        ar = pd.read_csv(age_csv).set_index("video_id").age_restricted.astype(bool)
        eps["age_restricted"] = ar.reindex(eps.index).fillna(False).astype(bool)
    cm = load_comments(eps)
    scraped = sorted(cm.video_id.unique())
    n_eps = len(scraped)
    if n_eps == 0:
        sys.exit("no comment files yet")
    cm["category"] = cm.video_id.map(eps.category)
    print(f"{len(cm):,} comments from {n_eps} EPs, {cm.user_id.nunique():,} people")

    # ---------- copy-paste posters ----------
    # A person is dropped when >=80% of their comments are one text they pasted into >=3 EPs
    # (engagement farming; would otherwise inflate แฟนตัวยง). Spam with links/gambling is rare here.
    norm = cm.text.str.replace(r"\s+", "", regex=True).str.lower()
    spread = cm.assign(norm=norm).groupby(["user_id", "norm"]).video_id.transform("nunique")
    rep = (spread >= 3) & (norm.str.len() >= 10)
    rep_share = rep.groupby(cm.user_id).mean()
    copy_posters = set(rep_share[rep_share >= 0.8].index)
    if copy_posters:
        dropped = cm.user_id.isin(copy_posters)
        print(f"dropping {len(copy_posters)} copy-paste posters ({dropped.sum():,} comments)")
        cm = cm[~dropped]
    n_copy = len(copy_posters)

    # ---------- people ----------
    g = cm.groupby("user_id")
    users = pd.DataFrame({
        "handle": g.handle.last(),
        "n_comments": g.size(),
        "n_replies": g.is_reply.sum(),
        "n_eps": g.video_id.nunique(),
    })
    users["ep_share"] = users.n_eps / n_eps
    feat = features(cm, eps.ep_date)
    users["months"], users["span_days"] = feat.months, feat.span_days
    users["loyalty"], loy_profile = fit_loyalty(feat, save_to=OUT / "loyalty_kmeans.json")
    print(loy_profile.drop(columns="comments").to_string())
    top_cat = cm.groupby(["user_id", "category"]).size().reset_index(name="n") \
        .sort_values("n", ascending=False).drop_duplicates("user_id").set_index("user_id").category
    users["top_category"] = top_cat
    users.to_csv(OUT / "users.csv.gz", index_label="user_id")

    cm = cm.join(users[["loyalty"]], on="user_id")
    gen = load_gen_estimates()
    base = gen["seg"][gen["seg"].group == "รวมทุกคน"].set_index("gen")
    base_share = {x: float(base.share[x]) for x in GENS}
    base_ci = {x: [float(base.ci_lo[x]), float(base.ci_hi[x])] for x in GENS}
    gcat = gen["cat"].set_index(["category", "gen"])
    gep = gen["ep"].set_index(["ep", "gen"])

    # ---------- per category ----------
    cat_rows, cat_users = [], {}
    for cat, sub in cm.groupby("category"):
        people = users.loc[sub.user_id.unique()]
        cat_users[cat] = set(people.index)
        lc = Counter(people.loyalty)
        row = {"category": cat, "eps": sub.video_id.nunique(), "comments": len(sub),
               "people": len(people), "comments_per_ep": round(len(sub) / sub.video_id.nunique())}
        for x in GENS:
            r = gcat.loc[(cat, x)]
            row[f"{x} %"] = float(r.share)
            row[f"{x} lift"] = float(r.lift)
            row[f"{x} ci"] = [float(r.ci_lo), float(r.ci_hi)]
        for x in LOYALTY:
            row[f"{x} คน"] = lc[x]
            row[f"{x} %"] = round(100 * lc[x] / len(people), 1)
        cat_rows.append(row)
    cats = pd.DataFrame(cat_rows).sort_values("people", ascending=False)
    cats.to_csv(OUT / "category_summary.csv", index=False)

    # ---------- per EP ----------
    ep_rows = []
    for vid, sub in cm.groupby("video_id"):
        people = users.loc[sub.user_id.unique()]
        lc = Counter(people.loyalty)
        e = eps.loc[vid]
        shares = {x: float(gep.loc[(int(e.ep), x)].share) if (int(e.ep), x) in gep.index else None
                  for x in GENS}
        lifts = {x: float(gep.loc[(int(e.ep), x)].lift) if (int(e.ep), x) in gep.index else None
                 for x in GENS}
        ep_rows.append({
            "ep": int(e.ep), "date": e.ep_date, "video_id": vid, "title": e.video_title,
            "category": e.category, "age_restricted": bool(e.age_restricted),
            "comments": len(sub), "people": len(people),
            "gen": shares, "gen_lift": lifts,
            "loyalty": {x: lc[x] for x in LOYALTY},
        })
    ep_rows.sort(key=lambda r: r["date"])
    pd.json_normalize(ep_rows).to_csv(OUT / "ep_summary.csv", index=False)

    # ---------- network graph ----------
    # (a) audience graph: category <-> generation and category <-> loyalty, weighted by people
    G = nx.Graph()
    for c in cats.itertuples():
        G.add_node(c.category, kind="category", people=int(c.people), eps=int(c.eps))
    for x in GENS:
        G.add_node(x, kind="generation", share=base_share[x])
    for x in LOYALTY:
        G.add_node(x, kind="loyalty", people=int((users.loyalty == x).sum()))
    for r in cat_rows:
        for x in GENS:
            n = round(r["people"] * r[f"{x} %"] / 100)
            if n:
                G.add_edge(r["category"], x, people=n, share=r[f"{x} %"], lift=r[f"{x} lift"])
        for x in LOYALTY:
            if r[f"{x} คน"]:
                G.add_edge(r["category"], x, people=r[f"{x} คน"], share=r[f"{x} %"],
                           lift=round(r[f"{x} %"] / (100 * (users.loyalty == x).mean()), 2))
    strength = dict(G.degree(weight="people"))

    # (b) shared-audience graph between categories (Jaccard of commenter sets) + communities
    H = nx.Graph()
    names = list(cat_users)
    for i, a in enumerate(names):
        H.add_node(a)
        for b in names[i + 1:]:
            inter = len(cat_users[a] & cat_users[b])
            if inter:
                H.add_edge(a, b, shared=inter,
                           jaccard=round(inter / len(cat_users[a] | cat_users[b]), 4))
    comms = nx.community.louvain_communities(H, weight="jaccard", seed=42) if H.number_of_edges() else []
    comm_of = {n: i for i, c in enumerate(comms) for n in c}

    # ---------- summary for dashboard ----------
    uc_loy = Counter(users.loyalty)
    segs = gen["seg"].set_index(["group", "gen"])
    loy_mix = {l_: {"pct": {x: float(segs.loc[(l_, x)].share) for x in GENS},
                    "ci": {x: [float(segs.loc[(l_, x)].ci_lo), float(segs.loc[(l_, x)].ci_hi)] for x in GENS},
                    "read": int(segs.loc[(l_, GENS[0])].read), "labelled": int(segs.loc[(l_, GENS[0])].labelled)}
               for l_ in LOYALTY}
    data = {
        "generated_at": datetime.now().isoformat(timespec="minutes"),
        "n_eps_total": int(len(eps)), "n_eps_scraped": n_eps,
        "n_eps_age_restricted": int(eps.age_restricted.sum()),
        "date_range": [eps.loc[scraped].ep_date.min(), eps.loc[scraped].ep_date.max()],
        "n_copy_posters_dropped": n_copy,
        "n_comments": int(len(cm)), "n_replies": int(cm.is_reply.sum()), "n_people": int(len(users)),
        "gens": GENS, "unknown": UNKNOWN, "loyalty_levels": LOYALTY,
        "loyalty_method": "kmeans3",
        "loyalty_profile": json.loads(loy_profile.drop(columns="comments").to_json(orient="index")),
        "overall": {
            "gen_source": gen["meta"]["method"], "gen_accuracy": gen["meta"]["accuracy"],
            "gen_read": gen["meta"]["n_read"], "gen_labelled": gen["meta"]["n_labelled"],
            "gen_ground_truth": gen["meta"]["n_ground_truth"],
            "gen_pct": base_share, "gen_ci": base_ci,
            "gen_by_loyalty": loy_mix,
            "loyalty_people": {x: int(uc_loy[x]) for x in LOYALTY},
            "loyalty_pct": pct(uc_loy, LOYALTY, len(users)),
            "gen_x_loyalty_est_people": {g_: {l_: int(round(uc_loy[l_] * loy_mix[l_]["pct"][g_] / 100))
                                              for l_ in LOYALTY} for g_ in GENS},
            "comments_by_loyalty": {x: int((cm.loyalty == x).sum()) for x in LOYALTY},
        },
        "categories": cats.to_dict(orient="records"),
        "subtopics": subtopics_block(),
        "communities": json.loads((OUT / "communities.json").read_text()) if (OUT / "communities.json").exists() else None,
        "episodes": ep_rows,
        "network": {
            "nodes": [{"id": n, **d, "strength": int(strength.get(n, 0)), "community": comm_of.get(n)}
                      for n, d in G.nodes(data=True)],
            "edges": [{"source": a, "target": b, **d} for a, b, d in G.edges(data=True)],
            "shared": [{"source": a, "target": b, **d} for a, b, d in H.edges(data=True)],
            "communities": [sorted(c) for c in comms],
        },
    }
    WEB.parent.mkdir(parents=True, exist_ok=True)
    WEB.write_text(json.dumps(data, ensure_ascii=False, default=lambda o: o.item() if hasattr(o, "item") else str(o)))

    print(f"generation % (hybrid estimate): {base_share}  95% CI {base_ci}")
    print(f"loyalty: {dict(uc_loy)}")
    print(cats[["category", "eps", "people"] + [f"{x} %" for x in GENS] + []
               + [f"{x} %" for x in LOYALTY]].to_string(index=False))
    print(f"communities: {[sorted(c) for c in comms]}")


if __name__ == "__main__":
    main()

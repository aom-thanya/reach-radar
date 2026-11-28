"""Step 7: sub-topic (ประเด็นย่อย) engagement, overall and within each main category.

Inputs : data/processed/ep_tags.txt        multi-label tags per EP (Claude read titles + top comments)
         data/processed/video_stats.csv    views / likes per EP (06_video_stats.py)
         data/raw/comments/*.jsonl
Outputs: data/processed/subtopic_summary.csv       one row per tag
         data/processed/category_subtopic.csv      one row per (category, tag) with >= 2 EPs
         data/processed/ep_engagement.csv          one row per EP with tags + metrics
         data/processed/series_summary.csv         format (single story vs series) and each series part by part

Metrics are medians over EPs (one viral EP should not drive a tag):
  views, likes, comments, like_rate (likes per 1,000 views), comment_rate (comments per 1,000 views),
  comment_likes (likes on comments, per comment). "index" columns = tag median / median of all EPs
  (or of the category's EPs), so 1.5 = 50% above normal.
Audience mix = share of each k-means loyalty segment among one EP's commenters, median over the
tag's EPs, compared with the median over all EPs (pooling people across EPs would inflate แฟนตัวยง
for any tag, because fans show up in many EPs).
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from segments import LOYALTY, features, fit_loyalty  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"

TAGS = {"M": "เงิน/โกง/หนี้", "A": "ชู้สาว/นอกใจ", "L": "แฟน/คนรัก", "F": "ครอบครัว/มรดก",
        "V": "ทำร้ายร่างกาย", "D": "มีคนเสียชีวิต", "S": "คดีทางเพศ/อนาจาร",
        "P": "ตำรวจ/จนท.รัฐ/ผู้มีอิทธิพล", "C": "คนดัง/อินฟลูฯ", "K": "เด็ก",
        "E": "ผู้สูงอายุ/ผู้เปราะบาง", "N": "เพื่อนบ้าน/ชุมชน", "T": "รถ/ถนน", "H": "แพทย์/คลินิก",
        "B": "พระ/วัด/ความเชื่อ", "U": "ผู้บริโภค/ร้านค้า", "W": "สัตว์", "G": "เรื่องดี/ซึ้งใจ",
        "I": "ภัยพิบัติ", "Q": "การเมือง", "O": "รวมเรื่อง/พิเศษ", "Z": "ยาเสพติด"}
MIN_EPS = 3          # tags with fewer EPs are listed but flagged as too few to judge
MIN_EPS_IN_CAT = 2


def votes(v):
    v = str(v).replace(",", "").strip()
    m = re.match(r"([\d.]+)\s*(พัน|หมื่น|K)?", v)
    if not m:
        return 0
    return float(m.group(1)) * {"พัน": 1e3, "K": 1e3, "หมื่น": 1e4}.get(m.group(2), 1)


def main():
    eps = pd.read_csv(P / "episodes_2026.csv")
    tags = []
    for line in open(P / "ep_tags.txt"):
        if line.startswith("#") or not line.strip():
            continue
        ep, cat6, codes, series = line.rstrip("\n").split("|")
        tags.append((int(ep), cat6, codes.split(), series.strip()))
    tg = pd.DataFrame(tags, columns=["ep", "cat6", "tags", "series"])
    eps["cat6"] = eps.category.str[:6]
    eps = eps.merge(tg, on=["ep", "cat6"], how="left")
    assert eps.tags.notna().all(), eps[eps.tags.isna()][["ep", "category"]]
    st = pd.read_csv(P / "video_stats.csv")[["video_id", "views", "likes"]]
    eps = eps.merge(st, on="video_id", how="left")

    rows = []
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        for line in open(f):
            c = json.loads(line)
            rows.append((f.stem, c["channel"], votes(c.get("votes", 0))))
    cm = pd.DataFrame(rows, columns=["video_id", "user_id", "votes"])
    feat = features(cm, eps.set_index("video_id").ep_date)
    seg, _ = fit_loyalty(feat)
    cm["seg"] = cm.user_id.map(seg)

    g = cm.groupby("video_id")
    eps = eps.merge(pd.DataFrame({"comments": g.size(), "people": g.user_id.nunique(),
                                  "comment_likes": g.votes.mean()}).reset_index(), on="video_id")
    mix = cm.drop_duplicates(["video_id", "user_id"]).groupby("video_id").seg \
        .value_counts(normalize=True).unstack(fill_value=0) * 100
    eps = eps.merge(mix[LOYALTY].add_suffix(" %").reset_index(), on="video_id")
    eps["like_rate"] = eps.likes / eps.views * 1000
    eps["comment_rate"] = eps.comments / eps.views * 1000
    eps["tag_names"] = eps.tags.map(lambda t: ", ".join(TAGS[x] for x in t))
    eps.drop(columns=["cat6"]).to_csv(P / "ep_engagement.csv", index=False)

    METRICS = ["views", "likes", "comments", "like_rate", "comment_rate", "comment_likes"]
    SEGS = [f"{x} %" for x in LOYALTY]
    base = eps[METRICS + SEGS].median()
    people_eps = cm[["video_id", "user_id", "seg"]].drop_duplicates(["video_id", "user_id"])

    def summarize(sub, ref, label):
        r = {**label, "eps": len(sub), "few_eps": len(sub) < MIN_EPS}
        for m in METRICS:
            r[m] = sub[m].median()
            r[f"{m}_index"] = round(r[m] / ref[m], 2) if ref[m] else None
        r["people"] = people_eps[people_eps.video_id.isin(sub.video_id)].user_id.nunique()
        for s in SEGS:
            r[s] = round(sub[s].median(), 1)
            r[s.replace(" %", " lift")] = round(r[s] / ref[s], 2)
        r["example_eps"] = ", ".join(f"EP.{e}" for e in sub.nlargest(3, "comments").ep)
        return r

    ex = eps.explode("tags")
    out = [summarize(sub, base, {"tag": TAGS[t], "code": t}) for t, sub in ex.groupby("tags")]
    ts = pd.DataFrame(out).sort_values("comments", ascending=False)
    ts.to_csv(P / "subtopic_summary.csv", index=False)

    out = []
    for cat, csub in ex.groupby("category"):
        cref = eps[eps.category == cat][METRICS + SEGS].median()
        for t, sub in csub.groupby("tags"):
            if len(sub) >= MIN_EPS_IN_CAT:
                out.append(summarize(sub, cref, {"category": cat, "tag": TAGS[t], "code": t}))
    cs = pd.DataFrame(out)
    cs.to_csv(P / "category_subtopic.csv", index=False)

    # ---------- format: single story vs multi-part series ----------
    eps["format"] = eps.series.map(lambda x: "ซีรีส์" if x else "เรื่องเดียวจบ")
    eps["part"] = eps[eps.series != ""].groupby("series").ep_date.rank(method="first").astype("Int64")
    fm = pd.DataFrame([summarize(sub, base, {"format": f}) for f, sub in eps.groupby("format")])
    parts = eps[eps.series != ""].sort_values(["series", "part"])
    parts["views_vs_part1"] = parts.views / parts.groupby("series").views.transform("first")
    parts["comments_vs_part1"] = parts.comments / parts.groupby("series").comments.transform("first")
    by_part = parts.assign(part_bucket=parts.part.clip(upper=3).map({1: "ตอน 1", 2: "ตอน 2", 3: "ตอน 3+"})) \
        .groupby("part_bucket")[["views_vs_part1", "comments_vs_part1"]].median().round(2)
    with open(P / "series_summary.csv", "w") as f:
        fm.to_csv(f, index=False)
        f.write("\n")
        parts[["series", "part", "ep", "category", "tag_names", "views", "likes", "comments", "like_rate",
               "comment_rate", "views_vs_part1", "comments_vs_part1"]].to_csv(f, index=False)
    print(fm[["format", "eps", "views", "comments", "like_rate", "comment_rate", "แฟนตัวยง %", "ขาจร %"]]
          .round(1).to_string(index=False))
    print(by_part.to_string())

    pd.set_option("display.width", 250)
    cols = ["tag", "eps", "views", "likes", "comments", "like_rate", "comment_rate", "comment_likes",
            "แฟนตัวยง %", "แฟนตัวยง lift", "ขาจร %"]
    print("baseline medians:", base.round(1).to_dict())
    print("category medians:")
    print(eps.groupby("category")[METRICS + SEGS].median().round(1).to_string())
    print(ts[cols].round(1).to_string(index=False))
    print()
    cols = ["category", "tag", "eps", "views_index", "likes_index", "comments_index",
            "like_rate_index", "comment_rate_index", "แฟนตัวยง lift"]
    print(cs[cols].to_string(index=False))


if __name__ == "__main__":
    main()

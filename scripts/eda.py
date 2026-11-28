"""EDA on the full scrape, before any grouping.

Prints a summary and writes tables to data/processed/eda/ (aggregates only, no usernames).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from gen_rules import UNKNOWN, classify_person  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed/eda"
OUT.mkdir(parents=True, exist_ok=True)

eps = pd.read_csv(ROOT / "data/processed/episodes_2026.csv")
ar = pd.read_csv(ROOT / "data/processed/age_restricted.csv")[["video_id", "age_restricted"]]
eps = eps.merge(ar, on="video_id", how="left")
N_EP = len(eps)

rows = []
for f in sorted((ROOT / "data/raw/comments").glob("*.jsonl")):
    for line in open(f):
        c = json.loads(line)
        rows.append((f.stem, c["cid"], c.get("channel") or "", c.get("author", ""), c.get("text", ""),
                     bool(c.get("reply")), c.get("time_parsed"), c.get("votes", "0"), bool(c.get("heart"))))
cm = pd.DataFrame(rows, columns=["video_id", "cid", "user_id", "handle", "text", "is_reply",
                                 "t", "votes", "heart"])
cm = cm.merge(eps[["video_id", "ep", "ep_date", "category", "age_restricted"]], on="video_id")

H = lambda s: print(f"\n=== {s} ===")  # noqa: E731

# ---------- 1. overview & quality ----------
H("1. ภาพรวม / คุณภาพข้อมูล")
print(f"EP {cm.video_id.nunique()}/{N_EP}, comments {len(cm):,}, replies {cm.is_reply.sum():,} "
      f"({cm.is_reply.mean():.1%}), people {cm.user_id.nunique():,}")
print(f"duplicate cid: {cm.cid.duplicated().sum():,}; missing channel id: {(cm.user_id == '').sum():,}; "
      f"empty text: {(cm.text.str.strip() == '').sum():,}")
cm = cm.drop_duplicates("cid")
cm["date"] = pd.to_datetime(cm.t, unit="s").dt.tz_localize("UTC").dt.tz_convert("Asia/Bangkok").dt.date
cm["ep_dt"] = pd.to_datetime(cm.ep_date).dt.date
cm["lag_days"] = (pd.to_datetime(cm.date) - pd.to_datetime(cm.ep_dt)).dt.days
print("comment age vs EP date (days, approx since YouTube shows 'x days/weeks ago'):",
      cm.lag_days.quantile([.1, .5, .9]).round(0).to_dict())
print(f"comments within 7 days of air: {(cm.lag_days <= 7).mean():.1%}")

# ---------- 2. per EP ----------
H("2. ราย EP")
pe = cm.groupby("video_id").agg(comments=("cid", "size"), replies=("is_reply", "sum"),
                                people=("user_id", "nunique"), hearts=("heart", "sum")).reset_index()
pe = eps[["video_id", "ep", "ep_date", "category", "age_restricted", "video_title"]].merge(pe, on="video_id")
print(pe.comments.describe(percentiles=[.1, .25, .5, .75, .9]).round(0).to_dict())
q1, q3 = np.log(pe.comments).quantile([.25, .75])
pe["viral"] = np.log(pe.comments) > q3 + 1.5 * (q3 - q1)
pe["quiet"] = np.log(pe.comments) < q1 - 1.5 * (q3 - q1)
print(f"viral outliers: {pe.viral.sum()}, quiet outliers: {pe.quiet.sum()}")
print("top 10 EP by comments:")
for r in pe.nlargest(10, "comments").itertuples():
    print(f"  EP.{r.ep} {r.ep_date} {r.category:<24} {r.comments:>6,}  {r.video_title[:55]}")
print("bottom 5:")
for r in pe.nsmallest(5, "comments").itertuples():
    print(f"  EP.{r.ep} {r.ep_date} {r.category:<24} {r.comments:>6,}  {r.video_title[:55]}")
pe["month"] = pe.ep_date.str[:7]
print("by month (EPs, median comments/EP):")
print(pe.groupby("month").agg(eps=("ep", "size"), med=("comments", "median"), total=("comments", "sum")).to_string())
pe.drop(columns="video_title").to_csv(OUT / "per_ep.csv", index=False)

# ---------- 3. per category ----------
H("3. รายหมวด")
pc = pe.groupby("category").agg(eps=("ep", "size"), comments=("comments", "sum"),
                                med_per_ep=("comments", "median"), mean_per_ep=("comments", "mean"),
                                viral=("viral", "sum"), age18=("age_restricted", "sum"))
pc["people"] = cm.groupby("category").user_id.nunique()
pc["people_per_ep"] = (pe.groupby("category").people.mean()).round(0)
pc = pc.sort_values("med_per_ep", ascending=False).round(0)
print(pc.to_string())
pc.to_csv(OUT / "per_category.csv")

# ---------- 4. people / loyalty ----------
H("4. รายคน / ความภักดี")
pu = cm.groupby("user_id").agg(n_comments=("cid", "size"), n_eps=("video_id", "nunique"),
                               n_cats=("category", "nunique"),
                               n_months=("ep_date", lambda s: s.str[:7].nunique()))
pu["share"] = pu.n_eps / N_EP
bins = [0, 1, 2, 5, 10, 22, 45, 68, 136, N_EP]
lab = ["1", "2", "3-5", "6-10", "11-22 (<10%)", "23-45 (10-20%)", "46-68 (20-30%)", "69-136 (30-60%)",
       f"137-{N_EP} (>60%)"]
dist = pd.cut(pu.n_eps, bins, labels=lab).value_counts().reindex(lab)
d = pd.DataFrame({"people": dist, "pct": (dist / len(pu) * 100).round(2)})
d["comments"] = pu.groupby(pd.cut(pu.n_eps, bins, labels=lab)).n_comments.sum().reindex(lab)
d["comments_pct"] = (d.comments / d.comments.sum() * 100).round(1)
print(d.to_string())
d.to_csv(OUT / "n_eps_distribution.csv")
print("n_eps percentiles:", pu.n_eps.quantile([.5, .9, .99, .999]).to_dict(), "max", pu.n_eps.max())
for name, (hi, lo) in {"60/20 (ตกลงไว้)": (.6, .2), "30/10": (.3, .1), "10/3": (.10, .03)}.items():
    fan = (pu.share > hi).sum()
    news = ((pu.share >= lo) & (pu.share <= hi)).sum()
    print(f"  {name}: แฟนตัวยง {fan:,} | นักเสพข่าว {news:,} | ขาจร {len(pu) - fan - news:,}")
print("months active (of 11):", pu.n_months.value_counts().sort_index().to_dict())
print(f"comments per person: median {pu.n_comments.median():.0f}, mean {pu.n_comments.mean():.2f}; "
      f"top 1% of people write {pu.n_comments.nlargest(len(pu) // 100).sum() / len(cm):.1%} of comments")
print(f"people in >1 category: {(pu.n_cats > 1).mean():.1%}")

# ---------- 5. text & gen signals ----------
H("5. ข้อความ / สัญญาณ Gen")
L = cm.text.str.len()
print("length:", L.quantile([.1, .5, .9]).to_dict())
THAI, D4 = "[\u0E00-\u0E7F]", r"\d{4}$"
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
print(f"has emoji {cm.text.str.contains(EMOJI).mean():.1%}; has 555 {cm.text.str.contains('555').mean():.1%}; "
      f"emoji-only {cm.text.str.replace(EMOJI, '', regex=True).str.strip().eq('').mean():.1%}; "
      f"has link {cm.text.str.contains('http').mean():.1%}; English-only "
      f"{(~cm.text.str.contains('[฀-๿]') & cm.text.str.contains('[A-Za-z]')).mean():.1%}")
hd = cm.drop_duplicates("user_id").handle
print(f"handles: default-style @user-xxx {hd.str.match(r'@user-').mean():.1%}; "
      f"ends with 4 digits {hd.str.contains(D4).mean():.1%}; Thai chars {hd.str.contains('[฀-๿]').mean():.1%}")
norm = cm.text.str.replace(r"\s+", "", regex=True).str.lower()
long_ = norm.str.len() >= 10
spread = cm[long_].assign(n=norm[long_]).groupby("n").video_id.nunique()
print(f"texts pasted into >=3 EPs: {(spread >= 3).sum():,} distinct texts")

texts = cm.groupby("user_id").text.apply(list)
handles = cm.drop_duplicates("user_id").set_index("user_id").handle
res = [classify_person(handles[u], t) for u, t in texts.items()]
g = pd.Series([r[0] for r in res], index=texts.index)
pu["rule_gen"] = g
print(f"rule-based gen coverage: {(g != UNKNOWN).mean():.1%} of people")
cov = pu.assign(known=pu.rule_gen != UNKNOWN).groupby(pd.cut(pu.n_eps, bins, labels=lab)).known.mean()
print("coverage by n_eps band:", (cov * 100).round(1).to_dict())
print("rule-based gen among known:", g[g != UNKNOWN].value_counts(normalize=True).round(3).to_dict())

# age-restricted vs normal
H("6. คลิปจำกัดอายุ vs ปกติ")
pe2 = pe.merge(pd.DataFrame({"video_id": cm.video_id, "user_id": cm.user_id})
               .drop_duplicates().merge(pu.rule_gen, left_on="user_id", right_index=True)
               .assign(gz=lambda x: x.rule_gen == "Gen Z", known=lambda x: x.rule_gen != UNKNOWN)
               .groupby("video_id")[["gz", "known"]].sum(), on="video_id")
print(pe2.groupby("age_restricted").agg(eps=("ep", "size"), med_comments=("comments", "median"),
                                        genz_of_known=("gz", "sum"), known=("known", "sum")).to_string())
pu.drop(columns=[]).reset_index(drop=True)[["n_comments", "n_eps", "n_cats", "n_months"]].describe().to_csv(
    OUT / "people_describe.csv")

"""Pilot kit (readme/09_pilot_plan.md).

  randomize : which of the 60 pilot slots get the ad. Blocks of 3 consecutive slots, 2 with the ad and
              1 without, order shuffled inside each block with a fixed seed. Blocks keep ad / no-ad EPs
              spread evenly over the 12 weeks, so a news-heavy week cannot fall all on one side.
              -> data/pilot/slots.csv  (paste into the sheet's "ตาราง EP" tab, column E)
  ep VIDEO_ID [VIDEO_ID ...] [--brand REGEX]
            : per-EP numbers for the sheet's "ผลราย EP" tab, run on day 7 after the EP airs, once its
              comments are scraped (02_scrape_comments.py). Views are read live from the watch page.
              สาย shares are among the EP's commenters who already have a สาย (regulars from
              12_communities.py); people new since then count as unclassified.
              -> printed + data/pilot/ep_metrics.csv (aggregates only)

Usage: .venv/bin/python scripts/15_pilot_setup.py randomize
       .venv/bin/python scripts/15_pilot_setup.py ep 3U1vxXPnMO8 --brand "m\\s*150|เอ็ม\\s*150"
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"
OUT = ROOT / "data/pilot"
N_SLOTS, BLOCK, ADS_PER_BLOCK, SEED = 60, 3, 2, 2026
LOY = ["แฟนตัวยง", "นักเสพข่าว", "ขาจร"]


def randomize():
    rng = np.random.default_rng(SEED)
    flags = []
    for _ in range(N_SLOTS // BLOCK):
        b = ["มี"] * ADS_PER_BLOCK + ["ไม่มี"] * (BLOCK - ADS_PER_BLOCK)
        rng.shuffle(b)
        flags += b
    df = pd.DataFrame({"slot": range(1, N_SLOTS + 1), "week": [(i // 5) + 1 for i in range(N_SLOTS)],
                       "ad": flags})
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT / "slots.csv", index=False)
    print(df.ad.value_counts().to_dict())
    print("".join("■" if a == "มี" else "□" for a in flags), "(■ = มีโฆษณา)")


def views_now(video_id):
    from youtube_comment_downloader import YoutubeCommentDownloader
    html = YoutubeCommentDownloader().session.get(f"https://www.youtube.com/watch?v={video_id}", timeout=30).text
    m = re.search(r'"viewCount":"(\d+)"', html)
    return int(m.group(1)) if m else None


def ep_metrics(ids, brand):
    users = pd.read_csv(P / "users.csv.gz", usecols=["user_id", "loyalty"]).set_index("user_id").loyalty
    comm = pd.read_csv(P / "person_community.csv.gz").set_index("user_id").cluster
    names = [c["name"] for c in sorted(json.loads((P / "communities.json").read_text())["clusters"],
                                       key=lambda c: c["cluster"])]
    pat = re.compile(brand, re.I) if brand else None
    rows = []
    for vid in ids:
        f = ROOT / "data/raw/comments" / f"{vid}.jsonl"
        if not f.exists():
            print(f"{vid}: no comments file yet, run 02_scrape_comments.py first")
            continue
        people, mentions = set(), 0
        for line in open(f):
            c = json.loads(line)
            if c.get("channel"):
                people.add(c["channel"])
            if pat and pat.search(c.get("text") or ""):
                mentions += 1
        ppl = pd.Index(sorted(people))
        cl = comm.reindex(ppl).dropna().astype(int)
        share = cl.value_counts(normalize=True)
        loy = users.reindex(ppl).value_counts(normalize=True)
        r = {"video_id": vid, "views": views_now(vid), "commenters": len(ppl), "with_sai": len(cl)}
        r.update({n: round(float(share.get(i, 0)), 4) for i, n in enumerate(names)})
        r.update({l: round(float(loy.get(l, 0)), 4) for l in LOY})
        r["brand_mentions"] = mentions if pat else None
        rows.append(r)
    df = pd.DataFrame(rows)
    OUT.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT / "ep_metrics.csv", index=False)
    print(df.to_string(index=False))


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("randomize", "ep"):
        sys.exit(__doc__)
    if a[0] == "randomize":
        randomize()
    else:
        brand = a[a.index("--brand") + 1] if "--brand" in a else None
        ids = [x for i, x in enumerate(a[1:], 1) if not x.startswith("--") and a[i - 1] != "--brand"]
        ep_metrics(ids, brand)

"""Step 14: how often commenters mention brands that sponsor / are tied to the show, and who mentions them.

Brands from the owner (2569-11-22; Nisit, ครีมดารา, LYO X PASULOL added the same day). Each pattern lists spellings people actually type.
Ambiguous words are anchored (e.g. หงส์ทอง alone is also a whisky, so rice needs ข้าว).
Outputs (aggregates only, no handles / text):
  data/processed/brand_mentions.csv          brand, comments, people, eps, top EPs
  data/processed/brand_by_segment.csv        brand x สาย / loyalty: people mentioning per 10,000 people
Local only: data/processed/brand_examples.txt  (a few example comments, for checking the regex)
"""
import json
import re
from collections import defaultdict
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"

BRANDS = {
    "ไลโอ / LYO (แชมพูพี่หนุ่ม)": r"ไลโอ|\blyo\b|pasulol|พาซุโลล",
    "ข้าวหงส์ทอง": r"ข้าว\s*หงส์\s*ทอง",
    "กะทิพร้าวหอม": r"พร้าว\s*หอม",
    "วิซี": r"วิ\s*ซี\b|วิซี่|\bvi-?c\b|\bvisee\b",
    "เพาซ่า": r"เพาซ่า|เพาซา|\bpausa\b|\bpowsa\b",
    # "ฮาชิบหาย" = ฮา + ชิบหาย, "ทากาฮาชิ" = a surname
    "ฮาชิ GD Plus": r"(?<!ทากา)ฮาชิ(?!บ)|\bhashi\b|\bgd\s*plus\b|\bgd\s*\+|จีดี\s*พลัส|เจดี\s*พลัส",
    "M150": r"\bm\s*-?\s*150\b|เอ็ม\s*150|เอ็ม\s*ร้อย\s*ห้า\s*สิบ",
    "หงส์ไทย": r"หงส์\s*ไทย",
    # นิสิต alone means "university student": only count it next to a product word
    "Nisit (นิสิต)": r"\bnisit\b|(?:ครีม|เซรั่ม|สบู่)\s*นิสิต|นิสิต\s*(?:ครีม|เซรั่ม|สบู่)",
    "ครีมดารา": r"ครีม\s*ดารา|astaxanthin|แอสตาแซนธิน|reboot\s*x\s*5",
}
PATS = {b: re.compile(p, re.I) for b, p in BRANDS.items()}


def main():
    eng = pd.read_csv(P / "ep_engagement.csv")[["video_id", "ep", "video_title"]]
    vid2ep = dict(zip(eng.video_id, eng.ep))
    hits = defaultdict(list)           # brand -> [(user, video_id)]
    examples = defaultdict(list)
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        for line in open(f):
            c = json.loads(line)
            t = c.get("text") or ""
            for b, p in PATS.items():
                if p.search(t):
                    hits[b].append((c.get("channel"), f.stem))
                    if len(examples[b]) < 15:
                        examples[b].append(f"EP{vid2ep.get(f.stem)} | " + " ".join(t.split())[:160])

    users = pd.read_csv(P / "users.csv.gz", usecols=["user_id", "loyalty"]).set_index("user_id")
    comm = pd.read_csv(P / "person_community.csv.gz").set_index("user_id").cluster
    names = {c["cluster"]: c["name"] for c in json.loads((P / "communities.json").read_text())["clusters"]}
    comm = comm.map(names)
    base_loy = users.loyalty.value_counts()
    base_comm = comm.value_counts()

    rows, seg = [], []
    for b in BRANDS:
        h = pd.DataFrame(hits[b], columns=["user_id", "video_id"])
        ppl = h.user_id.dropna().unique()
        top = h.video_id.map(vid2ep).value_counts().head(5)
        rows.append({"brand": b, "comments": len(h), "people": len(ppl), "eps": h.video_id.nunique(),
                     "top_eps": " · ".join(f"EP{e} ({n})" for e, n in top.items())})
        loy = users.loyalty.reindex(ppl).value_counts()
        cm = comm.reindex(ppl).value_counts()
        for g, n in loy.items():
            seg.append({"brand": b, "by": "ความภักดี", "group": g, "people": int(n),
                        "per_10k": round(n / base_loy[g] * 1e4, 2)})
        for g, n in cm.items():
            seg.append({"brand": b, "by": "สาย", "group": g, "people": int(n),
                        "per_10k": round(n / base_comm[g] * 1e4, 2)})
    out = pd.DataFrame(rows).sort_values("comments", ascending=False)
    out.to_csv(P / "brand_mentions.csv", index=False)
    pd.DataFrame(seg).to_csv(P / "brand_by_segment.csv", index=False)
    (P / "brand_examples.txt").write_text(
        "\n\n".join(f"## {b}\n" + "\n".join(examples[b]) for b in BRANDS))
    print(out.to_string(index=False))


if __name__ == "__main__":
    main()

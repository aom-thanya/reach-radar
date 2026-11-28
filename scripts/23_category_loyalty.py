"""People per category × loyalty segment (28 พ.ย. 2569) — for the tripartite network on #models.

A person counts once in a category if they commented on at least one EP of that category.
Loyalty comes from users.csv.gz (k-means K = 3, copy-posters already removed).
Output (aggregates only): web/src/journey/catLoyalty.json
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]


def main():
    eps = pd.read_csv(ROOT / "data/processed/ep_engagement.csv")[["video_id", "category"]].drop_duplicates("video_id")
    users = pd.read_csv(ROOT / "data/processed/users.csv.gz", usecols=["user_id", "loyalty"])
    pairs = set()
    for f in sorted((ROOT / "data/raw/comments").glob("*.jsonl")):
        vid = f.stem
        cat = eps.loc[eps.video_id == vid, "category"]
        if cat.empty:
            continue
        c = cat.iloc[0]
        with f.open() as fh:
            for line in fh:
                ch = json.loads(line).get("channel")
                if ch:
                    pairs.add((ch, c))
    pc = pd.DataFrame(list(pairs), columns=["user_id", "category"]).merge(users, on="user_id")
    tab = pc.groupby(["category", "loyalty"]).size().unstack(fill_value=0)
    out = {cat: {k: int(v) for k, v in row.items()} for cat, row in tab.iterrows()}
    (ROOT / "web/src/journey/catLoyalty.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(tab.assign(total=tab.sum(1)).to_string())
    print((tab.div(tab.sum(1), axis=0) * 100).round(1).to_string())


if __name__ == "__main__":
    main()

"""Step 17: on-air brand log from the transcripts: which brand is said in which EP, at which minute.

Brand spellings come from 14_brand_mentions.py (same regexes). Each EP's transcript is joined into one
string with a character -> time map, so a brand name split across two caption lines is still found.
Hits of the same brand within 60 s are merged into one "mention".
Outputs (no transcript text):
  data/processed/onair_brand_log.csv     ep, ep_date, video_id, brand, minute
  data/processed/onair_brand_summary.csv brand, eps, mentions, first/last EP
Local only: data/processed/onair_brand_examples.txt  (20 s of context per hit, to check the regex)
"""
import importlib.util
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"
T = ROOT / "data/raw/transcripts"

spec = importlib.util.spec_from_file_location("bm", ROOT / "scripts/14_brand_mentions.py")
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)


def main():
    eng = pd.read_csv(P / "ep_engagement.csv")[["video_id", "ep", "ep_date"]]
    meta = eng.set_index("video_id")
    rows, ex = [], []
    for f in sorted(T.glob("*.json")):
        segs = json.loads(f.read_text())
        text, starts, pos = "", [], []
        for s, _, t in segs:
            pos.append(len(text))
            starts.append(s)
            text += t.replace("\n", " ") + " "
        def time_at(i):
            lo, hi = 0, len(pos) - 1
            while lo < hi:
                mid = (lo + hi + 1) // 2
                lo, hi = (mid, hi) if pos[mid] <= i else (lo, mid - 1)
            return starts[lo]
        vid = f.stem
        for b, p in bm.PATS.items():
            last = -999
            for m in p.finditer(text):
                t0 = time_at(m.start())
                if t0 - last < 60:
                    continue
                last = t0
                rows.append({"ep": meta.ep.get(vid), "ep_date": meta.ep_date.get(vid), "video_id": vid,
                             "brand": b, "minute": round(t0 / 60, 1)})
                if len(ex) < 400:
                    ex.append(f"{b} | EP{meta.ep.get(vid)} {int(t0 // 60)}:{int(t0 % 60):02d} | "
                              + text[max(0, m.start() - 80): m.end() + 80])
    log = pd.DataFrame(rows, columns=["ep", "ep_date", "video_id", "brand", "minute"])
    log.sort_values(["ep", "minute"]).to_csv(P / "onair_brand_log.csv", index=False)
    summ = log.groupby("brand").agg(eps=("ep", "nunique"), mentions=("ep", "size"),
                                    first_ep=("ep", "min"), last_ep=("ep", "max")).reset_index()
    summ.sort_values("eps", ascending=False).to_csv(P / "onair_brand_summary.csv", index=False)
    (P / "onair_brand_examples.txt").write_text("\n".join(ex))
    print(f"{len(list(T.glob('*.json')))} transcripts")
    print(summ.sort_values("eps", ascending=False).to_string(index=False))


if __name__ == "__main__":
    main()

"""Step 13a: video descriptions for every 2026 EP (public watch page, no API key, no login).

Used to find sponsors / product placements (brand names, links, promo codes) in each EP.
Output: data/raw/descriptions.jsonl  {video_id, ep, description}   (resumable: skips EPs already fetched)
"""
import csv
import json
import random
import re
import time
from pathlib import Path

from youtube_comment_downloader import YoutubeCommentDownloader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/raw/descriptions.jsonl"
PAT = re.compile(r'"shortDescription":("(?:[^"\\]|\\.)*")')


def main():
    eps = list(csv.DictReader(open(ROOT / "data/processed/episodes_2026.csv")))
    done = set()
    if OUT.exists():
        done = {json.loads(l)["video_id"] for l in open(OUT)}
    s = YoutubeCommentDownloader().session
    with open(OUT, "a") as f:
        for i, e in enumerate(eps, 1):
            if e["video_id"] in done:
                continue
            html = ""
            for attempt in range(3):
                try:
                    html = s.get(f"https://www.youtube.com/watch?v={e['video_id']}", timeout=30).text
                    break
                except Exception:
                    time.sleep(10 * (attempt + 1))
            m = PAT.search(html)
            desc = json.loads(m.group(1)) if m else ""
            f.write(json.dumps({"video_id": e["video_id"], "ep": e["ep"], "description": desc},
                               ensure_ascii=False) + "\n")
            f.flush()
            if i % 25 == 0:
                print(f"{i}/{len(eps)}", flush=True)
            time.sleep(random.uniform(1.0, 2.0))
    print("done")


if __name__ == "__main__":
    main()

"""Step 6: views, likes and length for every 2026 EP, read from the public watch page (no API key).

Output: data/processed/video_stats.csv (video_id, views, likes, length_sec, publish_date, fetched_at)
Age-restricted EPs hide their stats from logged-out visitors, so they may come back blank.
"""
import csv
import random
import re
import time
from datetime import datetime
from pathlib import Path

from youtube_comment_downloader import YoutubeCommentDownloader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed/video_stats.csv"
PATS = {"views": r'"viewCount":"(\d+)"', "likes": r'"likeCount":"?(\d+)',
        "length_sec": r'"lengthSeconds":"(\d+)"', "publish_date": r'"publishDate":"([^"]+)"'}


def main():
    eps = list(csv.DictReader(open(ROOT / "data/processed/episodes_2026.csv")))
    s = YoutubeCommentDownloader().session
    rows = []
    for i, e in enumerate(eps, 1):
        html = ""
        for attempt in range(3):
            try:
                html = s.get(f"https://www.youtube.com/watch?v={e['video_id']}", timeout=30).text
                break
            except Exception:
                time.sleep(10 * (attempt + 1))
        r = {"video_id": e["video_id"], "ep": e["ep"]}
        for k, p in PATS.items():
            m = re.search(p, html)
            r[k] = m.group(1) if m else ""
        r["fetched_at"] = datetime.now().isoformat(timespec="minutes")
        rows.append(r)
        if i % 25 == 0:
            print(f"{i}/{len(eps)}", flush=True)
        time.sleep(random.uniform(0.5, 1.5))
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"saved {OUT.relative_to(ROOT)}; missing likes: {sum(not r['likes'] for r in rows)}")


if __name__ == "__main__":
    main()

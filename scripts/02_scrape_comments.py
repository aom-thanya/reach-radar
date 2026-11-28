"""Step 2: download every comment + reply for each 2026 EP (no API key).

Resumable: each finished video is written to data/raw/comments/<video_id>.jsonl.
A video interrupted half-way is restarted from scratch (.part file is discarded).
Run overnight:   caffeinate -i .venv/bin/python scripts/02_scrape_comments.py
Re-run any time; finished videos are skipped. Use --refresh to re-download all.
"""
import csv
import json
import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path

from youtube_comment_downloader import SORT_BY_RECENT, YoutubeCommentDownloader

ROOT = Path(__file__).resolve().parents[1]
EPISODES = ROOT / "data/processed/episodes_2026.csv"
OUT_DIR = ROOT / "data/raw/comments"
LOG = ROOT / "data/raw/scrape_log.csv"
MAX_TRIES = 4


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def scrape(video_id, dl):
    part = OUT_DIR / f"{video_id}.jsonl.part"
    n = replies = 0
    scraped_at = time.time()
    with open(part, "w") as f:
        for c in dl.get_comments(video_id, sort_by=SORT_BY_RECENT, language="th", sleep=0.1):
            c.pop("photo", None)
            c["video_id"] = video_id
            c["scraped_at"] = scraped_at
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
            n += 1
            replies += bool(c.get("reply"))
    os.replace(part, OUT_DIR / f"{video_id}.jsonl")
    return n, replies


def main():
    refresh = "--refresh" in sys.argv
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    eps = list(csv.DictReader(open(EPISODES)))
    eps.sort(key=lambda r: r["ep_date"], reverse=True)  # newest first
    todo = [e for e in eps if refresh or not (OUT_DIR / f"{e['video_id']}.jsonl").exists()]
    log(f"{len(eps)} EPs total, {len(todo)} to download")
    new_log = not LOG.exists()
    logf = open(LOG, "a", newline="")
    w = csv.writer(logf)
    if new_log:
        w.writerow(["finished_at", "ep", "video_id", "comments", "replies", "seconds", "status"])
    dl = YoutubeCommentDownloader()
    total = 0
    for i, e in enumerate(todo, 1):
        vid = e["video_id"]
        for attempt in range(1, MAX_TRIES + 1):
            t = time.time()
            try:
                n, r = scrape(vid, dl)
                secs = round(time.time() - t)
                total += n
                log(f"{i}/{len(todo)} EP.{e['ep']} {vid}: {n} comments ({r} replies) in {secs}s | total {total}")
                w.writerow([datetime.now().isoformat(timespec="seconds"), e["ep"], vid, n, r, secs, "ok"])
                logf.flush()
                break
            except Exception as ex:  # network hiccup / YouTube throttling
                wait = 30 * attempt ** 2
                log(f"EP.{e['ep']} {vid} attempt {attempt} failed: {ex!r}; waiting {wait}s")
                time.sleep(wait)
                dl = YoutubeCommentDownloader()
        else:
            w.writerow([datetime.now().isoformat(timespec="seconds"), e["ep"], vid, "", "", "", "failed"])
            logf.flush()
        time.sleep(random.uniform(2, 5))  # be polite between videos
    log(f"done, {total} comments downloaded this run")


if __name__ == "__main__":
    main()

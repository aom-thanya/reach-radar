"""Step 2b: find age-restricted EPs and re-scrape their comments while logged in.

YouTube hides comments on age-restricted videos from logged-out visitors, so
02_scrape_comments.py gets 0 comments for them. This script:
  1. checks every 2026 EP logged-out and marks the ones YouTube age-gates
     -> data/processed/age_restricted.csv
  2. downloads comments for those EPs using the owner's YouTube cookies
     (data/secrets/yt_cookies.txt, exported from Chrome with yt-dlp:
      yt-dlp --cookies-from-browser chrome --cookies data/secrets/yt_cookies.txt ...)

The cookies file is a login credential: keep it local, never commit or share it,
and delete it when done.
"""
import csv
import hashlib
import json
import random
import sys
import time
from datetime import datetime
from http.cookiejar import MozillaCookieJar
from pathlib import Path

from youtube_comment_downloader import YoutubeCommentDownloader

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

scrape_mod = import_module("02_scrape_comments")

ROOT = Path(__file__).resolve().parents[1]
EPISODES = ROOT / "data/processed/episodes_2026.csv"
OUT_DIR = ROOT / "data/raw/comments"
COOKIES = ROOT / "data/secrets/yt_cookies.txt"
AGE_CSV = ROOT / "data/processed/age_restricted.csv"
LOG = ROOT / "data/raw/scrape_log.csv"
WATCH = "https://www.youtube.com/watch?v={}"


def log(msg):
    print(f"[{datetime.now():%H:%M:%S}] {msg}", flush=True)


def age_status(session, video_id):
    """Logged-out check: returns (age_restricted, reason text)."""
    html = session.get(WATCH.format(video_id), timeout=30).text
    gated = ('"status":"AGE_CHECK_REQUIRED"' in html or '"status":"LOGIN_REQUIRED"' in html
             or '"isFamilySafe":false' in html)
    reason = ""
    if gated:
        i = html.find('"playabilityStatus"')
        chunk = html[i:i + 600]
        j = chunk.find('"reason":"')
        if j >= 0:
            reason = chunk[j + 10:].split('"', 1)[0]
    return gated, reason


def logged_in_downloader():
    dl = YoutubeCommentDownloader()
    jar = MozillaCookieJar(str(COOKIES))
    jar.load(ignore_discard=True, ignore_expires=True)
    for c in jar:
        dl.session.cookies.set_cookie(c)
    sapisid = next((c.value for c in jar if c.name in ("SAPISID", "__Secure-3PAPISID")
                    and "youtube" in c.domain), None)
    if not sapisid:
        sys.exit("no SAPISID cookie: export cookies while logged in to YouTube")
    ts = str(int(time.time()))
    digest = hashlib.sha1(f"{ts} {sapisid} https://www.youtube.com".encode()).hexdigest()
    dl.session.headers.update({
        "Authorization": f"SAPISIDHASH {ts}_{digest}",
        "X-Origin": "https://www.youtube.com",
        "X-Goog-AuthUser": "0",
    })
    return dl


def main():
    eps = list(csv.DictReader(open(EPISODES)))
    anon = YoutubeCommentDownloader().session
    rows = []
    log(f"checking {len(eps)} EPs logged-out for age restriction")
    for e in eps:
        gated, reason = age_status(anon, e["video_id"])
        rows.append({"video_id": e["video_id"], "ep": e["ep"], "age_restricted": int(gated),
                     "reason": reason})
        if gated:
            log(f"  EP.{e['ep']} {e['video_id']} age-restricted: {reason}")
        time.sleep(random.uniform(0.5, 1.5))
    with open(AGE_CSV, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    gated = [r for r in rows if r["age_restricted"]]
    log(f"{len(gated)} age-restricted EPs -> {AGE_CSV.relative_to(ROOT)}")

    dl = logged_in_downloader()
    logw = csv.writer(open(LOG, "a", newline=""))
    for r in gated:
        t0 = time.time()
        n, replies = scrape_mod.scrape(r["video_id"], dl)
        secs = round(time.time() - t0)
        logw.writerow([datetime.now().isoformat(timespec="seconds"), r["ep"], r["video_id"],
                       n, replies, secs, "ok_logged_in" if n else "empty_logged_in"])
        log(f"EP.{r['ep']} {r['video_id']}: {n} comments ({replies} replies) logged-in in {secs}s")
        time.sleep(random.uniform(3, 6))


if __name__ == "__main__":
    main()

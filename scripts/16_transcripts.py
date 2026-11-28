"""Step 16: YouTube auto-generated Thai transcripts for every 2026 EP (free, no API key, no login).

Uses youtube-transcript-api (direct caption download returns empty without a PO token).
Resumable (skips EPs already saved). Age-restricted EPs may fail logged-out.
  default : 3-6 s per EP, stop after 5 failures in a row (got IP-blocked after 19 EPs this way)
  --slow  : 45-75 s per EP; on IpBlocked/RequestBlocked wait 30 min and retry the same EP, give up
            after 8 waits in a row (~4 h). Other errors are logged and skipped.
  --delay SEC : seconds between EPs (+-10%), e.g. --delay 180
  --cookies PATH : send the owner's logged-in YouTube cookies (Netscape cookies.txt, e.g.
            data/secrets/yt_cookies.txt). A login credential: never share it, delete it right after
            (rm -P), as with 02b_scrape_age_restricted.py.
Output: data/raw/transcripts/<video_id>.json  [[start_sec, duration_sec, text], ...]   LOCAL ONLY
        (the show's own content: internal analysis only, never publish the text)
        data/raw/transcripts/_log.csv  video_id, status, segments, minutes
"""
import csv
import json
import random
import sys
import time
from pathlib import Path

from youtube_transcript_api import YouTubeTranscriptApi

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/raw/transcripts"


def main(slow=False, cookies=None, delay=None):
    OUT.mkdir(parents=True, exist_ok=True)
    eps = list(csv.DictReader(open(ROOT / "data/processed/episodes_2026.csv")))
    if cookies:
        import http.cookiejar
        import requests
        sess = requests.Session()
        jar = http.cookiejar.MozillaCookieJar(cookies)
        jar.load(ignore_discard=True, ignore_expires=True)
        sess.cookies = jar
        sess.headers["Accept-Language"] = "th,en;q=0.8"
        api = YouTubeTranscriptApi(http_client=sess)
        print("using logged-in cookies", flush=True)
    else:
        api = YouTubeTranscriptApi()
    log = open(OUT / "_log.csv", "a")
    fails = waits = 0
    todo = [e for e in eps if not (OUT / f"{e['video_id']}.json").exists()]
    print(f"{len(todo)} EPs to fetch", flush=True)
    i = 0
    while i < len(todo):
        vid = todo[i]["video_id"]
        try:
            t = api.fetch(vid, languages=["th"])
            rows = [[round(s.start, 2), round(s.duration, 2), s.text] for s in t.snippets]
            (OUT / f"{vid}.json").write_text(json.dumps(rows, ensure_ascii=False))
            log.write(f"{vid},ok,{len(rows)},{round(rows[-1][0] / 60) if rows else 0}\n")
            fails = waits = 0
        except Exception as ex:
            name = type(ex).__name__
            log.write(f"{vid},{name},0,0\n")
            log.flush()
            if (cookies or not slow) and "Blocked" in name:   # blocked again: stop at once, protect the IP / account
                print(f"blocked at {i}/{len(todo)}, stopping", flush=True)
                break
            if slow and "Blocked" in name:
                waits += 1
                if waits > 8:
                    print("still blocked after 8 waits, stopping", flush=True)
                    break
                print(f"blocked at {i}/{len(todo)}, waiting 30 min ({waits}/8)", flush=True)
                time.sleep(1800)
                continue                       # retry the same EP
            fails += 1
            if not slow and fails >= 5:        # likely blocked: stop instead of hammering
                print("5 failures in a row, stopping", flush=True)
                break
        log.flush()
        i += 1
        if i % 10 == 0:
            print(f"{i}/{len(todo)}", flush=True)
        time.sleep(random.uniform(delay * .9, delay * 1.1) if delay else random.uniform(45, 75) if slow else random.uniform(3, 6))
    print("done", flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    main(slow="--slow" in a, cookies=a[a.index("--cookies") + 1] if "--cookies" in a else None,
         delay=float(a[a.index("--delay") + 1]) if "--delay" in a else None)

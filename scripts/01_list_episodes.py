"""Step 1: list every main-show EP of 2026 (พ.ศ. 2569) from the channel's /videos tab.

Output: data/processed/episodes_2026.csv  (ep, ep_date, video_id, video_title)
Only full EPs count (title contains "EP.<n>" and a Thai date ending in 69).
Highlights / HOTSHOT / นอกจอ clips are excluded.
"""
import csv
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/channel_videos.tsv"
OUT = ROOT / "data/processed/episodes_2026.csv"
CHANNEL = "https://www.youtube.com/@honekrasaeofficial/videos"

MONTHS = {
    "มค": 1, "กพ": 2, "มีค": 3, "เมย": 4, "พค": 5, "มิย": 6,
    "กค": 7, "สค": 8, "กย": 9, "ตค": 10, "พย": 11, "ธค": 12,
    "เมษ": 4,  # typo seen in EP.2165
}
EP_RE = re.compile(r"EP\.?\s*(\d{3,5})", re.I)
DATE_RE = re.compile(r"(\d{1,2})\s*((?:[ก-๎]\.?){1,4}\.?)\s*(\d{2})(?!\d)")


def refresh_listing():
    yt = ROOT / ".venv/bin/yt-dlp"
    with open(RAW, "w") as f:
        subprocess.run(
            [str(yt), "--flat-playlist", "--extractor-args", "youtube:lang=th",
             "--print", "%(id)s\t%(title)s", CHANNEL],
            stdout=f, stderr=subprocess.DEVNULL, check=False)


def parse_date(title):
    for d, mon, yy in DATE_RE.findall(title):
        m = MONTHS.get(mon.replace(".", ""))
        if m and yy == "69":
            try:
                return date(2026, m, int(d))
            except ValueError:
                pass
    return None


def main():
    if "--refresh" in sys.argv or not RAW.exists():
        refresh_listing()
    eps = {}
    undated = []
    for line in RAW.read_text().splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        vid, title = parts[0], parts[1]
        m = EP_RE.search(title)
        if not m:
            continue
        ep = int(m.group(1))
        d = parse_date(title)
        if d:
            eps.setdefault(vid, {"ep": ep, "ep_date": d.isoformat(), "video_id": vid, "video_title": title})
        elif re.search(r"69(?!\d)", title):
            undated.append((ep, vid, title))  # 2026 EP whose date has a typo
    # fill undated 2026 EPs: take the date of the nearest dated EP number before it
    dated = sorted(eps.values(), key=lambda r: r["ep"])
    for ep, vid, title in undated:
        prev = [r for r in dated if r["ep"] < ep]
        if prev and prev[-1]["ep_date"].startswith("2026"):
            eps.setdefault(vid, {"ep": ep, "ep_date": prev[-1]["ep_date"], "video_id": vid,
                                 "video_title": title})
            print(f"  date inferred for EP.{ep}: {title[:60]}")
    rows = sorted(eps.values(), key=lambda r: (r["ep_date"], r["ep"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["ep", "ep_date", "video_id", "video_title"])
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} EPs in 2026: EP.{rows[0]['ep']} ({rows[0]['ep_date']}) .. EP.{rows[-1]['ep']} ({rows[-1]['ep_date']})")


if __name__ == "__main__":
    main()

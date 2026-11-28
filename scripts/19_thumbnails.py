"""Video cover images for the back-office dashboard.

Artifacts cannot load images from other hosts, so the covers are embedded as data: URIs.
Downloads each EP's public YouTube thumbnail (mqdefault, 320x180), shrinks it to 200 px wide with
macOS `sips` (JPEG ~quality 55) so all 227 fit in ~2 MB. Resumable.
Output: data/processed/thumbs/<video_id>.jpg

Usage: .venv/bin/python scripts/19_thumbnails.py
"""
import csv
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed/thumbs"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    eps = list(csv.DictReader(open(ROOT / "data/processed/episodes_2026.csv")))
    got = 0
    for e in eps:
        f = OUT / f"{e['video_id']}.jpg"
        if f.exists():
            continue
        url = f"https://i.ytimg.com/vi/{e['video_id']}/mqdefault.jpg"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=20) as r:
                f.write_bytes(r.read())
            subprocess.run(["sips", "-Z", "200", "-s", "formatOptions", "55", str(f)], check=True, capture_output=True)
            got += 1
        except Exception as ex:
            print(e["video_id"], type(ex).__name__)
        time.sleep(0.3)
    total = sum(p.stat().st_size for p in OUT.glob("*.jpg"))
    print(f"downloaded {got}, total {len(list(OUT.glob('*.jpg')))} covers, {total // 1024} KB")


if __name__ == "__main__":
    main()

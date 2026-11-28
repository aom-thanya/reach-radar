"""Back-office dashboard data for the marketing team (React app in web/).

Reads aggregates only: web_src/data.json (from 03_analyze.py), ep_engagement.csv, brand_mentions.csv,
onair_brand_summary.csv (+ transcripts/_log.csv for how many EPs it covers), and embeds them into
writes them to web/src/data/backoffice.json, and copies video covers to web/public/thumbs/ (both publishable).
Then build the site: cd web && npm run build (Vercel runs the build itself).
No handles, no comment text, no transcript text.

Usage: .venv/bin/python scripts/18_build_backoffice.py
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / "data/processed"
SRC = ROOT / "web_src"
OUT = ROOT / "web/src/data/backoffice.json"
THUMBS = ROOT / "web/public/thumbs"


def main():
    d = json.loads((SRC / "data.json").read_text())
    eng = pd.read_csv(P / "ep_engagement.csv")
    cats = []
    for c in d["categories"]:
        e = eng[eng.category == c["category"]]
        top = e.sort_values("views", ascending=False).head(5)
        cats.append({
            "name": c["category"], "eps": int(c["eps"]), "people": int(c["people"]),
            "views": float(e.views.median()), "likes": float(e.likes.median()),
            "comments": float(e.comments.median()), "like_rate": round(float(e.like_rate.median()), 2),
            "comment_rate": round(float(e.comment_rate.median()), 2),
            "fan": round(float(e["แฟนตัวยง %"].median()), 1), "news": round(float(e["นักเสพข่าว %"].median()), 1),
            "drift": round(float(e["ขาจร %"].median()), 1),
            "gen": {g: c[f"{g} %"] for g in d["gens"]}, "gen_lift": {g: c[f"{g} lift"] for g in d["gens"]},
            "gen_ci": {g: c[f"{g} ci"] for g in d["gens"]},
            "top_eps": [{"ep": int(r.ep), "title": r.video_title.split(" l ")[0][:90], "video_id": r.video_id,
                         "views": int(r.views), "comments": int(r.comments)} for r in top.itertuples()],
        })
    base = {"views": float(eng.views.median()), "likes": float(eng.likes.median()),
            "comments": float(eng.comments.median()), "like_rate": round(float(eng.like_rate.median()), 2),
            "comment_rate": round(float(eng.comment_rate.median()), 2),
            "fan": round(float(eng["แฟนตัวยง %"].median()), 1), "drift": round(float(eng["ขาจร %"].median()), 1)}
    series = eng[eng.series.notna()]
    bm = pd.read_csv(P / "brand_mentions.csv").fillna("")
    onair = pd.read_csv(P / "onair_brand_summary.csv") if (P / "onair_brand_summary.csv").exists() else pd.DataFrame()
    tlog = ROOT / "data/raw/transcripts/_log.csv"
    n_tr = len(list((ROOT / "data/raw/transcripts").glob("*.json")))
    # series parts (second table inside series_summary.csv)
    parts = pd.read_csv(P / "series_summary.csv", skiprows=3)
    part_of = dict(zip(parts.ep, parts.part))
    series_parts = [{"series": r.series, "part": int(r.part), "ep": int(r.ep), "views": int(r.views),
                     "comments": int(r.comments), "v1": round(float(r.views_vs_part1), 2),
                     "c1": round(float(r.comments_vs_part1), 2)} for r in parts.itertuples()]
    # per-EP rows so the page can filter by month / category itself
    gen_by_ep = {e["video_id"]: e["gen"] for e in d["episodes"]}
    eps = [{"ep": int(r.ep), "date": r.ep_date, "m": r.ep_date[:7], "cat": r.category,
            "title": r.video_title.split(" l ")[0][:90], "vid": r.video_id, "views": int(r.views),
            "likes": int(r.likes), "comments": int(r.comments), "people": int(r.people),
            "cr": round(float(r.comment_rate), 2), "lr": round(float(r.like_rate), 2),
            "fan": round(float(r.fan), 1), "news": round(float(r.news), 1), "drift": round(float(r.drift), 1),
            "series": r.series if isinstance(r.series, str) else None, "part": int(part_of.get(r.ep, 0)),
            "tags": [t.strip() for t in str(r.tag_names).split(",") if t.strip() and t.strip() != "nan"],
            "gen": gen_by_ep.get(r.video_id)}
           for r in eng.rename(columns={"แฟนตัวยง %": "fan", "นักเสพข่าว %": "news", "ขาจร %": "drift"}).itertuples()]
    cbl = d["overall"]["comments_by_loyalty"]
    d["overall"]["comments_by_loyalty"] = {k: round(100 * v / sum(cbl.values()), 1) for k, v in cbl.items()}
    out = {
        "generated": d["generated_at"], "date_range": d["date_range"], "n_eps": d["n_eps_total"],
        "n_comments": d["n_comments"], "n_people": d["n_people"],      # n_comments already includes replies
        "gens": d["gens"], "loyalty": d["loyalty_levels"], "overall": d["overall"],
        "loyalty_profile": d["loyalty_profile"], "base": base, "categories": cats,
        "tags": d["subtopics"]["tags"], "tag_by_cat": d["subtopics"]["by_category"],
        "communities": d["communities"]["clusters"], "comm_n": d["communities"]["n_people"],
        "series_eps": int(len(series)), "series_views": float(series.views.median()),
        "single_views": float(eng[eng.series.isna()].views.median()),
        "brands_comments": bm.to_dict("records"),
        "brands_onair": onair.to_dict("records"), "onair_eps": n_tr, "eps": eps,
        "gen_x_loy": d["overall"]["gen_x_loyalty_est_people"], "series_parts": series_parts,
        "reach": json.loads((P / "unique_reach.json").read_text()) if (P / "unique_reach.json").exists() else None,
    }
    # video covers (19_thumbnails.py) as static files the page loads from /thumbs/<video_id>.jpg
    import shutil
    THUMBS.mkdir(parents=True, exist_ok=True)
    for f in THUMBS.glob("*.jpg"):
        f.unlink()
    for f in sorted((P / "thumbs").glob("*.jpg")):
        shutil.copyfile(f, THUMBS / f.name)
    out["thumbs"] = sorted(f.stem for f in THUMBS.glob("*.jpg"))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False))
    print(f"built {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB), {len(out['thumbs'])} covers, on-air transcripts: {n_tr}")


if __name__ == "__main__":
    main()

"""Gen step 1a: find comments where people state their OWN age / birth year / life stage.

Regex only proposes candidates; Claude then verifies each person by reading the comment
(is it really about the writer, not a guest on the show?). Verified rows become the
ground truth used in step 4 (accuracy test) - the evidence comment id is kept so it can be
hidden from the guesser.

Output: data/labels/ground_truth/candidates.csv   (local only: contains handles + text)
        data/labels/ground_truth/review_NNN.txt    batches for Claude to verify
"""
import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/labels/ground_truth"
OUT.mkdir(parents=True, exist_ok=True)
REF_YEAR = 2026                      # comments are from 2026
THAI_DIGITS = str.maketrans("๐๑๒๓๔๕๖๗๘๙", "0123456789")

SELF = r"(?:ผม|หนู|ฉัน|ชั้น|เรา|ดิฉัน|เค้า|ป้า|ลุง|ยาย|ตา|กู|ข้า|น้า|อา|แม่|พ่อ|ตัวเอง|ส่วนตัว)"
PATTERNS = {
    # "ผมอายุ 45", "ป้าก็อายุ 60 แล้ว", "เราอายุ32"
    "age_self": re.compile(SELF + r"[^\d\n]{0,12}?อายุ\s*(?:ได้|จะ|ก็|เพิ่ง|ปีนี้|ตอนนี้)?\s*(\d{2})(?!\d)"),
    # "อายุ 52 แล้วยัง...", "ตอนนี้อายุ 40 กว่า" (no pronoun; weaker)
    "age_now": re.compile(r"(?:ตอนนี้|ปีนี้|ปัจจุบัน)\s*(?:ก็)?\s*อายุ\s*(\d{2})(?!\d)"),
    # "เกิดปี 2510", "ผมเกิด พ.ศ. 2529", "เกิดปี 33", "เกิด 1990"
    "birth_year": re.compile(r"เกิด\s*(?:ปี|พ\.?ศ\.?|ค\.?ศ\.?)?\s*(25[0-6]\d|19[3-9]\d|20[01]\d|[2-6]\d)(?!\d)"),
    # "คนเจน z", "เป็น gen x", "เด็ก genz"
    "gen_self": re.compile(r"(?:เป็น|คน|เด็ก|พวก|รุ่น|ชาว|แบบ)\s*(?:gen|เจน)\s*-?\s*(x|y|z|alpha|อัลฟ่า|เอ็กซ์|วาย|แซด|baby\s*boomer|บูมเมอร์)", re.I),
    "boomer_self": re.compile(r"(?:เป็น|คน|รุ่น|พวก)\s*(?:baby\s*boomer|เบบี้บูม|บูมเมอร์)", re.I),
    # school level of the writer
    "school": re.compile(r"(?:หนู|ผม|เรา|ฉัน|กู)[^\n]{0,15}?(?:เรียน|อยู่|ขึ้น|จบ)\s*(?:ชั้น)?\s*(ป\.?\s*[1-6]|ม\.?\s*[1-6]|ปี\s*[1-4]|มหาลัย|มหาวิทยาลัย|ปวช|ปวส)"),
    # retired / grandparent
    "retired": re.compile(SELF + r"[^\n]{0,15}?(?:เกษียณ|ปลดเกษียณ|วัยเกษียณ)"),
    "grandparent": re.compile(r"(?<!ลูก)(?:หลาน|เหลน)\s*(?:ของ)?\s*(?:ผม|ป้า|ยาย|ตา|ลุง|ฉัน|เรา|ย่า|ปู่)|(?:ผม|ป้า|ยาย|ตา|ลุง|ฉัน|เรา)\s*(?:มี|ก็มี)\s*หลาน"),
}


def main():
    if (OUT / "verified.txt").exists():
        raise SystemExit("verified.txt exists: re-running round 1 would renumber rids and break it. "
                         "Move verified.txt away first if you really want to start over.")
    rows = []
    for f in sorted((ROOT / "data/raw/comments").glob("*.jsonl")):
        for line in open(f):
            c = json.loads(line)
            t = c.get("text", "").translate(THAI_DIGITS)
            for name, rx in PATTERNS.items():
                m = rx.search(t)
                if m:
                    rows.append({"user_id": c["channel"], "handle": c.get("author", ""), "cid": c["cid"],
                                 "video_id": f.stem, "pattern": name,
                                 "value": m.group(1) if m.groups() else m.group(0),
                                 "span": t[max(0, m.start() - 60): m.end() + 60].replace("\n", " ").replace("\r", " "),
                                 "text": re.sub(r"\s+", " ", t)[:400]})
    cand = pd.DataFrame(rows)
    cand = cand.reset_index(drop=True)
    cand["rid"] = cand.index
    cand.to_csv(OUT / "candidates.csv", index=False)
    # review batches for Claude: rid|pattern|~60 chars either side of the match
    for i in range(0, len(cand), 250):
        with open(OUT / f"review_{i // 250 + 1:03d}.txt", "w") as f:
            for r in cand.iloc[i:i + 250].itertuples():
                f.write(f"{r.rid}|{r.pattern}|{r.span}\n")
    print(f"{len(cand):,} candidate comments from {cand.user_id.nunique():,} people")
    print(cand.groupby("pattern").agg(comments=("cid", "size"), people=("user_id", "nunique")).to_string())


if __name__ == "__main__" and len(__import__("sys").argv) == 1:
    main()


# ---------------------------------------------------------------------------
# Step 1b: turn Claude-verified rows (verified.txt) into one ground-truth row per person.
# Run:  .venv/bin/python scripts/08_ground_truth.py build
# ---------------------------------------------------------------------------
GEN_BIRTH = [("Gen Z", 1997, 2020), ("Gen Y", 1981, 1996), ("Gen X", 1965, 1980), ("Baby Boomer", 1900, 1964)]


def gen_of_birth_range(b_lo, b_hi):
    """A person is labelled only if their whole possible birth-year range sits in one Gen."""
    hits = [g for g, lo, hi in GEN_BIRTH if lo <= b_lo and b_hi <= hi]
    return hits[0] if hits else "ก้ำกึ่ง"


def build():
    cand = pd.read_csv(OUT / "candidates.csv")
    rows = []
    for line in open(OUT / "verified.txt"):
        if line.startswith("#") or not line.strip():
            continue
        rid, lo, hi, typ = line.strip().split("|")
        rows.append((int(rid), int(lo), int(hi), typ))
    v = pd.DataFrame(rows, columns=["rid", "age_lo", "age_hi", "type"]).merge(
        cand[["rid", "user_id", "cid", "video_id", "pattern"]], on="rid")
    # birthday unknown -> someone aged a in 2026 was born in REF_YEAR-a-1 or REF_YEAR-a
    per = v.groupby("user_id").agg(age_lo=("age_lo", "max"), age_hi=("age_hi", "min"),
                                   n_evidence=("rid", "size"), type=("type", "min"),
                                   evidence_cids=("cid", lambda s: " ".join(sorted(set(s)))))
    conflict = per.age_lo > per.age_hi
    per.loc[conflict, ["age_lo", "age_hi"]] = v[v.user_id.isin(per.index[conflict])] \
        .groupby("user_id")[["age_lo", "age_hi"]].agg({"age_lo": "min", "age_hi": "max"})
    per["conflict"] = conflict
    per["birth_lo"] = REF_YEAR - per.age_hi - 1
    per["birth_hi"] = REF_YEAR - per.age_lo
    per["generation"] = [gen_of_birth_range(a, b) for a, b in zip(per.birth_lo, per.birth_hi)]
    per.to_csv(OUT / "ground_truth.csv")
    print(f"{len(v)} verified rows -> {len(per)} people ({conflict.sum()} with conflicting ages)")
    print(per.generation.value_counts().to_string())
    print("by evidence type:", per.type.value_counts().to_dict())


if __name__ == "__main__" and len(__import__("sys").argv) > 1 and __import__("sys").argv[1] == "build":
    build()


# ---------------------------------------------------------------------------
# Step 1c (round 2): more patterns, skipping comments already reviewed in round 1.
# Run:  .venv/bin/python scripts/08_ground_truth.py more     -> review2_NNN.txt (rid continues)
# ---------------------------------------------------------------------------
PATTERNS2 = {
    # "ปี 2540 ผมเรียน ม.1", "ปี35 ตอนนั้นผมอยู่ ป2", "พ.ศ. 2530 ผมอายุ 10"
    "year_anchor": re.compile(r"(?:ปี|พ\.?ศ\.?)\s*(25[0-6]\d|19[4-9]\d|20[01]\d|[2-6]\d)(?!\d)[^\n]{0,30}?" + SELF
                              + r"[^\n]{0,20}?(?:อายุ\s*\d|เรียน|อยู่\s*(?:ชั้น)?\s*[ปม]\.?\s*\d|ขวบ|เกิด|มหาลัย|ทำงาน)"),
    "year_anchor_rev": re.compile(SELF + r"[^\n]{0,25}?(?:เรียน|อยู่|อายุ)[^\n]{0,15}?(?:ปี|พ\.?ศ\.?)\s*(25[0-6]\d|19[4-9]\d|20[01]\d)(?!\d)"),
    # "20 ปีก่อนผมอายุ 25"
    "years_ago": re.compile(r"(\d{1,2})\s*ปี\s*(?:ที่แล้ว|ก่อน|มาแล้ว)[^\n]{0,20}?" + SELF + r"[^\n]{0,10}?อายุ\s*(\d{1,2})"),
    # "ผม 45 ปีแล้ว", "เรานี่ 32 ปี", "หนู 15 ขวบ"
    "self_num": re.compile(SELF + r"\s*(?:ก็|นี่|เอง|เนี่ย|นะ|จะ|ปีนี้)?\s*(\d{2})\s*(?:ปี|ขวบ)(?!\s*(?:ที่|ก่อน|มา|แล้วที่))"),
    "this_year": re.compile(r"(?:ปีนี้|ตอนนี้|ปัจจุบัน)\s*(?:ก็|ผม|เรา|ฉัน|หนู|กู)?\s*(\d{2})\s*(?:ปี|แล้ว|ขวบ|ละ)"),
    "age_rev": re.compile(r"อายุ\s*(?:ของ)?\s*" + SELF + r"\s*(?:ก็|ตอนนี้|นี่)?\s*(\d{2})(?!\d)"),
    # current students
    "student": re.compile(r"(?:หนู|ผม|เรา|ฉัน|กู)\s*(?:ก็|ยัง|เพิ่ง)?\s*(?:เป็น)?\s*(?:เด็ก\s*[มป]\.?\s*\d|นักศึกษา|นักเรียน|เด็กมหาลัย|เด็กมหาวิทยาลัย|เด็กมัธยม|เด็กประถม)"),
    # life stage words
    "life_stage": re.compile(SELF + r"[^\n]{0,10}?(?:เข้า|อยู่ใน|เป็น|ถึง)?\s*วัย(ทอง|เกษียณ|ชรา|รุ่น|กลางคน|ทำงาน)"),
    "english": re.compile(r"\bI(?:'m| am)\s*(\d{2})\b(?:\s*(?:years|yrs|y/?o))?", re.I),
}


def more():
    if (OUT / "review2_001.txt").exists():
        raise SystemExit("round 2 already generated (review2_*.txt); re-running would duplicate rids")
    seen = set(pd.read_csv(OUT / "candidates.csv").cid)
    start = int(pd.read_csv(OUT / "candidates.csv").rid.max()) + 1
    rows = []
    for f in sorted((ROOT / "data/raw/comments").glob("*.jsonl")):
        for line in open(f):
            c = json.loads(line)
            if c["cid"] in seen:
                continue
            t = c.get("text", "").translate(THAI_DIGITS)
            for name, rx in PATTERNS2.items():
                m = rx.search(t)
                if m:
                    rows.append({"user_id": c["channel"], "handle": c.get("author", ""), "cid": c["cid"],
                                 "video_id": f.stem, "pattern": name,
                                 "value": m.group(1) if m.groups() else m.group(0),
                                 "span": t[max(0, m.start() - 60): m.end() + 60].replace("\n", " ").replace("\r", " "),
                                 "text": re.sub(r"\s+", " ", t)[:400]})
                    break                      # one row per comment
    c2 = pd.DataFrame(rows).reset_index(drop=True)
    c2["rid"] = c2.index + start
    allc = pd.concat([pd.read_csv(OUT / "candidates.csv"), c2], ignore_index=True)
    allc.to_csv(OUT / "candidates.csv", index=False)
    for i in range(0, len(c2), 250):
        with open(OUT / f"review2_{i // 250 + 1:03d}.txt", "w") as f:
            for r in c2.iloc[i:i + 250].itertuples():
                f.write(f"{r.rid}|{r.pattern}|{r.span}\n")
    print(f"round 2: {len(c2):,} new candidate comments from {c2.user_id.nunique():,} people "
          f"(rid {start}-{c2.rid.max()})")
    print(c2.groupby("pattern").agg(comments=("cid", "size"), people=("user_id", "nunique")).to_string())


if __name__ == "__main__" and len(__import__("sys").argv) > 1 and __import__("sys").argv[1] == "more":
    more()

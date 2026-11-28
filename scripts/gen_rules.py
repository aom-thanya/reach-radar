"""Rule-based generation estimate, scored PER PERSON (all of a person's comments together).

Generations (birth year): Baby Boomer <=1964, Gen X 1965-1980, Gen Y 1981-1996, Gen Z 1997-2012.
Reference year 2026, so ages: Boomer 62+, X 46-61, Y 30-45, Z 14-29.

Signals, strongest first:
  1. Stated age / life stage in the text ("ผมอายุ 58", "ป้าว่า", "หลานยาย")
  2. Birth year in the handle (พ.ศ. anywhere; ค.ศ. only when it is NOT the 4-digit
     suffix YouTube auto-appends to handles, e.g. @somchai4408)
  3. Vocabulary / emoji / writing style (weak, capped per comment)
A person with too little evidence is labelled "ไม่ระบุ" instead of being forced into a group.
"""
import re

GENS = ["Baby Boomer", "Gen X", "Gen Y", "Gen Z"]
UNKNOWN = "ไม่ระบุ"
REF_YEAR = 2026


def gen_of_birth_year(y):
    if y <= 1964:
        return "Baby Boomer"
    if y <= 1980:
        return "Gen X"
    if y <= 1996:
        return "Gen Y"
    if y <= 2012:
        return "Gen Z"
    return None


def gen_of_age(age):
    return gen_of_birth_year(REF_YEAR - age)


# ---------- 1. stated age / life stage ----------
SELF = r"(?:ผม|ฉัน|ดิฉัน|เรา|หนู|ป้า|ลุง|ยาย|กู)"  # first person only
AGE_RE = re.compile(SELF + r"\s*(?:ก็|เอง|นี่|เนี่ย)?\s*(?:อายุ|อายุก็|อายุจะ|ตอนนี้อายุ)\s*(\d{2})\s*(?:ปี|แล้ว|กว่า|\+)?")
AGE_RE3 = re.compile(SELF + r"\s*(?:เกิด|เกิดปี)\s*(?:พ\.?ศ\.?)?\s*(25[0-5]\d)")

LIFE_STAGE = [
    # (regex, {gen: score}, label)
    (re.compile(r"(?:ยาย|ตา|ปู่|ย่า)(?:ว่า|คิดว่า|ขอ|เห็น|ดู|ฟัง|สงสาร|เป็น)|หลานยาย|หลานตา|เลี้ยงหลาน|มีหลาน|หลานผม|หลานฉัน|เกษียณ|บำนาญ"),
     {"Baby Boomer": 3, "Gen X": 1.5}, "พูดถึงตัวเองเป็นปู่ย่าตายาย/เกษียณ"),
    (re.compile(r"(?:ป้า|ลุง|น้า)(?:ว่า|คิดว่า|ขอ|เห็น|ดู|ฟัง|สงสาร|เป็นคน|ก็เป็น)"),
     {"Gen X": 2.5, "Baby Boomer": 1.5}, "เรียกตัวเองว่าป้า/ลุง"),
    (re.compile(r"ลูก(?:ผม|ฉัน|เรา|ดิฉัน)\s*(?:ก็)?\s*(?:ทำงาน|แต่งงาน|เรียนจบ|เรียนมหาลัย|มีครอบครัว)"),
     {"Gen X": 2.5, "Baby Boomer": 1}, "ลูกโตทำงาน/แต่งงานแล้ว"),
    (re.compile(r"ลูก(?:ผม|ฉัน|เรา|ดิฉัน)\s*(?:ก็)?\s*(?:อนุบาล|ขวบ|ประถม|ป\.\d|เพิ่งเกิด)|เป็นแม่ลูกอ่อน|ท้อง\s*\d\s*เดือน"),
     {"Gen Y": 2.5, "Gen X": 0.5}, "มีลูกเล็ก"),
    (re.compile(r"(?:หนู|ผม|เรา)(?:ก็)?(?:เรียน|อยู่)\s*(?:ม\.\s?\d|มัธยม|มหาลัย|ปี\s?\d)|(?:หนู|ผม)ยังเรียน|ตอนนี้เรียน|สอบเข้า|ครูที่โรงเรียนหนู"),
     {"Gen Z": 3}, "ยังเป็นนักเรียน/นักศึกษา"),
    (re.compile(r"ทันยุค|สมัยผมเด็ก|สมัยฉันเด็ก|สมัยก่อนตอนเด็ก|ยุค\s?(?:80|90|๘๐|๙๐)|สมัยพ่อขุน|ดูมาตั้งแต่สมัย"),
     {"Gen X": 1.5, "Baby Boomer": 1}, "เล่าย้อนยุค"),
]

# ---------- 3. vocabulary ----------
VOCAB = [
    (re.compile(r"ฉ่ำ|จึ้ง|ปังปุริเย่|แกร|ตึงมาก|มูฟออน|ช็อตฟีล|อิหยังวะ|ไม่ไหวแล้วแก|คือดีย์|ดีย์|เบียว|นอยด์|ไม่ปังอะ|โฮ่งงง|เอ๋อแดก|ตัวมัม|ตัวแม่|มัมหมี|แม่ๆ|ซิส|ทิพย์อะ|ไม่ได้อะ|จริงปะ|ปะวะ|อ่ะ+\b|ป่ะ"),
     {"Gen Z": 1.5, "Gen Y": 0.5}, "ศัพท์วัยรุ่น"),
    (re.compile(r"\b(?:lol|omg|ngl|bro|vibe|slay|cringe|fr|idk|sus|npc|red ?flag|toxic|gaslight)\b", re.I),
     {"Gen Z": 1.2, "Gen Y": 0.5}, "ศัพท์วัยรุ่น (อังกฤษ)"),
    (re.compile(r"[😭🥹💀🫠🥲🤡🫶🥺🫣🤌]"), {"Gen Z": 0.8, "Gen Y": 0.4}, "อีโมจิสายวัยรุ่น"),
    (re.compile(r"5{4,}|ถถถ+"), {"Gen Y": 0.5, "Gen Z": 0.5}, "ภาษาโซเชียล"),
    (re.compile(r"สาธุ|เจริญพร|อโหสิกรรม|อนุโมทนา|กราบเรียน|พระคุณเจ้า|ขอให้ท่าน|ขอพระคุณ|ขอบพระคุณ|ผู้ใหญ่ใจดี"),
     {"Baby Boomer": 1.2, "Gen X": 0.8}, "สำนวนผู้ใหญ่ (ศาสนา/สุภาพ)"),
    (re.compile(r"เวรกรรม|กรรมตามสนอง|บาปกรรม|ศีลธรรม|บ้านเมือง|ประเทศชาติ|สมัยก่อน|ลูกหลาน|ท่านผู้ชม|ธรรมะ|เด็กสมัยนี้|คนสมัยนี้|ศาลเตี้ย|ขอให้โชคดี"),
     {"Gen X": 0.8, "Baby Boomer": 0.5}, "สำนวนผู้ใหญ่"),
    (re.compile(r"🙏|🌹|🌺|💐|🌷"), {"Gen X": 0.4, "Baby Boomer": 0.5}, "อีโมจิดอกไม้/ไหว้"),
    (re.compile(r"(?:คุณ|พี่)หนุ่มคะ|ขอบคุณคุณหนุ่ม|ขอบคุณรายการ|ติดตามทุกวัน|ติดตามตลอด|ดูทุกวัน"),
     {"Gen X": 0.5, "Baby Boomer": 0.3}, "สำนวนแฟนรายการวัยผู้ใหญ่"),
]

# ---------- 2. handle birth year ----------
BE_YEAR = re.compile(r"(25[0-5]\d)")
CE_YEAR = re.compile(r"(19[4-9]\d|200\d|201[0-2])")
AUTO_SUFFIX = re.compile(r"[a-z฀-๿_.\-]\d{4}$|-\w{3}$", re.I)  # @name1234 / @ชื่อ-ก8ค


def handle_year(handle):
    h = (handle or "").lstrip("@")
    m = BE_YEAR.search(h)
    if m:
        y = int(m.group(1)) - 543
        if 1940 <= y <= 2012:
            return y, f"handle มีปี พ.ศ. {m.group(1)}"
    core = h
    if re.search(r"[A-Za-z฀-๿]\d{4}$", h):
        core = h[:-4]  # drop YouTube's random 4-digit suffix before looking for a CE year
    m = CE_YEAR.search(core)
    if m:
        return int(m.group(1)), f"handle มีปี ค.ศ. {m.group(1)}"
    return None, None


def score_comment(text, scores, reasons):
    t = text or ""
    for rx in (AGE_RE,):
        m = rx.search(t)
        if m:
            age = int(m.group(1))
            g = gen_of_age(age) if 12 <= age <= 95 else None
            if g:
                scores[g] += 6
                reasons.add(f"ระบุอายุ {age}")
                return
    m = AGE_RE3.search(t)
    if m:
        g = gen_of_birth_year(int(m.group(1)) - 543)
        if g:
            scores[g] += 6
            reasons.add(f"ระบุปีเกิด {m.group(1)}")
            return
    for rx, w, label in LIFE_STAGE:
        if rx.search(t):
            for g, s in w.items():
                scores[g] += s
            reasons.add(label)
    added = 0.0
    for rx, w, label in VOCAB:
        if rx.search(t) and added < 2:
            for g, s in w.items():
                scores[g] += s
            added += max(w.values())
            reasons.add(label)
    if len(t) >= 250:
        scores["Gen X"] += 0.3
        reasons.add("เขียนยาว")


MIN_SCORE = 2.0   # top score needed to assign a generation
MIN_MARGIN = 1.0  # lead over runner-up


def classify_person(handle, texts):
    """Return (generation, confidence, score_dict, reasons)."""
    scores = {g: 0.0 for g in GENS}
    reasons = set()
    y, why = handle_year(handle)
    if y:
        g = gen_of_birth_year(y)
        if g:
            scores[g] += 4
            reasons.add(why)
    for t in texts:
        score_comment(t, scores, reasons)
    ranked = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)
    (g1, s1), (_, s2) = ranked[0], ranked[1]
    if s1 < MIN_SCORE or s1 - s2 < MIN_MARGIN:
        return UNKNOWN, "-", scores, reasons
    conf = "สูง" if s1 >= 6 and s1 - s2 >= 3 else ("กลาง" if s1 >= 3.5 else "ต่ำ")
    return g1, conf, scores, reasons

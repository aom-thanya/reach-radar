"""Check the EP category labels (Gold-standard style check, 22 พ.ย. 2569).

Claude re-labelled EPs from the title only, without seeing the existing label
(data/labels/category_check/blind_relabel.csv, one letter per category). Two comparisons:
  A. blind Claude vs HUMAN  : the 39 EPs whose category came from the analyst's original sheet
                              -> a real validation of AI labelling against a person
  B. blind Claude vs Claude  : sampled EPs (key_claude.csv, stratified 50) whose label Claude made
                              earlier -> consistency (test-retest) of the AI, NOT correctness
Reports raw agreement with a Wilson 95% interval and Cohen's kappa, plus every disagreement.
Output: data/processed/eda/category_kappa.txt
"""
import math
from pathlib import Path

import pandas as pd
from sklearn.metrics import cohen_kappa_score

ROOT = Path(__file__).resolve().parents[1]
CK = ROOT / "data/labels/category_check"
CODE = {"P": "ข้อพิพาท & คดีความ", "F": "ครอบครัว & ความสัมพันธ์", "B": "ความเชื่อ & ไสยศาสตร์",
        "D": "ดราม่าบุคคลสาธารณะ", "S": "ประเด็นสังคมทั่วไป", "W": "ภัยพิบัติ & น้ำท่วม", "R": "ศาสนา & วัด",
        "H": "สุขภาพ & การแพทย์", "C": "อาชญากรรม & การหลอกลวง", "A": "อุบัติเหตุ & คดีอาญา"}


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return 100 * (c - h), 100 * (c + h)


def report(name, df, out):
    k = (df.blind == df.ref).sum()
    n = len(df)
    lo, hi = wilson(k, n)
    kap = cohen_kappa_score(df.ref, df.blind)
    out.append(f"{name}: {n} EP · agree {k}/{n} = {100 * k / n:.0f}% (Wilson 95% {lo:.0f}–{hi:.0f}%) · Cohen's kappa {kap:.2f}")
    for r in df[df.blind != df.ref].itertuples():
        out.append(f"   EP{r.ep}: ref = {r.ref} | blind = {r.blind} | {r.title[:70]}")


def main():
    eng = pd.read_csv(ROOT / "data/processed/ep_engagement.csv").drop_duplicates("ep")
    blind = pd.read_csv(CK / "blind_relabel.csv")
    blind["blind"] = blind.blind.map(CODE)
    df = blind.merge(eng[["ep", "category", "category_source", "video_title"]], on="ep")
    df = df.rename(columns={"category": "ref", "video_title": "title"})
    out = []
    human = df[df.category_source.str.startswith("ผู้วิเคราะห์")]
    report("A. blind Claude vs HUMAN (analyst sheet)", human, out)
    sample = set(pd.read_csv(CK / "key_claude.csv").ep)
    ai = df[df.ep.isin(sample) & df.category_source.str.startswith("claude")]
    report("B. blind Claude vs earlier Claude (consistency)", ai, out)
    text = "\n".join(out)
    (ROOT / "data/processed/eda/category_kappa.txt").write_text(text)
    print(text)


if __name__ == "__main__":
    main()

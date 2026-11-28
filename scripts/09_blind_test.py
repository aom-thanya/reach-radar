"""Gen step 4: blind accuracy test of Claude's generation guesses against the ground truth.

make : pick ground-truth people with a clean Gen (all Baby Boomers + an equal number from each other Gen,
       N_PER_GEN), drop EVERY comment of theirs that any age regex matched (not only the verified one),
       and write them in the same format as the sample batches under shuffled keys T001...
       -> data/labels/todo/blind_test.txt     (what Claude reads; no ages, no truth)
          data/labels/ground_truth/blind_key.csv   (key -> truth; Claude must not open it before scoring)
score: compare data/labels/done/blind_test.csv (key,generation,confidence,reason) with the truth.
       Reports coverage, accuracy, macro-F1, confusion matrix, accuracy by confidence and a 2-class
       (Y/Z vs X/Boomer) view, and saves the confusion matrix for step 4 bias correction.

Usage: .venv/bin/python scripts/09_blind_test.py make | score [3]   (3 = Gen Z / Gen Y / Gen X ขึ้นไป)
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GTD = ROOT / "data/labels/ground_truth"
LAB = ROOT / "data/labels"
GENS = ["Baby Boomer", "Gen X", "Gen Y", "Gen Z"]
# agreed 2569-11-22: report 3 groups, because Boomer vs X cannot be told apart from text
GROUP3 = {"Baby Boomer": "Gen X ขึ้นไป", "Gen X": "Gen X ขึ้นไป", "Gen Y": "Gen Y", "Gen Z": "Gen Z"}
G3 = ["Gen X ขึ้นไป", "Gen Y", "Gen Z"]
LEAKED = {"T024", "T031", "T076", "T089"}   # age statements the regex missed (no pronoun); excluded from scoring
N_PER_GEN = 25
MAX_COMMENTS = 6
MAX_CHARS = 140
SEED = 7


def make():
    gt = pd.read_csv(GTD / "ground_truth.csv")
    gt = gt[gt.generation.isin(GENS)]
    pick = pd.concat([g.sample(n=min(N_PER_GEN if k != "Baby Boomer" else len(g), len(g)), random_state=SEED)
                      for k, g in gt.groupby("generation")]).sample(frac=1, random_state=SEED)
    pick["key"] = [f"T{i + 1:03d}" for i in range(len(pick))]
    hide = set(pd.read_csv(GTD / "candidates.csv").cid)           # every age-regex hit, verified or not
    want = set(pick.user_id)
    texts, handles = {}, {}
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        for line in open(f):
            c = json.loads(line)
            u = c.get("channel")
            if u in want:
                handles[u] = c.get("author", "")
                if c["cid"] not in hide:
                    texts.setdefault(u, []).append(" ".join((c.get("text") or "").split()))
    lines = []
    for r in pick.itertuples():
        ts = sorted(set(texts.get(r.user_id, [])), key=len, reverse=True)[:MAX_COMMENTS]
        lines.append(f"## {r.key} | {handles.get(r.user_id, '')} | {len(texts.get(r.user_id, []))} คอมเม้น (หลังซ่อน)")
        lines += [f"- {t[:MAX_CHARS]}" for t in ts]
    (LAB / "todo" / "blind_test.txt").write_text("\n".join(lines))
    pick["n_left"] = pick.user_id.map(lambda u: len(texts.get(u, [])))
    pick[["key", "user_id", "generation", "age_lo", "age_hi", "n_left"]].to_csv(GTD / "blind_key.csv", index=False)
    print(f"blind test: {len(pick)} people {pick.generation.value_counts().to_dict()}; "
          f"{(pick.n_left == 0).sum()} have no comment left after hiding")


def score(groups=None):
    key = pd.read_csv(GTD / "blind_key.csv")
    lab = pd.read_csv(LAB / "done" / "blind_test.csv")
    m = key.merge(lab, on="key", suffixes=("_true", "_pred"))
    m = m[~m.key.isin(LEAKED)]
    classes = GENS
    if groups == "3":
        classes = G3
        for c in ("generation_true", "generation_pred"):
            m[c] = m[c].map(lambda g: GROUP3.get(g, g))
    m["guessed"] = m.generation_pred != "ไม่ระบุ"
    g = m[m.guessed]
    acc = (g.generation_true == g.generation_pred).mean()
    print(f"people {len(m)} | guessed {m.guessed.sum()} ({m.guessed.mean():.0%} coverage)")
    print(f"accuracy on guessed: {acc:.1%}   (chance with {len(classes)} balanced classes ≈ {1 / len(classes):.0%})")
    print(f"(excluding {len(LEAKED)} leaked people; classes: {classes})")
    f1 = []
    for c in classes:
        tp = ((g.generation_pred == c) & (g.generation_true == c)).sum()
        p = tp / max((g.generation_pred == c).sum(), 1)
        r = tp / max((g.generation_true == c).sum(), 1)
        f1.append(0 if p + r == 0 else 2 * p * r / (p + r))
        print(f"  {c:<12} precision {p:.0%}  recall {r:.0%}  F1 {f1[-1]:.2f}  (n true guessed {(g.generation_true == c).sum()})")
    print(f"macro-F1: {sum(f1) / len(f1):.2f}")
    cm = pd.crosstab(g.generation_true, g.generation_pred).reindex(index=classes, columns=classes, fill_value=0)
    print("confusion (rows = truth, cols = Claude):")
    print(cm.to_string())
    cm.to_csv(GTD / ("confusion_matrix_3.csv" if groups == "3" else "confusion_matrix.csv"))
    print("accuracy by confidence:", g.groupby("confidence").apply(
        lambda d: f"{(d.generation_true == d.generation_pred).mean():.0%} of {len(d)}").to_dict())
    old = {"Baby Boomer": "X/Boomer", "Gen X": "X/Boomer", "Gen X ขึ้นไป": "X/Boomer", "Gen Y": "Y/Z", "Gen Z": "Y/Z"}
    acc2 = (g.generation_true.map(old) == g.generation_pred.map(old)).mean()
    print(f"2-class (Y/Z vs X/Boomer) accuracy on guessed: {acc2:.1%}")
    print("coverage by true Gen:", m.groupby("generation_true").guessed.mean().round(2).to_dict())
    print("coverage by comments left:", m.groupby(pd.cut(m.n_left, [-1, 0, 2, 5, 1000])).guessed.mean().round(2).to_dict())


if __name__ == "__main__":
    if sys.argv[1] == "make":
        make()
    else:
        score(sys.argv[2] if len(sys.argv) > 2 else None)

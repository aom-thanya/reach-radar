"""Gen step 2: stratified random sample of people for Claude to read (step 3).

Design
- Strata = k-means loyalty segments (แฟนตัวยง / นักเสพข่าว / ขาจร), N_PER people each (default 1,500).
- People in the ground-truth set (data/labels/ground_truth/ground_truth.csv) are excluded: they are the
  accuracy test (step 4) and must not leak into the training labels.
- Weight (Horvitz-Thompson / inverse probability) = stratum population / stratum sample size,
  so each sampled person stands for that many people when shares are estimated.
- Order is shuffled across strata, then cut into batches of BATCH people, so every batch mixes
  segments and reading fatigue does not hit one segment.

Each person is shown as a short key (S0001...) + handle + their comments (longest first,
up to MAX_COMMENTS, each cut at MAX_CHARS). Claude writes labels to
data/labels/done/batch_NNN.csv:  key,generation,confidence,reason
generation in {Gen Z, Gen Y, Gen X ขึ้นไป, ไม่ระบุ} (3 groups agreed 2569-11-22 after the blind test;
batch_001 was labelled with 4 Gens and is mapped Boomer/X -> Gen X ขึ้นไป when loaded);
confidence in {สูง, กลาง, ต่ำ}.

Usage: .venv/bin/python scripts/04_make_sample.py [N_PER]
Re-running keeps the existing sample (delete data/labels/sample.csv to redraw) and only rewrites
batches that are not labelled yet.
"""
import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
USERS = ROOT / "data/processed/users.csv.gz"
GT = ROOT / "data/labels/ground_truth/ground_truth.csv"
COMMENTS = ROOT / "data/raw/comments"
LAB = ROOT / "data/labels"
N_PER = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
BATCH = 150
MAX_COMMENTS = 6
MAX_CHARS = 140
SEED = 42


def main():
    (LAB / "todo").mkdir(parents=True, exist_ok=True)
    (LAB / "done").mkdir(parents=True, exist_ok=True)
    users = pd.read_csv(USERS, index_col="user_id")
    frame_f = LAB / "sample.csv"
    if frame_f.exists():
        frame = pd.read_csv(frame_f, index_col="user_id")
        print(f"keeping existing sample of {len(frame):,}")
    else:
        gt = set(pd.read_csv(GT).user_id)
        parts = []
        for seg, pop in users.groupby("loyalty"):
            pool = pop[~pop.index.isin(gt)]
            n = min(N_PER, len(pool))
            s = pool.sample(n=n, random_state=SEED).copy()
            s["weight"] = len(pop) / n            # stands for the whole stratum, ground truth included
            s["stratum_pop"] = len(pop)
            parts.append(s)
            print(f"  {seg}: {n:,} of {len(pop):,} (excluded {len(pop) - len(pool)} ground-truth people), "
                  f"weight {len(pop) / n:.1f}")
        frame = pd.concat(parts).sample(frac=1, random_state=SEED)
        frame["key"] = [f"S{i + 1:04d}" for i in range(len(frame))]
        frame["batch"] = [i // BATCH + 1 for i in range(len(frame))]
        frame[["key", "handle", "loyalty", "n_comments", "n_eps", "weight", "stratum_pop", "batch"]] \
            .to_csv(frame_f)
        print(f"sample: {len(frame):,} people in {frame.batch.max()} batches of {BATCH}")

    want = set(frame.index)
    texts = {}
    for f in COMMENTS.glob("*.jsonl"):
        for line in open(f):
            c = json.loads(line)
            u = c.get("channel")
            if u in want:
                texts.setdefault(u, []).append(" ".join((c.get("text") or "").split()))
    chars = 0
    for b, sub in frame.groupby("batch"):
        if (LAB / "done" / f"batch_{b:03d}.csv").exists():
            continue
        lines = []
        for u, r in sub.iterrows():
            ts = sorted(set(texts.get(u, [])), key=len, reverse=True)[:MAX_COMMENTS]
            lines.append(f"## {r.key} | {r.handle} | {r.n_comments} คอมเม้น")
            lines += [f"- {t[:MAX_CHARS]}" for t in ts]
        body = "\n".join(lines)
        chars += len(body)
        (LAB / "todo" / f"batch_{b:03d}.txt").write_text(body)
    print(f"batches written to {LAB / 'todo'} ({chars / 1e6:.2f}M characters to read)")


if __name__ == "__main__":
    main()

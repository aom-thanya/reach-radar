"""Gen step 5 (pilot): learn Claude's 3-group labels and predict every commenter.

Labels  : data/labels/done/batch_*.csv (Claude read the person's comments) -> Gen Z / Gen Y / Gen X ขึ้นไป.
          Boomer/X from batch_001 are folded into Gen X ขึ้นไป. "ไม่ระบุ" rows are not used.
          Sample weight by Claude's confidence: สูง 1.0, กลาง 0.8, ต่ำ 0.5.
Test    : the ground-truth people (self-stated ages, data/labels/ground_truth/ground_truth.csv),
          with every age-regex comment of theirs removed, i.e. the same conditions as Claude's blind test.
          None of them is in the training sample (04_make_sample.py excluded them).
Features: per person, all comments joined
          - character n-gram TF-IDF (2-4, char_wb) of the comment text   (Thai has no spaces)
          - character n-gram TF-IDF (1-3) of the handle
          - a few numbers: log comments, mean length, emoji share, '555' share, Thai-script handle,
            handle ending in 4 digits (YouTube auto suffix)
          TF-IDF vocabularies are fitted on ALL people (unsupervised), then the model uses labelled ones.
Model   : multinomial LogisticRegression, class_weight=balanced, C picked by 5-fold stratified CV.
Outputs : data/processed/gen_proba.csv.gz   user_id, p_Gen Z, p_Gen Y, p_Gen X ขึ้นไป (LOCAL ONLY)
          data/processed/eda/gen_model_report.txt
"""
import glob
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "data/labels"
OUT = ROOT / "data/processed"
G3 = ["Gen Z", "Gen Y", "Gen X ขึ้นไป"]
FOLD = {"Baby Boomer": "Gen X ขึ้นไป", "Gen X": "Gen X ขึ้นไป"}
CONF_W = {"สูง": 1.0, "กลาง": 0.8, "ต่ำ": 0.5}
EMOJI = re.compile("[\U0001F300-\U0001FAFF☀-➿]")
THAI = re.compile("[฀-๿]")
LOG = []


def say(*a):
    s = " ".join(str(x) for x in a)
    print(s, flush=True)
    LOG.append(s)


def load_people():
    hide = set(pd.read_csv(LAB / "ground_truth/candidates.csv").cid)
    gt_users = set(pd.read_csv(LAB / "ground_truth/ground_truth.csv").user_id)
    texts, handles = {}, {}
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        for line in open(f):
            c = json.loads(line)
            u = c.get("channel")
            if not u:
                continue
            handles[u] = c.get("author", "")
            if u in gt_users and c["cid"] in hide:      # keep the test fair: no age statements
                continue
            texts.setdefault(u, []).append(" ".join((c.get("text") or "").split()))
    users = sorted(handles)
    return users, [texts.get(u, []) for u in users], [handles[u] for u in users]


def numeric(texts, handles):
    rows = []
    for ts, h in zip(texts, handles):
        n = len(ts)
        joined = " ".join(ts)
        rows.append([np.log1p(n),
                     np.mean([len(t) for t in ts]) if n else 0,
                     np.mean([bool(EMOJI.search(t)) for t in ts]) if n else 0,
                     np.mean(["555" in t for t in ts]) if n else 0,
                     len(EMOJI.findall(joined)) / max(len(joined), 1) * 100,
                     float(bool(THAI.search(h))),
                     float(bool(re.search(r"\d{4}$", h)))])
    return np.array(rows, dtype=np.float32)


def main():
    users, texts, handles = load_people()
    say(f"{len(users):,} people")
    docs = [" ".join(ts)[:4000] for ts in texts]                   # cap very long histories
    tv = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=5, max_features=150000,
                         sublinear_tf=True, dtype=np.float32)
    Xt = tv.fit_transform(docs)
    hv = TfidfVectorizer(analyzer="char", ngram_range=(1, 3), min_df=5, max_features=20000,
                         sublinear_tf=True, dtype=np.float32, lowercase=True)
    Xh = hv.fit_transform([h.lstrip("@") for h in handles])
    Xn = StandardScaler().fit_transform(numeric(texts, handles))
    X = sparse.hstack([Xt, Xh * 0.5, sparse.csr_matrix(Xn)]).tocsr()
    idx = {u: i for i, u in enumerate(users)}
    say(f"features: text {Xt.shape[1]:,} + handle {Xh.shape[1]:,} + numeric {Xn.shape[1]}")

    # ---------- training labels (Claude) ----------
    lab = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(str(LAB / "done/batch_*.csv")))])
    lab["g"] = lab.generation.map(lambda g: FOLD.get(g, g))
    samp = pd.read_csv(LAB / "sample.csv")
    lab = lab.merge(samp[["key", "user_id", "loyalty"]], on="key")
    tr = lab[lab.g.isin(G3)].copy()
    tr["i"] = tr.user_id.map(idx)
    tr = tr.dropna(subset=["i"])
    Xtr, ytr = X[tr.i.astype(int).values], tr.g.values
    wtr = tr.confidence.map(CONF_W).fillna(0.5).values
    say(f"training labels: {len(tr)} of {len(lab)} read  {tr.g.value_counts().to_dict()}")

    # ---------- test: ground truth ----------
    gt = pd.read_csv(LAB / "ground_truth/ground_truth.csv")
    gt["g"] = gt.generation.map(lambda g: FOLD.get(g, g))
    gt = gt[gt.g.isin(G3)].copy()
    gt["i"] = gt.user_id.map(idx)
    Xte, yte = X[gt.i.astype(int).values], gt.g.values
    say(f"test (ground truth): {len(gt)}  {gt.g.value_counts().to_dict()}")

    # ---------- choose C by CV on Claude labels ----------
    skf = StratifiedKFold(5, shuffle=True, random_state=42)
    best = None
    for C in (0.3, 1.0, 3.0, 10.0):
        m = LogisticRegression(C=C, class_weight="balanced", max_iter=3000)
        p = cross_val_predict(m, Xtr, ytr, cv=skf, params={"sample_weight": wtr})
        f1 = f1_score(ytr, p, average="macro")
        say(f"  C={C:<5} CV agreement with Claude: acc {accuracy_score(ytr, p):.3f}  macro-F1 {f1:.3f}")
        if best is None or f1 > best[1]:
            best = (C, f1)
    C = best[0]
    model = LogisticRegression(C=C, class_weight="balanced", max_iter=3000).fit(Xtr, ytr, sample_weight=wtr)
    P = model.predict_proba(Xte)
    pred = model.classes_[P.argmax(1)]
    acc = accuracy_score(yte, pred)
    say(f"\nmodel (C={C}) vs TRUE ages on {len(gt)} ground-truth people:")
    say(f"  accuracy {acc:.1%}  macro-F1 {f1_score(yte, pred, average='macro'):.2f}   "
        f"(chance 33%; Claude blind test 68.8% on the 62% it would guess)")
    cm = pd.DataFrame(confusion_matrix(yte, pred, labels=G3), index=G3, columns=G3)
    say("  confusion (rows truth, cols model):\n" + cm.to_string())
    conf = P.max(1)
    for thr in (0.5, 0.6, 0.7):
        k = conf >= thr
        say(f"  if we only keep prob >= {thr}: coverage {k.mean():.0%}, accuracy {accuracy_score(yte[k], pred[k]):.1%}")
    # probabilistic share vs true share on the test set
    say("  test-set share  true: " + str((pd.Series(yte).value_counts(normalize=True) * 100).round(1).to_dict()))
    say("  test-set share  model (sum of probs): "
        + str(dict(zip(model.classes_, (P.mean(0) * 100).round(1)))))

    # ---------- learning curve ----------
    say("\nlearning curve (accuracy on ground truth):")
    rng = np.random.default_rng(0)
    for n in (100, 200, 300, len(tr)):
        accs = []
        for _ in range(5 if n < len(tr) else 1):
            s = rng.choice(len(tr), n, replace=False)
            m = LogisticRegression(C=C, class_weight="balanced", max_iter=3000).fit(
                Xtr[s], ytr[s], sample_weight=wtr[s])
            accs.append(accuracy_score(yte, m.predict(Xte)))
        say(f"  n={n:<4} acc {np.mean(accs):.1%}")

    # ---------- predict everyone ----------
    Pall = model.predict_proba(X)
    proba = pd.DataFrame(Pall, columns=[f"p_{c}" for c in model.classes_])
    proba.insert(0, "user_id", users)
    proba.to_csv(OUT / "gen_proba.csv.gz", index=False)
    users_df = pd.read_csv(OUT / "users.csv.gz", usecols=["user_id", "loyalty"]).merge(proba, on="user_id")
    say("\nall commenters, sum of probabilities (uncorrected):")
    say("  overall " + str((users_df[[f"p_{c}" for c in G3]].mean() * 100).round(1).to_dict()))
    for l, d in users_df.groupby("loyalty"):
        say(f"  {l}: " + str((d[[f'p_{c}' for c in G3]].mean() * 100).round(1).to_dict()))
    (OUT / "eda/gen_model_report.txt").write_text("\n".join(LOG))


if __name__ == "__main__":
    main()

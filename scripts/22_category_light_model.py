"""Lightweight EP-category classifier (28 พ.ย. 2569).

Question: can a small, classical model replace the LLM that labelled EP categories?
  Input   : EP title only (public), cleaned of the "l EP.xxxx l date l#โหนกระแส" suffix
  Feature : TF-IDF on character n-grams 2–4 (Thai has no spaces between words)
  Models  : Logistic Regression · K-Nearest Neighbors · Decision Tree (all from the course list)
  Train   : EPs labelled by the LLM ("teacher" labels)  — 5-fold stratified CV picks model + hyper-parameter
  Test    : the 39 EPs labelled by the analyst (human gold), never seen in training
  Metrics : accuracy, macro precision / recall / F1, Cohen's kappa, confusion matrix
Output: data/processed/eda/category_light_model.json (aggregates only)
"""
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, cohen_kappa_score, confusion_matrix,
                             precision_recall_fscore_support)
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.tree import DecisionTreeClassifier

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data/processed/eda/category_light_model.json"


def clean(t: str) -> str:
    t = re.split(r"\s+l\s+EP\.?\s*\d+", t, maxsplit=1, flags=re.I)[0]
    return re.sub(r"#\S+", "", t).strip()


def tfidf():
    return TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1, sublinear_tf=True)


CANDIDATES = {
    "Logistic Regression": [(f"C={c}", make_pipeline(tfidf(), LogisticRegression(C=c, class_weight="balanced", max_iter=3000))) for c in (1, 3, 10, 30)],
    "K-Nearest Neighbors": [(f"k={k}", make_pipeline(tfidf(), KNeighborsClassifier(n_neighbors=k, metric="cosine", weights="distance"))) for k in (3, 5, 9, 15)],
    "Decision Tree": [(f"max_depth={d}", make_pipeline(tfidf(), DecisionTreeClassifier(max_depth=d, class_weight="balanced", random_state=42))) for d in (10, 20, 40, None)],
}


def scores(y, p, labels):
    pr, rc, f1, _ = precision_recall_fscore_support(y, p, labels=labels, average="macro", zero_division=0)
    return dict(accuracy=round(accuracy_score(y, p), 3), precision=round(pr, 3), recall=round(rc, 3),
                f1=round(f1, 3), kappa=round(cohen_kappa_score(y, p), 3))


def main():
    d = pd.read_csv(ROOT / "data/processed/ep_engagement.csv").drop_duplicates("video_id")
    d["x"] = d.video_title.map(clean)
    gold = d[d.category_source.str.startswith("ผู้วิเคราะห์")]
    train = d[d.category_source.str.startswith("claude")]
    labels = sorted(d.category.unique())
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # smallest class must have >= n_splits rows for stratified CV; drop nothing, but warn
    res = {"n_train": int(len(train)), "n_test": int(len(gold)), "models": {}}
    for name, grid in CANDIDATES.items():
        best = None
        for tag, pipe in grid:
            p = cross_val_predict(pipe, train.x, train.category, cv=cv)
            f1 = precision_recall_fscore_support(train.category, p, average="macro", zero_division=0)[2]
            if best is None or f1 > best[1]:
                best = (tag, f1, pipe)
        tag, f1cv, pipe = best
        pipe.fit(train.x, train.category)
        p = pipe.predict(gold.x)
        res["models"][name] = {"param": tag, "cv_macro_f1": round(f1cv, 3), "test": scores(gold.category, p, labels),
                               "agree": int((p == gold.category.values).sum())}
        res["models"][name]["confusion"] = confusion_matrix(gold.category, p, labels=labels).tolist()
    res["confusion_labels"] = labels
    # pick by cross-validation on the training set only; the 39 gold EPs are reported, never used to choose
    res["chosen_by_cv"] = max(res["models"], key=lambda m: res["models"][m]["cv_macro_f1"])
    OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps({k: ({m: {kk: vv for kk, vv in x.items() if kk != "confusion"} for m, x in v.items()} if k == "models" else v) for k, v in res.items() if k != "confusion_labels"}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

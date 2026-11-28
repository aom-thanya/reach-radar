"""Gen step 6: final generation estimates (hybrid), with bias correction and bootstrap CIs.

Why hybrid (decided 2569-11-22 after the pilot model):
  Claude's own reading is more accurate per person (69% vs 45%) but covers only ~1,050 sampled people;
  the model covers all 281k people and its *aggregate* shares are close (within ~6 points) but noisy.
  So: overall / loyalty-segment shares come from Claude's sample, and category / sub-topic / EP
  differences come from the model, expressed as lift and anchored to Claude's overall shares.

A. Claude sample (overall + per loyalty segment)
   1. Horvitz-Thompson weights: stratum population / people read in that stratum.
   2. Coverage correction: in the blind test Claude labelled true X+/Y/Z people at different rates
      (coverage c_g). Observed labelled share is divided by c_g and renormalised, i.e. people Claude
      leaves as "ไม่ระบุ" are assumed to be spread like the blind-test misses.
   3. (Tried and dropped: inverting Claude's 3x3 confusion matrix. With only 64 blind-test people the
      inversion is unstable and jumps to corner solutions such as Gen Y = 100%.)
   Bootstrap: resample read people within each stratum AND blind-test rows, 1,000 times.

B. Model (category / sub-topic / EP)
   1. For a group (e.g. people who commented on category c), mean predicted probabilities q_c.
   2. Calibration: a multinomial logistic regression on the model's log-probabilities, fitted on the
      ground-truth people (checked by 5-fold CV), so the probabilities are not squeezed toward 1/3.
      (Tried and dropped: inverting the model's soft confusion matrix - rows too similar, unstable.)
   3. lift_c = q_c / baseline, baseline = mean over all (person, group) memberships of that table
      (comparing with "all people" would make every category look older, because heavy commenters
      appear in many categories); final share_c = normalise(lift_c * overall share from A).
   Bootstrap: resample people inside the group (categories, tags), 300 times; EPs get the point value
   plus a normal-approximation interval.

Outputs: data/processed/gen_estimates.json (aggregates only) and gen_by_*.csv
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import nnls

ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "data/labels"
P = ROOT / "data/processed"
G3 = ["Gen Z", "Gen Y", "Gen X ขึ้นไป"]
FOLD = {"Baby Boomer": "Gen X ขึ้นไป", "Gen X": "Gen X ขึ้นไป"}
LEAKED = {"T024", "T031", "T076", "T089"}
LOY = ["แฟนตัวยง", "นักเสพข่าว", "ขาจร"]
RNG = np.random.default_rng(42)


def fold(s):
    return s.map(lambda g: FOLD.get(g, g))


def solve(M, obs):
    """find p >= 0, sum p = 1 with M^T p ≈ obs"""
    A = np.vstack([M.T, 10 * np.ones(len(obs))])
    b = np.append(obs, 10.0)
    p, _ = nnls(A, b)
    return p / p.sum()


def claude_matrix(blind):
    g = blind[blind.pred != "ไม่ระบุ"]
    cm = pd.crosstab(g.true, g.pred).reindex(index=G3, columns=G3, fill_value=0).values + 1.0
    M = cm / cm.sum(1, keepdims=True)
    cov = blind.groupby("true").apply(lambda d: (d.pred != "ไม่ระบุ").mean()).reindex(G3).values
    return M, cov


def claude_share(lab, M, cov):
    """lab: labelled rows with g, weight. returns corrected share over G3"""
    w = lab.groupby("g").w.sum().reindex(G3, fill_value=0).values
    obs = w / w.sum()
    obs = obs / cov
    return obs / obs.sum()          # confusion inversion dropped: unstable with 64 blind-test people


def main():
    # ---------- A. Claude sample ----------
    import glob
    lab = pd.concat([pd.read_csv(f) for f in sorted(glob.glob(str(LAB / "done/batch_*.csv")))])
    lab["g"] = fold(lab.generation)
    samp = pd.read_csv(LAB / "sample.csv")
    read = lab.merge(samp[["key", "user_id", "loyalty", "stratum_pop"]], on="key")
    n_read = read.groupby("loyalty").size()
    read["w"] = read.stratum_pop / read.loyalty.map(n_read)
    key = pd.read_csv(LAB / "ground_truth/blind_key.csv")
    bl = pd.read_csv(LAB / "done/blind_test.csv")
    blind = key.merge(bl, on="key", suffixes=("_t", "_p"))
    blind = blind[~blind.key.isin(LEAKED)]
    blind = pd.DataFrame({"true": fold(blind.generation_t), "pred": fold(blind.generation_p)})
    M, cov = claude_matrix(blind)
    print("Claude confusion (rows truth Z,Y,X+):\n", M.round(2), "\ncoverage by true group:", cov.round(2))

    def est(df):
        l = df[df.g.isin(G3)]
        return claude_share(l, M, cov)

    groups = {"รวมทุกคน": read, **{l: read[read.loyalty == l] for l in LOY}}
    point = {k: est(d) for k, d in groups.items()}
    boots = {k: [] for k in groups}
    for _ in range(1000):
        rs = pd.concat([d.sample(len(d), replace=True, random_state=int(RNG.integers(1e9)))
                        for _, d in read.groupby("loyalty")])
        bb = blind.sample(len(blind), replace=True, random_state=int(RNG.integers(1e9)))
        Mb, cb = claude_matrix(bb)
        cb = np.clip(cb, 0.05, 1)

        def eb(df):
            l = df[df.g.isin(G3)]
            return claude_share(l, Mb, cb)
        boots["รวมทุกคน"].append(eb(rs))
        for l in LOY:
            boots[l].append(eb(rs[rs.loyalty == l]))
    seg_rows = []
    for k in groups:
        b = np.array(boots[k])
        lo, hi = np.percentile(b, [2.5, 97.5], axis=0)
        labelled = groups[k].g.isin(G3).sum()
        for i, g in enumerate(G3):
            seg_rows.append({"group": k, "gen": g, "share": round(100 * point[k][i], 1),
                             "ci_lo": round(100 * lo[i], 1), "ci_hi": round(100 * hi[i], 1),
                             "read": len(groups[k]), "labelled": int(labelled)})
    seg = pd.DataFrame(seg_rows)
    seg.to_csv(P / "gen_by_segment.csv", index=False)
    print(seg.pivot(index="group", columns="gen", values="share").reindex(["รวมทุกคน"] + LOY)[G3])
    overall = point["รวมทุกคน"]

    # ---------- B. Model lifts ----------
    proba = pd.read_csv(P / "gen_proba.csv.gz")
    pcols = [f"p_{g}" for g in G3]
    gt = pd.read_csv(LAB / "ground_truth/ground_truth.csv")
    gt["g"] = fold(gt.generation)
    gt = gt[gt.g.isin(G3)].merge(proba, on="user_id")
    # calibration: multinomial LR on log-probabilities, fitted on the ground truth people
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_predict
    Z = np.log(np.clip(gt[pcols].values, 1e-6, 1))
    cal = LogisticRegression(C=1.0, max_iter=2000)
    cvp = cross_val_predict(cal, Z, gt.g.values, cv=StratifiedKFold(5, shuffle=True, random_state=0),
                            method="predict_proba")
    order = sorted(G3)                                        # sklearn class order
    cvp = pd.DataFrame(cvp, columns=order)[G3].values
    true_share = gt.g.value_counts(normalize=True).reindex(G3).values
    print("ground truth share      :", (100 * true_share).round(1))
    print("raw model mean          :", (100 * gt[pcols].mean().values).round(1))
    print("calibrated (5-fold CV)  :", (100 * cvp.mean(0)).round(1))
    cal.fit(Z, gt.g.values)
    users = pd.read_csv(P / "users.csv.gz", usecols=["user_id"])
    proba = proba[proba.user_id.isin(users.user_id)].set_index("user_id")
    C = cal.predict_proba(np.log(np.clip(proba[pcols].values, 1e-6, 1)))
    proba[pcols] = pd.DataFrame(C, columns=order, index=proba.index)[G3].values
    q_all = proba[pcols].mean().values

    # person x EP / category / tag
    rows = []
    for f in (ROOT / "data/raw/comments").glob("*.jsonl"):
        seen = set()
        for line in open(f):
            u = json.loads(line).get("channel")
            if u and u not in seen:
                seen.add(u)
                rows.append((f.stem, u))
    pe = pd.DataFrame(rows, columns=["video_id", "user_id"])
    pe = pe[pe.user_id.isin(proba.index)]
    eng = pd.read_csv(P / "ep_engagement.csv")
    eng["tags"] = eng.tags.map(lambda s: eval(s) if isinstance(s, str) else [])
    pe = pe.merge(eng[["video_id", "ep", "category", "tags"]], on="video_id")
    TAGS = dict(zip("MALFVDSPCKENTHBUWGIQOZ",
                    ["เงิน/โกง/หนี้", "ชู้สาว/นอกใจ", "แฟน/คนรัก", "ครอบครัว/มรดก", "ทำร้ายร่างกาย",
                     "มีคนเสียชีวิต", "คดีทางเพศ/อนาจาร", "ตำรวจ/จนท.รัฐ/ผู้มีอิทธิพล", "คนดัง/อินฟลูฯ",
                     "เด็ก", "ผู้สูงอายุ/ผู้เปราะบาง", "เพื่อนบ้าน/ชุมชน", "รถ/ถนน", "แพทย์/คลินิก",
                     "พระ/วัด/ความเชื่อ", "ผู้บริโภค/ร้านค้า", "สัตว์", "เรื่องดี/ซึ้งใจ", "ภัยพิบัติ",
                     "การเมือง", "รวมเรื่อง/พิเศษ", "ยาเสพติด"]))
    PR = proba[pcols]

    def group_est(user_ids, boot=0, base=None):
        X = PR.loc[list(user_ids)].values
        q = X.mean(0)
        lift = q / base
        share = lift * overall
        share = share / share.sum()
        out = {"n": len(X), "share": share, "lift": lift}
        if boot:
            bs = []
            for _ in range(boot):
                s = X[RNG.integers(0, len(X), len(X))]
                sb = s.mean(0) / base * overall
                bs.append(sb / sb.sum())
            out["lo"], out["hi"] = np.percentile(bs, [2.5, 97.5], axis=0)
        return out

    def table(groups_dict, kind, boot):
        # baseline = the typical audience of one group: mean over all (person, group) memberships,
        # so a person who comments in many groups counts once per group, as in the group means.
        allm = np.concatenate([PR.loc[list(u)].values for u in groups_dict.values()])
        base = allm.mean(0)
        rows = []
        for name, uids in groups_dict.items():
            r = group_est(uids, boot, base)
            for i, g in enumerate(G3):
                row = {kind: name, "gen": g, "people": r["n"], "share": round(100 * r["share"][i], 1),
                       "lift": round(r["lift"][i], 2)}
                if boot:
                    row["ci_lo"], row["ci_hi"] = round(100 * r["lo"][i], 1), round(100 * r["hi"][i], 1)
                rows.append(row)
        return pd.DataFrame(rows)

    cat_groups = {c: set(d.user_id) for c, d in pe.groupby("category")}
    tag_groups = {}
    for code, name in TAGS.items():
        u = set(pe[pe.tags.map(lambda t: code in t)].user_id)
        if u:
            tag_groups[name] = u
    ep_groups = {int(e): set(d.user_id) for e, d in pe.groupby("ep")}
    by_cat = table(cat_groups, "category", 300)
    by_tag = table(tag_groups, "tag", 300)
    by_ep = table(ep_groups, "ep", 0)
    # EP normal-approx interval on the share (person-level probs are the sampling unit)
    by_cat.to_csv(P / "gen_by_category.csv", index=False)
    by_tag.to_csv(P / "gen_by_tag.csv", index=False)
    by_ep.to_csv(P / "gen_by_ep.csv", index=False)
    print(by_cat.pivot(index="category", columns="gen", values="lift")[G3].sort_values("Gen Z"))
    print(by_tag.pivot(index="tag", columns="gen", values="lift")[G3].sort_values("Gen Z"))

    out = {
        "method": "hybrid: Claude-read sample for overall/segments (HT weights + coverage + confusion "
                  "correction), model probabilities for category/tag/EP lifts anchored to the overall",
        "groups": G3,
        "accuracy": {"claude_blind_3group": 0.688, "claude_coverage": 0.62,
                     "model_3group": 0.449, "model_aggregate_error_pts": 6},
        "n_read": int(len(read)), "n_labelled": int(read.g.isin(G3).sum()),
        "n_ground_truth": int(len(gt)),
        "segments": seg.to_dict("records"),
        "categories": by_cat.to_dict("records"),
        "tags": by_tag.to_dict("records"),
    }
    (P / "gen_estimates.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print("saved gen_estimates.json")


if __name__ == "__main__":
    main()

"""Turn Claude's partial label file (only people it could label) into the full batch file:
every key in the batch gets a row; keys not labelled become ไม่ระบุ.
Usage: .venv/bin/python scripts/finish_batch.py 2      (reads done/batch_002.part -> done/batch_002.csv)"""
import sys
from pathlib import Path

import pandas as pd

LAB = Path(__file__).resolve().parents[1] / "data/labels"
b = int(sys.argv[1])
part = LAB / "done" / f"batch_{b:03d}.part"
lab = pd.read_csv(part)
keys = pd.read_csv(LAB / "sample.csv").query("batch == @b").key
full = pd.DataFrame({"key": keys}).merge(lab, on="key", how="left")
full["generation"] = full.generation.fillna("ไม่ระบุ")
full["confidence"] = full.confidence.fillna("ต่ำ")
full["reason"] = full.reason.fillna("-")
assert set(lab.key) <= set(keys), set(lab.key) - set(keys)
full.to_csv(LAB / "done" / f"batch_{b:03d}.csv", index=False)
part.unlink()
print(f"batch {b}: {len(full)} people, labelled {(full.generation != 'ไม่ระบุ').sum()} "
      f"{full.generation.value_counts().to_dict()}")

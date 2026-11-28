"""Step 24: centrality of the category <-> category shared-audience graph.

Input : web_src/data.json  network.shared (Jaccard edges between categories, from 03_analyze.py)
                           network.nodes  (category people + Louvain community)
Output: data/processed/category_centrality.csv  one row per category (aggregates only)

Measures
- strength      : weighted degree = sum of Jaccard to all other categories (how much audience it shares overall)
- betweenness   : weighted betweenness, distance = 1 - Jaccard (strong tie = short path); is it on the
                  shortest paths between other categories?
- cross_strength: sum of Jaccard to categories in the OTHER Louvain cluster (absolute, not a share:
                  a share is inflated for the 3-category cluster, which has only 2 in-cluster ties)
Note: the graph is complete (every pair shares viewers), so with distance = 1 - Jaccard the direct edge is
always the shortest path and betweenness is 0 for every category. Reported as-is, not tuned away.
"""
import json
from pathlib import Path

import networkx as nx
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web_src/data.json"
OUT = ROOT / "data/processed/category_centrality.csv"

net = json.loads(DATA.read_text())["network"]
cats = {n["id"]: n for n in net["nodes"] if n["kind"] == "category"}

H = nx.Graph()
for c, n in cats.items():
    H.add_node(c, community=n["community"], people=n["people"])
for e in net["shared"]:
    H.add_edge(e["source"], e["target"], jaccard=e["jaccard"], dist=1 - e["jaccard"])

strength = dict(H.degree(weight="jaccard"))
btw = nx.betweenness_centrality(H, weight="dist", normalized=True)
rows = []
for c in H:
    cross = sum(d["jaccard"] for _, o, d in H.edges(c, data=True) if H.nodes[o]["community"] != H.nodes[c]["community"])
    top = max(H.edges(c, data=True), key=lambda x: x[2]["jaccard"])
    rows.append({"category": c, "community": H.nodes[c]["community"], "people": H.nodes[c]["people"],
                 "strength": round(strength[c], 3), "betweenness": round(btw[c], 3),
                 "cross_strength": round(cross, 3),
                 "top_partner": top[1], "top_jaccard": top[2]["jaccard"]})

df = pd.DataFrame(rows).sort_values("strength", ascending=False)
df.to_csv(OUT, index=False)
print(f"nodes {H.number_of_nodes()}  edges {H.number_of_edges()}  density {nx.density(H):.2f}")
print(df.to_string(index=False))

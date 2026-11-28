import { useMemo, useState } from "react";
import { D, cnum, type Gen } from "../data";
import { useTip } from "../components/overlay";
import { ChartBox } from "../components/ui";
import { GCOL, PRODUCTS } from "../lib/constants";
import { fmt, pct, views, x2 } from "../lib/format";

// ---------- flow: Gen ที่เลือก → สายความสนใจ → ประเด็น → หมวดสินค้า ----------
// Simple by default: only Gen → สาย lines; click a สาย to see the topics it over-comments on and the products that fit.
const NET_MIN = 1.15;                                     // นับเป็นเส้นเมื่อคอมเม้นมากกว่าที่ออกอากาศ 15% ขึ้นไป
type NType = "gen" | "sai" | "cat" | "prod";
const NCOL: Record<Exclude<NType, "gen">, string> = { sai: "var(--accent)", cat: "var(--up)", prod: "var(--good)" };
const ORDER: NType[] = ["gen", "sai", "cat", "prod"];
const HEAD: Record<NType, string> = { gen: "วัย", sai: "สายความสนใจ", cat: "ประเด็นที่สายนั้นชอบ", prod: "สินค้าที่เข้ากัน" };
const COLX: Record<NType, number> = { gen: 0, sai: 0.3, cat: 0.68, prod: 1 };

interface NNode { id: string; label: string; sub?: string; type: NType; r: number; tip: string; x: number; y: number; b: number }
interface NEdge { a: number; b: number; s: number; tip: string; val: string }
interface Graph { nodes: NNode[]; edges: NEdge[] }

function netModel(gen: Gen): Graph {
  const nodes: NNode[] = [], edges: NEdge[] = [], at = new Map<string, number>();
  const N = (id: string, label: string, type: NType, r: number, tip: string, sub?: string) => {
    at.set(id, nodes.length); nodes.push({ id, label, sub, type, r, tip, x: 0, y: 0, b: 0 });
  };
  const E = (a: string, b: string, s: number, tip: string, val = "") => { if (at.has(a) && at.has(b)) edges.push({ a: at.get(a)!, b: at.get(b)!, s, tip, val }); };
  N("g", gen, "gen", 13, `${gen} · ${pct(D.overall.gen_pct[gen])} ของคนคอมเม้นทั้งหมด`);
  const pmax = Math.max(...D.communities.map((c) => c.people));
  D.communities.forEach((c) => {
    const sh = cnum(c, gen + " (model)");
    N("s:" + c.name, c.name.replace("สาย", ""), "sai", 8 + Math.sqrt(c.people / pmax) * 6,
      `${c.name} · ${fmt(c.people)} คน · เป็น ${gen} ราว ${pct(sh)} (${fmt(Math.round((c.people * sh) / 100))} คน) · กดเพื่อดูประเด็นและสินค้า`, `${gen.replace(" ขึ้นไป", "+")} ${Math.round(sh)}%`);
  });
  const emax = Math.max(...D.categories.map((c) => c.eps));
  D.categories.forEach((c) => {
    if (D.communities.some((m) => m.lift[c.name] >= NET_MIN))
      N("c:" + c.name, c.name, "cat", 5 + Math.sqrt(c.eps / emax) * 6, `${c.name} · ${c.eps} EP · ${views(c.views)} วิวค่ากลางต่อ EP`);
  });
  PRODUCTS.forEach((p) => N("p:" + p.id, p.name.split(" / ")[0], "prod", 7, `หมวดสินค้า ${p.name} · เสนอขายกับคน${p.sai.join(" และคน")}`));
  D.communities.forEach((c) => {
    const sh = cnum(c, gen + " (model)");
    E("g", "s:" + c.name, sh / 100, `คน${c.name} เป็น ${gen} ราว ${pct(sh)}`);
    D.categories.forEach((k) => { const v = c.lift[k.name]; if (v >= NET_MIN) E("s:" + c.name, "c:" + k.name, Math.min((v - 1) / 2.2, 1), `คน${c.name} คอมเม้นหมวด${k.name} ${x2(v)} ของสัดส่วนที่ออกอากาศ`, x2(v)); });
  });
  PRODUCTS.forEach((p) => p.sai.forEach((n) => E("s:" + n, "p:" + p.id, 0.42, `${p.name} เข้ากับคน${n}`)));
  return { nodes, edges };
}

/** layered layout (barycenter ordering keeps crossings low); returns positioned copies */
function netLayout(g: Graph, W: number, H: number): NNode[] {
  const nodes = g.nodes.map((n) => ({ ...n }));
  const lay = ORDER.map((ty) => nodes.filter((d) => d.type === ty));
  lay.forEach((L) => L.forEach((d, k) => (d.y = (k + 0.5) / L.length)));
  const adj: number[][] = nodes.map(() => []);
  g.edges.forEach((e) => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
  const idx = new Map(nodes.map((d, i) => [d, i]));
  for (let pass = 0; pass < 24; pass++) {
    const dir = pass % 2 ? [...lay].reverse() : lay;
    for (const L of dir) {
      L.forEach((d) => { const nb = adj[idx.get(d)!]; d.b = nb.length ? nb.reduce((s, j) => s + nodes[j].y, 0) / nb.length : d.y; });
      L.sort((p, q) => p.b - q.b || p.id.localeCompare(q.id));
      L.forEach((d, k) => (d.y = (k + 0.5) / L.length));
    }
  }
  const pl = 70, pr = 132, pt = 46, pb = 26;              // ซ้าย: ชื่อวัย · ขวา: ชื่อสินค้า · บน: หัวคอลัมน์
  const inner = Math.max(H - pt - pb, 1);
  lay.forEach((L) => {
    const step = Math.min(inner / Math.max(L.length - 1, 1), 60);
    const y0 = pt + (inner - step * (L.length - 1)) / 2;
    L.forEach((d, k) => (d.y = L.length === 1 ? pt + inner / 2 : y0 + k * step));
  });
  nodes.forEach((d) => (d.x = pl + COLX[d.type] * (W - pl - pr)));
  return nodes;
}

function NetSvg({ g, W, H, gen }: { g: Graph; W: number; H: number; gen: Gen }) {
  const tip = useTip();
  const VW = Math.max(W, 660);                                   // จอแคบ: เลื่อนดูข้างได้ ไม่บีบจนอ่านไม่ออก
  const nodes = useMemo(() => netLayout(g, VW, H), [g, VW, H]);
  const [cur, setCur] = useState<number | null>(null);          // จุดที่กดอยู่ (null = เห็นแค่วัย → สาย)
  const focus = cur != null && g.nodes[cur] && g.nodes[cur].type !== "gen" ? cur : null;
  // what is lit
  const nearN = new Set<number>([0]), litE = new Set<number>();
  g.edges.forEach((e, i) => {
    if (focus == null) { if (g.nodes[e.a].type === "gen") { litE.add(i); nearN.add(e.b); } return; }
    if (e.a === focus || e.b === focus) { litE.add(i); nearN.add(e.a); nearN.add(e.b); }
  });
  if (focus != null) g.edges.forEach((e, i) => { if (g.nodes[e.a].type === "gen" && nearN.has(e.b)) litE.add(i); });  // วัย → สายที่เกี่ยวข้อง
  const valAt = new Map<number, string>();                       // ตัวเลข "กี่เท่า" ต่อท้ายชื่อประเด็น/สาย ตอนกด
  if (focus != null) g.edges.forEach((e) => { if (!e.val) return; if (e.a === focus) valAt.set(e.b, e.val); if (e.b === focus) valAt.set(e.a, e.val); });
  const toggle = (i: number) => setCur(i === focus ? null : i);
  const colX = (t: NType) => nodes.find((d) => d.type === t)!.x;
  return (
    <svg width={VW} height={H} role="img" aria-label={`แผนผัง ${gen} สายความสนใจ ประเด็น และหมวดสินค้า`} onClick={() => setCur(null)}>
      {ORDER.map((t) => <text key={t} x={colX(t)} y={16} textAnchor={t === "gen" ? "middle" : t === "prod" ? "start" : "middle"} dx={t === "prod" ? -7 : 0} className="ax q">{HEAD[t]}</text>)}
      <g>{g.edges.map((e, i) => {
        if (!litE.has(i)) return null;
        const a = nodes[e.a], b = nodes[e.b], soft = b.type === "prod";
        const mx = (a.x + b.x) / 2;
        const d = `M${a.x},${a.y}C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
        return <path key={i} d={d} fill="none" stroke={soft ? "var(--good)" : a.type === "gen" ? GCOL[gen] : "var(--ink-3)"} strokeWidth={(1.2 + e.s * 4).toFixed(2)}
          strokeDasharray={soft ? "5 4" : undefined} strokeLinecap="round" strokeOpacity={0.6} {...tip(e.tip)} />;
      })}</g>
      <g>{nodes.map((d, i) => {
        const on = nearN.has(i) || i === focus, sel = i === focus;
        const col = d.type === "gen" ? GCOL[gen] : NCOL[d.type];
        const right = d.type === "prod", left = d.type === "gen";
        const label = d.label + (valAt.has(i) ? ` · ${valAt.get(i)}` : "");
        const tx = left ? d.x - d.r - 7 : right ? d.x + d.r + 7 : d.x, ty = left || right ? d.y + 4 : d.y + d.r + 14;
        return (
          <g key={d.id} className={d.type === "gen" ? undefined : "hit"} tabIndex={d.type === "gen" ? undefined : 0} role={d.type === "gen" ? undefined : "button"} aria-label={d.label}
            opacity={on ? 1 : 0.28} {...tip(d.tip)}
            onClick={(ev) => { ev.stopPropagation(); if (d.type !== "gen") toggle(i); }}
            onKeyDown={(ev) => { if (d.type !== "gen" && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); toggle(i); } }}>
            <circle cx={d.x} cy={d.y} r={d.r.toFixed(1)} fill={col} fillOpacity={0.9} stroke={sel ? "var(--ink)" : "var(--surface)"} strokeWidth={sel ? 3 : 2} />
            <text x={tx} y={ty} textAnchor={left ? "end" : right ? "start" : "middle"} className="lbl" fontWeight={sel || valAt.has(i) ? 600 : undefined}
              stroke="var(--surface)" strokeWidth={3.5} paintOrder="stroke" fill="var(--ink)">{label}</text>
            {d.sub ? <text x={tx} y={ty + 14} textAnchor="middle" className="ax" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke">{d.sub}</text> : null}
          </g>
        );
      })}</g>
    </svg>
  );
}

export function NetPanel({ gen }: { gen: Gen }) {
  const g = useMemo(() => netModel(gen), [gen]);
  return (
    <div className="panel span12">
      <div className="panel-head"><h2>{`เส้นทาง: ${gen} → สายความสนใจ → ประเด็น → สินค้า`}</h2>
        <span className="cap">กดสายความสนใจเพื่อดูประเด็นที่สายนั้นชอบ และสินค้าที่เข้ากัน · กดพื้นที่ว่างเพื่อกลับ</span></div>
      <div className="tbl-wrap"><ChartBox height={460}>{(W, H) => <NetSvg key={gen} g={g} W={W} H={H} gen={gen} />}</ChartBox></div>
      <p className="cap">{`ตัวเลขใต้สาย = สัดส่วน ${gen} ในสายนั้น (ต่างกันไม่มากระหว่างสาย) · "2.1 เท่า" ข้างประเด็น = สายนั้นคอมเม้นเรื่องนี้มากกว่าสัดส่วนที่ออกอากาศกี่เท่า (แสดงเฉพาะตั้งแต่ +15%) · เส้นประ = สินค้าที่เสนอขายคู่กับสายนั้น`}</p>
      <details className="limits">
        <summary>วิธีทำแผนผังนี้</summary>
        <div className="limits-b"><p>เป็นเครือข่าย 4 ชั้น (วัย สายความสนใจ ประเด็น หมวดสินค้า) เรียงจากซ้ายไปขวา สลับลำดับจุดในแต่ละชั้นด้วยวิธี barycenter ให้เส้นตัดกันน้อยที่สุด · ขนาดจุดสาย = จำนวนคน ขนาดจุดประเด็น = จำนวน EP · การจับคู่สายกับสินค้าเป็นสมมติฐานจากแนวเรื่องที่สายนั้นชอบ ยังไม่ได้พิสูจน์ด้วยยอดขาย</p></div>
      </details>
    </div>
  );
}

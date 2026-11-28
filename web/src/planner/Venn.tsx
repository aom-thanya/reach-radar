import { D } from "../data";
import { fmt } from "../lib/format";
import { bits, vennModel, type PlanRow, type Venn } from "./model";

const VCOL = ["#1E40AF", "#D97706", "#15803D"];
type Pos = { x: number; y: number; r: number };

function vennLayout(V: Venn, W: number, H: number): Pos[] {
  const n = V.sets.length, A = V.sets.map((s) => s.people);
  const k = Math.min(W * 0.3, H * 0.42) / Math.sqrt(Math.max(...A));
  const r = A.map((a) => Math.sqrt(a) * k), per = Math.PI * k * k;        // พื้นที่ต่อคน 1 คน
  const lens = (ra: number, rb: number, d: number) => {
    if (d >= ra + rb) return 0;
    if (d <= Math.abs(ra - rb)) return Math.PI * Math.min(ra, rb) ** 2;
    const a1 = Math.acos((d * d + ra * ra - rb * rb) / (2 * d * ra)), a2 = Math.acos((d * d + rb * rb - ra * ra) / (2 * d * rb));
    return ra * ra * (a1 - Math.sin(2 * a1) / 2) + rb * rb * (a2 - Math.sin(2 * a2) / 2);
  };
  const dist = (i: number, j: number) => {
    const tgt = per * V.regions.filter((g) => (g.m >> i) & 1 && (g.m >> j) & 1).reduce((t, g) => t + g.people, 0);
    let lo = Math.abs(r[i] - r[j]), hi = r[i] + r[j];
    for (let s = 0; s < 44; s++) { const mid = (lo + hi) / 2; if (lens(r[i], r[j], mid) > tgt) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const c = [{ x: 0, y: 0 }];
  if (n >= 2) c.push({ x: dist(0, 1), y: 0 });
  if (n === 3) {
    const d01 = c[1].x, d02 = dist(0, 2), d12 = dist(1, 2);
    const x = (d01 * d01 + d02 * d02 - d12 * d12) / (2 * d01), y2 = d02 * d02 - x * x;
    c.push({ x, y: Math.sqrt(Math.max(y2, (d02 * 0.25) ** 2)) });
  }
  const x0 = Math.min(...c.map((q, i) => q.x - r[i])), x1 = Math.max(...c.map((q, i) => q.x + r[i]));
  const y0 = Math.min(...c.map((q, i) => q.y - r[i])), y1 = Math.max(...c.map((q, i) => q.y + r[i]));
  const pad = 30, s = Math.min((W - pad * 2) / (x1 - x0), (H - pad * 2) / (y1 - y0), 1.6);
  const ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H - (y1 - y0) * s) / 2 - y0 * s;
  return c.map((q, i) => ({ x: ox + q.x * s, y: oy + q.y * s, r: r[i] * s }));
}

/** where to put each region's number: its deepest point */
function vennSpots(V: Venn, pos: Pos[], W: number, H: number) {
  const n = V.sets.length, acc: Record<number, { c: number; deep: number; x: number; y: number; area: number }> = {};
  for (let y = 3; y < H; y += 3) for (let x = 3; x < W; x += 3) {
    let m = 0, deep = 1e9;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(x - pos[i].x, y - pos[i].y);
      if (d <= pos[i].r) m |= 1 << i;
      deep = Math.min(deep, Math.abs(d - pos[i].r));
    }
    if (!m) continue;
    const a = acc[m] || (acc[m] = { c: 0, deep: -1, x: 0, y: 0, area: 0 });
    a.c++;
    if (deep > a.deep) { a.deep = deep; a.x = x; a.y = y; }
  }
  for (const m in acc) acc[m].area = acc[m].c * 9;
  return acc;
}

const tw = (t: string, px: number) => [...t].filter((ch) => !/[ัิ-ฺ็-๎]/.test(ch)).length * px;   // สระบน-ล่างและวรรณยุกต์ไม่กินความกว้าง
function Lab({ x, y, size, weight, color, t }: { x: number; y: number; size: number; weight: number; color: string; t: string }) {
  const common = { x, y, textAnchor: "middle" as const, fontFamily: "sans-serif", fontSize: size, fontWeight: weight };
  return <>
    <text {...common} stroke="#FFFFFF" strokeWidth={3.5} strokeLinejoin="round" fill="#FFFFFF">{t}</text>
    <text {...common} fill={color}>{t}</text>
  </>;
}

export function VennBlock({ plan }: { plan: PlanRow[] }) {
  const V = vennModel(plan), W = 560, H = V.sets.length === 3 ? 330 : 250;
  const pos = vennLayout(V, W, H), spot = vennSpots(V, pos, W, H);
  const labels = V.regions.map((g) => {
    const a = spot[g.m], only = bits(g.m) === 1;
    if (!a || g.people < 1 || a.area < (only ? 500 : 620)) return null;
    if (!only) return <Lab key={g.m} x={a.x} y={a.y + 4} size={12} weight={600} color="#334155" t={fmt(g.people)} />;
    const i = Math.log2(g.m), c = pos[i], nm = V.sets[i].name;                 // ชื่อหมวดใต้ตัวเลข ย่อลงถ้าวงแคบ
    const half = Math.sqrt(Math.max(c.r * c.r - (a.y + 16 - c.y) ** 2, 1)), lo = c.x - half + 6, hi = c.x + half - 6;
    let text: string | null = null, x = a.x;
    const cands = ["เฉพาะ" + nm, "เฉพาะ" + nm.split(" & ")[0]];
    for (let L = nm.length - 2; L >= 6; L -= 2) cands.push("เฉพาะ" + nm.slice(0, L).trim() + "…");
    cands.push("เฉพาะหมวดนี้");
    for (const t of cands) {
      const w = tw(t, 6.4);
      if (hi - lo < w) continue;
      const yy = a.y + 16, step = (c.r * 0.4) / 10;                              // ขยับซ้ายขวาได้บ้าง หาที่ที่ข้อความไม่ล้ำวงอื่น
      let nx: number | null = null;
      for (let k = 0; k <= 10 && nx == null; k++) for (const sg of k ? [-1, 1] : [1]) {
        const cx = a.x + sg * k * step;
        if (cx - w / 2 < lo || cx + w / 2 > hi) continue;
        if ([cx - w / 2, cx + w / 2].some((ex) => pos.some((q, j) => (Math.hypot(ex - q.x, yy - q.y) <= q.r) !== (j === i)))) continue;
        nx = cx; break;
      }
      if (nx == null) continue;
      text = t; x = nx; break;
    }
    return <g key={g.m}>
      <Lab x={x} y={a.y} size={15} weight={700} color={VCOL[i]} t={fmt(g.people)} />
      {text ? <Lab x={x} y={a.y + 16} size={11} weight={400} color="#64748B" t={text} /> : null}
    </g>;
  });
  const dup = V.sets.reduce((t, s) => t + s.people, 0) - V.union;
  return (
    <div className="pvenn">
      <p className="plab">คนไม่ซ้ำ และคนที่เห็นซ้ำจากหลายหมวด</p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: "100%", height: "auto", display: "block", margin: "4px auto" }} role="img"
        aria-label={`แผนภาพคนไม่ซ้ำ ${V.sets.map((s) => s.name + " " + fmt(s.people) + " คน").join(", ")} รวม ${fmt(V.union)} คน`}>
        {V.sets.map((s, i) => <circle key={s.name} cx={pos[i].x.toFixed(1)} cy={pos[i].y.toFixed(1)} r={pos[i].r.toFixed(1)} fill={VCOL[i]} fillOpacity={0.22} stroke={VCOL[i]} strokeWidth={1.6} />)}
        {labels}
      </svg>
      <p className="plegend">{V.sets.map((s, i) => <span key={s.name} style={{ whiteSpace: "nowrap" }}>
        <i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, marginRight: 5, background: VCOL[i], opacity: 0.6, border: `1px solid ${VCOL[i]}` }} />
        {`${s.name} ${s.eps} EP · ${fmt(s.people)} คน`}{i < V.sets.length - 1 ? "   ·   " : ""}</span>)}</p>
      <p className="psmall">{`รวมคนไม่ซ้ำ ${fmt(V.union)} คน คิดเป็น ${((V.union / V.N) * 100).toFixed(1)}% ของคนคอมเม้นทั้งปี (${fmt(V.N)} คน)${V.sets.length > 1 ? ` · มีคนเห็นจากมากกว่าหนึ่งหมวดราว ${fmt(dup)} คน` : ""}${V.sets.length === 3 ? ` · เห็นครบทั้ง 3 หมวด ${fmt(V.regions[6].people)} คน` : ""} · ตัวเลขเป็นค่าประมาณจากแบบจำลองการเข้าถึง คลาดได้ราว ±${Math.round(D.reach.median_abs_error * 100)}%`}</p>
    </div>
  );
}

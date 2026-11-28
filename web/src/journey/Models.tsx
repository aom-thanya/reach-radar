// Hidden page (#models, #models/1..16; not in the menu): one step per page, Input → Process (model) → Output,
// each panel drawn from the project's real aggregates. No handles, no comment text.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { D } from "../data";
import { fmt } from "../lib/format";
import { PLAN0, planNumbers } from "../planner/model";
import { CATS, JACC, NEPS, QUIET, SHORT } from "./data";
import { HOW, KMeansMini, MergeMini } from "./how";
import CAT_LOY from "./catLoyalty.json";
import "./models.css";

type Kind = "rule" | "stat" | "llm" | "ml" | "net" | "sim";
const QUESTIONS: Record<string, string> = { "ก": "Gen ไหน อินกับคอนเทนต์อะไร", "ข": "Retention vs Acquisition: หัวข้อไหนรักษาคนเก่า หัวข้อไหนดึงคนใหม่" };
const CHAPTERS = ["เก็บข้อมูล", "ทำความสะอาดและ EDA", "ติดป้ายด้วย AI", "จัดกลุ่ม", "เครือข่าย", "เอาไปใช้"];
const GCOL: Record<string, string> = { "Gen Z": "var(--gz)", "Gen Y": "var(--gy)", "Gen X ขึ้นไป": "var(--gx)" };
const KCOL = (i: number) => `var(--m-k${i})`;
const TH_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย."];
const COMM_SHORT: Record<string, string> = { "สายดราม่าคนดัง": "ดราม่าคนดัง", "สายครอบครัว-ชู้สาว": "ครอบครัว-ชู้สาว", "สายเรื่องร้อนครบเครื่อง": "ร้อนครบเครื่อง", "สายสังคม-ศาสนา-ข้อพิพาท": "สังคม-ศาสนา" };

/** stagger: element k of n starts `spread` seconds after the panel's --base */
const st = (k: number, n: number, spread = 0.9): CSSProperties => ({ animationDelay: `calc(var(--base) + ${((k / Math.max(1, n)) * spread).toFixed(3)}s)` });

/* ---------- chart primitives, all in a 400 × 300 box ---------- */
const VW = 400, VH = 300;
function Svg({ children, label }: { children: ReactNode; label: string }) {
  return <svg viewBox={`0 0 ${VW} ${VH}`} role="img" aria-label={label}>{children}</svg>;
}
function Cols({ v, color, labels, top, label }: { v: number[]; color?: (i: number) => string; labels?: string[]; top?: (i: number) => string | null; label: string }) {
  const mx = Math.max(...v), n = v.length, L = 8, R = VW - 8, B = labels ? VH - 26 : VH - 8, T = 22, w = (R - L) / n;
  return <Svg label={label}>
    <line x1={L} x2={R} y1={B} y2={B} className="ax" />
    {v.map((x, i) => { const h = (x / mx) * (B - T); return <rect key={i} className="g up" style={{ ...st(i, n), fill: color?.(i) }} x={L + i * w + w * 0.12} y={B - h} width={Math.max(0.6, w * 0.76)} height={Math.max(0.5, h)} rx={Math.min(3, w * 0.2)} />; })}
    {labels?.map((t, i) => <text key={i} x={L + (i + 0.5) * w} y={VH - 8} textAnchor="middle" className="t s">{t}</text>)}
    {top && v.map((x, i) => { const t = top(i); return t ? <text key={i} x={L + (i + 0.5) * w} y={B - (x / mx) * (B - T) - 6} textAnchor="middle" className="t s fade" style={st(i, n, 1.2)}>{t}</text> : null; })}
  </Svg>;
}
function HBars({ rows, label, fmtV = (x) => fmt(x), lw = 112 }: { rows: { t: string; v: number; c?: string }[]; label: string; fmtV?: (x: number) => string; lw?: number }) {
  const mx = Math.max(...rows.map((r) => r.v)), n = rows.length, rh = Math.min(30, (VH - 10) / n), x0 = lw, x1 = VW - 70;
  const y0 = (VH - rh * n) / 2;
  return <Svg label={label}>{rows.map((r, i) => { const y = y0 + i * rh, w = (r.v / mx) * (x1 - x0);
    return <g key={i}><text x={x0 - 8} y={y + rh * 0.64} textAnchor="end" className="t">{r.t}</text>
      <rect className="g right" style={{ ...st(i, n), fill: r.c }} x={x0} y={y + rh * 0.16} width={Math.max(1, w)} height={rh * 0.68} rx="3" />
      <text x={x0 + w + 6} y={y + rh * 0.64} className="t s fade" style={st(i, n, 1.2)}>{fmtV(r.v)}</text></g>; })}</Svg>;
}
function Grid({ n, cols, color, shape = "sq", label, size }: { n: number; cols: number; color: (i: number) => string; shape?: "sq" | "dot"; label: string; size?: number }) {
  const rows = Math.ceil(n / cols), s = size ?? Math.min((VW - 20) / cols, (VH - 20) / rows), x0 = (VW - s * cols) / 2, y0 = (VH - s * rows) / 2;
  return <Svg label={label}>{Array.from({ length: n }, (_, i) => { const x = x0 + (i % cols) * s, y = y0 + Math.floor(i / cols) * s;
    return shape === "sq" ? <rect key={i} className="g pop" style={{ ...st(i, n), fill: color(i) }} x={x + s * 0.1} y={y + s * 0.1} width={s * 0.8} height={s * 0.8} rx={s * 0.15} />
      : <circle key={i} className="g pop" style={{ ...st(i, n), fill: color(i) }} cx={x + s / 2} cy={y + s / 2} r={s * 0.38} />; })}</Svg>;
}
function TitleList() {
  const rows = useMemo(() => { const seen = new Set<string>(); return D.eps.filter((e) => (seen.has(e.m) ? false : (seen.add(e.m), true))).slice(0, 9); }, []);
  return <div className="m-list">{rows.map((e, i) => <div key={e.ep} className="g fade" style={st(i, rows.length, 0.8)}><span className="num">EP.{e.ep}</span>{e.title}</div>)}<div className="m-more">… อีก {D.eps.length - rows.length} คลิป</div></div>;
}

/* ---------- derived real numbers ---------- */
const byMonth = TH_M.map((_, i) => D.eps.filter((e) => +e.m.slice(5, 7) === i + 1).length);
const epComments = D.eps.map((e) => e.comments);
const PLAN_DEMO = { ...PLAN0, goal: "reach" }; // demo brief without the loyalty goal
const plan = planNumbers(PLAN_DEMO);
const labN = { Z: 51, Y: 173, X: 201, U: 1050 - 425 };
const labSplit = (() => { const raw = [labN.Z, labN.Y, labN.X, labN.U].map((x) => (x / 1050) * 105); const o = raw.map(Math.round); o[3] += 105 - o.reduce((a, b) => a + b, 0); return o; })();
const labCol = (i: number) => (i < labSplit[0] ? "var(--gz)" : i < labSplit[0] + labSplit[1] ? "var(--gy)" : i < labSplit[0] + labSplit[1] + labSplit[2] ? "var(--gx)" : "var(--m-dim)");
const aired = (D.communities[0].aired ?? {}) as Record<string, number>;

function CatNet() {
  const cx = VW / 2, cy = VH / 2, rad = 104, order = [...CATS.filter((c) => !QUIET.has(c)), ...CATS.filter((c) => QUIET.has(c))];
  const p: Record<string, { x: number; y: number; a: number; r: number }> = {};
  order.forEach((c, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / order.length; p[c] = { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), a, r: 4 + Math.sqrt(D.categories.find((k) => k.name === c)!.people) / 24 }; });
  const E = JACC.slice().sort((a, b) => a.w - b.w);
  return <Svg label="เครือข่ายคนดูร่วมของ 10 หมวด น้ำหนัก Jaccard">
    {E.map((e, k) => { const a = p[e.a], b = p[e.b], top = e.w > 0.17, same = QUIET.has(e.a) === QUIET.has(e.b);
      return <line key={k} className="g fade" style={{ ...st(k, E.length), stroke: top ? "var(--ink)" : same ? (QUIET.has(e.a) ? "var(--m-c1)" : "var(--m-c0)") : "var(--m-dim)", strokeOpacity: top ? 0.9 : 0.15 + e.w * 3 }} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={e.w * 30} strokeLinecap="round" />; })}
    {order.map((c, i) => { const q2 = p[c], ca = Math.cos(q2.a), lx = cx + (rad + q2.r + 7) * ca, ly = cy + (rad + q2.r + 7) * Math.sin(q2.a);
      return <g key={c}><circle className="g pop nn" style={{ ...st(i, 10, 0.6), fill: QUIET.has(c) ? "var(--m-c1)" : "var(--m-c0)" }} cx={q2.x} cy={q2.y} r={q2.r} />
        <text x={lx} y={ly + (Math.sin(q2.a) > 0.5 ? 11 : Math.sin(q2.a) < -0.5 ? -2 : 4)} textAnchor={Math.abs(ca) < 0.25 ? "middle" : ca > 0 ? "start" : "end"} className="t">{SHORT[c]}</text></g>; })}
  </Svg>;
}
function Bipartite() {
  const cats = D.categories, mx = Math.max(...cats.map((c) => c.people)), tot = cats.reduce((a, c) => a + c.people, 0);
  let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const py = (i: number) => 16 + i * 17.5, cy = (i: number) => 18 + i * 28;
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) { const k = 1 + Math.floor(r() * 2.2); for (let j = 0; j < k; j++) { let x = r() * tot, ci = 0; while (ci < 9 && x > cats[ci].people) { x -= cats[ci].people; ci++; } edges.push([i, ci]); } }
  return <Svg label="กราฟสองฝั่ง คน กับ หมวด">
    {edges.map(([a, b], k) => <line key={k} className="g fade" style={st(k, edges.length)} x1={40} y1={py(a)} x2={250} y2={cy(b)} stroke="var(--m-dim)" strokeWidth={1.4} />)}
    {Array.from({ length: 16 }, (_, i) => <circle key={i} className="g pop" style={{ ...st(i, 16, 0.4), fill: "var(--m-ink)" }} cx={40} cy={py(i)} r={5} />)}
    {cats.map((c, i) => <g key={c.name}><rect className="g right" style={{ ...st(i, 10), fill: QUIET.has(c.name) ? "var(--m-c1)" : "var(--m-c0)" }} x={250} y={cy(i) - 8} width={8 + (c.people / mx) * 60} height={16} rx={4} /><text x={250 + 14 + (c.people / mx) * 60} y={cy(i) + 4} className="t s">{SHORT[c.name]}</text></g>)}
  </Svg>;
}
function GenStack() {
  const cats = [...D.categories].sort((a, b) => b.gen["Gen Z"] - a.gen["Gen Z"]), rh = 26, y0 = 14, x0 = 96, w = VW - x0 - 8;
  return <Svg label="สัดส่วน Gen ของคนคอมเม้นในแต่ละหมวด">
    {cats.map((c, i) => { let x = x0; return <g key={c.name}><text x={x0 - 8} y={y0 + i * rh + 16} textAnchor="end" className="t">{SHORT[c.name]}</text>
      {D.gens.map((g, k) => { const ww = (c.gen[g] / 100) * w, el = <rect key={g} className="g right" style={{ ...st(i * 3 + k, 30), fill: GCOL[g] }} x={x} y={y0 + i * rh + 3} width={ww - 1} height={rh - 8} />; x += ww; return el; })}
      <text x={x0 + (c.gen["Gen Z"] / 100) * w / 2} y={y0 + i * rh + 16} textAnchor="middle" className="t xs inv fade" style={st(i, 10, 1.2)}>{c.gen["Gen Z"].toFixed(0)}</text></g>; })}
    {D.gens.map((g, k) => <text key={g} x={x0 + k * 96} y={VH - 4} className="t s b" style={{ fill: GCOL[g] }}>■ {g.replace(" ขึ้นไป", "+")}</text>)}
  </Svg>;
}
function GenNet() {
  const cats = D.categories, mx = Math.max(...cats.map((c) => c.people)), cy = (i: number) => 20 + i * 27, gy = (k: number) => 70 + k * 80, xl = 108, xr = 318;
  const E = cats.flatMap((c, i) => D.gens.map((g, k) => ({ i, k, g, lift: c.gen_lift[g], n: (c.people * c.gen[g]) / 100, name: c.name })));
  const nmx = Math.max(...E.map((e) => e.n));
  return <Svg label="เครือข่ายสองฝั่ง หมวด กับ Gen น้ำหนักเส้น = จำนวนคน สี = lift">
    {E.sort((a, b) => Math.abs(a.lift - 1) - Math.abs(b.lift - 1)).map((e, j) => { const hot = e.lift >= 1.03, cold = e.lift <= 0.97;
      return <line key={j} className="g fade" style={{ ...st(j, E.length), stroke: hot ? GCOL[e.g] : cold ? "var(--m-dim)" : "var(--m-dim)", strokeOpacity: hot ? 0.9 : cold ? 0.5 : 0.25 }} x1={xl} y1={cy(e.i)} x2={xr} y2={gy(e.k)} strokeWidth={1 + (e.n / nmx) * 9} strokeDasharray={cold ? "4 3" : undefined} strokeLinecap="round" />; })}
    {cats.map((c, i) => <g key={c.name}><circle className="g pop" style={{ ...st(i, 10, 0.5), fill: QUIET.has(c.name) ? "var(--m-c1)" : "var(--m-c0)" }} cx={xl} cy={cy(i)} r={3 + Math.sqrt(c.people / mx) * 7} /><text x={xl - 12} y={cy(i) + 4} textAnchor="end" className="t">{SHORT[c.name]}</text></g>)}
    {D.gens.map((g, k) => <g key={g}><circle className="g pop nn" style={{ ...st(k, 3, 0.5), fill: GCOL[g] }} cx={xr} cy={gy(k)} r={16} /><text x={xr + 22} y={gy(k) + 5} className="t b">{g.replace(" ขึ้นไป", "+")}</text></g>)}
    {E.filter((e) => e.lift >= 1.05).map((e) => <text key={e.name + e.g} className="t xs b fade" style={st(9, 9, 1.4)} x={xl + (xr - xl) * 0.22} y={cy(e.i) + (gy(e.k) - cy(e.i)) * 0.22 - 5}>×{e.lift.toFixed(2)}</text>)}
  </Svg>;
}
function Heat() {
  const cs = D.communities, x0 = 100, cw = (VW - x0 - 4) / 10, y0 = 70, rh = 54;
  return <Svg label="lift ของสายคนดูแต่ละสายต่อ 10 หมวด">
    {CATS.map((c, j) => { const x = x0 + cw * (j + 0.5) + 3; return <text key={c} x={x} y={y0 - 6} transform={`rotate(-45 ${x} ${y0 - 6})`} className="t xs">{SHORT[c]}</text>; })}
    {cs.map((m, i) => <g key={m.name}><text x={x0 - 6} y={y0 + i * (rh + 4) + 24} textAnchor="end" className="t s b">{COMM_SHORT[m.name] ?? m.name}</text><text x={x0 - 6} y={y0 + i * (rh + 4) + 40} textAnchor="end" className="t xs">{fmt(m.people)} คน</text>
      {CATS.map((c, j) => { const v = m.lift[c], t = Math.max(-1, Math.min(1, Math.log(v) / Math.log(3)));
        return <rect key={c} className="g pop" style={{ ...st(i * 10 + j, 40), fill: t >= 0 ? `color-mix(in srgb, var(--m-hot) ${Math.round(t * 90)}%, var(--surface))` : `color-mix(in srgb, var(--m-cool) ${Math.round(-t * 80)}%, var(--surface))` }} x={x0 + j * cw + 1} y={y0 + i * (rh + 4)} width={cw - 2} height={rh} rx={4}><title>{`${m.name} × ${SHORT[c]}: ${v.toFixed(2)} เท่า`}</title></rect>; })}</g>)}
  </Svg>;
}
function Hair() {
  let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = D.tags.map(() => ({ x: 40 + r() * 320, y: 30 + r() * 240 })), E: [number, number][] = [];
  P.forEach((_, i) => { for (let k = 0; k < 4; k++) { const j = Math.floor(r() * P.length); if (j !== i) E.push([i, j]); } });
  return <Svg label="ภาพประกอบกราฟประเด็นย่อยที่พันกัน">{E.map(([a, b], k) => <line key={k} className="g fade" style={st(k, E.length)} x1={P[a].x} y1={P[a].y} x2={P[b].x} y2={P[b].y} stroke="var(--m-dim)" strokeWidth={1.2} />)}
    {P.map((p, i) => <circle key={i} className="g pop" style={{ ...st(i, P.length), fill: "var(--m-ink)" }} cx={p.x} cy={p.y} r={6} />)}</Svg>;
}
function Gauge({ rows }: { rows: { t: string; v: number; ref: number; refT: string; max: number }[] }) {
  return <Svg label="ค่าที่วัดได้เทียบเกณฑ์">{rows.map((r, i) => { const y = 40 + i * 130, X = (v: number) => 20 + (v / r.max) * 360;
    return <g key={i}><text x={20} y={y} className="t b">{r.t}</text>
      <rect x={20} y={y + 14} width={360} height={30} rx={6} className="track2" />
      <rect className="g right" style={{ ...st(i, 2), fill: "var(--m-bad)" }} x={20} y={y + 14} width={X(r.v) - 20} height={30} rx={6} />
      <line x1={X(r.ref)} x2={X(r.ref)} y1={y + 6} y2={y + 52} stroke="var(--ink)" strokeWidth={2} strokeDasharray="4 3" />
      <text x={X(r.v) + 8} y={y + 35} className="t b fade" style={st(i, 2, 1.2)}>{r.v.toFixed(2)}</text>
      <text x={X(r.ref)} y={y + 70} textAnchor="middle" className="t s">{r.refT}</text></g>; })}</Svg>;
}
function GenCI() {
  const P = D.overall.gen_pct, CI = D.overall.gen_ci, Y = (v: number) => 250 - (v / 70) * 220, w = 70;
  return <Svg label="สัดส่วน Gen พร้อมช่วงความเชื่อมั่น 95%">
    {[0, 20, 40, 60].map((t) => <g key={t}><line x1={40} x2={VW - 10} y1={Y(t)} y2={Y(t)} className="ax lite" /><text x={34} y={Y(t) + 4} textAnchor="end" className="t s">{t}%</text></g>)}
    {D.gens.map((k, i) => { const x = 70 + i * 110; return <g key={k}>
      <rect className="g up" style={{ ...st(i, 3), fill: GCOL[k] }} x={x} y={Y(P[k])} width={w} height={250 - Y(P[k])} rx={4} />
      <line className="g fade" style={st(i, 3, 1.2)} x1={x + w / 2} x2={x + w / 2} y1={Y(CI[k][0])} y2={Y(CI[k][1])} stroke="var(--ink)" strokeWidth={2} />
      {[0, 1].map((e) => <line key={e} className="g fade" style={st(i, 3, 1.2)} x1={x + w / 2 - 8} x2={x + w / 2 + 8} y1={Y(CI[k][e])} y2={Y(CI[k][e])} stroke="var(--ink)" strokeWidth={2} />)}
      <text x={x + w / 2} y={Y(CI[k][1]) - 8} textAnchor="middle" className="t b fade" style={st(i, 3, 1.3)}>{P[k].toFixed(0)}%</text>
      <text x={x + w / 2} y={272} textAnchor="middle" className="t">{k.replace(" ขึ้นไป", "+")}</text></g>; })}
    <text x={VW - 10} y={294} textAnchor="end" className="t s">เส้นดำ = ช่วงความเชื่อมั่น 95% (bootstrap)</text>
  </Svg>;
}

/* ---------- tripartite network: Gen ↔ topic ↔ loyalty (edge = people) ---------- */
const LOYS = ["ขาจร", "นักเสพข่าว", "แฟนตัวยง"] as const;
const LCOL: Record<string, string> = { "ขาจร": "var(--m-drift)", "นักเสพข่าว": "var(--m-news)", "แฟนตัวยง": "var(--m-fan)" };
const CL = CAT_LOY as Record<string, Record<string, number>>;
const loyTot = LOYS.map((l) => CATS.reduce((a, c) => a + (CL[c]?.[l] ?? 0), 0)), pairTot = loyTot.reduce((a, b) => a + b, 0);
const loyBase: Record<string, number> = Object.fromEntries(LOYS.map((l, k) => [l, loyTot[k] / pairTot]));
const catPeople = (c: string) => LOYS.reduce((a, l) => a + (CL[c]?.[l] ?? 0), 0);
const loyShare = (c: string, l: string) => (CL[c]?.[l] ?? 0) / catPeople(c);
const byDrift = [...CATS].sort((a, b) => loyShare(b, "ขาจร") - loyShare(a, "ขาจร")), byFan = [...CATS].sort((a, b) => loyShare(b, "แฟนตัวยง") - loyShare(a, "แฟนตัวยง"));
const pc = (x: number) => (x * 100).toFixed(0) + "%";

function TriNet() {
  const [hov, setHov] = useState<string | null>(null);
  const [pin, setPin] = useState<string | null>(null);
  const sel = hov ?? pin;
  const W = 560, H = 360, xg = 70, xt = 280, xl = 490;
  const order = [...CATS].sort((a, b) => loyShare(b, "ขาจร") - loyShare(a, "ขาจร"));
  const ty = (i: number) => 26 + i * 32, sy = (k: number) => 80 + k * 100;
  const cats = D.categories;
  const E: { c: string; side: "g" | "l"; k: number; n: number; lift: number; col: string }[] = [];
  order.forEach((c) => { const cat = cats.find((x) => x.name === c)!;
    D.gens.forEach((g, k) => E.push({ c, side: "g", k, n: (cat.people * cat.gen[g]) / 100, lift: cat.gen_lift[g], col: GCOL[g] }));
    LOYS.forEach((l, k) => E.push({ c, side: "l", k, n: CL[c]?.[l] ?? 0, lift: loyShare(c, l) / loyBase[l], col: LCOL[l] })); });
  const nmx = Math.max(...E.map((e) => e.n));
  const curve = (x1: number, y1: number, x2: number, y2: number) => { const mx = (x1 + x2) / 2; return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`; };
  const on = (c: string) => sel === null || sel === c;
  const selCat = sel ? cats.find((x) => x.name === sel) : null;
  return <div className="m-tri">
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="เครือข่าย 3 ฝั่ง Gen กับหมวด กับความภักดี น้ำหนักเส้นคือจำนวนคน" onMouseLeave={() => setHov(null)}>
      {E.map((e, j) => { const i = order.indexOf(e.c), hot = e.lift >= 1.15;
        const d = e.side === "g" ? curve(xg + 18, sy(e.k), xt - 10, ty(i)) : curve(xt + 10, ty(i), xl - 18, sy(e.k));
        return <path key={j} d={d} className="g fade" style={{ ...st(j, E.length, 0.9), stroke: e.col, strokeOpacity: on(e.c) ? (sel ? 0.85 : hot ? 0.7 : 0.18) : 0.04, strokeWidth: 0.8 + (e.n / nmx) * 16, fill: "none", transition: "stroke-opacity .3s" }} />; })}
      {D.gens.map((g, k) => <g key={g}><circle className="g pop" style={{ ...st(k, 3, 0.4), fill: GCOL[g] }} cx={xg} cy={sy(k)} r={18} /><text x={xg} y={sy(k) + 34} textAnchor="middle" className="t b">{g.replace(" ขึ้นไป", "+")}</text></g>)}
      {LOYS.map((l, k) => <g key={l}><circle className="g pop" style={{ ...st(k, 3, 0.4), fill: LCOL[l] }} cx={xl} cy={sy(k)} r={18} stroke="var(--ink-3)" strokeWidth={1} /><text x={xl} y={sy(k) + 34} textAnchor="middle" className="t b">{l}</text></g>)}
      {order.map((c, i) => <g key={c} className="m-tnode" onClick={() => setPin(pin === c ? null : c)} onMouseEnter={() => setHov(c)} style={{ cursor: "pointer" }}>
        <rect x={xt - 58} y={ty(i) - 12} width={116} height={24} rx={12} className="g pop" style={{ ...st(i, 10, 0.5), fill: sel === c ? "var(--k)" : "var(--surface)", stroke: QUIET.has(c) ? "var(--m-c1)" : "var(--m-c0)", strokeWidth: 2 }} />
        <text x={xt} y={ty(i) + 4.5} textAnchor="middle" className="t b" style={{ fill: sel === c ? "var(--surface)" : undefined, pointerEvents: "none" }}>{SHORT[c]}</text></g>)}
      <text x={xg} y={14} textAnchor="middle" className="t s">Generation</text><text x={xt} y={H - 4} textAnchor="middle" className="t s">หมวด (เรียงจากขาจรมากไปน้อย)</text><text x={xl} y={14} textAnchor="middle" className="t s">ความภักดี</text>
    </svg>
    <div className="m-tri-info">{selCat ? <><b>{SHORT[selCat.name]}</b> · {fmt(catPeople(selCat.name))} คน
      <span>{LOYS.map((l) => `${l} ${pc(loyShare(selCat.name, l))}`).join(" · ")}</span>
      <span>{D.gens.map((g) => `${g.replace(" ขึ้นไป", "+")} ×${selCat.gen_lift[g].toFixed(2)}`).join(" · ")}</span></>
      : <span>ชี้ที่หมวดเพื่อดูว่าคนในหมวดนั้นเป็นใคร · กดเพื่อปักไว้ · เส้นเข้ม = มากกว่าค่าเฉลี่ยตั้งแต่ 15%</span>}</div>
  </div>;
}
function PersonMini() {
  return <Svg label="คน 1 คน เชื่อมกับ 3 อย่าง">
    <circle className="g pop" style={st(0, 4)} cx={200} cy={150} r={26} fill="var(--m-ink)" /><text x={200} y={155} textAnchor="middle" className="t b inv">คน</text>
    {[[80, 60, "หมวดที่ดู", "หลายหมวดได้", "var(--m-c0)"], [320, 60, "Generation", "Z / Y / X+", "var(--gy)"], [200, 262, "ความภักดี", "ขาจร / นักเสพข่าว / แฟนตัวยง", "var(--m-fan)"]].map(([x, y, a, b, c], k) =>
      <g key={k}><line className="g fade" style={st(k + 1, 4)} x1={200} y1={150} x2={+x} y2={+y} stroke={String(c)} strokeWidth={4} />
        <circle className="g pop" style={st(k + 1, 4)} cx={+x} cy={+y} r={16} fill={String(c)} /><text x={+x} y={+y + (k === 2 ? -24 : 34)} textAnchor="middle" className="t b">{a}</text><text x={+x} y={+y + (k === 2 ? -8 : 50)} textAnchor="middle" className="t s">{b}</text></g>)}
    <text x={200} y={296} textAnchor="middle" className="t s">ทำแบบนี้กับคนทั้ง {fmt(D.n_people)} คน แล้วรวมคนที่อยู่ในคู่เดียวกันเป็นเส้น</text>
  </Svg>;
}

/* ---------- why network: table view vs network view (real aggregates) ---------- */
const famC = D.categories.find((c) => c.name === "ครอบครัว & ความสัมพันธ์")!, crimeC = D.categories.find((c) => c.name === "อาชญากรรม & การหลอกลวง")!;
const JFC = 0.1713, overlapFC = Math.round((JFC * (famC.people + crimeC.people)) / (1 + JFC)), uniqFC = famC.people + crimeC.people - overlapFC;
const sumEpPeople = D.eps.reduce((a, e) => a + e.people, 0);
function TableView() {
  const rows: [string, string, string, boolean?][] = [["ทุก EP รวมกัน", `${fmt(sumEpPeople)}`, "คน-ตอน", true], [SHORT[famC.name], fmt(famC.people), "คน"], [SHORT[crimeC.name], fmt(crimeC.people), "คน"], ["ครอบครัว + อาชญากรรม", fmt(famC.people + crimeC.people), "คน ?", true]];
  return <div className="m-tv">
    <table><thead><tr><th>ดูแบบตาราง</th><th className="r">คนคอมเม้น</th><th /></tr></thead>
      <tbody>{rows.map(([a, b, c, q], i) => <tr key={i} className={"g fade" + (q ? " q" : "")} style={{ animationDelay: `calc(var(--base) + ${i * 0.15}s)` }}><td>{a}</td><td className="r num">{b}</td><td>{c}</td></tr>)}</tbody></table>
    <p>ตารางบอกได้แค่ว่าแต่ละแถวมีกี่คน แต่บอกไม่ได้ว่า<b>คนในสองแถวเป็นคนเดียวกันหรือไม่</b> พอบวกกันจึงนับคนซ้ำ</p>
  </div>;
}
function NetView() {
  const r1 = 92, r2 = 78;
  return <Svg label="กราฟเห็นคนที่ดูทั้งสองหมวด">
    <circle className="g pop" style={st(0, 3)} cx={150} cy={130} r={r1} fill="var(--m-c0)" fillOpacity={0.28} stroke="var(--m-c0)" strokeWidth={2} />
    <circle className="g pop" style={st(1, 3)} cx={250} cy={130} r={r2} fill="var(--m-c1)" fillOpacity={0.28} stroke="var(--m-c1)" strokeWidth={2} />
    <text x={110} y={126} textAnchor="middle" className="t b">{SHORT[famC.name]}</text><text x={110} y={146} textAnchor="middle" className="t s">{fmt(famC.people - overlapFC)}</text>
    <text x={292} y={126} textAnchor="middle" className="t b">{SHORT[crimeC.name]}</text><text x={292} y={146} textAnchor="middle" className="t s">{fmt(crimeC.people - overlapFC)}</text>
    <text x={202} y={124} textAnchor="middle" className="t b fade" style={st(2, 3, 1.2)}>ดูทั้งคู่</text><text x={202} y={144} textAnchor="middle" className="t b fade" style={st(2, 3, 1.2)}>{fmt(overlapFC)}</text>
    <text x={200} y={256} textAnchor="middle" className="t b">คนไม่ซ้ำจริง {fmt(uniqFC)} คน</text>
    <text x={200} y={276} textAnchor="middle" className="t s">ไม่ใช่ {fmt(famC.people + crimeC.people)} · Jaccard = {fmt(overlapFC)} ÷ {fmt(uniqFC)} = 0.17</text>
  </Svg>;
}
function Compare() {
  const R: [string, string, string][] = [
    ["EP ไหนคอมเม้นเยอะ", "ตอบได้", "ตอบได้"],
    ["ซื้อ 2 หมวด ได้คนไม่ซ้ำกี่คน", "บวกกัน = นับซ้ำ", `ได้ ${fmt(uniqFC)} (ซ้อน ${fmt(overlapFC)})`],
    ["คนดูหมวดนี้ไปดูหมวดไหนต่อ", "ไม่รู้", "ดูจากความแรงของเส้น (Jaccard)"],
    ["คนกลุ่มไหนดูอะไรด้วยกัน", "ไม่รู้", "แบ่งก้อน / สายคนดู"],
    ["วัยไหนเชื่อมกับหมวดไหน", "ดูได้ทีละหมวด", "เห็นทั้ง 10 หมวด × 3 Gen ในกราฟเดียว"],
    ["ซื้อเพิ่มได้คนใหม่ (Acquisition) หรือคนเดิม (Retention)", "ไม่รู้", "ดูจากคนที่ซ้อนกันระหว่างตอน"],
  ];
  return <><h2>คำถามของทีมขาย: ตารางตอบได้แค่ไหน เทียบกับ Network <span>ตัวเลขจากข้อมูลจริง</span></h2>
    <div className="m-tbl"><table className="cmp"><thead><tr><th>คำถาม</th><th>ดูแบบตาราง (EP × คอมเม้น)</th><th>ดูแบบ Network (คน ↔ EP)</th></tr></thead>
      <tbody>{R.map((r, i) => <tr key={i} className="g fade" style={{ animationDelay: `${0.3 + i * 0.1}s` }}><td data-l="คำถาม">{r[0]}</td><td data-l="ตาราง" className={r[1] === "ตอบได้" ? "ok" : "no"}>{r[1]}</td><td data-l="Network" className="ok">{r[2]}</td></tr>)}</tbody></table></div></>;
}

/* ---------- sample tables for the data-collection steps ---------- */
function EpSample() {
  const rows = D.eps.slice(0, 6);
  return <><h2>ตัวอย่างตารางที่ได้: รายชื่อ EP <span>227 แถว · ข้อมูลสาธารณะของคลิป</span></h2>
    <div className="m-tbl"><table><thead><tr><th>video_id</th><th>ep</th><th>date</th><th>title</th><th className="r">views</th><th className="r">likes</th><th className="r">comments</th></tr></thead>
      <tbody>{rows.map((e, i) => <tr key={e.vid} className="g fade" style={{ animationDelay: `${0.2 + i * 0.08}s` }}><td className="mono">{e.vid}</td><td className="mono">{e.ep}</td><td className="mono">{e.date}</td><td className="ttl">{e.title}</td><td className="r mono">{fmt(e.views)}</td><td className="r mono">{fmt(e.likes)}</td><td className="r mono">{fmt(e.comments)}</td></tr>)}
        <tr className="more"><td colSpan={7}>… อีก {D.eps.length - rows.length} แถว</td></tr></tbody></table></div>
    <p className="m-note">views / likes อ่านจากหน้าคลิปสาธารณะ · comments คือจำนวนที่ดึงได้ในขั้นถัดไป</p></>;
}
function CommentSample() {
  const vid = D.eps[0].vid;
  const R: [string, string, string, string, string, string, string, boolean, boolean][] = [
    ["Ugx•••Q4", "", "@user-•••", "UC•••a1", "1.2 พัน", "12", "4 วันที่ผ่านมา", false, true],
    ["Ugx•••Q4.A1", "", "@•••4408", "UC•••7f", "37", "", "3 วันที่ผ่านมา", true, false],
    ["Ugw•••k2", "", "@user-•••", "UC•••c9", "0", "", "2 สัปดาห์ที่ผ่านมา", false, false],
    ["Ugz•••p8", "", "@•••ning", "UC•••4d", "5", "2", "5 เดือนที่ผ่านมา", false, false],
    ["Ugy•••m1", "", "@user-•••", "UC•••a1", "214", "", "11 เดือนที่ผ่านมา", false, false],
  ];
  return <><h2>ตัวอย่างตารางที่ได้: คอมเม้น <span>852,802 แถว × 12 ช่อง</span></h2>
    <div className="m-tbl"><table><thead><tr><th>cid</th><th>video_id</th><th>reply</th><th>text</th><th>author</th><th>channel</th><th className="r">votes</th><th className="r">replies</th><th>time</th><th>heart</th></tr></thead>
      <tbody>{R.map((r, i) => <tr key={i} className="g fade" style={{ animationDelay: `${0.2 + i * 0.08}s` }}><td className="mono">{r[0]}</td><td className="mono">{vid}</td><td className="mono">{String(r[7])}</td><td><i className="mask" style={{ width: `${60 + ((i * 37) % 70)}px` }} /></td><td className="mono">{r[2]}</td><td className="mono">{r[3]}</td><td className="r mono">{r[4]}</td><td className="r mono">{r[5]}</td><td>{r[6]}</td><td className="mono">{String(r[8])}</td></tr>)}
        <tr className="more"><td colSpan={10}>… อีก 852,797 แถว · มีช่อง time_parsed และ scraped_at (เวลาแบบตัวเลข) ด้วย</td></tr></tbody></table></div>
    <p className="m-note">รูปแบบของแต่ละช่องเหมือนข้อมูลจริง (เช่น votes เป็นข้อความ "1.2 พัน", time เป็น "4 วันที่ผ่านมา") แต่ปิดข้อความ ชื่อบัญชี และรหัสไว้ตามกฎความเป็นส่วนตัว ข้อมูลจริงเก็บในเครื่องเท่านั้น</p></>;
}

/* ---------- topics ---------- */
interface Biz { q: string[]; in: string; proc: string; out: string }
interface Topic { ch: number; biz: Biz; yt?: boolean; big?: boolean; sample?: () => ReactNode; box: string; title: string; kind: Kind; inCap: string; outCap: string; In: () => ReactNode; Out: () => ReactNode; Mini?: () => ReactNode;
  inp: string; model: string; params: string; tech: string[]; paths: string[][]; real?: string; out: string; read: string; why: string; fail?: boolean; illus?: string }

const TOPICS_ALL: Topic[] = [
  { ch: 0, yt: true, sample: () => <EpSample />, box: "Tokenization", title: "รายชื่อ EP ปี 2026", kind: "rule", biz: {"q": [], "in": "คลังคอนเทนต์ทั้งปีของรายการ", "proc": "ทำบัญชีสินค้า: ตอนไหนออกวันไหน เรื่องอะไร", "out": "รายการ Slot ที่ขายได้ 227 ตอน เดือนละราว 20 ตอน"}, inCap: "ชื่อคลิปในช่อง (ตัวอย่างเดือนละ 1 คลิป)", outCap: "227 EP แยกตามเดือนที่ออกอากาศ",
    In: () => <TitleList />, Out: () => <Cols v={byMonth} labels={TH_M} top={(i) => String(byMonth[i])} label="จำนวน EP ต่อเดือน" />,
    inp: "หน้าช่อง YouTube ทุกคลิป", model: "Tokenization: แยกชื่อคลิปเป็นส่วนๆ", params: "ตัดชื่อคลิปแต่ละเรื่องออกเป็นเลข EP · ชื่อเรื่อง · วันที่ไทย · แก้ชื่อเดือนที่พิมพ์ผิด แล้วเก็บเฉพาะคลิปปี 69", tech: ["#30 Tokenization & N-grams"], paths: [["Text Analytics", "#30 Tokenization & N-grams", "Regular expression (regex) แยกเลข EP และวันที่ไทย"]], real: "ดึงรายชื่อคลิปด้วยเครื่องมือฟรีจากหน้าเว็บสาธารณะ แล้วใช้รูปแบบข้อความ (regex) แยกส่วน", out: "227 EP (1 ม.ค.–20 พ.ย. 2569)",
    read: "รายการออกเกือบทุกวันทำการ เดือนละราว 20 EP", why: "ไม่ใช้ YouTube Data API เพราะต้องมี key และมีโควตา" },
  { ch: 0, box: "เก็บข้อมูล", yt: true, sample: () => <CommentSample />, title: "ดึงคอมเม้นและ reply", kind: "rule", biz: {"q": [], "in": "เสียงคนดูที่เปิดเผยต่อสาธารณะ", "proc": "เก็บพฤติกรรมคนดูจริงแทนการทำแบบสอบถาม โดยไม่มีค่าใช้จ่าย", "out": "หลักฐานพฤติกรรมคนดู 852,802 ครั้ง"}, inCap: "227 EP", outCap: "คอมเม้นต่อ EP เรียงตามวันออกอากาศ",
    In: () => <Grid n={227} cols={19} color={() => "var(--m-dim)"} label="227 EP" />, Out: () => <Cols v={epComments} color={() => "var(--m-c0)"} label="คอมเม้นต่อ EP ตามลำดับวันที่" />,
    inp: "227 EP", model: "เก็บข้อมูลจากหน้าเว็บสาธารณะ", params: "ไม่ใช้ API ที่เสียเงิน · พัก 2–5 วินาทีต่อคลิป · ลองซ้ำได้ 4 ครั้ง · คลิปจำกัดอายุ 10 EP ใช้ cookie แล้วลบทิ้ง", tech: ["ยังไม่ใช้เทคนิควิเคราะห์"], paths: [["เก็บข้อมูล", "ยังไม่ใช้เทคนิควิเคราะห์", "Web scraping จากหน้าเว็บสาธารณะ"]], out: "852,802 แถว (reply 18.4%)",
    read: `แต่ละตอนได้คอมเม้นต่างกันมาก ตั้งแต่ ${fmt(Math.min(...epComments))} ถึง ${fmt(Math.max(...epComments))}`, why: "อ่านจากหน้าเว็บสาธารณะ ช้ากว่า API แต่ไม่มีค่าใช้จ่าย" },
  { ch: 1, box: "Distance", title: "ระบุตัวคน (Entity resolution)", kind: "rule", biz: {"q": [], "in": "คอมเม้นที่ยังไม่รู้ว่าใครเป็นใคร", "proc": "นับเป็นคน ไม่ใช่นับเป็นข้อความ และตัดบัญชีปั่น", "out": "ฐานคนดู 281,073 คน ที่ใช้ตอบได้ทั้งเรื่องวัย (ก) และคนเก่า/คนใหม่ (ข)"}, inCap: "คอมเม้น 852,802 แถว (1 ช่อง ≈ 2,840 แถว)", outCap: "คน 281,073 คน (1 วง ≈ 2,840 คน)",
    In: () => <Grid n={300} cols={20} color={() => "var(--m-dim)"} label="คอมเม้น 852,802 แถว" />, Out: () => <Grid n={99} cols={11} shape="dot" size={26} color={() => "var(--m-c0)"} label="คน 281,073 คน" />,
    inp: "852,802 แถว มี handle และ channel id", model: "Distance Measures: ข้อความเหมือนกัน = ระยะ 0", params: "รวมแถวเป็นคนด้วย channel id · คนที่ ≥80% ของคอมเม้นเป็นข้อความเดียวกัน (ระยะ 0, ยาว ≥10 ตัวอักษร) แปะซ้ำ ≥3 EP ถือเป็นคนก๊อป ตัดทิ้ง", tech: ["#32 Distance Measures"], paths: [["Similarity, Recommendation & Clustering", "#32 Distance Measures", "Exact match (ข้อความเหมือนกัน = ระยะ 0) + รวมตาม channel id"]], out: "281,073 คน (ตัด 10 บัญชี)",
    read: "คอมเม้น 3 แถว ยุบเหลือคน 1 คนโดยเฉลี่ย", why: "handle เปลี่ยนได้ ถ้านับคนผิด เส้นในเครือข่ายผิดตามหมด" },
  { ch: 1, box: "Percentiles", title: "รูปร่างข้อมูลรายคน", kind: "stat", biz: {"q": ["ข"], "in": "จำนวนครั้งที่คนแต่ละคนกลับมา", "proc": "ดูว่าคนดูเป็นขาประจำหรือคนผ่านมา", "out": "คนใหม่เป็นฐานใหญ่ (64% มาครั้งเดียว) แต่คนที่กลับมาบ่อย 2.6% สร้างเสียง 26%"}, inCap: "% ของคน แยกตามจำนวน EP ที่มาคอมเม้น", outCap: "% ของคอมเม้นที่แต่ละกลุ่มเขียน",
    In: () => <Cols v={NEPS.map((b) => b.pct)} labels={NEPS.map((b) => b.b)} color={() => "var(--m-ink)"} top={(i) => (NEPS[i].pct >= 1 ? NEPS[i].pct.toFixed(0) + "%" : null)} label="% ของคน ตามจำนวน EP" />,
    Out: () => <Cols v={NEPS.map((b) => b.cpct)} labels={NEPS.map((b) => b.b)} color={(i) => (i >= 4 ? "var(--m-hot)" : "var(--m-c0)")} top={(i) => NEPS[i].cpct.toFixed(0) + "%"} label="% ของคอมเม้น ตามจำนวน EP" />,
    inp: "จำนวน EP และคอมเม้นต่อคน", model: "Central Tendency + Percentiles + Distributions", params: "ค่ากลาง (median) แทนค่าเฉลี่ยเพราะเบ้ · เปอร์เซ็นไทล์ของจำนวน EP ต่อคน · ดูรูปการกระจายว่าเบ้ขวา", tech: ["#01 Central Tendency", "#02 Percentiles & Quartiles"], paths: [["Exploratory Data Analysis", "#01 Central Tendency", "Median"], ["Exploratory Data Analysis", "#02 Percentiles & Quartiles", "Percentile + แบ่งช่วง (binning)"]], out: "64% มา EP เดียว · ค่ากลาง 1 คอมเม้นต่อคน",
    read: "คนที่มาครั้งเดียวมี 64% แต่เขียนแค่ 26% ของคอมเม้น ส่วนคน 2.6% ที่มาเกิน 10 EP (สีส้ม) เขียนถึง 26%", why: "หางยาวแบบนี้ ขั้นต่อไปต้องใช้ log และค่ากลาง" },
  { ch: 2, box: "Neural Network", title: "จัดหมวด EP", kind: "llm", biz: {"q": ["ก"], "in": "ชื่อตอนทั้ง 227 ตอน", "proc": "จัดคอนเทนต์เป็นหมวดที่แบรนด์เลือกซื้อได้", "out": "10 หมวดคอนเทนต์ที่ใช้เป็นแพ็กเกจขาย ตรงกับที่คนจัด 87%"}, inCap: "ชื่อคลิป 227 เรื่อง (ตัวอย่าง)", outCap: "จำนวน EP ต่อหมวด",
    In: () => <TitleList />, Out: () => <HBars rows={D.categories.map((c, i) => ({ t: SHORT[c.name], v: c.eps, c: KCOL(i) })).sort((a, b) => b.v - a.v)} fmtV={(x) => x + " EP"} label="จำนวน EP ต่อหมวด" />,
    Mini: () => <div className="m-val"><span>ตรวจกับคน 39 EP</span><div className="m-agree">{Array.from({ length: 39 }, (_, i) => <i key={i} className={i < 34 ? "ok" : "no"} />)}</div>
      <dl><div><dt>Accuracy</dt><dd>0.87</dd></div><div><dt>Precision</dt><dd>0.88</dd></div><div><dt>Recall</dt><dd>0.89</dd></div><div><dt>Kappa</dt><dd>0.85</dd></div></dl></div>,
    inp: "ชื่อคลิป 227 เรื่อง + นิยาม 10 หมวดที่คนเขียน", model: "Neural Network (#12) จำแนกชื่อคลิป → 1 ใน 10 หมวด", params: "จัดทุก EP ตามนิยามหมวดที่คนเขียน · ประเมินด้วย Confusion Matrix เทียบกับ 39 EP ที่คนจัด: accuracy, precision, recall, F1 และ kappa", tech: ["#12 Neural Network", "#28 Confusion Matrix & Metrics"], paths: [["Classification", "#12 Neural Network", "Transformer LLM แบบ zero-shot (single-label)"], ["Classification Model Evaluation", "#28 Confusion Matrix & Metrics", "Accuracy · macro precision/recall · Cohen's kappa"]], real: "Neural Network ที่ใช้คือโมเดลภาษาขนาดใหญ่ (LLM) ที่ฝึกมาแล้ว ไม่ได้เทรนเองกับข้อมูลชุดนี้ ส่วนการประเมินใช้ Confusion Matrix ตาม #28", out: "10 หมวด · kappa 0.85",
    read: "kappa = (ตรงจริง 0.872 − ตรงโดยบังเอิญ 0.161) ÷ (1 − 0.161) = 0.85 · หมวดที่พลาดบ่อยคือประเด็นสังคม (precision 0.50) ซึ่งก้ำกึ่งกับหมวดอื่น", why: "ต้องมีหลักฐานว่า AI จัดได้ใกล้คนก่อนเอาไปใช้ทั้ง 227 EP" },
  { ch: 2, box: "Neural Network", title: "ติดแท็กประเด็นย่อย", kind: "llm", biz: {"q": ["ก"], "in": "เนื้อหาของแต่ละตอน", "proc": "แยกประเด็นที่แบรนด์อยากอยู่ด้วย และประเด็นที่ควรเลี่ยง", "out": "ขายเจาะประเด็นได้ และใช้คัดตอนตาม Brand safety"}, inCap: "ชื่อคลิป + คอมเม้นไลก์สูงสุดเมื่อชื่อกำกวม", outCap: "12 แท็กที่พบบ่อยที่สุด (จาก 22)",
    In: () => <TitleList />, Out: () => <HBars rows={[...D.tags].sort((a, b) => b.eps - a.eps).slice(0, 12).map((t, i) => ({ t: t.tag.split("/")[0], v: t.eps, c: i < 3 ? "var(--m-llm)" : "color-mix(in srgb, var(--m-llm) 45%, var(--surface))" }))} fmtV={(x) => x + " EP"} label="จำนวน EP ต่อแท็ก" />,
    inp: "ชื่อคลิป + คอมเม้นไลก์สูงสุด 5 อันดับ", model: "Neural Network (#12) จำแนกแบบหลายป้ายต่อ EP", params: "ชื่อคลิป (และคอมเม้นไลก์สูงสุด 5 อันดับเมื่อชื่อกำกวม) → แท็กได้หลายแท็ก จาก 22 แท็ก · แยกซีรีส์ออกจากเนื้อหา", tech: ["#12 Neural Network"], paths: [["Classification", "#12 Neural Network", "Transformer LLM แบบ zero-shot (multi-label)"]], real: "Neural Network ที่ใช้คือโมเดลภาษาขนาดใหญ่ (LLM) ที่ฝึกมาแล้ว ขั้นนี้ยังไม่ได้วัดความแม่นแยก", out: "22 แท็ก",
    read: "เงิน/โกง/หนี้ เป็นประเด็นที่อยู่ในตอนมากที่สุด 77 EP", why: "หมวดเดียวหยาบเกินไป ตอบไม่ได้ว่าดราม่าเรื่องเงินต่างจากดราม่าชู้สาวอย่างไร" },
  { ch: 2, box: "Neural Network", title: "Label คนจากชุดตัวอย่าง", kind: "llm", biz: {"q": ["ก"], "in": "ข้อความของคนดูตัวอย่าง 1,050 คน", "proc": "สร้างข้อมูลอายุเอง เพราะไม่มีข้อมูลจาก YouTube Studio", "out": "ชุดเฉลยที่วัดความแม่นได้ (69%) ก่อนขยายไปทุกคน"}, inCap: "1,050 คนที่สุ่มมาให้อ่าน (1 ช่อง = 10 คน)", outCap: "425 คนได้ป้าย · สีเทาคือสัญญาณไม่พอ",
    In: () => <Grid n={105} cols={15} color={() => "var(--m-dim)"} label="1,050 คนที่สุ่มมาอ่าน" />, Out: () => <Grid n={105} cols={15} color={labCol} label="ป้าย Gen ที่อ่านได้" />,
    Mini: () => <div className="m-acc"><div><b>69%</b><span>แม่น 3 กลุ่ม</span></div><div className="dim"><b>42%</b><span>แม่น 4 Gen</span></div></div>,
    inp: "ข้อความของ 1,050 คน สุ่มแบบแบ่งชั้น", model: "Neural Network (#12) อ่านข้อความแล้วจำแนก Gen · ประเมินด้วย Confusion Matrix", params: "อ่านข้อความ 1,050 คนที่สุ่มแบบแบ่งชั้น หาสัญญาณอายุ · ทดสอบแบบไม่เห็นคำตอบกับชุดเฉลย 294 คน · precision/recall รายกลุ่มพร้อมช่วงความเชื่อมั่น 95% (Wilson)", tech: ["#12 Neural Network", "#28 Confusion Matrix & Metrics"], paths: [["Classification", "#12 Neural Network", "Transformer LLM แบบ zero-shot (ติดป้าย)"], ["Classification Model Evaluation", "#28 Confusion Matrix & Metrics", "Precision/recall + Wilson 95% CI"]], real: "Neural Network ที่ใช้คือโมเดลภาษาขนาดใหญ่ (LLM) ที่ฝึกมาแล้ว ส่วนการวัดความแม่นใช้ #28 และ #08", out: "Z 51 · Y 173 · X+ 201 คน",
    read: "AI ระบุได้แค่ 40% ของคน จึงใช้เป็นชุดเรียนให้โมเดล แทนการเดาทุกคน", why: "ไม่มีข้อมูลอายุจริงจาก YouTube Studio" },
  { ch: 3, box: "Logistic Reg.", title: "ประเมิน Gen ทุกคน", kind: "ml", biz: {"q": ["ก"], "in": "ข้อความของคนดูทั้งรายการ", "proc": "ประเมินวัยของคนดูทุกคน", "out": "โปรไฟล์คนดูสำหรับ Proposal: Gen Z 17% · Y 47% · X+ 36%"}, inCap: "ป้าย Gen 425 คนจากขั้นก่อน (ชุดเรียน)", outCap: "Gen ของคนคอมเม้นทั้งหมด พร้อมช่วง 95%",
    In: () => <HBars rows={[{ t: "Gen Z", v: labN.Z, c: "var(--gz)" }, { t: "Gen Y", v: labN.Y, c: "var(--gy)" }, { t: "Gen X+", v: labN.X, c: "var(--gx)" }]} fmtV={(x) => x + " คน"} lw={70} label="Label คนจากชุดตัวอย่าง" />,
    Out: () => <GenCI />,
    inp: "ข้อความ + handle + ตัวเลข 7 ตัว · ป้ายจากขั้นก่อน", model: "TF-IDF + Logistic Regression", params: "แปลงข้อความเป็นตัวเลขด้วย TF-IDF (n-gram ตัวอักษร) · Logistic Regression หลายคลาส เลือกค่า C ด้วย 5-fold CV · ปรับเทียบแล้วหาช่วงความเชื่อมั่น 95% ด้วยการสุ่มซ้ำ (bootstrap) 1,000 รอบ", tech: ["#31 TF-IDF", "#25 Logistic Regression", "#08 Confidence Intervals"], paths: [["Text Analytics", "#31 TF-IDF", "Character n-gram 2–4"], ["Classification", "#25 Logistic Regression", "Multinomial · L2 · solver lbfgs"], ["Group Comparison", "#08 Confidence Intervals", "Bootstrap percentile 1,000 รอบ"]], out: "Z 17% · Y 47% · X+ 36%",
    read: "ชุดเรียนมี Gen Z น้อย (51 คน) แต่หลังปรับเทียบ Gen Z ออกมา 17% · ช่วงความเชื่อมั่นกว้าง จึงใช้ดูทิศทาง", why: "AI อ่านทั้ง 281,073 คนไม่ไหว จึงให้โมเดลขยายผล แล้วแก้อคติด้วยสถิติ" },
  { ch: 3, box: "K-Means", title: "สายคนดู", kind: "ml", biz: {"q": ["ก"], "in": "ประวัติการดูของขาประจำ 55,838 คน", "proc": "แบ่งกลุ่มคนตามเรื่องที่ชอบ (segmentation)", "out": "4 กลุ่มเป้าหมายไว้จับคู่กับสินค้า"}, inCap: "สัดส่วนหมวดที่ออกอากาศ (ฐานที่ใช้หักผลเวลา)", outCap: "lift ของแต่ละสายต่อหมวด: ส้ม = มากกว่าปกติ ฟ้า = น้อยกว่า",
    In: () => <HBars rows={CATS.map((c, i) => ({ t: SHORT[c], v: aired[c] ?? 0, c: KCOL(i) })).sort((a, b) => b.v - a.v)} fmtV={(x) => x.toFixed(1) + "%"} label="สัดส่วนหมวดที่ออกอากาศ" />,
    Out: () => <Heat />,
    inp: "ขาประจำ 55,838 คน (คอมเม้นตั้งแต่ 3 EP)", model: "K-Means Clustering (K = 4) + Chi² Independence", params: "ความสนใจ = log(สัดส่วนที่คอมเม้น ÷ สัดส่วนที่ออกอากาศช่วงที่แอคทีฟ) 10 หมวด · K-Means K = 4 · ตรวจว่าสายไม่ผูกกับเดือนด้วย Chi² (Cramér's V 0.14)", tech: ["#09 K-Means Clustering", "#18 Chi² Independence"], paths: [["Similarity, Recommendation & Clustering", "#09 K-Means Clustering", "Lloyd's algorithm + k-means++ (n_init 20)"], ["Correlation & Association", "#18 Chi² Independence", "Cramér's V"]], out: "4 สาย",
    read: "สายดราม่าคนดังแทบไม่แตะเรื่องครอบครัว ส่วนสายครอบครัวแทบไม่แตะคดีโกง", why: "หักผลของสิ่งที่ออกอากาศ คนที่แอคทีฟช่วงน้ำท่วมจึงไม่ถูกนับเป็นสายภัยพิบัติ" },
  { ch: 4, biz: {"q":["ก","ข"],"in":"ตารางยอดคอมเม้นราย EP แบบที่ทีมขายเคยดู","proc":"เปลี่ยนจากนับยอดทีละแถว เป็นดูว่าใครเชื่อมกับตอนไหน","out":"ตอบได้ว่าคนซ้อนกันเท่าไหร่ ซื้อข้ามหมวดได้คนใหม่จริงไหม และคนกลุ่มไหนดูอะไรด้วยกัน"}, sample: () => <Compare />, box: "Graph", title: "ทำไมต้องใช้ Network", kind: "net", inCap: "ไม่ใช้ Network: ตารางนับคนทีละแถว", outCap: "ใช้ Network: เห็นว่าคนไหนเชื่อมกับหลายหมวด",
    In: () => <TableView />, Out: () => <NetView />,
    inp: "ตาราง EP × จำนวนคอมเม้น / จำนวนคน", model: "มองข้อมูลเป็นกราฟ: Actors → Ties → Structure", params: "Actors = คน 281,073 และ EP 227 · Ties = คนคอมเม้นใน EP (กราฟสองฝั่ง) · Structure = คนที่ซ้อนกันระหว่างหมวด ก้อน และสายคนดู", tech: ["Network lens"], paths: [["มุมมอง", "Network lens (Actors → Ties → Structure)", "ตาราง EP → กราฟสองฝั่ง คน ↔ EP"]], out: `คนไม่ซ้ำจริง ${fmt(uniqFC)} ไม่ใช่ ${fmt(famC.people + crimeC.people)}`,
    read: `นับคนทีละตอนแล้วบวกกันได้ ${fmt(sumEpPeople)} คน-ตอน แต่คนจริงมี 281,073 คน · ครอบครัวกับอาชญากรรมมีคนดูทั้งคู่ ${fmt(overlapFC)} คน ซึ่งตารางมองไม่เห็น`, why: "คำถามของทีมขายเป็นเรื่องความสัมพันธ์ระหว่างคนกับตอน ซึ่งตารางที่นับทีละแถวตอบไม่ได้" },
  { ch: 4, box: "Hierarchical", title: "เครือข่ายประเด็นย่อย รอบแรก", kind: "net", biz: {"q": [], "in": "ประเด็นที่คนดูร่วมกัน", "proc": "ลองจัดประเด็นที่คนดูด้วยกันเป็นแพ็กเกจ", "out": "ไม่ผ่าน กันไม่ให้ขายแพ็กเกจที่เกิดจากความบังเอิญของช่วงเวลา"}, fail: true, illus: "ภาพ Input เป็นภาพประกอบ: จุดคือ 22 แท็กจริง แต่เส้นไม่ใช่ค่าจริง เพราะไม่ได้เก็บกราฟรอบนี้ไว้", inCap: "กราฟแท็ก ↔ แท็ก น้ำหนัก = lift คนคอมเม้นร่วม", outCap: "ค่าที่วัดได้ เทียบเกณฑ์ (เส้นประ)",
    In: () => <Hair />, Out: () => <Gauge rows={[{ t: "Modularity", v: 0.09, ref: 0.3, refT: "ราว 0.3 ขึ้นไป = มีก้อนชัด", max: 0.5 }, { t: "Cramér's V กับเดือน (ยิ่งสูงยิ่งผูกกับเวลา)", v: 0.29, ref: 0.14, refT: "รอบสองได้ 0.14", max: 0.5 }]} />,
    inp: "กราฟประเด็นย่อย ↔ ประเด็นย่อย", model: "รวมกลุ่มแท็กทีละขั้น (ใกล้เคียง Hierarchical Clustering)", params: "รวมแท็กที่มีคนคอมเม้นร่วมกันมากเข้าด้วยกันทีละขั้น · วัดคุณภาพด้วย modularity · ตรวจกับเดือนที่ออกอากาศด้วย Chi² (Cramér's V)", tech: ["#33 Hierarchical Clustering", "#18 Chi² Independence"], paths: [["Similarity, Recommendation & Clustering", "#33 Hierarchical Clustering", "Louvain (รวมกลุ่มทีละชั้นด้วย modularity)"], ["Correlation & Association", "#18 Chi² Independence", "Cramér's V"]], real: "วิธีที่ใช้จริงคือ Louvain ซึ่งรวมกลุ่มทีละชั้นแบบเดียวกับ Hierarchical Clustering แต่ใช้ modularity เป็นเกณฑ์รวม", out: "modularity 0.09 → ไม่ใช้",
    read: "แทบไม่มีก้อน และก้อนที่ได้ผูกกับช่วงเวลา ไม่ใช่ความสนใจจริง", why: "จึงเปลี่ยนไปวัดความสนใจรายคนแบบหักผลเวลาในขั้นสายคนดู" },
  { ch: 4, box: "Jaccard", title: "เครือข่ายหมวด ↔ หมวด", kind: "net", biz: {"q": ["ข"], "in": "คนที่ดูมากกว่าหนึ่งหมวด", "proc": "วัดว่าหมวดไหนแย่งคนดูกัน", "out": "ซื้อข้ามก้อนเพื่อได้คนใหม่ (Acquisition) หรือซื้อในก้อนเดียวกันเพื่อย้ำคนเดิม (Retention)"}, illus: "ภาพ Input: ความยาวแท่งหมวดเป็นจำนวนคนจริง ส่วนเส้นจากคนเป็นตัวอย่าง", inCap: "กราฟสองฝั่ง คน ↔ หมวด", outCap: "ฉายเป็นหมวด ↔ หมวด น้ำหนัก Jaccard · สี = ก้อน",
    In: () => <Bipartite />, Out: () => <CatNet />,
    inp: "กราฟสองฝั่ง คน 281,073 ↔ EP 227", model: "Jaccard similarity → รวมกลุ่มทีละขั้น", params: "ความคล้ายของสองหมวด = คนดูร่วม ÷ คนดูรวม (Jaccard) · รวมหมวดที่คล้ายกันเป็นก้อน", tech: ["#32 Distance Measures", "#33 Hierarchical Clustering"], paths: [["Similarity, Recommendation & Clustering", "#32 Distance Measures", "Jaccard similarity"], ["Similarity, Recommendation & Clustering", "#33 Hierarchical Clustering", "Louvain (networkx, seed 42)"]], real: "ขั้นรวมกลุ่มใช้ Louvain ซึ่งใกล้เคียง Hierarchical Clustering", out: "2 ก้อน",
    read: "ก้อนเรื่องร้อน 7 หมวด กับก้อนสุขภาพ ความเชื่อ ภัยพิบัติ · เส้นดำคือครอบครัว × อาชญากรรม 0.17", why: "เห็นว่าหมวดไหนแย่งคนกันหรือไม่ ซึ่งเป็นคำถามของการทำแพ็กเกจ" },
  { ch: 4, box: "Lift", title: "เครือข่ายหมวด ↔ Generation", kind: "net", biz: {"q": ["ก"], "in": "วัยของคนดูแต่ละหมวด", "proc": "จับคู่หมวดกับวัยที่แบรนด์ต้องการ", "out": "Gen Z → ดราม่าคนดัง · Gen X+ → สุขภาพ ศาสนา ความเชื่อ"}, inCap: "สัดส่วน Gen ของคนคอมเม้นในแต่ละหมวด (%)", outCap: "กราฟสองฝั่ง: เส้นหนา = คนมาก · เส้นสี = Gen นั้นมากกว่าปกติ · เส้นประ = น้อยกว่าปกติ",
    In: () => <GenStack />, Out: () => <GenNet />,
    inp: "Gen ที่ประเมินได้ของคนคอมเม้นในแต่ละหมวด (จากขั้นประเมิน Gen)", model: "Lift ของตาราง หมวด × Gen", params: "ต่อหมวดหาสัดส่วน Gen แล้วหารด้วยสัดส่วน Gen ของคนดูหมวดทั่วไป (observed ÷ expected แบบเดียวกับตาราง Chi²) · วาดเป็นกราฟสองฝั่ง น้ำหนักเส้น = จำนวนคนโดยประมาณ", tech: ["#18 Chi² Independence"], paths: [["Correlation & Association", "#18 Chi² Independence", "Lift = observed ÷ expected ในตาราง หมวด × Gen"]], out: "lift 30 คู่ อยู่ระหว่าง 0.90–1.07",
    read: "ส่วนผสมวัยทุกหมวดใกล้กันมาก · Gen Z เด่นสุดในดราม่าคนดัง (×1.07) · Gen X+ เด่นในสุขภาพ ศาสนา ความเชื่อ (×1.05–1.07)", why: "แบรนด์ถามว่าอยากเจาะวัยไหนควรลงหมวดไหน · ค่าห่างจาก 1 น้อย จึงใช้ดูทิศทาง ไม่ใช่ตัวเลขชี้ขาด" },
  { ch: 4, biz: {"q":["ก","ข"],"in":"คนดูทุกคน พร้อมหมวดที่ดู วัย และระดับความภักดี","proc":"เชื่อมหมวดกับวัยและความภักดีไว้ในกราฟเดียว","out":"หมวดไหนดึงคนใหม่ หมวดไหนเป็นของแฟนประจำ และเป็นคนวัยไหน"}, big: true, box: "3-way Graph", title: "เครือข่าย Generation ↔ หมวด ↔ ความภักดี", kind: "net", inCap: "คน 1 คน เชื่อมกับ 3 อย่าง", outCap: "เครือข่าย 3 ฝั่ง: เส้นหนา = คนมาก · เส้นเข้ม = มากกว่าค่าเฉลี่ยตั้งแต่ 15%",
    In: () => <PersonMini />, Out: () => <TriNet />,
    inp: "คนคอมเม้น 281,073 คน: หมวดที่เคยคอมเม้น · Gen ที่ประเมิน · กลุ่มความภักดี", model: "กราฟ 3 ฝั่ง (tripartite) น้ำหนักเส้น = จำนวนคน", params: "หมวด ↔ ความภักดี = นับคนไม่ซ้ำจริงต่อคู่ (`23_category_loyalty.py`) · หมวด ↔ Gen = คนในหมวด × สัดส่วน Gen ที่ประเมิน · ความเข้มของเส้น = lift เทียบสัดส่วนเฉลี่ย", tech: ["#18 Chi² Independence", "#09 K-Means Clustering"], paths: [["Correlation & Association", "#18 Chi² Independence", "Lift ของตาราง หมวด × ความภักดี และ หมวด × Gen"], ["Similarity, Recommendation & Clustering", "#09 K-Means Clustering", "กลุ่มความภักดี K = 3 จากพฤติกรรมการกลับมา"]], out: "หมวดดึงคนใหม่ vs หมวดของแฟนประจำ",
    read: `ดึงคนใหม่: ${byDrift.slice(0, 3).map((c) => `${SHORT[c]} ขาจร ${pc(loyShare(c, "ขาจร"))}`).join(" · ")} · แฟนประจำ: ${byFan.slice(0, 3).map((c) => `${SHORT[c]} แฟนตัวยง ${pc(loyShare(c, "แฟนตัวยง"))}`).join(" · ")} (เฉลี่ย ${pc(loyBase["แฟนตัวยง"])})`, why: "ต่อยอดจากหน้าแรก: เมื่อรู้ว่าคนเชื่อมกับหลายหมวด ก็ดูต่อได้ว่าคนในแต่ละหมวดเป็นคนเก่าหรือคนใหม่ และวัยไหน" },
];

function Paths({ t }: { t: Topic }) {
  return <div className="m-paths">{t.fail && <span className="m-kind fail">ไม่ผ่าน</span>}
    {t.paths.map((p, k) => <div key={k} className="m-path"><span className="l1">{p[0]}</span><i>›</i><span className="l2">{p[1]}</span><i>›</i><span className="l3">{p[2]}</span></div>)}</div>;
}

/** -1 = overview (#models), 0..15 = #models/1..16 */
/** the "why network" page opens the deck; the overview comes next; then the numbered steps */
const WHY = TOPICS_ALL.find((t) => t.title === "ทำไมต้องใช้ Network")!;
const TOPICS = TOPICS_ALL.filter((t) => t !== WHY);
/** -5 = cover (#models), -4 = guests, -3 = business objective, -2 = why network, -1 = overview, 0.. = #models/1.. */
const readIdx = () => { const h = location.hash; if (h === "#models/guests") return -4; if (h === "#models/objective") return -3; if (h === "#models/why") return -2; if (h === "#models/overview") return -1; if (h === "#models/end") return TOPICS.length; if (h === "#models/final") return TOPICS.length + 1; if (h === "#models/graph") return TOPICS.length + 2; if (h === "#models/thanks") return TOPICS.length + 3; const m = /^#models\/(\d+)/.exec(h); if (!m) return -5; return Math.max(0, Math.min(TOPICS.length - 1, +m[1] - 1)); };
const hashOf = (k: number) => (k > TOPICS.length + 2 ? "#models/thanks" : k > TOPICS.length + 1 ? "#models/graph" : k === TOPICS.length + 1 ? "#models/final" : k === TOPICS.length ? "#models/end" : k <= -5 ? "#models" : k === -4 ? "#models/guests" : k === -3 ? "#models/objective" : k === -2 ? "#models/why" : k === -1 ? "#models/overview" : `#models/${k + 1}`);
const titleOf = (k: number) => (k > TOPICS.length + 2 ? "Thank you" : k > TOPICS.length + 1 ? "กราฟเครือข่าย 3 ฝั่ง" : k === TOPICS.length + 1 ? "ปิดท้าย 2" : k === TOPICS.length ? "ปิดท้าย" : k <= -5 ? "หน้าปก" : k === -4 ? "แขกรับเชิญ" : k === -3 ? "Business Objective" : k === -2 ? WHY.title : k === -1 ? "ภาพรวม Process" : TOPICS[k].title);

/** live view counter for the title slides: counts up to ~200,000, then ticks up slowly like a live stream */
function ViewCount({ className }: { className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = 200000, t0 = performance.now(), dur = 2200;
    let raf = 0, tick = 0;
    const step = (now: number) => { const k = Math.min(1, (now - t0) / dur); setN(Math.round(target * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); else tick = window.setInterval(() => setN((x) => x + Math.floor(Math.random() * 37) + 3), 900); };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setN(target); else raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); clearInterval(tick); };
  }, []);
  return <span className={"m-views" + (className ? " " + className : "")} aria-label={`${fmt(n)} views`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3.2" fill="currentColor" /></svg><b>{fmt(n)}</b> views</span>;
}

/** business objective slide: the two business questions (ก Gen × content, ข retention vs acquisition) */
function Objective({ onNext }: { onNext: () => void }) {
  return <div className="m-cover light" onClick={onNext} role="button" tabIndex={0} aria-label="Business Objective กดเพื่อไปหน้าถัดไป" onKeyDown={(e) => { if (e.key === "Enter") onNext(); }}>
    <div className="m-cv bo">
      <img className="bo-logo" src="/hone-logo.png" alt="โหนกระแส" />
      <div className="bo-head">
        <span className="bo-eyebrow">Problem Framing</span>
        <h1>ขายโฆษณาให้แบรนด์: ซื้อคอนเทนต์ไหน ให้แบรนด์เข้าถึงคนที่ใช่?</h1>
        <p>มุมมองเครือข่ายเปลี่ยนคำถาม: ไม่ใช่แค่ “ใครดูเยอะ” แต่ต้องรู้ว่า “ใครดู และใครเพิ่งเข้ามา”</p>
      </div>
      <section className="bo-panel a"><span className="bo-pill">คำถาม ก</span><h2>Gen ไหน อินกับคอนเทนต์อะไร?</h2><p>จับคู่คอนเทนต์กับแต่ละ Gen เพื่อขายโฆษณาให้ตรงกลุ่ม</p><img className="bo-art gens" src="/bo-gens.png" alt="" aria-hidden="true" /></section>
      <section className="bo-panel b"><span className="bo-pill">คำถาม ข</span><h2>Retention vs Acquisition</h2><p>หัวข้อไหนรักษาคนเก่า หัวข้อไหนดึงคนใหม่?</p><img className="bo-art ret" src="/bo-retention.png" alt="" aria-hidden="true" /></section>
      <img className="bo-person" src="/bo-presenter.png" alt="" aria-hidden="true" />
      <div className="bo-bar"><b>02</b><span>BUSINESS OBJECTIVE</span></div>
    </div>
  </div>;
}

/** guests slide: the team's key visual with a slow zoom, light sweep and sparkles on "LIVE" */
function Guests({ onNext, end, img = "/guests.jpg", alt = "ประเด็นร้อน LIVE · ทีม ReachRadar", ratio = "1920 / 1081" }: { onNext: () => void; end?: boolean; img?: string; alt?: string; ratio?: string }) {
  const sparks = [[63, 60], [78, 62], [86, 70], [70, 74], [91, 64], [57, 72], [82, 58]];
  return <div className="m-cover" onClick={onNext} role="button" tabIndex={0} aria-label="แขกรับเชิญ กดเพื่อไปหน้าถัดไป" onKeyDown={(e) => { if (e.key === "Enter") onNext(); }}>
    <div className="gv-img" style={{ aspectRatio: ratio, width: `min(100vw, calc(100dvh * ${ratio.replace(" / ", " / ")}))` }}><img src={img} alt={alt} />
      <i className="gv-sweep" aria-hidden="true" />
      <i className="gv-glow" aria-hidden="true" />
      {sparks.map(([x, y], k) => <i key={k} className="m-spark gv-spark" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${0.6 + k * 0.45}s` }} />)}
    </div>
    <div className="gv-badges"><ViewCount /><span className="gv-live" aria-hidden="true"><i />{end ? "ขอบคุณที่รับชม" : "ON AIR"}</span></div>
  </div>;
}

/** closing slide: "Thank you" title card in the cover's style */
function ThankYou({ onNext }: { onNext: () => void }) {
  const sparks = [[70, 20], [88, 14], [93, 40], [76, 46], [64, 30], [30, 30], [48, 22]];
  return <div className="m-cover" onClick={onNext} role="button" tabIndex={0} aria-label="ขอบคุณ กดเพื่อกลับหน้าปก" onKeyDown={(e) => { if (e.key === "Enter") onNext(); }}>
    <div className="m-cv">
      <i className="cv-light" aria-hidden="true" />
      <img className="cv-logo" src="/hone-logo.png" alt="โหนกระแส" />
      {sparks.map(([x, y], k) => <i key={k} className="m-spark" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${1.2 + k * 0.4}s` }} />)}
      <img className="cv-person" src="/cover-presenter.png" alt="" aria-hidden="true" />
      <div className="cv-text">
        <span className="cv-eyebrow">ReachRadar · โหนกระแส · MADT 7202</span>
        <h1 className="cv-word ty"><span>Thank you</span><span>ขอบคุณครับ</span></h1>
        <p className="cv-sub">ถาม–ตอบ · Q&amp;A</p>
      </div>
      <div className="cv-ticker"><b><i />LIVE</b><span>จบรายการ | ตี๋อย่าทิ้งพี่ #ep3 · แล้วพบกันใหม่</span></div>
      <ViewCount className="cv" />
    </div>
  </div>;
}

/** cover slide: title card in the style of the team's design (gradient, silver wordmark, show logo, presenter, LIVE ticker) */
function Cover({ onNext }: { onNext: () => void }) {
  const sparks = [[70, 20], [88, 14], [93, 40], [76, 46], [64, 30]];
  return <div className="m-cover" onClick={onNext} role="button" tabIndex={0} aria-label="เริ่มนำเสนอ กดเพื่อไปหน้าถัดไป" onKeyDown={(e) => { if (e.key === "Enter") onNext(); }}>
    <div className="m-cv">
      <i className="cv-light" aria-hidden="true" />
      <img className="cv-logo" src="/hone-logo.png" alt="โหนกระแส" />
      {sparks.map(([x, y], k) => <i key={k} className="m-spark" aria-hidden="true" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${1.6 + k * 0.5}s` }} />)}
      <img className="cv-person" src="/cover-presenter.png" alt="" aria-hidden="true" />
      <div className="cv-text">
        <span className="cv-eyebrow">MADT 7202 · Web &amp; Social Network Analytics</span>
        <h1 className="cv-word"><span>ReachRadar</span><span>โหนกระแส</span></h1>
        <p className="cv-sub">ขายโฆษณาให้ตรงคน: ควรซื้อ content ไหน เพื่อเข้าถึงผู้ชมกลุ่มไหน</p>
      </div>
      <div className="cv-ticker"><b><i />LIVE</b><span>ตี๋อย่าทิ้งพี่ | #ep3 #เรื่องชาวบ้านคืองานของเรา</span></div>
      <ViewCount className="cv" />
    </div>
    <span className="m-cover-hint">แตะหรือกด → เพื่อเริ่ม</span>
  </div>;
}

const STAGE_OUT = ["852,802 คอมเม้น", "281,073 คน", "10 หมวด · 22 แท็ก · ป้าย Gen", "Gen · 4 สาย", "2 ก้อน · Gen lift · ความภักดีตามหมวด", "แผนแคมเปญ"];

type Role = "code" | "ai" | "human" | "sales";
const ROLE: Record<Role, string> = { code: "โค้ด / โมเดล", ai: "AI (LLM)", human: "คน (นักวิเคราะห์)", sales: "ทีมขาย" };
const STAGE_VIS: { chart: () => ReactNode; cap: string; who: [Role, string][] }[] = [
  { chart: () => <Cols v={epComments} color={() => "var(--m-c0)"} label="คอมเม้นต่อ EP" />, cap: "กราฟแท่ง: คอมเม้นต่อ EP ตามวันที่",
    who: [["code", "ดึงรายชื่อคลิปและคอมเม้นจากหน้าเว็บ"], ["human", "กำหนดขอบเขต (ปี 69, YouTube) ลบ cookie หลังใช้"]] },
  { chart: () => <Cols v={NEPS.map((b) => b.pct)} labels={NEPS.map((b) => b.b)} color={(i) => (i >= 4 ? "var(--m-hot)" : "var(--m-ink)")} label="คนตามจำนวน EP" />, cap: "Histogram: คนส่วนใหญ่มาครั้งเดียว",
    who: [["code", "รวมแถวเป็นคน · หาค่ากลาง · IQR"], ["human", "ตีความรูปร่างข้อมูล เลือกใช้ log และค่ากลาง"]] },
  { chart: () => <HBars rows={D.categories.map((c, i) => ({ t: SHORT[c.name], v: c.eps, c: KCOL(i) })).sort((a, b) => b.v - a.v)} fmtV={(x) => String(x)} label="EP ต่อหมวด" />, cap: "แท่งแนวนอน: EP ต่อหมวด",
    who: [["ai", "อ่านชื่อคลิปแล้วติดหมวด แท็ก และป้าย Gen"], ["human", "เขียนนิยามหมวด · ตรวจกับเฉลย (kappa 0.85)"]] },
  { chart: () => <GenCI />, cap: "แท่ง + ช่วงความเชื่อมั่น: Gen ของคนดู",
    who: [["code", "Logistic Regression ประเมิน Gen · K-Means แบ่งสาย"], ["human", "เลือก K และตั้งชื่อสายให้ทีมขายเข้าใจ"]] },
  { chart: () => <CatNet />, cap: "กราฟเครือข่าย: หมวดที่คนดูร่วมกัน",
    who: [["code", "คำนวณ Jaccard · lift · รวมกลุ่ม"], ["human", "ตัดสินทิ้งผลรอบแรกที่ปนกับเวลา"]] },
  { chart: () => <HBars rows={plan.ranked.slice(0, 5).map((r, i) => ({ t: SHORT[r.c.name], v: Math.round(r.score), c: i < 3 ? "var(--m-c3)" : "var(--m-dim)" }))} fmtV={(x) => String(x)} label="คะแนนหมวดจากเครื่องมือวางแผน" />, cap: "คะแนนหมวด: ข้อเสนอขายจากเครื่องมือวางแผน",
    who: [["sales", "ใส่โจทย์แบรนด์ ได้หมวด EP และคนไม่ซ้ำ"], ["human", "ออกแบบหลังบ้าน 5 หน้า และกฎความเป็นส่วนตัว"]] },
];

const EP_PIC = D.eps.find((e) => e.ep === 2328) ?? D.eps[D.eps.length - 1];

function Overview() {
  const stages = CHAPTERS.map((name, ch) => ({ name, ch, items: TOPICS.map((t, k) => ({ t, k })).filter((x) => x.t.ch === ch) })).filter((x) => x.items.length > 0);
  return (
    <>
      <div className="m-title"><div><span className="m-ch">ภาพรวม</span><h1>Process ของ ReachRadar</h1></div></div>
      <p className="m-lede">ทีมขาย Slot โฆษณาของโหนกระแสรู้แค่ยอดวิว โปรเจกต์นี้ใช้คนที่คอมเม้นบน YouTube มาตอบว่าคนดูแต่ละเรื่องเป็นใคร มาบ่อยแค่ไหน และสนใจอะไร เพื่อเลือก EP และตั้งราคา Slot ให้ตรงกับแบรนด์</p>
      <div className="m-ipo">
        <div className="m-ipo-box g fade" style={{ animationDelay: ".1s" }}><span>Input</span><img className="m-yt big" src="/youtube-logo.webp" alt="YouTube" /><b>คอมเม้น YouTube</b><em>รายการโหนกระแส ปี 2026 · 227 EP · 852,802 คอมเม้น</em>
          <div className="m-ipo-pics">
            <figure><div className="m-cmt" aria-label="ตัวอย่างการ์ดคอมเม้น ปิดชื่อและข้อความไว้"><i className="av" /><div><span className="h">@user-••• <small>20 ชั่วโมงที่ผ่านมา</small></span><i className="ln w1" /><i className="ln w2" /><i className="ln w3" /><span className="meta">👍 1.2 พัน · ตอบกลับ 12 รายการ</span></div></div><figcaption>1 คอมเม้น = 1 แถว</figcaption></figure>
            <figure><img src={`/thumbs/${EP_PIC.vid}.jpg`} alt={`ปกคลิป EP.${EP_PIC.ep}`} /><figcaption>1 EP (EP.{EP_PIC.ep})</figcaption></figure>
          </div></div>
        <div className="m-ipo-arrow"><i /><i /><i /></div>
        <div className="m-ipo-box mid g fade" style={{ animationDelay: ".5s" }}><span>Process</span><b>{stages.length} ขั้น · {TOPICS.length} เรื่อง</b><em>{stages.map((x) => x.name.replace("ทำความสะอาดและ EDA", "EDA").replace("ติดป้ายด้วย AI", "ติดป้าย")).join(" → ")}</em>
          <ol className="m-ipo-flow">
            <li><svg viewBox="0 0 160 90" className="hw-svg">{[12, 26, 40, 54, 68].map((y, i) => <g key={y}><rect x={14} y={y} width={92 - (i % 3) * 14} height={8} rx={2} fill="var(--m-dim)" /><rect x={112} y={y} width={34} height={8} rx={2} fill="var(--k)" opacity={0.6} /></g>)}</svg><span>852,802 แถว</span></li>
            <li><svg viewBox="0 0 160 90" className="hw-svg">{Array.from({ length: 40 }, (_, i) => <circle key={i} cx={20 + (i % 10) * 13.5} cy={16 + Math.floor(i / 10) * 19} r={4.5} fill="var(--m-ink)" />)}</svg><span>281,073 คน</span></li>
            <li><MergeMini phase={2} /><span>เครือข่าย</span></li>
            <li><KMeansMini phase={2} /><span>กลุ่ม · สาย</span></li>
          </ol></div>
        <div className="m-ipo-arrow out"><i /><i /><i /></div>
        <div className="m-ipo-box g fade" style={{ animationDelay: ".9s" }}><span>Output</span><b>ข้อมูลประกอบการขาย</b><em>ลง EP ไหน ให้คนกลุ่มไหน ได้คนไม่ซ้ำกี่คน · หน้าหลังบ้าน 5 หน้า</em>
          <figure className="m-ipo-shot"><img src="/backoffice-preview.jpg" alt="หน้าหลังบ้าน ReachRadar หน้าภาพรวม" /><figcaption>หน้าหลังบ้านที่ทีมขายใช้ (ภาพจริง)</figcaption></figure></div>
      </div>
      <div className="m-roles"><b>ใครทำอะไร</b>{(Object.keys(ROLE) as Role[]).map((r) => <span key={r} className={`r-${r}`}><i />{ROLE[r]}</span>)}</div>
      <div className="m-qs">{Object.entries(QUESTIONS).map(([q, txt]) => <div key={q} className="m-q"><span className={`qb ${q === "ก" ? "qA" : "qB"}`}>คำถาม {q}</span><b>{txt}</b>
        <div className="m-qlinks">{TOPICS.map((t2, k) => (t2.biz.q.includes(q) ? <a key={k} href={`#models/${k + 1}`}>{String(k + 1).padStart(2, "0")} {t2.title}</a> : null))}</div></div>)}</div>
      <ol className="m-stages" style={{ "--n": stages.length } as CSSProperties}>
        {stages.map((st2, si) => (
          <li key={st2.ch} className="m-stagecol g fade" style={{ animationDelay: `${1.1 + si * 0.18}s` }}>
            <div className="m-stagehead"><span className="num">ขั้น {si + 1}</span><h2>{st2.name}</h2><b>{STAGE_OUT[st2.ch]}</b></div>
            <figure className="m-thumb" style={{ "--base": `${1.2 + si * 0.2}s` } as CSSProperties}><div className="m-viz">{STAGE_VIS[st2.ch].chart()}</div><figcaption>{STAGE_VIS[st2.ch].cap}</figcaption></figure>
            <ul className="m-who">{STAGE_VIS[st2.ch].who.map(([r, txt]) => <li key={r} className={`r-${r}`}><span>{ROLE[r]}</span>{txt}</li>)}</ul>
            {st2.items.map(({ t, k }) => (
              <a key={k} href={`#models/${k + 1}`} className={`m-step k-${t.kind}${t.fail ? " fail" : ""}`}>
                <span className="num">{String(k + 1).padStart(2, "0")}</span>
                <span className="m-step-t">{t.title}{t.yt && <img className="m-yt sm" src="/youtube-logo.webp" alt="YouTube" />}</span>{t.biz.q.length > 0 && <span className="m-step-q">{t.biz.q.map((q) => <i key={q} className={q === "ก" ? "qA" : "qB"}>{q}</i>)}</span>}
                <span className="m-step-k">{t.fail ? "ไม่ผ่าน · " : ""}{t.paths[0][0]} › {t.paths[0][1].replace(/^#\d+ /, "")}</span><span className="m-step-a">{t.paths[0][2]}</span>
              </a>
            ))}
          </li>
        ))}
      </ol>
      <p className="m-hint">กดที่แต่ละเรื่องเพื่อดู Input → เทคนิค → Output ทีละหน้า หรือใช้ลูกศรขวาบนคีย์บอร์ด</p>
    </>
  );
}

export default function Models() {
  const [i, setI] = useState(readIdx);
  const [run, setRun] = useState(0);
  const [present, setPresent] = useState(() => { try { return sessionStorage.getItem("rr-present") === "1"; } catch { return false; } });
  useEffect(() => { try { sessionStorage.setItem("rr-present", present ? "1" : "0"); } catch { /* storage off */ } }, [present]);
  const isGraph = i === TOPICS.length + 2;
  const isThanks = i === TOPICS.length + 3;
  const isEnd = i === TOPICS.length || i === TOPICS.length + 1;
  const t = i >= 0 && i < TOPICS.length ? TOPICS[i] : i === -2 ? WHY : null;
  const cover = i <= -3 || isEnd || isThanks;
  const lightSlide = i === -3;
  useEffect(() => { const on = () => { setI(readIdx()); window.scrollTo(0, 0); }; addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  useEffect(() => { window.scrollTo(0, 0); const old = document.title; return () => { document.title = old; }; }, []);
  useEffect(() => { document.title = `ReachRadar · ${t ? t.title : "ภาพรวม Process"}`; }, [t]);
  const go = (k: number) => { location.hash = hashOf(Math.max(-5, Math.min(TOPICS.length + 3, k))); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement) return; if (e.key === "p" || e.key === "P") setPresent((x) => !x); if ((e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") && i < TOPICS.length + 3) { e.preventDefault(); go(i + 1); } if (e.key === "PageUp" && i > -5) go(i - 1); if (e.key === "ArrowLeft" && i > -5) go(i - 1); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [i]);

  return (
    <div className={`models k-${t ? t.kind : "ml"}${present ? " present" : ""}${cover ? " is-cover" : ""}${lightSlide ? " is-light" : ""}`}>
      <header className="m-bar">
        <a className="m-home" href="#journey">← เรื่องเล่า</a>
        <nav className="m-dots" aria-label="เรื่อง">
          <a href="#models" title="หน้าปก" aria-label="หน้าปก" aria-current={i === -5 ? "page" : undefined} className={`ov k-sim${i > -5 ? " done" : ""}`} />
          <a href="#models/guests" title="แขกรับเชิญ" aria-label="แขกรับเชิญ" aria-current={i === -4 ? "page" : undefined} className={`ov k-sim${i > -4 ? " done" : ""}`} />
          <a href="#models/objective" title="Business Objective" aria-label="Business Objective" aria-current={i === -3 ? "page" : undefined} className={`ov k-sim${i > -3 ? " done" : ""}`} />
          <a href="#models/why" title={WHY.title} aria-label={WHY.title} aria-current={i === -2 ? "page" : undefined} className={`ov k-net${i > -2 ? " done" : ""}`} />
          <a href="#models/overview" title="ภาพรวม" aria-label="ภาพรวม Process" aria-current={i === -1 ? "page" : undefined} className={`ov k-ml${i >= 0 ? " done" : ""}`} />
          {TOPICS.map((x, k) => <a key={k} href={`#models/${k + 1}`} title={`${k + 1}. ${x.title}`} aria-label={`${k + 1}. ${x.title}`} aria-current={k === i ? "page" : undefined} className={`k-${x.kind}${k < i ? " done" : ""}`} />)}
          <a href="#models/end" title="ปิดท้าย" aria-label="ปิดท้าย" aria-current={i === TOPICS.length ? "page" : undefined} className={`ov k-sim${i > TOPICS.length ? " done" : ""}`} />
          <a href="#models/final" title="ปิดท้าย 2" aria-label="ปิดท้าย 2" aria-current={i === TOPICS.length + 1 ? "page" : undefined} className={`ov k-sim${i > TOPICS.length + 1 ? " done" : ""}`} />
          <a href="#models/graph" title="กราฟเครือข่าย 3 ฝั่ง" aria-label="กราฟเครือข่าย 3 ฝั่ง" aria-current={isGraph ? "page" : undefined} className={`ov k-net${i > TOPICS.length + 2 ? " done" : ""}`} />
          <a href="#models/thanks" title="Thank you" aria-label="Thank you" aria-current={isThanks ? "page" : undefined} className="ov k-sim" />
        </nav>
        <button type="button" className="m-pbtn" aria-pressed={present} onClick={() => setPresent(!present)} title="สลับโหมดนำเสนอ (P)">{present ? "ออกจากโหมดนำเสนอ" : "โหมดนำเสนอ"}</button>
      </header>

      <span className="m-pageno" aria-label="หน้า">{i + 6} / {TOPICS.length + 9}</span>
      {isGraph ? <div className="m-graphonly m-viz" onClick={(e) => { if ((e.target as HTMLElement).closest(".m-tri")) return; go(i + 1); }}><TriNet /></div> : isThanks ? <ThankYou onNext={() => go(-5)} /> : i === TOPICS.length + 1 ? <Guests end img="/final.jpg" alt="ปิดท้าย · ดาว MADT และแบงค์ MADT (นามสมมุติ)" ratio="1670 / 942" onNext={() => go(i + 1)} /> : isEnd ? <Guests end onNext={() => go(i + 1)} /> : i === -5 ? <Cover onNext={() => go(-4)} /> : i === -4 ? <Guests onNext={() => go(-3)} /> : i === -3 ? <Objective onNext={() => go(-2)} /> : <main className={`m-page ${t ? (t.big ? "topic long big" : t.sample ? "topic long" : "topic") : "ov"}`} key={`${i}-${run}`}>
        {!t ? <><Overview /><nav className="m-nav"><button type="button" onClick={() => go(-2)}>← {WHY.title}</button><button type="button" onClick={() => go(0)}>{TOPICS[0].title} →</button></nav></> : <>
        <div className="m-title">
          <div><span className="m-ch">{t === WHY ? "เริ่มต้น" : CHAPTERS[t.ch]}</span><h1>{t.title}</h1>{present && <p className="m-takeaway">{t.read}</p>}</div>
          <Paths t={t} />
        </div>

        <div className="m-stage">
          <section className="m-panel" style={{ "--base": "0.1s" } as CSSProperties}>
            <h2><span>Input{t.yt && <img className="m-yt" src="/youtube-logo.webp" alt="YouTube" />}</span>{t.inCap}</h2>
            <div className="m-viz">{t.In()}</div>
          </section>
          <div className="m-model">
            <div className="m-flow"><i /><i /><i /></div>
            <div className="m-box"><span className="m-gear" aria-hidden="true" /><b>{t.box}</b><span className="m-ptype">{t.paths.map((x) => x[2]).join(" · ")}</span>
              {HOW[t.title] && <div className="m-box-how"><span className="m-box-how-h">Process ทำงานอย่างไร</span><ol>{HOW[t.title].map((h, k) => <li key={k} className="g fade" style={{ animationDelay: `${1.0 + k * 0.3}s` }}><span className="hw-n">{k + 1}</span><div className="hw-v">{h.v}</div><p>{h.t}</p></li>)}</ol></div>}{t.Mini && <div className="m-minis" style={{ "--base": "1.2s" } as CSSProperties}>{t.Mini()}</div>}</div>
            <div className="m-flow out"><i /><i /><i /></div>
          </div>
          <section className="m-panel" style={{ "--base": "1.9s" } as CSSProperties}>
            <h2><span>Output</span>{t.outCap}</h2>
            <div className="m-viz">{t.Out()}</div>
          </section>
        </div>
        {t.illus && <p className="m-illus">{t.illus}</p>}
        {t.sample && <section className="m-sample">{t.sample()}</section>}

        <section className="m-biz" aria-label="Business mapping">
          <div className="m-bq">{t.biz.q.length ? t.biz.q.map((q) => <div key={q}><span className={`qb ${q === "ก" ? "qA" : "qB"}`}>คำถาม {q}</span><b>{QUESTIONS[q]}</b></div>) : <div><span className="qb qN">ฐานข้อมูล</span><b>เตรียมข้อมูลให้คำถาม ก และ ข</b></div>}</div>
          <div className="m-bc"><span>Input · ธุรกิจ</span><p>{t.biz.in}</p></div>
          <div className="m-bc"><span>Process · ธุรกิจ</span><p>{t.biz.proc}</p></div>
          <div className="m-bc out"><span>Output · ธุรกิจ</span><p>{t.biz.out}</p></div>
        </section>
        <details className="m-techd">
          <summary>{t.read}<em>รายละเอียดเทคนิค</em></summary>
          <dl className="m-io">
            <div><dt>Input</dt><dd>{t.inp}</dd></div>
            <div><dt>Process</dt><dd><b>{t.model}</b><span>{t.params}</span>{t.real && <em>{t.real}</em>}</dd></div>
            <div><dt>Output</dt><dd>{t.out}</dd></div>
            <div><dt>ทำไม</dt><dd>{t.why}</dd></div>
          </dl>
        </details>

        <nav className="m-nav">
          <button type="button" onClick={() => go(i - 1)}>← {titleOf(i - 1)}</button>
          <button type="button" className="m-replay" onClick={() => setRun((r) => r + 1)}>เล่นซ้ำ</button>
          <button type="button" onClick={() => go(i + 1)}>{titleOf(i + 1)} →</button>
        </nav>
        </>}
      </main>}
    </div>
  );
}

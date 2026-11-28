import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { D, type Gen, type GenMap, type CI, type LoyMap } from "../data";
import { AGE18, GCOL, GENS, LCOL, LIMITS, LOY, type LimitKey } from "../lib/constants";
import { pct, x2 } from "../lib/format";
import { useModal, useTip } from "./overlay";

export function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="ico" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Term({ word, label }: { word: string; label?: string }) {
  const { gloss } = useModal();
  return <button type="button" className="term" onClick={() => gloss(word)}>{label || word}</button>;
}

export function QBtn({ word, label }: { word: string; label: string }) {
  const { gloss } = useModal();
  return <button className="qbtn" type="button" aria-label={label} onClick={() => gloss(word)}>?</button>;
}

export interface Part { label: string; value: number; color: string }
export function Stack({ parts, label }: { parts: Part[]; label?: string }) {
  const tip = useTip();
  return (
    <div className="stack" role="img" aria-label={label || parts.map((p) => `${p.label} ${pct(p.value)}`).join(", ")}>
      {parts.map((p) => <i key={p.label} style={{ width: `${p.value}%`, background: p.color }} tabIndex={0} {...tip(`${p.label} ${pct(p.value)}`)} />)}
    </div>
  );
}

export function Legend({ items }: { items: [string, string][] }) {
  return <div className="legend">{items.map(([n, c]) => <span key={n}><i style={{ background: c }} />{n}</span>)}</div>;
}

export interface BarRow { label: string; value: number; color?: string; tip?: string }
export function Bars({ rows, max, color, fmtv = pct }: { rows: BarRow[]; max?: number; color?: string; fmtv?: (v: number) => string }) {
  const tip = useTip();
  const m = max || Math.max(...rows.map((r) => r.value)) * 1.1;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" tabIndex={0} key={r.label} {...(r.tip ? tip(r.tip) : {})}>
          <span className="lbl" title={r.label}>{r.label}</span>
          <div className="track"><div className="fill" style={{ width: `${Math.max(1, (r.value / m) * 100)}%`, background: r.color || color || "var(--ink-2)" }} /></div>
          <span className="val">{fmtv(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** diverging on a log scale around ×1.00, left = less than usual, right = more */
export function LiftChart({ entries, range = 3.5 }: { entries: [string, number][]; range?: number }) {
  const tip = useTip();
  const L = Math.log(range);
  return (
    <div className="bars">
      {entries.map(([name, v]) => {
        const w = Math.min(Math.abs(Math.log(v)) / L, 1) * 50;
        const fill: CSSProperties = { left: v >= 1 ? "50%" : `${50 - w}%`, width: `${Math.max(w, 0.6)}%`, background: v >= 1 ? "var(--up)" : "var(--down)" };
        return (
          <div className="lift-row" tabIndex={0} key={name} {...tip(`${name}: ${x2(v)} เทียบกับปกติ`)}>
            <span className="lbl">{name}</span>
            <div className="lift-track"><div className="lift-fill" style={fill} /></div>
            <span className="val num" style={{ fontWeight: 600, color: v >= 1.15 ? "var(--up)" : v <= 0.85 ? "var(--down)" : "var(--ink-2)" }}>{x2(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export const genRows = (g: GenMap, ci?: GenMap<CI>): BarRow[] =>
  GENS.map((k) => ({ label: k, value: g[k], color: GCOL[k], tip: ci ? `${k} ${pct(g[k])} (ช่วงที่น่าจะเป็น ${ci[k][0]}–${ci[k][1]}%)` : `${k} ${pct(g[k])}` }));
export const LoyStack = ({ o }: { o: LoyMap }) => <Stack parts={LOY.map((l) => ({ label: l, value: o[l], color: LCOL[l] }))} />;
export const GenStack = ({ g }: { g: Record<Gen, number> }) => <Stack parts={GENS.map((k) => ({ label: k, value: g[k], color: GCOL[k] }))} />;
export const LoyLegend = () => <Legend items={LOY.map((l) => [l, LCOL[l]])} />;
export const GenLegend = () => <Legend items={GENS.map((g) => [g, GCOL[g]])} />;

export const Kpi = ({ v, l }: { v: ReactNode; l: ReactNode }) => (
  <div className="kpi"><span className="v">{v}</span><span className="l">{l}</span></div>
);

export function Spark({ vals, w = 96, h = 28 }: { vals: number[]; w?: number; h?: number }) {
  if (vals.length < 2) return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="spark" aria-hidden="true" />;
  const mx = Math.max(...vals) || 1, mn = Math.min(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * (w - 4) + 2, h - 3 - ((v - mn) / r) * (h - 6)]);
  const line = "M" + pts.map((p) => p.join(",")).join("L");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="spark" aria-hidden="true">
      <path d={line + `L${pts[pts.length - 1][0]},${h}L${pts[0][0]},${h}Z`} fill="var(--accent-soft)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export type Delta = [string, string] | null;
export function Tile({ label, value, delta, spark, help }: { label: string; value: string; delta?: Delta; spark?: number[]; help?: string }) {
  return (
    <div className="tile">
      <div className="tile-top"><span className="l">{label}</span>{help ? <QBtn word={help} label={"อธิบาย " + label} /> : null}</div>
      <div className="tile-mid"><span className="v num">{value}</span>{spark ? <Spark vals={spark} /> : null}</div>
      {delta ? <span className={"d " + (delta[1] || "")}>{delta[0]}</span> : <span className="d"> </span>}
    </div>
  );
}

export function Limits({ keys, title = "ข้อจำกัดของข้อมูลหน้านี้" }: { keys: LimitKey[]; title?: string }) {
  return (
    <details className="limits">
      <summary>{title}</summary>
      <ul className="limits-b">{keys.map((k) => <li key={k}>{LIMITS[k]}</li>)}</ul>
    </details>
  );
}

export function GenAccuracy() {
  const rows = [["Gen X ขึ้นไป", "83% (68–92%)", "81% (66–91%)"], ["Gen Y", "36% (16–61%)", "42% (19–68%)"], ["Gen Z", "64% (39–84%)", "60% (36–80%)"]];
  return (
    <details className="limits">
      <summary>ความแม่นของการประเมินวัย (วัดกับคน 64 คนที่รู้อายุจริง)</summary>
      <div className="limits-b">
        <div className="tbl-wrap"><table>
          <thead><tr><th style={{ textAlign: "left" }}>กลุ่ม</th><th>ทายว่าใช่แล้วถูกจริง</th><th>คนกลุ่มนี้ถูกจับได้</th></tr></thead>
          <tbody>{rows.map(([a, b, c]) => <tr key={a}><td style={{ textAlign: "left" }}>{a}</td><td className="num">{b}</td><td className="num">{c}</td></tr>)}</tbody>
        </table></div>
        <p className="cap">ความแม่นรวม 68.8% (57–79%) ถ้าสุ่มเดาจะได้ 33% · ตัวเลขในวงเล็บคือช่วง Wilson 95% · Gen Y แม่นน้อยสุดเพราะคนวัยทำงานเขียนคล้ายทั้งสองฝั่ง</p>
        <p className="cap">ตัวเลขรายหมวดและราย EP มาจากโมเดลที่ขยายผลไปทุกคน ซึ่งทายรายคนถูก 44.9% แต่สัดส่วนรวมคลาดเคลื่อนไม่เกินราว 6 จุด จึงใช้ดูทิศทางและการเรียงลำดับ</p>
      </div>
    </details>
  );
}

const THUMBS = new Set(D.thumbs);
export function Thumb({ vid, cls = "thumb" }: { vid?: string; cls?: string }) {
  if (!vid || !THUMBS.has(vid)) return null;
  return <img src={`/thumbs/${vid}.jpg`} className={cls} alt="" loading="lazy" />;
}

export const Age18 = ({ ep }: { ep: number }) =>
  AGE18.has(ep) ? <span className="chip warn" style={{ marginLeft: 6 }} title="คลิปจำกัดอายุ ต้องล็อกอินและอายุ 18 ปีขึ้นไปจึงจะคอมเม้นได้">18+</span> : null;

export function CopyBtn({ text, label = "คัดลอกไป Proposal" }: { text: () => string; label?: string }) {
  const { open } = useModal();
  const [done, setDone] = useState(false);
  const fallback = (t: string) => open("คัดลอกข้อความนี้", <textarea className="copybox" rows={8} readOnly value={t} />);
  const click = () => {
    const t = text();
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1600); };
    try { navigator.clipboard.writeText(t).then(ok, () => fallback(t)); } catch { fallback(t); }
  };
  return <button type="button" className="btn" onClick={click}><Icon d="M8 8h11v11H8zM5 16V5h11" />{done ? "คัดลอกแล้ว" : label}</button>;
}

/** Measures its own width and hands it to the drawing function (redraws on resize). */
export function ChartBox({ height, children }: { height: number; children: (W: number, H: number) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const n = ref.current!;
    setW(n.clientWidth);
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => setW(n.clientWidth), 120); });
    ro.observe(n);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, []);
  return <div className="chart" ref={ref} style={{ height }}>{w > 0 ? children(w, height) : null}</div>;
}

export function DashHead({ eyebrow, title, right, id }: { eyebrow?: string; title: string; right?: ReactNode; id?: string }) {
  return (
    <div className="dash-head" id={id}>
      <div>{eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}<h1>{title}</h1></div>
      {right}
    </div>
  );
}
export const YearChip = () => <span className="chip">ข้อมูลทั้งปี · ตัวกรองหน้าภาพรวมไม่มีผลที่หน้านี้</span>;

/** y-axis gridlines + labels */
export function AxisY({ y, w, ticks, f, x0 }: { y: (v: number) => number; w: number; ticks: number[]; f: (v: number) => string | number; x0: number }) {
  return <>{ticks.map((t) => [
    <line key={"l" + t} x1={x0} x2={w} y1={y(t)} y2={y(t)} stroke="var(--line)" />,
    <text key={"t" + t} x={x0 - 6} y={y(t) + 4} textAnchor="end" className="ax">{f(t)}</text>,
  ])}</>;
}

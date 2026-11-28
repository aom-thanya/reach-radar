import { D, type Episode, type Gen, type Loyalty } from "../data";
import { useDetails } from "../components/details";
import { useTip } from "../components/overlay";
import { Age18, AxisY, ChartBox, Icon, Limits, LoyStack, QBtn, Stack, Thumb, Tile, type Delta } from "../components/ui";
import { GCOL, GEN_CAP, GENS, LOY, METRICS, MONTHS, type MetricKey } from "../lib/constants";
import { FULL, useHomeFilter, type HomeFilter } from "../lib/filter";
import { fmt, mLabel, median, niceTicks, pct, short, sum, views } from "../lib/format";
import { ContentSection } from "./Content";

const monthly = (eps: Episode[], key: MetricKey, agg: (x: number[]) => number) =>
  MONTHS.map((m) => { const xs = eps.filter((e) => e.m === m).map((e) => e[key]); return xs.length ? agg(xs) : 0; });

function FilterBar({ hf }: { hf: HomeFilter }) {
  const { F, setF, isFiltered } = hf;
  const sel = (val: number, on: (v: number) => void) => (
    <select value={val} onChange={(e) => on(+e.target.value)}>
      {MONTHS.map((m, i) => <option key={m} value={i}>{mLabel(m) + " " + (+m.slice(0, 4) + 543)}</option>)}
    </select>
  );
  return (
    <div className="fbar">
      <span className="flabel">ช่วงเวลา</span>
      {sel(F.m0, (v) => setF((f) => ({ ...f, m0: Math.min(v, f.m1) })))}
      <span className="muted">ถึง</span>
      {sel(F.m1, (v) => setF((f) => ({ ...f, m1: Math.max(v, f.m0) })))}
      <span className="flabel">หมวด</span>
      {F.cats.length ? F.cats.map((c) => <button key={c} type="button" className="chip hot fchip" onClick={() => hf.toggleCat(c)}>{c} ×</button>)
        : <span className="muted small">ทุกหมวด (กดแท่งในกราฟหมวดเพื่อกรอง)</span>}
      {isFiltered ? <button type="button" className="linkbtn small" onClick={() => setF(FULL)}>ล้างตัวกรอง</button> : null}
    </div>
  );
}

function MonthChart({ hf }: { hf: HomeFilter }) {
  const tip = useTip();
  const { F, met } = hf, m = METRICS[met];
  return <ChartBox height={220}>{(W, H) => {
    const vals = MONTHS.map((mm) => { const xs = D.eps.filter((e) => e.m === mm && hf.hasCat(e.cat)).map((e) => e[met]); return xs.length ? (m.total ? sum(xs) : median(xs)) : 0; });
    const pad = { l: 46, r: 8, t: 10, b: 24 }, mx = Math.max(...vals) * 1.1 || 1, ticks = niceTicks(mx);
    const y = (v: number) => H - pad.b - (v / ticks[ticks.length - 1]) * (H - pad.t - pad.b), bw = (W - pad.l - pad.r) / MONTHS.length;
    const pick = (i: number) => hf.setF((f) => (f.m0 === i && f.m1 === i ? { ...f, m0: 0, m1: MONTHS.length - 1 } : { ...f, m0: i, m1: i }));
    return (
      <svg width={W} height={H} role="img" aria-label={`${m.name} รายเดือน`}>
        <AxisY y={y} w={W - pad.r} ticks={ticks} f={short} x0={pad.l} />
        {vals.map((v, i) => {
          const on = i >= F.m0 && i <= F.m1, x = pad.l + i * bw + 3;
          const lab = m.total ? short(v) : m.fmt(v), fs = Math.min(11, (bw - 2) / (0.62 * lab.length));
          return <g key={i}>
            <rect x={x} y={y(v)} width={Math.max(bw - 6, 2)} height={Math.max(H - pad.b - y(v), 0)} rx={3} fill={on ? "var(--accent)" : "var(--l3)"} className="hit" tabIndex={0}
              onClick={() => pick(i)} {...tip(`${mLabel(MONTHS[i])}: ${m.fmt(v)} ${m.total ? "(รวม)" : "(ค่ากลางต่อ EP)"} · กดเพื่อกรองเดือนนี้`)} />
            <text x={x + (bw - 6) / 2} y={H - 6} textAnchor="middle" className="ax">{mLabel(MONTHS[i])}</text>
            {v > 0 && fs >= 8 ? <text x={x + (bw - 6) / 2} y={Math.max(y(v) - 5, 9)} textAnchor="middle" fontSize={fs.toFixed(1)} className="blab" opacity={on ? 1 : 0.55}>{lab}</text> : null}
          </g>;
        })}
      </svg>
    );
  }}</ChartBox>;
}

function CatChart({ hf }: { hf: HomeFilter }) {
  const tip = useTip();
  const { met } = hf, m = METRICS[met];
  const rows = D.categories.map((c) => c.name).map((c) => { const xs = D.eps.filter((e) => e.cat === c && hf.inRange(e)).map((e) => e[met]); return { c, v: xs.length ? median(xs) : 0, n: xs.length }; }).sort((a, b) => b.v - a.v);
  const rh = 26, H = rows.length * rh + 6;
  return <ChartBox height={H}>{(W) => {
    const lw = Math.min(160, W * 0.42), mx = Math.max(...rows.map((r) => r.v)) || 1;
    return (
      <svg width={W} height={H} role="img" aria-label="เทียบหมวด">
        {rows.map((r, i) => {
          const on = hf.hasCat(r.c), w = ((W - lw - 64) * r.v) / mx, yy = i * rh + 4;
          return <g key={r.c} className="hit" tabIndex={0} onClick={() => hf.toggleCat(r.c)} {...tip(`${r.c}: ${m.fmt(r.v)} (ค่ากลางต่อ EP, ${r.n} EP) · กดเพื่อกรอง`)}>
            <rect x={0} y={yy - 2} width={W} height={rh} fill="transparent" />
            <text x={lw - 8} y={yy + 14} textAnchor="end" className={on ? "lbl" : "lbl dim"}>{r.c.length > 22 ? r.c.slice(0, 21) + "…" : r.c}</text>
            <rect x={lw} y={yy + 3} width={Math.max(w, 1)} height={rh - 10} rx={3} fill={on ? "var(--accent)" : "var(--l3)"} />
            <text x={lw + w + 6} y={yy + 14} className="val">{m.fmt(r.v)}</text>
          </g>;
        })}
      </svg>
    );
  }}</ChartBox>;
}

function Scatter({ eps }: { eps: Episode[] }) {
  const tip = useTip();
  const det = useDetails();
  return <ChartBox height={280}>{(W, H) => {
    const pad = { l: 40, r: 10, t: 10, b: 28 };
    const xs = D.eps.map((e) => Math.log10(e.views)), x0 = Math.floor(Math.min(...xs) * 2) / 2, x1 = Math.ceil(Math.max(...xs) * 2) / 2;
    const y1 = Math.ceil(Math.max(...D.eps.map((e) => e.cr)));
    const x = (v: number) => pad.l + ((Math.log10(v) - x0) / (x1 - x0)) * (W - pad.l - pad.r), y = (v: number) => H - pad.b - (v / y1) * (H - pad.t - pad.b);
    const bx = median(D.eps.map((e) => e.views)), by = median(D.eps.map((e) => e.cr));
    const sel = new Set(eps.map((e) => e.ep));
    return (
      <svg width={W} height={H} role="img" aria-label="EP แต่ละอัน วิวเทียบกับคอมเม้นต่อ 1,000 วิว">
        <AxisY y={y} w={W - pad.r} ticks={niceTicks(y1, 4).filter((t) => t <= y1)} f={(t) => t} x0={pad.l} />
        {[1e5, 3e5, 1e6, 3e6, 1e7].filter((v) => Math.log10(v) >= x0 && Math.log10(v) <= x1).map((v) => <text key={v} x={x(v)} y={H - 8} textAnchor="middle" className="ax">{short(v)}</text>)}
        <line x1={x(bx)} x2={x(bx)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeDasharray="3 3" />
        <line x1={pad.l} x2={W - pad.r} y1={y(by)} y2={y(by)} stroke="var(--ink-3)" strokeDasharray="3 3" />
        <text x={W - pad.r} y={pad.t + 10} textAnchor="end" className="ax">วิวสูง · คนคอมเม้นเยอะ</text>
        {[...D.eps].sort((a, b) => +sel.has(a.ep) - +sel.has(b.ep)).map((e) => {
          const on = sel.has(e.ep);
          return <circle key={e.ep} cx={x(e.views)} cy={y(Math.min(e.cr, y1))} r={on ? 4.5 : 3} fill={on ? "var(--accent)" : "var(--l3)"} stroke="var(--surface)" strokeWidth={1.5}
            className="hit" tabIndex={on ? 0 : undefined} onClick={() => det.ep(e)} {...tip(`EP.${e.ep} ${e.title.slice(0, 50)} · ${views(e.views)} วิว · ${e.cr} คอมเม้น/1,000 วิว`)} />;
        })}
      </svg>
    );
  }}</ChartBox>;
}

export default function Home() {
  const hf = useHomeFilter();
  const det = useDetails();
  const { met, setMet, isFiltered } = hf;
  const all = D.eps, eps = hf.filtered, m = METRICS[met];
  const share = (k: "views" | "comments" | null): Delta => isFiltered
    ? [`${Math.round((k ? sum(eps.map((e) => e[k])) / sum(all.map((e) => e[k])) : eps.length / all.length) * 100)}% ของทั้งปี`, ""] : null;
  const deltaVs = (v: number, base: number): Delta => {
    if (!isFiltered) return ["ทั้งปี", ""];
    const r = base ? v / base - 1 : 0;
    return [(r >= 0 ? "▲ " : "▼ ") + Math.abs(r * 100).toFixed(0) + "% เทียบทั้งปี", r >= 0.05 ? "up" : r <= -0.05 ? "down" : ""];
  };
  const med = (list: Episode[], k: MetricKey | "news") => median(list.map((e) => e[k]));
  const pw = sum(eps.map((e) => e.people)) || 1;
  const genMix = Object.fromEntries(GENS.map((g) => [g, sum(eps.filter((e) => e.gen).map((e) => e.gen![g] * e.people)) / pw])) as Record<Gen, number>;
  const loy: Record<Loyalty, number> = { "แฟนตัวยง": med(eps, "fan"), "นักเสพข่าว": med(eps, "news"), "ขาจร": med(eps, "drift") };
  const top = [...eps].sort((a, b) => b[met] - a[met]).slice(0, 8);

  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">ภาพรวม</span><h1>Dashboard คนคอมเม้นโหนกระแส</h1></div>
        <span className="small muted">{`${D.n_eps} EP · ${D.date_range[0]} ถึง ${D.date_range[1]}`}</span></div>
      <a className="start" href="#planner">
        <span className="start-ico"><Icon d="M4 4h16v16H4zM8 9h8M8 13h5M15 15l2 2 3-4" /></span>
        <span><b>มีโจทย์ลูกค้า? เริ่มที่นี่</b><span className="cap">กรอกสินค้า กลุ่มเป้าหมาย และงาน แล้วได้รายงานข้อเสนอพร้อม Export PDF</span></span>
        <span className="start-go">วางแผนแคมเปญ →</span>
      </a>
      <FilterBar hf={hf} />
      <div className="tiles">
        <Tile label="EP" value={String(eps.length)} delta={share(null)} spark={monthly(eps, "views", (x) => x.length)} />
        <Tile label="วิวรวม" value={views(sum(eps.map((e) => e.views)))} delta={share("views")} spark={monthly(eps, "views", sum)} />
        <Tile label="วิวต่อ EP" value={views(med(eps, "views"))} delta={deltaVs(med(eps, "views"), med(all, "views"))} spark={monthly(eps, "views", median)} help="ค่ากลาง" />
        <Tile label="คอมเม้นรวม" value={fmt(sum(eps.map((e) => e.comments)))} delta={share("comments")} spark={monthly(eps, "comments", sum)} />
        <Tile label="คอมเม้น/1,000 วิว" value={med(eps, "cr").toFixed(2)} delta={deltaVs(med(eps, "cr"), med(all, "cr"))} spark={monthly(eps, "cr", median)} help="คอมเม้นต่อ 1,000 วิว" />
        <Tile label="ขาจร (คนใหม่) ต่อ EP" value={pct(med(eps, "drift"))} delta={deltaVs(med(eps, "drift"), med(all, "drift"))} spark={monthly(eps, "drift", median)} help="ขาจร" />
      </div>
      <div className="dgrid">
        <div className="panel span8">
          <div className="panel-head"><h2>{`${m.name}รายเดือน`}</h2>
            <div className="seg">{(Object.keys(METRICS) as MetricKey[]).map((k) => <button key={k} type="button" aria-pressed={met === k} onClick={() => setMet(k)}>{METRICS[k].name}</button>)}</div></div>
          <MonthChart hf={hf} />
          <p className="cap">{m.total ? "ผลรวมต่อเดือน · กดแท่งเพื่อกรองเดือน" : "ค่ากลางต่อ EP · กดแท่งเพื่อกรองเดือน"}</p>
        </div>
        <div className="panel span4">
          <div className="panel-head"><h2>ใครคอมเม้น</h2><QBtn word="Gen" label="Gen คืออะไร" /></div>
          <span className="cap">วัย (ประเมิน)</span>
          <Stack parts={GENS.map((g) => ({ label: g, value: genMix[g], color: GCOL[g] }))} />
          <div className="mini3">{GENS.map((g) => <div key={g}><b className="num">{pct(genMix[g])}</b><span className="cap">{g}</span></div>)}</div>
          <span className="cap">{GEN_CAP}</span>
          <span className="cap">ความภักดี (ค่ากลางต่อ EP)</span>
          <LoyStack o={loy} />
          <div className="mini3">{LOY.map((l) => <div key={l}><b className="num">{pct(loy[l])}</b><span className="cap">{l}</span></div>)}</div>
        </div>
        <div className="panel span5"><div className="panel-head"><h2>เทียบหมวด</h2><span className="cap">{m.per}</span></div><CatChart hf={hf} /></div>
        <div className="panel span7"><div className="panel-head"><h2>EP ทุกอัน</h2><span className="cap">แนวนอน = วิว · แนวตั้ง = คอมเม้นต่อ 1,000 วิว</span></div>
          <Scatter eps={eps} /><p className="cap">เส้นประ = ค่ากลางทั้งปี · กดจุดเพื่อดู EP</p></div>
        <div className="panel span12"><div className="panel-head"><h2>{`EP เด่นตาม${m.name}`}</h2><span className="cap">กดปกเพื่อดูรายละเอียด</span></div>
          <div className="covers">{top.slice(0, 6).map((e) =>
            <button key={e.ep} type="button" className="cover" onClick={() => det.ep(e)}>
              <span className="cover-img"><Thumb vid={e.vid} cls="cover-thumb" /><span className="cover-badge num">{m.fmt(e[met])}</span></span>
              <span className="cover-t"><b>{`EP.${e.ep} `}</b>{e.title}<Age18 ep={e.ep} /></span>
              <span className="cap">{`${e.cat} · ${e.date}`}</span>
            </button>)}</div></div>
        <div className="panel span12"><div className="panel-head"><h2>{`EP ที่${m.name}สูงสุด`}</h2><span className="cap">{`${eps.length} EP ตามตัวกรอง`}</span></div>
          <div className="tbl-wrap"><table>
            <thead><tr>{["EP", "หมวด", "วิว", "คอมเม้น", "คอมเม้น/1,000 วิว", "ขาจร", "แฟนตัวยง"].map((h, i) => <th key={h} style={i === 1 ? { textAlign: "left" } : undefined}>{h}</th>)}</tr></thead>
            <tbody>{top.map((e) =>
              <tr key={e.ep} className="click" tabIndex={0} onClick={() => det.ep(e)} onKeyDown={(ev) => { if (ev.key === "Enter") det.ep(e); }}>
                <td className="eptitle"><Thumb vid={e.vid} /><b>{`EP.${e.ep} `}</b>{e.title.slice(0, 48)}<Age18 ep={e.ep} /></td>
                <td style={{ textAlign: "left" }}><span className="chip">{e.cat}</span></td>
                <td>{views(e.views)}</td><td>{fmt(e.comments)}</td><td>{e.cr.toFixed(1)}</td><td>{pct(e.drift)}</td><td>{pct(e.fan)}</td>
              </tr>)}</tbody>
          </table></div></div>
      </div>
      <div className="dash-head" id="detail"><h2>ข้อมูลละเอียด: หมวดและ EP</h2></div>
      <ContentSection hf={hf} />
      <Limits keys={["commenters", "asOf", "time", "age18", "missing", "tags", "fewEps"]} />
    </div>
  );
}

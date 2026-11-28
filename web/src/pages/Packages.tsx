import { D, type Tag } from "../data";
import { useTip } from "../components/overlay";
import { AxisY, ChartBox, CopyBtn, Limits, YearChip } from "../components/ui";
import { SENSITIVE, SRC, tagRows } from "../lib/constants";
import { niceTicks, pct, short, views } from "../lib/format";

const PACKS: { id: string; name: string; th: string; rule: string; score: (t: Tag) => number; show: (t: Tag) => string }[] = [
  { id: "reach", name: "Reach", th: "เข้าถึงคนจำนวนมาก", rule: "วิวสูง และมีขาจร (คนใหม่) เยอะ", score: (t) => (t.views * t.drift_pct) / 100, show: (t) => `${views(t.views)} วิว · ขาจร ${pct(t.drift_pct)}` },
  { id: "eng", name: "Engagement", th: "ให้คนมีส่วนร่วม", rule: "คอมเม้นต่อ 1,000 วิวสูง", score: (t) => t.comment_rate, show: (t) => `${t.comment_rate.toFixed(1)} คอมเม้น/1,000 วิว · ไลก์ ${t.like_rate}` },
  { id: "loyal", name: "Loyalty", th: "ย้ำกับฐานแฟน", rule: "สัดส่วนแฟนตัวยงสูง", score: (t) => t.fan_pct, show: (t) => `แฟนตัวยง ${pct(t.fan_pct)} · ${views(t.views)} วิว` },
];

function Quad({ tags }: { tags: Tag[] }) {
  const tip = useTip();
  const B = D.base;
  return <ChartBox height={380}>{(W, H) => {
    const pad = { l: 44, r: 16, t: 14, b: 30 };
    const x0 = Math.log10(Math.min(...tags.map((t) => t.views)) * 0.85), x1 = Math.log10(Math.max(...tags.map((t) => t.views)) * 1.15);
    const y1 = Math.ceil(Math.max(...tags.map((t) => t.comment_rate)) + 0.3);
    const x = (v: number) => pad.l + ((Math.log10(v) - x0) / (x1 - x0)) * (W - pad.l - pad.r), y = (v: number) => H - pad.b - (v / y1) * (H - pad.t - pad.b);
    const corners: [string, number, number, "start" | "end"][] = [["Reach + Engagement", W - pad.r, pad.t + 10, "end"], ["Engagement", pad.l + 6, pad.t + 10, "start"], ["Reach", W - pad.r, H - pad.b - 6, "end"]];
    return (
      <svg width={W} height={H} role="img" aria-label="ประเด็นย่อย วิวเทียบกับคอมเม้นต่อ 1,000 วิว">
        <AxisY y={y} w={W - pad.r} ticks={niceTicks(y1, 4).filter((t) => t <= y1)} f={(t) => t} x0={pad.l} />
        {[5e5, 1e6, 2e6].filter((v) => Math.log10(v) > x0 && Math.log10(v) < x1).map((v) => <text key={v} x={x(v)} y={H - 10} textAnchor="middle" className="ax">{short(v)}</text>)}
        <line x1={x(B.views)} x2={x(B.views)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeDasharray="3 3" />
        <line x1={pad.l} x2={W - pad.r} y1={y(B.comment_rate)} y2={y(B.comment_rate)} stroke="var(--ink-3)" strokeDasharray="3 3" />
        {corners.map(([t, xx, yy, a]) => <text key={t} x={xx} y={yy} textAnchor={a} className="ax q">{t}</text>)}
        {tags.map((t) => {
          const r = Math.max(4 + ((t.fan_pct - 25) / 30) * 8, 3), cx = x(t.views), cy = y(t.comment_rate);
          return <g key={t.tag} className="hit" tabIndex={0} {...tip(`${t.tag}: ${views(t.views)} วิว · ${t.comment_rate} คอมเม้น/1,000 วิว · แฟนตัวยง ${pct(t.fan_pct)} (${t.eps} EP)${SENSITIVE[t.tag] ? " · ประเด็นอ่อนไหว" : ""}`)}>
            <circle cx={cx} cy={cy} r={r} fill={SENSITIVE[t.tag] ? "var(--l3)" : "var(--accent)"} fillOpacity={0.75} stroke="var(--surface)" strokeWidth={1.5} />
            <text x={cx + r + 3} y={cy + 4} className="lbl small-lbl">{t.tag.split("/")[0]}</text>
          </g>;
        })}
      </svg>
    );
  }}</ChartBox>;
}

// 2) Packages: Reach / Engagement / Loyalty
export default function Packages() {
  const B = D.base, tags = tagRows();
  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">เป้าหมาย 3 · เลือกแพ็กเกจตามเป้าหมายแคมเปญ</span><h1>Reach · Engagement · Loyalty</h1></div><YearChip /></div>
      <div className="dgrid">
        {PACKS.map((p) => {
          const top = [...tags].filter((t) => SENSITIVE[t.tag] !== "สูง").sort((a, b) => p.score(b) - p.score(a)).slice(0, 6);
          return (
            <div className="panel span4 pack" key={p.id}>
              <div className="panel-head"><h2>{p.name}</h2><span className="chip">{p.th}</span></div>
              <span className="cap">{"เลือกจาก: " + p.rule}</span>
              <ol className="rank-list">{top.map((t) => <li key={t.tag}><b>{t.tag}</b><span className="cap">{p.show(t)}</span>{SENSITIVE[t.tag] ? <span className="chip warn">อ่อนไหว</span> : null}</li>)}</ol>
              <CopyBtn text={() => `แพ็กเกจ ${p.name} (${p.th})\n${top.slice(0, 4).map((t, i) => `${i + 1}. ${t.tag}: ${p.show(t)} (${t.eps} EP)`).join("\n")}\nค่ากลางทั้งรายการ: ${views(B.views)} วิว · ${B.comment_rate} คอมเม้น/1,000 วิว · แฟนตัวยง ${pct(B.fan)}\n${SRC}`} />
            </div>
          );
        })}
        <div className="panel span12">
          <div className="panel-head"><h2>แผนที่ประเด็น</h2><span className="cap">แนวนอน = วิวต่อ EP · แนวตั้ง = คอมเม้นต่อ 1,000 วิว · วงใหญ่ = แฟนตัวยงเยอะ · สีเทา = ประเด็นอ่อนไหว</span></div>
          <Quad tags={tags} />
          <p className="cap">เส้นประ = ค่ากลางทั้งรายการ ขวาบนคือประเด็นที่ได้ทั้งวิวและคนคอมเม้น</p>
        </div>
      </div>
      <Limits keys={["tags", "fewEps", "commenters", "conv"]} />
    </div>
  );
}

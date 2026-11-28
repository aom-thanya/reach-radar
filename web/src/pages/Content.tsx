import { D, type Category } from "../data";
import { useDetails } from "../components/details";
import { Age18, Bars, Thumb } from "../components/ui";
import { CAT_KAPPA, GCOL, topGen } from "../lib/constants";
import { fmt, pct, views } from "../lib/format";
import type { HomeFilter } from "../lib/filter";
import { useKept } from "../lib/kept";

type SortKey = "name" | "eps" | "views" | "comments" | "comment_rate" | "drift" | "fan";
const COLS: [SortKey | "gen", string][] = [["name", "หมวด"], ["eps", "EP"], ["views", "วิว/EP"], ["comments", "คอมเม้น/EP"], ["comment_rate", "คอมเม้น/1k วิว"], ["drift", "ขาจร"], ["fan", "แฟนตัวยง"], ["gen", "วัยเด่น"]];

const RatioTag = ({ v, base }: { v: number; base: number }) => {
  const r = v / base;
  return r >= 1.1 ? <span className="up"> ▲</span> : r <= 0.9 ? <span className="down"> ▼</span> : null;
};

/** category table + subtopic bars + EP search (the old "content" page, now under the overview) */
export function ContentSection({ hf }: { hf: HomeFilter }) {
  const det = useDetails();
  const [sort, setSort] = useKept<{ k: SortKey; dir: number }>("content.sort", { k: "views", dir: -1 });
  const [q, setQ] = useKept("content.q", "");
  const B = D.base;
  const mxv = Math.max(...D.categories.map((c) => c.views));
  const cats = [...D.categories].sort((a, b) => (a[sort.k] > b[sort.k] ? 1 : a[sort.k] < b[sort.k] ? -1 : 0) * sort.dir);
  const qq = q.trim().toLowerCase();
  const list = hf.filtered.filter((e) => !qq || `ep.${e.ep} ${e.title} ${e.cat}`.toLowerCase().includes(qq)).sort((a, b) => b.views - a.views);
  const tags = D.tags.filter((t) => !t.few_eps);
  const row = (c: Category) => {
    const g = topGen(c);
    return (
      <tr className="click" tabIndex={0} key={c.name} onClick={() => det.cat(c)} onKeyDown={(e) => { if (e.key === "Enter") det.cat(c); }}>
        <td>{c.name}</td><td>{c.eps}</td>
        <td><span className="inbar"><i style={{ width: `${(c.views / mxv) * 100}%` }} /></span>{views(c.views)}<RatioTag v={c.views} base={B.views} /></td>
        <td>{fmt(c.comments)}<RatioTag v={c.comments} base={B.comments} /></td>
        <td>{c.comment_rate.toFixed(1)}<RatioTag v={c.comment_rate} base={B.comment_rate} /></td>
        <td>{pct(c.drift)}<RatioTag v={c.drift} base={B.drift} /></td>
        <td>{pct(c.fan)}<RatioTag v={c.fan} base={B.fan} /></td>
        <td>{g ? <span className="chip" style={{ background: "transparent", border: `1px solid ${GCOL[g]}` }}>{g}</span> : <span className="muted">–</span>}</td>
      </tr>
    );
  };
  return (
    <div className="dgrid">
      <div className="panel span12">
        <div className="panel-head"><h2>10 หมวด (ทั้งปี)</h2><span className="cap">▲▼ = สูง/ต่ำกว่าค่ากลางทั้งรายการ 10% ขึ้นไป · กดหัวคอลัมน์เพื่อเรียง · กดแถวเพื่อดูประเด็นย่อย</span></div>
        <div className="tbl-wrap"><table>
          <thead><tr>{COLS.map(([k, n]) => <th key={k}>{k === "gen" ? n :
            <button type="button" onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : -1 }))}>{n + (sort.k === k ? (sort.dir > 0 ? " ↑" : " ↓") : "")}</button>}</th>)}</tr></thead>
          <tbody>{cats.map(row)}</tbody>
        </table></div>
        <p className="cap">{CAT_KAPPA}</p>
      </div>
      <div className="panel span6"><h2>ประเด็นที่ได้วิวสูงสุด</h2>
        <Bars rows={[...tags].sort((a, b) => b.views - a.views).slice(0, 8).map((t) => ({ label: t.tag, value: t.views, color: "var(--accent)", tip: `${t.tag}: ${views(t.views)} วิว (${t.eps} EP)` }))} fmtv={views} />
        <p className="cap">ค่ากลางวิวต่อ EP · ประเด็นที่มีตั้งแต่ 3 EP</p></div>
      <div className="panel span6"><h2>ประเด็นที่คนชอบออกความเห็น</h2>
        <Bars rows={[...tags].sort((a, b) => b.comment_rate - a.comment_rate).slice(0, 8).map((t) => ({ label: t.tag, value: t.comment_rate, color: "var(--ink-2)", tip: `${t.tag}: ${t.comment_rate} คอมเม้นต่อ 1,000 วิว (${t.eps} EP)` }))} fmtv={(v) => v.toFixed(1)} />
        <p className="cap">คอมเม้นต่อ 1,000 วิว ไม่ขึ้นกับความดังของคลิป</p></div>
      <div className="panel span12">
        <div className="panel-head"><h2>ค้นหา EP</h2>
          <input type="search" placeholder="พิมพ์เลข EP ชื่อเรื่อง หรือหมวด" value={q} className="search" onChange={(e) => setQ(e.target.value)} /></div>
        <div className="tbl-wrap scrolly"><table>
          <thead><tr>{["EP", "วันที่", "หมวด", "วิว", "คอมเม้น", "คอมเม้น/1k", "ขาจร", "แฟนตัวยง"].map((h, i) => <th key={h} style={i < 3 ? { textAlign: "left" } : undefined}>{h}</th>)}</tr></thead>
          <tbody>{list.slice(0, 60).map((e) =>
            <tr className="click" tabIndex={0} key={e.ep} onClick={() => det.ep(e)} onKeyDown={(ev) => { if (ev.key === "Enter") det.ep(e); }}>
              <td className="eptitle"><Thumb vid={e.vid} /><b>{`EP.${e.ep} `}</b>{e.title.slice(0, 44)}<Age18 ep={e.ep} /></td>
              <td style={{ textAlign: "left" }}>{e.date}</td><td style={{ textAlign: "left" }}>{e.cat}</td>
              <td>{views(e.views)}</td><td>{fmt(e.comments)}</td><td>{e.cr.toFixed(1)}</td><td>{pct(e.drift)}</td><td>{pct(e.fan)}</td>
            </tr>)}</tbody>
        </table></div>
        <p className="cap">{`${list.length} EP ตามตัวกรองด้านบน ${list.length > 60 ? "· แสดง 60 อันดับแรกตามยอดวิว" : ""}`}</p>
      </div>
    </div>
  );
}

import { D, type Episode } from "../data";
import { useDetails } from "../components/details";
import { useModal, useTip } from "../components/overlay";
import { Limits, Thumb, Tile, YearChip } from "../components/ui";
import { SENSITIVE } from "../lib/constants";
import { median, views } from "../lib/format";
import { useKept } from "../lib/kept";

const LEVELS: [string, string[]][] = [["ไม่ตัด", []], ["อ่อนไหวสูง", ["สูง"]], ["สูง + กลาง", ["สูง", "กลาง"]]];

function EpList({ eps }: { eps: Episode[] }) {
  const det = useDetails();
  return (
    <div className="tbl-wrap"><table><tbody>
      {[...eps].sort((a, b) => b.views - a.views).map((e) =>
        <tr key={e.ep} className="click" onClick={() => det.ep(e)}>
          <td className="eptitle"><Thumb vid={e.vid} /><b>{`EP.${e.ep} `}</b>{e.title.slice(0, 50)}</td><td>{e.cat}</td><td>{views(e.views)}</td>
        </tr>)}
    </tbody></table></div>
  );
}

// 4) Brand safety
export default function Safety() {
  const tip = useTip();
  const { open } = useModal();
  const [hide, setHide] = useKept<string[]>("safety.hide", ["สูง"]);
  const isOut = (e: Episode) => e.tags.some((t) => SENSITIVE[t] && hide.includes(SENSITIVE[t]));
  const sens = Object.entries(SENSITIVE).map(([t, lv]) => {
    const eps = D.eps.filter((e) => e.tags.includes(t));
    return { t, lv, eps, n: eps.length, v: median(eps.map((e) => e.views)), cr: median(eps.map((e) => e.cr)) };
  }).sort((a, b) => b.n - a.n);
  const keep = D.eps.filter((e) => !isOut(e));
  const cats = D.categories.map((c) => { const all = D.eps.filter((e) => e.cat === c.name), ok = all.filter((e) => !isOut(e)); return { c: c.name, all: all.length, ok: ok.length }; }).sort((a, b) => b.all - a.all);
  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">เป้าหมาย 4 · Brand safety</span><h1>ประเด็นอ่อนไหว ให้แบรนด์เลือกเอง</h1></div><YearChip /></div>
      <div className="fbar"><span className="flabel">ตัด EP ที่มีประเด็นระดับ</span>
        <div className="seg">{LEVELS.map(([n, set]) => <button key={n} type="button" aria-pressed={hide.length === set.length} onClick={() => setHide(set)}>{n}</button>)}</div>
        <span className="cap">สูง = คดีทางเพศ มีคนเสียชีวิต ยาเสพติด · กลาง = ทำร้ายร่างกาย เด็ก ภัยพิบัติ</span></div>
      <div className="tiles">
        <Tile label="EP ที่ลงได้" value={`${keep.length} / ${D.eps.length}`} delta={[`${Math.round((keep.length / D.eps.length) * 100)}% ของทั้งปี`, ""]} />
        <Tile label="วิวต่อ EP (ที่ลงได้)" value={views(median(keep.map((e) => e.views)))} delta={[`ทั้งปี ${views(D.base.views)}`, ""]} />
        <Tile label="EP ที่ถูกตัด" value={String(D.eps.length - keep.length)} delta={[hide.length ? "ตามระดับที่เลือก" : "ยังไม่ได้เลือกตัด", ""]} />
      </div>
      <div className="dgrid">
        <div className="panel span7"><h2>ประเด็นอ่อนไหว</h2>
          <div className="tbl-wrap"><table>
            <thead><tr><th>ประเด็น</th><th>ระดับ</th><th>EP</th><th>วิว/EP</th><th>คอมเม้น/1k วิว</th></tr></thead>
            <tbody>{sens.map((s) =>
              <tr key={s.t} className="click" tabIndex={0} onClick={() => open(`EP ที่มีประเด็น ${s.t}`, <EpList eps={s.eps} />)}>
                <td>{s.t}</td><td><span className={"chip " + (s.lv === "สูง" ? "warn" : "")}>{s.lv}</span></td><td>{s.n}</td><td>{views(s.v)}</td><td>{s.cr.toFixed(1)}</td>
              </tr>)}</tbody>
          </table></div>
          <p className="cap">กดแถวเพื่อดูรายชื่อ EP · ประเด็นมาจากการอ่านชื่อคลิปและคอมเม้นยอดนิยม อาจไม่ครบทุกฉาก</p>
        </div>
        <div className="panel span5"><h2>EP ที่ลงได้ในแต่ละหมวด</h2>
          <div className="bars">{cats.map((c) =>
            <div key={c.c} className="bar-row" tabIndex={0} {...tip(`${c.c}: ลงได้ ${c.ok} จาก ${c.all} EP`)}>
              <span className="lbl">{c.c}</span>
              <div className="track"><div className="fill" style={{ width: `${(c.ok / c.all) * 100}%`, background: "var(--accent)" }} /></div>
              <span className="val">{`${c.ok}/${c.all}`}</span>
            </div>)}</div>
        </div>
      </div>
      <p className="note">ระดับความอ่อนไหวเป็นข้อเสนอของทีมข้อมูล แบรนด์ควรเป็นคนตัดสินเองว่ารับประเด็นไหนได้</p>
      <Limits keys={["tags", "fewEps", "age18"]} />
    </div>
  );
}

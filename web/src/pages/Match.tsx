import { D, type Gen, type Loyalty } from "../data";
import { useDetails } from "../components/details";
import { GenAccuracy, Limits, QBtn, Tile, YearChip } from "../components/ui";
import { GCOL, GEN_NOTE, GENS, SENSITIVE, tagRows } from "../lib/constants";
import { fmt, genShort, heatFill, pct, x2 } from "../lib/format";
import { useKept } from "../lib/kept";
import { NetPanel } from "./Network";

const LiftCell = ({ v }: { v: number }) => <td className="cell num" style={{ background: heatFill(v, 1.12) }}>{x2(v)}</td>;

// 1) Brand match: which category / subtopic over-indexes for a Gen
export default function Match() {
  const det = useDetails();
  const [MG, setMG] = useKept<Gen>("match.gen", "Gen Y");
  const o = D.overall;
  const cats = [...D.categories].sort((a, b) => b.gen_lift[MG] - a.gen_lift[MG]);
  const tags = tagRows().filter((t) => t.gen_lift).sort((a, b) => b.gen_lift[MG] - a.gen_lift[MG]);
  const best = cats[0], bestTag = tags[0];
  const gl = D.gen_x_loy[MG];
  const mainLoy = (Object.entries(gl) as [Loyalty, number][]).sort((a, b) => b[1] - a[1])[0][0];
  const liftHead = GENS.map((g) => <th key={g} className={g === MG ? "sel" : undefined}>{genShort(g) + " lift"}</th>);
  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">เป้าหมาย 1 · จับคู่แบรนด์กับคอนเทนต์</span><h1>แบรนด์อยากได้ Gen ไหน ลงหมวดไหนดี</h1></div>
        <div className="head-r"><YearChip /></div></div>
      <div className="callout"><b>อ่านก่อนใช้: </b>วัยของคนดูแต่ละหมวดต่างกันไม่มาก (สูงสุดราว ±10%) ใช้เป็นตัวช่วยเท่านั้น สิ่งที่แยกคนดูได้ชัดกว่าคือ <a href="#audience">สายความสนใจ</a> ซึ่งต่างกันได้ถึง 3 เท่า เช่น คนสายดราม่าคนดังแทบไม่คอมเม้นเรื่องครอบครัว</div>
      <div className="fbar"><span className="flabel">กลุ่มเป้าหมาย</span>
        <div className="seg">{GENS.map((g) => <button key={g} type="button" aria-pressed={MG === g} onClick={() => setMG(g)}><i className="dot" style={{ background: GCOL[g] }} />{g}</button>)}</div>
        <QBtn word="Gen" label="Gen คืออะไร" /></div>
      <div className="tiles">
        <Tile label={`${MG} ในภาพรวม`} value={pct(o.gen_pct[MG])} delta={[`ช่วงที่น่าจะเป็น ${o.gen_ci[MG][0]}–${o.gen_ci[MG][1]}%`, ""]} />
        <Tile label="หมวดอันดับ 1" value={best.name} delta={[`${MG} ${pct(best.gen[MG])} · ${x2(best.gen_lift[MG])} ของปกติ`, best.gen_lift[MG] >= 1.03 ? "up" : ""]} />
        <Tile label="ประเด็นอันดับ 1" value={bestTag.tag} delta={[`${MG} ${pct(bestTag.gen[MG])} · ${x2(bestTag.gen_lift[MG])} ของปกติ`, bestTag.gen_lift[MG] >= 1.03 ? "up" : ""]} />
        <Tile label="กลุ่มนี้ส่วนใหญ่เป็น" value={mainLoy} delta={[`${fmt(Object.values(gl).reduce((s, v) => s + v, 0))} คนโดยประมาณ`, ""]} />
      </div>
      <p className="note">{GEN_NOTE}</p>
      <div className="dgrid"><NetPanel gen={MG} /></div>
      <div className="dgrid">
        <div className="panel span5">
          <div className="panel-head"><h2>หมวด × Gen</h2><span className="cap">{`เรียงตาม ${MG} · +4% = มากกว่าภาพรวม 4%`}</span></div>
          <div className="tbl-wrap"><table className="heat">
            <thead><tr><th style={{ textAlign: "left" }}>หมวด</th><th>{`${genShort(MG)} %`}</th>{liftHead}</tr></thead>
            <tbody>{cats.map((c) => <tr key={c.name} className="click" tabIndex={0} onClick={() => det.cat(c)}>
              <td style={{ textAlign: "left" }}>{c.name}</td><td className="num">{pct(c.gen[MG])}</td>{GENS.map((g) => <LiftCell key={g} v={c.gen_lift[g]} />)}</tr>)}</tbody>
          </table></div>
        </div>
        <div className="panel span7">
          <div className="panel-head"><h2>ประเด็นย่อย × Gen</h2><span className="cap">ประเด็นที่มีตั้งแต่ 3 EP</span></div>
          <div className="tbl-wrap scrolly"><table className="heat">
            <thead><tr><th style={{ textAlign: "left" }}>ประเด็น</th><th>EP</th><th>{`${genShort(MG)} %`}</th>{liftHead}</tr></thead>
            <tbody>{tags.map((t) => <tr key={t.tag}>
              <td style={{ textAlign: "left" }}>{t.tag}{SENSITIVE[t.tag] ? <span className="chip warn" style={{ marginLeft: 6 }}>อ่อนไหว</span> : null}</td>
              <td className="num">{t.eps}</td><td className="num">{pct(t.gen[MG])}</td>{GENS.map((g) => <LiftCell key={g} v={t.gen_lift[g]} />)}</tr>)}</tbody>
          </table></div>
        </div>
      </div>
      <p className="note">ความต่างระหว่างหมวดมีขนาดเล็ก (×0.86–×1.08) ใช้บอกทิศทางว่าหมวดไหนเอียงไปทาง Gen ใด ไม่ใช่ตัวเลขชี้ขาด</p>
      <GenAccuracy />
      <Limits keys={["genEstimate", "genBias", "commenters", "age18"]} />
    </div>
  );
}


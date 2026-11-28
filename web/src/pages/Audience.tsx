import { D } from "../data";
import { useDetails } from "../components/details";
import { useModal, useTip } from "../components/overlay";
import { Limits, Tile } from "../components/ui";
import { GCOL, GENS, LOY } from "../lib/constants";
import { fmt, heatFill, pct, x2 } from "../lib/format";

export default function Audience() {
  const tip = useTip();
  const det = useDetails();
  const { gloss } = useModal();
  const o = D.overall;
  const cats = D.categories.map((c) => c.name);
  const gx = D.gen_x_loy, gmax = Math.max(...GENS.flatMap((g) => LOY.map((l) => gx[g][l])));
  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">คนดู</span><h1>ใครคอมเม้น และชอบอะไร</h1></div>
        <button className="linkbtn small" type="button" onClick={() => gloss("แฟนตัวยง")}>นิยามกลุ่ม</button></div>
      <div className="tiles">
        <Tile label="คนคอมเม้น" value={fmt(D.n_people)} help="คนคอมเม้น" />
        <Tile label="แฟนตัวยง" value={fmt(o.loyalty_people["แฟนตัวยง"])} delta={[`${pct(o.loyalty_pct["แฟนตัวยง"])} ของคน · เขียน ${pct(o.comments_by_loyalty["แฟนตัวยง"])} ของคอมเม้น`, "up"]} help="แฟนตัวยง" />
        <Tile label="ขาจร" value={fmt(o.loyalty_people["ขาจร"])} delta={[`${pct(o.loyalty_pct["ขาจร"])} ของคน · เขียน ${pct(o.comments_by_loyalty["ขาจร"])}`, ""]} help="ขาจร" />
        <Tile label="Gen ที่มากสุด" value={"Gen Y " + pct(o.gen_pct["Gen Y"])} delta={[`ช่วงที่น่าจะเป็น ${o.gen_ci["Gen Y"][0]}–${o.gen_ci["Gen Y"][1]}%`, ""]} help="Gen" />
        <Tile label="ขาประจำที่จัดสายได้" value={fmt(D.comm_n)} delta={["คอมเม้นตั้งแต่ 3 EP", ""]} help="สายความสนใจ" />
      </div>
      <div className="dgrid">
        <div className="panel span6">
          <div className="panel-head"><h2>คน vs คอมเม้น</h2><span className="cap">แต่ละกลุ่มมีคนกี่ % และเขียนคอมเม้นกี่ %</span></div>
          <div className="pairs">{LOY.map((l) =>
            <button key={l} type="button" className="pair" onClick={() => det.loyalty(l)}>
              <span className="pl">{l}</span>
              <div className="pb"><div className="track"><div className="fill" style={{ width: `${o.loyalty_pct[l]}%`, background: "var(--l3)" }} /></div><span className="num cap">{"คน " + pct(o.loyalty_pct[l])}</span></div>
              <div className="pb"><div className="track"><div className="fill" style={{ width: `${o.comments_by_loyalty[l]}%`, background: "var(--accent)" }} /></div><span className="num cap">{"คอมเม้น " + pct(o.comments_by_loyalty[l])}</span></div>
            </button>)}</div>
          <p className="cap">กดชื่อกลุ่มเพื่อดูรายละเอียด</p>
        </div>
        <div className="panel span6">
          <div className="panel-head"><h2>วัย × ความภักดี</h2><span className="cap">จำนวนคนโดยประมาณ</span></div>
          <div className="tbl-wrap"><table className="heat">
            <thead><tr><th></th>{LOY.map((l) => <th key={l}>{l}</th>)}</tr></thead>
            <tbody>{GENS.map((g) => <tr key={g}><td><i className="dot" style={{ background: GCOL[g] }} />{g}</td>
              {LOY.map((l) => { const v = gx[g][l]; return <td key={l} className="cell" style={{ background: `color-mix(in srgb, var(--accent) ${Math.round((v / gmax) * 70)}%, var(--surface))` }} {...tip(`${g} ที่เป็น${l} ราว ${fmt(v)} คน`)}>{fmt(v)}</td>; })}
            </tr>)}</tbody>
          </table></div>
          <p className="cap">Gen Z ส่วนใหญ่เป็นขาจร แฟนตัวยงเกือบทั้งหมดเป็น Gen Y และ X ขึ้นไป</p>
        </div>
        <div className="panel span12">
          <div className="panel-head"><h2>4 สายความสนใจ × หมวด</h2><span className="cap">คอมเม้นหมวดนั้นกี่เท่าของที่ออกอากาศ · แดง = มากกว่า น้ำเงิน = น้อยกว่า · กดชื่อสาย</span></div>
          <div className="tbl-wrap"><table className="heat">
            <thead><tr><th>สาย</th><th>คน</th>{cats.map((c) => <th key={c} className="rot"><span>{c}</span></th>)}</tr></thead>
            <tbody>{D.communities.map((c) => <tr key={c.name}>
              <td><button type="button" className="linkbtn" onClick={() => det.sai(c)}>{c.name}</button></td><td>{fmt(c.people)}</td>
              {cats.map((k) => { const v = c.lift[k]; const strong = Math.abs(Math.log(v)) > 0.55;
                return <td key={k} className="cell" style={{ background: heatFill(v, 3), ...(strong ? { color: "var(--bg)", fontWeight: 600 } : {}) }} {...tip(`${c.name} คอมเม้น${k} ${x2(v)} ของที่ออกอากาศ`)}>{x2(v)}</td>; })}
            </tr>)}</tbody>
          </table></div>
          <p className="cap">สายเป็นแนวโน้ม คนส่วนใหญ่ดูหลายเรื่องปนกัน</p>
        </div>
      </div>
      <Limits keys={["sai", "genEstimate", "genBias", "commenters"]} />
    </div>
  );
}

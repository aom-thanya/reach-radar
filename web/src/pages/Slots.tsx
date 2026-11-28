import { D } from "../data";
import { Limits, Thumb, Tile } from "../components/ui";
import { epByNum } from "../lib/constants";
import { TH_M, median, views } from "../lib/format";

const Bar = ({ v, col }: { v: number; col: string }) => (
  <span className="inbar wide"><i style={{ width: `${(Math.min(v, 1.6) / 1.6) * 100}%`, background: col }} /></span>
);
const epDate = (ep: number) => epByNum(ep)?.date || "";
const dShort = (d: string) => (d ? +d.slice(8, 10) + " " + TH_M[+d.slice(5, 7) - 1] : "–");

// 3) Slot pricing: series parts
export default function Slots() {
  const sp = D.series_parts;
  const byPart = (k: "v1" | "c1", p: number) => median(sp.filter((s) => (p === 3 ? s.part >= 3 : s.part === p)).map((s) => s[k]));
  const v2 = byPart("v1", 2), c2 = byPart("c1", 2), v3 = byPart("v1", 3), c3 = byPart("c1", 3);
  const series = [...new Set(sp.map((s) => s.series))]
    .map((n) => ({ n, parts: sp.filter((s) => s.series === n).sort((a, b) => a.part - b.part) }))
    .sort((a, b) => b.parts[0].views - a.parts[0].views);
  const exc = series.filter((s) => s.parts.some((p) => p.part > 1 && p.v1 > 1));
  const sRange = (s: (typeof series)[number]) => {
    const ds = s.parts.map((x) => epDate(x.ep)).filter(Boolean).sort();
    if (!ds.length) return "";
    const a = ds[0], b = ds[ds.length - 1];
    return "ออนแอร์ " + (a === b ? dShort(a) : dShort(a) + " – " + dShort(b)) + " " + (+a.slice(0, 4) + 543);
  };
  return (
    <div className="page">
      <div className="dash-head"><div><span className="eyebrow">เป้าหมาย 2 · ตั้งราคา Slot</span><h1>ตอนไหนมีมูลค่าสูง</h1></div></div>
      <div className="tiles">
        <Tile label="วิวซีรีส์ ต่อ EP" value={views(D.series_views)} delta={[`เรื่องเดียวจบ ${views(D.single_views)} (×${(D.series_views / D.single_views).toFixed(2)})`, "up"]} />
        <Tile label="ตอนที่ 2 เทียบตอนแรก" value={Math.round(v2 * 100) + "% วิว"} delta={[`คอมเม้น ${Math.round(c2 * 100)}%`, "down"]} />
        <Tile label="ตอนที่ 3+ เทียบตอนแรก" value={Math.round(v3 * 100) + "% วิว"} delta={[`คอมเม้น ${Math.round(c3 * 100)}%`, "down"]} />
        <Tile label="ซีรีส์ที่ตอนหลังแรงกว่า" value={String(exc.length)} delta={["ส่วนใหญ่มีคู่กรณีมาเผชิญหน้า", ""]} />
      </div>
      <div className="dgrid">
        <div className="panel span12">
          <div className="panel-head"><h2>{`${series.length} ซีรีส์ ปี 2569`}</h2><span className="cap">แต่ละตอนเทียบกับตอนแรก (100%) · แท่งน้ำเงิน = วิว · แท่งส้ม = คอมเม้น</span></div>
          <div className="tbl-wrap"><table>
            <thead><tr><th>ซีรีส์</th><th>ตอน</th><th>EP</th><th style={{ textAlign: "left" }}>ออนแอร์</th><th>วิว</th><th style={{ textAlign: "left" }}>วิว เทียบตอนแรก</th><th style={{ textAlign: "left" }}>คอมเม้น เทียบตอนแรก</th></tr></thead>
            <tbody>{series.flatMap((s) => s.parts.map((p, i) =>
              <tr key={s.n + p.ep} className={p.part > 1 && p.v1 > 1 ? "hl" : undefined}>
                <td>{i === 0 ? <><b>{s.n}</b><span className="cap sub">{sRange(s)}</span></> : ""}</td>
                <td>{p.part}</td>
                <td className="eptitle"><Thumb vid={epByNum(p.ep)?.vid} />{"EP." + p.ep}</td>
                <td style={{ textAlign: "left" }} className="nowrap">{dShort(epDate(p.ep))}</td>
                <td>{views(p.views)}</td>
                <td style={{ textAlign: "left" }}><Bar v={p.v1} col="var(--accent)" />{Math.round(p.v1 * 100) + "%"}</td>
                <td style={{ textAlign: "left" }}><Bar v={p.c1} col="var(--up)" />{Math.round(p.c1 * 100) + "%"}</td>
              </tr>))}</tbody>
          </table></div>
          <p className="cap">แถวที่ไฮไลต์ = ตอนหลังได้วิวมากกว่าตอนแรก</p>
        </div>
      </div>
      <p className="note">ข้อเสนอขาย: ตั้งราคาตอนแรกของซีรีส์สูงสุด ขายตอนต่อไปเป็นแพ็กเกจลดราคา ยกเว้นตอนที่รู้ล่วงหน้าว่าคู่กรณีจะมาเผชิญหน้ากัน</p>
      <Limits keys={["asOf", "commenters", "missing"]} />
    </div>
  );
}

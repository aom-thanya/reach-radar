import { D } from "../data";
import { Bars, Limits } from "../components/ui";
import { fmt } from "../lib/format";

const wrap = { textAlign: "left", whiteSpace: "normal" } as const;

export default function Brands() {
  const bc = D.brands_comments.filter((b) => b.comments > 0), zero = D.brands_comments.filter((b) => b.comments === 0);
  const total = D.brands_comments.reduce((s, b) => s + b.comments, 0);
  const onair = D.brands_onair || [];
  return (
    <div className="page">
      <div className="page-head"><span className="eyebrow">แบรนด์</span><h1>แบรนด์ในรายการ คนพูดถึงไหม</h1>
        <p className="lead">ดูจากสองที่ คือคอมเม้นของคนดู และคำพูดของพิธีกรในรายการ (ข้อความถอดเสียงจาก YouTube)</p></div>
      <div className="grid g2">
        <div className="panel"><h2>คนดูพูดถึงแบรนด์ไหน</h2>
          <p className="small muted">{`รวม ${fmt(total)} คอมเม้น จาก ${fmt(D.n_comments)} คอมเม้นทั้งหมด`}</p>
          <Bars rows={bc.map((b) => ({ label: b.brand.replace(" (แชมพูพี่หนุ่ม)", ""), value: b.comments, color: "var(--accent)", tip: `${b.brand}: ${b.comments} คอมเม้น ใน ${b.eps} EP` }))} fmtv={(v) => fmt(v) + " ครั้ง"} />
          {zero.length ? <p className="small muted">{"ไม่มีคนพูดถึงเลย: " + zero.map((b) => b.brand).join(", ")}</p> : null}
        </div>
        <div className="panel">
          <div className="panel-head"><h2>พิธีกรพูดชื่อแบรนด์ไหน</h2><span className="chip warn">{`ตรวจแล้ว ${D.onair_eps} จาก ${D.n_eps} EP`}</span></div>
          <p className="small muted">จำนวน EP ที่ได้ยินชื่อ ส่วนใหญ่อยู่ในช่วงมอบของให้แขกท้ายรายการ</p>
          {onair.length ? <Bars rows={onair.map((b) => ({ label: b.brand, value: b.eps, color: "var(--ink-2)", tip: `${b.brand}: ${b.eps} EP จาก ${D.onair_eps} EP ที่ตรวจ` }))} max={D.onair_eps} fmtv={(v) => `${v} EP`} />
            : <p className="muted">ยังไม่มีข้อมูล</p>}
          <p className="small muted">กำลังดึงข้อความถอดเสียงเพิ่ม ตัวเลขจะครบเมื่อดึงครบทุก EP</p>
        </div>
      </div>
      <div className="panel"><h2>รูปแบบโฆษณาไหน คนพูดถึง</h2>
        <div className="tbl-wrap"><table>
          <thead><tr><th>รูปแบบ</th><th style={{ textAlign: "left" }}>ตัวอย่างแบรนด์</th><th style={{ textAlign: "left" }}>คนพูดถึงไหม</th></tr></thead>
          <tbody>
            <tr><td><b>พิธีกรใช้หรือยื่นสินค้าบนจอ</b></td><td style={wrap}>M150, หงส์ไทย, ไลโอ</td><td style={wrap}><span className="chip good">พูดถึงมากที่สุด</span> แซวพิธีกรกับแขก บางคนบอกว่าซื้อแล้ว</td></tr>
            <tr><td><b>อ่านชื่อช่วงมอบของ</b></td><td style={wrap}>วิซี, ฮาชิ GD Plus</td><td style={wrap}><span className="chip warn">พูดถึงน้อย</span> วิซีถูกอ่านชื่อบ่อยแต่ไม่มีคอมเม้นถึงเลย</td></tr>
            <tr><td><b>ไม่ปรากฏในเนื้อรายการ</b></td><td style={wrap}>{zero.filter((b) => b.brand !== "วิซี").map((b) => b.brand.replace(" (นิสิต)", "")).join(", ")}</td><td style={wrap}><span className="chip">ไม่พบ</span> น่าจะอยู่แค่ช่วงโฆษณาคั่น ต้องเช็กกับตารางสปอนเซอร์</td></tr>
          </tbody>
        </table></div>
      </div>
      <div className="grid g2">
        <div className="panel"><span className="chip hot" style={{ justifySelf: "start" }}>ข้อเสนอขาย</span><h3>ขายแพ็กเกจ 'พิธีกรใช้สินค้า' คู่กับ Slot ปกติ</h3>
          <p className="small muted">สินค้าที่อยู่ในเนื้อเรื่องถูกจำและถูกพูดต่อ ส่วนการอ่านชื่ออย่างเดียวคนแทบไม่พูดถึง</p></div>
        <div className="panel"><span className="chip warn" style={{ justifySelf: "start" }}>สัญญาณเตือน</span><h3>คนบ่นโฆษณา YouTube คั่นบ่อย</h3>
          <p className="small muted">มีคอมเม้นบ่นเรื่องโฆษณาคั่นหลายร้อยครั้ง การเพิ่มโฆษณาคั่นอาจทำให้คนดูเบื่อ การฝังสินค้าในเนื้อเรื่องน่าจะดีกว่า</p></div>
      </div>
      <p className="note">คอมเม้นที่พูดถึงแบรนด์ไม่ใช่ยอดขาย ใช้ดูแค่ว่าคนสังเกตเห็นสินค้าไหม ตัวเลขน้อยเกินกว่าจะแยกตามสายหรือวัยได้</p>
      <Limits keys={["commenters", "conv"]} />
    </div>
  );
}

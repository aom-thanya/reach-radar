// "Process ทำงานอย่างไร": a 3-step picture of what each method does to the data, per #models topic.
// Real values where they are public aggregates or public EP titles; comment-like snippets are marked as invented examples.
import type { CSSProperties, ReactNode } from "react";
import { D } from "../data";
import { fmt } from "../lib/format";
import { SHORT } from "./data";

export interface HowStep { v: ReactNode; t: string }

const Chip = ({ c, children, ghost }: { c?: string; children: ReactNode; ghost?: boolean }) =>
  <span className={"hw-chip" + (ghost ? " ghost" : "")} style={c ? ({ "--c": c } as CSSProperties) : undefined}>{children}</span>;
const Code = ({ children }: { children: ReactNode }) => <code className="hw-code">{children}</code>;
const Row = ({ children }: { children: ReactNode }) => <div className="hw-row">{children}</div>;
const Bars = ({ rows, max }: { rows: [string, number, string][]; max?: number }) => {
  const m = max ?? Math.max(...rows.map((r) => r[1]));
  return <div className="hw-bars">{rows.map(([l, v, c]) => <div key={l}><span>{l}</span><i style={{ width: `${(v / m) * 100}%`, background: c }} /><b>{v}</b></div>)}</div>;
};

const C = { a: "var(--m-c0)", b: "var(--m-c1)", c: "var(--m-c2)", d: "var(--m-c3)", k: "var(--k)", dim: "var(--m-dim)", bad: "var(--m-bad)" };
const G = { z: "var(--gz)", y: "var(--gy)", x: "var(--gx)" };

/* tiny SVG scenes in a 160 × 90 box */
export function KMeansMini({ phase }: { phase: 0 | 1 | 2 }) {
  let s = 4; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const centers = [[40, 30], [120, 28], [45, 70], [118, 68]];
  const pts = Array.from({ length: 32 }, (_, i) => { const c = centers[i % 4]; return { x: c[0] + (r() - 0.5) * 46, y: c[1] + (r() - 0.5) * 30, g: i % 4 }; });
  const start = [[70, 40], [90, 45], [80, 60], [100, 30]];
  const cen = phase === 2 ? centers : start;
  const col = [C.a, C.b, C.c, C.d];
  return <svg viewBox="0 0 160 90" className="hw-svg">
    {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={phase === 0 ? "var(--m-dim)" : col[p.g]} />)}
    {cen.map((c, i) => <g key={i} className="hw-cen" style={{ transform: `translate(${c[0]}px,${c[1]}px)` }}><path d="M-5 -5L5 5M5 -5L-5 5" stroke={col[i]} strokeWidth={3} /></g>)}
  </svg>;
}
export function MergeMini({ phase }: { phase: 0 | 1 | 2 }) {
  const P = [[20, 25], [45, 15], [40, 45], [75, 30], [100, 20], [95, 55], [125, 40], [140, 70], [60, 72], [110, 78]];
  const E = [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6], [6, 7], [5, 9], [2, 8], [8, 9], [7, 9], [1, 4]];
  const grp = phase === 0 ? P.map((_, i) => i) : phase === 1 ? [0, 0, 0, 1, 1, 2, 2, 3, 4, 3] : [0, 0, 0, 0, 1, 1, 1, 1, 0, 1];
  const col = [C.a, C.b, C.c, C.d, "var(--gz)", "var(--gy)", "var(--gx)", C.k, C.bad, "var(--ink-3)"];
  return <svg viewBox="0 0 160 90" className="hw-svg">{E.map(([a, b], i) => <line key={i} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} stroke="var(--m-dim)" strokeWidth={1.4} />)}
    {P.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={col[grp[i] % col.length]} stroke="var(--surface)" strokeWidth={1.5} />)}</svg>;
}
function VennMini({ a, b, j }: { a: string; b: string; j: string }) {
  return <svg viewBox="0 0 160 90" className="hw-svg"><circle cx={62} cy={45} r={34} fill="var(--m-c0)" fillOpacity={0.35} /><circle cx={100} cy={45} r={30} fill="var(--m-c1)" fillOpacity={0.35} />
    <text x={44} y={48} className="hw-t" textAnchor="middle">{a}</text><text x={118} y={48} className="hw-t" textAnchor="middle">{b}</text><text x={81} y={49} className="hw-t b" textAnchor="middle">{j}</text></svg>;
}

/* real numbers used below */
const drama = D.categories.find((c) => c.name === "ดราม่าบุคคลสาธารณะ")!;
const fam = D.categories.find((c) => c.name === "ครอบครัว & ความสัมพันธ์")!, crime = D.categories.find((c) => c.name === "อาชญากรรม & การหลอกลวง")!;
const J = 0.1713, inter = Math.round((J * (fam.people + crime.people)) / (1 + J)), uni = fam.people + crime.people - inter;

export const HOW: Record<string, HowStep[]> = {
  "ทำไมต้องใช้ Network": [
    { v: <div className="hw-tbl"><div><Chip c={C.dim}>EP.2101</Chip> 4,459 คอมเม้น</div><div><Chip c={C.dim}>EP.2104</Chip> 1,906 คอมเม้น</div></div>, t: "แบบเดิม: 1 แถว = 1 ตอน รู้แค่ยอดรวมของแต่ละตอน" },
    { v: <MergeMini phase={0} />, t: "แบบ Network: คน 1 คน = 1 จุด ลากเส้นไปทุกตอนที่เขาคอมเม้น" },
    { v: <VennMini a="ครอบครัว" b="อาชญากรรม" j={`${Math.round(inter / 1000)}k`} />, t: "เห็นคนที่ดูหลายหมวด จึงวัดการซ้อน การแย่งคน และกลุ่มคนได้" },
  ],
  "รายชื่อ EP ปี 2026": [
    { v: <Code>คุยข้ามปี!! คดีที่จบจากรายการแต่ยังค้างคาใจ l EP.2099 l 1 ม.ค.69 l#โหนกระแส</Code>, t: "ชื่อคลิปดิบ 1 เรื่อง เป็นข้อความยาวก้อนเดียว" },
    { v: <Row><Chip c={C.a}>คุยข้ามปี!! คดีที่จบ…</Chip><Chip c={C.b}>EP.2099</Chip><Chip c={C.c}>1 ม.ค.69</Chip><Chip ghost>#โหนกระแส</Chip></Row>, t: "regex หาแพทเทิร์น \"EP.ตัวเลข\" และ \"วัน เดือนไทย ปี\" แล้วตัดออกเป็นชิ้น" },
    { v: <Row><Chip c={C.b}>ep = 2099</Chip><Chip c={C.c}>date = 2026-01-01</Chip><Chip c={C.d}>ปี 69 ✓ เก็บ</Chip></Row>, t: "แปลงเป็นช่องในตาราง เก็บเฉพาะคลิปปี 69 ได้ 227 แถว" },
  ],
  "ดึงคอมเม้นและ reply": [
    { v: <Code>youtube.com/watch?v=3U1vxXPnMO8</Code>, t: "เปิดหน้าคลิปทีละ EP จากรายชื่อขั้นก่อน" },
    { v: <Row><Chip c={C.a}>หน้า 1</Chip><span className="hw-ar">→</span><Chip c={C.a}>หน้า 2</Chip><span className="hw-ar">→</span><Chip c={C.a}>…</Chip><Chip ghost>พัก 2–5 วิ</Chip></Row>, t: "ไล่โหลดคอมเม้นและ reply ทีละชุดจนหมด แล้วพักก่อนไปคลิปถัดไป" },
    { v: <Code>{"{cid, text, author, channel, votes, time, reply, …}"}<br />{"{cid, text, author, channel, votes, time, reply, …}"}</Code>, t: "เขียน 1 คอมเม้นเป็น 1 บรรทัดในไฟล์ (ข้อมูลจริงเก็บในเครื่อง)" },
  ],
  "ระบุตัวคน (Entity resolution)": [
    { v: <div className="hw-tbl"><div><Chip c={C.a}>UC•••a1</Chip> คอมเม้น EP.2099</div><div><Chip c={C.b}>UC•••7f</Chip> คอมเม้น EP.2099</div><div><Chip c={C.a}>UC•••a1</Chip> คอมเม้น EP.2101</div></div>, t: "3 แถวคอมเม้น แต่ละแถวมี channel id ของคนเขียน" },
    { v: <Row><Chip c={C.a}>UC•••a1 → 2 แถว</Chip><Chip c={C.b}>UC•••7f → 1 แถว</Chip></Row>, t: "จับกลุ่มแถวที่ channel id เดียวกัน (ระยะ 0 = คนเดียวกัน)" },
    { v: <Row><Chip c={C.a}>👤 คน 1</Chip><Chip c={C.b}>👤 คน 2</Chip><Chip c={C.bad}>✕ คนแปะข้อความซ้ำ ≥3 EP</Chip></Row>, t: "ได้ 1 แถวต่อคน และตัดบัญชีที่แปะข้อความเดิมซ้ำ (10 บัญชี)" },
  ],
  "รูปร่างข้อมูลรายคน": [
    { v: <Row>{[1, 1, 1, 2, 4, 9, 1, 1].map((x, i) => <Chip key={i} c={C.dim}>{x}</Chip>)}</Row>, t: "จำนวน EP ที่แต่ละคนมาคอมเม้น (ตัวอย่างสมมติ 8 คน)" },
    { v: <Row>{[1, 1, 1, 1, 1, 2, 4, 9].map((x, i) => <Chip key={i} c={i === 3 || i === 4 ? C.k : C.dim}>{x}</Chip>)}<span className="hw-ar">→ median = 1</span></Row>, t: "เรียงจากน้อยไปมาก ค่ากลางคือ 1 ไม่ถูกคนที่มา 9 ครั้งดึงขึ้น" },
    { v: <Bars rows={[["1 EP", 64, C.a], ["2 EP", 16, C.a], ["3–5", 13, C.a], ["6+", 7, C.b]]} />, t: "แบ่งช่วงแล้วนับ % ของคนจริงทั้ง 281,073 คน" },
  ],
  "จัดหมวด EP": [
    { v: <Code>อุ้มท้องร้องขอความเป็นธรรม เมียจับได้ผัวทหารเป็นชู้กับครูสาว</Code>, t: "ชื่อคลิป 1 เรื่อง + นิยามของ 10 หมวดที่คนเขียนไว้" },
    { v: <div className="hw-nn"><i /><i /><i /><span>→</span><i /><i /><i /><i /><span>→</span><i /><i /></div>, t: "Neural Network (LLM) อ่านทั้งประโยคแล้วเทียบกับนิยามแต่ละหมวด" },
    { v: <Row><Chip c={C.c}>{SHORT["ครอบครัว & ความสัมพันธ์"]}</Chip><Chip ghost>ไม่ใช่: อาชญากรรม · ดราม่า · …</Chip></Row>, t: "เลือกได้ 1 หมวด แล้วสุ่มตรวจกับที่คนจัด 39 EP (ตรง 34)" },
  ],
  "ติดแท็กประเด็นย่อย": [
    { v: <Code>คดีดังแต่ไม่คืบ! กรณีนักเรียนหญิงโดนรถชน เสียชีวิต 3 ศพ</Code>, t: "ชื่อคลิป 1 เรื่อง" },
    { v: <Row>{["รถ/ถนน ✓", "มีคนเสียชีวิต ✓", "เด็ก ✓", "เงิน/โกง ✕", "ชู้สาว ✕", "…"].map((x) => <Chip key={x} c={x.includes("✓") ? C.k : undefined} ghost={!x.includes("✓")}>{x}</Chip>)}</Row>, t: "ถามทีละแท็กจาก 22 แท็กว่าเรื่องนี้เกี่ยวไหม" },
    { v: <Row><Chip c={C.k}>รถ/ถนน</Chip><Chip c={C.k}>มีคนเสียชีวิต</Chip><Chip c={C.k}>เด็ก</Chip></Row>, t: "1 EP ได้หลายแท็ก (multi-label)" },
  ],
  "Label คนจากชุดตัวอย่าง": [
    { v: <Code>"<mark>ป้า</mark>ดูรายการนี้ทุกเย็นเลยจ้า"</Code>, t: "ข้อความของคนที่สุ่มมา 1 คน (ตัวอย่างสมมติ)" },
    { v: <Row><Chip c={C.k}>คำว่า "ป้า" = วัยกลางคนขึ้นไป</Chip><Chip ghost>ไม่มีสัญญาณ → ไม่ระบุ</Chip></Row>, t: "Neural Network (LLM) หาสัญญาณอายุในข้อความ" },
    { v: <Row><Chip c={G.x}>Gen X+</Chip><span className="hw-ar">แล้วเทียบเฉลย</span><Chip c={C.d}>แม่น 69%</Chip></Row>, t: "ติดป้าย และวัดความแม่นกับคนที่รู้อายุจริง (blind test)" },
  ],
  "ประเมิน Gen ทุกคน": [
    { v: <Row>{["ป้าด", "้าดู", "ดูร", "ูรา", "ทุก", "เย็น"].map((x) => <Chip key={x} c={C.dim}>{x}</Chip>)}</Row>, t: "TF-IDF: ตัดข้อความเป็นชิ้นตัวอักษร 2–4 ตัว แล้วให้น้ำหนักชิ้นที่หายาก" },
    { v: <Code>score(Gen) = Σ น้ำหนัก × ชิ้นตัวอักษร<br />แปลงเป็นความน่าจะเป็น (softmax)</Code>, t: "Logistic Regression เรียนน้ำหนักจากป้าย 425 คน" },
    { v: <Bars rows={[["Z", 12, G.z], ["Y", 33, G.y], ["X+", 55, G.x]]} max={60} />, t: "ได้ความน่าจะเป็นต่อคน (ตัวอย่าง) รวมทุกคนแล้ว bootstrap หาช่วง 95%" },
  ],
  "สายคนดู": [
    { v: <KMeansMini phase={0} />, t: "แต่ละคนเป็น 1 จุด (ความสนใจ 10 หมวด) วางจุดศูนย์กลาง 4 จุดแบบสุ่ม" },
    { v: <KMeansMini phase={1} />, t: "ทุกคนเข้ากลุ่มของจุดศูนย์กลางที่ใกล้ที่สุด" },
    { v: <KMeansMini phase={2} />, t: "ย้ายจุดศูนย์กลางไปกลางกลุ่ม ทำซ้ำจนนิ่ง ได้ 4 สาย" },
  ],
  "เครือข่ายประเด็นย่อย รอบแรก": [
    { v: <MergeMini phase={0} />, t: "เริ่มให้ทุกแท็กอยู่คนละกลุ่ม" },
    { v: <MergeMini phase={1} />, t: "รวมแท็กที่เชื่อมกันแน่นทีละขั้น ถ้ารวมแล้ว modularity สูงขึ้น" },
    { v: <MergeMini phase={2} />, t: "จนรวมต่อไม่ดีขึ้น · ได้ modularity แค่ 0.09 จึงถือว่าไม่มีก้อนจริง" },
  ],
  "เครือข่ายหมวด ↔ หมวด": [
    { v: <VennMini a={`${Math.round(fam.people / 1000)}k`} b={`${Math.round(crime.people / 1000)}k`} j={`${Math.round(inter / 1000)}k`} />, t: "คนที่คอมเม้นหมวดครอบครัว กับหมวดอาชญากรรม และคนที่ซ้อนกัน" },
    { v: <Code>Jaccard = คนซ้อน ÷ คนรวม<br />= {fmt(inter)} ÷ {fmt(uni)} = 0.17</Code>, t: "คิดความคล้ายของทุกคู่หมวด ได้ 45 เส้น" },
    { v: <MergeMini phase={2} />, t: "ใช้ความคล้ายเป็นน้ำหนักเส้น แล้วรวมกลุ่มทีละขั้น ได้ 2 ก้อน" },
    { v: <Code>strength = ผลรวม Jaccard ทุกเส้น<br />อาชญากรรม 1.12 · ข้อพิพาท 1.09</Code>, t: "Centrality: ศูนย์กลางคืออาชญากรรม · สะพานเชื่อม 2 ก้อนคือข้อพิพาท (แชร์คนกับก้อนสุขภาพมากสุด)" },
  ],
  "เครือข่ายหมวด ↔ Generation": [
    { v: <Bars rows={[["ดราม่า Gen Z", drama.gen["Gen Z"], G.z]]} max={25} />, t: `คนคอมเม้นดราม่าคนดังเป็น Gen Z ${drama.gen["Gen Z"]}% (observed)` },
    { v: <Bars rows={[["ปกติ Gen Z", +(drama.gen["Gen Z"] / drama.gen_lift["Gen Z"]).toFixed(1), C.dim]]} max={25} />, t: "สัดส่วน Gen Z ของคนดูหมวดทั่วไป (expected)" },
    { v: <Code>lift = {drama.gen["Gen Z"]} ÷ {(drama.gen["Gen Z"] / drama.gen_lift["Gen Z"]).toFixed(1)} = ×{drama.gen_lift["Gen Z"]}<br />≥ 1.03 → เส้นสี</Code>, t: "ทำแบบนี้ 30 คู่ (10 หมวด × 3 Gen) แล้ววาดเป็นกราฟสองฝั่ง" },
  ],
  "เครือข่าย Generation ↔ หมวด ↔ ความภักดี": [
    { v: <Row><Chip c={C.dim}>คน A</Chip><span className="hw-ar">→</span><Chip c={C.a}>ดราม่าคนดัง</Chip><Chip c={G.z}>Gen Z</Chip><Chip c="var(--m-drift)">ขาจร</Chip></Row>, t: "คนแต่ละคนรู้ 3 อย่าง: หมวดที่เคยคอมเม้น วัยที่ประเมิน และกลุ่มความภักดี" },
    { v: <Code>นับคนไม่ซ้ำต่อคู่<br />ดราม่าคนดัง × ขาจร = 56,852 คน</Code>, t: "นับคนในทุกคู่ หมวด × ความภักดี (30 คู่) และ หมวด × Gen (30 คู่)" },
    { v: <Code>lift = 53.8% ÷ ค่าเฉลี่ย 46.6% = ×1.15<br />→ เส้นเข้ม</Code>, t: "เส้นหนาตามจำนวนคน และเข้มเมื่อคู่นั้นมากกว่าค่าเฉลี่ยตั้งแต่ 15%" },
  ],
};

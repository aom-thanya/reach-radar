// Hidden page (#journey, not in the menu): the project's history told as the data changing shape.
// Every number is an aggregate already shipped with the back office. No handles, no comment text.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { D } from "../data";
import { fmt } from "../lib/format";
import { CATS, JACC, NEPS, N_DOTS, PER_DOT, QUIET, SHORT, makeDots } from "./data";
import "./journey.css";

type Mode = "intro" | "raw" | "people" | "eda" | "cats" | "loyalty" | "gen" | "fail" | "comm" | "net" | "reach" | "end";
interface Step { mode: Mode; date: string; title: string; big: string; cap: string; body: ReactNode }

const LOY_COL: Record<string, string> = { "แฟนตัวยง": "var(--j-fan)", "นักเสพข่าว": "var(--j-news)", "ขาจร": "var(--j-drift)" };
const GEN_COL: Record<string, string> = { "Gen Z": "var(--gz)", "Gen Y": "var(--gy)", "Gen X ขึ้นไป": "var(--gx)" };
const COMM_COL = ["var(--j-c0)", "var(--j-c1)", "var(--j-c2)", "var(--j-c3)"];
const CAT_COL = (i: number) => `var(--j-k${i})`;

const fanPct = (c: (typeof D.communities)[number]) => c["แฟนตัวยง %"] as number;
const top3 = NEPS.slice(4).reduce((s, b) => s + b.cpct, 0);
const top3p = NEPS.slice(4).reduce((s, b) => s + b.pct, 0);

const STEPS: Step[] = [
  { mode: "intro", date: "ก่อนเริ่ม", title: "ตอนแรก มีแค่ยอดวิว", big: "227 EP", cap: "ทุกตอนหน้าตาเหมือนกัน",
    body: <><p>ทีมขาย Slot โฆษณาของโหนกระแสมีตัวเลขแค่ยอดวิว ค่ากลางอยู่ที่ <b>{(D.base.views / 1e6).toFixed(2)} ล้านวิวต่อ EP</b> ซึ่งบอกได้ว่ามีคนดูกี่คน แต่ไม่บอกว่าเป็นใคร</p><p>ในภาพ EP ทั้ง 227 ตอนของปี 2026 จึงเป็นกล่องสีเทาเหมือนกันหมด ยังแยกไม่ออกว่าตอนไหนเหมาะกับแบรนด์แบบไหน</p></> },
  { mode: "raw", date: "21–22 พ.ย.", title: "ดึงคอมเม้นดิบ", big: "852,802", cap: "แถว ยังไม่รู้ว่าใครเป็นใคร",
    body: <><p>ดึงคอมเม้นและ reply ทุก EP ด้วยเครื่องมือฟรีที่อ่านจากหน้าเว็บสาธารณะ ไม่ใช้ API ที่ต้องเสียเงิน ใช้เวลาราว 8 ชั่วโมง ได้ไฟล์ราว 520 MB</p><p>ข้อมูลยังรก: เวลาเป็นข้อความ ยอดไลก์เป็นคำ และชื่อบัญชีเปลี่ยนได้</p>
      <div className="j-scroll"><table className="j-raw"><thead><tr><th>text</th><th>author</th><th>channel</th><th>votes</th><th>time</th></tr></thead><tbody>
        <tr><td><i className="mask" /></td><td>@user-•••</td><td>UC•••a1</td><td>1.2 พัน</td><td>4 วันที่ผ่านมา</td></tr>
        <tr><td><i className="mask w2" /></td><td>@•••4408</td><td>UC•••7f</td><td>37</td><td>3 สัปดาห์ที่ผ่านมา</td></tr>
        <tr><td><i className="mask w3" /></td><td>@user-•••</td><td>UC•••a1</td><td>2</td><td>5 เดือนที่ผ่านมา</td></tr>
      </tbody></table></div>
      <p className="j-note">ตัวอย่างรูปแบบข้อมูล ปิดข้อความและชื่อบัญชีไว้ ข้อความจริงเก็บในเครื่องเท่านั้น</p></> },
  { mode: "people", date: "22 พ.ย.", title: "ยุบคอมเม้นให้เป็นคน", big: fmt(D.n_people), cap: `คน · 1 จุด ≈ ${PER_DOT} คน`,
    body: <><p>นับคนตาม <b>channel id</b> ไม่ใช้ชื่อบัญชี เพราะชื่อบัญชีเปลี่ยนได้ แล้วตัดบัญชีที่แปะข้อความเดิมซ้ำตั้งแต่ 3 EP ขึ้นไป ออก 10 บัญชี</p><p>จากคอมเม้น 852,802 แถว เหลือคน {fmt(D.n_people)} คน ซึ่งเป็นโหนดฝั่งคนของเครือข่าย</p></> },
  { mode: "eda", date: "22 พ.ย.", title: "EDA: ข้อมูลหางยาวมาก", big: "64%", cap: "มาคอมเม้นแค่ EP เดียว",
    body: <><p>เรียงคนตามจำนวน EP ที่มาคอมเม้น คนส่วนใหญ่มาครั้งเดียว ค่ากลางคือ 1 คอมเม้นต่อคน</p><p>ส่วนคน <b>{top3p.toFixed(1)}%</b> ที่มาเกิน 10 EP เขียนคอมเม้นรวมกันถึง <b>{top3.toFixed(1)}%</b></p><p>ข้อมูลเบ้แบบนี้จึงต้องแปลงด้วย log ก่อนจัดกลุ่ม และใช้ค่ากลางแทนค่าเฉลี่ย</p></> },
  { mode: "cats", date: "22 พ.ย.", title: "จัด EP เข้า 10 หมวด", big: "10 หมวด", cap: "1 กล่อง = 1 EP",
    body: <><p>อีกฝั่งของเครือข่ายคือ EP Claude จัดหมวดจากชื่อคลิป แล้วจัดซ้ำโดยไม่เห็นคำตอบเดิม เพื่อเทียบกับ 39 EP ที่คนจัดไว้ ตรงกัน 34 จาก 39 EP (87%)</p><p><b>Kappa 0.85</b> คือคะแนนความตรงกันที่หักส่วนที่ "บังเอิญตรง" ออกแล้ว เพราะต่อให้เดามั่วก็ยังตรงได้บ้าง 0 แปลว่าตรงพอๆ กับเดาสุ่ม 1 แปลว่าตรงทุกตัว ค่าเกิน 0.8 ถือว่าตรงกันดีมาก</p><p>หมวดที่ออกอากาศบ่อยสุดคืออาชญากรรม (45 EP) และอุบัติเหตุ (44 EP) แต่กลับได้คอมเม้นต่อ EP น้อยที่สุดกลุ่มหนึ่ง</p></> },
  { mode: "loyalty", date: "22 พ.ย.", title: "แบ่งคนตามความภักดี", big: "6.4% → 39%", cap: "แฟนตัวยงเขียนคอมเม้น 39%",
    body: <><p>ใช้ <b>k-means K = 3</b> บนพฤติกรรม 4 ตัว ได้แก่ จำนวน EP, จำนวนคอมเม้น, จำนวนเดือนที่มา และช่วงเวลาที่อยู่กับรายการ</p><p>เกณฑ์เดิมแบบ 60/20% ของ EP ได้แฟนตัวยงแค่ 10 คน จึงใช้ไม่ได้ ผลจาก k-means คือแฟนตัวยงมีแค่ 6.4% ของคน แต่เขียนคอมเม้น 39%</p></> },
  { mode: "gen", date: "22 พ.ย.", title: "ประเมิน Gen จากข้อความ", big: "3 กลุ่ม", cap: "Z 17% · Y 47% · X+ 36%",
    body: <><p>Claude อ่านข้อความ 1,050 คน แล้วใช้โมเดลขยายผลไปทุกคน ถ้าแบ่ง 4 Gen แม่นแค่ 42% จึงยุบเหลือ 3 กลุ่ม ซึ่งแม่น 69%</p><p>ฐานแฟนเป็นรุ่นใหญ่ Gen Z มีแค่ 6% ในกลุ่มแฟนตัวยง แต่มี 22% ในกลุ่มขาจร</p></> },
  { mode: "fail", date: "22 พ.ย.", title: "เครือข่ายรอบแรก ใช้ไม่ได้", big: "0.09", cap: "modularity: แทบไม่มีก้อน",
    body: <><p>ลองสร้างเครือข่ายประเด็นย่อย ↔ ประเด็นย่อย แล้วแบ่งก้อนด้วย <b>Louvain</b> แต่ได้ modularity แค่ 0.09</p><p>ก้อนที่ได้ยังผูกกับเดือนที่ออกอากาศ (Cramér's V 0.29) ประเด็นที่ออกสัปดาห์เดียวกันดูเหมือนเกี่ยวกัน เพียงเพราะคนชุดเดียวกันแอคทีฟช่วงนั้น จึงไม่ใช้ผลรอบนี้</p><p className="j-note">ภาพนี้แสดงลักษณะของกราฟ ไม่ใช่กราฟจริง</p></> },
  { mode: "comm", date: "22 พ.ย.", title: "รอบสอง: สายคนดู 4 สาย", big: "4 สาย", cap: `จากขาประจำ ${fmt(D.comm_n)} คน`,
    body: <><p>ต่อคน เทียบหมวดที่เขาคอมเม้นจริงกับหมวดที่ออกอากาศในช่วงที่เขาแอคทีฟ เพื่อหักผลของเวลาออก แล้วจัดกลุ่มด้วย k-means K = 4</p><p>ใช้เฉพาะคนที่คอมเม้นตั้งแต่ 3 EP ตรวจแล้วสายไม่ผูกกับเดือน (V 0.14) คนที่มา 1–2 EP ไม่ถูกจัดสาย จึงเป็นจุดจางด้านล่าง</p></> },
  { mode: "net", date: "22 พ.ย.", title: "เครือข่ายหมวด ↔ หมวด", big: "2 ก้อน", cap: "หมวดเรื่องร้อน กับหมวดเงียบ",
    body: <><p>ฉายกราฟคน–EP ให้เป็นหมวด ↔ หมวด น้ำหนักเส้นคือ <b>Jaccard</b> ของคนที่คอมเม้นทั้งสองหมวด แล้วแบ่งก้อนด้วย Louvain</p><p>ได้ก้อนเรื่องร้อน 7 หมวด กับก้อนสุขภาพ ความเชื่อ ภัยพิบัติ คู่ที่มีคนดูร่วมมากสุดคือครอบครัว × อาชญากรรม (0.17)</p></> },
  { mode: "reach", date: "22 พ.ย.", title: "ซื้อ EP เพิ่ม ได้คนใหม่จริงไหม", big: "1.6%", cap: "คนซ้อนข้ามหมวดในแพ็กเกจ",
    body: <><p>สุ่ม EP ในแต่ละหมวดตั้งแต่ 1 ถึง 20 EP ทำซ้ำ 100 รอบ แล้วนับคนไม่ซ้ำ เส้นที่ได้เกือบตรง แปลว่าซื้อ EP เพิ่มเท่าไหร่ ก็ได้คนใหม่เพิ่มเกือบเท่านั้น</p><p>รวมข้ามหมวดด้วยสูตร Sainsbury ที่ปรับเทียบกับแพ็กเกจจำลอง 1,500 แบบ แพ็กเกจ 6 EP ใน 3 หมวดมีคนซ้อนกันแค่ราว 1.6%</p></> },
  { mode: "end", date: "22–28 พ.ย.", title: "ทุกจุดมีที่ทาง", big: "5 หน้า", cap: "หลังบ้านที่ทีมขายใช้",
    body: <><p>จากคอมเม้นที่ไม่มีโครงสร้าง ตอนนี้คนทุกคนมีระดับความภักดี มี Gen และขาประจำมีสายของตัวเอง</p><p>ผลทั้งหมดอยู่ในหน้าหลังบ้าน 5 หน้า ได้แก่ จับคู่แบรนด์ × Gen, ราคา Slot, แพ็กเกจ, Brand safety และวางแผนแคมเปญ ขึ้น Vercel เมื่อ 28 พ.ย. โดยมีแต่ยอดรวม</p><p><a className="j-cta" href="#models">ดูว่าแต่ละขั้นใช้โมเดลอะไร</a> <a className="j-cta2" href="#home">เปิดหน้าหลังบ้าน</a></p></> },
];

/* ---------- layouts (pixel space) ---------- */
interface P { x: number; y: number; o: number; f: string; r: number }
interface Lbl { x: number; y: number; t: string; s?: string; a?: "start" | "middle" | "end"; c?: string }

function phyllo(k: number, c: number) { const r = c * Math.sqrt(k + 0.5), a = k * 2.39996; return [r * Math.cos(a), r * Math.sin(a)]; }

export default function Journey() {
  const dots = useMemo(makeDots, []);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const [{ W, H }, setSize] = useState({ W: 800, H: 600 });
  const mode = STEPS[step].mode;

  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSize({ W: el.clientWidth, H: el.clientHeight }));
    ro.observe(el); return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const narrow = matchMedia("(max-width: 820px)").matches;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setStep(+(e.target as HTMLElement).dataset.i!); }),
      { rootMargin: narrow ? "-62% 0px -30% 0px" : "-45% 0px -45% 0px" });
    stepRefs.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, []);

  const go = useCallback((i: number) => {
    const el = stepRefs.current[Math.max(0, Math.min(STEPS.length - 1, i))];
    el?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (!auto) return;
    if (step >= STEPS.length - 1) { setAuto(false); return; }
    const t = setTimeout(() => go(step + 1), 5200);
    const stop = () => setAuto(false);
    addEventListener("wheel", stop, { once: true }); addEventListener("touchstart", stop, { once: true });
    return () => { clearTimeout(t); removeEventListener("wheel", stop); removeEventListener("touchstart", stop); };
  }, [auto, step, go]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); go(step + 1); } if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); } };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [step, go]);

  useEffect(() => { const t = document.title; document.title = "ReachRadar · เส้นทางของข้อมูล"; return () => { document.title = t; }; }, []);

  /* plot area */
  const narrow = W < 560;
  const L = 16, R = W - 16, T = narrow ? 104 : 140, B = H - (narrow ? 34 : 40), aw = R - L, ah = B - T;
  const dr = Math.max(2, Math.min(4.6, Math.min(aw, ah) / 120));

  const view = useMemo(() => {
    const pos: P[] = new Array(N_DOTS);
    const labels: Lbl[] = [];
    const grid = (o = 1, col: (i: number) => string = () => "var(--j-dot)") => {
      const cols = Math.ceil(Math.sqrt((N_DOTS * aw) / ah)), rows = Math.ceil(N_DOTS / cols);
      const s = Math.min(aw / cols, ah / rows), x0 = L + (aw - s * cols) / 2 + s / 2, y0 = T + (ah - s * rows) / 2 + s / 2;
      dots.forEach((d) => { pos[d.i] = { x: x0 + (d.i % cols) * s, y: y0 + Math.floor(d.i / cols) * s, o, f: col(d.i), r: Math.min(dr, s * 0.36) }; });
    };
    const blobs = (groupOf: (i: number) => number, n: number, centers: [number, number][], cell: number, col: (i: number) => string, skip?: (i: number) => boolean) => {
      const counts = new Array(n).fill(0); const k: number[] = new Array(N_DOTS);
      dots.forEach((d) => { if (skip?.(d.i)) return; const g = groupOf(d.i); k[d.i] = counts[g]++; });
      const c = Math.min((cell * 0.42) / Math.sqrt(Math.max(...counts)), dr * 2.5);
      dots.forEach((d) => { if (skip?.(d.i)) return; const g = groupOf(d.i); const [dx, dy] = phyllo(k[d.i], c); pos[d.i] = { x: centers[g][0] + dx, y: centers[g][1] + dy, o: 1, f: col(d.i), r: Math.min(dr * 1.15, c * 0.42) }; });
      return c * Math.sqrt(Math.max(...counts));
    };
    // blobs sized by sqrt(count) and packed side by side (stacked on tall stages)
    const loyCenters = (): [number[][], number] => {
      const n = D.loyalty.map((l) => dots.filter((d) => d.loy === l).length), sq = n.map(Math.sqrt), mx = Math.max(...sq), tot = sq.reduce((a, b) => a + b, 0);
      const gap = 3, wide = W >= H * 0.95;
      const along = wide ? aw : ah - 30, across = wide ? ah - 60 : aw * 0.55;
      const c = Math.min(along / (2 * (tot + gap * 2)), (across * 0.5) / mx, dr * 2.5);
      let pos0 = (along - 2 * c * (tot + gap * 2)) / 2;
      const cs = sq.map((q) => { const mid = pos0 + c * q; pos0 += 2 * c * (q + gap); return wide ? [L + mid, T + (ah - 60) / 2] : [L + aw * 0.3, T + mid]; });
      return [cs, (c * mx) / 0.42];
    };
    const loyIdx = (i: number) => D.loyalty.indexOf(dots[i].loy);

    switch (mode) {
      case "intro": case "cats": case "net": case "reach": grid(0); break;
      case "raw":
        dots.forEach((d) => { pos[d.i] = { x: L + d.sx * aw, y: T + d.sy * ah, o: 0.55, f: "var(--j-dot)", r: dr * 0.8 }; }); break;
      case "people": grid(1); break;
      case "end": grid(1, (i) => (dots[i].comm >= 0 ? COMM_COL[dots[i].comm] : "var(--j-faint)")); break;
      case "eda": {
        const cw = aw / NEPS.length, top = T + 26, base = B - (narrow ? 30 : 40);
        const big = dots.filter((d) => d.bucket === 0).length;
        const s = Math.min(dr * 2.7, Math.sqrt((cw * 0.86 * (base - top)) / big));
        const m = Math.max(2, Math.floor((cw * 0.86) / s));
        const cnt = new Array(NEPS.length).fill(0);
        dots.forEach((d) => {
          const b = d.bucket, k = cnt[b]++, cx = L + cw * (b + 0.5);
          pos[d.i] = { x: cx - ((m - 1) * s) / 2 + (k % m) * s, y: base - s / 2 - Math.floor(k / m) * s, o: 1, f: b >= 4 ? "var(--j-hot)" : "var(--j-dot)", r: Math.min(dr, s * 0.38) };
        });
        NEPS.forEach((b, i) => {
          const cx = L + cw * (i + 0.5);
          labels.push({ x: cx, y: base + 18, t: b.b, a: "middle" });
          if (!narrow || i < 4) labels.push({ x: cx, y: base - Math.ceil(cnt[i] / m) * s - 8, t: (b.pct >= 1 ? b.pct.toFixed(0) : b.pct.toFixed(1)) + "%", a: "middle", c: i >= 4 ? "var(--j-hot)" : undefined });
        });
        labels.push({ x: R, y: base + (narrow ? 32 : 36), t: "จำนวน EP ที่คนหนึ่งมาคอมเม้น", a: "end", s: "sub" });
        break;
      }
      case "loyalty": case "gen": {
        const [cs, cell] = loyCenters();
        const rad = blobs(loyIdx, 3, cs as [number, number][], cell, (i) => (mode === "gen" ? GEN_COL[dots[i].gen] : LOY_COL[dots[i].loy]));
        D.loyalty.forEach((l, g) => {
          const [x, y] = cs[g]; const wide = W >= H * 0.95;
          const rg = Math.sqrt(dots.filter((d) => d.loy === l).length / dots.filter((d) => d.loy === "ขาจร").length) * rad;
          const lx = wide ? x : x + rg + 14, ly = wide ? y + rad + 26 : y - 6;
          labels.push({ x: lx, y: ly, t: l, a: wide ? "middle" : "start" });
          const gp = D.overall.gen_by_loyalty[l].pct;
          labels.push({ x: lx, y: ly + 18, a: wide ? "middle" : "start", s: "sub",
            t: mode === "gen" ? `Z ${gp["Gen Z"].toFixed(0)} · Y ${gp["Gen Y"].toFixed(0)} · X+ ${gp["Gen X ขึ้นไป"].toFixed(0)}%` : `คน ${D.overall.loyalty_pct[l]}% · คอมเม้น ${D.overall.comments_by_loyalty[l]}%` });
        });
        if (mode === "gen") D.gens.forEach((g, k) => labels.push({ x: R - (2 - k) * (narrow ? 56 : 70), y: T + 4, t: "● " + g.replace(" ขึ้นไป", "+"), a: "end", c: GEN_COL[g] }));
        break;
      }
      case "fail": { const [cs, cell] = loyCenters(); blobs(loyIdx, 3, cs as [number, number][], cell, () => "var(--j-faint)"); dots.forEach((d) => { pos[d.i].o = 0; }); break; }
      case "comm": {
        const stripH = Math.min(70, ah * 0.2), top = T, bot = B - stripH - 18;
        const cw = aw / 2, ch = (bot - top) / 2;
        const cs: [number, number][] = [[L + cw * 0.5, top + ch * 0.45], [L + cw * 1.5, top + ch * 0.45], [L + cw * 0.5, top + ch * 1.45], [L + cw * 1.5, top + ch * 1.45]];
        const rad = blobs((i) => dots[i].comm, 4, cs, Math.min(cw, ch * 0.9), (i) => COMM_COL[dots[i].comm], (i) => dots[i].comm < 0);
        D.communities.forEach((c, g) => {
          labels.push({ x: cs[g][0], y: cs[g][1] + rad + 20, t: c.name, a: "middle" });
          labels.push({ x: cs[g][0], y: cs[g][1] + rad + 37, t: `${fmt(c.people)} คน · แฟน ${fanPct(c).toFixed(0)}%`, a: "middle", s: "sub" });
        });
        const rest = dots.filter((d) => d.comm < 0); const cols = Math.ceil(Math.sqrt((rest.length * aw) / stripH));
        const s = Math.min(aw / cols, stripH / Math.ceil(rest.length / cols));
        rest.forEach((d, k) => { pos[d.i] = { x: L + s / 2 + (k % cols) * s, y: B - stripH + s / 2 + Math.floor(k / cols) * s, o: 0.35, f: "var(--j-faint)", r: Math.min(dr * 0.7, s * 0.32) }; });
        labels.push({ x: L, y: B - stripH - 8, t: "คอมเม้น 1–2 EP ยังไม่จัดสาย", a: "start", s: "sub" });
        break;
      }
    }
    return { pos, labels };
  }, [mode, dots, W, H, aw, ah, L, R, T, B, dr, narrow]);

  /* EP tiles */
  const tiles = useMemo(() => {
    const eps = D.eps; const n = eps.length;
    const cols = Math.ceil(Math.sqrt((n * aw) / ah * 1.6)), rows = Math.ceil(n / cols);
    const tw = aw / cols, th = ah / rows;
    const timeline = eps.map((_, i) => ({ x: L + (i % cols) * tw + 1.5, y: T + Math.floor(i / cols) * th + 1.5, w: tw - 3, h: th - 3 }));
    const perRow = narrow ? 5 : 10, nrow = Math.ceil(CATS.length / perRow), cw = aw / perRow, rowH = ah / nrow;
    const maxN = Math.max(...CATS.map((c) => eps.filter((e) => e.cat === c).length));
    const h = Math.min(11, (rowH - 34) / maxN - 1.5);
    const cnt: Record<string, number> = {};
    const bycat = eps.map((e) => {
      const ci = CATS.indexOf(e.cat), k = (cnt[e.cat] = (cnt[e.cat] ?? 0) + 1) - 1;
      const col = ci % perRow, row = Math.floor(ci / perRow), base = T + rowH * (row + 1) - 26;
      return { x: L + cw * col + cw * 0.14, y: base - (k + 1) * (h + 1.5), w: cw * 0.72, h };
    });
    const catLabels: Lbl[] = CATS.map((c, ci) => {
      const col = ci % perRow, row = Math.floor(ci / perRow);
      return { x: L + cw * (col + 0.5), y: T + rowH * (row + 1) - 8, t: SHORT[c], a: "middle" as const, s: narrow ? "tiny" : undefined };
    });
    const catCount: Lbl[] = CATS.map((c, ci) => {
      const col = ci % perRow, row = Math.floor(ci / perRow), k = cnt[c] ?? 0, base = T + rowH * (row + 1) - 26;
      return { x: L + cw * (col + 0.5), y: base - k * (h + 1.5) - 6, t: `${k} EP`, a: "middle" as const, s: "sub" };
    });
    return { timeline, bycat, catLabels, catCount };
  }, [aw, ah, L, T, narrow]);

  /* category network */
  const net = useMemo(() => {
    const cx = L + aw / 2, cy = T + ah / 2, rad = Math.min(aw, ah) / 2 - (narrow ? 60 : 64);
    const order = [...CATS.filter((c) => !QUIET.has(c)), ...CATS.filter((c) => QUIET.has(c))];
    const p: Record<string, { x: number; y: number; a: number; r: number }> = {};
    order.forEach((c, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / order.length; const ppl = D.categories.find((k) => k.name === c)!.people; p[c] = { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a), a, r: 4 + Math.sqrt(ppl) / (narrow ? 26 : 19) }; });
    return { p, cx, cy, rad, order };
  }, [aw, ah, L, T, narrow]);

  /* tag-network hairball (illustration only) */
  const hair = useMemo(() => {
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const nodes = Array.from({ length: 22 }, () => ({ x: L + aw * (0.18 + rnd() * 0.64), y: T + ah * (0.12 + rnd() * 0.76) }));
    const edges: [number, number][] = [];
    nodes.forEach((_, i) => { for (let k = 0; k < 5; k++) { const j = Math.floor(rnd() * nodes.length); if (j !== i) edges.push([i, j]); } });
    return { nodes, edges };
  }, [aw, ah, L, T]);

  /* reach curves */
  const reach = useMemo(() => {
    const curves = D.reach.curves; const mx = Math.max(...Object.values(curves).flat());
    const x = (k: number) => L + 40 + ((k - 1) / 19) * (aw - (narrow ? 120 : 160)), y = (v: number) => B - 24 - (v / mx) * (ah - 40);
    const lines = CATS.map((c) => ({ c, d: (curves[c] ?? []).map((v, i) => `${i ? "L" : "M"}${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(""), end: curves[c]?.[19] ?? 0 }));
    const ticks = [0, 20000, 40000, 60000].filter((t) => t <= mx);
    return { lines, x, y, ticks };
  }, [aw, ah, L, B, narrow]);

  const on = (m: Mode | Mode[]) => ((Array.isArray(m) ? m : [m]).includes(mode) ? " on" : "");
  const lbl = (l: Lbl, k: number) => <text key={k} x={l.x} y={l.y} textAnchor={l.a ?? "start"} className={l.s} style={l.c ? { fill: l.c } : undefined}>{l.t}</text>;

  return (
    <div className="journey">
      <header className="j-top">
        <a className="j-brand" href="#journey" onClick={(e) => { e.preventDefault(); scrollTo({ top: 0, behavior: "smooth" }); }}><i className="onair" aria-hidden="true" />ReachRadar</a>
        <nav className="j-chips" aria-label="ขั้นตอน">
          {STEPS.map((s, i) => <button key={i} type="button" aria-label={s.title} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : undefined} onClick={() => go(i)} />)}
        </nav>
        <button type="button" className="j-play" onClick={() => { if (!auto && step >= STEPS.length - 1) go(0); setAuto(!auto); }}>{auto ? "หยุด" : "เล่นอัตโนมัติ"}</button>
      </header>

      <section className="j-hero">
        <h1>ข้อมูลเปลี่ยนหน้าตาอย่างไร ทีละขั้น</h1>
        <p>ประวัติการทำงานของ ReachRadar ตั้งแต่คอมเม้นดิบ 852,802 แถว จนเป็นเครือข่ายคนดูที่ทีมขายใช้ตัดสินใจได้ เลื่อนลงเพื่อดูภาพเปลี่ยนไปทีละขั้น หรือกดเล่นอัตโนมัติ</p>
      </section>

      <div className="j-scrolly">
        <div className="j-stage" ref={stageRef}>
          <div className="j-cap" key={step}>
            <span className="j-date">{`${step + 1}/${STEPS.length} · ${STEPS[step].date}`}</span>
            <b className="num">{STEPS[step].big}</b><span>{STEPS[step].cap}</span>
          </div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${STEPS[step].title}: ${STEPS[step].big} ${STEPS[step].cap}`}>
            <g className={"j-layer" + on(["intro", "cats"])}>
              {D.eps.map((e, i) => { const t = mode === "cats" ? tiles.bycat[i] : tiles.timeline[i]; return <rect key={i} className="tile" rx={1.5} width={Math.max(1, t.w)} height={Math.max(1, t.h)} style={{ transform: `translate(${t.x}px,${t.y}px)`, fill: mode === "cats" ? CAT_COL(CATS.indexOf(e.cat)) : "var(--j-tile)", transitionDelay: `${(i % 40) * 8}ms` }} />; })}
            </g>
            <g className={"j-layer" + on("cats")}>{tiles.catLabels.map(lbl)}{tiles.catCount.map((l, k) => lbl(l, 100 + k))}</g>
            <g className={"j-layer" + on("fail")}>
              {hair.edges.map(([a, b], k) => <line key={k} x1={hair.nodes[a].x} y1={hair.nodes[a].y} x2={hair.nodes[b].x} y2={hair.nodes[b].y} className="hair" />)}
              {hair.nodes.map((n, k) => <circle key={k} cx={n.x} cy={n.y} r={dr * 1.9} className="hnode" style={{ animationDelay: `${-k * 0.37}s` }} />)}
            </g>
            <g className={"j-layer" + on("net")}>
              {JACC.slice().sort((a, b) => a.w - b.w).map((e, k) => { const a = net.p[e.a], b = net.p[e.b]; const top = e.w > 0.17; const same = QUIET.has(e.a) === QUIET.has(e.b);
                return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeLinecap="round" strokeWidth={e.w * (narrow ? 26 : 40)} style={{ stroke: top ? "var(--ink)" : same ? (QUIET.has(e.a) ? "var(--j-quiet)" : "var(--j-hotblock)") : "var(--j-faint)", strokeOpacity: top ? 0.9 : 0.15 + e.w * 3 }} />; })}
              {net.order.map((c) => { const p = net.p[c]; const ca = Math.cos(p.a); const lx = net.cx + (net.rad + p.r + 8) * Math.cos(p.a), ly = net.cy + (net.rad + p.r + 8) * Math.sin(p.a);
                return <g key={c}><circle cx={p.x} cy={p.y} r={p.r} style={{ fill: QUIET.has(c) ? "var(--j-quiet)" : "var(--j-hotblock)" }} className="nnode" />
                  <text x={lx} y={ly + (Math.sin(p.a) > 0.5 ? 12 : Math.sin(p.a) < -0.5 ? -2 : 4)} textAnchor={Math.abs(ca) < 0.25 ? "middle" : ca > 0 ? "start" : "end"}>{SHORT[c]}</text></g>; })}
            </g>
            <g className={"j-layer" + on("reach")}>
              {reach.ticks.map((t) => <g key={t}><line x1={L + 40} x2={R - (narrow ? 80 : 120)} y1={reach.y(t)} y2={reach.y(t)} className="grid" /><text x={L + 34} y={reach.y(t) + 4} textAnchor="end" className="sub">{t ? t / 1000 + "k" : "0"}</text></g>)}
              {[1, 5, 10, 15, 20].map((k) => <text key={k} x={reach.x(k)} y={B - 6} textAnchor="middle" className="sub">{k}</text>)}
              <text x={R} y={B + (narrow ? 14 : 18)} textAnchor="end" className="sub">จำนวน EP ที่ซื้อ</text>
              {reach.lines.map((l, k) => { const hl = l.c === "ดราม่าบุคคลสาธารณะ" || l.c === "ครอบครัว & ความสัมพันธ์" || l.c === "ศาสนา & วัด";
                return <g key={l.c}><path d={l.d} pathLength={1} className={"rline" + (hl ? " hl" : "")} style={{ transitionDelay: `${k * 90}ms` }} />
                  {hl && <text x={reach.x(20) + 6} y={reach.y(l.end) + 4} className="rl">{SHORT[l.c]} {Math.round(l.end / 1000)}k</text>}</g>; })}
              <text x={L + 46} y={T + 4} className="sub">คนไม่ซ้ำ (คนคอมเม้น)</text>
            </g>
            <g className="j-dots">
              {dots.map((d) => { const p = view.pos[d.i]; return <circle key={d.i} r={p.r} className={mode === "raw" ? "tw" : undefined} style={{ transform: `translate(${p.x}px,${p.y}px)`, fill: p.f, opacity: p.o, transitionDelay: `${d.i * 1.6}ms, 0ms, 0ms`, animationDelay: `${-((d.i * 0.37) % 2.6)}s` }} />; })}
            </g>
            <g className="j-labels" key={mode + W}>{view.labels.map(lbl)}</g>
          </svg>
        </div>

        <ol className="j-steps">
          {STEPS.map((s, i) => (
            <li key={i} data-i={i} ref={(el) => { stepRefs.current[i] = el; }} className={i === step ? "cur" : undefined}>
              <article>
                <span className="j-date">{s.date}</span>
                <h2>{s.title}</h2>
                {s.body}
              </article>
            </li>
          ))}
        </ol>
      </div>

      <footer className="j-foot">ตัวเลขทั้งหมดมาจากคนที่คอมเม้น YouTube โหนกระแสปี 2026 ไม่ใช่คนดูทั้งหมด · Gen เป็นค่าประเมิน · หน้านี้มีแต่ยอดรวม</footer>
    </div>
  );
}

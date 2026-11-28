import { useEffect } from "react";
import type { Gen } from "../data";
import { GENS, GOALS, PRODUCTS } from "../lib/constants";
import { useKept } from "../lib/kept";
import { PLAN0, type Plan } from "../planner/model";
import { Report } from "../planner/Report";

function Seg<T extends string>({ opts, value, onPick }: { opts: [T, string][]; value: T | T[]; onPick: (id: T) => void }) {
  const on = (id: T) => (Array.isArray(value) ? value.includes(id) : value === id);
  return <div className="seg" role="group">{opts.map(([id, name]) => <button key={id} type="button" aria-pressed={on(id)} onClick={() => onPick(id)}>{name}</button>)}</div>;
}

function Form({ P, set, onSubmit }: { P: Plan; set: (u: Partial<Plan>) => void; onSubmit: () => void }) {
  return <>
    <div className="dash-head"><div><span className="eyebrow">เครื่องมือ · วางแผนแคมเปญ</span><h1>ใส่โจทย์ลูกค้า แล้วได้รายงานพร้อมส่ง</h1></div>
      <span className="cap">1 โจทย์ → 2 รายงาน → 3 แก้ข้อความ → 4 Export PDF</span></div>
    <form className="panel req" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="req-grid">
        <div className="field"><label htmlFor="r-brand">ชื่อลูกค้า / แบรนด์</label>
          <input type="text" id="r-brand" value={P.brand} placeholder="เช่น แบรนด์อาหารเสริม A" onChange={(e) => set({ brand: e.target.value })} /></div>
        <div className="field"><label htmlFor="r-camp">ชื่อแคมเปญ</label>
          <input type="text" id="r-camp" value={P.campaign} placeholder="เช่น เปิดตัวสินค้าใหม่ Q1" onChange={(e) => set({ campaign: e.target.value })} /></div>
        <div className="field"><label htmlFor="r-product">ประเภทสินค้า</label>
          <select id="r-product" value={P.product} onChange={(e) => set({ product: e.target.value })}>{PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="field">
          <div className="panel-head"><label htmlFor="r-n">จำนวน EP ที่จะวาง</label><span className="chip">{`${P.n} EP`}</span></div>
          <input type="range" id="r-n" min={1} max={20} value={P.n} onChange={(e) => set({ n: +e.target.value })} />
        </div>
      </div>
      <div className="field"><span className="flabel">กลุ่มวัยที่ต้องการ</span>
        <Seg<Gen | "all"> opts={[["all", "ทุกวัย"], ...GENS.map((g) => [g, g] as [Gen, string])]} value={P.gen} onPick={(gen) => set({ gen })} />
        <span className="hint">Gen Z เกิด 2540 ขึ้นไป · Gen Y 2524–2539 · Gen X ขึ้นไป ก่อน 2524</span></div>
      <div className="field"><span className="flabel">เป้าหมายหลัก</span>
        <Seg opts={GOALS.map((g) => [g.id, g.name] as [string, string])} value={P.goal} onPick={(goal) => set({ goal })} /></div>
      <div className="field"><span className="flabel">Brand safety: ไม่ลง EP ที่มีประเด็นอ่อนไหว</span>
        <Seg opts={[["สูง", "ระดับสูง (คดีทางเพศ เสียชีวิต ยาเสพติด)"], ["กลาง", "ระดับกลาง (ทำร้ายร่างกาย เด็ก ภัยพิบัติ)"]]} value={P.safety}
          onPick={(id) => set({ safety: P.safety.includes(id) ? P.safety.filter((x) => x !== id) : [...P.safety, id] })} /></div>
      <div className="field"><label htmlFor="r-rate">สมมติฐาน conversion (ถ้ามี): ใช้โค้ดกี่ครั้งต่อ 1,000 วิว</label>
        <input type="number" id="r-rate" min={0} step={0.01} placeholder="เว้นว่างได้ ระบบไม่ใส่ค่าให้" value={P.rate} onChange={(e) => set({ rate: e.target.value })} /></div>
      <div className="req-foot"><span className="cap">ระบบใช้ข้อมูลคนคอมเม้น YouTube ปี 2569 จัดอันดับหมวด EP และคาดการณ์ผล</span>
        <button type="submit" className="btn big-btn">สร้างรายงาน →</button></div>
    </form>
  </>;
}

function Skeleton() {
  const bar = (w: string, h = 14) => <div className="sk" style={{ width: w, height: h }} />;
  return (
    <div className="paper-wrap" aria-busy="true" aria-label="กำลังสร้างรายงาน">
      <div className="paper sk-paper">
        {bar("40%", 26)}{bar("60%")}
        <div className="sk-row">{bar("100%", 70)}{bar("100%", 70)}{bar("100%", 70)}</div>
        {bar("90%")}{bar("80%")}{bar("85%")}
        <div className="sk-row">{bar("100%", 120)}{bar("100%", 120)}</div>
        {bar("70%")}{bar("75%")}
      </div>
      <p className="cap" style={{ textAlign: "center" }}>กำลังวิเคราะห์โจทย์และสร้างรายงาน…</p>
    </div>
  );
}

// Flow: requirement form -> Submit -> short skeleton -> editable report -> Export PDF
export default function Planner() {
  const [P, setP] = useKept<Plan>("planner.plan", PLAN0);
  const [view, setView] = useKept<"form" | "loading" | "report">("planner.view", "form");
  const go = (v: typeof view) => { setView(v); window.scrollTo(0, 0); };
  useEffect(() => {
    if (view !== "loading") return;
    const t = setTimeout(() => go("report"), 900);
    return () => clearTimeout(t);
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="page">
      {view === "form" ? <Form P={P} set={(u) => setP((p) => ({ ...p, ...u }))} onSubmit={() => go("loading")} />
        : view === "loading" ? <Skeleton />
        : <Report P={P} onBack={() => go("form")} />}
    </div>
  );
}

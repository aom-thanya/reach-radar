import { createElement, useLayoutEffect, useRef, useState } from "react";
import { D, type Gen } from "../data";
import { Icon, Thumb } from "../components/ui";
import { FORMATS, GEN_UNKNOWN, GENS } from "../lib/constants";
import { TH_M, fmt, pct, views, ytUrl } from "../lib/format";
import { exportPdf } from "./exportPdf";
import { FORMAT_INFO, goalOf, isOut, planNumbers, plainReason, product, type Plan } from "./model";
import { VennBlock } from "./Venn";

const GHEX: Record<Gen, string> = { "Gen Z": "#7C3AED", "Gen Y": "#0EA5E9", "Gen X ขึ้นไป": "#0F766E" };
const fmtDate = () => { const d = new Date(); return `${d.getDate()} ${TH_M[d.getMonth()]} ${d.getFullYear() + 543}`; };

/** editable text: React sets the starting text once, then the browser owns it (contentEditable) */
function Ed({ k, as = "p", text, cls = "ed", saved, editing }: { k: string; as?: string; text: string; cls?: string; saved: Record<string, string>; editing: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => { if (ref.current) ref.current.textContent = saved[k] ?? text; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return createElement(as, { ref, className: cls, "data-k": k, contentEditable: editing, suppressContentEditableWarning: true });
}

const Bar = ({ parts }: { parts: { v: number; c: string }[] }) => (
  <div className="pstack">{parts.map((p, i) => <i key={i} style={{ width: `${p.v}%`, background: p.c }} />)}</div>
);

export function Report({ P, onBack }: { P: Plan; onBack: () => void }) {
  const N = planNumbers(P), prod = product(P), goal = goalOf(P), out = isOut(P);
  const key = "rr-report3:" + JSON.stringify([P.brand, P.campaign, P.product, P.gen, P.goal, P.n, P.safety, P.rate]);
  const [saved] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } });
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const paper = useRef<HTMLElement>(null);
  const tmr = useRef<ReturnType<typeof setTimeout>>();
  const ed = (k: string, as: string, text: string, cls?: string) => <Ed key={k} k={k} as={as} text={text} cls={cls} saved={saved} editing={editing} />;

  const who = P.brand || "ลูกค้า";
  const fmtEst = FORMATS.map((f) => ({ f, n: Math.round(FORMAT_INFO[f.id].perEp() * P.n) })).sort((a, b) => b.n - a.n);
  const mentions = fmtEst[0].n;
  const est = P.rate === "" ? null : (N.tv / 1000) * +P.rate;
  const topGenName = GENS.slice().sort((a, b) => N.genShare(b) - N.genShare(a))[0];

  const onInput = (e: React.FormEvent) => {
    if (!(e.target as Element).closest(".ed")) return;
    clearTimeout(tmr.current);
    tmr.current = setTimeout(() => {
      try {
        const s: Record<string, string> = {};
        paper.current!.querySelectorAll<HTMLElement>(".ed").forEach((x) => (s[x.dataset.k!] = x.textContent || ""));
        localStorage.setItem(key, JSON.stringify(s));
      } catch { /* draft not kept */ }
    }, 400);
  };
  const toggleEdit = (on: boolean) => { setEditing(on); setStatus(on ? "คลิกข้อความที่มีเส้นประเพื่อแก้ ระบบจำไว้ในเบราว์เซอร์นี้" : ""); };
  const pdf = async () => {
    if (editing) toggleEdit(false);
    setStatus("กำลังสร้าง PDF…");
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try { await exportPdf(paper.current!, P.brand || P.campaign || "campaign"); setStatus("บันทึก PDF แล้ว"); }
    catch { setStatus("สร้าง PDF ไม่สำเร็จ ลองอีกครั้ง"); }
  };

  return <>
    <div className="rtoolbar">
      <button type="button" className="btn ghost" onClick={onBack}>← แก้โจทย์</button>
      <span className="grow" />
      <span className="cap" role="status">{status}</span>
      <button type="button" className="btn ghost" aria-pressed={editing} onClick={() => toggleEdit(!editing)}><Icon d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />{editing ? "เสร็จสิ้นการแก้ไข" : "แก้ไขข้อความ"}</button>
      <button type="button" className="btn" onClick={pdf}><Icon d="M12 4v11M7 10l5 5 5-5M5 20h14" />Export PDF</button>
    </div>
    <div className="paper-wrap">
      <article className={"paper" + (editing ? " editing" : "")} id="paper" ref={paper} onInput={onInput}>
        <header className="rsec phead">
          <div className="pbrand"><i className="onair" />ReachRadar · ข้อเสนอแคมเปญรายการโหนกระแส</div>
          {ed("title", "h1", P.campaign || `แผนโฆษณาสำหรับ ${who}`)}
          <p className="pmeta">{`สำหรับ ${who} · ${prod.name} · จัดทำ ${fmtDate()}`}</p>
        </header>
        {/* 1. the answer first */}
        <section className="rsec answer"><span className="akicker">คำแนะนำ</span>
          {ed("a-head", "p", `ลง ${P.n} EP ในหมวด ${N.plan.map((r) => `${r.c.name} ${r.n} EP`).join(" · ")}`, "ed ahead")}
          <div className="pkpis">{[[views(N.tv), "ยอดวิวรวมโดยประมาณ"], ["~" + fmt(Math.round(N.uniq / 100) * 100) + " คน", "คนคอมเม้นที่ไม่ซ้ำกัน"], [fmt(N.tc), "คอมเม้นรวม"],
            [mentions ? "~" + mentions : "–", `คอมเม้นที่น่าจะพูดถึงสินค้า (แบบ${fmtEst[0].f.name})`]].map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
          {ed("a-sum", "p", `เหมาะกับเป้าหมาย "${goal.name}" ${P.gen === "all" ? `คนที่คอมเม้นใน EP เหล่านี้ส่วนใหญ่เป็น ${topGenName}` : `กลุ่มที่ลูกค้าต้องการ (${P.gen}) คิดเป็นราว ${pct(N.genShare(P.gen))} ของคนคอมเม้นใน EP เหล่านี้`} และ${N.loyMix("fan") >= 40 ? "เกือบครึ่งเป็นแฟนประจำของรายการ" : "มีคนใหม่ที่แวะเข้ามาพอสมควร"}`)}
        </section>
        {/* 2. where to place */}
        <section className="rsec"><h2>1. ลงหมวดไหน และทำไม</h2><p className="phint">กดปกหรือชื่อ EP เพื่อดูคลิปตัวอย่างบน YouTube</p>
          <div className="pcards">{N.plan.map((r, i) => {
            const exs = D.eps.filter((e) => e.cat === r.c.name && !out(e)).sort((a, b) => b.views - a.views).slice(0, 3);
            return (
              <div className="pcard" key={r.c.name}>
                {exs[0] ? <a className="pcover" href={ytUrl(exs[0].vid)} target="_blank" rel="noopener" title="เปิดคลิปบน YouTube"><Thumb vid={exs[0].vid} cls="pthumb" /><span className="pplay">▶</span><span className="pcover-cap">{`EP.${exs[0].ep}`}</span></a> : null}
                <b>{r.c.name}</b><span className="pnum">{`ลง ${r.n} EP · ปกติได้ ${views(r.c.views)} วิว/EP`}</span>
                <ul className="pwhy">{plainReason(P, r).map((t, j) => ed(`why${i}-${j}`, "li", t))}</ul>
                <div className="plinks"><span>EP ตัวอย่าง:</span>{exs.map((e) =>
                  <a key={e.ep} href={ytUrl(e.vid)} target="_blank" rel="noopener"><Thumb vid={e.vid} cls="plthumb" />{`EP.${e.ep} ${e.title.slice(0, 34)}${e.title.length > 34 ? "…" : ""}`}</a>)}</div>
              </div>
            );
          })}</div>
        </section>
        {/* 3. who will see it */}
        <section className="rsec"><h2>2. คนที่จะเห็นเป็นใคร</h2>
          {ed("who", "p", `จากคนที่คอมเม้นใน EP หมวดเหล่านี้ ราว ${pct(N.genShare(topGenName))} เป็น ${topGenName} · แฟนประจำ ${pct(N.loyMix("fan"))} · คนใหม่ที่แวะมา ${pct(N.loyMix("drift"))} · แต่ละคนเห็นโฆษณาเฉลี่ย ${N.freq.toFixed(1)} ครั้ง`)}
          <VennBlock plan={N.plan} />
          <p className="plab">วัย</p><Bar parts={GENS.map((g) => ({ v: N.genShare(g), c: GHEX[g] }))} />
          <p className="plegend">{GENS.map((g) => `${g} ${pct(N.genShare(g))}`).join("   ·   ")}</p>
          <p className="plab">มาบ่อยแค่ไหน</p><Bar parts={[{ v: N.loyMix("fan"), c: "#0F2557" }, { v: N.loyMix("news"), c: "#64748B" }, { v: N.loyMix("drift"), c: "#CBD5E1" }]} />
          <p className="plegend">{`แฟนประจำ ${pct(N.loyMix("fan"))}   ·   มาเป็นช่วงๆ ${pct(N.loyMix("news"))}   ·   คนใหม่ ${pct(N.loyMix("drift"))}`}</p>
        </section>
        {/* 4. ad formats -> how people will talk about it */}
        <section className="rsec"><h2>3. โฆษณาได้กี่แบบ และคนจะพูดถึงยังไง</h2>
          {ed("f-lead", "p", `รายการทำได้ ${FORMATS.length} รูปแบบ เรียงจากแบบที่คนพูดถึงมากที่สุดไปน้อยที่สุด เลือกได้ตามงบและความเหมาะกับสินค้า`)}
          {FORMATS.map((f) => {
            const I = FORMAT_INFO[f.id], mn = Math.round(I.perEp() * P.n);
            return (
              <div className="pfbox" key={f.id}>
                <div className="pformat"><span className={"plevel " + I.kind}>{I.level}</span><div><b className="pfname">{f.name}</b>{ed("f-what-" + f.id, "p", I.what)}</div></div>
                <p className="plab">สิ่งที่คาดว่าจะเกิดในคอมเม้น</p>
                <ul className="pwhy big">{I.talk.map((t, j) => ed(`f-talk-${f.id}-${j}`, "li", t))}</ul>
                {ed("f-num-" + f.id, "p", mn ? `ถ้าลง ${P.n} EP คาดว่าจะมีคอมเม้นพูดถึงสินค้าราว ${mn} ครั้ง` : "ไม่คาดว่าจะมีคอมเม้นพูดถึงสินค้ามากนัก", "ed pstrong")}
                {ed("f-ev-" + f.id, "p", I.evidence(), "ed psmall")}
                {ed("f-tip-" + f.id, "p", "คำแนะนำ: " + I.tip, "ed ptip")}
              </div>
            );
          })}
          <table className="pcompare"><thead><tr><th>รูปแบบ</th><th>คนพูดถึง</th></tr></thead>
            <tbody>{FORMATS.map((f) => <tr key={f.id}><td>{f.name}</td><td>{FORMAT_INFO[f.id].level}</td></tr>)}</tbody></table>
        </section>
        {/* 5. safety */}
        <section className="rsec"><h2>4. ความปลอดภัยของแบรนด์</h2>
          {ed("safety", "p", P.safety.length ? `ไม่ลง EP ที่มีประเด็นอ่อนไหวระดับ${P.safety.join(" และ ")} หลังตัดออกแล้วยังมี EP ให้เลือก ${N.avail.map((a) => `${a.name} ${a.ok} จาก ${a.all} EP`).join(" · ")}` : "ลูกค้าไม่ได้ระบุข้อจำกัด ควรถามก่อนจองว่ารับประเด็นอ่อนไหว เช่น คดีทางเพศ หรือมีคนเสียชีวิต ได้ไหม")}
        </section>
        {/* 6. conversion */}
        <section className="rsec"><h2>5. ยอดขาย (Conversion)</h2>
          {ed("conv", "p", est == null ? "ยังประเมินยอดขายไม่ได้ เพราะยังไม่มีข้อมูลยอดขายจริงจากแบรนด์ แนะนำให้ใช้โค้ดส่วนลดแยกทุก EP เพื่อวัดผลจริงในแคมเปญนี้" : `ถ้าสมมติว่าทุก 1,000 วิวมีคนใช้โค้ด ${P.rate} ครั้ง จะได้ราว ${fmt(est)} ครั้ง ตัวเลขนี้เป็นสมมติฐาน ยังไม่ได้พิสูจน์ด้วยข้อมูลจริง`)}
        </section>
        <footer className="rsec pfoot"><p className="plab">ข้อควรรู้</p>
          <ul className="pwhy small">{[
            `ตัวเลขมาจากคนที่คอมเม้นบน YouTube ${D.n_eps} EP ปี 2569 (${fmt(D.n_people)} คน) ไม่ใช่คนดูทั้งหมด`,
            "ยอดวิวและคอมเม้นเป็นค่ากลางของปีนี้ EP จริงอาจได้มากหรือน้อยกว่ามากตามความดังของเรื่อง",
            `จำนวนคนไม่ซ้ำคลาดได้ราว ±${Math.round(D.reach.median_abs_error * 100)}% และวัยเป็นค่าประเมินจากข้อความ`,
            `วัยคิดจากคนที่ประเมินได้เท่านั้น คนที่สัญญาณไม่พอ (ราว ${GEN_UNKNOWN}% ของกลุ่มตัวอย่าง) นับเป็น "ไม่ระบุ" และไม่รวมในสัดส่วน`,
            "การจัดหมวด EP ตรวจแล้วตรงกับที่นักวิเคราะห์จัดไว้ 87% (Cohen's kappa 0.85)",
            "ยอดขายและ conversion ยังไม่มีข้อมูลจริง ตัวเลขในหัวข้อ 5 มาจากสมมติฐานที่กรอกเอง",
          ].map((t, j) => ed("note" + j, "li", t))}</ul>
        </footer>
      </article>
    </div>
  </>;
}

import { useMemo } from "react";
import { D, cnum, type Category, type Community, type Episode, type Loyalty } from "../data";
import { AGE18, GCOL, GENS, LDESC, LOY, SAI_FIT } from "../lib/constants";
import { fmt, pct, views, x2, ytUrl } from "../lib/format";
import { useModal } from "./overlay";
import { Age18, Bars, GenLegend, GenStack, Kpi, Legend, LiftChart, LoyLegend, LoyStack, Stack, Thumb, genRows } from "./ui";

function EpDetail({ e }: { e: Episode }) {
  return <>
    <a className="hero" href={ytUrl(e.vid)} target="_blank" rel="noopener" aria-label="เปิดคลิปบน YouTube">
      <Thumb vid={e.vid} cls="hero-img" /><span className="play">▶</span><span className="hero-cap">ดูบน YouTube</span>
    </a>
    <p><b>{e.title}</b><span className="muted small">{` · ออกอากาศ ${e.date}`}</span><Age18 ep={e.ep} /></p>
    <div className="grid g4">
      <Kpi v={views(e.views)} l="วิว" /><Kpi v={fmt(e.comments)} l="คอมเม้น" />
      <Kpi v={e.cr.toFixed(1)} l="คอมเม้นต่อ 1,000 วิว" /><Kpi v={e.lr.toFixed(1)} l="ไลก์ต่อ 1,000 วิว" />
    </div>
    <div className="grid g2">
      <div className="panel"><h3>ใครคอมเม้น</h3><LoyStack o={{ "แฟนตัวยง": e.fan, "นักเสพข่าว": e.news, "ขาจร": e.drift }} /><LoyLegend /></div>
      {e.gen ? <div className="panel"><h3>วัย (ประเมิน)</h3><GenStack g={e.gen} /><GenLegend /></div> : null}
    </div>
    {e.series ? <p className="note">เป็นส่วนหนึ่งของซีรีส์: {e.series}</p> : null}
    {AGE18.has(e.ep) ? <p className="note warn">คลิปจำกัดอายุ 18+ · คนดูต้องล็อกอินและอายุ 18 ปีขึ้นไปจึงจะคอมเม้นได้ สัดส่วนวัยและความภักดีของ EP นี้จึงมาจากคนที่ล็อกอินเท่านั้น</p> : null}
  </>;
}

function LoyaltyDetail({ l }: { l: Loyalty }) {
  const pr = D.loyalty_profile[l], g = D.overall.gen_by_loyalty[l];
  return <>
    <p className="lead">{LDESC[l]}</p>
    <div className="grid g3">
      <Kpi v={pct(D.overall.loyalty_pct[l])} l="ของคนคอมเม้น" />
      <Kpi v={pct(D.overall.comments_by_loyalty[l])} l="ของคอมเม้นทั้งหมด" />
      <Kpi v={fmt(pr.eps_med) + " EP"} l="คอมเม้น (ค่ากลางต่อคน)" />
    </div>
    <div className="panel"><h3>เป็นวัยไหน (ค่าประเมิน)</h3><Bars rows={genRows(g.pct, g.ci)} max={70} />
      <p className="small muted">{`ประเมินจากการอ่านคอมเม้น ${fmt(g.read)} คน ชี้ไปที่แท่งเพื่อดูช่วงที่น่าจะเป็น`}</p></div>
    <div className="note">{l === "แฟนตัวยง" ? "ใช้กับแบรนด์ที่อยากให้คนเห็นซ้ำหลายครั้ง วางหลาย EP ติดกันจะเจอคนกลุ่มนี้ซ้ำ" : l === "ขาจร" ? "ใช้กับแบรนด์ที่อยากได้คนใหม่ เลือก EP เรื่องดังที่ดึงคนนอกเข้ามา เช่น ดราม่าคนดัง ศาสนา" : "อยู่ระหว่างสองกลุ่ม ตามเรื่องที่สนใจเป็นช่วงๆ"}</div>
  </>;
}

function SaiDetail({ c }: { c: Community }) {
  const entries = Object.entries(c.lift).sort((a, b) => b[1] - a[1]);
  const best = entries.filter(([, v]) => v >= 1.15).map(([k]) => k);
  return <>
    <p className="lead">{c.desc}</p>
    <div className="grid g3"><Kpi v={fmt(c.people)} l="คน" /><Kpi v={pct(c.pct)} l="ของขาประจำ" /><Kpi v={pct(cnum(c, "แฟนตัวยง %"))} l="เป็นแฟนตัวยง" /></div>
    <div className="panel">
      <div className="panel-head"><h3>ชอบคอมเม้นหมวดไหน</h3><span className="small muted">เทียบกับสัดส่วนที่ออกอากาศช่วงที่เขาดู</span></div>
      <LiftChart entries={entries} /><Legend items={[["มากกว่าปกติ", "var(--up)"], ["น้อยกว่าปกติ", "var(--down)"]]} />
    </div>
    <div className="grid g2">
      <div className="panel"><h3>ความภักดี</h3><LoyStack o={Object.fromEntries(LOY.map((l) => [l, cnum(c, l + " %")])) as Record<Loyalty, number>} /><LoyLegend /></div>
      <div className="panel"><h3>วัย (ประเมินจากโมเดล)</h3><Stack parts={GENS.map((g) => ({ label: g, value: cnum(c, g + " (model)"), color: GCOL[g] }))} /><GenLegend /></div>
    </div>
    <div className="panel"><h3>สินค้าที่น่าจะเข้ากัน</h3><p>{SAI_FIT[c.name] || "–"}</p>
      <p className="small muted">เป็นสมมติฐานจากแนวเรื่องที่สายนี้ชอบ ยังไม่ได้พิสูจน์ด้วยยอดขาย</p>
      {best.length ? <div className="chips"><span className="small">วาง EP หมวด:</span>{best.map((b) => <span className="chip hot" key={b}>{b}</span>)}</div> : null}
    </div>
  </>;
}

function CatDetail({ c }: { c: Category }) {
  const subs = D.tag_by_cat.filter((t) => t.category === c.name).sort((a, b) => b.eps - a.eps);
  const idx = (v: number) => (v >= 1.15 ? "up" : v <= 0.85 ? "down" : "");
  return <>
    <div className="grid g4">
      <Kpi v={String(c.eps)} l="EP ในปีนี้" /><Kpi v={views(c.views)} l="วิวต่อ EP" />
      <Kpi v={fmt(c.comments)} l="คอมเม้นต่อ EP" /><Kpi v={c.comment_rate.toFixed(1)} l="คอมเม้นต่อ 1,000 วิว" />
    </div>
    <div className="grid g2">
      <div className="panel"><h3>ใครคอมเม้น (ค่ากลางต่อ EP)</h3><LoyStack o={{ "แฟนตัวยง": c.fan, "นักเสพข่าว": c.news, "ขาจร": c.drift }} /><LoyLegend />
        <p className="small muted">{c.drift >= D.base.drift + 3 ? "ขาจรมากกว่า EP ทั่วไป หมวดนี้ดึงคนใหม่ได้" : c.fan >= D.base.fan + 3 ? "แฟนตัวยงมากกว่า EP ทั่วไป เหมาะย้ำกับฐานแฟน" : "สัดส่วนใกล้ EP ทั่วไป"}</p></div>
      <div className="panel"><h3>วัยของคนคอมเม้น</h3>
        <Bars rows={GENS.map((g) => ({ label: g, value: c.gen[g], color: GCOL[g], tip: `${g} ${pct(c.gen[g])} (${x2(c.gen_lift[g])} เทียบทั้งรายการ)` }))} max={70} />
        <p className="small muted">ต่างจากภาพรวมไม่มาก ใช้ดูทิศทาง</p></div>
    </div>
    {subs.length ? <div className="panel"><h3>ประเด็นย่อยในหมวดนี้</h3>
      <div className="tbl-wrap"><table>
        <thead><tr><th>ประเด็น</th><th>EP</th><th>วิว (เทียบหมวด)</th><th>คอมเม้น/1,000 วิว (เทียบหมวด)</th></tr></thead>
        <tbody>{subs.map((s) => <tr key={s.tag}><td>{s.tag}</td><td>{s.eps}</td>
          <td className={idx(s.views_index)}>{x2(s.views_index)}</td><td className={idx(s.comment_rate_index)}>{x2(s.comment_rate_index)}</td></tr>)}</tbody>
      </table></div></div> : null}
    <div className="panel"><h3>EP ที่ได้วิวสูงสุดในหมวดนี้</h3>
      <div className="covers">{c.top_eps.slice(0, 3).map((e) =>
        <a className="cover" key={e.ep} href={ytUrl(e.video_id)} target="_blank" rel="noopener">
          <span className="cover-img"><Thumb vid={e.video_id} cls="cover-thumb" /></span>
          <span className="cover-t"><b>{`EP.${e.ep} `}</b>{e.title}</span>
        </a>)}</div>
      <div className="bars">{c.top_eps.slice(3).map((e) =>
        <div className="small" key={e.ep}><a href={ytUrl(e.video_id)} target="_blank" rel="noopener">{`EP.${e.ep}`}</a> {e.title}
          <span className="muted num">{` · ${views(e.views)} วิว · ${fmt(e.comments)} คอมเม้น`}</span></div>)}</div>
    </div>
  </>;
}

export function useDetails() {
  const { open } = useModal();
  return useMemo(() => ({
    ep: (e: Episode) => open(`EP.${e.ep} · ${e.cat}`, <EpDetail e={e} />),
    loyalty: (l: Loyalty) => open(l, <LoyaltyDetail l={l} />),
    sai: (c: Community) => open(c.name, <SaiDetail c={c} />),
    cat: (c: Category) => open(c.name, <CatDetail c={c} />),
  }), [open]);
}

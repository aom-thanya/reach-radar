import { D, type Category, type Episode, type Gen } from "../data";
import { GOALS, PRODUCTS, SENSITIVE, comm, type FormatId } from "../lib/constants";
import { liftWords, pct, views, x2 } from "../lib/format";

export interface Plan {
  brand: string; campaign: string; product: string; gen: Gen | "all"; goal: string; n: number; safety: string[]; rate: string;
}
export const PLAN0: Plan = { brand: "", campaign: "", product: "health", gen: "Gen X ขึ้นไป", goal: "loyal", n: 6, safety: ["สูง"], rate: "" };

export const product = (P: Plan) => PRODUCTS.find((p) => p.id === P.product)!;
export const goalOf = (P: Plan) => GOALS.find((g) => g.id === P.goal)!;
export const isOut = (P: Plan) => (e: Episode) => e.tags.some((t) => SENSITIVE[t] && P.safety.includes(SENSITIVE[t]));

export interface Reason { t: string; k: string }
export interface Ranked { c: Category; fit: number; gs: number | null; gl: number; score: number; reasons: Reason[] }

export function scoreCats(P: Plan): Ranked[] {
  const prod = product(P), goal = goalOf(P);
  const fitRaw = (c: Category) => prod.sai.reduce((s, n) => s + Math.log(comm(n).lift[c.name]), 0) / prod.sai.length;
  const genRaw = (c: Category) => (P.gen === "all" ? 0 : Math.log(c.gen_lift[P.gen]));
  const goalRaw = (c: Category) => (goal.key === "views" ? Math.log(c.views) : c[goal.key]);
  const norm = (f: (c: Category) => number) => {
    const v = D.categories.map(f), lo = Math.min(...v), hi = Math.max(...v);
    return (c: Category) => (hi === lo ? 50 : ((f(c) - lo) / (hi - lo)) * 100);
  };
  const nf = norm(fitRaw), ng = norm(genRaw), no = norm(goalRaw);
  const w = P.gen === "all" ? [0.6, 0, 0.4] : [0.5, 0.2, 0.3];
  return D.categories.map((c) => {
    const fit = nf(c), gs = P.gen === "all" ? null : ng(c), gl = no(c);
    const reasons: Reason[] = [];
    prod.sai.forEach((n) => { const v = comm(n).lift[c.name]; reasons.push({ t: `${n} ${x2(v)}`, k: v >= 1.15 ? "hot" : v <= 0.85 ? "cool" : "" }); });
    const gv = goal.key === "views" ? views(c.views) + " วิว" : goal.key === "comment_rate" ? c.comment_rate.toFixed(1) + " คอมเม้น/1,000 วิว" : pct(c[goal.key]) + (goal.key === "fan" ? " แฟนตัวยง" : " ขาจร");
    reasons.push({ t: gv, k: gl >= 60 ? "good" : "" });
    if (P.gen !== "all") reasons.push({ t: `${P.gen} ${x2(c.gen_lift[P.gen])}`, k: c.gen_lift[P.gen] >= 1.03 ? "good" : c.gen_lift[P.gen] <= 0.97 ? "cool" : "" });
    return { c, fit, gs, gl, score: w[0] * fit + w[1] * (gs || 0) + w[2] * gl, reasons };
  }).sort((a, b) => b.score - a.score);
}

export type PlanRow = Ranked & { n: number };
export function planNumbers(P: Plan) {
  const ranked = scoreCats(P), top = ranked.slice(0, 3);
  const alloc = [0, 0, 0];
  for (let i = 0; i < P.n; i++) alloc[[0, 1, 0, 2, 1, 0][i % 6]]++;
  const plan: PlanRow[] = top.map((r, i) => ({ ...r, n: alloc[i] })).filter((r) => r.n > 0);
  const tv = plan.reduce((s, r) => s + r.n * r.c.views, 0), tc = plan.reduce((s, r) => s + r.n * r.c.comments, 0);
  const genShare = (g: Gen) => (plan.reduce((s, r) => s + (r.n * r.c.views * r.c.gen[g]) / 100, 0) / tv) * 100;
  const loyMix = (k: "fan" | "news" | "drift") => plan.reduce((s, r) => s + r.n * r.c[k], 0) / P.n;
  const R = D.reach, Uc = (c: string, k: number) => R.curves[c][Math.min(k, R.kmax) - 1];
  const uniqRaw = R.n_commenters * (1 - plan.reduce((p, r) => p * (1 - Uc(r.c.name, r.n) / R.n_commenters), 1));
  const uniq = uniqRaw * (R.beta[plan.length] || 1), expo = plan.reduce((s, r) => s + r.n * R.mean_people_per_ep[r.c.name], 0);
  const out = isOut(P);
  const avail = plan.map((r) => { const all = D.eps.filter((e) => e.cat === r.c.name); return { name: r.c.name, all: all.length, ok: all.filter((e) => !out(e)).length }; });
  return { ranked, plan, tv, tc, genShare, loyMix, uniq, freq: expo / uniq, avail };
}

export function plainReason(P: Plan, r: PlanRow) {
  const prod = product(P), goal = goalOf(P), c = r.c, B = D.base, out: string[] = [];
  prod.sai.forEach((n) => { const v = comm(n).lift[c.name]; out.push(`คนกลุ่ม${n} คอมเม้นเรื่องหมวดนี้${v >= 1 ? "มากกว่า" : "น้อยกว่า"}ปกติ ${liftWords(v)}`); });
  if (goal.key === "views") out.push(`ได้ราว ${views(c.views)} วิวต่อ EP (ทั้งรายการ ${views(B.views)})`);
  else if (goal.key === "fan") out.push(`แฟนตัวยงราว ${pct(c.fan)} ของคนคอมเม้น (ทั้งรายการ ${pct(B.fan)})`);
  else if (goal.key === "drift") out.push(`คนใหม่ (ขาจร) ราว ${pct(c.drift)} ของคนคอมเม้น (ทั้งรายการ ${pct(B.drift)})`);
  else out.push(`คนคอมเม้น ${c.comment_rate.toFixed(1)} ครั้งต่อ 1,000 วิว (ทั้งรายการ ${B.comment_rate.toFixed(1)})`);
  if (P.gen !== "all") { const v = c.gen_lift[P.gen]; out.push(`${P.gen} ${Math.abs(v - 1) < 0.02 ? "ใกล้เคียงปกติ" : (v > 1 ? "มากกว่า" : "น้อยกว่า") + "ปกติ " + liftWords(v)}`); }
  return out;
}

export const FORMAT_INFO: Record<FormatId, { what: string; talk: string[]; level: string; kind: string; perEp: () => number; evidence: () => string; tip: string }> = {
  onscreen: {
    what: "พิธีกรหยิบสินค้ามาใช้จริง หรือยื่นให้แขกระหว่างคุยเรื่อง คนดูเห็นสินค้าอยู่ในเนื้อเรื่อง",
    talk: ["แซวพิธีกรหรือแขกที่ใช้สินค้า (เป็นมุกตลก ไม่ใช่โฆษณา)", "บอกว่าใช้สินค้าอยู่แล้ว หรือจะไปซื้อตาม", "จำชื่อสินค้าได้ และพูดถึงต่อใน EP ถัดๆ ไป"],
    level: "คนพูดถึงมากที่สุด", kind: "good",
    perEp: () => { const b = D.brands_comments.find((x) => x.brand === "M150"); return b ? b.comments / Math.max(b.eps, 1) : 0; },
    evidence: () => { const b = D.brands_comments.find((x) => x.brand === "M150") || { comments: 0, eps: 0 }; return `อ้างอิงจริง: M150 ที่พิธีกรยื่นให้แขก มีคนพูดถึง ${b.comments} คอมเม้นใน ${b.eps} EP และยาดมหงส์ไทยที่พิธีกรดมบนจอก็ถูกพูดถึงแบบเดียวกัน`; },
    tip: "ให้พิธีกรใช้สินค้าในจังหวะที่เข้ากับเรื่อง เช่น ยื่นให้แขกตอนเครียด จะถูกจำและถูกพูดต่อ",
  },
  read: {
    what: "พิธีกรอ่านชื่อและสรรพคุณสินค้า ช่วงมอบของให้แขกท้ายรายการ",
    talk: ["คนเห็นชื่อสินค้า แต่แทบไม่มีใครพูดถึงในคอมเม้น", "ถ้าไม่มีจังหวะใช้สินค้าจริง คนจะจำได้น้อย"],
    level: "คนพูดถึงน้อย", kind: "warn", perEp: () => 0,
    evidence: () => { const v = (D.brands_onair || []).find((x) => x.brand === "วิซี"); return v ? `อ้างอิงจริง: วิซีถูกพิธีกรอ่านชื่อ ${v.eps} จาก ${D.onair_eps} EP ที่ตรวจ แต่ไม่มีคอมเม้นพูดถึงเลย` : "อ้างอิงจากแบรนด์ที่ถูกอ่านชื่อช่วงมอบของ"; },
    tip: "เพิ่มจังหวะที่พิธีกรใช้สินค้าจริงคู่กับการอ่านชื่อ จะได้ผลดีกว่าอ่านชื่ออย่างเดียว",
  },
  break: {
    what: "โฆษณาช่วงพักรายการ ไม่ได้อยู่ในเนื้อเรื่อง",
    talk: ["ไม่พบคนพูดถึงแบรนด์ที่อยู่แค่ช่วงพักเลย", "มีคนบ่นในคอมเม้นว่าโฆษณาคั่นบ่อยและยาว"],
    level: "ไม่พบคนพูดถึง", kind: "", perEp: () => 0,
    evidence: () => "อ้างอิงจริง: ข้าวหงส์ทอง Nisit และครีมดารา ไม่มีคอมเม้นพูดถึงเลยทั้งปี",
    tip: "ใช้คู่กับรูปแบบที่พิธีกรใช้สินค้าบนจอ ถ้าลูกค้าอยากให้คนพูดถึง",
  },
};

// ---------- Venn: คนไม่ซ้ำ และคนที่ซ้ำกันระหว่างหมวด ----------
export const bits = (m: number) => { let c = 0; while (m) { c += m & 1; m >>= 1; } return c; };
export interface VSet { name: string; eps: number; u: number; people: number }
export interface Venn { sets: VSet[]; regions: { m: number; people: number }[]; union: number; N: number; lam: number }

export function vennModel(plan: PlanRow[]): Venn {
  const R = D.reach, N = R.n_commenters, Uc = (c: string, k: number) => R.curves[c][Math.min(k, R.kmax) - 1];
  const sets: VSet[] = plan.map((r) => ({ name: r.c.name, eps: r.n, u: Uc(r.c.name, r.n), people: 0 }));
  const n = sets.length, p = sets.map((s) => s.u / N), cal = R.beta[n] || 1;
  const total = sets.reduce((t, s) => t + s.u, 0);
  const target = n === 1 ? sets[0].u * cal : N * (1 - p.reduce((q, x) => q * (1 - x), 1)) * cal;  // คนไม่ซ้ำรวม ตัวเดียวกับที่รายงานใช้
  // เพิ่มสัดส่วนคนที่ซ้ำกันด้วยตัวคูณ lam ให้ผลรวมเท่ากับตัวเลขที่คาลิเบรตไว้ (คนคอมเม้นบ่อยมักโผล่หลายหมวด)
  let lam = 1;
  if (n === 2) lam = (total - target) / (p[0] * p[1] * N);
  else if (n === 3) {
    const s2 = (p[0] * p[1] + p[0] * p[2] + p[1] * p[2]) * N, s3 = p[0] * p[1] * p[2] * N, cc = total - target;
    const disc = s2 * s2 - 4 * s3 * cc;
    lam = disc > 0 ? (s2 - Math.sqrt(disc)) / (2 * s3) : s2 / (2 * s3);
  }
  lam = Math.max(1, Math.min(lam, 1 / Math.max(...p, 1e-9)));
  const regions: { m: number; people: number }[] = [];
  for (let m = 1; m < 1 << n; m++) {                                   // inclusion-exclusion ของแต่ละส่วนย่อย
    let people = 0;
    for (let q = 0; q < 1 << n; q++) {
      if ((q & m) !== m) continue;                                     // เอาเฉพาะชุดที่ครอบ m
      let t = N, c = 0;
      for (let i = 0; i < n; i++) if ((q >> i) & 1) { t *= p[i]; c++; }
      people += ((c - bits(m)) % 2 ? -1 : 1) * t * Math.pow(lam, c - 1);
    }
    regions.push({ m, people: Math.max(people, 0) });
  }
  if (n === 1) regions[0].people = target;
  sets.forEach((s, i) => (s.people = regions.filter((g) => (g.m >> i) & 1).reduce((t, g) => t + g.people, 0)));
  return { sets, regions, union: regions.reduce((t, g) => t + g.people, 0), N, lam };
}

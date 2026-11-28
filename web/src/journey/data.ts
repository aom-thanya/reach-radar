// Aggregates only. Hidden "#journey" page: how the data changed shape step by step.
import { D, type Gen, type Loyalty } from "../data";

export const N_DOTS = 400;
export const PER_DOT = Math.round(D.n_people / N_DOTS); // ≈ 703 people per dot

/** EDA: people by number of EPs commented (data/processed/eda/n_eps_distribution.csv, before dropping 10 copy-posters) */
export const NEPS: { b: string; people: number; pct: number; cpct: number }[] = [
  { b: "1", people: 181219, pct: 64.47, cpct: 25.8 },
  { b: "2", people: 43744, pct: 15.56, cpct: 12.9 },
  { b: "3–5", people: 36050, pct: 12.83, cpct: 20.2 },
  { b: "6–10", people: 12793, pct: 4.55, cpct: 15.3 },
  { b: "11–22", people: 5586, pct: 1.99, cpct: 13.9 },
  { b: "23–45", people: 1389, pct: 0.49, cpct: 7.6 },
  { b: "46–68", people: 206, pct: 0.07, cpct: 2.2 },
  { b: "69–136", people: 86, pct: 0.03, cpct: 1.7 },
  { b: "137+", people: 10, pct: 0.0, cpct: 0.3 },
];

export const SHORT: Record<string, string> = {
  "ดราม่าบุคคลสาธารณะ": "ดราม่าคนดัง", "ครอบครัว & ความสัมพันธ์": "ครอบครัว", "อาชญากรรม & การหลอกลวง": "อาชญากรรม",
  "อุบัติเหตุ & คดีอาญา": "อุบัติเหตุ", "ประเด็นสังคมทั่วไป": "สังคม", "ข้อพิพาท & คดีความ": "ข้อพิพาท",
  "ศาสนา & วัด": "ศาสนา", "สุขภาพ & การแพทย์": "สุขภาพ", "ความเชื่อ & ไสยศาสตร์": "ความเชื่อ", "ภัยพิบัติ & น้ำท่วม": "ภัยพิบัติ",
};
export const CATS = D.categories.map((c) => c.name);
/** Louvain block on the Jaccard co-audience graph (web_src/data.json → network.communities) */
export const QUIET = new Set(["สุขภาพ & การแพทย์", "ความเชื่อ & ไสยศาสตร์", "ภัยพิบัติ & น้ำท่วม"]);

/** Category ↔ category co-audience (Jaccard of commenter sets), web_src/data.json → network.shared */
const J: [number, number, number][] = [
  [5,1,.1525],[5,8,.0772],[5,0,.1396],[5,4,.1235],[5,9,.0354],[5,6,.124],[5,7,.1102],[5,2,.1706],[5,3,.158],
  [1,8,.0594],[1,0,.1678],[1,4,.1192],[1,9,.0234],[1,6,.102],[1,7,.0863],[1,2,.1713],[1,3,.1477],
  [8,0,.0494],[8,4,.0606],[8,9,.0465],[8,6,.0713],[8,7,.0799],[8,2,.0757],[8,3,.0656],
  [0,4,.1285],[0,9,.024],[0,6,.1028],[0,7,.0736],[0,2,.1668],[0,3,.1447],
  [4,9,.0318],[4,6,.0986],[4,7,.0852],[4,2,.1286],[4,3,.1178],
  [9,6,.04],[9,7,.0419],[9,2,.034],[9,3,.0292],
  [6,7,.0913],[6,2,.1169],[6,3,.1085],[7,2,.0995],[7,3,.0967],[2,3,.1594],
];
export const JACC = J.map(([a, b, w]) => ({ a: CATS[a], b: CATS[b], w }));

/** largest-remainder split of n into integer parts */
export function split(n: number, weights: number[]): number[] {
  const tot = weights.reduce((s, x) => s + x, 0);
  const raw = weights.map((w) => (w / tot) * n);
  const out = raw.map(Math.floor);
  let left = n - out.reduce((s, x) => s + x, 0);
  raw.map((r, i) => [r - Math.floor(r), i] as const).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
  return out;
}

export interface Dot { i: number; bucket: number; loy: Loyalty; gen: Gen; comm: number; sx: number; sy: number }

/** Dot i is ranked by activity (0 = most active), so buckets, loyalty and regulars line up. */
export function makeDots(): Dot[] {
  const bucketN = split(N_DOTS, NEPS.map((b) => b.people)).map((n, i) => (i === NEPS.length - 1 ? n : n));
  // keep the rare top buckets visible as at least one dot, taken from the "1 EP" bucket
  NEPS.forEach((_, i) => { if (i > 0 && bucketN[i] === 0) { bucketN[i] = 1; bucketN[0]--; } });
  const bucketOf: number[] = [];
  for (let b = NEPS.length - 1; b >= 0; b--) for (let k = 0; k < bucketN[b]; k++) bucketOf.push(b);

  const loyN = split(N_DOTS, D.loyalty.map((l) => D.overall.loyalty_pct[l])); // แฟนตัวยง, นักเสพข่าว, ขาจร
  const loyOf: Loyalty[] = [];
  D.loyalty.forEach((l, k) => { for (let j = 0; j < loyN[k]; j++) loyOf.push(l); });

  const genOf: Gen[] = new Array(N_DOTS);
  D.loyalty.forEach((l) => {
    const idx = loyOf.map((x, i) => (x === l ? i : -1)).filter((i) => i >= 0);
    const gp = D.overall.gen_by_loyalty[l].pct;
    const gn = split(idx.length, D.gens.map((g) => gp[g]));
    let p = 0;
    // interleave so each gen is spread through the blob, not a wedge
    const seq: Gen[] = [];
    D.gens.forEach((g, k) => { for (let j = 0; j < gn[k]; j++) seq.push(g); });
    const order = seq.map((g, k) => ({ g, key: ((k * 0.618034) % 1) })).sort((a, b) => a.key - b.key);
    idx.forEach((i) => { genOf[i] = order[p++].g; });
  });

  const regulars = Math.round((D.comm_n / D.n_people) * N_DOTS);
  const commN = split(regulars, D.communities.map((c) => c.people));
  const commOf: number[] = new Array(N_DOTS).fill(-1);
  let q = 0;
  // deal regulars round-robin by remaining quota so each community mixes fans and non-fans
  const quota = [...commN];
  while (q < regulars) {
    for (let c = 0; c < quota.length && q < regulars; c++) if (quota[c] > 0) { commOf[q++] = c; quota[c]--; }
  }

  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: N_DOTS }, (_, i) => ({
    i, bucket: bucketOf[i], loy: loyOf[i], gen: genOf[i], comm: commOf[i], sx: rnd(), sy: rnd(),
  }));
}

export const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
export const views = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(2) + " ล้าน" : fmt(n));
export const pct = (n: number | null | undefined) => (n == null ? "–" : (+n).toFixed(1) + "%");
export const liftWords = (v: number) => (v >= 1.5 ? (+v).toFixed(1) + " เท่า" : Math.round(Math.abs(v - 1) * 100) + "%");
export const x2 = (v: number) =>
  v >= 1.5 ? (+v).toFixed(1) + " เท่า" : Math.abs(v - 1) < 0.005 ? "เท่าปกติ" : (v > 1 ? "+" : "−") + Math.round(Math.abs(v - 1) * 100) + "%";
export const short = (v: number) =>
  v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e3 ? (v / 1e3).toFixed(0) + "K" : String(+v.toFixed(2));

export const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
export const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
export const niceTicks = (mx: number, n = 3) => {
  const step = Math.pow(10, Math.floor(Math.log10(mx / n)));
  const m = [1, 2, 2.5, 5, 10].find((k) => mx / (k * step) <= n)! * step;
  return Array.from({ length: Math.ceil(mx / m) + 1 }, (_, i) => i * m);
};
export const heatFill = (v: number, span: number) => {
  const t = Math.max(-1, Math.min(1, Math.log(v) / Math.log(span)));
  return t >= 0
    ? `color-mix(in srgb, var(--up) ${Math.round(t * 70)}%, var(--surface))`
    : `color-mix(in srgb, var(--down) ${Math.round(-t * 70)}%, var(--surface))`;
};
export const TH_M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
export const mLabel = (m: string) => TH_M[+m.slice(5, 7) - 1];
export const ytUrl = (vid: string) => `https://www.youtube.com/watch?v=${vid}`;
export const genShort = (g: string) => g.replace("Gen ", "").replace(" ขึ้นไป", "+");

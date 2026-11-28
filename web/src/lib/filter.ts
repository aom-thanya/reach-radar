import { D, type Episode } from "../data";
import { MONTHS, type MetricKey } from "./constants";
import { useKept } from "./kept";

export interface Filter { m0: number; m1: number; cats: string[] }
export const FULL: Filter = { m0: 0, m1: MONTHS.length - 1, cats: [] };

/** overview filter + metric, shared by the overview charts and the category / EP section below them */
export function useHomeFilter() {
  const [F, setF] = useKept<Filter>("home.filter", FULL);
  const [met, setMet] = useKept<MetricKey>("home.metric", "views");
  const inRange = (e: Episode) => { const i = MONTHS.indexOf(e.m); return i >= F.m0 && i <= F.m1; };
  const hasCat = (c: string) => !F.cats.length || F.cats.includes(c);
  const filtered = D.eps.filter((e) => inRange(e) && hasCat(e.cat));
  const isFiltered = F.cats.length > 0 || F.m0 > 0 || F.m1 < MONTHS.length - 1;
  const toggleCat = (c: string) => setF((f) => ({ ...f, cats: f.cats.includes(c) ? f.cats.filter((x) => x !== c) : [...f.cats, c] }));
  return { F, setF, met, setMet, inRange, hasCat, filtered, isFiltered, toggleCat };
}
export type HomeFilter = ReturnType<typeof useHomeFilter>;

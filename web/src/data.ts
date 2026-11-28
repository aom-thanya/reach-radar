// Aggregates only (built by scripts/18_build_backoffice.py). No handles, no comment text.
import raw from "./data/backoffice.json";

export type Gen = "Gen Z" | "Gen Y" | "Gen X ขึ้นไป";
export type Loyalty = "แฟนตัวยง" | "นักเสพข่าว" | "ขาจร";
export type GenMap<T = number> = Record<Gen, T>;
export type LoyMap<T = number> = Record<Loyalty, T>;
export type CI = [number, number];

export interface Episode {
  ep: number; date: string; m: string; cat: string; title: string; vid: string;
  views: number; likes: number; comments: number; people: number;
  cr: number; lr: number; fan: number; news: number; drift: number;
  series: string | null; part: number; tags: string[]; gen: GenMap | null;
}
export interface TopEp { ep: number; title: string; video_id: string; views: number; comments: number }
export interface Category {
  name: string; eps: number; people: number; views: number; likes: number; comments: number;
  like_rate: number; comment_rate: number; fan: number; news: number; drift: number;
  gen: GenMap; gen_lift: GenMap; gen_ci: GenMap<CI>; top_eps: TopEp[];
}
export interface Tag {
  tag: string; eps: number; views: number; likes: number; comments: number; like_rate: number;
  comment_rate: number; few_eps: boolean; fan_pct: number; drift_pct: number; gen: GenMap; gen_lift: GenMap;
}
export interface TagByCat {
  category: string; tag: string; eps: number; views_index: number; like_rate_index: number;
  comments_index: number; comment_rate_index: number; example_eps: string;
}
export interface Community {
  cluster: number; people: number; pct: number; name: string; desc: string; top: string; low: string;
  lift: Record<string, number>;
  [k: string]: unknown;
}
export interface Overall {
  gen_read: number; gen_labelled: number; gen_pct: GenMap; gen_ci: GenMap<CI>;
  gen_by_loyalty: LoyMap<{ pct: GenMap; ci: GenMap<CI>; read: number; labelled: number }>;
  loyalty_people: LoyMap; loyalty_pct: LoyMap; comments_by_loyalty: LoyMap;
}
export interface Reach {
  n_commenters: number; kmax: number; curves: Record<string, number[]>;
  mean_people_per_ep: Record<string, number>; beta: Record<string, number>; median_abs_error: number;
}
export interface Data {
  generated: string; date_range: [string, string]; n_eps: number; n_comments: number; n_people: number;
  gens: Gen[]; loyalty: Loyalty[]; overall: Overall;
  loyalty_profile: LoyMap<{ people: number; eps_med: number }>;
  base: { views: number; likes: number; comments: number; like_rate: number; comment_rate: number; fan: number; drift: number };
  categories: Category[]; tags: Tag[]; tag_by_cat: TagByCat[]; communities: Community[]; comm_n: number;
  series_views: number; single_views: number;
  brands_comments: { brand: string; comments: number; people: number; eps: number }[];
  brands_onair: { brand: string; eps: number; mentions: number }[]; onair_eps: number;
  eps: Episode[]; gen_x_loy: GenMap<LoyMap>;
  series_parts: { series: string; part: number; ep: number; views: number; comments: number; v1: number; c1: number }[];
  reach: Reach; thumbs: string[];
}

export const D = raw as unknown as Data;

/** numeric field of a community row, e.g. "Gen Z (model)" or "แฟนตัวยง %" */
export const cnum = (c: Community, k: string) => c[k] as number;

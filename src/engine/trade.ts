// 武将で遊ぶ: 特産品の商い。特産のある城下で仕入れ、遠くの町（京・堺・博多などの商いの要所はなお高く）で売る。
// 値は月ごとに上下する。同じ町で売り続けると値が崩れ（月ごとに戻る）、他家の町では関銭が一割。荷を持って野を行くと、まれに野盗に奪われる
import { COMMERCE_BONUS, PRODUCTS } from '../data/economy';
import { hexDist } from './map';
import * as R from './rules';
import { castleKoku, clanName, hexOwner, hostile, rand } from './state';
import type { Castle, GameState } from './types';
import type { Act } from './hero';
import { lv } from './skill';

export interface Cargo { n: number; cost: number } // 荷の数と、仕入れにかかった金の合計
export const TRADE = {
  CAP: [40, 25, 15, 8], // 身分ごとに持てる荷（宿老・侍大将・足軽大将・足軽組頭）
  PER_KIND: { horse: 60, iron: 45, powder: 50 } as Record<string, number>, // 荷一つの基の値（商いの品は商業の上乗せ÷5）
  DIST: 0.09, DIST_MAX: 1.6, // 産地からの道のり（十里ほど＝hx(1)ごと）に+9%、最大+160%
  HUB: 0.25, BIG: 0.1, HOME: 0.7, // 商いの要所+25%・大きな城下+10%・産地で売ると7割
  TOLL: 0.1, // 他家の町の関銭
  GLUT: 0.025, GLUT_MAX: 0.6, GLUT_BACK: 0.08, // 荷一つ売るごとに値が2.5%崩れる（最大6割）、月に8%ずつ戻る
  BANDIT: 0.04, BANDIT_FOE: 0.06, BANDIT_LOSS: 1 / 3, // 荷を持って野を行く1旬ごとの野盗（敵の領分ではさらに）と、奪われる割合
};
export const productOf = (id: string) => PRODUCTS.find(([c]) => c === id);
export const productName = (id: string) => productOf(id)?.[1] ?? id;
const baseOf = (id: string) => { const p = productOf(id); if (!p) return 40; return p[2] === 'com' ? Math.round(p[3] / 5) : TRADE.PER_KIND[p[2]] ?? 45; };
// 月ごとの値動き（0.8〜1.2。品と町と月で決まる）
const wave = (s: GameState, id: string, town: number) => { let h = 2166136261; for (const ch of `${id}|${town}|${s.year * 12 + s.month}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return 0.8 + ((h >>> 0) % 1000) / 2500; };
const originOf = (s: GameState, id: string) => s.castles.find((c) => c.id === id);
const foreign = (s: GameState, c: Castle) => { const me = s.generals[s.hero!.id]; return !!c.owner && c.owner !== me.clan; };
export const capOf = (s: GameState) => TRADE.CAP[s.generals[s.hero!.id].rank] ?? 8;
export const loadOf = (s: GameState) => Object.values(s.hero!.cargo ?? {}).reduce((t, x) => t + x.n, 0);

// この城下で仕入れられる品と値（荷一つ）
export function buyOffer(s: GameState, c: Castle): { id: string; name: string; price: number } | null {
  const p = productOf(c.id);
  if (!p) return null;
  const price = Math.round(baseOf(c.id) * wave(s, c.id, c.i) * (foreign(s, c) ? 1 + TRADE.TOLL : 1));
  return { id: c.id, name: p[1], price };
}
// この城下で売る値（荷一つ）
export function sellPrice(s: GameState, c: Castle, id: string): number {
  const o = originOf(s, id);
  const d = o ? hexDist(o.hex, c.hex) / R.hx(1) : 0;
  let m = c.id === id ? TRADE.HOME : 1 + Math.min(TRADE.DIST_MAX, d * TRADE.DIST);
  if (COMMERCE_BONUS[c.id]) m += TRADE.HUB; else if (castleKoku(c) >= 12) m += TRADE.BIG;
  const g = s.hero!.glut?.[`${c.i}:${id}`] ?? 0;
  return Math.max(1, Math.round(baseOf(id) * m * wave(s, id, c.i) * (1 - g) * (foreign(s, c) ? 1 - TRADE.TOLL : 1) * (1 + lv(s, 'sanjutsu') * 0.03)));
}
// 商いのできる城下: 特産のある町か、市の立つ大きな町・商いの要所
export const canTrade = (s: GameState, c: Castle) => !!productOf(c.id) || !!COMMERCE_BONUS[c.id] || castleKoku(c) >= 12;

export function buy(s: GameState, n: number): Act {
  const H = s.hero!, c = s.castles[H.town];
  if (H.field || H.army) return { ok: false, text: '城下でなければ商いはできない' };
  const o = buyOffer(s, c);
  if (!o) return { ok: false, text: 'この城下には仕入れられる特産がない' };
  const room = capOf(s) - loadOf(s);
  const k = Math.min(n, room, Math.floor(H.gold / o.price));
  if (k <= 0) return { ok: false, text: room <= 0 ? `荷駄がいっぱいだ（${capOf(s)}荷まで）` : `金が足りない（荷一つ${o.price}貫）` };
  H.gold -= k * o.price;
  const cg = ((H.cargo ??= {})[o.id] ??= { n: 0, cost: 0 });
  cg.n += k; cg.cost += k * o.price;
  H.jun++;
  return { ok: true, text: `${o.name}を${k}荷仕入れた（荷一つ${o.price}貫・計${k * o.price}貫${foreign(s, c) ? '・関銭込み' : ''}）。荷駄 ${loadOf(s)}/${capOf(s)}。` };
}
export function sell(s: GameState, id: string): Act {
  const H = s.hero!, c = s.castles[H.town];
  if (H.field || H.army) return { ok: false, text: '城下でなければ商いはできない' };
  if (!canTrade(s, c)) return { ok: false, text: 'この城下には品を買う問屋がない' };
  const cg = H.cargo?.[id];
  if (!cg?.n) return { ok: false, text: 'その荷は持っていない' };
  // 一つずつ値を崩しながら売る
  let got = 0;
  const key = `${c.i}:${id}`, gl = (H.glut ??= {});
  for (let k = 0; k < cg.n; k++) { got += sellPrice(s, c, id); gl[key] = Math.min(TRADE.GLUT_MAX, (gl[key] ?? 0) + TRADE.GLUT); }
  const n = cg.n, gain = got - cg.cost;
  H.gold += got; delete H.cargo![id];
  H.jun++;
  return { ok: true, text: `${productName(id)}${n}荷を${c.name}で売った。${got}貫（仕入れ${cg.cost}貫、${gain >= 0 ? `儲け${gain}` : `損${-gain}`}貫${foreign(s, c) ? `・${clanName(s, c.owner!)}家の関銭を引かれた` : ''}）。` };
}
// 毎月: 崩れた値が戻る
export function tradeMonth(s: GameState) {
  const g = s.hero?.glut;
  if (!g) return;
  for (const k of Object.keys(g)) { g[k] -= TRADE.GLUT_BACK; if (g[k] <= 0) delete g[k]; }
}
// 荷を持って野を行く: 野盗（敵の領分ではなお）
export function bandits(s: GameState): string | null {
  const H = s.hero!, me = s.generals[H.id];
  if (!H.field || !loadOf(s)) return null;
  const own = hexOwner(s, H.hex);
  const p = TRADE.BANDIT + (own && me.clan && hostile(s, me.clan, own) ? TRADE.BANDIT_FOE : 0);
  if (rand(s) >= p) return null;
  let lost = 0;
  for (const [id, cg] of Object.entries(H.cargo ?? {})) { const k = Math.ceil(cg.n * TRADE.BANDIT_LOSS); cg.cost = Math.round(cg.cost * (cg.n - k) / cg.n); cg.n -= k; lost += k; if (!cg.n) delete H.cargo![id]; }
  return `野盗に襲われ、荷を${lost}荷奪われた。`;
}

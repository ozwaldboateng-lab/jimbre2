// 融合の第三段: 宿老の主人公が、攻略の総大将として自ら軍勢を率いる（物語の外）。
// 自分の城（なければ今いる自家の城）の城兵と手勢で軍勢を立て、地図の上で動かし、敵の城や軍勢へ出陣を命じる。
// 軍勢は大名のAIには動かさせない（月の初めに主人公の命じた位置と命令へ戻す）。合戦は自ら采配するなら合戦の画面で、軍勢の全部隊を動かせる
import { heiCap, type Act } from './hero';
import { NEIGHBORS, hexDist } from './map';
import { attackTargets, pathTo, reachable, stepCost } from './move';
import { formArmy, moveArmy } from './ops';
import { orderAttack } from './orders';
import * as R from './rules';
import { castleAt, garrisonMax, hexOwner, hostile, occupancy } from './state';
import type { Army, Castle, GameState } from './types';

export const LEAD = { SHARE: 0.6, MIN: 500 }; // 城兵の6割まで連れて出る。五百人に満たなければ出られない
export const leading = (s: GameState): Army | null => { const id = s.hero?.leads; return id !== undefined && s.armies[id] ? s.armies[id] : null; };
export function canLead(s: GameState): string | null {
  const H = s.hero!, me = s.generals[H.id];
  if (H.story === 'toshiie' || !me.clan) return '物語の外の主人公だけ';
  if (me.rank > 1) return '侍大将になってから';
  if (H.quest?.kind !== 'kouryaku' || H.quest.done >= H.quest.need) return '攻略の主命を受けている時だけ';
  if (H.field || H.army !== null && H.army !== undefined) return '城下にいる時だけ';
  const c = s.castles[H.town];
  const enough = (x: { garrison: number }) => Math.min(heiCap(s), Math.round(x.garrison * LEAD.SHARE) + (H.ie?.shu ?? 0)) >= LEAD.MIN;
  if (c.owner !== me.clan || !enough(c)) { // 出られない時は、出られるいちばん近い自家の城を教える
    const alt = s.castles.filter((x) => x.owner === me.clan && x.i !== c.i && enough(x)).sort((x, y) => hexDist(x.hex, c.hex) - hexDist(y.hex, c.hex))[0];
    const base = c.owner !== me.clan ? '自家の城の城下から出陣する' : `この城の兵では${LEAD.MIN}人に満たない`;
    return `${base}${alt ? `（${alt.name}からなら出られる。旅で向かう）` : ''}`;
  }
  return null;
}
export function lead(s: GameState): Act {
  const why = canLead(s);
  if (why) return { ok: false, text: why };
  const H = s.hero!, me = s.generals[H.id], c = s.castles[H.town];
  const cap = heiCap(s), shu = Math.min(H.ie?.shu ?? 0, cap); // 身分の兵の上限まで（手勢を先に）
  const take = Math.min(Math.round(Math.min(c.garrison, garrisonMax(c)) * LEAD.SHARE), cap - shu);
  const at = musterHex(s, c);
  if (at === null) return { ok: false, text: '城にも城の周りにも軍勢がひしめいていて、軍勢を出す場所がない' };
  me.status = 'free'; // 本体の軍勢の主将として立てる（立てたあと主人公に戻す）
  const a = formArmy(s, me.clan!, c, me.id, take + shu, at);
  if (!a) { me.status = 'hero'; return { ok: false, text: '軍勢を出す場所がない' }; }
  c.garrison -= take; if (H.ie) H.ie.shu = 0;
  a.heroLed = true; a.mp = R.MOVE_POINTS; a.acted = false; a.food = R.CARRY_MONTHS;
  me.status = 'army'; me.army = a.id;
  H.leads = a.id; H.army = a.id; H.joined = s.turn; H.leadShu = shu;
  if (a.hex !== c.hex) { H.hex = a.hex; H.field = true; }
  if (H.quest) H.quest.joined = true;
  H.jun++;
  return { ok: true, text: `${c.name}の城兵${take}・手勢${shu}、合わせて${take + shu}の軍勢を率いて出陣した。地図で動かし、敵の城か軍勢を押せば出陣を命じる。合戦は月の終わりに起きる。` };
}
// 軍勢を立てるマス: 城のマスに味方の軍勢がいれば、隣の空いたマス（自家の土地を先に、敵の城は除く）
function musterHex(s: GameState, c: Castle): number | null {
  const occ = occupancy(s), clan = c.owner!;
  if (!occ.has(c.hex)) return c.hex;
  const cand = NEIGHBORS[c.hex].filter((h) => !occ.has(h) && (!castleAt(s, h) || castleAt(s, h)!.owner === clan) && !(hexOwner(s, h) && hostile(s, clan, hexOwner(s, h))));
  cand.sort((x, y) => Number(hexOwner(s, y) === clan) - Number(hexOwner(s, x) === clan) || stepCost(c.hex, x) - stepCost(c.hex, y));
  return cand[0] ?? null;
}
// 地図で押したマス: 動かせる所なら進み、敵なら出陣を命じる
export function commandHex(s: GameState, hex: number): Act {
  const a = leading(s), H = s.hero!;
  if (!a) return { ok: false, text: '軍勢を率いていない' };
  const tg = attackTargets(s, a).find((t) => t.hex === hex);
  if (tg) { orderAttack(s, a, hex, true); H.order = hex; H.jun++; const c = castleAt(s, hex); return { ok: true, text: `${c ? c.name : '敵の軍勢'}へ出陣を命じた。月の終わりに合戦となる。` }; }
  const r = reachable(s, a);
  const path = pathTo(r, a.hex, hex);
  if (path.length < 2) return { ok: false, text: a.mp <= 0 ? '今月はもう動けない（来月また動ける）' : 'そこへは進めない' };
  let at = a.hex;
  for (const h of path.slice(1)) { const cost = stepCost(at, h); if (cost > a.mp) break; moveArmy(s, a, h, cost); at = h; if (a.mp <= 0) break; }
  H.hex = a.hex; const c = castleAt(s, a.hex); if (c) { H.town = c.i; H.field = false; } else H.field = true;
  H.order = undefined; H.jun++;
  return { ok: true, text: `軍勢を進めた（残りの足${Math.max(0, a.mp)}）。` };
}
// 攻略の城へ向かう: 届くマスのうち、その城にいちばん近い所まで進む。隣まで来ていれば出陣を命じる
export function advance(s: GameState, ci: number): Act {
  const a = leading(s);
  if (!a) return { ok: false, text: '軍勢を率いていない' };
  const c = s.castles[ci];
  if (attackTargets(s, a).some((t) => t.hex === c.hex)) return commandHex(s, c.hex);
  const r = reachable(s, a);
  let best = a.hex, bd = hexDist(a.hex, c.hex);
  for (const h of r.cost.keys()) { const d = hexDist(h, c.hex); if (d < bd) { bd = d; best = h; } }
  if (best === a.hex) return { ok: false, text: a.mp <= 0 ? '今月はもう動けない（来月また動ける）' : 'これ以上近づけない' };
  return commandHex(s, best);
}
// 軍勢を城へ戻して解く（兵は近くの自家の城へ、手勢は家へ）
export function disband(s: GameState): Act {
  const a = leading(s), H = s.hero!, me = s.generals[H.id];
  if (!a) return { ok: false, text: '軍勢を率いていない' };
  const sick = (me.sick ?? 0) > 0;
  if (!sick && Object.values(s.armies).some((x) => hostile(s, me.clan!, x.clan) && Math.abs(x.hex - a.hex) <= 0)) return { ok: false, text: '敵と向き合っていて解けない' };
  const shu = Math.min(a.troops, H.leadShu ?? 0), rest = a.troops - shu;
  const home = s.castles.filter((c) => c.owner === me.clan).sort((x, y) => Math.abs(x.hex - a.hex) - Math.abs(y.hex - a.hex))[0];
  if (home) home.garrison = Math.min(garrisonMax(home), home.garrison + rest);
  if (H.ie) H.ie.shu += shu;
  delete s.armies[a.id]; s.orders = (s.orders ?? []).filter((o) => o.army !== a.id);
  endLead(s);
  H.jun++;
  if (sick && home) { H.town = home.i; H.hex = home.hex; H.field = false; H.dest = null; me.loc = home.i; } // 病なら、兵とともに城へ下がる
  return { ok: true, text: `軍勢を解いた。兵は${home?.name ?? '城'}へ、手勢${shu}は家へ戻った。${sick ? `病の身は${home?.name ?? '城'}の城下で養生する。` : ''}` };
}
export function endLead(s: GameState) {
  const H = s.hero!, me = s.generals[H.id];
  H.leads = undefined; H.army = null; H.order = undefined; H.leadShu = undefined;
  if (me.status !== 'dead' && me.status !== 'captive') { me.status = 'hero'; me.army = null; }
}
// 大名のAIが動かしたあと: 主人公の軍勢を、主人公の命じた位置と命令へ戻す（月の処理の前）
export interface LeadSnap { id: number; hex: number; mp: number; order?: number }
export const snapLead = (s: GameState): LeadSnap | null => { const a = leading(s); return a ? { id: a.id, hex: a.hex, mp: a.mp, order: s.hero!.order } : null; };
export function restoreLead(s: GameState, sn: LeadSnap | null) {
  if (!sn) return;
  const a = s.armies[sn.id];
  if (!a) { endLead(s); return; }
  a.hex = sn.hex; a.mp = sn.mp; a.main = s.hero!.id;
  s.orders = (s.orders ?? []).filter((o) => o.army !== a.id);
  if (sn.order !== undefined) orderAttack(s, a, sn.order, true);
}
// 毎月: 軍勢が消えた（壊滅・降伏）なら率いるのをやめる。動く足を戻す
export function leadMonth(s: GameState): string[] {
  const H = s.hero;
  if (!H || H.leads === undefined) return [];
  const a = s.armies[H.leads];
  if (!a) { endLead(s); return ['率いていた軍勢は散った。']; }
  H.hex = a.hex; H.order = undefined;
  return [];
}

// 武将で遊ぶ（物語の外）: 領主（城持ちより上）。城を預かったら、主人公の領を本体の領（方面軍団）として作り、
// その領だけを遊び手が大名の画面で動かす（月刻み）。主家のほかの部分（直轄・ほかの領・外交）は大名（AI）が動かす。
// 年貢・商いの8割は領の蔵へ、2割は主家へ（本体の領の仕組みのまま）。内政の費えは領の蔵から。城をすべて失えば、また城下を歩く武将に戻る
import { frontsOf } from './fronts';
import { HERO, heroEnd } from './hero';
import { careerMonth } from './career';
import { familyYear } from './family';
import { hpMonth } from './skill';
import { addLog, clanCastles, rand } from './state';
import type { Castle, Front, GameState, General } from './types';

export const RYO = { SEED_GOLD: 500 }; // 領を立てた時、主君から預かる元手（領の蔵）
type RX = { mode?: 'ryoshu' };
const X = (s: GameState) => s.hero as (NonNullable<GameState['hero']> & RX) | undefined;
const domainOf = (s: GameState): number[] => { const H = s.hero!; return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])]; };

export const ryoshuOf = (s: GameState): Front | undefined => { const H = X(s); return H?.mode === 'ryoshu' ? frontsOf(s).find((f) => f.manual && f.leader === H.id && !f.vacant) : undefined; };
export const isRyoshu = (s: GameState) => !!ryoshuOf(s);
// その城を遊び手が治められるか（領主なら自分の領の城だけ。大名なら自家の城）
export const canRule = (s: GameState, c: Castle) => { const f = ryoshuOf(s); return c.owner === s.player && (!f && !X(s)?.mode ? true : !!f && f.castles.includes(c.i)); };
// その武将を遊び手が使えるか（領主なら主人公と、主人公の家臣・陪臣だけ）
export const canUse = (s: GameState, g: General) => { const H = X(s); return !H?.mode ? g.clan === s.player : g.id === H.id || g.liege === H.id; };

// 城を預かった時: 領（方面軍団）を作り、領主の画面へ。方面軍団長の方面があればそれを使う
export function toRyoshu(s: GameState): Front | null {
  const H = X(s)!, me = s.generals[H.id], clan = me.clan;
  if (!clan || clan !== s.player) return null;
  const dom = domainOf(s).filter((i) => s.castles[i].owner === clan);
  if (!dom.length) return null;
  let f = frontsOf(s).find((x) => x.leader === me.id && !x.vacant);
  if (!f) {
    f = { id: (s.nextFrontId = (s.nextFrontId ?? 0) + 1), leader: me.id, castles: [], policy: 'defend', target: null, seat: dom[0], gold: RYO.SEED_GOLD, food: 0 };
    frontsOf(s).push(f);
  }
  for (const i of dom) { for (const o of frontsOf(s)) if (o !== f) o.castles = o.castles.filter((x) => x !== i); if (!f.castles.includes(i)) f.castles.push(i); }
  f.manual = true; f.seat = f.castles.includes(H.fuchu ?? -1) ? H.fuchu : f.castles[0];
  // 家臣は領の陪臣（部隊を率い、城主になれる）に。主人公に仕えるまま
  for (const id of H.retainers ?? []) { const g = s.generals[id]; if (g && g.status === 'kashin') { g.status = 'free'; g.liege = me.id; g.loc = f.seat!; } }
  H.mode = 'ryoshu';
  const seat = s.castles[f.seat!]; H.town = seat.i; H.hex = seat.hex; H.field = false; H.dest = null; me.loc = seat.i; // 領主は居城にいる
  addLog(s, `${me.name}が${f.castles.map((i) => s.castles[i].name).join('・')}の領主となった。`, 'info', true);
  return f;
}
// 城をすべて失った・主家を離れた: 領を解いて、城下を歩く武将に戻る
export function toHero(s: GameState, why = '') {
  const H = X(s); if (!H) return;
  const me = s.generals[H.id];
  for (const f of frontsOf(s)) if (f.leader === H.id) f.manual = false;
  s.fronts = frontsOf(s).filter((f) => f.leader !== H.id || f.castles.length > 0 && f.manual);
  for (const id of H.retainers ?? []) { const g = s.generals[id]; if (g && g.status === 'free' && g.clan === me.clan) { g.status = 'kashin'; g.liege = me.id; } }
  H.mode = undefined;
  if (why) addLog(s, `${me.name}は${why}`, 'info', true);
}
// 領の蔵で払う（本体の内政は家の金で見るので、その間だけ家の金を領の蔵に置き換える）
export function withFiefGold<T>(s: GameState, fn: () => T): T {
  const f = ryoshuOf(s);
  if (!f) return fn();
  const C = s.clans[s.player], before = C.gold;
  C.gold = f.gold ?? 0;
  try { return fn(); } finally { f.gold = C.gold; C.gold = before; }
}
export const fiefCastles = (s: GameState): Castle[] => { const f = ryoshuOf(s); return f ? f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player) : clanCastles(s, s.player); };

// 月の終わり（大名たちの月の処理のあと）: 俸禄・出世の節目・家族・体力。主家を離れた・城をすべて失った・世を去れば、武将に戻る（back）
export function ryoshuAfter(s: GameState): { lines: string[]; back: boolean; beats: import('../data/story_toshiie').Beat[] } {
  const H = X(s); if (!H) return { lines: [], back: false, beats: [] };
  const me = s.generals[H.id], out: string[] = [];
  const end = heroEnd(s);
  if (end || !me.clan || me.clan !== s.player) { toHero(s); return { lines: end ? [end] : [], back: true, beats: [] }; }
  const pay = HERO.PAY[me.rank] ?? 50; H.gold += pay;
  out.push(`俸禄${pay}貫を受け取った（手元${H.gold}貫）。`);
  if (s.month === 1) out.push(...familyYear(s));
  out.push(...hpMonth(s, () => rand(s)));
  const cev = careerMonth(s);
  if (cev) out.push(...cev.lines);
  const f = ryoshuOf(s);
  if (f) for (const i of domainOf(s)) if (s.castles[i].owner === me.clan && !f.castles.includes(i)) { for (const o of frontsOf(s)) if (o !== f) o.castles = o.castles.filter((x) => x !== i); f.castles.push(i); } // 国持ちで預かった城を領に
  if (!ryoshuOf(s) || !domainOf(s).some((i) => s.castles[i].owner === me.clan)) { toHero(s); return { lines: [...out, '治める城をすべて失い、城下を歩く身に戻った。'], back: true, beats: cev?.beats ?? [] }; }
  return { lines: out, back: false, beats: cev?.beats ?? [] };
}

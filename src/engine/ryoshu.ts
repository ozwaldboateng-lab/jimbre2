// 武将で遊ぶ（物語の外）: 領主（城持ちより上）。城を預かったら、主人公の領を本体の領（方面軍団）として作り、
// その領だけを遊び手が大名の画面で動かす（月刻み）。主家のほかの部分（直轄・ほかの領・外交）は大名（AI）が動かす。
// 年貢・商いの8割は領の蔵へ、2割は主家へ（本体の領の仕組みのまま）。内政の費えは領の蔵から。城をすべて失えば、また城下を歩く武将に戻る
import { frontsOf } from './fronts';
import { HERO, heroEnd } from './hero';
import { careerMonth, syncGovernor } from './career';
import { familyYear } from './family';
import { hpMonth } from './skill';
import { orderMonth } from './ryohyojo';
import { defectOfferMonth } from './ryoplot';
import { ryoshinMonth } from './ryoshin';
import { KASHIN, capOf, retainersOf, take } from './kashin';
import { addLog, clanCastles, clanName, hostile, rand } from './state';
import { NEIGHBORS, hexDist } from './map';
import { castleCom } from './money';
import { taxDef } from './invest';
import * as R from './rules';
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
export const canUse = (s: GameState, g: General) => { const H = X(s); return !H?.mode ? g.clan === s.player : g.id === H.id || g.liege === H.id || (g.yoriki === H.id && g.clan === s.player); }; // 主人公・家臣・与力

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
  if (H.quest && !H.army && H.leads === undefined) { H.quest = null; H.hyojo = undefined; } // 武将の主命は解く（領主は評定で命を受ける。覚えは下げない）
  H.mode = 'ryoshu';
  syncGovernor(s);
  const seat = s.castles[f.seat!]; H.town = seat.i; H.hex = seat.hex; H.field = false; H.dest = null; me.loc = seat.i; // 領主は居城にいる
  addLog(s, `${me.name}が${f.castles.map((i) => s.castles[i].name).join('・')}の領主となった。`, 'info', true);
  return f;
}
// 城をすべて失った・主家を離れた: 領を解いて、城下を歩く武将に戻る
export function toHero(s: GameState, why = '') {
  const H = X(s); if (!H) return;
  const me = s.generals[H.id];
  for (const f of frontsOf(s)) if (f.leader === H.id) f.manual = false;
  for (const g of Object.values(s.generals)) if (g.yoriki === H.id) g.yoriki = undefined; // 与力を解く
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
  if (me.status === 'free' || me.status === 'governor') me.status = 'hero'; // 率いていた部隊を解いた
  syncGovernor(s);
  const pay = HERO.PAY[me.rank] ?? 50; H.gold += pay;
  out.push(`俸禄${pay}貫を受け取った（手元${H.gold}貫）。`);
  if (s.month === 1) out.push(...familyYear(s));
  out.push(...hpMonth(s, () => rand(s)));
  out.push(...gunyakuMonth(s));
  out.push(...orderMonth(s));
  out.push(...defectOfferMonth(s));
  out.push(...ryoshinMonth(s)); // 主君の疑い・加増と国替え・席次と讒言
  const cev = careerMonth(s);
  if (cev) out.push(...cev.lines);
  const f = ryoshuOf(s);
  if (f) for (const i of domainOf(s)) if (s.castles[i].owner === me.clan && !f.castles.includes(i)) { for (const o of frontsOf(s)) if (o !== f) o.castles = o.castles.filter((x) => x !== i); f.castles.push(i); } // 国持ちで預かった城を領に
  if (!ryoshuOf(s) || !domainOf(s).some((i) => s.castles[i].owner === me.clan)) { toHero(s); return { lines: [...out, '治める城をすべて失い、城下を歩く身に戻った。'], back: true, beats: cev?.beats ?? [] }; }
  return { lines: out, back: false, beats: cev?.beats ?? [] };
}

// 領主が自分の領の城にいる浪人を、自分の家臣として召し抱える（支度金は手元の金から。家臣の枠まで）
export function recruitRonin(s: GameState, g: General): { ok: boolean; text: string } {
  const f = ryoshuOf(s), H = s.hero!;
  if (!f) return { ok: false, text: '領主でない' };
  if (g.status !== 'ronin' || !f.castles.includes(g.loc)) return { ok: false, text: '自分の領の城にいる浪人だけ' };
  if (retainersOf(s).length >= capOf(s)) return { ok: false, text: `家臣はいま${capOf(s)}人まで（出世や屋敷の格で増える）` };
  if (H.gold < KASHIN.SHITAKU) return { ok: false, text: `支度金${KASHIN.SHITAKU}貫が要る（手元の金から）` };
  const me = s.generals[H.id], rel = H.rel[g.id] ?? 0;
  const p = Math.min(0.9, 0.3 + (H.fame ?? 0) / 150 + me.cha / 300 + rel / 200);
  if (rand(s) >= p) { H.rel[g.id] = Math.max(0, rel - 5); return { ok: true, text: `${g.name}は召し抱えに応じなかった（見込み${Math.round(p * 100)}%）。` }; }
  H.gold -= KASHIN.SHITAKU;
  const at = g.loc;
  take(s, g);
  g.status = 'free'; g.liege = me.id; g.loc = at; // 領の陪臣として（部隊を率い、城主になれる）
  addLog(s, `${g.name}が${me.name}の家臣となった。`, 'info', true);
  return { ok: true, text: `${g.name}を家臣に召し抱えた（支度金${KASHIN.SHITAKU}貫。家臣${retainersOf(s).length}／${capOf(s)}人）。` };
}

// ───────── 主家の縛り（第二段） ─────────
// 攻め先: 主家の狙う家と、軍役で申し付けられた家。自分の領（城と、その隣）に寄せてきた敵の軍勢は、どの家でも討てる
export function attackBlock(s: GameState, targetClan: string | null, hex: number): string | null {
  const f = ryoshuOf(s);
  if (!f || !targetClan) return null;
  const C = s.clans[s.player], gy = gunyakuOf(s);
  if (targetClan === C.target || (gy && gy.clan === targetClan)) return null;
  const homen = (s.hero!.career?.steps ?? []).includes('homen'); // 方面軍団長: 方面の近く（hx(6)以内）の主家の敵なら、自分で攻め先を選べる
  if (homen && hostile(s, s.player, targetClan) && f.castles.some((i) => hexDist(s.castles[i].hex, hex) <= R.hx(6))) return null;
  const nearFief = f.castles.some((i) => { const c = s.castles[i]; return c.hex === hex || NEIGHBORS[c.hex].includes(hex) || hexDist(c.hex, hex) <= 1; });
  const isArmy = Object.values(s.armies).some((a) => a.hex === hex && a.clan === targetClan);
  if (isArmy && nearFief) return null;
  const tgt = C.target ? `${clanName(s, C.target)}家` : null;
  return homen ? '方面から遠すぎる（方面の城から6マスほどまでの、主家の敵の城・軍勢なら攻められる）' : `主君の許しがない（攻めてよいのは${[tgt, gy ? `軍役の${clanName(s, gy.clan)}家` : null].filter(Boolean).join('と') || 'いまはない'}。領に寄せてきた敵の軍勢は討てる）`;
}
// 上納: 領の商い（毎月）と収穫（十月）のうち、主家へ納める分
export function tributeOf(s: GameState): { gold: number } {
  const f = ryoshuOf(s); if (!f) return { gold: 0 };
  const tx = taxDef(s, s.player).income;
  const cs = f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player);
  return { gold: Math.round(cs.reduce((t, c) => t + castleCom(c), 0) * R.FIEF_TRIBUTE * tx) };
}
// 軍役: 主家が戦を構えている（狙う家がある）と、ときどき「〇〇家攻めに兵を出せ」と申し付けられる。
// 期日（3か月）までに、その家との合戦に領の部隊が加わるか、兵を差し出せば果たす（覚え+5・功績+20）。怠れば覚え−10
export const GUNYAKU = { P: 0.3, SHARE: 0.3, MIN: 500, MONTHS: 3, FAVOR_OK: 5, MERIT_OK: 20, FAVOR_NG: 10 };
type GX = { gunyaku?: { clan: string; troops: number; until: number; done?: boolean } };
const GXo = (s: GameState) => s.hero as (NonNullable<GameState['hero']> & GX) | undefined;
export const gunyakuOf = (s: GameState) => GXo(s)?.gunyaku;
function fiefGarrison(s: GameState): number { const f = ryoshuOf(s); return f ? f.castles.reduce((t, i) => t + (s.castles[i].owner === s.player ? s.castles[i].garrison : 0), 0) : 0; }
export function gunyakuMonth(s: GameState): string[] {
  const H = GXo(s), f = ryoshuOf(s); if (!H || !f) return [];
  const C = s.clans[s.player], out: string[] = [], me = s.generals[H.id];
  const g = H.gunyaku;
  if (g) {
    if (g.done) { H.gunyaku = undefined; H.favor = Math.min(100, H.favor + GUNYAKU.FAVOR_OK); me.merit += GUNYAKU.MERIT_OK; out.push(`軍役（${clanName(s, g.clan)}家攻め）を果たした。主君の覚え+${GUNYAKU.FAVOR_OK}・功績+${GUNYAKU.MERIT_OK}。`); }
    else if (s.turn > g.until || !s.clans[g.clan]?.alive) { H.gunyaku = undefined; if (s.clans[g.clan]?.alive) { H.favor = Math.max(0, H.favor - GUNYAKU.FAVOR_NG); out.push(`軍役（${clanName(s, g.clan)}家攻めに兵${g.troops}）を怠った。主君の覚え−${GUNYAKU.FAVOR_NG}。`); } }
    return out;
  }
  if (C.target && s.clans[C.target]?.alive && rand(s) < GUNYAKU.P) {
    const troops = Math.max(GUNYAKU.MIN, Math.round(fiefGarrison(s) * GUNYAKU.SHARE / 100) * 100);
    H.gunyaku = { clan: C.target, troops, until: s.turn + GUNYAKU.MONTHS };
    out.push(`主君から軍役を申し付けられた: ${clanName(s, C.target)}家攻めに兵${troops}を出せ（${GUNYAKU.MONTHS}か月のうちに。その家との合戦に領の部隊を出すか、「主家」から兵を差し出す）。`);
  }
  return out;
}
// 兵を差し出す: 領の城兵から、主家の居城（なければ主家のいちばん大きな城）へ
export function sendTroops(s: GameState): { ok: boolean; text: string } {
  const H = GXo(s), f = ryoshuOf(s), g = H?.gunyaku;
  if (!H || !f || !g || g.done) return { ok: false, text: '申し付けられた軍役はない' };
  if (fiefGarrison(s) < g.troops) return { ok: false, text: `領の城兵が足りない（${fiefGarrison(s)}／${g.troops}）` };
  const L = s.clans[s.player].leader ? s.generals[s.clans[s.player].leader!] : null;
  const to = (L && s.castles[L.loc]?.owner === s.player ? s.castles[L.loc] : null) ?? clanCastles(s, s.player).filter((c) => !f.castles.includes(c.i)).sort((a, b) => b.garrison - a.garrison)[0];
  let need = g.troops;
  for (const i of [...f.castles].sort((a, b) => s.castles[b].garrison - s.castles[a].garrison)) { const c = s.castles[i]; const k = Math.min(need, Math.max(0, c.garrison - 100)); c.garrison -= k; need -= k; if (need <= 0) break; }
  if (to) to.garrison += g.troops - need;
  g.done = true;
  return { ok: true, text: `軍役として、兵${g.troops - need}を${to ? to.name : '主家'}へ差し出した（来月、主君の覚え+${GUNYAKU.FAVOR_OK}）。` };
}
// 合戦の記録（hooks.ts から）: 軍役の家との合戦に領の部隊が加わったら果たした
export function gunyakuBattle(s: GameState, armies: { front?: number; clan: string }[], foeClan: string | null) {
  const f = ryoshuOf(s), g = gunyakuOf(s);
  if (f && g && !g.done && foeClan === g.clan && armies.some((a) => a.front === f.id)) g.done = true;
}

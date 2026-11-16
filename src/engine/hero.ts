// 武将プレイ（試作）: 大名ではなく一人の武将として生きる。家は大名のAIが動かし、プレイヤーは城下を歩き、主命を果たし、人と交わる。
// 時は旬（10日）で刻む。1か月は3旬。3旬が過ぎると、裏で大名たちの1か月が進む（ゲームの endTurn）。
// 武将は status 'hero' にして、AIの編成・城主・奉行に使われないようにする（主命・合戦はこちらで扱う）。
import { HEXES, NEIGHBORS, PROVINCES, hexDist } from './map';
import { pathTo, stepCost, type Reach } from './move';
import { storeOf } from './supply';
import { delegateOf } from './delegate';
import { addMerit } from './ranks';
import * as R from './rules';
import { attach, attachAuto, leaveArmy, membersOf } from './corps';
import { removeArmy } from './ops';
import { addLog, castleAt, castleKoku, clanCastles, clanName, garrisonMax, hostile, learnCastle, rand } from './state';
import type { Army, Castle, GameState, General } from './types';

export type QuestKind = 'fushin' | 'teisatsu' | 'choryaku' | 'shutsujin';
export interface Quest { kind: QuestKind; castle: number; need: number; done: number; until: number; ok?: boolean; note?: string; army?: number }
export interface Hero {
  id: string; town: number; jun: number; gold: number; favor: number; goods: number;
  rel: Record<string, number>; met: Record<string, number>; // 親しさ（0〜100）と、最後に会った旬（turn*3+jun）
  quest: Quest | null; travel?: unknown; // travel は古い試作の名残（使わない）
  hex: number; field?: boolean; dest?: number | null; army?: number | null; joined?: number; // army: 加わっている軍勢、joined: 加わったターン // 今いるマス、野にいるか（城下でない）、旅の行き先
  diary: { turn: number; jun: number; text: string }[]; done: number; failed: number; trained: number; lastQuest?: number;
}
export const HERO = {
  JUN: 3, PAY: [400, 200, 100, 50], // 身分ごとの月の俸禄（宿老・侍大将・足軽大将・足軽組頭）
  QUEST_MONTHS: 3, FAVOR_OK: { fushin: 6, teisatsu: 5, choryaku: 10, shutsujin: 8 }, FAVOR_NG: 8,
  MERIT: { fushin: 15, teisatsu: 12, choryaku: 25, shutsujin: 10 }, PAYOUT: { fushin: 100, teisatsu: 80, choryaku: 200, shutsujin: 150 }, // 出陣は合戦そのものの功績が別に入る
  VISIT: 8, GIFT_COST: 50, GIFT_REL: 12, GOODS_COST: 50, FRIEND: 70, TRAIN_COST: 30, TRAIN_P: 0.35, STAT_CAP: 95,
  MP: R.hx(6), // 1旬に進める道のり（平地1・森と川2・山3。部隊の一月より少し多い）
};
export const QUEST_NAME: Record<QuestKind, string> = { fushin: '普請', teisatsu: '偵察', choryaku: '調略', shutsujin: '出陣' };

export const heroOf = (s: GameState) => (s.hero ? s.generals[s.hero.id] : null);
export const lordOf = (s: GameState) => { const g = heroOf(s); const l = g?.clan ? s.clans[g.clan].leader : null; return l ? s.generals[l] : null; };
export const nowJun = (s: GameState) => s.turn * 3 + (s.hero?.jun ?? 0);
export const JUN_NAME = ['上旬', '中旬', '下旬'];

export function startHero(s: GameState, id: string) {
  const g = s.generals[id];
  s.player = g.clan!;
  // 家の政はみな大名（AI）が行う
  const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true;
  // 部隊・城主・奉行から外し、城下に立つ
  for (const a of Object.values(s.armies)) { if (a.main === id) { const st = (a.staff ?? []).shift(); if (st) a.main = st; } a.staff = (a.staff ?? []).filter((x) => x !== id); }
  for (const a of Object.values(s.camps ?? {})) { a.staff = (a.staff ?? []).filter((x) => x !== id); }
  for (const c of s.castles) if (c.governor === id) c.governor = null;
  g.status = 'hero'; g.army = null;
  s.hero = { id, town: g.loc, hex: s.castles[g.loc].hex, field: false, dest: null, jun: 0, gold: 200, favor: 30, goods: 0, rel: {}, met: {}, quest: null, diary: [], done: 0, failed: 0, trained: 0 };
  note(s, `${g.name}、${s.castles[g.loc].name}の城下にあり。主君${lordOf(s)?.name ?? ''}に仕える${R.RANK_NAME[g.rank]}。`);
}
export function note(s: GameState, text: string) { const H = s.hero!; H.diary.push({ turn: s.turn, jun: H.jun, text }); if (H.diary.length > 300) H.diary.shift(); }

// 城下にあるもの（城の大きさと土地柄で決まる）
export type Spot = 'tojo' | 'yashiki' | 'chaya' | 'ichi' | 'dojo' | 'tera' | 'tabi' | 'nanban';
export const SPOT_NAME: Record<Spot, string> = { tojo: '登城', yashiki: '屋敷を訪ねる', chaya: '茶屋', ichi: '市', dojo: '道場', tera: '寺', tabi: '旅に出る', nanban: '南蛮屋' };
export function spotsOf(s: GameState, c: Castle): Spot[] {
  const big = castleKoku(c) >= 12;
  const out: Spot[] = [];
  if (lordOf(s)?.loc === c.i) out.push('tojo');
  out.push('yashiki', 'chaya');
  if (big || c.id === 'kyo' || c.id === 'kishiwada') out.push('ichi');
  if (big) out.push('dojo');
  if (big || ['kyo', 'ishiyama', 'kanazawa', 'shigisan'].includes(c.id)) out.push('tera');
  if (['funai', 'hirado', 'kishiwada', 'kyo'].includes(c.id)) out.push('nanban');
  out.push('tabi');
  return out;
}
// この町にいる武将（会える者）
export function townsfolk(s: GameState, ci: number): General[] {
  const H = s.hero!;
  return Object.values(s.generals).filter((g) => g.id !== H.id && g.loc === ci && (g.status === 'free' || g.status === 'governor' || g.status === 'bugyo' || g.status === 'tsukai' || g.status === 'camp' || g.status === 'ronin'));
}
const relOf = (s: GameState, id: string) => s.hero!.rel[id] ?? 0;
export const RELNAME = (v: number) => (v >= 80 ? '刎頸の交わり' : v >= HERO.FRIEND ? '友' : v >= 40 ? '親しい' : v >= 15 ? '顔見知り' : '初対面');
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ───────── 旬ごとの行い（どれも1旬を使う。戻り値は画面に出す言葉） ─────────
export interface Act { ok: boolean; text: string; who?: string; line?: string }
const used = (s: GameState) => { s.hero!.jun++; };

export function visit(s: GameState, gid: string): Act {
  const H = s.hero!, me = heroOf(s)!, g = s.generals[gid];
  const sameArmy = me.army !== null && g.army === me.army;
  if (!sameArmy && (H.field || g.loc !== H.town)) return { ok: false, text: 'その人はここにいない' };
  const first = !H.rel[gid];
  const same = g.clan === me.clan;
  const gain = Math.round(HERO.VISIT + me.cha / 15 + (same ? 2 : 0) + rand(s) * 6 - (H.met[gid] !== undefined && nowJun(s) - H.met[gid] < 3 ? 6 : 0)); // 続けて訪ねると少ない
  H.rel[gid] = clamp(relOf(s, gid) + Math.max(1, gain));
  H.met[gid] = nowJun(s);
  const line = talk(s, g, first);
  bondUp(s, g);
  used(s);
  return { ok: true, who: gid, line, text: `${g.name}の屋敷を訪ねた。（${RELNAME(H.rel[gid])} ${H.rel[gid]}）` };
}
export function giveGift(s: GameState, gid: string): Act {
  const H = s.hero!, g = s.generals[gid];
  if (g.loc !== H.town) return { ok: false, text: 'その人はこの町にいない' };
  if (H.goods < 1 && H.gold < HERO.GIFT_COST) return { ok: false, text: `進物がなく、金も${HERO.GIFT_COST}貫に足りない` };
  if (H.goods > 0) H.goods--; else H.gold -= HERO.GIFT_COST;
  H.rel[gid] = clamp(relOf(s, gid) + HERO.GIFT_REL + Math.round(rand(s) * 6));
  H.met[gid] = nowJun(s);
  bondUp(s, g);
  used(s);
  return { ok: true, who: gid, line: pickLine(s, GIFT_LINE), text: `${g.name}に進物を贈った。（${RELNAME(H.rel[gid])} ${H.rel[gid]}）` };
}
function bondUp(s: GameState, g: General) {
  const me = heroOf(s)!, v = relOf(s, g.id);
  if (v < HERO.FRIEND || (me.bonds ?? []).some((b) => b.id === g.id)) return;
  (me.bonds ??= []).push({ id: g.id, kind: 'friend' });
  (g.bonds ??= []).push({ id: me.id, kind: 'friend' });
  note(s, `${g.name}と友の契りを結んだ。`);
}
export function buyGoods(s: GameState): Act {
  const H = s.hero!;
  if (H.gold < HERO.GOODS_COST) return { ok: false, text: `金が${HERO.GOODS_COST}貫に足りない` };
  H.gold -= HERO.GOODS_COST; H.goods++;
  used(s);
  return { ok: true, text: `市で進物（反物と酒）を買い求めた。手元の進物 ${H.goods}。` };
}
export function train(s: GameState, kind: 'dojo' | 'tera'): Act {
  const H = s.hero!, me = heroOf(s)!;
  if (H.gold < HERO.TRAIN_COST) return { ok: false, text: `謝礼の${HERO.TRAIN_COST}貫が足りない` };
  H.gold -= HERO.TRAIN_COST; used(s);
  const stats: ('bra' | 'lea' | 'int' | 'cha')[] = kind === 'dojo' ? ['bra', 'lea'] : ['int', 'cha'];
  const st = stats[rand(s) < 0.5 ? 0 : 1];
  const NAME = { bra: '武勇', lea: '統率', int: '知略', cha: '魅力' };
  if (me[st] < HERO.STAT_CAP && rand(s) < HERO.TRAIN_P) { me[st]++; H.trained++; return { ok: true, text: `${kind === 'dojo' ? '道場で汗を流した' : '寺で書を読み、僧と語らった'}。${NAME[st]}が上がった（${me[st]}）。` }; }
  return { ok: true, text: `${kind === 'dojo' ? '道場で汗を流した' : '寺で書を読んだ'}が、手応えはまだない。` };
}
export function rumor(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, c = s.castles[H.town];
  used(s);
  const parts: string[] = [];
  if (c.owner && c.owner !== me.clan) { learnCastle(s, c.i, me.clan!); parts.push(`この${c.name}には兵がおよそ${Math.round(c.garrison / 100) * 100}、蔵の米は${storeOf(c) >= 1000 ? Math.round(storeOf(c) / 1000) + '千石ほど' : '乏しい'}らしい`); }
  const near = Object.values(s.clans).filter((x) => x.alive && x.id !== me.clan && clanCastles(s, x.id).some((k) => hexDist(k.hex, c.hex) <= R.hx(8)));
  const x = near[Math.floor(rand(s) * near.length)];
  if (x) parts.push(`${x.name}家は${x.stance === '攻勢' ? '戦支度を急いでいる' : x.stance === '守勢' ? '守りを固めている' : '静かにしている'}${x.target ? `。${clanName(s, x.target)}家を狙っているとか` : ''}`);
  const news = s.log.filter((l) => l.turn >= s.turn - 1 && (l.kind === 'battle' || l.kind === 'castle')).slice(-6);
  const n = news[Math.floor(rand(s) * news.length)];
  if (n) parts.push(`噂では、${n.text.replace(/。$/, '')}`);
  return { ok: true, text: `茶屋で旅人の話に耳を傾けた。${parts.length ? parts.map((p) => `「${p}」`).join('') : '目ぼしい話はなかった。'}` };
}
export function rest(s: GameState): Act { used(s); return { ok: true, text: '長屋で体を休めた。' }; }

// 旅: 日本地図の上を、部隊の移動と同じく地形の重さで進む。1旬に HERO.MP まで。城のマスに止まればその城下に入る（他国の城下にも入れる）
// 遠い所を選べば、その道筋を1旬ぶん進み、行き先を覚えておく（続けて進める）
function search(s: GameState, from: number, limit = Infinity): Reach {
  const cost = new Map<number, number>([[from, 0]]), prev = new Map<number, number>();
  const open: [number, number][] = [[0, from]];
  while (open.length) {
    open.sort((x, y) => x[0] - y[0]);
    const [c, i] = open.shift()!;
    if (c > (cost.get(i) ?? Infinity)) continue;
    for (const j of NEIGHBORS[i]) {
      const nc = c + stepCost(i, j);
      if (nc > limit) continue;
      if (nc < (cost.get(j) ?? Infinity)) { cost.set(j, nc); prev.set(j, i); open.push([nc, j]); }
    }
  }
  return { cost, prev };
}
// 1旬で行ける所（地図に明るく出す）
export function heroReach(s: GameState): Reach { const r = search(s, s.hero!.hex, HERO.MP); r.cost.delete(s.hero!.hex); return r; }
const placeName = (s: GameState, hex: number) => { const c = castleAt(s, hex); return c ? `${c.name}の城下` : `${PROVINCES[HEXES[hex].p].name}の野`; };
// 今いる所から各マスまでの道のりの重さ（城の一覧に旬のおよそを出す）
export const costMap = (s: GameState) => search(s, s.hero!.hex).cost;
// 行き先までの旬のおよそ
export function junTo(s: GameState, hex: number) { const r = search(s, s.hero!.hex); const c = r.cost.get(hex); return c === undefined ? null : Math.max(1, Math.ceil(c / HERO.MP)); }
export function moveTo(s: GameState, dest: number): Act {
  const H = s.hero!, me = heroOf(s)!;
  if (H.army !== null && H.army !== undefined) return { ok: false, text: '陣中では勝手に動けない（軍勢とともに進む。離れるなら「陣を離れる」）' };
  if (dest === H.hex) return { ok: false, text: 'すでにここにいる' };
  const r = search(s, H.hex);
  const path = pathTo(r, H.hex, dest);
  if (path.length < 2) return { ok: false, text: 'そこへは行けない' };
  let spent = 0, at = H.hex;
  for (const h of path.slice(1)) { const c = stepCost(at, h); if (spent + c > HERO.MP) break; spent += c; at = h; }
  if (at === H.hex) return { ok: false, text: '険しくて進めない' };
  H.hex = at;
  const c = castleAt(s, at);
  if (c) { H.town = c.i; H.field = false; me.loc = c.i; } else H.field = true;
  H.dest = at === dest ? null : dest;
  used(s);
  if (!H.dest) { if (c) note(s, `${c.name}の城下に着いた。`); return { ok: true, text: c ? `${c.name}の城下に着いた。` : `${placeName(s, at)}で足を止めた。` }; }
  const left = junTo(s, dest);
  return { ok: true, text: `${placeName(s, dest)}を目指して、${placeName(s, at)}まで進んだ（あと${left ?? '?'}旬ほど）。` };
}
export const goOn = (s: GameState): Act => (s.hero!.dest !== null && s.hero!.dest !== undefined ? moveTo(s, s.hero!.dest) : { ok: false, text: '行き先がない' });
export const inField = (s: GameState) => !!s.hero!.field;

// ───────── 陣（味方の軍勢に加わって戦に出る） ─────────
const placeOf = (s: GameState, hex: number) => { const c = castleAt(s, hex); return c ? c.name : `${PROVINCES[HEXES[hex].p].name}の野`; };
// 今いるマスにいる味方の軍勢（加われる）
export function armiesHere(s: GameState): Army[] {
  const H = s.hero!, me = heroOf(s)!;
  if (H.army !== null && H.army !== undefined) return [];
  return Object.values(s.armies).filter((a) => a.clan === me.clan && a.hex === H.hex && !a.ikki && !a.routed && a.main !== me.id);
}
export const inArmy = (s: GameState) => { const H = s.hero!; return H.army !== null && H.army !== undefined ? s.armies[H.army] ?? null : null; };
function followArmy(s: GameState, a: Army) {
  const H = s.hero!, me = heroOf(s)!;
  H.hex = a.hex; H.dest = null;
  const c = castleAt(s, a.hex);
  if (c) { H.town = c.i; H.field = false; } else H.field = true;
  me.loc = c?.i ?? me.loc;
}
export function joinArmy(s: GameState, id: number): Act {
  const H = s.hero!, me = heroOf(s)!, a = s.armies[id];
  if (!a || a.hex !== H.hex || a.clan !== me.clan) return { ok: false, text: 'その軍勢はここにいない' };
  // 主将の下へ（枠と身分が合えば軍団の決まりどおり、合わなければ主将の直下に）
  me.status = 'free';
  if (!attachAuto(s, a, me)) attach(s, a, a.main, me);
  H.army = a.id; H.joined = s.turn; H.dest = null;
  followArmy(s, a);
  used(s);
  const L = s.generals[a.main];
  note(s, `${L.name}の軍勢（兵${a.troops.toLocaleString()}）に加わった。`);
  return { ok: true, who: L.id, line: pickLine(s, JOIN_LINE), text: `${L.name}の軍勢に加わった。兵${a.troops.toLocaleString()}。合戦はこの軍勢とともに戦う（勝てば功績が入る）。` };
}
export function leaveCamp(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, a = inArmy(s);
  if (!a) return { ok: false, text: '陣にいない' };
  if (Object.values(s.armies).some((x) => hostile(s, me.clan!, x.clan) && hexDist(x.hex, a.hex) <= 2)) return { ok: false, text: '敵が近く、陣を離れれば逃げたと見なされる' };
  if (!leaveArmy(s, me)) removeArmy(s, a);
  H.army = null; me.army = null; me.boss = undefined; me.status = 'hero';
  used(s);
  note(s, `${placeOf(s, H.hex)}で陣を離れた。`);
  return { ok: true, text: `陣を離れた。${H.field ? '野にいる。旅を続けよ。' : `${s.castles[H.town].name}の城下にいる。`}` };
}
export function campWait(s: GameState): Act {
  const a = inArmy(s);
  used(s);
  return { ok: true, text: a ? `陣中で過ごした。兵${a.troops.toLocaleString()}、士気${a.morale.toFixed(2)}。${a.fought === s.turn ? 'この月、合戦があった。' : ''}` : '陣中で過ごした。' };
}
// 陣中の顔ぶれ（訪ねられる）
export function comrades(s: GameState): General[] {
  const a = inArmy(s), me = heroOf(s)!;
  return a ? membersOf(a).map((id) => s.generals[id]).filter((g) => g && g.id !== me.id) : [];
}
// 出陣の主命: 加わった軍勢が、加わってから合戦をしたら果たした
function checkShutsujin(s: GameState) {
  const H = s.hero!, q = H.quest;
  if (!q || q.kind !== 'shutsujin' || q.done >= q.need) return;
  const a = q.army !== undefined ? s.armies[q.army] ?? s.camps?.[q.army] : undefined;
  if (H.army === q.army && a?.fought !== undefined && a.fought >= (H.joined ?? Infinity)) { q.done = q.need; q.ok = true; q.note = `${s.generals[a.main]?.name ?? ''}の軍勢とともに戦った。`; note(s, '出陣の主命を果たした。登城して報告せよ。'); }
}
const JOIN_LINE = ['よう来た。戦は近いぞ。遅れを取るな。', '頼もしい。そなたの隊は、わしの脇を固めよ。', '槍の数は一本でも多いほうがよい。存分に働け。'];

// ───────── 主命 ─────────
export function questBlock(s: GameState): string | null {
  const H = s.hero!, L = lordOf(s);
  if (!L) return '主君がいない';
  if (H.field || L.loc !== H.town) return `主君${L.name}は${s.castles[L.loc].name}にいる`;
  return null;
}
// 登城: 主命を受けるか、果たした主命を報告する
export function tojo(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, L = lordOf(s)!;
  const b = questBlock(s); if (b) return { ok: false, text: b };
  used(s);
  const q = H.quest;
  if (q && q.done >= q.need) {
    // 報告
    const ok = q.ok !== false;
    if (ok) {
      addMerit(s, me.id, HERO.MERIT[q.kind]); H.favor = clamp(H.favor + HERO.FAVOR_OK[q.kind]); H.gold += HERO.PAYOUT[q.kind]; H.done++;
      note(s, `主命（${QUEST_NAME[q.kind]}・${s.castles[q.castle].name}）を果たし、${L.name}に報告した。褒美に金${HERO.PAYOUT[q.kind]}貫。`);
      H.quest = null;
      return { ok: true, who: L.id, line: pickLine(s, PRAISE[q.kind]), text: `主命の首尾を申し上げた。功績+${HERO.MERIT[q.kind]}、主君の覚え+${HERO.FAVOR_OK[q.kind]}、金+${HERO.PAYOUT[q.kind]}貫。${q.note ?? ''}` };
    }
    H.favor = clamp(H.favor - 3); H.failed++; H.quest = null;
    note(s, `主命（${QUEST_NAME[q.kind]}）は不首尾に終わったと報告した。`);
    return { ok: true, who: L.id, line: pickLine(s, SCOLD), text: `不首尾を報告した。主君の覚え−3。${q.note ?? ''}` };
  }
  if (q) return { ok: true, who: L.id, line: `${QUEST_NAME[q.kind]}の件、${s.castles[q.castle].name}の首尾はいかがした。期日は${monthsLeft(s, q)}か月のうちぞ。`, text: '主君に目通りした。' };
  const nq = makeQuest(s);
  if (!nq) return { ok: true, who: L.id, line: '今は申し付けることはない。腕を磨いておけ。', text: '主君に目通りした。' };
  H.quest = nq;
  note(s, `主命を受けた: ${questText(s, nq)}`);
  return { ok: true, who: L.id, line: ORDER_LINE[nq.kind].replace('{castle}', s.castles[nq.castle].name), text: `主命を受けた。${questText(s, nq)}` };
}
const monthsLeft = (s: GameState, q: Quest) => Math.max(0, q.until - s.turn);
export function questText(s: GameState, q: Quest) {
  const c = s.castles[q.castle];
  const own = c.owner ? `${clanName(s, c.owner)}家の` : '';
  if (q.kind === 'shutsujin') { const a = q.army !== undefined ? s.armies[q.army] : undefined; return a ? `${s.generals[a.main]?.name ?? ''}の軍勢（いま${placeOf(s, a.hex)}）に加わり、戦で手柄を立てよ。` : '加わるはずの軍勢はもう陣を払った。'; }
  return q.kind === 'fushin' ? `${c.name}へ出向き、普請を差配せよ（${q.need}旬）。` : q.kind === 'teisatsu' ? `${own}${c.name}の城下に入り、城の様子を探れ。` : `${own}${c.name}に入り込み、城兵を切り崩せ。`;
}
function makeQuest(s: GameState): Quest | null {
  const me = heroOf(s)!, clan = me.clan!, C = s.clans[clan];
  const mine = clanCastles(s, clan);
  const foes = s.castles.filter((c) => c.owner && hostile(s, clan, c.owner) && mine.some((m) => hexDist(m.hex, c.hex) <= R.hx(6)));
  const tgt = foes.filter((c) => c.owner === C.target);
  const pool: Quest[] = [];
  const until = s.turn + HERO.QUEST_MONTHS;
  const weak = mine.filter((c) => c.i !== lordOf(s)?.loc).sort((a, b) => a.chian - b.chian || a.garrison / garrisonMax(a) - b.garrison / garrisonMax(b));
  const last = s.hero!.lastQuest;
  const fw = weak.filter((c) => c.i !== last).slice(0, 3);
  if (fw.length) pool.push({ kind: 'fushin', castle: fw[Math.floor(rand(s) * fw.length)].i, need: 2, done: 0, until });
  const near = (tgt.length ? tgt : foes).sort((a, b) => Math.min(...mine.map((m) => hexDist(m.hex, a.hex))) - Math.min(...mine.map((m) => hexDist(m.hex, b.hex))));
  if (near[0]) pool.push({ kind: 'teisatsu', castle: near[0].i, need: 1, done: 0, until });
  if (near[0] && R.RANK_NAME[me.rank] && me.rank <= 2) pool.push({ kind: 'choryaku', castle: near[Math.min(near.length - 1, 1)].i, need: 1, done: 0, until });
  // 出陣: 家が攻勢で、地図に出ている味方の軍勢があれば（戦の前に加わる）
  const fieldArmies = Object.values(s.armies).filter((a) => a.clan === clan && !a.ikki && !a.routed && a.main !== me.id && s.generals[a.main]?.status !== 'dead');
  if (fieldArmies.length && (C.stance === '攻勢' || C.target)) {
    const a = fieldArmies.sort((x, y) => y.troops - x.troops)[0];
    const near = mine.sort((x, y) => hexDist(x.hex, a.hex) - hexDist(y.hex, a.hex))[0];
    if (near) { pool.push({ kind: 'shutsujin', castle: near.i, need: 1, done: 0, until, army: a.id }); pool.push(pool[pool.length - 1]); } // 戦のときは出陣の主命が出やすい
  }
  if (!pool.length) return null;
  const pick = pool[Math.floor(rand(s) * pool.length)];
  s.hero!.lastQuest = pick.castle;
  return pick;
}
export const canWork = (s: GameState) => { const H = s.hero!; return !H.field && !H.army && !!H.quest && H.quest.kind !== 'shutsujin' && H.quest.done < H.quest.need && H.quest.castle === H.town; };
// 主命を果たす（その町で1旬）
export function work(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, q = H.quest!;
  if (!canWork(s)) return { ok: false, text: 'ここでできる主命はない' };
  const c = s.castles[q.castle];
  used(s);
  if (q.kind === 'fushin') {
    if (c.owner !== me.clan) { q.done = q.need; q.ok = false; q.note = '城が人手に渡り、普請はかなわなかった。'; return { ok: true, text: q.note }; }
    q.done++;
    const lea = me.lea + me.int;
    c.chian = clamp(c.chian + 3 + lea / 60); c.garrison = Math.min(garrisonMax(c), c.garrison + Math.round(garrisonMax(c) * 0.05));
    if (q.done >= q.need) { q.note = `${c.name}の石垣と堀を手直しし、城下の治安も上がった。`; return { ok: true, text: `普請を差配した。${q.note}登城して報告せよ。` }; }
    return { ok: true, text: `人足を集め、普請を差配した（${q.done}/${q.need}旬）。` };
  }
  if (q.kind === 'teisatsu') {
    const p = 0.55 + me.int / 200;
    if (rand(s) < p) {
      learnCastle(s, c.i, me.clan!); q.done = q.need; q.ok = true;
      q.note = `${c.name}の兵はおよそ${Math.round(c.garrison / 100) * 100}、${c.governor ? `城主は${s.generals[c.governor].name}` : '城主はいない'}。`;
      return { ok: true, text: `商人に身をやつして城下を探った。${q.note}登城して報告せよ。` };
    }
    return chased(s, '城下を探ったが、怪しまれて引き上げた。');
  }
  // 調略
  const gov = c.governor ? s.generals[c.governor] : null;
  const p = 0.25 + (me.int + me.cha) / 400 - (gov ? gov.int / 400 : 0) + (gov ? relOf(s, gov.id) / 300 : 0);
  if (rand(s) < p) {
    c.gMorale = Math.max(0.3, c.gMorale - 0.2); c.chian = clamp(c.chian - 15); c.garrison = Math.max(0, Math.round(c.garrison * 0.85));
    learnCastle(s, c.i, me.clan!); q.done = q.need; q.ok = true;
    q.note = `${c.name}の侍たちに金と言葉を撒き、城兵の一部を逃散させた。`;
    addLog(s, `${c.name}で城兵の逃散が相次いでいるという。`, 'info', true);
    return { ok: true, text: `${q.note}登城して報告せよ。` };
  }
  return chased(s, '調略の手を伸ばしたが、相手は乗ってこなかった。');
}
// 不首尾: 3割で追われて一つ前の町へ（期日に余裕があれば、また試せる）
function chased(s: GameState, text: string): Act {
  const H = s.hero!;
  if (rand(s) < 0.3) {
    const me = heroOf(s)!, home = clanCastles(s, me.clan!).sort((a, b) => hexDist(a.hex, s.castles[H.town].hex) - hexDist(b.hex, s.castles[H.town].hex))[0];
    if (home) { H.town = home.i; H.hex = home.hex; H.field = false; H.dest = null; me.loc = home.i; }
    return { ok: true, text: `${text}追っ手がかかり、${home?.name ?? '味方の城'}まで逃げ帰った。` };
  }
  return { ok: true, text: `${text}日を改めて、また試すこともできる。` };
}

// ───────── 月の終わり（3旬が過ぎたら、大名たちの1か月の前に） ─────────
export function heroMonth(s: GameState): string[] {
  const H = s.hero!, me = heroOf(s)!;
  const out: string[] = [];
  if (!me || me.status === 'dead') return out;
  const pay = HERO.PAY[me.rank] ?? 50;
  H.gold += pay; out.push(`俸禄 ${pay}貫を受け取った（手元 ${H.gold}貫）。`);
  checkShutsujin(s);
  const q = H.quest;
  if (q && q.kind === 'shutsujin' && q.done < q.need && H.army !== q.army && q.army !== undefined && !s.armies[q.army]) { H.quest = null; out.push('加わるはずの軍勢が陣を払い、出陣の主命は取りやめになった。'); }
  else if (q && q.done < q.need && s.turn >= q.until) { H.favor = clamp(H.favor - HERO.FAVOR_NG); H.failed++; H.quest = null; out.push(`主命（${QUEST_NAME[q.kind]}）の期日が過ぎた。主君の覚え−${HERO.FAVOR_NG}。`); note(s, `主命（${QUEST_NAME[q.kind]}）の期日を過ぎてしまった。`); }
  // 取り立て（功績が満ちて、主君の覚えがよければ）
  while (me.rank > 0 && me.merit >= R.MERIT_AT[me.rank - 1] && H.favor >= 40 + (3 - me.rank) * 10) {
    me.rank--; H.favor = clamp(H.favor - 10);
    out.push(`${R.RANK_NAME[me.rank]}に取り立てられた！`); note(s, `${R.RANK_NAME[me.rank]}に取り立てられた。`);
    addLog(s, `${me.name}が${R.RANK_NAME[me.rank]}に取り立てられた。`, 'info', true);
  }
  H.jun = 0;
  return out;
}
// 武将が生きて家にいるか（いなければ試作はそこで終わり）
export function heroEnd(s: GameState): string | null {
  const me = heroOf(s);
  if (!me || me.status === 'dead') return `${me?.name ?? '主人公'}は世を去った。`;
  if (!me.clan || !s.clans[me.clan]?.alive) return `${clanName(s, s.player)}家は滅んだ。`;
  if (me.status === 'captive') return `${me.name}は敵に捕らえられた。`;
  const H = s.hero!;
  H.hex ??= s.castles[H.town].hex;
  for (const c of s.castles) if (c.governor === me.id) c.governor = null;
  if (H.army !== null && H.army !== undefined) {
    const a = s.armies[H.army];
    if (a && me.army === a.id && me.status === 'army') { followArmy(s, a); checkShutsujin(s); return null; }
    // 陣払い・壊滅・編成替えで陣を離れた
    const camp = s.camps?.[H.army];
    if (camp) { camp.staff = (camp.staff ?? []).filter((x) => x !== me.id); if (camp.main === me.id) { const n = camp.staff.shift(); if (n) { camp.main = n; s.generals[n].boss = undefined; } else delete s.camps![H.army]; } }
    else if (me.army !== null) leaveArmy(s, me);
    H.army = null; me.army = null; me.boss = undefined; me.status = 'hero';
    const c = camp?.camp !== undefined ? s.castles[camp.camp] : castleAt(s, H.hex) ?? clanCastles(s, me.clan).sort((x, y) => hexDist(x.hex, H.hex) - hexDist(y.hex, H.hex))[0];
    if (c) { H.town = c.i; H.hex = c.hex; H.field = false; me.loc = c.i; }
    note(s, `陣が払われ、${c?.name ?? '城'}に戻った。`);
    return null;
  }
  if (me.status !== 'hero') { me.status = 'hero'; me.army = null; }
  if (me.loc !== H.town) me.loc = H.town;
  return null;
}

// ───────── 言葉 ─────────
const pickLine = (s: GameState, xs: string[]) => xs[Math.floor(rand(s) * xs.length)];
function talk(s: GameState, g: General, first: boolean): string {
  const v = relOf(s, g.id), me = heroOf(s)!;
  const T = g.bra >= Math.max(g.int, g.cha, g.lea) ? 'bold' : g.int >= Math.max(g.cha, g.lea) ? 'wise' : g.cha >= g.lea ? 'gentle' : 'steady';
  const other = g.clan && g.clan !== me.clan;
  if (first) return pickLine(s, other ? FIRST_OTHER : g.status === 'ronin' ? FIRST_RONIN : FIRST[T]);
  if (v >= HERO.FRIEND) return pickLine(s, CLOSE[T]);
  return pickLine(s, MID[T]);
}
const FIRST: Record<string, string[]> = {
  bold: ['おぬしが噂の新参か。腕は立つのか、見せてもらおう。', 'ふむ、槍の持ち方は悪くない。戦場で会おうぞ。'],
  wise: ['ようこそ。茶でも飲んでいかれよ。……世の動きをどう見ておられる。', '名は聞いておる。なかなか目端が利くそうな。'],
  gentle: ['よう参られた。遠慮はいらぬ、ゆるりとしていかれよ。', 'これからは同じ家中。困ったことがあれば言うてくれ。'],
  steady: ['お役目ご苦労。まずは家中の決まりを覚えることだ。', '挨拶とは殊勝な。励まれよ。'],
};
const MID: Record<string, string[]> = {
  bold: ['次の戦では、どちらが先に一番槍をつけるか、勝負じゃ。', '酒はいける口か。ならば飲め、飲め！'],
  wise: ['近ごろの殿のお考え、そなたはどう読む。', '隣国の動き、気になるな。茶屋の噂も馬鹿にはできぬ。'],
  gentle: ['また来てくれたか。妻も喜んでおる。', '城下の民の暮らし向きは、少しは良くなったかの。'],
  steady: ['主命は期日を守るのが肝要。遅れれば、殿の覚えも悪うなる。', '帳面はつけておるか。武士も算用ができねばならぬ時代よ。'],
};
const CLOSE: Record<string, string[]> = {
  bold: ['おぬしとなら、どんな死地でも背中を預けられる。', 'おぬしが困っておるなら、この槍、いつでも貸そう。'],
  wise: ['そなたにだけ申すが……家中にも、いろいろと思惑がある。', '天下の行方、いつかそなたと語り明かしたいものだ。'],
  gentle: ['そなたは、もう身内も同然。何でも頼ってくれ。', '殿に取りなしが要るときは、言うてくれ。わしからも申し上げよう。'],
  steady: ['そなたの働きぶり、殿もよう見ておられるぞ。', '長い付き合いになりそうだ。よろしく頼む。'],
};
const FIRST_OTHER = ['……よその家の者が、何の用だ。', '敵か味方か、今は問うまい。話くらいは聞こう。'];
const FIRST_RONIN = ['浪々の身に何の用かな。……ほう、酒を持ってきたか。', '仕官の口でもあるのか。話を聞こう。'];
const GIFT_LINE = ['これは、かたじけない。ありがたく頂戴する。', '気を遣わせたな。この礼はいずれ。'];
const PRAISE: Record<QuestKind, string[]> = {
  shutsujin: ['戦場での働き、聞いておるぞ。よう励んだ。', 'そなたの槍、頼もしく思うたぞ。'],
  fushin: ['うむ、手際がよい。城が固くなれば、民も安心する。', '早かったな。次も頼むぞ。'],
  teisatsu: ['よう探った。これで次の手が打てる。', 'ほう、そこまで調べたか。褒めてつかわす。'],
  choryaku: ['でかした！ 城を落とす前に、城の心を落としたな。', '舌先三寸で城兵を崩すとは。そなた、なかなかの曲者よ。'],
};
const SCOLD = ['……そうか。次はしくじるなよ。', '不首尾か。言い訳は聞かぬ。次で取り返せ。'];
const ORDER_LINE: Record<QuestKind, string> = {
  shutsujin: '戦じゃ。{castle}のあたりにおる軍勢に加わり、手柄を立ててまいれ。',
  fushin: '{castle}の守りが心もとない。出向いて普請を差配せよ。',
  teisatsu: '{castle}の様子を探ってまいれ。兵の数、城主の顔ぶれ、何でもよい。',
  choryaku: '{castle}の侍どもに手を回し、城の守りを内から崩してまいれ。',
};

// 大名（当主）の演出: 家を立てた日（最初の言葉で家の構えと恩が動く）・旧主との因縁（討手・旧知・旧主の城・旧主との対面と処遇）・家中の揉め事・家臣への詰問・権六と与吉の結び。
// 大名になると主人公の記録（s.hero）はなくなるので、出来事は家の側（clans[player].tk）に溜め、権六・与吉の様子も家へ移す。セリフは data/tosyu_kake.ts
import type { Beat } from '../data/story_toshiie';
import * as K from '../data/tosyu_kake';
import { temperOf } from './lines';
import { onOf, vassalsOf } from './on';
import { killGeneral } from './ops';
import { addLog, clanName } from './state';
import { judgeMomegoto, momegotoOf, TOSYU } from './tosyu';
import type { Clan, GameState, General } from './types';

function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const pick = <T>(arr: readonly T[], key: string): T => arr[hash(key) % arr.length];
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const headed = (head: string, beats: Beat[]): Beat[] => beats.map((b) => (b.head || b.kind ? b : { ...b, head }));
const gen = (s: GameState, id?: string | null): General | null => (id && s.generals[id] ? s.generals[id] : null);
const bump = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };

export type TEv = { k: 'found' | 'kyuTe' | 'kyuYu' | 'kyuCastle' | 'kyuEnd' | 'gonDaimyo' | 'gonLast'; how?: string; id?: string; c?: number };
type Gon = { inkyo?: number; asked?: number; letter?: number };
type TX = Clan & { tk?: TEv[]; gon?: Gon; yk?: { kumi?: boolean }; foundTurn?: number; gonLast?: boolean; kyuushu?: { clan: string; turn: number; lord?: string | null; endDone?: boolean; castles?: number[] } };
const C = (s: GameState) => s.clans[s.player] as TX;
const lord = (s: GameState) => gen(s, C(s).leader);
export function pushT(s: GameState, e: TEv) { (C(s).tk ??= []).push(e); }

// 主人公が大名になる時（謀反・家督・旗揚げ）: 権六・与吉の様子を家へ移し、家を立てた日の場面と、権六の便りを溜める（s.hero を消す前に呼ぶ）
export function carryHero(s: GameState, clan: string, how: 'rebel' | 'inherit' | 'rise') {
  const H = s.hero as unknown as { gon?: Gon; yk?: { kumi?: boolean } } | undefined, X = s.clans[clan] as TX;
  if (H?.gon) X.gon = { ...H.gon }; if (H?.yk) X.yk = { ...H.yk };
  X.foundTurn = s.turn;
  (X.tk ??= []).push({ k: 'found', how });
  if (X.gon) X.tk.push({ k: 'gonDaimyo' });
}
// 毎月（tosyu.ts の tosyuMonth から）: 旧主の城を落とした・旧主の家が滅んだ・権六の最期（家を立てて三年）
export const GON_LAST_MONTHS = 36;
export function tosyuKakeMonth(s: GameState) {
  const X = C(s), k = X.kyuushu;
  if (k) {
    for (const c of s.castles) if (c.owner === s.player && c.prevOwner === k.clan && c.prevTurn !== undefined && s.turn - c.prevTurn <= 1 && !(k.castles ??= []).includes(c.i)) { k.castles.push(c.i); pushT(s, { k: 'kyuCastle', c: c.i }); }
    if (!k.endDone && !s.clans[k.clan]?.alive) { k.endDone = true; pushT(s, { k: 'kyuEnd', id: k.lord ?? undefined }); }
  }
  if (X.gon && !X.gonLast && X.foundTurn !== undefined && s.turn - X.foundTurn >= GON_LAST_MONTHS) { X.gonLast = true; pushT(s, { k: 'gonLast' }); }
}

// ───────── 場面 ─────────
function evBeats(s: GameState, e: TEv): Beat[] {
  const X = C(s), L = lord(s), k = `${e.k}|${e.id ?? ''}|${e.c ?? ''}|${s.turn}`, vs = vassalsOf(s, s.player);
  const old = X.kyuushu ? s.clans[X.kyuushu.clan] : null;
  const v = { me: L?.name ?? '', clan: X.name, old: old?.name ?? '' };
  if (e.k === 'found' && L) return headed(`${X.name}家`, [
    { bg: 'zashiki_day', text: fill(K.FOUND_NARR[e.how ?? 'rebel'] ?? K.FOUND_NARR.rebel, v) },
    ...vs.slice(0, 3).map((g, i) => ({ who: g.id, text: pick(K.FOUND_VASSAL[temperOf(g)], k + i) })),
    { who: L.id, text: K.FOUND_ASK, ask: 'k_t_found', choices: K.FOUND_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
  ]);
  if (e.k === 'kyuTe' && old) { const ol = gen(s, old.leader); return headed('旧主', [{ bg: 'night_fire', text: fill(K.KYU_TE_NARR, v) }, ...(ol ? [{ who: ol.id, text: fill(pick(K.KYU_TE_LORD[temperOf(ol)], k), v) }] : [])]); }
  if (e.k === 'kyuYu') { const g = gen(s, e.id); return g ? headed('旧知', [{ bg: 'zashiki_day', text: fill(K.KYU_YU_NARR, { ...v, name: g.name }) }, { who: g.id, text: pick(K.KYU_YU_LINE[temperOf(g)], k) }]) : []; }
  if (e.k === 'kyuCastle' && e.c !== undefined) return headed('旧主', [{ bg: 'fire_castle', text: fill(K.KYU_CASTLE_NARR, { ...v, castle: s.castles[e.c].name }) }, ...(vs[0] ? [{ who: vs[0].id, text: pick(K.KYU_CASTLE_VASSAL, k) }] : [])]);
  if (e.k === 'kyuEnd') {
    const ol = gen(s, e.id), name = ol?.name ?? '旧主';
    if (!ol || ol.status === 'dead') return headed('旧主', [{ bg: 'kuyo', text: fill(K.KYU_END_DEAD, { ...v, lord: name }) }]);
    return headed('旧主との対面', [
      { bg: 'zashiki_day', text: fill(K.KYU_END_NARR, { ...v, lord: name }) },
      { who: ol.id, text: fill(pick(K.KYU_END_LORD[temperOf(ol)], k), v) },
      ...(L ? [{ who: L.id, text: '……。', ask: `k_t_kyu:${ol.id}`, choices: K.KYU_END_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) }] : []),
    ]);
  }
  if (e.k === 'gonDaimyo') return headed('権六の便り', [{ bg: 'zashiki_night', text: K.GON_DAIMYO_NARR }, { who: 'g_gonroku', text: K.GON_DAIMYO }, ...(X.yk?.kumi ? [{ who: 'g_yokichi', text: K.YOKICHI_DAIMYO }] : [])]);
  if (e.k === 'gonLast') return headed('権六', [{ bg: 'kuyo', text: K.GON_LAST_NARR }, { who: 'g_gonroku', text: K.GON_LAST_LETTER }, ...(X.yk?.kumi ? [{ who: 'g_yokichi', text: K.YOKICHI_GON_LAST }] : [])]);
  return [];
}
// 溜まった場面（掛け合いを省く設定なら、溜めた分は捨てる。ただし旧主との対面は選ぶところがあるので出す）
export function pendingBeats(s: GameState, on: boolean): Beat[] {
  const X = C(s); if (!X) return [];
  const evs = X.tk ?? []; X.tk = [];
  return evs.filter((e) => on || e.k === 'kyuEnd').flatMap((e) => evBeats(s, e));
}

// ───────── 家中の揉め事（二人の言い分を聞いて裁く） ─────────
export function momegotoBeats(s: GameState): Beat[] {
  const m = momegotoOf(s); if (!m) return [];
  const a = s.generals[m.a], b = s.generals[m.b], k = `mome|${s.turn}`, P = m.kind === 'fuwa' ? K.MOME_CLAIM_FUWA : K.MOME_CLAIM_TEGARA;
  const v = { a: a.name, b: b.name };
  return headed(m.kind === 'fuwa' ? '家中の不和' : '手柄争い', [
    { bg: 'zashiki_day', text: fill(K.MOME_NARR[m.kind], v) },
    { who: a.id, text: fill(pick(P[temperOf(a)], k + 'a'), { other: b.name }) },
    { who: b.id, text: fill(pick(P[temperOf(b)], k + 'b'), { other: a.name }), ask: 'k_t_mome', choices: K.MOME_CHOICE.map((x) => ({ id: x.id, label: fill(x.label, v), note: fill(x.note, v) })) },
  ]);
}
// 家臣への詰問（結果を先に決めて、弁明と結びを見せる）
export function kitsuBeats(s: GameState, g: General, text: string): Beat[] {
  const L = lord(s), k = `kitsu|${g.id}|${s.turn}`, fled = g.clan !== s.player, reform = text.includes('心を入れ替え');
  return headed('詰問', [
    { bg: 'zashiki_day', text: fill(K.KITSU_V_NARR, { name: g.name }) },
    ...(L ? [{ who: L.id, text: fill(K.KITSU_V_ASK, { name: g.name }) }] : []),
    { who: g.id, text: pick(K.KITSU_V_DENY[temperOf(g)], k) },
    ...(fled ? [{ text: fill(K.KITSU_V_FLEE, { name: g.name }) }] : [{ who: g.id, text: pick(reform ? K.KITSU_V_REFORM : K.KITSU_V_DENY_END, k + 'r') }]),
    { text },
  ]);
}

let last: string | null = null;
export const takeLast = () => { const t = last; last = null; return t; };
export function choose(s: GameState, key: string, id: string): Beat[] {
  const X = C(s), L = lord(s), k = `${key}|${id}|${s.turn}`, vs = vassalsOf(s, s.player);
  if (key === 'k_t_found') {
    const c = K.FOUND_CHOICE.find((x) => x.id === id); if (!c || !L) return [];
    if (id === 'tenka') { X.stance = '攻勢'; X.prestige = Math.min(100, X.prestige + 3); for (const g of vs) if (g.bra > g.int) bump(g, 5); }
    else if (id === 'mamoru') { X.stance = '守勢'; for (const g of vs) bump(g, 3); }
    else { X.stance = '均衡'; for (const c2 of s.castles) if (c2.owner === s.player) c2.chian = Math.min(100, c2.chian + 5); for (const g of vs) if (g.int > g.bra) bump(g, 3); }
    last = `家を立てた日、${c.label}と皆に告げた（${c.note}）。`;
    return headed(`${X.name}家`, [{ who: L.id, text: c.line }, ...(vs[0] ? [{ who: vs[0].id, text: pick(K.FOUND_REACT[id], k) }] : [])]);
  }
  if (key.startsWith('k_t_kyu:')) {
    const ol = gen(s, key.slice(8)); if (!ol) return [];
    const v = { me: L?.name ?? '' };
    if (id === 'kyaku') { ol.clan = s.player; ol.status = 'free'; ol.captor = null; ol.loc = L ? L.loc : ol.loc; ol.army = null; ol.on = 40; for (const g of vs) bump(g, 2); last = `旧主の${ol.name}を許し、客分として遇した（家臣みなの恩+2）。`; addLog(s, `${ol.name}が${X.name}家の客分となった。`, 'info', true); }
    else if (id === 'shukke') { ol.status = 'dead'; ol.army = null; ol.clan = null; last = `旧主の${ol.name}を出家させた。${ol.name}は世を捨てた。`; addLog(s, `${ol.name}が出家した。`, 'info', true); }
    else { X.prestige = Math.min(100, X.prestige + 3); for (const g of vs) bump(g, -2); killGeneral(s, ol, '処断された'); last = `旧主の${ol.name}を処断した（家の威信+3・家臣みなの恩−2）。`; }
    return headed('旧主との対面', [{ who: ol.id, text: fill(K.KYU_END_REACT[id], v) }, { text: last }]);
  }
  if (key === 'k_t_mome') {
    const m = momegotoOf(s); if (!m) return [];
    const a = s.generals[m.a], b = s.generals[m.b];
    last = judgeMomegoto(s, id as 'a' | 'b' | 'both' | 'chusai');
    if (id === 'both') return headed('裁き', [{ who: a.id, text: K.MOME_BOTH }, { text: last }]);
    if (id === 'chusai') return headed('裁き', [{ who: b.id, text: K.MOME_CHUSAI }, { text: last }]);
    const [w, l] = id === 'a' ? [a, b] : [b, a];
    return headed('裁き', [{ who: w.id, text: pick(K.MOME_WIN[temperOf(w)], k) }, { who: l.id, text: pick(K.MOME_LOSE[temperOf(l)], k) }, { text: last }]);
  }
  return [];
}
void TOSYU; void clanName;

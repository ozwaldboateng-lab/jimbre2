// 武将で遊ぶ（物語の外）: 寄親（直属の上役）と同輩（張り合う相手）。足軽組頭・足軽大将のあいだ
// 寄親: 主君が家中の侍大将以上（主君を除く）から付ける（主人公のいる城の者を先に）。取り立てには寄親の推挙が要る（親しさ: 組頭→足軽大将は30、足軽大将→侍大将は45）。
//   寄親が出世すれば、功績が八割まで来ていれば一緒に引き上げられる。寄親が討たれる・家を離れると、新しい寄親が付く（親しさは初めから）。
//   懇意（親しさ50）の侍大将以上には、屋敷で寄親の鞍替えを願い出られる（もとの寄親との親しさ−15）。寄親が同じ軍勢にいた合戦は、槍働きの功績が1.5倍（寄親が見ていた）。
// 同輩: 同じ身分の家中の者を一人。槍働きの盤に味方の駒として出て（自分では動かせない）、首級・一番槍を奪い合う。勝ち負けで寄親の覚え（親しさ）が動く
import { pushKumi } from './kumiev';
import * as R from './rules';
import { addLog, rand, surnameOf } from './state';
import type { GameState, General } from './types';

export const YORI = { NEED: { 3: 30, 2: 45 } as Record<number, number>, PULL: 0.8, SWITCH_REL: 50, SWITCH_LOSS: 15, SEEN: 1.5, SEEN_REL: 3, BEAT_REL: 2, LOST_REL: 1, RIVAL_REL: 2 };
type YX = { yorioya?: string; yoriRank?: number; rival?: string; rivalAhead?: string; rivalDead?: string; rel: Record<string, number>; story?: string; id: string; retainers?: string[] };
const X = (s: GameState) => s.hero as unknown as YX;
const ACTIVE = ['free', 'army', 'camp', 'governor', 'bugyo', 'tsukai'];
const meOf = (s: GameState) => s.generals[X(s).id];
const active = (s: GameState, g: General | undefined, clan: string | null) => !!g && g.clan === clan && ACTIVE.includes(g.status);
// 寄親の要る身分か（物語の外で、家に仕える足軽組頭・足軽大将）
export const needsYori = (s: GameState) => { const H = X(s); if (!H || H.story === 'toshiie') return false; const me = meOf(s); return !!me?.clan && me.rank >= 2 && me.status !== 'dead'; };
export const yoriOf = (s: GameState) => { const H = X(s), me = meOf(s), g = H?.yorioya ? s.generals[H.yorioya] : undefined; return g && active(s, g, me.clan) ? g : null; };
export const rivalOf = (s: GameState) => { const H = X(s), me = meOf(s), g = H?.rival ? s.generals[H.rival] : undefined; return g && active(s, g, me.clan) ? g : null; };
const relOf = (s: GameState, id: string) => X(s).rel[id] ?? 0;
export const suisenNeed = (s: GameState) => YORI.NEED[meOf(s).rank] ?? 0;

function pickYori(s: GameState): General | null {
  const me = meOf(s), L = s.clans[me.clan!].leader;
  const cs = Object.values(s.generals).filter((g) => active(s, g, me.clan) && g.id !== L && g.id !== me.id && g.rank <= 1 && !g.liege);
  if (!cs.length) return null;
  const here = (g: General) => (g.loc === me.loc ? 0 : 1);
  return cs.sort((a, b) => here(a) - here(b) || b.rank - a.rank || b.lea - a.lea)[0];
}
function pickRival(s: GameState): General | null {
  const H = X(s), me = meOf(s), L = s.clans[me.clan!].leader;
  const cs = Object.values(s.generals).filter((g) => active(s, g, me.clan) && g.id !== L && g.id !== me.id && g.id !== H.yorioya && g.rank === me.rank && !g.kin && !g.liege && !(H.retainers ?? []).includes(g.id) && surnameOf(g.name) !== surnameOf(me.name)); // 身内（同じ名字）は張り合う相手にしない
  if (!cs.length) return null;
  return cs[Math.floor(rand(s) * cs.length)];
}
// 推挙がないために取り立てられない時は、その理由（推挙があれば null）
export function suisenBlock(s: GameState): string | null {
  if (!needsYori(s)) return null;
  const y = yoriOf(s); if (!y) return '寄親がいない';
  const need = suisenNeed(s), v = relOf(s, y.id);
  return v >= need ? null : `寄親の${y.name}の推挙がない（親しさ${need}から。いま${v}）`;
}
// 毎月: 寄親・同輩を付ける、失ったら付け直す、寄親の出世で引き上げる、同輩に先を越された知らせ
export function yoriMonth(s: GameState, canRise: () => boolean): string[] {
  const out: string[] = [];
  if (!needsYori(s)) return out;
  const H = X(s), me = meOf(s);
  let y = yoriOf(s);
  if (!y) {
    const lost = H.yorioya ? s.generals[H.yorioya] : undefined;
    y = pickYori(s);
    if (y) { H.yorioya = y.id; H.yoriRank = y.rank; pushKumi(s, { k: 'yori', id: y.id, old: lost?.id }); out.push(lost ? `寄親の${lost.name}を失い、新たに${y.name}が寄親に付いた。推挙を得るには、改めて親しくならねばならない。` : `${y.name}が寄親に付いた。取り立てには寄親の推挙が要る（親しさ${suisenNeed(s)}から）。`); }
    else H.yorioya = undefined;
  } else if (H.yoriRank !== undefined && y.rank < H.yoriRank) {
    // 寄親の出世: 功績が八割まで来ていれば一緒に引き上げられる
    const R = me.rank;
    H.yoriRank = y.rank;
    const at = MERIT_AT_OF(R);
    if (at !== null && me.merit >= at * YORI.PULL && canRise()) { me.rank--; pushKumi(s, { k: 'promote', rank: me.rank, pull: true }); out.push(`寄親の${y.name}の出世に伴い、引き上げられて${RANK_OF(me.rank)}になった！`); addLog(s, `${me.name}が寄親の${y.name}に引き上げられ、${RANK_OF(me.rank)}になった。`, 'info', true); }
    else out.push(`寄親の${y.name}が出世した。`);
  }
  if (y) H.yoriRank = Math.min(H.yoriRank ?? y.rank, y.rank);
  { const old = H.rival ? s.generals[H.rival] : undefined; if (old && old.status === 'dead' && H.rivalDead !== old.id) { H.rivalDead = old.id; pushKumi(s, { k: 'rivalDead', id: old.id }); } } // 同輩が討ち死にした
  let r = rivalOf(s);
  if (!r || (r.rank !== me.rank && r.rank > me.rank)) { // 同輩が身分で遅れたら、新しい同輩に
    const n = pickRival(s);
    if (n && n.id !== H.rival) { H.rival = n.id; pushKumi(s, { k: 'rival', id: n.id }); out.push(`同じ寄親の下で、${n.name}が張り合う同輩になった。`); r = n; }
  }
  if (r && r.rank < me.rank && H.rivalAhead !== `${r.id}:${r.rank}`) { H.rivalAhead = `${r.id}:${r.rank}`; pushKumi(s, { k: 'ahead', id: r.id }); out.push(`同輩の${r.name}が、先に${RANK_OF(r.rank)}に取り立てられた。`); }
  return out;
}
// 寄親の鞍替えを願い出る（懇意の侍大将以上に）
export function switchBlock(s: GameState, g: General): string | null {
  if (!needsYori(s)) return '足軽組頭・足軽大将のあいだだけ';
  const me = meOf(s);
  if (g.clan !== me.clan || g.rank > 1 || g.id === s.clans[me.clan!].leader) return '家中の侍大将以上（主君を除く）に';
  if (g.id === X(s).yorioya) return 'もう寄親';
  if (relOf(s, g.id) < YORI.SWITCH_REL) return `「懇意」（親しさ${YORI.SWITCH_REL}）から`;
  return null;
}
export function switchYori(s: GameState, gid: string): { ok: boolean; text: string; who?: string; line?: string } {
  const g = s.generals[gid], why = g ? switchBlock(s, g) : '相手がいない';
  if (why) return { ok: false, text: why };
  const H = X(s), old = yoriOf(s);
  if (old) H.rel[old.id] = Math.max(0, relOf(s, old.id) - YORI.SWITCH_LOSS);
  H.yorioya = g.id; H.yoriRank = g.rank;
  return { ok: true, who: g.id, line: 'よかろう。わしの下で働け。……見ておるぞ。', text: `${g.name}が寄親になった${old ? `（もとの寄親の${old.name}との親しさ−${YORI.SWITCH_LOSS}）` : ''}。` };
}
// 槍働きの盤の結果を、寄親と同輩に（banplay.ts から）
export function yoriBan(s: GameState, tegara: number, rivalTegara: number, seen: boolean): string[] {
  const out: string[] = [];
  const y = yoriOf(s), r = rivalOf(s), H = X(s);
  if (y && seen) { H.rel[y.id] = Math.min(100, relOf(s, y.id) + YORI.SEEN_REL); out.push(`寄親の${y.name}が働きを見ていた（親しさ+${YORI.SEEN_REL}）。`); }
  if (r) {
    r.merit += rivalTegara * 2;
    if (y && tegara > rivalTegara) { H.rel[y.id] = Math.min(100, relOf(s, y.id) + YORI.BEAT_REL); out.push(`同輩の${r.name}（手柄${rivalTegara}）に勝った。寄親の覚えがよい（親しさ+${YORI.BEAT_REL}）。`); }
    else if (rivalTegara > tegara) { H.rel[r.id] = Math.max(0, relOf(s, r.id) - YORI.RIVAL_REL); if (y) H.rel[y.id] = Math.max(0, relOf(s, y.id) - YORI.LOST_REL); out.push(`同輩の${r.name}（手柄${rivalTegara}）に後れを取った。`); }
  }
  return out;
}
const MERIT_AT_OF = (rank: number): number | null => (rank > 0 ? R.MERIT_AT[rank - 1] ?? null : null);
const RANK_OF = (rank: number) => R.RANK_NAME[rank];

// ───────── 寄子（侍大将になったら、自分が寄親になる）と論功行賞 ─────────
// 寄子: 家中の足軽大将・足軽組頭を二人（身内・陪臣・家臣・寄親・同輩を除き、主人公のいる城の者を先に）。討たれる・家を離れる・侍大将に上がると付け直す。
// 推挙: 寄子の功績が次の身分の八割まで来ていれば取り立てられ、主人公との親しさ+15（同じ寄子は半年に一度）。
// 論功行賞: 主人公が率いた合戦のあと、手柄（勝ち戦6・負け戦2）を自分・寄子・家臣に配る。一つにつき功績+5・親しさ+3。配られなかった寄子・家臣は親しさ−3（冷遇）。
//   自分に半分を超えて取ると、名声−1（手柄を独り占めした）。配り終えると、配った手柄はその者の功績になる
export const YORIKO = { SOUR_REL: 15, SOUR_P: 0.15, QUARREL_P: 0.04, GREET_EVERY: 6, SOUR_AFTER: 6, QUARREL_REL: 6, QUARREL_MERIT: 10, N: 2, POOL_WIN: 6, POOL_LOSE: 2, MERIT_PER: 5, REL_PER: 3, SLIGHT: 3, GREED: 0.5, SUISEN_EVERY: 6, SUISEN_K: 0.8, SUISEN_REL: 15 };
type KX = { yoriko?: string[]; yorikoSuisen?: Record<string, number>; ronko?: { turn: number; pool: number; foe: string }; mode?: string; fame?: number; kubi?: number };
const K = (s: GameState) => s.hero as unknown as YX & KX;
export const needsYoriko = (s: GameState) => { const H = K(s); if (!H || H.story === 'toshiie' || H.mode === 'ryoshu') return false; const me = meOf(s); return !!me?.clan && me.rank <= 1 && me.status !== 'dead'; };
export const yorikoOf = (s: GameState): General[] => { const H = K(s), me = meOf(s); return (H?.yoriko ?? []).map((id) => s.generals[id]).filter((g): g is General => active(s, g, me.clan) && g.rank >= 2); };
export function yorikoMonth(s: GameState): string[] {
  if (!needsYoriko(s)) return [];
  const H = K(s), me = meOf(s), L = s.clans[me.clan!].leader, have = yorikoOf(s), out: string[] = [];
  H.yoriko = have.map((g) => g.id);
  // 冷遇の続いた寄子（親しさ15未満）が陰で不満を漏らす（一人一度）・寄子二人の手柄争い（さばく場面）
  const KX = H as unknown as { ykSour?: string[]; ykSince?: Record<string, number>; ykGreeted?: string[]; ykGreetAt?: number };
  for (const g of have) if (s.turn - ((KX.ykSince ??= {})[g.id] ?? s.turn) >= YORIKO.SOUR_AFTER && (H.rel[g.id] ?? 0) < YORIKO.SOUR_REL && !(KX.ykSour ??= []).includes(g.id) && rand(s) < YORIKO.SOUR_P) // 寄子になって半年たった者だけ { KX.ykSour.push(g.id); pushKumi(s, { k: 'yorikoSour', id: g.id }); }
  if (have.length >= 2 && rand(s) < YORIKO.QUARREL_P) pushKumi(s, { k: 'quarrel', a: have[0].id, b: have[1].id });
  if (have.length >= YORIKO.N) return out;
  const cs = Object.values(s.generals).filter((g) => active(s, g, me.clan) && g.id !== L && g.id !== me.id && g.rank >= 2 && !g.kin && !g.liege && !g.yoriki && !(H.retainers ?? []).includes(g.id) && g.id !== H.yorioya && g.id !== H.rival && !H.yoriko!.includes(g.id) && surnameOf(g.name) !== surnameOf(me.name));
  cs.sort((a, b) => (a.loc === me.loc ? 0 : 1) - (b.loc === me.loc ? 0 : 1) || a.rank - b.rank || (b.bra + b.lea) - (a.bra + a.lea));
  for (const g of cs.slice(0, YORIKO.N - have.length)) { H.yoriko.push(g.id); (KX.ykSince ??= {})[g.id] = s.turn; if (!(KX.ykGreeted ??= []).includes(g.id) && s.turn - (KX.ykGreetAt ?? -99) >= YORIKO.GREET_EVERY) { KX.ykGreeted.push(g.id); KX.ykGreetAt = s.turn; pushKumi(s, { k: 'yoriko', id: g.id }); } out.push(`${g.name}（${RANK_OF(g.rank)}）が寄子に付いた。手柄を見て推挙してやれば、恩を感じる。`); }
  return out;
}
// 寄子を推挙する
export function yorikoSuisenBlock(s: GameState, g: General): string | null {
  if (!yorikoOf(s).includes(g)) return '寄子ではない';
  const t = K(s).yorikoSuisen?.[g.id];
  if (t !== undefined && s.turn - t < YORIKO.SUISEN_EVERY) return `推挙は半年に一度（あと${t + YORIKO.SUISEN_EVERY - s.turn}か月）`;
  const at = MERIT_AT_OF(g.rank);
  if (at === null) return 'これ以上は上がらない';
  if (g.merit < at * YORIKO.SUISEN_K) return `功績が足りない（${g.merit}／${Math.ceil(at * YORIKO.SUISEN_K)}）`;
  return null;
}
export function suisenYoriko(s: GameState, gid: string): { ok: boolean; text: string; who?: string; line?: string } {
  const g = s.generals[gid], why = g ? yorikoSuisenBlock(s, g) : '相手がいない';
  if (why) return { ok: false, text: why };
  const H = K(s);
  (H.yorikoSuisen ??= {})[g.id] = s.turn;
  g.rank--; g.merit = Math.max(g.merit, MERIT_AT_OF(g.rank + 1) ?? g.merit);
  H.rel[g.id] = Math.min(100, relOf(s, g.id) + YORIKO.SUISEN_REL);
  addLog(s, `${meOf(s).name}の推挙で、${g.name}が${RANK_OF(g.rank)}に取り立てられた。`, 'info', true);
  return { ok: true, who: g.id, line: 'このご恩、決して忘れませぬ。', text: `${g.name}を推挙し、${RANK_OF(g.rank)}に取り立てられた（親しさ+${YORIKO.SUISEN_REL}）。${g.rank <= 1 ? '侍大将になったので、寄子を離れる。' : ''}` };
}
// 論功行賞: 率いた合戦のあと（yari.ts の aftermath から）
export function ronkoStart(s: GameState, won: boolean, foe: string) { if (!needsYoriko(s)) return; K(s).ronko = { turn: s.turn, pool: won ? YORIKO.POOL_WIN : YORIKO.POOL_LOSE, foe }; }
export const ronkoOf = (s: GameState) => { const r = K(s)?.ronko; return r && r.turn >= s.turn - 1 ? r : null; };
export const ronkoCands = (s: GameState): General[] => { const H = K(s); return [meOf(s), ...yorikoOf(s), ...(H.retainers ?? []).map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead' && g.status !== 'captive')]; };
export function applyRonko(s: GameState, alloc: Record<string, number>): string {
  const r = ronkoOf(s); if (!r) return '';
  const H = K(s), me = meOf(s), cs = ronkoCands(s);
  const total = cs.reduce((t, g) => t + Math.max(0, alloc[g.id] ?? 0), 0);
  if (total > r.pool) return `配れる手柄は${r.pool}まで`;
  const got: string[] = [], slighted: string[] = [];
  for (const g of cs) {
    const n = Math.max(0, alloc[g.id] ?? 0);
    if (g.id === me.id) { if (n) g.merit += n * YORIKO.MERIT_PER; continue; }
    if (n) { g.merit += n * YORIKO.MERIT_PER; H.rel[g.id] = Math.min(100, relOf(s, g.id) + n * YORIKO.REL_PER); got.push(`${g.name}${n}`); }
    else { H.rel[g.id] = Math.max(0, relOf(s, g.id) - YORIKO.SLIGHT); slighted.push(g.name); }
  }
  const mine = Math.max(0, alloc[me.id] ?? 0);
  let greed = '';
  if (r.pool > 0 && mine > r.pool * YORIKO.GREED) { H.fame = Math.max(0, (H.fame ?? 0) - 1); greed = '手柄を独り占めしたと陰で言われた（名声−1）。'; }
  H.ronko = undefined;
  return `${r.foe}との合戦の論功行賞を行った。${mine ? `自分の功に${mine}。` : ''}${got.length ? `寄子・家臣に手柄を分けた（${got.join('・')}。功績と親しさが上がる）。` : ''}${slighted.length ? `${slighted.join('・')}は報われず、不満を抱いた（親しさ−${YORIKO.SLIGHT}）。` : ''}${greed}`;
}

// 寄子の手柄争いをさばく（kumikake.ts の場面から）: 認めた方は親しさ+6・功績+10、退けた方は親しさ−6。折半なら二人とも親しさ+1・功績+5
export function judgeQuarrel(s: GameState, a: string, b: string, pick: 'a' | 'b' | 'split'): string {
  const H = K(s), ga = s.generals[a], gb = s.generals[b]; if (!ga || !gb) return '';
  if (pick === 'split') { for (const g of [ga, gb]) { H.rel[g.id] = Math.min(100, relOf(s, g.id) + 1); g.merit += YORIKO.QUARREL_MERIT / 2; } return `${ga.name}と${gb.name}の手柄争いを、折半とした（二人とも親しさ+1）。`; }
  const w = pick === 'a' ? ga : gb, l = pick === 'a' ? gb : ga;
  H.rel[w.id] = Math.min(100, relOf(s, w.id) + YORIKO.QUARREL_REL); w.merit += YORIKO.QUARREL_MERIT;
  H.rel[l.id] = Math.max(0, relOf(s, l.id) - YORIKO.QUARREL_REL);
  return `手柄争いを${w.name}の手柄と裁いた（${w.name}の親しさ+${YORIKO.QUARREL_REL}・${l.name}の親しさ−${YORIKO.QUARREL_REL}）。`;
}

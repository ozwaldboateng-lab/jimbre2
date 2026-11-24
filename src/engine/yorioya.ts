// 武将で遊ぶ（物語の外）: 寄親（直属の上役）と同輩（張り合う相手）。足軽組頭・足軽大将のあいだ
// 寄親: 主君が家中の侍大将以上（主君を除く）から付ける（主人公のいる城の者を先に）。取り立てには寄親の推挙が要る（親しさ: 組頭→足軽大将は30、足軽大将→侍大将は45）。
//   寄親が出世すれば、功績が八割まで来ていれば一緒に引き上げられる。寄親が討たれる・家を離れると、新しい寄親が付く（親しさは初めから）。
//   懇意（親しさ50）の侍大将以上には、屋敷で寄親の鞍替えを願い出られる（もとの寄親との親しさ−15）。寄親が同じ軍勢にいた合戦は、槍働きの功績が1.5倍（寄親が見ていた）。
// 同輩: 同じ身分の家中の者を一人。槍働きの盤に味方の駒として出て（自分では動かせない）、首級・一番槍を奪い合う。勝ち負けで寄親の覚え（親しさ）が動く
import * as R from './rules';
import { addLog, rand, surnameOf } from './state';
import type { GameState, General } from './types';

export const YORI = { NEED: { 3: 30, 2: 45 } as Record<number, number>, PULL: 0.8, SWITCH_REL: 50, SWITCH_LOSS: 15, SEEN: 1.5, SEEN_REL: 3, BEAT_REL: 2, LOST_REL: 1, RIVAL_REL: 2 };
type YX = { yorioya?: string; yoriRank?: number; rival?: string; rivalAhead?: string; rel: Record<string, number>; story?: string; id: string; retainers?: string[] };
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
    if (y) { H.yorioya = y.id; H.yoriRank = y.rank; out.push(lost ? `寄親の${lost.name}を失い、新たに${y.name}が寄親に付いた。推挙を得るには、改めて親しくならねばならない。` : `${y.name}が寄親に付いた。取り立てには寄親の推挙が要る（親しさ${suisenNeed(s)}から）。`); }
    else H.yorioya = undefined;
  } else if (H.yoriRank !== undefined && y.rank < H.yoriRank) {
    // 寄親の出世: 功績が八割まで来ていれば一緒に引き上げられる
    const R = me.rank;
    H.yoriRank = y.rank;
    const at = MERIT_AT_OF(R);
    if (at !== null && me.merit >= at * YORI.PULL && canRise()) { me.rank--; out.push(`寄親の${y.name}の出世に伴い、引き上げられて${RANK_OF(me.rank)}になった！`); addLog(s, `${me.name}が寄親の${y.name}に引き上げられ、${RANK_OF(me.rank)}になった。`, 'info', true); }
    else out.push(`寄親の${y.name}が出世した。`);
  }
  if (y) H.yoriRank = Math.min(H.yoriRank ?? y.rank, y.rank);
  let r = rivalOf(s);
  if (!r || (r.rank !== me.rank && r.rank > me.rank)) { // 同輩が身分で遅れたら、新しい同輩に
    const n = pickRival(s);
    if (n && n.id !== H.rival) { H.rival = n.id; out.push(`同じ寄親の下で、${n.name}が張り合う同輩になった。`); r = n; }
  }
  if (r && r.rank < me.rank && H.rivalAhead !== `${r.id}:${r.rank}`) { H.rivalAhead = `${r.id}:${r.rank}`; out.push(`同輩の${r.name}が、先に${RANK_OF(r.rank)}に取り立てられた。`); }
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

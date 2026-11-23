// 武将で遊ぶ（物語の外）: 領主の評定（第三段）。月のはじめに主家の評定に呼ばれ、主君から命を受けるか、献策を求められる。
// 命: 攻略・領の治安・普請・城兵・献金・使者（外交の得意な者だけ）。承れば期日までに果たし、果たせば覚えと功績、怠れば覚えが下がる。断れば覚え−5。
// 献策: 次に攻める家・主家の構えについて意見を述べる。通れば主家の方針がその通りになり（6か月）、覚え+3。家中第一の臣ほど通りやすい
import { TRAITS } from '../data/traits';
import { fortOf } from './invest';
import { hexDist } from './map';
import { ryoshuOf } from './ryoshu';
import * as R from './rules';
import { lv } from './skill';
import { clanCastles, clanName, hostile, rand } from './state';
import type { ClanStance as Stance, GameState } from './types';

export type OrderKind = 'kouryaku' | 'chian' | 'fushin' | 'hei' | 'kenkin' | 'shisha';
export interface RyoOrder { kind: OrderKind; castle?: number; clan?: string; need: number; until: number }
export type Kensaku = { topic: 'target'; choices: (string | null)[] } | { topic: 'stance'; choices: Stance[] };
export type HyojoEv = { kind: 'order'; order: RyoOrder } | { kind: 'kensaku'; k: Kensaku } | { kind: 'none'; line: string };
type HX = { ryoOrder?: RyoOrder; ryoHyojo?: number; ryoEv?: HyojoEv };
const X = (s: GameState) => s.hero as (NonNullable<GameState['hero']> & HX);
export const ORDER = { REWARD: { kouryaku: [10, 40], chian: [5, 15], fushin: [5, 15], hei: [5, 15], kenkin: [6, 10], shisha: [10, 30] } as Record<OrderKind, [number, number]>, FAIL: { kouryaku: 8 } as Partial<Record<OrderKind, number>>, FAIL_DEF: 5, DECLINE: 5, KENSAKU_MONTHS: 6 };

const fiefCs = (s: GameState) => { const f = ryoshuOf(s); return f ? f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player) : []; };
const avgChian = (s: GameState) => { const cs = fiefCs(s); return cs.length ? cs.reduce((t, c) => t + c.chian, 0) / cs.length : 0; };
const fiefGarrison = (s: GameState) => fiefCs(s).reduce((t, c) => t + c.garrison, 0);
export const canEnvoy = (s: GameState) => { const g = s.generals[s.hero!.id], tr = TRAITS[g.id]; return lv(s, 'bensetsu') >= 2 || tr === 'gaiko' || tr === 'so'; };

export function orderText(s: GameState, o: RyoOrder, due = true): string {
  const left = (x: string) => (due ? x : '');
  switch (o.kind) {
    case 'kouryaku': return `${s.castles[o.castle!].name}（${clanName(s, s.castles[o.castle!].owner)}家）を${left(`${o.until - s.turn}か月のうちに`)}落とせ`;
    case 'chian': return `領の治安を${o.need}まで上げよ${left(`（${o.until - s.turn}か月のうちに）`)}`;
    case 'fushin': return `${s.castles[o.castle!].name}の普請を一段進めよ${left(`（${o.until - s.turn}か月のうちに）`)}`;
    case 'hei': return `領の城兵を${o.need}まで揃えよ${left(`（${o.until - s.turn}か月のうちに）`)}`;
    case 'kenkin': return `領の蔵から金${o.need}貫を納めよ`;
    case 'shisha': return `${clanName(s, o.clan!)}家へ使者に立ち、盟を取りまとめよ`;
  }
}
function orderCands(s: GameState): RyoOrder[] {
  const f = ryoshuOf(s)!, C = s.clans[s.player], out: RyoOrder[] = [], cs = fiefCs(s), t = s.turn;
  if (C.target && s.clans[C.target]?.alive) {
    const tc = clanCastles(s, C.target).sort((a, b) => Math.min(...cs.map((c) => hexDist(c.hex, a.hex))) - Math.min(...cs.map((c) => hexDist(c.hex, b.hex))))[0];
    if (tc && cs.some((c) => hexDist(c.hex, tc.hex) <= R.hx(8))) out.push({ kind: 'kouryaku', castle: tc.i, need: 1, until: t + 6 });
  }
  const ch = avgChian(s); if (ch < 75) out.push({ kind: 'chian', need: Math.min(90, Math.round(ch + 12)), until: t + 6 });
  const low = cs.filter((c) => fortOf(c) < 2 && !c.fortBuild).sort((a, b) => b.garrison - a.garrison)[0]; if (low) out.push({ kind: 'fushin', castle: low.i, need: fortOf(low) + 1, until: t + 9 });
  const gmax = cs.reduce((x, c) => x + Math.round(c.garrison < 1 ? 0 : c.garrison), 0); const want = Math.round(gmax * 1.25 / 100) * 100; if (want > 0) out.push({ kind: 'hei', need: want, until: t + 4 });
  const fg = f.gold ?? 0; if (fg >= 600) out.push({ kind: 'kenkin', need: Math.max(300, Math.round(fg * 0.3 / 100) * 100), until: t });
  if (canEnvoy(s)) {
    const cands = Object.values(s.clans).filter((x) => x.alive && x.id !== s.player && x.id !== C.target && clanCastles(s, x.id).length && !s.treaties.some((tr) => (tr.a === s.player && tr.b === x.id) || (tr.b === s.player && tr.a === x.id)) && x.target !== s.player);
    const near = cands.sort((a, b) => Math.min(...clanCastles(s, a.id).map((k) => Math.min(...cs.map((c) => hexDist(c.hex, k.hex))))) - Math.min(...clanCastles(s, b.id).map((k) => Math.min(...cs.map((c) => hexDist(c.hex, k.hex))))))[0];
    if (near) out.push({ kind: 'shisha', clan: near.id, need: 1, until: t });
  }
  return out;
}
function kensakuOf(s: GameState): Kensaku | null {
  const C = s.clans[s.player], ks = C.kensaku && s.turn <= C.kensaku.until ? C.kensaku : null;
  const tOn = !!ks && ks.target !== undefined && s.turn <= (ks.tUntil ?? ks.until), sOn = !!ks && !!ks.stance && s.turn <= (ks.sUntil ?? ks.until);
  if (tOn && sOn) return null; // 狙う家も構えも献策が通っている間は、献策は求められない
  const askTarget = tOn ? false : sOn ? true : rand(s) < 0.5; // 通った献策がある間は、同じことを重ねて問わない
  if (askTarget) {
    const own = clanCastles(s, s.player);
    const foes = [...new Set(s.castles.filter((k) => k.owner && hostile(s, s.player, k.owner) && own.some((c) => hexDist(c.hex, k.hex) <= R.hx(5))).map((k) => k.owner!))].filter((x) => s.clans[x]?.alive).slice(0, 3);
    if (foes.length) return { topic: 'target', choices: [...foes, null] };
    if (sOn) return null;
  }
  return { topic: 'stance', choices: (['攻勢', '均衡', '守勢'] as Stance[]).filter((x) => x !== C.stance) };
}
// 月のはじめの評定（領主の画面で、月の処理と報告のあと）。その月にもう開いていれば null
export function hyojoEvent(s: GameState): HyojoEv | null {
  const H = X(s); if (!ryoshuOf(s) || H.out) return null;
  if (H.ryoHyojo === s.turn) return H.ryoEv ?? null;
  H.ryoHyojo = s.turn;
  const r = rand(s);
  let ev: HyojoEv;
  const none: HyojoEv = { kind: 'none', line: H.ryoOrder ? `申し付けた件（${orderText(s, H.ryoOrder)}）、抜かるなよ。` : '今月は、特に申し付けることはない。各々、領をよく治めよ。' };
  const ks = r >= 0.55 && r < 0.85 || (!H.ryoOrder && r < 0.55) ? kensakuOf(s) : null;
  if (!H.ryoOrder && r < 0.55) { const cs = orderCands(s); ev = cs.length ? { kind: 'order', order: cs[Math.floor(rand(s) * cs.length)] } : ks ? { kind: 'kensaku', k: ks } : none; }
  else if (r < 0.85 && ks) ev = { kind: 'kensaku', k: ks };
  else ev = r < 0.85 ? none : { kind: 'none', line: H.ryoOrder ? `申し付けた件（${orderText(s, H.ryoOrder)}）、抜かるなよ。` : '今月は、特に申し付けることはない。各々、領をよく治めよ。' };
  H.ryoEv = ev;
  return ev;
}
// 命を承る（献金・使者はその場で）／断る
export function acceptOrder(s: GameState): { text: string; line: string } {
  const H = X(s), ev = H.ryoEv; if (!ev || ev.kind !== 'order') return { text: '', line: '' };
  const o = ev.order, me = s.generals[H.id], f = ryoshuOf(s)!;
  H.ryoEv = undefined;
  if (o.kind === 'kenkin') {
    if ((f.gold ?? 0) < o.need) { fail(s, o); return { text: `領の蔵が足りず、納められなかった（覚え−${ORDER.FAIL_DEF}）。`, line: 'なんだ、払えぬのか。' }; }
    f.gold = (f.gold ?? 0) - o.need; s.clans[s.player].gold += o.need; return reward(s, o, `金${o.need}貫を納めた。`, 'うむ、確かに受け取った。');
  }
  if (o.kind === 'shisha') {
    const p = Math.min(0.85, 0.25 + me.cha / 250 + lv(s, 'bensetsu') * 0.08 + (TRAITS[me.id] === 'gaiko' ? 0.15 : 0));
    if (rand(s) < p) { s.treaties.push({ a: s.player, b: o.clan!, kind: 'alliance', start: s.turn, until: s.turn + 24 }); return reward(s, o, `${clanName(s, o.clan!)}家へ使者に立ち、盟を取りまとめた（24か月）。`, '見事な口上であったと聞く。よう取りまとめた。'); }
    return { ...fail(s, o, 3), text: `${clanName(s, o.clan!)}家との談判はまとまらなかった（覚え−3）。` };
  }
  H.ryoOrder = o;
  return { text: `命を承った: ${orderText(s, o)}。`, line: '頼んだぞ。' };
}
export function declineOrder(s: GameState): { text: string; line: string } {
  const H = X(s); H.ryoEv = undefined; H.favor = Math.max(0, H.favor - ORDER.DECLINE);
  return { text: `命を断った（主君の覚え−${ORDER.DECLINE}）。`, line: '……そうか。ほかの者に任せる。' };
}
function reward(s: GameState, o: RyoOrder, text: string, line: string) {
  const H = X(s), me = s.generals[H.id], [fv, mr] = ORDER.REWARD[o.kind];
  H.favor = Math.min(100, H.favor + fv); me.merit += mr; if (o.kind === 'kouryaku' || o.kind === 'shisha') H.fame = Math.min(100, (H.fame ?? 0) + 3);
  return { text: `${text}主君の覚え+${fv}・功績+${mr}。`, line };
}
function fail(s: GameState, o: RyoOrder, n?: number) { const H = X(s), k = n ?? ORDER.FAIL[o.kind] ?? ORDER.FAIL_DEF; H.favor = Math.max(0, H.favor - k); return { text: `命（${orderText(s, o, false)}）を果たせなかった。主君の覚え−${k}。`, line: '' }; }
// 献策: 選んだ意見を述べる。通れば主家の方針に（6か月）
export function kensaku(s: GameState, choice: string): { text: string; line: string } {
  const H = X(s), ev = H.ryoEv; if (!ev || ev.kind !== 'kensaku') return { text: '', line: '' };
  H.ryoEv = undefined;
  const me = s.generals[H.id], C = s.clans[s.player], steps = H.career?.steps ?? [];
  if (choice === 'pass') return { text: '意見は控えた。', line: 'そうか。' };
  const p = Math.max(0.1, Math.min(0.95, 0.3 + H.favor / 250 + me.int / 400 + lv(s, 'bensetsu') * 0.04 + (steps.includes('hitto') ? 0.3 : me.rank === 0 ? 0.1 : 0)));
  const what = ev.k.topic === 'target' ? (choice === 'none' ? '今は攻めず、守りを固めるべき' : `次は${clanName(s, choice)}家を攻めるべき`) : `主家は${choice}に構えるべき`;
  if (rand(s) < p) {
    const old = C.kensaku && s.turn <= C.kensaku.until ? C.kensaku : null, u = s.turn + ORDER.KENSAKU_MONTHS; // 狙う家と構えは、それぞれの期日で重ねて持つ
    C.kensaku = { ...(old ?? {}), until: Math.max(u, old?.until ?? 0), ...(ev.k.topic === 'target' ? (choice === 'none' ? { stance: '守勢' as Stance, sUntil: u, target: null, tUntil: u } : { target: choice, tUntil: u }) : { stance: choice as Stance, sUntil: u }) };
    H.favor = Math.min(100, H.favor + 3);
    return { text: `「${what}」と献策し、聞き入れられた（${ORDER.KENSAKU_MONTHS}か月、主家の方針がそのように。覚え+3）。`, line: 'もっともだ。そのようにいたせ。' };
  }
  return { text: `「${what}」と献策したが、採られなかった（見込み${Math.round(p * 100)}%）。`, line: '考えておく。' };
}
export const currentOrder = (s: GameState) => X(s)?.ryoOrder;
// 月の終わり: 承った命の首尾
export function orderMonth(s: GameState): string[] {
  const H = X(s), o = H?.ryoOrder; if (!H || !o || !ryoshuOf(s)) return [];
  let done = false;
  if (o.kind === 'kouryaku') done = s.castles[o.castle!].owner === s.player;
  else if (o.kind === 'chian') done = avgChian(s) >= o.need;
  else if (o.kind === 'fushin') done = fortOf(s.castles[o.castle!]) >= o.need;
  else if (o.kind === 'hei') done = fiefGarrison(s) >= o.need;
  if (done) { H.ryoOrder = undefined; return [reward(s, o, `命（${orderText(s, o, false)}）を果たした。`, '').text]; }
  if (s.turn >= o.until || (o.kind === 'kouryaku' && s.castles[o.castle!].owner !== s.clans[s.player].target && s.castles[o.castle!].owner === null)) { H.ryoOrder = undefined; return [fail(s, o).text]; }
  return [];
}

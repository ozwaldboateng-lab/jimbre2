// 武将で遊ぶ（物語の外）: 領主と主君のあいだ（城主・国持ち）。主君の疑い・加増と国替え・家中の競争（席次と讒言）。
// 疑い（0〜100）: 覚えが低い・領が大きすぎる・密約や味方の約束がある・噂が立つ・讒言で募り、覚えがよければ薄れる。
//   50で詰問（出向けば申し開き、拒めば疑いが極まる）、80で減封（領の城を一つ召し上げ）、100で討手（謀反・出奔・最後の申し開き）。
// 加増: 覚え75以上・疑い30未満で、年に一度ほど、領の隣の自家の城を一つ加える。国替え: 三年に一度ほど、主君の都合で領を別の土地へ移す（従うか背くか）。
// 家中の競争: 家中の城持ちのうち、領の石高と功績で席次を付ける。張り合う城主（親しくない者）が主君に讒言することがある（主君と懇意なら退けられる）
import { hexDist } from './map';
import { lv } from './skill';
import * as R from './rules';
import { addLog, castleKoku, clanCastles, clanName, hostile, rand } from './state';
import type { Castle, GameState, General } from './types';

export const SHIN = { KITSUMON: 50, GENPO: 80, UCHITE: 100, KITSU_EVERY: 4, GENPO_EVERY: 6, LOW: 30, MID: 45, HIGH: 60, UP_LOW: 4, UP_MID: 2, DOWN_HIGH: 3, DECAY: 1, BIG: 0.3, BIG_UP: 2, PLOT_UP: 1, LEAK_UP: 20, ZAN_P: 0.08, ZAN_UP: 10, ZAN_FAVOR: 5, ZAN_GUARD: 60, ZAN_REL: 30, KAZO_FAVOR: 75, KAZO_UTA: 30, KAZO_EVERY: 12, KAZO_P: 0.25, KUNI_EVERY: 36, KUNI_P: 0.03 };
type Ev = { kind: 'kitsumon' | 'uchite' | 'kunigae'; turn: number; to?: number[] };
type SX = { utagai?: number; shinEv?: Ev; kitsuTurn?: number; genpoTurn?: number; kazoTurn?: number; kunigaeTurn?: number; seki?: number; rivalJo?: string; fuchu?: number; ryo?: number[]; secret?: unknown; pact?: string[]; mode?: string; favor: number; rel: Record<string, number>; id: string; retainers?: string[] };
const X = (s: GameState) => s.hero as unknown as SX;
const clamp = (v: number) => Math.max(0, Math.min(100, v));
const me = (s: GameState) => s.generals[X(s).id];
const lordOf = (s: GameState) => { const c = me(s).clan; const L = c ? s.clans[c].leader : null; return L ? s.generals[L] : null; };
export const utagaiOf = (s: GameState) => X(s)?.utagai ?? 0;
export const utagaiName = (v: number) => (v >= SHIN.GENPO ? '謀反を疑われている' : v >= SHIN.KITSUMON ? '強く疑われている' : v >= 25 ? '疑われはじめている' : '信を得ている');
export function addUtagai(s: GameState, n: number) { const H = X(s); if (!H || H.mode !== 'ryoshu') return; H.utagai = clamp((H.utagai ?? 0) + n); }
// 領（府中と預かった城）
const fiefIdx = (s: GameState): number[] => { const H = X(s); return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])].filter((i) => s.castles[i].owner === me(s).clan); };
const fiefKoku = (s: GameState) => fiefIdx(s).reduce((t, i) => t + castleKoku(s.castles[i]), 0);
// 家中の城持ち（席次を比べる相手）: 城主の武将ごとに、城の石高の合計と功績
function holders(s: GameState): { g: General; v: number }[] {
  const clan = me(s).clan!, L = s.clans[clan].leader, H = X(s), by = new Map<string, number>();
  for (const c of clanCastles(s, clan)) if (c.governor && c.governor !== L && c.governor !== H.id && !s.generals[c.governor]?.liege) by.set(c.governor, (by.get(c.governor) ?? 0) + castleKoku(c));
  const out = [...by].map(([id, k]) => ({ g: s.generals[id], v: k + s.generals[id].merit / 50 }));
  out.push({ g: me(s), v: fiefKoku(s) + me(s).merit / 50 });
  return out.sort((a, b) => b.v - a.v);
}
export const sekiOf = (s: GameState) => { const hs = holders(s); return { seki: hs.findIndex((x) => x.g.id === X(s).id) + 1, of: hs.length }; };
// 張り合う城主: 席次がすぐ上か下の城主のうち、いちばん親しくない者
function pickRival(s: GameState): General | null {
  const hs = holders(s), i = hs.findIndex((x) => x.g.id === X(s).id);
  const near = [hs[i - 1], hs[i + 1], hs[i - 2], hs[i + 2]].filter(Boolean).map((x) => x!.g);
  return near.sort((a, b) => (X(s).rel[a.id] ?? 0) - (X(s).rel[b.id] ?? 0))[0] ?? null;
}
export const rivalJoOf = (s: GameState) => { const id = X(s)?.rivalJo, g = id ? s.generals[id] : null; return g && g.clan === me(s).clan && g.status !== 'dead' ? g : null; };

// ───────── 毎月 ─────────
export function ryoshinMonth(s: GameState): string[] {
  const H = X(s); if (!H || H.mode !== 'ryoshu') return [];
  const out: string[] = [], L = lordOf(s), clan = me(s).clan!;
  // 席次と張り合う城主
  const { seki, of } = sekiOf(s);
  if (H.seki && seki < H.seki) out.push(`評定の席次が上がった（家中の城持ち${of}人のうち${seki}番目）。`);
  H.seki = seki;
  if (!rivalJoOf(s)) { const r = pickRival(s); if (r) { H.rivalJo = r.id; out.push(`${r.name}が、家中で張り合う城主になった。`); } }
  // 疑い
  let d = -SHIN.DECAY;
  if (H.favor < SHIN.LOW) d += SHIN.UP_LOW; else if (H.favor < SHIN.MID) d += SHIN.UP_MID; else if (H.favor >= SHIN.HIGH) d -= SHIN.DOWN_HIGH;
  const ck = clanCastles(s, clan).reduce((t, c) => t + castleKoku(c), 0);
  if (ck && fiefKoku(s) > ck * SHIN.BIG) d += SHIN.BIG_UP;
  if (H.secret || (H.pact ?? []).length) d += SHIN.PLOT_UP;
  // 讒言
  const r = rivalJoOf(s);
  if (r && L && (H.rel[r.id] ?? 0) < SHIN.ZAN_REL && rand(s) < SHIN.ZAN_P) {
    if ((H.rel[L.id] ?? 0) >= SHIN.ZAN_GUARD) out.push(`${r.name}が主君に讒言したが、${L.name}は取り合わなかった（主君と懇意だった）。`);
    else { d += SHIN.ZAN_UP; H.favor = Math.max(0, H.favor - SHIN.ZAN_FAVOR); out.push(`${r.name}が主君に讒言した。主君の覚え−${SHIN.ZAN_FAVOR}、疑いが募った。`); }
  }
  H.utagai = clamp((H.utagai ?? 0) + d);
  const u = H.utagai;
  // 討手・減封・詰問
  if (u >= SHIN.UCHITE && H.shinEv?.kind !== 'uchite') { H.shinEv = { kind: 'uchite', turn: s.turn + 1 }; out.push(`${L?.name ?? '主君'}は謀反を確信し、討手を差し向けた。`); }
  else if (u >= SHIN.GENPO && (H.genpoTurn === undefined || s.turn - H.genpoTurn >= SHIN.GENPO_EVERY)) out.push(...genpo(s));
  else if (u >= SHIN.KITSUMON && !H.shinEv && (H.kitsuTurn === undefined || s.turn - H.kitsuTurn >= SHIN.KITSU_EVERY)) { H.kitsuTurn = s.turn; H.shinEv = { kind: 'kitsumon', turn: s.turn + 1 }; out.push(`${L?.name ?? '主君'}から呼び出しの使者が来た。近ごろの振る舞いについて、詰問したいという。`); }
  // 加増と国替え
  if (!H.shinEv && H.favor >= SHIN.KAZO_FAVOR && u < SHIN.KAZO_UTA && (H.kazoTurn === undefined || s.turn - H.kazoTurn >= SHIN.KAZO_EVERY) && rand(s) < SHIN.KAZO_P) out.push(...kazo(s));
  if (!H.shinEv && fiefIdx(s).length && (H.kunigaeTurn === undefined || s.turn - H.kunigaeTurn >= SHIN.KUNI_EVERY) && rand(s) < SHIN.KUNI_P) {
    const to = kunigaeTarget(s);
    if (to) { H.kunigaeTurn = s.turn; H.shinEv = { kind: 'kunigae', turn: s.turn + 1, to: to.map((c) => c.i) }; out.push(`${L?.name ?? '主君'}から国替えの命が下った。${to.map((c) => c.name).join('・')}へ移れという。`); }
  }
  return out;
}
// 減封: 府中を除く領の城のうち、いちばん小さい城を召し上げる（なければ府中のまま覚え−10）
function genpo(s: GameState): string[] {
  const H = X(s); H.genpoTurn = s.turn; H.utagai = clamp((H.utagai ?? 0) - 20);
  const cs = (H.ryo ?? []).map((i) => s.castles[i]).filter((c) => c.owner === me(s).clan).sort((a, b) => castleKoku(a) - castleKoku(b));
  if (!cs.length) { H.favor = Math.max(0, H.favor - 10); return ['主君は疑いを深め、覚えを落とした（−10）。召し上げる城がないので、府中だけは残された。']; }
  const c = cs[0]; release(s, c);
  addLog(s, `${me(s).name}が${c.name}を召し上げられた（減封）。`, 'info', true);
  return [`疑いが極まり、減封となった。${c.name}を召し上げられた。`];
}
// 領から外す: 主人公の家臣が城主なら外して府中へ
function release(s: GameState, c: Castle) {
  const H = X(s);
  H.ryo = (H.ryo ?? []).filter((i) => i !== c.i);
  for (const f of s.fronts ?? []) if (f.manual) f.castles = f.castles.filter((i) => i !== c.i);
  const g = c.governor ? s.generals[c.governor] : null;
  if (g && (g.liege === H.id || g.id === H.id)) { c.governor = null; if (g.id !== H.id) { g.status = 'free'; g.loc = H.fuchu ?? g.loc; } }
}
// 加増: 領の隣（4マスほど）の自家の城（主君の居城を除く）を一つ
function kazo(s: GameState): string[] {
  const H = X(s), clan = me(s).clan!, L = lordOf(s), fief = fiefIdx(s);
  const cs = clanCastles(s, clan).filter((c) => !fief.includes(c.i) && c.i !== L?.loc && fief.some((i) => hexDist(s.castles[i].hex, c.hex) <= R.hx(4))).sort((a, b) => castleKoku(a) - castleKoku(b));
  if (!cs.length) return [];
  const c = cs[0]; H.kazoTurn = s.turn;
  for (const f of s.fronts ?? []) if (!f.manual) f.castles = f.castles.filter((i) => i !== c.i);
  (H.ryo ??= []).push(c.i);
  const mf = (s.fronts ?? []).find((f) => f.manual); if (mf && !mf.castles.includes(c.i)) mf.castles.push(c.i);
  addLog(s, `${me(s).name}が${c.name}を加増された。`, 'info', true);
  return [`日ごろの働きにより、${c.name}を加増された（領に加わった）。`];
}
// 国替えの先: 領と同じほどの石高の自家の城（主君の居城・今の領を除く）。敵に近い城を先に（主家の都合で境へ）
function kunigaeTarget(s: GameState): Castle[] | null {
  const clan = me(s).clan!, L = lordOf(s), fief = fiefIdx(s), need = fiefKoku(s) * 0.9, n = fief.length;
  const foeNear = (c: Castle) => Math.min(99, ...s.castles.filter((k) => k.owner && hostile(s, clan, k.owner)).map((k) => hexDist(k.hex, c.hex)));
  const cs = clanCastles(s, clan).filter((c) => !fief.includes(c.i) && c.i !== L?.loc).sort((a, b) => foeNear(a) - foeNear(b));
  const pick: Castle[] = []; let k = 0;
  for (const c of cs) { if (k >= need && pick.length >= Math.min(n, 1)) break; if (pick.length >= Math.max(4, n)) break; pick.push(c); k += castleKoku(c); } // 敵に近い城から、石高が足りるまで（四城まで）
  return pick.length && k >= need ? pick : null;
}
// ───────── 選ぶ出来事（月のはじめの窓） ─────────
export const shinEvOf = (s: GameState) => { const e = X(s)?.shinEv; return e && X(s).mode === 'ryoshu' ? e : null; };
export const benmeiChance = (s: GameState, last = false) => { const L = lordOf(s), g = me(s); return Math.max(0.05, Math.min(0.9, (last ? 0.3 : 0.4) + g.cha / 300 + lv(s, 'bensetsu') * 0.05 + (L ? (X(s).rel[L.id] ?? 0) / 300 : 0) - utagaiOf(s) / 300)); };
// 詰問に出向く（申し開き）
export function kitsumonGo(s: GameState): { ok: boolean; text: string; line: string } {
  const H = X(s), p = benmeiChance(s); H.shinEv = undefined;
  if (rand(s) < p) { H.utagai = clamp((H.utagai ?? 0) - 30); H.favor = Math.min(100, H.favor + 3); return { ok: true, line: '……わかった。疑うたのは早計であったか。励め。', text: `申し開きが通った（見込み${Math.round(p * 100)}%）。疑いが薄れた（−30）。` }; }
  H.utagai = clamp((H.utagai ?? 0) + 10); H.favor = Math.max(0, H.favor - 10);
  return { ok: false, line: '言い訳は聞き飽きた。……下がれ。', text: `申し開きは通らなかった（見込み${Math.round(p * 100)}%）。覚え−10、疑い+10。` };
}
export function kitsumonRefuse(s: GameState): string { const H = X(s); H.utagai = 100; H.shinEv = { kind: 'uchite', turn: s.turn }; return '呼び出しを拒んだ。主君は謀反を確信し、討手を差し向けた。'; }
// 討手に最後の申し開き: 通れば疑い60・覚え20に。通らなければ領を召し上げられ、足軽大将に落とされる
export function uchiteBenmei(s: GameState): { ok: boolean; text: string; line: string; lost?: boolean } {
  const H = X(s), p = benmeiChance(s, true); H.shinEv = undefined;
  if (rand(s) < p) { H.utagai = 60; H.favor = 20; return { ok: true, line: '首の皮一枚でつながったな。二度目はないぞ。', text: `命がけの申し開きが通った（見込み${Math.round(p * 100)}%）。討手は引き揚げた。` }; }
  for (const i of fiefIdx(s)) release(s, s.castles[i]);
  H.fuchu = undefined; H.ryo = []; me(s).rank = Math.max(me(s).rank, 2); H.favor = 10; H.utagai = 40;
  return { ok: false, lost: true, line: '城は返してもらう。命があるだけありがたく思え。', text: `申し開きは通らなかった（見込み${Math.round(p * 100)}%）。領をすべて召し上げられ、足軽大将に落とされた。` };
}
// 国替えに従う: 領を移す（府中は先頭の城。家臣の城主は新しい府中へ）。覚え+10・疑い−20
export function kunigaeObey(s: GameState): string {
  const H = X(s), ev = H.shinEv; H.shinEv = undefined;
  if (!ev?.to) return '';
  const to = ev.to.map((i) => s.castles[i]).filter((c) => c.owner === me(s).clan);
  if (!to.length) return '移る先の城が人手に渡り、国替えは沙汰止みになった。';
  const old = fiefIdx(s).map((i) => s.castles[i]);
  for (const c of old) release(s, c);
  const mf = (s.fronts ?? []).find((f) => f.manual);
  for (const c of to) { for (const f of s.fronts ?? []) if (f !== mf) f.castles = f.castles.filter((i) => i !== c.i); if (mf && !mf.castles.includes(c.i)) mf.castles.push(c.i); const g = c.governor ? s.generals[c.governor] : null; if (g && g.id !== H.id) { g.status = 'free'; c.governor = null; const o = old.find((k) => !k.governor); if (o) { o.governor = g.id; g.status = 'governor'; g.loc = o.i; } } }
  H.fuchu = to[0].i; H.ryo = to.slice(1).map((c) => c.i);
  for (const id of H.retainers ?? []) { const g = s.generals[id]; if (g && g.status === 'free') g.loc = to[0].i; }
  H.favor = Math.min(100, H.favor + 10); H.utagai = clamp((H.utagai ?? 0) - 20);
  addLog(s, `${me(s).name}が${old.map((c) => c.name).join('・')}から${to.map((c) => c.name).join('・')}へ国替えとなった。`, 'info', true);
  return `国替えに従い、${to.map((c) => c.name).join('・')}へ移った。育てた領は手放したが、主君の覚え+10、疑いが薄れた。`;
}
export function kunigaeDefy(s: GameState): string { const H = X(s); H.utagai = 100; H.shinEv = { kind: 'uchite', turn: s.turn }; return `国替えを拒んだ。${clanName(s, me(s).clan!)}家の主君は激怒し、討手を差し向けた。`; }

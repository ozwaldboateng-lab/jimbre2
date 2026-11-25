// 武将で遊ぶ（物語の外）: 領主の寝返り（第四段）。領（城・部隊・家臣）ごと、主家の敵の家へ鞍替えする。
// 持ちかける: 近く（領から hx(8) 以内に城がある）の主家の敵の家に。見込みは名声・領の石高・弁舌・相手との縁・相手が主家より強いかで決まる。しくじると30%で主君の耳に入る（覚え−20）。
// 受ける: 敵方から誘いの使者が来る（毎月3%、主君の覚えが40を切ると10%）。受ければ本領安堵に加えて領の蔵に1,000貫。
// 寝返った先でも領主として続く（主君の覚えは50から。方面軍団長・家中第一の臣は主家ごとのものなので解ける）。与力は元の主家に残る
import { pushKumi } from './kumiev';
import { clanPower } from './diplomacy';
import { hexDist } from './map';
import { delegateOf } from './delegate';
import { ryoshuOf, toRyoshu } from './ryoshu';
import * as R from './rules';
import { lv } from './skill';
import { addUtagai } from './ryoshin';
import { dissolveCamp } from './jinbure';
import { addLog, castleKoku, clanCastles, clanName, hostile, rand } from './state';
import type { GameState } from './types';

export const NE = { RANGE: 8, BASE: 0.15, FAME_K: 1 / 300, KOKU_K: 1 / 120, BEN_K: 0.04, REL_K: 1 / 300, STRONG: 0.15, MAX: 0.8, LEAK: 0.3, LEAK_FAVOR: 20, OFFER_P: 0.03, OFFER_P_LOW: 0.1, OFFER_GOLD: 1000, NEW_FAVOR: 50, MAX_CANDS: 6 };
type NX = { neTried?: Record<string, number>; neOffer?: { clan: string; turn: number } };
const X = (s: GameState) => s.hero as (NonNullable<GameState['hero']> & NX);

const fiefCastles = (s: GameState) => { const f = ryoshuOf(s); return f ? f.castles.map((i) => s.castles[i]).filter((c) => c.owner === s.player) : []; };
// 寝返りの先にできる家: 主家の敵で、領の近くに城がある
export function defectCands(s: GameState): string[] {
  const cs = fiefCastles(s); if (!cs.length) return [];
  const d = new Map<string, number>(); // 家ごとの、領からいちばん近い城までの道のり。近い6家まで
  for (const k of s.castles) if (k.owner && k.owner !== s.player && hostile(s, s.player, k.owner) && s.clans[k.owner]?.alive && s.clans[k.owner].leader) { const m = Math.min(...cs.map((c) => hexDist(c.hex, k.hex))); if (m <= R.hx(NE.RANGE) && m < (d.get(k.owner) ?? Infinity)) d.set(k.owner, m); }
  return [...d].sort((x, y) => x[1] - y[1]).slice(0, NE.MAX_CANDS).map((x) => x[0]);
}
export function defectChance(s: GameState, clan: string): number {
  const H = X(s), L = s.clans[clan].leader!;
  const koku = fiefCastles(s).reduce((t, c) => t + castleKoku(c), 0);
  const strong = clanPower(s, clan) > clanPower(s, s.player) ? NE.STRONG : 0;
  return Math.max(0.05, Math.min(NE.MAX, NE.BASE + (H.fame ?? 0) * NE.FAME_K + koku * NE.KOKU_K + lv(s, 'bensetsu') * NE.BEN_K + (H.rel[L] ?? 0) * NE.REL_K + strong));
}
// 領ごと寝返る: 領の城と部隊、家臣は新しい家へ。主人公は新しい家の領主に
export function defect(s: GameState, clan: string, bonus = 0): string {
  const H = X(s), me = s.generals[H.id], from = me.clan!, f = ryoshuOf(s)!;
  const warm = (gid: string | null | undefined) => { const g = gid ? s.generals[gid] : null; return !!g && g.yoriki === me.id && (H.rel[g.id] ?? 0) >= 60; };
  const cold = (gid: string | null | undefined) => { const g = gid ? s.generals[gid] : null; return !!g && g.yoriki === me.id && !warm(gid); };
  const castles = fiefCastles(s).filter((c) => !cold(c.governor)), armies = [...Object.values(s.armies), ...Object.values(s.camps ?? {})].filter((a) => a.clan === from && a.front === f.id);
  const fromLord = s.clans[from].leader;
  const retainers = new Set(H.retainers ?? []);
  const fromHome = clanCastles(s, from).filter((c) => !castles.includes(c)).sort((a, b) => castleKoku(b) - castleKoku(a))[0];
  for (const g of Object.values(s.generals)) {
    if (g.yoriki === me.id && warm(g.id)) { g.yoriki = undefined; g.clan = clan; continue; } // 親しい与力はついて来る
    if (g.yoriki === me.id) for (const cp of Object.values(s.camps ?? {})) if (cp.main === g.id && cp.camp !== undefined && castles.some((c) => c.i === cp.camp)) dissolveCamp(s, cp); // 残る与力の、離れる城の軍団の名簿は解く
    if (g.yoriki === me.id) { g.yoriki = undefined; if (g.clan === from && fromHome && g.status !== 'army' && g.status !== 'camp') { for (const c of castles) if (c.governor === g.id) c.governor = null; g.status = 'free'; g.loc = fromHome.i; } } // 与力は元の主家に残る
  }
  for (const c of castles) { c.owner = clan; c.prevOwner = from; c.prevTurn = s.turn; if (c.governor && !retainers.has(c.governor) && c.governor !== me.id) { const g = s.generals[c.governor]; g.status = 'free'; if (fromHome) g.loc = fromHome.i; c.governor = null; } }
  for (const a of armies.filter((x) => !cold(x.main))) { a.clan = clan; a.front = undefined; for (const gid of [a.main, ...(a.staff ?? [])]) if (s.generals[gid]) s.generals[gid].clan = clan; }
  for (const id of retainers) { const g = s.generals[id]; if (g && g.status !== 'dead' && g.status !== 'captive') g.clan = clan; }
  me.clan = clan;
  if (fromLord) H.rel[fromLord] = Math.max(0, (H.rel[fromLord] ?? 0) - 40);
  (H.career ??= { steps: [] }).served = [...(H.career.served ?? []), clanName(s, from)];
  H.career.steps = H.career.steps.filter((k) => k !== 'homen' && k !== 'hitto');
  H.favor = NE.NEW_FAVOR; H.gunyaku = undefined; H.ryoOrder = undefined; H.ryoEv = undefined; H.heirNamed = undefined;
  // 遊び手の家を新しい主家に。元の主家の領（方面）はなくなる
  s.player = clan; s.fronts = []; const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true;
  H.mode = undefined;
  const nf = toRyoshu(s); if (nf) { for (const c of castles) if (!nf.castles.includes(c.i)) nf.castles.push(c.i); if (bonus) nf.gold = (nf.gold ?? 0) + bonus; }
  addLog(s, `${me.name}が${castles.map((c) => c.name).join('・')}ごと${clanName(s, from)}家から${clanName(s, clan)}家へ寝返った。`, 'castle', true);
  return `${castles.map((c) => c.name).join('・')}ごと${clanName(s, from)}家を離れ、${clanName(s, clan)}家に寝返った。${clanName(s, clan)}家の領主として、領を治める（主君の覚え${NE.NEW_FAVOR}から${bonus ? `・領の蔵に${bonus}貫` : ''}）。`;
}
// 持ちかける
export function offerDefect(s: GameState, clan: string): { ok: boolean; text: string } {
  const H = X(s);
  if (!ryoshuOf(s) || !defectCands(s).includes(clan)) return { ok: false, text: '寝返りを持ちかけられる家ではない' };
  if (H.neTried?.[clan] === s.turn) return { ok: false, text: '今月はもう持ちかけた' };
  (H.neTried ??= {})[clan] = s.turn;
  const p = defectChance(s, clan);
  if (rand(s) < p) return { ok: true, text: defect(s, clan) };
  if (rand(s) < NE.LEAK) { H.favor = Math.max(0, H.favor - NE.LEAK_FAVOR); addUtagai(s, 20); addLog(s, `${s.generals[H.id].name}が${clanName(s, clan)}家と通じているとの噂が立った。`, 'info', true); return { ok: true, text: `${clanName(s, clan)}家は応じず、話が主君の耳に入った（覚え−${NE.LEAK_FAVOR}）。` }; }
  return { ok: true, text: `${clanName(s, clan)}家は応じなかった（見込み${Math.round(p * 100)}%）。` };
}
// 誘いが来る（月の終わり）
export function defectOfferMonth(s: GameState): string[] {
  const H = X(s); if (!H || !ryoshuOf(s) || H.out) return [];
  H.neOffer = undefined;
  const p = H.favor < 40 ? NE.OFFER_P_LOW : NE.OFFER_P;
  const cands = defectCands(s).filter((c) => clanPower(s, c) >= clanPower(s, s.player) * 0.6);
  if (!cands.length || rand(s) >= p) return [];
  const clan = cands[Math.floor(rand(s) * cands.length)];
  H.neOffer = { clan, turn: s.turn }; pushKumi(s, { k: 'mitsushi', clan }); // 密使の場面（その場で返事・主君に知らせる）
  return [`${clanName(s, clan)}家から密かに使者が来た。領ごと寝返れば、本領を安堵し、領の蔵に${NE.OFFER_GOLD}貫を贈るという（「主家」の欄で返事をする。今月のうちに）。`];
}
export const offerOf = (s: GameState) => { const o = X(s)?.neOffer; return o && o.turn === s.turn && s.clans[o.clan]?.alive ? o.clan : null; };
export function answerOffer(s: GameState, yes: boolean): { ok: boolean; text: string } {
  const H = X(s), clan = offerOf(s);
  H.neOffer = undefined;
  if (!clan) return { ok: false, text: '誘いの使者は、もう去った' };
  if (!yes) { H.favor = Math.min(100, H.favor + 2); return { ok: true, text: `${clanName(s, clan)}家の誘いを断り、使者を追い返した（主君の覚え+2）。` }; }
  return { ok: true, text: defect(s, clan, NE.OFFER_GOLD) };
}

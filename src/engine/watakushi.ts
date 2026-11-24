// 私事（第五段）: 月に2度まで、政のほかに人と交わる。領主（武将で遊ぶの主人公）と大名（当主）の両方に。
// 領主: 武将の画面の屋敷と同じこと（訪ねる・進物・師事・縁組・召し抱え・内々の誘い）を、領の城と主君の居城にいる者に。茶会、他家の当主との密約も。旬は使わない（体力は使う）
// 大名: 当主が家臣を訪ねる（恩+）・進物（金100貫で恩+10）・茶会（居城にいる家臣みなの恩+5、3か月に一度）・縁組（宿老・家老に一門の娘を嫁がせる。恩+25、年に一度）・他家の当主へ書状（親密度+）
import * as H from './hero';
import { ryoshuOf } from './ryoshu';
import { onOf, vassalsOf } from './on';
import { amityOf, bumpAmity, addLog, clanName, hostile, rand } from './state';
import * as SK from './skill';
import * as KS from './kashin';
import * as FA from './family';
import * as PL from './plot';
import * as MB from './meibutsu';
import { defectCands } from './ryoplot';
import type { Clan, GameState, General } from './types';

export const WK = { PER_MONTH: 2, VISIT_ON: 4, VISIT_AGAIN: 3, GIFT_GOLD: 100, GIFT_ON: 10, TEA_GOLD: 300, TEA_ON: 5, TEA_EVERY: 3, WED_ON: 25, WED_EVERY: 12, WED_RANK: 1, LETTER: 4, LETTER_EVERY: 3 };
type Cnt = { turn: number; n: number };
type HX = { watakushi?: Cnt };
type CX = Clan & { watakushi?: Cnt; wkVisit?: Record<string, number>; wkTea?: number; wkWed?: number; wkLetter?: Record<string, number> };
type GX = General & { en?: string };

const left0 = (c: Cnt | undefined, s: GameState) => WK.PER_MONTH - (c && c.turn === s.turn ? c.n : 0);
const use = (o: { watakushi?: Cnt }, s: GameState) => { const c = o.watakushi; o.watakushi = c && c.turn === s.turn ? { turn: s.turn, n: c.n + 1 } : { turn: s.turn, n: 1 }; };
const isRyo = (s: GameState) => !!s.hero && !!ryoshuOf(s) && !s.hero.out;
export const leftOf = (s: GameState) => (isRyo(s) ? left0((s.hero as HX).watakushi, s) : left0((s.clans[s.player] as CX).watakushi, s));
const DONE = '今月の私事はもう済ませた（月に2度まで）';

// ───────── 領主 ─────────
const ACTIVE = ['free', 'army', 'camp', 'governor', 'bugyo', 'tsukai', 'hero', 'kashin'];
// 会える者: 領の城と主君の居城にいる家中の者・領の城下の浪人、それに懇意（親しさ50）以上の家中の者はどこにいても（書状で）
export function ryoPeople(s: GameState): General[] {
  const Hh = s.hero!, me = s.generals[Hh.id], f = ryoshuOf(s); if (!f || !me.clan) return [];
  const L = s.clans[me.clan].leader, locs = new Set([...f.castles, ...(L ? [s.generals[L].loc] : [])]);
  return Object.values(s.generals).filter((g) => g.id !== me.id && g.status !== 'dead' && (g.status === 'ronin' ? f.castles.includes(g.loc) : g.clan === me.clan && ACTIVE.includes(g.status) && (locs.has(g.loc) || (Hh.rel[g.id] ?? 0) >= 50)))
    .sort((a, b) => (a.status === 'ronin' ? 1 : 0) - (b.status === 'ronin' ? 1 : 0) || (Hh.rel[b.id] ?? 0) - (Hh.rel[a.id] ?? 0) || a.rank - b.rank);
}
// 武将の画面の行いを、相手のいる城下にいるものとして（旬は使わない）
function asIn(s: GameState, town: number | null, fn: () => H.Act): H.Act {
  const Hh = s.hero! as NonNullable<GameState['hero']> & HX;
  if (left0(Hh.watakushi, s) <= 0) return { ok: false, text: DONE };
  if (SK.isSick(s)) return { ok: false, text: '病に伏していて、私事どころではない' };
  const t0 = Hh.town, j0 = Hh.jun, f0 = Hh.field;
  if (town !== null) { Hh.town = town; Hh.field = false; }
  let r: H.Act;
  try { r = fn(); } finally { Hh.town = t0; Hh.jun = j0; Hh.field = f0; }
  if (r.ok) { use(Hh, s); H.note(s, r.text); }
  return r;
}
export type RyoAct = 'visit' | 'gift' | 'mstudy' | 'wed' | 'kakae' | 'pact';
export function ryoAct(s: GameState, kind: RyoAct, gid: string): H.Act {
  const g = s.generals[gid]; if (!g) return { ok: false, text: '相手がいない' };
  if (!ryoPeople(s).includes(g)) return { ok: false, text: 'いまは会えない' };
  if (kind === 'visit') return asIn(s, g.loc, () => H.visit(s, gid));
  if (kind === 'gift') return asIn(s, g.loc, () => H.giveGift(s, gid));
  if (kind === 'mstudy') { const k = SK.masterSkill(g); if (!k) return { ok: false, text: '名人ではない' }; return asIn(s, g.loc, () => SK.study(s, k, () => rand(s), g, MB.owned(s).some((m) => m.kind === '茶器'))); }
  if (kind === 'wed') return asIn(s, g.loc, () => FA.proposeWed(s, gid));
  if (kind === 'kakae') return asIn(s, g.loc, () => KS.recruit(s, gid));
  return asIn(s, g.loc, () => PL.invitePact(s, gid));
}
// その人にできること（ボタンの名と、できない時の理由）
export function ryoActs(s: GameState, g: General): { kind: RyoAct; label: string; why: string | null }[] {
  const Hh = s.hero!, v = Hh.rel[g.id] ?? 0, me = s.generals[Hh.id], out: { kind: RyoAct; label: string; why: string | null }[] = [];
  const asTown = <T>(fn: () => T): T => { const t0 = Hh.town, f0 = Hh.field; Hh.town = g.loc; Hh.field = false; try { return fn(); } finally { Hh.town = t0; Hh.field = f0; } };
  out.push({ kind: 'visit', label: '訪ねる', why: null });
  out.push({ kind: 'gift', label: `進物${Hh.goods > 0 ? '' : `（${H.HERO.GIFT_COST}貫）`}`, why: Hh.goods < 1 && Hh.gold < H.HERO.GIFT_COST ? `進物がなく、金も${H.HERO.GIFT_COST}貫に足りない` : null });
  const k = g.status !== 'young' ? SK.masterSkill(g) : null;
  if (k) out.push({ kind: 'mstudy', label: `師事を願う（${SK.SKILL_NAME[k]}・${SK.masterCap(g)}段まで）`, why: asTown(() => SK.skillBlock(s, k, g)) });
  if (g.status === 'ronin') { if (asTown(() => KS.canRecruit(s, g))) out.push({ kind: 'kakae', label: '家臣に召し抱える', why: v < KS.KASHIN.REL ? `「親しさ」${KS.KASHIN.REL}から` : KS.retainersOf(s).length >= KS.capOf(s) ? '家臣の枠がいっぱい' : null }); return out; }
  if (!Hh.wife && Hh.ie && g.clan === me.clan && g.rank <= FA.FAM.WED_RANK) out.push({ kind: 'wed', label: '縁組を申し込む', why: FA.wedBlock(s, g) });
  const L = me.clan ? s.clans[me.clan].leader : null;
  if (g.clan === me.clan && g.id !== L && !(Hh.retainers ?? []).includes(g.id)) { const w = PL.pactBlock(s, g); out.push({ kind: 'pact', label: w === '約束を取りつけてある' ? '謀反の味方（約束済み）' : '内々に誘う（謀反の味方に）', why: w }); }
  return out;
}
// 茶会: 居城（府中）で、領の城と主君の居城にいる家中の者を招く
export function ryoChakai(s: GameState): H.Act {
  const f = ryoshuOf(s)!, me = s.generals[s.hero!.id];
  const gs = ryoPeople(s).filter((g) => g.clan === me.clan && f.castles.includes(g.loc)).map((g) => g.id);
  return asIn(s, s.hero!.town, () => MB.chakai(s, gs));
}
export const ryoChakaiBlock = (s: GameState) => (MB.owned(s).some((m) => m.kind === '茶器') ? MB.chakaiBlock(s) : '茶器の名物が要る');
// 密約: 寝返りの候補（近くの主家の敵）の当主と。使いを送る
export const secretCands = (s: GameState) => defectCands(s).filter((c) => s.clans[c].leader);
export function ryoSecret(s: GameState, clan: string): H.Act {
  if (!secretCands(s).includes(clan)) return { ok: false, text: '密約を持ちかけられる家ではない' };
  return asIn(s, s.generals[s.clans[clan].leader!].loc, () => PL.offerSecret(s));
}

// ───────── 大名（当主） ─────────
const pick = (s: GameState, xs: string[]) => xs[Math.floor(rand(s) * xs.length)];
const leader = (s: GameState) => { const L = s.clans[s.player].leader; return L ? s.generals[L] : null; };
const bumpOn = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };
function dGo(s: GameState, fn: (C: CX, L: General) => H.Act): H.Act {
  const C = s.clans[s.player] as CX, L = leader(s);
  if (!L) return { ok: false, text: '当主がいない' };
  if (left0(C.watakushi, s) <= 0) return { ok: false, text: DONE };
  if (L.sick) return { ok: false, text: '当主が病に伏している' };
  const r = fn(C, L);
  if (r.ok) { use(C, s); addLog(s, r.text, 'info', true); }
  return r;
}
export const dPeople = (s: GameState) => vassalsOf(s, s.player).sort((a, b) => onOf(a) - onOf(b) || a.rank - b.rank);
export function dVisit(s: GameState, gid: string): H.Act {
  return dGo(s, (C, L) => {
    const g = s.generals[gid]; if (!g || !dPeople(s).includes(g)) return { ok: false, text: '家中の者ではない' };
    const again = C.wkVisit?.[gid] !== undefined && s.turn - C.wkVisit[gid] < WK.VISIT_AGAIN;
    const v = Math.max(1, Math.round((WK.VISIT_ON + L.cha / 25 + rand(s) * 3) / (again ? 3 : 1)));
    bumpOn(g, v); (C.wkVisit ??= {})[gid] = s.turn;
    return { ok: true, who: gid, line: pick(s, ['殿おんみずから、もったいない。', 'これは、よくお越しくだされた。', 'ささ、まずは一献。']), text: `${L.name}が${g.name}の屋敷を訪ねた（恩+${v}${again ? '・続けて訪ねたので少し' : ''}）。` };
  });
}
export function dGift(s: GameState, gid: string): H.Act {
  return dGo(s, (C, L) => {
    const g = s.generals[gid]; if (!g || !dPeople(s).includes(g)) return { ok: false, text: '家中の者ではない' };
    if (C.gold < WK.GIFT_GOLD) return { ok: false, text: `金が足りない（${WK.GIFT_GOLD}貫）` };
    C.gold -= WK.GIFT_GOLD; bumpOn(g, WK.GIFT_ON);
    return { ok: true, who: gid, line: pick(s, ['ありがたく頂戴いたします。', '身に余るお心遣い。']), text: `${L.name}が${g.name}に進物を贈った（金${WK.GIFT_GOLD}貫・恩+${WK.GIFT_ON}）。` };
  });
}
export const dChakaiBlock = (s: GameState) => { const C = s.clans[s.player] as CX; return C.wkTea !== undefined && s.turn - C.wkTea < WK.TEA_EVERY ? `茶会は${WK.TEA_EVERY}か月に一度` : C.gold < WK.TEA_GOLD ? `金が足りない（${WK.TEA_GOLD}貫）` : !dGuests(s).length ? '居城に家臣がいない' : null; };
const dGuests = (s: GameState) => { const L = leader(s); return L ? dPeople(s).filter((g) => g.loc === L.loc) : []; };
export function dChakai(s: GameState): H.Act {
  return dGo(s, (C, L) => {
    const why = dChakaiBlock(s); if (why) return { ok: false, text: why };
    const gs = dGuests(s); C.gold -= WK.TEA_GOLD; C.wkTea = s.turn; for (const g of gs) bumpOn(g, WK.TEA_ON);
    return { ok: true, text: `${L.name}が${s.castles[L.loc].name}で茶会を開いた（${gs.slice(0, 4).map((g) => g.name).join('・')}${gs.length > 4 ? `ほか${gs.length - 4}人` : ''}・恩+${WK.TEA_ON}・金${WK.TEA_GOLD}貫）。` };
  });
}
export const dWedBlock = (s: GameState, g: General) => { const C = s.clans[s.player] as CX; return (g as GX).en === s.player ? 'もう縁者' : g.kin ? '一門の者' : g.rank > WK.WED_RANK ? '宿老・家老に' : C.wkWed !== undefined && s.turn - C.wkWed < WK.WED_EVERY ? `縁組は年に一度（あと${C.wkWed + WK.WED_EVERY - s.turn}か月）` : null; };
export function dWed(s: GameState, gid: string): H.Act {
  return dGo(s, (C, L) => {
    const g = s.generals[gid] as GX; if (!g || !dPeople(s).includes(g)) return { ok: false, text: '家中の者ではない' };
    const why = dWedBlock(s, g); if (why) return { ok: false, text: why };
    C.wkWed = s.turn; g.en = s.player; bumpOn(g, WK.WED_ON);
    return { ok: true, who: g.id, line: 'この上は、家の命運をともにいたしまする。', text: `${L.name}が一門の娘を${g.name}に嫁がせた（縁者に・恩+${WK.WED_ON}）。` };
  });
}
export const letterCands = (s: GameState) => Object.values(s.clans).filter((c) => c.alive && c.id !== s.player && c.leader && !c.id.startsWith('ikki')).sort((a, b) => amityOf(s, s.player, b.id) - amityOf(s, s.player, a.id)).map((c) => c.id);
export const dLetterBlock = (s: GameState, clan: string) => { const C = s.clans[s.player] as CX, t = C.wkLetter?.[clan]; return t !== undefined && s.turn - t < WK.LETTER_EVERY ? `${WK.LETTER_EVERY}か月に一度` : amityOf(s, s.player, clan) >= 100 ? '親密度はもう満ちている' : null; };
export function dLetter(s: GameState, clan: string): H.Act {
  return dGo(s, (C, L) => {
    if (!s.clans[clan]?.alive) return { ok: false, text: '相手がいない' };
    const why = dLetterBlock(s, clan); if (why) return { ok: false, text: why };
    const v = Math.max(1, Math.round((WK.LETTER + L.cha / 30) * (hostile(s, s.player, clan) && s.clans[clan].target === s.player ? 0.5 : 1)));
    bumpAmity(s, s.player, clan, v); (C.wkLetter ??= {})[clan] = s.turn;
    return { ok: true, text: `${L.name}が${clanName(s, clan)}家の当主に書状を送った（親密度+${v}）。` };
  });
}

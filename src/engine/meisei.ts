// 武将で遊ぶ（物語の外）: 浪人が名を売る。名声は一本のまま、どの系統で名を上げたかを数えて「札」（評判の中身）を付ける。名を上げた土地も覚える（誘いは近くの家から来る）
// 名を売る手段: 武（道場破り）・戦（陣借り）・軍略（陣借りの軍議で献策）・普請（国衆の城の普請を請け負う）・治安（用心棒・野盗退治）・文（連歌会）・諜報（他家の城の報せを売る）
// 何もしなければ名声は忘れられていく（浪人の間、二か月名を上げなければ毎月−1）
import { addFame, followersOf, isRonin, noteSeen, renown, RONIN, type Kei } from './roninplay';
import { newBan, type Ban, type BanSetup, type BKind, type Who } from './ban';
import { hexDist } from './map';
import { hpMax, hpOf, lv, spendHp } from './skill';
import * as R from './rules';
import { addLog, castleKoku, clanName, learnCastle, rand } from './state';
import type { GameState, General } from './types';

export type { Kei };
export { renown, noteSeen };
export const KEI_NAME: Record<Kei, string> = { bu: '武', sen: '戦', gun: '軍略', fu: '普請', chi: '治安', bun: '文', cho: '諜報' };
export const FUDA: Record<Kei, string> = { bu: '槍の名手', sen: '戦上手', gun: '軍略家', fu: '築城の達者', chi: '野盗狩り', bun: '風流人', cho: '目利きの忍び' };
export const MEI = { FUDA_AT: 8, FUDA_MAX: 2, FORGET_AFTER: 2, SPOT_KEEP: 36, DOJO_GOLD: 100, DOJO_FAME: 4, DOJO_HP: 15, NOZOKU_GOLD: 120, NOZOKU_FAME: 3, FUSHIN_GOLD: 150, FUSHIN_FAME: 2, RENGA_COST: 50, RENGA_FAME: 2, RENGA_REL: 4, INFO_GOLD: 150, INFO_FAME: 2, INFO_REL: 5, KENSAKU_FAME: 3, KENSAKU_REL: 6 };
type MX = { renown?: Partial<Record<Kei, number>>; fameAt?: Record<number, { n: number; t: number }>; fameTurn?: number; dojoWon?: Record<number, number>; nozoku?: Record<number, number>; fuUke?: Record<number, number>; renga?: number; infoSold?: Record<string, number>; kensaku?: number; seen?: Record<number, number> };
const X = (s: GameState) => s.hero! as NonNullable<GameState['hero']> & MX;
const used = (s: GameState) => { s.hero!.jun++; };
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const me = (s: GameState) => s.generals[s.hero!.id];
const town = (s: GameState) => s.castles[s.hero!.town];
export type Act = { ok: boolean; text: string; who?: string; line?: string };

// 札: 名を上げた系統のうち、8以上のものを多い順に二つまで
export function fudaOf(s: GameState): { kei: Kei; name: string; n: number }[] {
  const r = X(s).renown ?? {};
  return (Object.entries(r) as [Kei, number][]).filter(([, n]) => n >= MEI.FUDA_AT).sort((a, b) => b[1] - a[1]).slice(0, MEI.FUDA_MAX).map(([kei, n]) => ({ kei, name: FUDA[kei], n }));
}
// 名の聞こえた土地（三年のうちに名を上げた城下）
export const fameSpots = (s: GameState) => Object.entries(X(s).fameAt ?? {}).filter(([, v]) => s.turn - v.t <= MEI.SPOT_KEEP).map(([k, v]) => ({ castle: +k, n: v.n }));
// 毎月（浪人の間）: 二か月名を上げなければ、名声は毎月−1
export function meiseiMonth(s: GameState): string[] {
  if (!s.hero || !isRonin(s)) return [];
  const H = X(s);
  if ((H.fame ?? 0) > 0 && s.turn - (H.fameTurn ?? s.turn) >= MEI.FORGET_AFTER) { addFame(s, -1); return ['しばらく名を上げていない。世間は浪人の名を忘れはじめている（名声−1）。']; }
  return [];
}

// ───────── 武: 道場破り（大きな城下の道場の師範と一騎討ち。城下ごとに年に一度） ─────────
export function dojoFoe(s: GameState): Who {
  const c = town(s), k = castleKoku(c);
  return { name: `${c.name.replace(/城$/, '')}の道場の師範`, bra: Math.round(Math.min(88, 56 + k * 1.2)), int: 50, lea: 55, sho: true };
}
export const dojoBlock = (s: GameState) => { const t = X(s).dojoWon?.[s.hero!.town]; return t !== undefined && s.turn - t < 12 ? 'この道場はもう破った（一年は看板が戻らない）' : null; };
export function dojoBan(s: GameState): Ban {
  const H = s.hero!, g = me(s);
  const b = newBan({ me: [{ kind: 'kiba', who: { name: g.name, bra: g.bra, int: g.int, lea: g.lea, gid: g.id, hero: true, yari: lv(s, 'yari'), hpRate: 1 } }], foe: [{ kind: 'kiba', who: dojoFoe(s) }], seed: Math.floor(rand(s) * 1e9) });
  b.terr = b.terr.map(() => '.'); const [h, f] = b.pieces; h.x = 3; h.y = 5; f.x = 3; f.y = 4;
  void H; return b;
}
export function applyDojo(s: GameState, won: boolean): Act {
  used(s);
  const H = X(s), c = town(s);
  if (won) { (H.dojoWon ??= {})[H.town] = s.turn; s.hero!.gold += MEI.DOJO_GOLD; renown(s, 'bu', MEI.DOJO_FAME); return { ok: true, text: `${c.name}の道場の師範を打ち負かし、看板を預かった（金${MEI.DOJO_GOLD}貫・名声+${MEI.DOJO_FAME}・武）。` }; }
  addFame(s, -1); spendHp(s, MEI.DOJO_HP);
  return { ok: true, text: `${c.name}の道場の師範に敗れた（名声−1・体力−${MEI.DOJO_HP}）。` };
}

// ───────── 治安: 野盗退治（治安の悪い城下の村から頼まれる。槍働きの盤で、配下と牢人衆を連れて。城下ごとに月に一度） ─────────
export const nozokuHere = (s: GameState) => { const c = town(s); return isRonin(s) && !s.hero!.field && c.chian < 55; };
export const nozokuBlock = (s: GameState) => (X(s).nozoku?.[s.hero!.town] === s.turn ? '今月はこの村の野盗はもう退治した' : null);
// 浪人の駒: 主人公（騎馬）・配下（型で駒）・牢人衆（50人ごとにモブ一つ、三つまで）
export function roninPieces(s: GameState): BanSetup['me'] {
  const H = s.hero!, g = me(s);
  const out: BanSetup['me'] = [{ kind: 'kiba', who: { name: g.name, bra: g.bra, int: g.int, lea: g.lea, gid: g.id, hero: true, yari: lv(s, 'yari'), hpRate: Math.max(0.2, hpOf(s) / hpMax(s)) } }];
  for (const f of followersOf(s).filter((x) => !x.sick).slice(0, 4)) out.push({ kind: f.bra - f.int >= 10 ? 'ashi' : f.int - f.bra >= 10 ? 'yumi' : 'teppo', who: { name: f.name, bra: f.bra, int: f.int, lea: f.lea, gid: f.id } });
  const mobs = Math.min(3, Math.floor((H.ie?.shu ?? 0) / 50));
  for (let i = 0; i < mobs; i++) out.push({ kind: (['ashi', 'yumi', 'ashi'] as BKind[])[i], who: null });
  return out;
}
export function nozokuBan(s: GameState): Ban {
  const mine = roninPieces(s), n = Math.max(2, Math.min(5, mine.length + 1));
  const foe = (['ashi', 'ashi', 'yumi', 'ashi', 'kiba'] as BKind[]).slice(0, n).map((kind) => ({ kind, who: null }));
  const b = newBan({ me: mine, foe, seed: Math.floor(rand(s) * 1e9), maxTurn: 6, goal: 'rout', goalLabel: '野盗退治（野盗を討ち払う）' });
  for (const p of b.pieces) if (p.side === 'foe') p.name = `野盗の${p.name.replace(/^敵の/, '')}`;
  return b;
}
export function applyNozoku(s: GameState, b: Ban): Act {
  used(s);
  const H = X(s), c = town(s);
  (H.nozoku ??= {})[H.town] = s.turn;
  const hp = b.pieces.find((p) => p.hero);
  if (hp && hp.hp < hp.maxhp) spendHp(s, Math.round((1 - Math.max(0, hp.hp) / hp.maxhp) * 30));
  if (b.over === 'win') { s.hero!.gold += MEI.NOZOKU_GOLD; c.chian = clamp(c.chian + 5); renown(s, 'chi', MEI.NOZOKU_FAME); return { ok: true, text: `${c.name}の村を荒らす野盗を討ち払った（討ち取り${b.kills}・礼金${MEI.NOZOKU_GOLD}貫・名声+${MEI.NOZOKU_FAME}・治安）。村の治安が上がった。` }; }
  return { ok: true, text: `野盗を討ち払えなかった（討ち取り${b.kills}）。村人は落胆している。` };
}

// ───────── 普請: 国衆の城の普請を請け負う（築城一段から。城ごとに三か月に一度） ─────────
export const fushinHere = (s: GameState) => { const c = town(s); return isRonin(s) && !s.hero!.field && !c.owner; };
export const fushinBlock = (s: GameState) => { if (lv(s, 'chikujo') < 1) return '築城一段から（大きな城下の道場で独学できる）'; const t = X(s).fuUke?.[s.hero!.town]; return t !== undefined && s.turn - t < 3 ? 'この城の普請は請け負ったばかり' : null; };
export function fushinUke(s: GameState): Act {
  const why = fushinBlock(s); if (why) return { ok: false, text: why };
  used(s);
  const H = X(s), c = town(s), k = lv(s, 'chikujo');
  (H.fuUke ??= {})[H.town] = s.turn;
  const gold = MEI.FUSHIN_GOLD + k * 50; s.hero!.gold += gold;
  c.chian = clamp(c.chian + 2); renown(s, 'fu', MEI.FUSHIN_FAME + k);
  return { ok: true, text: `国衆の${c.name}の石垣と堀の普請を請け負い、差配した（金${gold}貫・名声+${MEI.FUSHIN_FAME + k}・普請）。` };
}

// ───────── 文: 連歌会（大きな城下で。魅力・茶道・弁舌が効く。月に一度・50貫） ─────────
export const rengaHere = (s: GameState) => { const c = town(s); return isRonin(s) && !s.hero!.field && castleKoku(c) >= 12; };
export const rengaBlock = (s: GameState) => (X(s).renga === s.turn ? '今月はもう連歌会に出た' : s.hero!.gold < MEI.RENGA_COST ? `金が足りない（${MEI.RENGA_COST}貫）` : null);
export function renga(s: GameState, guests: General[]): Act {
  const why = rengaBlock(s); if (why) return { ok: false, text: why };
  used(s);
  const H = X(s), g = me(s);
  H.renga = s.turn; s.hero!.gold -= MEI.RENGA_COST;
  const p = clamp(0.3 + g.cha / 200 + lv(s, 'sado') * 0.08 + lv(s, 'bensetsu') * 0.05, 0.1, 0.95);
  if (rand(s) < p) {
    const gs = guests.slice(0, 2);
    for (const x of gs) s.hero!.rel[x.id] = clamp((s.hero!.rel[x.id] ?? 0) + MEI.RENGA_REL);
    renown(s, 'bun', MEI.RENGA_FAME);
    return { ok: true, text: `連歌会で付けた句が座を沸かせた（名声+${MEI.RENGA_FAME}・文${gs.length ? `。${gs.map((x) => x.name).join('・')}と親しくなった` : ''}）。` };
  }
  return { ok: true, text: `連歌会に出たが、句は振るわなかった（見込み${Math.round(p * 100)}%）。` };
}

// ───────── 諜報: 他家の城の報せを売る（大名の城下で、その家の敵の城のうち探ったことのある城の報せを。忍術一段か知略70から。家ごとに月に一度） ─────────
export function infoCands(s: GameState): number[] {
  const H = X(s), c = town(s), lord = c.owner && s.clans[c.owner]?.leader && s.generals[s.clans[c.owner].leader!]?.loc === c.i ? c.owner : null;
  if (!lord || !isRonin(s)) return [];
  return Object.entries(H.seen ?? {}).filter(([k, t]) => s.turn - t <= 6 && s.castles[+k].owner && s.castles[+k].owner !== lord && hexDist(s.castles[+k].hex, c.hex) <= R.hx(12)).map(([k]) => +k);
}
export const infoBlock = (s: GameState) => { const c = town(s); if (lv(s, 'ninjutsu') < 1 && me(s).int < 70) return '忍術一段か知略70から'; if (!infoCands(s).length) return 'この家に売れる報せがない（半年のうちに、この家の敵の城を探っておく）'; return X(s).infoSold?.[c.owner!] === s.turn ? '今月はもうこの家に売った' : null; };
export function sellInfo(s: GameState): Act {
  const why = infoBlock(s); if (why) return { ok: false, text: why };
  used(s);
  const H = X(s), c = town(s), clan = c.owner!, L = s.clans[clan].leader!, k = infoCands(s)[0], tc = s.castles[k];
  (H.infoSold ??= {})[clan] = s.turn; learnCastle(s, k, clan);
  s.hero!.gold += MEI.INFO_GOLD; s.hero!.rel[L] = clamp((s.hero!.rel[L] ?? 0) + MEI.INFO_REL); renown(s, 'cho', MEI.INFO_FAME);
  return { ok: true, who: L, line: 'ほう、よう調べたな。……使える男よ。', text: `${clanName(s, clan)}家に${tc.name}の兵と守りの報せを売った（金${MEI.INFO_GOLD}貫・当主との親しさ+${MEI.INFO_REL}・名声+${MEI.INFO_FAME}・諜報）。` };
}

// ───────── 軍略: 陣借りの軍議で献策する（知略が効く。陣借りの間に月に一度） ─────────
export const kensakuBlock = (s: GameState) => (!s.hero!.merc ? '陣借りしている時だけ' : X(s).kensaku === s.turn ? '今月はもう献策した' : null);
export function gunKensaku(s: GameState): Act {
  const why = kensakuBlock(s); if (why) return { ok: false, text: why };
  used(s);
  const H = X(s), a = s.armies[s.hero!.merc!.army], main = a ? s.generals[a.main] : null, g = me(s);
  H.kensaku = s.turn;
  const p = clamp(0.2 + (g.int - (main?.int ?? 60)) / 100 + g.int / 250, 0.1, 0.9);
  if (rand(s) < p) {
    if (main) s.hero!.rel[main.id] = clamp((s.hero!.rel[main.id] ?? 0) + MEI.KENSAKU_REL);
    if (a) a.morale = Math.min(1.3, (a.morale ?? 1) + 0.05);
    renown(s, 'gun', MEI.KENSAKU_FAME);
    if (main) addLog(s, `陣借りの浪人・${g.name}の献策が${main.name}の軍議で用いられた。`, 'info', true);
    return { ok: true, who: main?.id, line: '浪人にしておくには惜しい策よ。用いよう。', text: `軍議で献策し、用いられた（名声+${MEI.KENSAKU_FAME}・軍略${main ? `・${main.name}との親しさ+${MEI.KENSAKU_REL}` : ''}）。` };
  }
  return { ok: true, who: main?.id, line: '浪人の策など聞かぬ。', text: `軍議で献策したが、退けられた（見込み${Math.round(p * 100)}%）。` };
}
export { RONIN };

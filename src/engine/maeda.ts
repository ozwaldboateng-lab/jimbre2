// 前田利家 ― 残り火 第二部: 「前田家」の切り盛り（荒子衆・蔵・家中・村の疲れ）と、府中の城主としての治め、物語の場面の中の選択の効き目
import { NODES, ADVICE, KANEGASAKI_END, ANEGAWA_END } from '../data/story_toshiie2';
import type { Eff } from '../data/story_toshiie2';
import type { Beat } from '../data/story_toshiie';
import { addMerit } from './ranks';
import { castleKoku, garrisonMax, rand } from './state';
import type { Castle, GameState } from './types';
import type { Act } from './hero';

export interface Ie { shu: number; kura: number; kachu: number; mura: number; adv?: number; seen?: string[] }
// 家督のときの前田家（荒子衆300・蔵600石・家中55・村の疲れ20）。毎月: 蔵に村の上がり（疲れで減る）、村の疲れは少しずつ癒え、荒子衆は家中と蔵に応じて戻る
export const IE = { SHU0: 300, KURA0: 600, KACHU0: 55, MURA0: 20, AGARI: 60, SHU_CAP: 250, KURA_CAP: 1500 };
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const newIe = (): Ie => ({ shu: IE.SHU0, kura: IE.KURA0, kachu: IE.KACHU0, mura: IE.MURA0 });

export function ieMonth(s: GameState): string[] {
  const H = s.hero;
  if (!H?.ie) return [];
  const ie = H.ie, out: string[] = [];
  const agari = Math.round(IE.AGARI * (1 - ie.mura / 150));
  ie.kura = Math.min(IE.KURA_CAP, ie.kura + agari);
  ie.mura = clamp(ie.mura - 2);
  const cap = IE.SHU_CAP + ie.kachu * 2;
  if (ie.kura <= 0) { ie.kachu = clamp(ie.kachu - 3); ie.shu = Math.max(50, ie.shu - 20); out.push('前田の蔵が尽きた。家中が細る。'); }
  else if (ie.shu < cap) ie.shu = Math.min(cap, ie.shu + Math.round(5 + ie.kachu / 10));
  else if (ie.shu > cap) ie.shu = Math.max(cap, ie.shu - 15); // 養える数を超えた分は少しずつ村へ戻る
  ie.kachu = clamp(ie.kachu + (ie.kachu > 70 ? -1 : ie.kachu < 50 ? 1 : 0)); // 家中は放っておけば並に戻る（高いほど保つのが難しい）
  ie.kura = Math.max(0, ie.kura);
  out.push(`前田家: 村の上がり${agari}石（蔵 ${ie.kura}石）。荒子衆${ie.shu}・家中${ie.kachu}・村の疲れ${ie.mura}。`);
  return out;
}

// 選択の効き目を、家・府中の城・主君の覚え・縁・戦の点に効かせる
export function applyEff(s: GameState, e: Eff | undefined, tag?: string): string[] {
  const H = s.hero!, me = s.generals[H.id], out: string[] = [];
  if (!e) return out;
  const ie = H.ie;
  if (ie) {
    if (e.shu) ie.shu = Math.max(0, ie.shu + e.shu);
    if (e.kura) ie.kura = Math.max(0, ie.kura + e.kura);
    if (e.kachu) ie.kachu = clamp(ie.kachu + e.kachu);
    if (e.mura) ie.mura = clamp(ie.mura + e.mura);
  }
  const c = fuchuOf(s);
  if (c) {
    if (e.chian) c.chian = clamp(c.chian + e.chian);
    if (e.ember) c.ember = clamp((c.ember ?? 0) + e.ember);
    if (e.dev) { c.dev = Math.max(0.2, c.dev * (1 + e.dev)); c.cdev = Math.max(0.2, c.cdev * (1 + e.dev)); }
  }
  if (e.favor) H.favor = clamp(H.favor + e.favor);
  if (e.merit) addMerit(s, me.id, e.merit);
  if (e.gold) H.gold = Math.max(0, H.gold + e.gold);
  for (const [id, v] of Object.entries(e.rel ?? {})) H.rel[id] = clamp((H.rel[id] ?? 0) + v);
  const sv = (H.sv ??= {});
  if (e.pt && tag) sv[tag] = (sv[tag] ?? 0) + e.pt;
  if (e.road) sv['road_' + e.road] = (sv['road_' + e.road] ?? 0) + 1;
  const parts: string[] = [];
  if (e.kura) parts.push(`蔵${e.kura > 0 ? '+' : ''}${e.kura}`);
  if (e.shu) parts.push(`荒子衆${e.shu > 0 ? '+' : ''}${e.shu}`);
  if (e.kachu) parts.push(`家中${e.kachu > 0 ? '+' : ''}${e.kachu}`);
  if (e.mura) parts.push(`村の疲れ${e.mura > 0 ? '+' : ''}${e.mura}`);
  if (e.chian && c) parts.push(`府中の治安${e.chian > 0 ? '+' : ''}${e.chian}`);
  if (e.ember && c) parts.push(`残り火${e.ember > 0 ? '+' : ''}${e.ember}`);
  if (e.favor) parts.push(`主君の覚え${e.favor > 0 ? '+' : ''}${e.favor}`);
  if (e.gold) parts.push(`金${e.gold > 0 ? '+' : ''}${e.gold}`);
  if (parts.length) out.push(parts.join('・'));
  return out;
}

// 場面の中の問いに答える: 答えの場面（と、続く問い）を返す
export function storyChoose(s: GameState, key: string, id: string): { beats: Beat[]; lines: string[] } {
  const n = NODES[key], ch = n?.choices.find((c) => c.id === id);
  if (!n || !ch) return { beats: [], lines: [] };
  const tag = key.startsWith('kg') ? 'kanegasaki' : key.startsWith('ag') ? 'anegawa' : undefined;
  const lines = applyEff(s, ch.eff, tag);
  const beats = [...ch.res];
  if (ch.next?.startsWith('@')) beats.push(...battleEnd(s, ch.next.slice(1)));
  else if (ch.next) beats.push({ text: NODES[ch.next].text, ask: ch.next, bg: ch.res[ch.res.length - 1]?.bg });
  return { beats, lines };
}
// 金ヶ崎・姉川の締め: 点（選んだ答え）と、家中・統率で決まる
function battleEnd(s: GameState, k: 'kanegasaki' | 'anegawa' | string): Beat[] {
  const H = s.hero!, me = s.generals[H.id], ie = H.ie!, sv = (H.sv ??= {});
  const pt = (sv[k] ?? 0) + (ie.kachu >= 60 ? 1 : 0) + (me.lea >= 75 ? 1 : 0);
  const good = pt >= (k === 'kanegasaki' ? 5 : 4);
  sv[k + '_ok'] = good ? 1 : 0;
  const end = k === 'kanegasaki' ? KANEGASAKI_END : ANEGAWA_END;
  if (k === 'kanegasaki') { if (good) { ie.kachu = clamp(ie.kachu + 6); addMerit(s, me.id, 15); H.favor = clamp(H.favor + 5); } else { ie.shu = Math.max(80, ie.shu - 80); ie.kachu = clamp(ie.kachu - 8); } }
  else { if (good) { ie.kachu = clamp(ie.kachu + 10); addMerit(s, me.id, 30); H.favor = clamp(H.favor + 8); H.gold += 200; } else { ie.shu = Math.max(80, ie.shu - 40); addMerit(s, me.id, 10); } }
  const sum: Beat = { bg: end.good[0].bg, text: k === 'kanegasaki'
    ? (good ? '（前田の列は崩れずに退き口を抜けた。家中+6・功績+15・主君の覚え+5）' : '（退き口は抜けたが、荒子衆を多く失った。荒子衆−80・家中−8）')
    : (good ? '（前田の列は崩れず、押し返す流れの中にいた。家中+10・功績+30・主君の覚え+8・金+200）' : '（前田の列は戦場に立ったが、名は残らなかった。荒子衆−40・功績+10）') };
  return [...(good ? end.good : end.bad), sum];
}

// ───────── 家中の進言（月に一度） ─────────
export const canAdvice = (s: GameState) => !!s.hero?.ie && (s.hero.storyDone ?? []).includes('kaze') && s.hero.ie.adv !== s.turn && !s.hero.army;
export function nextAdvice(s: GameState): { beats: Beat[]; head: string } | null {
  const H = s.hero!, ie = H.ie!;
  if (!canAdvice(s)) return null;
  const seen = (ie.seen ??= []);
  let pool = ADVICE.filter((a) => !seen.includes(a.id));
  if (!pool.length) { ie.seen = []; pool = ADVICE; }
  const a = pool[s.turn % pool.length];
  ie.seen!.push(a.id); ie.adv = s.turn; H.jun++;
  return { head: a.head, beats: [{ kind: 'door', head: a.head, text: a.head, sub: '家中の進言' }, ...a.beats] };
}

// ───────── 府中の城主 ─────────
export const FUCHU_ID = 'ichijodani', FUCHU_NAME = '越前府中城';
export const fuchuOf = (s: GameState): Castle | null => { const i = s.hero?.fuchu; return i === undefined ? null : s.castles[i]; };
export type GovAct = 'mimawari' | 'hidane' | 'hodokosu' | 'shimeru' | 'choubo';
export const GOV_NAME: Record<GovAct, [string, string]> = {
  mimawari: ['村を見回る', '治安+3・残り火−2（1旬）'],
  hidane: ['火元を探る', '知略しだいで残り火を減らす（1旬）'],
  hodokosu: ['村に施す', '前田の蔵60石。残り火−4・治安+1・村の開発を戻す（1旬）'],
  shimeru: ['締め上げる', '治安+8・残り火−5。村の開発が痩せる（成政の道）（1旬）'],
  choubo: ['城兵を集める', '金150貫で城兵+300（1旬）'],
};
export const canGovern = (s: GameState) => { const c = fuchuOf(s), H = s.hero; return !!c && !!H && !H.field && !H.army && H.town === c.i && c.owner === s.generals[H.id].clan; };
export function govern(s: GameState, k: GovAct): Act {
  const H = s.hero!, me = s.generals[H.id], c = fuchuOf(s)!;
  if (!canGovern(s)) return { ok: false, text: '府中の城下にいなければ治められない' };
  const sv = (H.sv ??= {});
  if (k === 'mimawari') { c.chian = clamp(c.chian + 3); c.ember = clamp((c.ember ?? 0) - 2); }
  else if (k === 'hidane') { const d = Math.round(3 + me.int / 15 + rand(s) * 3); c.ember = clamp((c.ember ?? 0) - d); }
  else if (k === 'hodokosu') { if (!H.ie || H.ie.kura < 60) return { ok: false, text: '前田の蔵が足りない（60石）' }; H.ie.kura -= 60; c.ember = clamp((c.ember ?? 0) - 4); c.chian = clamp(c.chian + 1); c.dev = Math.min(1, c.dev * 1.03); sv.road_son = (sv.road_son ?? 0) + 0.25; }
  else if (k === 'shimeru') { c.chian = clamp(c.chian + 8); c.ember = clamp((c.ember ?? 0) - 5); c.dev = Math.max(0.2, c.dev * 0.96); sv.road_hard = (sv.road_hard ?? 0) + 0.25; }
  else if (k === 'choubo') { if (H.gold < 150) return { ok: false, text: '金が足りない（150貫）' }; H.gold -= 150; c.garrison = Math.min(garrisonMax(c), c.garrison + 300); }
  H.jun++;
  const t = `${GOV_NAME[k][0]}。${c.name}: 治安${Math.round(c.chian)}・残り火${Math.round(c.ember ?? 0)}・城兵${c.garrison}。`;
  return { ok: true, text: t };
}
// 府中を持たせたか（第二部の締め）
export const FUCHU_OK = { CHIAN: 50, EMBER: 30 };
export const fuchuHeld = (s: GameState) => { const c = fuchuOf(s); return !!c && c.owner === 'oda' && c.chian >= FUCHU_OK.CHIAN && (c.ember ?? 0) <= FUCHU_OK.EMBER; };
export const fuchuText = (s: GameState) => { const c = fuchuOf(s); return c ? `${c.name}: 治安${Math.round(c.chian)}／${FUCHU_OK.CHIAN}以上・残り火${Math.round(c.ember ?? 0)}／${FUCHU_OK.EMBER}以下・城兵${c.garrison}・${Math.round(castleKoku(c))}万石` : ''; };

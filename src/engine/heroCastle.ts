// 融合の第二段: 武将で遊ぶで治める城を、大名プレイの城の画面と同じ数値・同じ政で治める（費えは主人公の金から）
// 開発・商業への投資・新田・普請・楽市楽座（国持ちから）は、本体の invest.ts / economy.ts をそのまま使う
import { enactRakuichi } from './economy';
import { FORT_NAME, fortCost, fortOf, investBlock, investCap, investCost, invest, shindenBlock, shindenCost, shindenDone, startFort, startShinden, fortBlock } from './invest';
import { castleCom, productsAt } from './money';
import { chianDelta } from './policy';
import * as R from './rules';
import { castleKoku, garrisonMax } from './state';
import { storeOf } from './supply';
import type { Act } from './hero';
import type { Castle, GameState } from './types';

export type CastleAct = 'inv-agri' | 'inv-com' | 'shinden' | 'fort' | 'rakuichi';
// 主人公の金で、家の金を借りる形で本体の政を行う（家の金は増えも減りもしない）
function withHeroGold(s: GameState, cost: number, f: () => boolean): boolean {
  const H = s.hero!, clan = s.generals[H.id].clan!;
  if (H.gold < cost) return false;
  const C = s.clans[clan], before = C.gold;
  C.gold = cost; // 本体の判定は家の金で見るので、この政の分だけを持たせる
  const ok = f();
  C.gold = before;
  if (ok) H.gold -= cost;
  return ok;
}
export interface CastleView { tiles: [string, string, string][]; pills: string[]; acts: { k: CastleAct; label: string; sub: string; block: string | null }[] }
export function castleView(s: GameState, c: Castle): CastleView {
  const H = s.hero!, me = s.generals[H.id], clan = me.clan!, C = s.clans[clan];
  const d = chianDelta(s, C, c, false, C.food <= 0);
  const sg = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
  const tiles: [string, string, string][] = [
    ['石高', `${(castleKoku(c)).toFixed(1)}万石`, ''], ['商業', `${Math.round(castleCom(c))}貫`, '月'], ['城兵', `${c.garrison}`, `/${garrisonMax(c)}`], ['城の蔵', `${Math.round(storeOf(c))}石`, ''],
    ['治安', `${Math.round(c.chian)}`, `月${sg(d.total)}`], ['治水', `${Math.round(c.chisui)}`, `収穫×${R.harvestMult(c.chisui).toFixed(2)}`], ['開発', `${Math.round(c.dev * 100)}%`, `上限${Math.round(investCap(c, 'agri') * 100)}%`], ['普請', FORT_NAME[fortOf(c)], ''],
  ];
  const pills: string[] = [];
  if (c.ember && c.ember >= 1) pills.push(`残り火 ${Math.round(c.ember)}`);
  if (c.shinden) pills.push(`新田工事中 あと${c.shinden.until - s.turn}か月`);
  if (c.fortBuild) pills.push(`${FORT_NAME[fortOf(c) + 1]}を普請中 あと${c.fortBuild.until - s.turn}か月`);
  if (c.rakuichi !== undefined) pills.push('楽市楽座');
  for (const [, n] of productsAt(c)) pills.push(`特産 ${n}`);
  const gold = (cost: number) => (H.gold < cost ? `金${cost.toLocaleString('ja-JP')}貫が要る（手元${H.gold}）` : null);
  const blk = (b: string | null) => (b && b.startsWith('金') ? null : b); // 金の不足は主人公の金で見る
  const kuni = (H.career?.steps ?? []).includes('kuni') || H.story === 'toshiie';
  const acts: CastleView['acts'] = [
    { k: 'inv-agri', label: `開発に投じる（${investCost(c, 'agri').toLocaleString('ja-JP')}貫）`, sub: `開発+${Math.round(R.INVEST_STEP * 100)}%（治安で決まる上限まで）`, block: blk(investBlock(s, clan, c, 'agri')) ?? gold(investCost(c, 'agri')) },
    { k: 'inv-com', label: `商業に投じる（${investCost(c, 'com').toLocaleString('ja-JP')}貫）`, sub: `商業+${Math.round(R.INVEST_STEP * 100)}%`, block: blk(investBlock(s, clan, c, 'com')) ?? gold(investCost(c, 'com')) },
    { k: 'shinden', label: `新田を開く（${shindenCost(c).toLocaleString('ja-JP')}貫）`, sub: `${R.SHINDEN_MONTHS}か月で石高+${(c.baseKoku * R.SHINDEN_GAIN).toFixed(1)}万石（${shindenDone(c)}/${R.SHINDEN_MAX}度）。知行も増える`, block: blk(shindenBlock(s, clan, c)) ?? gold(shindenCost(c)) },
    { k: 'fort', label: fortOf(c) >= FORT_NAME.length - 1 ? '普請（天守まで済み）' : `${FORT_NAME[fortOf(c) + 1]}を普請する（${fortCost(c).toLocaleString('ja-JP')}貫）`, sub: '守りと城兵の上限が上がる', block: blk(fortBlock(s, clan, c)) ?? (fortOf(c) >= FORT_NAME.length - 1 ? '済み' : gold(fortCost(c))) },
    { k: 'rakuichi', label: '楽市楽座を布く', sub: '商業の上限が上がる。座を持つ寺社・商人は反発する（国持ちから）', block: c.rakuichi !== undefined ? 'すでに布いている' : kuni ? null : '国持ちになってから' },
  ];
  return { tiles, pills, acts };
}
export function castleAct(s: GameState, k: CastleAct): Act {
  const H = s.hero!, clan = s.generals[H.id].clan!, c = s.castles[H.town];
  const v = castleView(s, c).acts.find((a) => a.k === k)!;
  if (v.block) return { ok: false, text: v.block };
  let ok = false;
  if (k === 'inv-agri' || k === 'inv-com') ok = withHeroGold(s, investCost(c, k === 'inv-agri' ? 'agri' : 'com'), () => invest(s, clan, c, k === 'inv-agri' ? 'agri' : 'com'));
  else if (k === 'shinden') ok = withHeroGold(s, shindenCost(c), () => startShinden(s, clan, c));
  else if (k === 'fort') ok = withHeroGold(s, fortCost(c), () => startFort(s, clan, c));
  else if (k === 'rakuichi') { const p = s.player; s.player = clan; ok = enactRakuichi(s, c); s.player = p; }
  if (!ok) return { ok: false, text: 'できなかった' };
  H.jun++;
  const txt: Record<CastleAct, string> = { 'inv-agri': `${c.name}の開発に投じた（開発${Math.round(c.dev * 100)}%）。`, 'inv-com': `${c.name}の商業に投じた。`, shinden: `${c.name}で新田開発を始めた（${R.SHINDEN_MONTHS}か月）。`, fort: `${c.name}で${FORT_NAME[fortOf(c) + 1]}の普請を始めた。`, rakuichi: `${c.name}の城下に楽市楽座を布いた。` };
  return { ok: true, text: txt[k] + `手元${H.gold}貫。` };
}

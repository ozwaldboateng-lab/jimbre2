// 前田利家 ― 残り火 第二幕「戻る道」: 帰参のあと、1560年の世界の武将で遊ぶの中で、時期と働きに応じて物語の場面を差し込む
import * as D from '../data/story_toshiie';
import * as D2 from '../data/story_toshiie2';
import type { Beat } from '../data/story_toshiie';
import { leaveArmy } from './corps';
import { FUCHU_ID, FUCHU_NAME, fuchuHeld, newIe } from './maeda';
import { ACT3 } from './story3';
import { ACT4, domainOf } from './story4';
import { ACT5 } from './story5';
import { captureCastle, removeArmy } from './ops';
import { addMerit } from './ranks';
import * as R from './rules';
import { clanCastles, garrisonMax } from './state';
import type { GameState } from './types';

export interface StoryEvent { id: string; beats: Beat[]; apply?: (s: GameState) => string[]; reset?: string }
type Ev = { id: string; beats: Beat[] | ((s: GameState) => Beat[]); due: (s: GameState) => boolean; when: string; at?: (s: GameState) => number; apply?: (s: GameState) => string[]; reset?: string };
const ym = (s: GameState) => s.year * 12 + s.month;
const at = (y: number, m: number) => y * 12 + m;
// 次に起きる出来事（起きる時期の目安。月日を送るときの行き先）
export const ACT2: Ev[] = [
  { id: 'niwa', beats: D.EV2_NIWA, when: '帰参の直後', due: () => true },
  { id: 'horo', beats: D.EV2_HORO, when: '主命を一つ果たすか、帰参から四か月', at: (s) => (s.hero!.storyStart ?? ym(s)) + 4, due: (s) => (s.hero!.done ?? 0) >= 1 || ym(s) - (s.hero!.storyStart ?? ym(s)) >= 4,
    apply: (s) => { const H = s.hero!, g = s.generals[H.id]; H.favor = Math.min(100, H.favor + 10); addMerit(s, g.id, 10); H.title = '赤母衣衆'; if (g.rank > 2) g.rank = 2; return ['赤母衣衆に選ばれた。主君の覚え+10、功績+10。']; } },
  { id: 'aniza', beats: D.EV2_ANIZA, when: '永禄六年（1563年）', at: () => at(1563, 1), due: (s) => ym(s) >= at(1563, 1) },
  { id: 'sannin', beats: D.EV2_SANNIN, when: '永禄九年（1566年）', at: () => at(1566, 1), due: (s) => ym(s) >= at(1566, 1) },
  { id: 'katoku', beats: D.EV2_KATOKU, when: '永禄十二年（1569年）', at: () => at(1569, 1), due: (s) => ym(s) >= at(1569, 1),
    apply: (s) => { const H = s.hero!, g = s.generals[H.id]; if (g.rank > 1) { g.rank = 1; g.merit = Math.max(g.merit, R.MERIT_AT[1]); } H.title = '前田家当主（荒子）'; H.gold += 500; H.favor = Math.min(100, H.favor + 10); H.ie ??= newIe(); return ['前田の家督を継いだ。侍大将に取り立てられ、金500貫。第一部、了。']; } },
  // ───── 第二部「北へ立つ」（第四〜六章） ─────
  ...[
    ['kaze', D2.P2_KAZE, '永禄十二年四月（家の外の風）', 1569, 4],
    ['tokichiro', D2.P2_TOKICHIRO, '永禄十二年九月（藤吉郎の道）', 1569, 9],
    ['kanegasaki', D2.P2_KANEGASAKI, '元亀元年四月（金ヶ崎）', 1570, 4],
    ['fudai', D2.P2_FUDAI, '元亀元年五月（荒子の譜代）', 1570, 5],
    ['shuppei', D2.P2_SHUPPEI, '元亀元年六月（出兵）', 1570, 6],
    ['anegawa', D2.P2_ANEGAWA, '元亀元年六月（姉川）', 1570, 6],
    ['nobiru', D2.P2_NOBIRU, '元亀二年三月（第五章 伸びる家）', 1571, 3],
    ['chigau', D2.P2_CHIGAU, '元亀三年三月（違う先）', 1572, 3],
  ].map(([id, beats, when, y, m]) => ({ id: id as string, beats: beats as Beat[], when: when as string, at: () => at(y as number, m as number), due: (s: GameState) => ym(s) >= at(y as number, m as number), reset: id === 'kaze' ? '1572' : undefined, apply: id === 'kaze' ? () => ['城下で月に一度、奥村永福・村井長頼から家中の進言を聞けるようになった'] : undefined })),
  { id: 'tenjo', beats: D2.P2_TENJO, when: '元亀三年十月（天井の下）', at: () => at(1572, 10), due: (s) => ym(s) >= at(1572, 10) },
  { id: 'fuchu', beats: D2.P2_FUCHU, when: '天正三年九月（第六章 府中へ）', at: () => at(1575, 9), due: (s) => ym(s) >= at(1575, 9), apply: setupFuchu },
  { id: 'miseshime', beats: D2.P2_MISESHIME, when: '天正三年十月（見せしめ）', at: () => at(1575, 10), due: (s) => ym(s) >= at(1575, 10) },
  { id: 'nigeru', beats: D2.P2_NIGERU, when: '天正三年十一月（逃げる村）', at: () => at(1575, 11), due: (s) => ym(s) >= at(1575, 11) },
  { id: 'fuyu', beats: D2.P2_FUYU, when: '天正三年十二月（冬の前）', at: () => at(1575, 12), due: (s) => ym(s) >= at(1575, 12) },
  { id: 'sannin', beats: D2.P2_SANNIN, when: '天正四年二月（三人の理）', at: () => at(1576, 2), due: (s) => ym(s) >= at(1576, 2) },
  { id: 'nokoribi', beats: D2.P2_NOKORIBI, when: '天正四年四月（残り火）', at: () => at(1576, 4), due: (s) => ym(s) >= at(1576, 4) },
  { id: 'motaseru', beats: (s) => [...D2.P2_MOTASERU, ...(fuchuHeld(s) ? D2.P2_RYO : D2.P2_RETRY)], when: '天正四年六月（持たせる）', at: () => at(1576, 6), due: (s) => ym(s) >= at(1576, 6),
    apply: (s) => { const H = s.hero!; if (fuchuHeld(s)) return endPart2(s, true); H.until = at(1576, 10); H.favor = Math.max(0, H.favor - 8); return ['府中はまだ持っていない。主君の覚え−8。天正四年十月までに、治安五十以上・残り火三十以下に。']; } },
  { id: 'saimotase', beats: (s) => fuchuHeld(s) ? D2.P2_RYO : D2.P2_SAI_NG, when: '府中を持たせるか、天正四年十月', at: (s) => s.hero!.until ?? at(1576, 10), due: (s) => (s.hero!.storyDone ?? []).includes('ryo') || fuchuHeld(s) || ym(s) >= (s.hero!.until ?? 0),
    apply: (s) => (s.hero!.storyDone ?? []).includes('ryo') ? [] : endPart2(s, fuchuHeld(s)) },
];
ACT2.push(...ACT3, ...ACT4, ...ACT5); // 第三部（第七・八章）・第四部（第九章）が続く
// 府中三人衆: 一乗谷を「越前府中城」として織田のものにし、利家をその城主にする（世の中がどう動いていても、物語の形に合わせる）
function setupFuchu(s: GameState): string[] {
  const H = s.hero!, me = s.generals[H.id];
  const c = s.castles.find((x) => x.id === FUCHU_ID)!;
  if (c.owner !== 'oda') { captureCastle(s, c, 'oda'); s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i); }
  c.name = FUCHU_NAME; c.oldOwner = 'asakura'; c.ember = 70; c.chian = 30; c.dev = Math.min(c.dev, 0.7); c.prevTurn = undefined;
  const sv = (H.sv ??= {}); sv.fchian = c.chian; sv.fember = c.ember; sv.fturn = s.turn;
  c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * 0.6));
  if (H.army !== null && H.army !== undefined && s.armies[H.army]) { if (!leaveArmy(s, me)) removeArmy(s, s.armies[H.army]); }
  H.army = null; me.army = null; me.boss = undefined; me.status = 'hero';
  H.fuchu = c.i; H.town = c.i; H.hex = c.hex; H.field = false; H.dest = null; me.loc = c.i;
  if (H.quest) H.quest = null;
  for (const id of ['sassa_narimasa', 'fuwa_mitsuharu']) { const g = s.generals[id]; if (g && g.clan === 'oda' && g.status === 'free') g.loc = c.i; }
  H.title = '府中三人衆（越前府中城主）'; H.ie ??= newIe();
  if (me.rank > 1) me.rank = 1;
  return [`越前府中の城主となった（府中三人衆）。${c.name}: 治安${c.chian}・残り火${c.ember}。春までに治安${50}以上・残り火${30}以下へ。`];
}
// 第二部の締め: 三つの道のどれを多く選んだかを日記に残す
function endPart2(s: GameState, held: boolean): string[] {
  const H = s.hero!, me = s.generals[H.id], sv = (H.sv ??= {});
  (H.storyDone ??= []).push('ryo');
  const roads = [['mochi', '持たせる（利家）'], ['hard', '締める（成政）'], ['son', '損得（不破）']] as const;
  const top = [...roads].sort((a, b) => (sv['road_' + b[0]] ?? 0) - (sv['road_' + a[0]] ?? 0))[0];
  if (held) { addMerit(s, me.id, 40); H.favor = Math.min(100, H.favor + 10); H.gold += 500; }
  else { H.favor = Math.max(0, H.favor - 15); }
  return [held ? `府中を持たせた。功績+40・主君の覚え+10・金500貫。第二部、了。` : '府中は持たなかった。勝家が自ら締め直した。主君の覚え−15。第二部、了。', `府中で多く選んだ道: ${top[1]}。`];
}
// いま起きる出来事（一つずつ。起きたら印をつける）
export function storyDue(s: GameState): StoryEvent | null {
  const H = s.hero;
  if (!H || H.story !== 'toshiie' || H.over) return null;
  const done = (H.storyDone ??= []);
  if (done.includes('katoku')) H.ie ??= newIe(); // 家督のあとは前田家を持つ（前の版の保存にも）
  for (const e of ACT2) {
    if (done.includes(e.id)) continue;
    if (e.id === 'saimotase' && done.includes('ryo')) { done.push(e.id); continue; }
    if (!e.due(s)) return null; // 順番どおりに
    done.push(e.id);
    return { id: e.id, beats: typeof e.beats === 'function' ? e.beats(s) : e.beats, apply: e.apply, reset: e.reset };
  }
  return null;
}
// 世の中を合わせ直す（部の切れ目）: 新しい世の中 g へ、利家と前田家の状態を移す
export function carryHero(old: GameState, g: GameState) {
  const O = old.hero!, me0 = old.generals[O.id], me = g.generals[O.id], H = g.hero!;
  for (const k of ['gold', 'favor', 'goods', 'rel', 'diary', 'done', 'failed', 'trained', 'story', 'storyDone', 'storyStart', 'title', 'ie', 'sv', 'fuchu', 'ryo', 'cargo', 'glut', 'until'] as const) (H as unknown as Record<string, unknown>)[k] = structuredClone((O as unknown as Record<string, unknown>)[k]);
  me.bra = me0.bra; me.int = me0.int; me.lea = me0.lea; me.cha = me0.cha; me.rank = me0.rank; me.merit = me0.merit;
  // 暦はそのまま（シナリオの形だけを借りる）
  g.year = old.year; g.month = old.month; g.startYear = old.year; g.startMonth = old.month; g.turn = 1;
  const sy = old.startYear ?? 1560, sm = old.startMonth ?? 6;
  for (const d of H.diary) { if (d.turn > 1 || !d.text.startsWith('（')) { const m0 = sm - 1 + d.turn - 1; d.text = `（${sy + Math.floor(m0 / 12)}年${(m0 % 12) + 1}月）${d.text}`; } d.turn = 1; }
}
// 次の出来事（月日を送る先）
export function nextStory(s: GameState) {
  const H = s.hero;
  if (!H || H.story !== 'toshiie') return null;
  return ACT2.find((e) => !(H.storyDone ?? []).includes(e.id)) ?? null;
}

// 物語の守り: 家督（第一部の終わり）までは、主家の織田が早く崩れて物語が途切れないよう、毎月 城兵を八分まで戻し、金を足す
export const STORY_GUARD = { GARRISON: 0.8, GOLD: 2000 };
export function storyGuard(s: GameState): string[] {
  const H = s.hero;
  if (!H || H.story !== 'toshiie' || (H.storyDone ?? []).includes('ryo4')) return []; // 第四部の終わり（根を張る）まで
  const clan = s.generals[H.id]?.clan ?? 'oda';
  const C = s.clans[clan];
  if (!C?.alive) return [];
  const out: string[] = [];
  const dom = domainOf(s);
  for (const c of clanCastles(s, clan)) c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * STORY_GUARD.GARRISON));
  C.gold += STORY_GUARD.GOLD;
  const sv = (H.sv ??= {});
  for (const i of dom) {
    const f = s.castles[i], k = i === H.fuchu ? '' : `_${i}`; // 主の城は前の版と同じ鍵
    // 落とされた（または落とされて取り返した）: 味方の後詰めで取り返し、治めは先月の控えから少し悪くした所へ（主君の覚えは下がる）
    const lost = f.owner !== clan || (f.prevTurn !== undefined && f.prevTurn >= (sv['fturn' + k] ?? 0));
    if (lost && sv['fturn' + k] !== undefined) {
      if (f.owner !== clan) captureCastle(s, f, clan);
      s.shioki = (s.shioki ?? []).filter((x) => x.castle !== f.i);
      f.chian = Math.max(0, (sv['fchian' + k] ?? 30) - 15); f.ember = Math.min(100, (sv['fember' + k] ?? 60) + 15); f.prevTurn = undefined;
      H.favor = Math.max(0, H.favor - 8);
      out.push(`${f.name}を一時、敵に奪われた。味方の後詰めが取り返したが、治めは後戻りした（治安${Math.round(f.chian)}・残り火${Math.round(f.ember)}）。主君の覚え−8。`);
    } else if (lost) { f.prevTurn = undefined; }
    sv['fchian' + k] = f.chian; sv['fember' + k] = f.ember ?? 0; sv['fturn' + k] = s.turn;
    // 治める城は普請を固め、城兵を満たす（荒子衆も加わる）。山場は戦ではなく治め方
    f.fort = Math.max(f.fort ?? 0, 3); f.garrison = garrisonMax(f); f.gMorale = 1; f.gate = 1;
    if (f.naioBy && f.naioBy !== clan) { f.naio = undefined; f.naioBy = undefined; }
  }
  return out;
}

// 月日を送る（物語の時の跳び）: 次の出来事の年月まで、暦だけを進める。世の中はそのまま（小説の章と章のあいだのように）。跳んだ月の俸禄はまとめて
export function storyJump(s: GameState): string[] {
  const n = nextStory(s), H = s.hero!;
  if (!n?.at) return [];
  const months = n.at(s) - ym(s);
  if (months <= 0) return [];
  s.turn += months;
  const m0 = s.year * 12 + (s.month - 1) + months;
  s.year = Math.floor(m0 / 12); s.month = (m0 % 12) + 1;
  H.jun = 0;
  const pay = ([400, 200, 100, 50][s.generals[H.id].rank] ?? 50) * months; // hero.ts の HERO.PAY と同じ
  H.gold += pay;
  if (H.quest && H.quest.until < s.turn) H.quest = null;
  return [`月日は流れ、${s.year}年${s.month}月。（${months}か月の俸禄 ${pay}貫）`];
}

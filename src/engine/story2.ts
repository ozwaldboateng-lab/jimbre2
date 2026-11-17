// 前田利家 ― 残り火 第二幕「戻る道」: 帰参のあと、1560年の世界の武将で遊ぶの中で、時期と働きに応じて物語の場面を差し込む
import * as D from '../data/story_toshiie';
import type { Beat } from '../data/story_toshiie';
import { addMerit } from './ranks';
import * as R from './rules';
import { clanCastles, garrisonMax } from './state';
import type { GameState } from './types';

export interface StoryEvent { id: string; beats: Beat[]; apply?: (s: GameState) => string[] }
const ym = (s: GameState) => s.year * 12 + s.month;
const at = (y: number, m: number) => y * 12 + m;
// 次に起きる出来事（起きる時期の目安。月日を送るときの行き先）
export const ACT2: { id: string; beats: Beat[]; due: (s: GameState) => boolean; when: string; at?: (s: GameState) => number; apply?: (s: GameState) => string[] }[] = [
  { id: 'niwa', beats: D.EV2_NIWA, when: '帰参の直後', due: () => true },
  { id: 'horo', beats: D.EV2_HORO, when: '主命を一つ果たすか、帰参から四か月', at: (s) => (s.hero!.storyStart ?? ym(s)) + 4, due: (s) => (s.hero!.done ?? 0) >= 1 || ym(s) - (s.hero!.storyStart ?? ym(s)) >= 4,
    apply: (s) => { const H = s.hero!, g = s.generals[H.id]; H.favor = Math.min(100, H.favor + 10); addMerit(s, g.id, 10); H.title = '赤母衣衆'; if (g.rank > 2) g.rank = 2; return ['赤母衣衆に選ばれた。主君の覚え+10、功績+10。']; } },
  { id: 'aniza', beats: D.EV2_ANIZA, when: '永禄六年（1563年）', at: () => at(1563, 1), due: (s) => ym(s) >= at(1563, 1) },
  { id: 'sannin', beats: D.EV2_SANNIN, when: '永禄九年（1566年）', at: () => at(1566, 1), due: (s) => ym(s) >= at(1566, 1) },
  { id: 'katoku', beats: D.EV2_KATOKU, when: '永禄十二年（1569年）', at: () => at(1569, 1), due: (s) => ym(s) >= at(1569, 1),
    apply: (s) => { const H = s.hero!, g = s.generals[H.id]; if (g.rank > 1) { g.rank = 1; g.merit = Math.max(g.merit, R.MERIT_AT[1]); } H.title = '前田家当主（荒子）'; H.gold += 500; H.favor = Math.min(100, H.favor + 10); return ['前田の家督を継いだ。侍大将に取り立てられ、金500貫。第一部、了。']; } },
];
// いま起きる出来事（一つずつ。起きたら印をつける）
export function storyDue(s: GameState): StoryEvent | null {
  const H = s.hero;
  if (!H || H.story !== 'toshiie') return null;
  const done = (H.storyDone ??= []);
  for (const e of ACT2) {
    if (done.includes(e.id)) continue;
    if (!e.due(s)) return null; // 順番どおりに
    done.push(e.id);
    return { id: e.id, beats: e.beats, apply: e.apply };
  }
  return null;
}
// 次の出来事（月日を送る先）
export function nextStory(s: GameState) {
  const H = s.hero;
  if (!H || H.story !== 'toshiie') return null;
  return ACT2.find((e) => !(H.storyDone ?? []).includes(e.id)) ?? null;
}

// 物語の守り: 家督（第一部の終わり）までは、主家の織田が早く崩れて物語が途切れないよう、毎月 城兵を八分まで戻し、金を足す
export const STORY_GUARD = { GARRISON: 0.8, GOLD: 2000 };
export function storyGuard(s: GameState) {
  const H = s.hero;
  if (!H || H.story !== 'toshiie' || (H.storyDone ?? []).includes('katoku')) return;
  const C = s.clans.oda;
  if (!C?.alive) return;
  for (const c of clanCastles(s, 'oda')) c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * STORY_GUARD.GARRISON));
  C.gold += STORY_GUARD.GOLD;
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

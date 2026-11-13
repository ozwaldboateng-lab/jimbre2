// 酒宴: 戦っていない部隊に金で酒肴をふるまい、士気を上限まで戻す（主将と傘下の恩も少し上がる）
import { membersOf } from './corps';
import { NEIGHBORS } from './map';
import { onOf } from './on';
import { nearOwnCastle } from './reorg';
import * as R from './rules';
import { addLog, hostile, initialMorale, occupancy } from './state';
import type { Army, GameState } from './types';

export const FEAST = { GOLD_PER_100: 10, ON: 1, AI_BELOW: 0.7, AI_GOLD_TIMES: 5 };
export const feastCost = (a: Army) => Math.ceil(a.troops / 100) * FEAST.GOLD_PER_100;
export function feastBlock(s: GameState, a: Army): string | null {
  if (a.ikki) return '一揆勢は酒宴を開かない';
  if (a.acted) return 'この月はもう動いた';
  if (a.fought === s.turn) return 'この月に戦った';
  if ((s.orders ?? []).some((o) => o.army === a.id)) return '出陣を命じている（取り消すと開ける）';
  if (!nearOwnCastle(s, a)) return '自城か、その隣にいるときだけ';
  const occ = occupancy(s);
  if (NEIGHBORS[a.hex].some((j) => { const o = occ.get(j); return !!o && hostile(s, a.clan, o.clan); })) return '敵と隣り合っている';
  if (a.morale >= initialMorale(s, a) - 0.005) return '士気はもう満ちている';
  if (s.clans[a.clan].gold < feastCost(a)) return `金${feastCost(a).toLocaleString()}貫が要る`;
  return null;
}
export function feast(s: GameState, a: Army): boolean {
  if (feastBlock(s, a)) return false;
  const cost = feastCost(a), before = a.morale;
  s.clans[a.clan].gold -= cost;
  a.morale = initialMorale(s, a);
  for (const id of membersOf(a)) { const g = s.generals[id]; if (g) g.on = Math.min(100, onOf(g) + FEAST.ON); }
  a.acted = true; a.mp = 0;
  const g = s.generals[a.main];
  addLog(s, `${g?.name ?? ''}隊が酒宴を開いた（金${cost.toLocaleString()}貫・士気${before.toFixed(2)}→${a.morale.toFixed(2)}）。`, 'info', a.clan === s.player);
  return true;
}
// AI: 士気が上限の7割を切った部隊に、金に余裕があれば
export function aiFeast(s: GameState, a: Army): boolean {
  if (a.morale >= initialMorale(s, a) * FEAST.AI_BELOW) return false;
  if (s.clans[a.clan].gold < feastCost(a) * FEAST.AI_GOLD_TIMES) return false;
  return feast(s, a);
}
void R;

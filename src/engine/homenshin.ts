// 武将で遊ぶ（物語の外）: 方面軍団長（領主）の与力の親しさ・方面の目標・兵の取り合い。方面ごとの謀反（親しい与力だけがついて来る）は career.ts の rebel と ryoplot.ts の defect で
// 与力の親しさ（主人公との親しさをそのまま）: 方面の軍勢が城を落とした月は与力みな+3。率いていた部隊を失った与力は−5（捨て駒にされた）。親しさ20未満の与力は月に6%で主君に讒言（疑い+5・覚え−3）。
// 方面の目標: 任じられたら、方面の近く（6マス）の敵の城を三つまで、三年のうちに落とせと命じられる。果たせば覚え+20・名声+10・功績+100で、落とした城は領に。果たせなければ解任（方面の城と与力を失い、覚え−15）。
// 兵の取り合い: 方面軍団長の間、月に4%で主君が「ほかの方面が危うい。兵を回せ」と命じる（主君との出来事の窓で、従うか渋るか）
import { hexDist } from './map';
import { pushKumi } from './kumiev';
import * as R from './rules';
import { addUtagai } from './ryoshin';
import { addLog, castleKoku, clanName, garrisonMax, hostile, rand } from './state';
import type { GameState, General } from './types';

export const HOMEN = { SENPO_P: 0.08, SENPO_REL: 5, SENPO_NG: 3, SENPO_MORALE: 0.1, GOAL_N: 3, GOAL_RANGE: 6, GOAL_MONTHS: 36, WIN_REL: 3, LOST_REL: 5, ZAN_REL: 20, ZAN_P: 0.06, ZAN_UTA: 5, ZAN_FAVOR: 3, OK_FAVOR: 20, OK_FAME: 10, OK_MERIT: 100, NG_FAVOR: 15, HEI_P: 0.04, HEI_SHARE: 0.2, HEI_MIN: 500, HEI_OK: 5, HEI_NG: 8, HEI_NG_UTA: 5, FOLLOW: 60 };
type Goal = { castles: number[]; until: number; clan: string };
type HX = { homenGoal?: Goal; yorikiArmy?: Record<string, number>; shinEv?: { kind: string; turn: number; need?: number }; career?: { steps: string[] }; favor: number; fame?: number; rel: Record<string, number>; id: string; mode?: string; fuchu?: number; ryo?: number[] };
const X = (s: GameState) => s.hero as unknown as HX;
const me = (s: GameState) => s.generals[X(s).id];
export const isHomen = (s: GameState) => { const H = X(s); return !!H && H.mode === 'ryoshu' && (H.career?.steps ?? []).includes('homen'); };
const front = (s: GameState) => (s.fronts ?? []).find((f) => f.manual && f.leader === X(s).id);
export const yorikiOf = (s: GameState): General[] => Object.values(s.generals).filter((g) => g.yoriki === X(s).id && g.clan === me(s).clan && g.status !== 'dead' && g.status !== 'captive');
export const follows = (s: GameState, g: General) => (X(s).rel[g.id] ?? 0) >= HOMEN.FOLLOW; // 謀反・寝返りでついて来る
export const goalOf = (s: GameState) => X(s)?.homenGoal ?? null;
export const goalDone = (s: GameState) => { const g = goalOf(s); return g ? g.castles.filter((i) => s.castles[i].owner === me(s).clan).length : 0; };

export function homenMonth(s: GameState): string[] {
  if (!isHomen(s)) return [];
  const H = X(s), out: string[] = [], f = front(s), clan = me(s).clan!;
  if (!f) return out;
  // 方面の目標
  if (!H.homenGoal) {
    const fc = f.castles.map((i) => s.castles[i]);
    const foes = s.castles.filter((c) => c.owner && c.owner !== clan && hostile(s, clan, c.owner) && fc.some((k) => hexDist(k.hex, c.hex) <= R.hx(HOMEN.GOAL_RANGE)))
      .sort((a, b) => Math.min(...fc.map((k) => hexDist(k.hex, a.hex))) - Math.min(...fc.map((k) => hexDist(k.hex, b.hex))));
    if (foes.length) {
      const pick = foes.slice(0, HOMEN.GOAL_N);
      H.homenGoal = { castles: pick.map((c) => c.i), until: s.turn + HOMEN.GOAL_MONTHS, clan: pick[0].owner! }; pushKumi(s, { k: 'homenGoal' }); // 言い渡しと与力の顔合わせの場面
      out.push(`主君から方面の目標が言い渡された: ${HOMEN.GOAL_MONTHS / 12}年のうちに、${pick.map((c) => c.name).join('・')}を落とせ。果たせば大きな加増、果たせなければ解任。`);
    }
  } else {
    const g = H.homenGoal, done = goalDone(s);
    if (done >= g.castles.length) {
      H.favor = Math.min(100, H.favor + HOMEN.OK_FAVOR); H.fame = Math.min(100, (H.fame ?? 0) + HOMEN.OK_FAME); me(s).merit += HOMEN.OK_MERIT;
      for (const i of g.castles) if (s.castles[i].owner === clan) { if (!(H.ryo ??= []).includes(i) && i !== H.fuchu) H.ryo.push(i); if (!f.castles.includes(i)) f.castles.push(i); }
      out.push(`方面の目標（${g.castles.map((i) => s.castles[i].name).join('・')}）を果たした！ 主君の覚え+${HOMEN.OK_FAVOR}・名声+${HOMEN.OK_FAME}・功績+${HOMEN.OK_MERIT}。落とした城は領に加えられた。`);
      addLog(s, `${me(s).name}が方面の目標を果たし、大きく加増された。`, 'info', true);
      pushKumi(s, { k: 'homenOk', ids: g.castles.map(String) }); H.homenGoal = undefined; // 次の目標は来月言い渡される
    } else if (s.turn > g.until) { pushKumi(s, { k: 'homenNg', ids: yorikiOf(s).map((y) => y.id) }); out.push(...dismiss(s)); } // 解任の場面（去る与力の名は、解く前に）
    else if (g.until - s.turn === 12) pushKumi(s, { k: 'homenRemind' }); // 残り一年の催促
  }
  if (!isHomen(s)) return out;
  // 与力の親しさ
  const ys = yorikiOf(s);
  const took = s.castles.some((c) => c.owner === clan && c.prevOwner && c.prevOwner !== clan && c.prevTurn !== undefined && s.turn - c.prevTurn <= 1 && f.castles.some((i) => hexDist(s.castles[i].hex, c.hex) <= R.hx(HOMEN.GOAL_RANGE)));
  if (took && ys.length) { pushKumi(s, { k: 'yorikiWin' }); for (const g of ys) H.rel[g.id] = Math.min(100, (H.rel[g.id] ?? 0) + HOMEN.WIN_REL); out.push(`方面の軍勢が城を落とした。与力の${ys.map((g) => g.name).join('・')}との親しさ+${HOMEN.WIN_REL}。`); }
  const prev = H.yorikiArmy ?? {}, now: Record<string, number> = {};
  for (const g of ys) {
    if (g.army !== null && s.armies[g.army]) now[g.id] = g.army;
    else if (prev[g.id] !== undefined && !s.armies[prev[g.id]]) { H.rel[g.id] = Math.max(0, (H.rel[g.id] ?? 0) - HOMEN.LOST_REL); pushKumi(s, { k: 'yorikiLost', id: g.id }); out.push(`与力の${g.name}は率いていた部隊を失い、捨て駒にされたと恨んでいる（親しさ−${HOMEN.LOST_REL}）。`); }
  }
  H.yorikiArmy = now;
  const sour = ys.filter((g) => (H.rel[g.id] ?? 0) < HOMEN.ZAN_REL);
  if (sour.length && rand(s) < HOMEN.ZAN_P) { const g = sour[Math.floor(rand(s) * sour.length)]; pushKumi(s, { k: 'gonjo', id: g.id }); addUtagai(s, HOMEN.ZAN_UTA); H.favor = Math.max(0, H.favor - HOMEN.ZAN_FAVOR); out.push(`与力の${g.name}が、主君に方面の差配への不満を言上した（覚え−${HOMEN.ZAN_FAVOR}・疑い+${HOMEN.ZAN_UTA}）。`); }
  // 先鋒の願い（新しい出来事）: 目標がある間、月に8%で与力の一人が次の城攻めの先鋒を願い出る（ryokake.ts の場面で許すか退けるか）
  if (ys.length && H.homenGoal && rand(s) < HOMEN.SENPO_P) pushKumi(s, { k: 'senpo', id: ys[Math.floor(rand(s) * ys.length)].id });
  // 兵の取り合い
  if (!H.shinEv && rand(s) < HOMEN.HEI_P) {
    const total = f.castles.map((i) => s.castles[i]).filter((c) => c.owner === clan).reduce((t, c) => t + c.garrison, 0);
    const need = Math.max(HOMEN.HEI_MIN, Math.round(total * HOMEN.HEI_SHARE / 100) * 100);
    if (total > need * 2) { H.shinEv = { kind: 'hei', turn: s.turn + 1, need }; out.push(`主君から使者が来た。ほかの方面が危うい、兵${need}を回せという。`); }
  }
  return out;
}
// 解任: 方面の城（自分の領でない城）と与力を失う
function dismiss(s: GameState): string[] {
  const H = X(s), f = front(s);
  if (H.career) H.career.steps = H.career.steps.filter((k) => k !== 'homen');
  for (const g of yorikiOf(s)) g.yoriki = undefined;
  const dom = [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])];
  if (f) f.castles = f.castles.filter((i) => dom.includes(i));
  H.favor = Math.max(0, H.favor - HOMEN.NG_FAVOR); H.homenGoal = undefined;
  addLog(s, `${me(s).name}が方面の目標を果たせず、方面軍団長を解かれた。`, 'info', true);
  return [`方面の目標を果たせず、方面軍団長を解かれた。与力と方面の城を失い、主君の覚え−${HOMEN.NG_FAVOR}。`];
}
// 兵を回す（従う）: 方面の城の城兵から、多い城から順に
export function heiObey(s: GameState): string {
  const H = X(s), need = H.shinEv?.need ?? 0, f = front(s), clan = me(s).clan!, L = s.clans[clan].leader;
  H.shinEv = undefined;
  let left = need;
  const cs = (f?.castles ?? []).map((i) => s.castles[i]).filter((c) => c.owner === clan).sort((a, b) => b.garrison - a.garrison);
  for (const c of cs) { if (left <= 0) break; const t = Math.min(left, Math.floor(c.garrison * 0.5)); c.garrison -= t; left -= t; }
  const lc = L ? s.castles[s.generals[L].loc] : null; if (lc && lc.owner === clan) lc.garrison = Math.min(garrisonMax(lc), lc.garrison + (need - left));
  H.favor = Math.min(100, H.favor + HOMEN.HEI_OK);
  return `主君の命に従い、方面から兵${need - left}を回した（主君の覚え+${HOMEN.HEI_OK}）。方面は手薄になった。`;
}
export function heiRefuse(s: GameState): string { const H = X(s); H.shinEv = undefined; H.favor = Math.max(0, H.favor - HOMEN.HEI_NG); addUtagai(s, HOMEN.HEI_NG_UTA); return `兵を回すのを渋った（主君の覚え−${HOMEN.HEI_NG}・疑い+${HOMEN.HEI_NG_UTA}）。`; }
export const goalText = (s: GameState) => { const g = goalOf(s); if (!g) return null; return `${g.castles.map((i) => `${s.castles[i].name}${s.castles[i].owner === me(s).clan ? '（落とした）' : ''}`).join('・')}を、${Math.max(0, g.until - s.turn)}か月のうちに（${clanName(s, g.clan)}家ほか）`; };
void castleKoku;

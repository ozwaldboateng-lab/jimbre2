// 内政の委任: プレイヤーが任せた項目を、AIと同じ判断で毎月処理する
import { aiFillCorps } from './corps';
import { castleAt, clanCastles } from './state';
import { NEIGHBORS } from './map';
import { aiCourt } from './court';
import { aiEquip, aiTrade, clanGuns, clanItems } from './money';
import { aiNanban } from './nanban';
import { aiBudget } from './policy';
import { aiInvest } from './invest';
import { clanIncome } from './money';
import { aiFillBugyo, aiFillTsukai, bugyoOf, tsukaiLabel, tsukaiOf } from './ranks';
import * as R from './rules';
import { addLog } from './state';
import type { GameState } from './types';

export type DelegateKey = 'invest' | 'budget' | 'trade' | 'yaku' | 'reward' | 'ronin' | 'gift' | 'court' | 'military';
// 一覧の並び（どのメニューの画面か）
export const DELEGATE_NAME: Record<DelegateKey, string> = {
  invest: '領内（開発・商業への投資・新田開発・普請）', budget: '予算と動員（治水・施し・重点の城・動員目標）',
  trade: '商い（兵糧・鉄砲・名物の購入、南蛮市）',
  yaku: '役目の補充（奉行・使番・軍団の空き）', reward: '恩賞と取り立て', ronin: '仕官の受け入れ（在野の願い出）', gift: '名物の下賜',
  court: '官位（献金）',
  military: '軍事（直轄の部隊・城も含め、出陣・移動・編成・配備をすべて）',
};
export const DELEGATE_MENU: Record<DelegateKey, string> = { invest: '内政 › 領内', budget: '内政 › 予算と動員', trade: '商い', yaku: '人事 › 奉行・使番', reward: '人事 › 恩賞', ronin: '人事 › 人材', gift: '人事 › 下賜', court: '外交 › 朝廷', military: '軍事' };
type Deleg = Record<DelegateKey, boolean>;
export const delegateOf = (s: GameState): Deleg => {
  const C = s.clans[s.player];
  const d = (C.delegate ??= {}) as Partial<Deleg> & { staff?: boolean };
  if (d.staff !== undefined) { d.yaku = d.reward = d.ronin = d.gift = d.staff; delete d.staff; } // 古い保存: 人事をひとまとめにしていた
  for (const k of Object.keys(DELEGATE_NAME) as DelegateKey[]) d[k] ??= false;
  return d as Deleg;
};

export function runDelegation(s: GameState) {
  const clan = s.player, C = s.clans[clan];
  if (!C?.alive) return;
  const d = delegateOf(s);
  if (!(d.invest || d.budget || d.trade || d.yaku || d.gift || d.court)) return;
  const before = { gold: C.gold, food: C.food, guns: clanGuns(s, clan), items: clanItems(s, clan).length, held: clanItems(s, clan).filter((i) => i.holder).length, court: C.court ?? 0, bugyo: bugyoOf(s, clan).length, tsukai: tsukaiOf(s, clan).length, b: { ...C.budget }, mob: C.mobilize, works: works(s, clan), dev: devSum(s, clan) };
  if (d.budget) aiBudget(s, C);
  if (d.invest) { const tax = C.tax; aiInvest(s, C, clanIncome(s, clan)); if (!d.budget) C.tax = tax; } // 年貢の率は「予算と動員」の側
  if (d.trade) { aiNanban(s, clan); aiTrade(s, clan); }
  if (d.yaku) { aiFillBugyo(s, clan); aiFillTsukai(s, clan); aiFillCorps(s, clan, (a) => castleAt(s, a.hex)?.owner === a.clan || NEIGHBORS[a.hex].some((j) => castleAt(s, j)?.owner === a.clan)); }
  if (d.gift) aiEquip(s, clan);
  if (d.court) aiCourt(s, clan);
  // したことを、項目ごとに残し（各画面の上に出す）、1行にまとめて記録する
  const by: Partial<Record<DelegateKey, string[]>> = {};
  const put = (k: DelegateKey, t: string) => (by[k] ??= []).push(t);
  if (d.budget && (before.b.chisui !== C.budget.chisui || before.b.hodo !== C.budget.hodo || before.mob !== C.mobilize)) put('budget', `予算を治水${C.budget.chisui}%・施し${C.budget.hodo}%、動員目標${C.mobilize}%に`);
  if (d.invest) { const w = works(s, clan) - before.works, dv = devSum(s, clan) - before.dev; if (w > 0) put('invest', `新田・普請を${w}か所始める`); if (dv > 0.001) put('invest', '開発・商業に投資'); }
  const food = C.food - before.food;
  if (food > 0) put('trade', `兵糧${food.toLocaleString()}石を買う`); else if (food < 0) put('trade', `兵糧${(-food).toLocaleString()}石を売る`);
  const guns = clanGuns(s, clan) - before.guns;
  if (guns > 0) put('trade', `鉄砲${guns.toLocaleString()}丁を買う`);
  if (clanItems(s, clan).length > before.items) put('trade', '名物を買う');
  if (clanItems(s, clan).filter((i) => i.holder).length > before.held) put('gift', '名物を下賜');
  if (bugyoOf(s, clan).length > before.bugyo) put('yaku', `奉行を${bugyoOf(s, clan).length - before.bugyo}人任命`);
  if (tsukaiOf(s, clan).length > before.tsukai) put('yaku', `${tsukaiLabel(clan)}を${tsukaiOf(s, clan).length - before.tsukai}人任命`);
  if ((C.court ?? 0) > before.court) put('court', `献金して${R.COURT[C.court ?? 0].name}に`);
  C.delegLast = { turn: s.turn, by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v!.join('、')])) };
  const out = Object.values(by).flat();
  const spent = Math.round(before.gold - C.gold);
  if (out.length) addLog(s, `委任: ${out.join('、')}（金${spent >= 0 ? '−' : '+'}${Math.abs(spent).toLocaleString()}貫）。`, 'econ', true);
}
const works = (s: GameState, clan: string) => clanCastles(s, clan).filter((c) => c.shinden || c.fortBuild).length;
const devSum = (s: GameState, clan: string) => clanCastles(s, clan).reduce((t, c) => t + c.dev + c.cdev, 0);

// 武将で遊ぶ（物語の外）: 金の使い道。家の格（屋敷の普請）・名物（茶器・刀・馬）・茶会・手勢の扶持。
// 出世で増える俸禄と知行が積み上がるばかりだったので、身分と家の大きさに見合った掛かりと、名を上げる買い物を足す
import type { Act } from './hero';
import { lv } from './skill';
import { clanName } from './state';
import type { GameState } from './types';

export const KAKU = {
  COST: [1500, 4000, 8000, 14000, 22000], // 家の格を一つ上げる普請の費え（格1〜5）
  NEED: ['ie', 'ie', 'shiro', 'shiro', 'kuni'] as const, // その格に上げるのに要る出世の節目
  UPKEEP: 25, // 格一つごとの屋敷の掛かり（月・貫）
  SHU: 80, FAME: 4, FAVOR: 3, // 格一つごとに: 手勢の養える数+80・名声+4・普請の折に主君の覚え+3
  NAME: ['並の屋敷', '構えのある屋敷', '門構えの屋敷', '大身の屋敷', '館', '城下第一の館'],
};
export const SHU_FUCHI = 8; // 手勢100人ごとの月の扶持（貫）

export interface Meibutsu { id: string; name: string; kind: '茶器' | '刀' | '馬'; price: number; fame: number }
export const MEIBUTSU: Meibutsu[] = [
  { id: 'tsukumo', name: '九十九髪茄子', kind: '茶器', price: 12000, fame: 10 },
  { id: 'hatsuhana', name: '初花肩衝', kind: '茶器', price: 9000, fame: 8 },
  { id: 'nitta', name: '新田肩衝', kind: '茶器', price: 8000, fame: 7 },
  { id: 'narashiba', name: '楢柴肩衝', kind: '茶器', price: 10000, fame: 8 },
  { id: 'hiragumo', name: '平蜘蛛の釜', kind: '茶器', price: 7000, fame: 6 },
  { id: 'shozan', name: '松島の壺', kind: '茶器', price: 5000, fame: 5 },
  { id: 'mikazuki', name: '三日月宗近', kind: '刀', price: 11000, fame: 9 },
  { id: 'doujigiri', name: '童子切安綱', kind: '刀', price: 10000, fame: 8 },
  { id: 'heshikiri', name: 'へし切長谷部', kind: '刀', price: 6000, fame: 5 },
  { id: 'samonji', name: '左文字の太刀', kind: '刀', price: 4000, fame: 4 },
  { id: 'ikezuki', name: '奥州の駿馬', kind: '馬', price: 3000, fame: 3 },
  { id: 'kagekage', name: '南部の名馬', kind: '馬', price: 2500, fame: 3 },
];
export const MARKETS = ['kishiwada', 'kyo', 'tachibana', 'kiyosu']; // 名物の出る町（堺・京・博多・津島）
export const CHAKAI = { COST: 300, REL: 8, FAME: 2, EVERY: 3 }; // 茶会: 名物が一つ要る。城下の武将との親しさ+8（3か月に一度）

type HeroX = { kaku?: number; meibutsu?: string[]; given?: string[]; chakai?: number };
const X = (s: GameState) => s.hero! as typeof s.hero & HeroX;
const steps = (s: GameState) => s.hero!.career?.steps ?? [];
export const kakuOf = (s: GameState) => X(s).kaku ?? 0;
export const owned = (s: GameState) => (X(s).meibutsu ?? []).map((id) => MEIBUTSU.find((m) => m.id === id)!).filter(Boolean);

// ───────── 家の格 ─────────
export function kakuBlock(s: GameState): string | null {
  const k = kakuOf(s), H = s.hero!;
  if (!H.ie) return '家を立ててから';
  if (k >= KAKU.COST.length) return 'これ以上の格はない';
  if (!steps(s).includes(KAKU.NEED[k])) return `${{ ie: '家を立てて', shiro: '城を預かって', kuni: '国持ちになって' }[KAKU.NEED[k]]}から`;
  if (H.field || H.army) return '城下にいる時だけ';
  if (H.gold < KAKU.COST[k]) return `金が足りない（${KAKU.COST[k].toLocaleString('ja-JP')}貫）`;
  return null;
}
export function raiseKaku(s: GameState): Act {
  const why = kakuBlock(s);
  if (why) return { ok: false, text: why };
  const H = X(s), k = kakuOf(s), cost = KAKU.COST[k];
  H.gold -= cost; H.kaku = k + 1; H.jun++;
  H.fame = Math.min(100, (H.fame ?? 0) + KAKU.FAME); H.favor = Math.min(100, H.favor + KAKU.FAVOR);
  return { ok: true, text: `屋敷を普請し、${KAKU.NAME[k + 1]}となった（家の格${k + 1}・${cost.toLocaleString('ja-JP')}貫）。手勢を${KAKU.SHU}人多く養える・名声+${KAKU.FAME}・主君の覚え+${KAKU.FAVOR}。屋敷の掛かりは月${(k + 1) * KAKU.UPKEEP}貫。` };
}
export const shuCapBonus = (s: GameState) => kakuOf(s) * KAKU.SHU;
export const retainerBonus = (s: GameState) => Math.floor(kakuOf(s) / 2); // 格2・4で家臣の枠+1

// ───────── 名物 ─────────
// 名物の出る町では、半年ごとに一つ（または無し）が売りに出る。持ち主の決まった名物は出ない
export function offerAt(s: GameState, castleId: string): Meibutsu | null {
  if (!MARKETS.includes(castleId)) return null;
  const taken = new Set([...(X(s).meibutsu ?? []), ...(X(s).given ?? [])]);
  const left = MEIBUTSU.filter((m) => !taken.has(m.id));
  if (!left.length) return null;
  const k = Math.floor(s.turn / 6) * 7 + MARKETS.indexOf(castleId) * 13;
  if (k % 4 === 3) return null;
  return left[k % left.length];
}
export function buyMeibutsu(s: GameState, id: string): Act {
  const H = X(s), c = s.castles[H.town], m = offerAt(s, c.id);
  if (H.field || H.army) return { ok: false, text: '城下にいる時だけ' };
  if (!m || m.id !== id) return { ok: false, text: 'その名物は、もう売りに出ていない' };
  if (H.gold < m.price) return { ok: false, text: `金が足りない（${m.price.toLocaleString('ja-JP')}貫）` };
  H.gold -= m.price; (H.meibutsu ??= []).push(m.id); H.jun++;
  H.fame = Math.min(100, (H.fame ?? 0) + m.fame);
  return { ok: true, text: `${m.kind}「${m.name}」を${m.price.toLocaleString('ja-JP')}貫で求めた。名声+${m.fame}。茶会を開くか、主君に献上できる。` };
}
// 主君へ献上: 値に応じて覚えと功績（大きな名物ほど効く）
export function giveMeibutsu(s: GameState, id: string): Act {
  const H = X(s), me = s.generals[H.id], m = MEIBUTSU.find((x) => x.id === id);
  const L = me.clan ? s.clans[me.clan].leader : null;
  if (!m || !(H.meibutsu ?? []).includes(id)) return { ok: false, text: '持っていない' };
  if (!L || H.field || H.town !== s.generals[L].loc) return { ok: false, text: '主君の城下で献上する' };
  const favor = Math.min(30, Math.round(m.price / 400 * (1 + lv(s, 'sado') * 0.1))), merit = Math.round(m.price / 150);
  H.meibutsu = H.meibutsu!.filter((x) => x !== id); (H.given ??= []).push(id); H.jun++;
  H.favor = Math.min(100, H.favor + favor); me.merit += merit;
  return { ok: true, who: L, line: m.kind === '茶器' ? `……「${m.name}」か。これは、天下の名物ぞ。` : `よい${m.kind}だ。……${me.name}、覚えておく。`, text: `「${m.name}」を${clanName(s, me.clan!)}家の主君に献上した。主君の覚え+${favor}・功績+${merit}。` };
}
// 茶会: 城下の武将を招く（名物が要る）。招いた者みなと親しくなる
export function chakaiBlock(s: GameState): string | null {
  const H = X(s);
  if (!owned(s).some((m) => m.kind === '茶器')) return '茶器の名物が要る';
  if (H.field || H.army) return '城下にいる時だけ';
  if (H.chakai !== undefined && s.turn - H.chakai < CHAKAI.EVERY) return `茶会は${CHAKAI.EVERY}か月に一度`;
  if (H.gold < CHAKAI.COST) return `金が足りない（${CHAKAI.COST}貫）`;
  return null;
}
export function chakai(s: GameState, guests: string[]): Act {
  const why = chakaiBlock(s);
  if (why) return { ok: false, text: why };
  const H = X(s), tea = owned(s).filter((m) => m.kind === '茶器').sort((a, b) => b.price - a.price)[0];
  H.gold -= CHAKAI.COST; H.chakai = s.turn; H.jun++;
  const bonus = Math.round(tea.fame / 3) + lv(s, 'sado') * 2; // 茶道一段ごとに+2
  for (const id of guests) H.rel[id] = Math.min(100, (H.rel[id] ?? 0) + CHAKAI.REL + bonus);
  H.fame = Math.min(100, (H.fame ?? 0) + CHAKAI.FAME);
  const names = guests.slice(0, 4).map((id) => s.generals[id]?.name).filter(Boolean).join('・');
  return { ok: true, text: `「${tea.name}」を出して茶会を開いた（${CHAKAI.COST}貫）。${names ? `${names}${guests.length > 4 ? 'ほか' : ''}を招き、` : ''}招いた者との親しさ+${CHAKAI.REL + bonus}・名声+${CHAKAI.FAME}。` };
}

// ───────── 毎月の掛かり（物語の外）: 手勢の扶持と屋敷の掛かり ─────────
export function upkeepMonth(s: GameState): string[] {
  const H = s.hero!;
  if (!H.ie) return [];
  // 利家の物語では荒子衆は前田家の蔵で養う（屋敷の掛かりだけ払う）
  const shu = H.story === 'toshiie' ? 0 : Math.round(H.ie.shu / 100 * SHU_FUCHI), ya = kakuOf(s) * KAKU.UPKEEP, cost = shu + ya;
  if (cost <= 0) return [];
  if (H.gold >= cost) { H.gold -= cost; return [`手勢の扶持${shu}貫${ya ? `・屋敷の掛かり${ya}貫` : ''}を払った。`]; }
  H.gold = 0;
  H.ie.shu = Math.max(50, H.ie.shu - 30); H.ie.kachu = Math.max(0, H.ie.kachu - 3);
  return [`扶持が払いきれず、手勢の一部が去った（手勢${H.ie.shu}）。`];
}

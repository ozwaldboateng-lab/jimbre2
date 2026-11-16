// 檄と連合: 盟主が近隣の家々へ「○○家を討て」と檄を出し、応じた家が二つ以上あれば連合が成る。
// 連合の家どうしは攻め合わず領内を通れ、AIは標的を狙う。各家は独立したまま（家臣にはならない）。
// 標的が滅ぶか降るまで続く。盟主の死・威信の衰え・標的との親しさで、抜ける家（寝返り）も出る。
// 強くなりすぎた家（全国の石高の2割超え）には、周りの大きな家が自然に檄を出す（包囲網）。
import { neighbors, clanPower } from './diplomacy';
import * as R from './rules';
import { addLog, chron, amityOf, bumpAmity, clanKoku, clanName, rand, treatyOf } from './state';
import type { GameState } from './types';

export interface Coalition { id: number; leader: string; target: string; members: string[]; since: number; chief?: string }
export const GEKI = { PRESTIGE: 50, COURT: 3, GOLD: 3000, COST_PRESTIGE: 3, COOLDOWN: 12, MIN_JOIN: 2, HEGEMON: 0.2, AI_CHANCE: 0.3, LEAVE_BASE: 0.003, MAX_SEND: 8 };

const list = (s: GameState) => (s.coalitions ??= []);
export const coalitionsOf = (s: GameState, clan: string) => list(s).filter((c) => c.members.includes(clan));
export const coalitionAgainst = (s: GameState, target: string) => list(s).filter((c) => c.target === target);
// 同じ連合にいるか（攻め合わず、領内を通れる）
export const sameCoalition = (s: GameState, a: string, b: string) => !!s.coalitions?.some((c) => c.members.includes(a) && c.members.includes(b));
// 連合の標的（AIが最優先で狙う相手）。いくつかあれば国力の大きいほう
export function coalitionTarget(s: GameState, clan: string): string | null {
  const ts = coalitionsOf(s, clan).map((c) => c.target).filter((t) => s.clans[t]?.alive);
  return ts.sort((a, b) => clanPower(s, b) - clanPower(s, a))[0] ?? null;
}
// 敵方: 自分の連合の標的と、自分の連合の家を討つ連合に加わっている家
export function coalitionFoes(s: GameState, clan: string): Set<string> {
  const out = new Set<string>();
  for (const k of coalitionsOf(s, clan)) {
    out.add(k.target);
    for (const x of list(s)) if (k.members.includes(x.target) || x.target === clan) for (const m of x.members) if (!k.members.includes(m)) out.add(m);
  }
  for (const x of coalitionAgainst(s, clan)) for (const m of x.members) out.add(m);
  out.delete(clan);
  return out;
}
// 戦時から始まるシナリオの始め（s.warUntil まで）に、連合に関わる家（加わっているか、狙われている）は戦時として動く
export const atWar = (s: GameState, clan: string) => (s.warUntil ?? 0) >= s.turn && (coalitionsOf(s, clan).length > 0 || coalitionAgainst(s, clan).length > 0);
// 檄を出せるか
export function gekiBlock(s: GameState, from: string, target: string): string | null {
  const F = s.clans[from], T = s.clans[target];
  if (!T?.alive || from === target) return '相手がいない';
  if (F.prestige < GEKI.PRESTIGE && (F.court ?? 0) < GEKI.COURT) return `威信${GEKI.PRESTIGE}以上か、官位が${R.COURT[GEKI.COURT].name}以上の家だけ`;
  if (F.gold < GEKI.GOLD) return `金${GEKI.GOLD.toLocaleString()}貫が要る`;
  if (treatyOf(s, from, target)) return '同盟・婚姻を結んでいる相手には出せない';
  if (sameCoalition(s, from, target)) return '同じ連合の家には出せない';
  if (list(s).some((c) => c.target === target && c.members.includes(from))) return 'すでにこの家を討つ連合にいる';
  const t = s.gekiTried?.[`${from}|${target}`];
  if (t !== undefined && s.turn - t < GEKI.COOLDOWN) return `この家への檄は${t + GEKI.COOLDOWN - s.turn}か月後から`;
  if (s.gekiTurn?.[from] === s.turn) return '檄は月に一度';
  return null;
}
// 檄を受け取る家（標的か盟主の近くの家）
export function gekiCandidates(s: GameState, from: string, target: string): string[] {
  const near = new Set([...neighbors(s, target, R.hx(5)), ...neighbors(s, from, R.hx(4))]);
  return [...near].filter((c) => c !== from && c !== target && s.clans[c]?.alive && !treatyOf(s, c, target) && !list(s).some((k) => k.target === target && k.members.includes(c)) && !sameCoalition(s, c, target));
}
// 応じる見込み
export function gekiChance(s: GameState, cand: string, from: string, target: string): number {
  const pc = clanPower(s, cand), pt = clanPower(s, target);
  const fear = Math.min(0.25, Math.max(0, (pt / Math.max(1, pc) - 1) * 0.1));
  const border = neighbors(s, cand, R.hx(3)).has(target) ? 0.12 : 0;
  const hunted = s.clans[target].target === cand ? 0.2 : 0;
  const order = s.bakufu?.orders?.some((o) => o.target === target && o.until >= s.turn) ? 0.15 : 0; // 将軍の御内書がある
  const hegemon = clanKoku(s, target) / Math.max(1, Object.values(s.clans).reduce((t, c) => t + (c.alive ? clanKoku(s, c.id) : 0), 0)) > GEKI.HEGEMON ? 0.15 : 0;
  const pres = (s.clans[from].prestige - s.clans[cand].prestige) / 300 + (s.clans[from].court ?? 0) * 0.02;
  const p = 0.1 + (amityOf(s, cand, from) - 30) / 150 - (amityOf(s, cand, target) - 30) / 150 + fear + border + hunted + order + hegemon + pres;
  return Math.max(0.02, Math.min(0.9, p));
}
// 檄を出す。ask はプレイヤーの家へ檄が来たときに応じるか尋ねる（なければ見込みで決める）
export async function issueGeki(s: GameState, from: string, target: string, ask?: (from: string, target: string) => Promise<boolean>): Promise<{ ok: boolean; joined: string[]; refused: string[] }> {
  if (gekiBlock(s, from, target)) return { ok: false, joined: [], refused: [] };
  const F = s.clans[from];
  F.gold -= GEKI.GOLD; F.prestige = Math.max(0, F.prestige - GEKI.COST_PRESTIGE);
  (s.gekiTried ??= {})[`${from}|${target}`] = s.turn; (s.gekiTurn ??= {})[from] = s.turn;
  const joined: string[] = [], refused: string[] = [];
  // 檄が届くのは見込みの高い順に8家まで（遠くの家まで皆が応じることはない）。プレイヤーの家は近くにいれば必ず届く
  const cands = gekiCandidates(s, from, target).sort((a, b) => gekiChance(s, b, from, target) - gekiChance(s, a, from, target));
  const sent = [...new Set([...cands.slice(0, GEKI.MAX_SEND), ...cands.filter((c) => c === s.player)])];
  for (const c of sent) {
    const yes = c === s.player && !s.hero ? (ask ? await ask(from, target) : false) : rand(s) < gekiChance(s, c, from, target);
    (yes ? joined : refused).push(c);
  }
  const ok = joined.length >= GEKI.MIN_JOIN || (joined.length >= 1 && (from === s.player || joined.includes(s.player)) && joined.length + 1 >= GEKI.MIN_JOIN);
  const mine = from === s.player || target === s.player || joined.includes(s.player);
  if (!ok) { addLog(s, `${F.name}家が${clanName(s, target)}家を討つ檄を飛ばしたが、応じる家は少なかった${joined.length ? `（${joined.map((c) => clanName(s, c) + '家').join('・')}）` : ''}。`, 'info', mine); return { ok: false, joined, refused }; }
  // 同じ標的の連合がすでにあれば合わせる
  const prev = list(s).find((k) => k.target === target && k.leader === from);
  if (prev) prev.members = [...new Set([...prev.members, ...joined])];
  else list(s).push({ id: (s.coalitionSeq = (s.coalitionSeq ?? 0) + 1), leader: from, target, members: [from, ...joined], since: s.turn });
  for (const c of joined) bumpAmity(s, c, from, 10);
  for (const c of [from, ...joined]) bumpAmity(s, c, target, -15);
  addLog(s, `${F.name}家の檄に${joined.map((c) => clanName(s, c) + '家').join('・')}が応じ、${clanName(s, target)}家を討つ連合が成った。`, 'castle', true);
  if (from === s.player) chron(s, `檄を飛ばし、${joined.length}家と${clanName(s, target)}家を討つ連合を結ぶ。`);
  else if (joined.includes(s.player)) chron(s, `${F.name}家の檄に応じ、${clanName(s, target)}家を討つ連合に加わる。`);
  else if (target === s.player) chron(s, `${F.name}家の檄で、${joined.length + 1}家が当家を討つ連合を結ぶ。`);
  return { ok: true, joined, refused };
}
// 連合を抜ける（プレイヤーが自分で）
export function leaveCoalition(s: GameState, clan: string, id: number, why = '') {
  const k = list(s).find((x) => x.id === id); if (!k) return;
  k.members = k.members.filter((m) => m !== clan);
  if (clan !== k.leader) bumpAmity(s, clan, k.leader, -30);
  if (clan === s.player) s.clans[clan].prestige = Math.max(0, s.clans[clan].prestige - 5);
  addLog(s, `${clanName(s, clan)}家が${clanName(s, k.target)}家を討つ連合を${why || '抜けた'}。`, 'castle', clan === s.player || k.members.includes(s.player) || k.target === s.player);
  settle(s, k);
}
// 盟主が欠けたら最も強い家が継ぎ、二家を切れば解ける
function settle(s: GameState, k: Coalition) {
  k.members = k.members.filter((m) => s.clans[m]?.alive);
  if (!k.members.includes(k.leader)) k.leader = [...k.members].sort((a, b) => clanPower(s, b) - clanPower(s, a))[0] ?? k.leader;
  if (k.chief && (!s.generals[k.chief] || !k.members.includes(s.generals[k.chief].clan ?? '') || s.generals[k.chief].status === 'dead')) k.chief = undefined;
  if (k.members.length < 2 || !s.clans[k.target]?.alive) {
    s.coalitions = list(s).filter((x) => x !== k);
    if (s.clans[k.target]?.alive) addLog(s, `${clanName(s, k.target)}家を討つ連合は解けた。`, 'castle', k.members.includes(s.player) || k.target === s.player);
    else { addLog(s, `${clanName(s, k.target)}家が倒れ、これを討つ連合は目的を果たして解けた。`, 'castle', true); if (k.target === s.player) { /* 当家が倒れた */ } else if (k.members.includes(s.player)) chron(s, `${clanName(s, k.target)}家が倒れ、連合は目的を果たす。`); }
  }
}
// プレイヤーへ檄が届いたとき応じるか尋ねる口（UIが差し込む）
type GekiAsk = (from: string, target: string) => Promise<boolean>;
let gekiAsk: GekiAsk | undefined;
export function setGekiHook(f: GekiAsk | undefined) { gekiAsk = f; }
// 毎月: 解ける連合・抜ける家・強すぎる家への包囲網・強い敵に狙われた家の檄
export async function monthlyCoalitions(s: GameState, ask: GekiAsk | undefined = gekiAsk) {
  for (const k of [...list(s)]) {
    settle(s, k);
    if (!list(s).includes(k)) continue;
    for (const m of [...k.members]) {
      if (m === s.player || m === k.leader) continue; // 盟主は抜けない
      const leaderWeak = s.clans[k.leader].prestige < 25 ? 0.03 : 0;
      const p = GEKI.LEAVE_BASE + leaderWeak + Math.max(0, amityOf(s, m, k.target) - 55) / 400 + Math.max(0, 20 - amityOf(s, m, k.leader)) / 400;
      if (rand(s) < p) {
        const turn = amityOf(s, m, k.target) >= 55;
        leaveCoalition(s, m, k.id, turn ? '離れ、寝返った' : '離れた');
        // 寝返り: 討つはずだった家の側の連合へ加わる
        const other = turn ? list(s).find((x) => x.members.includes(k.target) && x.target !== m && !x.members.includes(m)) : undefined;
        if (other) { other.members.push(m); bumpAmity(s, m, other.leader, 10); addLog(s, `${clanName(s, m)}家は${clanName(s, other.target)}家を討つ連合に加わった。`, 'castle', other.members.includes(s.player) || other.target === s.player); }
      }
      if (!list(s).includes(k)) break;
    }
  }
  // 包囲網: 全国の石高の2割を超えた家には、周りの大きな家が檄を出す
  const total = Object.values(s.clans).reduce((t, c) => t + (c.alive ? clanKoku(s, c.id) : 0), 0);
  for (const h of Object.values(s.clans)) {
    if (!h.alive || clanKoku(s, h.id) / Math.max(1, total) <= GEKI.HEGEMON || coalitionAgainst(s, h.id).length || rand(s) > GEKI.AI_CHANCE) continue;
    const callers = [...neighbors(s, h.id, R.hx(6))].filter((c) => c !== s.player && s.clans[c]?.alive && !gekiBlock(s, c, h.id)).sort((a, b) => clanPower(s, b) - clanPower(s, a));
    if (callers[0]) await issueGeki(s, callers[0], h.id, ask);
  }
  // 自分より大きな家に攻められている家は、ときどき近隣へ助けを求める檄を出す
  for (const C of Object.values(s.clans)) {
    if (!C.alive || C.id === s.player || C.id === 'kokujin') continue;
    const foe = Object.values(s.clans).find((x) => x.alive && x.target === C.id && clanPower(s, x.id) > clanPower(s, C.id) * 1.3);
    if (foe && !coalitionAgainst(s, foe.id).length && !gekiBlock(s, C.id, foe.id) && rand(s) < 0.06) await issueGeki(s, C.id, foe.id, ask);
  }
}
// 家が滅んだ・降ったとき、連合から外す（降った家の分は勝った家が引き継がない）
export function dropFromCoalitions(s: GameState, clan: string) {
  for (const k of [...list(s)]) if (k.members.includes(clan) || k.target === clan) { k.members = k.members.filter((m) => m !== clan); settle(s, k); }
}

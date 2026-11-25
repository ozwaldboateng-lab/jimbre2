// 武将で遊ぶ（物語の外）: 浪人への誘い（スカウト）。名を上げた土地の近くの家から使者が来る。条件（身分・俸禄・支度金・配下の扱い・役目）を比べ、
// 受ける・吊り上げる（一度だけ。通れば条件が上がり、通らなければ相手が引く）・断るの一往復で返す。誘いは三か月残る。
// 家ごとに欲しい札がある（戦の家は武・戦・軍略、ほかは普請・治安・文・諜報）。札が合えば条件がよい。歳をとるほど条件が落ちる（36歳から一年に3%、半分まで）
import { joinClan } from './career';
import { HERO } from './hero';
import { hexDist } from './map';
import { fameSpots, fudaOf, type Kei } from './meisei';
import { fameOf, followersOf, isRonin, serviceRank } from './roninplay';
import * as R from './rules';
import { clanCastles, clanName, rand } from './state';
import type { GameState } from './types';

export const SASOI = { FAME_MIN: 25, P_BASE: 0.08, P_FAME: 1 / 220, RANGE: 10, KEEP: 3, MAX: 3, RAISE_P: 0.35, RAISE_RIVAL: 0.15, RAISE_FAME: 1 / 300, RAISE_MATCH: 0.1, RAISE_PAY: 1.3, RAISE_SHITAKU: 1.5, DECLINE_REL: 2, LOST_REL: 5, AGE_FROM: 35, AGE_K: 0.03, AGE_MIN: 0.5 };
export type Offer = { clan: string; rank: number; pay: number; shitaku: number; yaku: string; follow: string; until: number; match: boolean; raised?: boolean; told?: boolean }; // told: 使者の場面を見せた
type SX = { offers?: Offer[]; career?: { left?: { clan: string; turn: number } } };
const X = (s: GameState) => s.hero! as NonNullable<GameState['hero']> & SX;
const WAR_KEI: Kei[] = ['bu', 'sen', 'gun'], PEACE_KEI: Kei[] = ['fu', 'chi', 'bun', 'cho'];
const YAKU: Record<Kei, string> = { bu: '先手の侍', sen: '先手の足軽大将', gun: '軍議に列する（軍師見習い）', fu: '普請奉行', chi: '境の城番', bun: '他家への取次', cho: '物見頭' };
const ageOf = (s: GameState) => { const g = s.generals[s.hero!.id]; return s.year - (g.born ?? s.year - 30); };
export const ageFactor = (s: GameState) => Math.max(SASOI.AGE_MIN, 1 - Math.max(0, ageOf(s) - SASOI.AGE_FROM) * SASOI.AGE_K);
// 家の欲しい札: 狙う家があるか、強い敵と境を接していれば戦の札、そうでなければ治めの札
export const wants = (s: GameState, clan: string): Kei[] => (s.clans[clan].target ? WAR_KEI : PEACE_KEI);
export const offersOf = (s: GameState): Offer[] => (X(s).offers ?? []).filter((o) => o.until >= s.turn && s.clans[o.clan]?.alive && s.clans[o.clan].leader);

// 条件を作る
function makeOffer(s: GameState, clan: string): Offer {
  const fd = fudaOf(s), want = wants(s, clan), hit = fd.find((f) => want.includes(f.kei));
  const big = clanCastles(s, clan).length, af = ageFactor(s), fame = fameOf(s);
  let rank = serviceRank(s);
  if (hit && fame >= 50) rank--; // 欲しい札があり名も高ければ、一段上で迎える
  if (big >= 10 && !hit) rank++; // 大きな家は、欲しい札がなければ下から
  if (ageOf(s) > 50) rank++;
  rank = Math.max(1, Math.min(3, rank));
  const pay = Math.round((HERO.PAY[rank] ?? 50) * (1 + big / 30) * (hit ? 1.2 : 1) * af / 10) * 10;
  const shitaku = Math.round((200 + fame * 10) * (hit ? 1.5 : 1) * af / 50) * 50;
  const yaku = hit ? YAKU[hit.kei] : rank <= 1 ? '侍大将として一手を預かる' : rank === 2 ? '足軽大将として組を預かる' : '足軽組頭';
  const follow = !followersOf(s).length ? '配下はいない' : rank <= 2 ? '配下は家臣として連れて来てよい' : '配下は主家の直臣に（預け）';
  return { clan, rank, pay, shitaku, yaku, follow, until: s.turn + SASOI.KEEP, match: !!hit };
}
// 毎月（浪人の間）: 名声25から、名を上げた土地の近く（10マスほど）に城を持つ家から、誘いの使者が来ることがある
export function sasoiMonth(s: GameState): string[] {
  if (!s.hero || !isRonin(s)) return [];
  const H = X(s), fame = fameOf(s);
  H.offers = offersOf(s);
  if (fame < SASOI.FAME_MIN || H.offers.length >= SASOI.MAX) return [];
  if (rand(s) >= SASOI.P_BASE + fame * SASOI.P_FAME) return [];
  const spots = fameSpots(s); if (!spots.length) return [];
  const left = H.career?.left;
  const cands = Object.values(s.clans).filter((C) => C.alive && C.leader && !C.id.startsWith('ikki') && !H.offers!.some((o) => o.clan === C.id) && !(left && left.clan === C.id && s.turn - left.turn < 24)
    && clanCastles(s, C.id).some((c) => spots.some((p) => hexDist(s.castles[p.castle].hex, c.hex) <= R.hx(SASOI.RANGE))));
  if (!cands.length) return [];
  // 欲しい札が合う家ほど来やすい
  const fd = fudaOf(s), w = cands.map((C) => (fd.some((f) => wants(s, C.id).includes(f.kei)) ? 3 : 1));
  let r = rand(s) * w.reduce((a, b) => a + b, 0), pick = cands[0];
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) { pick = cands[i]; break; } }
  const o = makeOffer(s, pick.id); H.offers.push(o);
  return [`${clanName(s, o.clan)}家から誘いの使者が来た。${R.RANK_NAME[o.rank]}・俸禄月${o.pay}貫・支度金${o.shitaku}貫で迎えたいという（「誘い」で返事をする。${SASOI.KEEP}か月のうちに）。`];
}
// 受ける
export function acceptOffer(s: GameState, clan: string): { ok: boolean; text: string; who?: string; line?: string } {
  const o = offersOf(s).find((x) => x.clan === clan); if (!o) return { ok: false, text: 'その誘いはもうない' };
  const H = X(s), L = s.clans[clan].leader!;
  H.jun++;
  const { kept, az } = joinClan(s, clan, o.rank);
  H.gold += o.shitaku; (H as { payExtra?: number }).payExtra = Math.max(0, o.pay - (HERO.PAY[s.generals[H.id].rank] ?? 50));
  H.title = o.yaku; H.offers = [];
  return { ok: true, who: L, line: 'よう来てくれた。そなたの名、わが家で高めてみせよ。', text: `${clanName(s, clan)}家の誘いを受け、${R.RANK_NAME[s.generals[H.id].rank]}として仕えた（役目: ${o.yaku}。支度金${o.shitaku}貫・俸禄月${o.pay}貫）。${kept.length ? `配下の${kept.join('・')}は家臣に。` : ''}${az.length ? `${az.join('・')}は主家に預けた。` : ''}` };
}
// 吊り上げる（一度だけ）: 見込みは 0.35＋ほかの誘いの数×0.15＋名声÷300（札が合えば+0.1）
export const raiseChance = (s: GameState, o: Offer) => Math.min(0.9, SASOI.RAISE_P + (offersOf(s).length - 1) * SASOI.RAISE_RIVAL + fameOf(s) * SASOI.RAISE_FAME + (o.match ? SASOI.RAISE_MATCH : 0));
export function raiseOffer(s: GameState, clan: string): { ok: boolean; text: string } {
  const H = X(s), o = offersOf(s).find((x) => x.clan === clan); if (!o) return { ok: false, text: 'その誘いはもうない' };
  if (o.raised) return { ok: false, text: 'もう吊り上げた' };
  const p = raiseChance(s, o), L = s.clans[clan].leader!;
  if (rand(s) < p) {
    o.raised = true;
    if (o.rank > 1) { o.rank--; o.pay = Math.round((HERO.PAY[o.rank] ?? 50) * (o.pay / (HERO.PAY[o.rank + 1] ?? 50)) / 10) * 10; }
    else o.pay = Math.round(o.pay * SASOI.RAISE_PAY / 10) * 10;
    o.shitaku = Math.round(o.shitaku * SASOI.RAISE_SHITAKU / 50) * 50;
    return { ok: true, text: `「ほかの家からも話が来ている」と返すと、${clanName(s, clan)}家は条件を上げてきた（${R.RANK_NAME[o.rank]}・俸禄月${o.pay}貫・支度金${o.shitaku}貫）。` };
  }
  H.offers = (H.offers ?? []).filter((x) => x.clan !== clan);
  H.rel[L] = Math.max(0, (H.rel[L] ?? 0) - SASOI.LOST_REL);
  return { ok: true, text: `条件を吊り上げようとしたが、${clanName(s, clan)}家は「ならば結構」と誘いを引いた（見込み${Math.round(p * 100)}%）。` };
}
export function declineOffer(s: GameState, clan: string): { ok: boolean; text: string } {
  const H = X(s), o = offersOf(s).find((x) => x.clan === clan); if (!o) return { ok: false, text: 'その誘いはもうない' };
  H.offers = (H.offers ?? []).filter((x) => x.clan !== clan);
  const L = s.clans[clan].leader!; H.rel[L] = Math.max(0, (H.rel[L] ?? 0) - SASOI.DECLINE_REL);
  return { ok: true, text: `${clanName(s, clan)}家の誘いを断った。` };
}

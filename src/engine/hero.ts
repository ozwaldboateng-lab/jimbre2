// 武将プレイ（試作）: 大名ではなく一人の武将として生きる。家は大名のAIが動かし、プレイヤーは城下を歩き、主命を果たし、人と交わる。
// 時は旬（10日）で刻む。1か月は3旬。3旬が過ぎると、裏で大名たちの1か月が進む（ゲームの endTurn）。
// 武将は status 'hero' にして、AIの編成・城主・奉行に使われないようにする（主命・合戦はこちらで扱う）。
import { HEXES, NEIGHBORS, PROVINCES, hexDist } from './map';
import { pathTo, stepCost, type Reach } from './move';
import { storeOf } from './supply';
import { storyGuard } from './story2';
import { ieMonth } from './maeda';
import { bandits, tradeMonth } from './trade';
import { frozen } from './story5';
import { addFame, roninMonth } from './roninplay';
import { battleBoost, kashinMonth } from './kashin';
import { leadMonth } from './heroArmy';
import { upkeepMonth } from './meibutsu';
import { familyYear } from './family';
import { myHyojoMonth } from './myhyojo';
import { suisenBlock, yoriMonth } from './yorioya';
import { reward, rewardDue } from './yari';
import { HP, hpMax, hpMonth, hpOf, lv, masterRumor, spendHp } from './skill';
import { becomeRonin, chigyo, followClan, freeHero, lifeSummary, syncGovernor } from './career';
import { delegateOf } from './delegate';
import { addMerit } from './ranks';
import * as R from './rules';
import { attach, attachAuto, leaveArmy, membersOf } from './corps';
import { removeArmy } from './ops';
import { captureCastle } from './ops';
import { addLog, castleAt, castleKoku, clanCastles, clanName, garrisonMax, hostile, learnCastle, rand } from './state';
import type { Army, Castle, GameState, General } from './types';

export type QuestKind = 'fushin' | 'teisatsu' | 'choryaku' | 'shutsujin' | 'kenkin' | 'kenjo' | 'tsukaiban' | 'monomi' | 'toyo' | 'kouryaku' | 'joban' | 'negaeri' | 'zeriai'; // kenkin 献金（金を納める）・kenjo 献上（進物を納める）
export interface Quest { sub?: 'scout' | 'youchi' | 'toride'; kind: QuestKind; castle: number; need: number; done: number; until: number; ok?: boolean; note?: string; army?: number; target?: string; joined?: boolean; proxy?: string; proxyAt?: number } // proxy: 遣わした家臣 // target: 登用する浪人。joined: 攻略の軍勢に加わったか
export interface Hero {
  id: string; town: number; jun: number; gold: number; favor: number; goods: number;
  rel: Record<string, number>; met: Record<string, number>; // 親しさ（0〜100）と、最後に会った旬（turn*3+jun）
  quest: Quest | null; travel?: unknown; // travel は古い試作の名残（使わない）
  hex: number; field?: boolean; dest?: number | null; army?: number | null; joined?: number; // army: 加わっている軍勢、joined: 加わったターン // 今いるマス、野にいるか（城下でない）、旅の行き先
  diary: { turn: number; jun: number; text: string }[]; done: number; failed: number; trained: number; lastQuest?: number;
  over?: string; // 終わった（主人公の死・主家の滅亡など）。終わりの言葉
  story?: string; storyDone?: string[]; storyStart?: number; title?: string; // 物語（前田利家 ― 残り火）の第二幕: 起きた出来事・始まりの年月・肩書き
  cargo?: Record<string, import('./trade').Cargo>; glut?: Record<string, number>; // 商い: 持っている荷（産地の城の id → 数と仕入れ値）と、町ごとの値崩れ
  ie?: import('./maeda').Ie; sv?: Record<string, number>; fuchu?: number; ryo?: number[]; until?: number;
  leads?: number; order?: number; leadShu?: number; // 率いている軍勢・命じた出陣先・連れ出した手勢
  selfCommand?: boolean; // 加わった軍勢の合戦で、自分の一隊を自ら采配する（合戦の画面を開く）
  retainers?: string[]; daikan?: Record<number, string>; lent?: { army: number; shu: number; troops: number }; // 家臣団・城代・陣に連れて行った手勢
  fame?: number; kubi?: number; followers?: string[]; scouted?: Record<number, number>; merc?: { army: number; clan: string; since: number; fought: number }; // 名声（世に聞こえた名 0〜100）・首級・配下の浪人・探った国衆の城・陣借り
  wife?: { from: string; name: string; turn: number }; kids?: import('./family').Kid[]; gen?: number; wedTried?: number; heirNamed?: number; // 家族（family.ts）
  pact?: string[]; secret?: { clan: string; turn: number }; plotTried?: Record<string, number>; // 謀反の準備（plot.ts）
  orders?: Record<string, { role: import('./myhyojo').Yaku; castle: number }>; myHyojo?: number; // 自分の評定（myhyojo.ts）
  pupil?: { gid: string; k: import('./skill').SkillKey; turn: number }; // 弟子入りを願う者（その月だけ）
  gunyaku?: { clan: string; troops: number; until: number; done?: boolean }; // 領主の軍役（ryoshu.ts）
  neTried?: Record<string, number>; neOffer?: { clan: string; turn: number }; // 領主の寝返り（ryoplot.ts）
  yorioya?: string; yoriRank?: number; rival?: string; rivalAhead?: string; // 寄親と、その身分（出世を見る）・張り合う同輩・先を越された知らせ（yorioya.ts）
  ryoOrder?: import('./ryohyojo').RyoOrder; ryoHyojo?: number; ryoEv?: import('./ryohyojo').HyojoEv; // 領主の評定（ryohyojo.ts）
  azuke?: string[]; // 預け: 家臣の枠を超えて主家に預けた配下（kashin.ts）
  mode?: 'ryoshu'; out?: boolean; // out: 領主が城下に出ている（武将の画面で私事・主家との縁） // 城持ちより上: 大名の画面で自分の領を動かす（ryoshu.ts）
  hyojo?: { turn: number; cands: Quest[] }; // 評定で示された主命の候補（その月だけ）
  declined?: number; declines?: number; // 主命を断った月・続けて断った数（果たせば0に戻る）
  kaku?: number; meibutsu?: string[]; given?: string[]; chakai?: number; // 家の格・持っている名物・献上した名物・最後の茶会（meibutsu.ts）
  career?: { steps: import('./career').Step[]; since?: number; kuniAt?: number; ronin?: number; lostAt?: number; lostKuni?: boolean; left?: { clan: string; turn: number }; best?: import('./career').Step[]; served?: string[]; tried?: Record<string, number> }; // 出世の階段（物語の外）: 越えた節目と、城を預かった月 // 第二部: 前田家・物語の記録（戦の点・三つの道）・治める城（府中）・持たせる期限（年*12+月）
}
export const HERO = {
  JUN: 3, PAY: [400, 200, 100, 50], // 身分ごとの月の俸禄（宿老・侍大将・足軽大将・足軽組頭）
  QUEST_MONTHS: 3, FAVOR_OK: { fushin: 6, teisatsu: 5, choryaku: 10, shutsujin: 8, kenkin: 4, kenjo: 4, tsukaiban: 3, monomi: 4, toyo: 8, kouryaku: 12, joban: 6, negaeri: 14, zeriai: 8 }, FAVOR_NG: 8,
  MERIT: { fushin: 15, teisatsu: 12, choryaku: 25, shutsujin: 10, kenkin: 8, kenjo: 8, tsukaiban: 6, monomi: 8, toyo: 18, kouryaku: 40, joban: 15, negaeri: 45, zeriai: 18 }, PAYOUT: { fushin: 100, teisatsu: 80, choryaku: 200, shutsujin: 150, kenkin: 0, kenjo: 0, tsukaiban: 30, monomi: 50, toyo: 100, kouryaku: 300, joban: 100, negaeri: 300, zeriai: 120 },
  // 身分ごとに出る主命（宿老・侍大将・足軽大将・足軽組頭）。上の身分ほど格の高い主命、下の主命は出なくなる
  QUESTS: [['fushin', 'choryaku', 'negaeri', 'kouryaku', 'joban', 'shutsujin', 'kenkin', 'kenjo'], ['fushin', 'teisatsu', 'toyo', 'choryaku', 'kouryaku', 'joban', 'shutsujin', 'kenkin', 'kenjo'], ['fushin', 'monomi', 'tsukaiban', 'teisatsu', 'toyo', 'choryaku', 'shutsujin', 'kenkin', 'kenjo', 'zeriai'], ['fushin', 'monomi', 'tsukaiban', 'shutsujin', 'kenjo']] as QuestKind[][],
  KOURYAKU_MONTHS: 6, JOBAN_JUN: 3,
  // 献金・献上: 身分ごとの基の額（宿老〜足軽組頭）。手元の金が多いほど額が上がる（手元の3割まで、基の8倍まで）。功績と覚えは額に応じて足す
  KENKIN: [800, 400, 200, 100], KENKIN_SHARE: 0.3, KENKIN_MAX: 8, KENJO: [6, 4, 3, 2], KENJO_BUY: 2, // 献上の進物が足りなければ、市の2倍の値で調えて納める
  KENKIN_RICH: 1500, // 手元にこれ以上あると、献金の主命が出やすい // 出陣は合戦そのものの功績が別に入る
  VISIT: 8, GIFT_COST: 50, GIFT_REL: 12, GOODS_COST: 50, FRIEND: 70, TRAIN_COST: 30, TRAIN_P: 0.35, STAT_CAP: 95,
  MP: R.hx(6), // 1旬に進める道のり（平地1・森と川2・山3。部隊の一月より少し多い）
};
export const QUEST_NAME: Record<QuestKind, string> = { fushin: '普請', teisatsu: '偵察', choryaku: '調略', shutsujin: '出陣', kenkin: '献金', kenjo: '献上', tsukaiban: '使い番', monomi: '物見', toyo: '登用', kouryaku: '攻略', joban: '城番', negaeri: '寝返り', zeriai: '小競り合い' };

// 身分ごとに率いられる兵の上限（足軽組頭・足軽大将・侍大将・宿老）。城持ち・国持ち・方面軍団長で上乗せ
export const HEI = { CAP: [5000, 2500, 1000, 300], SHIRO: 1000, KUNI: 2000, HOMEN: 3000 };
export function heiCap(s: GameState): number {
  const me = heroOf(s); if (!me) return 0;
  const st = s.hero!.career?.steps ?? [];
  return (HEI.CAP[me.rank] ?? 300) + (st.includes('homen') ? HEI.HOMEN : st.includes('kuni') ? HEI.KUNI : st.includes('shiro') ? HEI.SHIRO : 0);
}
export const heroOf = (s: GameState) => (s.hero ? s.generals[s.hero.id] : null);
export const lordOf = (s: GameState) => { const g = heroOf(s); const l = g?.clan ? s.clans[g.clan].leader : null; return l ? s.generals[l] : null; };
export const nowJun = (s: GameState) => s.turn * 3 + (s.hero?.jun ?? 0);
export const JUN_NAME = ['上旬', '中旬', '下旬'];

export function startHero(s: GameState, id: string) {
  const g = s.generals[id];
  // 浪人から始める時は、世の中の月の処理を一番大きな家の側から回す（遊び手の家は持たない）
  s.player = g.clan ?? Object.values(s.clans).filter((c) => c.alive && clanCastles(s, c.id).length).sort((a, b) => clanCastles(s, b.id).length - clanCastles(s, a.id).length)[0].id;
  // 家の政はみな大名（AI）が行う
  const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true;
  // 部隊・城主・奉行から外し、城下に立つ
  for (const a of Object.values(s.armies)) { if (a.main === id) { const st = (a.staff ?? []).shift(); if (st) a.main = st; } a.staff = (a.staff ?? []).filter((x) => x !== id); }
  for (const a of Object.values(s.camps ?? {})) { a.staff = (a.staff ?? []).filter((x) => x !== id); }
  for (const c of s.castles) if (c.governor === id) c.governor = null;
  g.status = 'hero'; g.army = null;
  s.hero = { id, town: g.loc, hex: s.castles[g.loc].hex, field: false, dest: null, jun: 0, gold: 200, favor: 30, goods: 0, rel: {}, met: {}, quest: null, diary: [], done: 0, failed: 0, trained: 0 };
  note(s, `${g.name}、${s.castles[g.loc].name}の城下にあり。主君${lordOf(s)?.name ?? ''}に仕える${R.RANK_NAME[g.rank]}。`);
}
export function note(s: GameState, text: string) { const H = s.hero!; H.diary.push({ turn: s.turn, jun: H.jun, text }); if (H.diary.length > 300) H.diary.shift(); }

// 城下にあるもの（城の大きさと土地柄で決まる）
export type Spot = 'tojo' | 'yashiki' | 'chaya' | 'ichi' | 'dojo' | 'tera' | 'tabi' | 'nanban';
export const SPOT_NAME: Record<Spot, string> = { tojo: '登城', yashiki: '屋敷を訪ねる', chaya: '茶屋', ichi: '市', dojo: '道場', tera: '寺', tabi: '旅に出る', nanban: '南蛮屋' };
export function spotsOf(s: GameState, c: Castle): Spot[] {
  const big = castleKoku(c) >= 12;
  const out: Spot[] = [];
  if (lordOf(s)?.loc === c.i) out.push('tojo');
  out.push('yashiki', 'chaya');
  if (big || c.id === 'kyo' || c.id === 'kishiwada') out.push('ichi');
  // 道場と寺は大きな城下だけ（18万石以上か、12万石以上の大名の居城）。寺は京・石山・金沢・信貴山の寺町にも
  const great = castleKoku(c) >= 18 || (big && Object.values(s.clans).some((x) => x.alive && x.leader && s.generals[x.leader]?.loc === c.i));
  if (great) out.push('dojo');
  if (great || ['kyo', 'ishiyama', 'kanazawa', 'shigisan'].includes(c.id)) out.push('tera');
  if (['funai', 'hirado', 'kishiwada', 'kyo'].includes(c.id)) out.push('nanban');
  out.push('tabi');
  return out;
}
// この町にいる武将（会える者）
export function townsfolk(s: GameState, ci: number): General[] {
  const H = s.hero!;
  return Object.values(s.generals).filter((g) => g.id !== H.id && g.loc === ci && (g.status === 'free' || g.status === 'governor' || g.status === 'bugyo' || g.status === 'tsukai' || g.status === 'camp' || g.status === 'ronin' || g.status === 'kashin'));
}
const relOf = (s: GameState, id: string) => s.hero!.rel[id] ?? 0;
// 縁の段階: 初対面・顔見知り(10)・知己(30)・懇意(50)・友(70。家中なら謀反に誘える)・刎頸の友(90)
export const RELNAME = (v: number) => (v >= 90 ? '刎頸の友' : v >= HERO.FRIEND ? '友' : v >= 50 ? '懇意' : v >= 30 ? '知己' : v >= 10 ? '顔見知り' : '初対面');
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

// ───────── 旬ごとの行い（どれも1旬を使う。戻り値は画面に出す言葉） ─────────
export interface Act { ok: boolean; text: string; who?: string; line?: string; offer?: boolean } // offer: 主命を申し付けられた（承るか断るかを選ぶ）
const used = (s: GameState, hp: number = HP.ACT) => { s.hero!.jun++; spendHp(s, hp); }; // 旬を使う（体力も減る。休めば戻る）

export function visit(s: GameState, gid: string): Act {
  const H = s.hero!, me = heroOf(s)!, g = s.generals[gid];
  const sameArmy = me.army !== null && g.army === me.army;
  if (!sameArmy && (H.field || g.loc !== H.town)) return { ok: false, text: 'その人はここにいない' };
  const first = !H.rel[gid];
  const same = g.clan === me.clan;
  const gain = Math.round(HERO.VISIT + me.cha / 15 + (same ? 2 : 0) + rand(s) * 6 - (H.met[gid] !== undefined && nowJun(s) - H.met[gid] < 3 ? 6 : 0)); // 続けて訪ねると少ない
  H.rel[gid] = clamp(relOf(s, gid) + Math.max(1, gain));
  H.met[gid] = nowJun(s);
  const line = talk(s, g, first);
  bondUp(s, g);
  used(s);
  return { ok: true, who: gid, line, text: `${g.name}の屋敷を訪ねた。（${RELNAME(H.rel[gid])} ${H.rel[gid]}）` };
}
export function giveGift(s: GameState, gid: string): Act {
  const H = s.hero!, g = s.generals[gid];
  if (g.loc !== H.town) return { ok: false, text: 'その人はこの町にいない' };
  if (H.goods < 1 && H.gold < HERO.GIFT_COST) return { ok: false, text: `進物がなく、金も${HERO.GIFT_COST}貫に足りない` };
  if (H.goods > 0) H.goods--; else H.gold -= HERO.GIFT_COST;
  H.rel[gid] = clamp(relOf(s, gid) + HERO.GIFT_REL + Math.round(rand(s) * 6));
  H.met[gid] = nowJun(s);
  bondUp(s, g);
  used(s);
  return { ok: true, who: gid, line: pickLine(s, GIFT_LINE), text: `${g.name}に進物を贈った。（${RELNAME(H.rel[gid])} ${H.rel[gid]}）` };
}
function bondUp(s: GameState, g: General) {
  const me = heroOf(s)!, v = relOf(s, g.id);
  if (v < HERO.FRIEND || (me.bonds ?? []).some((b) => b.id === g.id)) return;
  (me.bonds ??= []).push({ id: g.id, kind: 'friend' });
  (g.bonds ??= []).push({ id: me.id, kind: 'friend' });
  note(s, `${g.name}と友の契りを結んだ。`);
}
export function buyGoods(s: GameState): Act {
  const H = s.hero!;
  if (H.gold < HERO.GOODS_COST) return { ok: false, text: `金が${HERO.GOODS_COST}貫に足りない` };
  H.gold -= HERO.GOODS_COST; H.goods++;
  used(s);
  return { ok: true, text: `市で進物（反物と酒）を買い求めた。手元の進物 ${H.goods}。` };
}
export function train(s: GameState, kind: 'dojo' | 'tera'): Act {
  const H = s.hero!, me = heroOf(s)!;
  if (H.gold < HERO.TRAIN_COST) return { ok: false, text: `謝礼の${HERO.TRAIN_COST}貫が足りない` };
  H.gold -= HERO.TRAIN_COST; used(s, HP.TRAIN);
  const stats: ('bra' | 'lea' | 'int' | 'cha')[] = kind === 'dojo' ? ['bra', 'lea'] : ['int', 'cha'];
  const st = stats[rand(s) < 0.5 ? 0 : 1];
  const NAME = { bra: '武勇', lea: '統率', int: '知略', cha: '魅力' };
  if (me[st] < HERO.STAT_CAP && rand(s) < HERO.TRAIN_P) { me[st]++; H.trained++; return { ok: true, text: `${kind === 'dojo' ? '道場で汗を流した' : '寺で書を読み、僧と語らった'}。${NAME[st]}が上がった（${me[st]}）。` }; }
  return { ok: true, text: `${kind === 'dojo' ? '道場で汗を流した' : '寺で書を読んだ'}が、手応えはまだない。` };
}
export function rumor(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, c = s.castles[H.town];
  used(s);
  const parts: string[] = [];
  if (c.owner && c.owner !== me.clan) { learnCastle(s, c.i, me.clan!); parts.push(`この${c.name}には兵がおよそ${Math.round(c.garrison / 100) * 100}、蔵の米は${storeOf(c) >= 1000 ? Math.round(storeOf(c) / 1000) + '千石ほど' : '乏しい'}らしい`); }
  const near = Object.values(s.clans).filter((x) => x.alive && x.id !== me.clan && clanCastles(s, x.id).some((k) => hexDist(k.hex, c.hex) <= R.hx(8)));
  const x = near[Math.floor(rand(s) * near.length)];
  if (x) parts.push(`${x.name}家は${x.stance === '攻勢' ? '戦支度を急いでいる' : x.stance === '守勢' ? '守りを固めている' : '静かにしている'}${x.target ? `。${clanName(s, x.target)}家を狙っているとか` : ''}`);
  const news = s.log.filter((l) => l.turn >= s.turn - 1 && (l.kind === 'battle' || l.kind === 'castle')).slice(-6);
  const n = news[Math.floor(rand(s) * news.length)];
  if (n) parts.push(`噂では、${n.text.replace(/。$/, '')}`);
  if (s.hero!.story !== 'toshiie' && rand(s) < 0.6) { const m = masterRumor(s, c.i, () => rand(s), R.hx(12), hexDist); if (m) parts.push(m); } // 名人の居所
  if (s.hero!.story !== 'toshiie') { // 浪人の居所（近く hx(10) 以内の、名の聞こえた者から二人まで）
    const rs = Object.values(s.generals).filter((g) => g.status === 'ronin' && !g.ikki && g.loc !== c.i && hexDist(s.castles[g.loc].hex, c.hex) <= R.hx(10)).sort((a, b) => (b.bra + b.int + b.lea + b.cha) - (a.bra + a.int + a.lea + a.cha)).slice(0, 2);
    if (rs.length) parts.push(`浪人なら、${rs.map((g) => `${s.castles[g.loc].name}の城下に${g.name}がいる`).join('。')}と聞く`);
  }
  return { ok: true, text: `茶屋で旅人の話に耳を傾けた。${parts.length ? parts.map((p) => `「${p}」`).join('') : '目ぼしい話はなかった。'}` };
}
export function rest(s: GameState): Act { used(s, -HP.REST); return { ok: true, text: `体を休めた（体力${hpOf(s)}／${hpMax(s)}）。` }; }

// 旅: 日本地図の上を、部隊の移動と同じく地形の重さで進む。1旬に HERO.MP まで。城のマスに止まればその城下に入る（他国の城下にも入れる）
// 遠い所を選べば、その道筋を1旬ぶん進み、行き先を覚えておく（続けて進める）
function search(s: GameState, from: number, limit = Infinity): Reach {
  const cost = new Map<number, number>([[from, 0]]), prev = new Map<number, number>();
  const open: [number, number][] = [[0, from]];
  while (open.length) {
    open.sort((x, y) => x[0] - y[0]);
    const [c, i] = open.shift()!;
    if (c > (cost.get(i) ?? Infinity)) continue;
    for (const j of NEIGHBORS[i]) {
      const nc = c + stepCost(i, j);
      if (nc > limit) continue;
      if (nc < (cost.get(j) ?? Infinity)) { cost.set(j, nc); prev.set(j, i); open.push([nc, j]); }
    }
  }
  return { cost, prev };
}
// 1旬で行ける所（地図に明るく出す）
export function heroReach(s: GameState): Reach { const r = search(s, s.hero!.hex, HERO.MP); r.cost.delete(s.hero!.hex); return r; }
const placeName = (s: GameState, hex: number) => { const c = castleAt(s, hex); return c ? `${c.name}の城下` : `${PROVINCES[HEXES[hex].p].name}の野`; };
// 今いる所から各マスまでの道のりの重さ（城の一覧に旬のおよそを出す）
export const costMap = (s: GameState) => search(s, s.hero!.hex).cost;
// 行き先までの旬のおよそ
export function junTo(s: GameState, hex: number) { const r = search(s, s.hero!.hex); const c = r.cost.get(hex); return c === undefined ? null : Math.max(1, Math.ceil(c / HERO.MP)); }
export function moveTo(s: GameState, dest: number): Act {
  const H = s.hero!, me = heroOf(s)!;
  if (H.army !== null && H.army !== undefined) return { ok: false, text: '陣中では勝手に動けない（軍勢とともに進む。離れるなら「陣を離れる」）' };
  if (dest === H.hex) return { ok: false, text: 'すでにここにいる' };
  const r = search(s, H.hex);
  const path = pathTo(r, H.hex, dest);
  if (path.length < 2) return { ok: false, text: 'そこへは行けない' };
  let spent = 0, at = H.hex;
  for (const h of path.slice(1)) { const c = stepCost(at, h); if (spent + c > HERO.MP) break; spent += c; at = h; }
  if (at === H.hex) return { ok: false, text: '険しくて進めない' };
  H.hex = at;
  const c = castleAt(s, at);
  if (c) { H.town = c.i; H.field = false; me.loc = c.i; } else H.field = true;
  H.dest = at === dest ? null : dest;
  used(s, HP.TRAVEL);
  const rob = bandits(s); if (rob) note(s, rob);
  if (!H.dest) { if (c) note(s, `${c.name}の城下に着いた。`); return { ok: true, text: (c ? `${c.name}の城下に着いた。` : `${placeName(s, at)}で足を止めた。`) + (rob ?? '') }; }
  const left = junTo(s, dest);
  return { ok: true, text: `${placeName(s, dest)}を目指して、${placeName(s, at)}まで進んだ（あと${left ?? '?'}旬ほど）。${rob ?? ''}` };
}
export const goOn = (s: GameState): Act => (s.hero!.dest !== null && s.hero!.dest !== undefined ? moveTo(s, s.hero!.dest) : { ok: false, text: '行き先がない' });
export const inField = (s: GameState) => !!s.hero!.field;

// ───────── 陣（味方の軍勢に加わって戦に出る） ─────────
const placeOf = (s: GameState, hex: number) => { const c = castleAt(s, hex); return c ? c.name : `${PROVINCES[HEXES[hex].p].name}の野`; };
// 今いるマスにいる味方の軍勢（加われる）
export function armiesHere(s: GameState): Army[] {
  const H = s.hero!, me = heroOf(s)!;
  if (H.army !== null && H.army !== undefined) return [];
  return Object.values(s.armies).filter((a) => a.clan === me.clan && a.hex === H.hex && !a.ikki && !a.routed && a.main !== me.id);
}
export const inArmy = (s: GameState) => { const H = s.hero!; return H.army !== null && H.army !== undefined ? s.armies[H.army] ?? null : null; };
function followArmy(s: GameState, a: Army) {
  const H = s.hero!, me = heroOf(s)!;
  H.hex = a.hex; H.dest = null;
  const c = castleAt(s, a.hex);
  if (c) { H.town = c.i; H.field = false; } else H.field = true;
  me.loc = c?.i ?? me.loc;
}
export function joinArmy(s: GameState, id: number): Act {
  const H = s.hero!, me = heroOf(s)!, a = s.armies[id];
  if (!a || a.hex !== H.hex || a.clan !== me.clan) return { ok: false, text: 'その軍勢はここにいない' };
  // 主将の下へ（枠と身分が合えば軍団の決まりどおり、合わなければ主将の直下に）
  me.status = 'free';
  if (!attachAuto(s, a, me)) attach(s, a, a.main, me);
  H.army = a.id; H.joined = s.turn; H.dest = null;
  // 手勢を連れて加わる（家臣の統率で士気も上がる）
  const shu = H.story !== 'toshiie' ? Math.min(H.ie?.shu ?? 0, heiCap(s)) : 0; // 連れて行く手勢は、身分の兵の上限まで
  if (shu > 0) { a.troops += shu; H.lent = { army: a.id, shu, troops: a.troops }; H.ie!.shu -= shu; }
  const boost = battleBoost(s) + lv(s, 'yari') * 0.02; if (boost > 0) a.morale = Math.min(1.5, a.morale + boost);
  followArmy(s, a);
  used(s);
  const L = s.generals[a.main];
  note(s, `${L.name}の軍勢（兵${a.troops.toLocaleString()}）に加わった。`);
  return { ok: true, who: L.id, line: pickLine(s, JOIN_LINE), text: `${L.name}の軍勢に加わった。兵${a.troops.toLocaleString()}。合戦はこの軍勢とともに戦う（勝てば功績が入る）。` };
}
export function leaveCamp(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, a = inArmy(s);
  if (!a) return { ok: false, text: '陣にいない' };
  const sick = (me.sick ?? 0) > 0; // 病なら、敵が近くても後送される
  if (!sick && Object.values(s.armies).some((x) => hostile(s, me.clan!, x.clan) && hexDist(x.hex, a.hex) <= 2)) return { ok: false, text: '敵が近く、陣を離れれば逃げたと見なされる' };
  if (!leaveArmy(s, me)) removeArmy(s, a);
  H.army = null; me.army = null; me.boss = undefined; me.status = 'hero';
  const back = returnLent(s);
  used(s);
  note(s, `${placeOf(s, H.hex)}で陣を離れた。`);
  if (sick) { const c = sickBack(s); return { ok: true, text: `病の身で陣を離れ、${c ? `${c.name}の城下へ下がった` : '野で養生する'}。${back.join('')}休んで治す。` }; }
  return { ok: true, text: `陣を離れた。${back.join('')}${H.field ? '野にいる。旅を続けよ。' : `${s.castles[H.town].name}の城下にいる。`}` };
}
// 病で陣を離れた時: 近くの自家の城下へ下がる（野に出たまま動けなくならないように）
export function sickBack(s: GameState): Castle | null {
  const H = s.hero!, me = heroOf(s)!;
  const own = s.castles.filter((c) => c.owner && c.owner === me.clan).sort((x, y) => hexDist(x.hex, H.hex) - hexDist(y.hex, H.hex))[0];
  if (!own) return null;
  H.town = own.i; H.hex = own.hex; H.field = false; H.dest = null; me.loc = own.i;
  return own;
}
// 陣に連れて行った手勢を家へ戻す（軍勢が減っていれば、その割合で）。軍勢が消えていれば多くを失う
function returnLent(s: GameState): string[] {
  const H = s.hero!, L = H.lent;
  if (!L || !H.ie) return [];
  const a = s.armies[L.army];
  if (a && H.army === L.army) return []; // まだ陣中
  const back = a ? Math.round(L.shu * Math.max(0, Math.min(1, a.troops / L.troops))) : Math.round(L.shu * 0.3);
  if (a) a.troops = Math.max(1, a.troops - back);
  H.ie.shu += back; H.lent = undefined;
  return [`陣に連れて行った手勢が戻った（${back}／${L.shu}人）。`];
}
export function campWait(s: GameState): Act {
  const a = inArmy(s);
  used(s, HP.CAMP);
  return { ok: true, text: a ? `陣中で過ごした。兵${a.troops.toLocaleString()}、士気${a.morale.toFixed(2)}。${a.fought === s.turn ? 'この月、合戦があった。' : ''}` : '陣中で過ごした。' };
}
// 陣中の顔ぶれ（訪ねられる）
export function comrades(s: GameState): General[] {
  const a = inArmy(s), me = heroOf(s)!;
  return a ? membersOf(a).map((id) => s.generals[id]).filter((g) => g && g.id !== me.id) : [];
}
// 出陣の主命: 加わった軍勢が、加わってから合戦をしたら果たした
function checkShutsujin(s: GameState) {
  const H = s.hero!, q = H.quest;
  if (!q || q.kind !== 'shutsujin' || q.done >= q.need) return;
  const a = q.army !== undefined ? s.armies[q.army] ?? s.camps?.[q.army] : undefined;
  if (H.army === q.army && a?.fought !== undefined && a.fought >= (H.joined ?? Infinity)) { q.done = q.need; q.ok = true; q.note = `${s.generals[a.main]?.name ?? ''}の軍勢とともに戦った。`; note(s, '出陣の主命を果たした。登城して報告せよ。'); }
}
const JOIN_LINE = ['よう来た。戦は近いぞ。遅れを取るな。', '頼もしい。そなたの隊は、わしの脇を固めよ。', '槍の数は一本でも多いほうがよい。存分に働け。'];

// ───────── 主命 ─────────
export function questBlock(s: GameState): string | null {
  const H = s.hero!, L = lordOf(s);
  if (!L) return '主君がいない';
  if (H.field || L.loc !== H.town) return `主君${L.name}は${s.castles[L.loc].name}にいる`;
  return null;
}
// 登城: 主命を受けるか、果たした主命を報告する
export function tojo(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, L = lordOf(s)!;
  const b = questBlock(s); if (b) return { ok: false, text: b };
  used(s);
  if (H.story !== 'toshiie' && rewardDue(s)) { H.jun--; return reward(s, L.id); } // 論功行賞（旬は使わない。続けて登城すれば評定や報告）
  const q = H.quest;
  if (q && q.done >= q.need) {
    // 報告
    const ok = q.ok !== false;
    if (ok) {
      // 献金・献上は納めた額に応じて功績と覚えを足す（額の平方根で緩やかに。金で出世を買えないように）
      const extra = q.kind === 'kenkin' ? Math.floor(Math.sqrt(q.need / 100)) : q.kind === 'kenjo' ? Math.floor(Math.sqrt(q.need)) : 0;
      const merit = HERO.MERIT[q.kind] + extra * 4, favor = HERO.FAVOR_OK[q.kind] + extra * 2;
      addMerit(s, me.id, merit); H.favor = clamp(H.favor + favor); H.gold += HERO.PAYOUT[q.kind]; H.done++; addFame(s, q.kind === 'choryaku' || q.kind === 'shutsujin' ? 2 : 1);
      note(s, `主命（${QUEST_NAME[q.kind]}・${s.castles[q.castle].name}）を果たし、${L.name}に報告した。${HERO.PAYOUT[q.kind] ? `褒美に金${HERO.PAYOUT[q.kind]}貫。` : ''}`);
      H.quest = null; H.declines = 0;
      return { ok: true, who: L.id, line: pickLine(s, PRAISE[q.kind]), text: `主命の首尾を申し上げた。功績+${merit}、主君の覚え+${favor}${HERO.PAYOUT[q.kind] ? `、金+${HERO.PAYOUT[q.kind]}貫` : ''}。${q.note ?? ''}` };
    }
    H.favor = clamp(H.favor - 3); H.failed++; H.quest = null;
    note(s, `主命（${QUEST_NAME[q.kind]}）は不首尾に終わったと報告した。`);
    return { ok: true, who: L.id, line: pickLine(s, SCOLD), text: `不首尾を報告した。主君の覚え−3。${q.note ?? ''}` };
  }
  if (q) return { ok: true, who: L.id, line: `${QUEST_NAME[q.kind]}の件、${s.castles[q.castle].name}の首尾はいかがした。期日は${monthsLeft(s, q)}か月のうちぞ。`, text: '主君に目通りした。' };
  if (H.story !== 'toshiie') { // 物語の外: 主命は月の上旬の評定で、候補から選んで受ける
    if (H.declined === s.turn) return { ok: true, who: L.id, line: '今月の評定は済んだ。……次の評定に出よ。', text: '主君に目通りした。' };
    if (H.hyojo && H.hyojo.turn === s.turn) { H.jun--; return { ok: true, offer: true, who: L.id, line: 'まだ決めておらぬのか。……どれを受ける。', text: `評定の主命の候補が${H.hyojo.cands.length}つ。一つを選んで受けるか、断る。` }; }
    if (H.jun - 1 !== 0) { H.jun--; return { ok: false, text: `評定は月の上旬に開かれる（いまは${JUN_NAME[H.jun]}）。上旬に登城すれば主命を選べる。` }; }
    const cs = questChoices(s);
    if (!cs.length) return { ok: true, who: L.id, line: '今は申し付けることはない。腕を磨いておけ。', text: '評定に出た。' };
    H.hyojo = { turn: s.turn, cands: cs };
    return { ok: true, offer: true, who: L.id, line: '皆、揃ったな。……この月の差配を申し付ける。望む役目を申してみよ。', text: `評定に出た。主命の候補が${cs.length}つ。一つを選んで受けるか、断る。` };
  }
  const nq = H.declined === s.turn ? null : makeQuest(s); // 断った月は、もう申し付けない
  if (!nq) return { ok: true, who: L.id, line: '今は申し付けることはない。腕を磨いておけ。', text: '主君に目通りした。' };
  H.quest = nq;
  note(s, `主命を受けた: ${questText(s, nq)}`);
  return { ok: true, offer: true, who: L.id, line: ORDER_LINE[nq.kind].replace('{castle}', s.castles[nq.castle].name), text: `主命を申し付けられた。${questText(s, nq)}` };
}
// 評定で候補から主命を選んで受ける
export const HYOJO = { CHOICES: 3 };
export function chooseQuest(s: GameState, i: number): Act {
  const H = s.hero!, L = lordOf(s), hy = H.hyojo;
  if (!hy || hy.turn !== s.turn || !hy.cands[i] || !L) return { ok: false, text: '評定は済んだ' };
  const q = hy.cands[i];
  H.quest = q; H.lastQuest = q.castle; H.hyojo = undefined;
  note(s, `評定で主命を受けた: ${questText(s, q)}`);
  return { ok: true, who: L.id, line: ORDER_LINE[q.kind].replace('{castle}', s.castles[q.castle].name), text: `主命を受けた。${questText(s, q)}` };
}
// 申し付けられたばかりの主命を断る: 覚えが下がる（続けて断るほど重い）。その月はもう申し付けられない
export const DECLINE = { FAVOR: 3, STEP: 3, MAX: 15 };
export function declineQuest(s: GameState): Act {
  const H = s.hero!, L = lordOf(s), q = H.quest;
  const fromHyojo = !!H.hyojo && H.hyojo.turn === s.turn;
  if (!fromHyojo && (!q || q.done > 0 || q.joined)) return { ok: false, text: '断れる主命はない' };
  if (!L) return { ok: false, text: '主君がいない' };
  const n = (H.declines ?? 0), loss = Math.min(DECLINE.MAX, DECLINE.FAVOR + n * DECLINE.STEP);
  const what = fromHyojo ? '評定の主命' : `主命（${QUEST_NAME[q!.kind]}・${s.castles[q!.castle].name}）`;
  if (fromHyojo) H.hyojo = undefined; else H.quest = null; H.declined = s.turn; H.declines = n + 1;
  H.favor = clamp(H.favor - loss);
  note(s, `${what}を断った。主君の覚え−${loss}。`);
  const line = n === 0 ? '……そうか。ならば他の者に申し付ける。' : n === 1 ? 'また断るか。……わしの命は、そんなに軽いか。' : '下がれ。しばらく顔を見せるな。';
  return { ok: true, who: L.id, line, text: `主命を断った。主君の覚え−${loss}${n ? '（続けて断ったので重い）' : ''}。今月はもう主命は出ない。` };
}
const monthsLeft = (s: GameState, q: Quest) => Math.max(0, q.until - s.turn);
export function questText(s: GameState, q: Quest) {
  const c = s.castles[q.castle];
  const own = c.owner ? `${clanName(s, c.owner)}家の` : '';
  if (q.kind === 'kenkin') return `${c.name}へ金${q.need}貫を納めよ（${c.name}の城下で、主命を果たす）。`;
  if (q.kind === 'kenjo') return `${c.name}へ進物${q.need}つを献上せよ（足りなければ金で調える。1つ${HERO.GOODS_COST * HERO.KENJO_BUY}貫）。`;
  if (q.kind === 'tsukaiban') return `${c.name}の城代へ主君の文を届けよ。`;
  if (q.kind === 'monomi') return `${c.name}へ出向き、近くの敵の様子を見てまいれ。`;
  if (q.kind === 'zeriai') { const foe = q.target ? `${clanName(s, q.target)}家の` : '敵の'; return q.sub === 'scout' ? `${c.name}から手勢を連れて出て、${foe}陣の奥まで物見をしてまいれ（盤で、敵の端まで行き着く）。` : q.sub === 'youchi' ? `${c.name}の近くの${foe}砦へ夜討ちをかけよ（盤で、砦の敵を討ち払う）。` : `${c.name}の出城に寄せる${foe}兵から、砦を守れ（盤で、持ちこたえる）。`; }
  if (q.kind === 'toyo') { const g = q.target ? s.generals[q.target] : null; return g ? `${c.name}の城下にいる浪人・${g.name}を口説き、召し抱えよ。` : '口説くはずの浪人は、もういない。'; }
  if (q.kind === 'kouryaku') return `${own}${c.name}の攻略に加われ。軍勢に加わり、${monthsLeft(s, q)}か月のうちに城を落とせ。`;
  if (q.kind === 'joban') return `${c.name}の城番を務め、守りを固めよ（${q.need}旬）。`;
  if (q.kind === 'negaeri') { const g = c.governor ? s.generals[c.governor] : null; return `${own}${c.name}の${g ? `城主・${g.name}` : '城の者'}に内応を持ちかけよ。`; }
  if (q.kind === 'shutsujin') { const a = q.army !== undefined ? s.armies[q.army] : undefined; return a ? `${s.generals[a.main]?.name ?? ''}の軍勢（いま${placeOf(s, a.hex)}）に加わり、戦で手柄を立てよ。` : '加わるはずの軍勢はもう陣を払った。'; }
  return q.kind === 'fushin' ? `${c.name}へ出向き、普請を差配せよ（${q.need}旬）。` : q.kind === 'teisatsu' ? `${own}${c.name}の城下に入り、城の様子を探れ。` : !c.owner ? `国衆の${c.name}に入り込み、こちらへ寝返らせよ。` : `${own}${c.name}に入り込み、城兵を切り崩せ。`;
}
function questPool(s: GameState): Quest[] {
  const me = heroOf(s)!, clan = me.clan!, C = s.clans[clan];
  const mine = clanCastles(s, clan);
  const foes = s.castles.filter((c) => c.owner && hostile(s, clan, c.owner) && mine.some((m) => hexDist(m.hex, c.hex) <= R.hx(6)));
  const tgt = foes.filter((c) => c.owner === C.target);
  const pool: Quest[] = [];
  const until = s.turn + HERO.QUEST_MONTHS;
  const weak = mine.filter((c) => c.i !== lordOf(s)?.loc).sort((a, b) => a.chian - b.chian || a.garrison / garrisonMax(a) - b.garrison / garrisonMax(b));
  const last = s.hero!.lastQuest;
  const fw = weak.filter((c) => c.i !== last).slice(0, 3);
  if (fw.length) pool.push({ kind: 'fushin', castle: fw[Math.floor(rand(s) * fw.length)].i, need: 2, done: 0, until });
  const near = (tgt.length ? tgt : foes).sort((a, b) => Math.min(...mine.map((m) => hexDist(m.hex, a.hex))) - Math.min(...mine.map((m) => hexDist(m.hex, b.hex))));
  if (near[0]) pool.push({ kind: 'teisatsu', castle: near[0].i, need: 1, done: 0, until });
  if (near[0] && R.RANK_NAME[me.rank] && me.rank <= 2) pool.push({ kind: 'choryaku', castle: near[Math.min(near.length - 1, 1)].i, need: 1, done: 0, until });
  // 出陣: 家が攻勢で、地図に出ている味方の軍勢があれば（戦の前に加わる）
  const fieldArmies = Object.values(s.armies).filter((a) => a.clan === clan && !a.ikki && !a.routed && a.main !== me.id && s.generals[a.main]?.status !== 'dead');
  if (fieldArmies.length && (C.stance === '攻勢' || C.target)) {
    const a = fieldArmies.sort((x, y) => y.troops - x.troops)[0];
    const near = mine.sort((x, y) => hexDist(x.hex, a.hex) - hexDist(y.hex, a.hex))[0];
    if (near) { pool.push({ kind: 'shutsujin', castle: near.i, need: 1, done: 0, until, army: a.id }); pool.push(pool[pool.length - 1]); } // 戦のときは出陣の主命が出やすい
  }
  // 使い番・物見（下の身分）: 自家の城へ文を届ける・境の城から敵を見る
  const others = mine.filter((c) => c.i !== lordOf(s)?.loc);
  if (others.length) pool.push({ kind: 'tsukaiban', castle: others[Math.floor(rand(s) * others.length)].i, need: 1, done: 0, until });
  const border = others.filter((c) => foes.some((f) => hexDist(f.hex, c.hex) <= R.hx(5))).sort((a, b) => Math.min(...foes.map((f) => hexDist(f.hex, a.hex))) - Math.min(...foes.map((f) => hexDist(f.hex, b.hex))));
  if (border[0]) { pool.push({ kind: 'monomi', castle: border[0].i, need: 1, done: 0, until }); pool.push({ kind: 'joban', castle: border[0].i, need: HERO.JOBAN_JUN, done: 0, until }); }
  // 小競り合い（足軽大将）: 境の城から、物見・夜討ち・砦の守りのどれか（槍働きの盤で果たす）
  if (border[0] && me.rank === 2) { const subs = ['scout', 'youchi', 'toride'] as const; pool.push({ kind: 'zeriai', castle: border[0].i, need: 1, done: 0, until, sub: subs[Math.floor(rand(s) * 3)], target: foes.sort((a, b) => hexDist(a.hex, border[0].hex) - hexDist(b.hex, border[0].hex))[0]?.owner ?? undefined }); }
  // 登用: 近くの城下の浪人を口説く
  const here = s.castles[s.hero!.town];
  const ronins = Object.values(s.generals).filter((g) => g.status === 'ronin' && !s.hero!.followers?.includes(g.id) && hexDist(s.castles[g.loc].hex, here.hex) <= R.hx(10)).sort((a, b) => (b.bra + b.int + b.lea) - (a.bra + a.int + a.lea));
  if (ronins[0]) pool.push({ kind: 'toyo', castle: ronins[0].loc, need: 1, done: 0, until, target: ronins[0].id });
  // 国衆の調略（足軽大将から）: 持ち主のない近くの城を寝返らせる
  const kuni = s.castles.filter((c) => !c.owner && mine.some((m) => hexDist(m.hex, c.hex) <= R.hx(6)));
  if (kuni[0] && me.rank === 2) pool.push({ kind: 'choryaku', castle: kuni[0].i, need: 1, done: 0, until });
  // 攻略（侍大将から）: 家の狙う城を落とす軍勢に加わる
  const kt = (tgt.length ? tgt : near)[0];
  if (kt) pool.push({ kind: 'kouryaku', castle: kt.i, need: 1, done: 0, until: s.turn + HERO.KOURYAKU_MONTHS });
  // 寝返り（宿老）: 敵の城主に内応を持ちかける
  const govd = near.filter((c) => c.governor);
  if (govd[0]) pool.push({ kind: 'negaeri', castle: govd[0].i, need: 1, done: 0, until });
  // 献金・献上: 主君の城へ納める（手元の金が多いほど出やすく、額も上がる）
  const L = lordOf(s), H0 = s.hero!;
  if (L) {
    const base = HERO.KENKIN[me.rank] ?? 100;
    const amt = Math.round(Math.max(base, Math.min(H0.gold * HERO.KENKIN_SHARE, base * HERO.KENKIN_MAX)) / 50) * 50;
    const kk: Quest = { kind: 'kenkin', castle: L.loc, need: amt, done: 0, until };
    if (H0.gold >= amt) { pool.push(kk); if (H0.gold >= HERO.KENKIN_RICH) pool.push(kk); if (H0.gold >= HERO.KENKIN_RICH * 3) pool.push(kk, kk); } // 払える額のときだけ
    pool.push({ kind: 'kenjo', castle: L.loc, need: HERO.KENJO[me.rank] ?? 2, done: 0, until });
  }
  // 身分で出る主命を絞る（国衆の調略は足軽大将、大名の城の調略は侍大将から）
  const allow = HERO.QUESTS[me.rank] ?? HERO.QUESTS[3];
  { const keep = pool.filter((q) => allow.includes(q.kind) && !(q.kind === 'choryaku' && me.rank === 2 && s.castles[q.castle].owner) && !(q.kind === 'choryaku' && me.rank <= 1 && !s.castles[q.castle].owner)); pool.length = 0; pool.push(...keep); }
  if (frozen(s)) { const keep = pool.filter((q) => q.kind === 'fushin' || q.kind === 'kenkin' || q.kind === 'kenjo' || q.kind === 'tsukaiban'); pool.length = 0; pool.push(...keep); } // 天下の静けさ（物語の第五部）: 戦の主命は出ない
  return pool;
}
function makeQuest(s: GameState): Quest | null {
  const pool = questPool(s);
  if (!pool.length) return null;
  const pick = pool[Math.floor(rand(s) * pool.length)];
  s.hero!.lastQuest = pick.castle;
  return pick;
}
// 評定の候補: 出やすさの重みのまま、違う種類を三つまで
export function questChoices(s: GameState, n = HYOJO.CHOICES): Quest[] {
  const pool = questPool(s), out: Quest[] = [];
  while (pool.length && out.length < n) {
    const q = pool[Math.floor(rand(s) * pool.length)];
    out.push(q);
    for (let i = pool.length - 1; i >= 0; i--) if (pool[i].kind === q.kind) pool.splice(i, 1);
  }
  return out;
}
export const canWork = (s: GameState) => { const H = s.hero!; return !H.field && !H.army && !!H.quest && H.quest.kind !== 'shutsujin' && H.quest.kind !== 'kouryaku' && H.quest.done < H.quest.need && H.quest.castle === H.town; };
// 主命を果たす（その町で1旬）
export function work(s: GameState): Act {
  const H = s.hero!, me = heroOf(s)!, q = H.quest!;
  if (!canWork(s)) return { ok: false, text: 'ここでできる主命はない' };
  const c = s.castles[q.castle];
  if (q.kind === 'kenkin') {
    if (H.gold < q.need) return { ok: false, text: `金が足りない（${q.need}貫。手元${H.gold}貫）` };
    used(s); H.gold -= q.need; q.done = q.need; q.ok = true; q.note = `金${q.need}貫を納めた。`;
    return { ok: true, text: `${c.name}の蔵へ金${q.need}貫を納めた（手元${H.gold}貫）。登城して報告せよ。` };
  }
  if (q.kind === 'kenjo') {
    const lack = Math.max(0, q.need - H.goods), cost = lack * HERO.GOODS_COST * HERO.KENJO_BUY;
    if (H.gold < cost) return { ok: false, text: `進物が${lack}つ足りず、調える金もない（${cost}貫）` };
    used(s); H.goods -= q.need - lack; H.gold -= cost; q.done = q.need; q.ok = true; q.note = `進物${q.need}つを献上した。`;
    return { ok: true, text: `進物${q.need}つを献上した${lack ? `（足りない${lack}つは金${cost}貫で調えた）` : ''}。登城して報告せよ。` };
  }
  if (q.kind === 'zeriai') return { ok: false, text: '小競り合いは盤で戦う' };
  used(s, HP.WORK);
  if (q.kind === 'tsukaiban') { q.done = q.need; q.ok = true; q.note = `${c.name}へ文を届けた。`; return { ok: true, text: `${c.name}の城代に主君の文を届けた。登城して報告せよ。` }; }
  if (q.kind === 'monomi') {
    const seen = s.castles.filter((f) => f.owner && f.owner !== me.clan && hexDist(f.hex, c.hex) <= R.hx(5));
    for (const f of seen) learnCastle(s, f.i, me.clan!);
    q.done = q.need; q.ok = true; q.note = seen.length ? `${seen.map((f) => `${f.name}（兵${Math.round(f.garrison / 100) * 100}）`).join('・')}を見た。` : '近くに敵の動きはなかった。';
    return { ok: true, text: `${c.name}の櫓から物見をした。${q.note}登城して報告せよ。` };
  }
  if (q.kind === 'joban') {
    if (c.owner !== me.clan) { q.done = q.need; q.ok = false; q.note = '城が人手に渡った。'; return { ok: true, text: q.note }; }
    q.done++; c.garrison = Math.min(garrisonMax(c), c.garrison + Math.round(garrisonMax(c) * 0.04)); c.gMorale = Math.min(1.2, c.gMorale + 0.05); c.chian = clamp(c.chian + 1);
    if (q.done >= q.need) { q.ok = true; q.note = `${c.name}の城番を務め上げた。`; return { ok: true, text: `城番を務め上げ、${c.name}の守りを固めた。登城して報告せよ。` }; }
    return { ok: true, text: `${c.name}の城番を務めた（${q.done}/${q.need}旬）。` };
  }
  if (q.kind === 'toyo') {
    const g = q.target ? s.generals[q.target] : null;
    if (!g || g.status !== 'ronin' || g.loc !== c.i) { q.done = q.need; q.ok = false; q.note = '口説くはずの浪人は、もうここにいなかった。'; return { ok: true, text: q.note }; }
    const p = 0.3 + me.cha / 250 + (s.hero!.fame ?? 0) / 150 + relOf(s, g.id) / 200 + lv(s, 'bensetsu') * 0.04;
    if (rand(s) < Math.min(0.9, p)) {
      const L = lordOf(s); g.clan = me.clan; g.status = 'free'; g.loc = L?.loc ?? g.loc; g.rank = Math.max(2, g.rank);
      q.done = q.need; q.ok = true; q.note = `浪人の${g.name}を口説き落とし、召し抱えた。`;
      addLog(s, `${me.name}の口利きで、${g.name}が${clanName(s, me.clan!)}家に仕官した。`, 'info', true);
      return { ok: true, who: g.id, line: 'おぬしがそこまで言うなら、もう一度仕えてみるか。', text: `${q.note}登城して報告せよ。` };
    }
    return { ok: true, who: g.id, line: '……宮仕えは、もう懲りた。', text: '浪人は首を縦に振らなかった。日を改めて、また口説くこともできる。' };
  }
  if (q.kind === 'negaeri') {
    const gov = c.governor ? s.generals[c.governor] : null;
    const p = 0.08 + (me.int + me.cha) / 600 + (s.hero!.fame ?? 0) / 250 + (gov ? relOf(s, gov.id) / 200 : 0.05) + lv(s, 'bensetsu') * 0.04;
    if (rand(s) < Math.min(0.75, p)) {
      learnCastle(s, c.i, me.clan!); q.done = q.need; q.ok = true;
      if (gov && rand(s) < 0.3 + relOf(s, gov.id) / 200) {
        captureCastle(s, c, me.clan!); gov.clan = me.clan; gov.status = 'governor'; gov.loc = c.i; c.governor = gov.id; s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i);
        q.note = `${gov.name}が城ごと寝返り、${c.name}は戦わずにわが家のものとなった。`; addLog(s, `${c.name}の${gov.name}が${clanName(s, me.clan!)}家に寝返った。`, 'castle', true);
      } else { c.naio = s.turn + 1; c.naioBy = me.clan!; q.note = `${c.name}の中に内応の約束を取り付けた（次の月まで、攻めれば門が開く）。`; }
      return { ok: true, text: `${q.note}登城して報告せよ。` };
    }
    return chased(s, '内応を持ちかけたが、相手は乗ってこなかった。');
  }
  if (q.kind === 'fushin') {
    if (c.owner !== me.clan) { q.done = q.need; q.ok = false; q.note = '城が人手に渡り、普請はかなわなかった。'; return { ok: true, text: q.note }; }
    q.done = Math.min(q.need, q.done + (lv(s, 'chikujo') >= 3 ? 2 : 1)); // 築城三段から、一旬で二旬分はかどる
    const lea = me.lea + me.int;
    c.chian = clamp(c.chian + 3 + lea / 60 + lv(s, 'chikujo')); c.garrison = Math.min(garrisonMax(c), c.garrison + Math.round(garrisonMax(c) * 0.05));
    if (q.done >= q.need) { q.note = `${c.name}の石垣と堀を手直しし、城下の治安も上がった。`; return { ok: true, text: `普請を差配した。${q.note}登城して報告せよ。` }; }
    return { ok: true, text: `人足を集め、普請を差配した（${q.done}/${q.need}旬）。` };
  }
  if (q.kind === 'teisatsu') {
    const p = 0.55 + me.int / 200 + lv(s, 'ninjutsu') * 0.05;
    if (rand(s) < p) {
      learnCastle(s, c.i, me.clan!); q.done = q.need; q.ok = true;
      q.note = `${c.name}の兵はおよそ${Math.round(c.garrison / 100) * 100}、${c.governor ? `城主は${s.generals[c.governor].name}` : '城主はいない'}。`;
      return { ok: true, text: `商人に身をやつして城下を探った。${q.note}登城して報告せよ。` };
    }
    return chased(s, '城下を探ったが、怪しまれて引き上げた。');
  }
  // 国衆の調略: 持ち主のない城を寝返らせる
  if (!c.owner) {
    const p = 0.3 + (me.int + me.cha) / 400 + (s.hero!.fame ?? 0) / 200 + lv(s, 'bensetsu') * 0.04;
    if (rand(s) < Math.min(0.85, p)) { const gar = c.garrison; captureCastle(s, c, me.clan!); c.garrison = gar; s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i); q.done = q.need; q.ok = true; q.note = `国衆の${c.name}がわが家に従った。`; addLog(s, `${me.name}の調略で、${c.name}の国人衆が${clanName(s, me.clan!)}家に寝返った。`, 'castle', true); return { ok: true, text: `${q.note}登城して報告せよ。` }; }
    return chased(s, '国衆に話を持ちかけたが、まだ様子を見ると言われた。');
  }
  // 調略
  const gov = c.governor ? s.generals[c.governor] : null;
  const p = 0.25 + (me.int + me.cha) / 400 - (gov ? gov.int / 400 : 0) + (gov ? relOf(s, gov.id) / 300 : 0) + lv(s, 'bensetsu') * 0.04;
  if (rand(s) < p) {
    c.gMorale = Math.max(0.3, c.gMorale - 0.2); c.chian = clamp(c.chian - 15); c.garrison = Math.max(0, Math.round(c.garrison * 0.85));
    learnCastle(s, c.i, me.clan!); q.done = q.need; q.ok = true;
    q.note = `${c.name}の侍たちに金と言葉を撒き、城兵の一部を逃散させた。`;
    addLog(s, `${c.name}で城兵の逃散が相次いでいるという。`, 'info', true);
    return { ok: true, text: `${q.note}登城して報告せよ。` };
  }
  return chased(s, '調略の手を伸ばしたが、相手は乗ってこなかった。');
}
// 毎月: 世の中の動きで主命の首尾が決まるもの（攻略・登用の浪人の居場所）
function checkQuestWorld(s: GameState) {
  const H = s.hero!, q = H.quest, me = heroOf(s)!;
  if (!q || q.done >= q.need) return;
  if (q.kind === 'kouryaku') {
    if (H.army !== null && H.army !== undefined) q.joined = true;
    const c = s.castles[q.castle];
    if (c.owner === me.clan) { q.done = q.need; q.ok = !!q.joined; q.note = q.joined ? `${c.name}は落ちた。攻略の軍勢の一手として働いた。` : `${c.name}は落ちたが、攻略の軍勢には加わらなかった。`; note(s, q.note + '登城して報告せよ。'); }
  }
  if (q.kind === 'toyo' && q.target) { const g = s.generals[q.target]; if (g?.status === 'ronin') q.castle = g.loc; }
}
// 不首尾: 3割で追われて一つ前の町へ（期日に余裕があれば、また試せる）
function chased(s: GameState, text: string): Act {
  const H = s.hero!;
  if (rand(s) < 0.3) {
    const me = heroOf(s)!, home = clanCastles(s, me.clan!).sort((a, b) => hexDist(a.hex, s.castles[H.town].hex) - hexDist(b.hex, s.castles[H.town].hex))[0];
    if (home) { H.town = home.i; H.hex = home.hex; H.field = false; H.dest = null; me.loc = home.i; }
    return { ok: true, text: `${text}追っ手がかかり、${home?.name ?? '味方の城'}まで逃げ帰った。` };
  }
  return { ok: true, text: `${text}日を改めて、また試すこともできる。` };
}

// ───────── 月の終わり（3旬が過ぎたら、大名たちの1か月の前に） ─────────
export function heroMonth(s: GameState): string[] {
  const out: string[] = [...storyGuard(s)];
  const H = s.hero!, me = heroOf(s)!;
  if (!me || me.status === 'dead') return out;
  const pay = me.clan ? HERO.PAY[me.rank] ?? 50 : 0; // 浪人に俸禄はない
  const chi = chigyo(s);
  H.gold += pay + chi; out.push(`俸禄 ${pay}貫${chi ? `と知行 ${chi}貫` : ''}を受け取った（手元 ${H.gold}貫）。`);
  out.push(...ieMonth(s));
  if (freeHero(s)) out.push(...upkeepMonth(s));
  if (freeHero(s)) { syncGovernor(s); out.push(...myHyojoMonth(s)); } // 自分の評定で申し付けた役目の首尾
  if (freeHero(s) && s.month === 1) out.push(...familyYear(s));
  if (freeHero(s)) out.push(...hpMonth(s, () => rand(s))); // 体力が戻る・尽きかけていれば病に // 正月: 子の誕生と元服
  out.push(...roninMonth(s));
  out.push(...kashinMonth(s));
  out.push(...leadMonth(s));
  out.push(...returnLent(s));
  tradeMonth(s);
  checkShutsujin(s);
  checkQuestWorld(s);
  const q = H.quest;
  if (q && q.kind === 'shutsujin' && q.done < q.need && H.army !== q.army && q.army !== undefined && !s.armies[q.army]) { H.quest = null; out.push('加わるはずの軍勢が陣を払い、出陣の主命は取りやめになった。'); }
  else if (q && q.done < q.need && s.turn >= q.until) { H.favor = clamp(H.favor - HERO.FAVOR_NG); H.failed++; H.quest = null; out.push(`主命（${QUEST_NAME[q.kind]}）の期日が過ぎた。主君の覚え−${HERO.FAVOR_NG}。`); note(s, `主命（${QUEST_NAME[q.kind]}）の期日を過ぎてしまった。`); }
  // 寄親と同輩（足軽組頭・足軽大将）。寄親の出世で引き上げられることもある
  out.push(...yoriMonth(s, () => H.favor >= 30 + (3 - me.rank) * 10));
  // 取り立て（功績が満ちて、主君の覚えがよく、寄親の推挙があれば）
  { const sb = me.rank > 0 && me.merit >= R.MERIT_AT[me.rank - 1] && H.favor >= 40 + (3 - me.rank) * 10 ? suisenBlock(s) : null; if (sb) out.push(`功績は満ちたが、取り立てられない: ${sb}。`); }
  while (me.rank > 0 && me.merit >= R.MERIT_AT[me.rank - 1] && H.favor >= 40 + (3 - me.rank) * 10 && !suisenBlock(s)) {
    me.rank--; H.favor = clamp(H.favor - 10);
    out.push(`${R.RANK_NAME[me.rank]}に取り立てられた！`); note(s, `${R.RANK_NAME[me.rank]}に取り立てられた。`);
    addLog(s, `${me.name}が${R.RANK_NAME[me.rank]}に取り立てられた。`, 'info', true);
  }
  H.jun = 0;
  return out;
}
// 武将が生きて家にいるか（いなければ試作はそこで終わり）
export function heroEnd(s: GameState): string | null {
  let e = heroEnd0(s);
  if (e && s.hero && !s.hero.over && freeHero(s)) { const me = heroOf(s); e = lifeSummary(s, !me || me.status === 'dead' ? 'death' : 'fall').join('　'); } // 物語の外: 一生の締め
  if (e && s.hero) s.hero.over = e;
  return e;
}
function heroEnd0(s: GameState): string | null {
  const me = heroOf(s);
  if (s.hero?.over) return s.hero.over;
  if (s.hero?.story === 'toshiie' && me && me.status !== 'dead' && !['oda', 'shibata', 'hashiba'].includes(me.clan ?? '')) return '主家を失い、利家の物語はここで途切れた。';
  if (!me || me.status === 'dead') return `${me?.name ?? '主人公'}は世を去った。`;
  if (freeHero(s) && me.status !== 'captive' && (me.status === 'ronin' || (me.clan && !s.clans[me.clan]?.alive) || (!me.clan && s.hero!.career?.ronin === undefined))) { note(s, becomeRonin(s)); return null; } // 物語の外: 主家が滅べば浪人に（本体の処理で浪人にされたときも）
  if (freeHero(s) && !me.clan) return null; // 浪人の身
  if (freeHero(s)) { const f = followClan(s); if (f) note(s, f); } // 本体の処理で家が替わった（降伏など）
  if (!me.clan || !s.clans[me.clan]?.alive) return `${clanName(s, s.player)}家は滅んだ。`;
  if (me.status === 'captive') return `${me.name}は敵に捕らえられた。`;
  const H = s.hero!;
  if (H.mode === 'ryoshu' && !H.out) return null; // 領主: 部隊・城主は大名の画面のまま（主人公が率いる部隊を外さない）
  H.hex ??= s.castles[H.town].hex;
  for (const c of s.castles) if (c.governor === me.id && (c.i !== H.fuchu || !freeHero(s))) c.governor = null; // 預かった居城の城主の欄は残す
  if (H.army !== null && H.army !== undefined) {
    const a = s.armies[H.army];
    if (a && me.army === a.id && me.status === 'army') { followArmy(s, a); checkShutsujin(s); return null; }
    // 陣払い・壊滅・編成替えで陣を離れた
    const camp = s.camps?.[H.army];
    if (camp) { camp.staff = (camp.staff ?? []).filter((x) => x !== me.id); if (camp.main === me.id) { const n = camp.staff.shift(); if (n) { camp.main = n; s.generals[n].boss = undefined; } else delete s.camps![H.army]; } }
    else if (me.army !== null) leaveArmy(s, me);
    H.army = null; me.army = null; me.boss = undefined; me.status = 'hero';
    const c = camp?.camp !== undefined ? s.castles[camp.camp] : castleAt(s, H.hex) ?? clanCastles(s, me.clan).sort((x, y) => hexDist(x.hex, H.hex) - hexDist(y.hex, H.hex))[0];
    if (c) { H.town = c.i; H.hex = c.hex; H.field = false; me.loc = c.i; }
    note(s, `陣が払われ、${c?.name ?? '城'}に戻った。`);
    return null;
  }
  if (me.status !== 'hero') { me.status = 'hero'; me.army = null; }
  if (me.loc !== H.town) me.loc = H.town;
  return null;
}

// ───────── 言葉 ─────────
const pickLine = (s: GameState, xs: string[]) => xs[Math.floor(rand(s) * xs.length)];
function talk(s: GameState, g: General, first: boolean): string {
  const v = relOf(s, g.id), me = heroOf(s)!;
  const T = g.bra >= Math.max(g.int, g.cha, g.lea) ? 'bold' : g.int >= Math.max(g.cha, g.lea) ? 'wise' : g.cha >= g.lea ? 'gentle' : 'steady';
  const other = g.clan && g.clan !== me.clan;
  if (first) return pickLine(s, other ? FIRST_OTHER : g.status === 'ronin' ? FIRST_RONIN : FIRST[T]);
  if (v >= HERO.FRIEND) return pickLine(s, CLOSE[T]);
  return pickLine(s, MID[T]);
}
const FIRST: Record<string, string[]> = {
  bold: ['おぬしが噂の新参か。腕は立つのか、見せてもらおう。', 'ふむ、槍の持ち方は悪くない。戦場で会おうぞ。'],
  wise: ['ようこそ。茶でも飲んでいかれよ。……世の動きをどう見ておられる。', '名は聞いておる。なかなか目端が利くそうな。'],
  gentle: ['よう参られた。遠慮はいらぬ、ゆるりとしていかれよ。', 'これからは同じ家中。困ったことがあれば言うてくれ。'],
  steady: ['お役目ご苦労。まずは家中の決まりを覚えることだ。', '挨拶とは殊勝な。励まれよ。'],
};
const MID: Record<string, string[]> = {
  bold: ['次の戦では、どちらが先に一番槍をつけるか、勝負じゃ。', '酒はいける口か。ならば飲め、飲め！'],
  wise: ['近ごろの殿のお考え、そなたはどう読む。', '隣国の動き、気になるな。茶屋の噂も馬鹿にはできぬ。'],
  gentle: ['また来てくれたか。妻も喜んでおる。', '城下の民の暮らし向きは、少しは良くなったかの。'],
  steady: ['主命は期日を守るのが肝要。遅れれば、殿の覚えも悪うなる。', '帳面はつけておるか。武士も算用ができねばならぬ時代よ。'],
};
const CLOSE: Record<string, string[]> = {
  bold: ['おぬしとなら、どんな死地でも背中を預けられる。', 'おぬしが困っておるなら、この槍、いつでも貸そう。'],
  wise: ['そなたにだけ申すが……家中にも、いろいろと思惑がある。', '天下の行方、いつかそなたと語り明かしたいものだ。'],
  gentle: ['そなたは、もう身内も同然。何でも頼ってくれ。', '殿に取りなしが要るときは、言うてくれ。わしからも申し上げよう。'],
  steady: ['そなたの働きぶり、殿もよう見ておられるぞ。', '長い付き合いになりそうだ。よろしく頼む。'],
};
const FIRST_OTHER = ['……よその家の者が、何の用だ。', '敵か味方か、今は問うまい。話くらいは聞こう。'];
const FIRST_RONIN = ['浪々の身に何の用かな。……ほう、酒を持ってきたか。', '仕官の口でもあるのか。話を聞こう。'];
const GIFT_LINE = ['これは、かたじけない。ありがたく頂戴する。', '気を遣わせたな。この礼はいずれ。'];
const PRAISE: Record<QuestKind, string[]> = {
  shutsujin: ['戦場での働き、聞いておるぞ。よう励んだ。', 'そなたの槍、頼もしく思うたぞ。'],
  fushin: ['うむ、手際がよい。城が固くなれば、民も安心する。', '早かったな。次も頼むぞ。'],
  teisatsu: ['よう探った。これで次の手が打てる。', 'ほう、そこまで調べたか。褒めてつかわす。'],
  choryaku: ['でかした！ 城を落とす前に、城の心を落としたな。', '舌先三寸で城兵を崩すとは。そなた、なかなかの曲者よ。'],
  kenkin: ['うむ、確かに受け取った。戦は銭でするものでもあるからな。', '殊勝である。この銭、無駄にはせぬ。'],
  kenjo: ['ほう、よい品じゃ。目が利くな。', '気の利いた献上よ。覚えておくぞ。'],
  tsukaiban: ['うむ、確かに届いたか。足が速いのはよいことだ。'],
  monomi: ['よう見た。境の目は、そなたのような者に限る。'],
  toyo: ['よい者を連れてきたな。人こそ城よ。', 'そなたの口利きなら、間違いはあるまい。'],
  kouryaku: ['城を落としたか！ よう働いた。', 'あの城が落ちたのは、そなたらの働きよ。'],
  joban: ['境の城を守り通したか。頼もしい。'],
  negaeri: ['でかした！ 血を流さずに城を取るのが上の上よ。', '城主の心を取ったか。そなたの舌は槍より鋭い。'],
  zeriai: ['境の小競り合い、ようしのいだ。足軽を使うのが上手くなったな。', '小勢でよう働いた。大将の器が見えてきたぞ。'],
};
const SCOLD = ['……そうか。次はしくじるなよ。', '不首尾か。言い訳は聞かぬ。次で取り返せ。'];
const ORDER_LINE: Record<QuestKind, string> = {
  shutsujin: '戦じゃ。{castle}のあたりにおる軍勢に加わり、手柄を立ててまいれ。',
  fushin: '{castle}の守りが心もとない。出向いて普請を差配せよ。',
  teisatsu: '{castle}の様子を探ってまいれ。兵の数、城主の顔ぶれ、何でもよい。',
  choryaku: '{castle}の侍どもに手を回し、城の守りを内から崩してまいれ。',
  kenkin: '近頃は何かと物入りでな。{castle}の蔵へ、そなたからも銭を納めてもらいたい。',
  kenjo: '近く客人を迎える。{castle}へ、引き出物になる品を調えて献上せよ。',
  tsukaiban: 'この文を{castle}へ届けよ。急ぎじゃ。',
  monomi: '{castle}の櫓から、近くの敵の様子を見てまいれ。',
  toyo: '{castle}の城下に、腕の立つ浪人がおるそうな。口説いて連れて参れ。',
  kouryaku: '{castle}を落とす。攻めの軍勢に加わり、手柄を立ててまいれ。',
  joban: '{castle}は境の城じゃ。しばらく城番を務め、守りを固めよ。',
  negaeri: '{castle}の城主に手を回せ。こちらへ寝返らせれば、大手柄ぞ。',
  zeriai: '境が騒がしい。{castle}へ出向き、手勢を率いて敵を退けてまいれ。',
};

// 武将で遊ぶ（物語の外）: 技能と体力（太閤立志伝を参考に）。
// 技能は師事して修める（槍術・築城は道場、弁舌・算術は寺、茶道は名物の出る町の茶屋で茶器の名物を持って）。段は0〜5（修行の手応え100ごとに一段）。
// 体力は行いごとに減り、休めば戻る。尽きかけると病に倒れやすく、病の間は休むことしかできない。年を取ると体力の上限が下がる
import type { GameState } from './types';

export type SkillKey = 'yari' | 'bensetsu' | 'chikujo' | 'sanjutsu' | 'sado';
export const SKILL_NAME: Record<SkillKey, string> = { yari: '槍術', bensetsu: '弁舌', chikujo: '築城', sanjutsu: '算術', sado: '茶道' };
export const SKILL_DESC: Record<SkillKey, string> = {
  yari: '陣中の働き（加わった軍勢の士気）・陣借りで首級を挙げる見込み',
  bensetsu: '調略・寝返り・登用の主命、仕官、内々の誘い・密約・縁組の見込み',
  chikujo: '普請の主命のはかどり（三段で一旬に二旬分）と城下の治安',
  sanjutsu: '知行の実入り（一段ごとに5%）・商いの売り値（3%）',
  sado: '茶会で深まる親しさ（一段ごとに+2）・名物の献上で上がる覚え（10%）',
};
export const SKILL_STAT: Record<SkillKey, 'bra' | 'lea' | 'int' | 'cha'> = { yari: 'bra', bensetsu: 'cha', chikujo: 'lea', sanjutsu: 'int', sado: 'cha' };
export const SKILL_AT: Record<SkillKey, 'dojo' | 'tera' | 'chaya'> = { yari: 'dojo', chikujo: 'dojo', bensetsu: 'tera', sanjutsu: 'tera', sado: 'chaya' };
export const SK = { MAX: 5, PER: 100, COST: 100, GAIN: 15, STAT_DIV: 6 }; // 師事の謝礼は（段+1）×100貫。手応えは 15＋能力÷6 を0.6〜1.2倍（一段におよそ4度）

type SkX = { skill?: Partial<Record<SkillKey, number>>; hp?: number };
const X = (s: GameState) => s.hero! as typeof s.hero & SkX;
export const expOf = (s: GameState, k: SkillKey) => (s.hero ? X(s).skill?.[k] ?? 0 : 0);
export const lv = (s: GameState, k: SkillKey) => (s.hero && s.hero.story !== 'toshiie' ? Math.min(SK.MAX, Math.floor(expOf(s, k) / SK.PER)) : 0);
export function addExp(s: GameState, k: SkillKey, n: number): boolean {
  const H = X(s), before = lv(s, k);
  (H.skill ??= {})[k] = Math.min(SK.MAX * SK.PER, expOf(s, k) + n);
  return lv(s, k) > before;
}

// ───────── 体力 ─────────
export const HP = { ACT: 5, WORK: 8, TRAVEL: 7, TRAIN: 12, CAMP: 10, REST: 30, MONTH: 10, LOW: 15, SICK_P: 0.25, SICK_MAX: 2 };
export const hpMax = (s: GameState) => { const me = s.generals[s.hero!.id], age = s.year - (me.born ?? s.year - 30); return Math.max(50, 100 - Math.max(0, age - 40) * 2); };
export const hpOf = (s: GameState) => Math.min(hpMax(s), X(s).hp ?? hpMax(s));
export function spendHp(s: GameState, n: number) { const H = X(s); if (H.story === 'toshiie') return; H.hp = Math.max(0, Math.min(hpMax(s), hpOf(s) - n)); }
export const isSick = (s: GameState) => !!s.hero && s.hero.story !== 'toshiie' && (s.generals[s.hero.id]?.sick ?? 0) > 0;
// 月の終わり: 体力が少し戻る。尽きかけていれば病に倒れることがある（本体の病と同じ g.sick。病の月が過ぎれば癒える）
export function hpMonth(s: GameState, r: () => number): string[] {
  const H = X(s); if (H.story === 'toshiie') return [];
  const me = s.generals[H.id];
  if (isSick(s)) { H.hp = Math.min(hpMax(s), hpOf(s) + HP.MONTH); return []; }
  if (hpOf(s) <= HP.LOW && r() < (hpOf(s) <= 0 ? 1 : HP.SICK_P)) {
    me.sick = 1 + Math.floor(r() * HP.SICK_MAX);
    return [`無理がたたり、${me.name}は病に倒れた（${me.sick}か月ほど。休むことしかできない）。`];
  }
  H.hp = Math.min(hpMax(s), hpOf(s) + HP.MONTH);
  return [];
}

// ───────── 師事 ─────────
export function trainable(s: GameState, at: 'dojo' | 'tera' | 'chaya', hasTea: boolean, market: boolean): SkillKey[] {
  return (Object.keys(SKILL_AT) as SkillKey[]).filter((k) => SKILL_AT[k] === at && (k !== 'sado' || (hasTea && market)));
}
export const skillCost = (s: GameState, k: SkillKey) => (lv(s, k) + 1) * SK.COST;
export function skillBlock(s: GameState, k: SkillKey): string | null {
  if (lv(s, k) >= SK.MAX) return '極めた';
  if (s.hero!.gold < skillCost(s, k)) return `謝礼が足りない（${skillCost(s, k)}貫）`;
  if (isSick(s)) return '病の身では師事できない';
  return null;
}
export function study(s: GameState, k: SkillKey, r: () => number): { ok: boolean; text: string } {
  const why = skillBlock(s, k);
  if (why) return { ok: false, text: why };
  const H = s.hero!, me = s.generals[H.id], cost = skillCost(s, k);
  H.gold -= cost; H.jun++; spendHp(s, HP.TRAIN);
  const gain = Math.round((SK.GAIN + me[SKILL_STAT[k]] / SK.STAT_DIV) * (0.6 + r() * 0.6));
  const up = addExp(s, k, gain);
  return { ok: true, text: `${SKILL_NAME[k]}を師事した（謝礼${cost}貫）。${up ? `${SKILL_NAME[k]}が${lv(s, k)}段に上がった！` : `手応え${expOf(s, k) % SK.PER}／${SK.PER}（${lv(s, k)}段）。`}` };
}

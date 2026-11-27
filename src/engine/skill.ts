// 武将で遊ぶ（物語の外）: 技能と体力（太閤立志伝を参考に）。
// 技能は大きな城下の道場（武芸・築城・忍術）・寺（弁舌・算術・茶道）で独学すれば一段まで。その先は、その道の名人（本体の特性: 剣豪・築城・忍び・外交や僧・算勘・茶人）に屋敷で会って師事する。段は0〜5（手応え100ごとに一段）。
// 体力は行いごとに減り、休めば戻る。尽きかけると病に倒れやすく、病の間は休むことしかできない。年を取ると体力の上限が下がる
import { TRAITS, type TraitId } from '../data/traits';
import { hostile } from './state';
import type { GameState, General } from './types';

export type SkillKey = 'yari' | 'bensetsu' | 'chikujo' | 'sanjutsu' | 'sado' | 'ninjutsu'; // yari は「武芸」（古い保存のため鍵はそのまま）
export const SKILL_NAME: Record<SkillKey, string> = { yari: '武芸', bensetsu: '弁舌', chikujo: '築城', sanjutsu: '算術', sado: '茶道', ninjutsu: '忍術' };
export const SKILL_DESC: Record<SkillKey, string> = {
  yari: '陣中の働き（加わった軍勢の士気）・陣借りで首級を挙げる見込み',
  bensetsu: '調略・寝返り・登用の主命、仕官、内々の誘い・密約・縁組の見込み',
  chikujo: '普請の主命のはかどり（三段で一旬に二旬分）と城下の治安',
  sanjutsu: '知行の実入り（一段ごとに5%）・商いの売り値（3%）',
  sado: '茶会で深まる親しさ（一段ごとに+2）・名物の献上で上がる覚え（10%）',
  ninjutsu: '偵察の主命の見込み（一段ごとに5%）・内々の誘いや密約が主君の耳に入りにくい（15%ずつ）',
};
export const SKILL_STAT: Record<SkillKey, 'bra' | 'lea' | 'int' | 'cha'> = { yari: 'bra', bensetsu: 'cha', chikujo: 'lea', sanjutsu: 'int', sado: 'cha', ninjutsu: 'int' };
export const SKILL_AT: Record<SkillKey, 'dojo' | 'tera'> = { yari: 'dojo', chikujo: 'dojo', ninjutsu: 'dojo', bensetsu: 'tera', sanjutsu: 'tera', sado: 'tera' }; // 独学の場（一段まで）
// 名人の特性 → 教えられる技能
export const TRAIT_SKILL: Partial<Record<TraitId, SkillKey>> = { kensei: 'yari', chikujo: 'chikujo', ninja: 'ninjutsu', gaiko: 'bensetsu', so: 'bensetsu', sankan: 'sanjutsu', chajin: 'sado' };
export const SK = { MAX: 5, PER: 100, COST: 100, GAIN: 15, STAT_DIV: 6, SELF_MAX: 1, MASTER_REL: 10, FOE_REL: 30, MASTER_BOND: 3, TEA_BONUS: 0.3 }; // 謝礼は（段+1）×100貫。手応えは 15＋能力÷6 を0.6〜1.2倍（一段におよそ4度）。独学は一段まで。師事は顔見知り（敵の家の者は知己）から

type SkX = { skill?: Partial<Record<SkillKey, number>>; hp?: number };
const X = (s: GameState) => s.hero! as typeof s.hero & SkX;
export const expOf = (s: GameState, k: SkillKey) => (s.hero ? X(s).skill?.[k] ?? 0 : 0);
export const lv = (s: GameState, k: SkillKey) => (s.hero ? Math.min(SK.MAX, Math.floor(expOf(s, k) / SK.PER)) : 0);
export function addExp(s: GameState, k: SkillKey, n: number): boolean {
  const H = X(s), before = lv(s, k);
  (H.skill ??= {})[k] = Math.min(SK.MAX * SK.PER, expOf(s, k) + n);
  return lv(s, k) > before;
}

// ───────── 体力 ─────────
export const HP = { ACT: 5, WORK: 8, TRAVEL: 7, TRAIN: 12, CAMP: 10, CAMP_REST: 15, TIRED: 30, REST: 30, MONTH: 10, LOW: 15, SICK_P: 0.25, SICK_MAX: 2 };
export const hpMax = (s: GameState) => { const me = s.generals[s.hero!.id], age = s.year - (me.born ?? s.year - 30); return Math.max(50, 100 - Math.max(0, age - 40) * 2); };
export const hpOf = (s: GameState) => Math.min(hpMax(s), X(s).hp ?? hpMax(s));
export function spendHp(s: GameState, n: number) { const H = X(s); H.hp = Math.max(0, Math.min(hpMax(s), hpOf(s) - n)); }
export const isSick = (s: GameState) => !!s.hero && (s.generals[s.hero.id]?.sick ?? 0) > 0;
// 月の終わり: 体力が少し戻る。尽きかけていれば病に倒れることがある（本体の病と同じ g.sick。病の月が過ぎれば癒える）
export function hpMonth(s: GameState, r: () => number): string[] {
  const H = X(s);
  const me = s.generals[H.id];
  if (isSick(s)) { H.hp = Math.min(hpMax(s), hpOf(s) + HP.MONTH); return []; }
  (H as { sickMild?: boolean }).sickMild = undefined; // 病が癒えた
  if (hpOf(s) <= HP.LOW && r() < (hpOf(s) <= 0 ? 1 : HP.SICK_P)) {
    me.sick = 1 + Math.floor(r() * HP.SICK_MAX); (H as { sickMild?: boolean }).sickMild = true; // 無理がたたった病は、休めば治る（命は取られない）
    return [`無理がたたり、${me.name}は病に倒れた（${me.sick}か月ほど。休むことしかできない。命に障る病ではない）。`];
  }
  H.hp = Math.min(hpMax(s), hpOf(s) + HP.MONTH);
  return [];
}

// ───────── 独学と師事 ─────────
export const selfList = (at: 'dojo' | 'tera'): SkillKey[] => (Object.keys(SKILL_AT) as SkillKey[]).filter((k) => SKILL_AT[k] === at);
export const skillCost = (s: GameState, k: SkillKey) => (lv(s, k) + 1) * SK.COST;
// 名人: 教えられる技能と、教えられる段（その道の能力で: 80以上で五段、65以上で四段、ほかは三段）
export const masterSkill = (g: General | undefined): SkillKey | null => (g ? TRAIT_SKILL[TRAITS[g.id]] ?? null : null);
export const masterCap = (g: General) => { const k = masterSkill(g); if (!k) return 0; const v = g[SKILL_STAT[k]]; return v >= 80 ? 5 : v >= 65 ? 4 : 3; };
export function skillBlock(s: GameState, k: SkillKey, master?: General): string | null {
  const H = s.hero!;
  if (isSick(s)) return '病の身では学べない';
  if (lv(s, k) >= SK.MAX) return '極めた';
  if (!master && lv(s, k) >= SK.SELF_MAX) return `独学は${SK.SELF_MAX}段まで（その先は名人に師事する）`;
  if (master) {
    if (master.status === 'dead' || master.status === 'young' || master.status === 'captive') return '会えない';
    if (lv(s, k) >= masterCap(master)) return `${master.name}が教えられるのは${masterCap(master)}段まで`;
    const me = s.generals[H.id], foe = !!master.clan && !!me.clan && master.clan !== me.clan && hostile(s, me.clan, master.clan);
    const need = foe ? SK.FOE_REL : SK.MASTER_REL;
    if ((H.rel[master.id] ?? 0) < need) return `親しさ${need}（${foe ? '敵の家の者は「知己」' : '「顔見知り」'}）から`;
  }
  if (H.gold < skillCost(s, k)) return `謝礼が足りない（${skillCost(s, k)}貫）`;
  return null;
}
export function study(s: GameState, k: SkillKey, r: () => number, master?: General, hasTea = false): { ok: boolean; text: string; who?: string; line?: string } {
  const why = skillBlock(s, k, master);
  if (why) return { ok: false, text: why };
  const H = s.hero!, me = s.generals[H.id], cost = skillCost(s, k);
  H.gold -= cost; H.jun++; spendHp(s, HP.TRAIN);
  let gain = Math.round((SK.GAIN + me[SKILL_STAT[k]] / SK.STAT_DIV) * (0.6 + r() * 0.6) * (k === 'sado' && hasTea ? 1 + SK.TEA_BONUS : 1));
  if (!master) gain = Math.min(gain, SK.SELF_MAX * SK.PER - expOf(s, k)); // 独学は一段で止まる
  else H.rel[master.id] = Math.min(100, (H.rel[master.id] ?? 0) + SK.MASTER_BOND);
  const up = addExp(s, k, gain);
  const how = master ? `${master.name}に${SKILL_NAME[k]}を師事した` : `${SKILL_AT[k] === 'dojo' ? '道場' : '寺'}で${SKILL_NAME[k]}を独学した`;
  const res = `${how}（謝礼${cost}貫）。${up ? `${SKILL_NAME[k]}が${lv(s, k)}段に上がった！` : `手応え${expOf(s, k) % SK.PER}／${SK.PER}（${lv(s, k)}段）。`}`;
  return master ? { ok: true, who: master.id, line: up ? 'よう掴んだ。……今日の稽古は、ここまでとしよう' : 'まだ硬い。……もう一度、最初からだ', text: res } : { ok: true, text: res };
}
// 茶屋の噂: 近く（hx(12)以内）にいる名人を一人
export function masterRumor(s: GameState, from: number, r: () => number, hx12: number, dist: (a: number, b: number) => number): string | null {
  const c0 = s.castles[from];
  const ms = Object.values(s.generals).filter((g) => masterSkill(g) && g.status !== 'dead' && g.status !== 'young' && g.status !== 'captive' && g.loc !== from && dist(s.castles[g.loc].hex, c0.hex) <= hx12);
  if (!ms.length) return null;
  const g = ms[Math.floor(r() * ms.length)];
  return `${s.castles[g.loc].name}の城下に、${SKILL_NAME[masterSkill(g)!]}の名人と聞こえた${g.name}がいるそうだ`;
}

// ───────── 弟子入り: 三段以上の技能があれば、城下の武将が師事しに来ることがある（月に一度、25%） ─────────
export const PUPIL = { LV: 3, P: 0.25, REL: 12, FAME: 1, HP: 8, PAY: 50, STAT_P: 0.5, DECLINE_REL: 3 };
type PuX = { pupil?: { gid: string; k: SkillKey; turn: number } };
const PX = (s: GameState) => s.hero! as typeof s.hero & PuX;
export const bestSkill = (s: GameState): SkillKey | null => { const ks = (Object.keys(SKILL_NAME) as SkillKey[]).filter((k) => lv(s, k) >= PUPIL.LV).sort((a, b) => expOf(s, b) - expOf(s, a)); return ks[0] ?? null; };
// 月の終わりに: 城下の武将（townsfolk は呼ぶ側が渡す）から弟子入りを願う者を選ぶ
export function pupilEvent(s: GameState, folk: General[], r: () => number): General | null {
  const H = PX(s);
  if (isSick(s) || H.field || H.army) return null;
  const k = bestSkill(s);
  if (!k || r() >= PUPIL.P) return null;
  const cand = folk.filter((g) => g.status !== 'dead' && g.status !== 'young' && g.status !== 'captive' && masterSkill(g) !== k && g.id !== H.id);
  if (!cand.length) return null;
  const g = cand[Math.floor(r() * cand.length)];
  H.pupil = { gid: g.id, k, turn: s.turn };
  return g;
}
export const pupilOf = (s: GameState) => { const p = PX(s).pupil; return p && p.turn === s.turn ? { g: s.generals[p.gid], k: p.k } : null; };
// 教える（1旬・体力−8）: その者との親しさ+12・名声+1・謝礼（段×50貫）。半々でその者の能力が1上がる
export function teachPupil(s: GameState, r: () => number): { ok: boolean; text: string; who?: string; line?: string } {
  const H = PX(s), p = pupilOf(s);
  H.pupil = undefined;
  if (!p || !p.g) return { ok: false, text: '弟子入りを願った者は、もう去った' };
  const { g, k } = p, pay = lv(s, k) * PUPIL.PAY, st = SKILL_STAT[k];
  H.jun++; spendHp(s, PUPIL.HP);
  H.rel[g.id] = Math.min(100, (H.rel[g.id] ?? 0) + PUPIL.REL); H.fame = Math.min(100, (H.fame ?? 0) + PUPIL.FAME); H.gold += pay;
  const up = r() < PUPIL.STAT_P && g[st] < 95; if (up) g[st]++;
  return { ok: true, who: g.id, line: 'ありがたい。……この教え、生涯忘れませぬ', text: `${g.name}に${SKILL_NAME[k]}を教えた（謝礼${pay}貫）。${g.name}との親しさ+${PUPIL.REL}・名声+${PUPIL.FAME}${up ? `。${g.name}の${{ bra: '武勇', lea: '統率', int: '知略', cha: '魅力' }[st]}が上がった` : ''}。` };
}
export function declinePupil(s: GameState): { ok: boolean; text: string } {
  const H = PX(s), p = pupilOf(s);
  H.pupil = undefined;
  if (!p || !p.g) return { ok: false, text: '' };
  H.rel[p.g.id] = Math.max(0, (H.rel[p.g.id] ?? 0) - PUPIL.DECLINE_REL);
  return { ok: true, text: `${p.g.name}の弟子入りを断った（親しさ−${PUPIL.DECLINE_REL}）。` };
}

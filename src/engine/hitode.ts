// 人手（武将で遊ぶの家臣を集める道）: 名もない浪人が城下に現れる・主家の威信で召し抱えやすくなる・他家の足軽大将以下を引き抜く・名声を聞いて浪人が訪ねてくる
import { castleKoku, bumpAmity, clanName, rand } from './state';
import { hexDist } from './map';
import { onOf } from './on';
import type { GameState, General } from './types';

export const HITODE = {
  RONIN_MIN: 24, // 全国の浪人がこれを下回れば、毎月 名もない浪人が現れる
  SPAWN: 2, // 一か月に現れる数まで
  SPAWN_KOKU: 10, // 現れる城下の石高（万石）
  REL_RONIN: 50, // 浪人の身で人を召し抱える親しさ
  REL_MIN: 20, // 主家の威信が高くても、これより下げない
  POACH_ON: 40, // 引き抜ける者の主家への恩（これ未満）
  POACH_GOLD: 200, // 引き抜きの支度金
  VISIT_FAME: 35, VISIT_P: 0.15, VISIT_RANGE: 10, // 名声を聞いて浪人が訪ねてくる
};
const SEI = ['山田', '小川', '松井', '中村', '吉田', '岡部', '服部', '堀', '森', '村上', '大野', '平野', '高橋', '津田', '長井', '野村', '井上', '石川', '原', '桑原', '杉山', '本郷', '島田', '水谷', '安井', '内藤', '久保', '岩田', '横山', '藤井'];
const MEI = ['与兵衛', '左近', '新八', '甚内', '半助', '弥平次', '源五', '九郎次', '喜兵衛', '主水', '采女', '勘解由', '小平太', '十蔵', '孫六', '平八', '彦三郎', '権之丞', '市之進', '右京'];

// 名もない浪人を作る（能力は控えめ。武の者・知の者・均しの者が混じる）
function makeRonin(s: GameState, loc: number, k: number): General {
  const r = () => rand(s), base = 38 + Math.floor(r() * 18), lean = Math.floor(r() * 3);
  const st = (bonus: number) => Math.min(75, base + Math.floor(r() * 12) + bonus);
  const id = `rnn_${s.turn}_${k}`;
  const g: General = { id, name: SEI[Math.floor(r() * SEI.length)] + MEI[Math.floor(r() * MEI.length)], clan: null, bra: st(lean === 0 ? 10 : 0), int: st(lean === 1 ? 10 : 0), lea: st(lean === 2 ? 6 : 0), cha: st(0), status: 'ronin', loc, army: null, captor: null, formerClan: null, rank: 3, merit: 0, born: s.year - 20 - Math.floor(r() * 20) };
  return g;
}
// 毎月: 浪人が減りすぎていれば、大きな城下に名もない浪人が現れる（大名たちの登用で吸い上げられ、町から人が消えないように）
export function roninSpawnMonth(s: GameState) {
  const n = Object.values(s.generals).filter((g) => g.status === 'ronin').length;
  if (n >= HITODE.RONIN_MIN) return;
  const towns = s.castles.filter((c) => castleKoku(c) >= HITODE.SPAWN_KOKU);
  if (!towns.length) return;
  for (let k = 0; k < HITODE.SPAWN && n + k < HITODE.RONIN_MIN; k++) { const c = towns[Math.floor(rand(s) * towns.length)]; const g = makeRonin(s, c.i, k); s.generals[g.id] = g; }
}

// 召し抱えに要る親しさ: 浪人の身は50。どこかに仕えていれば、主家の威信が高いほど下がる（威信40で50、80で30、20まで）
export function needRel(s: GameState): number {
  const me = s.generals[s.hero!.id];
  if (!me.clan) return HITODE.REL_RONIN;
  const p = s.clans[me.clan]?.prestige ?? 40;
  return Math.max(HITODE.REL_MIN, Math.round(HITODE.REL_RONIN - (p - 40) / 2));
}
// 主家の威信による見込みの上乗せ（仕えている時だけ）
export const prestigeBonus = (s: GameState) => { const me = s.generals[s.hero!.id]; return me.clan ? (s.clans[me.clan]?.prestige ?? 40) / 300 : 0; };

// ───────── 他家の武将の引き抜き（足軽大将以下・主家への恩が薄い者） ─────────
export function canPoach(s: GameState, g: General): boolean {
  const H = s.hero!, me = s.generals[H.id];
  if (!me.clan || !g.clan || g.clan === me.clan || g.rank < 2) return false;
  if (s.clans[g.clan]?.leader === g.id || g.kin || g.liege || g.status === 'captive' || g.status === 'dead' || g.status === 'army') return false;
  return g.loc === H.town && !H.field;
}
export function poachBlock(s: GameState, g: General, cap: number, have: number): string | null {
  const H = s.hero!, rel = H.rel[g.id] ?? 0, need = needRel(s) + 10;
  if (have >= cap) return cap ? `家臣はいま${cap}人まで` : '足軽大将になるまで家臣は持てない';
  if (onOf(g) >= HITODE.POACH_ON) return `${clanName(s, g.clan!)}家への恩が厚い（恩${Math.round(onOf(g))}）`;
  if (rel < need) return `まだ親しくない（親しさ${rel}／${need}）`;
  if (H.gold < HITODE.POACH_GOLD) return `支度金${HITODE.POACH_GOLD}貫が要る`;
  return null;
}
export function poachChance(s: GameState, g: General): number {
  const H = s.hero!, me = s.generals[H.id], rel = H.rel[g.id] ?? 0;
  return Math.max(0.05, Math.min(0.85, 0.15 + (HITODE.POACH_ON - onOf(g)) / 100 + (H.fame ?? 0) / 250 + me.cha / 500 + prestigeBonus(s) + (rel - needRel(s) - 10) / 150));
}
// 引き抜きの結果（家臣にするのは呼ぶ側の take）。成功すれば相手の家との仲が下がる。断られれば親しさが下がる
export function poachRoll(s: GameState, g: General): boolean {
  const H = s.hero!, me = s.generals[H.id], ok = rand(s) < poachChance(s, g);
  H.jun++;
  if (ok) { H.gold -= HITODE.POACH_GOLD; if (me.clan && g.clan) bumpAmity(s, me.clan, g.clan, -6); g.formerClan = g.clan; }
  else H.rel[g.id] = Math.max(0, (H.rel[g.id] ?? 0) - 8);
  return ok;
}

// ───────── 名声を聞いて浪人が訪ねてくる（月の終わり） ─────────
export function fameVisitMonth(s: GameState, cap: number, have: number): string[] {
  const H = s.hero!; if (!H || H.field || H.army || have >= cap || (H.fame ?? 0) < HITODE.VISIT_FAME || rand(s) >= HITODE.VISIT_P) return [];
  const here = s.castles[H.town];
  const cand = Object.values(s.generals).filter((g) => g.status === 'ronin' && g.loc !== H.town && !(H.followers ?? []).includes(g.id) && hexDist(s.castles[g.loc].hex, here.hex) <= HITODE.VISIT_RANGE);
  if (!cand.length) return [];
  const g = cand[Math.floor(rand(s) * cand.length)];
  g.loc = H.town; H.rel[g.id] = Math.max(H.rel[g.id] ?? 0, needRel(s));
  return [`名声を聞いて、浪人の${g.name}（武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}）が${here.name}の城下を訪ねてきた。武家屋敷で会えば、家臣に召し抱えられる。`];
}

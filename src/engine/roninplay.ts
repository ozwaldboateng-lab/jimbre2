// 武将で遊ぶ: 浪人の遊び（物語の外）。主命も俸禄もない代わりに、どこへでも行ける。
// 稼ぐ（陣借り・用心棒・武芸の指南・商い）、名を上げる（名声）、仲間を集める（浪人の武将を配下に・牢人衆を雇う）、
// そして仕官するか、国衆の城を乗っ取って旗揚げする（旗揚げすれば、その家の当主として大名プレイへ）
import type { Act } from './hero';
import { newIe } from './maeda';
import { hexDist } from './map';
import * as R from './rules';
import { addLog, castleKoku, clanCastles, clanName, garrisonMax, learnCastle, rand } from './state';
import type { Clan, GameState, General } from './types';

export const RONIN = {
  UPKEEP_SELF: 10, UPKEEP_FOLLOWER: 25, UPKEEP_SHU: 0.15, // 毎月の扶持: 自分・配下一人・牢人衆一人
  MERC_PAY: 120, MERC_FAME: 3, MERC_KUBI: 0.5, // 陣借り: 合戦一つの雇い賃・名声・首級を挙げる見込み
  GUARD_PAY: [40, 90], GUARD_FAME: 1, GUARD_RISK: 0.15, // 用心棒: 稼ぎ・名声・手傷の見込み
  TEACH_PAY: 50, TEACH_FAME: 1, TEACH_BRA: 70, // 武芸の指南（武勇70以上、大きな城下で）
  HIRE_COST: 300, HIRE_N: 50, // 牢人衆を雇う: 300貫で50人
  FOLLOW_REL: 50, // 浪人の武将を誘える親しさ
  RISE: { followers: 2, shu: 500, gold: 1000 }, // 旗揚げに要るもの
};
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
export const fameOf = (s: GameState) => s.hero?.fame ?? 0;
export function addFame(s: GameState, n: number) { const H = s.hero!; H.fame = clamp((H.fame ?? 0) + n); }
export const isRonin = (s: GameState) => !!s.hero && s.hero.story !== 'toshiie' && !s.generals[s.hero.id].clan;
export const followersOf = (s: GameState): General[] => (s.hero?.followers ?? []).map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead');
export const isFollower = (s: GameState, g: General) => !!s.hero?.followers?.includes(g.id);
const town = (s: GameState) => s.castles[s.hero!.town];
const used = (s: GameState) => { s.hero!.jun++; };

// ───────── 稼ぐ ─────────
// 陣借り: この地にいる、どの家の軍勢にも雇われの身で加わる（合戦が終われば雇い賃と名声。元の主家の敵でも構わない）
export function mercArmies(s: GameState) { const H = s.hero!; return Object.values(s.armies).filter((a) => a.hex === H.hex && !a.ikki && !a.routed && a.troops > 0); }
export function jingari(s: GameState, id: number): Act {
  const H = s.hero!, a = s.armies[id];
  if (!a || a.hex !== H.hex) return { ok: false, text: 'その軍勢はここにいない' };
  H.merc = { army: a.id, clan: a.clan, since: s.turn, fought: a.fought ?? -1 };
  used(s);
  const L = s.generals[a.main];
  return { ok: true, who: L?.id, line: fameOf(s) >= 40 ? `${s.generals[H.id].name}か。名は聞いておる。存分に働け。` : '槍が一本増えるのは助かる。給金は戦のあとだ。', text: `${clanName(s, a.clan)}家の${L?.name ?? ''}の軍勢に陣借りした。合戦が終われば雇い賃が出る。` };
}
export function leaveMerc(s: GameState): Act { const H = s.hero!; if (!H.merc) return { ok: false, text: '陣借りしていない' }; H.merc = undefined; used(s); return { ok: true, text: '陣を離れた。' }; }
// 毎月: 陣借りの軍勢について行き、合戦があれば雇い賃と名声・首級
function mercMonth(s: GameState): string[] {
  const H = s.hero!, m = H.merc;
  if (!m) return [];
  const a = s.armies[m.army];
  if (!a) { H.merc = undefined; return ['陣借りしていた軍勢は陣を払った。']; }
  H.hex = a.hex; const c = Object.values(s.castles).find((x) => x.hex === a.hex); if (c) { H.town = c.i; H.field = false; s.generals[H.id].loc = c.i; } else H.field = true;
  if ((a.fought ?? -1) > m.fought) {
    m.fought = a.fought!;
    const me = s.generals[H.id], kubi = rand(s) < RONIN.MERC_KUBI + me.bra / 400;
    const pay = Math.round(RONIN.MERC_PAY * (1 + fameOf(s) / 100));
    H.gold += pay; addFame(s, RONIN.MERC_FAME + (kubi ? 2 : 0)); if (kubi) H.kubi = (H.kubi ?? 0) + 1;
    return [`陣借りした${clanName(s, m.clan)}家の合戦で働いた。雇い賃${pay}貫・名声+${RONIN.MERC_FAME + (kubi ? 2 : 0)}${kubi ? '。首級を挙げた' : ''}。`];
  }
  return [];
}
// 用心棒: 商人の荷を護って稼ぐ（大きな城下か商いの要所で）
export function yojinbo(s: GameState): Act {
  const H = s.hero!, me = s.generals[H.id];
  used(s);
  if (rand(s) < RONIN.GUARD_RISK - me.bra / 1000) { H.gold += RONIN.GUARD_PAY[0] / 2; return { ok: true, text: `荷を護る道中で野盗に襲われ、手傷を負った。半分の${RONIN.GUARD_PAY[0] / 2}貫だけ受け取った。` }; }
  const pay = Math.round(RONIN.GUARD_PAY[0] + rand(s) * (RONIN.GUARD_PAY[1] - RONIN.GUARD_PAY[0]));
  H.gold += pay; addFame(s, RONIN.GUARD_FAME); H.rel['merchant'] = clamp((H.rel['merchant'] ?? 0) + 3);
  return { ok: true, text: `商人の荷を護って隣の宿まで送った。${pay}貫。名声+${RONIN.GUARD_FAME}。` };
}
// 武芸の指南（武勇70以上、大きな城下で）
export const canTeach = (s: GameState) => isRonin(s) && s.generals[s.hero!.id].bra >= RONIN.TEACH_BRA && castleKoku(town(s)) >= 12;
export function teach(s: GameState): Act {
  const H = s.hero!;
  used(s); const pay = Math.round(RONIN.TEACH_PAY * (1 + fameOf(s) / 100));
  H.gold += pay; addFame(s, RONIN.TEACH_FAME);
  return { ok: true, text: `道場で若い者に槍を教えた。${pay}貫。名声+${RONIN.TEACH_FAME}。` };
}

// ───────── 仲間を集める ─────────
// この城下の浪人の武将（配下に誘える）
export const roninHere = (s: GameState) => Object.values(s.generals).filter((g) => g.status === 'ronin' && g.loc === s.hero!.town && !isFollower(s, g) && g.id !== s.hero!.id);
export function invite(s: GameState, gid: string): Act {
  const H = s.hero!, me = s.generals[H.id], g = s.generals[gid];
  if (!g || g.status !== 'ronin' || g.loc !== H.town) return { ok: false, text: 'その人はここにいない' };
  const rel = H.rel[gid] ?? 0;
  if (rel < RONIN.FOLLOW_REL) return { ok: false, text: `まだ親しくない（親しさ${rel}／${RONIN.FOLLOW_REL}。訪ねて親しくなる）` };
  used(s);
  const p = 0.3 + fameOf(s) / 150 + me.cha / 300 + (rel - RONIN.FOLLOW_REL) / 150 - followersOf(s).length * 0.05;
  if (rand(s) < Math.min(0.9, p)) { (H.followers ??= []).push(gid); return { ok: true, who: gid, line: 'おぬしの下でなら、もう一度槍を振ってもよい。', text: `${g.name}が配下になった（配下${followersOf(s).length}人）。扶持は月${RONIN.UPKEEP_FOLLOWER}貫。` }; }
  H.rel[gid] = clamp(rel - 5);
  return { ok: true, who: gid, line: '……名もない浪人の下につく気はない。もう少し名を上げてからにしてくれ。', text: `${g.name}には断られた。名声が上がれば、聞いてくれるかもしれない。` };
}
// 牢人衆を雇う（手勢になる。毎月扶持がかかる）
export function hire(s: GameState): Act {
  const H = s.hero!;
  if (H.gold < RONIN.HIRE_COST) return { ok: false, text: `金${RONIN.HIRE_COST}貫が要る` };
  used(s); H.gold -= RONIN.HIRE_COST;
  H.ie ??= { ...newIe(), shu: 0 };
  H.ie.shu += RONIN.HIRE_N;
  return { ok: true, text: `牢人衆を${RONIN.HIRE_N}人雇った（手勢${H.ie.shu}）。扶持は一人月${RONIN.UPKEEP_SHU}貫。` };
}

// ───────── 毎月: 扶持と陣借り ─────────
export function roninMonth(s: GameState): string[] {
  if (!isRonin(s)) return [];
  const H = s.hero!, out: string[] = [...mercMonth(s)];
  // 配下は主人公について歩く
  for (const g of followersOf(s)) { g.loc = H.town; g.status = 'ronin'; }
  const fol = followersOf(s), shu = H.ie?.shu ?? 0;
  const cost = Math.round(RONIN.UPKEEP_SELF + fol.length * RONIN.UPKEEP_FOLLOWER + shu * RONIN.UPKEEP_SHU);
  if (H.gold >= cost) { H.gold -= cost; out.push(`浪人の暮らし: 扶持${cost}貫（配下${fol.length}人・牢人衆${shu}人）。手元${H.gold}貫。`); }
  else {
    H.gold = 0;
    if (H.ie && shu) { const lost = Math.ceil(shu / 3); H.ie.shu -= lost; out.push(`扶持が払えず、牢人衆が${lost}人去った。`); }
    if (fol.length && rand(s) < 0.4) { const g = fol[fol.length - 1]; H.followers = H.followers!.filter((x) => x !== g.id); out.push(`扶持が払えず、${g.name}が去った。`); }
  }
  return out;
}

// ───────── 国衆の城を探る・旗揚げ ─────────
export const kunishuHere = (s: GameState) => { const c = town(s); return isRonin(s) && !s.hero!.field && !c.owner ? c : null; };
export function scout(s: GameState): Act {
  const H = s.hero!, c = kunishuHere(s);
  if (!c) return { ok: false, text: 'ここは国衆の城ではない' };
  used(s);
  (H.scouted ??= {})[c.i] = s.turn;
  return { ok: true, text: `${c.name}を探った。城兵はおよそ${Math.round(c.garrison / 100) * 100}、治安${Math.round(c.chian)}。${c.garrison < (H.ie?.shu ?? 0) * 1.5 ? '手勢で夜討ちをかければ、取れぬこともない。' : '今の手勢では、力攻めは難しい。'}` };
}
export function riseNeeds(s: GameState): string[] {
  const H = s.hero!, need: string[] = [];
  if (followersOf(s).length < RONIN.RISE.followers) need.push(`配下${followersOf(s).length}／${RONIN.RISE.followers}人`);
  if ((H.ie?.shu ?? 0) < RONIN.RISE.shu) need.push(`手勢${H.ie?.shu ?? 0}／${RONIN.RISE.shu}`);
  if (H.gold < RONIN.RISE.gold) need.push(`兵糧の金${H.gold}／${RONIN.RISE.gold}貫`);
  return need;
}
// 旗揚げの見込み（夜討ち: 手勢と配下の統率で城兵を破る／内応: 探ってあれば、金と名声で門を開けさせる）
export function riseChance(s: GameState, how: 'youchi' | 'naio'): number {
  const H = s.hero!, c = kunishuHere(s);
  if (!c) return 0;
  const fol = followersOf(s), lea = fol.length ? fol.reduce((t, g) => t + g.lea, 0) / fol.length : 40, me = s.generals[H.id];
  if (how === 'youchi') { const atk = (H.ie?.shu ?? 0) * (1 + (lea + me.lea) / 200) * (1 + fameOf(s) / 200); return clamp(atk / (atk + c.garrison * 1.2), 0.05, 0.9); }
  const sc = H.scouted?.[c.i] !== undefined && s.turn - H.scouted[c.i] <= 6;
  return sc ? clamp(0.2 + (me.int + me.cha) / 400 + fameOf(s) / 200 - c.chian / 300, 0.05, 0.85) : 0;
}
export function rise(s: GameState, how: 'youchi' | 'naio'): { ok: boolean; text: string; clan?: string } {
  const H = s.hero!, me = s.generals[H.id], c = kunishuHere(s);
  if (!c) return { ok: false, text: 'ここは国衆の城ではない' };
  if (riseNeeds(s).length) return { ok: false, text: `旗揚げにはまだ足りない（${riseNeeds(s).join('・')}）` };
  if (how === 'naio' && !riseChance(s, 'naio')) return { ok: false, text: '内応を仕掛けるには、先に城を探っておく' };
  if (how === 'naio') H.gold -= 500;
  const p = riseChance(s, how);
  used(s);
  if (rand(s) >= p) {
    const lost = Math.round((H.ie?.shu ?? 0) * (how === 'youchi' ? 0.4 : 0.1));
    if (H.ie) H.ie.shu -= lost; addFame(s, -3);
    return { ok: false, text: how === 'youchi' ? `夜討ちは破れた。手勢${lost}人を失い、名声−3。` : `内応は露見した。名声−3。${lost ? `手勢${lost}人が散った。` : ''}` };
  }
  // 旗揚げ: 主人公を当主とする新しい家を立て、城を取る
  const fam = me.name.slice(0, 2);
  const id = `hata_${me.id}`;
  const C: Clan = { id, name: Object.values(s.clans).some((x) => x.name === fam && x.alive) ? me.name : fam, color: '#b5442e', leader: me.id, prestige: 20 + Math.round(fameOf(s) / 4), food: Math.round(H.gold * 10), alive: true, stance: '均衡', target: null, gold: H.gold, guns: 0, budget: { chisui: 10, hodo: 10 }, focus: null, mobilize: R.MOBILIZE_DEFAULT, court: 0 };
  s.clans[id] = C;
  c.owner = id; c.oldOwner = null; c.ember = 30; c.chian = Math.max(30, c.chian - 10); c.garrison = Math.max((H.ie?.shu ?? 0), Math.round(garrisonMax(c) * 0.3));
  learnCastle(s, c.i, id);
  me.clan = id; me.status = 'free'; me.loc = c.i; me.rank = 0; me.army = null;
  for (const g of followersOf(s)) { g.clan = id; g.status = 'free'; g.loc = c.i; g.rank = 1; g.merit = R.MERIT_AT[1]; }
  H.gold = 0;
  addLog(s, `浪人${me.name}が${c.name}を乗っ取り、旗を揚げた！ ${C.name}家が立った。`, 'castle', true);
  return { ok: true, clan: id, text: `${c.name}を${how === 'youchi' ? '夜討ちで' : '内応で'}乗っ取った。${C.name}家の当主として旗を揚げる。` };
}
// 仕官の見込み（名声・魅力・功績・当主との親しさ・口添え・首級・連れて行く配下）
export function serviceChance(s: GameState, clan: string): number {
  const H = s.hero!, me = s.generals[H.id], C = s.clans[clan], L = C.leader ? s.generals[C.leader] : null;
  const friends = Object.values(s.generals).filter((g) => g.clan === clan && (H.rel[g.id] ?? 0) >= 60).length;
  return clamp(0.15 + fameOf(s) / 150 + me.cha / 400 + me.merit / 3000 + (L ? (H.rel[L.id] ?? 0) / 250 : 0) + Math.min(2, friends) * 0.1 + Math.min(3, H.kubi ?? 0) * 0.05 + followersOf(s).length * 0.03, 0.05, 0.95);
}
// 仕官したときの身分（名声と、連れて行く配下・手勢で決まる）
export function serviceRank(s: GameState): number {
  const f = fameOf(s), n = followersOf(s).length, shu = s.hero!.ie?.shu ?? 0;
  return f >= 60 || n >= 3 || shu >= 800 ? 1 : f >= 25 || n >= 1 || shu >= 300 ? 2 : 3;
}
// 近くの国衆の城（旗揚げの的の目安）
export const nearKunishu = (s: GameState) => s.castles.filter((c) => !c.owner).sort((a, b) => hexDist(a.hex, s.hero!.hex) - hexDist(b.hex, s.hero!.hex)).slice(0, 3);
export { clanCastles };

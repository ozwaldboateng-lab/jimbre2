// 武将で遊ぶ（物語の外）: 家族と跡継ぎ、主家の後継ぎ。
// 懇意の重臣に縁組を申し込み、妻を迎えると年ごとに子が生まれる。男子は十五で元服し、一門の家臣になる。
// 隠居するか世を去った時、元服した男子がいれば、その子が家を継いで続けられる（城と家・家臣・金は引き継ぐ）。
// 家中第一の臣で主君の覚え厚く、主君に成人した一門がなければ、主君は主人公を跡継ぎに指名する。主君が世を去れば家督を継ぎ、大名プレイへ
import type { Act } from './hero';
import { lv } from './skill';
import { initOn } from './on';
import { syncGovernor } from './career';
import * as R from './rules';
import { addLog, clanName, rand, surnameOf } from './state';
import type { GameState, General } from './types';

export const FAM = {
  WED_REL: 50, WED_RANK: 1, WED_AGE: 35, WED_COST: 500, WED_BASE: 0.4, WED_REL_K: 0.005, WED_FAME_K: 0.003, WED_BOND: 15, // 縁組: 懇意の侍大将以上（35歳以上）に。婚礼500貫
  BIRTH_P: 0.35, MAX_KIDS: 5, FERTILE_AGE: 55, GENPUKU: 15, // 子: 年ごとに35%、5人まで、主人公55歳まで。男子は15で元服
  HEIR_FAVOR: 95, HEIR_LORD_AGE: 50, // 主家の跡継ぎに指名される: 家中第一の臣・覚え95・主君50歳以上で成人した一門がいない
};
export interface Kid { name: string; born: number; son: boolean; gid?: string }
type FamX = { wife?: { from: string; name: string; turn: number }; kids?: Kid[]; gen?: number; wedTried?: number; heirNamed?: number };
const X = (s: GameState) => s.hero! as typeof s.hero & FamX;
const meOf = (s: GameState) => s.generals[s.hero!.id];
const ageOf = (s: GameState, g: General) => s.year - (g.born ?? s.year - 30);
const givenOf = (name: string) => name.slice(surnameOf(name).length);
const SECOND = ['長', '政', '勝', '直', '常', '光', '忠', '次', '秀', '房', '綱', '重'];
const GIRL = ['まつ', 'こう', 'ちよ', 'ふく', 'たね', 'きく', 'さこ', 'なつ'];

// ───────── 縁組 ─────────
export function wedBlock(s: GameState, g: General): string | null {
  const H = X(s), me = meOf(s);
  if (H.story === 'toshiie' || !me.clan) return '物語の外の、主家に仕える主人公だけ';
  if (H.wife) return '妻を迎えてある';
  if (!H.ie) return '家を立ててから';
  if (g.clan !== me.clan || g.id === me.id || g.rank > FAM.WED_RANK || ageOf(s, g) < FAM.WED_AGE) return '家中の侍大将以上の重臣（35歳以上）に';
  if ((H.rel[g.id] ?? 0) < FAM.WED_REL) return `「懇意」（親しさ${FAM.WED_REL}）から`;
  if (H.wedTried === s.turn) return '今月はもう話した';
  if (H.gold < FAM.WED_COST) return `婚礼の費えが足りない（${FAM.WED_COST}貫）`;
  return null;
}
export const wedChance = (s: GameState, g: General) => Math.min(0.9, lv(s, 'bensetsu') * 0.03 + FAM.WED_BASE + (s.hero!.rel[g.id] ?? 0) * FAM.WED_REL_K + (s.hero!.fame ?? 0) * FAM.WED_FAME_K);
export function proposeWed(s: GameState, gid: string): Act {
  const g = s.generals[gid], why = g ? wedBlock(s, g) : '相手がいない';
  if (why) return { ok: false, text: why };
  const H = X(s);
  H.jun++; H.wedTried = s.turn;
  if (rand(s) < wedChance(s, g)) {
    H.gold -= FAM.WED_COST;
    const name = `${surnameOf(g.name)}の娘`;
    H.wife = { from: gid, name, turn: s.turn };
    H.rel[gid] = Math.min(100, (H.rel[gid] ?? 0) + FAM.WED_BOND);
    addLog(s, `${meOf(s).name}が${g.name}の娘を妻に迎えた。`, 'info', true);
    return { ok: true, who: gid, line: 'そなたになら、娘を預けられる。……泣かせるなよ。', text: `${g.name}の娘を妻に迎えた（婚礼${FAM.WED_COST}貫）。${g.name}との親しさ+${FAM.WED_BOND}。年ごとに子が生まれることがある。` };
  }
  return { ok: true, who: gid, line: '娘のことは、まだ考えておらぬ。……いずれまた。', text: `縁組はまとまらなかった。` };
}

// ───────── 子と元服（毎年正月） ─────────
export function familyYear(s: GameState): string[] {
  const H = X(s), me = meOf(s), out: string[] = [];
  if (!H.wife || H.story === 'toshiie' || me.status === 'dead') return out;
  const kids = (H.kids ??= []);
  if (kids.length < FAM.MAX_KIDS && ageOf(s, me) <= FAM.FERTILE_AGE && rand(s) < FAM.BIRTH_P) {
    const son = rand(s) < 0.5, n = kids.filter((k) => k.son === son).length;
    const name = son ? `${['', '次', '三', '四', '五'][n] ?? ''}${n === 0 ? '嫡男' : '男'}` : GIRL[(kids.length + s.year) % GIRL.length];
    kids.push({ name, born: s.year, son });
    out.push(son ? `${n === 0 ? '嫡男' : `${['', '次', '三', '四', '五'][n]}男`}が生まれた。` : `娘（${name}）が生まれた。`);
  }
  for (const k of kids) if (k.son && !k.gid && s.year - k.born >= FAM.GENPUKU) {
    const g = genpuku(s, k);
    out.push(`${k.name}が元服し、${g.name}と名乗った。一門の家臣として仕える。`);
  }
  return out;
}
function genpuku(s: GameState, k: Kid): General {
  const H = X(s), me = meOf(s);
  const tsuu = givenOf(me.name).slice(0, 1) || '';
  const used = new Set(Object.values(s.generals).map((g) => g.name));
  let name = '';
  for (let i = 0; i < SECOND.length && (!name || used.has(name)); i++) name = `${surnameOf(me.name)}${tsuu}${SECOND[(k.born + i) % SECOND.length]}`;
  const id = `${me.id}_son_${k.born}_${(H.kids ?? []).indexOf(k)}`;
  const st = (v: number) => Math.max(R.STAT_FLOOR, Math.min(90, Math.round(v * 0.75 + rand(s) * 20)));
  const g: General = { id, name, clan: me.clan, bra: st(me.bra), int: st(me.int), lea: st(me.lea), cha: st(me.cha), status: me.clan ? 'kashin' : 'ronin', loc: s.hero!.fuchu ?? me.loc, army: null, captor: null, formerClan: null, rank: 2, merit: R.MERIT_AT[2], born: k.born, liege: me.clan ? me.id : undefined };
  s.generals[id] = g;
  if (me.clan) initOn(s, g);
  k.gid = id;
  (s.hero!.retainers ??= []).push(id); // 一門の家臣は家臣の枠の外
  return g;
}
export const sonsOf = (s: GameState): General[] => (X(s).kids ?? []).filter((k) => k.gid).map((k) => s.generals[k.gid!]).filter((g) => g && g.status !== 'dead' && g.status !== 'captive');
export const heirSon = (s: GameState): General | null => sonsOf(s).sort((a, b) => (a.born ?? 0) - (b.born ?? 0))[0] ?? null;
export const kinRetainers = (s: GameState) => (X(s).kids ?? []).filter((k) => k.gid).length;

// ───────── 子が家を継いで続ける（隠居・死） ─────────
// 子が新しい主人公になる: 家・家の格・金・家臣・城（主家にいれば）を継ぐ。功績と覚えは改めて、名声は半ば
export function succeedSon(s: GameState): Act {
  const H = X(s), old = meOf(s), son = heirSon(s);
  if (!son) return { ok: false, text: '家を継げる子がいない' };
  const lostClan = !old.clan || !s.clans[old.clan]?.alive;
  if (old.status !== 'dead') old.status = 'dead'; // 隠居（盤から退く）
  H.retainers = (H.retainers ?? []).filter((id) => id !== son.id);
  for (const k of H.kids ?? []) if (k.gid === son.id) k.gid = undefined;
  H.kids = []; H.wife = undefined; // 子の代の家族は、また縁組から
  for (const a of Object.values(s.armies)) { if (a.main === son.id) { const st = (a.staff ?? []).shift(); if (st) a.main = st; } a.staff = (a.staff ?? []).filter((x) => x !== son.id); }
  for (const c of s.castles) if (c.governor === son.id || c.governor === old.id) c.governor = null; // 跡を継ぐ: 先代の城主の欄は空けて、子を城主に（下で）
  for (const [k, v] of Object.entries(H.daikan ?? {})) if (v === son.id) delete H.daikan![+k];
  son.status = 'hero'; son.liege = undefined; son.army = null;
  son.clan = lostClan ? null : old.clan; son.loc = H.town;
  son.rank = Math.min(son.rank, 1); son.merit = Math.max(son.merit, R.MERIT_AT[1]);
  for (const g of Object.values(s.generals)) if (g.liege === old.id) g.liege = son.id;
  H.id = son.id; H.over = undefined; H.favor = 50; H.fame = Math.round((H.fame ?? 0) / 2); H.gen = (H.gen ?? 1) + 1;
  H.quest = null; H.army = null; H.leads = undefined; H.lent = undefined; H.declines = 0;
  const car = (H.career ??= { steps: [] });
  car.steps = car.steps.filter((k) => k === 'ie' || k === 'shiro' || k === 'kuni');
  if (!car.steps.includes('ie')) car.steps.unshift('ie');
  car.since = car.steps.includes('shiro') ? s.turn : undefined; car.kuniAt = car.steps.includes('kuni') ? s.turn : undefined;
  s.fronts = (s.fronts ?? []).filter((f) => f.leader !== old.id);
  syncGovernor(s); // 子が居城の城主に
  addLog(s, `${son.name}が${old.name}の跡を継いだ。`, 'info', true);
  return { ok: true, text: `${old.name}の跡を、${son.name}が継いだ（${H.gen}代目）。家と家臣、城を継ぐ。主君の覚えは改めて50から。` };
}

// ───────── 主家の後継ぎ ─────────
export function lordHeirEvent(s: GameState): { lines: string[]; lord: string } | null {
  const H = X(s), me = meOf(s);
  if (H.story === 'toshiie' || !me.clan || H.heirNamed) return null;
  const C = s.clans[me.clan], L = C.leader ? s.generals[C.leader] : null;
  if (!L || !(H.career?.steps ?? []).includes('hitto') || H.favor < FAM.HEIR_FAVOR || ageOf(s, L) < FAM.HEIR_LORD_AGE) return null;
  if (C.heir && C.heir !== me.id && s.generals[C.heir]?.status !== 'dead') return null;
  const grownKin = Object.values(s.generals).some((g) => g.clan === me.clan && g.kin && g.id !== L.id && g.status !== 'dead' && g.status !== 'young' && g.status !== 'captive');
  if (grownKin) return null;
  C.heir = me.id; H.heirNamed = s.turn;
  addLog(s, `${L.name}が${me.name}を跡継ぎに指名した。`, 'info', true);
  return { lord: L.id, lines: [`主君${L.name}が、${me.name}を跡継ぎに指名した。主君が世を去れば、${clanName(s, me.clan)}家の家督を継ぎ、大名として家を率いる。`] };
}
// 主人公が主家の当主になった（指名による家督・本体の跡継ぎ選び）
export const inherited = (s: GameState) => { const me = s.hero ? meOf(s) : null; return !!me && !!me.clan && s.hero!.story !== 'toshiie' && s.clans[me.clan]?.leader === me.id; };

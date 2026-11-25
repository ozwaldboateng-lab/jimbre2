// 武将で遊ぶ（物語の外）: 侍大将の攻略の軍議。攻略の主命で軍勢を率い、落とす城が攻められる所まで来たら、月に一度軍議を開いて攻め方を選ぶ（1旬）。
// 力攻め（軍勢の士気+0.1）・兵糧攻め（攻めずに囲んでいる月ごとに、城兵−20%・城の士気−0.1。城兵が囲み始めの半分を切るか、士気が底のまま2か月で開城）・調略（内応を約束させれば、来月まで攻めれば門が開く）・夜討ち（槍働きの盤で城に忍び込む。討ち払えば城兵−25%・城の士気−0.15）。
// 家臣・寄子は、それぞれの型に合った攻め方を勧める（知略→調略、統率→兵糧攻め、武勇80から→夜討ち、ほかは力攻め）
import type { Act } from './hero';
import { leading } from './heroArmy';
import { attackTargets } from './move';
import { lv } from './skill';
import { captureCastle } from './ops';
import { clanName, rand } from './state';
import type { Ban } from './ban';
import type { GameState, General } from './types';

export type Saku = 'chikara' | 'hyoro' | 'choryaku' | 'youchi';
export const SAKU_NAME: Record<Saku, string> = { chikara: '力攻め', hyoro: '兵糧攻め', choryaku: '調略', youchi: '夜討ち' };
export const SAKU_DESC: Record<Saku, string> = { chikara: 'すぐに攻める。軍勢の士気+0.1（損害は大きくなりがち）', hyoro: '攻めずに囲む。囲んでいる月ごとに、城兵−20%・城の士気−0.1。城兵が囲み始めの半分を切るか、士気が底のまま2か月で開城する（時がかかる）', choryaku: '城内の者に内応を約束させる。うまくいけば、来月まで攻めれば門が開く（知略・魅力・弁舌が効く）', youchi: '槍働きの盤で城に忍び込む。討ち払えば城兵−25%・城の士気−0.15' };
export const GUNGI = { CHIKARA: 0.1, HYORO: 0.2, HYORO_MORALE: 0.1, HYORO_OPEN: 0.5, HYORO_FLOOR: 0.3, HYORO_FLOOR_MONTHS: 2, YOUCHI: 0.25, YOUCHI_MORALE: 0.15, CHO_BASE: 0.15 };
type GX = { gungi?: number; hyoro?: { castle: number; turn: number; g0?: number; low?: number }; retainers?: string[]; yoriko?: string[] };
const X = (s: GameState) => s.hero! as NonNullable<GameState['hero']> & GX;
// 落とす城（攻略の主命の城）が、率いる軍勢から攻められる所にあるか
export function targetCastle(s: GameState) {
  const H = s.hero!, a = leading(s), q = H.quest;
  if (!a || !q || q.kind !== 'kouryaku') return null;
  const c = s.castles[q.castle];
  return c.owner && c.owner !== s.generals[H.id].clan && attackTargets(s, a).some((t) => t.hex === c.hex) ? c : null;
}
export const gungiBlock = (s: GameState) => (!leading(s) ? '軍勢を率いている時だけ' : !targetCastle(s) ? '落とす城を攻められる所まで軍勢を進めてから' : X(s).gungi === s.turn ? '今月はもう軍議を開いた' : null);
// 家臣・寄子の進言
export const sakuOf = (g: General): Saku => (g.int >= g.bra && g.int >= g.lea ? 'choryaku' : g.lea >= g.bra ? 'hyoro' : g.bra >= 80 ? 'youchi' : 'chikara');
const LINE: Record<Saku, string> = { chikara: '一気に揉み潰しましょう。勢いのあるうちに。', hyoro: '急いては事を仕損じます。囲んで干しましょう。', choryaku: '城の中に手を回しましょう。門は内から開けさせるもの。', youchi: '今夜、手勢を連れて忍び込みます。お任せを。' };
export function advisers(s: GameState): { g: General; saku: Saku; line: string }[] {
  const H = X(s), ids = [...(H.retainers ?? []), ...(H.yoriko ?? [])];
  return ids.map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead' && g.status !== 'captive').slice(0, 4).map((g) => ({ g, saku: sakuOf(g), line: LINE[sakuOf(g)] }));
}
export const choryakuChance = (s: GameState) => { const me = s.generals[s.hero!.id], best = Math.max(0, ...advisers(s).map((a) => a.g.int)); return Math.max(0.05, Math.min(0.85, GUNGI.CHO_BASE + (me.int + me.cha) / 400 + lv(s, 'bensetsu') * 0.05 + best / 400)); };
// 軍議で決める（夜討ちは盤を開くので、画面から applyYouchi で返す）
export function gungi(s: GameState, saku: Saku): Act & { ban?: boolean } {
  const why = gungiBlock(s); if (why) return { ok: false, text: why };
  const H = X(s), a = leading(s)!, c = targetCastle(s)!, me = s.generals[H.id];
  H.gungi = s.turn; H.jun++;
  if (saku === 'chikara') { a.morale = Math.min(1.3, a.morale + GUNGI.CHIKARA); return { ok: true, text: `軍議で力攻めと決めた。兵の意気が上がった（士気${a.morale.toFixed(2)}）。${c.name}へ出陣を命じよ。` }; }
  if (saku === 'hyoro') { H.hyoro = { castle: c.i, turn: s.turn, g0: c.garrison, low: 0 }; return { ok: true, text: `軍議で兵糧攻めと決めた。${c.name}を囲み、攻めずに月を送れば城は痩せていく。` }; }
  if (saku === 'choryaku') {
    const p = choryakuChance(s);
    if (rand(s) < p) { c.naio = s.turn + 1; c.naioBy = me.clan!; return { ok: true, text: `城内の者に内応を約束させた（見込み${Math.round(p * 100)}%）。来月まで、${c.name}を攻めれば門が開く。` }; }
    return { ok: true, text: `調略を仕掛けたが、${c.name}の者は乗ってこなかった（見込み${Math.round(p * 100)}%）。` };
  }
  return { ok: true, ban: true, text: `${c.name}へ夜討ちをかける。` };
}
export function applyYouchi(s: GameState, b: Ban): string {
  const c = s.castles[s.hero!.quest?.castle ?? 0];
  if (b.over === 'win') { c.garrison = Math.round(c.garrison * (1 - GUNGI.YOUCHI)); c.gMorale = Math.max(0.3, c.gMorale - GUNGI.YOUCHI_MORALE); return `夜討ちで${c.name}の守りを崩した（城兵${c.garrison}・城の士気${c.gMorale.toFixed(2)}）。`; }
  return `夜討ちは${b.over === 'retreat' ? '途中で退いた' : '果たせなかった'}。${c.name}の守りは崩れなかった。`;
}
// 毎月: 兵糧攻め（囲んでいて、その月に出陣を命じていない時）
export function hyoroMonth(s: GameState): string[] {
  const H = X(s), h = H.hyoro; if (!h) return [];
  const c = s.castles[h.castle], a = leading(s), me = s.generals[H.id];
  if (!a || c.owner === me.clan || !c.owner || !attackTargets(s, a).some((t) => t.hex === c.hex)) { H.hyoro = undefined; return []; }
  if (H.order === c.hex) return [];
  const was = c.gMorale;
  c.garrison = Math.round(c.garrison * (1 - GUNGI.HYORO)); c.gMorale = Math.max(GUNGI.HYORO_FLOOR, c.gMorale - GUNGI.HYORO_MORALE);
  if (was <= GUNGI.HYORO_FLOOR) h.low = (h.low ?? 0) + 1; // 士気が底のまま過ぎた月
  // 開城: 城兵が囲み始めの半分を切るか、士気が底のまま2か月。城に敵の軍勢（後詰め）が入っていれば降らない
  const relief = Object.values(s.armies).some((x) => x.hex === c.hex && x.clan === c.owner);
  if (!relief && (c.garrison <= (h.g0 ?? c.garrison / (1 - GUNGI.HYORO)) * GUNGI.HYORO_OPEN || (h.low ?? 0) >= GUNGI.HYORO_FLOOR_MONTHS)) {
    const old = c.owner, name = c.name;
    captureCastle(s, c, me.clan!); a.hex = c.hex; H.hyoro = undefined;
    const q = s.hero!.quest; if (q && q.kind === 'kouryaku' && q.castle === c.i && q.done < q.need) { q.done = q.need; q.ok = true; q.joined = true; q.note = `${name}を兵糧攻めで開城させた。`; }
    return [`${name}は兵糧が尽き、${clanName(s, old)}家の城兵は城を明け渡した。兵糧攻めで${name}を落とした！${q && q.castle === c.i ? '登城して報告せよ。' : ''}`];
  }
  return [`${c.name}を囲んで兵糧攻め。城兵は${c.garrison}に痩せ、士気も落ちた（${c.gMorale.toFixed(2)}）。${clanName(s, c.owner)}家の後詰めに気をつけよ。`];
}

// 大名（当主）として家を保つ: 旧主との因縁（謀反で立った家）・家中の揉め事（家臣どうしの不和を裁く）・疑わしい家臣への詰問。武将で遊ぶの主人公が謀反で大名になった時と、ふつうの大名の両方に
// 旧主との因縁: 謀反で立った家には、二年のあいだ元の主家が仇として討手を向ける（毎月、こちらを狙う家にし、親密度を下げる）。
//   謀反の時に主人公と親しかった（60から）旧主の家中の者は、月に20%で一人ずつ馳せ参じる（恩70）。
// 家中の揉め事: 月に6%で、家臣二人が不和になる。片方に付けば付いた側の恩+6・もう一方−8、両成敗は二人とも−4（ほかの家臣は+1）、仲裁（金200貫）は二人とも+3。
// 詰問: 恩40未満の家臣を問いただす（同じ者は半年に一度）。改心すれば恩+15、白を切れば恩−5、三割は出奔する（恩が低いほど出奔しやすい）
import { hexDist } from './map';
import { onOf, vassalsOf } from './on';
import { desert } from './ops';
import { addLog, bumpAmity, clanName, rand } from './state';
import type { Clan, GameState, General } from './types';

export const TOSYU = { KYU_MONTHS: 24, KYU_P: 1, KYU_AMITY: -5, KYUYU_P: 0.2, KYUYU_ON: 70, FRIEND: 60, FUWA_P: 0.06, SIDE_UP: 6, SIDE_DOWN: 8, BOTH: 4, BOTH_OTHERS: 1, CHUSAI_GOLD: 200, CHUSAI: 3, KITSU_ON: 40, KITSU_EVERY: 6, KITSU_UP: 15, KITSU_DOWN: 5 };
type Momegoto = { a: string; b: string; kind: 'fuwa' | 'tegara'; turn: number };
type CX = Clan & { kyuushu?: { clan: string; turn: number; told?: boolean }; kyuyu?: string[]; momegoto?: Momegoto; kitsu?: Record<string, number> };
const C = (s: GameState) => s.clans[s.player] as CX;
const bump = (g: General, v: number) => { g.on = Math.max(0, Math.min(100, onOf(g) + v)); };

// 謀反で家を立てた時（career.ts の rebel から）: 元の主家と、残してきた親しい者を覚える
export function recordRebel(s: GameState, newClan: string, oldClan: string, rel: Record<string, number>) {
  const X = s.clans[newClan] as CX;
  X.kyuushu = { clan: oldClan, turn: s.turn };
  X.kyuyu = Object.values(s.generals).filter((g) => g.clan === oldClan && (rel[g.id] ?? 0) >= TOSYU.FRIEND && s.clans[oldClan].leader !== g.id && !g.kin && g.status !== 'dead' && g.status !== 'captive').map((g) => g.id);
}
// 毎月（大名の画面で、遊び手の家）
export function tosyuMonth(s: GameState): string[] {
  const X = C(s), out: string[] = [], L = X.leader ? s.generals[X.leader] : null;
  if (!L) return out;
  // 旧主との因縁
  const k = X.kyuushu, old = k ? s.clans[k.clan] : null;
  if (k && old?.alive && s.turn - k.turn <= TOSYU.KYU_MONTHS) {
    if (!k.told) { k.told = true; out.push(`旧主の${old.name}家は、${X.name}家を仇と見て討手を向けてくる（二年ほど）。`); }
    if (rand(s) < TOSYU.KYU_P) { old.target = s.player; bumpAmity(s, old.id, s.player, TOSYU.KYU_AMITY); }
  }
  // 旧友が馳せ参じる
  for (const id of X.kyuyu ?? []) {
    const g = s.generals[id];
    if (!g || g.status === 'dead' || g.status === 'captive' || g.clan === s.player) continue;
    if (!['free', 'governor', 'ronin'].includes(g.status) || rand(s) >= TOSYU.KYUYU_P) continue;
    for (const c of s.castles) if (c.governor === g.id) c.governor = null;
    g.clan = s.player; g.status = 'free'; g.loc = L.loc; g.army = null; g.on = TOSYU.KYUYU_ON; g.liege = undefined; g.yoriki = undefined;
    out.push(`旧知の${g.name}が、${old?.name ?? '旧主の'}家を捨てて馳せ参じた。`);
    addLog(s, `${g.name}が${X.name}家に馳せ参じた。`, 'info', true);
  }
  X.kyuyu = (X.kyuyu ?? []).filter((id) => s.generals[id]?.clan !== s.player);
  // 家中の揉め事
  if (!X.momegoto && rand(s) < TOSYU.FUWA_P) {
    const vs = vassalsOf(s, s.player).filter((g) => !g.liege);
    if (vs.length >= 2) {
      const a = vs[Math.floor(rand(s) * vs.length)];
      const near = vs.filter((g) => g !== a).sort((x, y) => hexDist(s.castles[x.loc].hex, s.castles[a.loc].hex) - hexDist(s.castles[y.loc].hex, s.castles[a.loc].hex));
      const b = near[0];
      const kind = rand(s) < 0.5 ? 'fuwa' : 'tegara';
      X.momegoto = { a: a.id, b: b.id, kind, turn: s.turn };
      out.push(`${a.name}と${b.name}が${kind === 'fuwa' ? '不和になり、互いを訴えてきた' : '手柄を争い、どちらの功か裁きを求めてきた'}。`);
    }
  }
  return out;
}
export const momegotoOf = (s: GameState) => { const m = C(s)?.momegoto; return m && s.generals[m.a]?.clan === s.player && s.generals[m.b]?.clan === s.player ? m : null; };
// 裁く: a か b に付く・両成敗・仲裁
export function judgeMomegoto(s: GameState, how: 'a' | 'b' | 'both' | 'chusai'): string {
  const X = C(s), m = momegotoOf(s); X.momegoto = undefined;
  if (!m) return '揉め事は収まっていた。';
  const a = s.generals[m.a], b = s.generals[m.b];
  if (how === 'chusai') {
    if (X.gold < TOSYU.CHUSAI_GOLD) { X.momegoto = m; return `仲裁の金が足りない（${TOSYU.CHUSAI_GOLD}貫）`; }
    X.gold -= TOSYU.CHUSAI_GOLD; bump(a, TOSYU.CHUSAI); bump(b, TOSYU.CHUSAI);
    return `金${TOSYU.CHUSAI_GOLD}貫を出して二人を仲裁した。${a.name}・${b.name}とも恩+${TOSYU.CHUSAI}。`;
  }
  if (how === 'both') {
    bump(a, -TOSYU.BOTH); bump(b, -TOSYU.BOTH);
    for (const g of vassalsOf(s, s.player)) if (g !== a && g !== b) bump(g, TOSYU.BOTH_OTHERS);
    return `喧嘩両成敗とした。${a.name}・${b.name}とも恩−${TOSYU.BOTH}。家中は引き締まった（ほかの家臣は恩+${TOSYU.BOTH_OTHERS}）。`;
  }
  const [w, l] = how === 'a' ? [a, b] : [b, a];
  bump(w, TOSYU.SIDE_UP); bump(l, -TOSYU.SIDE_DOWN);
  return `${w.name}の言い分を認めた。${w.name}は恩+${TOSYU.SIDE_UP}、${l.name}は不服を抱いた（恩−${TOSYU.SIDE_DOWN}）。`;
}
// 疑わしい家臣を詰問する
export function kitsumonBlock(s: GameState, g: General): string | null {
  if (g.clan !== s.player || s.clans[s.player].leader === g.id) return '家臣だけ';
  if (onOf(g) >= TOSYU.KITSU_ON) return `恩が厚く、疑うに足りない（恩${TOSYU.KITSU_ON}未満の者を）`;
  const t = C(s).kitsu?.[g.id];
  return t !== undefined && s.turn - t < TOSYU.KITSU_EVERY ? `半年に一度（あと${t + TOSYU.KITSU_EVERY - s.turn}か月）` : null;
}
export function kitsumonVassal(s: GameState, gid: string): { ok: boolean; text: string } {
  const g = s.generals[gid], why = g ? kitsumonBlock(s, g) : '相手がいない';
  if (why) return { ok: false, text: why };
  const X = C(s), L = s.generals[X.leader!];
  (X.kitsu ??= {})[g.id] = s.turn;
  const pReform = Math.max(0.1, Math.min(0.85, 0.35 + L.cha / 300 + onOf(g) / 200));
  const r = rand(s);
  if (r < pReform) { bump(g, TOSYU.KITSU_UP); return { ok: true, text: `${g.name}を問いただすと、平伏して心を入れ替えると誓った（恩+${TOSYU.KITSU_UP}）。` }; }
  if (r < pReform + (1 - pReform) * 0.3 * (1 + (TOSYU.KITSU_ON - onOf(g)) / 40)) { desert(s, g, `${L.name}に詰問され、`); return { ok: true, text: `${g.name}は詰問に答えず、その夜のうちに出奔した。` }; }
  bump(g, -TOSYU.KITSU_DOWN);
  return { ok: true, text: `${g.name}は白を切り通した。かえって心が離れた（恩−${TOSYU.KITSU_DOWN}）。` };
}
export const kyuushuOf = (s: GameState) => { const k = C(s)?.kyuushu; return k && s.clans[k.clan]?.alive && s.turn - k.turn <= TOSYU.KYU_MONTHS ? { clan: k.clan, left: TOSYU.KYU_MONTHS - (s.turn - k.turn) } : null; };
void clanName;

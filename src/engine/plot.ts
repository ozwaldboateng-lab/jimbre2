// 武将で遊ぶ（物語の外）: 人との縁の段階と、謀反の準備。
// 縁は親しさ（0〜100）を段階で呼ぶ。友より深い家中の武将には、謀反の折に味方する約束を内々に取りつけられる（城と軍勢ごと加わる）。
// 他家の当主とは密約を結べる（謀反して家を立てた時、その家と盟を結び、主家を共に攻める＝援軍が来る）。
// どちらも、しくじれば主君の耳に入ることがある
import type { Act } from './hero';
import { lv } from './skill';
import * as R from './rules';
import { addLog, clanName, hostile, rand } from './state';
import type { Army, GameState, General } from './types';

export const EN = {
  PACT_REL: 70, // 内々に誘えるのは「友」から
  PACT_BASE: 0.2, PACT_REL_K: 0.015, PACT_FAME_K: 0.003, PACT_ON_K: 0.004, PACT_TOZAMA: 0.15, PACT_MAX: 0.85,
  LEAK: 0.25, LEAK_FAVOR: 20, LEAK_REL: 20, // しくじって漏れた時: 主君の覚え−20・その者との親しさ−20
  SECRET_GOLD: 1000, SECRET_BASE: 0.15, SECRET_FAME_K: 0.004, SECRET_REL_K: 0.004, SECRET_FOE: 0.2, SECRET_MAX: 0.8,
  SECRET_LEAK: 0.3, SECRET_LEAK_FAVOR: 25, ALLY_MONTHS: 24,
};
type PlotX = { pact?: string[]; secret?: { clan: string; turn: number }; plotTried?: Record<string, number> };
const X = (s: GameState) => s.hero! as typeof s.hero & PlotX;
const meOf = (s: GameState) => s.generals[s.hero!.id];
const relOf = (s: GameState, id: string) => s.hero!.rel[id] ?? 0;
const hasDomain = (s: GameState) => { const H = s.hero!; return H.fuchu !== undefined || (H.ryo ?? []).length > 0; };
const lordId = (s: GameState) => { const me = meOf(s); return me.clan ? s.clans[me.clan].leader : null; };

// ───────── 謀反の味方（家中の友を内々に誘う） ─────────
export const pactOf = (s: GameState): General[] => (X(s).pact ?? []).map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead' && g.clan === meOf(s).clan);
export function pactBlock(s: GameState, g: General): string | null {
  const H = X(s), me = meOf(s);
  if (H.story === 'toshiie' || !me.clan) return '物語の外の、主家に仕える主人公だけ';
  if (g.clan !== me.clan || g.id === lordId(s) || g.id === me.id) return '家中の武将だけ';
  if ((H.retainers ?? []).includes(g.id)) return '家臣はもとよりついて来る';
  if (!hasDomain(s)) return '城を持ってから';
  if ((H.pact ?? []).includes(g.id)) return '約束を取りつけてある';
  if (relOf(s, g.id) < EN.PACT_REL) return `「友」（親しさ${EN.PACT_REL}）から`;
  if (H.plotTried?.[g.id] === s.turn) return '今月はもう話した';
  return null;
}
export const pactChance = (s: GameState, g: General) => Math.max(0.05, Math.min(EN.PACT_MAX, lv(s, 'bensetsu') * 0.03 + EN.PACT_BASE + (relOf(s, g.id) - EN.PACT_REL) * EN.PACT_REL_K + (s.hero!.fame ?? 0) * EN.PACT_FAME_K - (g.on ?? 50) * EN.PACT_ON_K + (g.tozama ? EN.PACT_TOZAMA : 0) + (g.kin ? -0.3 : 0)));
export function invitePact(s: GameState, gid: string): Act {
  const g = s.generals[gid], why = g ? pactBlock(s, g) : '相手がいない';
  if (why) return { ok: false, text: why };
  const H = X(s);
  H.jun++; (H.plotTried ??= {})[gid] = s.turn;
  if (rand(s) < pactChance(s, g)) {
    (H.pact ??= []).push(gid);
    return { ok: true, who: gid, line: g.tozama ? 'わしも、もとは一国の主だった。……そなたが起つなら、わしも起つ。' : '……聞かなかったことにはできぬな。よかろう。その時は、わしもそなたの側に立つ。', text: `${g.name}から、謀反の折には味方するとの約束を取りつけた${s.castles.some((c) => c.governor === g.id && c.i !== s.generals[lordId(s) ?? '']?.loc) ? '（城ごと加わる）' : ''}。` };
  }
  if (rand(s) < EN.LEAK * (1 - lv(s, 'ninjutsu') * 0.15)) { // 忍術で漏れにくい
    H.favor = Math.max(0, H.favor - EN.LEAK_FAVOR); H.rel[gid] = Math.max(0, relOf(s, gid) - EN.LEAK_REL);
    addLog(s, `${meOf(s).name}に謀反の企みありとの噂が立った。`, 'info', true);
    return { ok: true, who: gid, line: '……そのような話、わしは聞きとうない。殿に申し上げぬわけにはいかぬ。', text: `${g.name}は首を縦に振らず、話は主君の耳に入った。主君の覚え−${EN.LEAK_FAVOR}・${g.name}との親しさ−${EN.LEAK_REL}。` };
  }
  H.rel[gid] = Math.max(0, relOf(s, gid) - 5);
  return { ok: true, who: gid, line: '……今の話は、酒の上の戯れとしておこう。', text: `${g.name}は話をはぐらかした（親しさ−5）。` };
}

// ───────── 他家との密約 ─────────
// 他家の当主のいる城下で持ちかける（城持ちから・礼物${EN.SECRET_GOLD}貫）。主家と盟を結んでいる家とは結べない
export function secretHere(s: GameState): string | null {
  const H = s.hero!, me = meOf(s);
  if (H.story === 'toshiie' || !me.clan || H.field || H.army) return null;
  for (const C of Object.values(s.clans)) if (C.alive && C.id !== me.clan && C.leader && s.generals[C.leader]?.loc === H.town && s.generals[C.leader].status !== 'dead') return C.id;
  return null;
}
export function secretBlock(s: GameState, clan: string): string | null {
  const H = X(s), me = meOf(s);
  if (!hasDomain(s)) return '城を持ってから';
  if (H.secret && s.clans[H.secret.clan]?.alive) return `${clanName(s, H.secret.clan)}家と密約を結んである`;
  if (!hostile(s, me.clan!, clan)) return '主家と盟を結んでいる家とは結べない';
  if (H.plotTried?.[clan] === s.turn) return '今月はもう話した';
  if (H.gold < EN.SECRET_GOLD) return `礼物の金が足りない（${EN.SECRET_GOLD}貫）`;
  return null;
}
export const secretChance = (s: GameState, clan: string) => { const L = s.clans[clan].leader!, me = meOf(s), foe = s.clans[me.clan!].target === clan || s.clans[clan].target === me.clan; return Math.max(0.05, Math.min(EN.SECRET_MAX, lv(s, 'bensetsu') * 0.03 + EN.SECRET_BASE + (s.hero!.fame ?? 0) * EN.SECRET_FAME_K + relOf(s, L) * EN.SECRET_REL_K + (foe ? EN.SECRET_FOE : 0))); };
export function offerSecret(s: GameState): Act {
  const clan = secretHere(s);
  if (!clan) return { ok: false, text: 'この城下に他家の当主はいない' };
  const why = secretBlock(s, clan);
  if (why) return { ok: false, text: why };
  const H = X(s), L = s.clans[clan].leader!, me = meOf(s);
  H.jun++; (H.plotTried ??= {})[clan] = s.turn; H.gold -= EN.SECRET_GOLD;
  if (rand(s) < secretChance(s, clan)) {
    H.secret = { clan, turn: s.turn };
    return { ok: true, who: L, line: `${clanName(s, me.clan!)}の家中に、骨のある者がおるとはな。……よかろう。そなたが起った時は、わが家が盟を結ぶ。`, text: `${clanName(s, clan)}家の当主と密約を結んだ（礼物${EN.SECRET_GOLD}貫）。謀反して家を立てれば、${clanName(s, clan)}家と盟を結び、主家を共に攻める。` };
  }
  if (rand(s) < EN.SECRET_LEAK * (1 - lv(s, 'ninjutsu') * 0.15)) {
    H.favor = Math.max(0, H.favor - EN.SECRET_LEAK_FAVOR);
    addLog(s, `${me.name}が${clanName(s, clan)}家と通じているとの噂が立った。`, 'info', true);
    return { ok: true, who: L, line: '面白い話だが、乗れぬな。……せいぜい、主に気取られぬことだ。', text: `密約はならず、他家と通じているとの噂が主君の耳に入った（礼物${EN.SECRET_GOLD}貫は戻らない）。主君の覚え−${EN.SECRET_LEAK_FAVOR}。` };
  }
  return { ok: true, who: L, line: '今はまだ、その時ではあるまい。', text: `密約はならなかった（礼物${EN.SECRET_GOLD}貫は戻らない）。` };
}

// ───────── 謀反の折: 味方の城と軍勢を加え、密約の家と盟を結ぶ ─────────
// 味方の城（主君の居城は除く。その城主は身一つで加わる）
export function pactCastles(s: GameState): number[] { const L = lordId(s), seat = L ? s.generals[L].loc : -1; return pactOf(s).flatMap((g) => s.castles.filter((c) => c.governor === g.id && c.owner === g.clan && c.i !== seat).map((c) => c.i)); }
export function pactArmies(s: GameState): Army[] { return pactOf(s).map((g) => (g.army !== null ? s.armies[g.army] : undefined)).filter((a): a is Army => !!a && a.clan === meOf(s).clan); }
// splitClan のあと: 約束した者で城も軍勢も持たない者は新しい家へ移る。密約の家と盟を結び、主家を狙わせる
export function afterRebel(s: GameState, newClan: string, from: string, home: number): string[] {
  const H = X(s), out: string[] = [];
  const joined: string[] = [];
  for (const id of H.pact ?? []) {
    const g = s.generals[id];
    if (!g || g.status === 'dead' || g.status === 'captive') continue;
    if (g.clan === from) {
      g.clan = newClan; g.on = R.ON_NEW + 15;
      const keeps = s.castles.some((c) => c.governor === g.id && c.owner === newClan);
      if (!keeps) for (const c of s.castles) if (c.governor === g.id) c.governor = null; // 主君の居城の城主は、身一つで抜けて来る
      if (g.status !== 'army' && !keeps) { g.status = 'free'; g.loc = home; }
    }
    if (g.clan === newClan) joined.push(g.name);
  }
  if (joined.length) out.push(`約束どおり、${joined.join('・')}が加わった。`);
  H.pact = [];
  const sc = H.secret;
  if (sc && s.clans[sc.clan]?.alive) {
    s.treaties.push({ a: newClan, b: sc.clan, kind: 'alliance', start: s.turn, until: s.turn + EN.ALLY_MONTHS });
    s.clans[sc.clan].target = from;
    out.push(`密約どおり、${clanName(s, sc.clan)}家が盟を結び、${clanName(s, from)}家へ兵を向ける（${EN.ALLY_MONTHS}か月の盟。隣で戦えば援軍が来る）。`);
    addLog(s, `${clanName(s, sc.clan)}家が${s.clans[newClan].name}家と盟を結んだ。`, 'info', true);
  }
  H.secret = undefined;
  return out;
}
export const plotSummary = (s: GameState) => ({ pact: pactOf(s), secret: X(s).secret && s.clans[X(s).secret!.clan]?.alive ? X(s).secret!.clan : null });

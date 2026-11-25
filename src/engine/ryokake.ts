// 武将で遊ぶ（物語の外）: 城主・国持ちの演出。主君との緊張（詰問・減封・討手）・加増と国替え・家中の競争（席次・讒言）・寝返りの密使・入城・権六の隠居。
// 出来事は kumiev.ts に溜め（場面は kumikake.ts の pendingBeats から、ここの evBeats を呼ぶ）、詰問・討手・国替えは大名の画面の窓の代わりに場面で選ぶ。セリフは data/ryo_kake.ts
import type { Beat } from '../data/story_toshiie';
import * as K from '../data/ryo_kake';
import { heroOf } from './hero';
import { retainersOf } from './kashin';
import type { KumiEv } from './kumiev';
import { temperOf } from './lines';
import { answerOffer, NE } from './ryoplot';
import { follows, goalOf, HOMEN, yorikiOf } from './homenshin';
import { addUtagai, benmeiChance, kitsumonGo, kitsumonRefuse } from './ryoshin';
import { clanName } from './state';
import type { GameState, General } from './types';

function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const pick = <T>(arr: readonly T[], key: string): T => arr[hash(key) % arr.length];
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const headed = (head: string, beats: Beat[]): Beat[] => beats.map((b) => (b.head || b.kind ? b : { ...b, head }));
const gen = (s: GameState, id?: string): General | null => (id && s.generals[id] ? s.generals[id] : null);
const lordOf = (s: GameState) => { const me = heroOf(s); return me?.clan ? gen(s, s.clans[me.clan]?.leader ?? undefined) : null; };
const vars = (s: GameState, extra: Record<string, string> = {}) => ({ me: heroOf(s)!.name, lord: lordOf(s)?.name ?? '主君', ...extra });
type RX = { yk?: { kumi?: boolean }; zanAt?: number; gon?: { asked?: number; inkyo?: number; letter?: number } };
const X = (s: GameState) => s.hero as unknown as RX & NonNullable<GameState['hero']>;
export const RYO_KINDS: KumiEv['k'][] = ['kazo', 'genpo', 'seki', 'zan', 'mitsushi', 'nyujo', 'inkyo', 'letter', 'homenGoal', 'homenRemind', 'homenOk', 'homenNg', 'yorikiWin', 'yorikiLost', 'gonjo', 'senpo'];

// ───────── 月の出来事 → 場面 ─────────
export function evBeats(s: GameState, e: KumiEv): Beat[] {
  const me = heroOf(s)!, L = lordOf(s), k = `${e.k}|${e.id ?? ''}|${e.c ?? ''}|${s.turn}`, rx = retainersOf(s);
  const c = e.c !== undefined ? s.castles[e.c] : null;
  if (e.k === 'kazo' && c) return headed('加増', [
    { bg: 'zashiki_day', text: fill(K.KAZO_NARR, { castle: c.name }) },
    ...(L ? [{ who: L.id, text: fill(pick(K.KAZO_LORD[temperOf(L)], k), vars(s, { castle: c.name })) }] : []),
    ...(rx[0] ? [{ who: rx[0].id, text: pick(K.KAZO_KASHIN, k) }] : []),
  ]);
  if (e.k === 'genpo' && c) return headed('減封', [
    { bg: 'zashiki_day', text: fill(K.GENPO_NARR, { castle: c.name }) },
    { who: 'g_shisha', name: '主君の使者', text: fill(K.GENPO_SHISHA, vars(s, { castle: c.name })) },
    ...rx.slice(0, 2).map((g, i) => ({ who: g.id, text: pick(K.GENPO_KASHIN[temperOf(g)], k + i) })),
  ]);
  if (e.k === 'seki') {
    const n = gen(s, e.id), t = n ? temperOf(n) : 'steady';
    return headed('席次', [
      { bg: 'zashiki_day', text: fill(e.up ? K.SEKI_UP_NARR : K.SEKI_DOWN_NARR, vars(s, { n: String(e.n ?? '') })) },
      ...(n ? [{ who: n.id, text: pick((e.up ? K.SEKI_NEIGHBOR_UP : K.SEKI_NEIGHBOR_DOWN)[t], k) }] : []),
    ]);
  }
  if (e.k === 'zan') {
    const r = gen(s, e.id); if (!r || !L) return [];
    if (!e.ok) X(s).zanAt = s.turn; // 讒言が通った（詰問で「讒言だ」と訴えられる）
    return headed('讒言', [
      { bg: 'zashiki_night', text: fill(K.ZAN_NARR, vars(s, { rival: r.name })) },
      { who: r.id, text: fill(pick(K.ZAN_RIVAL[temperOf(r)], k), vars(s)) },
      { who: L.id, text: fill(pick((e.ok ? K.ZAN_REJECT : K.ZAN_ACCEPT)[temperOf(L)], k), vars(s)) },
    ]);
  }
  if (e.k === 'mitsushi' && e.clan) {
    const cn = clanName(s, e.clan);
    return headed('密使', [
      { bg: 'zashiki_night', text: fill(K.MITSU_NARR, { clan: cn }) },
      { who: 'g_shisha', name: `${cn}家の密使`, text: fill(K.MITSU_LINE, { clan: cn, gold: String(NE.OFFER_GOLD) }), ask: `k_r_mitsu:${e.clan}`, choices: K.MITSU_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
    ]);
  }
  if (e.k === 'nyujo' && c) return headed(c.name, [
    { bg: 'ichi', text: fill(K.NYUJO_NARR, { castle: c.name }) },
    { who: 'g_hyakusho', name: '村の者', text: K.NYUJO_HYAKUSHO },
    { who: 'g_chonin', name: '町の者', text: K.NYUJO_CHONIN },
    { who: rx[0]?.id ?? 'g_gonroku', text: pick(K.NYUJO_KASHIN, k) },
  ]);
  if (e.k === 'inkyo') return headed('権六の願い', [
    { bg: 'zashiki_night', text: K.INKYO_NARR },
    { who: 'g_gonroku', text: K.INKYO_GONROKU },
    ...(X(s).yk?.kumi ? [{ who: 'g_yokichi', text: K.INKYO_YOKICHI }] : []),
    { who: me.id, text: '……権六。', ask: 'k_r_inkyo', choices: K.INKYO_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
  ]);
  // ───── 方面軍団長 ─────
  const yk = (X(s).yk?.kumi ? [{ who: 'g_yokichi', text: pick(K.YOKICHI_HOMEN, k + 'y') }] : []) as Beat[];
  if (e.k === 'homenGoal') {
    const g = goalOf(s); if (!g) return [];
    const cs = g.castles.map((i) => s.castles[i].name).join('・'), v = vars(s, { castles: cs, years: String(Math.round(HOMEN.GOAL_MONTHS / 12)) });
    return headed('方面の目当て', [
      { bg: 'zashiki_day', text: fill(K.HOMEN_GOAL_NARR, v) },
      ...(L ? [{ who: L.id, text: fill(pick(K.HOMEN_GOAL_LORD[temperOf(L)], k), v) }] : []),
      ...yorikiOf(s).slice(0, 3).map((y, i) => ({ who: y.id, text: fill(pick(K.YORIKI_GREET[temperOf(y)], k + i), { name: y.name }) })),
      ...yk,
    ]);
  }
  if (e.k === 'homenRemind') return headed('方面の目当て', [{ bg: 'zashiki_day', who: 'g_shisha', name: '主君の使者', text: fill(K.HOMEN_REMIND, vars(s)) }]);
  if (e.k === 'homenOk') {
    const y = yorikiOf(s)[0];
    return headed('方面の目当て', [
      { bg: 'zashiki_day', text: `方面の目当て（${(e.ids ?? []).map((i) => s.castles[+i]?.name).join('・')}）を果たした。` },
      ...(L ? [{ who: L.id, text: fill(pick(K.HOMEN_OK_LORD[temperOf(L)], k), vars(s)) }] : []),
      ...(y ? [{ who: y.id, text: pick(K.YORIKI_JOY[temperOf(y)], k) }] : []),
      ...yk,
    ]);
  }
  if (e.k === 'homenNg') return headed('解任', [
    { bg: 'zashiki_day', text: '方面の目当ては、果たせなかった。' },
    ...(L ? [{ who: L.id, text: fill(pick(K.HOMEN_NG_LORD[temperOf(L)], k), vars(s)) }] : []),
    ...(e.ids ?? []).slice(0, 2).map((id, i) => ({ who: id, text: pick(K.YORIKI_PART, k + i) })),
  ]);
  if (e.k === 'yorikiWin') { const y = yorikiOf(s)[hash(k) % Math.max(1, yorikiOf(s).length)]; return y ? headed('方面の軍勢', [{ bg: 'senjo', text: '方面の軍勢が、城を落とした。' }, { who: y.id, text: pick(K.YORIKI_JOY[temperOf(y)], k) }, ...yk]) : []; }
  if (e.k === 'yorikiLost') { const y = gen(s, e.id); return y ? headed('与力', [{ bg: 'jinmaku', text: `与力の${y.name}が、率いていた部隊を失った。` }, { who: y.id, text: pick(K.YORIKI_LOST[temperOf(y)], k) }]) : []; }
  if (e.k === 'gonjo') { const y = gen(s, e.id); return y ? headed('言上', [{ bg: 'zashiki_day', text: fill(K.GONJO_NARR, { name: y.name }) }, { who: 'g_shisha', name: '主君の使者', text: K.GONJO_SHISHA }]) : []; }
  if (e.k === 'senpo') {
    const y = gen(s, e.id); if (!y || !yorikiOf(s).includes(y)) return [];
    return headed('先鋒の願い', [
      { bg: 'jinmaku', text: `与力の${y.name}が、陣に訪ねてきた。` },
      { who: y.id, text: pick(K.SENPO_ASK[temperOf(y)], k), ask: `k_r_senpo:${y.id}`, choices: K.SENPO_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
    ]);
  }
  if (e.k === 'letter') return headed('権六の便り', [{ bg: 'zashiki_night', text: K.LETTER_NARR }, { who: 'g_gonroku', text: pick(K.LETTER_LINES, k) }]);
  return [];
}

// ───────── 主君との出来事（詰問・討手・国替え）を場面で ─────────
export type ShinEv = { kind: string; turn: number; to?: number[] };
export function shinBeats(s: GameState, ev: ShinEv): Beat[] {
  const me = heroOf(s)!, L = lordOf(s), k = `${ev.kind}|${s.turn}`, rx = retainersOf(s);
  if (ev.kind === 'kitsumon') {
    const p = benmeiChance(s);
    return headed('詰問', [
      { bg: 'zashiki_day', text: fill(K.KITSU_NARR, vars(s)) },
      ...(L ? [{ who: L.id, text: fill(pick(K.KITSU_LORD[temperOf(L)], k), vars(s)) }] : []),
      { who: me.id, text: '……申し上げまする。', ask: 'k_r_kitsu', choices: K.KITSU_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.id === 'refuse' ? x.note : `${x.note}（見込み${Math.round(Math.max(0.05, Math.min(0.95, p + kitsuBonus(s, x.id))) * 100)}%）` })) },
    ]);
  }
  if (ev.kind === 'uchite') {
    const lines = rx.slice(0, 3).map((g, i) => ({ who: g.id, text: pick(((s.hero!.rel[g.id] ?? 0) >= 50 ? K.UCHITE_LOYAL : K.UCHITE_WAVER)[temperOf(g)], k + i) }));
    return headed('討手', [
      { bg: 'night_fire', text: fill(K.UCHITE_NARR, vars(s)) },
      ...lines,
      { who: me.id, text: '……皆の心は、わかった。', ask: 'k_r_uchite', choices: K.UCHITE_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.id === 'benmei' ? `${x.note}（見込み${Math.round(benmeiChance(s, true) * 100)}%）` : x.note })) },
    ]);
  }
  if (ev.kind === 'hei') {
    const ys = [...yorikiOf(s), ...rx];
    return headed('兵の取り合い', [
      { bg: 'zashiki_day', who: 'g_shisha', name: '主君の使者', text: fill(K.HEI_SHISHA, vars(s, { need: String((ev as { need?: number }).need ?? '') })) },
      ...(ys[0] ? [{ who: ys[0].id, text: pick(K.HEI_KEEP, k) }] : []),
      ...(ys[1] ? [{ who: ys[1].id, text: pick(K.HEI_GIVE, k) }] : []),
      { who: me.id, text: '……。', ask: 'k_r_hei', choices: K.HEI_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
    ]);
  }
  if (ev.kind === 'kunigae') {
    const to = (ev.to ?? []).map((i) => s.castles[i].name).join('・');
    return headed('国替え', [
      { bg: 'zashiki_day', text: fill(K.KUNI_NARR, { to }) },
      ...(L ? [{ who: L.id, text: fill(pick(K.KUNI_LORD[temperOf(L)], k), vars(s, { to })) }] : []),
      ...(rx[0] ? [{ who: rx[0].id, text: pick(K.KUNI_FOR, k) }] : []),
      ...(rx[1] ? [{ who: rx[1].id, text: pick(K.KUNI_AGAINST, k) }] : []),
      { bg: 'mura', who: 'g_hyakusho', name: '領の百姓', text: pick(K.KUNI_FAREWELL, k) },
      { who: me.id, text: '……。', ask: 'k_r_kuni', choices: K.KUNI_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
    ]);
  }
  return [];
}
// 詰問の申し開き: 誓紙はいつでも+0.05、働きは覚え50からなら+0.15（でなければ−0.05）、讒言だと訴えるのはこの一年に讒言が通っていれば+0.20（でなければ−0.10）
export function kitsuBonus(s: GameState, id: string): number {
  const H = X(s);
  if (id === 'seishi') return 0.05;
  if (id === 'hataraki') return H.favor >= 50 ? 0.15 : -0.05;
  if (id === 'zangen') return H.zanAt !== undefined && s.turn - H.zanAt <= 12 ? 0.2 : -0.1;
  return 0;
}
// 場面のあとに大名の画面がすること（謀反・出奔・命がけの申し開き・国替えに従う・背く）
let pend: string | null = null;
export const takePend = () => { const p = pend; pend = null; return p; };
let last: string | null = null;
export const takeLast = () => { const t = last; last = null; return t; };
export function choose(s: GameState, key: string, id: string): Beat[] {
  const me = heroOf(s)!, L = lordOf(s), k = `${key}|${id}|${s.turn}`;
  if (key === 'k_r_kitsu') {
    if (id === 'refuse') { last = kitsumonRefuse(s); return [{ text: last }]; }
    const c = K.KITSU_CHOICE.find((x) => x.id === id)!;
    const r = kitsumonGo(s, kitsuBonus(s, id)); last = r.text;
    return headed('詰問', [{ who: me.id, text: c.line }, ...(L ? [{ who: L.id, text: fill(pick((r.ok ? K.KITSU_OK : K.KITSU_NG)[temperOf(L)], k), vars(s)) }] : []), { text: r.text }]);
  }
  if (key === 'k_r_uchite' || key === 'k_r_kuni' || key === 'k_r_hei' || key === 'k_r_rebel') { pend = id; return []; } // 大名の画面がする（謀反・出奔・申し開き・国替え・兵の取り合い）
  if (key.startsWith('k_r_senpo:')) {
    const y = gen(s, key.slice(10)); if (!y) return [];
    if (id === 'yes') { s.hero!.rel[y.id] = Math.min(100, (s.hero!.rel[y.id] ?? 0) + HOMEN.SENPO_REL); const a = y.army !== null && y.army !== undefined ? s.armies[y.army] : null; if (a) a.morale = Math.min(1.3, a.morale + HOMEN.SENPO_MORALE); last = `${y.name}に次の城攻めの先鋒を許した（親しさ+${HOMEN.SENPO_REL}${a ? '・部隊の士気+0.10' : ''}）。`; }
    else { s.hero!.rel[y.id] = Math.max(0, (s.hero!.rel[y.id] ?? 0) - HOMEN.SENPO_NG); last = `${y.name}の先鋒の願いを退けた（親しさ−${HOMEN.SENPO_NG}）。`; }
    return headed('先鋒の願い', [{ who: y.id, text: pick((id === 'yes' ? K.SENPO_YES : K.SENPO_NO)[temperOf(y)], k) }]);
  }
  if (key.startsWith('k_r_mitsu:')) {
    const clan = key.slice(10), cn = clanName(s, clan);
    if (id === 'listen') { last = `${cn}家の密使の話を聞いた。寝返るかどうかは、今月のうちに「主家」の欄で返事をする。`; return []; }
    if (id === 'kaesu') { last = answerOffer(s, false).text; return headed('密使', [{ who: 'g_shisha', name: `${cn}家の密使`, text: K.MITSU_KAESU }]); }
    last = reportOffer(s, clan);
    return headed('密使', [{ who: 'g_shisha', name: `${cn}家の密使`, text: K.MITSU_TOREI }, ...(L ? [{ bg: 'zashiki_day', who: L.id, text: pick(K.LORD_THANKS_REPORT[temperOf(L)], k) }] : []), { text: last }]);
  }
  if (key === 'k_r_inkyo') {
    const G = (X(s).gon ??= {});
    if (id === 'yes') { G.inkyo = s.turn; G.letter = s.turn; last = '権六の隠居を許した。権六は城下で暮らす。'; return headed('権六の願い', [{ who: 'g_gonroku', text: K.INKYO_YES[0] }, ...(X(s).yk?.kumi ? [{ who: 'g_yokichi', text: K.INKYO_YES[1] }] : [])]); }
    G.asked = s.turn; last = '権六を、もう少しそばに置くことにした。';
    return headed('権六の願い', [{ who: 'g_gonroku', text: K.INKYO_NO[0] }, ...(X(s).yk?.kumi ? [{ who: 'g_yokichi', text: K.INKYO_NO[1] }] : [])]);
  }
  return [];
}
// 寝返りの密使を捕らえて主君に知らせる: 主君の覚え+6・疑い−10。その家との仲は冷える（主人公の家から見て）
export const REPORT = { FAVOR: 6, UTAGAI: 10 };
export function reportOffer(s: GameState, clan: string): string {
  const H = s.hero!; (H as unknown as { neOffer?: unknown }).neOffer = undefined;
  H.favor = Math.min(100, H.favor + REPORT.FAVOR); addUtagai(s, -REPORT.UTAGAI);
  return `${clanName(s, clan)}家の密使を捕らえて主君に差し出した（主君の覚え+${REPORT.FAVOR}・疑い−${REPORT.UTAGAI}）。`;
}
// 権六の隠居の願い（初めて城を預かった時。「もう少し」なら一年後にまた）と、隠居のあとの便り（一年ごと）
export const GON = { ASK_AGAIN: 12, LETTER_EVERY: 12 };
export function gonMonth(s: GameState): KumiEv[] {
  const G = X(s).gon; if (!G) return [];
  if (G.inkyo !== undefined) { if (s.turn - (G.letter ?? G.inkyo) >= GON.LETTER_EVERY) { G.letter = s.turn; return [{ k: 'letter' }]; } return []; }
  if (G.asked !== undefined && s.turn - G.asked >= GON.ASK_AGAIN) { G.asked = undefined; return [{ k: 'inkyo' }]; }
  return [];
}

// 方面ごとの謀反の前夜: 与力が一人ずつ去就を言う（親しさ60からはついて来る。仕組みは変えず、見えるようにするだけ）
export function rebelEveBeats(s: GameState): Beat[] {
  const ys = yorikiOf(s); if (!ys.length) return [];
  const k = `rebel|${s.turn}`;
  return headed('謀反の前夜', [
    { bg: 'zashiki_night', text: K.REBEL_EVE_NARR },
    ...ys.map((y, i) => ({ who: y.id, text: pick((follows(s, y) ? K.REBEL_FOLLOW : K.REBEL_STAY)[temperOf(y)], k + i) })),
    { who: heroOf(s)!.id, text: `……${ys.filter((y) => follows(s, y)).length}人か。`, ask: 'k_r_rebel', choices: K.REBEL_CHOICE.map((x) => ({ id: x.id, label: x.label, note: x.note })) },
  ]);
}

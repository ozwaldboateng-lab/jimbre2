// 武将で遊ぶ（物語の外）: 浪人の演出。誘いの使者・仕官の目通り・連歌会・城下の噂は場面（画面いっぱい。選ぶところがある）、
// 道場破り・野盗退治・用心棒・普請・報せを売る・陣借りは城下の掛け合い（顔とセリフを二、三行）。セリフは data/ronin_kake.ts
import type { Beat, Choice } from '../data/story_toshiie';
import { SCENE_ART } from '../data/sceneArt';
import * as K from '../data/ronin_kake';
import { askService, CAREER, lordHere } from './career';
import { heroOf, townsfolk } from './hero';
import { temperOf } from './lines';
import { fameSpots, fudaOf, MEI, renga } from './meisei';
import { fameOf, isRonin } from './roninplay';
import * as R from './rules';
import { acceptOffer, declineOffer, offersOf, raiseChance, raiseOffer, wants, type Offer } from './sasoi';
import { clanName } from './state';
import type { GameState, General } from './types';

// 城下の掛け合いの一行（who がなければ地の文）
export type Kake = { who?: string; name?: string; line: string }[];
type RX = { rk?: { fuda?: string[]; mile?: number; forget?: number }; fameTurn?: number; renown?: Record<string, number> };
const X = (s: GameState) => s.hero! as NonNullable<GameState['hero']> & RX;

// 同じ月・同じ場面なら同じセリフ（描き直しても変わらない）
function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const pick = <T>(arr: T[], key: string): T => arr[hash(key) % arr.length];
// 札がまだなければ、札に触れないセリフから選ぶ
const pickF = (s: GameState, arr: string[], key: string) => { const ok = fudaOf(s).length ? arr : arr.filter((x) => !x.includes('{fuda}')); return pick(ok.length ? ok : arr, key); };
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
// 背景: 届いていなければ近い絵で（道場→座敷・昼、茶屋→市）
const bg = (k: string) => (SCENE_ART[k] ? k : ({ dojo: 'zashiki_day', chaya: 'ichi' } as Record<string, string>)[k] ?? k);
function vars(s: GameState, extra: Record<string, string> = {}): Record<string, string> {
  const me = heroOf(s)!, f = fudaOf(s)[0], sp = fameSpots(s).sort((a, b) => b.n - a.n)[0];
  return { me: me.name, fuda: f ? `「${f.name}」` : '名', town: sp ? s.castles[sp.castle].name.replace(/城$/, '') : s.castles[s.hero!.town].name.replace(/城$/, ''), ...extra };
}
const lordOf = (s: GameState, clan: string): General | null => { const id = s.clans[clan]?.leader; return id ? s.generals[id] : null; };

// 場面の見出しを、どのコマにも付ける（場面の間、見出しが消えないように）
const headed = (head: string, beats: Beat[]): Beat[] => beats.map((b) => (b.head || b.kind ? b : { ...b, head }));
// 選んだ答えのあと、城下に出す結びの文（場面を閉じたら画面が受け取る）
let last: string | null = null;
export const takeLast = () => { const t = last; last = null; return t; };

// ───────── 誘いの使者 ─────────
function offerTerms(s: GameState, o: Offer) { return `条件は${R.RANK_NAME[o.rank]}・俸禄月${o.pay}貫・支度金${o.shitaku}貫。役目は「${o.yaku}」。${o.follow}。`; }
function offerChoices(s: GameState, o: Offer): Choice[] {
  return [
    { id: 'acc', label: '受ける', note: `${clanName(s, o.clan)}家に仕える` },
    ...(o.raised ? [] : [{ id: 'raise', label: '吊り上げる', note: `ほかの誘いを盾に条件を上げさせる（見込み${Math.round(raiseChance(s, o) * 100)}%。通らなければ相手は引く）` }]),
    { id: 'wait', label: '返事を待ってもらう', note: '「誘い」から、あとで返事ができる' },
    { id: 'no', label: '断る' },
  ];
}
export function envoyBeats(s: GameState, o: Offer): Beat[] { return headed(`${clanName(s, o.clan)}家の使者`, envoyRaw(s, o)); }
function envoyRaw(s: GameState, o: Offer): Beat[] {
  const L = lordOf(s, o.clan); if (!L) return [];
  const t = temperOf(L), cn = clanName(s, o.clan), v = vars(s, { clan: cn, lord: L.name });
  const rivals = offersOf(s).filter((x) => x.clan !== o.clan).map((x) => clanName(s, x.clan));
  const k = `${o.clan}|${s.turn}`, nm = `${cn}家の使者`;
  return [
    { bg: 'zashiki_day', text: `${cn}家の使者が、宿を訪ねてきた。` },
    { who: 'g_shisha', name: nm, text: fill(pickF(s, K.ENVOY_OPEN[t], k), v) },
    ...(rivals.length ? [{ who: 'g_shisha', name: nm, text: fill(pick(K.ENVOY_RIVAL, k), { ...v, rival: rivals[0] }) }] : []),
    { text: offerTerms(s, o) },
    { who: 'g_shisha', name: nm, text: pick(K.ENVOY_ASK, k), ask: `r_sasoi:${o.clan}`, choices: offerChoices(s, o) },
  ];
}
function sasoiChoose(s: GameState, clan: string, id: string): Beat[] {
  const L = lordOf(s, clan), t = L ? temperOf(L) : 'steady', cn = clanName(s, clan), nm = `${cn}家の使者`, k = `${clan}|${s.turn}|${id}`, v = vars(s, { clan: cn, lord: L?.name ?? '' });
  if (id === 'acc') {
    const r = acceptOffer(s, clan); last = r.text;
    if (!r.ok) return [{ text: r.text }];
    return [{ who: 'g_shisha', name: nm, text: pick(K.ENVOY_YES, k) }, ...(r.who && r.line ? [{ bg: 'zashiki_day', head: `${cn}家`, who: r.who, text: r.line }] : []), { text: r.text }];
  }
  if (id === 'raise') {
    const r = raiseOffer(s, clan), o = offersOf(s).find((x) => x.clan === clan); last = r.text;
    if (o) return [{ who: 'g_shisha', name: nm, text: fill(pick(K.ENVOY_RAISE_OK[t], k), v) }, { text: offerTerms(s, o) }, { who: 'g_shisha', name: nm, text: pick(K.ENVOY_ASK, k + 'b'), ask: `r_sasoi:${clan}`, choices: offerChoices(s, o) }];
    return [{ who: 'g_shisha', name: nm, text: fill(pick(K.ENVOY_RAISE_NG[t], k), v) }, { text: r.text }];
  }
  if (id === 'wait') { last = `${cn}家の使者には、返事を待ってもらった（「誘い」から返事をする）。`; return [{ who: 'g_shisha', name: nm, text: pick(K.ENVOY_WAIT, k) }]; }
  const r = declineOffer(s, clan); last = r.text;
  return [{ who: 'g_shisha', name: nm, text: fill(pick(K.ENVOY_NO[t], k), v) }];
}
// 来たばかりの誘い（まだ使者の場面を見せていないもの）
export function newOfferBeats(s: GameState): Beat[] {
  if (!s.hero || !isRonin(s)) return [];
  const out: Beat[] = [];
  for (const o of offersOf(s)) if (!o.told) { o.told = true; out.push(...envoyBeats(s, o)); }
  return out;
}

// ───────── 仕官の目通り ─────────
// 場面にしない時（出奔した家・今月もう願った）は、これまでどおり一行で返す
export function meetPlain(s: GameState): boolean {
  const H = s.hero!, clan = lordHere(s); if (!clan) return true;
  const lf = H.career?.left;
  return !!(lf && lf.clan === clan && s.turn - lf.turn < CAREER.RETURN_MONTHS) || H.career?.tried?.[clan] === s.turn;
}
// 答え: 持っている札（二つまで）と、戦の働き・治めの働き
function answers(s: GameState): Choice[] {
  const fd = fudaOf(s).map((f) => f.kei as string);
  return [...fd, 'war', 'peace'].map((k) => ({ id: k, label: K.ANSWER[k].label, note: fd.includes(k) ? '評判の札' : undefined }));
}
export function meetBeats(s: GameState): Beat[] { const c = lordHere(s); return c ? headed(`${clanName(s, c)}家 ― 目通り`, meetRaw(s)) : []; }
function meetRaw(s: GameState): Beat[] {
  const clan = lordHere(s); if (!clan) return [];
  const L = lordOf(s, clan)!, t = temperOf(L), v = vars(s, { clan: clanName(s, clan), lord: L.name }), k = `${clan}|${s.turn}`;
  const known = fameOf(s) >= 30 || fudaOf(s).length > 0;
  return [
    { bg: 'zashiki_day', text: `${s.castles[s.hero!.town].name}の広間。上段に、${L.name}が座っている。` },
    { who: L.id, text: fill(pickF(s, (known ? K.LORD_OPEN_KNOWN : K.LORD_OPEN_NEW)[t], k), v) },
    { who: L.id, text: pick(K.LORD_ASK, k), ask: 'r_mon', choices: answers(s) },
  ];
}
// 家の欲しい札に合えば+0.15、戦か治めかが合えば+0.07、合わなければ−0.05
export const MON = { HIT: 0.15, NEAR: 0.07, MISS: -0.05 };
function monChoose(s: GameState, id: string): Beat[] {
  const clan = lordHere(s); if (!clan) return [];
  const L = lordOf(s, clan)!, t = temperOf(L), k = `${clan}|${s.turn}|${id}`, me = heroOf(s)!;
  const want = wants(s, clan) as string[], war = want.includes('bu');
  const bonus = want.includes(id) ? MON.HIT : (id === 'war' && war) || (id === 'peace' && !war) ? MON.NEAR : MON.MISS;
  const r = askService(s, bonus); last = r.text;
  const v = vars(s, { clan: clanName(s, clan), lord: L.name, rank: R.RANK_NAME[me.rank] });
  return [
    { who: me.id, text: K.ANSWER[id].line },
    { who: L.id, text: pick((bonus > 0 ? K.LORD_HIT : K.LORD_MISS)[t], k) },
    { who: L.id, text: fill(pick((r.hired ? K.LORD_HIRE : K.LORD_REFUSE)[t], k + 'r'), { ...v, rank: R.RANK_NAME[me.rank] }) },
    { text: r.text },
  ];
}

// ───────── 連歌会 ─────────
export function rengaBeats(s: GameState): Beat[] { return headed('連歌会', rengaRaw(s)); }
function rengaRaw(s: GameState): Beat[] {
  const k = `${s.hero!.town}|${s.turn}`, q = pick(K.RENGA, k), order = ['good', 'mid', 'poor'].sort((a, b) => hash(k + a) - hash(k + b));
  return [
    { bg: 'chashitsu', text: `${s.castles[s.hero!.town].name}の城下、寺の座敷で連歌会が開かれた。武将も商人も、座に連なっている。` },
    { who: 'g_sosho', text: `${pick(K.SOSHO_OPEN, k)}「${q.kami}」`, ask: 'r_renga', choices: order.map((x) => ({ id: x, label: q[x as 'good' | 'mid' | 'poor'] })) },
  ];
}
// よい句はまず受ける（95%）、並の句はこれまでの見込み、まずい句は見込み−0.3（受けたら狂歌として笑いを取った）
export const RENGA_BONUS: Record<string, number> = { good: 1, mid: 0, poor: -0.3 };
function rengaChoose(s: GameState, id: string): Beat[] {
  const k = `${s.hero!.town}|${s.turn}|${id}`;
  const r = renga(s, townsfolk(s, s.hero!.town).filter((g) => g.clan), RENGA_BONUS[id] ?? 0), won = r.text.includes('沸かせた');
  if (won && id === 'poor') r.text = r.text.replace('付けた句が座を沸かせた', '付けた狂歌まがいの句が座を笑わせた');
  last = r.text;
  return [{ who: 'g_sosho', text: pick(id === 'poor' ? K.SOSHO_POOR : id === 'good' && won ? K.SOSHO_GOOD : K.SOSHO_MID, k) }, { text: r.text }];
}

export function choose(s: GameState, key: string, id: string): Beat[] {
  if (key.startsWith('r_sasoi:')) return headed(`${clanName(s, key.slice(8))}家の使者`, sasoiChoose(s, key.slice(8), id));
  if (key === 'r_mon') { const c = lordHere(s); return headed(`${c ? clanName(s, c) : ''}家 ― 目通り`, monChoose(s, id)); }
  if (key === 'r_renga') return headed('連歌会', rengaChoose(s, id));
  return [];
}

// ───────── 城下の噂（札が付いた・名声の節目・忘れられかけ） ─────────
export function rumorBeats(s: GameState): Beat[] {
  if (!s.hero || !isRonin(s)) return [];
  const H = X(s), rk = (H.rk ??= {}), v = vars(s), out: Beat[] = [];
  const pair = (a: string, b: string, head: string) => headed(head, [{ bg: bg('chaya'), text: '街道の茶屋。旅の者が足を休めている。' }, { who: 'g_onna', text: fill(a, v) }, { who: 'g_chonin', name: '町人', text: fill(b, v) }]);
  const fd = fudaOf(s), seen = (rk.fuda ??= []);
  const nf = fd.find((f) => !seen.includes(f.kei));
  if (nf) { seen.push(nf.kei); const [a, b] = pick(K.RUMOR_FUDA[nf.kei], `${nf.kei}|${s.turn}`); out.push(...pair(a, b, `城下の噂 ― 「${nf.name}」`)); }
  const fame = fameOf(s), mile = [70, 50, 30].find((m) => fame >= m && (rk.mile ?? 0) < m);
  if (mile) { rk.mile = mile; if (!nf) { const [a, b] = K.RUMOR_FAME[mile]; out.push(...pair(a, b, '城下の噂')); } }
  const ft = H.fameTurn ?? s.turn;
  if (!out.length && fame > 0 && s.turn - ft >= MEI.FORGET_AFTER && rk.forget !== ft) { rk.forget = ft; const [a, b] = K.RUMOR_FORGET; out.push(...pair(a, b, '城下の噂 ― 名が薄れる')); }
  return out;
}

// ───────── 城下の掛け合い ─────────
export function dojoIntro(s: GameState): Beat[] {
  const me = heroOf(s)!, k = `${s.hero!.town}|${s.turn}`;
  return headed('道場破り', [
    { bg: bg('dojo'), text: `${s.castles[s.hero!.town].name}の城下の道場。門弟たちが、壁ぎわから浪人を見ている。` },
    { who: 'g_shihan', text: pick(K.DOJO_OPEN, k) },
    { who: me.id, text: pick(K.DOJO_REPLY[temperOf(me)], k) },
  ]);
}
export function dojoOutro(s: GameState, won: boolean): Kake {
  const k = `${s.hero!.town}|${s.turn}|d`;
  return won ? [{ line: pick(K.DOJO_WIN_NARR, k) }, { who: 'g_shihan', line: pick(K.DOJO_WIN, k) }] : [{ who: 'g_shihan', line: pick(K.DOJO_LOSE, k) }];
}
export function nozokuIntro(s: GameState): Beat[] {
  const me = heroOf(s)!, k = `${s.hero!.town}|${s.turn}`;
  return headed('野盗退治', [
    { bg: 'mura', text: `${s.castles[s.hero!.town].name}の城下のはずれの村。荒らされた田の向こうに、野盗のねぐらがある。` },
    { who: 'g_choro', text: pick(K.NOZOKU_PLEA, k) },
    { who: me.id, text: pick(K.NOZOKU_REPLY[temperOf(me)], k) },
    { who: 'g_yato', text: pick(K.YATO_TAUNT, k) },
  ]);
}
export function nozokuOutro(s: GameState, won: boolean): Kake { return [{ who: 'g_choro', line: pick(won ? K.NOZOKU_WIN : K.NOZOKU_LOSE, `${s.hero!.town}|${s.turn}|n`) }]; }
export function yojinboKake(s: GameState, hurt: boolean): Kake {
  const k = `${s.hero!.town}|${s.turn}|${s.hero!.jun}`;
  return [{ who: 'g_shonin', line: pick(K.SHONIN_ASK, k) }, { who: 'g_shonin', line: pick(hurt ? K.SHONIN_HURT : K.SHONIN_SAFE, k + 'e') }];
}
export function fushinKake(s: GameState, lvl: number): Kake {
  const k = `${s.hero!.town}|${s.turn}`;
  return [{ who: 'g_kunishu', line: pick(K.KUNISHU_ASK, k) }, { who: 'g_kunishu', line: pick(K.KUNISHU_DONE[lvl >= 2 ? 1 : 0], k + 'e') }];
}
export function infoKake(s: GameState, lordId?: string, lordLine?: string): Kake {
  return [{ who: 'g_rojin', name: '家老', line: pick(K.KARO_HAGGLE, `${s.hero!.town}|${s.turn}`) }, ...(lordId && lordLine ? [{ who: lordId, line: lordLine }] : [])];
}
export function jingariKake(s: GameState, lordId?: string, lordLine?: string): Kake {
  const me = heroOf(s)!;
  return [...(lordId && lordLine ? [{ who: lordId, line: lordLine }] : []), { who: me.id, line: pick(K.JIN_REPLY[temperOf(me)], `${s.turn}|j`) }];
}
export const CAST = K.RONIN_CAST;

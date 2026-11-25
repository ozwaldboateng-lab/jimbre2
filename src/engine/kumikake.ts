// 武将で遊ぶ（物語の外）: 足軽組頭・足軽大将の演出。寄親（付いた時・合戦の前後・推挙しない時・取り立て）と同輩（顔合わせ・盤の前後・先を越された・討ち死に）。
// 節目は場面（画面いっぱい）、合戦の前は短い場面、合戦の後は掛け合い（顔とセリフを二、三行）。セリフは data/kumi_kake.ts
import type { Beat, Choice } from '../data/story_toshiie';
import * as K from '../data/kumi_kake';
import { MOCHI_NAME, type Ban, type Mochi } from './ban';
import { askMochi } from './banplay';
import { retainersOf } from './kashin';
import { banPendOf } from './yari';
import { heroOf } from './hero';
import { pushKumi, takeKumi, type KumiEv } from './kumiev';
import { temperOf } from './lines';
import type { Kake } from './roninkake';
import * as R from './rules';
import { clanName } from './state';
import type { GameState, General } from './types';
import { judgeQuarrel, rivalOf, yoriOf, yorikoOf } from './yorioya';
import * as RYK from './ryokake';
import * as TK from './tosyukake';
import * as GG from './gungi';
import { leading } from './heroArmy';

function hash(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; }
const pick = <T>(arr: T[], key: string): T => arr[hash(key) % arr.length];
const fill = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const headed = (head: string, beats: Beat[]): Beat[] => beats.map((b) => (b.head || b.kind ? b : { ...b, head }));
const gen = (s: GameState, id?: string): General | null => (id && s.generals[id] ? s.generals[id] : null);
function vars(s: GameState, extra: Record<string, string> = {}) {
  const me = heroOf(s)!, y = yoriOf(s), r = rivalOf(s), L = me.clan ? gen(s, s.clans[me.clan]?.leader ?? undefined) : null;
  return { me: me.name, yori: y?.name ?? '', rival: r?.name ?? '', lord: L?.name ?? '', rank: R.RANK_NAME[me.rank], ...extra };
}

// ───────── 月の出来事 → 場面 ─────────
function evBeats(s: GameState, e: KumiEv): Beat[] {
  if (RYK.RYO_KINDS.includes(e.k)) return RYK.evBeats(s, e); // 城主・国持ちの出来事
  const me = heroOf(s)!, ht = temperOf(me), k = `${e.k}|${e.id ?? ''}|${s.turn}`;
  if (e.k === 'yori') {
    const y = gen(s, e.id); if (!y) return [];
    const v = vars(s, { yori: y.name, old: gen(s, e.old)?.name ?? '' }), t = temperOf(y);
    return headed('寄親', [
      { bg: 'zashiki_day', text: fill(e.old ? K.YORI_LOST_NARR : K.YORI_NEW_NARR, v) },
      { who: y.id, text: fill(pick(K.YORI_OPEN[t], k), v) },
      { who: y.id, text: pick(K.YORI_KOKOROE[t], k + 'k') },
      { who: me.id, text: pick(K.HERO_REPLY_YORI[ht], k) },
    ]);
  }
  if (e.k === 'rival') {
    const r = gen(s, e.id); if (!r) return [];
    const v = vars(s, { rival: r.name });
    return headed('同輩', [
      { bg: 'jinmaku', text: `同じ寄親の下で、${r.name}と張り合うことになった。` },
      { who: r.id, text: fill(pick(K.RIVAL_MEET[temperOf(r)], k), v) },
      { who: me.id, text: pick(K.HERO_REPLY_RIVAL[ht], k) },
    ]);
  }
  if (e.k === 'ahead') {
    const r = gen(s, e.id); if (!r) return [];
    return headed('同輩', [
      { bg: 'zashiki_day', text: `同輩の${r.name}が、先に${R.RANK_NAME[r.rank]}に取り立てられた。広間を出たところで、すれ違った。` },
      { who: r.id, text: fill(pick(K.RIVAL_AHEAD[temperOf(r)], k), vars(s, { rank: R.RANK_NAME[r.rank] })) },
    ]);
  }
  if (e.k === 'rivalDead') {
    const r = gen(s, e.id); if (!r) return [];
    const y = yoriOf(s), v = vars(s, { rival: r.name });
    return headed('同輩', [
      { bg: 'jinmaku', text: fill(K.RIVAL_DEAD_NARR, v) },
      ...(y ? [{ who: y.id, text: fill(pick(K.RIVAL_DEAD_YORI, k), v) }] : []),
      { who: me.id, text: pick(K.RIVAL_DEAD_HERO, k) },
    ]);
  }
  if (e.k === 'suisen') {
    const y = yoriOf(s); if (!y) return [];
    return headed('推挙', [
      { bg: 'zashiki_day', text: '功績は満ちた。だが、寄親の推挙がなければ取り立てられない。' },
      { who: y.id, text: pick(K.YORI_SUISEN_NO[temperOf(y)], k) },
    ]);
  }
  if (e.k === 'promote') {
    const L = me.clan ? gen(s, s.clans[me.clan]?.leader ?? undefined) : null, y = yoriOf(s), r = rivalOf(s);
    const v = vars(s, { rank: R.RANK_NAME[e.rank ?? me.rank] });
    return headed('取り立て', [
      { bg: 'zashiki_day', text: e.pull ? fill(K.PULL_NARR, v) : `${me.clan ? clanName(s, me.clan) : ''}家の広間。家中の者が居並ぶ中、${me.name}の名が呼ばれた。` },
      ...(L && !e.pull ? [{ who: L.id, text: fill(pick(K.LORD_PROMOTE[temperOf(L)], k), v) }] : []),
      ...(y ? [{ who: y.id, text: fill(pick(K.YORI_PROMOTE[temperOf(y)], k + 'y'), v) }] : []),
      ...(r && r.rank > me.rank ? [{ who: r.id, text: fill(pick(K.RIVAL_BEHIND[temperOf(r)], k + 'r'), v) }] : []),
      ...((e.rank ?? me.rank) === 1 ? [{ who: 'g_gonroku', text: K.GONROKU_PROMOTE }, ...(yk(s).kumi ? [{ who: 'g_yokichi', text: '殿……いえ、侍大将さま！ おいら、ずっとついて行きます！' }] : [])] : []), // 侍大将に: 権六は旗本に
    ]);
  }
  if (e.k === 'oath') {
    const g = gen(s, e.id); if (!g) return [];
    return headed('主従の盃', [
      { bg: 'zashiki_night', text: `${g.name}を家臣に召し抱えた。灯の下で、主従の盃を交わす。` },
      { who: g.id, text: pick(K.KASHIN_OATH[temperOf(g)], k) },
      { who: me.id, text: pick(K.HERO_OATH[ht], k) },
    ]);
  }
  if (e.k === 'leave') {
    const g = gen(s, e.id); if (!g) return [];
    return headed('暇乞い', [
      { bg: 'zashiki_day', text: `${fill(K.KASHIN_LEAVE_NARR, { name: g.name })}${e.unpaid ? '扶持が、払えなかった。' : ''}` },
      { who: g.id, text: pick(K.KASHIN_LEAVE[temperOf(g)], k) },
    ]);
  }
  if (e.k === 'mochi') return mochiBeats(s);
  if (e.k === 'yoriko') {
    const g = gen(s, e.id); if (!g) return [];
    return headed('寄子', [
      { bg: 'zashiki_day', text: `${g.name}（${R.RANK_NAME[g.rank]}）が、寄子として挨拶に来た。今度は自分が寄親として、心得を授ける番だ。` },
      { who: g.id, text: fill(pick(K.YORIKO_GREET[temperOf(g)], k), { name: g.name }) },
      { who: me.id, text: '……そなたに、一つだけ言うておく。', ask: `k_kokoroe:${g.id}`, choices: K.KOKOROE_CHOICE.map((c) => ({ id: c.id, label: c.label })) },
    ]);
  }
  if (e.k === 'yorikoSour') {
    const g = gen(s, e.id); if (!g) return [];
    return headed('寄子', [{ bg: 'zashiki_night', text: fill(K.YORIKO_SOUR_NARR, { name: g.name }) }, { who: g.id, text: pick(K.YORIKO_SOUR[temperOf(g)], k) }]);
  }
  if (e.k === 'quarrel') {
    const a = gen(s, e.a), b = gen(s, e.b); if (!a || !b) return [];
    return headed('寄子の手柄争い', [
      { bg: 'jinmaku', text: fill(K.QUARREL_NARR, { a: a.name, b: b.name }) },
      { who: a.id, text: pick(K.QUARREL_CLAIM[temperOf(a)], k + 'a') },
      { who: b.id, text: pick(K.QUARREL_CLAIM[temperOf(b)], k + 'b'), ask: `k_quarrel:${a.id}:${b.id}`, choices: [{ id: 'a', label: `${a.name}の手柄と認める`, note: `${a.name}の親しさ+6・功績+10、${b.name}の親しさ−6` }, { id: 'b', label: `${b.name}の手柄と認める`, note: `${b.name}の親しさ+6・功績+10、${a.name}の親しさ−6` }, { id: 'split', label: '二人で分けよ（折半）', note: '二人とも親しさ+1・功績+5' }] },
    ]);
  }
  if (e.k === 'yokichi') return headed('権六の願い', [
    { bg: 'jinmaku', text: '陣払いのあと、権六が改まって膝をついた。後ろで、与吉がそわそわしている。' },
    { who: 'g_gonroku', text: K.GONROKU_SUGGEST, ask: 'k_yokichi', choices: [{ id: 'yes', label: '与吉に組を預ける', note: '与吉が組頭になる（組の足軽は権六が見る）' }, { id: 'no', label: 'まだ早い', note: 'しばらくして、また願い出てくる' }] },
  ]);
  return [];
}
// ───────── 持ち場の言い渡し（足軽大将から。寄親が言い渡し、その場で願い出られる） ─────────
function mochiBeats(s: GameState): Beat[] {
  const P = banPendOf(s), y = yoriOf(s); if (!P?.mochi || P.asked) return [];
  const k = `${s.turn}|m`, m = P.mochi;
  const ch: Choice[] = [{ id: 'keep', label: '承る', note: `${MOCHI_NAME[m]}で戦う` }, ...(['senjin', 'waki', 'teppo', 'gozume'] as Mochi[]).filter((x) => x !== m).map((x) => ({ id: x, label: `${MOCHI_NAME[x]}を願い出る`, note: y && (s.hero!.rel[y.id] ?? 0) >= 30 ? '寄親と親しいので、聞き入れられる' : '聞き入れられるかは半々' }))];
  return headed('持ち場', [
    { bg: 'jinmaku', text: `${P.foeName}との合戦。陣の中で、寄親から持ち場が言い渡される。` },
    { who: y?.id ?? heroOf(s)!.id, text: y ? pick(K.YORI_MOCHI[m], k) : `持ち場は${MOCHI_NAME[m]}。`, ask: 'k_mochi', choices: ch },
  ]);
}
function kashinMochi(s: GameState, m: string, k: string): Beat[] { const g = retainersOf(s)[0]; return g ? [{ who: g.id, text: pick(K.KASHIN_MOCHI[m], k) }] : []; }
let last: string | null = null;
export const takeLast = () => { const t = last; last = null; return t ?? RYK.takeLast() ?? TK.takeLast(); };
export function choose(s: GameState, key: string, id: string): Beat[] {
  if (key.startsWith('k_r_')) return RYK.choose(s, key, id); // 城主・国持ちの場面
  if (key.startsWith('k_t_')) return TK.choose(s, key, id); // 大名の場面
  const k = `${s.turn}|${key}|${id}`;
  if (key === 'k_mochi') {
    const P = banPendOf(s); if (!P?.mochi) return [];
    const y = yoriOf(s);
    if (id === 'keep') return headed('持ち場', kashinMochi(s, P.mochi, k));
    const r = askMochi(s, id as Mochi); last = r.text;
    return headed('持ち場', [...(y ? [{ who: y.id, text: pick(r.ok ? K.YORI_MOCHI_OK : K.YORI_MOCHI_NG, k) }] : []), { text: r.text }, ...kashinMochi(s, P.mochi, k)]);
  }
  if (key.startsWith('k_kokoroe:')) {
    const g = gen(s, key.slice(10)), c = K.KOKOROE_CHOICE.find((x) => x.id === id); if (!g || !c) return [];
    const hit = temperOf(g) === c.id; s.hero!.rel[g.id] = Math.min(100, (s.hero!.rel[g.id] ?? 0) + (hit ? 6 : 1));
    last = `寄子の${g.name}に心得を授けた${hit ? '。心に響いたようだ（親しさ+6）' : '（親しさ+1）'}。`;
    return headed('寄子', [{ who: heroOf(s)!.id, text: c.line }, { who: g.id, text: pick((hit ? K.KOKOROE_HIT : K.KOKOROE_MISS)[temperOf(g)], k) }]);
  }
  if (key.startsWith('k_quarrel:')) {
    const [, a, b] = key.split(':'), ga = gen(s, a), gb = gen(s, b); if (!ga || !gb) return [];
    last = judgeQuarrel(s, a, b, id as 'a' | 'b' | 'split');
    if (id === 'split') return headed('寄子の手柄争い', [{ who: ga.id, text: pick(K.QUARREL_SPLIT, k) }, { text: last }]);
    const w = id === 'a' ? ga : gb, l = id === 'a' ? gb : ga;
    return headed('寄子の手柄争い', [{ who: w.id, text: pick(K.QUARREL_WIN[temperOf(w)], k) }, { who: l.id, text: pick(K.QUARREL_LOSE[temperOf(l)], k) }, { text: last }]);
  }
  if (key === 'k_gungi') {
    const saku = id as GG.Saku, adv = GG.advisers(s), c = GG.targetCastle(s);
    const r = GG.gungi(s, saku); gungiRes = r; if (!r.ok) return [{ text: r.text }];
    const out: Beat[] = [];
    for (const a of adv) { const ok = a.saku === saku; s.hero!.rel[a.g.id] = Math.max(0, Math.min(100, (s.hero!.rel[a.g.id] ?? 0) + (ok ? GUNGI_REL.ADOPT : -GUNGI_REL.REJECT))); }
    const ad = adv.find((a) => a.saku === saku), rj = adv.find((a) => a.saku !== saku);
    if (ad) out.push({ who: ad.g.id, text: pick(K.GUNGI_ADOPT[temperOf(ad.g)], k) });
    if (rj) out.push({ who: rj.g.id, text: pick(K.GUNGI_REJECT[temperOf(rj.g)], k) });
    void c;
    return headed('攻略の軍議', [...out, ...(r.ban ? [] : [{ text: r.text }])]);
  }
  if (key === 'k_gorei') {
    const gr = K.GOREI.find((x) => x.id === id); if (!gr) return [];
    const a = leading(s), H = s.hero!;
    if (a) a.morale = Math.min(1.3, a.morale + (id === 'ichiban' ? 0.1 : id === 'kubi' ? 0.06 : 0.03));
    if (id === 'muri') for (const g of [...yorikoOf(s), ...retainersOf(s)]) H.rel[g.id] = Math.min(100, (H.rel[g.id] ?? 0) + 3);
    if (id === 'kubi') H.fame = Math.min(100, (H.fame ?? 0) + 1);
    last = `出陣の号令: ${gr.label}（${gr.note}）`;
    const rx = [...retainersOf(s), ...yorikoOf(s)][0];
    return headed('出陣', [{ who: heroOf(s)!.id, text: gr.line }, { who: rx?.id ?? 'g_gonroku', text: pick(K.GOREI_REACT[id], k) }]);
  }
  if (key === 'k_yokichi') {
    const Y = yk(s);
    if (id === 'yes') { Y.kumi = true; last = '与吉に組を預けた。与吉が組頭になった。'; return headed('権六の願い', [{ who: 'g_yokichi', text: K.YOKICHI_KUMI_YES[0] }, { who: 'g_gonroku', text: K.YOKICHI_KUMI_YES[1] }]); }
    Y.asked = s.turn; last = '与吉に組を預けるのは、まだ早いとした。';
    return headed('権六の願い', [{ who: 'g_yokichi', text: K.YOKICHI_KUMI_NO[0] }, { who: 'g_gonroku', text: K.YOKICHI_KUMI_NO[1] }]);
  }
  return [];
}
// 与吉の成長（足軽大将まで続く権六と与吉の小さな物語）: 初めての首・深い手傷・組を預けるかの願い出
type YK = { battles: number; kubi?: boolean; hurt?: boolean; kumi?: boolean; asked?: number };
const yk = (s: GameState): YK => { const H = s.hero as unknown as { yk?: YK }; return (H.yk ??= { battles: 0 }); };
export const YOKICHI = { KUBI_AFTER: 2, KUBI_KILLS: 3, HURT_P: 0.3, ASK_AFTER: 4, ASK_AGAIN: 6 };
// 溜まった出来事の場面（取り立てがあれば、同じ月の「推挙されない」は出さない）
export function pendingBeats(s: GameState, on: boolean): Beat[] {
  takeKumi(s, ['grow', 'hurt']); // 盤のあとの掛け合いで出しそびれた分は捨てる
  const evs = takeKumi(s); if (!on || !evs.length || (s.hero as { story?: string } | undefined)?.story === 'toshiie') return []; // 利家の物語には、物語の場面がある
  const promoted = evs.some((e) => e.k === 'promote'), lastP = evs.filter((e) => e.k === 'promote').pop();
  return evs.filter((e) => !(promoted && e.k === 'suisen') && (e.k !== 'promote' || e === lastP)).flatMap((e) => evBeats(s, e)); // 同じ月に二段上がれば、最後の身分の場面だけ
}

// ───────── 合戦の前後（槍働きの盤） ─────────
// 組の足軽（権六・与吉）がいるのは、足軽組頭・足軽大将のあいだ
const kumiOf = (s: GameState) => { const me = heroOf(s); return !!me?.clan && me.rank >= 2; };
export function battleIntro(s: GameState, mochi: string | undefined, seen: boolean): Beat[] {
  const me = heroOf(s)!, y = yoriOf(s), r = rivalOf(s), k = `${s.turn}|b`;
  if (!y && !r) return [];
  const yl = y ? (seen ? pick(mochi && K.YORI_BEFORE[mochi] ? K.YORI_BEFORE[mochi] : K.YORI_BEFORE.all, k) : pick(K.YORI_BEFORE_UNSEEN, k)) : null;
  return headed('出陣', [
    { bg: 'jinmaku', text: '陣触れの太鼓が鳴った。組の足軽たちが、槍を手に集まってくる。' },
    ...(y && yl ? [{ who: y.id, text: yl }] : []),
    ...(r ? [{ who: r.id, text: pick(K.RIVAL_BEFORE[temperOf(r)], k) }] : []),
    ...(kumiOf(s) ? [{ who: 'g_gonroku', text: pick(mochi && K.GONROKU_BEFORE[mochi] ? K.GONROKU_BEFORE[mochi] : K.GONROKU_BEFORE.all, k + 'g') }, { who: 'g_yokichi', text: pick(yk(s).kumi ? K.YOKICHI_AS_KUMI : K.YOKICHI_BEFORE, k + 'y') }] : []), // 組の足軽（与吉が組頭になれば、組頭としての言葉）
    { who: me.id, text: pick(K.HERO_BEFORE[temperOf(me)], k + 'h') },
  ]);
}
export function battleOutro(s: GameState, b: Ban, seen: boolean): Kake {
  const y = yoriOf(s), r = rivalOf(s), k = `${s.turn}|a`, out: Kake = [];
  // 組の足軽: 一番槍の歓声・首実検（権六が首を差し出し、寄親が検める）・手傷を案じる
  let story = false; // 与吉の物語が出た戦（掛け合いを五行まで）
  const kumi = kumiOf(s), hero = b.pieces.find((p) => p.hero), kubi = kumi && b.pieces.some((p) => p.sho && p.side === 'foe' && !p.alive && !p.gone);
  // 与吉の物語（一戦に一つまで）: 二戦目からの勝ち戦で討ち取り三つ以上なら初めての首、首を取ったあとは三割で深い手傷、足軽大将で四戦を越えれば権六が組を預けるよう願い出る
  if (kumi) {
    const Y = yk(s); Y.battles++;
    const say3 = (t: [string, string, string]) => [{ line: t[2] }, { who: 'g_yokichi', line: t[0] }, { who: 'g_gonroku', line: t[1] }];
    if (!Y.kubi && b.over === 'win' && b.kills >= YOKICHI.KUBI_KILLS && Y.battles >= YOKICHI.KUBI_AFTER) { Y.kubi = true; story = true; out.push(...say3(K.YOKICHI_FIRST_KUBI)); }
    else if (Y.kubi && !Y.hurt && !Y.kumi && hash(k + 'h') % 100 < YOKICHI.HURT_P * 100) { Y.hurt = true; story = true; out.push(...say3(K.YOKICHI_BADLY_HURT)); }
    if (Y.kubi && !Y.kumi && (heroOf(s)?.rank ?? 3) <= 2 && Y.battles >= YOKICHI.ASK_AFTER && (Y.asked === undefined || s.turn - Y.asked >= YOKICHI.ASK_AGAIN)) pushKumi(s, { k: 'yokichi' });
  }
  if (!kumi || story) { /* 侍大将からは組がない。与吉の物語の戦は、それだけ */ } else if (b.over === 'lose' || (hero && !hero.alive)) out.push({ who: 'g_yokichi', line: pick(K.YOKICHI_HURT, k) });
  else if (b.log.some((t) => t.startsWith('一番槍'))) out.push({ who: 'g_yokichi', line: pick(K.YOKICHI_ICHIBAN, k) });
  if (kubi && b.over !== 'lose') { out.push({ who: 'g_gonroku', line: pick(K.GONROKU_KUBI, k) }); if (y) out.push({ who: y.id, line: pick(K.YORI_KUBI, k) }); }
  if (y) {
    const t = temperOf(y);
    const line = b.over === 'lose' ? pick(K.YORI_AFTER_HURT, k) : b.tegara <= 0 ? pick(K.YORI_AFTER_NONE[t], k) : seen ? pick(K.YORI_AFTER_GOOD[t], k) : pick(K.YORI_AFTER_UNSEEN, k);
    out.push({ who: y.id, line });
  }
  if (r && b.pieces.some((p) => p.rival)) {
    const t = temperOf(r);
    if (b.rivalTegara > b.tegara) out.push({ who: r.id, line: pick(K.RIVAL_WON[t], k) });
    else if (b.tegara > b.rivalTegara) out.push({ who: r.id, line: pick(K.RIVAL_LOST[t], k) });
  }
  if (kumi && b.over === 'win' && !kubi) out.push({ who: 'g_gonroku', line: pick(K.GONROKU_WIN, k) }); // 勝ち戦の夜
  return out.slice(0, story ? 5 : 4); // 掛け合いは四行まで（与吉の物語の戦は五行）
}

// 盤のあとの家臣の一言（腕を上げた・型が変わった・手傷）。月の出来事から取り出す
export function retainerKake(s: GameState): Kake {
  const evs = takeKumi(s, ['grow', 'hurt']), out: Kake = [], seen = new Set<string>();
  for (const e of evs) {
    const g = gen(s, e.id); if (!g || seen.has(g.id + e.k)) continue; seen.add(g.id + e.k);
    const t = temperOf(g), k = `${s.turn}|${g.id}|${e.k}`;
    out.push({ who: g.id, line: e.k === 'hurt' ? pick(K.KASHIN_HURT[t], k) : e.kind ? K.KASHIN_KIND[e.kind] ?? pick(K.KASHIN_GROW[t], k) : pick(K.KASHIN_GROW[t], k) });
  }
  return out.slice(0, 2);
}

// ───────── 小競り合いの主命（物見・夜討ち・砦の守り） ─────────
export function zeriIntro(s: GameState, sub: string): Beat[] {
  const me = heroOf(s)!, g = retainersOf(s)[0], k = `${s.turn}|z|${sub}`;
  return headed('小競り合い', [
    { bg: sub === 'youchi' ? 'tsukiyo' : sub === 'toride' ? 'jinmaku' : 'senjo', text: K.ZERI_NARR[sub] ?? '' },
    ...(g ? [{ who: g.id, text: pick(K.ZERI_KASHIN[sub] ?? K.ZERI_KASHIN.scout, k) }] : [{ who: 'g_gonroku', text: pick(K.ZERI_KASHIN[sub] ?? K.ZERI_KASHIN.scout, k) }]),
    { who: me.id, text: pick(K.ZERI_HERO[sub] ?? K.ZERI_HERO.scout, k) },
  ]);
}
export const zeriWon = (b: Ban) => (b.goal === 'hold' ? (b.over === 'time' || b.over === 'win') && !!b.pieces.find((p) => p.hero)?.alive && !b.breached : b.over === 'win');
export function zeriOutro(s: GameState, won: boolean): Kake {
  const g = retainersOf(s)[0], k = `${s.turn}|zo`;
  return [{ who: g?.id ?? 'g_gonroku', line: pick(won ? K.ZERI_WIN : K.ZERI_LOSE, k) }];
}

// ───────── 侍大将: 攻略の軍議（陣幕の中で家臣・寄子が進言し、攻め方を選ぶ。採った者の親しさ+4、退けた者−2） ─────────
export const GUNGI_REL = { ADOPT: 4, REJECT: 2 };
let gungiRes: (ReturnType<typeof GG.gungi>) | null = null;
export const takeGungi = () => { const r = gungiRes; gungiRes = null; return r; };
export function gungiBeats(s: GameState): Beat[] {
  const c = GG.targetCastle(s); if (!c) return [];
  const adv = GG.advisers(s);
  return headed('攻略の軍議', [
    { bg: 'jinmaku', text: fill(K.GUNGI_NARR, { castle: c.name }) },
    ...adv.map((a) => ({ who: a.g.id, text: `${GG.SAKU_NAME[a.saku]}を。${a.line}` })),
    { who: heroOf(s)!.id, text: K.GUNGI_ASK, ask: 'k_gungi', choices: (['chikara', 'hyoro', 'choryaku', 'youchi'] as GG.Saku[]).map((x) => ({ id: x, label: `${GG.SAKU_NAME[x]}${adv.some((a) => a.saku === x) ? `（${adv.filter((a) => a.saku === x).map((a) => a.g.name).join('・')}の策）` : ''}`, note: x === 'choryaku' ? `${GG.SAKU_DESC[x]}（見込み${Math.round(GG.choryakuChance(s) * 100)}%）` : GG.SAKU_DESC[x] })) },
  ]);
}
// ───────── 侍大将: 出陣（軍勢を率いて城を出る時。号令を選ぶ。権六は旗本、与吉は組頭として時々） ─────────
export function shutsujinBeats(s: GameState): Beat[] {
  if (!leading(s)) return [];
  const k = `${s.turn}|sj`, rx = [...retainersOf(s), ...yorikoOf(s)];
  return headed('出陣', [
    { bg: 'jinmaku', text: K.SHUTSUJIN_NARR },
    ...rx.slice(0, 2).map((g, i) => ({ who: g.id, text: pick(K.HERO_BEFORE[temperOf(g)], k + i) })),
    { who: 'g_gonroku', text: pick(K.GONROKU_HATAMOTO, k) },
    ...(yk(s).kumi && hash(k) % 10 < 4 ? [{ who: 'g_yokichi', text: pick(K.YOKICHI_VISIT, k) }] : []),
    { who: heroOf(s)!.id, text: '……皆、聞け。', ask: 'k_gorei', choices: K.GOREI.map((g) => ({ id: g.id, label: g.label, note: g.note })) },
  ]);
}
// ───────── 侍大将: 論功行賞の反応（配る前に、配り方から決める） ─────────
export function ronkoKake(s: GameState, alloc: Record<string, number>, won: boolean): Kake {
  const me = heroOf(s)!, k = `${s.turn}|rk`, out: Kake = [];
  const others = Object.entries(alloc).filter(([id]) => id !== me.id), total = Object.values(alloc).reduce((a, b) => a + b, 0);
  const top = others.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
  const cands = [...yorikoOf(s), ...retainersOf(s)], slighted = cands.find((g) => !(alloc[g.id] > 0));
  const rx = cands.find((g) => g.id !== top?.[0] && g !== slighted); // 合戦の一言は、礼・不満を言う者とは別の者に
  if (rx) out.push({ who: rx.id, line: pick(won ? K.BATTLE_WIN_K : K.BATTLE_LOSE_K, k) });
  if (top) { const g = gen(s, top[0]); if (g) out.push({ who: g.id, line: pick(K.RONKO_THANK[temperOf(g)], k) }); }
  if (slighted) out.push({ who: slighted.id, line: pick(K.RONKO_SLIGHT[temperOf(slighted)], k) });
  if (total > 0 && (alloc[me.id] ?? 0) / total > 0.5) out.push({ line: pick(K.RONKO_SELF, k) });
  return out.slice(0, 4);
}

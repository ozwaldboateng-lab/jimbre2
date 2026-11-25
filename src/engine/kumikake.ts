// 武将で遊ぶ（物語の外）: 足軽組頭・足軽大将の演出。寄親（付いた時・合戦の前後・推挙しない時・取り立て）と同輩（顔合わせ・盤の前後・先を越された・討ち死に）。
// 節目は場面（画面いっぱい）、合戦の前は短い場面、合戦の後は掛け合い（顔とセリフを二、三行）。セリフは data/kumi_kake.ts
import type { Beat } from '../data/story_toshiie';
import * as K from '../data/kumi_kake';
import type { Ban } from './ban';
import { heroOf } from './hero';
import { takeKumi, type KumiEv } from './kumiev';
import { temperOf } from './lines';
import type { Kake } from './roninkake';
import * as R from './rules';
import { clanName } from './state';
import type { GameState, General } from './types';
import { rivalOf, yoriOf } from './yorioya';

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
    ]);
  }
  return [];
}
// 溜まった出来事の場面（取り立てがあれば、同じ月の「推挙されない」は出さない）
export function pendingBeats(s: GameState, on: boolean): Beat[] {
  const evs = takeKumi(s); if (!on || !evs.length || (s.hero as { story?: string } | undefined)?.story === 'toshiie') return []; // 利家の物語には、物語の場面がある
  const promoted = evs.some((e) => e.k === 'promote'), lastP = evs.filter((e) => e.k === 'promote').pop();
  return evs.filter((e) => !(promoted && e.k === 'suisen') && (e.k !== 'promote' || e === lastP)).flatMap((e) => evBeats(s, e)); // 同じ月に二段上がれば、最後の身分の場面だけ
}

// ───────── 合戦の前後（槍働きの盤） ─────────
export function battleIntro(s: GameState, mochi: string | undefined, seen: boolean): Beat[] {
  const me = heroOf(s)!, y = yoriOf(s), r = rivalOf(s), k = `${s.turn}|b`;
  if (!y && !r) return [];
  const yl = y ? (seen ? pick(mochi && K.YORI_BEFORE[mochi] ? K.YORI_BEFORE[mochi] : K.YORI_BEFORE.all, k) : pick(K.YORI_BEFORE_UNSEEN, k)) : null;
  return headed('出陣', [
    { bg: 'jinmaku', text: '陣触れの太鼓が鳴った。組の足軽たちが、槍を手に集まってくる。' },
    ...(y && yl ? [{ who: y.id, text: yl }] : []),
    ...(r ? [{ who: r.id, text: pick(K.RIVAL_BEFORE[temperOf(r)], k) }] : []),
    { who: me.id, text: pick(K.HERO_BEFORE[temperOf(me)], k + 'h') },
  ]);
}
export function battleOutro(s: GameState, b: Ban, seen: boolean): Kake {
  const y = yoriOf(s), r = rivalOf(s), k = `${s.turn}|a`, out: Kake = [];
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
  return out;
}

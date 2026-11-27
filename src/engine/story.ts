// 武将で遊ぶ「前田利家 ― 残り火」第一幕（浪人の暮らし〜無断参戦〜帰参）。天下は止めておき、尾張の小さな世界だけで旬を過ごす。
// 大名たちの GameState とは別の軽い状態で動かし、帰参したら1560年の世界（武将で遊ぶ）に切り替える
import * as D from '../data/story_toshiie';
import type { Beat, Choice } from '../data/story_toshiie';
import { newBan, type Ban, type BKind } from './ban';

export type Place = 'arako' | 'kiyosu' | 'atsuta' | 'fukushima';
export const PLACE_NAME: Record<Place, string> = { arako: '荒子', kiyosu: '清洲の城下', atsuta: '熱田', fukushima: '福島の屋敷' };
export const PLACE_BG: Record<Place, string> = { arako: 'arako', kiyosu: 'kiyosu_tsuji', atsuta: 'atsuta', fukushima: 'fukushima' };
export interface StoryState {
  id: 'toshiie'; year: number; month: number; jun: number; place: Place;
  gold: number; fame: number; sense: number; bra: number;
  rel: Record<string, number>; flags: Record<string, boolean | number | string>;
  idx: Record<string, number>; // まつ・兄・清洲の話をどこまで見たか
  diary: { date: string; text: string }[];
  battle?: { kind: 'okehazama' | 'moribe'; step: number; score: number; ban?: boolean }; // ban: 読む・決める・飛び込むのあと、槍働きの盤を待っている
  done?: 'okehazama' | 'moribe';
  seed: number;
}
// 画面に返すもの: 見せる場面と、そのあとの選択
export interface Show { beats: Beat[]; choice?: { key: string; choices: Choice[] } }

export const JUN = ['上旬', '中旬', '下旬'];
export const dateLabel = (s: StoryState) => `${s.year}年${s.month}月${JUN[s.jun]}`;
const after = (s: StoryState, y: number, m: number, j = 0) => s.year * 100 + s.month + s.jun / 10 >= y * 100 + m + j / 10;
function rnd(s: StoryState) { s.seed = (s.seed * 1103515245 + 12345) & 0x7fffffff; return s.seed / 0x7fffffff; }
const clamp = (v: number) => Math.max(0, Math.min(100, v));
function note(s: StoryState, text: string) { s.diary.push({ date: dateLabel(s), text }); if (s.diary.length > 200) s.diary.shift(); }

export function newStory(stats: { bra: number }): StoryState {
  const s: StoryState = { id: 'toshiie', year: 1559, month: 7, jun: 0, place: 'arako', gold: 30, fame: 20, sense: 10, bra: stats.bra, rel: { matsu: 20, toshihisa: 20 }, flags: {}, idx: {}, diary: [], seed: 12345 };
  note(s, '清洲を追われ、荒子へ戻った。');
  return s;
}

// 1旬を進める（月と年を繰る）
function pass(s: StoryState) {
  s.jun++;
  if (s.jun >= 3) { s.jun = 0; s.month++; if (s.month > 12) { s.month = 1; s.year++; } }
}

// その場所でできること
export type ActId = 'yashiki' | 'sakaya' | 'suburi' | 'aruku' | 'tsuji' | 'kiyosu_sakaya' | 'yojinbo' | 'minato' | 'mihari' | 'rest' | 'matsu_t' | 'hisa_t' | 'chichi_t' | 'koshin_t' | 'wait';
export const ACT_NAME: Record<ActId, [string, string]> = {
  yashiki: ['屋敷', '家の者と話す'], matsu_t: ['まつと話す', '親しくなる'], hisa_t: ['兄・利久と話す', ''], chichi_t: ['父・利春に会う', ''], koshin_t: ['古参の家臣と話す', '家の銭の動き'],
  sakaya: ['酒屋', '噂を聞く（金−2）'], suburi: ['庭で素振り', '武勇を磨く'], aruku: ['城下を歩く', '噂を拾い、名を見せる'],
  tsuji: ['辻を歩く', '清洲の噂。昔の仲間に会えるかも'], kiyosu_sakaya: ['清洲の酒屋', '噂を聞く（金−3）'],
  yojinbo: ['湊の用心棒', '金を稼ぐ'], minato: ['湊の噂', '他国の動きを聞く'], mihari: ['水口を見張る', '福島の頼み'],
  rest: ['休む', '1旬を過ごす'], wait: ['時を待つ', '次の戦まで1か月を過ごす'],
};
export function actsOf(s: StoryState): ActId[] {
  const f = s.flags;
  if (s.place === 'arako') return ['yashiki', 'sakaya', 'suburi', 'aruku', ...(f.waitMoribe ? ['wait' as ActId] : []), 'rest'];
  if (s.place === 'kiyosu') return ['tsuji', 'kiyosu_sakaya', 'rest'];
  if (s.place === 'atsuta') return [...(f.koshin ? ['yojinbo' as ActId] : []), 'minato', 'rest'];
  return [...(f.irai && !f.night2 ? ['mihari' as ActId] : []), 'rest'];
}
export function yashikiActs(s: StoryState): ActId[] { return ['matsu_t', 'hisa_t', ...(!s.flags.father ? ['chichi_t' as ActId] : []), 'koshin_t']; }
export const placesOf = (s: StoryState): Place[] => ['arako', 'kiyosu', 'atsuta', ...(s.flags.irai ? ['fukushima' as Place] : [])];

// 行い（1旬を使う）。返り値は見せる場面
export function act(s: StoryState, id: ActId): Show {
  const out: Beat[] = [];
  const bg = D.STORY_BG[PLACE_BG[s.place]] ? PLACE_BG[s.place] : 'arako';
  let choice: Show['choice'];
  switch (id) {
    case 'matsu_t': {
      const k = s.idx.matsu ?? 0; s.idx.matsu = k + 1;
      out.push(...D.MATSU_TALKS[k % D.MATSU_TALKS.length].map((b) => ({ ...b, bg: 'arako_night' })));
      s.rel.matsu = clamp((s.rel.matsu ?? 0) + 8);
      break;
    }
    case 'hisa_t': {
      const k = s.idx.hisa ?? 0; s.idx.hisa = k + 1;
      out.push(...D.TOSHIHISA_TALKS[k % D.TOSHIHISA_TALKS.length].map((b) => ({ ...b, bg: 'arako_night' })));
      s.rel.toshihisa = clamp((s.rel.toshihisa ?? 0) + 6);
      break;
    }
    case 'chichi_t': out.push({ who: 'toshiharu', bg: 'arako_night', text: 'しばらくは、ここにいろ。……田も、米も、馬も、数えてみよ。家とは、そういうものだ' }); s.rel.toshiharu = clamp((s.rel.toshiharu ?? 0) + 6); break;
    case 'koshin_t':
      if (s.flags.sakaya && !s.flags.koshin) { s.flags.koshin = true; out.push(...D.EV_KOSHIN); note(s, '米の値が上がっていると聞いた。熱田で用心棒の口が見つかるようになった。'); }
      else out.push({ who: 'koshin', bg: 'arako_night', text: s.flags.father ? '殿（利久様）は、よう家を見ておられます。……犬千代様も、どうか身を慎まれますよう' : '米の値は落ち着きませぬ。銭は、早う見ておかねばなりませぬ' });
      break;
    case 'sakaya':
      if (!s.flags.sakaya) { s.flags.sakaya = true; out.push(...D.EV_SAKAYA); choice = { key: 'sakaya', choices: D.SAKAYA_CHOICES }; break; }
      if (s.flags.anike && !s.flags.irai) { out.push(...D.EV_IRAI); choice = { key: 'irai', choices: D.IRAI_CHOICES }; break; }
      s.gold -= 2; s.sense = clamp(s.sense + 2 + Math.floor(rnd(s) * 3));
      out.push({ bg: 'sakaya', text: rumorText(s) });
      break;
    case 'aruku': s.sense = clamp(s.sense + 2); s.fame = clamp(s.fame + 1); out.push({ bg, text: '長槍を担いで、わざと道の真ん中を歩いた。道をあける者の顔は、以前と少し違う。怖れているのではなく、面倒を避けている顔である。' }); break;
    case 'suburi': {
      const up = s.bra < 90 && rnd(s) < 0.3;
      if (up) s.bra++;
      out.push({ bg: 'arako', text: `庭で槍を振った。荒子では、槍を振っても空気は動かない。${up ? `それでも、腕は少しずつ戻ってくる（武勇${s.bra}）。` : '鳥が飛び、家人が遠巻きに見るだけである。'}` });
      break;
    }
    case 'tsuji': {
      s.sense = clamp(s.sense + 3 + Math.floor(rnd(s) * 3));
      const k = s.idx.kiyosu ?? 0;
      if (rnd(s) < 0.6) { s.idx.kiyosu = k + 1; out.push(...D.KIYOSU_MEET[k % D.KIYOSU_MEET.length].map((b) => ({ ...b, bg: 'kiyosu_tsuji' }))); const w = D.KIYOSU_MEET[k % D.KIYOSU_MEET.length][0].who; if (w) s.rel[w] = clamp((s.rel[w] ?? 30) + 6); }
      else out.push({ bg: 'kiyosu_tsuji', text: `清洲の辻は人の熱を持っている。使者の数が増え、米の荷が動く。${s.sense >= 40 ? '——兵糧の荷が、南の鳴海の方へ流れているのが見えた。' : ''}` });
      break;
    }
    case 'kiyosu_sakaya': s.gold -= 3; s.sense = clamp(s.sense + 3 + Math.floor(rnd(s) * 4)); out.push({ bg: 'sakaya', text: rumorText(s) }); break;
    case 'yojinbo': {
      const g = 10 + Math.floor(rnd(s) * 6); s.gold += g; s.fame = clamp(s.fame + 1);
      const fight = rnd(s) < 0.25; if (fight) s.fame = clamp(s.fame + 2);
      out.push({ bg: 'atsuta', text: `熱田の湊で、荷を守る用心棒を務めた。${fight ? '夜、荷を狙う者どもを長槍で追い払った。' : '何事もなく荷は着いた。'}金${g}貫を受け取った。` });
      break;
    }
    case 'minato': s.sense = clamp(s.sense + 3); out.push({ bg: 'atsuta', text: `湊には他国の噂が流れ込む。${after(s, 1560, 3) ? '「駿河の今川が、大軍を整えている。三河の向こうから、尾張へ来る」' : '「三河の松平は今川の下。美濃の斎藤は、尾張を窺っている」'}` }); break;
    case 'mihari':
      if (!s.flags.night1) { s.flags.night1 = true; out.push(...D.EV_NIGHT1); s.fame = clamp(s.fame + 3); note(s, '福島の田の水口で、榊原の浪人どもを追い払った。'); break; }
      out.push(...D.EV_HIRU); choice = { key: 'hiru', choices: D.HIRU_CHOICES };
      break;
    case 'wait': pass(s); pass(s); out.push({ bg: 'arako', text: '荒子で、次の戦を待った。槍の手入れをし、まつの繕い物を眺め、兄の帳面の音を聞く。' }); break;
    case 'rest': out.push({ bg, text: '何もせずに過ごした。' }); break;
    case 'yashiki': break;
  }
  pass(s);
  const sch = scheduled(s);
  const pc = choice ? undefined : pendingChoice(s);
  return { beats: [...out, ...sch, ...(pc?.key === 'uwasa' ? uwasaBeats(s) : [])], choice: choice ?? pc };
}
// 噂（噂を読む力が上がるほど、本当らしい筋が混じる）
function rumorText(s: StoryState) {
  const lines = ['「清洲の殿は、また馬を走らせているらしい」', '「岩倉の織田は、もう持たぬそうだ」', '「美濃の斎藤義龍は、病がちだとか」'];
  if (after(s, 1560, 2)) lines.push('「駿河の今川が、上洛するとか、尾張を取るとか」');
  if (s.sense >= 40 && after(s, 1560, 3)) lines.push('「鳴海と大高の城に、今川の兵糧が入っている」');
  return `酒の匂いの中で噂を聞いた。${lines[Math.floor(rnd(s) * lines.length)]}（噂を読む力 ${s.sense}）`;
}
// 時期と流れで起きる出来事（行いのあと）
function scheduled(s: StoryState): Beat[] {
  const f = s.flags, out: Beat[] = [];
  if (!f.father && after(s, 1559, 9)) { f.father = true; out.push(...D.EV_FATHER); note(s, '父・利春が死んだ。兄・利久が家督を継いだ。'); }
  else if (f.father && !f.anike && s.place === 'arako') { f.anike = true; out.push(...D.EV_ANIKE); }
  if (f.night2 && !f.rieki && after(s, 1560, 2) && s.place === 'arako') { f.rieki = true; out.push(...D.EV_RIEKI); note(s, '兄に養子・利益が来た。もう待たない。'); }
  else if (!f.rieki && after(s, 1560, 4) && s.place === 'arako') { f.rieki = true; out.push(...D.EV_RIEKI); }
  return out;
}
// 時期の来た選択（噂・森部）
export function pendingChoice(s: StoryState): Show['choice'] {
  const f = s.flags;
  if (!f.uwasa && !f.done && (after(s, 1560, 5) || (s.sense >= 50 && after(s, 1560, 4, 2)))) return { key: 'uwasa', choices: D.UWASA_CHOICES };
  return undefined;
}
export function uwasaBeats(s: StoryState): Beat[] { return [...D.EV_UWASA, ...(s.sense >= 40 ? [D.EV_UWASA_SENSE] : [])]; }
// 森部（翌年五月）は時期が来たら必ず
export function moribeDue(s: StoryState) { return !!s.flags.waitMoribe && !s.done && !s.battle && after(s, 1561, 5); }

// 選択の結果
export function choose(s: StoryState, key: string, id: string): Show {
  const f = s.flags;
  switch (key) {
    case 'sakaya':
      if (id === 'ogoru') { s.gold -= 6; note(s, '酒屋の若侍くずれを、奢って黙らせた。'); return { beats: D.EV_SAKAYA_OGORU }; }
      s.fame = clamp(s.fame + 5); s.rel.toshihisa = clamp((s.rel.toshihisa ?? 0) - 8); note(s, '酒屋の若侍くずれと喧嘩をした。'); return { beats: D.EV_SAKAYA_KENKA };
    case 'irai':
      f.irai = true; f.pay = id === '50' ? 50 : 30; if (id === '30') s.rel.fukushima = 50; else s.rel.fukushima = 30;
      note(s, `地侍・福島から、田の水争いの頼みを受けた（${f.pay}貫）。`);
      return { beats: [{ bg: 'fukushima', who: 'fukushima', text: id === '50' ? '……五十で' : 'ありがたい。恩に着ます' }, { bg: 'fukushima', text: '（福島の屋敷へ行けるようになった。夜、水口を見張る）' }] };
    case 'hiru': {
      f.night2 = true; s.gold += Number(f.pay ?? 30); s.fame = clamp(s.fame + 8);
      if (id === 'matsu') { f.waited = true; s.sense = clamp(s.sense + 10); s.rel.matabe = 60; note(s, '又兵衛の策で待ち、水争いを収めた。勝つのと、残すのは違う。'); return { beats: D.EV_NIGHT2_WAIT }; }
      s.rel.fukushima = clamp((s.rel.fukushima ?? 30) - 15); note(s, '真っすぐ乗り込み、水争いを押し切った。'); return { beats: D.EV_NIGHT2_RUSH };
    }
    case 'uwasa':
      f.uwasa = true;
      if (id === 'iku') { s.battle = { kind: 'okehazama', step: 0, score: 0 }; note(s, '「清洲が動くらしい」。誰の許しも乞わず、行くと決めた。'); return { beats: D.EV_SHUTTATSU((s.rel.matsu ?? 0) >= 50) }; }
      f.waitMoribe = true; note(s, '桶狭間には出なかった。'); return { beats: [{ bg: 'arako', text: '利家は動かなかった。数日のうちに、信長が駿河の今川義元を桶狭間に討ったという報せが、荒子にも落ちてきた。——取り残された。次の戦を待つしかない。' }] };
    case 'kisan':
      s.rel.oda_nobunaga = id === 'shojiki' ? 60 : 40;
      return { beats: [...(id === 'shojiki' ? D.EV_KISAN_SHOJIKI : D.EV_KISAN_WABI), ...D.EV_KISAN_AFTER] };
  }
  return { beats: [] };
}
// 合戦の一手（読む・決める・飛び込む）
export const stepsOf = (s: StoryState) => (s.battle?.kind === 'moribe' ? D.MORIBE : D.OKEHAZAMA);
export function battleChoose(s: StoryState, id: string): Show {
  const b = s.battle!, step = stepsOf(s)[b.step];
  const c = step.choices.find((x) => x.id === id)!;
  b.score += c.score({ bra: s.bra, sense: s.sense, fame: s.fame });
  b.step++;
  if (b.step < stepsOf(s).length) return { beats: [] };
  b.ban = true; // 飛び込んだ先で、自分の槍を振るう（槍働きの盤）。盤が済めば battleFinish
  return { beats: [] };
}
// 槍働きの盤: 敵の先手、中ほどに名のある侍（桶狭間は今川の旗本、森部は足立六兵衛）
export function battleBanOf(s: StoryState): Ban {
  const b = s.battle!, mob = (k: BKind) => ({ kind: k, who: null });
  const sho = b.kind === 'moribe' ? { name: '足立六兵衛', bra: 78, int: 50, lea: 60, sho: true } : { name: '今川の旗本', bra: 70, int: 55, lea: 62, sho: true };
  return newBan({
    me: [{ kind: 'kiba', who: { name: '前田利家', bra: s.bra, int: 65, lea: 72, hero: true, yari: 2 } }, mob('ashi'), mob('ashi')],
    foe: (['ashi', 'ashi', 'yumi'] as BKind[]).map(mob), seed: Math.floor(rnd(s) * 1e9),
    mid: [{ kind: 'kiba', who: sho }, mob('ashi')], end: 'oiuchi', late: [mob('ashi'), mob('ashi')],
  });
}
// 盤の首尾を点に足して、戦を締める（勝ち・名のある将を討つ・手柄で点が増える。負けても戦は終わる）
export function battleFinish(s: StoryState, ban: Ban | null): Show {
  const b = s.battle!;
  if (ban) b.score += (ban.over === 'win' ? 1 : 0) + (ban.duelWon?.length || ban.log.some((x) => /討ち取った/.test(x) && /旗本|六兵衛/.test(x)) ? 2 : 0) + Math.min(2, Math.floor(ban.tegara / 3));
  b.ban = false;
  // 戦の終わり
  const kind = b.kind, great = kind === 'moribe' || b.score >= 8;
  s.battle = undefined;
  s.fame = clamp(s.fame + (great ? 15 : 8));
  if (kind === 'okehazama') {
    s.year = 1560; s.month = 5; s.jun = 2;
    if (!great) { s.flags.waitMoribe = true; s.flags.okeHead = true; note(s, '桶狭間で首を取った。だが、許しは来なかった。'); return { beats: [...D.EV_SASSA_SENJO, ...D.EV_SHUKYU.slice(0, 4), ...D.EV_NOT_YET] }; }
    s.done = 'okehazama'; note(s, '桶狭間で名のある首を挙げ、清洲へ呼ばれた。');
  } else { s.year = 1561; s.month = 5; s.jun = 2; s.done = 'moribe'; note(s, '森部で足立六兵衛の首を挙げ、清洲へ呼ばれた。'); }
  const sh = D.EV_SHUKYU.map((x) => (kind === 'moribe' ? { ...x, bg: x.bg === 'okehazama' ? 'moribe' : x.bg === 'okehazama_sen' ? 'moribe_sen' : x.bg } : x));
  return { beats: [...(kind === 'okehazama' ? D.EV_SASSA_SENJO : []), ...sh, ...D.EV_KISAN], choice: { key: 'kisan', choices: D.KISAN_CHOICES } };
}
export function startMoribe(s: StoryState): Show {
  s.battle = { kind: 'moribe', step: 0, score: 0 };
  return { beats: [{ kind: 'door', head: '森部', text: '森部', sub: '永禄四年 五月' }, { head: '森部', bg: 'sakaya', text: '永禄四年五月。「美濃の斎藤義龍が死んだ。清洲が美濃へ出るらしい」。今度は迷わなかった。' }, ...D.EV_SHUTTATSU((s.rel.matsu ?? 0) >= 50).slice(0, 3)] };
}

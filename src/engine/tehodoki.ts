// 手ほどき（前田利家 ― 残り火 を遊びながら仕組みを覚える）: 章ごとの「やってみる」目標と、済んだかの判定・ご褒美
// 物語の画面（場面）には仕組みの説明を出さない。説明は武将の画面の「手ほどき」の欄だけ（設計は STORY_TUTORIAL_DESIGN.md）
import type { GameState } from './types';
import { addLog } from './state';

export type Chap = 'maku1' | 'maku2' | 'bu2' | 'bu3' | 'bu4' | 'bu5';
export const CHAP_NAME: Record<Chap, string> = { maku1: '第一幕 浪人', maku2: '第二幕 母衣衆', bu2: '第二部 北へ立つ', bu3: '第三部 裂け目', bu4: '第四部 根を張る', bu5: '第五部 残り火' };
// 目標: key は行いの印（武将の画面のボタンの data-h。場所は spot:<id>）、または state の判定
export interface Goal { id: string; label: string; hint: string; bld?: string; cat?: string; keys?: string[]; test?: (s: GameState) => boolean; gold?: number; favor?: number }

const H_ = (s: GameState) => s.hero as (NonNullable<GameState['hero']> & { teh?: { did: Record<string, number>; done: Record<string, number> } });
export const tehState = (s: GameState) => (H_(s).teh ??= { did: {}, done: {} });

// いまの章（物語の中だけ）
export function chapOf(s: GameState): Chap | null {
  const H = s.hero; if (!H || H.story !== 'toshiie') return null;
  const d = H.storyDone ?? [];
  return d.includes('ryo4') ? 'bu5' : d.includes('ryo3') ? 'bu4' : d.includes('ryo') ? 'bu3' : d.includes('katoku') ? 'bu2' : 'maku2';
}

export const TEH: Record<Chap, Goal[]> = {
  maku1: [],
  maku2: [
    { id: 'tojo', label: '登城して主命を受ける', hint: '城の窓から「登城」。上旬の評定で、申し付けられる役目から一つ選ぶ', bld: 'shiro', keys: ['q-pick', 'q-accept'], gold: 30 },
    { id: 'work', label: '主命を果たす', hint: '右の欄の「今月の用件」から。場所の要る主命は、上の「旅」の欄で行き先を選んで出向く', test: (s) => (s.hero!.done ?? 0) >= 1, favor: 3 },
    { id: 'dojo', label: '道場で稽古する', hint: '道場の窓から「稽古する」。武勇・統率が上がることがある', bld: 'dojo', keys: ['train:dojo', 'spot:dojo', 'study'], gold: 20 },
    { id: 'chaya', label: '茶屋で旅人の話を聞く', hint: '茶屋の窓から。噂で他国の様子や名人の居所が分かる', bld: 'chaya', keys: ['spot:chaya'], gold: 20 },
    { id: 'buke', label: '武家屋敷で人を訪ねる', hint: '武家屋敷の窓から人を選び「訪ねる」か「進物を贈る」。親しさが上がる（進物は市で買う）', bld: 'buke', keys: ['visit', 'gift'], gold: 20 },
    { id: 'rest', label: '休んで旬を送る', hint: '上の「休む」。三旬で一か月が過ぎ、俸禄と世の中の動きの報告が来る', keys: ['rest'] },
  ],
  bu2: [
    { id: 'advice', label: '家中の進言を聞く', hint: '自分の屋敷の窓から。奥村・村井の話を聞いて家のことを決める（月に一度）', bld: 'ie', keys: ['advice'], gold: 50 },
    { id: 'jinji', label: '家臣と会う', hint: '上の「人事」の札から家臣を選ぶ。遣わす・城代に置く・鍛えるなど', cat: 'jinji', keys: ['meet'] },
    { id: 'gov', label: '城の政を行う', hint: '上の「内政」の札から。開発・商業に投じ、見回りで治安を上げる。府中の治安と残り火が物語を左右する', cat: 'naisei', keys: ['gov', 'cact'], gold: 50 },
    { id: 'myhyo', label: '自分の評定を開く', hint: '上の「内政」の札から。家臣に開発・普請・調略などの役目を申し付ける', cat: 'naisei', keys: ['myhyo'], gold: 50 },
    { id: 'kaku', label: '屋敷を普請する', hint: '自分の屋敷の窓から。家の格が上がり、養える手勢が増える', bld: 'ie', keys: ['kaku'] },
    { id: 'gungi', label: '軍議を開く', hint: '攻略の主命を受けたら、上の「軍事」の札から。家臣の進言を聞いて攻め方を決める', cat: 'gunji', keys: ['gungi-open'], favor: 3 },
  ],
  bu3: [
    { id: 'favor', label: '主君の覚えを60より上に保つ', hint: '主命を果たし、登城して報告する。名物の献上でも上がる。覚えが低いと疑われ、詰問される', test: (s) => (s.hero!.favor ?? 0) >= 60, gold: 100 },
    { id: 'mei', label: '名物を求める', hint: '名物が売りに出ている町の市で。茶会に使え、主君への献上は覚えを上げる', bld: 'ichi', keys: ['buymei'] },
    { id: 'chakai', label: '茶会を開く', hint: '名物を持っていれば、城の窓から。城下の武将みなと親しくなり、名声が上がる', bld: 'shiro', keys: ['chakai'] },
    { id: 'skill', label: '名人に師事する', hint: '茶屋の噂で名人の居所を聞き、その城下の武家屋敷で「師事を願う」。独学の先の段へ', bld: 'buke', keys: ['mstudy'] },
  ],
  bu4: [
    { id: 'ryoshu', label: '領主として領を治める', hint: '城の窓の「領主として治める」から大名の画面へ。領の城と部隊をひと月動かし、城下へ戻る', bld: 'shiro', keys: ['ryo-back'], gold: 200 },
    { id: 'gov4', label: '加賀を治める', hint: '上の「内政」の札から。加賀は一向一揆の残り火が強い。見回りと開発で治安を上げる', cat: 'naisei', keys: ['gov', 'cact'] },
  ],
  bu5: [
    { id: 'advice5', label: '家中の進言を聞く', hint: '自分の屋敷の窓から。利長・利益・奥村の言い分を聞き、家の行く末を決める', bld: 'ie', keys: ['advice'] },
    { id: 'kenjo', label: '主命（普請・献金・献上）を果たす', hint: '天下は静まった。城を登って評定に出ると、太閤の普請や献上を申し付けられる', test: (s) => (s.hero!.done ?? 0) >= 1 },
  ],
};

// 行いの記録（武将の画面から、行いが通った時に呼ぶ）
export function did(s: GameState, key: string) { if (!chapOf(s)) return; const T = tehState(s); T.did[key] = (T.did[key] ?? 0) + 1; }
const isDone = (s: GameState, g: Goal) => { const T = tehState(s); return !!T.done[g.id] || (g.keys ?? []).some((k) => (T.did[k] ?? 0) > 0) || !!g.test?.(s); };
// 章の目標と済んだか
export function goalsOf(s: GameState): { chap: Chap; list: { g: Goal; done: boolean }[] } | null {
  const c = chapOf(s); if (!c) return null;
  return { chap: c, list: TEH[c].map((g) => ({ g, done: isDone(s, g) })) };
}
// 新しく済んだ目標に印を付け、ご褒美を渡す。知らせの文を返す
export function sync(s: GameState): string[] {
  const c = chapOf(s); if (!c) return [];
  const T = tehState(s), out: string[] = [];
  for (const g of TEH[c]) if (!T.done[g.id] && isDone(s, g)) {
    T.done[g.id] = s.turn;
    const H = s.hero!, rw: string[] = [];
    if (g.gold) { H.gold += g.gold; rw.push(`金+${g.gold}`); }
    if (g.favor) { H.favor = Math.min(100, H.favor + g.favor); rw.push(`主君の覚え+${g.favor}`); }
    out.push(`手ほどき「${g.label}」を済ませた${rw.length ? `（${rw.join('・')}）` : ''}。`);
    addLog(s, `手ほどき: ${g.label}`, 'info', true);
  }
  return out;
}
// 印を付ける建物・札（まだ済んでいない目標のもの）
export function marks(s: GameState): { bld: Set<string>; cat: Set<string> } {
  const r = { bld: new Set<string>(), cat: new Set<string>() };
  const gs = goalsOf(s); if (!gs) return r;
  for (const { g, done } of gs.list) if (!done) { if (g.bld) r.bld.add(g.bld); if (g.cat) r.cat.add(g.cat); }
  return r;
}

// ───────── 物語の支度（一度だけ）: 利家は槍の名手（武芸二段から）。家督のあとは、奥村永福・村井長頼が家臣（家中の進言の二人） ─────────
type Kit = { kit?: { skill?: boolean; kashin?: boolean } };
const KASHIN0: { id: string; name: string; bra: number; int: number; lea: number; cha: number; born: number }[] = [
  { id: 'okumura', name: '奥村永福', bra: 72, int: 66, lea: 74, cha: 64, born: 1541 },
  { id: 'murai', name: '村井長頼', bra: 74, int: 58, lea: 68, cha: 62, born: 1543 },
];
export function storyKit(s: GameState) {
  const H = s.hero as (NonNullable<GameState['hero']> & Kit & { skill?: Record<string, number>; retainers?: string[] }) | null;
  if (!H || H.story !== 'toshiie') return;
  const K = (H.kit ??= {}), me = s.generals[H.id];
  if (!K.skill) { K.skill = true; H.skill = { ...(H.skill ?? {}), yari: Math.max(H.skill?.yari ?? 0, 200) }; }
  if (!K.kashin && (H.storyDone ?? []).includes('katoku') && me?.clan) {
    K.kashin = true;
    for (const k of KASHIN0) {
      if (!s.generals[k.id]) s.generals[k.id] = { id: k.id, name: k.name, clan: me.clan, bra: k.bra, int: k.int, lea: k.lea, cha: k.cha, status: 'kashin', loc: H.town, army: null, captor: null, formerClan: null, rank: 3, merit: 0, born: k.born, liege: me.id };
      if (!(H.retainers ??= []).includes(k.id)) H.retainers.push(k.id);
      H.rel[k.id] = Math.max(H.rel[k.id] ?? 0, 60);
    }
  }
}

// ───────── 章の始まりの一言（物語の人物が、物語の口調で一言だけ促す。仕組みの説明は入れない） ─────────
import type { Beat } from '../data/story_toshiie';
export const CHAP_OPEN: Record<Chap, Beat[]> = {
  maku1: [],
  maku2: [
    { who: 'sassa_narimasa', bg: 'kiyosu_niwa', text: '戻ったか、犬千代。……殿は働きしか見ぬ。登城して、役目をもらえ。遅れを取り戻すのは、それからだ' },
    { who: 'matsu', bg: 'arako_night', text: '槍ばかりでなく、人とも会うてくださいませ。清洲には、利家様を知らぬ方が増えております' },
  ],
  bu2: [
    { who: 'okumura', bg: 'zashiki_night', text: '殿。これよりは前田の家が、殿の槍の代わりに働きます。家中の者の話を、時に聞いてくだされ' },
    { who: 'murai', bg: 'zashiki_night', text: '府中の米も、人も、まだ殿を知りませぬ。治めは一日では成りませぬぞ' },
  ],
  bu3: [
    { who: 'matsu_wife', bg: 'zashiki_night', text: '国を持てば、上からも下からも見られます。上様への礼は、怠らぬように' },
  ],
  bu4: [
    { who: 'okumura', bg: 'zashiki_day', text: '加賀・能登・越中。もはや一人の目では見きれませぬ。城ごとに人を置き、領を一つの家として動かしなされ' },
  ],
  bu5: [
    { who: 'matsu_wife', bg: 'zashiki_night', text: '天下は静まりました。……あとは、残すものを考える時でございます' },
  ],
};
type Op = { opened?: Chap[] };
// まだ見せていない章の始まりの一言（見せたら印を付ける）。章が始まった時、名声を上げる（物語の節目で名が知られる）
export const CHAP_FAME: Record<Chap, number> = { maku1: 0, maku2: 20, bu2: 15, bu3: 15, bu4: 20, bu5: 10 };
export function chapOpen(s: GameState): Beat[] {
  const c = chapOf(s); if (!c) return [];
  const H = s.hero as NonNullable<GameState['hero']> & Op;
  if ((H.opened ??= []).includes(c)) return [];
  H.opened.push(c);
  H.fame = Math.min(100, (H.fame ?? 0) + CHAP_FAME[c]);
  return CHAP_OPEN[c].map((b) => ({ ...b, head: CHAP_NAME[c] }));
}
// 第四部だけ、大名の画面（領主）に入れる（ひと月ごとに城下へ戻る。物語の場面は城下で起きる）
export const storyRyoOk = (s: GameState) => chapOf(s) === 'bu4';

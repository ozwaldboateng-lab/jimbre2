// 前田利家 ― 残り火 第三部「裂け目」: 第七章・第八章の場面の時期、能登の国主、本能寺での世の中の合わせ直し（柴田家へ）、賤ヶ岳の分かれ道
import * as D3 from '../data/story_toshiie3';
import type { Beat } from '../data/story_toshiie';
import { delegateOf } from './delegate';
import { STORY_ENDS, newIe } from './maeda';
import { captureCastle } from './ops';
import { addMerit } from './ranks';
import { addLog, clanName } from './state';
import type { GameState } from './types';

const ym = (s: GameState) => s.year * 12 + s.month;
const at = (y: number, m: number) => y * 12 + m;
type Ev = { id: string; beats: Beat[] | ((s: GameState) => Beat[]); due: (s: GameState) => boolean; when: string; at?: (s: GameState) => number; apply?: (s: GameState) => string[]; reset?: string };
const ev = (id: string, beats: Beat[], when: string, y: number, m: number, extra: Partial<Ev> = {}): Ev => ({ id, beats, when, at: () => at(y, m), due: (s) => ym(s) >= at(y, m), ...extra });

export const ACT3: Ev[] = [
  ev('nanao', D3.P3_NANAO, '天正五年九月（第七章 七尾落つ）', 1577, 9),
  ev('kitaru', D3.P3_KITARU, '天正五年九月（来たる者）', 1577, 9),
  ev('kachisuji', D3.P3_KACHISUJI, '天正五年九月（北の勝ち筋）', 1577, 9),
  ev('hanareru', D3.P3_HANARERU, '天正五年九月（離れる者）', 1577, 9),
  ev('tedori', D3.P3_TEDORI, '天正五年十月（手取川）', 1577, 10),
  ev('wareru', D3.P3_WARERU, '天正五年十一月（割れる声）', 1577, 11),
  ev('oyaji', D3.P3_OYAJI, '天正五年十二月（親父殿の下）', 1577, 12),
  ev('aragau', D3.P3_ARAGAU, '天正六年四月（抗う）', 1578, 4),
  ev('noto', D3.P3_NOTO, '天正九年九月（第八章 能登を継ぐ）', 1581, 9, { apply: setupNanao }),
  ev('kaeru', D3.P3_KAERU, '天正九年十一月（帰る者）', 1581, 11),
  ev('nanaonoshu', D3.P3_NANAONOSHU, '天正十年三月（七尾の主）', 1582, 3),
  ev('uozu', D3.P3_UOZU, '天正十年五月（魚津）', 1582, 5),
  ev('tenjo3', D3.P3_TENJO, '天正十年六月（天井落つ・本能寺）', 1582, 6, { reset: '1582' }),
  ev('kuhaku', D3.P3_KUHAKU, '天正十年八月（空白の中で）', 1582, 8),
  ev('erabu', D3.P3_ERABU, '天正十年十二月（選ぶ前）', 1582, 12),
  ev('shizu', D3.P3_SHIZU, '天正十一年四月（賤ヶ岳）', 1583, 4, { apply: (s) => (s.hero!.storyDone ?? []).includes('tomo') ? ['賤ヶ岳で勝家とともに立った。物語はここで閉じる。'] : ['賤ヶ岳の陣を退き、前田家ごと羽柴に従った。第三部、了。'] }),
];
export const PART3_FROM = 'ryo'; // 第二部の締めのあとに始まる

// 能登を継ぐ: 七尾城を自家のものにし、利家をその主（国主）にする。府中は他の者へ
function setupNanao(s: GameState): string[] {
  const H = s.hero!, me = s.generals[H.id];
  const c = s.castles.find((x) => x.id === 'nanao')!;
  if (c.owner !== me.clan) { captureCastle(s, c, me.clan!); s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i); }
  c.ember = Math.max(c.ember ?? 0, 45); c.chian = Math.min(c.chian, 45); c.oldOwner = 'hatakeyama_n'; c.prevTurn = undefined;
  const sv = (H.sv ??= {}); sv.fchian = c.chian; sv.fember = c.ember; sv.fturn = s.turn;
  if (H.army !== null && H.army !== undefined) H.army = null;
  me.army = null; me.boss = undefined; me.status = 'hero';
  H.fuchu = c.i; H.town = c.i; H.hex = c.hex; H.field = false; H.dest = null; me.loc = c.i; H.quest = null;
  H.title = '能登国主（七尾城）'; H.ie ??= newIe(); H.ie.kachu = Math.min(100, H.ie.kachu + 5);
  if (me.rank > 0) { me.rank = 0; }
  addMerit(s, me.id, 30); H.gold += 500;
  return [`能登一国を与えられ、七尾城の主となった（宿老・功績+30・金500貫）。${c.name}: 治安${Math.round(c.chian)}・残り火${Math.round(c.ember ?? 0)}。`];
}

// 賤ヶ岳: 陣を退く → 羽柴に従う家へ（第三部の締め）
STORY_ENDS.shizu_hiku = (s) => {
  const H = s.hero!, me = s.generals[H.id], sv = (H.sv ??= {});
  const old = me.clan;
  sv.shizu = 1;
  if (s.clans.hashiba?.alive && old !== 'hashiba') {
    me.clan = 'hashiba'; s.player = 'hashiba';
    const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true;
    const c = H.fuchu !== undefined ? s.castles[H.fuchu] : null;
    if (c && c.owner !== 'hashiba') { const ch = c.chian, em = c.ember, dv = c.dev, gr = c.garrison; captureCastle(s, c, 'hashiba'); s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i); c.prevTurn = undefined; c.chian = ch; c.ember = em; c.dev = dv; c.garrison = gr; } // 家ごと従う（落とされたのではない）
    for (const id of ['maeda_toshinaga', 'maeda_toshimasu']) { const g = s.generals[id]; if (g && g.clan === old && g.status !== 'dead' && g.status !== 'captive') g.clan = 'hashiba'; }
    addLog(s, `前田利家が賤ヶ岳の陣を退き、${clanName(s, 'hashiba')}家に従った。`, 'info', true);
  }
  (H.storyDone ??= []).push('ryo3');
  H.title = '能登国主（七尾城）・羽柴に従う'; H.favor = 60;
  return [...D3.P3_RYO, { bg: 'nanao', text: '（前田家は羽柴に従った。主君は羽柴秀吉。縁と覚えは引き継ぎ、主君の覚えは60から）' }];
};
// 賤ヶ岳: 勝家とともに → もう一つの終わり
STORY_ENDS.shizu_tomo = (s) => {
  const H = s.hero!;
  (H.storyDone ??= []).push('ryo3', 'tomo');
  H.over = '前田利家は賤ヶ岳で柴田勝家とともに散った。（もう一つの残り火）';
  return D3.P3_TOMO;
};
// 手取川の締め（負け戦。持たせたかどうか）
STORY_ENDS.tedorigawa = (s) => {
  const H = s.hero!, me = s.generals[H.id], ie = H.ie!, sv = (H.sv ??= {});
  const pt = (sv.tedorigawa ?? 0) + (ie.kachu >= 60 ? 1 : 0) + (me.lea >= 75 ? 1 : 0);
  const good = pt >= 4;
  sv.tedorigawa_ok = good ? 1 : 0;
  if (good) { ie.kachu = Math.min(100, ie.kachu + 4); addMerit(s, me.id, 15); H.rel.sassa_narimasa = Math.min(100, (H.rel.sassa_narimasa ?? 0) + 4); }
  else { ie.shu = Math.max(80, ie.shu - 80); ie.kachu = Math.max(0, ie.kachu - 4); }
  const tail: Beat[] = good
    ? [{ bg: 'tedorigawa', text: '夕刻、ようやく息をついた時には、身体の中まで冷えていた。利家はそこで、ようやく負けたのだと知った。だが前田の列は、最後まで崩れなかった。' }, { who: 'murai', bg: 'tedorigawa', text: '利家様。……持ちましたな' }, { who: 'maeda_toshiie', bg: 'tedorigawa', text: '持っただけだ' }, { bg: 'tedorigawa', text: '（前田の列は崩れずに退いた。家中+4・功績+15・成政との縁+4）' }]
    : [{ bg: 'tedorigawa', text: '前田の列は、途中で切れた。川に呑まれた者もいた。北の空は、負けたあとでも少しも広がらない。' }, { who: 'okumura', bg: 'tedorigawa', text: '……戻れぬ者が、おります' }, { bg: 'tedorigawa', text: '（荒子衆−80・家中−4）' }];
  return tail;
};

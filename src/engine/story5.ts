// 前田利家 ― 残り火 第五部「残り火」: 第十・十一章の場面の時期、天下の静けさ（世の中の動きを止める）、最期と終章の描き分け
import * as D5 from '../data/story_toshiie5';
import type { Beat } from '../data/story_toshiie';
import type { GameState } from './types';

const ym = (s: GameState) => s.year * 12 + s.month;
const at = (y: number, m: number) => y * 12 + m;
type Ev = { id: string; beats: Beat[] | ((s: GameState) => Beat[]); due: (s: GameState) => boolean; when: string; at?: (s: GameState) => number; apply?: (s: GameState) => string[]; reset?: string };
const ev = (id: string, beats: Beat[] | ((s: GameState) => Beat[]), when: string, y: number, m: number, extra: Partial<Ev> = {}): Ev => ({ id, beats, when, at: () => at(y, m), due: (s) => ym(s) >= at(y, m), ...extra });

export const ACT5: Ev[] = [
  ev('michiru', D5.P5_MICHIRU, '天正十四年四月（第十章 満ちる）', 1586, 4, { apply: (s) => { const c = s.clans[s.generals[s.hero!.id].clan ?? '']; if (c?.id === 'hashiba') c.name = '豊臣'; const h = s.generals.kinoshita_tokichiro; if (h && h.status !== 'dead') h.name = '豊臣秀吉'; return ['天下は定まった。羽柴は豊臣の姓を賜った。（ここからは世の中の大名たちは動かない。暦と、前田の家と領国のことだけが進む）']; } }),
  ev('toshimasu', D5.P5_TOSHIMASU, '天正十四年八月（利益）', 1586, 8),
  ev('kaze', D5.P5_KAZE, '天正十五年一月（風の置き場）', 1587, 1),
  ev('taiko', D5.P5_TAIKO, '天正十五年二月（太閤の世）', 1587, 2),
  ev('kyushu', D5.P5_KYUSHU, '天正十五年四月（九州へ）', 1587, 4),
  ev('zureru', D5.P5_ZURERU, '天正十七年六月（整う・ずれる）', 1589, 6),
  ev('hone5', D5.P5_HONE, '天正十八年二月（骨が減る）', 1590, 2),
  ev('kazeyamu', D5.P5_KAZEYAMU, '天正十八年六月（風が止む）', 1590, 6),
  ev('koboreru', D5.P5_KOBORERU, '天正十八年十二月（こぼれる）', 1590, 12),
  ev('nokoribi5', D5.P5_NOKORIBI, '天正十九年四月（第十一章 残り火）', 1591, 4),
  ev('takusareru', D5.P5_TAKUSARERU, '天正十九年九月（託される）', 1591, 9),
  ev('umi', D5.P5_UMI, '文禄元年四月（海の向こう）', 1592, 4),
  ev('usui', D5.P5_USUI, '慶長元年五月（薄い家・秀頼）', 1596, 5),
  ev('ieyasu', D5.P5_IEYASU, '慶長二年十月（家康）', 1597, 10),
  ev('sakeme', D5.P5_SAKEME, '慶長四年一月（裂け目）', 1599, 1),
  ev('atsuku', D5.P5_ATSUKU, '慶長四年二月（厚くする）', 1599, 2),
  ev('yuigon', D5.P5_YUIGON, '慶長四年閏三月（遺言）', 1599, 3),
  ev('saigo', (s) => [...D5.P5_SAIGO, ...D5.P5_SHUSHO_HEAD, ...ending(s), ...D5.P5_SHUSHO_TAIL], '慶長四年閏三月（最期）', 1599, 4, { apply: finish }),
];

// 第五部は天下が定まった世: 世の中（大名たち）の動きを止め、暦と家・領国のことだけが進む
export const frozen = (s: GameState) => { const d = s.hero?.storyDone ?? []; return s.hero?.story === 'toshiie' && d.includes('ryo4') && !s.hero.over; };
export function calendarStep(s: GameState) {
  s.month++; if (s.month > 12) { s.month = 1; s.year++; }
  s.turn++;
}

// 残したもの（通しの数値）
export function legacy(s: GameState) {
  const H = s.hero!, sv = H.sv ?? {}, ie = H.ie;
  const dom = [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])].map((i) => s.castles[i]);
  const chian = dom.length ? Math.round(dom.reduce((t, c) => t + c.chian, 0) / dom.length) : 50;
  const ember = dom.length ? Math.round(dom.reduce((t, c) => t + (c.ember ?? 0), 0) / dom.length) : 0;
  const roads = [['mochi', sv.road_mochi ?? 0], ['hard', sv.road_hard ?? 0], ['son', sv.road_son ?? 0]] as [string, number][];
  const road = roads.sort((a, b) => b[1] - a[1])[0][0];
  return { kachu: ie?.kachu ?? 50, chian, ember, kaze: sv.kaze ?? 0, road, suemori: sv.suemori_ok ?? 0, hide: H.rel.kinoshita_tokichiro ?? 0, nari: H.rel.sassa_narimasa ?? 0 };
}
// 終章の描き分け: 家中・領国・風・府中の道・末森・縁で、金沢に残ったものが変わる
export function ending(s: GameState): Beat[] {
  const L = legacy(s), bg = 'yukiakari';
  const out: Beat[] = [];
  out.push({ bg, text: L.chian >= 60 && L.ember <= 20
    ? '金沢にも、残るものがあった。城下が育つ。町が育つ。人が集まり、暮らしが形を持つ。武の家が集めた米、道、人、職の手触りが、戦の道具であることを少しずつやめ、町の色へ変わっていく。'
    : '金沢にも、残るものはあった。だが加賀の土の下には、まだ残り火が燻っていた。町は育ちながら、ときどき黙った。利家の次の代は、その黙りを一つずつほどくことから始めねばならなかった。' });
  out.push({ bg, text: L.kachu >= 70
    ? '古い者を捨てず、新しい者を浮かせすぎず、切れ目を塞ぎ続けたこと。その積み重ねが、戦のない世では別の形で残ったのだろう。前田の家中は、利家のいない冬を、一つの家のまま越えた。'
    : '前田の家は残った。だが家中には、古い者と新しい者のあいだに細いひびが残った。利長は、父の言葉を何度も思い出すことになる。痩せた家は、いざという時に持たねえ。' });
  out.push({ bg, text: L.kaze >= 4
    ? '利益の風は、家の外へ出たあとも、どこかで吹き続けた。前田の若い者たちは、ときどき、きれいすぎない槍を振った。それを見て眉をひそめる古参の顔に、少しだけ笑いが混じった。'
    : L.kaze >= 1
      ? '風の止んだ家は、静かだった。それでも、まつは時々、庭の砂の上に残った足跡を見て、若い頃の利家のことを思い出した。'
      : '家はきれいに整った。風のない家の中で、誰も槍を高く振らなくなった。それが正しいのかどうかを、もう問う者はいなかった。' });
  out.push({ bg, text: L.road === 'hard'
    ? '越前の府中で焼いた村のことを、利家は最後まで口にしなかった。だが北の土は、それを覚えていた。'
    : L.road === 'son'
      ? '越前の府中で損得の線を引いたことを、利家はときどき思い出した。不破光治の平らな顔とともに。'
      : '越前の府中で、焼かずに春へ残した村があった。その村の田は、利家が死んだ年にも、黙って青かった。' });
  if (L.suemori) out.push({ bg, text: '末森の城は、もう誰も守る必要のない小さな城になった。奥村永福は、ときどきそこを訪ねて、何も言わずに帰った。' });
  if (L.nari >= 40) out.push({ bg, text: '佐々成政は、利家より先に死んだ。黒い男だった。最後まで、犬千代と呼んだ。' });
  return out;
}
function finish(s: GameState): string[] {
  const H = s.hero!, L = legacy(s);
  (H.storyDone ??= []).push('ryo5');
  H.over = `前田利家、世を去る（慶長四年）。残したもの: 家中${L.kachu}・領国の治安${L.chian}・残り火${L.ember}・風${L.kaze}。`;
  return ['前田利家は世を去った。物語「残り火」はここで終わる。'];
}

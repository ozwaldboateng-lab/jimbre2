// 前田利家 ― 残り火 第四部「根を張る」: 第九章の場面の時期、加賀への組み替え（柴田の滅び・金沢）、成政の謀反（佐々家）、末森の後詰め、富山の役（越中）、守山城
import * as D4 from '../data/story_toshiie4';
import type { Beat } from '../data/story_toshiie';
import { STORY_ENDS, newIe, storyNotes } from './maeda';
import { captureCastle, eliminateClan } from './ops';
import { splitClan } from './on';
import { addMerit } from './ranks';
import { addLog, clanCastles } from './state';
import type { Castle, GameState } from './types';

const ym = (s: GameState) => s.year * 12 + s.month;
const at = (y: number, m: number) => y * 12 + m;
type Ev = { id: string; beats: Beat[] | ((s: GameState) => Beat[]); due: (s: GameState) => boolean; when: string; at?: (s: GameState) => number; apply?: (s: GameState) => string[]; reset?: string };
const ev = (id: string, beats: Beat[] | ((s: GameState) => Beat[]), when: string, y: number, m: number, extra: Partial<Ev> = {}): Ev => ({ id, beats, when, at: () => at(y, m), due: (s) => ym(s) >= at(y, m), ...extra });

export const ACT4: Ev[] = [
  ev('ato', D4.P4_ATO, '天正十一年五月（第九章 賤ヶ岳のあと）', 1583, 5),
  ev('kaga', D4.P4_KAGA, '天正十一年六月（加賀へ）', 1583, 6, { apply: setupKaga }),
  ev('hone', D4.P4_HONE, '天正十一年十一月（百万石の骨）', 1583, 11),
  ev('narimasa', D4.P4_NARIMASA, '天正十二年八月（成政来る）', 1584, 8, { apply: sassaRebels }),
  ev('suemori', D4.P4_SUEMORI, '天正十二年九月（末森籠城）', 1584, 9),
  ev('gouu', D4.P4_GOUU, '天正十二年九月（豪雨）', 1584, 9),
  ev('sarasara', D4.P4_SARASARA, '天正十二年十二月（さらさら越え）', 1584, 12),
  ev('toyama', D4.P4_TOYAMA, '天正十三年八月（富山の役）', 1585, 8, { apply: toyamaWar }),
  ev('moriyama', D4.P4_MORIYAMA, '天正十三年十月（守山城）', 1585, 10),
  ev('ne', (s) => [...D4.P4_NE, ...D4.P4_RYO], '天正十四年一月（根を張る）', 1586, 1, { apply: (s) => { (s.hero!.storyDone ??= []).push('ryo4'); addMerit(s, s.hero!.id, 40); return ['北陸に根を張った。第四部、了。']; } }),
];

const byId = (s: GameState, id: string) => s.castles.find((c) => c.id === id)!;
// 家ごと移す（落とされたのではないので、治安・残り火・開発・城兵はそのまま）
function hand(s: GameState, c: Castle, clan: string) {
  if (c.owner === clan) return;
  const ch = c.chian, em = c.ember, dv = c.dev, gr = c.garrison;
  captureCastle(s, c, clan);
  s.shioki = (s.shioki ?? []).filter((x) => x.castle !== c.i);
  c.prevTurn = undefined; c.chian = ch; c.ember = em; c.dev = dv; c.garrison = gr;
}
// 治める城（主の城と、ほかの領国の城）
export const domainOf = (s: GameState): number[] => { const H = s.hero!; return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])]; };

// 加賀へ: 柴田家は滅び（北ノ庄落城）、越前・加賀・越中は羽柴へ。利家は金沢を主の城に、七尾も治める
function setupKaga(s: GameState): string[] {
  const H = s.hero!, me = s.generals[H.id], clan = me.clan!;
  const sh = s.clans.shibata;
  if (sh?.alive) {
    for (const c of clanCastles(s, 'shibata')) hand(s, c, clan);
    for (const g of Object.values(s.generals)) if (g.clan === 'shibata' && g.status !== 'dead') { if (g.id === 'shibata_katsuie') { g.status = 'dead'; g.clan = null; } else if (g.id === 'sassa_narimasa' || g.id.startsWith('maeda_')) g.clan = clan; }
    if (sh.alive && !clanCastles(s, 'shibata').length) eliminateClan(s, 'shibata', clan);
  }
  const k = byId(s, 'kanazawa'), n = byId(s, 'nanao');
  hand(s, k, clan); hand(s, n, clan);
  k.name = '金沢城'; k.ember = Math.max(k.ember ?? 0, 50); k.chian = Math.min(k.chian, 40); k.oldOwner = 'honganji';
  H.ryo = [n.i]; H.fuchu = k.i;
  const sv = (H.sv ??= {}); sv.fchian = k.chian; sv.fember = k.ember; sv.fturn = s.turn;
  H.town = k.i; H.hex = k.hex; H.field = false; H.dest = null; me.loc = k.i; H.quest = null;
  for (const id of ['maeda_toshinaga', 'maeda_toshimasu']) { const g = s.generals[id]; if (g && g.clan === clan && g.status === 'free') g.loc = k.i; }
  const na = s.generals.sassa_narimasa, t = byId(s, 'toyama_c');
  if (na && na.status !== 'dead' && t.owner === clan) { na.clan = clan; if (na.status === 'free' || na.status === 'governor') na.loc = t.i; }
  H.title = '加賀・能登の大名（金沢城）'; H.ie ??= newIe(); H.gold += 1000; addMerit(s, me.id, 30);
  return [`加賀二郡を与えられ、金沢城に入った（加賀・能登の大名。金1000貫・功績+30）。治める城は金沢と七尾。`];
}
// 成政来る: 佐々成政が富山城ごと羽柴から離れ、家康につく（佐々家）
function sassaRebels(s: GameState): string[] {
  const H = s.hero!, me = s.generals[H.id], clan = me.clan!;
  const na = s.generals.sassa_narimasa, t = byId(s, 'toyama_c');
  if (!na || na.status === 'dead') return [];
  if (t.owner !== clan) hand(s, t, clan);
  na.clan = clan; na.status = 'free'; na.army = null; na.loc = t.i;
  const id = splitClan(s, na, clan, [t.i], [], '謀反');
  if (!id) return [];
  s.clans[id].name = '佐々'; s.clans[id].color = '#2b2b2b';
  (H.sv ??= {}).sassa = 1; (H as unknown as Record<string, unknown>).sassaClan = id;
  t.garrison = Math.max(t.garrison, 3000);
  return ['佐々成政が羽柴に背き、越中の富山城で佐々家を立てた。'];
}
// 末森の後詰めの締め
STORY_ENDS.suemori = (s) => {
  const H = s.hero!, me = s.generals[H.id], ie = H.ie!, sv = (H.sv ??= {});
  const pt = (sv.suemori ?? 0) + (ie.kachu >= 60 ? 1 : 0) + (me.lea >= 75 ? 1 : 0);
  const good = pt >= 5;
  sv.suemori_ok = good ? 1 : 0;
  const dom = domainOf(s).map((i) => s.castles[i]);
  if (good) { addMerit(s, me.id, 40); H.favor = Math.min(100, H.favor + 10); ie.kachu = Math.min(100, ie.kachu + 8); for (const c of dom) c.chian = Math.min(100, c.chian + 6); }
  else { H.favor = Math.max(0, H.favor - 10); ie.kachu = Math.max(0, ie.kachu - 8); for (const c of dom) { c.chian = Math.max(0, c.chian - 15); c.ember = Math.min(100, (c.ember ?? 0) + 20); } }
  storyNotes.push(good ? '末森を守った。功績+40・主君の覚え+10・家中+8・領国の治安+6' : '末森は落ちた。主君の覚え−10・家中−8・領国の治安−15・残り火+20。前田の国は富山の役まで裂けたまま');
  return good ? D4.SUEMORI_END.good : D4.SUEMORI_END.bad;
};
// 富山の役: 秀吉の大軍が越中を閉じる。佐々家は降り、富山城は前田の治める城に（守山城の代わり）
function toyamaWar(s: GameState): string[] {
  const H = s.hero!, me = s.generals[H.id], clan = me.clan!;
  const id = (H as unknown as Record<string, string>).sassaClan, t = byId(s, 'toyama_c');
  if (id && s.clans[id]?.alive) { for (const c of clanCastles(s, id)) hand(s, c, clan); for (const g of Object.values(s.generals)) if (g.clan === id && g.status !== 'dead') g.clan = clan; if (s.clans[id].alive) eliminateClan(s, id, clan); }
  else if (t.owner !== clan) hand(s, t, clan);
  const na = s.generals.sassa_narimasa; if (na && na.status !== 'dead') { na.clan = clan; if (na.status !== 'captive') { na.status = 'free'; na.loc = clanCastles(s, clan)[0]?.i ?? na.loc; } }
  t.ember = Math.max(t.ember ?? 0, 40); t.chian = Math.min(t.chian, 45);
  if (!(H.ryo ?? []).includes(t.i)) (H.ryo ??= []).push(t.i);
  addMerit(s, me.id, 30); H.title = '加賀・能登・越中の大名（金沢城）';
  addLog(s, '富山の役。佐々成政が降り、越中は前田の手に入った。', 'info', true);
  return ['佐々成政が降った。越中の富山城（守山）も治める城に加わった（功績+30）。'];
}

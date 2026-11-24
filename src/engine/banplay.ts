// 槍働きの盤を、遊びの状態から組み立てる（主人公の駒・配下の駒・敵の駒）
import { BKind, kindOf, newBan, type Ban, type BanSetup, type Who } from './ban';
import { retainersOf } from './kashin';
import { hpMax, hpOf, lv } from './skill';
import { rand } from './state';
import type { GameState, General } from './types';

export const BANP = { MIN: 3, MAX: 6, MOB_ORDER: ['ashi', 'yumi', 'teppo'] as BKind[] };
const whoOf = (g: General, extra: Partial<Who> = {}): Who => ({ name: g.name, bra: g.bra, int: g.int, lea: g.lea, gid: g.id, ...extra });
// 盤に出られる配下（病・捕らわれ・城主や奉行の役目・ほかの陣にいる者は出ない）
export const banRetainers = (s: GameState) => retainersOf(s).filter((g) => !g.sick && ['free', 'kashin'].includes(g.status));
// 駒の数: 主人公のほかに3駒から。配下が2人を超えると、その分だけ増える（6駒まで）。配下で埋まらない分はモブ（足軽・弓・鉄砲の順）
export function myPieces(s: GameState): BanSetup['me'] {
  const H = s.hero!, me = s.generals[H.id];
  const out: BanSetup['me'] = [{ kind: 'kiba', who: whoOf(me, { hero: true, yari: lv(s, 'yari'), hpRate: hpOf(s) / hpMax(s) }) }];
  const rs = banRetainers(s), n = Math.min(BANP.MAX, Math.max(BANP.MIN, rs.length + 2));
  for (const g of rs.slice(0, n)) out.push({ kind: kindOf(g), who: whoOf(g) });
  for (let i = 0; out.length < n + 1; i++) out.push({ kind: BANP.MOB_ORDER[i % 3], who: null });
  return out;
}
// 道場での稽古（盤を試す。手柄も傷も残らない）
// 中盤には名のある将（師範代）が新手として現れ、終盤は追い討ちか殿のどちらか
export function keikoBan(s: GameState): Ban {
  const mob = (k: BKind) => ({ kind: k, who: null });
  const sho: Who = { name: '師範代', bra: 72, int: 64, lea: 66, sho: true };
  return newBan({
    me: myPieces(s), foe: (['ashi', 'ashi', 'yumi', 'teppo'] as BKind[]).map(mob), seed: Math.floor(rand(s) * 1e9),
    mid: [{ kind: 'kiba', who: sho }, mob('ashi')], end: rand(s) < 0.5 ? 'oiuchi' : 'shingari', late: [mob('kiba'), mob('ashi'), mob('ashi')],
  });
}

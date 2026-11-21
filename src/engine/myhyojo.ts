// 武将で遊ぶ（物語の外）: 自分の評定。城持ちになったら、治める城の城下で月に一度評定を開き、家臣に役目を申し付ける（太閤立志伝の「城主の評定」を参考に）。
// 役目は月の終わりに果たされ、首尾が月の報告に出る。費えは主人公の金から。城代・遣わし中・陣中の家臣には申し付けられない
import type { Act } from './hero';
import { withHeroGold } from './heroCastle';
import { investBlock, investCost, invest } from './invest';
import { hexDist } from './map';
import * as R from './rules';
import { clamp100, rand } from './kashin_util';
import { garrisonMax, learnCastle } from './state';
import type { GameState, General } from './types';

export type Yaku = 'kaihatsu' | 'shogyo' | 'fushin' | 'chohei' | 'choryaku' | 'tanren';
export const YAKU: Yaku[] = ['kaihatsu', 'shogyo', 'fushin', 'chohei', 'choryaku', 'tanren'];
export const YAKU_NAME: Record<Yaku, string> = { kaihatsu: '開発', shogyo: '商業', fushin: '普請', chohei: '徴兵', choryaku: '調略', tanren: '鍛錬' };
export const YAKU_DESC: Record<Yaku, string> = {
  kaihatsu: '城の開発に投じる（大名の城の政と同じ費え。統率で成否）',
  shogyo: '城の商業に投じる（大名の城の政と同じ費え。知略で成否）',
  fushin: '石垣と堀を手直しし、治安と城兵を上げる（100貫。統率で効く）',
  chohei: '城兵を集める（150貫。魅力で集まる数）',
  choryaku: '近くの敵の城を探り、内応を仕掛ける（200貫。知略で成否）',
  tanren: '家臣が自らを鍛える（武勇か統率が上がることがある・功績）',
};
export const YAKU_COST: Partial<Record<Yaku, number>> = { fushin: 100, chohei: 150, choryaku: 200 };
type Order = { role: Yaku; castle: number };
type MyX = { orders?: Record<string, Order>; myHyojo?: number };
const X = (s: GameState) => s.hero! as typeof s.hero & MyX;
const domainOf = (s: GameState): number[] => { const H = s.hero!; return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])]; };

export function canHold(s: GameState): string | null {
  const H = X(s), me = s.generals[H.id];
  if (H.story === 'toshiie' || !me.clan) return '物語の外の、主家に仕える主人公だけ';
  if (!domainOf(s).length) return '城を持ってから';
  if (H.field || H.army || !domainOf(s).includes(H.town) || s.castles[H.town].owner !== me.clan) return '治める城の城下で開く';
  return null;
}
// 役目を申し付けられる家臣: 城代・遣わし中・陣中・病の者を除く
export function orderable(s: GameState): General[] {
  const H = s.hero!, dk = new Set(Object.values(H.daikan ?? {}));
  return (H.retainers ?? []).map((id) => s.generals[id]).filter((g) => g && g.status === 'kashin' && !dk.has(g.id) && H.quest?.proxy !== g.id && !g.sick);
}
export const ordersOf = (s: GameState) => X(s).orders ?? {};
// 評定を開く（月に一度・1旬）: 開いた月は家臣の役目を決め直せる
export function hold(s: GameState): Act {
  const why = canHold(s);
  if (why) return { ok: false, text: why };
  const H = X(s);
  if (H.myHyojo === s.turn) return { ok: false, text: '今月の評定は開いた（役目は申し付けたまま変えられる）' };
  if (!orderable(s).length) return { ok: false, text: '役目を申し付けられる家臣がいない（城代・遣わし中の者は除く）' };
  H.myHyojo = s.turn; H.jun++;
  return { ok: true, text: `${s.castles[H.town].name}で評定を開いた。家臣に役目を申し付ける（月の終わりに首尾が出る）。` };
}
export const holdingNow = (s: GameState) => X(s).myHyojo === s.turn;
// 役目を順に替える（なし→開発→商業→…→なし）
export function cycle(s: GameState, gid: string): string {
  const H = X(s), cur = H.orders?.[gid]?.role, i = cur ? YAKU.indexOf(cur) : -1, nx = YAKU[i + 1];
  if (!holdingNow(s)) return '評定を開いてから役目を申し付ける';
  const g = s.generals[gid];
  if (!nx) { delete H.orders?.[gid]; return `${g.name}の役目を解いた。`; }
  (H.orders ??= {})[gid] = { role: nx, castle: H.town };
  return `${g.name}に${YAKU_NAME[nx]}を申し付けた（${s.castles[H.town].name}）。`;
}
const target = (s: GameState, from: number) => {
  const me = s.generals[s.hero!.id], c0 = s.castles[from];
  return s.castles.filter((c) => c.owner && c.owner !== me.clan && hexDist(c.hex, c0.hex) <= R.hx(6) && !s.treaties.some((t) => (t.a === me.clan && t.b === c.owner) || (t.b === me.clan && t.a === c.owner))).sort((a, b) => hexDist(a.hex, c0.hex) - hexDist(b.hex, c0.hex))[0] ?? null;
};
// 月の終わり: 役目を果たす。首尾を返し、役目は解く
export function myHyojoMonth(s: GameState): string[] {
  const H = X(s), me = s.generals[H.id], out: string[] = [];
  const os = Object.entries(H.orders ?? {});
  H.orders = {};
  if (!os.length || !me.clan) return out;
  for (const [gid, o] of os) {
    const g = s.generals[gid], c = s.castles[o.castle];
    if (!g || g.status !== 'kashin' || c.owner !== me.clan) continue;
    const who = g.name;
    if (o.role === 'kaihatsu' || o.role === 'shogyo') {
      const role = o.role === 'kaihatsu' ? 'agri' : 'com', st = o.role === 'kaihatsu' ? g.lea : g.int;
      const blk = investBlock(s, me.clan, c, role);
      if (blk) { out.push(`${who}: ${c.name}の${YAKU_NAME[o.role]}はできなかった（${blk}）。`); continue; }
      if (rand(s) > 0.6 + st / 250) { const half = Math.round(investCost(c, role) / 2); H.gold = Math.max(0, H.gold - half); out.push(`${who}: ${c.name}の${YAKU_NAME[o.role]}はしくじり、${half}貫が無駄になった。`); continue; }
      const ok = withHeroGold(s, investCost(c, role), () => invest(s, me.clan!, c, role));
      out.push(ok ? `${who}: ${c.name}の${YAKU_NAME[o.role]}に投じた（${investCost(c, role)}貫）。` : `${who}: 金が足りず、${c.name}の${YAKU_NAME[o.role]}はできなかった。`);
    } else if (o.role === 'fushin' || o.role === 'chohei' || o.role === 'choryaku') {
      const cost = YAKU_COST[o.role]!;
      if (H.gold < cost) { out.push(`${who}: 金が足りず、${YAKU_NAME[o.role]}はできなかった。`); continue; }
      H.gold -= cost;
      if (o.role === 'fushin') { const d = Math.round(2 + g.lea / 40); c.chian = clamp100(c.chian + d); c.garrison = Math.min(garrisonMax(c), c.garrison + Math.round(garrisonMax(c) * 0.03)); out.push(`${who}: ${c.name}の普請を差配した（治安+${d}）。`); }
      else if (o.role === 'chohei') { const n = Math.min(Math.max(0, garrisonMax(c) - c.garrison), 100 + g.cha * 5); c.garrison += n; out.push(`${who}: ${c.name}で兵を${n}集めた。`); }
      else {
        const t = target(s, o.castle);
        if (!t) { H.gold += cost; out.push(`${who}: 調略を仕掛ける敵の城が近くにない。`); continue; }
        learnCastle(s, t.i, me.clan);
        if (rand(s) < 0.15 + g.int / 300) { t.naio = s.turn + 1; t.naioBy = me.clan; out.push(`${who}: ${t.name}に内応の約束を取りつけた（来月まで、攻めれば門が開く）。`); }
        else out.push(`${who}: ${t.name}を探ったが、内応の約束は取れなかった（城の様子は分かった）。`);
      }
    } else {
      g.merit += 5;
      if (rand(s) < 0.5) { const k = rand(s) < 0.5 ? 'bra' : 'lea'; if (g[k] < 95) g[k]++; out.push(`${who}: 鍛錬に励み、${k === 'bra' ? '武勇' : '統率'}が上がった。`); }
      else out.push(`${who}: 鍛錬に励んだ。`);
    }
  }
  return out.length ? ['自分の評定の首尾:', ...out] : out;
}

// 槍働きの盤を、遊びの状態から組み立てる（主人公の駒・配下の駒・敵の駒）
import { autoAll, BAN, BKind, hero as heroPiece, kindOf, MOCHI_NAME, newBan, type Ban, type BanSetup, type Mochi, type Who } from './ban';
import { banPendOf, clearBanPend, deedsOf, YARI } from './yari';
import { retainersOf } from './kashin';
import { hpMax, hpOf, lv, spendHp } from './skill';
import { addLog, rand } from './state';
import { rivalOf, yoriBan } from './yorioya';
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

// ───────── 合戦の槍働き ─────────
// 盤を組む: 敵の先手（足軽2・弓・鉄砲）、中盤に敵将（その合戦の敵の大将。いなければ侍大将）と足軽、終盤は勝ち戦なら追い討ち・負け戦なら殿
export const BANW = { GROW_AT: 8, GROW_MAX: 95, SEEN: 1.5, MERIT: 2, FAME_PER: 4, HP_K: 40, LOSE_HP: 10, LOSE_SICK: 0.4, MOB_PER_KUBI: 5, SHO_SICK: 2 }; // 手柄1で功績2。首級は名のある将と、雑兵5人ごとに一つ
// 同輩（張り合う相手）は、味方の駒として盤に出る（自分では動かせない）
function rivalPiece(s: GameState): BanSetup['me'] { const r = rivalOf(s); return r && !r.sick ? [{ kind: kindOf(r), who: whoOf(r, { rival: true }) }] : []; }
// 同僚: 同じ家中の足軽組頭・足軽大将を一人（同輩・寄親・家臣・身内でない者。主人公のいる城の者を先に）。同輩と合わせて二人まで。張り合いはしない
export const BANP_ALLY = { MAX: 2 };
function allyPieces(s: GameState, n: number): BanSetup['me'] {
  if (n <= 0) return [];
  const H = s.hero!, me = s.generals[H.id], r = rivalOf(s), Y = (H as typeof H & { yorioya?: string }).yorioya;
  if (!me.clan) return [];
  const sur = (x: string) => x.slice(0, 2);
  const cs = Object.values(s.generals).filter((g) => g.clan === me.clan && g.id !== me.id && g.id !== r?.id && g.id !== Y && g.rank >= 2 && !g.kin && !g.liege && !g.sick && ['free', 'army', 'camp'].includes(g.status) && !(H.retainers ?? []).includes(g.id) && sur(g.name) !== sur(me.name));
  cs.sort((a, b) => (a.loc === me.loc ? 0 : 1) - (b.loc === me.loc ? 0 : 1) || rand(s) - 0.5);
  return cs.slice(0, n).map((g) => ({ kind: kindOf(g), who: whoOf(g, { npc: true }) }));
}
export function battleBan(s: GameState): Ban | null {
  const P = banPendOf(s); if (!P) return null;
  const f = P.foe ? s.generals[P.foe] : null, ok = f && f.status !== 'dead' && f.status !== 'captive';
  const sho: Who = ok ? { name: f!.name, bra: f!.bra, int: f!.int, lea: f!.lea, gid: f!.id, sho: true } : { name: '敵の侍大将', bra: 66, int: 56, lea: 62, sho: true };
  const mob = (k: BKind) => ({ kind: k, who: null });
  const mochi = P.mochi as Mochi | undefined;
  const mine = myPieces(s).map((u, i) => (mochi === 'teppo' && i > 0 && !u.who ? { ...u, kind: 'teppo' as BKind } : u)); // 鉄砲備え: モブは鉄砲
  const rv = rivalPiece(s), friends: BanSetup['me'] = [...mine, ...rv, ...allyPieces(s, BANP_ALLY.MAX - rv.length)];
  return newBan({
    mochi, rescue: mochi === 'gozume' ? [mob('ashi'), mob('yumi')] : undefined,
    me: friends, foe: ([...(['ashi', 'ashi', 'yumi', 'teppo'] as BKind[]), ...friends.filter((u) => u.who?.npc || u.who?.rival).map(() => 'ashi' as BKind), ...(mochi === 'senjin' ? ['ashi' as BKind] : [])]).map(mob), seed: Math.floor(rand(s) * 1e9), // 同輩・同僚一人につき敵の足軽を一駒増やす
    mid: [{ kind: 'kiba', who: sho }, mob('ashi')], end: P.won ? 'oiuchi' : 'shingari', late: [mob('kiba'), mob('ashi'), mob('ashi')],
  });
}
// オートで済ませる
export function autoBan(s: GameState): Ban | null { const b = battleBan(s); if (b) autoAll(b); return b; }
// 盤の結果を、功績・名声・首級・体力・配下の手傷に
export function applyBan(s: GameState, b: Ban): string[] {
  const P = banPendOf(s); clearBanPend(s);
  const Hh = s.hero!, me = s.generals[Hh.id], d = deedsOf(s), out: string[] = [];
  const shoDown = b.pieces.filter((p) => p.sho && p.side === 'foe' && !p.alive && !p.gone);
  const mobKills = Math.max(0, b.kills - shoDown.length);
  const kubi = shoDown.length + Math.floor(mobKills / BANW.MOB_PER_KUBI);
  const duels = b.duelWon?.length ?? 0;
  d.kubi += kubi; d.duel += duels; Hh.kubi = (Hh.kubi ?? 0) + kubi;
  const merit = Math.round(b.tegara * BANW.MERIT * (P?.yori ? BANW.SEEN : 1)); me.merit += merit; // 寄親が同じ軍勢にいれば1.5倍
  const fame = Math.floor(b.tegara / BANW.FAME_PER) + duels * YARI.DUEL_FAME; Hh.fame = Math.min(100, (Hh.fame ?? 0) + fame);
  for (const p of shoDown) { const g = p.gid ? s.generals[p.gid] : null; if (g && g.status !== 'dead') { g.sick = Math.max(g.sick ?? 0, BANW.SHO_SICK); addLog(s, `${me.name}が${g.name}に深手を負わせた。`, 'battle', true); } }
  const how = { win: '目の前の敵を討ち払った', lose: '手傷を負って後ろへ運ばれた', retreat: '持ち場へ退いた', time: b.end === 'shingari' ? '殿を務めた' : '槍を収めた' }[b.over ?? 'time'];
  out.push(`槍働き（${P?.foeName ?? '敵'}との合戦）: ${how}。討ち取り${b.kills}${b.log.some((t) => t.startsWith('一番槍')) ? '・一番槍' : ''}${duels ? `・一騎討ちの勝ち${duels}` : ''}${b.duelLost ? `・一騎討ちの負け${b.duelLost}` : ''}。手柄${b.tegara}（功績+${merit}${fame ? `・名声+${fame}` : ''}${kubi ? `・首級${kubi}` : ''}）。`);
  for (const p of shoDown) if (p.gid) out.push(`${p.name}は深手を負って退いた。`);
  out.push(...yoriBan(s, b.tegara, b.rivalTegara, !!P?.yori));
  // 体力: 盤で受けた傷の分だけ減る。倒れれば、さらに減って病に伏すこともある
  const h = heroPiece(b);
  if (h) {
    const lost = Math.round((1 - Math.max(0, h.hp) / h.maxhp) * BANW.HP_K) + (h.alive ? 0 : BANW.LOSE_HP);
    if (lost > 0) spendHp(s, lost);
    if (!h.alive && rand(s) < BANW.LOSE_SICK) { me.sick = Math.max(me.sick ?? 0, 1); out.push(`手傷が重く、病に伏した（体力−${lost}）。`); }
    else if (lost > 0) out.push(`体力−${lost}。`);
  }
  // 配下の成長: 盤で戦った配下は経験を積み（加わって1・討ち取りごとに2・傷を10以上与えて1）、8（その能力が70を超えると、超えた分の半分を足す）たまるごとに、乗った駒の能力が1上がる（足軽は武勇、弓は知略、鉄砲は低いほう。95まで）
  const KX = Hh as typeof Hh & { kexp?: Record<string, number> };
  for (const p of b.pieces) if (p.side === 'me' && p.gid && !p.hero && !p.npc) {
    const g = s.generals[p.gid]; if (!g) continue;
    const ex = ((KX.kexp ??= {})[g.id] ?? 0) + 1 + (p.kills ?? 0) * 2 + ((p.dealt ?? 0) >= 10 ? 1 : 0);
    let left = ex;
    for (;;) {
      const k = p.kind === 'yumi' ? 'int' : p.kind === 'teppo' ? (g.bra <= g.int ? 'bra' : 'int') : 'bra';
      const need = BANW.GROW_AT + Math.max(0, Math.round((g[k] - 70) / 2)); // 70を超えると、伸びるのに要る経験が増える
      if (left < need || g[k] >= BANW.GROW_MAX) break;
      left -= need;
      const before = kindOf(g); g[k]++;
      out.push(`${g.name}が槍働きで腕を上げた（${k === 'bra' ? '武勇' : '知略'}${g[k]}）。${kindOf(g) !== before ? `型が変わり、次から${({ ashi: '足軽', yumi: '弓', teppo: '鉄砲', kiba: '騎馬' } as Record<string, string>)[kindOf(g)]}の駒に乗る。` : ''}`);
    }
    KX.kexp[g.id] = left;
  }
  // 倒れた配下は手傷で、しばらく出られない
  for (const p of b.pieces) if (p.side === 'me' && !p.alive && p.gid && !p.hero) { const g = s.generals[p.gid]; if (g) { g.sick = Math.max(g.sick ?? 0, 1); out.push(`${g.name}は手傷を負い、しばらく養生する。`); } }
  return out;
}
export { BAN };

// 持ち場を願い出る（一合戦に一度）: 寄親との親しさ30からは聞き入れられる。それより下は半々
export function askMochi(s: GameState, m: Mochi): { ok: boolean; text: string } {
  const P = banPendOf(s); if (!P || !P.mochi) return { ok: false, text: '持ち場はない' };
  if (P.asked) return { ok: false, text: 'もう願い出た' };
  if (P.mochi === m) return { ok: false, text: 'すでにその持ち場' };
  P.asked = true;
  const Y = (s.hero as typeof s.hero & { yorioya?: string })?.yorioya, v = Y ? s.hero!.rel[Y] ?? 0 : 0, y = Y ? s.generals[Y] : null;
  if (v >= 30 || rand(s) < 0.5) { P.mochi = m; return { ok: true, text: `${y ? `寄親の${y.name}は` : ''}願いを聞き入れた。持ち場は${MOCHI_NAME[m]}。` }; }
  return { ok: false, text: `${y ? `寄親の${y.name}は` : ''}願いを退けた。持ち場は${MOCHI_NAME[P.mochi]}のまま。` };
}

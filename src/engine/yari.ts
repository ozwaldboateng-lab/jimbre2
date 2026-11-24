// 武将で遊ぶ（物語の外）: 槍働きと論功行賞。
// 主人公の加わった軍勢（率いる軍勢も）が戦った月の終わりに、主人公自身の働き（首級）が決まり、名のある敵将が一騎討ちを挑んでくることがある。
// 働きは「手柄」として積もり、次に主君の城へ登城した時の論功行賞で、感状・金・名物・覚えになって返ってくる
import type { Act } from './hero';
import { MEIBUTSU } from './meibutsu';
import { lv, spendHp } from './skill';
import { addLog, rand } from './state';
import type { Army, BattleReport, GameState } from './types';
import type { Target } from './move';
import { ronkoStart } from './yorioya';

export const YARI = {
  KUBI_P: 0.3, KUBI_YARI: 0.05, KUBI_MERIT: 10, // 首級: 30%＋槍術一段5%＋武勇÷400（負け戦は半分）
  DUEL_P: 0.35, DUEL_MERIT: 25, DUEL_FAME: 3, DUEL_HP: 40, // 一騎討ち: 名のある敵将がいれば35%で挑まれる
  REWARD: { MEI: 8, KANJO: 4 }, // 論功行賞: 手柄8で名物の下賜、4で感状
};
type Battle = { turn: number; won: boolean; foe?: string; castle?: string; foeName: string; lead?: boolean; yori?: boolean }; // lead: 主人公が軍勢を率いていた。yori: 寄親が同じ側の軍勢にいた
type Deeds = { kubi: number; duel: number; castles: number; wins: number; battles: number };
export type BanPend = { turn: number; won: boolean; foe?: string; foeName: string; yori?: boolean; mochi?: 'senjin' | 'waki' | 'teppo' | 'gozume'; asked?: boolean }; // mochi: 持ち場（足軽大将から。寄親の言い渡し）・asked: 願い出たか
type YX = { battle?: Battle; duel?: { foe: string; turn: number }; deeds?: Deeds; banPend?: BanPend };
const X = (s: GameState) => s.hero! as typeof s.hero & YX;
export const deedsOf = (s: GameState): Deeds => (X(s).deeds ??= { kubi: 0, duel: 0, castles: 0, wins: 0, battles: 0 });
export const deedScore = (d: Deeds) => d.kubi + d.duel * 3 + d.castles * 4 + d.wins * 0.5;

// 合戦の決着を記録する（hooks.ts の resolveBattle から）: 主人公の軍勢が攻め手か守り手のとき
export function recordBattle(s: GameState, a: Army, t: Target, joined: Army[], r: BattleReport) {
  const H = s.hero;
  if (!H || H.story === 'toshiie') return;
  const id = H.army ?? H.leads;
  if (id === null || id === undefined) return;
  const atk = a.id === id || joined.some((j) => j.id === id), def = t.kind === 'army' && t.army.id === id;
  if (!atk && !def) return;
  const won = atk ? r.outcome === '攻撃側の勝利' : r.outcome === '守備側の勝利';
  const foe = atk ? (t.kind === 'army' ? t.army.main : s.castles[t.castle].governor ?? undefined) : a.main;
  const castle = atk && won && t.kind === 'castle' ? s.castles[t.castle].name : undefined;
  const Y = (H as typeof H & { yorioya?: string }).yorioya, side = atk ? [a, ...joined] : t.kind === 'army' ? [t.army] : [];
  const yori = !!Y && side.some((x) => x.main === Y || (x.staff ?? []).includes(Y));
  X(s).battle = { turn: s.turn, won, foe: foe ?? undefined, castle, foeName: atk ? r.defenderName : r.attackerName, lead: H.leads !== undefined && H.leads !== null, yori };
}

// 月の終わり: 槍働き。一騎討ちを挑まれたら H.duel に残す（受けるか退くかは画面で）
// 隊を率いずに加わった合戦は、首級をくじで決めず、槍働きの盤で戦う（H.banPend に残し、画面で「盤で戦う」か「任せる」）
export const banPendOf = (s: GameState) => { const p = X(s).banPend; return p && p.turn >= s.turn - 1 ? p : null; };
export function clearBanPend(s: GameState) { X(s).banPend = undefined; }
export function aftermath(s: GameState): { lines: string[]; duel: string | null; ban?: boolean } {
  const H = X(s), b = H.battle, me = s.generals[H.id];
  H.battle = undefined;
  if (!b || b.turn < s.turn - 1 || !me || me.status === 'dead' || me.status === 'captive') return { lines: [], duel: null };
  const d = deedsOf(s), out: string[] = [];
  d.battles++; if (b.won) d.wins++;
  if (b.castle) { d.castles++; out.push(`${b.castle}の攻めに加わり、城は落ちた。`); }
  if (b.lead) ronkoStart(s, b.won, b.foeName); // 率いた合戦のあとは、論功行賞で寄子・家臣に手柄を配る
  if (!b.lead) { const ms = ['senjin', 'waki', 'teppo', 'gozume'] as const; H.banPend = { turn: s.turn, won: b.won, foe: b.foe, foeName: b.foeName, yori: b.yori, mochi: me.rank <= 2 ? ms[Math.floor(rand(s) * 4)] : undefined }; out.push(`${b.foeName}との合戦に加わった（${b.won ? '勝ち戦' : '負け戦'}）。`); return { lines: out, duel: null, ban: true }; }
  const p = (YARI.KUBI_P + lv(s, 'yari') * YARI.KUBI_YARI + me.bra / 400) * (b.won ? 1 : 0.5);
  if (rand(s) < p) { d.kubi++; H.kubi = (H.kubi ?? 0) + 1; me.merit += YARI.KUBI_MERIT; out.push(`${b.foeName}との合戦で、${me.name}は自ら槍を振るい、首級を挙げた（功績+${YARI.KUBI_MERIT}）。`); }
  else out.push(`${b.foeName}との合戦に加わった（${b.won ? '勝ち戦' : '負け戦'}）。`);
  const foe = b.foe ? s.generals[b.foe] : undefined;
  if (foe && foe.status !== 'dead' && foe.status !== 'captive' && rand(s) < YARI.DUEL_P) { H.duel = { foe: foe.id, turn: s.turn }; return { lines: out, duel: foe.id }; }
  return { lines: out, duel: null };
}
export const duelOf = (s: GameState) => { const d = X(s).duel; return d && d.turn === s.turn ? s.generals[d.foe] : null; };
export const duelChance = (s: GameState, foeId: string) => { const me = s.generals[s.hero!.id], f = s.generals[foeId]; return Math.max(0.1, Math.min(0.9, 0.5 + (me.bra + lv(s, 'yari') * 4 - f.bra) / 60)); };
// 一騎討ちを受ける: 勝てば首級・功績・名声（敵将は深手を負う）。負ければ深手（体力−40、病に伏すこともある）
export function fightDuel(s: GameState): Act & { won?: boolean } {
  const H = X(s), f = duelOf(s), me = s.generals[H.id];
  if (!f) return { ok: false, text: '挑んできた敵将はもういない' };
  H.duel = undefined;
  const won = rand(s) < duelChance(s, f.id);
  if (won) {
    const d = deedsOf(s); d.duel++; d.kubi++; H.kubi = (H.kubi ?? 0) + 1;
    const merit = YARI.DUEL_MERIT + Math.round(f.bra / 5);
    me.merit += merit; H.fame = Math.min(100, (H.fame ?? 0) + YARI.DUEL_FAME);
    f.sick = Math.max(f.sick ?? 0, 2);
    addLog(s, `${me.name}が一騎討ちで${f.name}を打ち負かした。`, 'battle', true);
    return { ok: true, won, who: f.id, line: '……見事。この傷、忘れぬぞ', text: `一騎討ちで${f.name}を打ち負かした。${f.name}は深手を負って退いた。功績+${merit}・名声+${YARI.DUEL_FAME}。` };
  }
  spendHp(s, YARI.DUEL_HP);
  if (rand(s) < 0.4) me.sick = Math.max(me.sick ?? 0, 1);
  return { ok: true, won, who: f.id, line: 'その程度か。……命は預けておく', text: `一騎討ちで${f.name}に敗れ、深手を負った（体力−${YARI.DUEL_HP}${me.sick ? '・病に伏す' : ''}）。` };
}
export function declineDuel(s: GameState): Act {
  const H = X(s), f = duelOf(s);
  H.duel = undefined;
  if (!f) return { ok: false, text: '' };
  H.fame = Math.max(0, (H.fame ?? 0) - 1);
  return { ok: true, text: `${f.name}の挑みには応じず、隊を守って退いた（名声−1）。` };
}

// ───────── 論功行賞（登城した時） ─────────
export function rewardDue(s: GameState) { const d = X(s).deeds; return !!d && deedScore(d) >= 1; }
export function reward(s: GameState, lordId: string): Act {
  const H = X(s), me = s.generals[H.id], d = deedsOf(s), sc = deedScore(d);
  H.deeds = undefined;
  const what = [d.kubi ? `首級${d.kubi}` : '', d.duel ? `一騎討ちの勝ち${d.duel}` : '', d.castles ? `城攻め${d.castles}` : '', `合戦${d.battles}（勝ち${d.wins}）`].filter(Boolean).join('・');
  me.merit += Math.round(sc * 5);
  if (sc >= YARI.REWARD.MEI) {
    const taken = new Set([...(H.meibutsu ?? []), ...(H.given ?? [])]);
    const m = MEIBUTSU.filter((x) => !taken.has(x.id)).sort((a, b) => a.price - b.price)[0];
    if (m) (H.meibutsu ??= []).push(m.id);
    H.favor = Math.min(100, H.favor + 10); H.fame = Math.min(100, (H.fame ?? 0) + 8);
    return { ok: true, who: lordId, line: 'この度の働き、家中に並ぶ者はおらぬ。……これを取らせる。', text: `論功行賞（${what}）。感状と${m ? `${m.kind}の名物「${m.name}」` : '金'}を賜った。主君の覚え+10・名声+8・功績+${Math.round(sc * 5)}。` };
  }
  if (sc >= YARI.REWARD.KANJO) {
    const gold = Math.round(sc * 300);
    H.gold += gold; H.favor = Math.min(100, H.favor + 6); H.fame = Math.min(100, (H.fame ?? 0) + 4);
    return { ok: true, who: lordId, line: 'よう働いた。感状を取らせる。', text: `論功行賞（${what}）。感状と金${gold}貫を賜った。主君の覚え+6・名声+4・功績+${Math.round(sc * 5)}。` };
  }
  const gold = Math.round(sc * 100);
  H.gold += gold; H.favor = Math.min(100, H.favor + 3);
  return { ok: true, who: lordId, line: 'この度の働き、聞いておる。', text: `論功行賞（${what}）。金${gold}貫を賜った。主君の覚え+3・功績+${Math.round(sc * 5)}。` };
}

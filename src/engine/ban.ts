// 槍働きの盤（武将で遊ぶ）: ヘックスの合戦とは別の、8×10マスの手番制の小さな戦い。
// 駒は一人ずつ。騎馬（主人公・足が速い）・足軽（普通）・弓（中距離・足が遅い）・鉄砲（長距離・最も遅い・撃った次の手番は撃てない）。相性はない。
// 攻撃に使う能力: 騎馬・足軽は武勇、弓は知略、鉄砲は武勇と知略の平均。守りと体は統率。反撃できるのは隣接攻撃の駒だけ。
// 地形: 柵（通れない。弓・鉄砲は越えて撃てる）・竹束（その上の駒は弓・鉄砲の傷が半分）・川（足が2つ要る）・丘（その上から攻めると+2）
// 全体の勝ち負けは本体の合戦が決める。盤では自分の働き（手柄）を競う。乱数は盤ごとの種から（同じ種なら同じ流れ）
export type BKind = 'kiba' | 'ashi' | 'yumi' | 'teppo';
export type BSide = 'me' | 'foe';
export type Terr = '.' | 'saku' | 'take' | 'kawa' | 'oka';
export interface Piece {
  id: number; side: BSide; kind: BKind; name: string; gid?: string; hero?: boolean; sho?: boolean; // sho: 名のある将
  hp: number; maxhp: number; atk: number; def: number; int: number; mov: number; rmin: number; rmax: number; crit: number;
  x: number; y: number; moved: boolean; acted: boolean; noShootUntil?: number; alive: boolean;
}
export interface Ban {
  w: number; h: number; terr: Terr[]; pieces: Piece[]; turn: number; maxTurn: number; phase: BSide;
  log: string[]; tegara: number; kills: number; over?: 'win' | 'lose' | 'retreat' | 'time'; seed: number;
}
export const KIND: Record<BKind, { name: string; ch: string; mov: number; rmin: number; rmax: number; hp: number; atk: number; def: number }> = {
  kiba: { name: '騎馬', ch: '騎', mov: 5, rmin: 1, rmax: 1, hp: 26, atk: 10, def: 4 },
  ashi: { name: '足軽', ch: '足', mov: 4, rmin: 1, rmax: 1, hp: 22, atk: 9, def: 4 },
  yumi: { name: '弓', ch: '弓', mov: 3, rmin: 2, rmax: 3, hp: 16, atk: 8, def: 2 },
  teppo: { name: '鉄砲', ch: '鉄', mov: 2, rmin: 2, rmax: 4, hp: 16, atk: 12, def: 2 },
};
export const TERR_NAME: Record<Terr, string> = { '.': '野', saku: '柵', take: '竹束', kawa: '川', oka: '丘' };
export const BAN = { W: 8, H: 10, TURNS: 8, OKA: 2, CRIT_BASE: 0.05, CRIT_YARI: 0.03, CRIT_MULT: 1.5, TEGARA_MOB: 1, TEGARA_SHO: 5 };

// ───────── 乱数（盤ごとの種） ─────────
export function rnd(b: Ban): number { let t = (b.seed = (b.seed + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ───────── 駒を作る ─────────
export interface Who { name: string; bra: number; int: number; lea: number; gid?: string; hero?: boolean; sho?: boolean; yari?: number; hpRate?: number }
// 武将の型で駒を決める: 武勇が知略より10以上高ければ足軽、知略が10以上高ければ弓、それ以外は鉄砲
export const kindOf = (w: { bra: number; int: number }): BKind => (w.bra - w.int >= 10 ? 'ashi' : w.int - w.bra >= 10 ? 'yumi' : 'teppo');
const atkStat = (k: BKind, w: Who) => (k === 'yumi' ? w.int : k === 'teppo' ? (w.bra + w.int) / 2 : w.bra);
export function makePiece(id: number, side: BSide, kind: BKind, w: Who | null, x: number, y: number): Piece {
  const K = KIND[kind];
  // モブ（w がない）は駒の素の値。武将は能力で上下する
  const atk = w ? Math.max(3, K.atk + Math.round((atkStat(kind, w) - 50) / 6)) : K.atk - 1;
  const def = w ? Math.max(1, K.def + Math.round((w.lea - 50) / 12)) : K.def - 1;
  const maxhp = w ? K.hp + Math.round(w.lea / 10) : K.hp - 4;
  const hp = Math.max(1, Math.round(maxhp * (w?.hpRate ?? 1)));
  return {
    id, side, kind, name: w?.name ?? `${side === 'me' ? '味方' : '敵'}の${K.name}`, gid: w?.gid, hero: w?.hero, sho: w?.sho,
    hp, maxhp, atk, def, int: w?.int ?? 30, mov: K.mov, rmin: K.rmin, rmax: K.rmax, crit: BAN.CRIT_BASE + (w?.yari ?? 0) * BAN.CRIT_YARI,
    x, y, moved: false, acted: false, alive: true,
  };
}

// ───────── 盤を作る ─────────
export interface BanSetup { me: { kind: BKind; who: Who | null }[]; foe: { kind: BKind; who: Who | null }[]; seed: number; maxTurn?: number }
export function newBan(o: BanSetup): Ban {
  const b: Ban = { w: BAN.W, h: BAN.H, terr: Array(BAN.W * BAN.H).fill('.'), pieces: [], turn: 1, maxTurn: o.maxTurn ?? BAN.TURNS, phase: 'me', log: [], tegara: 0, kills: 0, seed: o.seed | 0 || 1 };
  // 地形: 中ほど（上下3行は陣地として空ける）に竹束・丘・柵、川を一筋
  const mid = (y: number) => y >= 3 && y <= b.h - 4;
  const put = (t: Terr, n: number) => { for (let k = 0, tries = 0; k < n && tries < 60; tries++) { const x = Math.floor(rnd(b) * b.w), y = 3 + Math.floor(rnd(b) * (b.h - 6)); if (mid(y) && b.terr[y * b.w + x] === '.') { b.terr[y * b.w + x] = t; k++; } } };
  const ry = 4 + Math.floor(rnd(b) * 2), rx = Math.floor(rnd(b) * 3); for (let x = rx; x < rx + 3 + Math.floor(rnd(b) * 3) && x < b.w; x++) b.terr[ry * b.w + x] = 'kawa';
  put('take', 2 + Math.floor(rnd(b) * 2)); put('oka', 2); put('saku', 1 + Math.floor(rnd(b) * 2));
  // 並べる: 味方は下の2行、敵は上の2行。主人公（騎馬）は真ん中
  const place = (side: BSide, list: BanSetup['me']) => {
    const rows = side === 'me' ? [b.h - 1, b.h - 2] : [0, 1]; // [後ろ, 前]。弓・鉄砲は後ろ
    const cols = [3, 4, 2, 5, 1, 6, 0, 7];
    list.forEach((u, i) => { const y = rows[u.kind === 'yumi' || u.kind === 'teppo' ? 0 : 1], used = (x: number) => b.pieces.some((p) => p.x === x && p.y === y); const x = cols.find((c) => !used(c)) ?? i % b.w; b.pieces.push(makePiece(b.pieces.length, side, u.kind, u.who, x, y)); });
  };
  place('me', o.me); place('foe', o.foe);
  return b;
}

// ───────── 盤のしくみ ─────────
export const at = (b: Ban, x: number, y: number) => b.pieces.find((p) => p.alive && p.x === x && p.y === y) ?? null;
export const terrAt = (b: Ban, x: number, y: number): Terr => b.terr[y * b.w + x];
export const dist = (a: { x: number; y: number }, c: { x: number; y: number }) => Math.abs(a.x - c.x) + Math.abs(a.y - c.y);
const inside = (b: Ban, x: number, y: number) => x >= 0 && y >= 0 && x < b.w && y < b.h;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 動ける先（味方の駒は通り抜けられるが止まれない。敵の駒と柵は通れない。川は足が2つ）
export function reach(b: Ban, p: Piece): { x: number; y: number }[] {
  if (p.moved || p.acted) return [];
  const best = new Map<number, number>([[p.y * b.w + p.x, 0]]), q: [number, number, number][] = [[p.x, p.y, 0]];
  while (q.length) {
    q.sort((a, c) => a[2] - c[2]); const [x, y, c] = q.shift()!;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!inside(b, nx, ny)) continue;
      const t = terrAt(b, nx, ny); if (t === 'saku') continue;
      const o = at(b, nx, ny); if (o && o.side !== p.side) continue;
      const nc = c + (t === 'kawa' ? 2 : 1); if (nc > p.mov) continue;
      const k = ny * b.w + nx; if ((best.get(k) ?? Infinity) <= nc) continue;
      best.set(k, nc); q.push([nx, ny, nc]);
    }
  }
  return [...best.keys()].map((k) => ({ x: k % b.w, y: Math.floor(k / b.w) })).filter((t) => (t.x === p.x && t.y === p.y) || !at(b, t.x, t.y));
}
export const canShoot = (b: Ban, p: Piece) => p.kind !== 'teppo' || (p.noShootUntil ?? 0) < b.turn;
// その場から攻められる敵
export function targets(b: Ban, p: Piece, from: { x: number; y: number } = p): Piece[] {
  if (p.acted || !canShoot(b, p)) return [];
  return b.pieces.filter((o) => o.alive && o.side !== p.side && dist(from, o) >= p.rmin && dist(from, o) <= p.rmax);
}
// 傷の見積もり（乱れと会心を除く）
export function baseDmg(b: Ban, a: Piece, d: Piece) {
  let v = a.atk - d.def + (terrAt(b, a.x, a.y) === 'oka' ? BAN.OKA : 0);
  if (a.rmax > 1 && terrAt(b, d.x, d.y) === 'take') v /= 2;
  return Math.max(1, Math.round(v));
}
function hit(b: Ban, a: Piece, d: Piece, counter: boolean): string {
  const crit = rnd(b) < a.crit;
  const v = Math.max(1, Math.round(baseDmg(b, a, d) * (0.85 + rnd(b) * 0.3) * (crit ? BAN.CRIT_MULT : 1)));
  d.hp = Math.max(0, d.hp - v);
  let t = `${a.name}${counter ? 'の返し' : ''}が${d.name}に${v}${crit ? '（会心）' : ''}`;
  if (d.hp <= 0) {
    d.alive = false; t += `、${d.name}を討ち取った`;
    if (a.side === 'me') { b.kills++; b.tegara += d.sho ? BAN.TEGARA_SHO : BAN.TEGARA_MOB; }
  }
  return t;
}
// 攻める（隣接攻撃の駒は、生きていれば返す）
export function attack(b: Ban, a: Piece, d: Piece): string {
  const lines = [hit(b, a, d, false)];
  if (d.alive && d.rmax === 1 && dist(a, d) === 1) lines.push(hit(b, d, a, true));
  if (a.kind === 'teppo') a.noShootUntil = b.turn + 1;
  a.acted = true; a.moved = true;
  const t = lines.join('。') + '。'; b.log.push(t); judge(b); return t;
}
export function move(b: Ban, p: Piece, x: number, y: number): boolean {
  if (!reach(b, p).some((t) => t.x === x && t.y === y)) return false;
  p.x = x; p.y = y; p.moved = true; return true;
}
export function wait(p: Piece) { p.moved = true; p.acted = true; }
export const hero = (b: Ban) => b.pieces.find((p) => p.hero) ?? null;
function judge(b: Ban) {
  if (b.over) return;
  const h = hero(b);
  if (h && !h.alive) { b.over = 'lose'; b.log.push(`${h.name}は手傷を負い、後ろへ運ばれた。`); return; }
  if (!b.pieces.some((p) => p.alive && p.side === 'foe')) { b.over = 'win'; b.log.push('目の前の敵を討ち払った。'); }
}
export function retreat(b: Ban) { if (!b.over) { b.over = 'retreat'; b.log.push('持ち場へ退いた。'); } }
// 手番を終える
export function endPhase(b: Ban) {
  if (b.over) return;
  if (b.phase === 'me') { b.phase = 'foe'; for (const p of b.pieces) if (p.side === 'foe') { p.moved = false; p.acted = false; } return; }
  b.phase = 'me'; b.turn++;
  if (b.turn > b.maxTurn) { b.over = 'time'; b.log.push('合戦の流れが変わり、槍を収めた。'); return; }
  for (const p of b.pieces) if (p.side === 'me') { p.moved = false; p.acted = false; }
}

// ───────── 動かし方（敵の手番と、オート） ─────────
// 一つの駒の一手: 攻められる所へ動いて攻める。攻められなければ、いちばん近い敵へ寄る
export function aiStep(b: Ban, p: Piece): string | null {
  if (!p.alive || p.acted || b.over) return null;
  const foes = b.pieces.filter((o) => o.alive && o.side !== p.side);
  if (!foes.length) return null;
  const tiles = p.moved ? [{ x: p.x, y: p.y }] : reach(b, p);
  let best: { t: { x: number; y: number }; d: Piece; score: number } | null = null;
  if (canShoot(b, p)) for (const t of tiles) for (const d of targets(b, p, t)) {
    const dmg = baseDmg(b, { ...p, x: t.x, y: t.y }, d), kill = dmg >= d.hp ? 30 : 0;
    const back = d.rmax === 1 && dist(t, d) === 1 ? baseDmg(b, d, p) : 0; // 返される傷
    const score = dmg + kill + (d.hero ? 6 : 0) + (d.sho ? 4 : 0) - back * 0.6 + (p.rmax > 1 ? dist(t, d) : 0) + (terrAt(b, t.x, t.y) === 'oka' ? 1 : 0);
    if (!best || score > best.score) best = { t, d, score };
  }
  if (best) { p.x = best.t.x; p.y = best.t.y; p.moved = true; return attack(b, p, best.d); }
  // 寄る: 弓・鉄砲は射程の外の端まで、隣接の駒はなるべく近くへ
  let near: { t: { x: number; y: number }; v: number } | null = null;
  for (const t of tiles) { const m = Math.min(...foes.map((o) => dist(t, o))); const v = p.rmax > 1 ? Math.abs(m - p.rmax) : m; if (!near || v < near.v) near = { t, v }; }
  if (near) { p.x = near.t.x; p.y = near.t.y; }
  wait(p); return null;
}
// 敵の手番をまとめて（画面は一駒ずつ見せるので aiStep を使う）
export function runSide(b: Ban, side: BSide): string[] {
  const out: string[] = [];
  for (const p of b.pieces.filter((q) => q.side === side && q.alive)) { const t = aiStep(b, p); if (t) out.push(t); if (b.over) break; }
  return out;
}
// オート: 終わるまで両方を動かす
export function autoAll(b: Ban) {
  for (let g = 0; g < 100 && !b.over; g++) { runSide(b, b.phase); endPhase(b); }
}

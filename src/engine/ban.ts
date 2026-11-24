// 槍働きの盤（武将で遊ぶ）: ヘックスの合戦とは別の、8×10マスの手番制の小さな戦い。
// 駒は一人ずつ。騎馬（主人公・足が速い）・足軽（普通）・弓（中距離・足が遅い）・鉄砲（長距離・最も遅い・撃った次の手番は撃てない）。相性はない。
// 攻撃に使う能力: 騎馬・足軽は武勇、弓は知略、鉄砲は武勇と知略の平均。守りと体は統率。反撃できるのは隣接攻撃の駒だけ。
// 地形: 柵（通れない。弓・鉄砲は越えて撃てる）・林（その中の駒は弓・鉄砲の傷が半分）・川（足が2つ要る）・丘（その上から攻めると+2）
// 全体の勝ち負けは本体の合戦が決める。盤では自分の働き（手柄）を競う。乱数は盤ごとの種から（同じ種なら同じ流れ）
export type BKind = 'kiba' | 'ashi' | 'yumi' | 'teppo';
export type BSide = 'me' | 'foe';
export type Terr = '.' | 'saku' | 'mori' | 'kawa' | 'oka';
export interface Piece {
  id: number; side: BSide; kind: BKind; name: string; gid?: string; hero?: boolean; sho?: boolean; // sho: 名のある将
  hp: number; maxhp: number; atk: number; def: number; int: number; mov: number; rmin: number; rmax: number; crit: number;
  x: number; y: number; moved: boolean; acted: boolean; noShootUntil?: number; alive: boolean;
  kyoho: number; confused?: number; flee?: boolean; gone?: boolean; // 虚報の残り回数・混乱の残り手番・逃げる（追い討ち）・盤から去った
  bra: number; // 一騎討ちに使う武勇
  rival?: boolean; // 同輩の駒（味方だが自分では動かせない。討ち取りは同輩の手柄）
  npc?: boolean; // 自分では動かせない味方（同輩・同僚）。手番の終わりに自分で動き、討ち取りは主人公の手柄にならない
  kills?: number; dealt?: number; // この盤で討ち取った数・与えた傷（配下の成長に）
}
export interface Ban {
  w: number; h: number; terr: Terr[]; pieces: Piece[]; turn: number; maxTurn: number; phase: BSide;
  log: string[]; tegara: number; kills: number; rivalTegara: number; over?: 'win' | 'lose' | 'retreat' | 'time'; seed: number;
  end: 'oiuchi' | 'shingari'; ichiban?: boolean; event?: string; // 終盤の形（勝ち戦なら追い討ち、負け戦なら殿）・一番槍が出たか・局面の変わり目の知らせ
  mid: BanSetup['foe']; late: BanSetup['foe']; // 中盤に現れる敵・殿で迫る敵
  duel?: Duel; duelWon?: string[]; duelLost?: number; // 一騎討ち（いま戦っている・勝った相手の名・負けた数）
  mochi?: Mochi; rescued?: number; // 持ち場（足軽大将から）・後詰めで救った組の数
  goal?: Goal; breached?: boolean; // 小競り合いのねらい（主命。なければ合戦の槍働き）・砦を破られた
}
// 小競り合い（足軽大将の主命）のねらい: reach 主人公が敵の端（一番上の行）に着けば果たす・rout 敵を討ち払えば果たす・hold 手番の終わりまで主人公が持ちこたえれば果たす
export type Goal = 'reach' | 'rout' | 'hold';
export const GOAL_NAME: Record<Goal, string> = { reach: '物見（敵陣の端まで）', rout: '夜討ち（砦の敵を討ち払う）', hold: '砦の守り（持ちこたえる）' };
// 持ち場: 先陣（敵が近くから始まり、一番槍は倍）・脇備え（中盤から横を突けて傷+2）・鉄砲備え（モブが鉄砲、陣の前に柵）・後詰め（崩れかけた味方の組を救う）
export type Mochi = 'senjin' | 'waki' | 'teppo' | 'gozume';
export const MOCHI_NAME: Record<Mochi, string> = { senjin: '先陣', waki: '脇備え', teppo: '鉄砲備え', gozume: '後詰め' };
export const MOCHI_DESC: Record<Mochi, string> = { senjin: '敵が近くから始まる。一番槍の手柄は倍、敵の足軽が一駒多い', waki: '中盤から敵の横を突ける（傷+2）', teppo: 'モブが鉄砲になり、陣の前に柵が立つ', gozume: '盤の中ほどで崩れかけた味方の組を二つ救う（足が遅く傷も深い。生き残れば一組につき手柄+2）' };
// 一騎討ち: 三合のうち二合を取れば勝ち。攻める・受ける・崩すの三すくみ（攻めは崩しに、崩しは受けに、受けは攻めに勝つ）
export type Move = 'seme' | 'uke' | 'kuzushi';
export const MOVE_NAME: Record<Move, string> = { seme: '攻める', uke: '受ける', kuzushi: '崩す' };
export interface Duel { me: number; foe: number; round: number; myWins: number; foeWins: number; habit: Move; seen: boolean; log: string[]; over?: 'win' | 'lose' }
export const KIND: Record<BKind, { name: string; ch: string; mov: number; rmin: number; rmax: number; hp: number; atk: number; def: number }> = {
  kiba: { name: '騎馬', ch: '騎', mov: 5, rmin: 1, rmax: 1, hp: 26, atk: 10, def: 4 },
  ashi: { name: '足軽', ch: '足', mov: 4, rmin: 1, rmax: 1, hp: 22, atk: 9, def: 4 },
  yumi: { name: '弓', ch: '弓', mov: 3, rmin: 2, rmax: 3, hp: 16, atk: 8, def: 2 },
  teppo: { name: '鉄砲', ch: '鉄', mov: 2, rmin: 2, rmax: 4, hp: 16, atk: 12, def: 2 },
};
export const TERR_NAME: Record<Terr, string> = { '.': '野', saku: '柵', mori: '林', kawa: '川', oka: '丘' };
export const DUEL = { YARI_SEEN: 2, HABIT: 0.5, READ: 0.25, BRA_K: 60, TEGARA: 3, LOSE_HP: 0.5 };
export const BAN = { W: 8, H: 10, TURNS: 8, OKA: 2, CRIT_BASE: 0.05, CRIT_YARI: 0.03, CRIT_MULT: 1.5, TEGARA_MOB: 1, TEGARA_SHO: 5, ICHIBAN: 3, OIUCHI: 1, SHINGARI: 6, NAKA: 4, SHU: 7, KYOHO_PER: 30, KYOHO_RANGE: 3, LOSE_KEEP: 0.5 };
export const stageOf = (b: Ban) => (b.turn >= BAN.SHU ? 'shu' : b.turn >= BAN.NAKA ? 'naka' : 'jo');
export const stageName = (b: Ban) => b.goal ? GOAL_NAME[b.goal] : ({ jo: '序盤', naka: '中盤', shu: b.end === 'oiuchi' ? '終盤・追い討ち' : '終盤・殿' })[stageOf(b)];

// ───────── 乱数（盤ごとの種） ─────────
export function rnd(b: Ban): number { let t = (b.seed = (b.seed + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

// ───────── 駒を作る ─────────
export interface Who { name: string; bra: number; int: number; lea: number; gid?: string; hero?: boolean; sho?: boolean; rival?: boolean; npc?: boolean; yari?: number; hpRate?: number }
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
    id, side, kind, name: w?.name ?? `${side === 'me' ? '味方' : '敵'}の${K.name}`, gid: w?.gid, hero: w?.hero, sho: w?.sho, rival: w?.rival, npc: w?.npc || w?.rival,
    hp, maxhp, atk, def, int: w?.int ?? 30, mov: K.mov, rmin: K.rmin, rmax: K.rmax, crit: BAN.CRIT_BASE + (w?.yari ?? 0) * BAN.CRIT_YARI,
    x, y, moved: false, acted: false, alive: true, kyoho: w ? Math.floor(w.int / BAN.KYOHO_PER) : 0, // 虚報は武将だけ（知略30ごとに一回）
    bra: w ? w.bra + (w.yari ?? 0) * 4 : 40, // 一騎討ちに使う武勇（武芸一段で+4）
  };
}

// ───────── 盤を作る ─────────
export interface BanSetup { goal?: Goal; fort?: 'foe' | 'me'; sleep?: boolean; spread?: boolean; mochi?: Mochi; rescue?: { kind: BKind; who: Who | null }[]; me: { kind: BKind; who: Who | null }[]; foe: { kind: BKind; who: Who | null }[]; seed: number; maxTurn?: number; end?: 'oiuchi' | 'shingari'; mid?: { kind: BKind; who: Who | null }[]; late?: { kind: BKind; who: Who | null }[] }
export function newBan(o: BanSetup): Ban {
  const b: Ban = { w: BAN.W, h: BAN.H, terr: Array(BAN.W * BAN.H).fill('.'), pieces: [], turn: 1, maxTurn: o.maxTurn ?? BAN.TURNS, phase: 'me', log: [], tegara: 0, kills: 0, rivalTegara: 0, seed: o.seed | 0 || 1, end: o.end ?? 'oiuchi', mid: o.mid ?? [], late: o.late ?? [], mochi: o.mochi, goal: o.goal };
  // 地形: 中ほど（上下3行は陣地として空ける）に林・丘・柵、川を一筋
  const mid = (y: number) => y >= 3 && y <= b.h - 4;
  const put = (t: Terr, n: number) => { for (let k = 0, tries = 0; k < n && tries < 60; tries++) { const x = Math.floor(rnd(b) * b.w), y = 3 + Math.floor(rnd(b) * (b.h - 6)); if (mid(y) && b.terr[y * b.w + x] === '.') { b.terr[y * b.w + x] = t; k++; } } };
  // 川: 盤の左の端から右の端まで一筋（一列に一マス）。途中で一度、上か下へ一行ずれる（4〜5行目のあたり）。四度に一度は川のない盤
  if (rnd(b) < 0.75) { let ry = 4 + Math.floor(rnd(b) * 2); const jog = 2 + Math.floor(rnd(b) * 4), dy = ry === 4 ? 1 : -1; for (let x = 0; x < b.w; x++) { if (x === jog) { b.terr[ry * b.w + x] = 'kawa'; ry += dy; } b.terr[ry * b.w + x] = 'kawa'; } } // ずれる列は二マス（川筋を途切れさせない）
  put('mori', 2 + Math.floor(rnd(b) * 2)); put('oka', 2); put('saku', 1 + Math.floor(rnd(b) * 2));
  // 並べる: 味方は下の2行、敵は上の2行。主人公（騎馬）は真ん中
  const place = (side: BSide, list: BanSetup['me']) => {
    const rows = side === 'me' ? [b.h - 1, b.h - 2] : o.mochi === 'senjin' ? [2, 3] : [0, 1]; // [後ろ, 前]。弓・鉄砲は後ろ。先陣は敵が二行近い
    const cols = [3, 4, 2, 5, 1, 6, 0, 7];
    list.forEach((u, i) => { const y = rows[u.kind === 'yumi' || u.kind === 'teppo' ? 0 : 1], used = (x: number) => b.pieces.some((p) => p.x === x && p.y === y); const x = cols.find((c) => !used(c)) ?? i % b.w; b.pieces.push(makePiece(b.pieces.length, side, u.kind, u.who, x, y)); });
  };
  if (o.mochi === 'teppo') for (let x = 2; x <= 5; x++) b.terr[(b.h - 3) * b.w + x] = 'saku'; // 鉄砲備え: 陣の前に柵
  if (o.mochi === 'senjin') for (let y = 2; y <= 3; y++) for (let x = 0; x < b.w; x++) b.terr[y * b.w + x] = '.'; // 先陣: 敵の陣を空ける
  if (o.fort) { const y = o.fort === 'foe' ? 2 : b.h - 3; for (let x = 0; x < b.w; x++) b.terr[y * b.w + x] = x === 3 || x === 4 ? '.' : 'saku'; for (let x = 0; x < b.w; x++) if (b.terr[(y + (o.fort === 'foe' ? 1 : -1)) * b.w + x] === 'saku') b.terr[(y + (o.fort === 'foe' ? 1 : -1)) * b.w + x] = '.'; } // 砦: 一行の柵（真ん中の二マスが木戸）
  place('me', o.me); place('foe', o.foe);
  if (o.spread) for (const p of b.pieces) if (p.side === 'foe') { for (let k = 0; k < 30; k++) { const x = Math.floor(rnd(b) * b.w), y = 1 + Math.floor(rnd(b) * 4); if (!at(b, x, y) && terrAt(b, x, y) !== 'saku') { p.x = x; p.y = y; break; } } } // 物見: 敵は2〜5行目に散らばって見張る
  if (o.sleep) for (const p of b.pieces) if (p.side === 'foe') p.confused = 1; // 夜討ち: 敵ははじめの一手、寝込んでいて乱れる
  // 後詰め: 盤の中ほど（5行目）に、崩れかけた味方の組（体は半ば。自分では動かせない）
  (o.rescue ?? []).forEach((u, i) => { const x = [2, 5, 3, 4][i % 4], y = 5; b.terr[y * b.w + x] = '.'; const p = makePiece(b.pieces.length, 'me', u.kind, u.who, x, y); p.npc = true; p.hp = Math.ceil(p.maxhp * 0.4); p.mov = 2; (p as Piece & { rescue?: boolean }).rescue = true; p.name = `崩れかけた味方の${KIND[u.kind].name}`; b.pieces.push(p); });
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
  let v = a.atk - d.def + (terrAt(b, a.x, a.y) === 'oka' ? BAN.OKA : 0) + (b.mochi === 'waki' && a.side === 'me' && d.side === 'foe' && b.turn >= BAN.NAKA ? 2 : 0); // 脇備えは中盤から横を突く
  if (a.rmax > 1 && terrAt(b, d.x, d.y) === 'mori') v /= 2; // 林の中の駒は、弓・鉄砲の傷が半分
  return Math.max(1, Math.round(v));
}
function hit(b: Ban, a: Piece, d: Piece, counter: boolean): string {
  const crit = rnd(b) < a.crit;
  const v = Math.max(1, Math.round(baseDmg(b, a, d) * (0.85 + rnd(b) * 0.3) * (crit ? BAN.CRIT_MULT : 1)));
  d.hp = Math.max(0, d.hp - v);
  if (d.side !== a.side) a.dealt = (a.dealt ?? 0) + v;
  let t = `${a.name}${counter ? 'の返し' : ''}が${d.name}に${v}${crit ? '（会心）' : ''}`;
  if (!b.ichiban && !counter && a.side === 'me' && d.side === 'foe' && a.rmax === 1) { // 一番槍: 最初に敵に槍をつけた者
    b.ichiban = true;
    if (a.hero) { const v0 = BAN.ICHIBAN * (b.mochi === 'senjin' ? 2 : 1); b.tegara += v0; t = `一番槍！（手柄+${v0}） ${t}`; } else if (a.rival) { b.rivalTegara += BAN.ICHIBAN; t += `（一番槍は同輩の${a.name}に取られた）`; } else t += `（一番槍は${a.name}に取られた）`;
  }
  if (d.hp <= 0) {
    d.alive = false; t += `、${d.name}を討ち取った`;
    if (d.side !== a.side) a.kills = (a.kills ?? 0) + 1;
    const v2 = (d.sho ? BAN.TEGARA_SHO : BAN.TEGARA_MOB) + (d.flee ? BAN.OIUCHI : 0);
    if (a.side === 'me' && d.side === 'foe') { if (a.rival) b.rivalTegara += v2; else if (!a.npc) { b.kills++; b.tegara += v2; } }
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
  if (b.goal === 'reach' && h?.alive && h.y === 0) { b.over = 'win'; b.log.push('敵陣の端まで見届けた。'); return; }
  if (b.goal === 'hold' && b.pieces.some((p) => p.alive && p.side === 'foe' && p.y >= b.h - 2)) { b.over = 'lose'; b.breached = true; b.log.push('敵に砦の内へ踏み込まれた。砦は破られた。'); return; } // 砦の守り: 下の二行（砦の内）に敵が入れば破られる
  if (h && !h.alive) { b.over = 'lose'; b.tegara = Math.floor(b.tegara * BAN.LOSE_KEEP); b.log.push(`${h.name}は手傷を負い、後ろへ運ばれた（手柄の半ばを失った）。`); return; }
  if (!b.pieces.some((p) => p.alive && p.side === 'foe')) { b.over = 'win'; b.log.push('目の前の敵を討ち払った。'); countRescue(b); }
}
// 後詰め: 盤が終わった時、生き残った崩れかけの組一つにつき手柄+2（主人公が倒れた時は数えない）
function countRescue(b: Ban) {
  if (b.mochi !== 'gozume' || b.rescued !== undefined || b.over === 'lose') return;
  const n = b.pieces.filter((p) => (p as Piece & { rescue?: boolean }).rescue && p.alive).length;
  b.rescued = n; if (n) { b.tegara += n * 2; b.log.push(`崩れかけた味方の組を${n}つ救った（手柄+${n * 2}）。`); }
}
export function retreat(b: Ban) { if (!b.over) { b.over = 'retreat'; b.log.push('持ち場へ退いた。'); countRescue(b); } }
// 手番を終える
export function endPhase(b: Ban) {
  if (b.over) return;
  if (b.phase === 'me') { b.phase = 'foe'; for (const p of b.pieces) if (p.side === 'foe') { p.moved = false; p.acted = false; } return; }
  b.phase = 'me'; b.turn++; b.event = undefined;
  if (b.turn > b.maxTurn) {
    b.over = 'time'; countRescue(b);
    const h = hero(b);
    if (b.goal) b.log.push(b.goal === 'hold' && h?.alive ? '砦を持ちこたえた。' : b.goal === 'reach' ? '敵陣の端まで行き着けなかった。' : '砦の敵を討ち払えなかった。');
    else if (b.end === 'shingari' && h?.alive) { b.tegara += BAN.SHINGARI; b.log.push(`殿を務め上げた（手柄+${BAN.SHINGARI}）。`); }
    else b.log.push(b.end === 'oiuchi' ? '敵は散り、追い討ちを止めた。' : '合戦の流れが変わり、槍を収めた。');
    return;
  }
  for (const p of b.pieces) if (p.side === 'me') { p.moved = false; p.acted = false; }
  if (b.turn === BAN.NAKA && b.mid.length) { const n = spawn(b, b.mid); b.event = `中盤: 敵の新手が現れた（${n.join('・')}）。${b.mochi === 'waki' ? '脇備えから敵の横が開いた。いまから攻めは傷+2。' : ''}`; b.log.push(b.event); }
  if (b.turn === BAN.SHU) {
    if (b.end === 'oiuchi') { for (const p of b.pieces) if (p.side === 'foe' && p.alive) p.flee = true; b.event = '終盤: 味方の勝ち戦。敵が崩れて逃げ出した。追い討ちで討つほど手柄になる。'; }
    else { const n = spawn(b, b.late); b.event = `終盤: 味方の負け戦。殿を命じられた。${b.maxTurn}手目の終わりまで、あなたが持ちこたえれば手柄（敵の追手: ${n.join('・') || 'なし'}）。`; }
    b.log.push(b.event);
  }
  judge(b);
}
// 新手を上の2行の空いた所に置く
function spawn(b: Ban, list: BanSetup['foe']): string[] {
  const out: string[] = [];
  for (const u of list) {
    const free: [number, number][] = []; for (const y of [0, 1, 2]) for (let x = 0; x < b.w; x++) if (!at(b, x, y) && terrAt(b, x, y) !== 'saku') free.push([x, y]);
    if (!free.length) break;
    const [x, y] = free[Math.floor(rnd(b) * free.length)];
    const p = makePiece(b.pieces.length, 'foe', u.kind, u.who, x, y); p.moved = true; p.acted = true; b.pieces.push(p); out.push(p.sho ? p.name : KIND[u.kind].name);
  }
  return out;
}

// ───────── 虚報（知略で敵を惑わせる。武将の駒だけ。射程3） ─────────
export const kyohoChance = (a: Piece, d: Piece) => Math.max(0.1, Math.min(0.9, 0.5 + (a.int - d.int) / 200));
export const kyohoTargets = (b: Ban, a: Piece): Piece[] => (a.kyoho > 0 && !a.acted && !a.confused ? b.pieces.filter((o) => o.alive && o.side !== a.side && dist(a, o) <= BAN.KYOHO_RANGE) : []);
export function kyoho(b: Ban, a: Piece, d: Piece): string {
  if (!kyohoTargets(b, a).includes(d)) return '';
  a.kyoho--; a.acted = true; a.moved = true;
  const p = kyohoChance(a, d);
  let t: string;
  if (rnd(b) < p) { d.confused = 1 + (rnd(b) < 0.5 ? 1 : 0); t = `${a.name}の虚報に${d.name}が惑わされた（${d.confused}手のあいだ乱れる）。`; }
  else t = `${a.name}は虚報を流したが、${d.name}は乗らなかった（見込み${Math.round(p * 100)}%）。`;
  b.log.push(t); return t;
}
// 惑った駒: 勝手に動き、近くの駒を敵味方構わず攻めることがある
function confusedStep(b: Ban, p: Piece): string | null {
  const tiles = reach(b, p); const t = tiles[Math.floor(rnd(b) * tiles.length)] ?? p;
  p.x = t.x; p.y = t.y; p.moved = true;
  const near = b.pieces.filter((o) => o.alive && o !== p && dist(p, o) >= p.rmin && dist(p, o) <= p.rmax);
  let out: string | null = null;
  if (near.length && canShoot(b, p) && rnd(b) < 0.7) { const d = near[Math.floor(rnd(b) * near.length)]; out = `（乱れて）${attack(b, p, d)}`; }
  p.acted = true;
  if (p.alive && p.confused) { p.confused--; if (!p.confused) b.log.push(`${p.name}は我に返った。`); }
  return out;
}
// 自分の手番のはじめ: 惑っている味方の駒は勝手に動く
export function runConfused(b: Ban, side: BSide): string[] {
  const out: string[] = [];
  for (const p of b.pieces.filter((q) => q.side === side && q.alive && q.confused)) { const t = confusedStep(b, p); if (t) out.push(t); if (b.over) break; }
  return out;
}
// 逃げる駒（追い討ち）: 上の端へ。端に着けば盤から去る
function fleeStep(b: Ban, p: Piece): string | null {
  const tiles = reach(b, p); let best = tiles[0] ?? p;
  for (const t of tiles) if (t.y < best.y) best = t;
  p.x = best.x; p.y = best.y; p.moved = true; p.acted = true;
  if (p.y === 0) { p.alive = false; p.gone = true; const t = `${p.name}は逃げ去った。`; b.log.push(t); judge(b); return t; }
  return null;
}

// ───────── 動かし方（敵の手番と、オート） ─────────
// 一つの駒の一手: 攻められる所へ動いて攻める。攻められなければ、いちばん近い敵へ寄る
export function aiStep(b: Ban, p: Piece): string | null {
  if (!p.alive || p.acted || b.over) return null;
  if (p.confused) return confusedStep(b, p);
  if (p.flee) return fleeStep(b, p);
  if ((p as Piece & { rescue?: boolean }).rescue) { // 崩れかけた味方の組は、攻めずに味方の陣（下の端）へ退がる
    const tiles = reach(b, p); let best = { t: { x: p.x, y: p.y }, v: -1e9 };
    for (const t of tiles) { const v = t.y * 3 + Math.min(...b.pieces.filter((o) => o.alive && o.side !== p.side).map((o) => dist(t, o)), 9); if (v > best.v) best = { t, v }; }
    p.x = best.t.x; p.y = best.t.y; wait(p); return null;
  }
  const foes = b.pieces.filter((o) => o.alive && o.side !== p.side);
  if (!foes.length) return null;
  // 虚報: 見込みが半分ほどあり、強い相手（主人公・名のある将・攻めの高い駒）が射程にいれば、六割ほどで使う
  if (p.kyoho > 0 && !p.moved) {
    const ks = kyohoTargets(b, p).filter((d) => !d.confused && kyohoChance(p, d) >= 0.45).sort((a, c) => (c.hero || c.sho ? 20 : 0) + c.atk - ((a.hero || a.sho ? 20 : 0) + a.atk));
    if (ks.length && (ks[0].hero || ks[0].sho || ks[0].atk >= 10) && rnd(b) < 0.6) return kyoho(b, p, ks[0]);
  }
  const tiles = p.moved ? [{ x: p.x, y: p.y }] : reach(b, p);
  // 主人公・名のある将は、体が三分の一を切ったら、討ち取れる相手がいない限り退がる
  if (p.hero && b.goal === 'reach' && p.side === 'me') { // 物見のオート: 敵と組み合わず、なるべく上の端へ
    let best = { t: { x: p.x, y: p.y }, v: 1e9 };
    for (const t of tiles) { const v = t.y * 10 - Math.min(...foes.map((o) => dist(t, o))); if (v < best.v) best = { t, v }; }
    p.x = best.t.x; p.y = best.t.y; p.moved = true; judge(b); if (b.over) return null;
  }
  if ((p.hero || p.sho) && p.hp / p.maxhp < 0.35 && !tiles.some((t) => canShoot(b, p) && targets(b, p, t).some((d) => baseDmg(b, { ...p, x: t.x, y: t.y }, d) >= d.hp))) {
    let far = { t: { x: p.x, y: p.y }, v: -1 };
    for (const t of tiles) { const v = Math.min(...foes.map((o) => dist(t, o))); if (v > far.v) far = { t, v }; }
    p.x = far.t.x; p.y = far.t.y; wait(p); return null;
  }
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
// ───────── 一騎討ち（主人公が名のある将の隣で名乗る） ─────────
export const duelFoes = (b: Ban): Piece[] => { const h = hero(b); return h && h.alive && !h.acted && !h.confused && b.phase === 'me' && !b.over ? b.pieces.filter((p) => p.alive && p.sho && p.side === 'foe' && !p.flee && dist(h, p) === 1) : []; };
export function startDuel(b: Ban, foe: Piece): Duel | null {
  const h = hero(b); if (!h || !duelFoes(b).includes(foe)) return null;
  const habits: Move[] = ['seme', 'uke', 'kuzushi'], habit = habits[Math.floor(rnd(b) * 3)];
  b.duel = { me: h.id, foe: foe.id, round: 1, myWins: 0, foeWins: 0, habit, seen: (BRA_YARI(h)) >= DUEL.YARI_SEEN, log: [] };
  b.log.push(`${h.name}が名乗りを上げ、${foe.name}と一騎討ちになった。`);
  return b.duel;
}
const BRA_YARI = (p: Piece) => Math.round((p.crit - BAN.CRIT_BASE) / BAN.CRIT_YARI); // 武芸の段（会心から戻す）
const beats = (a: Move, c: Move) => (a === 'seme' && c === 'kuzushi') || (a === 'kuzushi' && c === 'uke') || (a === 'uke' && c === 'seme');
export const duelChance = (b: Ban, read: 0 | 1 | -1) => { const d = b.duel!, me = b.pieces[d.me], f = b.pieces[d.foe]; return Math.max(0.05, Math.min(0.95, 0.5 + (me.bra - f.bra) / DUEL.BRA_K + read * DUEL.READ)); };
// 一合: 自分の手を出す。相手は癖の手を半々で、ほかは等しく出す。読み勝てば見込み+25%、読み負ければ−25%。見込みで一合の勝ち負けが決まる
export function duelRound(b: Ban, mv: Move): string {
  const d = b.duel; if (!d || d.over) return '';
  const others = (['seme', 'uke', 'kuzushi'] as Move[]).filter((m) => m !== d.habit);
  const fm = rnd(b) < DUEL.HABIT ? d.habit : others[Math.floor(rnd(b) * 2)];
  const read: 0 | 1 | -1 = beats(mv, fm) ? 1 : beats(fm, mv) ? -1 : 0;
  const win = rnd(b) < duelChance(b, read);
  const me = b.pieces[d.me], f = b.pieces[d.foe];
  if (win) d.myWins++; else d.foeWins++;
  const t = `第${d.round}合: ${me.name}は${MOVE_NAME[mv]}、${f.name}は${MOVE_NAME[fm]}。${read > 0 ? '読み勝ち、' : read < 0 ? '読み負け、' : ''}${win ? `${me.name}が取った` : `${f.name}が取った`}。`;
  d.log.push(t); d.round++;
  if (d.myWins >= 2 || d.foeWins >= 2) {
    d.over = d.myWins >= 2 ? 'win' : 'lose';
    if (d.over === 'win') { f.hp = 0; f.alive = false; b.kills++; b.tegara += BAN.TEGARA_SHO + DUEL.TEGARA; (b.duelWon ??= []).push(f.name); b.log.push(`一騎討ちで${f.name}を打ち負かした（手柄+${BAN.TEGARA_SHO + DUEL.TEGARA}）。`); }
    else { me.hp = Math.max(0, me.hp - Math.round(me.maxhp * DUEL.LOSE_HP)); b.duelLost = (b.duelLost ?? 0) + 1; if (me.hp <= 0) me.alive = false; b.log.push(`一騎討ちで${f.name}に敗れ、深手を負った。`); }
    me.acted = true; me.moved = true;
    judge(b);
  }
  return t;
}
export function endDuel(b: Ban) { b.duel = undefined; }
// オート: 終わるまで両方を動かす
export function autoAll(b: Ban) {
  for (let g = 0; g < 100 && !b.over; g++) {
    const h = hero(b);
    if (b.phase === 'me' && h?.alive && h.hp / h.maxhp < 0.25) { retreat(b); break; } // 主人公が危うければ、手柄を確かめて退く
    runSide(b, b.phase); endPhase(b);
  }
}

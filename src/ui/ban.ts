// 槍働きの盤の画面: 8×10マス。駒を選び、動く先か攻める敵を押す。敵の手番は一駒ずつ見せる
import * as B from '../engine/ban';
import type { Ban, Piece } from '../engine/ban';
import { BAN_ART } from '../data/banArt';

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let b: Ban | null = null, root: HTMLElement | null = null, sel: number | null = null, busy = false, title = '', done: ((b: Ban) => void) | null = null;
let last = ''; // いちばん新しい出来事（目立たせる）
let aim = false; // 虚報の的を選んでいる
export type BanColors = { me?: string; foe?: string }; // 駒の色（家の色）

export function openBan(ban: Ban, heading: string, colors: BanColors = {}): Promise<Ban> {
  b = ban; sel = null; busy = false; title = heading; last = ''; aim = false; groundKey = '';
  if (!root) {
    root = document.createElement('div'); root.id = 'ban'; root.className = 'ban';
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    window.addEventListener('resize', () => { if (root && !root.hidden) drawGround(); });
  }
  root.hidden = false;
  const mc = colors.me ?? '#2d4a86'; let fc = colors.foe ?? '#c0483b';
  if (near(mc, fc)) fc = near(mc, '#c0483b') ? '#2b3f6e' : '#c0483b'; // 味方と敵の色が近ければ、敵を見分けやすい色に
  root.style.setProperty('--me', mc); root.style.setProperty('--foe', fc);
  (window as unknown as { __ban: unknown }).__ban = { get b() { return b; }, render }; // 試験用
  render();
  return new Promise((r) => { done = r; });
}

const rgb = (h: string) => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16, (n >> 8) & 255, n & 255]; };
const near = (a: string, c: string) => { const x = rgb(a), y = rgb(c); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 110; };
const me = (p: Piece | null) => !!p && p.side === 'me';
function cellCls(x: number, y: number, reach: Set<string>, tg: Set<number>) {
  const p = B.at(b!, x, y), t = B.terrAt(b!, x, y);
  return ['bc', `t-${t === '.' ? 'no' : t}`, reach.has(`${x},${y}`) ? 'reach' : '', p && tg.has(p.id) ? (aim ? 'kyo' : 'tgt') : '', p && p.id === sel ? 'sel' : ''].filter(Boolean).join(' ');
}
// 地形の名だけ（絵は盤の下のキャンバスに描く）
function terrHtml(_x: number, _y: number) { return ''; }
// 駒の絵（assets/ban。なければ文字の駒）。味方は背面、敵は正面の絵。足もとに家の色の輪（主人公は金、名のある将は朱）
// 人の大きさをそろえる: 騎馬は少し大きく、膝をついた鉄砲は少し小さく
const ART_SCALE: Record<string, number> = { kiba: 1.45, sho: 1.45, hero: 1.45, ashi: 1, yumi: 1, teppo: 0.82 };
const artKey = (p: Piece) => { const d = p.side === 'me' ? 'b' : 'f'; for (const k of [p.sho ? 'sho' : p.hero ? 'hero' : '', p.kind]) if (k && BAN_ART[`${k}_${d}`]?.length) return k; return null; };
const artOf = (p: Piece) => { const k = artKey(p); return k ? { src: BAN_ART[`${k}_${p.side === 'me' ? 'b' : 'f'}`][0], sc: ART_SCALE[k] ?? 1 } : null; };
function pieceHtml(p: Piece) {
  const K = B.KIND[p.kind], art = artOf(p);
  const marks = `${p.confused ? '<u>乱</u>' : p.flee ? '<u class="fl">逃</u>' : ''}<i class="hpb" style="width:${Math.round((p.hp / p.maxhp) * 100)}%"></i>`;
  if (art) return `<span class="pa ${p.side}${p.hero ? ' hero' : ''}${p.sho ? ' sho' : ''}${p.acted && p.side === 'me' && b!.phase === 'me' ? ' done' : ''}" title="${esc(p.name)}" style="--sc:${art.sc}"><s class="base"></s><img src="${art.src}" alt="">${p.hero || p.sho || p.gid ? `<em>${esc(p.name.slice(-3))}</em>` : ''}${marks}</span>`;
  return `<span class="pc ${p.side}${p.hero ? ' hero' : ''}${p.sho ? ' sho' : ''}${p.acted && p.side === 'me' && b!.phase === 'me' ? ' done' : ''}" title="${esc(p.name)}">${p.sho ? '将' : K.ch}${marks}</span>`;
}
function infoHtml(p: Piece | null) {
  if (!p) return '<p class="ban-hint">自分の駒を押して選ぶ。青いマスへ動き、赤い敵を押して攻める。攻めずに終える駒は「待機」。武将の駒は「虚報」で、3マス以内の敵を惑わせられる（知略で見込みが決まる）。</p>';
  const K = B.KIND[p.kind], t = B.terrAt(b!, p.x, p.y);
  return `<div class="ban-info"><b>${esc(p.name)}</b><span>${K.name}${p.hero ? '（あなた）' : p.sho ? '（名のある将）' : p.gid ? '（配下）' : ''}・${B.TERR_NAME[t]}</span>
    <span>体 ${p.hp}/${p.maxhp}・攻 ${p.atk}・守 ${p.def}・足 ${p.mov}・間合い ${p.rmin === p.rmax ? p.rmax : `${p.rmin}〜${p.rmax}`}${p.kind === 'teppo' && !B.canShoot(b!, p) ? '・<em>弾込め中</em>' : ''}</span>
    <span>知略 ${p.int}${p.kyoho ? `・虚報 あと${p.kyoho}回` : p.gid || p.hero || p.sho ? '・虚報 使い切った' : ''}${p.confused ? `・<em>惑っている（あと${p.confused}手）</em>` : ''}${p.flee ? '・<em>逃げている</em>' : ''}</span></div>`;
}
function render() {
  if (!b || !root) return;
  const s = sel !== null ? b.pieces[sel] : null, mine = s && me(s) && b.phase === 'me' && !b.over && !busy;
  if (aim && !(mine && B.kyohoTargets(b, s!).length)) aim = false;
  const reach = new Set<string>(mine && !aim ? B.reach(b, s!).map((t) => `${t.x},${t.y}`) : []);
  const tg = new Set<number>(mine ? (aim ? B.kyohoTargets(b, s!) : B.targets(b, s!)).map((p) => p.id) : []);
  const kyoList = aim && s ? `<div class="ban-kyo"><b>虚報の的を選ぶ</b>${B.kyohoTargets(b, s).map((d) => `<span>${esc(d.name)}（知略${d.int}・見込み${Math.round(B.kyohoChance(s, d) * 100)}%）</span>`).join('')}</div>` : '';
  let cells = '';
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const p = B.at(b, x, y); cells += `<button class="${cellCls(x, y, reach, tg)}" data-x="${x}" data-y="${y}" aria-label="${x + 1}列${y + 1}行・${B.TERR_NAME[B.terrAt(b, x, y)]}${p ? ' ' + esc(p.name) : ''}">${terrHtml(x, y)}${p ? pieceHtml(p) : ''}</button>`; }
  const foes = b.pieces.filter((p) => p.side === 'foe' && p.alive).length, ours = b.pieces.filter((p) => p.side === 'me' && p.alive).length;
  const phase = `${B.stageName(b)}・${b.over ? '終わり' : b.phase === 'me' ? 'あなたの手番' : '敵の手番'}`;
  const over = b.over ? `<div class="ban-over"><b>${{ win: '目の前の敵を討ち払った', lose: '手傷を負い、後ろへ運ばれた', retreat: '持ち場へ退いた', time: '合戦の流れが変わり、槍を収めた' }[b.over]}</b><span>討ち取り${b.kills}・手柄${b.tegara}</span><button class="ban-btn main" data-b="close">閉じる</button></div>` : '';
  const btns = b.over ? '' : `<div class="ban-acts">
    <button class="ban-btn" data-b="wait" ${mine && !s!.acted ? '' : 'disabled'}>待機</button>
    ${B.duelFoes(b).length && s && s.hero ? `<button class="ban-btn duel" data-b="nanori" data-id="${B.duelFoes(b)[0].id}">名乗る（${esc(B.duelFoes(b)[0].name)}と一騎討ち）</button>` : ''}
    <button class="ban-btn kyo" data-b="kyoho" ${mine && B.kyohoTargets(b, s!).length ? '' : 'disabled'}>${aim ? 'やめる' : `虚報${mine && s!.kyoho ? `（あと${s!.kyoho}）` : ''}`}</button>
    <button class="ban-btn main" data-b="end" ${b.phase === 'me' && !busy ? '' : 'disabled'}>手番を終える</button>
    <button class="ban-btn" data-b="auto" ${busy ? 'disabled' : ''}>オート</button>
    <button class="ban-btn dim" data-b="retreat" ${busy ? 'disabled' : ''}>持ち場へ退く</button></div>`;
  const D = b.duel, duel = D ? duelHtml(D) : '';
  root.innerHTML = `${duel}<div class="ban-wrap"><div class="ban-head"><b>${esc(title)}</b><span>第${Math.min(b.turn, b.maxTurn)}手／${b.maxTurn}・${phase}・味方${ours}・敵${foes}・手柄${b.tegara}</span></div>
    <div class="ban-body"><div class="ban-grid" style="grid-template-columns:repeat(${b.w},1fr);grid-template-rows:repeat(${b.h},1fr)">${cells}</div>
    <div class="ban-side">${over}${b.over ? '' : infoHtml(s)}${kyoList}${last && !b.over ? `<p class="ban-last">${esc(last)}</p>` : ''}${btns}<div class="ban-log">${b.log.slice(-6).reverse().map((t) => `<p>${esc(t)}</p>`).join('')}</div></div></div></div>`;
  drawGround();
}
async function onClick(e: Event) {
  const el = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!el || !b || el.disabled) return;
  const act = el.dataset.b;
  if (act === 'close') { root!.hidden = true; const r = done; done = null; r?.(b); return; }
  if (busy) return;
  if (b.duel && !['duel', 'duel-end'].includes(act ?? '')) return;
  if (act === 'wait') { if (sel !== null) B.wait(b.pieces[sel]); aim = false; sel = nextIdle(); render(); return; }
  if (act === 'kyoho') { aim = !aim; render(); return; }
  if (act === 'nanori') { const f = b.pieces[+el.dataset.id!]; if (f && B.startDuel(b, f)) { sel = null; aim = false; } render(); return; }
  if (act === 'duel') { B.duelRound(b, el.dataset.id as B.Move); render(); return; }
  if (act === 'duel-end') { B.endDuel(b); last = b.log[b.log.length - 1] ?? ''; sel = b.over ? null : nextIdle(); render(); return; }
  if (act === 'end') { await foeTurn(); return; }
  if (act === 'auto') { busy = true; render(); B.autoAll(b); last = b.log[b.log.length - 1] ?? ''; busy = false; sel = null; render(); return; }
  if (act === 'retreat') { B.retreat(b); render(); return; }
  if (el.dataset.x === undefined || b.over || b.phase !== 'me') return;
  const x = +el.dataset.x, y = +el.dataset.y!, p = B.at(b, x, y), s = sel !== null ? b.pieces[sel] : null;
  if (aim && s && p && B.kyohoTargets(b, s).includes(p)) { last = B.kyoho(b, s, p); aim = false; sel = nextIdle(); render(); return; }
  if (aim) { aim = false; render(); return; }
  if (s && me(s) && p && p.side !== s.side && B.targets(b, s).includes(p)) { last = B.attack(b, s, p); sel = b.over ? null : nextIdle(); render(); return; }
  if (s && me(s) && !p && B.reach(b, s).some((t) => t.x === x && t.y === y)) { B.move(b, s, x, y); if (!B.targets(b, s).length && s.kind !== 'kiba') { /* 攻める敵がなければ選んだまま。待機で終える */ } render(); return; }
  sel = p ? p.id : null; render();
}
function duelHtml(D: B.Duel) {
  const me = b!.pieces[D.me], f = b!.pieces[D.foe];
  const pct = (r: 0 | 1 | -1) => Math.round(B.duelChance(b!, r) * 100);
  const moves = (['seme', 'uke', 'kuzushi'] as B.Move[]).map((m) => `<button class="ban-btn main" data-b="duel" data-id="${m}">${B.MOVE_NAME[m]}</button>`).join('');
  return `<div class="ban-duel"><div class="ban-dbox"><h3>一騎討ち ― ${esc(me.name)} 対 ${esc(f.name)}</h3>
    <p class="ban-dsub">三合のうち二合を取れば勝ち。攻めるは崩すに、崩すは受けるに、受けるは攻めるに勝つ。読み勝てば一合を取る見込み${pct(1)}%、相打ちなら${pct(0)}%、読み負ければ${pct(-1)}%（武勇${me.bra}対${f.bra}）。</p>
    <p class="ban-dsub">${D.seen ? `${esc(f.name)}の癖: <b>${B.MOVE_NAME[D.habit]}</b>を好む（武芸の目で見抜いた）` : `${esc(f.name)}の癖は分からない（武芸二段から見抜ける）`}</p>
    <p class="ban-dscore">${esc(me.name)} ${'●'.repeat(D.myWins)}${'○'.repeat(2 - D.myWins)}　${'●'.repeat(D.foeWins)}${'○'.repeat(2 - D.foeWins)} ${esc(f.name)}</p>
    ${D.log.map((t) => `<p class="ban-dlog">${esc(t)}</p>`).join('')}
    ${D.over ? `<p class="ban-dres">${D.over === 'win' ? `${esc(f.name)}を打ち負かした！` : `${esc(f.name)}に敗れ、深手を負った……`}</p><button class="ban-btn main" data-b="duel-end">盤へ戻る</button>` : `<div class="ban-dacts">${moves}</div>`}
  </div></div>`;
}
// 次に動かせる自分の駒
const nextIdle = () => { const p = b!.pieces.find((q) => q.side === 'me' && q.alive && !q.acted && !q.confused); return p ? p.id : null; };
async function foeTurn() {
  if (!b || b.over) return;
  busy = true; sel = null;
  B.endPhase(b); render();
  for (const p of b.pieces.filter((q) => q.side === 'foe' && q.alive)) {
    if (b.over) break;
    const t = B.aiStep(b, p);
    if (t) last = t;
    render(); await sleep(reduced() ? 0 : 280);
  }
  B.endPhase(b);
  if (b.event) last = b.event;
  if (!b.over) for (const t of B.runConfused(b, 'me')) { last = t; render(); await sleep(reduced() ? 0 : 280); } // 惑っている味方は勝手に動く
  busy = false; sel = b.over ? null : nextIdle(); render();
}

// ───────── 地面（野戦と同じ絵・同じ描き方。盤ごとに一度だけ描き、駒のマスの下に敷く） ─────────
// 草地を全面に、二枚目の草地を薄く重ねる。丘・林は野戦の地形の絵（林は大きめに）。川は左から右への川筋（なめらかな曲線）に、河原・岸・水面・深みを塗る。柵は城の柵の帯
const IMG: Record<string, HTMLImageElement> = {};
const img = (n: string) => { let im = IMG[n]; if (!im) { im = new Image(); im.onload = () => drawGround(true); im.src = `tiles/battle/${n}.webp`; IMG[n] = im; } return im; };
const ok = (im?: HTMLImageElement): im is HTMLImageElement => !!im && im.complete && im.naturalWidth > 0;
let ground: HTMLCanvasElement | null = null, groundKey = '';
const pick = (x: number, y: number, n: number) => (x * 7 + y * 3 + x * y) % n;
function drawGround(force = false) {
  if (!b || !root) return;
  const grid = root.querySelector('.ban-grid') as HTMLElement | null; if (!grid) return;
  if (!ground) { ground = document.createElement('canvas'); ground.className = 'ban-bg'; }
  if (ground.parentElement !== grid) grid.prepend(ground);
  const W = grid.clientWidth, H = grid.clientHeight; if (!W || !H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${b.terr.join('')}:${W}x${H}:${dpr}`;
  if (!force && key === groundKey) return;
  groundKey = key;
  ground.width = Math.round(W * dpr); ground.height = Math.round(H * dpr);
  const c = ground.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const C = W / b.w, ctr = (x: number, y: number): [number, number] => [(x + 0.5) * C, (y + 0.5) * C];
  const pat = (im: HTMLImageElement, size: number, dx = 0, dy = 0) => { const p = c.createPattern(im, 'repeat'); p?.setTransform(new DOMMatrix().translate(dx, dy).scale(size / im.naturalWidth)); return p; };
  // 草地
  const g1 = img('grass1'), g2 = img('grass2'), wt = img('water');
  c.fillStyle = '#7d8a52'; c.fillRect(0, 0, W, H);
  if (ok(g1)) { c.fillStyle = pat(g1, C * 4.2)!; c.fillRect(0, 0, W, H); }
  if (ok(g2)) { c.globalAlpha = 0.35; c.fillStyle = pat(g2, C * 5.5, C * 1.7, C * 2.3)!; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  const cells = (t: B.Terr) => { const out: [number, number][] = []; for (let y = 0; y < b!.h; y++) for (let x = 0; x < b!.w; x++) if (B.terrAt(b!, x, y) === t) out.push([x, y]); return out; };
  const sprite = (name: string, x: number, y: number, size: number, up = 0) => { const im = img(`${name}${pick(x, y, 3) + 1}`); if (!ok(im)) return; const [cx, cy] = ctr(x, y); c.drawImage(im, cx - size / 2, cy - size / 2 - up, size, size); };
  // 丘
  for (const [x, y] of cells('oka')) sprite('oka', x, y, C * 1.5);
  // 川: 一列に一マス（ずれる列は二マス）を左から順に結ぶ。盤の左右の端は外へ流れ出る
  const rs = cells('kawa');
  if (rs.length) {
    const cols = new Map<number, number[]>(); for (const [x, y] of rs) cols.set(x, [...(cols.get(x) ?? []), y]);
    const pts: [number, number][] = []; let py = -1;
    for (const x of [...cols.keys()].sort((p, q) => p - q)) { const ys = cols.get(x)!.sort((p, q) => Math.abs(p - py) - Math.abs(q - py)); for (const y of ys) { pts.push(ctr(x, y)); py = y; } }
    if (pts.length) {
      if (cols.has(0)) pts.unshift([pts[0][0] - C * 2, pts[0][1]]);
      if (cols.has(b.w - 1)) pts.push([pts[pts.length - 1][0] + C * 2, pts[pts.length - 1][1]]);
      const path = new Path2D(); path.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length - 1; k++) path.quadraticCurveTo(pts[k][0], pts[k][1], (pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2);
      path.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
      c.filter = `blur(${Math.max(2, C * 0.12)}px)`; c.strokeStyle = 'rgba(88,74,44,0.6)'; c.lineWidth = C * 1.25; c.stroke(path); // 河原
      c.filter = `blur(${Math.max(1, C * 0.03)}px)`; c.strokeStyle = 'rgba(70,62,40,0.55)'; c.lineWidth = C * 0.92; c.stroke(path); c.filter = 'none'; // 岸
      c.strokeStyle = (ok(wt) ? pat(wt, C * 3) : null) ?? '#5f8c96'; c.lineWidth = C * 0.82; c.stroke(path); // 水面
      c.filter = `blur(${Math.max(2, C * 0.1)}px)`; c.strokeStyle = 'rgba(18,36,42,0.16)'; c.lineWidth = C * 0.4; c.stroke(path); c.filter = 'none'; // 流れの深み
      c.restore();
    }
  }
  // 柵: 柵の絵（assets/ban の 07_柵）があればマスに立て、なければ城の柵の帯をマスの中ほどに横に渡す
  const sa = BAN_ART.saku_f?.[0];
  if (sa) { let im = IMG['ban-saku']; if (!im) { im = new Image(); im.onload = () => drawGround(true); im.src = sa; IMG['ban-saku'] = im; } if (ok(im)) for (const [x, y] of cells('saku')) { const [cx, cy] = ctr(x, y); c.drawImage(im, cx - C * 0.6, cy - C * 0.7, C * 1.2, C * 1.2); } }
  const sk = img('w_saku');
  if (!sa && ok(sk)) for (const [x, y] of cells('saku')) { const [cx, cy] = ctr(x, y), sw = sk.naturalHeight * 2; c.drawImage(sk, (x * sw) % (sk.naturalWidth - sw), 0, sw, sk.naturalHeight, cx - C / 2, cy - C * 0.28, C, C * 0.56); }
  // 林（大きめ。上の行から順に重ねる）
  for (const [x, y] of cells('mori')) sprite('mori', x, y, C * 1.8, C * 0.12);
}
const CSS = `
.ban{position:fixed;inset:0;z-index:95;background:rgba(8,6,4,.92);display:flex;align-items:center;justify-content:center;overflow:auto;color:#eadfc8;font-family:"Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif}
.ban[hidden]{display:none}
.ban-wrap{box-sizing:border-box;width:min(980px,100%);padding:16px;margin:auto}
.ban-head{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;margin-bottom:10px}.ban-head b{font-size:20px;color:#cfa95e}.ban-head span{font-size:13px;opacity:.85}
.ban-body{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
.ban-grid{position:relative;display:grid;gap:0;flex:0 1 auto;width:min(480px,100%);aspect-ratio:8/10;background-color:#7d8a52;border:1px solid rgba(207,169,94,.55);border-radius:4px;box-sizing:border-box;overflow:visible}
.bc{position:relative;border:0;padding:0;margin:0;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;min-width:0;min-height:0;font:inherit;color:inherit;box-shadow:inset 0 0 0 .5px rgba(30,22,12,.35);z-index:1}
.ban-bg{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}
.bc.reach{box-shadow:inset 0 0 0 3px rgba(80,170,230,.95)}.bc.tgt{box-shadow:inset 0 0 0 3px rgba(225,70,60,.95)}.bc.sel{box-shadow:inset 0 0 0 3px #f2d27a}
.pc{position:relative;width:78%;aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:clamp(14px,4.2vw,22px);font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,.5);overflow:hidden}
.pc{z-index:1}.pc.me{background:#f1e6c8;color:#1d2b4a;border:3px solid var(--me)}.pc.foe{background:#2a1a16;color:#f3d9c8;border:3px solid var(--foe)}
.pa{position:relative;z-index:1;width:100%;height:100%;display:block}
.pa img{position:absolute;left:50%;bottom:9%;height:calc(128% * var(--sc,1));width:auto;max-width:none;transform:translateX(-50%);filter:drop-shadow(0 3px 2px rgba(0,0,0,.55));pointer-events:none}.pa.done img{opacity:.55}
.pa .base{position:absolute;left:16%;right:16%;bottom:4%;height:15%;border-radius:50%;border:2px solid var(--me);background:color-mix(in srgb,var(--me) 35%,transparent)}.pa.foe .base{border-color:var(--foe);background:color-mix(in srgb,var(--foe) 35%,transparent)}
.pa.hero .base{border-color:#e0b04a;box-shadow:0 0 6px #e0b04a}.pa.sho .base{border-color:#ff8a5a;box-shadow:0 0 6px #ff8a5a}
.pa em{position:absolute;left:0;right:0;bottom:6px;text-align:center;font-size:9.5px;font-style:normal;color:#fff;text-shadow:0 0 2px #000,0 0 2px #000;white-space:nowrap;overflow:hidden}
.pa.hero em{color:#f2d27a}.pa.sho em{color:#ffb08a}
.pa .hpb{position:absolute;left:8%;bottom:1px;height:4px;max-width:84%;background:#5bc06a}.pa.foe .hpb{background:#e0604f}
.pc.hero{border-color:#e0b04a;box-shadow:0 0 0 2px #e0b04a,0 2px 4px rgba(0,0,0,.5)}.pc.sho{border-color:#ff8a5a;box-shadow:0 0 0 2px #ff8a5a}
.pc.done{opacity:.55}
.pc u{position:absolute;top:0;right:0;font-size:10px;line-height:1;padding:2px 3px;background:#8a3fb0;color:#fff;text-decoration:none;border-radius:0 0 0 4px}.pc u.fl{background:#8a6a2a}
.bc.kyo{box-shadow:inset 0 0 0 3px rgba(170,90,220,.95)}
.ban-btn.kyo{border-color:#a070c8}.ban-btn.duel{grid-column:1/-1;background:#6b2a1c;border-color:#e0a060}
.ban-duel{position:fixed;inset:0;z-index:2;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
.ban-dbox{width:min(560px,100%);max-height:100%;overflow:auto;background:#1c1510;border:1px solid #e0a060;border-radius:6px;padding:16px 18px;box-sizing:border-box}.ban-dbox h3{margin:0 0 8px;color:#f2d27a}
.ban-dsub{font-size:13px;margin:4px 0;opacity:.9}.ban-dscore{font-size:20px;letter-spacing:2px;text-align:center;margin:10px 0;color:#f2d27a}.ban-dlog{margin:2px 0;font-size:13.5px}.ban-dres{font-size:17px;color:#f2d27a;margin:10px 0}
.ban-dacts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
.ban-kyo{display:flex;flex-direction:column;gap:2px;border:1px solid #a070c8;padding:6px 10px;border-radius:4px;font-size:13px}.ban-kyo b{color:#d0a8f0}
.pc .hpb{position:absolute;left:0;bottom:0;height:4px;background:#5bc06a}.pc.foe .hpb{background:#e0604f}
.ban-side{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:8px}
.ban-info{display:flex;flex-direction:column;gap:2px;border:1px solid rgba(207,169,94,.4);padding:8px 10px;border-radius:4px}.ban-info b{color:#cfa95e}.ban-info span{font-size:13px}.ban-info em{color:#e0a060;font-style:normal}
.ban-hint{font-size:13px;opacity:.85;margin:0}
.ban-last{margin:0;padding:6px 10px;background:rgba(207,169,94,.1);border-left:3px solid #cfa95e;font-size:14px}
.ban-acts{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ban-btn{font:inherit;color:#eadfc8;background:#2b2219;border:1px solid rgba(207,169,94,.55);padding:9px 8px;border-radius:4px;cursor:pointer;min-height:40px}.ban-btn.main{background:#5a3c1c;border-color:#cfa95e}.ban-btn.dim{opacity:.85}.ban-btn:disabled{opacity:.4;cursor:default}
.ban-log p{margin:0 0 3px;font-size:12.5px;opacity:.85}.ban-log p:first-child{opacity:1}
.ban-over{display:flex;flex-direction:column;gap:6px;border:1px solid #cfa95e;padding:10px 12px;border-radius:4px;background:rgba(207,169,94,.08)}.ban-over b{color:#f2d27a;font-size:17px}
@media (max-width:560px){.ban-wrap{padding:12px 16px}.ban-grid{width:100%}}
`;

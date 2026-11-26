// 合戦（ヘックスの盤）の演出: 開戦の口上（場面）・戦の声（盤の隅に顔つきの一言）・決着の一言（結果の札）
// 掛け合いを省く設定（sengoku-kake = off）なら、どれも出さない
import * as K from '../data/kassen_kake';
import type { Beat } from '../data/story_toshiie';
import { PORTRAITS } from '../data/portraits';
import { hqOf, type Tactical, type TEv } from '../engine/tactical';
import { temperOf } from '../engine/lines';
import { clanName } from '../engine/state';
import type { GameState, General } from '../engine/types';

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const kakeOn = () => { try { return localStorage.getItem('sengoku-kake') !== 'off'; } catch { return true; } };
const hash = (k: string) => { let h = 2166136261; for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619); return h >>> 0; };
const pick = (arr: string[], key: string) => arr[hash(key) % arr.length];
const fill = (x: string, v: Record<string, string>) => x.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
const gOf = (s: GameState, id: string | null | undefined): General | null => (id ? s.generals[id] ?? null : null);
const sideClan = (t: Tactical, side: 'A' | 'D') => (side === 'A' ? t.attackerClan : t.defenderClan);
const famName = (s: GameState, clan: string | null) => (clan ? clanName(s, clan) : '一揆の衆');
// その側の総大将（本陣の将）
export const chiefOf = (s: GameState, t: Tactical, side: 'A' | 'D') => gOf(s, hqOf(t, side)?.general);

// ───────── 開戦の口上 ─────────
let openedTurn = -1; // 同じ月に二度は出さない（大名は一月に何度も戦う）
// 出すのは、自分（主人公・当主）が本陣にいる合戦か、敵の本陣に大名自らがいる合戦。城攻めの二か月目からは出さない
export function openingBeats(s: GameState, t: Tactical): Beat[] {
  if (!kakeOn() || !t.playerSide || openedTurn === s.turn) return [];
  const me = t.playerSide, en = me === 'A' ? 'D' : 'A';
  const mine = chiefOf(s, t, me), foe = chiefOf(s, t, en);
  if (!mine || !foe) return [];
  const meId = s.hero?.id ?? s.clans[s.player]?.leader;
  const foeLord = !!foe.clan && s.clans[foe.clan]?.leader === foe.id;
  if (mine.id !== meId && !foeLord) return [];
  const sv = t.castle !== null ? s.sieges?.[t.castle] : undefined;
  if (t.kind === 'siege' && sv && sv.months > 0) return [];
  openedTurn = s.turn;
  const c = t.castle !== null ? s.castles[t.castle].name : '';
  const atk = chiefOf(s, t, 'A')!, def = chiefOf(s, t, 'D')!;
  const v = (g: General, side: 'A' | 'D') => ({ foe: famName(s, sideClan(t, side === 'A' ? 'D' : 'A')), c });
  const line = (g: General, side: 'A' | 'D') => fill(pick((side === 'A' ? K.OPEN_ATK : t.kind === 'siege' ? K.OPEN_CASTLE : K.OPEN_DEF)[temperOf(g)], `${g.id}|open|${s.turn}`), v(g, side));
  const narr = fill(t.kind === 'field' ? K.OPEN_NARR.field : me === 'A' ? K.OPEN_NARR.siege : K.OPEN_NARR.siegeDef, { c });
  const head = t.kind === 'siege' ? `${c}攻め` : '開戦';
  const bg = t.kind === 'field' ? 'senjo' : me === 'A' ? 'jinmaku' : 'tenshu_dawn'; // 野戦は戦場、城攻めは陣幕、籠城は天守
  // 敵の大将が先に口上を述べ、自分の側が受ける
  const first = en === 'A' ? atk : def, second = en === 'A' ? def : atk;
  return [
    { bg, head, text: narr },
    { head, who: first.id, name: first.name, text: line(first, en) },
    { head, who: second.id, name: second.name, text: line(second, me) },
  ];
}

// ───────── 戦の声 ─────────
type Bark = { gid?: string; name: string; text: string; side: 'mine' | 'foe'; pri: number };
let queue: Bark[] = [], showing = false, routN = 0, lateShown: Tactical | null = null, forT: Tactical | null = null, box: HTMLElement | null = null;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export function clearBarks() { queue = []; box?.replaceChildren(); }
export function resetBarks(t: Tactical) { if (forT !== t) { forT = t; queue = []; routN = 0; lateShown = null; box?.replaceChildren(); } }
// 委任で一気に解く時などは、溜まった出来事を声にせず捨てる
export function dropEvents(t: Tactical) { t.ev = []; queue = []; }
function say(b: Bark) {
  if (queue.length >= 2 && b.pri < 2) return; // 重なれば、大事なもの（本陣・討死・伏兵・門）だけ残す
  if (queue.length >= 3) queue.shift();
  queue.push(b);
  if (!showing) next();
}
function faceHtml(gid: string | undefined, name: string) {
  const src = gid ? PORTRAITS[gid] : undefined;
  return src ? `<img src="${src}" alt="">` : `<span class="bt-koe-noface">${esc(name.slice(0, 2))}</span>`;
}
function next() {
  const b = queue.shift();
  if (!b) { showing = false; return; }
  showing = true;
  if (!box) { box = document.createElement('div'); box.className = 'bt-koe-box'; }
  const host = document.querySelector('#battle .bt-field') as HTMLElement | null; if (host && box.parentElement !== host) host.appendChild(box);
  const el = document.createElement('div'); el.className = `bt-koe ${b.side}`;
  el.innerHTML = `${faceHtml(b.gid, b.name)}<div><b>${esc(b.name)}</b><p>「${esc(b.text)}」</p></div>`;
  box.appendChild(el);
  const hold = reduced() ? 1400 : 2300;
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); next(); }, hold);
}
// 合戦の出来事を読み、自分の側から見た叫びにする（画面を描き直すたびに呼ぶ）
export function drain(s: GameState, t: Tactical) {
  resetBarks(t);
  const evs = t.ev ?? []; t.ev = [];
  if (!kakeOn() || !t.playerSide) return;
  const me = t.playerSide;
  const chief = chiefOf(s, t, me) ?? gOf(s, s.hero?.id) ?? gOf(s, s.clans[s.player]?.leader);
  const T = (g: General | null) => (g ? temperOf(g) : 'steady');
  const by = (g: General | null, pool: Record<K.T4, string[]>, key: string, v: Record<string, string>, pri: number): void => {
    if (!g) return; say({ gid: g.id, name: g.name, text: fill(pick(pool[T(g)], key), v), side: 'mine', pri });
  };
  for (const e of evs) {
    const ours = e.side === me, key = `${e.k}|${e.u ?? e.g}|${t.turn}`;
    const v = { u: e.u ?? '', g: gOf(s, e.g)?.name ?? '', foe: famName(s, sideClan(t, me === 'A' ? 'D' : 'A')) };
    switch (e.k as TEv['k']) {
      case 'rout': if (routN++ < 3) by(chief, ours ? K.V_ROUT_MINE : K.V_ROUT_FOE, key, v, 1); break;
      case 'hqFall': if (ours) say({ name: '旗本', text: pick(K.V_HQ_MINE, key), side: 'mine', pri: 3 }); else by(chief, K.V_HQ_FOE, key, v, 3); break;
      case 'death': if (e.g === chief?.id) break; by(chief, ours ? K.V_KILL_MINE : K.V_KILL_FOE, key, v, 3); break;
      case 'capture': if (!ours) by(chief, K.V_CAPTURE, key, v, 2); break;
      case 'ambush': if (ours) by(gOf(s, e.g) ?? chief, K.V_AMBUSH_MINE, key, v, 2); else by(chief, K.V_AMBUSH_FOE, key, v, 2); break;
      case 'first': if (ours) { const g = gOf(s, e.g); if (g) by(g, K.V_FIRST, key, { ...v, g: g.name }, 1); } break;
      case 'gate': say({ gid: chief?.id, name: chief?.name ?? '物頭', text: pick(ours ? K.V_GATE_MINE : K.V_GATE_FOE, key), side: 'mine', pri: 2 }); break;
      case 'fire': say({ gid: chief?.id, name: chief?.name ?? '物頭', text: pick(ours ? K.V_FIRE_MINE : K.V_FIRE_FOE, key), side: 'mine', pri: 1 }); break;
      case 'sneak': say({ gid: chief?.id, name: chief?.name ?? '物頭', text: pick(ours ? K.V_SNEAK_MINE : K.V_SNEAK_FOE, key), side: 'mine', pri: 2 }); break;
    }
  }
  // 最後の刻（野戦は日暮れ・城攻めは月越し）: 自分の手番の始まりに一度
  if (t.turn >= t.maxTurn && t.phase === me && lateShown !== t && !t.over && chief) { lateShown = t; by(chief, K.V_LATE[t.kind], `late|${s.turn}`, v0(), 1); }
}
const v0 = () => ({});

// ───────── 決着の一言（結果の札に添える） ─────────
export function endLineHtml(s: GameState, t: Tactical): string {
  if (!kakeOn() || !t.playerSide) return '';
  const me = t.playerSide, g = chiefOf(s, t, me) ?? gOf(s, s.hero?.id) ?? gOf(s, s.clans[s.player]?.leader);
  if (!g) return '';
  const won = t.over === me, draw = t.over === 'draw';
  const pool = won ? K.END_WIN : !draw ? K.END_LOSE : t.kind === 'siege' ? (me === 'A' ? K.END_SIEGE_GO : K.END_SIEGE_HOLD) : K.END_DRAW;
  const text = fill(pick(pool[temperOf(g)], `${g.id}|end|${s.turn}|${t.turn}`), { foe: famName(s, sideClan(t, me === 'A' ? 'D' : 'A')) });
  return `<div class="bt-koe end">${faceHtml(g.id, g.name)}<div><b>${esc(g.name)}</b><p>「${esc(text)}」</p></div></div>`;
}

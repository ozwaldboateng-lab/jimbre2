// 武将プレイ（試作）の画面: 城下の一枚絵・行ける所・人の一覧・言葉の窓・日記。旅は日本地図の上を部隊の移動と同じように進む
import { SCENE_ART } from '../data/sceneArt';
import { MINATO_ART } from '../data/scenes';
import { runClanAI } from '../engine/ai';
import { endTurn } from '../engine/game';
import * as H from '../engine/hero';
import { HEXES, PROVINCES } from '../engine/map';
import { MapView } from './render';
import { carryHero, nextStory, storyDue, storyJump } from '../engine/story2';
import * as M from '../engine/maeda';
import type { Beat } from '../data/story_toshiie';
import { PORTRAITS } from '../data/portraits';
import { STORY_PORTRAITS } from '../data/portraits_story';
import * as R from '../engine/rules';
import { rankName } from '../engine/ranks';
import { newGame } from '../engine/setup';
import { castleAt, clanCastles, clanName } from '../engine/state';
import type { GameState, General } from '../engine/types';

const KEY = 'sengoku-hero-auto';
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ART = (k: string) => SCENE_ART[k] ?? (k === 'minato' ? MINATO_ART : undefined);
const BG: Record<string, string> = { town: 'ichi', tojo: 'zashiki_day', yashiki: 'zashiki_night', chaya: 'chashitsu', ichi: 'ichi', dojo: 'jinmaku', tera: 'hondo', tabi: 'yukimichi', nanban: 'minato', fushin: 'ishigaki', teisatsu: 'tsukiyo', choryaku: 'zashiki_night', month: 'tsukiyo' };

type Face = (id: string | null | undefined, w: number) => string;
let s: GameState | null = null;
let face: Face = () => '';
let onQuit: () => void = () => {};
let root: HTMLElement | null = null;
let pane: 'spots' | 'yashiki' | 'tabi' | 'diary' = 'spots';
let bg = 'town';
let say: { who?: string; line?: string; text: string } | null = null;
let busy = false;
let report: string[] | null = null;
let mapCanvas: HTMLCanvasElement | null = null;
let view: MapView | null = null;
let heroImg: HTMLImageElement | null = null;
let recenter = true; // 地図を主人公のマスへ寄せ直すか（旅を始めたとき・進んだとき）
// 物語の利家は、家督のあと壮年の顔に
const midAge = (st: GameState) => st.hero?.story === 'toshiie' && (st.hero.storyDone ?? []).includes('katoku') && !!STORY_PORTRAITS.toshiie_mid;
const myFace = (st: GameState, w: number) => midAge(st) ? `<img class="face" src="${STORY_PORTRAITS.toshiie_mid}" width="${w}" height="${Math.round(w * 1.25)}" alt="">` : face(st.hero!.id, w);
const mapMode = (st: GameState) => pane === 'tabi' || (!!st.hero!.field && !H.inArmy(st));

export function heroSaved(): boolean { try { return !!localStorage.getItem(KEY); } catch { return false; } }
function save() { try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* 保存できなくても続ける */ } }

// 入り口: 主人公を選ぶ画面から
export function openHero(f: Face, quit: () => void) {
  face = f; onQuit = quit;
  mount();
  s = null; pane = 'spots'; say = null; report = null;
  renderPick();
}
function mount() {
  if (!document.getElementById('hero-style')) { const st = document.createElement('style'); st.id = 'hero-style'; st.textContent = CSS; document.head.appendChild(st); }
  root = document.getElementById('hero');
  if (!root) { root = document.createElement('div'); root.id = 'hero'; document.body.appendChild(root); root.addEventListener('click', onClick); }
  root.hidden = false;
}
function close() { if (root) root.hidden = true; onQuit(); }

// ───────── 主人公を選ぶ（試作は1560年の織田家） ─────────
let pickState: GameState | null = null;
const PICKS = ['kinoshita_tokichiro', 'maeda_toshiie', 'takigawa_kazumasu', 'sassa_narimasa', 'kawajiri_hidetaka', 'ikeda_tsuneoki', 'niwa_nagahide', 'shibata_katsuie'];
function renderPick() {
  pickState = newGame('oda', 'normal', undefined, '1560');
  const gs = PICKS.map((id) => pickState!.generals[id]).filter((g): g is General => !!g && g.clan === 'oda' && g.status !== 'young' && g.status !== 'dead');
  root!.innerHTML = `<div class="hr-pick">
    <div class="hr-top"><button class="hr-btn ghost" data-h="quit">← タイトルへ</button><span class="hr-tag">武将で遊ぶ（試作）</span></div>
    <h2>永禄三年 尾張 ― 織田家の家臣として生きる</h2>
    <p class="hr-lede">桶狭間の勝ちから間もない清洲。大名の織田家は信長（AI）が動かす。あなたは家臣の一人として城下を歩き、主命を果たし、人と交わって出世を目指す。1か月は上旬・中旬・下旬の3旬。1旬に一つ行う。</p>
    ${heroSaved() ? '<div class="hr-cont"><button class="hr-btn primary" data-h="continue">続きから</button></div>' : ''}
    <div class="hr-grid">${gs.map((g) => `<button class="hr-card" data-h="pick" data-id="${g.id}">${face(g.id, 96) || `<span class="hr-noface">${esc(g.name.slice(0, 2))}</span>`}
      <b>${esc(g.name)}</b><span>${R.RANK_NAME[g.rank]}・${pickState!.year - (g.born ?? pickState!.year)}歳</span><span class="hr-st">武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}</span></button>`).join('')}</div>
  </div>`;
}

// 物語（前田利家 ― 残り火）の第一幕から、1560年の世界の武将で遊ぶへ引き継ぐ
export function openHeroWith(f: Face, quit: () => void, st: GameState, first: { who?: string; line?: string; text: string }) {
  face = f; onQuit = quit;
  mount();
  s = st; pane = 'spots'; bg = 'town'; report = null; recenter = true; say = first;
  save(); render();
  runStory();
}
// ───────── 本体 ─────────
function begin(id: string) {
  s = pickState ?? newGame('oda', 'normal', undefined, '1560');
  H.startHero(s, id);
  bg = 'town'; pane = 'spots';
  const me = H.heroOf(s)!, L = H.lordOf(s);
  say = { who: L?.id, line: `${me.name}か。この清洲の城下で励め。主命は登城して受けよ。`, text: `${me.name}として、${s.castles[s.hero!.town].name}の城下に立った。` };
  save(); render();
}
function render() {
  if (!s || !root) return;
  const st = s, Hh = st.hero!, me = H.heroOf(st)!, c = st.castles[Hh.town], L = H.lordOf(st);
  const q = Hh.quest;
  const next = me.rank > 0 ? R.MERIT_AT[me.rank - 1] : null;
  const art = !H.inArmy(st) && bg === 'town' && Hh.fuchu === Hh.town && !Hh.field && SCENE_ART.story_fuchu ? SCENE_ART.story_fuchu : ART(H.inArmy(st) ? 'jinmaku' : BG[bg] ?? 'ichi');
  root.innerHTML = `<div class="hr-main">
    <header class="hr-head">
      <div class="hr-id">${myFace(st, 56)}<div><b>${esc(me.name)}</b><span>${clanName(st, me.clan!)}家・${R.RANK_NAME[me.rank]}${Hh.title ? `・${esc(Hh.title)}` : ''}</span></div></div>
      <div class="hr-date">${H.JUN_NAME[Math.min(2, Hh.jun)]}<small>${st.year}年${st.month}月</small></div>
      <dl class="hr-stats"><dt>金</dt><dd>${Hh.gold}貫</dd><dt>進物</dt><dd>${Hh.goods}</dd><dt>主君の覚え</dt><dd>${Hh.favor}</dd><dt>功績</dt><dd>${Math.round(me.merit)}${next !== null ? `<small>／${next}で${R.RANK_NAME[me.rank - 1]}</small>` : ''}</dd>
      <dt>武・知・統・魅</dt><dd>${me.bra}・${me.int}・${me.lea}・${me.cha}</dd>${Hh.ie ? `<dt>前田家</dt><dd title="荒子衆・蔵・家中・村の疲れ">衆${Hh.ie.shu}・蔵${Hh.ie.kura}石・家中${Hh.ie.kachu}・村疲${Hh.ie.mura}</dd>` : ''}</dl>
      <button class="hr-btn ghost" data-h="quit" title="保存してタイトルへ">中断</button>
    </header>
    ${Hh.fuchu !== undefined && !(Hh.storyDone ?? []).includes('ryo') ? `<div class="hr-quest"><b>府中</b> ${esc(M.fuchuText(st))}</div>` : ''}
    <div class="hr-quest">${q ? `<b>主命</b> ${esc(H.QUEST_NAME[q.kind])}：${esc(H.questText(st, q))} <span>${q.done >= q.need ? '<em>果たした。登城して報告せよ</em>' : `期日まで${Math.max(0, q.until - st.turn)}か月`}</span>` : `<b>主命</b> なし。${L ? `主君${esc(L.name)}は${esc(st.castles[L.loc].name)}にいる。登城すれば主命を受けられる。` : ''}`}</div>
    <div class="hr-body">
      <section class="hr-scene${mapMode(st) ? ' map' : ''}" style="${art && !mapMode(st) ? `background-image:url(${art})` : ''}">
        ${mapMode(st) ? '<div id="hr-mapslot"></div>' : ''}
        <div class="hr-town">${H.inArmy(st) ? (() => { const a = H.inArmy(st)!; return `<b>${esc(st.generals[a.main]?.name ?? '')}の陣中</b><span>${esc(castleAt(st, a.hex)?.name ?? PROVINCES[HEXES[a.hex].p].name + 'の野')}・兵${a.troops.toLocaleString('ja-JP')}・士気${a.morale.toFixed(2)}</span>`; })() : Hh.field ? `<b>${esc(PROVINCES[HEXES[Hh.hex].p].name)}の野</b><span>旅の途中</span>` : `<b>${esc(c.name)}の城下</b><span>${c.owner ? `${esc(clanName(st, c.owner))}家の城` : '国人の城'}${c.owner && c.owner !== me.clan ? '（他国）' : ''}</span>`}</div>
        ${say ? `<div class="hr-say${mapMode(st) ? ' mini' : ''}">${say.who && say.line ? `<div class="hr-who">${face(say.who, 128) || ''}<div><b>${esc(st.generals[say.who]?.name ?? '')}</b><p>「${esc(say.line)}」</p></div></div>` : ''}<p class="hr-text">${esc(say.text)}</p></div>` : ''}
      </section>
      <aside class="hr-side">
        <nav class="hr-tabs">${(['spots', 'yashiki', 'tabi', 'diary'] as const).map((k) => `<button class="${pane === k ? 'on' : ''}" data-h="pane" data-id="${k}">${{ spots: '城下', yashiki: '屋敷', tabi: '旅', diary: '日記' }[k]}</button>`).join('')}</nav>
        <div class="hr-pane">${pane === 'spots' ? spotsHtml(st) : pane === 'yashiki' ? peopleHtml(st) : pane === 'tabi' ? travelHtml(st) : diaryHtml(st)}</div>
      </aside>
    </div>
    ${report ? `<div class="hr-modal"><div class="hr-report"><h3>${st.year}年${st.month}月を迎えた</h3><ul>${report.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><button class="hr-btn primary" data-h="report-ok">城下へ</button></div></div>` : ''}
    ${busy ? '<div class="hr-modal"><div class="hr-busy">諸国の動き……</div></div>' : ''}
  </div>`;
  if (mapMode(st)) attachMap(st);
}
// 地図: 一度作ったキャンバスを使い回し、描き直すたびに差し込む
function attachMap(st: GameState) {
  const slot = document.getElementById('hr-mapslot');
  if (!slot) return;
  if (!mapCanvas) { mapCanvas = document.createElement('canvas'); mapCanvas.className = 'hr-map'; }
  slot.appendChild(mapCanvas);
  if (!view) { view = new MapView(mapCanvas); view.onHexClick = (hex) => onHex(hex); }
  view.state = st;
  view.resize();
  const Hh = st.hero!;
  view.sel = { army: null, hex: null, reach: busy ? null : H.heroReach(st), targets: [] };
  const dest = Hh.dest !== null && Hh.dest !== undefined ? Hh.dest : null;
  view.marks = dest !== null ? { hexes: [dest], arrows: [[Hh.hex, dest]] } : null; // 点滅する輪は行き先に
  const src = midAge(st) ? STORY_PORTRAITS.toshiie_mid : PORTRAITS[Hh.id];
  if (src) { if (!heroImg || heroImg.dataset.id !== src.slice(-24)) { heroImg = new Image(); heroImg.dataset.id = src.slice(-24); heroImg.src = src; } view.heroMark = { hex: Hh.hex, img: heroImg }; }
  else { view.heroMark = null; view.marks = { hexes: [Hh.hex, ...(dest !== null ? [dest] : [])], arrows: view.marks?.arrows ?? [] }; } // 顔がなければ輪で
  if (recenter) { view.centerOn(Hh.hex, Math.min(2.2, Math.max(1.3, view.w / 520))); recenter = false; }
  view.redraw();
}
function onHex(hex: number) {
  if (!s || busy || report) return;
  if (hex === s.hero!.hex) { const c = castleAt(s, hex); say = { text: c ? `ここは${c.name}の城下。` : 'ここで足を止めている。' }; render(); return; }
  recenter = true;
  void act(() => H.moveTo(s!, hex), 'tabi').then(() => { if (root && window.innerWidth <= 820) root.scrollTo({ top: 0 }); }); // 狭い画面では地図へ戻す
}
function spotsHtml(st: GameState) {
  if (st.hero!.over) return `<p class="hr-note">${esc(st.hero!.over)}</p><button class="hr-spot main" data-h="quit"><b>タイトルへ</b><span>この遊びは終わった</span></button>`;
  const a = H.inArmy(st);
  if (a) return `<p class="hr-note">${esc(st.generals[a.main]?.name ?? '')}の軍勢にいる。軍勢は大名（AI）の采配で動き、合戦もこの軍勢とともに戦う（勝てば功績が入る）。</p>
    <button class="hr-spot" data-h="campwait"><b>陣中で過ごす</b><span>1旬。戦を待つ</span></button>
    <button class="hr-spot" data-h="visit" data-id="${a.main}"><b>軍議に出る</b><span>主将${esc(st.generals[a.main]?.name ?? '')}を訪ねる（1旬）</span></button>
    <button class="hr-spot" data-h="pane" data-id="yashiki"><b>陣中の武将を訪ねる</b><span>同じ軍勢の顔ぶれ</span></button>
    <button class="hr-spot dim" data-h="leavecamp"><b>陣を離れる</b><span>敵が近いときは離れられない</span></button>`;
  const join = H.armiesHere(st).map((x) => `<button class="hr-spot main" data-h="join" data-id="${x.id}"><b>陣に加わる</b><span>${esc(st.generals[x.main]?.name ?? '')}の軍勢（兵${x.troops.toLocaleString('ja-JP')}）${st.hero!.quest?.kind === 'shutsujin' && st.hero!.quest.army === x.id ? '・主命の軍勢' : ''}</span></button>`).join('');
  if (st.hero!.field) return join +  `<p class="hr-note">城下ではない野にいる。旅を続けるか、休むことしかできない。</p><button class="hr-spot" data-h="pane" data-id="tabi"><b>旅を続ける</b><span>地図で行き先を選ぶ</span></button><button class="hr-spot dim" data-h="rest"><b>休む</b><span>1旬を過ごす</span></button>`;
  const c = st.castles[st.hero!.town];
  const spots = H.spotsOf(st, c);
  const work = H.canWork(st) ? `<button class="hr-spot main" data-h="work"><b>主命を果たす</b><span>${esc(H.QUEST_NAME[st.hero!.quest!.kind])}（1旬）</span></button>` : '';
  const desc: Record<H.Spot, string> = { tojo: '主命を受ける・報告する', yashiki: '武将を訪ねて親しくなる', chaya: '噂を聞く。他国なら城の様子も', ichi: `進物を買う（${H.HERO.GOODS_COST}貫）`, dojo: `稽古で武勇・統率を磨く（${H.HERO.TRAIN_COST}貫）`, tera: `学問で知略・魅力を磨く（${H.HERO.TRAIN_COST}貫）`, tabi: 'ほかの城下へ', nanban: '南蛮の品と噂（試作では茶屋と同じ）' };
  const gov = M.canGovern(st) ? `<p class="hr-note">${esc(M.fuchuText(st))}</p>${(Object.keys(M.GOV_NAME) as M.GovAct[]).map((k) => `<button class="hr-spot${k === 'mimawari' ? ' main' : ''}" data-h="gov" data-id="${k}"><b>${M.GOV_NAME[k][0]}</b><span>${M.GOV_NAME[k][1]}</span></button>`).join('')}` : '';
  const adv = M.canAdvice(st) ? `<button class="hr-spot" data-h="advice"><b>家中の進言</b><span>奥村・村井の話を聞いて、前田家のことを決める（月に一度・1旬）</span></button>` : '';
  return `${work}${gov}${join}${adv}${spots.map((k) => `<button class="hr-spot" data-h="spot" data-id="${k}"><b>${H.SPOT_NAME[k]}</b><span>${desc[k]}</span></button>`).join('')}
    <button class="hr-spot dim" data-h="rest"><b>休む</b><span>1旬を過ごす</span></button>${(() => { const n = nextStory(st); return n ? `<button class="hr-spot" data-h="skip"><b>月日を送る</b><span>次の物語（${esc(n.when)}）まで時を跳ぶ。世の中の動きはそのまま、俸禄はまとめて</span></button>` : ''; })()}`;
}
function peopleHtml(st: GameState) {
  const me = H.heroOf(st)!;
  if (st.hero!.field && !H.inArmy(st)) return '<p class="hr-none">野にいて、訪ねられる屋敷はない。</p>';
  const ps = (H.inArmy(st) ? H.comrades(st) : H.townsfolk(st, st.hero!.town)).sort((a, b) => (st.hero!.rel[b.id] ?? 0) - (st.hero!.rel[a.id] ?? 0) || Number(b.clan === me.clan) - Number(a.clan === me.clan) || a.rank - b.rank);
  if (!ps.length) return '<p class="hr-none">この町に訪ねられる武将はいない。</p>';
  return `<p class="hr-note">訪ねる・進物を贈ると親しくなる（1旬）。親しさ${H.HERO.FRIEND}で「友」の縁を結ぶ。</p>${ps.map((g) => {
    const v = st.hero!.rel[g.id] ?? 0;
    return `<div class="hr-person">${face(g.id, 44) || `<span class="hr-noface sm">${esc(g.name.slice(0, 1))}</span>`}<div class="hr-pi"><b>${esc(g.name)}</b><span>${g.clan ? `${esc(clanName(st, g.clan))}・${rankName(st, g)}` : '浪人'}${g.status === 'governor' ? '・城主' : ''}</span><span class="hr-rel">${H.RELNAME(v)} ${v}</span></div>
      <div class="hr-pa"><button class="hr-btn sm" data-h="visit" data-id="${g.id}">訪ねる</button><button class="hr-btn sm" data-h="gift" data-id="${g.id}" ${st.hero!.goods < 1 && st.hero!.gold < H.HERO.GIFT_COST ? 'disabled' : ''}>進物</button></div></div>`;
  }).join('')}`;
}
function travelHtml(st: GameState) {
  const Hh = st.hero!, me = H.heroOf(st)!;
  const cost = H.costMap(st);
  const jun = (hex: number) => { const c = cost.get(hex); return c === undefined ? '—' : `${Math.max(1, Math.ceil(c / H.HERO.MP))}旬`; };
  const ids = new Set<number>();
  for (const c of clanCastles(st, me.clan!)) ids.add(c.i);
  if (Hh.quest) ids.add(Hh.quest.castle);
  const L = H.lordOf(st);
  if (L) ids.add(L.loc);
  for (const c of st.castles) if ((cost.get(c.hex) ?? Infinity) <= H.HERO.MP * 3) ids.add(c.i);
  if (!Hh.field) ids.delete(Hh.town);
  const key = (c: { i: number }) => Number(c.i === L?.loc || Hh.quest?.castle === c.i); // 主君・主命の城を先に
  const list = [...ids].map((i) => st.castles[i]).sort((a, b) => key(b) - key(a) || (cost.get(a.hex) ?? 999) - (cost.get(b.hex) ?? 999)).slice(0, 12);
  const dest = Hh.dest !== null && Hh.dest !== undefined ? Hh.dest : null;
  if (H.inArmy(st)) return '<p class="hr-note">陣中では軍勢とともに動く。地図は見るだけ。離れるなら「城下」の「陣を離れる」。</p>';
  return `<p class="hr-note">地図で行き先のマスを押す。明るいマスは1旬で行ける所（平地1・森と川2・山3、1旬に${H.HERO.MP}まで）。遠い所を選べば、その方へ1旬ぶん進む。城のマスに止まればその城下に入る（他国の城下にも入れる）。</p>
    ${dest !== null ? `<button class="hr-spot main" data-h="goon"><b>続けて進む</b><span>${esc(castleAt(st, dest)?.name ?? PROVINCES[HEXES[dest].p].name + 'の野')}へ（あと${jun(dest)}ほど）</span></button>` : ''}
    ${list.map((c) => {
    const tags = [c.i === L?.loc ? '主君' : '', Hh.quest?.castle === c.i ? '主命' : ''].filter(Boolean);
    return `<button class="hr-town-row" data-h="goto" data-id="${c.hex}"><b>${esc(c.name)}</b><span>${c.owner ? esc(clanName(st, c.owner)) : '国人'}${c.owner === me.clan ? '' : '（他国）'}</span>${tags.map((x) => `<em>${x}</em>`).join('')}<i>${jun(c.hex)}</i></button>`;
  }).join('')}`;
}
function diaryHtml(st: GameState) {
  const d = [...st.hero!.diary].reverse().slice(0, 80);
  return `<ol class="hr-diary">${d.map((x) => `<li><small>${dateOf(st, x.turn)}${H.JUN_NAME[Math.min(2, x.jun)]}</small>${esc(x.text)}</li>`).join('')}</ol>`;
}
const dateOf = (st: GameState, turn: number) => { const m0 = (st.startMonth ?? 6) - 1 + turn - 1; return `${(st.startYear ?? 1560) + Math.floor(m0 / 12)}年${(m0 % 12) + 1}月`; };

// ───────── 行い ─────────
async function act(fn: () => H.Act, scene?: string) {
  if (!s || busy) return;
  const r = fn();
  if (!r.ok) { say = { text: r.text }; render(); return; }
  if (scene) bg = scene;
  say = { who: r.who, line: r.line, text: r.text };
  await advance();
}
// 3旬が過ぎたら1か月を進める。月をまたぐ旅は続ける
// 1か月を進める（大名たちの月の処理）。主人公が死ぬか家が滅べば終わりの言葉を返す
async function monthStep(st: GameState, lines: string[]): Promise<string | null> {
  lines.push(...H.heroMonth(st));
  const n0 = st.log.length;
  await runClanAI(st, st.player);
  await endTurn(st);
  st.over = null; st.scenes = []; st.events = [];
  lines.push(...st.log.slice(n0).filter((l) => l.mine && (l.kind === 'battle' || l.kind === 'castle' || l.kind === 'death')).map((l) => l.text).slice(-10));
  return H.heroEnd(st);
}
async function advance() {
  const st = s!;
  const lines: string[] = [];
  if (st.hero!.jun >= H.HERO.JUN) {
    busy = true; render();
    const end = await monthStep(st, lines);
    busy = false;
    if (end) { report = [...lines, end, '試作はここまで。']; render(); try { localStorage.removeItem(KEY); } catch { /* 続ける */ } return; }
  }
  if (lines.length) report = [...new Set(lines)];
  // 城下に着いたら、城下の画面へ戻る
  if (bg === 'tabi' && !st.hero!.field && (st.hero!.dest === null || st.hero!.dest === undefined)) { bg = 'town'; pane = 'spots'; }
  save(); render();
  runStory();
}
// 物語（前田利家 ― 残り火）: 時期の来た場面を、物語の画面で見せる
type Theater = (beats: Beat[], done: () => void, choose?: (key: string, id: string) => Beat[], opt?: { part2?: boolean; label?: string }) => void;
let theater: Theater | null = null;
export function setTheater(f: Theater) { theater = f; }
const chooser = (st: GameState) => (key: string, id: string) => { const r = M.storyChoose(st, key, id); for (const x of r.lines) H.note(st, x); return r.lines.length ? [...r.beats, { text: `（${r.lines.join('。')}）`, bg: r.beats[r.beats.length - 1]?.bg }] : r.beats; };
const opt = (st: GameState) => ({ part2: (st.hero!.storyDone ?? []).includes('katoku'), label: (st.hero!.storyDone ?? []).includes('katoku') ? '残り火　第二部' : '残り火　第二幕' });
function runStory() {
  if (!s || !theater || busy) return;
  const ev = storyDue(s);
  if (!ev) return;
  const st = s;
  theater(ev.beats, () => {
    const lines = ev.apply?.(st) ?? [];
    if (lines.length) { say = { text: lines.join('') }; for (const x of lines) H.note(st, x); }
    if (ev.reset) { resetWorld(ev.reset); return; }
    save(); render();
    runStory();
  }, chooser(st), opt(st));
}
// 部の切れ目: 世の中を史実のシナリオに合わせ直し、利家と前田家を移す
function resetWorld(sc: string) {
  const old = s!;
  const g = newGame('oda', 'normal', undefined, sc);
  H.startHero(g, old.hero!.id);
  carryHero(old, g);
  s = g; bg = 'town'; pane = 'spots'; recenter = true; view = null; mapCanvas = null;
  const c = g.castles[g.hero!.town];
  say = { text: `${g.year}年${g.month}月。世の中は「${sc === '1572' ? '元亀三年 信長包囲網' : sc}」の形になった。${c.name}の城下にいる。` };
  H.note(g, say.text);
  save(); render();
  runStory();
}
// 家中の進言: 奥村・村井の話（物語の画面で）
function advice() {
  const st = s!;
  const a = M.nextAdvice(st);
  if (!a || !theater) return;
  save();
  theater(a.beats, () => { say = { text: `家中の進言（${a.head}）を聞いた。` }; void advance(); }, chooser(st), { part2: true, label: '前田家　家中の進言' });
}
// 月日を送る（物語）: 次の場面の年月まで暦だけを跳ぶ（世の中はそのまま）
function skipTime() {
  const st = s!;
  const lines = storyJump(st);
  if (lines.length) { say = { text: lines.join('') }; for (const x of lines) H.note(st, x); }
  save(); render();
  runStory();
}

function onClick(e: Event) {
  const b = (e.target as HTMLElement).closest('[data-h]') as HTMLElement | null;
  if (!b || busy) return;
  const h = b.dataset.h!, id = b.dataset.id ?? '';
  if (h === 'quit') { save(); s = null; close(); return; }
  if (h === 'pick') { begin(id); return; }
  if (h === 'continue') { try { s = JSON.parse(localStorage.getItem(KEY)!); } catch { s = null; } if (s) { s.hero!.hex ??= s.castles[s.hero!.town].hex; bg = 'town'; pane = 'spots'; recenter = true; say = { text: `${s.castles[s.hero!.town].name}の城下に戻った。` }; render(); runStory(); } return; }
  if (!s) return;
  if (s.hero?.over && !['pane', 'report-ok'].includes(h)) return; // 終わったあとは見るだけ
  if (h === 'pane') { if (id === 'tabi') recenter = true; pane = id as typeof pane; render(); return; }
  if (h === 'report-ok') { report = null; render(); return; }
  if (h === 'rest') { void act(() => H.rest(s!), 'town'); return; }
  if (h === 'skip') { skipTime(); return; }
  if (h === 'advice') { advice(); return; }
  if (h === 'gov') { void act(() => M.govern(s!, id as M.GovAct), 'town'); return; }
  if (h === 'work') { const k = s.hero!.quest!.kind; void act(() => H.work(s!), k); return; }
  if (h === 'visit') { void act(() => H.visit(s!, id), 'yashiki'); return; }
  if (h === 'gift') { void act(() => H.giveGift(s!, id), 'yashiki'); return; }
  if (h === 'goto') { onHex(+id); return; }
  if (h === 'join') { void act(() => H.joinArmy(s!, +id), 'town'); return; }
  if (h === 'leavecamp') { void act(() => H.leaveCamp(s!), 'town'); return; }
  if (h === 'campwait') { void act(() => H.campWait(s!), 'town'); return; }
  if (h === 'goon') { recenter = true; void act(() => H.goOn(s!), 'tabi'); return; }
  if (h === 'spot') {
    const k = id as H.Spot;
    if (k === 'yashiki') { pane = 'yashiki'; render(); return; }
    if (k === 'tabi') { pane = 'tabi'; render(); return; }
    const f: Record<string, () => H.Act> = { tojo: () => H.tojo(s!), chaya: () => H.rumor(s!), nanban: () => H.rumor(s!), ichi: () => H.buyGoods(s!), dojo: () => H.train(s!, 'dojo'), tera: () => H.train(s!, 'tera') };
    void act(f[k], k);
  }
}

export const CSS = `
#hero{position:fixed;inset:0;z-index:60;background:#0c0c0d;color:var(--paper,#ece2cc);overflow:auto;font-family:var(--font-body,serif)}
#hero .hr-btn{border:1px solid rgba(207,169,94,.45);background:#1d1a16;color:inherit;padding:7px 14px;border-radius:3px;font-family:var(--font-ui,sans-serif);font-size:13px}
#hero .hr-btn:hover:not(:disabled){border-color:#cfa95e;background:#2a231b}
#hero .hr-btn:disabled{opacity:.4;cursor:default}
#hero .hr-btn.primary{background:#c4432a;border-color:#dc5a3e;color:#fff}
#hero .hr-btn.ghost{background:transparent}
#hero .hr-btn.sm{padding:4px 9px;font-size:12px}
.hr-pick{max-width:980px;margin:0 auto;padding:18px 16px 40px}
.hr-top{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.hr-tag{color:#cfa95e;font-size:12px;letter-spacing:.1em}
.hr-pick h2{font-family:var(--font-display,serif);font-weight:400;font-size:26px;margin:6px 0 8px}
.hr-lede{color:#b8ab92;line-height:1.8;margin:0 0 14px;font-size:14px}
.hr-cont{margin:0 0 14px}
.hr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.hr-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:1px solid rgba(207,169,94,.28);background:#151517;border-radius:4px}
.hr-card:hover{border-color:#cfa95e}
.hr-card img{border-radius:3px}
.hr-card b{font-size:16px}.hr-card span{font-size:12px;color:#b8ab92}.hr-card .hr-st{font-family:var(--font-ui,sans-serif);font-size:11.5px}
.hr-noface{display:grid;place-items:center;width:96px;height:120px;background:#202023;color:#cfa95e;font-size:24px;border-radius:3px}
.hr-noface.sm{width:44px;height:55px;font-size:16px}
.hr-main{min-height:100%;display:flex;flex-direction:column}
.hr-head{display:flex;align-items:center;gap:16px;padding:8px 14px;border-bottom:1px solid rgba(207,169,94,.28);background:#151517;flex-wrap:wrap}
.hr-id{display:flex;align-items:center;gap:10px}.hr-id img{border-radius:3px}.hr-id b{display:block;font-size:17px}.hr-id span{font-size:12px;color:#b8ab92}
.hr-date{font-family:var(--font-display,serif);font-size:22px;color:#cfa95e;display:flex;flex-direction:column;line-height:1.1}.hr-date small{font-size:12px;color:#b8ab92;font-family:var(--font-ui,sans-serif)}
.hr-stats{display:grid;grid-auto-flow:column;grid-template-rows:auto auto;gap:0 14px;margin:0;flex:1;min-width:0}
.hr-stats dt{font-size:10.5px;color:#b8ab92;font-family:var(--font-ui,sans-serif)}.hr-stats dd{margin:0;font-family:var(--font-ui,sans-serif);font-size:14px;white-space:nowrap}.hr-stats small{color:#b8ab92;font-size:11px}
.hr-quest{padding:8px 14px;background:#1a1712;border-bottom:1px solid rgba(207,169,94,.18);font-size:13.5px;line-height:1.6}
.hr-quest b{color:#cfa95e;margin-right:6px}.hr-quest span{color:#b8ab92;margin-left:6px}.hr-quest em{color:#8fb36a;font-style:normal}
.hr-body{display:grid;grid-template-columns:minmax(0,1fr) 360px;flex:1;min-height:0}
.hr-scene{position:relative;background:#202023 center/cover no-repeat;min-height:420px;display:flex;flex-direction:column;justify-content:flex-start}
.hr-town{margin:12px;align-self:flex-start;background:rgba(10,10,10,.72);padding:6px 12px;border-left:3px solid #cfa95e}
.hr-town b{font-family:var(--font-display,serif);font-size:20px;font-weight:400;display:block}.hr-town span{font-size:12px;color:#b8ab92}
.hr-say{box-sizing:border-box;margin:auto;align-self:center;width:min(780px,calc(100% - 32px));background:rgba(10,10,10,.84);border:1px solid rgba(207,169,94,.45);padding:20px 24px;border-radius:4px;box-shadow:0 12px 40px rgba(0,0,0,.55)}
.hr-who{display:flex;gap:20px;align-items:center;margin-bottom:12px}.hr-who img{border-radius:3px;flex:none;border:1px solid rgba(207,169,94,.4)}
.hr-who b{color:#cfa95e;font-size:15px;letter-spacing:.06em}.hr-who p{margin:6px 0 0;font-size:21px;line-height:1.75;font-family:var(--font-display,serif)}
.hr-text{margin:0;color:#ddd2ba;font-size:15.5px;line-height:1.8}
.hr-scene.map{background:#16222e}
#hr-mapslot{position:absolute;inset:0}#hr-mapslot canvas{width:100%;height:100%;display:block;touch-action:none}
.hr-scene.map .hr-town{position:relative;z-index:1;pointer-events:none}
.hr-say.mini{position:relative;z-index:1;margin:auto 12px 12px;width:auto;align-self:stretch;padding:10px 14px;pointer-events:none}
.hr-say.mini .hr-who{display:none}.hr-say.mini .hr-text{font-size:14px}
.hr-side{border-left:1px solid rgba(207,169,94,.2);background:#111113;display:flex;flex-direction:column;min-height:0}
.hr-tabs{display:flex;border-bottom:1px solid rgba(207,169,94,.2)}
.hr-tabs button{flex:1;background:none;border:0;padding:10px 0;color:#b8ab92;font-family:var(--font-ui,sans-serif);font-size:13px;border-bottom:2px solid transparent}
.hr-tabs button.on{color:#ece2cc;border-bottom-color:#cfa95e}
.hr-pane{padding:10px;overflow:auto;flex:1}
.hr-spot{display:flex;flex-direction:column;align-items:flex-start;width:100%;text-align:left;background:#1a1816;border:1px solid rgba(207,169,94,.22);padding:9px 12px;margin-bottom:6px;border-radius:3px}
.hr-spot:hover{border-color:#cfa95e}.hr-spot b{font-size:15px}.hr-spot span{font-size:12px;color:#b8ab92;font-family:var(--font-ui,sans-serif)}
.hr-spot.main{background:#3a1f16;border-color:#dc5a3e}.hr-spot.dim{opacity:.75}
.hr-note{font-size:12px;color:#b8ab92;margin:0 0 8px;line-height:1.6;font-family:var(--font-ui,sans-serif)}
.hr-none{color:#b8ab92}
.hr-person{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(207,169,94,.12)}
.hr-person img{border-radius:2px;flex:none}.hr-pi{flex:1;display:flex;flex-direction:column;min-width:0}.hr-pi b{font-size:14px}.hr-pi span{font-size:11.5px;color:#b8ab92;font-family:var(--font-ui,sans-serif)}
.hr-pi .hr-rel{color:#cfa95e}.hr-pa{display:flex;flex-direction:column;gap:4px}
.hr-town-row{display:grid;grid-template-columns:1fr auto auto;grid-template-areas:"n t j" "o t j";align-items:center;gap:0 8px;width:100%;text-align:left;background:#1a1816;border:1px solid rgba(207,169,94,.18);padding:7px 10px;margin-bottom:5px;border-radius:3px}
.hr-town-row:hover{border-color:#cfa95e}.hr-town-row b{grid-area:n}.hr-town-row span{grid-area:o;font-size:11.5px;color:#b8ab92;font-family:var(--font-ui,sans-serif)}
.hr-town-row em{grid-area:t;font-style:normal;font-size:11px;color:#1a1410;background:#cfa95e;padding:1px 6px;border-radius:2px}.hr-town-row i{grid-area:j;font-style:normal;color:#cfa95e;font-family:var(--font-ui,sans-serif)}
.hr-diary{list-style:none;margin:0;padding:0}.hr-diary li{padding:6px 0;border-bottom:1px solid rgba(207,169,94,.1);font-size:13px;line-height:1.6}.hr-diary small{display:block;color:#cfa95e;font-family:var(--font-ui,sans-serif);font-size:11px}
.hr-modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:61;padding:16px}
.hr-report{background:#151517;border:1px solid #cfa95e;padding:18px 20px;max-width:560px;width:100%;max-height:80vh;overflow:auto;border-radius:4px}
.hr-report h3{font-family:var(--font-display,serif);font-weight:400;margin:0 0 10px;font-size:22px;color:#cfa95e}
.hr-report ul{margin:0 0 14px;padding-left:18px;line-height:1.75;font-size:14px}
.hr-busy{font-family:var(--font-display,serif);font-size:22px;color:#cfa95e}
@media (min-width:821px){.hr-main{height:100vh}.hr-body{overflow:hidden}.hr-side{overflow:hidden}.hr-scene{min-height:0}}
@media (max-width:820px){
  .hr-body{grid-template-columns:1fr}.hr-scene{min-height:360px}.hr-say{padding:14px 14px;width:calc(100% - 20px)}.hr-who{gap:12px}.hr-who img{width:80px;height:100px}.hr-scene.map{min-height:58vh}.hr-who p{font-size:17px}.hr-text{font-size:14px}.hr-side{border-left:0;border-top:1px solid rgba(207,169,94,.2)}
  .hr-head{gap:10px}.hr-stats{grid-auto-flow:row;grid-template-columns:repeat(5,auto);grid-template-rows:auto;order:3;flex-basis:100%}
  .hr-stats dt{grid-row:1}.hr-stats dd{grid-row:2;font-size:12.5px}
}
`;

// 武将プレイ（試作）の画面: 城下の一枚絵・行ける所・人の一覧・言葉の窓・日記。旅は日本地図の上を部隊の移動と同じように進む
import { SCENE_ART } from '../data/sceneArt';
import { MINATO_ART } from '../data/scenes';
import { runClanAI } from '../engine/ai';
import { endTurn } from '../engine/game';
import * as H from '../engine/hero';
import { HEXES, PROVINCES } from '../engine/map';
import { MapView } from './render';
import { carryHero, nextStory, storyDue, storyJump } from '../engine/story2';
import { calendarStep, frozen } from '../engine/story5';
import * as M from '../engine/maeda';
import * as T from '../engine/trade';
import * as CR from '../engine/career';
import * as RP from '../engine/roninplay';
import * as KS from '../engine/kashin';
import * as HC from '../engine/heroCastle';
import * as HA from '../engine/heroArmy';
import * as FR from '../engine/fronts';
import * as MB from '../engine/meibutsu';
import { attackTargets, reachable } from '../engine/move';
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
const BG: Record<string, string> = { town: 'ichi', tojo: 'zashiki_day', yashiki: 'zashiki_night', chaya: 'chashitsu', ichi: 'ichi', dojo: 'jinmaku', tera: 'hondo', tabi: 'yukimichi', nanban: 'minato', fushin: 'ishigaki', teisatsu: 'tsukiyo', choryaku: 'zashiki_night', kenkin: 'zashiki_day', kenjo: 'zashiki_day', tsukaiban: 'yukimichi', monomi: 'tsukiyo', toyo: 'zashiki_night', joban: 'ishigaki', negaeri: 'zashiki_night', month: 'tsukiyo' };

type Face = (id: string | null | undefined, w: number) => string;
let s: GameState | null = null;
let face: Face = () => '';
let onQuit: () => void = () => {};
let root: HTMLElement | null = null;
let pane: 'spots' | 'yashiki' | 'tabi' | 'diary' | 'akinai' | 'shiro' | 'homen' = 'spots';
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
const oldAge = (st: GameState) => midAge(st) && (st.hero!.storyDone ?? []).includes('ryo4') && !!STORY_PORTRAITS.toshiie_old;
const myFace = (st: GameState, w: number) => oldAge(st) ? `<img class="face" src="${STORY_PORTRAITS.toshiie_old}" width="${w}" height="${Math.round(w * 1.25)}" alt="">` : midAge(st) ? `<img class="face" src="${STORY_PORTRAITS.toshiie_mid}" width="${w}" height="${Math.round(w * 1.25)}" alt="">` : face(st.hero!.id, w);
const mapMode = (st: GameState) => pane === 'tabi' || (!!st.hero!.field && !H.inArmy(st));

export function heroSaved(): boolean { try { return !!localStorage.getItem(KEY); } catch { return false; } }
// 合戦の采配の既定: 自ら（自動テストの間は任せる）
function cmdDefault(st: GameState) { if (st.hero && st.hero.selfCommand === undefined) { let ask = true; try { ask = !navigator.webdriver || localStorage.getItem('sengoku-herobattle') === 'ask'; } catch { /* 続ける */ } st.hero.selfCommand = ask; } }
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
  s = st; pane = 'spots'; bg = 'town'; report = null; recenter = true; say = first; cmdDefault(st);
  save(); render();
  runStory();
}
// ───────── 本体 ─────────
function begin(id: string) {
  s = pickState ?? newGame('oda', 'normal', undefined, '1560');
  const gov = s.castles.find((c) => c.governor === id)?.i ?? null; // 城主だった城（startHero で外す前に）
  H.startHero(s, id); cmdDefault(s);
  const start = CR.startCareer(s, gov);
  for (const x of start) H.note(s, x);
  bg = 'town'; pane = 'spots';
  const me = H.heroOf(s)!, L = H.lordOf(s), town = s.castles[s.hero!.town].name;
  const line = !L ? '' : me.rank === 0 ? `${me.name}。そなたを頼りにしておる。主命は登城して受けよ。` : me.rank === 1 ? `${me.name}か。${town}の城下で励め。主命は登城して受けよ。` : `${me.name}か。この${town}の城下で励め。主命は登城して受けよ。`;
  say = { who: L?.id, line, text: `${me.name}（${R.RANK_NAME[me.rank]}）として、${town}の城下に立った。${start.length ? start.join('。') + '。' : ''}` };
  save(); render();
}
function render() {
  if (!s || !root) return;
  const st = s, Hh = st.hero!, me = H.heroOf(st)!, c = st.castles[Hh.town], L = H.lordOf(st);
  const q = Hh.quest;
  const next = me.rank > 0 ? R.MERIT_AT[me.rank - 1] : null;
  const townArt = !H.inArmy(st) && bg === 'town' && !Hh.field ? ({ ichijodani: SCENE_ART.story_fuchu, nanao: SCENE_ART.story_nanao, kanazawa: SCENE_ART.story_kanazawa, toyama_c: SCENE_ART.story_moriyama } as Record<string, string | undefined>)[c.id] : undefined; // 物語で治める城（府中・七尾）は、その城の絵
  const art = townArt && (Hh.fuchu === Hh.town || (Hh.ryo ?? []).includes(Hh.town)) ? townArt : ART(H.inArmy(st) ? 'jinmaku' : BG[bg] ?? 'ichi');
  root.innerHTML = `<div class="hr-main">
    <header class="hr-head">
      <div class="hr-id">${myFace(st, 56)}<div><b>${esc(me.name)}</b><span>${me.clan ? `${clanName(st, me.clan)}家・${R.RANK_NAME[me.rank]}` : '浪人'}${Hh.title ? `・${esc(Hh.title)}` : ''}</span></div></div>
      <div class="hr-date">${H.JUN_NAME[Math.min(2, Hh.jun)]}<small>${st.year}年${st.month}月</small></div>
      <dl class="hr-stats"><dt>金</dt><dd>${Hh.gold}貫</dd>${Hh.story !== 'toshiie' ? `<dt>名声</dt><dd>${Hh.fame ?? 0}</dd>` : ''}<dt>進物</dt><dd>${Hh.goods}</dd><dt>主君の覚え</dt><dd>${Hh.favor}</dd><dt>功績</dt><dd>${Math.round(me.merit)}${next !== null ? `<small>／${next}で${R.RANK_NAME[me.rank - 1]}</small>` : ''}</dd>
      <dt>武・知・統・魅</dt><dd>${me.bra}・${me.int}・${me.lea}・${me.cha}</dd>${Hh.ie ? `<dt>${Hh.story === 'toshiie' ? '前田家' : esc(CR.houseName(st))}</dt><dd title="荒子衆・蔵・家中・村の疲れ">衆${Hh.ie.shu}・蔵${Hh.ie.kura}石・家中${Hh.ie.kachu}・村疲${Hh.ie.mura}${Hh.story !== 'toshiie' && KS.capOf(st) ? `・家臣${KS.retainersOf(st).length}/${KS.capOf(st)}` : ''}</dd>` : ''}</dl>
      <button class="hr-btn ghost" data-h="quit" title="保存してタイトルへ">中断</button>
    </header>
    ${Hh.fuchu !== undefined ? `<div class="hr-quest"><b>${Hh.story !== 'toshiie' ? '領地' : (Hh.storyDone ?? []).includes('ryo') ? '領国' : '府中'}</b> ${esc(M.fuchuText(st))}</div>` : ''}
    ${CR.freeHero(st) && !Hh.over ? `<div class="hr-quest"><b>目標</b> ${esc(CR.goalText(st))}</div>` : ''}
    <div class="hr-quest">${q ? `<b>主命</b> ${esc(H.QUEST_NAME[q.kind])}：${esc(H.questText(st, q))} <span>${q.done >= q.need ? '<em>果たした。登城して報告せよ</em>' : `期日まで${Math.max(0, q.until - st.turn)}か月`}</span>` : `<b>主命</b> なし。${L ? `主君${esc(L.name)}は${esc(st.castles[L.loc].name)}にいる。登城すれば主命を受けられる。` : ''}`}</div>
    <div class="hr-body">
      <section class="hr-scene${mapMode(st) ? ' map' : ''}" style="${art && !mapMode(st) ? `background-image:url(${art})` : ''}">
        ${mapMode(st) ? '<div id="hr-mapslot"></div>' : ''}
        <div class="hr-town">${H.inArmy(st) ? (() => { const a = H.inArmy(st)!; return `<b>${esc(st.generals[a.main]?.name ?? '')}の陣中</b><span>${esc(castleAt(st, a.hex)?.name ?? PROVINCES[HEXES[a.hex].p].name + 'の野')}・兵${a.troops.toLocaleString('ja-JP')}・士気${a.morale.toFixed(2)}</span>`; })() : Hh.field ? `<b>${esc(PROVINCES[HEXES[Hh.hex].p].name)}の野</b><span>旅の途中</span>` : `<b>${esc(c.name)}の城下</b><span>${c.owner ? `${esc(clanName(st, c.owner))}家の城` : '国人の城'}${c.owner && c.owner !== me.clan ? '（他国）' : ''}</span>`}</div>
        ${say ? `<div class="hr-say${mapMode(st) ? ' mini' : ''}">${say.who && say.line ? `<div class="hr-who">${face(say.who, 128) || ''}<div><b>${esc(st.generals[say.who]?.name ?? '')}</b><p>「${esc(say.line)}」</p></div></div>` : ''}<p class="hr-text">${esc(say.text)}</p></div>` : ''}
      </section>
      <aside class="hr-side">
        <nav class="hr-tabs">${(['spots', 'yashiki', 'tabi', 'diary'] as const).map((k) => `<button class="${pane === k ? 'on' : ''}" data-h="pane" data-id="${k}">${{ spots: '城下', yashiki: '屋敷', tabi: '旅', diary: '日記' }[k]}</button>`).join('')}</nav>
        <div class="hr-pane">${pane === 'spots' ? spotsHtml(st) : pane === 'yashiki' ? peopleHtml(st) : pane === 'tabi' ? travelHtml(st) : pane === 'akinai' ? tradeHtml(st) : pane === 'shiro' ? castleHtml(st) : pane === 'homen' ? homenHtml(st) : diaryHtml(st)}</div>
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
  const ld = HA.leading(st);
  view.sel = ld ? { army: ld.id, hex: ld.hex, reach: busy ? null : reachable(st, ld), targets: busy ? [] : attackTargets(st, ld) } : { army: null, hex: null, reach: busy ? null : H.heroReach(st), targets: [] };
  const dest = Hh.dest !== null && Hh.dest !== undefined ? Hh.dest : null;
  view.marks = dest !== null ? { hexes: [dest], arrows: [[Hh.hex, dest]] } : null; // 点滅する輪は行き先に
  const src = oldAge(st) ? STORY_PORTRAITS.toshiie_old : midAge(st) ? STORY_PORTRAITS.toshiie_mid : PORTRAITS[Hh.id];
  if (src) { if (!heroImg || heroImg.dataset.id !== src.slice(-24)) { heroImg = new Image(); heroImg.dataset.id = src.slice(-24); heroImg.src = src; } view.heroMark = { hex: Hh.hex, img: heroImg }; }
  else { view.heroMark = null; view.marks = { hexes: [Hh.hex, ...(dest !== null ? [dest] : [])], arrows: view.marks?.arrows ?? [] }; } // 顔がなければ輪で
  if (recenter) { view.centerOn(Hh.hex, Math.min(2.2, Math.max(1.3, view.w / 520))); recenter = false; }
  view.redraw();
}
function onHex(hex: number) {
  if (!s || busy || report) return;
  if (hex === s.hero!.hex) { const c = castleAt(s, hex); say = { text: c ? `ここは${c.name}の城下。` : 'ここで足を止めている。' }; render(); return; }
  recenter = true;
  if (HA.leading(s)) { void act(() => HA.commandHex(s!, hex), 'tabi'); return; }
  void act(() => H.moveTo(s!, hex), 'tabi').then(() => { if (root && window.innerWidth <= 820) root.scrollTo({ top: 0 }); }); // 狭い画面では地図へ戻す
}
function spotsHtml(st: GameState) {
  if (st.hero!.over) return `<p class="hr-note">${esc(st.hero!.over)}</p><button class="hr-spot main" data-h="quit"><b>タイトルへ</b><span>この遊びは終わった</span></button>`;
  const rn = roninSpots(st); if (rn !== null) return rn;
  const ld = HA.leading(st);
  const cmdBtn = `<button class="hr-spot" data-h="selfcmd"><b>合戦の采配: ${st.hero!.selfCommand ? '自ら' : '任せる'}</b><span>${st.hero!.selfCommand ? '合戦の画面で自分の隊（総大将なら軍勢の全部隊）を動かす。押すと任せる' : '合戦はAIに任せる。押すと自ら采配する'}</span></button>`;
  if (ld) return `<p class="hr-note">総大将として軍勢（兵${ld.troops.toLocaleString('ja-JP')}・士気${ld.morale.toFixed(2)}・残りの足${ld.mp}）を率いている。地図で行き先を押せば進み、敵の城か軍勢を押せば出陣を命じる（月の終わりに合戦）。${st.hero!.order !== undefined ? `出陣先: ${esc(castleAt(st, st.hero!.order)?.name ?? '敵の軍勢')}` : ''}</p>
    ${st.hero!.order !== undefined ? `<p class="hr-note"><b>出陣を命じてある</b>（${esc(castleAt(st, st.hero!.order)?.name ?? '敵の軍勢')}）。陣中で過ごせば、月の終わりに合戦となる。</p>` : st.hero!.quest?.kind === 'kouryaku' ? (() => { const qc = st.castles[st.hero!.quest!.castle], adj = attackTargets(st, ld).some((x) => x.hex === qc.hex); return `<button class="hr-spot main" data-h="advance" data-id="${qc.i}"><b>${adj ? `${esc(qc.name)}を攻める` : `${esc(qc.name)}へ進む`}</b><span>${adj ? '隣まで来た。出陣を命じる（月の終わりに合戦）' : '攻略の城へ、今月の足の分だけ近づく'}</span></button>`; })() : ''}
    <button class="hr-spot" data-h="pane" data-id="tabi"><b>地図で軍勢を動かす</b><span>行き先・出陣先を選ぶ</span></button>${cmdBtn}
    <button class="hr-spot" data-h="rest"><b>陣中で過ごす</b><span>1旬。月の終わりに軍勢が動き、合戦が起きる</span></button>
    <button class="hr-spot dim" data-h="disband"><b>軍勢を解く</b><span>兵は近くの城へ、手勢は家へ戻す</span></button>`;
  const a = H.inArmy(st);
  if (a) return `${cmdBtn}<p class="hr-note">${esc(st.generals[a.main]?.name ?? '')}の軍勢にいる。軍勢は大名（AI）の采配で動き、合戦もこの軍勢とともに戦う（勝てば功績が入る）。</p>
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
  const gov = M.canGovern(st) ? `<button class="hr-spot main" data-h="pane" data-id="shiro"><b>城の政</b><span>${esc(M.fuchuText(st))}。開発・商業・新田・普請・見回り・城代など</span></button>` : '';
  const prx = KS.canProxy(st) ? `<button class="hr-spot" data-h="proxy"><b>家臣を遣わす</b><span>この主命（${esc(H.QUEST_NAME[st.hero!.quest!.kind])}）を家臣に任せる。来月に首尾が分かる（1旬）</span></button>` : '';
  const adv = M.canAdvice(st) ? `<button class="hr-spot" data-h="advice"><b>家中の進言</b><span>${st.hero!.story === 'toshiie' ? '奥村・村井' : '家老・家臣'}の話を聞いて、${st.hero!.story === 'toshiie' ? '前田家' : esc(CR.houseName(st))}のことを決める（月に一度・1旬）</span></button>` : '';
  const trade = T.canTrade(st, c) ? `<button class="hr-spot" data-h="pane" data-id="akinai"><b>商い</b><span>${T.buyOffer(st, c) ? `特産「${esc(T.buyOffer(st, c)!.name)}」を仕入れる。` : ''}荷を売る（荷駄 ${T.loadOf(st)}/${T.capOf(st)}）</span></button>` : '';
  const shikan = CR.lordHere(st) ? `<button class="hr-spot main" data-h="shikan"><b>仕官を願う</b><span>${esc(clanName(st, CR.lordHere(st)!))}家の当主に目通りを願う（1旬）</span></button>` : '';
  const ask = CR.canAskCastle(st) && !H.questBlock(st) ? `<button class="hr-spot main" data-h="askshiro"><b>城を願い出る</b><span>主君に城を預けてほしいと願い出る（1旬）</span></button>` : '';
  const ret = CR.canRetire(st) ? `<button class="hr-spot dim" data-h="retire"><b>${retireArm ? 'まことに隠居する' : '隠居する'}</b><span>${retireArm ? 'もう一度押すと家督を譲り、一生を締める' : '家督を譲って一生を締める（評価が出る）'}</span></button>` : '';
  const ldb = CR.freeHero(st) && st.hero!.quest?.kind === 'kouryaku' && H.heroOf(st)!.rank === 0 ? (() => { const why = HA.canLead(st); return `<button class="hr-spot main" data-h="lead" ${why ? 'disabled' : ''}><b>軍勢を率いて出陣</b><span>${why ? esc(why) : `攻略の総大将として、${esc(st.castles[st.hero!.town].name)}の城兵の6割と手勢で軍勢を立てる（1旬）`}</span></button>`; })() : '';
  const mo = CR.freeHero(st) && !st.hero!.field ? MB.offerAt(st, c.id) : null;
  const mei = mo ? `<button class="hr-spot" data-h="buymei" data-id="${mo.id}" ${st.hero!.gold < mo.price ? 'disabled' : ''}><b>名物を求める: ${esc(mo.name)}（${mo.price.toLocaleString('ja-JP')}貫）</b><span>${mo.kind}の名物が売りに出ている。名声+${mo.fame}。茶会に使え、主君への献上は覚えと功績に大きく効く</span></button>` : '';
  const hf = CR.homenOf(st);
  const homen = hf ? `<button class="hr-spot main" data-h="pane" data-id="homen"><b>方面の差配</b><span>${hf.castles.length}城・${FR.frontArmies(st, hf).length}軍勢。方針（${R.FRONT_POLICY_NAME[hf.policy]}）と攻略の目標を決める。謀反・出奔もここで</span></button>` : CR.canRebel(st) === null ? `<button class="hr-spot dim" data-h="pane" data-id="homen"><b>主家との縁</b><span>謀反を起こす・出奔する</span></button>` : '';
  return `${shikan}${work}${prx}${ldb}${homen}${gov}${ask}${join}${adv}${trade}${mei}${spots.map((k) => `<button class="hr-spot" data-h="spot" data-id="${k}"><b>${H.SPOT_NAME[k]}</b><span>${desc[k]}</span></button>`).join('')}
    <button class="hr-spot dim" data-h="rest"><b>休む</b><span>1旬を過ごす</span></button>${ret}${(() => { const n = nextStory(st); return n ? `<button class="hr-spot" data-h="skip"><b>月日を送る</b><span>次の物語（${esc(n.when)}）まで時を跳ぶ。世の中の動きはそのまま、俸禄はまとめて</span></button>` : ''; })()}`;
}
// 浪人の城下: 陣借り・用心棒・指南・牢人衆・国衆の城（探る・旗揚げ）・仕官
function roninSpots(st: GameState): string | null {
  if (!RP.isRonin(st)) return null;
  const Hh = st.hero!;
  if (Hh.merc) { const a = st.armies[Hh.merc.army]; return `<p class="hr-note">${esc(clanName(st, Hh.merc.clan))}家の${esc(st.generals[a?.main ?? '']?.name ?? '')}の軍勢に陣借りしている。軍勢とともに動き、合戦があれば雇い賃と名声が入る。</p><button class="hr-spot main" data-h="rest"><b>陣中で過ごす</b><span>1旬</span></button><button class="hr-spot dim" data-h="leavemerc"><b>陣を離れる</b><span>雇われの身をやめる</span></button>`; }
  const btn = (h: string, b: string, sp: string, cls = '', id = '', dis = false) => `<button class="hr-spot${cls}" data-h="${h}"${id ? ` data-id="${id}"` : ''} ${dis ? 'disabled' : ''}><b>${b}</b><span>${sp}</span></button>`;
  const out: string[] = [];
  const lh = CR.lordHere(st);
  if (lh) out.push(btn('shikan', '仕官を願う', `${esc(clanName(st, lh))}家の当主に目通りを願う（見込み${Math.round(RP.serviceChance(st, lh) * 100)}%・1旬）。名声・口添え・首級・配下が効く`, ' main'));
  if (Hh.field) { out.push(...RP.mercArmies(st).map((a) => btn('jingari', '陣借りする', `${esc(clanName(st, a.clan))}家・${esc(st.generals[a.main]?.name ?? '')}の軍勢（兵${a.troops.toLocaleString('ja-JP')}）に雇われる`, ' main', String(a.id)))); return out.join('') + btn('pane', '旅を続ける', '地図で行き先を選ぶ', '', 'tabi') + btn('rest', '休む', '1旬を過ごす', ' dim'); }
  out.push(...RP.mercArmies(st).map((a) => btn('jingari', '陣借りする', `${esc(clanName(st, a.clan))}家・${esc(st.generals[a.main]?.name ?? '')}の軍勢（兵${a.troops.toLocaleString('ja-JP')}）に雇われる。どの家でも構わない`, ' main', String(a.id))));
  const k = RP.kunishuHere(st);
  if (k) {
    const need = RP.riseNeeds(st);
    out.push(btn('scout', '国衆の城を探る', `${esc(k.name)}の城兵・治安を調べる（内応の下ごしらえ・1旬）`));
    out.push(btn('rise', '旗揚げ（夜討ち）', need.length ? `足りない: ${need.join('・')}` : `手勢と配下で${esc(k.name)}を乗っ取る（見込み${Math.round(RP.riseChance(st, 'youchi') * 100)}%）`, ' main', 'youchi', !!need.length));
    const pn = RP.riseChance(st, 'naio');
    out.push(btn('rise', '旗揚げ（内応）', need.length ? `足りない: ${need.join('・')}` : pn ? `金500貫で城の中の者に門を開けさせる（見込み${Math.round(pn * 100)}%）` : '先に城を探っておく', '', 'naio', !!need.length || !pn));
  }
  out.push(btn('yojinbo', '用心棒', '商人の荷を護って稼ぐ（1旬）'));
  if (RP.canTeach(st)) out.push(btn('teach', '武芸の指南', '道場で槍を教えて稼ぐ（1旬）'));
  out.push(btn('hire', `牢人衆を雇う（${RP.RONIN.HIRE_COST}貫）`, `手勢+${RP.RONIN.HIRE_N}。毎月扶持がかかる（1旬）`, '', '', Hh.gold < RP.RONIN.HIRE_COST));
  const c = st.castles[Hh.town];
  out.push(...H.spotsOf(st, c).filter((x) => x !== 'tojo').map((x) => btn('spot', H.SPOT_NAME[x], x === 'yashiki' ? '武将を訪ねる・浪人を配下に誘う' : x === 'tabi' ? 'ほかの城下へ' : '', '', x)));
  if (T.canTrade(st, c)) out.push(btn('pane', '商い', '特産を仕入れ、荷を売る', '', 'akinai'));
  out.push(btn('rest', '休む', '1旬を過ごす', ' dim'));
  return `<p class="hr-note">浪人の身。主命も俸禄もない。毎月、自分と配下・牢人衆の扶持がかかる。近くの国衆の城: ${RP.nearKunishu(st).map((x) => esc(x.name)).join('・')}</p>` + out.join('');
}
function peopleHtml(st: GameState) {
  const me = H.heroOf(st)!;
  if (st.hero!.field && !H.inArmy(st)) return '<p class="hr-none">野にいて、訪ねられる屋敷はない。</p>';
  const ps = (H.inArmy(st) ? H.comrades(st) : H.townsfolk(st, st.hero!.town)).sort((a, b) => (st.hero!.rel[b.id] ?? 0) - (st.hero!.rel[a.id] ?? 0) || Number(b.clan === me.clan) - Number(a.clan === me.clan) || a.rank - b.rank);
  if (!ps.length) return '<p class="hr-none">この町に訪ねられる武将はいない。</p>';
  const fol = RP.followersOf(st), rs = KS.retainersOf(st), dk = st.hero!.daikan ?? {};
  const house = houseHtml(st);
  const role = (g: General) => { const c = Object.entries(dk).find(([, v]) => v === g.id); return c ? `${st.castles[+c[0]].name}の城代` : st.hero!.quest?.proxy === g.id ? '遣わし中' : '近侍'; };
  return `${house}${fol.length ? `<p class="hr-note"><b>配下</b> ${fol.map((g) => esc(g.name)).join('・')}</p>` : ''}${rs.length || KS.capOf(st) ? `<p class="hr-note"><b>家臣 ${rs.length}／${KS.capOf(st)}人</b> ${rs.map((g) => `${esc(g.name)}（${role(g)}・統${g.lea}）`).join('・') || 'まだいない。城下の浪人を召し抱えられる'}。扶持は一人月${KS.KASHIN.FUCHI}貫。</p>` : ''}<p class="hr-note">訪ねる・進物を贈ると親しくなる（1旬）。親しさ${H.HERO.FRIEND}で「友」の縁を結ぶ。${RP.isRonin(st) ? `浪人の武将は、親しさ${RP.RONIN.FOLLOW_REL}で配下に誘える。` : ''}</p>${ps.map((g) => {
    const v = st.hero!.rel[g.id] ?? 0;
    return `<div class="hr-person">${face(g.id, 44) || `<span class="hr-noface sm">${esc(g.name.slice(0, 1))}</span>`}<div class="hr-pi"><b>${esc(g.name)}</b><span>${g.clan ? `${esc(clanName(st, g.clan))}・${rankName(st, g)}` : '浪人'}${g.status === 'governor' ? '・城主' : ''}</span><span class="hr-rel">${H.RELNAME(v)} ${v}</span></div>
      <div class="hr-pa">${KS.canRecruit(st, g) ? `<button class="hr-btn sm" data-h="kakae" data-id="${g.id}" ${v < KS.KASHIN.REL || KS.retainersOf(st).length >= KS.capOf(st) ? 'disabled' : ''}>家臣に召し抱える</button>` : ''}${RP.isRonin(st) && g.status === 'ronin' && !RP.isFollower(st, g) ? `<button class="hr-btn sm" data-h="invite" data-id="${g.id}" ${v < RP.RONIN.FOLLOW_REL ? 'disabled' : ''}>配下に誘う</button>` : ''}<button class="hr-btn sm" data-h="visit" data-id="${g.id}">訪ねる</button><button class="hr-btn sm" data-h="gift" data-id="${g.id}" ${st.hero!.goods < 1 && st.hero!.gold < H.HERO.GIFT_COST ? 'disabled' : ''}>進物</button></div></div>`;
  }).join('')}`;
}
// 家の格（屋敷の普請）・名物・茶会（物語の外の、家を立てた主人公）
function houseHtml(st: GameState) {
  if (!CR.freeHero(st) || !st.hero!.ie) return '';
  const k = MB.kakuOf(st), kb = MB.kakuBlock(st), next = MB.KAKU.COST[k];
  const kaku = `<button class="hr-spot" data-h="kaku" ${kb ? 'disabled' : ''}><b>屋敷を普請する${next ? `（${next.toLocaleString('ja-JP')}貫）` : ''}</b><span>いま${MB.KAKU.NAME[k]}（家の格${k}）。${kb ? esc(kb) : `格${k + 1}へ: 手勢+${MB.KAKU.SHU}・名声+${MB.KAKU.FAME}・覚え+${MB.KAKU.FAVOR}${(k + 1) % 2 === 0 ? '・家臣の枠+1' : ''}。掛かりは月${(k + 1) * MB.KAKU.UPKEEP}貫（1旬）`}</span></button>`;
  const L = H.lordOf(st), atLord = !!L && !st.hero!.field && L.loc === st.hero!.town;
  const ms = MB.owned(st).map((m) => `<div class="hr-person"><div class="hr-pi"><b>${esc(m.name)}</b><span>${m.kind}・${m.price.toLocaleString('ja-JP')}貫の名物</span></div><div class="hr-pa"><button class="hr-btn sm" data-h="kenmei" data-id="${m.id}" ${atLord ? '' : 'disabled'}>主君に献上</button></div></div>`).join('');
  const cb = MB.chakaiBlock(st);
  const cha = MB.owned(st).length ? `<button class="hr-spot" data-h="chakai" ${cb ? 'disabled' : ''}><b>茶会を開く（${MB.CHAKAI.COST}貫）</b><span>${cb ? esc(cb) : `この城下の武将を招き、みなと親しくなる・名声+${MB.CHAKAI.FAME}（1旬）`}</span></button>` : '';
  return `<h4 class="hr-sub">${esc(CR.houseName(st))}（手元${st.hero!.gold.toLocaleString('ja-JP')}貫・手勢${st.hero!.ie.shu}）</h4>${kaku}${ms ? `<h4 class="hr-sub">名物${atLord ? '' : '（献上は主君の城下で）'}</h4>${ms}` : ''}${cha}<h4 class="hr-sub">人</h4>`;
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
  if (HA.leading(st)) return '<p class="hr-note">総大将として軍勢を率いている。地図の明るいマスを押せば進み（残りの足の分だけ）、赤い枠の敵の城・軍勢を押せば出陣を命じる。合戦は月の終わりに起きる。</p>';
  if (H.inArmy(st)) return '<p class="hr-note">陣中では軍勢とともに動く。地図は見るだけ。離れるなら「城下」の「陣を離れる」。</p>';
  return `<p class="hr-note">地図で行き先のマスを押す。明るいマスは1旬で行ける所（平地1・森と川2・山3、1旬に${H.HERO.MP}まで）。遠い所を選べば、その方へ1旬ぶん進む。城のマスに止まればその城下に入る（他国の城下にも入れる）。</p>
    ${dest !== null ? `<button class="hr-spot main" data-h="goon"><b>続けて進む</b><span>${esc(castleAt(st, dest)?.name ?? PROVINCES[HEXES[dest].p].name + 'の野')}へ（あと${jun(dest)}ほど）</span></button>` : ''}
    ${list.map((c) => {
    const tags = [c.i === L?.loc ? '主君' : '', Hh.quest?.castle === c.i ? '主命' : ''].filter(Boolean);
    return `<button class="hr-town-row" data-h="goto" data-id="${c.hex}"><b>${esc(c.name)}</b><span>${c.owner ? esc(clanName(st, c.owner)) : '国人'}${c.owner === me.clan ? '' : '（他国）'}</span>${tags.map((x) => `<em>${x}</em>`).join('')}<i>${jun(c.hex)}</i></button>`;
  }).join('')}`;
}
// 商い: この城下の特産を仕入れ、持っている荷をここで売る（遠くの町・商いの要所ほど高い）
// 城の政: 大名プレイの城の画面と同じ数値・同じ政（費えは自分の金）＋治め（見回りなど）＋城代
function castleHtml(st: GameState) {
  if (!M.canGovern(st)) return '<p class="hr-none">治める城の城下にいなければ、城の政はできない。</p><button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>';
  const c = st.castles[st.hero!.town], v = HC.castleView(st, c);
  const tiles = `<div class="hr-ctiles">${v.tiles.map(([l, val, sub]) => `<div><span>${l}</span><b>${esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('')}</div>`;
  const pills = v.pills.length ? `<p class="hr-note">${v.pills.map(esc).join('・')}</p>` : '';
  const acts = v.acts.map((a) => `<button class="hr-spot" data-h="cact" data-id="${a.k}" ${a.block ? 'disabled' : ''}><b>${esc(a.label)}</b><span>${esc(a.block ?? a.sub)}</span></button>`).join('');
  const govs = (Object.keys(M.GOV_NAME) as M.GovAct[]).filter((k) => k !== 'kaikon' && k !== 'fushin' && (k !== 'meshi' || st.hero!.ie)).map((k) => { const g = M.govCost(st, k); return `<button class="hr-spot${k === 'mimawari' ? ' main' : ''}" data-h="gov" data-id="${k}" ${g.block ? 'disabled' : ''}><b>${M.GOV_NAME[k][0]}${g.cost ? `（${g.cost.toLocaleString('ja-JP')}貫）` : ''}</b><span>${g.block ? esc(g.block) : esc(st.hero!.story === 'toshiie' ? M.GOV_NAME[k][1] : M.genText(M.GOV_NAME[k][1]))}</span></button>`; }).join('');
  const dom = CR.freeHero(st) && KS.retainersOf(st).length ? [...(st.hero!.fuchu !== undefined ? [st.hero!.fuchu] : []), ...(st.hero!.ryo ?? [])] : [];
  const daikan = dom.map((ci) => { const gid = st.hero!.daikan?.[ci]; return `<button class="hr-spot" data-h="daikan" data-id="${ci}"><b>${esc(st.castles[ci].name)}の城代: ${gid ? esc(st.generals[gid].name) : 'なし'}</b><span>押すと家臣を順に替える。城を空けている月も、城代が見回る</span></button>`; }).join('');
  return `<h4 class="hr-sub">${esc(c.name)}（手元${st.hero!.gold.toLocaleString('ja-JP')}貫）</h4>${tiles}${pills}<h4 class="hr-sub">城の政（大名の城の画面と同じ。費えは自分の金）</h4>${acts}<h4 class="hr-sub">治め（1旬）</h4>${govs}${daikan ? `<h4 class="hr-sub">城代</h4>${daikan}` : ''}<button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>`;
}
// 方面の差配（方面軍団長）と、主家との縁（謀反・出奔）
let rebelArm = 0, leaveArm = false;
function homenHtml(st: GameState) {
  const f = CR.homenOf(st), me = H.heroOf(st)!;
  let body = '';
  if (f) {
    const arms = FR.frontArmies(st, f);
    const tc = FR.targetCands(st, f);
    const pol = (['defend', 'build', 'attack'] as const).map((p) => `<button class="hr-btn sm${f.policy === p && (p !== 'attack' || !f.target) ? ' on' : ''}" data-h="hpol" data-id="${p}">${R.FRONT_POLICY_NAME[p]}${p === 'attack' ? '（任せる）' : ''}</button>`).join('');
    const tg = [...tc.clans.map((c) => [`clan:${c}`, `${clanName(st, c)}家`] as const), ...tc.castles.slice(0, 6).map((c) => [`castle:${c.i}`, c.name] as const)].map(([k, n]) => `<button class="hr-btn sm${f.target === k ? ' on' : ''}" data-h="htgt" data-id="${k}">${esc(n)}</button>`).join('');
    body = `<h4 class="hr-sub">方面（${f.castles.length}城）</h4><p class="hr-note">${f.castles.map((i) => `${esc(st.castles[i].name)}${st.castles[i].owner === me.clan ? '' : '（失）'}`).join('・')}</p>
      <h4 class="hr-sub">軍勢</h4>${arms.length ? arms.map((a) => `<p class="hr-note">${esc(st.generals[a.main]?.name ?? '？')}隊 ${a.troops.toLocaleString('ja-JP')}人${(st.orders ?? []).some((o) => o.army === a.id) ? '・出陣中' : ''}</p>`).join('') : '<p class="hr-none">方面の軍勢はまだない（月の初めに城兵から立てる）</p>'}
      <h4 class="hr-sub">方針</h4><div class="hr-pa">${pol}</div>
      <h4 class="hr-sub">攻略の目標</h4><div class="hr-pa" style="flex-wrap:wrap">${tg || '<span class="hr-note">近くに敵がいない</span>'}</div>`;
  }
  const rb = CR.canRebel(st);
  const lord = me.clan ? clanName(st, me.clan) : '';
  const rebelB = `<button class="hr-spot${rebelArm ? ' main' : ' dim'}" data-h="rebel" ${rb ? 'disabled' : ''}><b>${rebelArm === 0 ? '謀反を起こす' : rebelArm === 1 ? 'まことに背くか' : '旗を翻す'}</b><span>${rb ? esc(rb) : rebelArm === 0 ? `${esc(lord)}家に背き、${f ? '方面の城と軍勢' : '治める城'}ごと家を立てる。成れば大名として遊ぶ` : rebelArm === 1 ? 'もう一度押すと、主家に弓を引く覚悟を決める' : 'もう一度押すと謀反を起こす。後へは引けない'}</span></button>`;
  const leaveB = `<button class="hr-spot dim" data-h="shuppon"><b>${leaveArm ? 'まことに出奔する' : '出奔する'}</b><span>${leaveArm ? 'もう一度押すと城を返し、家臣を連れて浪人になる' : `${esc(lord)}家に暇を乞い、家臣を連れて浪人になる（城は返す）`}</span></button>`;
  return `${body}<h4 class="hr-sub">主家との縁</h4>${rebelB}${leaveB}<button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>`;
}
function tradeHtml(st: GameState) {
  const Hh = st.hero!, c = st.castles[Hh.town];
  if (Hh.field || H.inArmy(st)) return '<p class="hr-none">城下でなければ商いはできない。</p>';
  const o = T.buyOffer(st, c), room = T.capOf(st) - T.loadOf(st);
  const own = c.owner && c.owner !== H.heroOf(st)!.clan ? `（${esc(clanName(st, c.owner))}家の町。関銭一割）` : '';
  const buyRow = o ? `<div class="hr-person"><div class="hr-pi"><b>仕入れ: ${esc(o.name)}</b><span>荷一つ ${o.price}貫${own}</span><span>荷駄 ${T.loadOf(st)}/${T.capOf(st)}・手元${Hh.gold}貫</span></div>
    <div class="hr-pa">${[1, 5].map((n) => `<button class="hr-btn sm" data-h="buy" data-id="${n}" ${room < 1 || Hh.gold < o.price ? 'disabled' : ''}>${n}荷</button>`).join('')}<button class="hr-btn sm" data-h="buy" data-id="999" ${room < 1 || Hh.gold < o.price ? 'disabled' : ''}>買えるだけ</button></div></div>` : '<p class="hr-note">この城下には仕入れられる特産がない。</p>';
  const cargo = Object.entries(Hh.cargo ?? {});
  const sellRows = cargo.length ? cargo.map(([id, cg]) => { const pr = T.sellPrice(st, c, id), avg = Math.round(cg.cost / cg.n); return `<div class="hr-person"><div class="hr-pi"><b>${esc(T.productName(id))} ${cg.n}荷</b><span>ここで荷一つ ${pr}貫（仕入れ ${avg}貫）</span><span class="hr-rel">${pr > avg ? `儲け見込み +${(pr - avg) * cg.n}貫ほど` : '損になる'}</span></div><div class="hr-pa"><button class="hr-btn sm" data-h="sell" data-id="${id}">売る</button></div></div>`; }).join('') : '<p class="hr-none">荷は持っていない。</p>';
  return `<p class="hr-note">特産を仕入れ、遠くの町で売れば儲かる（京・堺・博多などの商いの要所はなお高い）。同じ町で売り続けると値が崩れ、月ごとに戻る。値は月ごとに上下する。荷を持って野を行くと野盗に遭うことがある。仕入れ・売りはそれぞれ1旬。</p>
    ${buyRow}<h4 class="hr-sub">持っている荷</h4>${sellRows}
    <button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>`;
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
  if (frozen(st)) { calendarStep(st); return H.heroEnd(st); } // 第五部: 天下は定まり、世の中は動かない（暦と家・領国のことだけ）
  const n0 = st.log.length;
  const snap = HA.snapLead(st); // 主人公の率いる軍勢は、大名のAIに動かさせない
  await runClanAI(st, st.player);
  HA.restoreLead(st, snap);
  await endTurn(st);
  const won = st.over === 'win'; // 主家が天下を一つにした（本体の勝ち）
  st.over = null; st.scenes = []; st.events = [];
  if (won) { calendarStep(st); if (CR.freeHero(st) && st.hero && !st.hero.over) { const ls = CR.lifeSummary(st, 'tenka'); st.hero.over = ls.join('　'); lines.push(...ls); } } // 勝ちの判定で月が止まらないよう、暦は進める
  lines.push(...st.log.slice(n0).filter((l) => l.mine && (l.kind === 'battle' || l.kind === 'castle' || l.kind === 'death')).map((l) => l.text).slice(-10));
  return H.heroEnd(st);
}
async function advance() {
  const st = s!;
  const lines: string[] = [];
  const monthPassed = st.hero!.jun >= H.HERO.JUN;
  if (st.hero!.jun >= H.HERO.JUN) {
    busy = true; render();
    const end = await monthStep(st, lines);
    busy = false;
    if (end) { report = [...lines, end, CR.freeHero(st) ? '一生を終えた。' : '試作はここまで。']; render(); try { localStorage.removeItem(KEY); } catch { /* 続ける */ } return; }
  }
  const cev = monthPassed && CR.careerMonth(st);
  if (cev) { lines.push(...cev.lines); for (const x of cev.lines) H.note(st, x); }
  if (lines.length) report = [...new Set(lines)];
  // 城下に着いたら、城下の画面へ戻る
  if (bg === 'tabi' && !st.hero!.field && (st.hero!.dest === null || st.hero!.dest === undefined)) { bg = 'town'; pane = 'spots'; }
  save(); render();
  if (cev && cev.beats.length && theater) { theater(cev.beats, () => { save(); render(); }, undefined, opt(st)); return; } // 出世の節目の場面
  runStory();
}
// 物語（前田利家 ― 残り火）: 時期の来た場面を、物語の画面で見せる
type Theater = (beats: Beat[], done: () => void, choose?: (key: string, id: string) => Beat[], opt?: { part2?: boolean; label?: string; cast?: Record<string, string>; tx?: (x: string) => string }) => void;
let theater: Theater | null = null;
export function setTheater(f: Theater) { theater = f; }
const chooser = (st: GameState) => (key: string, id: string) => M.storyChoose(st, key, id).beats; // 結果の数値は物語の画面に出さず、場面のあとで城下に
const opt0 = (st: GameState) => { const d = st.hero!.storyDone ?? []; return { part2: d.includes('katoku'), label: d.includes('ryo4') ? '残り火　第五部' : d.includes('ryo3') ? '残り火　第四部' : d.includes('ryo') ? '残り火　第三部' : d.includes('katoku') ? '残り火　第二部' : '残り火　第二幕' }; };
const opt = (st: GameState) => CR.freeHero(st) ? { part2: false, label: CR.houseName(st), cast: Object.fromEntries(Object.values(st.generals).map((g) => [g.id, g.name])), tx: M.genText } : opt0(st);
function runStory() {
  if (!s || !theater || busy) return;
  const ev = storyDue(s);
  if (!ev) return;
  const st = s;
  theater(ev.beats, () => {
    const lines = [...M.takeNotes(), ...(ev.apply?.(st) ?? [])];
    if (lines.length) { say = { text: lines.join('。').replace(/。。/g, '。') }; for (const x of lines) H.note(st, x); }
    if (ev.reset) { resetWorld(ev.reset, lines); return; }
    save(); render();
    runStory();
  }, chooser(st), opt(st));
}
// 部の切れ目: 世の中を史実のシナリオに合わせ直し、利家と前田家を移す
function resetWorld(sc: string, pre: string[] = []) {
  const old = s!;
  const g = newGame('oda', 'normal', undefined, sc);
  H.startHero(g, old.hero!.id);
  carryHero(old, g);
  s = g; bg = 'town'; pane = 'spots'; recenter = true; view = null; mapCanvas = null;
  const c = g.castles[g.hero!.town];
  say = { text: `${pre.length ? pre.join('。') + '。' : ''}${g.year}年${g.month}月。${clanName(g, g.generals[g.hero!.id].clan!)}家の者として、${c.name}の城下にいる。` };
  H.note(g, say.text);
  save(); render();
  runStory();
}
// 旗揚げ: 成れば、その家の当主として大名プレイへ移る
let toDaimyo: ((st: GameState) => void) | null = null;
export function setDaimyo(f: (st: GameState) => void) { toDaimyo = f; }
function toDaimyoPlay(st: GameState, clan: string) {
  const C2 = st.clans[clan]; C2.delegate = undefined;
  st.player = clan; st.hero = undefined; st.over = null;
  try { localStorage.removeItem(KEY); } catch { /* 続ける */ }
  if (root) root.hidden = true;
  if (toDaimyo) toDaimyo(st); else onQuit();
}
// 謀反: 主家に背いて家を立て、大名プレイへ
function rebelUp() {
  const st = s!, me = H.heroOf(st)!, from = me.clan!;
  const lordId = st.clans[from].leader;
  const kin = [...(st.hero!.retainers ?? [])];
  const r = CR.rebel(st);
  rebelArm = 0;
  if (!r.ok || !r.clan) { say = { text: r.text }; render(); return; }
  H.note(st, r.text);
  const C = st.clans[r.clan], c = st.castles[st.hero!.town];
  const rs = Object.values(st.generals).filter((g) => g.clan === r.clan && g.id !== me.id && g.status !== 'dead').sort((x, y) => +kin.includes(y.id) - +kin.includes(x.id)).slice(0, 2);
  const beats: Beat[] = [
    { kind: 'door', head: '謀反', text: '謀反', sub: `${st.year}年 ${c.name}` },
    ...(lordId ? [{ head: '広間', who: lordId, bg: 'zashiki_night', text: `${me.name}が、か。……飼い犬に手を噛まれたとは、言わぬ。わしが見誤ったのだ` }] : []),
    { head: c.name, bg: 'jinmaku', text: `${c.name}の櫓から${clanName(st, from)}家の旗が下ろされ、新しい旗が上がった。${C.name}家の名が、諸国に知れ渡る。` },
    ...rs.map((g) => ({ who: g.id, bg: 'jinmaku', text: 'どこまでも、お供いたします' })),
    { who: me.id, bg: 'jinmaku', text: 'もう誰の下にも立たぬ。……ここからは、わしが決める' },
    { kind: 'chapter', head: `${C.name}家`, text: '起つ', sub: '大名として' },
  ];
  const go = () => toDaimyoPlay(st, r.clan!);
  if (theater) theater(beats, go, undefined, opt(st)); else go();
}
function riseUp(how: 'youchi' | 'naio') {
  const st = s!, me = H.heroOf(st)!;
  const r = RP.rise(st, how);
  if (!r.ok || !r.clan) { say = { text: r.text }; H.note(st, r.text); void advance(); return; }
  const c = st.castles[st.hero!.town], C = st.clans[r.clan];
  H.note(st, r.text);
  const beats: Beat[] = [
    { kind: 'door', head: '旗揚げ', text: '旗揚げ', sub: `${st.year}年 ${c.name}` },
    { head: c.name, bg: how === 'youchi' ? 'night_fire' : 'zashiki_night', text: how === 'youchi' ? `夜の闇の中を、手勢が城へ寄せた。門が破られ、火が上がる。朝には、${c.name}の櫓に新しい旗が立っていた。` : `夜更けに、城の門が内から静かに開いた。手勢が流れ込み、声も上がらぬうちに、${c.name}は主を替えた。` },
    ...RP.followersOf(st).slice(0, 2).map((g) => ({ who: g.id, bg: 'zashiki_night', text: '殿。……これからは、そう呼ばせてもらう' })),
    { who: me.id, bg: 'zashiki_night', text: '浪人の旗だ。軽いぞ。……だが、今日からは、これが家の旗だ' },
    { kind: 'chapter', head: `${C.name}家`, text: '起つ', sub: '大名として' },
  ];
  const go = () => {
    // 武将で遊ぶを終え、この家の当主として大名プレイへ（家の政は自分で行う）
    toDaimyoPlay(st, r.clan!);
  };
  if (theater) theater(beats, go, undefined, opt(st)); else go();
}
// 城を願い出る: 足りていれば城を預かり、足りなければ主君にたしなめられる（1旬）
let retireArm = false;
function askShiro() {
  const st = s!, Hh = st.hero!, me = H.heroOf(st)!, L = H.lordOf(st);
  Hh.jun++;
  if (me.merit >= CR.CAREER.SHIRO_MERIT && Hh.favor >= CR.CAREER.SHIRO_FAVOR) {
    const c = st.castles.filter((x) => x.owner === me.clan && x.i !== L?.loc).sort((a, b) => a.chian - b.chian)[0];
    if (c) { const ev = CR.grantShiro(st, c); for (const x of ev.lines) H.note(st, x); say = { text: ev.lines.join('') }; save(); render(); if (theater) theater(ev.beats, () => { void advance(); }, undefined, opt(st)); else void advance(); return; }
  }
  Hh.favor = Math.max(0, Hh.favor - 2);
  say = { who: L?.id, line: '城を持つには、まだ早い。手柄を立て、わしの目にかなうてからにせよ。', text: `城はまだ預けられなかった（功績${Math.round(me.merit)}／${CR.CAREER.SHIRO_MERIT}・覚え${Hh.favor}／${CR.CAREER.SHIRO_FAVOR}）。主君の覚え−2。` };
  void advance();
}
// 家中の進言: 奥村・村井の話（物語の画面で）
function advice() {
  const st = s!;
  const a = M.nextAdvice(st);
  if (!a || !theater) return;
  save();
  theater(a.beats, () => { const n = M.takeNotes(); for (const x of n) H.note(st, x); say = { text: `家中の進言（${a.head}）を聞いた。${n.length ? n.join('。') + '。' : ''}` }; void advance(); }, chooser(st), { ...opt(st), part2: st.hero!.story === 'toshiie', label: `${st.hero!.story === 'toshiie' ? '前田家' : CR.houseName(st)}　家中の進言` });
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
  if (h === 'continue') { try { s = JSON.parse(localStorage.getItem(KEY)!); } catch { s = null; } if (s) { cmdDefault(s); s.hero!.hex ??= s.castles[s.hero!.town].hex; bg = 'town'; pane = 'spots'; recenter = true; say = { text: `${s.castles[s.hero!.town].name}の城下に戻った。` }; render(); runStory(); } return; }
  if (!s) return;
  if (s.hero?.over && !['pane', 'report-ok'].includes(h)) return; // 終わったあとは見るだけ
  if (h === 'pane') { if (id === 'tabi') recenter = true; pane = id as typeof pane; render(); return; }
  if (h === 'report-ok') { report = null; render(); return; }
  if (h === 'rest') { void act(() => H.rest(s!), 'town'); return; }
  if (h === 'skip') { skipTime(); return; }
  if (h === 'advice') { advice(); return; }
  if (h === 'askshiro') { askShiro(); return; }
  if (h === 'lead') { recenter = true; void act(() => HA.lead(s!), 'town'); return; }
  if (h === 'advance') { recenter = true; void act(() => HA.advance(s!, +id), 'town'); return; }
  if (h === 'disband') { void act(() => HA.disband(s!), 'town'); return; }
  if (h === 'selfcmd') { s.hero!.selfCommand = !s.hero!.selfCommand; save(); render(); return; }
  if (h === 'cact') { pane = 'shiro'; void act(() => HC.castleAct(s!, id as HC.CastleAct), 'town'); return; }
  if (h === 'kakae') { void act(() => KS.recruit(s!, id), 'yashiki'); return; }
  if (h === 'proxy') { void act(() => KS.proxy(s!), 'town'); return; }
  if (h === 'daikan') { pane = 'shiro'; const ci = +id, rs = KS.retainersOf(s), cur = s.hero!.daikan?.[ci]; const i = cur ? rs.findIndex((g) => g.id === cur) : -1; const nx = rs[i + 1]; KS.setDaikan(s, ci, nx ? nx.id : null); say = { text: nx ? `${s.castles[ci].name}の城代に${nx.name}を置いた。` : `${s.castles[ci].name}の城代を外した。` }; save(); render(); return; }
  if (h === 'shikan') { void act(() => CR.askService(s!), 'tojo'); return; }
  if (h === 'jingari') { void act(() => RP.jingari(s!, +id), 'town'); return; }
  if (h === 'leavemerc') { void act(() => RP.leaveMerc(s!), 'town'); return; }
  if (h === 'yojinbo') { void act(() => RP.yojinbo(s!), 'ichi'); return; }
  if (h === 'teach') { void act(() => RP.teach(s!), 'dojo'); return; }
  if (h === 'hire') { void act(() => RP.hire(s!), 'town'); return; }
  if (h === 'invite') { void act(() => RP.invite(s!, id), 'yashiki'); return; }
  if (h === 'scout') { void act(() => RP.scout(s!), 'teisatsu'); return; }
  if (h === 'hpol') { pane = 'homen'; say = { text: CR.setHomenPolicy(s, id as 'attack' | 'defend' | 'build', null) }; save(); render(); return; }
  if (h === 'htgt') { pane = 'homen'; say = { text: CR.setHomenPolicy(s, 'attack', id) }; save(); render(); return; }
  if (h === 'rebel') { if (rebelArm < 2) { rebelArm++; say = { text: rebelArm === 1 ? '主家に背けば、もう戻れない。' : '旗を翻せば、主家の兵が攻めて来る。' }; render(); return; } rebelUp(); return; }
  if (h === 'shuppon') { if (!leaveArm) { leaveArm = true; say = { text: '城を返し、主家を去る。もう一度押すと出奔する。' }; render(); return; } leaveArm = false; pane = 'spots'; const t = CR.leaveLord(s); H.note(s, t); say = { text: t }; save(); render(); return; }
  if (h === 'kaku') { void act(() => MB.raiseKaku(s!), 'yashiki'); return; }
  if (h === 'buymei') { void act(() => MB.buyMeibutsu(s!, id), 'ichi'); return; }
  if (h === 'kenmei') { void act(() => MB.giveMeibutsu(s!, id), 'tojo'); return; }
  if (h === 'chakai') { const me = H.heroOf(s)!; const gs = H.townsfolk(s, s.hero!.town).filter((g) => g.clan && g.id !== me.id).map((g) => g.id); void act(() => MB.chakai(s!, gs), 'yashiki'); return; }
  if (h === 'rise') { riseUp(id as 'youchi' | 'naio'); return; }
  if (h === 'retire') { if (!retireArm) { retireArm = true; say = { text: '家督を譲れば、一生はそこで締めになる。もう一度押すと隠居する。' }; render(); return; } retireArm = false; const ls = CR.retire(s); for (const x of ls) H.note(s, x); report = [...ls, '一生を終えた。']; save(); render(); return; }
  if (h === 'buy') { pane = 'akinai'; void act(() => T.buy(s!, +id), 'ichi'); return; }
  if (h === 'sell') { pane = 'akinai'; void act(() => T.sell(s!, id), 'ichi'); return; }
  if (h === 'gov') { pane = 'shiro'; void act(() => M.govern(s!, id as M.GovAct), 'town'); return; }
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
#hero .hr-ctiles{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:6px 0 8px}
#hero .hr-ctiles>div{background:#1a1713;border:1px solid rgba(207,169,94,.2);border-radius:3px;padding:5px 7px;display:flex;flex-direction:column;font-family:var(--font-ui,sans-serif)}
#hero .hr-ctiles span{font-size:10.5px;opacity:.7}
#hero .hr-ctiles b{font-size:14px}
#hero .hr-ctiles small{font-size:10px;opacity:.65}
@media (max-width:820px){#hero .hr-ctiles{grid-template-columns:repeat(2,1fr)}}
#hero .hr-sub{margin:14px 0 6px;font-size:13px;font-weight:600;color:#cfa95e;font-family:var(--font-ui,sans-serif)}
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

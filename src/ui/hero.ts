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
import * as PL from '../engine/plot';
import * as FA from '../engine/family';
import * as SK from '../engine/skill';
import * as MH from '../engine/myhyojo';
import * as YR from '../engine/yari';
import * as RY from '../engine/ryoshu';
import * as YO from '../engine/yorioya';
import * as BP from '../engine/banplay';
import * as BN from '../engine/ban';
import * as MS from '../engine/meisei';
import * as SA from '../engine/sasoi';
import * as GG from '../engine/gungi';
import { openBan } from './ban';
import { attackTargets, reachable } from '../engine/move';
import type { Beat } from '../data/story_toshiie';
import * as RK from '../engine/roninkake';
import * as KK from '../engine/kumikake';
import * as TK from '../engine/tosyukake';
import { PORTRAITS } from '../data/portraits';
import { STORY_PORTRAITS } from '../data/portraits_story';
import * as R from '../engine/rules';
import { rankName } from '../engine/ranks';
import { newGame } from '../engine/setup';
import { SCENARIOS } from '../data/scenarios';
import { castleAt, castleKoku, clanCastles, clanName } from '../engine/state';
import type { GameState, General } from '../engine/types';
import * as MC from './machi';
import * as TH from '../engine/tehodoki';
import { castleCom } from '../engine/money';

const KEY = 'sengoku-hero-auto';
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ART = (k: string) => SCENE_ART[k] ?? (k === 'minato' ? MINATO_ART : undefined);
const BG: Record<string, string> = { town: 'ichi', tojo: 'zashiki_day', yashiki: 'zashiki_night', chaya: 'chashitsu', ichi: 'ichi', dojo: 'jinmaku', tera: 'hondo', tabi: 'yukimichi', nanban: 'minato', fushin: 'ishigaki', teisatsu: 'tsukiyo', choryaku: 'zashiki_night', kenkin: 'zashiki_day', kenjo: 'zashiki_day', tsukaiban: 'yukimichi', monomi: 'tsukiyo', toyo: 'zashiki_night', joban: 'ishigaki', negaeri: 'zashiki_night', month: 'tsukiyo' };

type Face = (id: string | null | undefined, w: number) => string;
let s: GameState | null = null;
try { Object.defineProperty(window, "__hero", { get: () => s, configurable: true }); } catch { /* 試験用。なくても動く */ }
let face: Face = () => '';
let onQuit: () => void = () => {};
let root: HTMLElement | null = null;
let pane: 'spots' | 'yashiki' | 'tabi' | 'diary' | 'akinai' | 'shiro' | 'homen' = 'spots';
let bg = 'town';
let say: { who?: string; line?: string; text: string; hold?: boolean; offer?: boolean; kake?: RK.Kake } | null = null; // hold: セリフの窓（押すと閉じる）。offer: 主命を承るか断るか
let offerMsg = ''; // 誘いの窓に出す、さっきの返事の首尾
let dlg: { kind: 'person'; id: string } | { kind: 'bld'; id: MC.Bld } | { kind: 'cat'; id: Cat } | { kind: 'dojo' | 'tera' | 'offers' | 'ronko' | 'gungi' } | null = null;
let machiB: Record<MC.Bld, string[]> | null = null;
let tehKey: string | null = null, tehNew: string[] = []; // 手ほどき: いま押した行いの印・新しく済んだ目標の知らせ // 城下の町: 建物ごとの行動（描くたびに作り直す）
let ronkoAlloc: Record<string, number> = {}; // 論功行賞で配る手柄 // 画面に立ち上げる窓（会う相手・道場・寺）
let heldReport: string[] | null = null, heldBeats: Beat[] | null = null; // セリフの窓を閉じるまで待たせる、月の報告と出世の場面
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
  face = withStory(f); onQuit = quit;
  mount();
  s = null; pane = 'spots'; say = null; report = null; heldReport = null; heldBeats = null;
  renderPick();
}
function mount() {
  if (!document.getElementById('hero-style')) { const st = document.createElement('style'); st.id = 'hero-style'; st.textContent = CSS + MC.MACHI_CSS; document.head.appendChild(st); }
  root = document.getElementById('hero');
  if (!root) { root = document.createElement('div'); root.id = 'hero'; document.body.appendChild(root); root.addEventListener('click', onClick); window.matchMedia('(max-width:820px)').addEventListener('change', () => { if (root && !root.hidden && s) render(); }); } // 町の並び（横長・縦長）を画面の幅で切り替える
  root.hidden = false;
}
function close() { if (root) root.hidden = true; onQuit(); }

// ───────── 主人公を選ぶ: 年代 → 家（または浪人） → 武将 ─────────
let pickState: GameState | null = null, pickScen = '', pickClan: string | null = null; // pickClan: 家の id か 'ronin'
const pickReady = () => { if (!pickState || pickState.scenario !== pickScen) { let st = newGame('oda', 'normal', undefined, pickScen); if (!st.clans.oda?.alive) { const big = Object.values(st.clans).filter((c) => c.alive && clanCastles(st, c.id).length).sort((a, b) => clanCastles(st, b.id).length - clanCastles(st, a.id).length)[0]; st = newGame(big.id, 'normal', undefined, pickScen); } pickState = st; } return pickState; };
const candOf = (st: GameState, clan: string) => Object.values(st.generals).filter((g) => (clan === 'ronin' ? !g.clan && g.status === 'ronin' : g.clan === clan && st.clans[clan].leader !== g.id) && g.status !== 'young' && g.status !== 'dead' && g.status !== 'captive' && !g.ikki)
  .sort((a, b) => a.rank - b.rank || (b.bra + b.int + b.lea + b.cha) - (a.bra + a.int + a.lea + a.cha));
function renderPick() {
  const top = `<div class="hr-top"><button class="hr-btn ghost" data-h="${pickScen ? 'pback' : 'quit'}">${pickScen ? '← 戻る' : '← タイトルへ'}</button><span class="hr-tag">武将で遊ぶ</span></div>`;
  const cont = heroSaved() ? '<div class="hr-cont"><button class="hr-btn primary" data-h="continue">続きから</button></div>' : '';
  if (!pickScen) { // 年代
    root!.innerHTML = `<div class="hr-pick">${top}<h2>どの時代に生きるか</h2><p class="hr-lede">大名の家は大名（AI）が動かす。あなたは家臣の一人（または浪人）として城下を歩き、主命を果たし、人と交わって出世を目指す。謀反・出奔・仕官・旗揚げもできる。1か月は上旬・中旬・下旬の3旬。1旬に一つ行う。</p>${cont}
      <div class="hr-grid">${[...SCENARIOS].sort((a, b) => a.year - b.year).map((x) => `<button class="hr-card hr-era" data-h="pscen" data-id="${x.id}"><b>${esc(x.title)}</b><span>${x.year}年${x.month}月</span><span class="hr-st">${esc(x.lede)}</span></button>`).join('')}</div></div>`;
    return;
  }
  const st = pickReady(), sc = SCENARIOS.find((x) => x.id === pickScen)!;
  if (!pickClan) { // 家
    const cs = Object.values(st.clans).filter((c) => c.alive && clanCastles(st, c.id).length && candOf(st, c.id).length).sort((a, b) => clanCastles(st, b.id).length - clanCastles(st, a.id).length);
    const ronin = candOf(st, 'ronin').length;
    root!.innerHTML = `<div class="hr-pick">${top}<h2>${esc(sc.title)} ― どの家に仕えるか</h2><p class="hr-lede">${esc(sc.lede)}</p>
      <div class="hr-grid hr-clans">${cs.map((c) => { const L = c.leader ? st.generals[c.leader] : null; return `<button class="hr-card hr-clan" data-h="pclan" data-id="${c.id}"><span class="hr-cbar" style="background:${c.color}"></span>${L ? face(L.id, 64) : ''}<b>${esc(c.name)}家</b><span>当主 ${esc(L?.name ?? '―')}</span><span class="hr-st">${clanCastles(st, c.id).length}城・家臣${candOf(st, c.id).length}人</span></button>`; }).join('')}
      ${ronin ? `<button class="hr-card hr-clan" data-h="pclan" data-id="ronin"><span class="hr-cbar" style="background:#777"></span><b>浪人として</b><span>主を持たない</span><span class="hr-st">陣借り・仕官・旗揚げから（${ronin}人）</span></button>` : ''}</div></div>`;
    return;
  }
  const gs = candOf(st, pickClan);
  root!.innerHTML = `<div class="hr-pick">${top}<h2>${esc(sc.title)} ― ${pickClan === 'ronin' ? '浪人' : `${esc(clanName(st, pickClan))}家の家臣`}</h2><p class="hr-lede">${pickClan === 'ronin' ? '主を持たない身から始める。陣借りで名を上げて仕官するか、配下を集めて国衆の城で旗揚げする。' : '始めの身分によって、家を構えた所・城を預かった所から始まる（宿老は城持ちから）。'}</p>
    <div class="hr-grid">${gs.map((g) => { const mk = SK.masterSkill(g); return `<button class="hr-card" data-h="pick" data-id="${g.id}">${face(g.id, 96) || `<span class="hr-noface">${esc(g.name.slice(0, 2))}</span>`}
      <b>${esc(g.name)}</b><span>${g.clan ? R.RANK_NAME[g.rank] : '浪人'}・${st.year - (g.born ?? st.year - 30)}歳${mk ? `・${SK.SKILL_NAME[mk]}の名人` : ''}</span><span class="hr-st">武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}</span></button>`; }).join('')}</div></div>`;
}

// 物語（前田利家 ― 残り火）の第一幕から、1560年の世界の武将で遊ぶへ引き継ぐ
export function openHeroWith(f: Face, quit: () => void, st: GameState, first: { who?: string; line?: string; text: string }) {
  face = withStory(f); onQuit = quit;
  mount();
  s = st; pane = 'spots'; bg = 'town'; report = null; heldReport = null; heldBeats = null; recenter = true; say = first; cmdDefault(st);
  save(); render();
  runStory();
}
// ───────── 本体 ─────────
function begin(id: string) {
  s = pickState ?? newGame('oda', 'normal', undefined, '1560');
  pickState = null; pickScen = ''; pickClan = null;
  const gov = s.castles.find((c) => c.governor === id)?.i ?? null; // 城主だった城（startHero で外す前に）
  const ronin = !s.generals[id].clan;
  H.startHero(s, id); cmdDefault(s);
  if (ronin) { s.hero!.career = { steps: [], ronin: s.turn }; s.hero!.title = '浪人'; s.hero!.favor = 0; } // 浪人から始める
  const start = CR.startCareer(s, gov);
  for (const x of start) H.note(s, x);
  bg = 'town'; pane = 'spots';
  const me = H.heroOf(s)!, L = H.lordOf(s), town = s.castles[s.hero!.town].name;
  const line = !L ? '' : me.rank === 0 ? `${me.name}。そなたを頼りにしておる。主命は登城して受けよ。` : me.rank === 1 ? `${me.name}か。${town}の城下で励め。主命は登城して受けよ。` : `${me.name}か。この${town}の城下で励め。主命は登城して受けよ。`;
  if (!ronin && CR.hasStep(s, 'shiro')) { save(); if (maybeRyoshu(s)) return; }
  say = ronin ? { text: `${me.name}は浪人として、${town}の城下に立った。陣借りや用心棒で名を上げ、大名の城下で仕官を願うか、配下を集めて旗揚げする。` } : { who: L?.id, line, text: `${me.name}（${R.RANK_NAME[me.rank]}）として、${town}の城下に立った。${start.length ? start.join('。') + '。' : ''}` };
  save(); render();
}
function render() {
  if (!s || !root) return;
  TH.storyKit(s); // 利家の物語の支度（一度だけ）
  const st = s, Hh = st.hero!, me = H.heroOf(st)!, c = st.castles[Hh.town];
  const townArt = !H.inArmy(st) && bg === 'town' && !Hh.field ? ({ ichijodani: SCENE_ART.story_fuchu, nanao: SCENE_ART.story_nanao, kanazawa: SCENE_ART.story_kanazawa, toyama_c: SCENE_ART.story_moriyama } as Record<string, string | undefined>)[c.id] : undefined; // 物語で治める城（府中・七尾）は、その城の絵
  const spotsOut = pane === 'spots' || machiable(st) ? spotsHtml(st) : '';
  machiB = machiable(st) ? MC.split(spotsOut) : null;
  // 町の表示で、場面のある行動（主命の普請・偵察・献上など）の結果は、その場面の絵を添えて町の上に出す（町の絵が場面の代わりになったので）
  const sayArt = machiB && say && !dlg && bg !== 'town' && BG[bg] ? ART(BG[bg]) : undefined;
  const art = townArt && (Hh.fuchu === Hh.town || (Hh.ryo ?? []).includes(Hh.town)) ? townArt : ART(H.inArmy(st) ? 'jinmaku' : BG[bg] ?? 'ichi');
  root.innerHTML = `<div class="hr-main">
    ${headHtml(st)}${machiB ? '' : stripsHtml(st)}
    <div class="hr-body">
      <section class="hr-scene${mapMode(st) ? ' map' : ''}${machiB ? ' machi' : ''}" style="${art && !mapMode(st) && !machiB ? `background-image:url(${art})` : ''}">
        ${mapMode(st) ? '<div id="hr-mapslot"></div>' : ''}
        <div class="hr-town">${H.inArmy(st) ? (() => { const a = H.inArmy(st)!; return `<b>${esc(st.generals[a.main]?.name ?? '')}の陣中</b><span>${esc(castleAt(st, a.hex)?.name ?? PROVINCES[HEXES[a.hex].p].name + 'の野')}・兵${a.troops.toLocaleString('ja-JP')}・士気${a.morale.toFixed(2)}</span>`; })() : Hh.field ? `<b>${esc(PROVINCES[HEXES[Hh.hex].p].name)}の野</b><span>旅の途中</span>` : `<b>${esc(c.name)}の城下</b><span>${c.owner ? `${esc(clanName(st, c.owner))}家の城` : '国人の城'}${c.owner && c.owner !== me.clan ? '（他国）' : ''}</span>`}</div>
        ${machiB ? MC.machiHtml(machiB, machiView(st), RP.isRonin(st), !!say?.hold || !!dlg || !!report, tehMarks(st).bld) : ''}
        ${dlg && !report ? dlgHtml(st) : ''}
        ${say && !dlg ? `<div class="hr-say${mapMode(st) ? ' mini' : ''}${sayArt ? ' scene' : machiB && !say.hold ? ' machi' : ''}${say.hold && !say.offer ? ' hold' : ''}"${sayArt && !say.offer ? ' data-h="scene-close"' : say.hold && !say.offer ? ' data-h="say-close"' : ''}>${sayArt ? `<div class="hr-sayart" style="background-image:url(${sayArt})"></div>` : ''}${say.kake?.length ? kakeHtml(st, say.kake) : ''}${say.who && say.line ? `<div class="hr-who">${face(say.who, 128) || ''}<div><b>${esc(st.generals[say.who]?.name ?? '')}</b><p>「${esc(say.line)}」</p></div></div>` : ''}<p class="hr-text">${esc(say.text)}</p>${say.offer ? hyojoHtml(st) : say.hold || sayArt ? '<span class="hr-close">▼ 押して閉じる</span>' : ''}</div>` : ''}
      </section>
      <aside class="hr-side">
        <nav class="hr-tabs">${(['spots', 'yashiki', 'tabi'] as const).filter((k) => !(machiB && k === 'yashiki')).map((k) => `<button class="${pane === k ? 'on' : ''}" data-h="pane" data-id="${k}">${{ spots: '城下', yashiki: '屋敷', tabi: '旅' }[k]}</button>`).join('')}</nav>
        <div class="hr-pane">${pane === 'spots' ? (machiB ? MC.sideHtml(machiB, meInfo(st) + kuniInfo(st), tehHtml(st) + stripsHtml(st)) : tehHtml(st) + (townish(st) ? '<p class="hr-note"><button class="hr-btn ghost sm" data-h="machi" data-id="machi">町で表示する</button></p>' : '') + spotsOut) : pane === 'yashiki' ? peopleHtml(st) : pane === 'tabi' ? travelHtml(st) : pane === 'akinai' ? tradeHtml(st) : pane === 'shiro' || pane === 'homen' ? (isRyoOut(st) ? ryoOutNote() : pane === 'shiro' ? castleHtml(st) : homenHtml(st)) : diaryHtml(st)}</div>
      </aside>
    </div>
    ${report ? `<div class="hr-modal"><div class="hr-report"><h3>${Hh.over && CR.freeHero(st) ? '一生の締め' : `${st.year}年${st.month}月を迎えた`}</h3><ul>${report.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${Hh.over && CR.freeHero(st) && FA.heirSon(st) ? `<button class="hr-btn primary" data-h="succeed">${esc(FA.heirSon(st)!.name)}が家を継いで続ける</button> ` : ''}<button class="hr-btn${Hh.over && FA.heirSon(st) ? '' : ' primary'}" data-h="report-ok">${Hh.over ? '閉じる' : '城下へ'}</button></div></div>` : ''}
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
// 城下の町（建物）で見せる時: 町にいて、陣中・旅の途中・総大将・陣借りでない時
const townish = (st: GameState) => !st.hero!.over && !st.hero!.field && !H.inArmy(st) && !HA.leading(st) && !st.hero!.merc && !mapMode(st);
const machiable = (st: GameState) => MC.machiOn() && townish(st);
// 右の欄（町の表示）: 自分のこと。顔・名・家と身分・歳・主君・寄親/寄子・家臣、功績（次の身分まで）・体力・主君の覚え・名声のつまみ
const bar = (v: number, max: number, cls = '') => `<span class="hr-bar${cls}"><i style="width:${Math.max(0, Math.min(100, (v / Math.max(1, max)) * 100)).toFixed(0)}%"></i></span>`;
function meInfo(st: GameState) {
  const Hh = st.hero!, me = H.heroOf(st)!, L = H.lordOf(st), ronin = RP.isRonin(st);
  const age = me.born ? `${st.year - me.born}歳` : '';
  const next = me.clan && me.rank > 0 ? R.MERIT_AT[me.rank - 1] : null;
  const yo = Hh.yorioya ? st.generals[Hh.yorioya] : null, yk = YO.yorikoOf(st), rs = KS.retainersOf(st), cap = KS.capOf(st);
  const sks = (Object.keys(SK.SKILL_NAME) as SK.SkillKey[]).filter((k) => SK.expOf(st, k) > 0).map((k) => `${SK.SKILL_NAME[k]}${SK.lv(st, k)}`).join('・');
  const fd = ronin ? MS.fudaOf(st) : [];
  const hp = SK.hpOf(st), hpm = SK.hpMax(st);
  const rows: [string, string][] = [
    ...(L && L.id !== me.id ? [['主君', esc(L.name)] as [string, string]] : []),
    ...(yo ? [['寄親', `${esc(yo.name)}（親しさ${Hh.rel[yo.id] ?? 0}）`] as [string, string]] : []),
    ...(yk.length ? [['寄子', yk.map((g) => esc(g.name)).join('・')] as [string, string]] : []),
    ...(cap || rs.length ? [['家臣', `${rs.length}／${cap}人`] as [string, string]] : []),
    ...(next !== null ? [['功績', `${Math.round(me.merit)}／${next}（${R.RANK_NAME[me.rank - 1]}まで）${bar(me.merit, next)}`] as [string, string]] : me.clan ? [['功績', `${Math.round(me.merit)}`] as [string, string]] : []),
    ['体力', `${SK.isSick(st) ? '<b style="color:#d26a5c">病</b> ' : ''}${hp}／${hpm}${bar(hp, hpm, hp <= SK.HP.TIRED ? ' low' : ' hp')}`],
    ...(L && L.id !== me.id ? [['主君の覚え', `${Hh.favor}${bar(Hh.favor, 100)}`] as [string, string]] : []),
    ...([['名声', `${Hh.fame ?? 0}${fd.length ? `・札${fd.map((x) => `「${esc(x.name)}」`).join('')}` : ''}`] as [string, string]]),
    ...(sks ? [['技能', sks] as [string, string]] : []),
  ];
  return `<h4 class="hr-sub">わが身</h4><div class="hr-me">${myFace(st, 72)}<div><b>${esc(me.name)}</b><span>${me.clan ? `${esc(clanName(st, me.clan))}家・${R.RANK_NAME[me.rank]}` : '浪人'}${Hh.title ? `・${esc(Hh.title)}` : ''}${age ? `・${age}` : ''}</span><span>武${me.bra}・知${me.int}・統${me.lea}・魅${me.cha}</span><span>手元${Hh.gold.toLocaleString('ja-JP')}貫・進物${Hh.goods}</span></div></div><dl class="hr-kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}
// 右の欄（町の表示）: いる国のこと。この城（持ち主・城主・石高・城兵・治安・商業・城の種類）と、同じ国の城の持ち主
function kuniInfo(st: GameState) {
  const c = st.castles[st.hero!.town], pv = PROVINCES[HEXES[c.hex].p];
  const gov = c.governor ? st.generals[c.governor] : null;
  const owner = (x: typeof c) => (x.owner ? `${esc(clanName(st, x.owner))}家` : '国衆');
  const rows: [string, string][] = [
    ['持ち主', owner(c)], ...(gov ? [['城主', esc(gov.name)] as [string, string]] : []),
    ['石高', `${castleKoku(c).toFixed(1)}万石`], ['城兵', `${Math.round(c.garrison).toLocaleString('ja-JP')}`],
    ['治安', `${Math.round(c.chian)}${bar(c.chian, 100)}`], ['商業', `月${Math.round(castleCom(c)).toLocaleString('ja-JP')}貫`],
    ['城', `${R.CASTLE_KIND[c.kind ?? 'hira'].name}`],
  ];
  const cs = st.castles.filter((x) => PROVINCES[HEXES[x.hex].p] === pv);
  return `<h4 class="hr-sub">${esc(pv.name)}・${esc(c.name)}</h4><dl class="hr-kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${cs.length > 1 ? `<ul class="hr-kuni">${cs.map((x) => `<li class="${x.i === c.i ? 'here' : ''}"><span>${esc(x.name)}</span><em>${owner(x)}・${castleKoku(x).toFixed(1)}万石</em></li>`).join('')}</ul>` : ''}`;
}
// ───────── 画面上部（大名プレイと同じ作り）: 印・名と日付・数字・札（内政・軍事・人事・外交・商い・記録）・休む ─────────
// 札は身分と立場で使えるようになる。使えない札は暗くし、押すと理由を出す
type Cat = 'naisei' | 'gunji' | 'jinji' | 'gaiko' | 'akinai' | 'kiroku';
const CAT_NAME: Record<Cat, string> = { naisei: '内政', gunji: '軍事', jinji: '人事', gaiko: '外交', akinai: '商い', kiroku: '記録' };
const GUNJI_H = ['lead', 'gungi-open', 'ronko', 'selfcmd', 'join', 'advance', 'disband'];
function catWhy(st: GameState, k: Cat): string | null {
  const me = H.heroOf(st)!, Hh = st.hero!, ronin = RP.isRonin(st) || !me.clan;
  if (Hh.over) return k === 'kiroku' ? null : 'この一生は終わった。';
  if (k === 'naisei') return M.canGovern(st) && !isRyoOut(st) ? null : isRyoOut(st) ? '城の政は大名の画面（領）で行う。' : '城を預かると使える。';
  if (k === 'gunji') return ronin ? '浪人には率いる軍勢がない。' : me.rank <= 1 || CR.homenOf(st) ? null : '侍大将になると使える（総大将として軍勢を率いる）。';
  if (k === 'jinji') return KS.retainersOf(st).length || YO.yorikoOf(st).length || RP.followersOf(st).length || KS.azukeOf(st).length ? null : '家臣・寄子・配下ができると使える。';
  if (k === 'gaiko') return ronin ? '浪人には主家がない。' : !CR.freeHero(st) ? '物語の中では使えない。' : me.rank <= 2 ? null : '足軽大将になると使える（主家との縁・謀反の支度）。';
  if (k === 'akinai') return !Hh.field && !H.inArmy(st) && T.canTrade(st, st.castles[Hh.town]) ? null : '商いのできる町にいる時に使える。';
  return null;
}
function headHtml(st: GameState) {
  const Hh = st.hero!, me = H.heroOf(st)!;
  const stat = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const hp = SK.hpOf(st);
  const stats = [
    `<div class="clan-chip">${me.clan ? `<span class="swatch" style="background:${st.clans[me.clan]?.color ?? '#888'}"></span>${esc(clanName(st, me.clan))}家` : '浪人'}</div>`,
    stat('金', `${Hh.gold.toLocaleString('ja-JP')}貫`),
    stat('名声', `${Hh.fame ?? 0}`), stat('体力', `${SK.isSick(st) ? '<b style="color:#d26a5c">病</b> ' : ''}${hp}／${SK.hpMax(st)}`),
    ...(me.clan ? [stat('率いる兵', `${H.heiCap(st).toLocaleString('ja-JP')}まで`)] : []),
    ...(Hh.ie ? [stat(Hh.story === 'toshiie' ? '荒子衆' : '手勢', `${Hh.ie.shu}`)] : []),
  ].join('');
  const tm = tehMarks(st);
  const cats = (Object.keys(CAT_NAME) as Cat[]).map((k) => { const w = catWhy(st, k); return `<button type="button" class="plaque${w ? ' off' : ''}${!w && tm.cat.has(k) ? ' teh' : ''}" data-h="cat" data-id="${k}" title="${esc(w ?? CAT_NAME[k])}">${CAT_NAME[k]}</button>`; }).join('');
  const camp = H.inArmy(st) && !HA.leading(st);
  return `<header class="bar hr-head"><div class="brand"><button type="button" class="seal" data-h="quit" title="保存してタイトルへ">陣</button><div class="brand-text hr-id"><div class="title"><b>${esc(me.name)}</b><span>${me.clan ? `${clanName(st, me.clan)}家・${R.RANK_NAME[me.rank]}` : '浪人'}${Hh.title ? `・${esc(Hh.title)}` : ''}</span></div><div class="date hr-date">${H.JUN_NAME[Math.min(2, Hh.jun)]}<small>${st.year}年${st.month}月</small></div></div></div>
    <dl class="stats hr-stats">${stats}</dl>
    <nav class="cmds">${cats}<button type="button" class="seal-btn" data-h="${camp ? 'campwait' : 'rest'}" ${Hh.over ? 'disabled' : ''} title="1旬を過ごす">${camp ? '陣中で過ごす' : '休む'}</button></nav></header>`;
}
// 目標・寄親/寄子・主命・領地の帯（町の表示では右の欄の上に）
function stripsHtml(st: GameState) {
  const Hh = st.hero!, q = Hh.quest, L = H.lordOf(st);
  return `${Hh.fuchu !== undefined ? `<div class="hr-quest"><b>${Hh.story !== 'toshiie' ? '領地' : (Hh.storyDone ?? []).includes('ryo') ? '領国' : '府中'}</b> ${esc(M.fuchuText(st))}</div>` : ''}
    ${CR.freeHero(st) && !Hh.over ? `<div class="hr-quest"><b>目標</b> ${esc(CR.goalText(st))}</div>` : TH.chapOf(st) && !Hh.over ? (() => { const n = nextStory(st); return `<div class="hr-quest"><b>物語</b> ${TH.CHAP_NAME[TH.chapOf(st)!]}${n ? `<span>次の場面は${esc(n.when)}</span>` : ''}</div>`; })() : ''}
    ${YO.needsYori(st) && !Hh.over ? yoriLine(st) : ''}${YO.needsYoriko(st) && !Hh.over ? yorikoLine(st) : ''}
    <div class="hr-quest">${q ? `<b>主命</b> ${esc(H.QUEST_NAME[q.kind])}：${esc(H.questText(st, q))} <span>${q.done >= q.need ? '<em>果たした。登城して報告せよ</em>' : `期日まで${Math.max(0, q.until - st.turn)}か月`}</span>` : `<b>主命</b> なし。${L ? `主君${esc(L.name)}は${esc(st.castles[L.loc].name)}にいる。登城すれば主命を受けられる。` : ''}`}</div>`;
}
// 札を押した: 開く欄か窓
function onCat(st: GameState, k: Cat) {
  const w = catWhy(st, k);
  if (w) { say = { text: `${CAT_NAME[k]}: ${w}` }; dlg = null; render(); return; }
  if (k === 'kiroku') { pane = 'diary'; dlg = null; render(); return; }
  if (k === 'naisei') { pane = 'shiro'; dlg = null; render(); return; }
  if (k === 'gaiko') { pane = 'homen'; dlg = null; render(); return; }
  if (k === 'akinai') { pane = 'akinai'; dlg = null; render(); return; }
  dlg = { kind: 'cat', id: k }; say = null; render(); showDlg();
}
// 軍事・人事の窓
function catWin(st: GameState, k: Cat) {
  let body = '';
  if (k === 'gunji') {
    const all = spotsHtml(st), xs = [...all.matchAll(/<button[\s\S]*?<\/button>/g)].map((m) => m[0]).filter((x) => GUNJI_H.some((h) => x.includes(`data-h="${h}"`)));
    const hf = CR.homenOf(st);
    body = (hf ? `<button class="hr-spot main" data-h="pane" data-id="homen"><b>方面の差配</b><span>方針と攻略の目標・与力</span></button>` : '') + (xs.join('') || '<p class="hr-none">いま軍勢についてできることはない。攻略の主命を受けると、軍勢を率いて出陣できる。</p>');
  } else {
    const ps = [...KS.retainersOf(st), ...YO.yorikoOf(st), ...RP.followersOf(st)].filter((g, i, a) => a.indexOf(g) === i);
    const role = (g: General) => KS.retainersOf(st).includes(g) ? '家臣' : YO.yorikoOf(st).includes(g) ? '寄子' : '配下';
    body = ps.map((g) => `<button class="hr-person hr-meet" data-h="meet" data-id="${g.id}">${face(g.id, 44) || `<span class="hr-noface sm">${esc(g.name.slice(0, 1))}</span>`}<div class="hr-pi"><b>${esc(g.name)}</b><span>${role(g)}・武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}・親しさ${st.hero!.rel[g.id] ?? 0}</span></div></button>`).join('') + azukeHtml(st);
  }
  return `<div class="hr-dlg hr-bldwin"><div class="hr-bldart" style="background-image:url(${ART(k === 'gunji' ? 'jinmaku' : 'zashiki_day') ?? ''})"><h4>${CAT_NAME[k]}<small>${esc(H.heroOf(st)!.name)}</small></h4></div><div class="hr-bldbody">${body}</div><div class="hr-bldfoot"><button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div></div>`;
}
// ───────── 手ほどき（前田利家の物語の中だけ） ─────────
const TEH_KEY = 'sengoku-teh';
const tehOn = () => { try { return localStorage.getItem(TEH_KEY) !== 'off'; } catch { return true; } };
function tehSet(on: boolean) { try { localStorage.setItem(TEH_KEY, on ? 'on' : 'off'); } catch { /* 続ける */ } }
const TEH_NOW = new Set(['q-pick', 'q-accept', 'gungi-open', 'ryo-back', 'myhyo', 'meet']); // 窓を開くだけの行い（act を通らない）は押した時に記録
function tehRecord(st: GameState) { if (!tehKey) return; TH.did(st, tehKey); tehKey = null; const n = TH.sync(st); if (n.length) { tehNew = n; for (const x of n) H.note(st, x); } }
function tehHtml(st: GameState) {
  const gs = TH.goalsOf(st); if (!gs) return '';
  if (!tehOn()) return '<p class="hr-note"><button class="hr-btn ghost sm" data-h="teh-on">手ほどきを出す</button></p>';
  const left = gs.list.filter((x) => !x.done).length;
  return `<div class="hr-teh"><h4 class="hr-sub">手ほどき ― ${TH.CHAP_NAME[gs.chap]}<span>${left ? `あと${left}` : 'すべて済んだ'}</span></h4>${tehNew.length ? `<p class="hr-tehnew">${tehNew.map(esc).join('<br>')}</p>` : ''}<ul>${gs.list.map(({ g, done }) => `<li class="${done ? 'done' : ''}"><b>${done ? '✓' : '・'} ${esc(g.label)}</b>${done ? '' : `<span>${esc(g.hint)}</span>`}</li>`).join('')}</ul><button class="hr-btn ghost sm" data-h="teh-off">手ほどきを消す</button></div>`;
}
const tehMarks = (st: GameState) => (tehOn() ? TH.marks(st) : { bld: new Set<string>(), cat: new Set<string>() });
// 顔: 武将の顔がなければ、物語の人物の顔（奥村永福・村井長頼など、利家の物語で家臣になる人）
const withStory = (f: Face): Face => (id, w) => f(id, w) || (id && STORY_PORTRAITS[id] ? `<img class="face" src="${STORY_PORTRAITS[id]}" width="${w}" height="${Math.round(w * 1.25)}" alt="">` : '');
// 町の見た目: スマホか・城の大きさ（15万石以上は天守の城）・自分の屋敷（家の格。浪人は長屋）・冬（十二月〜二月は雪）
const narrow = () => window.matchMedia('(max-width:820px)').matches;
function machiView(st: GameState): MC.MachiView {
  const c = st.castles[st.hero!.town], k = st.hero!.ie ? MB.kakuOf(st) : 1;
  return { sp: narrow(), castle: castleKoku(c) >= 15 ? 'l' : 's', ie: RP.isRonin(st) ? 'nagaya' : k >= 4 ? 'l' : k >= 2 ? 'm' : 's', snow: st.month === 12 || st.month <= 2 };
}
// 建物の窓: 一覧から振り分けたボタンに、道場・寺の稽古、武家屋敷の顔ぶれ、自分の屋敷の家のことを添える
function bldWin(st: GameState, id: MC.Bld) {
  const b = machiB ?? MC.split(spotsHtml(st)), ronin = RP.isRonin(st);
  let xs = [...(b[id] ?? [])];
  const strip = (h: string) => h.replace(/^<div class="hr-dlg">/, '').replace(/<button class="hr-btn hr-dclose" data-h="dlg-close">閉じる<\/button><\/div>$/, '');
  if ((id === 'dojo' || id === 'tera') && CR.heroPlay(st) && !ronin) { const keep = dlg; dlg = { kind: id }; const inner = strip(dlgHtml0(st)); dlg = keep; xs = xs.map((x) => (x.includes(`data-h="spot" data-id="${id}"`) ? inner.replace(/^<h4[\s\S]*?<\/h4>/, '') : x)); }
  if (id === 'buke') xs = xs.map((x) => (x.includes('data-h="spot" data-id="yashiki"') ? peopleHtml(st, true) : x));
  const VERB: Record<string, string> = { chaya: '旅人の話を聞く', ichi: '進物を買う', dojo: '稽古する', tera: '学問する', nanban: '南蛮の品を見る', tabi: '旅に出る' }; // 窓の中では、場所の名でなく、することを書く
  xs = xs.map((x) => x.replace(/(data-h="spot" data-id="(\w+)"[^>]*><b>)[^<]*(<\/b>)/, (m, a, k, b) => (VERB[k] ? a + VERB[k] + b : m)));
  const house = houseHtml(st), cha = /<button class="hr-spot" data-h="chakai"[\s\S]*?<\/button>/.exec(house)?.[0] ?? '';
  if (id === 'ie') xs.push(house.replace(cha, '') || skillNote(st), ...(peopleHtml(st).match(/<p class="hr-note"><b>(?:配下|家臣)[\s\S]*?<\/p>/g) ?? []), azukeHtml(st)); // 家のこと・配下・家臣
  if (id === 'shiro' && cha) xs.push(cha);
  const name = id === 'ie' ? MC.ieName(ronin) : MC.BLD_NAME[id];
  const art = ART(MC.bldArt(id, st.month, ronin)) ?? '';
  const res = say && !say.hold ? `<div class="hr-bldres">${say.text.split('\n').map((x) => `<p>${esc(x)}</p>`).join('')}</div>` : '';
  return `<div class="hr-dlg hr-bldwin"><div class="hr-bldart" style="${art ? `background-image:url(${art})` : ''}"><h4>${id === 'shiro' ? esc(st.castles[st.hero!.town].name) : name}<small>${esc(st.castles[st.hero!.town].name.replace(/城$/, ''))}の城下</small></h4></div>${res}<div class="hr-bldbody">${xs.join('') || '<p class="hr-none">いまここでできることはない。</p>'}</div><div class="hr-bldfoot"><button class="hr-btn hr-dclose" data-h="dlg-close">町へ戻る</button></div></div>`;
}
function spotsHtml(st: GameState) {
  if (st.hero!.over) return `<p class="hr-note">${esc(st.hero!.over)}</p><button class="hr-spot main" data-h="quit"><b>タイトルへ</b><span>この遊びは終わった</span></button>`;
  const rn = roninSpots(st); if (rn !== null) return rn;
  const ld = HA.leading(st);
  const cmdBtn = H.heroOf(st)!.rank > 2 && !HA.leading(st) ? '<p class="hr-note">足軽組頭は一兵として戦う（自分の部隊を率いる立場ではないので、合戦は任せる）。</p>' : `<button class="hr-spot" data-h="selfcmd"><b>合戦の采配: ${st.hero!.selfCommand ? '自ら' : '任せる'}</b><span>${st.hero!.selfCommand ? '合戦の画面で自分の隊（総大将なら軍勢の全部隊）を動かす。押すと任せる' : '合戦はAIに任せる。押すと自ら采配する'}</span></button>`;
  if (ld) return `<p class="hr-note">総大将として軍勢（兵${ld.troops.toLocaleString('ja-JP')}・士気${ld.morale.toFixed(2)}・残りの足${ld.mp}）を率いている。地図で行き先を押せば進み、敵の城か軍勢を押せば出陣を命じる（月の終わりに合戦）。${st.hero!.order !== undefined ? `出陣先: ${esc(castleAt(st, st.hero!.order)?.name ?? '敵の軍勢')}` : ''}</p>
    ${st.hero!.order !== undefined ? `<p class="hr-note"><b>出陣を命じてある</b>（${esc(castleAt(st, st.hero!.order)?.name ?? '敵の軍勢')}）。陣中で過ごせば、月の終わりに合戦となる。</p>` : st.hero!.quest?.kind === 'kouryaku' ? (() => { const qc = st.castles[st.hero!.quest!.castle], adj = attackTargets(st, ld).some((x) => x.hex === qc.hex); return `<button class="hr-spot main" data-h="advance" data-id="${qc.i}"><b>${adj ? `${esc(qc.name)}を攻める` : `${esc(qc.name)}へ進む`}</b><span>${adj ? '隣まで来た。出陣を命じる（月の終わりに合戦）' : '攻略の城へ、今月の足の分だけ近づく'}</span></button>`; })() : ''}
    ${GG.targetCastle(st) ? (() => { const w = GG.gungiBlock(st); return `<button class="hr-spot main" data-h="gungi-open" ${w ? 'disabled' : ''}><b>軍議を開く</b><span>${w ? esc(w) : `${esc(GG.targetCastle(st)!.name)}の攻め方を決める（力攻め・兵糧攻め・調略・夜討ち。1旬・月に一度）${st.hero!.hyoro ? '。いま兵糧攻めで囲んでいる' : ''}`}</span></button>`; })() : ''}
    <button class="hr-spot" data-h="pane" data-id="tabi"><b>地図で軍勢を動かす</b><span>行き先・出陣先を選ぶ</span></button>${cmdBtn}
    <button class="hr-spot" data-h="rest"><b>陣中で過ごす</b><span>1旬。月の終わりに軍勢が動き、合戦が起きる</span></button>
    <button class="hr-spot dim" data-h="disband"><b>軍勢を解く</b><span>兵は近くの城へ、手勢は家へ戻す</span></button>`;
  const a = H.inArmy(st);
  if (a) return `${cmdBtn}<p class="hr-note">${esc(st.generals[a.main]?.name ?? '')}の軍勢にいる。軍勢は大名（AI）の采配で動き、合戦もこの軍勢とともに戦う（勝てば功績が入る）。</p>
    <button class="hr-spot" data-h="campwait"><b>陣中で過ごす</b><span>1旬。体を休めつつ戦を待つ（体力+${SK.HP.CAMP_REST}。いま${SK.hpOf(st)}／${SK.hpMax(st)}）</span></button>
    <button class="hr-spot" data-h="visit" data-id="${a.main}"><b>軍議に出る</b><span>主将${esc(st.generals[a.main]?.name ?? '')}を訪ねる（1旬）</span></button>
    <button class="hr-spot" data-h="pane" data-id="yashiki"><b>陣中の武将を訪ねる</b><span>同じ軍勢の顔ぶれ</span></button>
    ${SK.isSick(st) ? `<p class="hr-note" style="color:#d26a5c">病に伏している。陣中で過ごすか、陣を離れて近くの城へ下がり養生する。</p>` : ""}<button class="hr-spot${SK.isSick(st) || SK.hpOf(st) <= SK.HP.TIRED || (st.hero!.quest && st.hero!.quest.done >= st.hero!.quest.need) ? " main" : " dim"}" data-h="leavecamp"><b>陣を離れる</b><span>${esc(H.leaveCampNote(st))}</span></button>`;
  const join = H.armiesHere(st).map((x) => `<button class="hr-spot main" data-h="join" data-id="${x.id}"><b>陣に加わる</b><span>${esc(st.generals[x.main]?.name ?? '')}の軍勢（兵${x.troops.toLocaleString('ja-JP')}）${st.hero!.quest?.kind === 'shutsujin' && st.hero!.quest.army === x.id ? '・主命の軍勢' : ''}</span></button>`).join('');
  if (st.hero!.field) return join +  `<p class="hr-note">城下ではない野にいる。旅を続けるか、休むことしかできない。</p><button class="hr-spot" data-h="pane" data-id="tabi"><b>旅を続ける</b><span>地図で行き先を選ぶ</span></button><button class="hr-spot dim" data-h="rest"><b>休む</b><span>1旬を過ごす</span></button>`;
  const c = st.castles[st.hero!.town];
  const spots = H.spotsOf(st, c);
  const sick = SK.isSick(st) ? `<p class="hr-note" style="color:#d26a5c">病に伏している（あと${H.heroOf(st)!.sick}か月ほど）。休むことしかできない。</p>` : '';
  const work = H.canWork(st) ? `<button class="hr-spot main" data-h="work"><b>主命を果たす</b><span>${esc(H.QUEST_NAME[st.hero!.quest!.kind])}（1旬）</span></button>` : '';
  const desc: Record<H.Spot, string> = { tojo: `上旬の評定で主命を選ぶ・報告する${st.hero!.jun === 0 ? '（いま評定の時）' : ''}`, yashiki: '武将を訪ねて親しくなる', chaya: '噂を聞く。他国なら城の様子も', ichi: `進物を買う（${H.HERO.GOODS_COST}貫）`, dojo: CR.freeHero(st) ? '稽古で武勇・統率を磨く。武芸・築城・忍術の独学（一段まで）' : `稽古で武勇・統率を磨く（${H.HERO.TRAIN_COST}貫）`, tera: CR.freeHero(st) ? '学問で知略・魅力を磨く。弁舌・算術・茶道の独学（一段まで）' : `学問で知略・魅力を磨く（${H.HERO.TRAIN_COST}貫）`, tabi: 'ほかの城下へ', nanban: '南蛮の品と噂（試作では茶屋と同じ）' };
  const ryoOut = isRyoOut(st);
  const gov = M.canGovern(st) && !ryoOut ? `<button class="hr-spot main" data-h="pane" data-id="shiro"><b>城の政</b><span>${esc(M.fuchuText(st))}。開発・商業・新田・普請・見回り・城代など</span></button>` : '';
  const prx = KS.canProxy(st) ? `<button class="hr-spot" data-h="proxy"><b>家臣を遣わす</b><span>この主命（${esc(H.QUEST_NAME[st.hero!.quest!.kind])}）を家臣に任せる。来月に首尾が分かる（1旬）</span></button>` : '';
  const adv = M.canAdvice(st) ? `<button class="hr-spot" data-h="advice"><b>家中の進言</b><span>${st.hero!.story === 'toshiie' ? '奥村・村井' : '家老・家臣'}の話を聞いて、${st.hero!.story === 'toshiie' ? '前田家' : esc(CR.houseName(st))}のことを決める（月に一度・1旬）</span></button>` : '';
  const trade = T.canTrade(st, c) ? `<button class="hr-spot" data-h="pane" data-id="akinai"><b>商い</b><span>${T.buyOffer(st, c) ? `特産「${esc(T.buyOffer(st, c)!.name)}」を仕入れる。` : ''}荷を売る（荷駄 ${T.loadOf(st)}/${T.capOf(st)}）</span></button>` : '';
  const shikan = CR.lordHere(st) ? `<button class="hr-spot main" data-h="shikan"><b>仕官を願う</b><span>${esc(clanName(st, CR.lordHere(st)!))}家の当主に目通りを願う（1旬）</span></button>` : '';
  const ask = CR.canAskCastle(st) && !H.questBlock(st) ? `<button class="hr-spot main" data-h="askshiro"><b>城を願い出る</b><span>主君に城を預けてほしいと願い出る（1旬）</span></button>` : '';
  const ret = CR.canRetire(st) ? `<button class="hr-spot dim" data-h="retire"><b>${retireArm ? 'まことに隠居する' : '隠居する'}</b><span>${retireArm ? 'もう一度押すと家督を譲り、一生を締める' : '家督を譲って一生を締める（評価が出る）'}</span></button>` : '';
  const ldb = CR.heroPlay(st) && st.hero!.quest?.kind === 'kouryaku' && H.heroOf(st)!.rank <= 1 ? (() => { const why = HA.canLead(st); return `<button class="hr-spot main" data-h="lead" ${why ? 'disabled' : ''}><b>軍勢を率いて出陣</b><span>${why ? esc(why) : `攻略の総大将として、${esc(st.castles[st.hero!.town].name)}の城兵の6割と手勢で軍勢を立てる（身分の兵の上限${H.heiCap(st).toLocaleString('ja-JP')}まで・1旬）`}</span></button>`; })() : '';
  const mo = CR.heroPlay(st) && !st.hero!.field ? MB.offerAt(st, c.id) : null;
  const mei = mo ? `<button class="hr-spot" data-h="buymei" data-id="${mo.id}" ${st.hero!.gold < mo.price ? 'disabled' : ''}><b>名物を求める: ${esc(mo.name)}（${mo.price.toLocaleString('ja-JP')}貫）</b><span>${mo.kind}の名物が売りに出ている。名声+${mo.fame}。茶会に使え、主君への献上は覚えと功績に大きく効く</span></button>` : '';
  const sc = CR.freeHero(st) ? PL.secretHere(st) : null;
  const secret = sc && H.heroOf(st)!.clan ? (() => { const why = PL.secretBlock(st, sc); return `<button class="hr-spot dim" data-h="secret" ${why ? 'disabled' : ''}><b>密約を持ちかける</b><span>${why ? esc(why) : `${esc(clanName(st, sc))}家の当主に、謀反の折の盟を内々に持ちかける（礼物${PL.EN.SECRET_GOLD}貫・見込み${Math.round(PL.secretChance(st, sc) * 100)}%・しくじると主君の耳に入ることがある・1旬）`}</span></button>`; })() : '';
  const ryo = CR.freeHero(st) && toRyoshuUI && CR.hasStep(st, 'shiro') && !H.inArmy(st) && !HA.leading(st) && H.heroOf(st)!.clan ? `<button class="hr-spot main" data-h="ryo-back"><b>${st.hero!.mode === 'ryoshu' ? '領へ戻る' : '領主として治める'}</b><span>${st.hero!.mode === 'ryoshu' ? '大名の画面へ。城の政・陣立て・家臣・私事（人と交わる）・主家との縁（寝返り・謀反・出奔）は領の画面で' : '大名の画面で自分の領（城・軍勢・家臣）を治める（月刻み）。主家のことは主君が決める'}</span></button>` : '';
  const hf = ryoOut ? null : CR.homenOf(st);
  const homen = ryoOut ? '' : hf ? `<button class="hr-spot main" data-h="pane" data-id="homen"><b>方面の差配</b><span>${hf.castles.length}城・${FR.frontArmies(st, hf).length}軍勢。方針（${R.FRONT_POLICY_NAME[hf.policy]}）と攻略の目標を決める。謀反・出奔もここで</span></button>` : CR.freeHero(st) && H.heroOf(st)!.clan && !st.hero!.field && !H.inArmy(st) ? `<button class="hr-spot dim" data-h="pane" data-id="homen"><b>主家との縁</b><span>${CR.canRebel(st) === null ? '謀反を起こす・' : ''}出奔して浪人になる（他家に仕官し直せる）</span></button>` : '';
  const rk = YO.ronkoOf(st) ? `<button class="hr-spot main" data-h="ronko"><b>論功行賞を行う</b><span>${esc(YO.ronkoOf(st)!.foe)}との合戦の手柄${YO.ronkoOf(st)!.pool}を、寄子・家臣に配る（来月まで）</span></button>` : '';
  return `${rk}${ryo}${shikan}${work}${prx}${ldb}${homen}${gov}${ask}${join}${adv}${sick}${trade}${mei}${secret}${spots.map((k) => `<button class="hr-spot" data-h="spot" data-id="${k}"><b>${H.SPOT_NAME[k]}</b><span>${desc[k]}</span></button>`).join('')}
    <button class="hr-spot dim" data-h="rest"><b>休む</b><span>1旬を過ごす</span></button>${ret}${(() => { const n = nextStory(st); return n ? `<button class="hr-spot" data-h="skip"><b>月日を送る</b><span>次の物語（${esc(n.when)}）まで時を跳ぶ。世の中の動きはそのまま、俸禄はまとめて</span></button>` : ''; })()}`;
}
// 浪人の城下: 陣借り・用心棒・指南・牢人衆・国衆の城（探る・旗揚げ）・仕官
function roninSpots(st: GameState): string | null {
  if (!RP.isRonin(st)) return null;
  const Hh = st.hero!;
  if (Hh.merc) { const a = st.armies[Hh.merc.army]; const kb = MS.kensakuBlock(st); return `<button class="hr-spot" data-h="kensaku" ${kb ? 'disabled' : ''}><b>軍議で献策する</b><span>${kb ? esc(kb) : `知略で策を述べる。用いられれば名声と軍略の評判（1旬・月に一度）`}</span></button><p class="hr-note">${esc(clanName(st, Hh.merc.clan))}家の${esc(st.generals[a?.main ?? '']?.name ?? '')}の軍勢に陣借りしている。軍勢とともに動き、合戦があれば雇い賃と名声が入る。</p><button class="hr-spot main" data-h="rest"><b>陣中で過ごす</b><span>1旬</span></button><button class="hr-spot dim" data-h="leavemerc"><b>陣を離れる</b><span>雇われの身をやめる</span></button>`; }
  const btn = (h: string, b: string, sp: string, cls = '', id = '', dis = false) => `<button class="hr-spot${cls}" data-h="${h}"${id ? ` data-id="${id}"` : ''} ${dis ? 'disabled' : ''}><b>${b}</b><span>${sp}</span></button>`;
  const out: string[] = [];
  const lh = CR.lordHere(st);
  { const os = SA.offersOf(st); if (os.length) out.push(btn('offers', `誘い（${os.length}）`, os.map((o) => `${esc(clanName(st, o.clan))}家・${R.RANK_NAME[o.rank]}`).join('／') + '。条件を比べて返事をする', ' main')); }
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
  const c0 = st.castles[Hh.town], sp0 = H.spotsOf(st, c0);
  if (sp0.includes('dojo')) { const w = MS.dojoBlock(st), f = MS.dojoFoe(st); out.push(btn('dojoyaburi', '道場破り', w ?? `道場の師範（武勇${f.bra}）に他流試合を挑む。板の間で木刀の一本勝負、勝てば看板料${MS.MEI.DOJO_GOLD}貫と武の名（1旬）`, '', '', !!w)); }
  if (MS.nozokuHere(st)) { const w = MS.nozokuBlock(st); out.push(btn('nozoku', '野盗退治', w ?? `治安の悪い村から頼まれる。配下と牢人衆を連れ、槍働きの盤で野盗を討ち払う（礼金${MS.MEI.NOZOKU_GOLD}貫・治安の名・1旬）`, '', '', !!w)); }
  if (MS.fushinHere(st)) { const w = MS.fushinBlock(st); out.push(btn('fuuke', '普請を請け負う', w ?? `国衆の城の石垣と堀を差配する（築城の段で稼ぎと名が増える・1旬）`, '', '', !!w)); }
  if (MS.rengaHere(st)) { const w = MS.rengaBlock(st); out.push(btn('renga', `連歌会に出る（${MS.MEI.RENGA_COST}貫）`, w ?? '魅力・茶道・弁舌で句を競い、文の名を上げる。城下の武将とも親しくなる（1旬・月に一度）', '', '', !!w)); }
  if (lh) { const w = MS.infoBlock(st); out.push(btn('info', '報せを売る', w ?? `探った敵の城の兵と守りの報せを、${esc(clanName(st, lh))}家に売る（金${MS.MEI.INFO_GOLD}貫・当主と親しく・諜報の名・1旬）`, '', '', !!w)); }
  out.push(btn('yojinbo', '用心棒', '商人の荷を護って稼ぐ（1旬）'));
  if (RP.canTeach(st)) out.push(btn('teach', '武芸の指南', '道場で槍を教えて稼ぐ（1旬）'));
  out.push(btn('hire', `牢人衆を雇う（${RP.RONIN.HIRE_COST}貫）`, `手勢+${RP.RONIN.HIRE_N}。毎月扶持がかかる（1旬）`, '', '', Hh.gold < RP.RONIN.HIRE_COST));
  const c = st.castles[Hh.town];
  out.push(...H.spotsOf(st, c).filter((x) => x !== 'tojo').map((x) => btn('spot', H.SPOT_NAME[x], x === 'yashiki' ? '武将を訪ねる・浪人を配下に誘う' : x === 'tabi' ? 'ほかの城下へ' : ({ chaya: '噂を聞く。他国なら城の様子も', ichi: `進物を買う（${H.HERO.GOODS_COST}貫）`, dojo: '稽古で武勇・統率を磨く', tera: '学問で知略・魅力を磨く', nanban: '南蛮の品と噂' } as Record<string, string>)[x] ?? '', '', x)));
  if (T.canTrade(st, c)) out.push(btn('pane', '商い', '特産を仕入れ、荷を売る', '', 'akinai'));
  out.push(btn('rest', '休む', '1旬を過ごす', ' dim'));
  const fd = MS.fudaOf(st);
  return `<p class="hr-note"><button class="hr-btn ghost sm" data-h="kake" style="float:right">${kakeOn() ? '掛け合いを省く' : '掛け合いを見る'}</button><b>名声${Hh.fame ?? 0}</b>${fd.length ? `・評判の札: ${fd.map((x) => `「${x.name}」`).join('')}` : '・評判の札はまだない（同じ系統で名を8上げると付く）'}</p><p class="hr-note">浪人の身。主命も俸禄もない。毎月、自分と配下・牢人衆の扶持がかかる。近くの国衆の城: ${RP.nearKunishu(st).map((x) => esc(x.name)).join('・')}</p>` + out.join('');
}
function peopleHtml(st: GameState, only = false) {
  const me = H.heroOf(st)!;
  if (st.hero!.field && !H.inArmy(st)) return '<p class="hr-none">野にいて、訪ねられる屋敷はない。</p>';
  const ps = (H.inArmy(st) ? H.comrades(st) : H.townsfolk(st, st.hero!.town)).sort((a, b) => (st.hero!.rel[b.id] ?? 0) - (st.hero!.rel[a.id] ?? 0) || Number(b.clan === me.clan) - Number(a.clan === me.clan) || a.rank - b.rank);
  if (!ps.length) return '<p class="hr-none">この町に訪ねられる武将はいない。</p>';
  const fol = RP.followersOf(st), rs = KS.retainersOf(st), dk = st.hero!.daikan ?? {};
  const house = only ? '' : (houseHtml(st) || skillNote(st)) + azukeHtml(st);
  const role = (g: General) => { const c = Object.entries(dk).find(([, v]) => v === g.id); return c ? `${st.castles[+c[0]].name}の城代` : st.hero!.quest?.proxy === g.id ? '遣わし中' : '近侍'; };
  return `${house}${!only && fol.length ? `<p class="hr-note"><b>配下</b> ${fol.map((g) => esc(g.name)).join('・')}</p>` : ''}${!only && (rs.length || KS.capOf(st)) ? `<p class="hr-note"><b>家臣 ${rs.length}／${KS.capOf(st)}人</b> ${rs.map((g) => `${esc(g.name)}（${role(g)}・統${g.lea}）`).join('・') || 'まだいない。城下の浪人を召し抱えられる'}。扶持は一人月${KS.KASHIN.FUCHI}貫。</p>` : ''}<p class="hr-note">訪ねる・進物を贈ると親しくなる（1旬）。親しさ${H.HERO.FRIEND}で「友」の縁を結ぶ。${RP.isRonin(st) ? `浪人の武将は、親しさ${RP.RONIN.FOLLOW_REL}で配下に誘える。` : ''}</p>${ps.map((g) => {
    const v = st.hero!.rel[g.id] ?? 0, mk = SK.masterSkill(g);
    return `<button class="hr-person hr-meet" data-h="meet" data-id="${g.id}">${face(g.id, 44) || `<span class="hr-noface sm">${esc(g.name.slice(0, 1))}</span>`}<div class="hr-pi"><b>${esc(g.name)}</b><span>${g.clan ? `${esc(clanName(st, g.clan))}・${rankName(st, g)}` : '浪人'}${g.status === 'governor' ? '・城主' : ''}${mk ? `・${SK.SKILL_NAME[mk]}の名人` : ''}</span><span class="hr-rel">${H.RELNAME(v)} ${v}</span></div><i class="hr-go">会う ▸</i></button>`;
  }).join('')}`;
}
// 窓を開いたら見える所まで送る（スマホでは一覧の下の方から押すと、窓が画面の外に出る）
function showDlg() { const e = root?.querySelector('.hr-dlg') as HTMLElement | null; if (e && e.getBoundingClientRect().top < 0) e.scrollIntoView({ block: 'center' }); }
// 窓の中のボタン: 押せない時は理由を小さく添える（title はスマホで見えない）
const why = (html: string) => html.replace(/<button ([^>]*?)disabled title="([^"]*)"([^>]*)>([^<]*)<\/button>/g, '<button $1disabled$3>$4<small>$2</small></button>');
// 画面の窓: 会う相手（顔・縁・できること）か、道場・寺（稽古と独学）
function dlgHtml(st: GameState) {
  return why(dlgHtml0(st));
}
function dlgHtml0(st: GameState) {
  const d = dlg!;
  if (d.kind === 'bld') return bldWin(st, d.id);
  if (d.kind === 'cat') return catWin(st, d.id);
  if (d.kind === 'gungi') { // 攻略の軍議: 家臣・寄子の進言を聞き、攻め方を決める
    const c = GG.targetCastle(st), why = GG.gungiBlock(st);
    const adv = GG.advisers(st).map((a) => `<div class="hr-who">${face(a.g.id, 48) || ''}<div><b>${esc(a.g.name)}</b>（${GG.SAKU_NAME[a.saku]}）<p class="hr-dsub">「${esc(a.line)}」</p></div></div>`).join('') || '<p class="hr-dsub">進言する家臣・寄子がいない。</p>';
    const opts = (['chikara', 'hyoro', 'choryaku', 'youchi'] as GG.Saku[]).map((k) => `<button class="hr-btn sm" data-h="gg" data-id="${k}" ${why ? 'disabled' : ''}>${GG.SAKU_NAME[k]}${k === 'choryaku' ? `（見込み${Math.round(GG.choryakuChance(st) * 100)}%）` : ''}<small>${esc(GG.SAKU_DESC[k])}</small></button>`).join('');
    return `<div class="hr-dlg"><h4 class="hr-sub">軍議 ― ${esc(c?.name ?? '')}をいかに攻めるか</h4><p class="hr-dsub">${c ? `城兵およそ${Math.round(c.garrison / 100) * 100}・城の士気${c.gMorale.toFixed(2)}` : ''}${why ? `（${esc(why)}）` : ''}</p>${adv}<div class="hr-dacts">${opts}</div><button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div>`;
  }
  if (d.kind === 'ronko') { // 論功行賞: 手柄を自分・寄子・家臣に配る
    const r = YO.ronkoOf(st); if (!r) return '<div class="hr-dlg"><p class="hr-none">論功行賞は済んだ。</p><button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div>';
    const used = Object.values(ronkoAlloc).reduce((a, b) => a + b, 0), meId = st.hero!.id;
    const rows = YO.ronkoCands(st).map((g) => { const n = ronkoAlloc[g.id] ?? 0, kind = g.id === meId ? '自分' : YO.yorikoOf(st).includes(g) ? '寄子' : '家臣'; return `<div class="hr-person">${face(g.id, 44) || ''}<div class="hr-pi"><b>${esc(g.name)}</b><span>${kind}・${rankName(st, g)}${g.id === meId ? '' : `・親しさ${st.hero!.rel[g.id] ?? 0}`}</span></div><div class="hr-pa"><button class="hr-btn sm" data-h="rk-minus" data-id="${g.id}" ${n ? '' : 'disabled'}>−</button><b class="hr-rk">${n}</b><button class="hr-btn sm" data-h="rk-plus" data-id="${g.id}" ${used < r.pool ? '' : 'disabled'}>＋</button></div></div>`; }).join('');
    return `<div class="hr-dlg"><h4 class="hr-sub">論功行賞 ― ${esc(r.foe)}との合戦（手柄${r.pool}・あと${r.pool - used}）</h4><p class="hr-dsub">手柄一つで功績+5・親しさ+3。配られなかった寄子・家臣は不満を抱く（親しさ−3）。自分に半分を超えて取ると、名声−1。</p>${rows}<div class="hr-dacts"><button class="hr-btn primary" data-h="rk-done">沙汰を下す</button></div></div>`;
  }
  if (d.kind === 'offers') { // 誘い: 条件を並べて比べ、受ける・吊り上げる（一度だけ）・断る
    const os = SA.offersOf(st);
    const rows = os.map((o) => { const L = st.clans[o.clan].leader!; return `<div class="hr-offerc"><div class="hr-who">${face(L, 64) || ''}<div><b>${esc(clanName(st, o.clan))}家</b>${o.match ? '<span class="hr-rel">札が合う</span>' : ''}<p class="hr-dsub">${R.RANK_NAME[o.rank]}・俸禄月${o.pay}貫・支度金${o.shitaku}貫</p><p class="hr-dsub">役目: ${esc(o.yaku)}・${esc(o.follow)}・返事は${Math.max(0, o.until - st.turn)}か月のうちに</p></div></div>
      <div class="hr-dacts"><button class="hr-btn sm primary" data-h="of-acc" data-id="${o.clan}">受ける</button><button class="hr-btn sm" data-h="of-raise" data-id="${o.clan}" ${o.raised ? 'disabled title="もう吊り上げた"' : ''}>吊り上げる${o.raised ? '（済）' : `（見込み${Math.round(SA.raiseChance(st, o) * 100)}%）`}</button><button class="hr-btn sm" data-h="of-no" data-id="${o.clan}">断る</button></div></div>`; }).join('');
    return `<div class="hr-dlg"><h4 class="hr-sub">誘い（${os.length}）</h4>${offerMsg ? `<p class="hr-dsub hr-ofmsg">${esc(offerMsg)}</p>` : ''}<p class="hr-dsub">名を上げた土地の近くの家から来た誘い。吊り上げは一度だけ（通れば条件が上がり、通らなければ相手が引く）。歳をとるほど条件は落ちる。</p>${rows || '<p class="hr-none">いまは誘いがない。</p>'}<button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div>`;
  }
  if (d.kind === 'person') {
    const g = st.generals[d.id]; if (!g) return '';
    const v = st.hero!.rel[g.id] ?? 0, mk = SK.masterSkill(g);
    return `<div class="hr-dlg"><div class="hr-who">${face(g.id, 128) || ''}<div><b>${esc(g.name)}</b><p class="hr-dsub">${g.clan ? `${esc(clanName(st, g.clan))}・${rankName(st, g)}` : '浪人'}${g.status === 'governor' ? '・城主' : ''}・武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}</p><p class="hr-dsub">${H.RELNAME(v)}（親しさ${v}）${mk ? `・${SK.SKILL_NAME[mk]}の名人（${SK.masterCap(g)}段まで教えられる）` : ''}</p></div></div><div class="hr-dacts">${personActs(st, g)}</div><button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div>`;
  }
  const at = d.kind, name = at === 'dojo' ? '道場' : '寺';
  const train = `<button class="hr-btn sm" data-h="train" data-id="${at}" ${st.hero!.gold < H.HERO.TRAIN_COST ? 'disabled' : ''} title="${at === 'dojo' ? '武勇か統率' : '知略か魅力'}が上がることがある">稽古する（${at === 'dojo' ? '武勇・統率' : '知略・魅力'}・${H.HERO.TRAIN_COST}貫）</button>`;
  const selfs = CR.heroPlay(st) ? SK.selfList(at).map((k) => { const why = SK.skillBlock(st, k); return `<button class="hr-btn sm" data-h="study" data-id="${k}" ${why ? `disabled title="${esc(why)}"` : `title="${esc(SK.SKILL_DESC[k])}"`}>独学: ${SK.SKILL_NAME[k]}（${SK.lv(st, k)}段・${SK.skillCost(st, k)}貫）</button>`; }).join('') : '';
  const ms = CR.heroPlay(st) ? H.townsfolk(st, st.hero!.town).filter((g) => SK.masterSkill(g) && SK.SKILL_AT[SK.masterSkill(g)!] === at) : [];
  return `<div class="hr-dlg"><h4 class="hr-sub">${esc(st.castles[st.hero!.town].name)}の${name}</h4><p class="hr-dsub">${at === 'dojo' ? '武芸・築城・忍術' : '弁舌・算術・茶道'}は、ここで独学すれば${SK.SK.SELF_MAX}段まで。その先はその道の名人に、屋敷で師事を願う。${ms.length ? `この城下の名人: ${ms.map((g) => `${esc(g.name)}（${SK.SKILL_NAME[SK.masterSkill(g)!]}）`).join('・')}` : ''}</p><div class="hr-dacts">${train}${selfs}${at === 'dojo' && CR.freeHero(st) ? '<button class="hr-btn sm" data-h="ban-keiko" title="槍働きの盤を試す（手柄も傷も残らず、旬も使わない）">盤で稽古する（試し）</button>' : ''}</div><button class="hr-btn hr-dclose" data-h="dlg-close">閉じる</button></div>`;
}
// 会った相手にできること（画面の窓に出す）
function personActs(st: GameState, g: General) {
  const me = H.heroOf(st)!, v = st.hero!.rel[g.id] ?? 0;
  return `${KS.canRecruit(st, g) ? `<button class="hr-btn sm" data-h="kakae" data-id="${g.id}" ${v < KS.KASHIN.REL || KS.retainersOf(st).length >= KS.capOf(st) ? 'disabled' : ''}>家臣に召し抱える</button>` : ''}${RP.isRonin(st) && g.status === 'ronin' && !RP.isFollower(st, g) ? `<button class="hr-btn sm" data-h="invite" data-id="${g.id}" ${v < RP.RONIN.FOLLOW_REL ? 'disabled' : ''}>配下に誘う</button>` : ''}${(() => { if (!CR.freeHero(st) || g.clan !== me.clan || v < PL.EN.PACT_REL || (st.hero!.retainers ?? []).includes(g.id) || g.id === H.lordOf(st)?.id) return ''; const why = PL.pactBlock(st, g); return why === '約束を取りつけてある' ? '<span class="hr-rel">謀反の味方</span>' : `<button class="hr-btn sm" data-h="pact" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>内々に誘う</button>`; })()}${(() => { if (!CR.freeHero(st) || st.hero!.wife || !st.hero!.ie || g.clan !== me.clan || g.rank > FA.FAM.WED_RANK || (st.year - (g.born ?? st.year - 30)) < FA.FAM.WED_AGE || v < 30) return ''; const why = FA.wedBlock(st, g); return `<button class="hr-btn sm" data-h="wed" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>縁組を申し込む</button>`; })()}${(() => { const k = CR.freeHero(st) ? SK.masterSkill(g) : null; if (!k || g.status === 'young') return ''; const why = SK.skillBlock(st, k, g); return `<button class="hr-btn sm" data-h="mstudy" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : `title="${esc(SK.SKILL_DESC[k])}"`}>師事を願う（${SK.SKILL_NAME[k]}・${SK.masterCap(g)}段まで）</button>`; })()}${(() => { if (!YO.yorikoOf(st).includes(g)) return ''; const why = YO.yorikoSuisenBlock(st, g); return `<button class="hr-btn sm" data-h="yk-sui" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>寄子を推挙する</button>`; })()}${(() => { if (!YO.needsYori(st) || g.clan !== me.clan || g.rank > 1 || g.id === H.lordOf(st)?.id) return ''; if (g.id === st.hero!.yorioya) return '<span class="hr-rel">寄親</span>'; const why = YO.switchBlock(st, g); return `<button class="hr-btn sm" data-h="yori-sw" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>寄親に願う</button>`; })()}<button class="hr-btn sm" data-h="visit" data-id="${g.id}">訪ねる</button><button class="hr-btn sm" data-h="gift" data-id="${g.id}" ${st.hero!.goods < 1 && st.hero!.gold < H.HERO.GIFT_COST ? 'disabled' : ''}>進物</button>`;
}
// 槍働きの盤の駒の色: 味方は自家の色、敵はその合戦の敵将の家の色
const banColors = (st: GameState, foe?: string) => { const me = H.heroOf(st)!, fc = foe ? st.generals[foe]?.clan : null; return { me: me.clan ? st.clans[me.clan]?.color : undefined, foe: fc ? st.clans[fc]?.color : undefined }; };
// 寄親と同輩（足軽組頭・足軽大将）: 寄親との親しさと推挙の見込み、張り合う同輩
function yorikoLine(st: GameState) {
  const ys = YO.yorikoOf(st);
  return `<div class="hr-quest"><b>寄子</b> ${ys.length ? ys.map((g) => `${esc(g.name)}（${rankName(st, g)}・親しさ${st.hero!.rel[g.id] ?? 0}）`).join('・') : 'まだ付いていない（月が変わると付く）'}<span>屋敷で推挙できる。率いた合戦のあとは論功行賞</span></div>`;
}
function yoriLine(st: GameState) {
  const y = YO.yoriOf(st), r = YO.rivalOf(st), need = YO.suisenNeed(st), v = y ? st.hero!.rel[y.id] ?? 0 : 0;
  return `<div class="hr-quest"><b>寄親</b> ${y ? `${esc(y.name)}（${rankName(st, y)}・親しさ${v}）<span>${v >= need ? '<em>推挙を得られる</em>' : `取り立ての推挙は親しさ${need}から`}</span>` : 'まだ付いていない（月が変わると主君が付ける）'}${r ? `　<b>同輩</b> ${esc(r.name)}（${rankName(st, r)}）` : ''}</div>`;
}
// 預けている者（家臣の枠を超えて主家に預けた配下）: 枠が空けば呼び戻せる
function azukeHtml(st: GameState) {
  const az = KS.azukeOf(st);
  if (!az.length) return '';
  return `<h4 class="hr-sub">預けている者</h4>${az.map((g) => { const why = KS.recallBlock(st, g); return `<div class="hr-person">${face(g.id, 44) || ''}<div class="hr-pi"><b>${esc(g.name)}</b><span>${g.clan ? esc(clanName(st, g.clan)) + '家の直臣' : '浪人'}・統${g.lea} 武${g.bra}</span></div><div class="hr-pa"><button class="hr-btn sm" data-h="recall" data-id="${g.id}" ${why ? `disabled title="${esc(why)}"` : ''}>呼び戻す</button>${why ? `<small class="hr-note">${esc(why)}</small>` : ''}</div></div>`; }).join('')}`;
}
function skillNote(st: GameState) {
  const sks = (Object.keys(SK.SKILL_NAME) as SK.SkillKey[]).filter((k) => SK.expOf(st, k) > 0).map((k) => `${SK.SKILL_NAME[k]}${SK.lv(st, k)}段`).join('・');
  return `<p class="hr-note"><b>技能</b> ${sks || 'まだない'}（大きな城下の道場・寺で独学すれば一段まで。その先は名人に屋敷で師事する。名人の居所は茶屋の噂で）</p>`;
}
// 家の格（屋敷の普請）・名物・茶会（物語の外の、家を立てた主人公）
function houseHtml(st: GameState) {
  if (!st.hero!.ie) return '';
  const k = MB.kakuOf(st), kb = MB.kakuBlock(st), next = MB.KAKU.COST[k];
  const kaku = `<button class="hr-spot" data-h="kaku" ${kb ? 'disabled' : ''}><b>屋敷を普請する${next ? `（${next.toLocaleString('ja-JP')}貫）` : ''}</b><span>いま${MB.KAKU.NAME[k]}（家の格${k}）。${kb ? esc(kb) : `格${k + 1}へ: 手勢+${MB.KAKU.SHU}・名声+${MB.KAKU.FAME}・覚え+${MB.KAKU.FAVOR}${(k + 1) % 2 === 0 ? '・家臣の枠+1' : ''}。掛かりは月${(k + 1) * MB.KAKU.UPKEEP}貫（1旬）`}</span></button>`;
  const L = H.lordOf(st), atLord = !!L && !st.hero!.field && L.loc === st.hero!.town;
  const ms = MB.owned(st).map((m) => `<div class="hr-person"><div class="hr-pi"><b>${esc(m.name)}</b><span>${m.kind}・${m.price.toLocaleString('ja-JP')}貫の名物</span></div><div class="hr-pa"><button class="hr-btn sm" data-h="kenmei" data-id="${m.id}" ${atLord ? '' : 'disabled'}>主君に献上</button></div></div>`).join('');
  const cb = MB.chakaiBlock(st);
  const cha = MB.owned(st).length ? `<button class="hr-spot" data-h="chakai" ${cb ? 'disabled' : ''}><b>茶会を開く（${MB.CHAKAI.COST}貫）</b><span>${cb ? esc(cb) : `この城下の武将を招き、みなと親しくなる・名声+${MB.CHAKAI.FAME}（1旬）`}</span></button>` : '';
  const Hx = st.hero!, sons = FA.sonsOf(st);
  const fam = `<p class="hr-note"><b>家族</b> ${Hx.wife ? `妻（${esc(Hx.wife.name)}）` : '妻はいない（懇意の重臣に縁組を申し込める）'}${(Hx.kids ?? []).length ? `・子 ${(Hx.kids ?? []).map((k) => { const g = k.gid ? st.generals[k.gid] : null; return g ? `${esc(g.name)}（${st.year - k.born}歳・一門の家臣）` : `${esc(k.name)}（${st.year - k.born}歳）`; }).join('・')}` : ''}${sons.length ? `。跡継ぎ: ${esc(FA.heirSon(st)!.name)}` : ''}${(Hx.gen ?? 1) > 1 ? `（${Hx.gen}代目）` : ''}</p>`;
  const skl = skillNote(st);
  return `<h4 class="hr-sub">${esc(CR.houseName(st))}（手元${st.hero!.gold.toLocaleString('ja-JP')}貫・手勢${st.hero!.ie.shu}）</h4>${fam}${skl}${kaku}${ms ? `<h4 class="hr-sub">名物${atLord ? '' : '（献上は主君の城下で）'}</h4>${ms}` : ''}${cha}<h4 class="hr-sub">人</h4>`;
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
// 領主（物語の外）が城下に出ている: 城の政・自分の評定・方面の差配・主家との縁は領主の画面にある
const isRyoOut = (st: GameState) => CR.freeHero(st) && st.hero!.mode === 'ryoshu';
const ryoOutNote = () => '<p class="hr-none">城の政・自分の評定・方面の差配・主家との縁は、領の画面（大名の画面）で行う。「領へ戻る」で戻る。</p><button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>';
// 城の政: 大名プレイの城の画面と同じ数値・同じ政（費えは自分の金）＋治め（見回りなど）＋城代
function castleHtml(st: GameState) {
  if (!M.canGovern(st)) return '<p class="hr-none">治める城の城下にいなければ、城の政はできない。</p><button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>';
  const c = st.castles[st.hero!.town], v = HC.castleView(st, c);
  const tiles = `<div class="hr-ctiles">${v.tiles.map(([l, val, sub]) => `<div><span>${l}</span><b>${esc(val)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`).join('')}</div>`;
  const pills = v.pills.length ? `<p class="hr-note">${v.pills.map(esc).join('・')}</p>` : '';
  const acts = v.acts.map((a) => `<button class="hr-spot" data-h="cact" data-id="${a.k}" ${a.block ? 'disabled' : ''}><b>${esc(a.label)}</b><span>${esc(a.block ?? a.sub)}</span></button>`).join('');
  const govs = (Object.keys(M.GOV_NAME) as M.GovAct[]).filter((k) => k !== 'kaikon' && k !== 'fushin' && (k !== 'meshi' || st.hero!.ie)).map((k) => { const g = M.govCost(st, k); return `<button class="hr-spot${k === 'mimawari' ? ' main' : ''}" data-h="gov" data-id="${k}" ${g.block ? 'disabled' : ''}><b>${M.GOV_NAME[k][0]}${g.cost ? `（${g.cost.toLocaleString('ja-JP')}貫）` : ''}</b><span>${g.block ? esc(g.block) : esc(st.hero!.story === 'toshiie' ? M.GOV_NAME[k][1] : M.genText(M.GOV_NAME[k][1], st))}</span></button>`; }).join('');
  const dom = KS.retainersOf(st).length ? [...(st.hero!.fuchu !== undefined ? [st.hero!.fuchu] : []), ...(st.hero!.ryo ?? [])] : [];
  const daikan = dom.map((ci) => { const gid = st.hero!.daikan?.[ci]; return `<button class="hr-spot" data-h="daikan" data-id="${ci}"><b>${esc(st.castles[ci].name)}の城代: ${gid ? esc(st.generals[gid].name) : 'なし'}</b><span>押すと家臣を順に替える。城を空けている月も、城代が見回る</span></button>`; }).join('');
  const my = myHyojoHtml(st);
  return `<h4 class="hr-sub">${esc(c.name)}（手元${st.hero!.gold.toLocaleString('ja-JP')}貫）</h4>${my}${tiles}${pills}<h4 class="hr-sub">城の政（大名の城の画面と同じ。費えは自分の金）</h4>${acts}<h4 class="hr-sub">治め（1旬）</h4>${govs}${daikan ? `<h4 class="hr-sub">城代</h4>${daikan}` : ''}<button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>`;
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
  const hasCastle = st.hero!.fuchu !== undefined || (st.hero!.ryo ?? []).length > 0;
  const leaveB = `<button class="hr-spot dim" data-h="shuppon"><b>${leaveArm ? 'まことに出奔する' : '出奔する'}</b><span>${leaveArm ? `もう一度押すと${hasCastle ? '城を返し、' : ''}家臣を連れて浪人になる` : `${esc(lord)}家に暇を乞い、家臣を連れて浪人になる${hasCastle ? '（城は返す）' : ''}。浪人になれば、他家の当主の城下で仕官を願える（${esc(lord)}家には2年戻れない）`}</span></button>`;
  const ps = PL.plotSummary(st);
  const prep = `<p class="hr-note"><b>謀反の備え</b> 味方の約束: ${ps.pact.length ? ps.pact.map((g) => `${esc(g.name)}${PL.pactCastles(st).some((i) => st.castles[i].governor === g.id) ? '（城ごと）' : ''}`).join('・') : 'なし（屋敷で「友」の武将を内々に誘う）'}。密約: ${ps.secret ? `${esc(clanName(st, ps.secret))}家（家を立てれば盟を結び、援軍が来る）` : 'なし（他家の当主の城下で持ちかける）'}。</p>`;
  return `${body}<h4 class="hr-sub">主家との縁</h4>${prep}${rebelB}${leaveB}<button class="hr-spot dim" data-h="pane" data-id="spots"><b>城下へ戻る</b><span></span></button>`;
}
// 自分の評定: 開いて、家臣に役目を申し付ける（押すたびに役目が替わる）
function myHyojoHtml(st: GameState) {
  if (MH.canHold(st)) return '';
  const os = MH.ordersOf(st), gs = MH.orderable(st);
  if (!gs.length && !Object.keys(os).length) return '';
  if (!MH.holdingNow(st)) return `<h4 class="hr-sub">自分の評定</h4><button class="hr-spot main" data-h="myhyo"><b>評定を開く</b><span>家臣${gs.length}人に役目（${MH.YAKU.map((y) => MH.YAKU_NAME[y]).join('・')}）を申し付ける。月の終わりに首尾が出る（月に一度・1旬）</span></button>`;
  const rows = gs.map((g) => { const o = os[g.id]; return `<button class="hr-spot${o ? ' main' : ''}" data-h="yaku" data-id="${g.id}"><b>${esc(g.name)}: ${o ? MH.YAKU_NAME[o.role] : '役目なし'}${o && MH.YAKU_COST[o.role] ? `（${MH.YAKU_COST[o.role]}貫）` : ''}</b><span>${o ? esc(MH.YAKU_DESC[o.role]) : '押すと役目を申し付ける（押すたびに替わる）'}・武${g.bra} 知${g.int} 統${g.lea} 魅${g.cha}</span></button>`; }).join('');
  return `<h4 class="hr-sub">自分の評定（今月の役目）</h4>${rows}`;
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
// セリフの窓を閉じる: 言葉は消して地の文だけ残し、待たせていた月の報告（と出世の場面）を出す
// 評定の候補（一つを選んで受ける）か、申し付けられた主命（承る／断る）
function hyojoHtml(st: GameState) {
  if (SK.pupilOf(st)) return '<div class="hr-offer"><button class="hr-btn primary" data-h="pupil-teach">教える</button><button class="hr-btn" data-h="pupil-no">断る</button></div>';
  if (YR.duelOf(st)) return '<div class="hr-offer"><button class="hr-btn primary" data-h="duel-yes">受けて立つ</button><button class="hr-btn" data-h="duel-no">退く</button></div>';
  if (YO.ronkoOf(st) && !YR.banPendOf(st)) return '<div class="hr-offer"><button class="hr-btn primary" data-h="ronko">論功行賞を行う</button></div>';
  if (YR.banPendOf(st)) { const P = YR.banPendOf(st)!; const mo = P.mochi ? `<div class="hr-offer hr-mochi"><span class="hr-rel">持ち場: ${BN.MOCHI_NAME[P.mochi]}（寄親の言い渡し）</span>${(['senjin', 'waki', 'teppo', 'gozume'] as const).map((m) => m === P.mochi ? '' : `<button class="hr-btn sm" data-h="ban-mochi" data-id="${m}" ${P.asked ? 'disabled' : ''} title="${esc(BN.MOCHI_DESC[m])}">${BN.MOCHI_NAME[m]}を願う</button>`).join('')}</div>` : ''; return `${mo}<div class="hr-offer"><button class="hr-btn primary" data-h="ban-go">槍を取る（盤で戦う）</button><button class="hr-btn" data-h="ban-auto">任せる（オート）</button></div>`; }
  const hy = st.hero!.hyojo;
  if (!hy || hy.turn !== st.turn) return '<div class="hr-offer"><button class="hr-btn primary" data-h="q-accept">承る</button><button class="hr-btn" data-h="q-decline">断る</button></div>';
  return `<div class="hr-cands">${hy.cands.map((q, i) => `<button class="hr-cand" data-h="q-pick" data-id="${i}"><b>${esc(H.QUEST_NAME[q.kind])}</b><span>${esc(H.questText(st, q))}</span></button>`).join('')}</div><div class="hr-offer"><button class="hr-btn" data-h="q-decline">どれも断る</button></div>`;
}
// ───────── 浪人の演出（engine/roninkake.ts） ─────────
// 掛け合いを省く設定（選ぶところのある場面 ― 誘いの使者・目通り・連歌会 ― は省かない）
const KAKE_KEY = 'sengoku-kake';
function kakeOn() { try { return localStorage.getItem(KAKE_KEY) !== 'off'; } catch { return true; } }
function kakeSet(on: boolean) { try { localStorage.setItem(KAKE_KEY, on ? 'on' : 'off'); } catch { /* 続ける */ } }
function kakeHtml(st: GameState, k: RK.Kake) {
  return `<div class="hr-kake">${k.map((x) => x.who ? `<div class="hr-who sm">${face(x.who, 56) || `<span class="hr-noface" style="width:56px;height:70px;font-size:13px">${esc((x.name ?? RK.CAST[x.who] ?? st.generals[x.who]?.name ?? '').slice(0, 3))}</span>`}<div><b>${esc(x.name ?? st.generals[x.who]?.name ?? RK.CAST[x.who] ?? '')}</b><p>「${esc(x.line)}」</p></div></div>` : `<p class="hr-knarr">${esc(x.line)}</p>`).join('')}</div>`;
}
// 誘いの使者（来たばかり）と城下の噂（掛け合いを省く設定なら噂は出さない）
function ronBeats(st: GameState): Beat[] { return [...RK.newOfferBeats(st), ...(kakeOn() ? RK.rumorBeats(st) : []), ...KK.pendingBeats(st, kakeOn())]; } // 組頭・足軽大将: 寄親・同輩・取り立ての場面
// 場面で選んだ答えの結び: 城下に出して、旬を進める
function ronAfter(st: GameState): boolean {
  const t = RK.takeLast() ?? KK.takeLast(); if (!t) return false;
  H.note(st, t); say = { text: t }; save(); render(); void advance(); return true;
}
// 選ぶところのある場面を、行いとして始める（病・月の報告・忙しい時は始めない）
function ronScene(beats: Beat[], scene: string) {
  if (!s || busy || !theater) return;
  dlg = null;
  if (SK.isSick(s)) { say = { text: '病に伏していて、動けない。休んで治すしかない。' }; render(); return; }
  if (heldReport) { report = heldReport; heldReport = null; render(); return; }
  if (!beats.length) return;
  const st = s; bg = scene;
  theater(beats, () => { save(); if (!ronAfter(st)) render(); }, chooser(st), opt(st));
}
// 軍議で決めた攻め方の首尾（夜討ちは盤を開く）
function gungiDone(st: GameState, r: ReturnType<typeof GG.gungi>) {
  if (!r.ok) { say = { text: r.text }; render(); return; }
  if (r.ban) { void openBan(BP.skirmishBan(st, 'youchi'), `${GG.targetCastle(st)?.name ?? ''} ― 夜討ち`, banColors(st)).then(async (b) => { const t2 = `${r.text}${GG.applyYouchi(st, b)}`; H.note(st, t2); say = { text: t2, hold: true }; save(); render(); await advance(); }); return; }
  H.note(st, r.text); say = { text: r.text, hold: true }; save(); render(); void advance();
}
function closeSay() {
  if (!say) return;
  say = { text: say.text };
  if (heldReport) { report = heldReport; heldReport = null; }
  render();
  if (!report) playHeld();
}
function playHeld() {
  const b = heldBeats; heldBeats = null;
  if (b && b.length && theater && s) { const st = s; theater(b, () => { save(); if (!ronAfter(st)) render(); if (pendRyo) { pendRyo = false; maybeRyoshu(st); } }, chooser(st), opt(st)); }
  else if (s && !report && pendRyo) { pendRyo = false; maybeRyoshu(s); }
}
async function act(fn: () => H.Act, scene?: string, allowSick = false, kk?: (r: H.Act) => RK.Kake) {
  if (!s || busy) return;
  const keep = dlg?.kind === 'bld' ? dlg.id : null; // 建物の窓から行動した: 結果を窓の中に出し、窓は開いたままに（月をまたぐ・町を離れる時は閉じる）
  dlg = null;
  if (!allowSick && SK.isSick(s)) { say = { text: H.inArmy(s) || HA.leading(s) ? '病に伏していて、動けない。陣中で過ごすか、陣を離れて（軍勢を解いて）城へ下がる。' : '病に伏していて、動けない。休んで治すしかない。' }; render(); return; }
  if (heldReport) { report = heldReport; heldReport = null; render(); return; } // 閉じずに次へ進もうとした: 先に月の報告を見せる
  const r = fn();
  if (!r.ok) { say = { text: r.text }; if (keep && machiable(s)) dlg = { kind: 'bld', id: keep }; render(); return; }
  tehRecord(s);
  if (scene) bg = keep ? 'town' : scene; // 建物の窓からの行動では、町の画面はそのまま（場面の絵も添えない）
  const kake = kk && kakeOn() ? kk(r) : undefined; // 浪人の掛け合い（顔とセリフを二、三行）
  const hold = (!!(r.who && r.line) || !!kake?.length) && !mapMode(s);
  say = kake?.length ? { text: r.text, hold, kake } : { who: r.who, line: r.line, text: r.text, hold, offer: hold && r.offer };
  if (keep && !hold && s.hero!.jun < H.HERO.JUN && machiable(s)) dlg = { kind: 'bld', id: keep };
  await advance();
  if (machiB && say && !dlg && narrow()) root?.querySelector('.hr-scene')?.scrollIntoView({ block: 'start' }); // スマホ: 右の欄の下から行動しても、結果（町の上の知らせ）が見える所へ
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
  if (monthPassed && FA.inherited(st)) { save(); render(); inherit(st, lines); return; } // 主家の家督を継いだ: 大名プレイへ
  const hadShiro = CR.hasStep(st, 'shiro');
  const cev = monthPassed && CR.careerMonth(st);
  if (cev && !hadShiro && CR.hasStep(st, 'shiro')) pendRyo = true; // 城を預かった: 場面と報告のあと領主の画面へ
  if (cev) { lines.push(...cev.lines); for (const x of cev.lines) H.note(st, x); }
  if (monthPassed && CR.heroPlay(st)) { // 槍働き（主人公の軍勢が戦った月）。一騎討ちを挑まれたら、受けるか退くかを先に
    if (YR.banPendOf(st) || (st.hero as { banPend?: unknown }).banPend) { const ob = BP.autoBan(st); if (ob) { const t2 = BP.applyBan(st, ob); lines.push(...t2); for (const x of t2) H.note(st, x); } else YR.clearBanPend(st); } // 前の月の槍働きを放っておいた: 任せたことにする
    const am = YR.aftermath(st); lines.push(...am.lines); for (const x of am.lines) H.note(st, x);
    if (!am.ban && !am.duel && YO.ronkoOf(st) && !say?.offer) { const r = YO.ronkoOf(st)!; say = { text: `${r.foe}との合戦を終えた。大将として論功行賞を行い、手柄${r.pool}を寄子・家臣に配る。`, hold: true, offer: true }; }
    if (am.ban) { const P = YR.banPendOf(st)!; say = { text: `${P.foeName}との合戦（${P.won ? '味方の勝ち戦' : '味方の負け戦'}）。隊を率いない身として、自分の槍働きをどうする。盤で戦えば一番槍・敵将との一騎討ち・${P.won ? '追い討ち' : '殿'}で手柄を立てられる。${P.mochi ? `持ち場は${BN.MOCHI_NAME[P.mochi]}（${BN.MOCHI_DESC[P.mochi]}）。ほかの持ち場を一度だけ願い出られる。` : ''}`, hold: true, offer: true }; }
    if (!am.duel && !say?.offer) { const pg = SK.pupilEvent(st, H.townsfolk(st, st.hero!.town), () => Math.random()); if (pg) { const pk = SK.pupilOf(st)!.k; say = { who: pg.id, line: `${H.heroOf(st)!.name}殿の${SK.SKILL_NAME[pk]}、聞き及んでおります。……どうか、教えを乞いたい`, text: `${pg.name}が${SK.SKILL_NAME[pk]}の弟子入りを願ってきた。教えれば親しくなり、謝礼も入る（1旬）。`, hold: true, offer: true }; } }
    if (am.duel) { const f = st.generals[am.duel]; say = { who: f.id, line: `そこな武者、名のある者と見た。${f.name}、一騎討ちを所望する！`, text: `敵将${f.name}（武勇${f.bra}）が一騎討ちを挑んできた。勝つ見込み${Math.round(YR.duelChance(st, f.id) * 100)}%。`, hold: true, offer: true }; }
  }
  const held = !!say?.hold;
  if (lines.length) { if (held) heldReport = [...new Set(lines)]; else report = [...new Set(lines)]; }
  // 城下に着いたら、城下の画面へ戻る
  if (bg === 'tabi' && !st.hero!.field && (st.hero!.dest === null || st.hero!.dest === undefined)) { bg = 'town'; pane = 'spots'; }
  save(); render();
  // 出世の節目の場面（cev）と、浪人・組頭・足軽大将・侍大将の演出の場面（誘いの使者・噂・寄親・寄子・持ち場など）を一続きに。
  // セリフの窓・月の報告を閉じてから出す。閉じられない窓（合戦の誘いなど）しかなければ、その上で出す
  const rb = [...(cev && cev.beats.length ? cev.beats : []), ...ronBeats(st)];
  if (rb.length && theater) {
    if (report || (held && !say?.offer)) { heldBeats = [...(heldBeats ?? []), ...rb]; return; }
    theater(rb, () => { save(); if (!ronAfter(st)) render(); if (pendRyo) { pendRyo = false; maybeRyoshu(st); } }, chooser(st), opt(st)); return; // 城を預かった月は、場面で答えたあとも領主の画面へ
  }
  runStory();
}
// 物語（前田利家 ― 残り火）: 時期の来た場面を、物語の画面で見せる
type Theater = (beats: Beat[], done: () => void, choose?: (key: string, id: string) => Beat[], opt?: { part2?: boolean; label?: string; cast?: Record<string, string>; tx?: (x: string) => string }) => void;
let theater: Theater | null = null;
export function setTheater(f: Theater) { theater = f; }
const chooser = (st: GameState) => (key: string, id: string) => (key.startsWith('r_') ? RK.choose(st, key, id) : key.startsWith('k_') ? KK.choose(st, key, id) : M.storyChoose(st, key, id).beats); // k_: 足軽大将の場面（持ち場・与吉） // r_: 浪人の場面（誘い・目通り・連歌会） // 結果の数値は物語の画面に出さず、場面のあとで城下に
const opt0 = (st: GameState) => { const d = st.hero!.storyDone ?? []; return { part2: d.includes('katoku'), label: d.includes('ryo4') ? '残り火　第五部' : d.includes('ryo3') ? '残り火　第四部' : d.includes('ryo') ? '残り火　第三部' : d.includes('katoku') ? '残り火　第二部' : '残り火　第二幕' }; };
const opt = (st: GameState) => CR.freeHero(st) ? { part2: false, label: CR.houseName(st), cast: { ...RK.CAST, ...Object.fromEntries(Object.values(st.generals).map((g) => [g.id, g.name])) }, tx: (x: string) => M.genText(x, st) } : opt0(st);
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
// 城を預かったら: 領主として大名の画面へ（月刻み。自分の領だけを動かす）
let toRyoshuUI: ((st: GameState) => void) | null = null;
let pendRyo = false; // 城を預かったばかり（場面・報告を閉じたら領主の画面へ）
export function setRyoshu(f: (st: GameState) => void) { toRyoshuUI = f; }
function maybeRyoshu(st: GameState, force = false): boolean {
  if (!toRyoshuUI || !CR.freeHero(st) || st.hero!.over || !CR.hasStep(st, 'shiro') || !H.heroOf(st)!.clan) return false;
  if (st.hero!.out && !force) return false; // 城下に出ている間は、自分で「領へ戻る」まで
  if (H.inArmy(st) || HA.leading(st)) return false;
  st.hero!.out = undefined;
  if (!RY.toRyoshu(st)) return false;
  try { localStorage.removeItem(KEY); } catch { /* 続ける */ }
  if (root) root.hidden = true;
  toRyoshuUI(st);
  return true;
}
function toDaimyoPlay(st: GameState, clan: string, how: 'rebel' | 'inherit' | 'rise' = 'rebel') {
  TK.carryHero(st, clan, how); // 家を立てた日の場面と、権六・与吉の様子を家へ（主人公の記録を消す前に）
  const C2 = st.clans[clan]; C2.delegate = undefined;
  st.player = clan; st.hero = undefined; st.over = null;
  try { localStorage.removeItem(KEY); } catch { /* 続ける */ }
  if (root) root.hidden = true;
  if (toDaimyo) toDaimyo(st); else onQuit();
}
// 主家の家督を継ぐ（指名・本体の跡継ぎ選び）: 場面のあと大名プレイへ
function inherit(st: GameState, lines: string[]) {
  const me = H.heroOf(st)!, clan = me.clan!, C = st.clans[clan];
  H.note(st, `${C.name}家の家督を継いだ。`);
  const kin = KS.retainersOf(st).slice(0, 1);
  const beats: Beat[] = [
    { kind: 'door', head: '家督', text: '家督を継ぐ', sub: `${st.year}年 ${C.name}家` },
    { head: '広間', bg: 'zashiki_day', text: `先代が世を去り、${C.name}家の家督は${me.name}に渡った。広間に並ぶ家中の顔が、みな${me.name}を見ている。` },
    ...kin.map((g) => ({ who: g.id, bg: 'zashiki_day', text: '殿。……いえ、御屋形様。これより、そうお呼びいたします' })),
    { who: me.id, bg: 'zashiki_day', text: '先代の家を、わしが預かる。……皆、力を貸してくれ' },
    { kind: 'chapter', head: `${C.name}家`, text: '継ぐ', sub: '大名として' },
  ];
  void lines;
  const go = () => toDaimyoPlay(st, clan, 'inherit');
  if (theater) theater(beats, go, undefined, opt(st)); else go();
}
// 謀反: 主家に背いて家を立て、大名プレイへ
function rebelUp() {
  const st = s!, me = H.heroOf(st)!, from = me.clan!;
  const lordId = st.clans[from].leader;
  const kin = [...(st.hero!.retainers ?? [])];
  const ps = PL.plotSummary(st), allies = ps.pact.map((g) => g.name), sc = ps.secret ? clanName(st, ps.secret) : null;
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
    ...(allies.length ? [{ bg: 'jinmaku', text: `${allies.join('・')}も、約束どおり旗を同じくした。` }] : []),
    ...(sc ? [{ bg: 'jinmaku', text: `${sc}家から使者が来た。盟は結ばれ、${sc}家の兵も${clanName(st, from)}家へ向かう。` }] : []),
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
    toDaimyoPlay(st, r.clan!, 'rise');
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
  if (h === 'teh-off' || h === 'teh-on') { tehSet(h === 'teh-on'); render(); return; }
  if (!['pane', 'cat', 'bld', 'dlg-close', 'say-close', 'scene-close', 'report-ok'].includes(h)) tehNew = []; // 前の知らせは、次の行いで消す
  tehKey = h === 'spot' ? `spot:${id}` : h === 'train' ? `train:${id}` : h; // 手ほどき: 行いが通ったら記録する
  if (s && TEH_NOW.has(h)) tehRecord(s);
  if (h === 'pick') { begin(id); return; }
  if (h === 'pscen') { pickScen = id; pickClan = null; renderPick(); return; }
  if (h === 'pclan') { pickClan = id; renderPick(); return; }
  if (h === 'pback') { if (pickClan) pickClan = null; else pickScen = ''; renderPick(); return; }
  if (h === 'continue') { try { s = JSON.parse(localStorage.getItem(KEY)!); } catch { s = null; } if (s) { cmdDefault(s); s.hero!.hex ??= s.castles[s.hero!.town].hex; bg = 'town'; pane = 'spots'; recenter = true; say = { text: `${s.castles[s.hero!.town].name}の城下に戻った。` }; if (CR.freeHero(s) && !s.hero!.over && s.hero!.mode === 'ryoshu' && maybeRyoshu(s)) return; render(); runStory(); } return; }
  if (!s) return;
  if (h === 'succeed') { const r = FA.succeedSon(s); report = null; pane = 'spots'; bg = 'town'; say = { text: r.text }; H.note(s, r.text); save(); render(); return; }
  if (s.hero?.over && !['pane', 'report-ok'].includes(h)) return; // 終わったあとは見るだけ
  if (h === 'pane') dlg = null;
  if (h === 'pane') { if (id === 'tabi') recenter = true; pane = id as typeof pane; render(); return; }
  if (h === 'meet') { dlg = { kind: 'person', id }; say = null; render(); showDlg(); return; }
  if (h === 'dlg-close') { if (dlg?.kind === 'bld' && !say?.hold) say = null; dlg = null; render(); return; } // 建物の窓で見た結果は、閉じたら町に残さない
  if (h === 'bld') { dlg = { kind: 'bld', id: id as MC.Bld }; say = null; render(); showDlg(); return; } // 町の建物: その建物でできることの窓
  if (h === 'cat') { onCat(s, id as Cat); return; } // 画面上部の札
  if (h === 'machi') { MC.machiSet(id === 'machi'); dlg = null; render(); return; }
  if (h === 'ban-keiko') { const bn = BP.keikoBan(s); void openBan(bn, `${s.castles[s.hero!.town].name}の道場 ― 盤の稽古`, banColors(s)).then((r) => { dlg = null; say = { text: `盤の稽古を終えた（${{ win: '勝ち', lose: '負け', retreat: '退いた', time: '時切れ' }[r.over ?? 'time']}・討ち取り${r.kills}）。` }; render(); }); return; }
  if (h === 'train') { void act(() => H.train(s!, id as 'dojo' | 'tera'), id); return; }
  if (h === 'report-ok') { report = null; render(); playHeld(); return; }
  if (h === 'say-close') { closeSay(); return; }
  if (h === 'scene-close') { bg = 'town'; if (say?.hold) closeSay(); else { say = null; render(); } return; } // 場面の絵つきの知らせを閉じて町へ
  if (h === 'q-accept') { if (say) say.text = say.text.replace('主命を申し付けられた。', '主命を承った。'); closeSay(); return; }
  if (h === 'q-pick') { const r = H.chooseQuest(s, +id); say = { who: r.who, line: r.line, text: r.text, hold: r.ok }; if (heldReport && !r.ok) closeSay(); save(); render(); return; }
  if (h === 'q-decline') { const r = H.declineQuest(s); say = { who: r.who, line: r.line, text: r.text, hold: r.ok }; save(); render(); return; }
  if (h === 'rest') { void act(() => H.rest(s!), 'town', true); return; }
  if (h === 'study') { const k = id as SK.SkillKey; void act(() => SK.study(s!, k, () => Math.random()), SK.SKILL_AT[k]); return; }
  if (h === 'mstudy') { const g = s.generals[id], k = SK.masterSkill(g)!; void act(() => SK.study(s!, k, () => Math.random(), g, MB.owned(s!).some((m) => m.kind === '茶器')), 'yashiki'); return; }
  if (h === 'skip') { skipTime(); return; }
  if (h === 'advice') { advice(); return; }
  if (h === 'askshiro') { askShiro(); return; }
  if (h === 'lead') { recenter = true; const st = s; void act(() => HA.lead(st), 'town').then(() => { const bs = kakeOn() && theater && HA.leading(st) ? KK.shutsujinBeats(st) : []; if (bs.length) theater!(bs, () => { save(); if (!ronAfter(st)) render(); }, chooser(st), opt(st)); }); return; } // 出陣: 総大将として号令を選ぶ
  if (h === 'advance') { recenter = true; void act(() => HA.advance(s!, +id), 'town'); return; }
  if (h === 'disband') { void act(() => HA.disband(s!), 'town', true); return; }
  if (h === 'selfcmd') { s.hero!.selfCommand = !s.hero!.selfCommand; save(); render(); return; }
  if (h === 'cact') { pane = 'shiro'; void act(() => HC.castleAct(s!, id as HC.CastleAct), 'town'); return; }
  if (h === 'kakae') { void act(() => KS.recruit(s!, id), 'yashiki'); return; }
  if (h === 'proxy') { void act(() => KS.proxy(s!), 'town'); return; }
  if (h === 'daikan') { pane = 'shiro'; const ci = +id, rs = KS.retainersOf(s), cur = s.hero!.daikan?.[ci]; const i = cur ? rs.findIndex((g) => g.id === cur) : -1; const nx = rs[i + 1]; KS.setDaikan(s, ci, nx ? nx.id : null); say = { text: nx ? `${s.castles[ci].name}の城代に${nx.name}を置いた。` : `${s.castles[ci].name}の城代を外した。` }; save(); render(); return; }
  if (h === 'shikan') { if (RK.meetPlain(s)) void act(() => CR.askService(s!), 'tojo'); else ronScene(RK.meetBeats(s), 'tojo'); return; } // 目通り: 当主との問答（家の欲しい働きを答えれば見込みが上がる）
  if (h === 'jingari') { void act(() => RP.jingari(s!, +id), 'town', false, (r) => RK.jingariKake(s!, r.who, r.line)); return; }
  if (h === 'leavemerc') { void act(() => RP.leaveMerc(s!), 'town', true); return; }
  if (h === 'gungi-open') { const st = s; if (!GG.gungiBlock(st) && kakeOn() && theater && !busy) { say = null; theater(KK.gungiBeats(st), () => { const r = KK.takeGungi(); if (!r) { save(); render(); return; } gungiDone(st, r); }, chooser(st), opt(st)); return; } dlg = { kind: 'gungi' }; say = null; render(); showDlg(); return; } // 軍議: 陣幕の中で家臣・寄子が進言し、攻め方を選ぶ
  if (h === 'gg') {
    if (busy) return;
    const st = s, r = GG.gungi(st, id as GG.Saku); dlg = null;
    gungiDone(st, r); return;
  }
  if (h === 'ronko') { ronkoAlloc = {}; dlg = { kind: 'ronko' }; say = null; render(); showDlg(); return; }
  if (h === 'rk-plus' || h === 'rk-minus') { const r = YO.ronkoOf(s); if (!r) return; const used = Object.values(ronkoAlloc).reduce((a, b) => a + b, 0); const n = ronkoAlloc[id] ?? 0; if (h === 'rk-plus' && used < r.pool) ronkoAlloc[id] = n + 1; if (h === 'rk-minus' && n > 0) ronkoAlloc[id] = n - 1; render(); return; }
  if (h === 'rk-done') { const won = YO.ronkoOf(s)?.pool === YO.YORIKO.POOL_WIN, kake = kakeOn() ? KK.ronkoKake(s, ronkoAlloc, won) : []; const t2 = YO.applyRonko(s, ronkoAlloc); H.note(s, t2); dlg = null; say = { text: t2, hold: true, kake: kake.length ? kake : undefined }; save(); render(); return; } // 配ったあとの礼と不満
  if (h === 'yk-sui') { void act(() => { const r = YO.suisenYoriko(s!, id); if (r.ok) s!.hero!.jun++; return r; }, 'yashiki'); return; }
  if (h === 'offers') { offerMsg = ''; dlg = { kind: 'offers' }; say = null; render(); showDlg(); return; }
  if (h === 'of-acc') { void act(() => SA.acceptOffer(s!, id), 'tojo'); return; }
  if (h === 'of-raise' || h === 'of-no') { const r = h === 'of-raise' ? SA.raiseOffer(s, id) : SA.declineOffer(s, id); H.note(s, r.text); offerMsg = r.text; if (!SA.offersOf(s).length) { dlg = null; say = { text: r.text }; } save(); render(); return; }
  if (h === 'kensaku') { void act(() => MS.gunKensaku(s!), 'jinmaku'); return; }
  if (h === 'fuuke') { void act(() => MS.fushinUke(s!), 'town', false, () => RK.fushinKake(s!, SK.lv(s!, 'chikujo'))); return; }
  if (h === 'renga') { const w = MS.rengaBlock(s); if (w) { say = { text: w }; render(); return; } ronScene(RK.rengaBeats(s), 'yashiki'); return; } // 連歌会: 宗匠の上の句に、下の句を選んで付ける
  if (h === 'info') { void act(() => MS.sellInfo(s!), 'tojo', false, (r) => RK.infoKake(s!, r.who, r.line)); return; }
  if (h === 'dojoyaburi' || h === 'nozoku') {
    if (busy) return;
    const st = s;
    if (SK.isSick(st)) { say = { text: '病に伏していて、動けない。休んで治すしかない。' }; render(); return; }
    dlg = null;
    const intro = (beats: Beat[], go: () => void) => { if (kakeOn() && theater) theater(beats, go, undefined, opt(st)); else go(); }; // 盤の前の掛け合い（省く設定なら、すぐ盤へ）
    if (h === 'dojoyaburi') { const w = MS.dojoBlock(st); if (w) { say = { text: w }; render(); return; } intro(RK.dojoIntro(st), () => void openBan(MS.dojoBan(st), `${st.castles[st.hero!.town].name}の道場 ― 道場破り`, banColors(st)).then(async (r) => { const won = r.over === 'win', res = MS.applyDojo(st, won); H.note(st, res.text); say = { text: res.text, hold: true, kake: kakeOn() ? RK.dojoOutro(st, won) : undefined }; save(); render(); await advance(); })); return; }
    const w = MS.nozokuBlock(st); if (w) { say = { text: w }; render(); return; }
    intro(RK.nozokuIntro(st), () => void openBan(MS.nozokuBan(st), `${st.castles[st.hero!.town].name}の村 ― 野盗退治`, banColors(st)).then(async (r) => { const res = MS.applyNozoku(st, r); H.note(st, res.text); say = { text: res.text, hold: true, kake: kakeOn() ? RK.nozokuOutro(st, r.over === 'win') : undefined }; save(); render(); await advance(); }));
    return;
  }
  if (h === 'yojinbo') { void act(() => RP.yojinbo(s!), 'ichi', false, (r) => RK.yojinboKake(s!, r.text.includes('手傷'))); return; }
  if (h === 'kake') { kakeSet(!kakeOn()); render(); return; } // 掛け合いを省く／見る
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
  if (h === 'pact') { void act(() => PL.invitePact(s!, id), 'yashiki'); return; }
  if (h === 'secret') { void act(() => PL.offerSecret(s!), 'tojo'); return; }
  if (h === 'recall') { void act(() => KS.recall(s!, id), 'yashiki'); return; }
  if (h === 'wed') { void act(() => FA.proposeWed(s!, id), 'yashiki'); return; }
  if (h === 'myhyo') { pane = 'shiro'; void act(() => MH.hold(s!), 'tojo'); return; }
  if (h === 'yaku') { pane = 'shiro'; say = { text: MH.cycle(s, id) }; save(); render(); return; }
  if (h === 'duel-yes') { const me = H.heroOf(s)!, f = YR.duelOf(s); const r = YR.fightDuel(s); H.note(s, r.text); const st = s; const after = () => { say = { who: r.who, line: r.line, text: r.text, hold: true }; save(); render(); };
    if (f && theater) { theater([{ kind: 'door', head: '一騎討ち', text: '一騎討ち', sub: `${me.name} 対 ${f.name}` }, { bg: 'jinmaku', text: `両軍の兵が退き、二人の間に間合いができた。${f.name}の槍が先に動いた。` }, { who: me.id, bg: 'jinmaku', text: r.won ? '……もらった！' : 'くっ……！' }, { bg: 'jinmaku', text: r.won ? `${me.name}の槍が、${f.name}の脇を深く払った。${f.name}は馬から落ち、郎党に担がれて退いた。` : `${f.name}の穂先が${me.name}の肩を裂いた。${me.name}は郎党に助けられ、陣へ引いた。` }], after, undefined, opt(st)); } else after(); return; }
  if (h === 'ryo-back') { save(); maybeRyoshu(s, true); return; }
  if (h === 'pupil-teach') { const r = SK.teachPupil(s, () => Math.random()); H.note(s, r.text); say = { who: r.who, line: r.line, text: r.text, hold: true }; save(); render(); return; } // 月の報告は、この窓を閉じてから
  if (h === 'pupil-no') { const r = SK.declinePupil(s); say = { text: r.text, hold: true }; save(); render(); return; }
  if (h === 'duel-no') { const r = YR.declineDuel(s); say = { text: r.text, hold: true }; save(); render(); return; }
  if (h === 'ban-mochi') { const r = BP.askMochi(s, id as import('../engine/ban').Mochi); H.note(s, r.text); if (say) say = { ...say, text: `${say.text.replace(/（持ち場の願い: .*?）$/, '')}（持ち場の願い: ${r.text}）` }; save(); render(); return; }
  if (h === 'ban-go' || h === 'ban-auto') {
    const st = s, P = YR.banPendOf(st); if (!P) { say = null; render(); return; }
    const seen = !!P.yori; // 寄親が同じ軍勢にいて、働きを見ている
    const fin = (bn: import('../engine/ban').Ban) => { const kake = kakeOn() ? KK.battleOutro(st, bn, seen) : []; const t2 = BP.applyBan(st, bn); for (const x of t2) H.note(st, x); const rk = KK.retainerKake(st); if (kakeOn()) kake.push(...rk); say = { text: t2.join(''), hold: true, kake: kake.length ? kake : undefined }; save(); render(); }; // 家臣の一言（腕を上げた・手傷）は盤の後に
    if (h === 'ban-auto') { const bn = BP.autoBan(st); if (bn) fin(bn); return; }
    const bn = BP.battleBan(st); if (!bn) return;
    const go = () => void openBan(bn, `${P.foeName}との合戦 ― 槍働き`, banColors(st, P.foe)).then(fin);
    const ib = kakeOn() && theater ? KK.battleIntro(st, P.mochi, seen) : []; // 合戦の前: 寄親の一言・同輩の挑み
    if (ib.length) { dlg = null; theater!(ib, go, undefined, opt(st)); } else go();
    return;
  }
  if (h === 'rise') { riseUp(id as 'youchi' | 'naio'); return; }
  if (h === 'retire') { if (!retireArm) { retireArm = true; say = { text: '家督を譲れば、一生はそこで締めになる。もう一度押すと隠居する。' }; render(); return; } retireArm = false; const ls = CR.retire(s); for (const x of ls) H.note(s, x); report = [...ls, '一生を終えた。']; save(); render(); return; }
  if (h === 'buy') { pane = 'akinai'; void act(() => T.buy(s!, +id), 'ichi'); return; }
  if (h === 'sell') { pane = 'akinai'; void act(() => T.sell(s!, id), 'ichi'); return; }
  if (h === 'gov') { pane = 'shiro'; void act(() => M.govern(s!, id as M.GovAct), 'town'); return; }
  if (h === 'work' && s.hero!.quest?.kind === 'zeriai') { // 小競り合いは槍働きの盤で
    if (busy) return;
    const st = s, q = st.hero!.quest!;
    if (SK.isSick(st)) { say = { text: '病に伏していて、動けない。休んで治すしかない。' }; render(); return; }
    dlg = null;
    const bn = BP.skirmishBan(st, q.sub ?? 'scout');
    const go = () => void openBan(bn, `${st.castles[q.castle].name}の境 ― 小競り合い`, banColors(st, Object.values(st.generals).find((g) => g.clan === q.target)?.id)).then(async (r) => { const won = KK.zeriWon(r), res = BP.applySkirmish(st, r); H.note(st, res.text); const kake = kakeOn() ? [...KK.zeriOutro(st, won), ...KK.retainerKake(st)] : (KK.retainerKake(st), []); say = { text: res.text, hold: true, kake: kake.length ? kake : undefined }; save(); render(); await advance(); });
    if (kakeOn() && theater) theater(KK.zeriIntro(st, q.sub ?? 'scout'), go, undefined, opt(st)); else go(); // 出立の前: 家臣と手立てを話す
    return;
  }
  if (h === 'work') { const k = s.hero!.quest!.kind; void act(() => H.work(s!), k); return; }
  if (h === 'yori-sw') { void act(() => { const r = YO.switchYori(s!, id); if (r.ok) s!.hero!.jun++; return r; }, 'yashiki'); return; }
  if (h === 'visit') { void act(() => H.visit(s!, id), 'yashiki'); return; }
  if (h === 'gift') { void act(() => H.giveGift(s!, id), 'yashiki'); return; }
  if (h === 'goto') { onHex(+id); return; }
  if (h === 'join') { void act(() => H.joinArmy(s!, +id), 'town'); return; }
  if (h === 'leavecamp') { void act(() => H.leaveCamp(s!), 'town', true); return; } // 病でも陣は離れられる（後送）
  if (h === 'campwait') { void act(() => H.campWait(s!), 'town', true); return; }
  if (h === 'goon') { recenter = true; void act(() => H.goOn(s!), 'tabi'); return; }
  if (h === 'spot') {
    const k = id as H.Spot;
    if (k === 'yashiki') { pane = 'yashiki'; render(); return; }
    if (k === 'tabi') { pane = 'tabi'; render(); return; }
    if ((k === 'dojo' || k === 'tera') && CR.heroPlay(s)) { dlg = { kind: k }; say = null; render(); showDlg(); return; } // 道場・寺は窓で稽古か独学を選ぶ
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
.hr-era{align-items:flex-start;text-align:left;padding:14px 14px}.hr-era b{font-size:16px}.hr-clan{position:relative;overflow:hidden}.hr-cbar{position:absolute;left:0;top:0;bottom:0;width:5px}.hr-clans .hr-card img{width:64px;height:auto}
.hr-card{display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;border:1px solid rgba(207,169,94,.28);background:#151517;border-radius:4px}
.hr-card:hover{border-color:#cfa95e}
.hr-card img{border-radius:3px}
.hr-card b{font-size:16px}.hr-card span{font-size:12px;color:#b8ab92}.hr-card .hr-st{font-family:var(--font-ui,sans-serif);font-size:11.5px}
.hr-noface{display:grid;place-items:center;width:96px;height:120px;background:#202023;color:#cfa95e;font-size:24px;border-radius:3px}
.hr-noface.sm{width:44px;height:55px;font-size:16px}
.hr-main{min-height:100%;display:flex;flex-direction:column}





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
.hr-dlg{box-sizing:border-box;margin:auto;align-self:center;width:min(720px,calc(100% - 32px));max-height:calc(100% - 24px);overflow:auto;background:rgba(10,10,10,.9);border:1px solid rgba(207,169,94,.6);padding:18px 22px;border-radius:4px;position:relative;z-index:2}.hr-dlg .hr-dsub{margin:2px 0;font-size:12.5px;opacity:.85}.hr-dacts{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 10px}.hr-dacts .hr-btn{flex:1 1 180px}.hr-dacts .hr-btn small{display:block;font-size:10.5px;opacity:.85;margin-top:2px}.hr-dacts .hr-rel{align-self:center;color:#cfa95e}.hr-dclose{float:right}.hr-meet{width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit;background:transparent}.hr-meet:hover{background:rgba(207,169,94,.08)}.hr-go{margin-left:auto;font-style:normal;color:#cfa95e;font-size:12px;white-space:nowrap;align-self:center}
.hr-say.hold{cursor:pointer}.hr-close{display:block;text-align:right;font-size:12px;color:#cfa95e;opacity:.8;margin-top:6px}.hr-cands{display:flex;flex-direction:column;gap:6px;margin-top:10px}.hr-cand{text-align:left;background:rgba(207,169,94,.08);border:1px solid rgba(207,169,94,.45);color:inherit;padding:8px 12px;border-radius:3px;cursor:pointer;font:inherit}.hr-cand:hover{background:rgba(207,169,94,.2)}.hr-cand b{display:block;color:#cfa95e;font-size:14px}.hr-cand span{font-size:12.5px;opacity:.9}
.hr-ofmsg{color:#f2d27a;border-left:3px solid #cfa95e;padding-left:8px}.hr-rk{display:inline-block;min-width:22px;text-align:center;color:#f2d27a}.hr-offerc{border-top:1px solid rgba(207,169,94,.25);padding:10px 0}.hr-offerc .hr-rel{margin-left:8px;font-size:12px;color:#8fb36a}
.hr-offer{display:flex;gap:10px;justify-content:flex-end;margin-top:12px}.hr-mochi{flex-wrap:wrap;justify-content:flex-start;gap:6px}.hr-mochi .hr-rel{flex-basis:100%;color:#cfa95e}.hr-mochi .hr-btn{flex:1 1 auto;padding:6px 8px;font-size:12.5px}.hr-offer .hr-btn{min-width:96px}
.hr-say.mini{position:relative;z-index:1;margin:auto 12px 12px;width:auto;align-self:stretch;padding:10px 14px;pointer-events:none}
.hr-say.mini .hr-who{display:none}.hr-say.mini .hr-text{font-size:14px}
.hr-kake{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}.hr-kake .hr-who{margin:0;gap:12px}.hr-kake .hr-who img{width:56px;height:70px}.hr-kake .hr-who p{font-size:16px;line-height:1.6;margin-top:2px}.hr-kake .hr-who b{font-size:13px}.hr-knarr{margin:0;font-size:14px;color:#cfc3a8;font-style:italic}.hr-say.mini .hr-kake{display:none}
.hr-side{border-left:1px solid rgba(207,169,94,.2);background:#111113;display:flex;flex-direction:column;min-height:0}
/* 画面上部（大名プレイと同じ .bar の作り） */
#hero .bar.hr-head{flex:none}
#hero .bar .seal{border:0;cursor:pointer;padding:0}
#hero .bar .title b{font-weight:400}#hero .bar .title span{font-size:12px;color:var(--paper-dim,#b8ab92);margin-left:8px;letter-spacing:.04em;font-family:var(--font-body,serif)}
#hero .bar .date{display:flex;gap:6px;align-items:baseline;font-family:var(--font-display,serif);font-size:15px}
#hero .bar .date small{font-size:12px;color:var(--paper-dim,#b8ab92);font-family:var(--font-ui,sans-serif)}
#hero .plaque{color:inherit;font:inherit;font-size:13.5px;cursor:pointer}
#hero .plaque.off{opacity:.38;filter:saturate(.3)}
#hero .plaque.off:hover{opacity:.55}
#hero .seal-btn{cursor:pointer;color:#fbeee0}
#hero .seal-btn:disabled{opacity:.4;cursor:default}
@media (max-width:560px){#hero .hr-main{padding-bottom:calc(56px + env(safe-area-inset-bottom,0px))}} /* 狭い画面では札の帯が下に固定される（大名プレイと同じ）。その分あける */
@media (max-width:820px){#hero .bar .stats{order:3;flex-basis:100%}#hero .bar .cmds{margin-left:0}#hero .plaque{padding:5px 8px;font-size:12.5px}#hero .seal-btn{padding:5px 12px;font-size:14px}}
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


}
`;

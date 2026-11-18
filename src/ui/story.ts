// 武将で遊ぶ「前田利家 ― 残り火」の画面（序幕・第一幕）。武将で遊ぶと同じ見た目（hero.ts の CSS）で、場面を一枚ずつ見せ、行いと選択を挟む
import { SCENE_ART } from '../data/sceneArt';
import { MINATO_ART } from '../data/scenes';
import { PORTRAITS } from '../data/portraits';
import { STORY_PORTRAITS } from '../data/portraits_story';
import * as D from '../data/story_toshiie';
import { NODES } from '../data/story_toshiie2';
import type { Beat, Choice } from '../data/story_toshiie';
import * as S from '../engine/story';
import { runClanAI } from '../engine/ai';
import { endTurn } from '../engine/game';
import { heroEnd, startHero } from '../engine/hero';
import { newGame } from '../engine/setup';
import type { GameState } from '../engine/types';
import { CSS, openHeroWith, setTheater } from './hero';

const KEY = 'sengoku-story-toshiie';
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ART = (k: string) => { const key = D.STORY_BG[k] ?? k; return SCENE_ART[`story_${k}`] ?? SCENE_ART[key] ?? (key === 'minato' ? MINATO_ART : undefined); };
// 場所の札（場面の絵から）
const BG_NAME: Record<string, string> = { arako: '荒子', arako_night: '荒子の屋敷', sakaya: '荒子の酒屋', kiyosu_tsuji: '清洲の辻', kiyosu_niwa: '清洲城の庭', denchu: '清洲城 殿中', hiroma: '清洲城 広間', kayazu: '萱津', ino: '稲生', moribe: '森部', moribe_sen: '森部', jinmaku: '陣', okehazama: '桶狭間', okehazama_sen: '桶狭間', ta_yoru: '福島の田', fukushima: '福島の屋敷', atsuta: '熱田', zashiki_arako: '荒子の屋敷', kanegasaki: '金ヶ崎', anegawa: '姉川', kita_michi: '北陸の道', fuchu: '越前府中', kieta_mura: '越前の村', hyojo: '府中の評定', fuyu_echizen: '冬の越前', kitanosho: '北ノ庄', tedorigawa: '手取川', hokuriku_jin: '北陸の陣', nanao: '七尾城', nanao_minato: '七尾の港', uozu: '魚津の陣', honnoji_ho: '魚津の陣', shizugatake: '賤ヶ岳' };
type Face = (id: string | null | undefined, w: number) => string;

let face: Face = () => '';
let onQuit: () => void = () => {};
let root: HTMLElement | null = null;
let st: S.StoryState | null = null;
let queue: Beat[] = []; // 見せている場面
let pending: { key: string; choices: Choice[] } | null = null; // 場面のあとの選択
let pane: 'acts' | 'yashiki' | 'tabi' | 'diary' = 'acts';
let busy = '';
let bg = 'arako';
let lastArt: string | undefined;

export const storySaved = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
function save() { try { if (st) localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 続ける */ } }

function ensureRoot() {
  if (!document.getElementById('hero-style')) { const x = document.createElement('style'); x.id = 'hero-style'; x.textContent = CSS; document.head.appendChild(x); }
  if (!document.getElementById('story-style')) { const x = document.createElement('style'); x.id = 'story-style'; x.textContent = CSS.split('#hero').join('#story') + STORY_CSS; document.head.appendChild(x); } // 同じ見た目を #story にも
  root = document.getElementById('story');
  if (!root) { root = document.createElement('div'); root.id = 'story'; root.className = 'story-root'; document.body.appendChild(root); root.addEventListener('click', onClick); }
  root.hidden = false;
}
export function openStory(f: Face, quit: () => void) {
  face = f; onQuit = quit;
  ensureRoot();
  st = null; queue = []; pending = null; pane = 'acts';
  renderTitle();
}
function close() { if (root) root.hidden = true; onQuit(); }

function renderTitle() {
  root!.innerHTML = `<div><div class="hr-pick">
    <div class="hr-top"><button class="hr-btn ghost" data-s="quit">← タイトルへ</button><span class="hr-tag">武将で遊ぶ・物語</span></div>
    <h2>前田利家 ― 残り火</h2>
    <p class="hr-lede">尾張荒子の前田家の四男、犬千代。長すぎる槍と、信長の庭。拾阿弥を斬って清洲を追われた男は、浪人の身から、もう一度あの庭へ戻れるか。<br>第一部「戻る道」: 序幕（犬千代の若き日）→ 第一幕「こぼれた火」（荒子の浪人）→ 無断参戦 → 帰参 → 家督。<br>第二部「北へ立つ」: 前田家を率いて金ヶ崎・姉川へ。そして越前府中の城主に（府中三人衆）。<br>第三部「裂け目」: 七尾落城・手取川・能登の国主・本能寺、そして賤ヶ岳。原作: 小説『残り火』。</p>
    <div class="hr-cont">${storySaved() ? '<button class="hr-btn primary" data-s="continue">続きから</button> ' : ''}<button class="hr-btn${storySaved() ? '' : ' primary'}" data-s="new">はじめから（序幕）</button> <button class="hr-btn ghost" data-s="new-skip">序幕をとばす</button></div>
    <div style="margin-top:18px">${face('maeda_toshiie', 160)}</div>
  </div></div>`;
}

function begin(skip: boolean) {
  const base = newGame('oda', 'normal', 1, '1560');
  st = S.newStory({ bra: base.generals.maeda_toshiie?.bra ?? 80 });
  queue = skip ? [...D.EV_RETURN] : [...D.PROLOGUE, ...D.EV_RETURN];
  pending = null; pane = 'acts';
  save(); render();
}

// ───────── 描く ─────────
const nameOf = (id: string) => id === 'kinoshita_tokichiro' && label.includes('第三部') ? '羽柴秀吉' : D.STORY_CAST[id] ?? ({ fuwa_mitsuharu: '不破光治', tokugawa_ieyasu: '徳川家康', maeda_toshiie: '前田利家', oda_nobunaga: '織田信長', ikeda_tsuneoki: '池田恒興', sassa_narimasa: '佐々成政', kinoshita_tokichiro: '木下藤吉郎', shibata_katsuie: '柴田勝家', maeda_toshimasu: '前田利益' } as Record<string, string>)[id] ?? id;
// 顔: 物語の人物は届いた絵、犬千代は利家の顔、三郎は信長の顔。なければ名の札
function faceOf(id: string, w: number) {
  const pid = id === 'maeda_toshiie' && !theaterDone && !st?.done ? 'inuchiyo' : id === 'maeda_toshiie' && part2 && STORY_PORTRAITS.toshiie_mid ? 'toshiie_mid' : id === 'sanro' ? 'nobunaga_young' : id; // 帰参までの利家は若き日の顔、辻の三郎はうつけの頃の信長
  const src = STORY_PORTRAITS[pid] ?? PORTRAITS[pid];
  if (src) return `<img class="face" src="${src}" width="${w}" height="${Math.round(w * 1.25)}" alt="">`;
  return `<span class="hr-noface" style="width:${w}px;height:${Math.round(w * 1.25)}px;font-size:${Math.round(w / 4)}px">${esc(nameOf(id).slice(0, 3))}</span>`;
}
function render() {
  if (!st || !root) return;
  const b = queue[0];
  if (b?.bg) bg = b.bg;
  else if (!b && !pending) bg = S.PLACE_BG[st.place]; // 選択の間は直前の場面の絵のまま
  const art = ART(bg);
  const step = st.battle && !queue.length ? S.stepsOf(st)[st.battle.step] : null;
  const pro = queue.includes(D.EV_RETURN[0]) && queue[0] !== D.EV_RETURN[0]; // 序幕の間は日付を出さない
  if (step) bg = step.bg;
  const sceneArt = step ? ART(step.bg) : art;
  const changed = sceneArt !== lastArt; // 絵が替わったときだけ、ゆっくり浮かび上がらせる
  lastArt = sceneArt;
  root.innerHTML = `<div><div class="hr-main">
    <header class="hr-head">
      <div class="hr-id">${faceOf('maeda_toshiie', 56)}<div><b>前田利家</b><span>${st.done ? '帰参' : '浪人（前田家の四男）'}</span></div></div>
      <div class="hr-date">${pro ? '序幕' : S.JUN[st.jun]}<small>${pro ? '犬千代の若き日' : `${st.year}年${st.month}月`}</small></div>
      <dl class="hr-stats"><dt>金</dt><dd>${st.gold}貫</dd><dt>名</dt><dd>${st.fame}</dd><dt>噂を読む</dt><dd>${st.sense}</dd><dt>武勇</dt><dd>${st.bra}</dd><dt>まつ</dt><dd>${st.rel.matsu ?? 0}</dd></dl>
      <button class="hr-btn ghost" data-s="quit" title="保存してタイトルへ">中断</button>
    </header>
    <div class="hr-quest"><b>${st.done ? '第一幕　了' : st.flags.waitMoribe ? '目当て' : '第一幕'}</b> ${esc(goalText(st))}</div>
    <div class="hr-body">
      <section class="hr-scene st-scene">
        <div class="st-bg${pro ? ' memory' : ''}${changed ? ' fadein' : ''}" style="${sceneArt ? `background-image:url(${sceneArt})` : ''}"></div>${pro ? '<div class="st-haze"></div>' : ''}
        ${b?.kind ? fxHtml(b) : `<div class="hr-town"><b>${b?.head ? esc(b.head) : step ? esc(step.head) : esc((b || pending ? BG_NAME[bg] : undefined) ?? S.PLACE_NAME[st.place])}</b><span>${pro ? '序幕' : esc(S.dateLabel(st))}</span></div>
        ${b ? beatHtml(b) : step ? stepHtml(step) : pending ? choiceHtml(pending) : ''}`}
      </section>
      <aside class="hr-side">
        <nav class="hr-tabs">${(['acts', 'yashiki', 'tabi', 'diary'] as const).map((k) => `<button class="${pane === k ? 'on' : ''}" data-s="pane" data-id="${k}">${{ acts: S.PLACE_NAME[st!.place], yashiki: '屋敷', tabi: '道', diary: '日記' }[k]}</button>`).join('')}</nav>
        <div class="hr-pane">${sideHtml(st)}</div>
      </aside>
    </div>
    ${busy ? `<div class="hr-modal"><div class="hr-busy">${esc(busy)}</div></div>` : ''}
  </div></div>`;
}
function goalText(s: S.StoryState) {
  if (s.done) return '清洲へ戻った。ここからは織田家の家臣として働く。';
  if (s.flags.waitMoribe) return '桶狭間では許されなかった。翌年五月、美濃との戦（森部）が近いという。名と腕を磨いて待つ。';
  if (!s.flags.irai) return '荒子で旬を過ごす。屋敷の人と話し、酒屋や清洲の辻で噂を拾う。俸禄も主命もない。';
  if (!s.flags.night2) return '福島の田の水争いを収める（福島の屋敷へ。夜、水口を見張る）。';
  return '「待ってりゃ戻ると思ってたわけじゃねえ」。噂を読む力を上げれば、戦の時と場所が早く分かる。';
}
function beatHtml(b: Beat) {
  const who = b.who;
  const thought = b.text.startsWith('（'); // 心の声・人物の描き添えは括弧のまま
  return `<div class="hr-say" data-s="next" style="cursor:pointer">${who ? `<div class="hr-who">${faceOf(who, 128)}<div><b>${esc(nameOf(who))}</b><p class="st-line">${thought ? esc(b.text) : `「${esc(b.text)}」`}</p></div></div>` : `<p class="st-narr">${narr(b.text)}</p>`}
    <div style="text-align:right;margin-top:8px"><button class="hr-btn" data-s="next">次へ ▸</button> <button class="hr-btn ghost sm" data-s="skip">場面をとばす</button></div></div>`;
}
// 場面転換: 節の扉（墨のにじみ・縦書きの題と年月）・月日の流れ（白い霞と一行）・章の扉（大きな章題）。押すと次へ
function fxHtml(b: Beat) {
  if (b.kind === 'time') return `<div class="st-fx time" data-s="next"><p>${esc(b.text)}</p>${b.sub ? `<span>${esc(b.sub)}</span>` : ''}<small>押して進む</small></div>`;
  if (b.kind === 'chapter') return `<div class="st-fx chapter" data-s="next"><span class="st-sub">${esc(b.sub ?? '')}</span><b>${esc(b.head ?? '')}</b><em>${esc(b.text)}</em><small>押して進む</small></div>`;
  return `<div class="st-fx door" data-s="next"><div class="st-door"><b>${esc(b.text)}</b>${b.sub ? `<span class="st-sub">${esc(b.sub)}</span>` : ''}</div><small>押して進む</small></div>`;
}
// 地の文: 一文ごとに改行する（「」の中の句点では切らない）
function narr(text: string) {
  let depth = 0, out = '';
  for (const ch of text) { if (ch === '「') depth++; if (ch === '」') depth = Math.max(0, depth - 1); out += ch; if (ch === '。' && depth === 0) out += '\n'; }
  return esc(out.trim()).replace(/\n/g, '<br>');
}
function choiceHtml(p: { key: string; choices: Choice[] }) {
  return `<div class="hr-say"><p class="hr-text" style="margin-bottom:10px">どうする。</p>${p.choices.map((c) => `<button class="hr-spot" data-s="choose" data-id="${c.id}"><b>${esc(c.label)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</button>`).join('')}</div>`;
}
function stepHtml(step: D.Step) {
  return `<div class="hr-say"><p class="st-narr" style="margin-bottom:12px">${narr(step.text)}</p>${step.choices.map((c) => `<button class="hr-spot" data-s="bchoose" data-id="${c.id}"><b>${esc(c.label)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</button>`).join('')}</div>`;
}
function sideHtml(s: S.StoryState) {
  const locked = queue.length > 0 || !!pending || !!s.battle;
  if (s.done && !locked) return `<p class="hr-note">第一幕はここまで。ここから第二幕「戻る道」。1560年の世界で織田家の家臣として主命と陣で働きながら、赤母衣・兄の座・家督へ進む（物語の場面は時期と働きに応じて起きる。「月日を送る」で次の場面まで時を進められる）。</p><button class="hr-spot main" data-s="tohero"><b>第二幕へ</b><span>清洲で働く（1560年の世界）</span></button>`;
  if (locked) return `<p class="hr-note">${s.battle ? '戦の只中。読む・決める・飛び込む。' : '場面の途中。'}</p>`;
  if (pane === 'diary') return `<ol class="hr-diary">${[...s.diary].reverse().map((x) => `<li><small>${esc(x.date)}</small>${esc(x.text)}</li>`).join('')}</ol>`;
  if (pane === 'tabi') return `<p class="hr-note">荒子・清洲・熱田は近い。行き来に旬は使わない（着いた先での行いに1旬）。</p>${S.placesOf(s).map((p) => `<button class="hr-town-row" data-s="go" data-id="${p}"><b>${esc(S.PLACE_NAME[p])}</b><span>${p === s.place ? 'いまここ' : ''}</span></button>`).join('')}`;
  if (pane === 'yashiki') {
    if (s.place !== 'arako') return '<p class="hr-none">屋敷は荒子にある。</p>';
    return S.yashikiActs(s).map((a) => `<button class="hr-spot" data-s="act" data-id="${a}"><b>${S.ACT_NAME[a][0]}</b><span>${S.ACT_NAME[a][1]}${a === 'matsu_t' ? `（親しさ ${s.rel.matsu ?? 0}）` : ''}</span></button>`).join('');
  }
  return S.actsOf(s).map((a) => a === 'yashiki' ? `<button class="hr-spot" data-s="pane" data-id="yashiki"><b>屋敷</b><span>まつ・兄・家の者と話す</span></button>` : `<button class="hr-spot${a === 'mihari' ? ' main' : a === 'rest' ? ' dim' : ''}" data-s="act" data-id="${a}"><b>${S.ACT_NAME[a][0]}</b><span>${S.ACT_NAME[a][1]}</span></button>`).join('');
}

// ───────── 第二幕の場面（武将で遊ぶの上に、物語の場面だけを画面いっぱいに見せる） ─────────
let theaterDone: (() => void) | null = null;
let theaterChoose: ((key: string, id: string) => Beat[]) | null = null;
let part2 = false; // 家督のあとの利家（壮年の顔）
let label = '残り火　第二幕';
export function playTheater(beats: Beat[], done: () => void, choose?: (key: string, id: string) => Beat[], opt?: { part2?: boolean; label?: string }) {
  ensureRoot();
  root!.style.zIndex = '70';
  queue = [...beats]; pending = null; theaterDone = done; theaterChoose = choose ?? null; lastArt = undefined;
  part2 = !!opt?.part2; label = opt?.label ?? '残り火　第二幕';
  renderTheater();
}
// 場面の中の問い: 地の文（またはセリフ）に続けて、答えを並べる
function askHtml(b: Beat) {
  const n = NODES[b.ask!];
  const head = b.who ? `<div class="hr-who">${faceOf(b.who, 128)}<div><b>${esc(nameOf(b.who))}</b><p class="st-line">「${esc(b.text)}」</p></div></div>` : `<p class="st-narr" style="margin-bottom:12px">${narr(b.text)}</p>`;
  return `<div class="hr-say">${head}${b.who && n.text ? `<p class="st-narr" style="margin:10px 0">${esc(n.text)}。</p>` : ''}${n.choices.map((c) => `<button class="hr-spot" data-s="ask" data-k="${b.ask}" data-id="${c.id}"><b>${esc(c.label)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</button>`).join('')}</div>`;
}
function renderTheater() {
  const b = queue[0];
  if (!b) { root!.hidden = true; root!.style.zIndex = ''; const d = theaterDone; theaterDone = null; d?.(); return; }
  if (b.bg) bg = b.bg;
  const art = ART(bg), changed = art !== lastArt; lastArt = art;
  root!.innerHTML = `<div><div class="hr-main" style="height:100vh"><div class="hr-body" style="grid-template-columns:1fr;flex:1"><section class="hr-scene st-scene" style="min-height:100vh">
    <div class="st-bg${changed ? ' fadein' : ''}" style="${art ? `background-image:url(${art})` : ''}"></div>
    ${b.kind ? fxHtml(b) : `<div class="hr-town"><b>${esc(b.head ?? BG_NAME[bg] ?? '')}</b><span>${esc(label)}</span></div>${b.ask ? askHtml(b) : beatHtml(b)}`}
  </section></div></div></div>`;
}
setTheater(playTheater); // 武将で遊ぶから呼べるように

// ───────── 動き ─────────
function show(r: S.Show) { queue.push(...r.beats); if (r.choice) pending = r.choice; if (st && S.moribeDue(st) && !pending) show(S.startMoribe(st)); save(); render(); }
function onClick(e: Event) {
  const t = (e.target as HTMLElement).closest('[data-s]') as HTMLElement | null;
  if (!t || busy) return;
  const a = t.dataset.s!, id = t.dataset.id ?? '';
  if (a === 'quit') { save(); close(); return; }
  if (a === 'new') { begin(false); return; }
  if (a === 'new-skip') { begin(true); return; }
  if (a === 'continue') { try { st = JSON.parse(localStorage.getItem(KEY)!); } catch { st = null; } if (st) { queue = []; pending = st.battle ? null : S.pendingChoice(st) ?? null; render(); } return; }
  if (a === 'ask' && theaterDone) { const b = queue.shift(); const more = theaterChoose?.(t.dataset.k ?? b?.ask ?? '', id) ?? []; queue.unshift(...more); renderTheater(); return; }
  if (theaterDone && (a === 'next' || a === 'skip')) { // 問いのある場面は飛ばさない
    if (a === 'next') { e.stopPropagation(); if (!queue[0]?.ask) queue.shift(); }
    else { const i = queue.findIndex((x) => x.ask); queue = i >= 0 ? queue.slice(i) : []; }
    renderTheater(); return;
  }
  if (!st) return;
  if (a === 'next') { e.stopPropagation(); queue.shift(); render(); return; }
  if (a === 'skip') { queue = []; render(); return; }
  if (a === 'pane') { pane = id as typeof pane; render(); return; }
  if (a === 'go') { st.place = id as S.Place; pane = 'acts'; bg = S.PLACE_BG[st.place]; render(); return; }
  if (a === 'act') { pane = id.endsWith('_t') ? 'yashiki' : 'acts'; show(S.act(st, id as S.ActId)); return; }
  if (a === 'choose' && pending) { const k = pending.key; pending = null; show(S.choose(st, k, id)); return; }
  if (a === 'bchoose') { show(S.battleChoose(st, id)); return; }
  if (a === 'tohero') { void toHero(); return; }
}

// 帰参のあと: 1560年の世界へ。森部で許されたときは一年ぶん世の中を進めておく
async function toHero() {
  const s = st!;
  busy = '清洲へ……'; render();
  await new Promise((r) => setTimeout(r, 30));
  const g: GameState = newGame('oda', 'normal', undefined, '1560');
  startHero(g, 'maeda_toshiie'); // 先に武将で遊ぶにしておく（合戦や申し入れをプレイヤーに尋ねない）
  if (s.done === 'moribe') {
    for (let k = 0; k < 12; k++) { busy = `諸国の一年……（${k + 1}/12）`; render(); await new Promise((r) => setTimeout(r, 0)); await runClanAI(g, g.player); await endTurn(g); g.over = null; g.scenes = []; g.events = []; heroEnd(g); g.hero!.jun = 0; }
  }
  const me = g.generals.maeda_toshiie;
  me.bra = Math.max(me.bra, s.bra);
  g.hero!.gold = Math.max(100, s.gold);
  g.hero!.favor = s.rel.oda_nobunaga ?? 40;
  g.hero!.story = 'toshiie'; g.hero!.storyStart = g.year * 12 + g.month; // 第二幕の物語
  if (g.clans.matsudaira?.alive && !g.treaties.some((x) => (x.a === 'oda' && x.b === 'matsudaira') || (x.a === 'matsudaira' && x.b === 'oda'))) g.treaties.push({ a: 'oda', b: 'matsudaira', kind: 'alliance', start: g.turn, until: g.turn + 120 }); // 清洲同盟（史実は1562年）
  for (const id of ['ikeda_tsuneoki', 'sassa_narimasa', 'kinoshita_tokichiro', 'shibata_katsuie']) if (s.rel[id]) g.hero!.rel[id] = s.rel[id];
  g.hero!.diary.push(...s.diary.map((d) => ({ turn: 1, jun: 0, text: `（${d.date}）${d.text}` })));
  busy = '';
  try { localStorage.removeItem(KEY); } catch { /* 続ける */ }
  if (root) root.hidden = true;
  openHeroWith(face, onQuit, g, { who: 'oda_nobunaga', line: '働け。主命は、登城して受けよ', text: '清洲へ戻った。ここからは織田家の家臣として、主命と陣で働く。' });
}

// 物語の文字: 地の文もセリフと同じ書体・大きさで、一文ごとに改行
const STORY_CSS = `
#story .st-narr{margin:0;font-family:var(--font-display,serif);font-size:20px;line-height:1.9;color:#ece2cc;letter-spacing:.02em}
#story .st-line{margin:6px 0 0;font-size:21px;line-height:1.75;font-family:var(--font-display,serif)}
#story .hr-say{max-height:calc(100% - 90px);overflow:auto}
#story .st-scene{position:relative;overflow:hidden;background:#0c0c0d}
#story .st-scene>.hr-town,#story .st-scene>.hr-say{position:relative;z-index:1}
#story .st-bg{position:absolute;inset:-3%;background:center/cover no-repeat;animation:st-kb 28s ease-in-out infinite alternate}
#story .st-bg.fadein{animation:st-fi 1s ease-out,st-kb 28s ease-in-out infinite alternate}
#story .st-bg.memory{filter:sepia(.45) saturate(.72) brightness(1.06) contrast(.9)}
#story .st-haze{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(255,250,238,0) 45%,rgba(255,248,230,.22) 100%);pointer-events:none}
@keyframes st-kb{from{transform:scale(1) translate(0,0)}to{transform:scale(1.07) translate(-1.5%,-1%)}}
@keyframes st-fi{from{opacity:0}to{opacity:1}}
#story .st-fx{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;cursor:pointer;text-align:center}
#story .st-fx small{position:absolute;bottom:16px;font-family:var(--font-ui,sans-serif);font-size:11px;letter-spacing:.2em;opacity:.55}
#story .st-fx.door{background:radial-gradient(ellipse at center,rgba(10,8,6,.9) 25%,rgba(0,0,0,.985) 75%);color:#ece2cc;animation:st-ink 1.1s ease-out}
#story .st-door{display:flex;flex-direction:row-reverse;align-items:flex-start;gap:22px}
#story .st-door b{writing-mode:vertical-rl;font-family:var(--font-display,serif);font-weight:400;font-size:46px;letter-spacing:.35em}
#story .st-sub{writing-mode:vertical-rl;color:#cfa95e;font-size:16px;letter-spacing:.25em;font-family:var(--font-display,serif)}
#story .st-fx.time{background:rgba(250,246,236,.97);color:#3a3026;animation:st-white 1.4s ease-out}
#story .st-fx.time p{margin:0;font-family:var(--font-display,serif);font-size:34px;letter-spacing:.2em}
#story .st-fx.time span{font-family:var(--font-display,serif);font-size:17px;letter-spacing:.3em;color:#8a7350}
#story .st-fx.chapter{background:#060606;color:#ece2cc;animation:st-ink 1.6s ease-out}
#story .st-fx.chapter .st-sub{writing-mode:horizontal-tb;font-size:14px;letter-spacing:.6em}
#story .st-fx.chapter b{font-family:var(--font-display,serif);font-weight:400;font-size:22px;letter-spacing:.4em;color:#cfa95e}
#story .st-fx.chapter em{font-style:normal;font-family:var(--font-display,serif);font-size:58px;letter-spacing:.3em}
@keyframes st-ink{from{opacity:0;filter:blur(8px)}to{opacity:1;filter:blur(0)}}
@keyframes st-white{0%{opacity:0;background:rgba(255,255,255,1)}35%{opacity:1;background:rgba(255,255,255,1)}100%{opacity:1}}
@media (max-width:820px){#story .st-narr{font-size:17px;line-height:1.85}#story .st-line{font-size:17px}#story .st-door b{font-size:36px}#story .st-fx.time p{font-size:26px}#story .st-fx.chapter em{font-size:40px}}
`;

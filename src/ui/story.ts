// 武将で遊ぶ「前田利家 ― 残り火」の画面（序幕・第一幕）。武将で遊ぶと同じ見た目（hero.ts の CSS）で、場面を一枚ずつ見せ、行いと選択を挟む
import { SCENE_ART } from '../data/sceneArt';
import { MINATO_ART } from '../data/scenes';
import { PORTRAITS } from '../data/portraits';
import * as D from '../data/story_toshiie';
import type { Beat, Choice } from '../data/story_toshiie';
import * as S from '../engine/story';
import { runClanAI } from '../engine/ai';
import { endTurn } from '../engine/game';
import { heroEnd, startHero } from '../engine/hero';
import { newGame } from '../engine/setup';
import type { GameState } from '../engine/types';
import { CSS, openHeroWith } from './hero';

const KEY = 'sengoku-story-toshiie';
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ART = (k: string) => { const key = D.STORY_BG[k] ?? k; return SCENE_ART[`story_${k}`] ?? SCENE_ART[key] ?? (key === 'minato' ? MINATO_ART : undefined); };
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

export const storySaved = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
function save() { try { if (st) localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* 続ける */ } }

export function openStory(f: Face, quit: () => void) {
  face = f; onQuit = quit;
  if (!document.getElementById('hero-style')) { const x = document.createElement('style'); x.id = 'hero-style'; x.textContent = CSS; document.head.appendChild(x); }
  if (!document.getElementById('story-style')) { const x = document.createElement('style'); x.id = 'story-style'; x.textContent = CSS.split('#hero').join('#story'); document.head.appendChild(x); } // 同じ見た目を #story にも
  root = document.getElementById('story');
  if (!root) { root = document.createElement('div'); root.id = 'story'; root.className = 'story-root'; document.body.appendChild(root); root.addEventListener('click', onClick); }
  root.hidden = false;
  st = null; queue = []; pending = null; pane = 'acts';
  renderTitle();
}
function close() { if (root) root.hidden = true; onQuit(); }

function renderTitle() {
  root!.innerHTML = `<div><div class="hr-pick">
    <div class="hr-top"><button class="hr-btn ghost" data-s="quit">← タイトルへ</button><span class="hr-tag">武将で遊ぶ・物語</span></div>
    <h2>前田利家 ― 残り火</h2>
    <p class="hr-lede">尾張荒子の前田家の四男、犬千代。長すぎる槍と、信長の庭。拾阿弥を斬って清洲を追われた男は、浪人の身から、もう一度あの庭へ戻れるか。<br>第一部「戻る道」: 序幕（犬千代の若き日）→ 第一幕「こぼれた火」（荒子の浪人）→ 無断参戦 → 帰参。原作: 小説『残り火』。</p>
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
const nameOf = (id: string) => D.STORY_CAST[id] ?? ({ maeda_toshiie: '前田利家', oda_nobunaga: '織田信長', ikeda_tsuneoki: '池田恒興', sassa_narimasa: '佐々成政', kinoshita_tokichiro: '木下藤吉郎', shibata_katsuie: '柴田勝家', maeda_toshimasu: '前田利益' } as Record<string, string>)[id] ?? id;
// 顔: 物語の人物は届いた絵、犬千代は利家の顔、三郎は信長の顔。なければ名の札
function faceOf(id: string, w: number) {
  const src = PORTRAITS[id] ?? (id === 'inuchiyo' ? PORTRAITS.maeda_toshiie : id === 'sanro' ? PORTRAITS.oda_nobunaga : undefined);
  if (src) return `<img class="face" src="${src}" width="${w}" height="${Math.round(w * 1.25)}" alt="">`;
  return `<span class="hr-noface" style="width:${w}px;height:${Math.round(w * 1.25)}px;font-size:${Math.round(w / 4)}px">${esc(nameOf(id).slice(0, 3))}</span>`;
}
function render() {
  if (!st || !root) return;
  const b = queue[0];
  if (b?.bg) bg = b.bg;
  else if (!b) bg = S.PLACE_BG[st.place];
  const art = ART(bg);
  const step = st.battle && !queue.length ? S.stepsOf(st)[st.battle.step] : null;
  const pro = queue.includes(D.EV_RETURN[0]) && queue[0] !== D.EV_RETURN[0]; // 序幕の間は日付を出さない
  if (step) bg = step.bg;
  root.innerHTML = `<div><div class="hr-main">
    <header class="hr-head">
      <div class="hr-id">${faceOf('maeda_toshiie', 56)}<div><b>前田利家</b><span>${st.done ? '帰参' : '浪人（前田家の四男）'}</span></div></div>
      <div class="hr-date">${pro ? '序幕' : S.JUN[st.jun]}<small>${pro ? '犬千代の若き日' : `${st.year}年${st.month}月`}</small></div>
      <dl class="hr-stats"><dt>金</dt><dd>${st.gold}貫</dd><dt>名</dt><dd>${st.fame}</dd><dt>噂を読む</dt><dd>${st.sense}</dd><dt>武勇</dt><dd>${st.bra}</dd><dt>まつ</dt><dd>${st.rel.matsu ?? 0}</dd></dl>
      <button class="hr-btn ghost" data-s="quit" title="保存してタイトルへ">中断</button>
    </header>
    <div class="hr-quest"><b>${st.done ? '第一幕　了' : st.flags.waitMoribe ? '目当て' : '第一幕'}</b> ${esc(goalText(st))}</div>
    <div class="hr-body">
      <section class="hr-scene" style="${(step ? ART(step.bg) : art) ? `background-image:url(${step ? ART(step.bg) : art})` : ''}">
        <div class="hr-town"><b>${b?.head ? esc(b.head) : step ? esc(step.head) : esc(S.PLACE_NAME[st.place])}</b><span>${pro ? '序幕' : esc(S.dateLabel(st))}</span></div>
        ${b ? beatHtml(b) : step ? stepHtml(step) : pending ? choiceHtml(pending) : ''}
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
  return `<div class="hr-say" data-s="next" style="cursor:pointer">${who ? `<div class="hr-who">${faceOf(who, 128)}<div><b>${esc(nameOf(who))}</b><p>「${esc(b.text)}」</p></div></div>` : `<p class="hr-text" style="font-size:17px">${esc(b.text)}</p>`}
    <div style="text-align:right;margin-top:8px"><button class="hr-btn" data-s="next">次へ ▸</button> <button class="hr-btn ghost sm" data-s="skip">場面をとばす</button></div></div>`;
}
function choiceHtml(p: { key: string; choices: Choice[] }) {
  return `<div class="hr-say"><p class="hr-text" style="margin-bottom:10px">どうする。</p>${p.choices.map((c) => `<button class="hr-spot" data-s="choose" data-id="${c.id}"><b>${esc(c.label)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</button>`).join('')}</div>`;
}
function stepHtml(step: D.Step) {
  return `<div class="hr-say"><p class="hr-text" style="font-size:17px;margin-bottom:10px">${esc(step.text)}</p>${step.choices.map((c) => `<button class="hr-spot" data-s="bchoose" data-id="${c.id}"><b>${esc(c.label)}</b>${c.note ? `<span>${esc(c.note)}</span>` : ''}</button>`).join('')}</div>`;
}
function sideHtml(s: S.StoryState) {
  const locked = queue.length > 0 || !!pending || !!s.battle;
  if (s.done && !locked) return `<p class="hr-note">第一幕はここまで。第二幕「戻る道」（赤母衣・家督）は作成中。ここからは1560年の世界で、織田家の家臣として主命と陣で働ける。</p><button class="hr-spot main" data-s="tohero"><b>清洲で働く</b><span>武将で遊ぶ（1560年の世界）へ</span></button>`;
  if (locked) return `<p class="hr-note">${s.battle ? '戦の只中。読む・決める・飛び込む。' : '場面の途中。'}</p>`;
  if (pane === 'diary') return `<ol class="hr-diary">${[...s.diary].reverse().map((x) => `<li><small>${esc(x.date)}</small>${esc(x.text)}</li>`).join('')}</ol>`;
  if (pane === 'tabi') return `<p class="hr-note">荒子・清洲・熱田は近い。行き来に旬は使わない（着いた先での行いに1旬）。</p>${S.placesOf(s).map((p) => `<button class="hr-town-row" data-s="go" data-id="${p}"><b>${esc(S.PLACE_NAME[p])}</b><span>${p === s.place ? 'いまここ' : ''}</span></button>`).join('')}`;
  if (pane === 'yashiki') {
    if (s.place !== 'arako') return '<p class="hr-none">屋敷は荒子にある。</p>';
    return S.yashikiActs(s).map((a) => `<button class="hr-spot" data-s="act" data-id="${a}"><b>${S.ACT_NAME[a][0]}</b><span>${S.ACT_NAME[a][1]}${a === 'matsu_t' ? `（親しさ ${s.rel.matsu ?? 0}）` : ''}</span></button>`).join('');
  }
  return S.actsOf(s).map((a) => a === 'yashiki' ? `<button class="hr-spot" data-s="pane" data-id="yashiki"><b>屋敷</b><span>まつ・兄・家の者と話す</span></button>` : `<button class="hr-spot${a === 'mihari' ? ' main' : a === 'rest' ? ' dim' : ''}" data-s="act" data-id="${a}"><b>${S.ACT_NAME[a][0]}</b><span>${S.ACT_NAME[a][1]}</span></button>`).join('');
}

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
  for (const id of ['ikeda_tsuneoki', 'sassa_narimasa', 'kinoshita_tokichiro', 'shibata_katsuie']) if (s.rel[id]) g.hero!.rel[id] = s.rel[id];
  g.hero!.diary.push(...s.diary.map((d) => ({ turn: 1, jun: 0, text: `（${d.date}）${d.text}` })));
  busy = '';
  try { localStorage.removeItem(KEY); } catch { /* 続ける */ }
  if (root) root.hidden = true;
  openHeroWith(face, onQuit, g, { who: 'oda_nobunaga', line: '働け。主命は、登城して受けよ', text: '清洲へ戻った。ここからは織田家の家臣として、主命と陣で働く。（第二幕は作成中）' });
}

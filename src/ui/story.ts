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
import * as MC from './machi';
import { openBan } from './ban';

const KEY = 'sengoku-story-toshiie';
const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const ART = (k: string) => { const key = D.STORY_BG[k] ?? k; return SCENE_ART[`story_${k}`] ?? SCENE_ART[key] ?? (key === 'minato' ? MINATO_ART : undefined); };
// 場所の札（場面の絵から）
const BG_NAME: Record<string, string> = { arako: '荒子', arako_night: '荒子の屋敷', sakaya: '荒子の酒屋', kiyosu_tsuji: '清洲の辻', kiyosu_niwa: '清洲城の庭', denchu: '清洲城 殿中', hiroma: '清洲城 広間', kayazu: '萱津', ino: '稲生', moribe: '森部', moribe_sen: '森部', jinmaku: '陣', okehazama: '桶狭間', okehazama_sen: '桶狭間', ta_yoru: '福島の田', fukushima: '福島の屋敷', atsuta: '熱田', zashiki_arako: '荒子の屋敷', kanegasaki: '金ヶ崎', anegawa: '姉川', kita_michi: '北陸の道', fuchu: '越前府中', kieta_mura: '越前の村', hyojo: '府中の評定', fuyu_echizen: '冬の越前', kitanosho: '北ノ庄', tedorigawa: '手取川', hokuriku_jin: '北陸の陣', nanao: '七尾城', nanao_minato: '七尾の港', uozu: '魚津の陣', honnoji_ho: '魚津の陣', shizugatake: '賤ヶ岳', kanazawa: '金沢', kaga_ta: '加賀の田', suemori: '末森城', gouu: '豪雨の夜道', suemori_asa: '末森', tateyama: '立山', toyama_jin: '富山の陣', moriyama: '守山城', kanazawa_asa: '金沢', kanazawa_niwa: '金沢城の庭', kyushu: '九州の陣', osaka_hiroma: '大坂城', nagoya: '名護屋', fushimi: '伏見の屋敷', byosho: '伏見の屋敷', yukiakari: '金沢' };
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
let win: MC.Bld | null = null, catNote = ''; // 第一幕の町: 開いている建物の窓・札を押した時の一言

export const storySaved = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };
function save() { try { if (st) { localStorage.setItem(KEY, JSON.stringify(st)); localStorage.setItem('sengoku-last', 'story'); } } catch { /* 続ける */ } }

function ensureRoot() {
  if (!document.getElementById('hero-style')) { const x = document.createElement('style'); x.id = 'hero-style'; x.textContent = CSS + MC.MACHI_CSS; document.head.appendChild(x); }
  if (!document.getElementById('story-style')) { const x = document.createElement('style'); x.id = 'story-style'; x.textContent = (CSS + MC.MACHI_CSS).split('#hero').join('#story') + STORY_CSS; document.head.appendChild(x); } // 同じ見た目を #story にも
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
function contStory() { try { st = JSON.parse(localStorage.getItem(KEY)!); } catch { st = null; } if (st) { queue = []; pending = st.battle ? null : S.pendingChoice(st) ?? null; render(); maybeBan(); }}
export function resumeStory(f: Face, quit: () => void) { openStory(f, quit); contStory(); }
export function storySaveLabel(): string | null { try { const x = JSON.parse(localStorage.getItem(KEY) ?? 'null') as S.StoryState | null; return x ? `物語「残り火」・前田利家（${x.done ? '帰参' : '浪人'}） ${x.year}年${x.month}月` : null; } catch { return null; } }

function renderTitle() {
  const parts: [string, string, string][] = [
    ['第一部', '戻る道', '荒子の浪人から、桶狭間の無断参戦、帰参、家督まで'],
    ['第二部', '北へ立つ', '前田家を率いて金ヶ崎・姉川へ。越前府中の城主に'],
    ['第三部', '裂け目', '七尾落城・手取川・能登の国主・本能寺、そして賤ヶ岳'],
    ['第四部', '根を張る', '加賀へ。末森の籠城と後詰め、北陸の大名に'],
    ['第五部', '残り火', '天下の静けさと、利家の最期'],
  ];
  root!.innerHTML = `<div><div class="hr-pick st-entry">
    <div class="hr-top"><button class="hr-btn ghost" data-s="quit">← タイトルへ</button><span class="hr-tag">物語</span></div>
    <div class="st-entry-main">
      <div class="st-entry-face">${face('maeda_toshiie', 200)}</div>
      <div>
        <h2>前田利家 ― 残り火</h2>
        <p class="hr-lede">尾張荒子の前田家の四男、犬千代。長すぎる槍と、信長の庭。拾阿弥を斬って清洲を追われた男は、浪人の身から、もう一度あの庭へ戻れるか。</p>
        <div class="st-entry-about">
          <div><b>前田利家の半生を生きる</b><span>荒子の浪人から加賀百万石まで。小説の筋に沿った場面と問いで、利家の一生を追う。答え方で前田家と領国の行く末が変わる。</span></div>
          <div><b>武将として遊ぶの手ほどき</b><span>章ごとに、その身分で使えるようになる仕組み（町と旬、主命と出世、槍働き、家と家臣、城の政、領主）を、画面右の「手ほどき」で一つずつ覚える。終えれば「武将として遊ぶ」で、どの時代・どの家の武将でも同じように遊べる。</span></div>
        </div>
        <ol class="st-entry-parts">${parts.map(([n, t, d]) => `<li><b>${n}「${t}」</b><span>${d}</span></li>`).join('')}</ol>
      </div>
    </div>
    ${storySaved() ? '<p class="hr-note st-entry-warn">出陣すると、物語ははじめから（序幕から）になる。前の続きは、タイトルの「続きから」で遊べる。</p>' : ''}
    <button type="button" class="seal-btn st-entry-go" data-s="new">出陣</button>
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
const nameOf = (id: string) => castNames[id] ?? (id === 'kinoshita_tokichiro' && label.includes('第五部') ? '豊臣秀吉' : id === 'kinoshita_tokichiro' && /第[三四]部/.test(label) ? '羽柴秀吉' : D.STORY_CAST[id] ?? ({ fuwa_mitsuharu: '不破光治', tokugawa_ieyasu: '徳川家康', maeda_toshinaga: '前田利長', maeda_toshiie: '前田利家', oda_nobunaga: '織田信長', ikeda_tsuneoki: '池田恒興', sassa_narimasa: '佐々成政', kinoshita_tokichiro: '木下藤吉郎', shibata_katsuie: '柴田勝家', maeda_toshimasu: '前田利益' } as Record<string, string>)[id] ?? id);
// 顔: 物語の人物は届いた絵、犬千代は利家の顔、三郎は信長の顔。なければ名の札
function faceOf(id: string, w: number) {
  const pid = id === 'maeda_toshiie' && !theaterDone && !st?.done ? 'inuchiyo' : id === 'maeda_toshiie' && part2 && STORY_PORTRAITS.toshiie_mid ? 'toshiie_mid' : id === 'sanro' ? 'nobunaga_young' : id; // 帰参までの利家は若き日の顔、辻の三郎はうつけの頃の信長
  const ALIAS: Record<string, string> = { ie_karo: 'koshin', ie_kerai: 'wakazamurai', mura_wakamono: 'arako_wakamono', narimasa_yuki: 'sassa_narimasa', hideyoshi_tenka: 'kinoshita_tokichiro', toshihisa_old: 'toshihisa' }; // 届くまでは元の顔で
  const late = label.includes('第五部');
  const pid2 = late && ({ kinoshita_tokichiro: 'hideyoshi_old', maeda_toshiie: 'toshiie_old', matsu_wife: 'matsu_old', maeda_toshimasu: 'toshimasu_kabuki' } as Record<string, string>)[pid] && STORY_PORTRAITS[({ kinoshita_tokichiro: 'hideyoshi_old', maeda_toshiie: 'toshiie_old', matsu_wife: 'matsu_old', maeda_toshimasu: 'toshimasu_kabuki' } as Record<string, string>)[pid]] ? ({ kinoshita_tokichiro: 'hideyoshi_old', maeda_toshiie: 'toshiie_old', matsu_wife: 'matsu_old', maeda_toshimasu: 'toshimasu_kabuki' } as Record<string, string>)[pid] : pid === 'kinoshita_tokichiro' && /第[四五]部/.test(label) && STORY_PORTRAITS.hideyoshi_tenka ? 'hideyoshi_tenka' : pid;
  const src = STORY_PORTRAITS[pid2] ?? PORTRAITS[pid2] ?? (ALIAS[pid2] ? STORY_PORTRAITS[ALIAS[pid2]] ?? PORTRAITS[ALIAS[pid2]] : undefined);
  if (src) return `<img class="face" src="${src}" width="${w}" height="${Math.round(w * 1.25)}" alt="">`;
  return `<span class="hr-noface" style="width:${w}px;height:${Math.round(w * 1.25)}px;font-size:${Math.round(w / 4)}px">${esc(nameOf(id).slice(0, 3))}</span>`;
}
// ───────── 第一幕の町（武将で遊ぶと同じ作り。行いと出来事は engine/story.ts のまま） ─────────
type B1 = { label: string; place: S.Place; art: string; bg: string; acts: S.ActId[]; sub: string };
function blds1(s: S.StoryState): Partial<Record<MC.Bld, B1>> {
  const f = s.flags, o: Partial<Record<MC.Bld, B1>> = {};
  o.shiro = { label: '清洲城', place: 'kiyosu', art: 'shiro_l', bg: 'kiyosu_niwa', acts: [], sub: '追われた身。門は開かない' };
  o.ie = { label: '荒子の屋敷', place: 'arako', art: 'ie_s', bg: 'arako_night', acts: [...S.yashikiActs(s), 'suburi', ...(f.waitMoribe ? ['wait' as S.ActId] : []), 'rest'], sub: '荒子' };
  o.mura = { label: '荒子の村', place: 'arako', art: 'mura', bg: 'arako', acts: ['aruku', 'sakaya'], sub: '荒子' };
  o.ichi = { label: '清洲の辻', place: 'kiyosu', art: 'ichi', bg: 'kiyosu_tsuji', acts: ['tsuji'], sub: '清洲の城下' };
  o.chaya = { label: '清洲の酒屋', place: 'kiyosu', art: 'chaya', bg: 'sakaya', acts: ['kiyosu_sakaya'], sub: '清洲の城下' };
  o.nanban = { label: '熱田の湊', place: 'atsuta', art: 'nanban', bg: 'atsuta', acts: [...(f.koshin ? ['yojinbo' as S.ActId] : []), 'minato'], sub: '熱田' };
  if (f.irai) o.buke = { label: '福島の屋敷', place: 'fukushima', art: 'buke', bg: 'fukushima', acts: f.night2 ? [] : ['mihari'], sub: '福島' };
  return o;
}
const ACT1_LABEL: Partial<Record<S.ActId, string>> = { aruku: '村を歩く', sakaya: '荒子の酒屋で飲む', suburi: '庭で素振り', rest: '休む（1旬）', kiyosu_sakaya: '清洲の酒屋で飲む' };
function townB(s: S.StoryState): Record<MC.Bld, string[]> {
  const b = Object.fromEntries((['shiro', 'buke', 'ie', 'dojo', 'tera', 'chaya', 'ichi', 'nanban', 'kaido', 'mura', 'youken'] as MC.Bld[]).map((k) => [k, [] as string[]])) as Record<MC.Bld, string[]>;
  for (const [k, v] of Object.entries(blds1(s))) b[k as MC.Bld] = v!.acts.some((a) => a === 'mihari') ? ['<button class="hr-spot main" data-s="x"></button>'] : ['x']; // 福島の頼みは急ぎの印
  return b;
}
const townView = (s: S.StoryState): MC.MachiView => ({ sp: window.matchMedia('(max-width:820px)').matches, castle: 'l', ie: 's', snow: s.month === 12 || s.month <= 2 });
function winHtml(s: S.StoryState, k: MC.Bld) {
  const B = blds1(s)[k]; if (!B) return '';
  const art = ART(B.bg) ?? '';
  const acts = B.acts.map((a) => `<button class="hr-spot${a === 'mihari' ? ' main' : a === 'rest' ? ' dim' : ''}" data-s="wact" data-id="${B.place}:${a}"><b>${esc(ACT1_LABEL[a] ?? S.ACT_NAME[a][0])}</b><span>${esc(S.ACT_NAME[a][1])}${a === 'matsu_t' ? `（親しさ ${s.rel.matsu ?? 0}）` : ''}</span></button>`).join('');
  return `<div class="hr-dlg hr-bldwin"><div class="hr-bldart" style="${art ? `background-image:url(${art})` : ''}"><h4>${esc(B.label)}<small>${esc(B.sub)}</small></h4></div><div class="hr-bldbody">${acts || `<p class="hr-none">${esc(B.sub)}。</p>`}</div><div class="hr-bldfoot"><button class="hr-btn hr-dclose" data-s="dlg-close">町へ戻る</button></div></div>`;
}
// 画面上部（武将で遊ぶ・大名プレイと同じ作り）。浪人の身なので、記録のほかの札は使えない
const CAT1: [string, string, string][] = [['naisei', '内政', '城を預かると使える。'], ['gunji', '軍事', '浪人には率いる軍勢がない。'], ['jinji', '人事', '家臣ができると使える。'], ['gaiko', '外交', '浪人には主家がない。'], ['akinai', '商い', '商いの荷を扱う身ではない。'], ['kiroku', '記録', '']];
function headHtml(s: S.StoryState, pro: boolean, locked: boolean) {
  const stat = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<header class="bar"><div class="brand"><button type="button" class="seal" data-s="quit" title="保存してタイトルへ">陣</button><div class="brand-text hr-id"><div class="title"><b>前田利家</b><span>${s.done ? '帰参' : '浪人（前田家の四男）'}</span></div><div class="date hr-date">${pro ? '序幕' : S.JUN[s.jun]}<small>${pro ? '犬千代の若き日' : `${s.year}年${s.month}月`}</small></div></div></div>
    <dl class="stats hr-stats">${stat('金', `${s.gold}貫`)}${stat('名', `${s.fame}`)}${stat('噂を読む', `${s.sense}`)}${stat('武勇', `${s.bra}`)}${stat('まつ', `${s.rel.matsu ?? 0}`)}</dl>
    <nav class="cmds">${CAT1.map(([k, n, w]) => `<button type="button" class="plaque${w ? ' off' : ''}" data-s="cat" data-id="${k}" title="${esc(w || n)}">${n}</button>`).join('')}<button type="button" class="seal-btn" data-s="rest1" ${locked || s.done ? 'disabled' : ''} title="1旬を過ごす">休む</button></nav></header>`;
}
// 手ほどき（第一幕）: やってみる目標。済んだ印は st.flags['teh:<行い>']
const TEH1: { id: string; label: string; hint: string; keys: S.ActId[]; bld: MC.Bld }[] = [
  { id: 'matsu', label: '屋敷でまつと話す', hint: '荒子の屋敷の窓から。話すほど親しくなる', keys: ['matsu_t'], bld: 'ie' },
  { id: 'suburi', label: '庭で素振りをする', hint: '荒子の屋敷の窓から。武勇が上がることがある', keys: ['suburi'], bld: 'ie' },
  { id: 'sakaya', label: '酒屋で噂を聞く', hint: '荒子の村か清洲の酒屋。噂を読む力が上がり、戦の時と場所が見えてくる', keys: ['sakaya', 'kiyosu_sakaya'], bld: 'mura' },
  { id: 'tsuji', label: '清洲の辻を歩く', hint: '清洲の辻の窓から。昔の仲間に会えることがある', keys: ['tsuji'], bld: 'ichi' },
  { id: 'yojinbo', label: '熱田の湊で用心棒をする', hint: '屋敷の古参の話を聞くと、熱田に口が見つかる。金と名が入る', keys: ['yojinbo'], bld: 'nanban' },
  { id: 'rest', label: '休んで旬を送る', hint: '上の「休む」。三旬で一か月。戦の噂は時とともに近づく', keys: ['rest'], bld: 'ie' },
];
const tehOn1 = () => { try { return localStorage.getItem('sengoku-teh') !== 'off'; } catch { return true; } };
const teh1Done = (s: S.StoryState, g: (typeof TEH1)[number]) => g.keys.some((k) => !!s.flags[`teh:${k}`]);
const tehMarks1 = (s: S.StoryState) => new Set<string>(tehOn1() ? TEH1.filter((g) => !teh1Done(s, g)).map((g) => g.bld) : []);
let teh1New = '';
function tehDo1(s: S.StoryState, a: S.ActId) {
  const before = TEH1.filter((g) => teh1Done(s, g)).length;
  s.flags[`teh:${a}`] = true;
  const nw = TEH1.filter((g) => teh1Done(s, g) && g.keys.includes(a) && !s.flags[`tehg:${g.id}`]);
  for (const g of nw) { s.flags[`tehg:${g.id}`] = true; s.gold += 5; teh1New = `手ほどき「${g.label}」を済ませた（金+5）。`; }
  void before;
}
function side1(s: S.StoryState, locked: boolean) {
  if (pane === 'diary') return `<p class="hr-note"><button class="hr-btn ghost sm" data-s="pane" data-id="acts">← 町へ</button></p><ol class="hr-diary">${[...s.diary].reverse().map((x) => `<li><small>${esc(x.date)}</small>${esc(x.text)}</li>`).join('')}</ol>`;
  const teh = !tehOn1() ? '<p class="hr-note"><button class="hr-btn ghost sm" data-s="teh-on">手ほどきを出す</button></p>' : `<div class="hr-teh"><h4 class="hr-sub">手ほどき ― 第一幕 浪人<span>${(() => { const n = TEH1.filter((g) => !teh1Done(s, g)).length; return n ? `あと${n}` : 'すべて済んだ'; })()}</span></h4>${teh1New ? `<p class="hr-tehnew">${esc(teh1New)}</p>` : ''}<ul>${TEH1.map((g) => { const d = teh1Done(s, g); return `<li class="${d ? 'done' : ''}"><b>${d ? '✓' : '・'} ${esc(g.label)}</b>${d ? '' : `<span>${esc(g.hint)}</span>`}</li>`; }).join('')}</ul><button class="hr-btn ghost sm" data-s="teh-off">手ほどきを消す</button></div>`;
  return `${catNote ? `<p class="hr-tehnew">${esc(catNote)}</p>` : ''}${locked ? `<p class="hr-note">${s.battle ? '戦の只中。読む・決める・飛び込む。' : '場面の途中。'}</p>` : ''}${teh}
    <div class="hr-quest"><b>${s.flags.waitMoribe ? '目当て' : '第一幕'}</b> ${esc(goalText(s))}</div>
    <h4 class="hr-sub">わが身</h4><div class="hr-me">${faceOf('maeda_toshiie', 72)}<div><b>前田利家</b><span>浪人（前田家の四男）・${s.year - 1538}歳</span><span>武勇${s.bra}・名${s.fame}・噂を読む${s.sense}</span><span>手元${s.gold}貫</span></div></div>
    <dl class="hr-kv"><dt>まつ</dt><dd>親しさ${s.rel.matsu ?? 0}</dd><dt>兄・利久</dt><dd>親しさ${s.rel.toshihisa ?? 0}</dd></dl>
    <p class="hr-note" style="margin-top:12px"><button class="hr-btn ghost sm" data-s="machi" data-id="list">一覧で表示する</button></p>`;
}
function render() {
  if (!st || !root) return;
  const b = queue[0];
  if (b?.bg) bg = b.bg;
  else if (!b && !pending) bg = S.PLACE_BG[st.place]; // 選択の間は直前の場面の絵のまま
  const art = ART(bg);
  const step = st.battle && !st.battle.ban && !queue.length ? S.stepsOf(st)[st.battle.step] : null;
  const pro = queue.includes(D.EV_RETURN[0]) && queue[0] !== D.EV_RETURN[0]; // 序幕の間は日付を出さない
  if (step) bg = step.bg;
  const sceneArt = step ? ART(step.bg) : art;
  const changed = sceneArt !== lastArt; // 絵が替わったときだけ、ゆっくり浮かび上がらせる
  const locked = queue.length > 0 || !!pending || !!st.battle;
  const town = MC.machiOn() && !locked && !st.done && !busy; // 場面がない時は、第一幕の町（荒子・清洲・熱田・福島を一つの町に）
  lastArt = sceneArt;
  root.innerHTML = `<div><div class="hr-main">
    ${headHtml(st, pro, locked)}
    ${town ? '' : `<div class="hr-quest"><b>${st.done ? '第一幕　了' : st.flags.waitMoribe ? '目当て' : '第一幕'}</b> ${esc(goalText(st))}</div>`}
    <div class="hr-body">
      ${town ? `<section class="hr-scene st-scene machi">${MC.machiHtml(townB(st), townView(st), true, !!win, tehMarks1(st), { labels: Object.fromEntries(Object.entries(blds1(st)).map(([k, v]) => [k, v!.label])), arts: Object.fromEntries(Object.entries(blds1(st)).map(([k, v]) => [k, v!.art])), ds: true })}<div class="hr-town"><b>尾張</b><span>${esc(S.dateLabel(st))}</span></div>${win ? winHtml(st, win) : ''}</section>` : `<section class="hr-scene st-scene">
        <div class="st-bg${pro ? ' memory' : ''}${changed ? ' fadein' : ''}" style="${sceneArt ? `background-image:url(${sceneArt})` : ''}"></div>${pro ? '<div class="st-haze"></div>' : ''}
        ${b?.kind ? fxHtml(b) : `<div class="hr-town"><b>${b?.head ? esc(b.head) : step ? esc(step.head) : esc((b || pending ? BG_NAME[bg] : undefined) ?? S.PLACE_NAME[st.place])}</b><span>${pro ? '序幕' : esc(S.dateLabel(st))}</span></div>
        ${b ? beatHtml(b) : step ? stepHtml(step) : pending ? choiceHtml(pending) : ''}`}
      </section>`}
      <aside class="hr-side">
        ${town || (MC.machiOn() && !st.done) ? `<div class="hr-pane">${side1(st, locked)}</div>` : `<nav class="hr-tabs">${(['acts', 'yashiki', 'tabi', 'diary'] as const).map((k) => `<button class="${pane === k ? 'on' : ''}" data-s="pane" data-id="${k}">${{ acts: S.PLACE_NAME[st!.place], yashiki: '屋敷', tabi: '道', diary: '日記' }[k]}</button>`).join('')}</nav>
        <div class="hr-pane">${sideHtml(st)}</div>`}
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
  return `<div class="hr-say" data-s="next" style="cursor:pointer">${who ? `<div class="hr-who">${faceOf(who, 128)}<div><b>${esc(b.name ?? nameOf(who))}</b><p class="st-line">${thought ? esc(b.text) : `「${esc(b.text)}」`}</p></div></div>` : `<p class="st-narr">${narr(b.text)}</p>`}
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
let castNames: Record<string, string> = {}; // 物語の外の主人公・主君などの名
let tx: (x: string) => string = (x) => x; // 物語の外では前田家の名を置き換える
let label = '残り火　第二幕';
export function playTheater(beats: Beat[], done: () => void, choose?: (key: string, id: string) => Beat[], opt?: { part2?: boolean; label?: string; cast?: Record<string, string>; tx?: (x: string) => string }) {
  ensureRoot();
  root!.style.zIndex = '70';
  queue = [...beats]; pending = null; theaterDone = done; theaterChoose = choose ?? null; lastArt = undefined;
  part2 = !!opt?.part2; label = opt?.label ?? '残り火　第二幕'; castNames = opt?.cast ?? {}; tx = opt?.tx ?? ((x) => x);
  renderTheater();
}
// 場面の中の問い: 地の文（またはセリフ）に続けて、答えを並べる
function askHtml(b: Beat) {
  const n = b.choices ? { text: '', choices: b.choices } : NODES[b.ask!]; // 浪人の場面などは、問いの答えを場面に持たせる
  const head = b.who ? `<div class="hr-who">${faceOf(b.who, 128)}<div><b>${esc(b.name ?? nameOf(b.who))}</b><p class="st-line">「${esc(b.text)}」</p></div></div>` : `<p class="st-narr" style="margin-bottom:12px">${narr(b.text)}</p>`;
  return `<div class="hr-say">${head}${b.who && n.text ? `<p class="st-narr" style="margin:10px 0">${esc(tx(n.text))}。</p>` : ''}${n.choices.map((c) => `<button class="hr-spot" data-s="ask" data-k="${b.ask}" data-id="${c.id}"><b>${esc(tx(c.label))}</b>${c.note ? `<span>${esc(tx(c.note))}</span>` : ''}</button>`).join('')}</div>`;
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
// 合戦の盤: 読む・決める・飛び込むのあと、槍働きの盤を開く。閉じたら戦を締める
let banOpen = false;
function maybeBan() {
  if (!st?.battle?.ban || banOpen || queue.length || pending) return;
  banOpen = true;
  const kind = st.battle.kind;
  void openBan(S.battleBanOf(st), kind === 'moribe' ? '森部 ― 槍働き' : '桶狭間 ― 槍働き', { me: '#c0483b', foe: '#3f6aa8' }).then((b) => { banOpen = false; if (!st) return; show(S.battleFinish(st, b)); });
}
function show(r: S.Show) { queue.push(...r.beats); if (r.choice) pending = r.choice; if (st && S.moribeDue(st) && !pending) show(S.startMoribe(st)); save(); render(); maybeBan(); }
function onClick(e: Event) {
  const t = (e.target as HTMLElement).closest('[data-s]') as HTMLElement | null;
  if (!t || busy) return;
  const a = t.dataset.s!, id = t.dataset.id ?? '';
  if (a === 'quit') { save(); close(); return; }
  if (a === 'bld') { win = id as MC.Bld; catNote = ''; render(); return; }
  if (a === 'dlg-close') { win = null; render(); return; }
  if (a === 'cat') { const c = CAT1.find((x) => x[0] === id); if (id === 'kiroku') { pane = 'diary'; catNote = ''; } else catNote = `${c?.[1]}: ${c?.[2]}`; render(); return; }
  if (a === 'teh-off' || a === 'teh-on') { try { localStorage.setItem('sengoku-teh', a === 'teh-on' ? 'on' : 'off'); } catch { /* 続ける */ } render(); return; }
  if (a === 'machi') { MC.machiSet(id === 'machi'); render(); return; }
  if ((a === 'wact' || a === 'rest1') && st && !queue.length && !pending && !st.battle) { const [pl, ac] = a === 'rest1' ? [st.place, 'rest'] : id.split(':'); st.place = pl as S.Place; win = null; catNote = ''; teh1New = ''; tehDo1(st, ac as S.ActId); show(S.act(st, ac as S.ActId)); return; }
  if (a === 'new') { begin(false); return; }
  if (a === 'new-skip') { begin(true); return; }
  if (a === 'continue') { contStory(); return; }
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
  if (a === 'act') { pane = id.endsWith('_t') ? 'yashiki' : 'acts'; teh1New = ''; tehDo1(st, id as S.ActId); show(S.act(st, id as S.ActId)); return; }
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
#story .st-entry{max-width:960px}
#story .st-entry-main{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start;margin-top:8px}
#story .st-entry-face img{border-radius:4px;box-shadow:0 0 0 1px rgba(207,169,94,.5),0 8px 24px rgba(0,0,0,.5)}
#story .st-entry-about{display:grid;gap:8px;margin:14px 0}
#story .st-entry-about div{border-left:3px solid #cfa95e;background:rgba(207,169,94,.07);padding:8px 12px}
#story .st-entry-about div:nth-child(2){border-left-color:#8fc3e8;background:rgba(143,195,232,.07)}
#story .st-entry-about b{display:block;font-family:var(--font-display,serif);font-weight:400;font-size:17px;letter-spacing:.06em;margin-bottom:2px}
#story .st-entry-about span{font-size:13px;line-height:1.7;color:#d9ccb0}
#story .st-entry-parts{list-style:none;padding:0;margin:0;display:grid;gap:4px}
#story .st-entry-parts li{display:grid;grid-template-columns:11em 1fr;gap:8px;font-size:13px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.06)}
#story .st-entry-parts b{font-weight:500;color:#e8c070}
#story .st-entry-parts span{color:#b8ab92}
#story .st-entry-warn{margin:14px 0 0}
#story .st-entry-go{display:block;width:min(360px,100%);margin:18px auto 0;font-size:22px;padding:12px;letter-spacing:.4em;cursor:pointer}
@media (max-width:820px){#story .st-entry-main{grid-template-columns:1fr}#story .st-entry-face img{width:140px;height:175px;margin:0 auto}#story .st-entry-parts li{grid-template-columns:1fr}#story .st-entry-go{position:sticky;bottom:8px}}
#story .hr-scene.machi .hr-town{position:absolute;top:0;left:0;z-index:2}
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

// 城下の町（武将で遊ぶ）: 行動を建物ごとに分け、町の絵の上の建物を押すと、その建物でできることの窓が開く
// 地面の絵の上に建物と埋め草の絵（data/machiArt.ts）を、置き場所の型（パソコン横長・スマホ縦長）どおりに並べる。設定で「一覧」に戻せる
import { MACHI_ART } from '../data/machiArt';
export type Bld = 'shiro' | 'buke' | 'ie' | 'dojo' | 'tera' | 'chaya' | 'ichi' | 'nanban' | 'kaido' | 'mura' | 'youken';
export const BLD_NAME: Record<Bld, string> = { shiro: '城', buke: '武家屋敷', ie: '自分の屋敷', dojo: '道場', tera: '寺', chaya: '茶屋', ichi: '市', nanban: '南蛮屋', kaido: '街道口', mura: '町はずれの村', youken: '今月の用件' };
export const BLD_SUB: Record<Bld, string> = { shiro: '登城・仕官・城の政・茶会', buke: '武将を訪ねる', ie: '休む・家・家臣', dojo: '稽古・独学・試合', tera: '学問・独学・連歌', chaya: '噂を聞く', ichi: '商い・進物・名物', nanban: '南蛮の品と噂', kaido: '旅・陣借り・用心棒', mura: '野盗・国衆・普請', youken: '' };
// 置き場所の型: [建物か埋め草, 足もとの左%, 足もとの上%, 大きさの倍率]。建物のない町では、その場所に代わりの埋め草（alt）を置く
type Slot = { k: Exclude<Bld, 'youken'> | null; art?: string; x: number; y: number; s?: number; alt?: string };
const LAYOUT: Record<'pc' | 'sp', { gw: number; ratio: number; slots: Slot[] }> = {
  pc: { gw: 2048, ratio: 16 / 10, slots: [
    { k: null, art: 'matsu', x: 44, y: 17 }, { k: null, art: 'machiya2', x: 33, y: 30 }, { k: null, art: 'kodachi', x: 9, y: 32 }, { k: 'shiro', x: 53, y: 33, s: 0.68 }, { k: 'tera', x: 85, y: 38, alt: 'kodachi' },
    { k: 'buke', x: 19, y: 45, alt: 'machiya' }, { k: null, art: 'matsu', x: 3, y: 46 }, { k: null, art: 'machiya', x: 31, y: 47 }, { k: 'ie', x: 71, y: 47 },
    { k: null, art: 'kodachi', x: 95, y: 56 }, { k: null, art: 'yanagi', x: 63, y: 63 }, { k: null, art: 'machiya2', x: 25, y: 65 }, { k: 'chaya', x: 41, y: 66, alt: 'machiya2' }, { k: null, art: 'ido', x: 56, y: 67 },
    { k: 'nanban', x: 77, y: 72, alt: 'machiya' }, { k: 'dojo', x: 30, y: 82, alt: 'machiya' }, { k: null, art: 'taru', x: 66, y: 88 },
    { k: 'ichi', x: 52, y: 93, alt: 'kura' }, { k: null, art: 'kuruma', x: 62, y: 95 }, { k: 'kaido', x: 7, y: 98 }, { k: 'mura', x: 90, y: 98, alt: 'kodachi' },
  ] },
  sp: { gw: 1280, ratio: 4 / 5, slots: [
    { k: null, art: 'matsu', x: 90, y: 12 }, { k: null, art: 'kodachi', x: 9, y: 30 }, { k: 'shiro', x: 52, y: 30, s: 0.75 }, { k: 'tera', x: 84, y: 40, alt: 'kodachi' }, { k: 'buke', x: 20, y: 45, alt: 'machiya' },
    { k: 'ie', x: 30, y: 61 }, { k: 'chaya', x: 52, y: 66, alt: 'machiya2' }, { k: 'nanban', x: 80, y: 70, alt: 'machiya' }, { k: 'dojo', x: 28, y: 81, alt: 'machiya' },
    { k: 'ichi', x: 54, y: 91, alt: 'kura' }, { k: 'kaido', x: 10, y: 98 }, { k: 'mura', x: 88, y: 98, alt: 'kodachi' },
  ] },
};
const K = 0.6; // 絵の縮尺 → 地面の縮尺
// 町の見た目を決めるもの: スマホか・城の大きさ・自分の屋敷（家の格。浪人は長屋）・冬
export type MachiView = { sp: boolean; castle: 's' | 'l' | 'yake'; ie: 's' | 'm' | 'l' | 'nagaya'; snow: boolean };
// 建物の窓の背景（いまある場面の絵）。街道口は季節で雨・雪の道
export function bldArt(id: Bld, month: number, ronin: boolean): string {
  if (id === 'kaido') return month === 12 || month <= 2 ? 'yukimichi' : month === 6 ? 'amemichi' : 'story_kita_michi';
  return ({ shiro: 'zashiki_day', buke: 'zashiki_day', ie: ronin ? 'chaya' : 'zashiki_night', dojo: 'dojo', tera: 'hondo', chaya: 'chaya', ichi: 'ichi', nanban: 'minato', mura: 'mura', youken: 'ichi' } as Record<Bld, string>)[id];
}
// 浪人は自分の屋敷ではなく長屋
export const ieName = (ronin: boolean) => (ronin ? '長屋' : BLD_NAME.ie);

// 設定: 町（建物）か一覧か。試験の自動操作（webdriver）では、何も選んでいなければ一覧のまま
const KEY = 'sengoku-machi';
export function machiOn() { try { const v = localStorage.getItem(KEY); return v ? v === 'machi' : !navigator.webdriver; } catch { return true; } }
export function machiSet(on: boolean) { try { localStorage.setItem(KEY, on ? 'machi' : 'list'); } catch { /* 続ける */ } }

// ボタンの data-h（と data-id）から建物を決める
const BY_H: Record<string, Bld> = {
  ronko: 'shiro', 'ryo-back': 'shiro', shikan: 'shiro', askshiro: 'shiro', secret: 'shiro', info: 'shiro', chakai: 'shiro', kenmei: 'shiro',
  work: 'youken', proxy: 'youken', lead: 'youken', offers: 'youken', kake: 'youken',
  join: 'kaido', jingari: 'kaido', yojinbo: 'kaido',
  advice: 'ie', rest: 'ie', retire: 'ie', skip: 'ie', hire: 'ie', kaku: 'ie',
  buymei: 'ichi', dojoyaburi: 'dojo', teach: 'dojo', renga: 'tera', scout: 'mura', rise: 'mura', nozoku: 'mura', fuuke: 'mura',
};
const BY_SPOT: Record<string, Bld> = { tojo: 'shiro', yashiki: 'buke', chaya: 'chaya', ichi: 'ichi', dojo: 'dojo', tera: 'tera', tabi: 'kaido', nanban: 'nanban' };
const BY_PANE: Record<string, Bld> = { shiro: 'shiro', homen: 'shiro', akinai: 'ichi', tabi: 'kaido', yashiki: 'buke' };
export function bldOf(piece: string): Bld {
  const m = /data-h="([^"]+)"(?:\s+data-id="([^"]*)")?/.exec(piece);
  if (!m) return 'youken'; // 書き添え（病・名声など）は用件の帯に
  const [, h, id] = m;
  if (h === 'spot') return BY_SPOT[id ?? ''] ?? 'youken';
  if (h === 'pane') return BY_PANE[id ?? ''] ?? 'youken';
  return BY_H[h] ?? 'youken';
}
// 一覧のHTMLを、上の段の要素（ボタン・書き添え・見出し）ごとに切って建物へ振り分ける
export function split(html: string): Record<Bld, string[]> {
  const out = Object.fromEntries((Object.keys(BLD_NAME) as Bld[]).map((k) => [k, [] as string[]])) as unknown as Record<Bld, string[]>;
  for (const m of html.matchAll(/<p[\s>][\s\S]*?<\/p>|<button[\s\S]*?<\/button>|<h4[\s\S]*?<\/h4>|<div class="hr-person[\s\S]*?<\/div><\/div>/g)) out[bldOf(m[0])].push(m[0]);
  return out;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const hasMain = (xs: string[]) => xs.some((x) => /class="hr-spot main"/.test(x) && !/disabled/.test(x));
// 町: 地面の上に、奥（上）から順に建物と埋め草を並べる。建物は押せる（名札と、急ぎの用の印）
export function machiHtml(b: Record<Bld, string[]>, v: MachiView, ronin: boolean, dim: boolean) {
  const L = LAYOUT[v.sp ? 'sp' : 'pc'];
  const ground = MACHI_ART[v.snow && !v.sp ? 'ground_snow' : v.sp ? 'ground_sp' : 'ground_pc'];
  const artOf = (k: Bld) => (k === 'shiro' ? (v.castle === 'yake' ? 'shiro_yake' : v.castle === 'l' ? 'shiro_l' : 'shiro_s') : k === 'ie' ? (v.ie === 'nagaya' ? 'nagaya' : `ie_${v.ie}`) : k);
  // 城は用がなくても描く（押せない）
  const items = L.slots.map((sl) => { const on = sl.k && b[sl.k]?.length; const key = on || sl.k === 'shiro' ? artOf(sl.k!) : sl.k ? sl.alt : sl.art; return { sl, on: !!on, key }; }).filter((x) => x.key && MACHI_ART[x.key]).sort((a, c) => a.sl.y - c.sl.y);
  const pos = (key: string, sl: Slot) => { const a = MACHI_ART[key]; return `left:${sl.x}%;top:${sl.y}%;width:${((a.w * K * (sl.s ?? 1)) / L.gw * 100).toFixed(2)}%`; };
  const html = items.map(({ sl, on, key }) => on
    ? `<button class="hr-bldi${hasMain(b[sl.k!]) ? ' mark' : ''}" data-h="bld" data-id="${sl.k}" style="${pos(key!, sl)}" title="${esc(BLD_SUB[sl.k!])}"><img src="${MACHI_ART[key!].src}" alt=""><b class="hr-bldtag">${esc(sl.k === 'ie' ? ieName(ronin) : BLD_NAME[sl.k!])}</b></button>`
    : `<img class="hr-fill" src="${MACHI_ART[key!].src}" style="${pos(key!, sl)}" alt="">`).join('');
  return `<div class="hr-machi${dim ? ' dim' : ''}${v.sp ? ' sp' : ''}"><div class="hr-machi-map" style="background-image:url(${ground.src});aspect-ratio:${L.ratio}">${html}</div></div>`;
}
// 右の欄: 今月の用件と、建物の一覧（町の絵が小さい時の近道）
export function sideHtml(b: Record<Bld, string[]>, ronin: boolean) {
  const ks = (['shiro', 'buke', 'ie', 'dojo', 'tera', 'chaya', 'ichi', 'nanban', 'kaido', 'mura'] as Bld[]).filter((k) => b[k].length);
  return `<h4 class="hr-sub">今月の用件</h4>${b.youken.length ? b.youken.join('') : '<p class="hr-none">差し迫った用件はない。町の建物を押して過ごし方を選ぶ。</p>'}
    <h4 class="hr-sub">町</h4><div class="hr-bldlist">${ks.map((k) => `<button class="hr-btn sm${hasMain(b[k]) ? ' primary' : ''}" data-h="bld" data-id="${k}">${esc(k === 'ie' ? ieName(ronin) : BLD_NAME[k])}</button>`).join('')}</div>
    <p class="hr-note" style="margin-top:12px"><button class="hr-btn ghost sm" data-h="machi" data-id="list">一覧で表示する</button></p>`;
}
export const MACHI_CSS = `
.hr-scene.machi{background:#1a1611 !important;container-type:size}
.hr-scene.machi .hr-town{position:absolute;z-index:2;top:0;left:0}
.hr-machi{position:absolute;inset:0;z-index:1;display:grid;place-items:center}
.hr-machi-map{position:relative;width:min(100cqw,160cqh);background:#6b5a3a center/100% 100% no-repeat;box-shadow:0 0 40px rgba(0,0,0,.6)}
.hr-machi.dim .hr-machi-map{filter:brightness(.55) saturate(.8)}
.hr-bldi,.hr-fill{position:absolute;transform:translate(-50%,-100%);display:block}
.hr-fill{pointer-events:none}
.hr-bldi{padding:0;border:0;background:none;cursor:pointer;font:inherit;color:#f1e6cf}
.hr-bldi img{display:block;width:100%;height:auto;transition:filter .15s}
.hr-bldi:hover img,.hr-bldi:focus-visible img{filter:brightness(1.15) drop-shadow(0 0 6px rgba(240,200,110,.9))}
.hr-bldi:focus-visible{outline:none}
.hr-bldtag{position:absolute;left:50%;bottom:-4px;transform:translate(-50%,0);white-space:nowrap;font-family:var(--font-display,serif);font-weight:400;font-size:13px;letter-spacing:.08em;padding:2px 9px;background:rgba(14,12,10,.84);border:1px solid rgba(207,169,94,.65);border-radius:3px}
.hr-bldi:hover .hr-bldtag{border-color:#e8c070;background:rgba(60,44,20,.92)}
.hr-bldi.mark .hr-bldtag::after{content:'';position:absolute;top:-5px;right:-5px;width:10px;height:10px;border-radius:50%;background:#e0b04a;box-shadow:0 0 6px #e0b04a}
.hr-scene.machi>.hr-dlg{position:absolute;inset:10px;margin:auto;height:fit-content;max-height:calc(100% - 20px);z-index:3}
@media (max-width:820px){.hr-scene.machi{container-type:normal;min-height:0}.hr-machi{position:relative}.hr-machi-map{width:100%}.hr-bldtag{font-size:11px;padding:1px 6px}.hr-scene.machi>.hr-dlg{inset:6px;max-height:calc(100% - 12px)}}
.hr-say.machi{position:absolute;right:12px;top:12px;width:min(440px,calc(100% - 200px));margin:0;z-index:2;font-size:14px}
.hr-scene.machi>.hr-say:not(.machi){position:absolute;left:12px;right:12px;bottom:12px;margin:0;z-index:3;max-height:calc(100% - 24px);overflow:auto} /* セリフ・掛け合い・主命などの知らせは、町の上に重ねる（町の絵の下に隠れないよう） */
@media (max-width:820px){.hr-say.machi{position:static;width:auto;margin:8px}.hr-scene.machi>.hr-say:not(.machi){left:6px;right:6px;bottom:6px;max-height:calc(100% - 12px)}}
.hr-dlg.hr-bldwin{padding:0;width:min(900px,calc(100% - 24px));max-height:calc(100% - 20px);display:flex;flex-direction:column;overflow:hidden}
.hr-bldart{flex:none;height:clamp(120px,30vh,240px);background:#222 center/cover no-repeat;position:relative;display:flex;align-items:flex-end}
.hr-bldart::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(10,10,10,.92) 100%)}
.hr-bldart h4{position:relative;z-index:1;margin:0 0 10px 18px;font-family:var(--font-display,serif);font-weight:400;font-size:22px;letter-spacing:.1em;color:#f4e6c4;text-shadow:0 2px 6px #000}
.hr-bldart h4 small{display:block;font-size:12px;letter-spacing:.05em;color:#cdbb95;margin-top:2px}
.hr-bldres{flex:none;margin:10px 18px 0;padding:8px 12px;border-left:3px solid #cfa95e;background:rgba(207,169,94,.1)}
.hr-bldres p{margin:2px 0;font-size:14px;line-height:1.6}
.hr-bldbody{overflow:auto;padding:12px 18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px;align-content:start}
.hr-bldbody>p,.hr-bldbody>h4,.hr-bldbody>div{grid-column:1/-1}
.hr-bldbody .hr-spot{margin:0}
.hr-bldfoot{flex:none;padding:0 18px 12px;text-align:right}
.hr-bldfoot .hr-dclose{float:none}
@media (max-width:820px){.hr-dlg.hr-bldwin{width:calc(100% - 12px);max-height:calc(100% - 12px)}.hr-bldbody{grid-template-columns:1fr;padding:10px 12px}}
.hr-bldlist{display:flex;flex-wrap:wrap;gap:6px}
`;

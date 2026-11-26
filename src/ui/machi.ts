// 城下の町（武将で遊ぶ）: 行動を建物ごとに分け、町の絵の上の建物を押すと、その建物でできることの窓が開く
// 建物の絵が届くまでは、仮の札（名と印）を置き場所の型どおりに並べる。設定で「一覧」に戻せる
export type Bld = 'shiro' | 'buke' | 'ie' | 'dojo' | 'tera' | 'chaya' | 'ichi' | 'nanban' | 'kaido' | 'mura' | 'youken';
export const BLD_NAME: Record<Bld, string> = { shiro: '城', buke: '武家屋敷', ie: '自分の屋敷', dojo: '道場', tera: '寺', chaya: '茶屋', ichi: '市', nanban: '南蛮屋', kaido: '街道口', mura: '町はずれの村', youken: '今月の用件' };
export const BLD_SUB: Record<Bld, string> = { shiro: '登城・仕官・城の政・茶会', buke: '武将を訪ねる', ie: '休む・家・家臣', dojo: '稽古・独学・試合', tera: '学問・独学・連歌', chaya: '噂を聞く', ichi: '商い・進物・名物', nanban: '南蛮の品と噂', kaido: '旅・陣借り・用心棒', mura: '野盗・国衆・普請', youken: '' };
// 置き場所の型（町の絵に対する割合。左・上）。城は奥、街道口と村は手前の端
const POS: Record<Exclude<Bld, 'youken'>, [number, number]> = {
  shiro: [56, 13], buke: [22, 28], tera: [78, 28], dojo: [11, 47], ie: [37, 47], chaya: [63, 47], ichi: [89, 47], kaido: [15, 66], nanban: [50, 66], mura: [85, 66],
};
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
// 町の絵の上の建物（仮の札）
export function machiHtml(b: Record<Bld, string[]>, ronin: boolean, dim: boolean) {
  const ks = (Object.keys(POS) as (keyof typeof POS)[]).filter((k) => b[k].length);
  return `<div class="hr-machi${dim ? ' dim' : ''}">${ks.map((k) => `<button class="hr-bld${hasMain(b[k]) ? ' mark' : ''}" data-h="bld" data-id="${k}" style="left:${POS[k][0]}%;top:${POS[k][1]}%"><b>${esc(k === 'ie' ? ieName(ronin) : BLD_NAME[k])}</b><span>${BLD_SUB[k]}</span></button>`).join('')}</div>`;
}
// 右の欄: 今月の用件と、建物の一覧（町の絵が小さい時の近道）
export function sideHtml(b: Record<Bld, string[]>, ronin: boolean) {
  const ks = (Object.keys(POS) as (keyof typeof POS)[]).filter((k) => b[k].length);
  return `<h4 class="hr-sub">今月の用件</h4>${b.youken.length ? b.youken.join('') : '<p class="hr-none">差し迫った用件はない。町の建物を押して過ごし方を選ぶ。</p>'}
    <h4 class="hr-sub">町</h4><div class="hr-bldlist">${ks.map((k) => `<button class="hr-btn sm${hasMain(b[k]) ? ' primary' : ''}" data-h="bld" data-id="${k}">${esc(k === 'ie' ? ieName(ronin) : BLD_NAME[k])}</button>`).join('')}</div>
    <p class="hr-note" style="margin-top:12px"><button class="hr-btn ghost sm" data-h="machi" data-id="list">一覧で表示する</button></p>`;
}
export const MACHI_CSS = `
.hr-machi{position:absolute;inset:0;z-index:1;pointer-events:none}
.hr-machi.dim{opacity:.35}
.hr-bld{pointer-events:auto;position:absolute;transform:translate(-50%,-50%);min-width:88px;max-width:150px;padding:7px 10px;background:rgba(14,12,10,.82);border:1px solid rgba(207,169,94,.7);border-radius:4px;color:#f1e6cf;font:inherit;cursor:pointer;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,.45)}
.hr-bld b{display:block;font-family:var(--font-display,serif);font-weight:400;font-size:16px;letter-spacing:.08em}
.hr-bld span{display:block;font-size:10.5px;color:#b8ab92;margin-top:2px;white-space:nowrap}
.hr-bld:hover,.hr-bld:focus-visible{background:rgba(60,44,20,.92);border-color:#e8c070}
.hr-bld.mark::after{content:'';position:absolute;top:-5px;right:-5px;width:11px;height:11px;border-radius:50%;background:#e0b04a;box-shadow:0 0 6px #e0b04a}
.hr-say.machi{position:absolute;left:12px;right:12px;bottom:12px;margin:0;z-index:2}
.hr-bldlist{display:flex;flex-wrap:wrap;gap:6px}
@media (max-width:820px){.hr-bld{min-width:64px;padding:5px 6px}.hr-bld b{font-size:13px}.hr-bld span{display:none}}
`;

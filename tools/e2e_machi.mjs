// 城下の町（武将で遊ぶ）: 町の絵の上に建物の札が並び、押すとその建物でできることの窓が開く。窓から行動できる。一覧に戻せる
// 使い方: node tools/e2e_machi.mjs <保存JSON> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' console ' + m.text()); });
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); localStorage.setItem('sengoku-machi', 'machi'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
  for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]', '#hero [data-h="q-accept"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  const blds = await p.$$eval('#hero .hr-machi .hr-bldi', (es) => es.map((e) => e.dataset.id + (e.classList.contains('mark') ? '!' : '')));
  console.log(vp.tag, '建物', blds.join(' '));
  console.log(vp.tag, '用件', await p.$eval('#hero .hr-pane', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 160)));
  await p.screenshot({ path: `${out}/machi-${vp.tag}-0.png` });
  if (blds.length < 4) errors.push(vp.tag + ' 建物が少ない');
  for (const id of blds.map((x) => x.replace('!', ''))) {
    await p.click(`#hero .hr-machi .hr-bldi[data-id="${id}"]`); await p.waitForTimeout(120);
    const w = await p.$eval('#hero .hr-bldwin', (e) => ({ h: e.querySelector('h4')?.textContent, n: e.querySelectorAll('button:not(.hr-dclose)').length, t: e.textContent.replace(/\s+/g, ' ').slice(0, 120) })).catch(() => null);
    console.log(vp.tag, id, JSON.stringify(w));
    if (!w || !w.n) errors.push(`${vp.tag} ${id} の窓が空`);
    if (['shiro', 'dojo', 'ie'].includes(id)) await p.screenshot({ path: `${out}/machi-${vp.tag}-${id}.png` });
    await p.click('#hero .hr-bldwin [data-h="dlg-close"]'); await p.waitForTimeout(80);
  }
  // 道場（なければ市・茶屋）の窓で行動すると、結果が窓の中に出て、窓は開いたまま
  { const id = ['dojo', 'ichi', 'chaya'].find((k) => blds.some((x) => x.startsWith(k))), h = id === 'dojo' ? 'train' : 'spot';
    await p.click(`#hero .hr-machi .hr-bldi[data-id="${id}"]`); await p.waitForTimeout(100);
    const btn = await p.$(`#hero .hr-bldwin [data-h="${h}"]:not([disabled])`);
    if (btn) { await btn.click(); await p.waitForTimeout(500); for (const sel of ['#hero [data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(200); } }
      const w = await p.$eval('#hero .hr-bldwin', (e) => e.querySelector('.hr-bldres')?.textContent ?? '(結果なし)').catch(() => null);
      console.log(vp.tag, id, 'で行動:', w); await p.screenshot({ path: `${out}/machi-${vp.tag}-res.png` });
      if (w === null) console.log(vp.tag, '（窓が閉じた: 月をまたいだか）'); else if (w === '(結果なし)') errors.push(vp.tag + ' 結果が窓に出ない');
      const c = await p.$('#hero .hr-bldwin [data-h="dlg-close"]'); if (c) { await c.click(); await p.waitForTimeout(80); } } }
  // 自分の屋敷の窓から休む
  await p.click('#hero .hr-machi .hr-bldi[data-id="ie"]'); await p.waitForTimeout(100);
  const jun0 = await p.$eval('#hero .hr-date', (e) => e.textContent);
  await p.click('#hero .hr-bldwin [data-h="rest"]'); await p.waitForTimeout(600);
  for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(200); } }
  const jun1 = await p.$eval('#hero .hr-date', (e) => e.textContent);
  console.log(vp.tag, '休む', jun0, '→', jun1); if (jun0 === jun1) errors.push(vp.tag + ' 休めなかった');
  // 一覧に戻す・町に戻す
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(80);
  await p.click('#hero [data-h="machi"][data-id="list"]'); await p.waitForTimeout(100);
  const list = await p.$$eval('#hero .hr-pane .hr-spot', (es) => es.length), m0 = await p.$$eval('#hero .hr-machi', (es) => es.length);
  console.log(vp.tag, '一覧', list, '町', m0); if (!list || m0) errors.push(vp.tag + ' 一覧に戻らない');
  await p.click('#hero [data-h="machi"][data-id="machi"]'); await p.waitForTimeout(100);
  if (!(await p.$('#hero .hr-machi'))) errors.push(vp.tag + ' 町に戻らない');
  await p.close();
}
console.log('errors', errors);
await b.close();

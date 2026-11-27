// 武将で遊ぶの画面上部（大名プレイと同じ作り）: 札（内政・軍事・人事・外交・商い・記録）が身分と立場で使えるか、押すと欄か窓が開くか。使えない札は理由を出すか
// 使い方: node tools/e2e_herobar.mjs <保存JSON> <画像の出力先>
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
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); localStorage.setItem('sengoku-machi', 'machi'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
  for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  const cats = await p.$$eval('#hero .bar [data-h="cat"]', (es) => es.map((e) => ({ id: e.dataset.id, off: e.classList.contains('off'), why: e.title })));
  console.log(vp.tag, '札', cats.map((c) => `${c.id}${c.off ? '×' : '○'}`).join(' '));
  if (cats.length !== 6) errors.push(vp.tag + ' 札の数');
  await p.screenshot({ path: `${out}/herobar-${vp.tag}.png` });
  for (const c of cats) {
    await p.click(`#hero .bar [data-h="cat"][data-id="${c.id}"]`); await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ dlg: document.querySelector('#hero .hr-dlg h4')?.textContent ?? '', say: document.querySelector('#hero .hr-say')?.textContent.replace(/\s+/g, ' ').slice(0, 60) ?? '', pane: document.querySelector('#hero .hr-pane')?.textContent.replace(/\s+/g, ' ').slice(0, 50) ?? '' }));
    console.log(vp.tag, c.id, c.off ? `理由: ${r.say}` : `窓: ${r.dlg} | 欄: ${r.pane}`);
    if (c.off && !r.say.includes(c.why.slice(0, 6))) errors.push(`${vp.tag} ${c.id} 理由が出ない`);
    if (c.id === 'gunji' || c.id === 'jinji') { if (!c.off && !r.dlg) errors.push(`${vp.tag} ${c.id} の窓が出ない`); const x = await p.$('#hero .hr-dlg [data-h="dlg-close"]'); if (x) { await x.click(); await p.waitForTimeout(80); } }
    if (c.id === 'gunji' && !c.off && vp.tag === 'pc') await p.screenshot({ path: `${out}/herobar-gunji.png` });
  }
  const rest = await p.$eval('#hero .bar .seal-btn', (e) => e.textContent);
  const j0 = await p.$eval('#hero .hr-date', (e) => e.textContent);
  await p.click('#hero .bar .seal-btn'); await p.waitForTimeout(500);
  const j1 = await p.$eval('#hero .hr-date', (e) => e.textContent);
  console.log(vp.tag, rest, j0, '→', j1); if (j0 === j1) errors.push(vp.tag + ' 休む が効かない');
  await p.close();
}
console.log('errors', errors);
await b.close();

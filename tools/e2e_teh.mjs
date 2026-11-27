// 手ほどき（前田利家の物語）: 武将の画面に手ほどきの欄が出て、目標のある建物・札に印が付き、行いで目標が済み（印・ご褒美）、消す・出すができるか
// 使い方: node tools/e2e_teh.mjs <保存JSON（物語の中）> <画像の出力先>
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
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); localStorage.setItem('sengoku-machi', 'machi'); localStorage.removeItem('sengoku-teh'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
  for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  const teh = () => p.$eval('#hero .hr-teh', (e) => ({ head: e.querySelector('h4').textContent, items: [...e.querySelectorAll('li')].map((li) => li.querySelector('b').textContent), news: e.querySelector('.hr-tehnew')?.textContent ?? '' })).catch(() => null);
  const t0 = await teh();
  console.log(vp.tag, '手ほどき', JSON.stringify(t0));
  if (!t0) { errors.push(vp.tag + ' 手ほどきの欄が出ない'); await p.close(); continue; }
  const marks = await p.$$eval('#hero .hr-bldi.teh', (es) => es.map((e) => e.dataset.id));
  console.log(vp.tag, '印のある建物', marks.join(' '));
  if (!marks.length) errors.push(vp.tag + ' 建物に印がない');
  await p.screenshot({ path: `${out}/teh-${vp.tag}-0.png` });
  // 道場で稽古する
  await p.click('#hero .hr-bldi[data-id="dojo"]'); await p.waitForTimeout(120);
  await p.click('#hero .hr-bldwin [data-h="train"], #hero .hr-bldwin [data-h="spot"][data-id="dojo"]'); await p.waitForTimeout(500);
  const c = await p.$('#hero [data-h="dlg-close"]'); if (c) { await c.click(); await p.waitForTimeout(100); }
  const t1 = await teh();
  console.log(vp.tag, '稽古のあと', JSON.stringify(t1));
  if (!t1?.items.some((x) => x.startsWith('✓') && x.includes('稽古'))) errors.push(vp.tag + ' 稽古の目標が済まない');
  if (!t1?.news.includes('稽古')) errors.push(vp.tag + ' 済んだ知らせが出ない');
  await p.screenshot({ path: `${out}/teh-${vp.tag}-1.png` });
  // 消す・出す
  await p.click('#hero .hr-teh [data-h="teh-off"]'); await p.waitForTimeout(100);
  const off = await teh(), m0 = await p.$$eval('#hero .hr-bldi.teh', (es) => es.length);
  await p.click('#hero [data-h="teh-on"]'); await p.waitForTimeout(100);
  const on = await teh();
  console.log(vp.tag, '消す→', !!off, m0, '出す→', !!on);
  if (off || m0) errors.push(vp.tag + ' 消せない'); if (!on) errors.push(vp.tag + ' 出せない');
  await p.close();
}
console.log('errors', errors);
await b.close();

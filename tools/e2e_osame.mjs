// 領主（大名の画面）の城の治め: 内政の表の治安の欄に「見回り・締める・施す・火元」が出て、押すと治安が上がり、同じ城は月に一度か
// 使い方: node tools/e2e_osame.mjs <領主の保存JSON> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(800);
for (let k = 0; k < 4; k++) { const ok = await p.evaluate(() => { const x = document.querySelector('#modal:not([hidden]) [data-act="close"]'); if (x) { x.click(); return true; } return false; }); if (!ok) break; await p.waitForTimeout(150); }
await p.click('#btn-naisei'); await p.waitForTimeout(400);
const chian = () => p.$$eval('#modal .naisei-tbl tbody tr', (es) => es.map((e) => +e.children[3].firstChild.textContent));
const c0 = await chian();
const n = await p.$$eval('#modal [data-act="osame"]', (es) => es.length);
console.log('治安', c0.join(','), '| 治めの札', n);
if (!n) errors.push('治めの札が出ない');
await p.click('#modal [data-act="osame"][data-k="mimawari"]'); await p.waitForTimeout(300);
const c1 = await chian();
console.log('見回りのあと', c1.join(','), '|', await p.$eval('#toast', (e) => e.textContent).catch(() => ''));
if (!(c1[0] > c0[0])) errors.push('治安が上がらない');
const again = await p.$eval('#modal [data-act="osame"][data-k="shimeru"]', (e) => e.disabled + ' ' + e.title).catch(() => '');
console.log('同じ城で二度目', again);
if (!again.startsWith('true')) errors.push('月に一度になっていない');
await p.screenshot({ path: `${out}/osame.png` });
console.log('errors', errors);
await b.close();

// 自分の評定: 治める城の城下で「城の政」から評定を開き、家臣に役目を申し付け（押すたびに替わる）、月を送って首尾が月の報告に出ること
// 使い方: node tools/e2e_myhyojo.mjs <保存JSON（家臣のいる城持ちが自分の城の城下・上旬）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch(); const errors = [];
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', (e) => errors.push(e.message));
await p.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } }, json);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
await p.click('#hero [data-h="pane"][data-id="shiro"]'); await p.waitForTimeout(150);
await p.click('#hero [data-h="myhyo"]'); await p.waitForTimeout(200); console.log('hold:', await say());
await p.click('#hero [data-h="pane"][data-id="shiro"]').catch(() => {}); await p.waitForTimeout(100);
const ys = await p.$$('#hero [data-h="yaku"]'); console.log('retainers', ys.length);
for (let k = 0; k < 5; k++) { await p.click('#hero [data-h="yaku"] >> nth=0'); await p.waitForTimeout(60); } // 一人目に調略
if (ys.length > 1) await p.click('#hero [data-h="yaku"] >> nth=1'); // 二人目に開発
await p.waitForTimeout(100);
console.log('orders:', (await p.$$eval('#hero [data-h="yaku"] b', (es) => es.map((e) => e.textContent))).join(' | '));
await p.screenshot({ path: `${out}/my-1.png`, fullPage: true });
for (let k = 0; k < 4; k++) {
  const sc = await p.$('#hero [data-h="say-close"]'); if (sc) { await sc.click(); await p.waitForTimeout(100); }
  if (await p.$('#hero [data-h="report-ok"]')) break;
  await p.click('#hero [data-h="pane"][data-id="spots"]'); await p.click('#hero [data-h="rest"]');
  await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(200);
}
const sc = await p.$('#hero [data-h="say-close"]'); if (sc) { await sc.click(); await p.waitForTimeout(200); }
const rep = await p.$eval('#hero .hr-report', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'none');
const i = rep.indexOf('自分の評定の首尾');
console.log('report:', i >= 0 ? rep.slice(i, i + 260) : rep.slice(0, 200));
await p.screenshot({ path: `${out}/my-2.png` });
console.log('errors', errors); await b.close();

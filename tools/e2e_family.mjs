// 家族と跡継ぎ: 屋敷の家族の欄・隠居して「子が家を継いで続ける」・継いだ子で続けて休む
// 使い方: node tools/e2e_family.mjs <保存JSON（元服した男子のいる国持ち）> <画像の出力先>
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
await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(150);
console.log('family:', await p.$$eval('#hero .hr-pane .hr-note', (es) => es.map((e) => e.textContent).find((x) => x.includes('家族'))));
await p.screenshot({ path: `${out}/fa-1.png`, fullPage: true });
await p.click('#hero [data-h="pane"][data-id="spots"]'); await p.waitForTimeout(100);
await p.click('#hero [data-h="retire"]'); await p.waitForTimeout(100); await p.click('#hero [data-h="retire"]'); await p.waitForTimeout(300);
console.log('report:', (await p.$eval('#hero .hr-report', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'none')).slice(-160));
await p.screenshot({ path: `${out}/fa-2.png` });
const sc = await p.$('#hero [data-h="succeed"]'); if (sc) { await sc.click(); await p.waitForTimeout(300); }
console.log('after:', await p.$eval('#hero .hr-id', (e) => e.textContent), '|', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
await p.click('#hero [data-h="rest"]').catch((e) => errors.push('rest ' + e.message.slice(0, 60))); await p.waitForTimeout(500);
console.log('rest ok, jun:', await p.$eval('#hero .hr-head', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 60)));
console.log('errors', errors); await b.close();

// 陣中で病になったとき: 陣中で過ごすことと、陣を離れて近くの城へ下がることができる（手詰まりにならない）
// 使い方: node tools/e2e_sickcamp.mjs <保存JSON（陣にいて病の主人公）> <画像の出力先>
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
const text = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
console.log('camp:', (await p.$$eval('#hero .hr-pane .hr-spot b, #hero .hr-pane .hr-note', (es) => es.map((e) => e.textContent.slice(0, 30)))).join(' | '));
await p.screenshot({ path: `${out}/sc-1.png`, fullPage: true });
await p.click('#hero [data-h="campwait"]'); await p.waitForTimeout(200); console.log('campwait:', await text());
const c = await p.$('#hero [data-h="say-close"]'); if (c) await c.click();
await p.click('#hero [data-h="leavecamp"]'); await p.waitForTimeout(200); console.log('leave:', await text());
console.log('after:', await p.$eval('#hero .hr-town', (e) => e.textContent.replace(/\s+/g, ' ')), '| rest btn', !!(await p.$('#hero [data-h="rest"]')));
await p.click('#hero [data-h="rest"]'); await p.waitForTimeout(300); console.log('rest:', await text());
console.log('errors', errors); await b.close();

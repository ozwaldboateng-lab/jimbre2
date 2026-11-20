// 謀反の準備: 屋敷で「友」の家中の武将を内々に誘う・「主家との縁」に謀反の備え（味方の約束・密約）・自分の城で謀反を起こし、味方と密約の家が場面に出る
// 使い方: node tools/e2e_plot.mjs <保存JSON（味方の約束と密約のある、自分の城の城下）> <画像の出力先>
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
const say = () => p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(150);
console.log('rels', (await p.$$eval('#hero .hr-person', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 60)))).filter((x) => /友|懇意|知己|味方/.test(x)).join(' / '));
const pact = await p.$('#hero [data-h="pact"]:not([disabled])'); console.log('pact btn', !!pact);
if (pact) { await pact.click(); await p.waitForTimeout(200); console.log('pact:', (await say()).slice(0, 160)); await p.screenshot({ path: `${out}/pl-1-pact.png` }); const c = await p.$('#hero [data-h="say-close"]'); if (c) await c.click(); }
await p.click('#hero [data-h="pane"][data-id="spots"]'); await p.waitForTimeout(100);
await p.click('#hero [data-h="pane"][data-id="homen"]'); await p.waitForTimeout(150);
console.log('prep:', await p.$eval('#hero .hr-pane .hr-note', (e) => e.textContent).catch(() => 'none'));
await p.screenshot({ path: `${out}/pl-2-prep.png`, fullPage: true });
for (let k = 0; k < 3; k++) { await p.click('#hero [data-h="rebel"]'); await p.waitForTimeout(150); }
const sc = []; for (let n = 0; n < 40 && await p.$('#story:not([hidden]) .st-scene'); n++) { sc.push((await p.$eval('#story .st-scene', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 50)); const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(50); }
console.log('scenes:', sc.join(' / '));
console.log('errors', errors); await b.close();

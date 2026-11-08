// 険山: 地図の表示（山脈の峰・名・峠の札）、マスの説明、移動範囲に入らないこと
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
import { readFileSync } from 'node:fs';
const MAP = JSON.parse(readFileSync(new URL('../src/data/map.json', import.meta.url)));
const HIDA = MAP.hexes.findIndex((h) => h.x === MAP.ranges.findIndex((r) => r.name === '飛騨山脈'));
const FUJI = MAP.hexes.findIndex((h) => h.x === MAP.ranges.findIndex((r) => r.name === '富士山'));
const BLOCKED = MAP.hexes.flatMap((h, i) => (h.x !== undefined ? [i] : []));
const out = process.argv[2], mobile = process.argv[3] === 'mobile', sfx = mobile ? '-m' : '';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 820 }, deviceScaleFactor: 2 });
p.setDefaultTimeout(10000);
const errors = [];
p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="uesugi"]');
await p.click('[data-act="start"]'); await p.waitForTimeout(300);
for (let k = 0; k < 4; k++) if (await p.$('#modal:not([hidden])')) await p.click('#modal-close').catch(() => {});
await p.evaluate((h) => window.__sengoku.view.centerOn(h, 1.0), HIDA); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/63-chubu-far${sfx}.png` });
await p.evaluate((h) => window.__sengoku.view.centerOn(h, 2.0), HIDA); await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/63-chubu-near${sfx}.png` });
// 険山のマスを押す → 説明
const xy = await p.evaluate((h) => { const v = window.__sengoku.view; const [x, y] = window.__sengoku.center(h); const r = document.querySelector('canvas').getBoundingClientRect(); return [r.left + v.ox + x * v.scale, r.top + v.oy + y * v.scale]; }, HIDA);
await p.mouse.click(xy[0], xy[1]); await p.waitForTimeout(300);
const panel = await p.evaluate(() => document.body.innerText.match(/飛騨山脈[\s\S]{0,80}/)?.[0] ?? null);
await p.screenshot({ path: `${out}/63-panel${sfx}.png` });
// 移動範囲に険山が入らない
const st = await p.evaluate((B) => { const s = window.__sengoku.state; const blocked = new Set(B); return { onBlocked: Object.values(s.armies).filter((a) => blocked.has(a.hex)).length }; }, BLOCKED);
console.log(JSON.stringify({ panel, st, errors }));
await b.close();

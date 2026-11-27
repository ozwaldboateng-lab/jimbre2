// 融合の第四段: 国持ちの主人公が方面軍団長に任じられ、方面の方針・目標を決め、謀反を起こして大名プレイへ移る
// 使い方: node tools/e2e_homen.mjs <保存JSON> <画像の出力先>
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
  await p.addInitScript((j) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
  const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
  const idle = () => p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 });
  const scenes = [];
  const theater = async () => { let n = 0; while (await p.$('#story:not([hidden]) .st-scene') && n++ < 60) { const t = await p.$eval('#story .st-scene', (e) => e.textContent).catch(() => ''); scenes.push(t.slice(0, 30)); if (n === 2) await p.screenshot({ path: `${out}/hm-${vp.tag}-th${scenes.length}.png` }); const ask = await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(50); } };
  const ok = async () => { for (const sel of ['#hero [data-h="q-pick"]', '#hero [data-h="q-accept"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r = await p.$('#hero [data-h="report-ok"]'); if (r) { await r.click(); await p.waitForTimeout(80); } };
  for (let i = 0; i < 6 && !(await p.$('#hero [data-h="pane"][data-id="homen"].main')); i++) { await idle(); await theater(); await ok(); await p.waitForTimeout(150); await theater(); const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(200); } }
  await idle(); await theater(); await ok(); await p.waitForTimeout(150); await theater(); await ok();
  console.log(vp.tag, 'scenes', scenes.join(' / ').slice(0, 200));
  const hb = await p.$('#hero [data-h="pane"][data-id="homen"].main');
  console.log(vp.tag, 'homen btn', hb ? (await hb.textContent()).slice(0, 60) : 'NONE');
  if (!hb) { await p.close(); continue; }
  await hb.click(); await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/hm-${vp.tag}-1-pane.png`, fullPage: true });
  const pol = await p.$('#hero [data-h="hpol"][data-id="attack"]'); await pol.click(); await p.waitForTimeout(100); console.log(vp.tag, 'pol:', await say());
  const tg = await p.$('#hero [data-h="htgt"]'); if (tg) { await tg.click(); await p.waitForTimeout(100); console.log(vp.tag, 'tgt:', await say()); }
  for (let k = 0; k < 3; k++) { await p.click('#hero [data-h="rebel"]'); await p.waitForTimeout(150); if (k < 2) console.log(vp.tag, 'rebel', k, await say()); }
  scenes.length = 0; await theater();
  console.log(vp.tag, 'rebel scenes', scenes.join(' / ').slice(0, 200));
  await p.waitForTimeout(600);
  const st = await p.evaluate(() => ({ heroHidden: document.querySelector('#hero')?.hidden, player: window.__sengoku_bt?.s?.player }));
  console.log(vp.tag, 'after', JSON.stringify(st), (await p.$eval('body', (e) => e.innerText)).slice(0, 120).replace(/\n/g, ' '));
  await p.screenshot({ path: `${out}/hm-${vp.tag}-2-daimyo.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();

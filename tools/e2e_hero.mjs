// 武将で遊ぶ（試作）: 主人公を選び、登城・屋敷・旅・主命を数か月
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/title-${vp.tag}.png` });
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/pick-${vp.tag}.png` });
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200); await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/start-${vp.tag}.png` });
  // 物語の場面（出世の節目など）: 問いは最初の答え、あとは送る
  const theater = async () => { for (let n = 0; n < 60 && await p.$('#story:not([hidden]) .st-scene'); n++) { const nx = await p.$('#story [data-s="ask"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } };
  const click = async (sel) => { await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }); await theater(); for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r0 = await p.$('[data-h="report-ok"]'); if (r0) { await r0.click(); await p.waitForTimeout(150); } const e = await p.$(sel); if (e) { await e.click(); await p.waitForTimeout(250); const ok = await p.$('[data-h="report-ok"]'); if (ok) { if (vp.tag === 'pc') await p.screenshot({ path: `${out}/report-${vp.tag}.png` }); await ok.click(); await p.waitForTimeout(150); } return true; } return false; };
  await click('[data-h="spot"][data-id="tojo"]');
  await p.screenshot({ path: `${out}/tojo-${vp.tag}.png` });
  await click('[data-h="pane"][data-id="yashiki"]');
  await p.screenshot({ path: `${out}/yashiki-${vp.tag}.png` });
  await click('[data-h="meet"]'); await click('[data-h="visit"]');
  await p.screenshot({ path: `${out}/visit-${vp.tag}.png` });
  // 主命を果たしに行って帰る
  for (let i = 0; i < 24; i++) {
    const st = await p.evaluate(() => null);
    if (await click('[data-h="join"]')) { await p.screenshot({ path: `${out}/camp-${vp.tag}.png` }); continue; }
    if (await click('[data-h="campwait"]')) continue;
    if (await click('[data-h="goon"]')) continue;
    if (await click('[data-h="work"]')) continue;
    const q = await p.$('.hr-quest em');
    if (q) { if (!(await click('[data-h="spot"][data-id="tojo"]'))) { await click('[data-h="pane"][data-id="tabi"]'); await click('.hr-town-row:has(em:text("主君"))'); } continue; }
    await click('[data-h="pane"][data-id="tabi"]');
    if (!(await click('.hr-town-row:has(em:text("主命"))'))) await click('[data-h="spot"][data-id="tojo"]') || await click('[data-h="rest"]');
  }
  await p.screenshot({ path: `${out}/later-${vp.tag}.png` });
  await click('[data-h="pane"][data-id="tabi"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/map-${vp.tag}.png` });
  // 地図のマスを押して進む（画面の中ほど右寄り）
  const cv = await p.$('#hr-mapslot canvas'); if (cv) { const bb = await cv.boundingBox(); await p.mouse.click(bb.x + bb.width * 0.62, bb.y + bb.height * 0.45); await p.waitForTimeout(500); }
  await p.screenshot({ path: `${out}/moved-${vp.tag}.png` });
  await click('[data-h="pane"][data-id="diary"]');
  await p.screenshot({ path: `${out}/diary-${vp.tag}.png` });
  console.log(vp.tag, await p.evaluate(() => document.querySelector('.hr-date')?.textContent + ' | ' + document.querySelector('.hr-stats')?.textContent));
  await p.close();
}
console.log('errors', errors);
await b.close();

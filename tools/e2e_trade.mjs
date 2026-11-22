// 武将で遊ぶ: 商い（清洲で始め、特産のある稲葉山へ行って関の刀を仕入れ、清洲へ戻って売る）
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200); await p.click('[data-h="pick"][data-id="maeda_toshiie"]'); await p.waitForTimeout(300);
  const idle = () => p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 });
  const click = async (sel) => { await idle(); for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r0 = await p.$('[data-h="report-ok"]'); if (r0) { await r0.click(); await p.waitForTimeout(120); } const e = await p.$(sel); if (!e) return false; await e.click(); await p.waitForTimeout(200); return true; };
  const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
  const goTo = async (re) => {
    for (let i = 0; i < 20; i++) {
      await idle(); for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r0 = await p.$('[data-h="report-ok"]'); if (r0) { await r0.click(); await p.waitForTimeout(120); }
      const town = await p.$eval('#hero .hr-town b', (e) => e.textContent);
      if (re.test(town) && !/野/.test(town)) return true;
      await click('[data-h="pane"][data-id="tabi"]');
      if (await click('[data-h="goon"]')) continue;
      let hit = false;
      for (const r of await p.$$('#hero .hr-town-row')) { if (re.test(await r.textContent())) { await r.click(); await p.waitForTimeout(200); hit = true; break; } }
      if (!hit) { console.log(vp.tag, 'no route', re); return false; }
    }
    return false;
  };
  await goTo(/稲葉山/);
  await click('[data-h="pane"][data-id="spots"]');
  await click('[data-h="pane"][data-id="akinai"]');
  await p.screenshot({ path: `${out}/trade-buy-${vp.tag}.png` });
  await click('[data-h="buy"][data-id="999"]');
  console.log(vp.tag, 'buy:', await say());
  await goTo(/清洲/);
  await click('[data-h="pane"][data-id="spots"]');
  await click('[data-h="pane"][data-id="akinai"]');
  await p.screenshot({ path: `${out}/trade-sell-${vp.tag}.png` });
  if (!(await click('[data-h="sell"]'))) console.log(vp.tag, 'nothing to sell');
  console.log(vp.tag, 'sell:', await say());
  await p.close();
}
console.log('errors', errors);
await b.close();

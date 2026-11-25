// 檄と連合の画面確認
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
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 大名の場面（家中の揉め事など）は e2e_daimyo_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html');
  await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = window.__sengoku.state; s.clans.oda.prestige = 70; s.clans.oda.gold = 20000; });
  await p.click('#btn-gaiko'); await p.waitForTimeout(150);
  await p.click('[data-act="dip-open"][data-id="imagawa"]'); await p.waitForTimeout(150);
  await p.evaluate(() => document.querySelector('[data-act="geki-issue"]')?.scrollIntoView());
  await p.screenshot({ path: `${out}/geki-card-${vp.tag}.png` });
  // 必ず応じるように親密度を上げてから出す
  await p.evaluate(() => { const s = window.__sengoku.state; for (const c of Object.keys(s.clans)) { const k = c < 'oda' ? `${c}|oda` : `oda|${c}`; (s.amity ??= {})[k] = 100; } });
  await p.click('[data-act="geki-issue"]'); await p.waitForTimeout(300);
  const co = await p.evaluate(() => JSON.stringify(window.__sengoku.state.coalitions));
  console.log(vp.tag, 'coalitions', co);
  await p.click('[data-act="stab"][data-id="rengo"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/geki-rengo-${vp.tag}.png` });
  // AIから檄が届く
  await p.evaluate(() => { document.querySelector('.modal-close, [data-act="modal-close"]')?.click(); });
  await p.keyboard.press('Escape');
  await p.evaluate(() => { const s = window.__sengoku.state; s.clans.saito.prestige = 80; s.clans.saito.gold = 9000; window.__p = window.__sengoku.geki('saito', 'asakura') ?? window.__sengoku.geki('takeda', 'uesugi'); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/geki-ask-${vp.tag}.png` });
  const asked = await p.$('[data-act="ask-yes"]');
  console.log(vp.tag, 'asked', !!asked);
  if (asked) { await asked.click(); await p.waitForTimeout(200); }
  console.log(vp.tag, 'after', await p.evaluate(async () => JSON.stringify(await window.__p)));
  await p.close();
}
console.log('errors', errors);
await b.close();

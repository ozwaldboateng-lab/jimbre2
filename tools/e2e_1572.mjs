// 元亀三年（信長包囲網）のシナリオ: 始まり・連合の画面・数か月進める
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errors = [];
for (const [vp, clan] of [[{ width: 1360, height: 820, tag: 'pc' }, 'ashikaga'], [{ width: 390, height: 844, tag: 'sp' }, 'oda']]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html');
  await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/1572-era-${vp.tag}.png` });
  await p.click('[data-act="pick-scen"][data-id="1572"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/1572-clans-${vp.tag}.png` });
  await p.click(`[data-act="pick-clan"][data-id="${clan}"]`); await p.waitForTimeout(150);
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/1572-start-${vp.tag}.png` });
  await p.click('#btn-gaiko'); await p.waitForTimeout(150);
  await p.click('[data-act="stab"][data-id="rengo"]'); await p.waitForTimeout(150);
  await p.screenshot({ path: `${out}/1572-rengo-${vp.tag}.png`, fullPage: false });
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => document.querySelectorAll('[data-act="ask-no"],[data-act="ask-yes"]').forEach((x) => x.click()));
    const btn = await p.$('#btn-end'); if (btn) { await btn.click().catch(() => {}); }
    await p.waitForTimeout(2500);
    for (let k = 0; k < 20; k++) { const c = await p.$('#modal:not([hidden]) [data-act="close"], #modal:not([hidden]) .modal-close'); if (!c) break; await c.click().catch(() => {}); await p.waitForTimeout(150); }
  }
  console.log(vp.tag, await p.evaluate(() => { const s = window.__sengoku.state; return `${s.year}.${s.month} alive ${Object.values(s.clans).filter((c) => c.alive).length} coal ${(s.coalitions ?? []).map((k) => k.leader + '>' + k.target + ':' + k.members.length).join(' ')}`; }));
  await p.screenshot({ path: `${out}/1572-later-${vp.tag}.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();

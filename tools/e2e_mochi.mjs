// 持ち場（足軽大将）: 率いない合戦の月の終わりに、寄親が持ち場を言い渡す。ほかの持ち場を一度だけ願い出られる。盤の見出しに持ち場
// 使い方: node tools/e2e_mochi.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  await p.evaluate(() => { const s = window.__hero; s.generals[s.hero.id].rank = 2; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: false, foe: f.id, foeName: '今川家', lead: false }; });
  const closeAll = async () => { for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } } };
  for (let i = 0; i < 12 && !(await p.$('[data-h="ban-go"]')); i++) { await closeAll(); if (await p.$('[data-h="ban-go"]')) break; const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(400); } await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {}); }
  console.log(vp.tag, '言い渡し:', (await p.$eval('#hero .hr-text', (e) => e.textContent)).match(/持ち場は.*$/)?.[0]);
  console.log(vp.tag, '持ち場の行:', await p.$eval('#hero .hr-mochi', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'なし'));
  await p.screenshot({ path: `${out}/mochi-offer-${vp.tag}.png` });
  const ask = await p.$('#hero [data-h="ban-mochi"]');
  if (ask) { const id = await ask.getAttribute('data-id'); await ask.click(); await p.waitForTimeout(200); console.log(vp.tag, '願い出:', id, '→', (await p.$eval('#hero .hr-text', (e) => e.textContent)).match(/（持ち場の願い: .*?）$/)?.[0], '| もう押せない', await p.$eval('#hero [data-h="ban-mochi"]', (e) => e.disabled).catch(() => 'なし')); }
  await p.click('[data-h="ban-go"]'); await p.waitForTimeout(500);
  console.log(vp.tag, '盤の見出し:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.screenshot({ path: `${out}/mochi-ban-${vp.tag}.png` });
  await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
  await p.click('#ban [data-b="close"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '結果:', (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 160));
  await p.close();
}
console.log('errors', errors); await b.close();

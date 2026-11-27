// 領主の第五段: 私事（月に2度まで）。領主（柴田勝家）は訪ねる・進物など、大名（織田家）は家臣を訪ねる・書状
// 使い方: node tools/e2e_watakushi.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
const body = (p) => p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '));
const hdr = (p) => p.$eval('#btn-wk', (e) => e.textContent);
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  // 領主
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 大名の場面（家中の揉め事など）は e2e_daimyo_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  console.log(vp.tag, '領主 見出し:', await hdr(p));
  await p.click('#btn-wk'); await p.waitForTimeout(300);
  console.log(vp.tag, '領主 窓:', (await body(p)).slice(0, 260));
  await p.screenshot({ path: `${out}/wk-ryo-${vp.tag}.png` });
  const vs = await p.$$('[data-act="wk-ryo"][data-id^="visit:"]');
  console.log(vp.tag, '訪ねられる人', vs.length);
  for (let k = 0; k < 3; k++) {
    const v = (await p.$$('[data-act="wk-ryo"][data-id^="visit:"]'))[k]; if (!v) break;
    console.log(vp.tag, k, '押せる', !(await v.isDisabled()));
    if (await v.isDisabled()) break;
    await v.click(); await p.waitForTimeout(250);
    console.log(vp.tag, k, '→', (await p.$eval('.wk-say', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 120), '| 見出し', await hdr(p));
  }
  await p.screenshot({ path: `${out}/wk-ryo2-${vp.tag}.png` });
  // 大名
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 大名の場面（家中の揉め事など）は e2e_daimyo_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.evaluate(() => { try { localStorage.clear(); } catch {} });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 大名の場面（家中の揉め事など）は e2e_daimyo_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  for (let k = 0; k < 4; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click(); await p.waitForTimeout(150); } }
  console.log(vp.tag, '大名 見出し:', await hdr(p));
  await p.click('#btn-wk'); await p.waitForTimeout(300);
  console.log(vp.tag, '大名 窓:', (await body(p)).slice(0, 300));
  await p.screenshot({ path: `${out}/wk-dai-${vp.tag}.png` });
  const id = await p.$eval('[data-act="wk-dvisit"]', (e) => e.getAttribute('data-id'));
  const on0 = await p.evaluate((id) => window.__sengoku.state.generals[id].on, id);
  await p.click(`[data-act="wk-dvisit"][data-id="${id}"]`); await p.waitForTimeout(250);
  console.log(vp.tag, '訪ねる:', await p.$eval('.wk-say', (e) => e.textContent.replace(/\s+/g, ' ')), '恩', on0, '→', await p.evaluate((id) => window.__sengoku.state.generals[id].on, id));
  const lt = await p.$('[data-act="wk-letter"]');
  if (lt) { await lt.click(); await p.waitForTimeout(250); console.log(vp.tag, '書状:', await p.$eval('.wk-say', (e) => e.textContent.replace(/\s+/g, ' '))); }
  console.log(vp.tag, '三度目は押せない:', await p.$eval('[data-act="wk-dvisit"]', (e) => e.disabled), '| 見出し', await hdr(p));
  await p.close();
}
console.log('errors', errors); await b.close();

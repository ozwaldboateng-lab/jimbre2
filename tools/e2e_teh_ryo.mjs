// 手ほどき（第四部）: 章の始まりの一言・名声、城の窓の「領主として治める」から大名の画面へ入り、ひと月で城下へ戻り、目標が済むか
// 使い方: node tools/e2e_teh_ryo.mjs <第四部の保存JSON（賤ヶ岳のあと）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, S] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const json = readFileSync(save, 'utf8');
await p.addInitScript((j) => { localStorage.setItem('sengoku-kake', 'on'); localStorage.setItem('sengoku-machi', 'machi'); localStorage.removeItem('sengoku-teh'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } }, json);
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
const theater = async () => { const seen = []; for (let n = 0; n < 60; n++) { const on = await p.evaluate(() => { const r = document.getElementById('story'); return !!r && !r.hidden && !!r.querySelector('.st-scene'); }); if (!on) break; seen.push(await p.evaluate(() => (document.querySelector('#story .hr-town b')?.textContent ?? '') + '｜' + (document.querySelector('#story .hr-say, #story .st-fx')?.textContent.replace(/\s+/g, ' ').slice(0, 50) ?? ''))); const x = await p.$('#story [data-s="ask"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!x) break; await x.click(); await p.waitForTimeout(80); } return seen; };
const close = async () => { for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]', '#hero [data-h="scene-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(150); } } };
// 休んで物語を進める（場面と章の一言を見る）
for (let k = 0; k < 6; k++) { await close(); const sc = await theater(); if (sc.length) console.log('場面', sc.slice(0, 3).join(' / ')); await close(); if (await p.$('#hero .hr-bldi[data-id="shiro"]')) break; await p.click('#hero .bar .seal-btn').catch(() => {}); await p.waitForTimeout(800); }
const teh = await p.$eval('#hero .hr-teh h4', (e) => e.textContent).catch(() => 'なし');
console.log('手ほどき', teh, '| 名声', await p.$eval('#hero .bar .stats', (e) => e.textContent.replace(/\s+/g, ' ')));
await p.click('#hero .hr-bldi[data-id="shiro"]'); await p.waitForTimeout(200);
const rb = await p.$('#hero .hr-bldwin [data-h="ryo-back"]');
console.log('領主として治める', !!rb);
if (rb) {
  await rb.click(); await p.waitForTimeout(1200);
  const inDaimyo = await p.evaluate(() => !document.getElementById('btn-end')?.closest('[hidden]') && document.getElementById('hero')?.hidden);
  console.log('大名の画面', inDaimyo, await p.$eval('#stats', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 100)).catch(() => ''));
  await p.screenshot({ path: `${S}/s4-ryo.png` });
  await p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
  await p.click('#btn-end').catch((e) => console.log('end', e.message.slice(0, 80)));
  for (let k = 0; k < 120; k++) { await p.waitForTimeout(300); if (!(await p.$eval('#battle', (e) => e.hidden).catch(() => true))) { await p.click('#bt-auto').catch(() => {}); await p.waitForTimeout(800); await p.click('[data-bact="leave"]').catch(() => {}); } if (await p.evaluate(() => !document.getElementById('hero')?.hidden)) break; if (await p.$('#story:not([hidden]) .st-scene')) await theater(); }
  console.log('戻った', await p.evaluate(() => !document.getElementById('hero')?.hidden), await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 120)).catch(() => ''));
  await close(); await theater();
  console.log('済んだ手ほどき', await p.$$eval('#hero .hr-teh li.done', (es) => es.map((e) => e.textContent.trim()).join(' / ')).catch(() => ''));
  await p.screenshot({ path: `${S}/s4-back.png` });
}
if (!(await p.$$eval('#hero .hr-teh li.done', (es) => es.some((e) => e.textContent.includes('領主'))).catch(() => false))) errs.push('領主の手ほどきが済まない');
console.log('errors', errs);
await b.close();

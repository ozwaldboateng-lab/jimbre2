// 武将で遊ぶ（物語の外）: 出世の階段。侍大将・功績190・覚え66の保存から、家を立てる → 城を預かる → 家中の進言（家老・家臣）→ 治めの投資
// 使い方: node tools/e2e_career.mjs <保存JSON> <画像の出力先>
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
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
  const idle = () => p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 });
  let shot = 0; const snap = async (n) => { shot++; await p.screenshot({ path: `${out}/cr-${vp.tag}-${String(shot).padStart(2, '0')}-${n}.png` }); };
  const goal = async () => p.$eval('#hero .hr-quest', (e) => e.textContent).catch(() => '');
  console.log(vp.tag, 'goal0', (await goal()).slice(0, 80));
  await snap('start');
  const theaterThrough = async (tag) => { let n = 0; const seen = []; while (await p.$('#story:not([hidden]) .st-scene') && n++ < 80) { const t = await p.$eval('#story .st-scene', (e) => e.textContent).catch(() => ''); if (n === 2) { seen.push(t.slice(0, 40)); await snap(tag); } const ask = await p.$$('#story [data-s="ask"]'); if (ask.length) { await ask[0].click(); await p.waitForTimeout(40); continue; } const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(40); } return seen; };
  const ok = async () => { if (await p.$('#story:not([hidden]) .st-scene')) return; for (const sel of ['#hero [data-h="q-accept"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r = await p.$('#hero [data-h="report-ok"]'); if (r) { await r.click(); await p.waitForTimeout(80); } };
  const steps = [];
  for (let i = 0; i < 12; i++) {
    await idle();
    if (await p.$('#story:not([hidden]) .st-scene')) { steps.push(...await theaterThrough('step')); continue; }
    await ok(); await p.waitForTimeout(150);
    if (await p.$('#story:not([hidden]) .st-scene')) continue;
    const say = await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
    if (/預かった/.test(say)) break;
    const rest = await p.$('#hero [data-h="rest"]'); if (rest) { await rest.click(); await p.waitForTimeout(150); }
  }
  console.log(vp.tag, 'steps', steps.join(' / '));
  await idle(); await ok();
  console.log(vp.tag, 'goal1', (await goal()).slice(0, 80), '|', await p.$eval('#hero .hr-id', (e) => e.textContent));
  // 預かった城へ行く
  for (let i = 0; i < 20 && !(await p.$('#hero [data-h="pane"][data-id="shiro"]')); i++) {
    await idle(); await ok();
    await p.click('#hero [data-h="pane"][data-id="tabi"]'); await p.waitForTimeout(80);
    if (await p.$('#hero [data-h="goon"]')) { await p.click('#hero [data-h="goon"]'); await p.waitForTimeout(150); continue; }
    const rows = await p.$$('#hero .hr-town-row'); let hit = false;
    const title = await p.$eval('#hero .hr-id span', (e) => e.textContent);
    for (const r of rows) { const t = await r.textContent(); if (title.includes(t.slice(0, 3))) { await r.click(); await p.waitForTimeout(150); hit = true; break; } }
    if (!hit) break;
    await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(80);
  }
  await idle(); await ok();
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(80);
  await p.click('#hero [data-h="pane"][data-id="shiro"]').catch(() => {}); await p.waitForTimeout(100);
  console.log(vp.tag, 'tiles', (await p.$$eval('#hero .hr-ctiles > div', (es) => es.map((e) => e.textContent))).join(' | '));
  console.log(vp.tag, 'cact', (await p.$$eval('#hero [data-h="cact"]', (es) => es.map((e) => e.textContent.slice(0, 18) + (e.disabled ? '×' : '')))).join(' | '));
  const ia = await p.$('#hero [data-h="cact"][data-id="inv-agri"]:not([disabled])'); if (ia) { await ia.click(); await p.waitForTimeout(150); console.log(vp.tag, 'inv-agri:', await p.$eval('#hero .hr-text', (e) => e.textContent)); }
  await snap('shiro');
  const govs = await p.$$eval('#hero [data-h="gov"]', (es) => es.map((e) => e.textContent.slice(0, 14) + (e.disabled ? '×' : '')));
  console.log(vp.tag, 'gov', govs.join(' | '));
  await snap('gov');
  const k = await p.$('#hero [data-h="gov"][data-id="kaikon"]:not([disabled])'); if (k) { await k.click(); await p.waitForTimeout(150); console.log(vp.tag, 'kaikon:', await p.$eval('#hero .hr-text', (e) => e.textContent)); }
  // 家臣団（kashin-check）: 与力が家臣に加わったか、屋敷に家臣の一覧、城代のボタン
  await idle(); await ok();
  const dk = await p.$$eval('#hero [data-h="daikan"] b', (es) => es.map((e) => e.textContent)); console.log(vp.tag, 'daikan', dk.join(' | '));
  const d1 = await p.$('#hero [data-h="daikan"]'); if (d1) { await d1.click(); await p.waitForTimeout(100); console.log(vp.tag, 'daikan set:', await p.$eval('#hero .hr-text', (e) => e.textContent)); }
  await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(100);
  console.log(vp.tag, 'kashin', (await p.$$eval('#hero .hr-pane .hr-note', (es) => es.map((e) => e.textContent))).join(' / ').slice(0, 160));
  await snap('kashin');
  await p.click('#hero [data-h="pane"][data-id="spots"]'); await p.waitForTimeout(80);
  // 家中の進言（家老・家臣の言葉か）
  await idle(); await ok();
  const adv = await p.$('#hero [data-h="advice"]');
  if (adv) { await adv.click(); await p.waitForTimeout(150); const names = []; for (let n = 0; n < 20 && await p.$('#story:not([hidden]) .st-scene'); n++) { const w = await p.$$eval('#story .hr-who b', (es) => es.map((e) => e.textContent)); names.push(...w); const t = await p.$eval('#story .st-scene', (e) => e.textContent); if (/荒子|奥村|村井|前田/.test(t)) names.push('!!' + t.slice(0, 30)); if (n === 1) await snap('advice'); const ask = await p.$('#story [data-s="ask"]'); if (ask) { await ask.click(); await p.waitForTimeout(40); continue; } const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(40); } console.log(vp.tag, 'advice who', [...new Set(names)].join(',')); }
  await p.close();
}
console.log('errors', errors);
await b.close();

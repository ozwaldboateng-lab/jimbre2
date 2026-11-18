// 武将で遊ぶ（物語の外）: 浪人の遊び。国衆の城下で、浪人の行い（用心棒・牢人衆・浪人を誘う・探る）を試し、夜討ちで旗揚げして大名プレイへ移る
// 使い方: node tools/e2e_ronin.mjs <保存JSON> <画像の出力先>
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
  const ok = async () => { if (await p.$('#story:not([hidden]) .st-scene')) return; const r = await p.$('#hero [data-h="report-ok"]'); if (r) { await r.click(); await p.waitForTimeout(80); } };
  const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
  await p.screenshot({ path: `${out}/rn-${vp.tag}-1-spots.png` });
  console.log(vp.tag, 'spots', (await p.$$eval('#hero .hr-pane .hr-spot b', (es) => es.map((e) => e.textContent))).join(' | '));
  for (const h of ['yojinbo', 'hire', 'scout']) { await idle(); await ok(); const e = await p.$(`#hero [data-h="${h}"]`); if (e) { await e.click(); await p.waitForTimeout(150); console.log(vp.tag, h, ':', (await say()).slice(0, 70)); } }
  await idle(); await ok();
  await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/rn-${vp.tag}-2-yashiki.png` });
  const inv = await p.$('#hero [data-h="invite"]:not([disabled])'); if (inv) { await inv.click(); await p.waitForTimeout(150); console.log(vp.tag, 'invite:', (await say()).slice(0, 70)); }
  await idle(); await ok();
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(100);
  // 旗揚げ（夜討ち）を、成るまで
  let risen = false;
  for (let i = 0; i < 12 && !risen; i++) {
    await idle(); await ok();
    if (await p.$('#story:not([hidden]) .st-scene')) {
      await p.screenshot({ path: `${out}/rn-${vp.tag}-3-rise.png` });
      for (let n = 0; n < 30 && await p.$('#story:not([hidden]) .st-scene'); n++) { const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); }
      risen = true; break;
    }
    const r = await p.$('#hero [data-h="rise"][data-id="youchi"]:not([disabled])');
    if (!r) { console.log(vp.tag, 'no rise button', (await p.$$eval('#hero .hr-pane .hr-spot', (es) => es.map((e) => e.textContent.slice(0, 40)))).join(' | ')); break; }
    await r.click(); await p.waitForTimeout(200); console.log(vp.tag, 'rise:', (await say()).slice(0, 60));
  }
  await p.waitForTimeout(800);
  const chip = await p.$eval('.clan-chip', (e) => e.textContent).catch(() => 'no main game');
  const heroHidden = await p.$eval('#hero', (e) => e.hidden).catch(() => 'none');
  console.log(vp.tag, 'daimyo:', chip, 'heroHidden', heroHidden, await p.$eval('#date', (e) => e.textContent).catch(() => ''));
  await p.screenshot({ path: `${out}/rn-${vp.tag}-4-daimyo.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();

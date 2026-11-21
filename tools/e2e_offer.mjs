// 主命を断る・セリフの窓を閉じてから月の報告: 新しく始め、登城して主命を申し付けられ（承る／断る）、断る。屋敷を訪ねて月をまたぎ、セリフの窓を閉じるまで月の報告が出ないこと
// 使い方: node tools/e2e_offer.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(300);
  const say = () => p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
  const has = async (sel) => !!(await p.$(sel));
  await p.click('#hero [data-h="spot"][data-id="tojo"]'); await p.waitForTimeout(200);
  console.log(vp.tag, 'hyojo cands', (await p.$$('#hero [data-h="q-pick"]')).length, await has('#hero [data-h="q-decline"]'), '|', (await say()).slice(0, 220));
  await p.screenshot({ path: `${out}/of-${vp.tag}-1-offer.png` });
  await p.click('#hero [data-h="q-decline"]'); await p.waitForTimeout(150);
  console.log(vp.tag, 'decline |', (await say()).slice(0, 120), '| quest', await p.$eval('#hero .hr-quest:nth-of-type(2)', (e) => e.textContent).catch(() => '?'));
  await p.screenshot({ path: `${out}/of-${vp.tag}-2-decline.png` });
  await p.click('#hero [data-h="say-close"]'); await p.waitForTimeout(100);
  await p.click('#hero [data-h="spot"][data-id="tojo"]'); await p.waitForTimeout(150);
  console.log(vp.tag, 'tojo again |', (await say()).slice(0, 80));
  // 月をまたぐまで屋敷を訪ねる
  await p.click('#hero [data-h="say-close"]').catch(() => {}); await p.waitForTimeout(80);
  for (let i = 0; i < 4; i++) {
    await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 });
    if (await has('#hero [data-h="say-close"]')) { const rep = await has('#hero [data-h="report-ok"]'); console.log(vp.tag, 'held say; report visible?', rep); if (!rep && i > 0) { await p.screenshot({ path: `${out}/of-${vp.tag}-3-held.png` }); } await p.click('#hero [data-h="say-close"]'); await p.waitForTimeout(150); if (await has('#hero [data-h="report-ok"]')) { console.log(vp.tag, 'report after close'); await p.screenshot({ path: `${out}/of-${vp.tag}-4-report.png` }); break; } }
    await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(80);
    const mt = await p.$('#hero [data-h="meet"]'); if (mt) { await mt.click(); await p.waitForTimeout(80); }
    const v = await p.$('#hero [data-h="visit"]'); if (!v) { console.log('no visit'); break; }
    await v.click(); await p.waitForTimeout(200);
  }
  await p.close();
}
console.log('errors', errors);
await b.close();

// 前田利家 ― 残り火: 序幕から第一幕・無断参戦・帰参、武将で遊ぶへの引き継ぎまで通す
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
  await p.click('[data-act="t-story"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/st-title-${vp.tag}.png` });
  await p.click('[data-s="new"]'); await p.waitForTimeout(200);
  let shot = 0;
  const snap = async (n) => { if (shot < 40) { shot++; await p.screenshot({ path: `${out}/st-${vp.tag}-${String(shot).padStart(2, '0')}-${n}.png` }); } };
  await snap('prologue');
  // 序幕を数枚見てから飛ばす
  for (let i = 0; i < 4; i++) { const fx = await p.$('#story .st-fx'); if (fx) { await snap('fx'); await fx.click(); } else await p.click('#story button[data-s="next"]'); await p.waitForTimeout(400); }
  await snap('prologue4');
  await p.click('[data-s="skip"]'); await p.waitForTimeout(100);
  const plan = ['sakaya', 'yashiki:koshin_t', 'go:atsuta', 'yojinbo', 'minato', 'go:kiyosu', 'tsuji', 'kiyosu_sakaya', 'go:arako', 'yashiki:matsu_t', 'suburi', 'sakaya', 'go:fukushima', 'mihari', 'mihari', 'go:arako', 'yashiki:matsu_t'];
  let k = 0;
  for (let it = 0; it < 500; it++) {
    const has = async (sel) => !!(await p.$(sel));
    if (await has('#story [data-s="tohero"]')) { await snap('done'); const t0 = Date.now(); await p.click('#story [data-s="tohero"]'); await p.waitForSelector('#hero .hr-date', { timeout: 180000 }); console.log(vp.tag, 'tohero ms', Date.now() - t0); break; }
    if (await has('#story .st-fx')) { const k2 = await p.$eval('#story .st-fx', (e) => e.className); if (shot < 34) await snap(k2.replace(/\s+/g, '-')); await p.click('#story .st-fx'); await p.waitForTimeout(60); continue; }
    if (await has('#story .hr-say [data-s="next"]')) { const txt = await p.$eval('#story .hr-say', (e) => e.textContent); if (/桶狭間|森部|帰参|第一幕　了|父の死|浪人の槍|利益/.test(txt) && shot < 30) await snap('scene'); await p.click('#story .hr-say button[data-s="next"]'); await p.waitForTimeout(40); continue; }
    if (await has('#story [data-s="choose"]')) { await snap('choice'); await p.click('#story [data-s="choose"]'); await p.waitForTimeout(60); continue; }
    if (await has('#story [data-s="bchoose"]')) { await snap('battle'); const bs = await p.$$('#story [data-s="bchoose"]'); await bs[bs.length > 2 ? 1 : 0].click(); await p.waitForTimeout(60); continue; }
    const step = plan[k % plan.length]; k++;
    const pl = k > plan.length ? (['go:kiyosu', 'tsuji', 'kiyosu_sakaya', 'go:arako', 'wait', 'yashiki:matsu_t'][k % 6]) : step;
    if (pl.startsWith('go:')) { await p.click('#story [data-s="pane"][data-id="tabi"]'); await p.waitForTimeout(40); const r = await p.$(`#story [data-s="go"][data-id="${pl.slice(3)}"]`); if (r) await r.click(); await p.waitForTimeout(40); continue; }
    if (pl.startsWith('yashiki:')) { await p.click('#story [data-s="pane"][data-id="yashiki"]'); await p.waitForTimeout(40); const r = await p.$(`#story [data-s="act"][data-id="${pl.slice(8)}"]`); if (r) await r.click(); await p.waitForTimeout(40); continue; }
    await p.click('#story [data-s="pane"][data-id="acts"]'); await p.waitForTimeout(30);
    const r = await p.$(`#story [data-s="act"][data-id="${pl}"]`) ?? await p.$('#story [data-s="act"][data-id="rest"]');
    if (r) await r.click(); await p.waitForTimeout(40);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/st-${vp.tag}-hero.png` });
  console.log(vp.tag, await p.evaluate(() => (document.querySelector('#hero .hr-date')?.textContent ?? 'no-hero') + ' | ' + (document.querySelector('#hero .hr-text')?.textContent ?? '')));
  await p.close();
}
console.log('errors', errors);
await b.close();

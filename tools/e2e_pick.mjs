// 主人公を選ぶ: 年代 → 家（または浪人） → 武将。いくつかの年代・家・浪人で始め、ひと月送って止まらないこと
// 使い方: node tools/e2e_pick.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
const cases = [['1560', 'takeda', 'pc'], ['1582', null, 'sp'], ['1560', 'ronin', 'sp'], ['1600', null, 'pc'], ['1536', null, 'pc']];
for (const [scen, clan, tag] of cases) {
  const vp = tag === 'pc' ? { width: 1360, height: 820 } : { width: 390, height: 844 };
  const p = await b.newPage({ viewport: vp });
  p.on('pageerror', (e) => errors.push(`${scen}/${clan} ` + e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  if (scen === '1560' && clan === 'takeda') { console.log('eras:', (await p.$$eval('#hero [data-h="pscen"] b', (es) => es.map((e) => e.textContent))).join(' | ')); await p.screenshot({ path: `${out}/pk-0-eras.png` }); }
  await p.click(`#hero [data-h="pscen"][data-id="${scen}"]`); await p.waitForTimeout(600);
  const clans = await p.$$eval('#hero [data-h="pclan"]', (es) => es.map((e) => e.dataset.id + ':' + e.querySelector('b').textContent));
  console.log(scen, 'clans', clans.length, clans.slice(0, 6).join(' '));
  if (scen === '1560' && clan === 'takeda') await p.screenshot({ path: `${out}/pk-1-clans.png` });
  const cid = clan ?? clans[1].split(':')[0]; // 指定がなければ二番目に大きい家
  await p.click(`#hero [data-h="pclan"][data-id="${cid}"]`); await p.waitForTimeout(200);
  const cards = await p.$$eval('#hero [data-h="pick"]', (es) => es.map((e) => e.dataset.id + ':' + e.querySelector('b').textContent));
  console.log(scen, cid, 'cards', cards.length, cards.slice(0, 5).join(' '));
  if (scen === '1560' && clan === 'takeda') await p.screenshot({ path: `${out}/pk-2-cards.png` });
  await p.click(`#hero [data-h="pick"] >> nth=${Math.min(2, cards.length - 1)}`); await p.waitForTimeout(400);
  console.log(scen, cid, 'start:', (await p.$eval('#hero .hr-id', (e) => e.textContent)), '|', (await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 90));
  for (let i = 0; i < 4; i++) {
    for (const sel of ['#hero [data-h="say-close"]', '#hero [data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(80); } }
    for (let n = 0; n < 30 && await p.$('#story:not([hidden]) .st-scene'); n++) { const nx = await p.$('#story [data-s="ask"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(40); }
    const r = await p.$('#hero [data-h="rest"]'); if (!r) break;
    await r.click(); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(150);
  }
  console.log(scen, cid, 'after month:', await p.$eval('#hero .hr-head', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 60)));
  await p.screenshot({ path: `${out}/pk-${scen}-${cid}.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

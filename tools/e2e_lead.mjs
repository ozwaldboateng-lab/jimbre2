// 融合の第三段: 宿老の主人公が攻略の総大将として軍勢を率い、攻略の城へ進んで攻め、月の終わりの合戦を合戦の画面で采配する（自ら采配）
// 使い方: node tools/e2e_lead.mjs <保存JSON> <画像の出力先>
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
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-herobattle', 'ask'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
  const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
  const ok = async () => { for (const sel of ['#hero [data-h="q-pick"]', '#hero [data-h="q-accept"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } const r = await p.$('#hero [data-h="report-ok"]'); if (r) { await r.click(); await p.waitForTimeout(80); } };
  await p.click('#hero [data-h="lead"]'); await p.waitForTimeout(200);
  console.log(vp.tag, 'lead:', (await say()).slice(0, 80));
  await p.screenshot({ path: `${out}/ld-${vp.tag}-1-lead.png` });
  let battleSeen = false, mine = 0, allies = 0;
  const theater = async () => { let n = 0; while (await p.$('#story:not([hidden]) .st-scene') && n++ < 60) { const ask = await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(50); } };
  for (let i = 0; i < 12 && !battleSeen; i++) {
    await theater(); await ok();
    if (!(await p.$eval('#battle', (e) => e.hidden).catch(() => true))) { battleSeen = true; break; }
    const adv = await p.$('#hero [data-h="advance"]');
    if (adv) { const tx = await adv.textContent(); await adv.click(); await p.waitForTimeout(200); console.log(vp.tag, 'advance:', tx.slice(0, 20), '|', (await say()).slice(0, 60)); if (/攻める/.test(tx)) { await p.screenshot({ path: `${out}/ld-${vp.tag}-2-order.png` }); } continue; }
    const r = await p.$('#hero [data-h="rest"]');
    if (r) { await r.click(); for (let k = 0; k < 120; k++) { await p.waitForTimeout(500); if (!(await p.$eval('#battle', (e) => e.hidden).catch(() => true))) { battleSeen = true; break; } if (!(await p.$('#hero .hr-busy'))) break; } }
    else { console.log(vp.tag, 'no rest/advance', (await p.$$eval('#hero .hr-pane .hr-spot b', (es) => es.map((e) => e.textContent))).join('|')); break; }
  }
  if (battleSeen) {
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/ld-${vp.tag}-3-battle.png` });
    const info = await p.evaluate(() => { const v = window.__sengoku_bt; const t = v?.t; return t ? { units: t.units.length, side: t.playerSide, mine: t.units.filter((u) => u.side === t.playerSide && (u.general === v.s.hero?.id || u.army === v.s.hero?.leads)).length, allies: t.units.filter((u) => u.side === t.playerSide).length } : null; });
    console.log(vp.tag, 'battle open', JSON.stringify(info), await p.$eval('#bt-sub', (e) => e.textContent).catch(() => ''));
    // 任せて終わらせる
    const auto = await p.$('#bt-auto'); if (auto) { await auto.click(); }
    for (let k = 0; k < 240; k++) { await p.waitForTimeout(500); const done = await p.$('#battle [data-act="bt-close"], #bt-result button, #battle .bt-result button'); if (done) { await done.click().catch(() => {}); await p.waitForTimeout(300); } if (await p.$eval('#battle', (e) => e.hidden).catch(() => true)) break; }
    await p.waitForTimeout(800); await theater(); await ok(); await theater();
    console.log(vp.tag, 'after battle:', (await say()).slice(0, 80), '| hidden', await p.$eval('#battle', (e) => e.hidden).catch(() => '?'));
  } else console.log(vp.tag, 'no battle');
  await p.screenshot({ path: `${out}/ld-${vp.tag}-4-after.png` });
  await p.close();
}
console.log('errors', errors, mineCount());
function mineCount() { return ''; }
await b.close();

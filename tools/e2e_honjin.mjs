// 本陣の盤: 総大将として率いる合戦で、敵の部隊が本陣の隣に来ると（合戦に一度）槍働きの盤に切り替わり、自ら戦う。勝てばその部隊は兵と士気を失う
// 使い方: node tools/e2e_honjin.mjs <保存JSON（e2e_lead と同じ）> <画像の出力先>
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
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
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
    // 敵の部隊を本陣の隣に置いて、手番を終える
    const put = await p.evaluate(() => { const v = window.__sengoku_bt, t = v.t, x = window.__sengoku_bt2; const hq = x.hqOf(t, t.playerSide); const foe = t.units.find((u) => u.side !== t.playerSide && !u.out && !u.routed); if (!hq || !foe) return null; const nb = x.tNeighbors(t, hq.tile).find((i) => !t.units.some((u) => !u.out && u.tile === i)); if (nb === undefined) return null; foe.tile = nb; foe.hidden = false; v.redraw?.(); return { hq: hq.name, foe: foe.name, troops: foe.troops, morale: foe.morale }; });
    console.log(vp.tag, '本陣の隣に:', JSON.stringify(put));
    await p.click('#bt-end'); await p.waitForTimeout(800);
    for (let k = 0; k < 40 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(300);
    const banOpen = !!(await p.$('#ban:not([hidden])'));
    console.log(vp.tag, '本陣の盤:', banOpen, banOpen ? await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')) : '');
    if (banOpen) {
      await p.screenshot({ path: `${out}/honjin-${vp.tag}.png` });
      await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
      console.log(vp.tag, '盤の終わり:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
      await p.click('#ban [data-b="close"]'); await p.waitForTimeout(600);
      const after = await p.evaluate((name) => { const t = window.__sengoku_bt.t; const u = t.units.find((x) => x.name === name); const hq = window.__sengoku_bt2.hqOf(t, t.playerSide); return { troops: u?.troops, morale: u?.morale, hqMorale: hq?.morale }; }, put?.foe);
      console.log(vp.tag, 'のち:', JSON.stringify(after));
    }
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

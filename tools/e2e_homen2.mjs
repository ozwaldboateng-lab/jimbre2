// 方面軍団長（領主）: 主家の欄に方面の目標と与力（親しさ・謀反でついて来るか）。月のはじめに「兵を回せ」の窓（兵を回す・渋る）
// 使い方: node tools/e2e_homen2.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const [vp, act] of [[{ width: 1360, height: 820, tag: 'pc' }, 'rv-hei-ok'], [{ width: 390, height: 844, tag: 'sp' }, 'rv-hei-no']]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 方面の場面は e2e_homen_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  // 方面軍団長にして、与力二人（一人は親しい）と目標を持たせる
  await p.evaluate(() => {
    const s = window.__sengoku.state, H = s.hero; H.career.steps.push('homen');
    const ys = Object.values(s.generals).filter((g) => g.clan === 'oda' && g.id !== H.id && g.id !== s.clans.oda.leader && g.rank >= 1 && ['free', 'governor'].includes(g.status)).slice(0, 2);
    ys.forEach((g, i) => { g.yoriki = H.id; H.rel[g.id] = i === 0 ? 70 : 10; });
    const foe = s.castles.filter((c) => c.owner && c.owner !== 'oda').slice(0, 2);
    H.homenGoal = { castles: foe.map((c) => c.i), until: s.turn + 36, clan: foe[0].owner };
  });
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
  console.log(vp.tag, '主家の欄:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '))).match(/方面の目標.*?主家の構え/)?.[0]);
  await p.screenshot({ path: `${out}/homen2-${vp.tag}.png` });
  await p.click('#modal-close').catch(() => {});
  await p.evaluate(() => { window.__sengoku.state.hero.shinEv = { kind: 'hei', turn: 0, need: 600 }; });
  await p.click('#btn-end'); await p.waitForTimeout(400);
  await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  for (let k = 0; k < 8; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (!x) break; await x.click(); await p.waitForTimeout(200); }
  console.log(vp.tag, '窓:', await p.$eval('#modal-title', (e) => e.textContent).catch(() => ''), '|', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 140));
  const before = await p.evaluate(() => window.__sengoku.state.hero.favor);
  await p.click(`#modal-body [data-act="${act}"]`); await p.waitForTimeout(400);
  console.log(vp.tag, act, ':', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 120), '| 覚え', before, '→', await p.evaluate(() => window.__sengoku.state.hero.favor));
  await p.close();
}
console.log('errors', errors); await b.close();

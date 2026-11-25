// 小競り合いの主命（足軽大将）: 主命を果たすを押すと槍働きの盤（物見・夜討ち・砦の守り）。終えると主命が果たせたか、果たせなければまた挑める
// 使い方: node tools/e2e_zeriai.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const [vp, sub] of [[{ width: 1360, height: 820, tag: 'pc' }, 'scout'], [{ width: 390, height: 844, tag: 'sp' }, 'youchi'], [{ width: 390, height: 844, tag: 'sp2' }, 'toride']]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 演出は e2e_ashigaru で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  // 足軽大将にして、いまいる城下で小競り合いの主命を受けたことにする
  await p.evaluate((sub) => { const s = window.__hero; s.generals[s.hero.id].rank = 2; s.hero.quest = { kind: 'zeriai', castle: s.hero.town, need: 1, done: 0, until: s.turn + 3, sub, target: 'imagawa' }; s.hero.jun = 0; }, sub);
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(200);
  console.log(vp.tag, sub, '主命:', await p.$eval('#hero .hr-quest:has(b:text("主命"))', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''));
  await p.click('#hero [data-h="work"]'); await p.waitForTimeout(500);
  console.log(vp.tag, '盤:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.screenshot({ path: `${out}/zer-${sub}-${vp.tag}.png` });
  await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '終わり:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.click('#ban [data-b="close"]'); await p.waitForTimeout(600);
  await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {});
  console.log(vp.tag, '結果:', (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 160), '| 主命', JSON.stringify(await p.evaluate(() => { const q = window.__hero.hero.quest; return q && { done: q.done, ok: q.ok }; })), '| 旬', await p.evaluate(() => window.__hero.hero.jun));
  await p.close();
}
console.log('errors', errors); await b.close();

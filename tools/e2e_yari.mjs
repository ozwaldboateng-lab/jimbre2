// 槍働きと論功行賞: 主人公の軍勢が戦った月の終わりに槍働きが月の報告に出て、一騎討ちを挑まれたら受けて立つ（場面と首尾）、続けて登城すると論功行賞
// 使い方: node tools/e2e_yari.mjs <保存JSON（hero.battle に今月の合戦を入れ、主君の城下・下旬）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const base = JSON.parse(readFileSync(save, 'utf8'));
const b = await chromium.launch(); const errors = [];
let done = false;
for (let k = 0; k < 8 && !done; k++) {
  const st = { ...base, seed: base.seed + k * 7919 };
  const json = JSON.stringify(st);
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
  await p.click('#hero [data-h="rest"]'); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  const say = () => p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '');
  const duel = await p.$('#hero [data-h="duel-yes"]');
  console.log(k, 'duel offered', !!duel, '| report visible', !!(await p.$('#hero [data-h="report-ok"]')));
  if (!duel) { await p.close(); continue; }
  done = true;
  console.log('challenge:', (await say()).slice(0, 140));
  await p.screenshot({ path: `${out}/yr-1-duel.png` });
  await duel.click(); await p.waitForTimeout(200);
  const sc = []; for (let n = 0; n < 20 && await p.$('#story:not([hidden]) .st-scene'); n++) { sc.push((await p.$eval('#story .st-scene', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 40)); const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(50); }
  console.log('scenes:', sc.join(' / '));
  console.log('result:', (await say()).slice(0, 140));
  await p.click('#hero [data-h="say-close"]'); await p.waitForTimeout(150);
  const rep = await p.$eval('#hero .hr-report', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'none');
  console.log('report has 槍働き:', /合戦|首級/.test(rep), rep.slice(0, 120));
  await p.click('#hero [data-h="report-ok"]').catch(() => {}); await p.waitForTimeout(150);
  for (let n = 0; n < 30 && await p.$('#story:not([hidden]) .st-scene'); n++) { const nx = await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(50); }
  await p.click('#hero [data-h="report-ok"]').catch(() => {}); await p.waitForTimeout(150);
  await p.click('#hero [data-h="spot"][data-id="tojo"]'); await p.waitForTimeout(200);
  console.log('tojo:', (await say()).slice(0, 160));
  await p.screenshot({ path: `${out}/yr-2-reward.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

// 陣中の体力と離脱: 陣中で過ごすと体力が戻る（+15）。疲れ果てていれば（体力30以下）敵が近くても陣を離れて近くの城へ下がれる。元気なのに敵を前に離れると、覚え−8・名声−1
// 使い方: node tools/e2e_camprest.mjs <保存JSON（陣中の主人公。e2e_sickcamp と同じ）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const base = JSON.parse(readFileSync(save, 'utf8'));
const b = await chromium.launch(); const errors = [];
for (const [tag, hp] of [['tired', 20], ['fresh', 80]]) {
  const st = JSON.parse(JSON.stringify(base));
  st.generals[st.hero.id].sick = 0; st.hero.hp = hp; st.hero.jun = 0;
  // 敵の軍勢を、陣のすぐ隣に置く
  const army = st.armies[st.hero.army];
  const foe = Object.values(st.armies).find((a) => a.clan !== army.clan);
  if (foe) foe.hex = army.hex + 1;
  const json = JSON.stringify(st);
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => errors.push(tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(tag + ' ' + m.text()); });
  await p.addInitScript((j) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(400);
  for (const sel of ['[data-h="say-close"]', '[data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  const spots = await p.$$eval('#hero .hr-spot', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ')));
  console.log(tag, '陣中:', spots.filter((t) => /陣中で過ごす|陣を離れる/.test(t)).join(' ／ '));
  if (tag === 'fresh') {
  await p.click('#hero [data-h="campwait"]'); await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {});
  console.log(tag, '過ごした:', (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 80), '| 体力', await p.evaluate(() => window.__hero.hero.hp));
  }
  for (const sel of ['[data-h="say-close"]', '[data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  const f0 = await p.evaluate(() => window.__hero.hero.favor);
  await p.click('#hero [data-h="leavecamp"]'); await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {});
  console.log(tag, '離れた:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''), '| 陣', await p.evaluate(() => window.__hero.hero.army), '| 覚え', f0, '→', await p.evaluate(() => window.__hero.hero.favor));
  await p.screenshot({ path: `${out}/camprest-${tag}.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

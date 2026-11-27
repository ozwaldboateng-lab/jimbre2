// タイトル: 続きから（保存がなければ出ない・一つならそのまま・二つ以上なら選ぶ画面）、大名として遊ぶ・武将として遊ぶ・物語・遊び方の並び、武将の時代選びから物語へ
// 使い方: node tools/e2e_title.mjs <武将の保存JSON> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch();
const errors = [];
const page = async (init) => { const p = await b.newPage({ viewport: { width: 1360, height: 820 } }); p.on('pageerror', (e) => errors.push(e.message)); await p.addInitScript(init, json); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500); return p; };
const items = (p) => p.$$eval('#title .ttl-item', (es) => es.map((e) => e.querySelector('b').textContent.trim()));
// 1. 保存なし
{ const p = await page(() => { localStorage.clear(); });
  const it = await items(p); console.log('保存なし', it.join(' / '));
  if (it[0] !== '大名として遊ぶ' || !it.some((x) => x.startsWith('武将として遊ぶ')) || it.some((x) => x.includes('試作')) || it.some((x) => x === '続きから')) errors.push('保存なしの並び');
  await p.screenshot({ path: `${out}/title-0.png` });
  // 武将の時代選びから物語へ
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  const g = await p.$('#hero [data-h="tostory"]'); console.log('物語への案内', !!g); if (!g) errors.push('物語への案内がない');
  if (g) { await g.click(); await p.waitForTimeout(300); console.log('物語の入口', await p.$eval('#story h2', (e) => e.textContent).catch(() => 'なし')); }
  await p.close(); }
// 2. 武将の保存だけ → そのまま続きから
{ const p = await page((j) => { if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('s', '1'); } });
  const it = await items(p), lab = await p.$eval('#title .ttl-item.cont span', (e) => e.textContent).catch(() => ''); console.log('武将の保存', it[0], '|', lab);
  if (it[0] !== '続きから' || !lab.startsWith('武将')) errors.push('続きからが出ない');
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(800);
  const town = await p.$eval('#hero .hr-date', (e) => e.textContent).catch(() => null); console.log('続きから →', town); if (!town) errors.push('武将の続きが開かない');
  // 大名も保存して、タイトルへ戻る → 二つ
  await p.evaluate(() => { localStorage.setItem('sengoku-last', 'hero'); });
  await p.close(); }
// 3. 武将と物語の保存 → 選ぶ画面（最後に遊んだものが先）
{ const p = await page((j) => { if (!sessionStorage.getItem('s')) { localStorage.clear(); localStorage.setItem('sengoku-hero-auto', j); localStorage.setItem('sengoku-story-toshiie', JSON.stringify({ id: 'toshiie', year: 1559, month: 8, jun: 0, place: 'arako', gold: 30, fame: 20, sense: 10, bra: 80, rel: {}, flags: {}, idx: {}, diary: [], seed: 1 })); localStorage.setItem('sengoku-last', 'story'); sessionStorage.setItem('s', '1'); } });
  const lab = await p.$eval('#title .ttl-item.cont span', (e) => e.textContent).catch(() => ''); console.log('二つの保存', lab);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(300);
  const cs = await p.$$eval('#title [data-act="cont-pick"]', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim())); console.log('選ぶ画面', cs.join(' / '));
  if (cs.length !== 2 || !cs[0].includes('物語')) errors.push('選ぶ画面の並び');
  await p.screenshot({ path: `${out}/title-cont.png` });
  await p.click('#title [data-act="cont-pick"]'); await p.waitForTimeout(500);
  const ok = await p.evaluate(() => !document.getElementById('story')?.hidden && !!document.querySelector('#story .bar'));
  console.log('物語の続き', ok); if (!ok) errors.push('物語の続きが開かない');
  await p.close(); }
console.log('errors', errors);
await b.close();

// 城下の町: 掛け合い・セリフの付いた知らせ（用心棒など）が町の絵の下に隠れず、見えるか（浪人の保存で）
// 使い方: node tools/e2e_machi_say.mjs <保存JSON（浪人）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: vp });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  await p.addInitScript((j) => { localStorage.setItem('sengoku-kake', 'on'); localStorage.setItem('sengoku-machi', 'machi'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
  for (const sel of ['#hero [data-h="report-ok"]', '#hero [data-h="say-close"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  await p.click('#hero .hr-bldi[data-id="kaido"]'); await p.waitForTimeout(150);
  await p.click('#hero .hr-bldwin [data-h="yojinbo"]'); await p.waitForTimeout(600);
  const r = await p.evaluate(() => { const e = document.querySelector('#hero .hr-say'); if (!e) return 'say なし'; const b = e.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + 10); return { text: e.textContent.replace(/\s+/g, ' ').slice(0, 80), visible: e.contains(top), rect: [b.left, b.top, b.width, b.height].map(Math.round), on: top?.className }; });
  console.log(vp.tag, JSON.stringify(r)); if (!r.visible) errors.push(vp.tag + ' 知らせが町の下に隠れている');
  await p.screenshot({ path: `${out}/yj-${vp.tag}.png` });
  await p.close();
}
console.log('errors', errors);
await b.close();

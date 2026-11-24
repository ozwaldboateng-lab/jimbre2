// 金を与える: 人事 › 恩賞の一覧（300貫）と、武将の詳しい欄（100・300・1,000貫）。同じ者には月に一度
// 使い方: node tools/e2e_gold.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  for (let k = 0; k < 4; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click(); await p.waitForTimeout(150); } }
  const st = () => p.evaluate(() => { const s = window.__sengoku.state; return { gold: s.clans.oda.gold, shibata: s.generals.shibata_katsuie.on, maeda: s.generals.maeda_toshiie.on }; });
  console.log(vp.tag, 'はじめ', JSON.stringify(await st()));
  await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="rewards"]'); await p.waitForTimeout(200);
  const n = (await p.$$('[data-act="rw-gold"]')).length; console.log(vp.tag, '恩賞の一覧の金のボタン', n);
  await p.screenshot({ path: `${out}/gold-list-${vp.tag}.png` });
  const b1 = await p.$('[data-act="rw-gold"][data-id="maeda_toshiie:300"]');
  if (b1) { await b1.click(); await p.waitForTimeout(200); console.log(vp.tag, '前田に300貫', JSON.stringify(await st())); }
  await p.click('#modal-close').catch(() => {});
  await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(200);
  await p.click('[data-act="gen"][data-id="shibata_katsuie"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '詳しい欄:', await p.$eval('#modal-body', (e) => (e.textContent.match(/金を与える.*?薄い）/) ?? [''])[0].replace(/\s+/g, ' ')));
  await p.click('[data-act="rw-gold"][data-id="shibata_katsuie:1000"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '柴田に1000貫', JSON.stringify(await st()));
  console.log(vp.tag, '二度目は押せない', await p.$eval('[data-act="rw-gold"][data-id="shibata_katsuie:100"]', (e) => [e.disabled, e.title].join(' ')).catch((e) => 'なし ' + e.message.slice(0, 60)));
  await p.screenshot({ path: `${out}/gold-gen-${vp.tag}.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

// 領主の画面: 柴田勝家（宿老＝始めから城持ち）で始めると大名の画面に移り、頭の欄が領（領の蔵・覚え）、外交・商いは出ない。
// 自分の領の城では内政ができ（費えは領の蔵）、主家の城ではできない。評定終了で月が進む
// 使い方: node tools/e2e_ryoshu.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  const heroHidden = await p.evaluate(() => document.querySelector('#hero')?.hidden);
  const stats = await p.$eval('#stats', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'none');
  const gaiko = await p.evaluate(() => document.getElementById('btn-gaiko')?.hidden);
  console.log(vp.tag, 'hero hidden', heroHidden, '| gaiko hidden', gaiko, '| stats:', stats);
  await p.screenshot({ path: `${out}/ry-${vp.tag}-1.png` });
  // 自分の領の城（鳴海城）と主家の城（清洲城）で内政
  const castleIdx = await p.evaluate(() => { const v = window.__sengoku ?? null; return null; });
  void castleIdx;
  await p.click('#btn-naisei'); await p.waitForTimeout(300);
  const rows = await p.$$eval('#modal-body [data-act="inv-agri"]', (es) => es.map((e) => e.dataset.id + (e.disabled ? 'x' : '')));
  console.log(vp.tag, 'naisei inv-agri buttons', rows.join(','));
  const tabs = await p.$$eval('#modal-body [data-act="stab"]', (es) => es.map((e) => e.textContent));
  console.log(vp.tag, 'naisei tabs', tabs.join('|'));
  for (const id of rows.map((r) => r.replace('x', ''))) { await p.click(`#modal-body [data-act="inv-agri"][data-id="${id}"]`, { force: true }).catch(() => {}); await p.waitForTimeout(150); console.log(vp.tag, 'inv', id, ':', await p.$eval('#toast', (e) => e.textContent).catch(() => '')); }
  await p.screenshot({ path: `${out}/ry-${vp.tag}-2-naisei.png` });
  await p.click('#modal-close').catch(() => {}); await p.waitForTimeout(150);
  console.log(vp.tag, 'stats after:', await p.$eval('#stats', (e) => e.textContent.replace(/\s+/g, ' ')));
  // 評定終了
  await p.click('#btn-end'); await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 });
  await p.waitForTimeout(500);
  for (let k = 0; k < 6; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c) { await c.click().catch(() => {}); await p.waitForTimeout(150); } }
  console.log(vp.tag, 'after month:', await p.$eval('#date', (e) => e.textContent), '|', await p.$eval('#stats', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.screenshot({ path: `${out}/ry-${vp.tag}-3-month.png` });
  // 城下へ出る → 武将の画面 → 領へ戻る
  await p.click('#btn-jokaku'); await p.waitForTimeout(300);
  console.log(vp.tag, 'jokaku: hero shown', !(await p.evaluate(() => document.querySelector('#hero')?.hidden)), '|', await p.$eval('#hero .hr-town', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''), '| back btn', !!(await p.$('#hero [data-h="ryo-back"]')));
  await p.screenshot({ path: `${out}/ry-${vp.tag}-4-jokaku.png` });
  await p.click('#hero [data-h="ryo-back"]'); await p.waitForTimeout(400);
  console.log(vp.tag, 'back: hero hidden', await p.evaluate(() => document.querySelector('#hero')?.hidden), '|', await p.$eval('#stats', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 40)));
  await p.close();
}
console.log('errors', errors); await b.close();

// 領主の第二段: 「主家」の欄（主君・構え・攻めてよい家・上納・軍役）、陣立てで主人公自身を大将に部隊を立てる、月を送っても主家のAIに使われない
// 使い方: node tools/e2e_ryoshu2.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
const st = () => p.evaluate(() => { const s = window.__sengoku.state; const h = s.generals[s.hero.id]; const a = Object.values(s.armies).concat(Object.values(s.camps ?? {})).find((x) => x.main === h.id); return { status: h.status, army: a ? { troops: a.troops, front: a.front, camp: a.camp !== undefined, hex: a.hex } : null, fief: (s.fronts ?? []).find((f) => f.manual)?.id, gov: s.castles[s.hero.fuchu]?.governor }; });
await p.click('#btn-shuke'); await p.waitForTimeout(300);
console.log('主家:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 260));
await p.screenshot({ path: `${out}/r2-1-shuke.png` });
await p.click('#modal-close'); await p.waitForTimeout(150);
await p.click('#btn-gunji'); await p.waitForTimeout(300);
const mains = await p.$$eval('#jin-main option', (es) => es.map((e) => e.textContent.slice(0, 16))).catch(() => []);
console.log('大将の候補:', mains.join(' | '));
if (mains.length) {
  await p.selectOption('#jin-main', { index: 0 });
  const tro = await p.$$eval('#jin-troops option', (es) => es.map((e) => e.value)); if (tro.length) await p.selectOption('#jin-troops', tro[0]);
  const btn = await p.$('#modal-body [data-act="jin-form-hurry"]') ?? await p.$('#modal-body [data-act="jin-form"]');
  if (btn) { await btn.click({ force: true }); await p.waitForTimeout(300); console.log('編成:', await p.$eval('#toast', (e) => e.textContent)); }
}
await p.screenshot({ path: `${out}/r2-2-jin.png` });
console.log('主人公:', JSON.stringify(await st()));
await p.click('#modal-close').catch(() => {}); await p.waitForTimeout(150);
await p.click('#btn-end'); await p.waitForTimeout(500);
await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(500);
for (let k = 0; k < 6; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c) { await c.click().catch(() => {}); await p.waitForTimeout(150); } }
console.log('一月後:', JSON.stringify(await st()), await p.$eval('#date', (e) => e.textContent));
console.log('errors', errors); await b.close();

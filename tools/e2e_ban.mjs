// 槍働きの盤（第一段）: 道場の「盤で稽古する（試し）」から盤を開き、駒を選んで動かし・攻め、手番を終え、オートで終えて閉じる
// 使い方: node tools/e2e_ban.mjs <画像の出力先>
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
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  console.log(vp.tag, '城下:', await p.$eval('#hero .hr-town', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''));
  await p.click('#hero [data-h="spot"][data-id="dojo"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="ban-keiko"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/ban-0-${vp.tag}.png` });
  const head = () => p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' '));
  console.log(vp.tag, '盤:', await head());
  // 主人公（騎）を選んで、いちばん前の青いマスへ
  await p.click('#ban .hero'); await p.waitForTimeout(100);
  const reach = await p.$$eval('#ban .bc.reach', (es) => es.map((e) => [+e.dataset.x, +e.dataset.y]));
  console.log(vp.tag, '騎の動ける先', reach.length);
  const front = reach.sort((a, c) => a[1] - c[1])[0];
  await p.click(`#ban .bc[data-x="${front[0]}"][data-y="${front[1]}"]`); await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/ban-1-${vp.tag}.png` });
  const tg = await p.$('#ban .bc.tgt'); if (tg) { await tg.click(); await p.waitForTimeout(100); console.log(vp.tag, '攻めた:', await p.$eval('#ban .ban-last', (e) => e.textContent)); } else { await p.click('#ban [data-b="wait"]'); }
  // 手番を進めながら、虚報が使えれば使う。局面の知らせを拾う
  let shotKyo = false;
  for (let k = 0; k < 8; k++) {
    if (await p.$('#ban .ban-over')) break;
    await p.click('#ban .hero').catch(() => {}); await p.waitForTimeout(80);
    const kb = await p.$('#ban [data-b="kyoho"]:not([disabled])');
    if (kb) {
      await kb.click(); await p.waitForTimeout(80);
      if (!shotKyo) { await p.screenshot({ path: `${out}/ban-kyo-${vp.tag}.png` }); shotKyo = true; console.log(vp.tag, '虚報の的:', await p.$eval('#ban .ban-kyo', (e) => e.textContent)); }
      await p.click('#ban .bc.kyo'); await p.waitForTimeout(80);
      console.log(vp.tag, '虚報:', await p.$eval('#ban .ban-last', (e) => e.textContent));
    }
    await p.click('#ban [data-b="end"]'); await p.waitForTimeout(150);
    await p.waitForFunction(() => !document.querySelector('#ban [data-b="end"][disabled]'), null, { timeout: 20000 }).catch(() => {});
    const last = await p.$eval('#ban .ban-last', (e) => e.textContent).catch(() => '');
    console.log(vp.tag, (await head()).replace(/.*盤の稽古/, ''), '|', last.slice(0, 70));
    if (/中盤:|終盤:/.test(last)) await p.screenshot({ path: `${out}/ban-ev${k}-${vp.tag}.png` });
  }
  await p.screenshot({ path: `${out}/ban-2-${vp.tag}.png` });
  if (!(await p.$('#ban .ban-over'))) { await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); }
  console.log(vp.tag, 'オート:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.screenshot({ path: `${out}/ban-3-${vp.tag}.png` });
  await p.click('#ban [data-b="close"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '閉じた:', await p.$eval('#ban', (e) => e.hidden), '|', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  await p.close();
}
console.log('errors', errors); await b.close();

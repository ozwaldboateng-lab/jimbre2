// 領主の第四段: 主家の欄の「主家との縁」。寝返りを持ちかける（二度押し）・謀反（二度押しで大名プレイへ）・出奔
// 使い方: node tools/e2e_neko.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
const start = async (p) => {
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
};
const body = (p) => p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '));
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  await start(p);
  console.log(vp.tag, '縁:', (await body(p)).match(/寝返りを持ちかける.*?出奔する[^）]*）/)?.[0]);
  await p.$eval('[data-act="ryo-ne"]', (e) => e.scrollIntoView()); await p.screenshot({ path: `${out}/ne-${vp.tag}.png` });
  for (let k = 0; k < 6; k++) {
    const bt = (await p.$$('[data-act="ryo-ne"]'))[k]; if (!bt) break;
    const id = await bt.getAttribute('data-id');
    await bt.click(); await p.waitForTimeout(150);
    console.log(vp.tag, '一度目:', await p.$eval(`[data-act="ryo-ne"][data-id="${id}"]`, (e) => e.textContent));
    await p.click(`[data-act="ryo-ne"][data-id="${id}"]`); await p.waitForTimeout(300);
    const pl = await p.evaluate(() => window.__sengoku.state.player);
    console.log(vp.tag, id, '→', pl);
    if (pl !== 'oda') break;
    if (!(await p.$('#modal:not([hidden]) [data-act="ryo-ne"]'))) { await p.click('#btn-shuke'); await p.waitForTimeout(300); }
  }
  console.log(vp.tag, '寝返り後:', await p.evaluate(() => { const s = window.__sengoku.state; return [s.player, s.hero.mode, s.generals[s.hero.id].clan].join(' '); }));
  await start(p);
  const rb = await p.$('[data-act="ryo-rebel"]'); console.log(vp.tag, '謀反ボタン:', await rb.textContent(), await rb.isDisabled());
  if (!(await rb.isDisabled())) { await rb.click(); await p.waitForTimeout(150); await p.click('[data-act="ryo-rebel"]'); await p.waitForTimeout(600); console.log(vp.tag, '謀反後:', (await body(p)).slice(0, 120), await p.evaluate(() => [window.__sengoku.state.player, !!window.__sengoku.state.hero].join(' '))); }
  await start(p);
  await p.click('[data-act="ryo-leave"]'); await p.waitForTimeout(150); await p.click('[data-act="ryo-leave"]'); await p.waitForTimeout(800);
  console.log(vp.tag, '出奔後:', await p.evaluate(() => [window.__sengoku.state.hero?.mode, window.__sengoku.state.generals[window.__sengoku.state.hero.id].status].join(' ')), await p.evaluate(() => document.body.textContent.replace(/\s+/g, ' ').match(/出奔[^。]*。/)?.[0]));
  await p.screenshot({ path: `${out}/leave-${vp.tag}.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

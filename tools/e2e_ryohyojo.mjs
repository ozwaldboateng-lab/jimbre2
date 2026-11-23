// 領主の第三段: 月のはじめの評定（命を受ける・献策を求められる・特になし）。数か月送り、評定の窓が出て、選ぶと結果が出て、退出すると月の報告に続く
// 使い方: node tools/e2e_ryohyojo.mjs <画像の出力先>
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
  const seen = {};
  for (let m = 0; m < 4; m++) {
    await p.click('#btn-end'); await p.waitForTimeout(400);
    await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(400);
    for (let k = 0; k < 10; k++) {
      const acc = await p.$('#modal-body [data-act="rh-accept"]'), ken = await p.$('#modal-body [data-act="rh-ken"]'), cl = await p.$('#modal-body [data-act="rh-close"]');
      if (acc || ken || cl) {
        const txt = (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 140);
        const kind = acc ? '命' : ken ? '献策' : '結果/なし';
        if (!seen[kind]) { seen[kind] = 1; await p.screenshot({ path: `${out}/rh-${vp.tag}-${m}-${kind}.png` }); }
        console.log(vp.tag, m, kind, ':', txt);
        await (acc ?? ken ?? cl).click(); await p.waitForTimeout(200); continue;
      }
      const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click().catch(() => {}); await p.waitForTimeout(150); continue; }
      break;
    }
  }
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
  console.log(vp.tag, '主家:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '))).match(/承っている命.*?上納/)?.[0] ?? '');
  await p.close();
}
console.log('errors', errors); await b.close();

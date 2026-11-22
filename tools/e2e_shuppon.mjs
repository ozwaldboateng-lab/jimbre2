// 出奔と弟子入り: 城を持たない足軽組頭でも「主家との縁」から出奔して浪人になり、元の家には仕官できない（2年）こと。
// 三段の技能を持つ主人公の城下で月を送ると、弟子入りを願う武将が来て、教えられること（来るのは25%なので何度か試す）
// 使い方: node tools/e2e_shuppon.mjs <保存JSON（技能三段の主人公・城下・下旬）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch(); const errors = [];
{ // 出奔
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200); await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(300);
  const en = await p.$('#hero [data-h="pane"][data-id="homen"]'); console.log('主家との縁:', en ? (await en.textContent()).replace(/\s+/g, ' ') : 'none');
  await en.click(); await p.waitForTimeout(150);
  console.log('rebel disabled:', await p.$eval('#hero [data-h="rebel"]', (e) => e.disabled + ' ' + e.textContent.replace(/\s+/g, ' ')));
  await p.click('#hero [data-h="shuppon"]'); await p.waitForTimeout(100); await p.click('#hero [data-h="shuppon"]'); await p.waitForTimeout(200);
  console.log('shuppon:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''), '|', await p.$eval('#hero .hr-id', (e) => e.textContent));
  const sk = await p.$('#hero [data-h="shikan"]'); if (sk) { await sk.click(); await p.waitForTimeout(200); console.log('shikan same clan:', (await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 120)); } else console.log('no shikan btn');
  await p.screenshot({ path: `${out}/sh-1.png` });
  await p.close();
}
{ // 弟子入り
  let seen = false;
  for (let k = 0; k < 12 && !seen; k++) {
    const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
    p.on('pageerror', (e) => errors.push(e.message));
    await p.addInitScript((j) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } }, json);
    await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
    await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
    await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
    await p.click('#hero [data-h="rest"]'); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(300);
    const t = await p.$('#hero [data-h="pupil-teach"]');
    if (t) {
      seen = true;
      console.log(k, 'pupil:', (await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 160), '| report visible', !!(await p.$('#hero [data-h="report-ok"]')));
      await p.screenshot({ path: `${out}/sh-2-pupil.png` });
      await t.click(); await p.waitForTimeout(250);
      console.log('teach:', (await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 160));
    }
    await p.close();
  }
  if (!seen) console.log('no pupil in 12 tries');
}
console.log('errors', errors); await b.close();

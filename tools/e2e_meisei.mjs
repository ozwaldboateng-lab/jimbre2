// 浪人の名を売る手段と評判の札: 国衆の城下で野盗退治（盤）・普請の請負、大名の大きな城下で道場破り（一騎討ち）・連歌会・報せを売る。札が付く
// 使い方: node tools/e2e_meisei.mjs <保存JSON（浪人。国衆の城下）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const base = JSON.parse(readFileSync(save, 'utf8'));
const b = await chromium.launch(); const errors = [];
const kiyosu = base.castles.findIndex((c) => c.name === '清洲城');
const foeNear = base.castles.findIndex((c) => c.owner === 'imagawa');
for (const variant of ['kunishu', 'daimyo']) {
  const st = JSON.parse(JSON.stringify(base));
  st.hero.skill = { ...(st.hero.skill ?? {}), chikujo: 400 };
  if (variant === 'daimyo') { st.hero.town = kiyosu; st.hero.hex = st.castles[kiyosu].hex; st.hero.seen = { [foeNear]: st.turn }; st.hero.skill.ninjutsu = 400; }
  const json = JSON.stringify(st);
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', (e) => errors.push(variant + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(variant + ' ' + m.text()); });
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(500);
  const closeAll = async () => { for (const sel of ['[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } } };
  await closeAll();
  console.log(variant, '城下:', await p.$eval('#hero .hr-town', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''), '|', await p.$eval('#hero .hr-note', (e) => e.textContent).catch(() => ''));
  const spots = await p.$$eval('#hero .hr-spot b', (es) => es.map((e) => e.textContent));
  console.log(variant, 'できること:', spots.join(' / '));
  await p.screenshot({ path: `${out}/mei-${variant}.png` });
  const press = async (h) => { const x = await p.$(`#hero [data-h="${h}"]:not([disabled])`); if (!x) { console.log(variant, h, '押せない', await p.$eval(`#hero [data-h="${h}"] span`, (e) => e.textContent).catch(() => 'なし')); return false; } await x.click(); await p.waitForTimeout(400); return true; };
  // 場面（連歌会の句選び・誘いの使者など）: 問いは最初の答えを選び、あとは送る
  const theater = async () => { for (let n = 0; n < 40 && await p.$('#story:not([hidden]) .st-scene'); n++) { const ask = await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story [data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } };
  const said = async () => (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 140);
  if (variant === 'kunishu') {
    if (await press('nozoku')) { console.log(variant, '野盗の盤:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' '))); await p.screenshot({ path: `${out}/mei-nozoku.png` }); await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); await p.click('#ban [data-b="close"]'); await p.waitForTimeout(600); console.log(variant, '野盗退治:', await said()); await closeAll(); }
    await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {}); await closeAll();
    await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
    if (await press('fuuke')) { console.log(variant, '普請:', await said()); await closeAll(); }
  } else {
    if (await press('dojoyaburi')) { console.log(variant, '道場破り:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' '))); await p.screenshot({ path: `${out}/mei-dojo.png` }); await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); console.log(variant, '盤の終わり:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' '))); await p.click('#ban [data-b="close"]'); await p.waitForTimeout(600); console.log(variant, '道場破りの首尾:', await said()); await closeAll(); }
    await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {}); await closeAll();
    if (await press('renga')) { await theater(); await p.waitForTimeout(200); console.log(variant, '連歌会:', await said()); await closeAll(); }
    await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {}); await closeAll();
    if (await press('info')) { console.log(variant, '報せ:', await said()); await closeAll(); }
  }
  console.log(variant, '札:', await p.$eval('#hero .hr-note', (e) => e.textContent).catch(() => ''), JSON.stringify(await p.evaluate(() => window.__hero?.hero.renown)));
  await p.close();
}
console.log('errors', errors); await b.close();

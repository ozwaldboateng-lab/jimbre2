// 浪人への誘い: 城下の「誘い（n）」から窓を開き、条件を比べる。吊り上げる（一度だけ）・断る・受ける（その家に仕える）
// 使い方: node tools/e2e_sasoi.mjs <保存JSON（浪人）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const st = JSON.parse(readFileSync(save, 'utf8'));
st.hero.offers = [
  { clan: 'oda', rank: 2, pay: 120, shitaku: 600, yaku: '先手の足軽大将', follow: '配下は家臣として連れて来てよい', until: st.turn + 3, match: true },
  { clan: 'saito', rank: 1, pay: 230, shitaku: 700, yaku: '侍大将として一手を預かる', follow: '配下は家臣として連れて来てよい', until: st.turn + 2, match: false },
  { clan: 'imagawa', rank: 2, pay: 140, shitaku: 500, yaku: '普請奉行', follow: '配下は家臣として連れて来てよい', until: st.turn + 1, match: false },
];
const json = JSON.stringify(st);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript((j) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(500);
  for (const sel of ['[data-h="say-close"]', '[data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
  console.log(vp.tag, '誘いのボタン:', await p.$eval('#hero [data-h="offers"]', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'なし'));
  await p.click('#hero [data-h="offers"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '窓:', (await p.$eval('#hero .hr-dlg', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 260));
  await p.screenshot({ path: `${out}/sasoi-${vp.tag}.png` });
  await p.click('#hero [data-h="of-raise"][data-id="saito"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '吊り上げ:', await p.$eval('#hero .hr-ofmsg', (e) => e.textContent).catch(() => ''));
  const no = await p.$('#hero [data-h="of-no"][data-id="imagawa"]'); if (no) { await no.click(); await p.waitForTimeout(200); console.log(vp.tag, '断る:', await p.$eval('#hero .hr-ofmsg', (e) => e.textContent).catch(() => '')); }
  await p.screenshot({ path: `${out}/sasoi2-${vp.tag}.png` });
  await p.click('#hero [data-h="of-acc"][data-id="oda"]'); await p.waitForTimeout(600);
  await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {});
  console.log(vp.tag, '受けた:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  console.log(vp.tag, 'のち:', JSON.stringify(await p.evaluate(() => { const s = window.__hero; const me = s.generals[s.hero.id]; return { clan: me.clan, rank: me.rank, gold: s.hero.gold, payExtra: s.hero.payExtra, title: s.hero.title }; })));
  await p.close();
}
console.log('errors', errors); await b.close();

// 前田利家 ― 残り火 第二部: 1568年末の保存から、家督・家の外の風（世の中の合わせ直し）・金ヶ崎・姉川・府中・持たせるまで画面で通す
// 使い方: node tools/e2e_story2.mjs <保存JSON> <画像の出力先> [選ぶ答えの番号 0〜2]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out, pickArg] = process.argv.slice(2);
const PICK = +(pickArg ?? 0);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' console ' + m.text()); });
  await p.addInitScript((j) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(200);
  await p.click('#hero [data-h="continue"]'); await p.waitForTimeout(300);
  let shot = 0;
  const snap = async (n) => { if (shot < 36 && (vp.tag === 'pc' || shot < 14)) { shot++; await p.screenshot({ path: `${out}/s2-${vp.tag}-${String(shot).padStart(2, '0')}-${n}.png` }); } };
  const seen = new Set();
  let advice = 0, gov = 0, asks = 0, months = 0;
  const stage = [];
  for (let it = 0; it < 3000; it++) {
    const th = await p.$('#story:not([hidden]) .st-scene');
    if (th) {
      const nt = await p.$eval('#story .st-narr', (e) => e.textContent).catch(() => ''); if (nt.trim().startsWith('（') && !stage.includes(nt.slice(0, 30))) stage.push(nt.slice(0, 30)); // ト書き（括弧の案内文）が物語の画面に出ていないか
      const ask = await p.$$('#story [data-s="ask"]');
      if (ask.length) { asks++; const head = await p.$eval('#story .hr-say', (e) => e.textContent.slice(0, 20)); if (!seen.has('ask' + head)) { seen.add('ask' + head); await snap('ask'); } await ask[Math.min(PICK, ask.length - 1)].click(); await p.waitForTimeout(40); continue; }
      const fx = await p.$('#story .st-fx');
      if (fx) { const t = await fx.textContent(); const k = t.slice(0, 12); if (/第.章|了|金ヶ崎|姉川|府中へ|三人の理|持たせる/.test(t) && !seen.has(k)) { seen.add(k); await snap('fx'); } await fx.click(); await p.waitForTimeout(40); continue; }
      const nx = await p.$('#story .hr-say button[data-s="next"]');
      if (nx) { await nx.click(); await p.waitForTimeout(25); continue; }
    }
    if (await p.$('#hero [data-h="report-ok"]')) { months++; await p.click('#hero [data-h="report-ok"]'); await p.waitForTimeout(30); continue; }
    const text = await p.$eval('#hero .hr-main', (e) => e.textContent).catch(() => '');
    if (/第二部、了/.test(text)) { await snap('end'); break; }
    if (await p.$('#hero [data-h="pane"][data-id="spots"]:not(.on)')) { await p.click('#hero [data-h="pane"][data-id="spots"]'); await p.waitForTimeout(30); }
    if (gov < 40 && !(await p.$('#hero [data-h="gov"]'))) { const sb = await p.$('#hero [data-h="pane"][data-id="shiro"]'); if (sb) { await sb.click(); await p.waitForTimeout(60); } } // open-shiro: 治めは城の政の欄で
    const g = await p.$('#hero [data-h="gov"][data-id="mimawari"]');
    if (g) { gov++; if (gov === 1) await snap('fuchu'); await p.click(`#hero [data-h="gov"][data-id="${gov % 3 ? 'mimawari' : 'hidane'}"]`); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); continue; }
    const a = await p.$('#hero [data-h="advice"]');
    if (a && advice < 6) { advice++; await a.click(); await p.waitForTimeout(60); continue; }
    const sk = await p.$('#hero [data-h="skip"]');
    if (sk) { await sk.click(); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(60); continue; }
    const r = await p.$('#hero [data-h="rest"]');
    if (r) { await r.click(); await p.waitForFunction(() => !document.querySelector('#hero .hr-busy'), null, { timeout: 120000 }); await p.waitForTimeout(30); continue; }
    console.log(vp.tag, 'stuck', text.slice(0, 200)); await snap('stuck'); break;
  }
  console.log(vp.tag, 'stage-directions', stage.length, stage.join(' / '));
  console.log(vp.tag, 'asks', asks, 'advice', advice, 'gov', gov, 'months', months, '|', await p.evaluate(() => (document.querySelector('#hero .hr-id')?.textContent ?? '') + ' ' + (document.querySelector('#hero .hr-date')?.textContent ?? '') + ' | ' + (document.querySelector('#hero .hr-text')?.textContent ?? '')));
  await p.close();
}
console.log('errors', errors);
await b.close();

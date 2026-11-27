// 侍大将の攻略の軍議: 攻略の主命で軍勢を率い、落とす城を攻められる所まで進めたら「軍議を開く」。家臣・寄子の進言を聞いて攻め方を決める（調略・夜討ちは盤）
// 使い方: node tools/e2e_gungi.mjs <保存JSON（攻略の主命を受けた侍大将以上）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch(); const errors = [];
for (const [vp, saku] of [[{ width: 1360, height: 820, tag: 'pc' }, 'choryaku'], [{ width: 390, height: 844, tag: 'sp' }, 'youchi']]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'off'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
  const say = () => p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '');
  const ok = async () => { for (let k = 0; k < 40 && await p.$('#story:not([hidden]) .st-scene'); k++) { const sk = await p.$('#story [data-s="skip"]'); await (sk ?? await p.$('#story .st-scene')).click().catch(() => {}); await p.waitForTimeout(120); } for (const sel of ['#hero [data-h="q-pick"]', '#hero [data-h="q-accept"]', '#hero [data-h="say-close"]', '#hero [data-h="report-ok"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(60); } } };
  await p.click('#hero [data-h="lead"]'); await p.waitForTimeout(200);
  console.log(vp.tag, '出陣:', (await say()).slice(0, 60));
  for (let i = 0; i < 8; i++) {
    await ok();
    const gb = await p.$('#hero [data-h="gungi-open"]:not([disabled])');
    if (gb) break;
    const adv = await p.$('#hero [data-h="advance"]');
    if (adv) { const tx = await adv.textContent(); if (/攻める/.test(tx)) break; await adv.click(); await p.waitForTimeout(250); continue; }
    break;
  }
  await ok();
  const gb = await p.$('#hero [data-h="gungi-open"]');
  console.log(vp.tag, '軍議のボタン:', gb ? (await gb.textContent()).replace(/\s+/g, ' ').slice(0, 90) : 'なし');
  if (!gb) { console.log(vp.tag, '城下:', (await p.$$eval('#hero .hr-spot b', (es) => es.map((e) => e.textContent))).join('|')); await p.close(); continue; }
  await p.evaluate(() => { const s = window.__hero, me = s.generals[s.hero.id]; s.hero.yoriko = Object.values(s.generals).filter((g) => g.clan === me.clan && g.rank >= 2 && g.status !== 'dead' && g.id !== me.id).slice(0, 2).map((g) => g.id); });
  await gb.click(); await p.waitForTimeout(200);
  console.log(vp.tag, '軍議:', (await p.$eval('#hero .hr-dlg', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 260));
  await p.screenshot({ path: `${out}/gungi-${vp.tag}.png` });
  const before = await p.evaluate(() => { const s = window.__hero, c = s.castles[s.hero.quest.castle]; return { g: c.garrison, m: c.gMorale, naio: c.naio }; });
  await p.click(`#hero [data-h="gg"][data-id="${saku}"]`); await p.waitForTimeout(400);
  if (saku === 'youchi') { console.log(vp.tag, '夜討ちの盤:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'なし')); await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); await p.click('#ban [data-b="close"]'); await p.waitForTimeout(500); }
  await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {});
  console.log(vp.tag, '決めた:', await say());
  const after = await p.evaluate(() => { const s = window.__hero, c = s.castles[s.hero.quest?.castle ?? 0]; return { g: c.garrison, m: c.gMorale, naio: c.naio, turn: s.turn }; });
  console.log(vp.tag, '城:', JSON.stringify(before), '→', JSON.stringify(after));
  await p.close();
}
console.log('errors', errors); await b.close();

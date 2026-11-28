// 人手: 他家の足軽大将以下で恩の薄い者に「家臣に引き抜く」が出て、押すと家臣になる（主従の盃）。仕えていれば召し抱えに要る親しさが主家の威信で下がる
// 使い方: node tools/e2e_hikinuki.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  const closeAll = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]', '#story [data-s="next"]', '#story .st-fx']) { const x = await p.$(sel); if (x && await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  await closeAll();
  // 足軽大将にして、他家の者を城下に呼ぶ（恩は薄く、親しさ十分）
  const g = await p.evaluate(() => { const s = window.__hero, me = s.generals[s.hero.id]; me.rank = 2; s.hero.gold = 3000; s.hero.fame = 40;
    const x = Object.values(s.generals).find((y) => y.clan && y.clan !== me.clan && y.rank >= 2 && y.status !== 'dead' && y.status !== 'captive' && !y.kin && !y.liege && s.clans[y.clan].leader !== y.id);
    x.loc = s.hero.town; x.on = 5; s.hero.rel[x.id] = 90; s.hero.met = { ...(s.hero.met ?? {}), [x.id]: s.turn }; return { id: x.id, name: x.name }; });
  let done = false;
  for (let i = 0; i < 6 && !done; i++) {
    await closeAll(); await p.click('#hero [data-h="pane"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(150);
    await p.click(`#hero [data-h="meet"][data-id="${g.id}"]`).catch(() => {}); await p.waitForTimeout(150);
    const k = await p.$('#hero [data-h="hikinuki"]'); if (!k) { errors.push(vp.tag + ' 引き抜きのボタンがない'); break; }
    if (i === 0) { console.log(vp.tag, g.name, await k.textContent()); await p.screenshot({ path: `${out}/hikinuki-${vp.tag}.png` }); }
    await k.click(); await p.waitForTimeout(400);
    done = await p.evaluate((id) => window.__hero.hero.retainers?.includes(id), g.id);
    if (!done) await p.evaluate((id) => { window.__hero.hero.rel[id] = 90; window.__hero.hero.jun = 0; }, g.id);
  }
  console.log(vp.tag, '引き抜き', done); if (!done) errors.push(vp.tag + ' 家臣にならない');
  await p.close();
}
console.log('errors', errors);
await b.close();

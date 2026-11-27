// 侍大将の寄子と論功行賞: 侍大将になると寄子が二人付き、上に「寄子」の行。屋敷で寄子を推挙。率いた合戦のあと論功行賞で手柄を配る
// 使い方: node tools/e2e_yoriko.mjs <画像の出力先>
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
  await p.evaluate(() => { const s = window.__hero; s.generals[s.hero.id].rank = 1; });
  const closeAll = async () => { for (let k = 0; k < 40 && await p.$('#story:not([hidden]) .st-scene'); k++) { const sk = await p.$('#story [data-s="skip"]'); await (sk ?? await p.$('#story .st-scene')).click().catch(() => {}); await p.waitForTimeout(150); } for (let k = 0; k < 4; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  for (let i = 0; i < 4 && !(await p.$$eval('#hero .hr-quest', (es) => es.some((e) => e.textContent.includes('寄子') && e.textContent.includes('親しさ')))); i++) { await closeAll(); const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(400); } await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {}); }
  await closeAll();
  console.log(vp.tag, '寄子の行:', await p.$$eval('#hero .hr-quest', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ')).find((t) => t.includes('寄子')) ?? 'なし'));
  // 寄子の一人に功績を持たせ、屋敷で推挙する（同じ城下にいれば）
  const yk = await p.evaluate(() => { const s = window.__hero, id = s.hero.yoriko?.[0]; if (!id) return null; const g = s.generals[id]; g.merit = 99999; g.loc = s.hero.town; return { id, name: g.name, rank: g.rank }; });
  console.log(vp.tag, '寄子:', JSON.stringify(yk));
  if (yk) {
    await closeAll(); await p.click('#hero [data-h="pane"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(200);
    await p.click(`#hero [data-h="meet"][data-id="${yk.id}"]`).catch(() => {}); await p.waitForTimeout(200);
    await p.screenshot({ path: `${out}/yk-debug-${vp.tag}.png` });
    console.log(vp.tag, '窓:', (await p.$eval('#hero .hr-dlg', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => 'なし')).slice(0, 200), '| 会える人', (await p.$$eval('#hero [data-h="meet"]', (es) => es.map((e) => e.getAttribute('data-id')))).join(','));
    const bt = await p.$('#hero [data-h="yk-sui"]'); console.log(vp.tag, '推挙のボタン:', !!bt, bt ? await bt.isDisabled() : '');
    if (bt) { await bt.click(); await p.waitForTimeout(500); await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {}); console.log(vp.tag, '推挙:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''), '→ 身分', await p.evaluate((id) => window.__hero.generals[id].rank, yk.id)); await closeAll(); }
  }
  // 論功行賞
  await p.evaluate(() => { const s = window.__hero; s.hero.ronko = { turn: s.turn, pool: 6, foe: '今川家' }; });
  await closeAll(); await p.click('#hero [data-h="dlg-close"]').catch(() => {}); await closeAll(); await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(200);
  console.log(vp.tag, '城下の動き:', (await p.$$eval('#hero .hr-spot b', (es) => es.map((e) => e.textContent))).join(' / '), '| ronko', JSON.stringify(await p.evaluate(() => ({ r: window.__hero.hero.ronko, turn: window.__hero.turn }))));
  await p.click('#hero [data-h="ronko"]'); await p.waitForTimeout(200);
  const ids = await p.$$eval('#hero [data-h="rk-plus"]', (es) => es.map((e) => e.getAttribute('data-id')));
  console.log(vp.tag, '配る相手:', ids.length);
  // 自分に4、寄子の一人に2（もう一人は冷遇）
  for (let k = 0; k < 4; k++) { await p.click(`#hero [data-h="rk-plus"][data-id="${ids[0]}"]`); await p.waitForTimeout(60); }
  for (let k = 0; k < 2 && ids[1]; k++) { await p.click(`#hero [data-h="rk-plus"][data-id="${ids[1]}"]`); await p.waitForTimeout(60); }
  console.log(vp.tag, '論功の窓:', (await p.$eval('#hero .hr-dlg h4', (e) => e.textContent)), '| ＋が押せない', await p.$eval(`#hero [data-h="rk-plus"][data-id="${ids[0]}"]`, (e) => e.disabled));
  await p.screenshot({ path: `${out}/ronko-${vp.tag}.png` });
  await p.click('#hero [data-h="rk-done"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '沙汰:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  await p.close();
}
console.log('errors', errors); await b.close();

// 寄親と同輩（足軽組頭）: 月が変わると寄親と同輩が付き、上に「寄親」の行が出る。懇意の侍大将に屋敷で「寄親に願う」。合戦の槍働きの盤に同輩の駒（自分では動かせない）
// 使い方: node tools/e2e_yori.mjs <画像の出力先>
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
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  const closeAll = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  // 月を送る（休む）
  for (let i = 0; i < 4 && !(await p.$$eval('#hero .hr-quest', (es) => es.some((e) => e.textContent.includes('寄親') && e.textContent.includes('親しさ')))); i++) { await closeAll(); const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(400); } await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {}); }
  await closeAll();
  const line = await p.$$eval('#hero .hr-quest', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ')).find((t) => t.includes('寄親')) ?? 'なし');
  console.log(vp.tag, '寄親の行:', line);
  await p.screenshot({ path: `${out}/yori-line-${vp.tag}.png` });
  // 清洲にいる侍大将の一人（寄親でない者）と懇意にして、屋敷で寄親に願う
  const cand = await p.evaluate(() => { const s = window.__hero, me = s.generals[s.hero.id]; const g = Object.values(s.generals).find((x) => x.clan === me.clan && x.rank <= 1 && x.loc === s.hero.town && x.id !== s.hero.yorioya && x.id !== s.clans[me.clan].leader && ['free', 'governor'].includes(x.status)); if (g) s.hero.rel[g.id] = 60; return g ? { id: g.id, name: g.name } : null; });
  console.log(vp.tag, '願う相手:', cand?.name);
  if (cand) {
    await p.click('#hero [data-h="spot"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(200);
    await p.click(`#hero [data-h="meet"][data-id="${cand.id}"]`).catch(() => {}); await p.waitForTimeout(200);
    const btn = await p.$('#hero [data-h="yori-sw"]');
    console.log(vp.tag, '寄親に願うボタン:', !!btn, btn ? await btn.isDisabled() : '');
    await p.screenshot({ path: `${out}/yori-meet-${vp.tag}.png` });
    if (btn) { await btn.click(); await p.waitForTimeout(400); await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {}); console.log(vp.tag, '願った:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')); await closeAll(); }
    console.log(vp.tag, 'いまの寄親:', await p.evaluate(() => window.__hero.generals[window.__hero.hero.yorioya]?.name));
  }
  // 合戦の槍働き: 同輩の駒が出る
  await closeAll(); await p.click('#hero [data-h="dlg-close"]').catch(() => {}); await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(200);
  await p.evaluate(() => { const s = window.__hero; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: true, foe: f.id, foeName: '今川家', lead: false, yori: true }; });
  for (let i = 0; i < 12 && !(await p.$('[data-h="ban-go"]')); i++) { await closeAll(); if (await p.$('[data-h="ban-go"]')) break; const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(400); } await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {}); }
  console.log(vp.tag, '盤の前:', JSON.stringify(await p.evaluate(() => ({ turn: window.__hero.turn, battle: window.__hero.hero.battle, pend: window.__hero.hero.banPend, jun: window.__hero.hero.jun }))), await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  await p.click('[data-h="ban-go"]'); await p.waitForTimeout(500);
  const rival = await p.$('#ban .pa.rival, #ban .pc.rival');
  console.log(vp.tag, '同輩の駒:', !!rival);
  if (rival) { await rival.click(); await p.waitForTimeout(100); console.log(vp.tag, '同輩を押す:', await p.$eval('#ban .ban-info', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''), '| 動ける先', (await p.$$('#ban .bc.reach')).length); }
  await p.screenshot({ path: `${out}/yori-ban-${vp.tag}.png` });
  await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '盤:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
  await p.click('#ban [data-b="close"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '結果:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  await p.close();
}
console.log('errors', errors); await b.close();

// 領主と主君のあいだ: 主家の欄に疑い・席次・張り合う城主。月のはじめに詰問（申し開き）・国替え（従う）・討手（出奔）の窓
// 使い方: node tools/e2e_ryoshin.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 場面での選び方は e2e_jo で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
  console.log(vp.tag, '主家の欄:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' '))).match(/主君の疑い.*?主家の構え/)?.[0]);
  await p.click('#modal-close').catch(() => {});
  const closeModals = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click().catch(() => {}); await p.waitForTimeout(150); continue; } const x = await p.$('#modal:not([hidden]) [data-act="rv-close"], #modal:not([hidden]) [data-act="rh-close"]'); if (x) { await x.click().catch(() => {}); await p.waitForTimeout(150); continue; } break; } };
  const endMonth = async () => {
    await closeModals();
    await p.click('#btn-end'); await p.waitForTimeout(400);
    await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
    for (let k = 0; k < 8; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (!x) break; await x.click(); await p.waitForTimeout(200); }
  };
  const step = async (ev, act, label) => {
    await p.evaluate((e) => { window.__sengoku.state.hero.shinEv = e; }, ev);
    await endMonth();
    const h = await p.$eval('#modal-title', (e) => e.textContent).catch(() => 'なし');
    console.log(vp.tag, label, '窓:', h, '|', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 150));
    await p.screenshot({ path: `${out}/shin-${ev.kind}-${vp.tag}.png` });
    const btn = await p.$(`#modal-body [data-act="${act}"]`); if (!btn) { console.log(vp.tag, label, 'ボタンがない'); return; }
    await btn.click(); await p.waitForTimeout(500);
  };
  await step({ kind: 'kitsumon', turn: 0 }, 'rv-go', '詰問');
  console.log(vp.tag, '申し開き:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 140));
  await p.click('#modal-body [data-act="rv-close"]').catch(() => {}); await p.waitForTimeout(300);
  const to = await p.evaluate(() => { const s = window.__sengoku.state, f = s.hero.fuchu; const c = s.castles.find((x) => x.owner === 'oda' && x.i !== f && x.i !== s.generals[s.clans.oda.leader].loc); return c ? [c.i] : []; });
  await step({ kind: 'kunigae', turn: 0, to }, 'rv-obey', '国替え');
  console.log(vp.tag, '国替え:', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 140), '| 府中', await p.evaluate(() => { const s = window.__sengoku.state; return s.castles[s.hero.fuchu]?.name; }));
  await p.click('#modal-body [data-act="rv-close"]').catch(() => {}); await p.waitForTimeout(300);
  await step({ kind: 'uchite', turn: 0 }, 'rv-leave', '討手');
  await p.waitForTimeout(500);
  console.log(vp.tag, '出奔:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''), '| 主人公', await p.evaluate(() => { const s = window.__hero; return s ? `${s.generals[s.hero.id].clan ?? '浪人'}・${s.hero.mode ?? ''}` : 'なし'; }));
  await p.close();
}
console.log('errors', errors); await b.close();

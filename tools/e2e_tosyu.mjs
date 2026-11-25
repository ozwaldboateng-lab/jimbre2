// 大名（当主）: 月のはじめに家中の揉め事（不和・手柄争い）を裁く窓。人事の武将の欄から、恩の薄い家臣を詰問する
// 使い方: node tools/e2e_tosyu.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const [vp, how] of [[{ width: 1360, height: 820, tag: 'pc' }, 'tm-chusai'], [{ width: 390, height: 844, tag: 'sp' }, 'tm-a']]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'off'); } catch { /* */ } }); // 大名の場面は e2e_daimyo_kake で試す
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  const closeModals = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click().catch(() => {}); await p.waitForTimeout(150); continue; } break; } };
  await closeModals();
  // 揉め事を起こしておいて、月を送る
  const pair = await p.evaluate(() => { const s = window.__sengoku.state; const vs = Object.values(s.generals).filter((g) => g.clan === 'oda' && g.id !== s.clans.oda.leader && ['free', 'governor'].includes(g.status)).slice(0, 2); s.clans.oda.momegoto = { a: vs[0].id, b: vs[1].id, kind: 'fuwa', turn: s.turn }; return vs.map((g) => ({ id: g.id, name: g.name, on: g.on })); });
  await p.click('#btn-end'); await p.waitForTimeout(400);
  await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(400);
  for (let k = 0; k < 10 && !(await p.$('#modal-body [data-act="tm-a"]')); k++) { const c = await p.$('#modal:not([hidden]) #modal-close'); if (c && await c.isVisible()) { await c.click().catch(() => {}); await p.waitForTimeout(200); } else break; }
  console.log(vp.tag, '揉め事の窓:', await p.$eval('#modal-title', (e) => e.textContent).catch(() => 'なし'), '|', (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 120));
  await p.screenshot({ path: `${out}/tosyu-${vp.tag}.png` });
  await p.click(`#modal-body [data-act="${how}"]`); await p.waitForTimeout(300);
  console.log(vp.tag, '裁き:', await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''), '| 恩', JSON.stringify(await p.evaluate((ids) => ids.map((id) => window.__sengoku.state.generals[id].on), pair.map((x) => x.id))), 'もとは', pair.map((x) => x.on).join(','));
  await p.click('#modal-body [data-act="tm-close"]').catch(() => {}); await p.waitForTimeout(300); await closeModals();
  // 詰問: 恩を下げた家臣の欄から
  const vid = pair[1].id;
  await p.evaluate((id) => { window.__sengoku.state.generals[id].on = 20; }, vid);
  await p.click('#btn-jinji'); await p.click('[data-act="stab"][data-id="vassals"]'); await p.waitForTimeout(200);
  await p.click(`[data-act="gen"][data-id="${vid}"]`); await p.waitForTimeout(200);
  const kb = await p.$('[data-act="rw-kitsu"]'); console.log(vp.tag, '詰問のボタン:', !!kb, kb ? await kb.isDisabled() : '');
  if (kb) { await kb.click(); await p.waitForTimeout(300); console.log(vp.tag, '詰問:', await p.$eval('#toast', (e) => e.textContent).catch(() => ''), '| 家', await p.evaluate((id) => window.__sengoku.state.generals[id].clan, vid)); }
  await p.close();
}
console.log('errors', errors); await b.close();

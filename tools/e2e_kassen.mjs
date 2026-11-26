// 合戦の演出: 当主が自ら率いる合戦で、開戦の口上（場面）・戦の声（盤の隅の一言）・決着の一言（結果の札）が出るか。掛け合いを省く設定では出ないか
// 使い方: node tools/e2e_kassen.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] ?? '.';
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc', kake: 'on' }, { width: 390, height: 844, tag: 'sp', kake: 'on' }, { width: 1360, height: 820, tag: 'off', kake: 'off' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' console ' + m.text()); });
  await p.addInitScript((k) => { try { localStorage.setItem('sengoku-kake', k); } catch { /* */ } }, vp.kake);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  const battleOpen = () => p.evaluate(() => !document.getElementById('battle').hidden);
  const storyOpen = () => p.evaluate(() => { const r = document.getElementById('story'); return !!r && !r.hidden && !!r.querySelector('.st-scene'); });
  const closeModal = () => p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
  // 場面を最後まで送る（問いがあれば最初の答え）。見出しと台詞を集める
  const theater = async () => { const seen = []; for (let n = 0; n < 40 && (await storyOpen()); n++) { seen.push(await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => '') + '｜' + (await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 70)).catch(() => ''))); const x = await p.$('#story [data-s="ask"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!x) break; await x.click(); await p.waitForTimeout(80); } return seen; };
  const plan = await p.evaluate(() => {
    const { state: s } = window.__sengoku; const lord = s.clans[s.player].leader;
    let a = Object.values(s.armies).find((x) => x.clan === s.player && x.main === lord);
    if (!a) { a = Object.values(s.armies).find((x) => x.clan === s.player); if (!a) return null; s.generals[a.main].army = null; a.main = lord; s.generals[lord].army = a.id; }
    a.troops = Math.max(a.troops, 4000); a.departTroops = a.troops;
    return { army: a.id, lord: s.generals[lord].name };
  });
  let seen = false;
  for (let turn = 0; turn < 10 && !seen; turn++) {
    await theater(); await closeModal();
    const target = await p.evaluate((id) => {
      const { state: s } = window.__sengoku; const a = s.armies[id]; if (!a || a.acted) return null;
      const btn = document.querySelector(`[data-act="goto"][data-id="${a.id}"]`); if (!btn) return null; btn.click();
      const v = window.__sengoku.view; const tg = v.sel?.targets?.[0]; if (!tg) return null;
      const c = window.__sengoku.center(tg.hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy };
    }, plan.army);
    if (target) {
      await p.mouse.click(target.x, target.y); await p.waitForTimeout(150);
      const btn = await p.$('[data-act="order-cmd"]'); if (btn) { await btn.click(); await p.waitForTimeout(150); }
    } else {
      await p.evaluate((id) => {
        const { state: s, neighbors } = window.__sengoku; const a = s.armies[id];
        const foe = s.castles.filter((c) => c.owner && c.owner !== s.player).sort((x, y) => Math.abs(x.hex - a.hex) - Math.abs(y.hex - a.hex))[0];
        const nb = neighbors(foe.hex).find((h) => !Object.values(s.armies).some((z) => z.hex === h)); if (nb !== undefined) a.hex = nb;
      }, plan.army);
      continue;
    }
    await p.click('#btn-end');
    let opening = [];
    for (let k = 0; k < 120 && !(await battleOpen()); k++) { if (await storyOpen()) { const h = await p.$eval('#story .hr-town span', (e) => e.textContent).catch(() => ''); if (h === '合戦') { await p.screenshot({ path: `${out}/kassen-${vp.tag}-open.png` }); opening = await theater(); } else await theater(); } await p.waitForTimeout(150); }
    if (!(await battleOpen())) { await closeModal(); continue; }
    await p.waitForTimeout(600);
    const info = await p.evaluate(() => { const v = window.__sengoku_bt, t = v.t, x = window.__sengoku_bt2, s = v.s; const hq = x.hqOf(t, t.playerSide); return { hq: hq ? s.generals[hq.general]?.name : null, lord: s.generals[s.clans[s.player].leader].name, kind: t.kind }; });
    console.log(vp.tag, '合戦', JSON.stringify(info), '| 口上', opening.length, opening.join(' ／ ').slice(0, 300));
    if (info.hq !== info.lord) { if (await p.$('#bt-auto')) await p.click('#bt-auto').catch(() => {}); }
    else {
      seen = true;
      if (vp.kake === 'on' && opening.length < 3) errors.push(vp.tag + ' 開戦の口上が出ない');
      if (vp.kake === 'off' && opening.length) errors.push(vp.tag + ' 省く設定なのに口上が出た');
      for (let k = 0; k < 60 && !(await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'))); k++) await p.waitForTimeout(300);
      // 敵の部隊を一つ潰走させ、敵将を討った出来事を置いて、描き直す（手番を終えれば描き直される）
      await p.evaluate(() => { const t = window.__sengoku_bt.t, s = window.__sengoku_bt.s; const en = t.playerSide === 'A' ? 'D' : 'A'; const foe = t.units.find((u) => u.side === en && !u.out && !u.hq && u.general); (t.ev ??= []).push({ k: 'rout', side: en, u: foe?.name ?? '敵隊' }); if (foe) t.ev.push({ k: 'death', side: en, g: foe.general }); void s; });
      await p.click('#bt-end'); await p.waitForTimeout(500);
      const koe = await p.$$eval('#battle .bt-koe:not(.end)', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ')));
      console.log(vp.tag, '戦の声', koe.join(' ／ '));
      await p.screenshot({ path: `${out}/kassen-${vp.tag}-koe.png` });
      if (vp.kake === 'on' && !koe.length) errors.push(vp.tag + ' 戦の声が出ない');
      if (vp.kake === 'off' && koe.length) errors.push(vp.tag + ' 省く設定なのに戦の声が出た');
      for (let k = 0; k < 60 && !(await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'))); k++) await p.waitForTimeout(300);
      await p.click('#bt-auto').catch(() => {});
      for (let k = 0; k < 60 && !(await p.$('#battle .bt-result')); k++) await p.waitForTimeout(300);
      const end = await p.$eval('#battle .bt-result', (e) => e.querySelector('.bt-koe.end')?.textContent.replace(/\s+/g, ' ') ?? '').catch(() => '');
      console.log(vp.tag, '決着の一言', end);
      await p.screenshot({ path: `${out}/kassen-${vp.tag}-end.png` });
      if (vp.kake === 'on' && !end) errors.push(vp.tag + ' 決着の一言が出ない');
      if (vp.kake === 'off' && end) errors.push(vp.tag + ' 省く設定なのに決着の一言');
    }
    for (let k = 0; k < 240; k++) { await p.waitForTimeout(300); const lv = await p.$('[data-bact="leave"]'); if (lv) { await lv.click().catch(() => {}); await p.waitForTimeout(300); } if (!(await battleOpen())) break; }
    await closeModal(); await theater();
  }
  if (!seen) errors.push(vp.tag + ' 当主が本陣にいる合戦にならなかった');
  await p.close();
}
console.log('errors', errors);
await b.close();

// 大名の本陣の盤: 大名で遊ぶ時、当主が自ら率いる軍勢の合戦で、敵の部隊が本陣の隣に来ると（合戦に一度）槍働きの盤に切り替わり、当主が自ら戦う
// 使い方: node tools/e2e_honjin_daimyo.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] ?? '.';
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' console ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-new"]'); await p.click('[data-act="pick-scen"][data-id="1560"]'); await p.click('[data-act="pick-clan"][data-id="oda"]');
  await p.click('[data-act="start"]'); await p.waitForTimeout(400);
  const battleOpen = () => p.evaluate(() => !document.getElementById('battle').hidden);
  const closeModal = () => p.evaluate(() => document.querySelector('#modal:not([hidden]) [data-act="close"]')?.click());
  // 当主（信長）の軍勢を、攻められる敵のいる所へ置いて攻めさせる
  const plan = await p.evaluate(() => {
    const { state: s } = window.__sengoku; const lord = s.clans[s.player].leader;
    let a = Object.values(s.armies).find((x) => x.clan === s.player && x.main === lord);
    if (!a) { a = Object.values(s.armies).find((x) => x.clan === s.player); if (!a) return null; s.generals[a.main].army = null; a.main = lord; s.generals[lord].army = a.id; }
    a.troops = Math.max(a.troops, 4000); a.departTroops = a.troops;
    return { army: a.id, lord: s.generals[lord].name };
  });
  console.log(vp.tag, '当主の軍勢', JSON.stringify(plan));
  let seen = false;
  for (let turn = 0; turn < 10 && !seen; turn++) {
    const target = await p.evaluate((id) => {
      const { state: s } = window.__sengoku; const a = s.armies[id]; if (!a || a.acted) return null;
      const btn = document.querySelector(`[data-act="goto"][data-id="${a.id}"]`); if (!btn) return null; btn.click();
      const v = window.__sengoku.view; const tg = v.sel?.targets?.[0]; if (!tg) return null;
      const c = window.__sengoku.center(tg.hex); const r = v.canvas.getBoundingClientRect(); return { x: r.left + c[0] * v.scale + v.ox, y: r.top + c[1] * v.scale + v.oy, n: v.sel.targets.length };
    }, plan.army);
    if (target) {
      await p.mouse.click(target.x, target.y); await p.waitForTimeout(150);
      const btn = await p.$('[data-act="order-cmd"]');
      if (btn) { await btn.click(); await p.waitForTimeout(150); }
    } else {
      // 攻められる敵がいなければ、敵の城の方へ歩かせる（いちばん近い敵の城の隣へ置き直す）
      await p.evaluate((id) => {
        const { state: s, neighbors } = window.__sengoku; const a = s.armies[id];
        const foe = s.castles.filter((c) => c.owner && c.owner !== s.player).sort((x, y) => Math.abs(x.hex - a.hex) - Math.abs(y.hex - a.hex))[0];
        const nb = neighbors(foe.hex).find((h) => !Object.values(s.armies).some((z) => z.hex === h)); if (nb !== undefined) a.hex = nb;
      }, plan.army);
      continue;
    }
    await p.click('#btn-end');
    for (let k = 0; k < 80 && !(await battleOpen()); k++) await p.waitForTimeout(150);
    if (!(await battleOpen())) { await closeModal(); continue; }
    await p.waitForTimeout(800);
    const info = await p.evaluate(() => { const v = window.__sengoku_bt, t = v.t, x = window.__sengoku_bt2, s = v.s; const hq = x.hqOf(t, t.playerSide); return { hq: hq ? s.generals[hq.general]?.name : null, lord: s.generals[s.clans[s.player].leader].name, hero: !!s.hero }; });
    console.log(vp.tag, '合戦', JSON.stringify(info));
    if (info.hq !== info.lord) { console.log(vp.tag, '本陣に当主がいない合戦。任せて終える'); }
    else {
      seen = true;
      // 自分の手番になるまで待って、敵を本陣の隣に置き、手番を終える
      for (let k = 0; k < 60 && !(await p.evaluate(() => document.getElementById('bt-phase').classList.contains('mine'))); k++) await p.waitForTimeout(300);
      const put = await p.evaluate(() => { const v = window.__sengoku_bt, t = v.t, x = window.__sengoku_bt2; const hq = x.hqOf(t, t.playerSide); const foe = t.units.find((u) => u.side !== t.playerSide && !u.out && !u.routed); if (!hq || !foe) return null; const nb = x.tNeighbors(t, hq.tile).find((i) => !t.units.some((u) => !u.out && u.tile === i)); if (nb === undefined) return null; foe.tile = nb; v.refresh?.(); return { foe: foe.name, troops: foe.troops, morale: foe.morale }; });
      console.log(vp.tag, '本陣の隣に', JSON.stringify(put));
      await p.click('#bt-end'); await p.waitForTimeout(800);
      for (let k = 0; k < 40 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(300);
      const banOpen = !!(await p.$('#ban:not([hidden])'));
      console.log(vp.tag, '本陣の盤:', banOpen, banOpen ? await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')) : '');
      if (!banOpen) errors.push(vp.tag + ' 本陣の盤が開かない');
      else {
        const pieces = await p.evaluate(() => window.__ban.b.pieces.filter((q) => q.side === 'me').map((q) => `${q.name}${q.hero ? '(本人)' : ''}`).join('・'));
        console.log(vp.tag, '味方の駒', pieces, '| 退くボタン:', await p.$eval('#ban [data-b="retreat"]', (e) => e.textContent)); if ((await p.$eval('#ban [data-b="retreat"]', (e) => e.textContent)) !== '本陣を下げる') errors.push(vp.tag + ' 退くボタンの言葉');
        const sh = await p.$$eval('.ban-shout', (es) => es.map((e) => e.textContent)); console.log(vp.tag, '本陣の声:', sh.join('・')); if (!sh.some((x) => x.includes('お下がりを'))) errors.push(vp.tag + ' 本陣の声が出ない');
        await p.screenshot({ path: `${out}/honjin-daimyo-${vp.tag}.png` });
        await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
        console.log(vp.tag, '盤の終わり:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
        await p.click('#ban [data-b="close"]'); await p.waitForTimeout(600);
        const after = await p.evaluate((name) => { const t = window.__sengoku_bt.t; const u = t.units.find((x) => x.name === name); const hq = window.__sengoku_bt2.hqOf(t, t.playerSide); return { troops: u?.troops, morale: u?.morale, hqMorale: hq?.morale }; }, put?.foe);
        console.log(vp.tag, 'のち', JSON.stringify(after));
      }
    }
    if (await p.$('#bt-auto')) await p.click('#bt-auto').catch(() => {});
    for (let k = 0; k < 240; k++) { await p.waitForTimeout(400); const lv = await p.$('[data-bact="leave"]'); if (lv) { await lv.click().catch(() => {}); await p.waitForTimeout(300); } if (!(await battleOpen())) break; }
    await closeModal();
    for (let k = 0; k < 40; k++) { await p.waitForTimeout(200); if (await battleOpen()) { if (await p.$('#bt-auto')) await p.click('#bt-auto').catch(() => {}); } if (await p.evaluate(() => !document.getElementById('btn-end').disabled)) break; }
    await closeModal();
  }
  if (!seen) errors.push(vp.tag + ' 当主が本陣にいる合戦にならなかった');
  await p.close();
}
console.log('errors', errors);
await b.close();

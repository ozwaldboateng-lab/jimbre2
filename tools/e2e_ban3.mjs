// 槍働きの盤（第三段）: 隊を率いずに加わった合戦の月の終わりに「槍を取る（盤で戦う）」か「任せる」。盤で名のある将の隣に寄って名乗り、一騎討ち（三合）。終えると功績・名声・首級・体力に返る
// 使い方: node tools/e2e_ban3.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc', mode: 'go' }, { width: 390, height: 844, tag: 'sp', mode: 'go' }, { width: 390, height: 844, tag: 'sp-auto', mode: 'auto' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  // 合戦に加わったことにする（敵将は今川家の誰か）
  const foe = await p.evaluate(() => { const s = window.__hero; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: true, foe: f.id, foeName: '今川家', lead: false }; return f.name; });
  const m0 = await p.evaluate(() => { const s = window.__hero; return { merit: s.generals[s.hero.id].merit, fame: s.hero.fame ?? 0 }; });
  console.log(vp.tag, '敵将', foe, 'はじめ', JSON.stringify(m0));
  // 月を送る（休む）。途中の窓は閉じる
  for (let i = 0; i < 12 && !(await p.$('[data-h="ban-go"]')); i++) {
    for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click(); await p.waitForTimeout(100); } }
    if (await p.$('[data-h="ban-go"]')) break;
    const r = await p.$('#hero [data-h="rest"]'); if (r) { await r.click(); await p.waitForTimeout(400); }
    await p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {});
  }
  console.log(vp.tag, '誘い:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => 'なし'));
  await p.screenshot({ path: `${out}/b3-offer-${vp.tag}.png` });
  if (vp.mode === 'auto') {
    await p.click('[data-h="ban-auto"]'); await p.waitForTimeout(300);
  } else {
    await p.click('[data-h="ban-go"]'); await p.waitForTimeout(400);
    // 試しに、敵の一駒を名のある将にして主人公の隣へ置く
    await p.evaluate(() => { const bn = window.__ban.b; const h = bn.pieces.find((x) => x.hero); const f = bn.pieces.find((x) => x.side === 'foe' && x.alive); f.sho = true; f.name = '試しの将'; f.bra = 70; h.x = 3; h.y = 5; f.x = 3; f.y = 4; window.__ban.render(); });
    await p.click('#ban .hero'); await p.waitForTimeout(100);
    const nb = await p.$('#ban [data-b="nanori"]'); console.log(vp.tag, '名乗るボタン', !!nb, nb ? await nb.textContent() : '');
    await nb.click(); await p.waitForTimeout(150);
    console.log(vp.tag, '一騎討ち:', (await p.$eval('#ban .ban-dbox', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 200));
    await p.screenshot({ path: `${out}/b3-duel-${vp.tag}.png` });
    for (let k = 0; k < 3 && !(await p.$('#ban [data-b="duel-end"]')); k++) { await p.click('#ban [data-b="duel"][data-id="seme"]'); await p.waitForTimeout(120); }
    console.log(vp.tag, '一騎討ちの結果:', await p.$eval('#ban .ban-dres', (e) => e.textContent));
    await p.screenshot({ path: `${out}/b3-duel2-${vp.tag}.png` });
    await p.click('#ban [data-b="duel-end"]'); await p.waitForTimeout(100);
    if (!(await p.$('#ban .ban-over'))) { await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); }
    console.log(vp.tag, '盤:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')));
    await p.click('#ban [data-b="close"]'); await p.waitForTimeout(300);
  }
  console.log(vp.tag, '結果:', await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => ''));
  const m1 = await p.evaluate(() => { const s = window.__hero; return { merit: s.generals[s.hero.id].merit, fame: s.hero.fame ?? 0, deeds: s.hero.deeds, pend: !!s.hero.banPend }; });
  console.log(vp.tag, 'のち', JSON.stringify(m1));
  await p.screenshot({ path: `${out}/b3-after-${vp.tag}.png` });
  await p.close();
}
console.log('errors', errors); await b.close();

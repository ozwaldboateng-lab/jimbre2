// 足軽組頭の演出: 寄親が付く・同輩と顔合わせ（場面）、合戦の前（寄親の一言・同輩の挑み）と後（寄親の評・同輩の言葉）、盤の中の声（局面・一番槍）と一騎討ちの名乗り、
// 推挙されない時の寄親の言い分、取り立ての場面、同輩に先を越された・同輩の討ち死に
// 使い方: node tools/e2e_kumikake.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [out] = process.argv.slice(2);
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1360, height: 820, tag: 'pc' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-kake', 'on'); } catch { /* */ } });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-hero"]'); await p.waitForTimeout(300);
  await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="kinoshita_tokichiro"]'); await p.waitForTimeout(800);
  const idle = () => p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {});
  const scene = () => p.$('#story:not([hidden]) .st-scene');
  const closeAll = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click().catch(() => {}); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  // 場面を読み進めて、見出しとセリフを返す（問いが出たら最初の答え）
  const read = async () => { const ls = []; for (let n = 0; n < 60 && await scene(); n++) { const head = await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => ''); const t = await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').replace(/次へ ▸.*$/, '').trim()).catch(() => ''); ls.push(`[${head}] ${t.slice(0, 60)}`); const nx = await p.$('#story [data-s="ask"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  const rest = async () => { await closeAll(); const r = await p.$('#hero [data-h="rest"]'); if (r && await r.isVisible()) { await r.click(); await p.waitForTimeout(300); } await idle(); await p.waitForTimeout(250); };
  const shot = async (n) => p.screenshot({ path: `${out}/kk-${vp.tag}-${n}.png` });
  // 1. 寄親・同輩が付く（月を送る）
  const seen = [];
  for (let i = 0; i < 6 && !(seen.some((x) => x.includes('[寄親]')) && seen.some((x) => x.includes('[同輩]'))); i++) {
    await rest(); await closeAll(); await p.waitForTimeout(200);
    if (await scene()) { if (!seen.length) await shot('1-yori'); seen.push(...await read()); }
    await closeAll(); if (await scene()) seen.push(...await read());
  }
  console.log(vp.tag, '寄親・同輩:', seen.join(' ／ '));
  if (!seen.some((x) => x.includes('[寄親]'))) errors.push(vp.tag + ' 寄親の場面が出ない');
  if (!seen.some((x) => x.includes('[同輩]'))) errors.push(vp.tag + ' 同輩の場面が出ない');
  // 2. 合戦の前後（寄親が同じ軍勢にいた勝ち戦）
  await closeAll(); await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
  await p.evaluate(() => { const s = window.__hero; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: true, foe: f.id, foeName: '今川家', lead: false, yori: true }; });
  for (let i = 0; i < 6 && !(await p.$('[data-h="ban-go"]')); i++) { await rest(); await closeAll(); if (await scene()) await read(); }
  if (!(await p.$('[data-h="ban-go"]'))) errors.push(vp.tag + ' 槍働きの盤が出ない');
  else {
    await p.click('[data-h="ban-go"]'); await p.waitForTimeout(300);
    if (await scene()) { for (let n = 0; n < 4; n++) { const nx = await p.$('#story .hr-say[data-s="next"]'); if (nx) { await nx.click(); await p.waitForTimeout(60); } } await shot('2-before'); }
    const before = await read(); console.log(vp.tag, '合戦の前:', before.join(' ／ '));
    if (!before.some((x) => x.includes('[出陣]'))) errors.push(vp.tag + ' 合戦の前の場面が出ない');
    for (let k = 0; k < 30 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(100);
    // 盤の中の声: 一番槍と局面の変わり目
    await p.evaluate(() => { const v = window.__ban; v.b.ichiban = true; v.render(); });
    await p.waitForTimeout(200); const big = await p.$$eval('.ban-shout.big', (es) => es.map((e) => e.textContent)); await shot('3-ichiban');
    await p.evaluate(() => { const v = window.__ban; v.b.event = '中盤: 敵の新手が現れた（騎馬）。'; v.render(); });
    await p.waitForTimeout(150); const voice = await p.$$eval('.ban-shout:not(.big)', (es) => es.map((e) => e.textContent));
    console.log(vp.tag, '盤の声:', big.join('・'), '／', voice.join('・'));
    if (!big.includes('一番槍！')) errors.push(vp.tag + ' 一番槍の札が出ない');
    if (!voice.length) errors.push(vp.tag + ' 局面の声が出ない');
    // 一騎討ちの名乗り
    const sid = await p.evaluate(() => { const v = window.__ban, bn = v.b; const h = bn.pieces.find((q) => q.hero), f = bn.pieces.find((q) => q.side === 'foe' && q.alive); f.sho = true; f.x = h.x; f.y = h.y - 1; v.duel(f.id); return f.id; }); void sid;
    await p.waitForTimeout(200);
    const nanori = await p.$$eval('#ban .ban-nanori', (es) => es.map((e) => e.textContent));
    console.log(vp.tag, '名乗り:', nanori.join(' ／ '));
    if (nanori.length < 2) errors.push(vp.tag + ' 名乗りが出ない');
    await shot('4-nanori');
    for (let k = 0; k < 6 && !(await p.$('#ban [data-b="duel-end"]')); k++) { await p.click('#ban [data-b="duel"][data-id="seme"]').catch(() => {}); await p.waitForTimeout(100); }
    await p.click('#ban [data-b="duel-end"]').catch(() => {}); await p.waitForTimeout(150);
    if (!(await p.$('#ban .ban-over'))) { await p.click('#ban [data-b="auto"]').catch(() => {}); await p.waitForTimeout(300); }
    await p.click('#ban [data-b="close"]').catch(() => {}); await p.waitForTimeout(400);
    const after = await p.$$eval('#hero .hr-kake > *', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    console.log(vp.tag, '合戦の後:', after.join(' ／ '));
    if (!after.length) errors.push(vp.tag + ' 合戦の後の掛け合いが出ない');
    await shot('5-after');
  }
  await closeAll(); await idle(); for (let n = 0; n < 3 && await scene(); n++) { await read(); await closeAll(); }
  // 3. 推挙されない → 取り立て
  await p.evaluate(() => { const s = window.__hero, me = s.generals[s.hero.id]; me.merit = Math.max(me.merit, 50); s.hero.favor = 90; s.hero.rel[s.hero.yorioya] = 0; });
  let ls = []; for (let i = 0; i < 4 && !ls.some((x) => x.includes('[推挙]')); i++) { await rest(); await closeAll(); ls.push(...await read()); await closeAll(); ls.push(...await read()); }
  console.log(vp.tag, '推挙されない:', ls.filter((x) => x.includes('[推挙]')).join(' ／ '));
  if (!ls.some((x) => x.includes('[推挙]'))) errors.push(vp.tag + ' 推挙の言い分が出ない');
  await p.evaluate(() => { const s = window.__hero; s.hero.rel[s.hero.yorioya] = 100; });
  ls = []; for (let i = 0; i < 4 && !ls.some((x) => x.includes('[取り立て]')); i++) { await rest(); await closeAll(); if (await scene()) { await shot('6-promote'); } ls.push(...await read()); await closeAll(); ls.push(...await read()); }
  console.log(vp.tag, '取り立て:', ls.filter((x) => x.includes('[取り立て]')).join(' ／ '));
  if (!ls.some((x) => x.includes('[取り立て]'))) errors.push(vp.tag + ' 取り立ての場面が出ない');
  // 4. 同輩の討ち死に
  const rv = await p.evaluate(() => { const s = window.__hero, r = s.generals[s.hero.rival]; if (!r) return null; r.status = 'dead'; return r.name; });
  ls = []; if (rv) for (let i = 0; i < 3 && !ls.some((x) => x.includes('討ち死に')); i++) { await rest(); await closeAll(); ls.push(...await read()); await closeAll(); ls.push(...await read()); }
  console.log(vp.tag, '同輩の討ち死に:', rv, ls.filter((x) => x.includes('[同輩]')).join(' ／ '));
  if (rv && !ls.some((x) => x.includes('討ち死に'))) errors.push(vp.tag + ' 同輩の討ち死にの場面が出ない');
  await p.close();
}
console.log('errors', errors); await b.close();

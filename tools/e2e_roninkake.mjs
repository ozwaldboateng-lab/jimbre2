// 浪人の演出: 誘いの使者（口上・ほかの家と張り合う・吊り上げ・待つ・断る）、道場破りの前後の掛け合い、札が付いた時の城下の噂、用心棒の掛け合い、連歌会の句選び、仕官の目通りの問答
// 使い方: node tools/e2e_roninkake.mjs <保存JSON（浪人）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const base = JSON.parse(readFileSync(save, 'utf8'));
const b = await chromium.launch(); const errors = [];
const kiyosu = base.castles.findIndex((c) => c.name === '清洲城');
for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1360, height: 820, tag: 'pc' }]) {
  const st = JSON.parse(JSON.stringify(base));
  st.hero.town = kiyosu; st.hero.hex = st.castles[kiyosu].hex; st.hero.field = false; st.hero.dest = null;
  st.hero.renown = { ...(st.hero.renown ?? {}), bu: 5 }; st.hero.rk = { fuda: [], mile: 99 }; st.hero.fame = Math.max(st.hero.fame ?? 0, 35); st.hero.fameTurn = st.turn;
  st.hero.gold = 2000; st.hero.jun = 0; st.hero.dojoWon = {};
  const alive = Object.values(st.clans).filter((C) => C.alive && C.leader && C.id !== 'oda').slice(0, 2).map((C) => C.id);
  st.hero.offers = alive.map((c, i) => ({ clan: c, rank: 3, pay: 90 + i * 10, shitaku: 400, yaku: i ? '普請奉行' : '先手の侍', follow: '配下はいない', until: st.turn + 3, match: !i }));
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'on'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, JSON.stringify(st));
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(500);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(500);
  const closeAll = async () => { for (let n = 0; n < 4; n++) for (const sel of ['[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x) { await x.click().catch(() => {}); await p.waitForTimeout(120); } } };
  const idle = () => p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 60000 }).catch(() => {});
  const scene = () => p.$('#story:not([hidden]) .st-scene');
  const sceneText = () => p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
  // 場面を送る。問いが出たら止まる（返すのは問いの文と答え）
  const toAsk = async () => { for (let n = 0; n < 30 && await scene(); n++) { if (await p.$('#story [data-s="ask"]')) return { text: await p.$eval('#story .hr-say .hr-who', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''), opts: await p.$$eval('#story [data-s="ask"] b', (es) => es.map((e) => e.textContent)) }; const nx = await p.$('#story [data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return null; };
  const lines = async () => { const ls = []; for (let n = 0; n < 30 && await scene(); n++) { if (await p.$('#story [data-s="ask"]')) break; ls.push((await sceneText()).replace(/次へ ▸.*$/, '').slice(0, 70)); const nx = await p.$('#story [data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  // 途中で出た場面（月が替わって来た誘いの使者・噂など）を片づける: 問いは「待つ」か最初の答え
  const drain = async () => { for (let n = 0; n < 60 && await scene(); n++) { const w = await p.$('#story [data-s="ask"][data-id="wait"]') ?? await p.$('#story [data-s="ask"]'); const nx = w ?? await p.$('#story [data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } await closeAll(); };
  const said = async () => (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 120);
  const kake = async () => p.$$eval('#hero .hr-kake > *', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim())).catch(() => []);
  await closeAll();
  // 1. 誘いの使者（休むと旬が進み、来たばかりの誘いの場面が出る）
  await p.click('#hero [data-h="rest"]'); await idle(); await closeAll(); await p.waitForTimeout(300);
  let a = await toAsk();
  console.log(vp.tag, '使者1:', a?.text.slice(0, 90), '|', a?.opts.join(' / '));
  if (!a) errors.push(vp.tag + ' 使者の場面が出ない');
  await p.screenshot({ path: `${out}/rk-${vp.tag}-1-envoy.png` });
  if (a) {
    const raise = await p.$('#story [data-s="ask"][data-id="raise"]'); await (raise ?? await p.$('#story [data-s="ask"][data-id="wait"]')).click(); await p.waitForTimeout(150);
    console.log(vp.tag, '吊り上げ:', (await lines()).join(' ／ '));
    a = await toAsk(); if (a && (await p.$('#story [data-s="ask"][data-id="wait"]'))) { const k = a.text.includes('使者') ? '' : ''; void k; await p.click('#story [data-s="ask"][data-id="wait"]'); await p.waitForTimeout(150); console.log(vp.tag, '待つ:', (await lines()).join(' ／ ')); }
    a = await toAsk(); console.log(vp.tag, '使者2:', a?.text.slice(0, 90));
    if (a) { await p.click('#story [data-s="ask"][data-id="no"]'); await p.waitForTimeout(150); console.log(vp.tag, '断る:', (await lines()).join(' ／ ')); }
  }
  await idle(); await closeAll();
  console.log(vp.tag, '城下:', await said());
  // 2. 道場破り（前の掛け合い → 一騎討ち → 結びの掛け合い → 札が付いて噂）
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
  await p.click('#hero [data-h="dojoyaburi"]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/rk-${vp.tag}-2-dojo.png` });
  console.log(vp.tag, '道場の前:', (await lines()).join(' ／ '));
  for (let k = 0; k < 40 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(100);
  await p.waitForTimeout(500);
  console.log(vp.tag, '道場の盤:', await p.$eval('#ban .ban-head', (e) => e.textContent.replace(/\s+/g, ' ')), JSON.stringify(await p.evaluate(() => { const bn = window.__ban.b; return { w: bn.w, h: bn.h, floor: bn.floor, pieces: bn.pieces.map((q) => `${q.name}(${q.x},${q.y}) 体${q.hp} 足${q.mov} 絵${q.art}`) }; })));
  await p.screenshot({ path: `${out}/rk-${vp.tag}-2b-dojo-ban.png` });
  await p.evaluate(() => { const bn = window.__ban.b; const f = bn.pieces.find((q) => q.side === 'foe'); if (f) { f.hp = 1; f.atk = 1; } });
  await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '盤の終わり:', await p.$eval('#ban .ban-over', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => ''));
  await p.click('#ban [data-b="close"]').catch(() => {}); await p.waitForTimeout(400);
  console.log(vp.tag, '道場の結び:', (await kake()).join(' ／ '), '|', await said());
  await p.screenshot({ path: `${out}/rk-${vp.tag}-3-dojo-after.png` });
  await idle(); await closeAll(); await p.waitForTimeout(300);
  if (await scene()) { const nx = await p.$('#story [data-s="next"]'); if (nx) { await nx.click(); await p.waitForTimeout(80); } await p.screenshot({ path: `${out}/rk-${vp.tag}-7-rumor.png` }); }
  const rumor = await lines();
  console.log(vp.tag, '噂:', rumor.join(' ／ '));
  if (!rumor.some((x) => x.includes('槍の名手'))) errors.push(vp.tag + ' 札の噂が出ない');
  await closeAll();
  // 3. 用心棒の掛け合い
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
  await p.click('#hero [data-h="yojinbo"]'); await p.waitForTimeout(300);
  console.log(vp.tag, '用心棒:', (await kake()).join(' ／ '));
  if (!(await kake()).length) errors.push(vp.tag + ' 用心棒の掛け合いが出ない');
  if (vp.tag === 'sp') await p.screenshot({ path: `${out}/rk-${vp.tag}-4-yojinbo.png` });
  await idle(); await closeAll(); await drain(); await idle(); await drain();
  // 4. 連歌会（下の句を選ぶ）
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
  await p.click('#hero [data-h="renga"]'); await p.waitForTimeout(300);
  a = await toAsk(); console.log(vp.tag, '連歌:', a?.text.slice(0, 80), '|', a?.opts.join(' / '));
  if (!a) errors.push(vp.tag + ' 連歌の場面が出ない');
  await p.screenshot({ path: `${out}/rk-${vp.tag}-5-renga.png` });
  if (a) { await p.click('#story [data-s="ask"]'); await p.waitForTimeout(150); console.log(vp.tag, '連歌の結び:', (await lines()).join(' ／ ')); }
  await idle(); await closeAll(); await drain(); await idle(); await drain();
  // 5. 仕官の目通り（問答）
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {});
  await p.click('#hero [data-h="shikan"]'); await p.waitForTimeout(300);
  a = await toAsk(); console.log(vp.tag, '目通り:', a?.text.slice(0, 80), '|', a?.opts.join(' / '));
  if (!a) errors.push(vp.tag + ' 目通りの場面が出ない');
  await p.screenshot({ path: `${out}/rk-${vp.tag}-6-mon.png` });
  if (a) { await p.click('#story [data-s="ask"]'); await p.waitForTimeout(150); console.log(vp.tag, '目通りの結び:', (await lines()).join(' ／ ')); }
  await idle(); await p.waitForTimeout(300);
  console.log(vp.tag, 'のち:', await said(), JSON.stringify(await p.evaluate(() => ({ clan: window.__hero?.generals[window.__hero.hero.id].clan, jun: window.__hero?.hero.jun }))));
  await p.close();
}
console.log('errors', errors); await b.close();

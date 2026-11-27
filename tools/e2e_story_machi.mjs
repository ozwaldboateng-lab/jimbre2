// 物語（前田利家）第一幕の町: 序幕をとばすと、場面のない時は荒子・清洲・熱田を一つにした町が出て、建物の窓から行い（まつと話す・素振り・辻・酒屋・休む）ができ、手ほどきが済むか。上部は武将で遊ぶと同じ作りか
// 使い方: node tools/e2e_story_machi.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] ?? '.';
const b = await chromium.launch();
const errors = [];
for (const vp of [{ width: 1360, height: 820, tag: 'pc' }, { width: 390, height: 844, tag: 'sp' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' pageerror ' + e.message));
  await p.addInitScript(() => { try { localStorage.setItem('sengoku-machi', 'machi'); localStorage.removeItem('sengoku-teh'); localStorage.removeItem('sengoku-story-toshiie'); } catch { /* */ } });
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-story"]'); await p.waitForTimeout(300);
  await p.click('#story [data-s="new"]'); await p.waitForTimeout(300); for (let k = 0; k < 6 && !(await p.$('#story [data-s="skip"]')); k++) { const fx = await p.$('#story .st-fx'); if (fx) await fx.click(); await p.waitForTimeout(150); } await p.click('#story [data-s="skip"]'); await p.waitForTimeout(300); // 章の扉を送ってから、序幕は「場面をとばす」で
  // 場面を送る（問いがあれば最初の答え）
  const scenes = async () => { let n = 0; for (; n < 80; n++) { if (await p.$('#story .hr-machi')) break; const x = await p.$('#story [data-s="choose"]') ?? await p.$('#story [data-s="bchoose"]') ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say button[data-s="next"]'); if (!x) break; await x.click(); await p.waitForTimeout(60); } return n; };
  console.log(vp.tag, '帰参の場面まで送った', await scenes());
  const blds = await p.$$eval('#story .hr-bldi', (es) => es.map((e) => e.dataset.id + ':' + e.textContent.trim() + (e.classList.contains('teh') ? '*' : '')));
  console.log(vp.tag, '町の建物', blds.join(' '));
  if (blds.length < 5) errors.push(vp.tag + ' 町が出ない');
  console.log(vp.tag, '上部', await p.$eval('#story .bar', (e) => e.textContent.replace(/\s+/g, ' ').slice(0, 120)).catch(() => 'なし'));
  await p.screenshot({ path: `${out}/st1-${vp.tag}-0.png` });
  const doAct = async (bld, act) => {
    await p.click(`#story .hr-bldi[data-id="${bld}"]`); await p.waitForTimeout(120);
    if (bld === 'ie' && vp.tag === 'pc') await p.screenshot({ path: `${out}/st1-${vp.tag}-ie.png` });
    const x = await p.$(`#story .hr-bldwin [data-s="wact"][data-id$=":${act}"]`); if (!x) { errors.push(`${vp.tag} ${bld} に ${act} がない`); return; }
    await x.click(); await p.waitForTimeout(150); const n = await scenes();
    const t = await p.$eval('#story .hr-teh', (e) => [...e.querySelectorAll('li')].map((li) => li.textContent.trim().slice(0, 14)).join(' / ')).catch(() => '');
    console.log(vp.tag, `${bld}:${act}`, '場面', n, '|', t.slice(0, 140), '|', await p.$eval('#story .hr-date', (e) => e.textContent).catch(() => ''));
  };
  await doAct('ie', 'matsu_t');
  await doAct('ie', 'suburi');
  await doAct('ichi', 'tsuji');
  await doAct('mura', 'sakaya');
  await p.click('#story .bar .seal-btn'); await p.waitForTimeout(150); await scenes();
  const t1 = await p.$eval('#story .hr-teh', (e) => e.querySelectorAll('li.done').length).catch(() => 0);
  console.log(vp.tag, '済んだ手ほどき', t1);
  if (t1 < 5) errors.push(vp.tag + ' 手ほどきが済まない');
  await p.screenshot({ path: `${out}/st1-${vp.tag}-1.png` });
  // 札: 記録は日記、ほかは理由
  await p.click('#story .bar [data-s="cat"][data-id="naisei"]'); await p.waitForTimeout(80);
  const why = await p.$eval('#story .hr-pane', (e) => e.textContent.slice(0, 40));
  await p.click('#story .bar [data-s="cat"][data-id="kiroku"]'); await p.waitForTimeout(80);
  const diary = await p.$$eval('#story .hr-diary li', (es) => es.length);
  console.log(vp.tag, '内政', why, '| 日記', diary);
  if (!why.includes('城を預かる')) errors.push(vp.tag + ' 札の理由が出ない'); if (!diary) errors.push(vp.tag + ' 日記が出ない');
  await p.close();
}
console.log('errors', errors);
await b.close();

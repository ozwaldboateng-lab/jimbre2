// 侍大将の演出: 出陣の号令（軍勢の士気）、攻略の軍議の場面（採った者・退けた者の親しさ）、寄子の挨拶と心得、寄子の手柄争いの裁き、冷遇された寄子の不満、論功行賞の反応
// 使い方: node tools/e2e_samurai.mjs <保存JSON（攻略の主命を受けた侍大将。e2e_gungi と同じ）> <画像の出力先>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [save, out] = process.argv.slice(2);
const json = readFileSync(save, 'utf8');
const b = await chromium.launch(); const errors = [];
for (const vp of [{ width: 390, height: 844, tag: 'sp' }, { width: 1360, height: 820, tag: 'pc' }]) {
  const p = await b.newPage({ viewport: { width: vp.width, height: vp.height } });
  p.on('pageerror', (e) => errors.push(vp.tag + ' ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push(vp.tag + ' ' + m.text()); });
  await p.addInitScript((j) => { try { localStorage.setItem('sengoku-kake', 'on'); if (!sessionStorage.getItem('seeded')) { localStorage.setItem('sengoku-hero-auto', j); sessionStorage.setItem('seeded', '1'); } } catch { /* */ } }, json);
  await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
  await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200);
  await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(400);
  const idle = () => p.waitForFunction(() => !document.querySelector('.hr-busy'), null, { timeout: 120000 }).catch(() => {});
  const scene = () => p.$('#story:not([hidden]) .st-scene');
  const closeAll = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x && await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  const read = async (pickAsk) => { const ls = []; for (let n = 0; n < 80 && await scene(); n++) { const head = await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => ''); const t = await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').replace(/次へ ▸.*$/, '').trim()).catch(() => ''); ls.push(`[${head}] ${t.slice(0, 80)}`); const ask = (pickAsk && await p.$(`#story [data-s="ask"][data-id="${pickAsk}"]`)) || await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  const drain = async (pickAsk) => { const ls = []; for (let i = 0; i < 4; i++) { await closeAll(); await p.waitForTimeout(150); if (!(await scene())) break; ls.push(...await read(pickAsk)); } return ls; };
  const shot = (n) => p.screenshot({ path: `${out}/sm-${vp.tag}-${n}.png` });
  await drain();
  // 1. 出陣の号令
  const m0 = await p.evaluate(() => window.__hero.hero.leads);
  await p.click('#hero [data-h="lead"]').catch(() => {}); await p.waitForTimeout(400); await idle(); await p.waitForTimeout(300);
  let ask = null; for (let n = 0; n < 20 && await scene() && !(ask = await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); }
  if (ask && vp.tag === 'sp') await shot('1-gorei');
  const mor0 = await p.evaluate(() => { const s = window.__hero; return s.armies[s.hero.leads]?.morale; });
  const sj = await read('ichiban'); const mor1 = await p.evaluate(() => { const s = window.__hero; return s.armies[s.hero.leads]?.morale; });
  console.log(vp.tag, '出陣:', sj.join(' ／ '), `| 士気 ${mor0}→${mor1}`, m0);
  if (!sj.some((x) => x.includes('一番乗り'))) errors.push(vp.tag + ' 出陣の号令が出ない');
  if (!(mor1 > mor0)) errors.push(vp.tag + ' 号令で士気が上がらない');
  // 2. 攻略の軍議（軍勢を進めて）
  for (let i = 0; i < 8; i++) { await drain(); const gb = await p.$('#hero [data-h="gungi-open"]:not([disabled])'); if (gb) break; const adv = await p.$('#hero [data-h="advance"]'); if (adv) { const tx = await adv.textContent(); if (/攻める/.test(tx)) break; await adv.click(); await p.waitForTimeout(250); await idle(); continue; } break; }
  const gb = await p.$('#hero [data-h="gungi-open"]:not([disabled])');
  if (!gb) errors.push(vp.tag + ' 軍議を開けない');
  else {
    const rel0 = await p.evaluate(() => { const s = window.__hero; return JSON.stringify(Object.fromEntries([...(s.hero.retainers ?? []), ...(s.hero.yoriko ?? [])].map((id) => [s.generals[id].name, s.hero.rel[id] ?? 0]))); });
    await gb.click(); await p.waitForTimeout(300);
    for (let n = 0; n < 20 && await scene() && !(await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); }
    await shot('2-gungi');
    const opts = await p.$$eval('#story [data-s="ask"] b', (es) => es.map((e) => e.textContent));
    const gg = await read('chikara'); await idle();
    const rel1 = await p.evaluate(() => { const s = window.__hero; return JSON.stringify(Object.fromEntries([...(s.hero.retainers ?? []), ...(s.hero.yoriko ?? [])].map((id) => [s.generals[id].name, s.hero.rel[id] ?? 0]))); });
    console.log(vp.tag, '軍議:', opts.join(' / '), '||', gg.slice(-3).join(' ／ '), '| 親しさ', rel0, '→', rel1);
    if (!gg.some((x) => x.includes('[攻略の軍議]'))) errors.push(vp.tag + ' 軍議の場面が出ない');
    console.log(vp.tag, '軍議の首尾:', (await p.$eval('#hero .hr-text', (e) => e.textContent).catch(() => '')).slice(0, 80));
  }
  await drain();
  // 3. 寄子の挨拶と心得・手柄争い・不満（出来事を起こして月を送る）
  const yk = await p.evaluate(() => { const s = window.__hero, me = s.generals[s.hero.id]; const gs = Object.values(s.generals).filter((g) => g.clan === me.clan && g.rank >= 2 && g.status !== 'dead' && g.id !== s.hero.id && !(s.hero.retainers ?? []).includes(g.id)).slice(0, 2); s.hero.yoriko = gs.map((g) => g.id); s.hero.rel[gs[1].id] = 0; s.hero.kk = [...(s.hero.kk ?? []), { k: 'yoriko', id: gs[0].id }, { k: 'quarrel', a: gs[0].id, b: gs[1].id }, { k: 'yorikoSour', id: gs[1].id }]; return gs.map((g) => g.name); });
  await p.evaluate(() => { window.__hero.hero.jun = 2; });
  await closeAll(); await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(150);
  const rb = await p.$('#hero [data-h="campwait"]:not([disabled])') ?? await p.$('#hero [data-h="rest"]:not([disabled])') ?? await p.$('#hero [data-h="advance"]:not([disabled])');
  console.log(vp.tag, '旬を進める:', rb ? await rb.getAttribute('data-h') : 'なし'); if (rb) { await rb.click(); await p.waitForTimeout(300); } await idle();
  await closeAll(); await p.waitForTimeout(200); if (await scene() && vp.tag === 'sp') { for (let n = 0; n < 2; n++) await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await shot('3-yoriko'); }
  const ys = await drain('wise');
  console.log(vp.tag, '寄子:', yk.join('・'), '||', ys.filter((x) => /寄子|手柄争い/.test(x)).join(' ／ '));
  for (const w of ['[寄子]', '[寄子の手柄争い]']) if (!ys.some((x) => x.includes(w))) errors.push(vp.tag + ' ' + w + ' が出ない');
  if (!ys.some((x) => x.includes('不満'))) errors.push(vp.tag + ' 冷遇の不満が出ない');
  // 4. 論功行賞（自分に多く配る → 陰口）
  await closeAll();
  await p.evaluate(() => { const s = window.__hero; s.hero.ronko = { turn: s.turn, pool: 6, foe: '今川家' }; });
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(200);
  const rk = await p.$('#hero [data-h="ronko"]');
  if (!rk) errors.push(vp.tag + ' 論功行賞のボタンがない');
  else {
    await rk.click(); await p.waitForTimeout(200);
    const me = await p.evaluate(() => window.__hero.hero.id);
    for (let i = 0; i < 4; i++) { await p.click(`#hero [data-h="rk-plus"][data-id="${me}"]`).catch(() => {}); await p.waitForTimeout(40); }
    const other = await p.evaluate(() => window.__hero.hero.yoriko?.[0]); if (other) { await p.click(`#hero [data-h="rk-plus"][data-id="${other}"]`).catch(() => {}); await p.waitForTimeout(40); }
    await p.click('#hero [data-h="rk-done"]'); await p.waitForTimeout(300);
    const kk = await p.$$eval('#hero .hr-kake > *', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
    console.log(vp.tag, '論功行賞:', kk.join(' ／ '));
    if (!kk.some((x) => x.includes('陰口'))) errors.push(vp.tag + ' 論功行賞の陰口が出ない');
    await shot('4-ronko');
  }
  await p.close();
}
console.log('errors', errors); await b.close();

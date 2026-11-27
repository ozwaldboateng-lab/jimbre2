// 方面軍団長の演出: 目標の言い渡し（与力の顔合わせ）・催促・城を落とした与力の喜び・部隊を失った与力の恨み・言上・先鋒の願い（許すと親しさ+5）・目標を果たした・解任、
// 兵の取り合いの場面（使者と与力の意見）、方面ごとの謀反の前夜（与力の去就）
// 使い方: node tools/e2e_homen_kake.mjs <画像の出力先>
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
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  const scene = () => p.$('#story:not([hidden]) .st-scene');
  const read = async (pickAsk) => { const ls = []; for (let n = 0; n < 80 && await scene(); n++) { const head = await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => ''); const t = await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').replace(/次へ ▸.*$/, '').trim()).catch(() => ''); ls.push(`[${head}] ${t.slice(0, 70)}`); let ask = null; for (const a of [].concat(pickAsk ?? [])) { ask = await p.$(`#story [data-s="ask"][data-id="${a}"]`); if (ask) break; } ask = ask ?? await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  const closeModals = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const x of await p.$$('#modal:not([hidden]) [data-act="rv-close"], #modal:not([hidden]) [data-act="close"], #modal:not([hidden]) #modal-close')) { if (await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(150); hit = true; break; } } if (!hit) break; } };
  const endMonth = async (pickAsk) => {
    await closeModals();
    await p.click('#btn-end'); await p.waitForTimeout(400);
    await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
    const ls = [];
    for (let k = 0; k < 10; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (x && await x.isVisible()) { await x.click(); await p.waitForTimeout(200); continue; } if (await scene()) { ls.push(...await read(pickAsk)); await p.waitForTimeout(200); continue; } break; }
    return ls;
  };
  const shot = (n) => p.screenshot({ path: `${out}/hk-${vp.tag}-${n}.png` });
  // 方面軍団長にして、与力二人（一人は親しい）・目標・出来事を仕込む
  const ys = await p.evaluate(() => {
    const s = window.__sengoku.state, H = s.hero; H.career.steps.push('homen'); H.yk = { kumi: true };
    const ys = Object.values(s.generals).filter((g) => g.clan === 'oda' && g.id !== H.id && g.id !== s.clans.oda.leader && g.rank >= 1 && ['free', 'governor'].includes(g.status)).slice(0, 2);
    ys.forEach((g, i) => { g.yoriki = H.id; H.rel[g.id] = i === 0 ? 70 : 10; });
    const foe = s.castles.filter((c) => c.owner && c.owner !== 'oda').slice(0, 2);
    H.homenGoal = { castles: foe.map((c) => c.i), until: s.turn + 36, clan: foe[0].owner };
    H.kk = [{ k: 'homenGoal' }, { k: 'homenRemind' }, { k: 'yorikiWin' }, { k: 'yorikiLost', id: ys[1].id }, { k: 'gonjo', id: ys[1].id }, { k: 'senpo', id: ys[0].id }, { k: 'homenOk', ids: foe.map((c) => String(c.i)) }];
    return ys.map((g) => ({ id: g.id, name: g.name, rel: H.rel[g.id] }));
  });
  const evs = await endMonth('yes');
  const rel1 = await p.evaluate((id) => window.__sengoku.state.hero.rel[id], ys[0].id);
  console.log(vp.tag, '月のはじめ:', evs.map((x) => x.slice(0, 36)).join(' ／ '));
  console.log(vp.tag, '先鋒を許した', ys[0].name, ys[0].rel, '→', rel1);
  for (const h of ['[方面の目当て]', '[方面の軍勢]', '[与力]', '[言上]', '[先鋒の願い]']) if (!evs.some((x) => x.includes(h))) errors.push(vp.tag + ' ' + h + ' が出ない');
  if (!evs.some((x) => x.includes('与吉'))) errors.push(vp.tag + ' 与吉の一言が出ない');
  if (!(rel1 >= ys[0].rel + 5)) errors.push(vp.tag + ' 先鋒を許しても親しさが上がらない');
  await closeModals();
  // 兵の取り合い（場面で渋る）
  const fav0 = await p.evaluate(() => { const s = window.__sengoku.state; s.hero.shinEv = { kind: 'hei', turn: 0, need: 600 }; return s.hero.favor; });
  await closeModals(); await p.click('#btn-end'); await p.waitForTimeout(400); await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  for (let k = 0; k < 6; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (!x || !(await x.isVisible())) break; await x.click(); await p.waitForTimeout(200); }
  for (let n = 0; n < 20 && await scene() && !(await p.$('#story [data-s="ask"][data-id="hei-no"]')); n++) { const nx = await p.$('#story [data-s="ask"]') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); }
  if (vp.tag === 'sp') await shot('1-hei');
  const he = await read('hei-no'); await p.waitForTimeout(300);
  const fav1 = await p.evaluate(() => window.__sengoku.state.hero.favor);
  console.log(vp.tag, '兵の取り合い:', he.map((x) => x.slice(0, 40)).join(' ／ '), `| 覚え ${fav0}→${fav1}`, (await p.$eval('#modal-body', (e) => e.textContent.replace(/\s+/g, ' ')).catch(() => '')).slice(0, 60));
  if (!he.some((x) => x.includes('[兵の取り合い]'))) errors.push(vp.tag + ' 兵の取り合いの場面が出ない');
  await closeModals();
  // 謀反の前夜（思いとどまる）
  await p.evaluate(() => { const s = window.__sengoku.state; s.hero.favor = 10; s.hero.utagai = 0; });
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
  const rbtn = await p.$('#modal-body [data-act="ryo-rebel"]:not([disabled])');
  if (!rbtn) { console.log(vp.tag, '謀反のボタンが押せない', await p.$eval('#modal-body [data-act="ryo-rebel"]', (e) => e.getAttribute('title')).catch(() => '')); }
  else {
    await rbtn.click(); await p.waitForTimeout(300);
    for (let n = 0; n < 20 && await scene() && !(await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); }
    await shot('2-rebel');
    const rv = await read('stop'); await p.waitForTimeout(300);
    console.log(vp.tag, '謀反の前夜:', rv.map((x) => x.slice(0, 50)).join(' ／ '), '| 家', await p.evaluate(() => window.__sengoku.state.generals[window.__sengoku.state.hero?.id]?.clan));
    if (!rv.some((x) => x.includes('[謀反の前夜]'))) errors.push(vp.tag + ' 謀反の前夜の場面が出ない');
  }
  await p.close();
}
console.log('errors', errors); await b.close();

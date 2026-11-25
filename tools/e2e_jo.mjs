// 城主・国持ちの演出: 月のはじめの場面（加増・減封・席次・讒言・寝返りの密使〈主君に知らせる〉・入城・権六の隠居）、詰問（申し開きの言い方）・国替え（家臣の意見と百姓の別れ）・討手（家臣が詰めかける）を場面で選ぶ
// 使い方: node tools/e2e_jo.mjs <画像の出力先>
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
  await p.click('[data-h="pscen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200);
  await p.click('[data-h="pick"][data-id="shibata_katsuie"]'); await p.waitForTimeout(800);
  const scene = () => p.$('#story:not([hidden]) .st-scene');
  const read = async (pickAsk) => { const ls = []; for (let n = 0; n < 80 && await scene(); n++) { const head = await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => ''); const t = await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').replace(/次へ ▸.*$/, '').trim()).catch(() => ''); ls.push(`[${head}] ${t.slice(0, 80)}`); let ask = null; for (const a of [].concat(pickAsk ?? [])) { ask = await p.$(`#story [data-s="ask"][data-id="${a}"]`); if (ask) break; } ask = ask ?? await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  const closeModals = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const x of await p.$$('#modal:not([hidden]) [data-act="rv-close"], #modal:not([hidden]) [data-act="close"], #modal:not([hidden]) #modal-close')) { if (await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(150); hit = true; break; } } if (!hit) break; } }; // 見えているボタンだけ押す（閉じられない窓の×は隠れている）
  const endMonth = async (pickAsk) => {
    await closeModals();
    await p.click('#btn-end'); await p.waitForTimeout(400);
    await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
    const ls = [];
    for (let k = 0; k < 10; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (x && await x.isVisible()) { await x.click(); await p.waitForTimeout(200); continue; } if (await scene()) { ls.push(...await read(pickAsk)); await p.waitForTimeout(200); continue; } break; }
    return ls;
  };
  const shot = (n) => p.screenshot({ path: `${out}/jo-${vp.tag}-${n}.png` });
  // 1. 月のはじめの場面
  const prep = await p.evaluate(() => { const s = window.__sengoku.state, H = s.hero, f = H.fuchu; const c = s.castles.find((x) => x.owner === 'oda' && x.i !== f); const r = Object.values(s.generals).find((g) => g.clan === 'oda' && g.rank <= 1 && g.id !== H.id && g.status !== 'dead'); H.yk = { kumi: true }; H.kk = [{ k: 'nyujo', c: f }, { k: 'inkyo' }, { k: 'kazo', c: c.i }, { k: 'seki', up: true, n: 3, id: r.id }, { k: 'zan', id: r.id, ok: false }, { k: 'mitsushi', clan: 'imagawa' }, { k: 'genpo', c: c.i }]; return { favor: H.favor, castle: c.name, rival: r.name }; });
  const evs = await endMonth(['yes', 'shiraseru']);
  const favor1 = await p.evaluate(() => window.__sengoku.state.hero.favor);
  console.log(vp.tag, '月のはじめ:', evs.map((x) => x.slice(0, 40)).join(' ／ '));
  console.log(vp.tag, '覚え', prep.favor, '→', favor1, '| 権六', JSON.stringify(await p.evaluate(() => window.__sengoku.state.hero.gon)));
  for (const h of ['に入った。', '[権六の願い]', '[加増]', '[席次]', '[讒言]', '[密使]', '[減封]']) if (!evs.some((x) => x.includes(h))) errors.push(vp.tag + ' ' + h + ' が出ない');
  // 2. 詰問（働きを並べる）
  await p.evaluate(() => { window.__sengoku.state.hero.shinEv = { kind: 'kitsumon', turn: 0 }; window.__sengoku.state.hero.favor = 70; });
  await closeModals(); await p.click('#btn-end'); await p.waitForTimeout(400); await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  for (let k = 0; k < 6; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (!x || !(await x.isVisible())) break; await x.click(); await p.waitForTimeout(200); }
  for (let n = 0; n < 20 && await scene() && !(await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); }
  const kopts = await p.$$eval('#story [data-s="ask"] span', (es) => es.map((e) => e.textContent)); await shot('2-kitsumon');
  const ki = await read('hataraki'); console.log(vp.tag, '詰問:', kopts.join(' / '), '||', ki.slice(-3).join(' ／ '));
  if (!ki.some((x) => x.includes('[詰問]'))) errors.push(vp.tag + ' 詰問の場面が出ない');
  await p.waitForTimeout(300); await closeModals();
  // 3. 国替え（従う）
  const to = await p.evaluate(() => { const s = window.__sengoku.state, f = s.hero.fuchu; const c = s.castles.find((x) => x.owner === 'oda' && x.i !== f && x.i !== s.generals[s.clans.oda.leader].loc); s.hero.shinEv = { kind: 'kunigae', turn: 0, to: [c.i] }; return c.name; });
  const ku = await endMonth('obey'); console.log(vp.tag, '国替え:', to, ku.map((x) => x.slice(0, 40)).join(' ／ '), '| 府中', await p.evaluate(() => { const s = window.__sengoku.state; return s.castles[s.hero.fuchu]?.name; }));
  if (!ku.some((x) => x.includes('[国替え]'))) errors.push(vp.tag + ' 国替えの場面が出ない');
  await closeModals();
  // 4. 討手（家臣が詰めかける → 出奔）
  await p.evaluate(() => { window.__sengoku.state.hero.shinEv = { kind: 'uchite', turn: 0 }; });
  await closeModals(); await p.click('#btn-end'); await p.waitForTimeout(400); await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
  for (let k = 0; k < 6; k++) { const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (!x || !(await x.isVisible())) break; await x.click(); await p.waitForTimeout(200); }
  for (let n = 0; n < 20 && await scene() && !(await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); }
  await shot('4-uchite');
  const uc = await read('leave'); await p.waitForTimeout(600);
  console.log(vp.tag, '討手:', uc.map((x) => x.slice(0, 50)).join(' ／ '), '| 武将の画面', await p.$eval('#hero', (e) => !e.hidden).catch(() => false));
  if (!uc.some((x) => x.includes('[討手]'))) errors.push(vp.tag + ' 討手の場面が出ない');
  if (!(await p.$eval('#hero', (e) => !e.hidden).catch(() => false))) errors.push(vp.tag + ' 出奔して武将の画面に戻らない');
  await p.close();
}
console.log('errors', errors); await b.close();

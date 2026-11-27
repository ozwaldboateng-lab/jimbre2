// 大名（当主）の演出: 城主から謀反で家を立てた日（最初の言葉で家の構えと恩）・権六の便り、旧主との因縁（討手の口上・旧知・旧主の城・旧主との対面と処遇）、
// 家中の揉め事を場面で裁く、家臣への詰問の場面、権六の最期
// 使い方: node tools/e2e_daimyo_kake.mjs <画像の出力先>
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
  const closeModals = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const x of await p.$$('#modal:not([hidden]) [data-act="rv-close"], #modal:not([hidden]) [data-act="close"], #modal:not([hidden]) [data-act="tm-close"], #modal:not([hidden]) #modal-close')) { if (await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(150); hit = true; break; } } if (!hit) break; } };
  const endMonth = async (pickAsk) => {
    await closeModals();
    await p.click('#btn-end'); await p.waitForTimeout(400);
    await p.waitForFunction(() => !document.getElementById('btn-end')?.hasAttribute('disabled'), null, { timeout: 120000 }); await p.waitForTimeout(300);
    const ls = [];
    for (let k = 0; k < 10; k++) { if (await scene()) { ls.push(...await read(pickAsk)); await p.waitForTimeout(200); continue; } const x = await p.$('#modal-body [data-act="rh-accept"], #modal-body [data-act="rh-ken"], #modal-body [data-act="rh-close"]'); if (x && await x.isVisible()) { await x.click(); await p.waitForTimeout(200); continue; } break; }
    return ls;
  };
  const shot = (n) => p.screenshot({ path: `${out}/dk-${vp.tag}-${n}.png` });
  // 1. 城主から謀反（権六は隠居、与吉は組頭）→ 家を立てた日
  await p.evaluate(() => { const s = window.__sengoku.state; s.hero.gon = { inkyo: s.turn, letter: s.turn }; s.hero.yk = { kumi: true }; s.hero.favor = 10; });
  await p.click('#btn-shuke'); await p.waitForTimeout(300);
  for (let i = 0; i < 2; i++) { const r = await p.$('#modal-body [data-act="ryo-rebel"]:not([disabled])'); if (!r) break; await r.click(); await p.waitForTimeout(400); if (await scene()) break; }
  await p.waitForTimeout(300);
  if (await scene()) { for (let n = 0; n < 6 && !(await p.$('#story [data-s="ask"]')); n++) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.waitForTimeout(60); } await shot('1-found'); }
  const stance0 = await p.evaluate(() => { const s = window.__sengoku.state; return s.clans[s.player].stance; });
  const fd = await read('tomu');
  const info = await p.evaluate(() => { const s = window.__sengoku.state; return { player: s.player, hero: !!s.hero, stance: s.clans[s.player].stance, gon: s.clans[s.player].gon, lord: s.clans[s.player].kyuushu?.lord }; });
  console.log(vp.tag, '家を立てた日:', fd.map((x) => x.slice(0, 40)).join(' ／ '), '|', stance0, '→', JSON.stringify(info));
  if (!fd.some((x) => x.includes('民を富ませ'))) errors.push(vp.tag + ' 家を立てた日の場面が出ない');
  if (!fd.some((x) => x.includes('[権六の便り]'))) errors.push(vp.tag + ' 権六の便りが出ない');
  if (info.stance !== '均衡') errors.push(vp.tag + ' 最初の言葉で構えが変わらない');
  // 2. 旧主との因縁（討手・旧知・旧主の城・対面 → 客分）
  const prep = await p.evaluate(() => { const s = window.__sengoku.state, X = s.clans[s.player], old = X.kyuushu.clan; const g = Object.values(s.generals).find((x) => x.clan === s.player && x.id !== X.leader && x.status !== 'dead'); const c = s.castles.find((x) => x.owner === s.player); X.tk = [...(X.tk ?? []), { k: 'kyuTe' }, { k: 'kyuYu', id: g.id }, { k: 'kyuCastle', c: c.i }, { k: 'kyuEnd', id: X.kyuushu.lord }]; const ol = s.generals[X.kyuushu.lord]; ol.status = 'captive'; return { old, lord: ol.name }; });
  const ky = await endMonth('kyaku');
  const olAfter = await p.evaluate(() => { const s = window.__sengoku.state, X = s.clans[s.player], ol = s.generals[X.kyuushu.lord]; return { clan: ol.clan, status: ol.status }; });
  console.log(vp.tag, '旧主:', ky.map((x) => x.slice(0, 36)).join(' ／ '), '| 旧主', prep.lord, JSON.stringify(olAfter));
  for (const h of ['[旧主]', '[旧知]', '[旧主との対面]']) if (!ky.some((x) => x.includes(h))) errors.push(vp.tag + ' ' + h + ' が出ない');
  if (olAfter.clan !== info.player) errors.push(vp.tag + ' 旧主を客分にできない');
  // 3. 家中の揉め事（場面で裁く）
  const pair = await p.evaluate(() => { const s = window.__sengoku.state, X = s.clans[s.player]; let vs = Object.values(s.generals).filter((g) => g.clan === s.player && g.id !== X.leader && ['free', 'governor'].includes(g.status)).slice(0, 2); for (const g of Object.values(s.generals)) { if (vs.length >= 2) break; if (g.clan && g.clan !== s.player && ['free', 'governor'].includes(g.status) && !vs.includes(g)) { g.clan = s.player; g.status = 'free'; g.loc = s.generals[X.leader].loc; vs.push(g); } } X.momegoto = { a: vs[0].id, b: vs[1].id, kind: 'tegara', turn: s.turn }; return vs.map((g) => ({ id: g.id, on: g.on ?? 50 })); });
  const mo = await endMonth('a');
  const ons = await p.evaluate((ids) => ids.map((id) => window.__sengoku.state.generals[id].on), pair.map((x) => x.id));
  console.log(vp.tag, '揉め事:', mo.filter((x) => /手柄争い|裁き/.test(x)).map((x) => x.slice(0, 50)).join(' ／ '), '| 恩', pair.map((x) => x.on).join(','), '→', ons.join(','));
  if (!mo.some((x) => x.includes('[手柄争い]'))) errors.push(vp.tag + ' 揉め事の場面が出ない');
  await closeModals();
  // 4. 家臣への詰問（人事の武将の欄から）
  const vid = pair[1].id;
  await p.evaluate((id) => { window.__sengoku.state.generals[id].on = 20; }, vid);
  await p.click('#btn-jinji').catch(() => {}); await p.click('[data-act="stab"][data-id="vassals"]').catch(() => {}); await p.waitForTimeout(200);
  await p.click(`[data-act="gen"][data-id="${vid}"]`).catch(() => {}); await p.waitForTimeout(200);
  const kb = await p.$('[data-act="rw-kitsu"]:not([disabled])');
  if (!kb) errors.push(vp.tag + ' 詰問のボタンがない');
  else {
    await kb.click(); await p.waitForTimeout(300);
    if (vp.tag === 'sp' && await scene()) { await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await p.click('#story .hr-say[data-s="next"]').catch(() => {}); await shot('2-kitsumon'); }
    const ki = await read(); console.log(vp.tag, '詰問:', ki.map((x) => x.slice(0, 40)).join(' ／ '));
    if (!ki.some((x) => x.includes('[詰問]'))) errors.push(vp.tag + ' 詰問の場面が出ない');
  }
  await closeModals();
  // 5. 権六の最期（家を立てて三年）
  await p.evaluate(() => { const s = window.__sengoku.state; s.clans[s.player].foundTurn = s.turn - 40; });
  const gl = await endMonth();
  console.log(vp.tag, '権六:', gl.filter((x) => x.includes('[権六]')).map((x) => x.slice(0, 50)).join(' ／ '));
  if (!gl.some((x) => x.includes('[権六]'))) errors.push(vp.tag + ' 権六の最期が出ない');
  await p.close();
}
console.log('errors', errors); await b.close();

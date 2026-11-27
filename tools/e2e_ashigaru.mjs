// 足軽大将の演出: 家臣の召し抱え（主従の盃）、持ち場の言い渡し（場面で願い出る）、合戦の後の家臣の一言、与吉の物語（初首・組を預ける願い出）、
// 小競り合いの出立の前の場面と盤の始まりの声・終わりの家臣の一言、扶持が払えない時の暇乞い
// 使い方: node tools/e2e_ashigaru.mjs <画像の出力先>
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
  const closeAll = async () => { for (let k = 0; k < 6; k++) { let hit = false; for (const sel of ['[data-h="q-pick"]', '[data-h="q-accept"]', '[data-h="say-close"]', '[data-h="report-ok"]', '[data-h="pupil-no"]']) { const x = await p.$(sel); if (x && await x.isVisible()) { await x.click().catch(() => {}); await p.waitForTimeout(100); hit = true; } } if (!hit) break; } };
  // 場面を読み進める。pickAsk があれば、その答え（なければ最初）
  const read = async (pickAsk) => { const ls = []; for (let n = 0; n < 80 && await scene(); n++) { const head = await p.$eval('#story .hr-town b', (e) => e.textContent).catch(() => ''); const t = await p.$eval('#story .hr-say', (e) => e.textContent.replace(/\s+/g, ' ').replace(/次へ ▸.*$/, '').trim()).catch(() => ''); ls.push(`[${head}] ${t.slice(0, 70)}`); const ask = (pickAsk && await p.$(`#story [data-s="ask"][data-id="${pickAsk}"]`)) || await p.$('#story [data-s="ask"]'); const nx = ask ?? await p.$('#story .st-fx') ?? await p.$('#story .hr-say[data-s="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(60); } return ls; };
  const drain = async (pickAsk) => { const ls = []; for (let i = 0; i < 4; i++) { await closeAll(); await p.waitForTimeout(150); if (!(await scene())) break; ls.push(...await read(pickAsk)); } return ls; };
  const rest = async () => { await closeAll(); await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); const r = await p.$('#hero [data-h="rest"]'); if (r && await r.isVisible()) { await r.click(); await p.waitForTimeout(300); } await idle(); await p.waitForTimeout(250); };
  const shot = (n) => p.screenshot({ path: `${out}/as-${vp.tag}-${n}.png` });
  const kake = () => p.$$eval('#hero .hr-kake > *', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  await drain();
  // 足軽大将にして、金を持たせる
  await p.evaluate(() => { const s = window.__hero; s.generals[s.hero.id].rank = 2; s.hero.gold = 3000; s.hero.fame = 40; });
  // 1. 召し抱え（主従の盃）: 城下の浪人を一人、親しくして召し抱える
  const rn = await p.evaluate(() => { const s = window.__hero; const g = Object.values(s.generals).find((x) => x.status === 'ronin' && !x.clan); if (!g) return null; g.loc = s.hero.town; s.hero.rel[g.id] = 100; s.hero.met = { ...(s.hero.met ?? {}), [g.id]: s.turn }; return { id: g.id, name: g.name }; });
  let oath = [];
  for (let i = 0; i < 6 && rn && !oath.some((x) => x.includes('[主従の盃]')); i++) {
    await closeAll(); await p.click('#hero [data-h="pane"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(150);
    await p.click(`#hero [data-h="meet"][data-id="${rn.id}"]`).catch(() => {}); await p.waitForTimeout(150);
    const k = await p.$('#hero [data-h="kakae"]:not([disabled])'); if (!k) { console.log(vp.tag, '召し抱えのボタンがない'); break; }
    await k.click(); await p.waitForTimeout(300); await idle();
    if (await p.evaluate((id) => window.__hero.hero.retainers?.includes(id), rn.id)) { await closeAll(); await p.waitForTimeout(200); if (vp.tag === 'sp' && await scene()) await shot('1-oath'); oath = await drain(); if (!oath.length) { await rest(); oath = await drain(); } }
    else await p.evaluate((id) => { window.__hero.hero.rel[id] = 100; window.__hero.hero.jun = 0; }, rn.id);
  }
  console.log(vp.tag, '召し抱え:', rn?.name, oath.join(' ／ '));
  if (!oath.some((x) => x.includes('[主従の盃]'))) errors.push(vp.tag + ' 主従の盃が出ない');
  // 2. 持ち場の言い渡し → 合戦 → 家臣の一言、与吉の初首
  await p.evaluate(() => { const s = window.__hero; s.hero.yk = { battles: 2 }; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: true, foe: f.id, foeName: '今川家', lead: false, yori: true }; });
  let mochi = [];
  for (let i = 0; i < 6 && !(await p.$('[data-h="ban-go"]')); i++) { await rest(); mochi.push(...await drain('senjin')); }
  console.log(vp.tag, '持ち場:', mochi.filter((x) => x.includes('[持ち場]')).join(' ／ '));
  if (!mochi.some((x) => x.includes('[持ち場]'))) errors.push(vp.tag + ' 持ち場の場面が出ない');
  if (await p.$('[data-h="ban-go"]')) {
    await p.click('[data-h="ban-go"]'); await p.waitForTimeout(300); await read();
    for (let k = 0; k < 30 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(100);
    await p.evaluate(() => { const bn = window.__ban.b; for (const q of bn.pieces) if (q.side === 'foe') { q.hp = 1; q.atk = 1; } });
    await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); await p.click('#ban [data-b="close"]').catch(() => {}); await p.waitForTimeout(400);
    const after = await kake(); console.log(vp.tag, '合戦の後:', after.join(' ／ '));
    if (!after.some((x) => x.includes('初めての首'))) errors.push(vp.tag + ' 与吉の初首が出ない');
    await shot('2-after');
  }
  // 3. 与吉に組を預けるか（四戦を越えて）
  await p.evaluate(() => { const s = window.__hero; s.hero.yk = { ...(s.hero.yk ?? {}), battles: 5, kubi: true, hurt: true }; const f = Object.values(s.generals).find((g) => g.clan === 'imagawa' && g.status !== 'dead'); s.hero.battle = { turn: s.turn, won: true, foe: f.id, foeName: '今川家', lead: false, yori: true }; });
  for (let i = 0; i < 6 && !(await p.$('[data-h="ban-go"]')); i++) { await rest(); await drain(); }
  if (await p.$('[data-h="ban-auto"]')) { await p.click('[data-h="ban-auto"]'); await p.waitForTimeout(300); }
  let yo = []; for (let i = 0; i < 3 && !yo.some((x) => x.includes('権六の願い')); i++) { await rest(); await closeAll(); await p.waitForTimeout(200); if (await scene() && vp.tag === 'sp') await shot('3-yokichi'); yo.push(...await drain('yes')); }
  console.log(vp.tag, '与吉:', yo.filter((x) => x.includes('権六の願い')).join(' ／ '), JSON.stringify(await p.evaluate(() => window.__hero.hero.yk)));
  if (!(await p.evaluate(() => window.__hero.hero.yk?.kumi))) errors.push(vp.tag + ' 与吉に組を預けられない');
  // 4. 小競り合い（夜討ち）
  await closeAll();
  await p.evaluate(() => { const s = window.__hero; s.hero.quest = { kind: 'zeriai', castle: s.hero.town, need: 1, done: 0, until: s.turn + 3, sub: 'youchi', target: 'imagawa' }; s.hero.jun = 0; });
  await p.click('#hero [data-h="pane"][data-id="spots"]').catch(() => {}); await p.waitForTimeout(150);
  await p.click('#hero [data-h="work"]'); await p.waitForTimeout(300);
  if (vp.tag === 'sp' && await scene()) await shot('4-zeri');
  const zi = await read(); console.log(vp.tag, '小競り合いの前:', zi.join(' ／ '));
  if (!zi.some((x) => x.includes('[小競り合い]'))) errors.push(vp.tag + ' 小競り合いの前の場面が出ない');
  for (let k = 0; k < 30 && !(await p.$('#ban:not([hidden])')); k++) await p.waitForTimeout(100);
  const gv = await p.$$eval('.ban-shout', (es) => es.map((e) => e.textContent)); console.log(vp.tag, '始まりの声:', gv.join('・'));
  if (!gv.some((x) => x.includes('夜討ち'))) errors.push(vp.tag + ' 夜討ちの声が出ない');
  await p.click('#ban [data-b="auto"]'); await p.waitForTimeout(300); await p.click('#ban [data-b="close"]').catch(() => {}); await p.waitForTimeout(400);
  const zo = await kake(); console.log(vp.tag, '小競り合いの後:', zo.join(' ／ '));
  if (!zo.length) errors.push(vp.tag + ' 小競り合いの後の一言が出ない');
  await idle(); await drain();
  // 5. 扶持が払えない → 暇乞い
  let lv = [];
  for (let i = 0; i < 18 && !lv.some((x) => x.includes('[暇乞い]')); i++) { await p.evaluate(() => { window.__hero.hero.gold = -2000; }); await rest(); lv.push(...await drain()); if (!(await p.evaluate(() => window.__hero.hero.retainers?.length))) break; }
  console.log(vp.tag, '暇乞い:', lv.filter((x) => x.includes('[暇乞い]')).join(' ／ '));
  if (!lv.some((x) => x.includes('[暇乞い]'))) errors.push(vp.tag + ' 暇乞いが出ない');
  await p.close();
}
console.log('errors', errors); await b.close();

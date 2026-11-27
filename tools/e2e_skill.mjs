// 技能と体力: 柴田勝家で始め、頭の欄の体力・師事の候補・師事する・屋敷の技能の欄・病の間は休むことしかできない
// 使い方: node tools/e2e_skill.mjs <画像の出力先>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2];
const b = await chromium.launch(); const errors = [];
const p = await b.newPage({ viewport: { width: 1360, height: 820 } });
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(400);
await p.click('[data-act=\"t-hero\"]'); await p.waitForTimeout(300);
await p.click('#title [data-act="pick-scen"][data-id="1560"]'); await p.waitForTimeout(400); await p.click('[data-h="pclan"][data-id="oda"]'); await p.waitForTimeout(200); await p.click('[data-h="pick"][data-id="niwa_nagahide"]'); await p.waitForTimeout(300);
console.log('head:', (await p.$eval('#hero .hr-stats', (e) => e.textContent.replace(/\s+/g, ' '))));
await p.click('#hero [data-h="spot"][data-id="dojo"]'); await p.waitForTimeout(150); await p.screenshot({ path: `${out}/sk-0-dojo.png` });
console.log('studies:', (await p.$$eval('#hero [data-h="study"]', (es) => es.map((e) => e.textContent.slice(0, 30) + (e.disabled ? '×' : '')))).join(' | '));
const st = await p.$('#hero [data-h="study"]:not([disabled])'); if (st) { await st.click(); await p.waitForTimeout(200); console.log('study:', await p.$eval('#hero .hr-text', (e) => e.textContent)); }
await p.screenshot({ path: `${out}/sk-1.png` });
await p.click('#hero [data-h="say-close"]').catch(() => {}); 
await p.click('#hero [data-h="pane"][data-id="yashiki"]'); await p.waitForTimeout(150);
const findAct = async (sel) => { const n = (await p.$$('#hero [data-h="meet"]')).length; for (let i = 0; i < n; i++) { const ms = await p.$$('#hero [data-h="meet"]'); if (!ms[i]) break; await ms[i].click(); await p.waitForTimeout(60); const e = await p.$(sel); if (e) return e; const c = await p.$('#hero [data-h="dlg-close"]'); if (c) await c.click(); await p.waitForTimeout(40); } return null; };
{ const meets = await p.$$eval('#hero [data-h="meet"]', (es) => es.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 40)).filter((x) => x.includes('名人'))); console.log('masters:', meets.join(' | ')); }
{ const mrow = await p.$('#hero [data-h="meet"][data-id="niwa_nagahide"]'); if (mrow) { await mrow.click(); await p.waitForTimeout(100); await p.screenshot({ path: `${out}/sk-1b-meet.png` }); console.log('dlg acts:', (await p.$$eval('#hero .hr-dlg .hr-dacts button', (es) => es.map((e) => e.textContent + (e.disabled ? '×' : '')))).join(' | ')); await p.click('#hero .hr-dlg [data-h="visit"]'); await p.waitForTimeout(150); const c = await p.$('#hero [data-h="say-close"]'); if (c) await c.click(); }
  await p.click('#hero [data-h="pane"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(100);
  const m = await findAct('#hero [data-h="mstudy"]:not([disabled])'); if (m) { await m.click(); await p.waitForTimeout(200); console.log('mstudy:', await p.$eval('#hero .hr-say', (e) => e.textContent.replace(/\s+/g, ' '))); await p.screenshot({ path: `${out}/sk-2-master.png` }); const c = await p.$('#hero [data-h="say-close"]'); if (c) await c.click(); await p.click('#hero [data-h="pane"][data-id="yashiki"]').catch(() => {}); await p.waitForTimeout(100); } else console.log('no enabled master'); }
console.log('skills:', await p.$$eval('#hero .hr-pane .hr-note', (es) => es.map((e) => e.textContent).find((x) => x.includes('技能'))));
// 病の止め: 保存を書き換えて病に
await p.evaluate(() => { const k = 'sengoku-hero-auto'; const s = JSON.parse(localStorage.getItem(k)); s.generals[s.hero.id].sick = 2; localStorage.setItem(k, JSON.stringify(s)); });
await p.reload(); await p.waitForTimeout(400); await p.click('[data-act="t-continue"]'); await p.waitForTimeout(200); await p.waitForTimeout(100); /* 続きからはタイトルの「続きから」で */ await p.waitForTimeout(300);
console.log('sick head:', (await p.$eval('#hero .hr-stats', (e) => e.textContent.replace(/\s+/g, ' '))).slice(0, 80));
await p.click('#hero [data-h="spot"][data-id="tojo"]'); await p.waitForTimeout(150); console.log('sick tojo:', await p.$eval('#hero .hr-text', (e) => e.textContent));
await p.click('#hero [data-h="rest"]'); await p.waitForTimeout(300); console.log('sick rest:', await p.$eval('#hero .hr-text', (e) => e.textContent));
console.log('errors', errors); await b.close();

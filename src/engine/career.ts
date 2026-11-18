// 武将で遊ぶ: 出世の階段（物語の外の遊び）。節目を越えるたびに、持つもの・治めるものが増え、最後は隠居か死で一生を締める
// 節目: 家を立てる（侍大将）→ 城を預かる（城持ち）→ 国持ち（二城目・宿老）→ 家中第一の臣（覚えが極まる）
// 物語（前田利家 ― 残り火）の間は使わない（物語が同じものを場面として持っている）
import type { Beat } from '../data/story_toshiie';
import { hexDist } from './map';
import { newIe } from './maeda';
import { addMerit } from './ranks';
import * as R from './rules';
import { addLog, castleKoku, clanCastles, clanName, garrisonMax, rand } from './state';
import { delegateOf } from './delegate';
import { addFame, fameOf, followersOf, serviceChance, serviceRank } from './roninplay';
import { followersToRetainers, retainersToFollowers, yoriki } from './kashin';
import type { Castle, GameState } from './types';

export type Step = 'ie' | 'shiro' | 'kuni' | 'hitto';
export const STEP_NAME: Record<Step, string> = { ie: '家を立てる', shiro: '城を預かる', kuni: '国持ち', hitto: '家中第一の臣' };
export const CAREER = {
  SHIRO_MERIT: 180, SHIRO_FAVOR: 60, // 城を預かる: 侍大将で、功績180・覚え60
  KUNI_MONTHS: 12, KUNI_CHIAN: 60, KUNI_FAVOR: 70, // 国持ち: 宿老で、城を一年持ち、治安60・覚え70
  HITTO_FAVOR: 95, HITTO_MERIT: 900, HITTO_MONTHS: 24, // 家中第一の臣: 国持ちになって2年、覚え95・功績900
  CHIGYO: 12, // 知行: 治める城の石高1万石ごとに、月に金12貫（俸禄に加えて）
  RETIRE_AGE: 50, // この年からは隠居できる（国持ちになれば年に関わらず）
};
export const freeHero = (s: GameState) => !!s.hero && s.hero.story !== 'toshiie';
const stepsOf = (s: GameState) => (s.hero!.career ??= { steps: [] }).steps;
export const hasStep = (s: GameState, k: Step) => stepsOf(s).includes(k);
const ageOf = (s: GameState) => { const g = s.generals[s.hero!.id]; return s.year - (g.born ?? s.year - 30); };
const famOf = (s: GameState) => s.generals[s.hero!.id].name.slice(0, 2);
export const houseName = (s: GameState) => `${famOf(s)}家`;
const domain = (s: GameState) => { const H = s.hero!; return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])].map((i) => s.castles[i]); };

// 次の節目と、そこまでに足りないもの（画面の「目標」）
export function goalText(s: GameState): string {
  const H = s.hero!, me = s.generals[H.id];
  if (!freeHero(s)) return '';
  if (!me.clan) return `浪人の身。名を上げ、大名の城下で仕官を願うか、配下と手勢を集めて国衆の城で旗揚げする（名声${fameOf(s)}・配下${followersOf(s).length}・手勢${H.ie?.shu ?? 0}。これまでの到達: ${topOf(s)}）`;
  if (!hasStep(s, 'ie')) return `侍大将に取り立てられ、自分の家を立てる（いま${R.RANK_NAME[me.rank]}・功績${Math.round(me.merit)}／${R.MERIT_AT[1]}）`;
  if (!hasStep(s, 'shiro')) return `城を預かる（功績${Math.round(me.merit)}／${CAREER.SHIRO_MERIT}・主君の覚え${H.favor}／${CAREER.SHIRO_FAVOR}。登城して願い出るか、主君から声がかかる）`;
  if (!hasStep(s, 'kuni')) { const c = domain(s)[0], held = H.career!.since !== undefined ? s.turn - H.career!.since : 0; return `国持ちになる（宿老に上がり${me.rank === 0 ? '済み' : 'まだ'}・${c ? `${c.name}を${Math.min(held, CAREER.KUNI_MONTHS)}／${CAREER.KUNI_MONTHS}か月持ち、治安${Math.round(c.chian)}／${CAREER.KUNI_CHIAN}` : '城を取り戻す'}・覚え${H.favor}／${CAREER.KUNI_FAVOR}）`; }
  if (!hasStep(s, 'hitto')) return `家中第一の臣となる（国持ちになって${Math.min(CAREER.HITTO_MONTHS, s.turn - (H.career!.kuniAt ?? s.turn))}／${CAREER.HITTO_MONTHS}か月・主君の覚え${H.favor}／${CAREER.HITTO_FAVOR}・功績${Math.round(me.merit)}／${CAREER.HITTO_MERIT}）`;
  return '登り詰めた。家と国を持たせ、いずれ隠居して家を譲る';
}

// 城を選ぶ: 主君の本城でない自家の城で、近いものから（国持ちでは一つ目の城の近く）
function pickCastle(s: GameState, near?: Castle): Castle | null {
  const H = s.hero!, me = s.generals[H.id], L = me.clan ? s.clans[me.clan].leader : null;
  const seat = L ? s.generals[L].loc : -1;
  const taken = new Set(domain(s).map((c) => c.i));
  const from = near ?? s.castles[H.town];
  const cs = clanCastles(s, me.clan!).filter((c) => c.i !== seat && !taken.has(c.i));
  cs.sort((a, b) => hexDist(a.hex, from.hex) - hexDist(b.hex, from.hex) || castleKoku(b) - castleKoku(a));
  return cs[0] ?? null;
}
const lordId = (s: GameState) => { const me = s.generals[s.hero!.id]; return me.clan ? s.clans[me.clan].leader : null; };

export interface CareerEvent { beats: Beat[]; lines: string[] }
// 毎月: 節目を越えたか（越えたら場面と言葉を返す）。治める城を失ったら外す
export function careerMonth(s: GameState): CareerEvent | null {
  if (!freeHero(s)) return null;
  const H = s.hero!, me = s.generals[H.id], car = (H.career ??= { steps: [] });
  if (!me.clan || me.status === 'dead') return null;
  // 治める城を失った
  for (const c of domain(s)) if (c.owner !== me.clan) {
    if (H.fuchu === c.i) { H.fuchu = H.ryo?.shift(); car.since = H.fuchu !== undefined ? s.turn : undefined; } else H.ryo = (H.ryo ?? []).filter((i) => i !== c.i);
    H.favor = Math.max(0, H.favor - 15);
    // 治める城を全部失ったら、城を預かるところから登り直す（越えた節目は「これまでの到達」に残す）
    if (H.fuchu === undefined) { car.lostAt = s.turn; car.best = [...new Set([...(car.best ?? []), ...car.steps])]; car.steps = car.steps.filter((k) => k === 'ie'); car.kuniAt = undefined; H.title = undefined; }
    return { beats: [], lines: [`預かっていた${c.name}を敵に奪われた。主君の覚え−15。${H.fuchu === undefined ? '治める城がなくなった。また手柄を立てれば、城を預けられる。' : ''}`] };
  }
  const L = lordId(s), lord = L ? s.generals[L] : null, fam = houseName(s);
  if (!hasStep(s, 'ie') && me.rank <= 1) {
    car.steps.push('ie'); H.ie ??= newIe(); addFame(s, 5);
    return { beats: [
      { kind: 'door', head: '家を立てる', text: '家を立てる', sub: `${s.year}年` },
      { head: '屋敷', bg: 'zashiki_day', text: `侍大将に取り立てられた。もう一人の槍ではない。手勢を抱え、蔵を持ち、家中を養う。${fam}は、ここから家になる。` },
      ...(lord ? [{ who: lord.id, bg: 'zashiki_day', text: `${me.name}。これからは、そなたの家の者もまた、わが家の者よ。よう養え` }] : []),
      { who: 'ie_karo', bg: 'zashiki_day', text: '殿。家の帳面、本日よりお預かりいたします。……何が足りぬか、と仰せなら、全部にございます' },
      { who: me.id, bg: 'zashiki_day', text: '面倒だな' },
    ], lines: [`${fam}を立てた。手勢${H.ie.shu}・蔵${H.ie.kura}石。城下の「家中の進言」で家のことを決められる`] };
  }
  if (hasStep(s, 'ie') && !hasStep(s, 'shiro') && me.rank <= 1 && me.merit >= CAREER.SHIRO_MERIT && H.favor >= CAREER.SHIRO_FAVOR && s.turn - (car.lostAt ?? -99) >= 12) { // 城を失って1年は預けられない
    const c = pickCastle(s);
    if (!c) return null;
    return grantShiro(s, c);
  }
  if (hasStep(s, 'shiro') && !hasStep(s, 'kuni') && me.rank === 0 && H.fuchu !== undefined && car.since !== undefined && s.turn - car.since >= CAREER.KUNI_MONTHS && s.castles[H.fuchu].chian >= CAREER.KUNI_CHIAN && H.favor >= CAREER.KUNI_FAVOR) {
    const c = pickCastle(s, s.castles[H.fuchu]);
    if (!c) return null;
    car.steps.push('kuni'); car.kuniAt = s.turn; addFame(s, 12); (H.ryo ??= []).push(c.i); addMerit(s, me.id, 40); H.gold += 1000;
    if (H.ie) H.ie.kachu = Math.min(100, H.ie.kachu + 5);
    H.title = `国持ち（${s.castles[H.fuchu].name}・${c.name}）`;
    addLog(s, `${me.name}が${c.name}も預かり、国持ちとなった。`, 'info', true);
    return { beats: [
      { kind: 'door', head: '国持ち', text: '国持ち', sub: `${s.year}年` },
      { head: c.name, bg: 'ishigaki', text: `${s.castles[H.fuchu].name}に加えて、${c.name}を預かった。城を持つのではない。城で国を持つ。背中が、また一つ増えた。` },
      ...(lord ? [{ who: lord.id, bg: 'zashiki_day', text: `${me.name}。そなたの城は、よう持っておる。……ならば、もう一つ持て` }] : []),
      { who: me.id, bg: 'zashiki_day', text: '持たせます' },
    ], lines: [`${c.name}も治める城に加わった（国持ち。功績+40・金1000貫）`] };
  }
  if (hasStep(s, 'kuni') && !hasStep(s, 'hitto') && s.turn - (car.kuniAt ?? s.turn) >= CAREER.HITTO_MONTHS && H.favor >= CAREER.HITTO_FAVOR && me.merit >= CAREER.HITTO_MERIT) {
    car.steps.push('hitto'); addFame(s, 15); H.title = `家中第一の臣（${H.title ?? ''}）`;
    addLog(s, `${me.name}は${clanName(s, me.clan)}家の家中第一の臣と目されるようになった。`, 'info', true);
    return { beats: [
      { kind: 'door', head: '家中第一の臣', text: '家中第一の臣', sub: `${s.year}年` },
      { head: '広間', bg: 'zashiki_day', text: `評定の座で、${me.name}の名が真っ先に呼ばれるようになった。主君は決める前に、まず${me.name}の顔を見る。槍で始まった一生が、いつの間にか、家そのものを支える柱になっていた。` },
      ...(lord ? [{ who: lord.id, bg: 'zashiki_day', text: `${me.name}。そなたがおれば、この家は持つ` }] : []),
    ], lines: [`${clanName(s, me.clan)}家の家中第一の臣となった。これより上の節目はない。家と国を持たせ、いずれ隠居して家を譲る`] };
  }
  return null;
}
// 城を預かる（主君から声がかかるか、登城して願い出る）
export function grantShiro(s: GameState, c: Castle): CareerEvent {
  const H = s.hero!, me = s.generals[H.id], car = (H.career ??= { steps: [] }), L = lordId(s), lord = L ? s.generals[L] : null;
  const first = !(car.best ?? []).includes('shiro'); // 褒美は初めて城を預かった時だけ
  car.steps.push('shiro'); H.fuchu = c.i; car.since = s.turn; if (first) addFame(s, 8);
  const sv = (H.sv ??= {}); sv.fchian = c.chian; sv.fember = c.ember ?? 0; sv.fturn = s.turn;
  H.title = `${c.name}城主`; if (first) { addMerit(s, me.id, 20); H.gold += 500; }
  c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * 0.5));
  addLog(s, `${me.name}が${c.name}を預かった。`, 'info', true);
  const yo = first ? yoriki(s) : null; // 初めて城を預かった時、主君が与力を一人預けてくれる
  return { beats: [
    { kind: 'door', head: '城を預かる', text: '城を預かる', sub: `${s.year}年` },
    ...(lord ? [{ head: '広間', who: lord.id, bg: 'zashiki_day', text: `${me.name}。${c.name}を預ける。……城は、落とすより持つ方が重いぞ` }] : []),
    { head: c.name, bg: 'ishigaki', text: `${c.name}。石垣も、櫓も、門も、昨日までは主君の城だった。今日からは、${me.name}が持たせる城だ。城の後ろには村があり、道があり、人がいる。` },
    { who: me.id, bg: 'ishigaki', text: '……広いな' },
  ], lines: [`${c.name}を預かった（城持ち${first ? '。功績+20・金500貫' : ''}）。${yo ? `与力として${yo.name}を預けられ、家臣に加わった。` : ''}城下で「国を治める」ができる。治めた城の石高に応じて知行が入る`] };
}
// 登城して城を願い出る（条件を満たしていれば）
export function canAskCastle(s: GameState) { const H = s.hero!, me = s.generals[H.id]; return freeHero(s) && hasStep(s, 'ie') && !hasStep(s, 'shiro') && me.rank <= 1 && me.merit >= CAREER.SHIRO_MERIT * 0.8 && H.favor >= CAREER.SHIRO_FAVOR - 10; }
// 知行: 治める城の石高に応じた月の収入（物語の外だけ）
export function chigyo(s: GameState): number {
  if (!freeHero(s)) return 0;
  const me = s.generals[s.hero!.id];
  return Math.round(domain(s).filter((c) => c.owner === me.clan).reduce((t, c) => t + castleKoku(c), 0) * CAREER.CHIGYO);
}

// 一生の締め（隠居・死・主家の滅亡）: どこまで登り、何を残したか
const ORDER: Step[] = ['ie', 'shiro', 'kuni', 'hitto'];
const bestOf = (s: GameState) => { const car = s.hero!.career; const all = [...(car?.steps ?? []), ...(car?.best ?? [])]; return ORDER.filter((k) => all.includes(k)); };
export const topOf = (s: GameState) => { const st = bestOf(s); return st.includes('hitto') ? '家中第一の臣' : st.includes('kuni') ? '国持ち' : st.includes('shiro') ? '一城の主' : st.includes('ie') ? '一家の主' : '槍一筋'; };
export function lifeSummary(s: GameState, how: 'retire' | 'death' | 'fall' | 'tenka'): string[] {
  const H = s.hero!, me = s.generals[H.id];
  const top = topOf(s);
  const dom = domain(s).filter((c) => c.owner === me.clan);
  const chian = dom.length ? Math.round(dom.reduce((t, c) => t + c.chian, 0) / dom.length) : null;
  const friends = Object.values(H.rel).filter((v) => v >= 70).length;
  const years = Math.floor((s.turn - 1) / 12);
  const verdict = top === '家中第一の臣' ? '主家の柱として名を残した。' : top === '国持ち' ? '国を持たせた大名として名を残した。' : top === '一城の主' ? '一城を預かる身として、家を後へつないだ。' : top === '一家の主' ? '侍大将として家を立て、後へつないだ。' : '槍一筋に生き、名を残した。';
  const serve = (H.career?.served ?? []).length ? `仕えた家: ${[...(H.career!.served ?? [])].join('・')}。` : '';
  const how0 = how === 'tenka' ? `主家の${clanName(s, me.clan ?? s.player)}家が天下を一つにした。${me.name}はその世を見届けた` : how === 'retire' ? `${me.name}は家督を譲って隠居した` : how === 'death' ? `${me.name}は世を去った` : `${clanName(s, me.clan ?? s.player)}家は滅んだ`;
  return [`${how0}（${s.year}年・${ageOf(s)}歳、${years}年を生きた）。到達: ${top}。${verdict}${serve}`,
    `功績${Math.round(me.merit)}・主君の覚え${H.favor}・果たした主命${H.done}${H.ie ? `・家中${H.ie.kachu}・手勢${H.ie.shu}` : ''}${chian !== null ? `・治めた城の治安${chian}` : ''}・友${friends}人`];
}
export const canRetire = (s: GameState) => freeHero(s) && !s.hero!.over && (ageOf(s) >= CAREER.RETIRE_AGE || hasStep(s, 'kuni'));
export function retire(s: GameState): string[] {
  const lines = lifeSummary(s, 'retire');
  s.hero!.over = lines.join('　');
  return lines;
}

// ───────── 浪人と仕官（主家が滅んだあと） ─────────
// 主家が滅べば浪人になる（物語の外）。治める城は失い、家（手勢・蔵・家中）は連れて行く。越えた節目は「これまでの到達」として残る
export function becomeRonin(s: GameState): string {
  const H = s.hero!, me = s.generals[H.id], car = (H.career ??= { steps: [] });
  const old = me.clan ? clanName(s, me.clan) : '';
  if (old) (car.served ??= []).includes(old) || car.served!.push(old);
  car.best = [...new Set([...(car.best ?? []), ...car.steps])];
  car.steps = car.steps.filter((k) => k === 'ie'); car.since = undefined; car.kuniAt = undefined;
  retainersToFollowers(s); // 家臣は配下になってついて来る
  me.clan = null; me.status = 'hero'; me.army = null; H.fuchu = undefined; H.ryo = []; H.quest = null; H.title = '浪人'; H.favor = 0; H.army = null;
  car.ronin = s.turn;
  // 世の中の月の処理は、生き残っている一番大きな家の側から回す（遊び手の家が滅んだままだと月が進まない）
  const big = Object.values(s.clans).filter((c) => c.alive && clanCastles(s, c.id).length).sort((a, b) => clanCastles(s, b.id).length - clanCastles(s, a.id).length)[0];
  if (big) { s.player = big.id; const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true; }
  return `${old}家は滅んだ。${me.name}は浪人となった。大名のいる城下で、仕官を願い出ることができる。`;
}
// 仕官を願える大名（この城下にいる当主）
export function lordHere(s: GameState): string | null {
  const H = s.hero!, me = s.generals[H.id];
  if (me.clan || H.field) return null;
  for (const c of Object.values(s.clans)) if (c.alive && c.leader && s.generals[c.leader]?.loc === H.town && s.generals[c.leader].status !== 'dead') return c.id;
  return null;
}
export function askService(s: GameState): { ok: boolean; text: string; who?: string; line?: string } {
  const H = s.hero!, me = s.generals[H.id], clan = lordHere(s);
  if (!clan) return { ok: false, text: 'この城下には仕官を願える大名がいない' };
  const C = s.clans[clan], L = s.generals[C.leader!];
  H.jun++;
  const tried = (H.career ??= { steps: [] }).tried ??= {};
  if (tried[clan] === s.turn) return { ok: true, who: L.id, line: '今日は会わぬ。', text: '門前で待たされたまま、日が暮れた。' };
  tried[clan] = s.turn;
  const p = serviceChance(s, clan);
  if (rand(s) < p) {
    const fol = followersOf(s);
    me.clan = clan; s.player = clan; me.status = 'hero'; H.career!.ronin = undefined;
    me.rank = Math.min(me.rank, serviceRank(s)); if (me.rank < 1) me.rank = 1; // 新参は侍大将まで
    me.merit = Math.max(me.merit, R.MERIT_AT[me.rank]);
    H.favor = 35 + Math.round(fameOf(s) / 4) + Math.min(3, H.kubi ?? 0) * 3; H.title = undefined; H.kubi = 0;
    const kept = followersToRetainers(s); // 配下は家臣に（上限まで）。あふれた者は主家の武将に
    for (const g of fol) if (!kept.includes(g.name)) { g.clan = clan; g.status = 'free'; g.loc = L.loc; g.rank = Math.max(2, g.rank); }
    H.followers = [];
    const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true; // 家の政は大名（AI）が行う
    addLog(s, `${me.name}が${C.name}家に仕官した。`, 'info', true);
    return { ok: true, who: L.id, line: fameOf(s) >= 40 ? `${me.name}か。名は聞いておる。……わが家で働け。` : `よかろう。働きしだいで取り立ててやる。`, text: `${C.name}家に仕官した（${R.RANK_NAME[me.rank]}）。主君は${L.name}。${fol.length ? `配下の${fol.map((g) => g.name).join('・')}も召し抱えられた。` : ''}` };
  }
  return { ok: true, who: L.id, line: fameOf(s) < 20 ? '聞かぬ名だな。……名を上げてから参れ。' : '今は浪人を抱える余裕はない。……また参れ。', text: `${C.name}家への仕官はかなわなかった（見込み${Math.round(p * 100)}%）。月を改めて、また願い出ることができる。` };
}

// 本体の処理（降伏・寝返りなど）で主人公の家が替わったとき: 遊び手の家をそちらへ移し、軍勢から外して主人公に戻す
export function followClan(s: GameState): string | null {
  const H = s.hero!, me = s.generals[H.id];
  if (!me.clan || me.clan === s.player || !s.clans[me.clan]?.alive) return null;
  const old = s.clans[s.player]?.name ?? '';
  if (old) { const car = (H.career ??= { steps: [] }); (car.served ??= []).includes(old) || car.served!.push(old); }
  s.player = me.clan;
  const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true;
  for (const a of Object.values(s.armies)) { if (a.main === me.id) { const st = (a.staff ?? []).shift(); if (st) a.main = st; } a.staff = (a.staff ?? []).filter((x) => x !== me.id); }
  for (const c of s.castles) if (c.governor === me.id) c.governor = null;
  me.status = 'hero'; me.army = null; H.army = null; H.fuchu = undefined; H.ryo = []; H.quest = null; H.favor = 30; H.title = undefined;
  return `${me.name}は${clanName(s, me.clan)}家に降った。`;
}

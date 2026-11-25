// 武将で遊ぶ: 出世の階段（物語の外の遊び）。節目を越えるたびに、持つもの・治めるものが増え、最後は隠居か死で一生を締める
// 節目: 家を立てる（侍大将）→ 城を預かる（城持ち）→ 国持ち（二城目・宿老）→ 家中第一の臣（覚えが極まる）
// 物語（前田利家 ― 残り火）の間は使わない（物語が同じものを場面として持っている）
import type { Beat } from '../data/story_toshiie';
import { hexDist } from './map';
import { pushKumi } from './kumiev';
import { newIe } from './maeda';
import { addMerit } from './ranks';
import * as R from './rules';
import { addLog, castleKoku, clanCastles, clanName, garrisonMax, hostile, rand, surnameOf } from './state';
import { splitClan } from './on';
import { afterRebel, pactArmies, pactCastles } from './plot';
import { lordHeirEvent } from './family';
import { lv } from './skill';
import { delegateOf } from './delegate';
import { dissolveCamp } from './jinbure';
import { recordRebel } from './tosyu';
import { addFame, fameOf, followersOf, serviceChance, serviceRank } from './roninplay';
import { followersToRetainers, retainersToFollowers, yoriki } from './kashin';
import type { Castle, FrontPolicy, Front, GameState } from './types';

export type Step = 'ie' | 'shiro' | 'kuni' | 'homen' | 'hitto';
export const STEP_NAME: Record<Step, string> = { ie: '家を立てる', shiro: '城を預かる', kuni: '国持ち', homen: '方面軍団長', hitto: '家中第一の臣' };
export const CAREER = {
  SHIRO_MERIT: 180, SHIRO_FAVOR: 60, // 城を預かる: 侍大将で、功績180・覚え60
  RETURN_MONTHS: 24, // 出奔した家に戻れるまで
  REGRANT_MONTHS: 6, REGRANT_FAVOR: 15, // 城を失った者の預け直し: 半年後、覚え45で（功績は問わない）
  KUNI_MONTHS: 12, KUNI_CHIAN: 60, KUNI_FAVOR: 70, // 国持ち: 宿老で、城を一年持ち、治安60・覚え70
  HOMEN_FAVOR: 85, HOMEN_KASHIN: 1, HOMEN_CASTLES: 5, // 方面軍団長: 国持ちで覚え85・家臣1人。主人公の城と近くの城をまとめて5城まで
  HITTO_FAVOR: 95, HITTO_MERIT: 900, HITTO_MONTHS: 24, // 家中第一の臣: 国持ちになって2年、覚え95・功績900
  CHIGYO: 12, // 知行: 治める城の石高1万石ごとに、月に金12貫（俸禄に加えて）
  RETIRE_AGE: 50, // この年からは隠居できる（国持ちになれば年に関わらず）
};
export const freeHero = (s: GameState) => !!s.hero && s.hero.story !== 'toshiie';
const stepsOf = (s: GameState) => (s.hero!.career ??= { steps: [] }).steps;
export const hasStep = (s: GameState, k: Step) => stepsOf(s).includes(k);
const ageOf = (s: GameState) => { const g = s.generals[s.hero!.id]; return s.year - (g.born ?? s.year - 30); };
const famOf = (s: GameState) => surnameOf(s.generals[s.hero!.id].name);
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
  if (!hasStep(s, 'homen') && !hasStep(s, 'hitto')) return `方面軍団長に任じられる（主君の覚え${H.favor}／${CAREER.HOMEN_FAVOR}・家臣${(H.retainers ?? []).length}／${CAREER.HOMEN_KASHIN}人）`;
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
  // 敵の城から遠い奥の城を先に（境の城ばかり預けると、すぐ奪われる）。同じくらいなら近い城・大きい城
  const foes = s.castles.filter((c) => c.owner && c.owner !== me.clan && hostile(s, me.clan!, c.owner));
  const depth = (c: Castle) => foes.length ? Math.min(...foes.map((f) => hexDist(f.hex, c.hex))) : 99;
  cs.sort((a, b) => Math.min(depth(b), R.hx(8)) - Math.min(depth(a), R.hx(8)) || hexDist(a.hex, from.hex) - hexDist(b.hex, from.hex) || castleKoku(b) - castleKoku(a));
  return cs[0] ?? null;
}
const lordId = (s: GameState) => { const me = s.generals[s.hero!.id]; return me.clan ? s.clans[me.clan].leader : null; };

export interface CareerEvent { beats: Beat[]; lines: string[] }
// 毎月: 節目を越えたか（越えたら場面と言葉を返す）。治める城を失ったら外す
export function careerMonth(s: GameState): CareerEvent | null {
  if (!freeHero(s)) return null;
  const H = s.hero!, me = s.generals[H.id], car = (H.career ??= { steps: [] });
  if (!me.clan || me.status === 'dead') return null;
  { const he = lordHeirEvent(s); if (he) return { lines: he.lines, beats: [
    { kind: 'door', head: '後事', text: '後事を託す', sub: `${s.year}年` },
    { head: '奥の間', who: he.lord, bg: 'zashiki_night', text: `${me.name}。……わしの跡を、そなたに頼みたい。家中で、そなた以外に任せられる者はおらぬ` },
    { who: me.id, bg: 'zashiki_night', text: '……過ぎたお言葉にございます' },
    { who: he.lord, bg: 'zashiki_night', text: 'わしが倒れたら、この家を頼む。……それまでは、まだわしの家だがな' },
  ] }; }
  // 治める城を失った
  for (const c of domain(s)) if (c.owner !== me.clan) {
    if (H.fuchu === c.i) { H.fuchu = H.ryo?.shift(); car.since = H.fuchu !== undefined ? s.turn : undefined; } else H.ryo = (H.ryo ?? []).filter((i) => i !== c.i);
    H.favor = Math.max(0, H.favor - 15);
    // 治める城を全部失ったら、城を預かるところから登り直す（越えた節目は「これまでの到達」に残す）
    if (H.fuchu === undefined) { car.lostAt = s.turn; car.lostKuni = car.steps.includes('kuni') || undefined; car.best = [...new Set([...(car.best ?? []), ...car.steps])]; car.steps = car.steps.filter((k) => k === 'ie'); car.kuniAt = undefined; H.title = undefined; }
    return { beats: [], lines: [`預かっていた${c.name}を敵に奪われた。主君の覚え−15。${H.fuchu === undefined ? `治める城がなくなった。半年たって主君の覚え${CAREER.SHIRO_FAVOR - CAREER.REGRANT_FAVOR}あれば、また城を預けられる${car.lostKuni ? '（国持ちだったので、二つの城を）' : ''}。` : ''}`] };
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
  const again = (car.best ?? []).includes('shiro'); // 一度城を持った者は、失っても半年で、覚えが少し低くても預け直される（功績は問わない）
  if (hasStep(s, 'ie') && !hasStep(s, 'shiro') && me.rank <= 1 && (again || me.merit >= CAREER.SHIRO_MERIT) && H.favor >= CAREER.SHIRO_FAVOR - (again ? CAREER.REGRANT_FAVOR : 0) && s.turn - (car.lostAt ?? -99) >= CAREER.REGRANT_MONTHS) {
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
  if (hasStep(s, 'kuni') && !hasStep(s, 'homen') && H.favor >= CAREER.HOMEN_FAVOR && (H.retainers ?? []).length >= CAREER.HOMEN_KASHIN) {
    const f = makeHomen(s);
    if (f) {
      car.steps.push('homen'); addFame(s, 10);
      return { beats: [
        { kind: 'door', head: '方面軍団長', text: '方面軍団長', sub: `${s.year}年` },
        ...(lord ? [{ head: '広間', who: lord.id, bg: 'zashiki_day', text: `${me.name}。そなたに、この方面を任せる。城も兵も、そなたの采配で動かせ。……わしの顔を見に来るのは、勝ってからでよい` }] : []),
        { who: me.id, bg: 'zashiki_day', text: '承りました' },
        { bg: 'jinmaku', text: `${f.castles.map((i) => s.castles[i].name).join('・')}。いくつもの城と、そこに詰める兵が、${me.name}の一言で動くようになった。家臣たちが、それぞれの軍勢を率いる。` },
      ], lines: [H.mode === 'ryoshu' ? `方面軍団長に任じられた（${f.castles.length}城）。方面の城が領に加わり、そこにいる主家の武将（${Object.values(s.generals).filter((g) => g.yoriki === me.id).map((g) => g.name).join('・') || 'なし'}）が与力として付いた。攻め先は、方面の近くの主家の敵なら自分で選べる` : `方面軍団長に任じられた（${f.castles.length}城）。城下の「方面の差配」で方針と攻略の目標を決める。家臣が方面の軍勢を率いる`] };
    }
  }
  if (hasStep(s, 'homen') && !hasStep(s, 'hitto') && s.turn - (car.kuniAt ?? s.turn) >= CAREER.HITTO_MONTHS && H.favor >= CAREER.HITTO_FAVOR && me.merit >= CAREER.HITTO_MERIT) {
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
  syncGovernor(s);
  c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * 0.5));
  addLog(s, `${me.name}が${c.name}を預かった。`, 'info', true);
  const yo = first ? yoriki(s) : null; // 初めて城を預かった時、主君が与力を一人預けてくれる
  pushKumi(s, { k: 'nyujo', c: c.i }); // 入城の場面（城下の出迎え）
  { const G = H as unknown as { gon?: object }; if (first && !G.gon) { G.gon = {}; pushKumi(s, { k: 'inkyo' }); } } // 権六の隠居の願い（初めて城を預かった時）
  let back = '';
  if (car.lostKuni && me.rank === 0) { // 国持ちだった者には、二つ目の城も預け直す（国持ちに戻る）
    const c2 = pickCastle(s, c);
    if (c2) { (H.ryo ??= []).push(c2.i); car.steps.push('kuni'); car.kuniAt = s.turn; H.title = `国持ち（${c.name}・${c2.name}）`; back = `${c2.name}も預け直され、国持ちに戻った。`; }
  }
  car.lostKuni = undefined;
  return { beats: [
    { kind: 'door', head: '城を預かる', text: '城を預かる', sub: `${s.year}年` },
    ...(lord ? [{ head: '広間', who: lord.id, bg: 'zashiki_day', text: `${me.name}。${c.name}を預ける。……城は、落とすより持つ方が重いぞ` }] : []),
    { head: c.name, bg: 'ishigaki', text: `${c.name}。石垣も、櫓も、門も、昨日までは主君の城だった。今日からは、${me.name}が持たせる城だ。城の後ろには村があり、道があり、人がいる。` },
    { who: me.id, bg: 'ishigaki', text: '……広いな' },
  ], lines: [`${c.name}を預かった（城持ち${first ? '。功績+20・金500貫' : ''}）。${yo ? `与力として${yo.name}を預けられ、家臣に加わった。` : ''}${back}城下で「国を治める」ができる。治めた城の石高に応じて知行が入る`] };
}
// 始めの身分を出世に映す（物語の外）: 侍大将以上は家を構えた所から、宿老と城主だった者は城持ちから始める。
// gov: 始める前にその武将が城主だった城（startHero で城主から外す前に拾っておく）
export const START = { FAVOR: [60, 45, 35, 30], GOLD: [1500, 600, 200, 200], FAME: [15, 8, 0, 0], SHU: [600, 300] };
export function startCareer(s: GameState, gov: number | null): string[] {
  if (!freeHero(s)) return [];
  const H = s.hero!, me = s.generals[H.id], out: string[] = [];
  if (!me.clan) return out;
  const car = (H.career ??= { steps: [] }), rk = Math.max(0, Math.min(3, me.rank));
  H.favor = START.FAVOR[rk]; H.gold = START.GOLD[rk]; if (START.FAME[rk]) addFame(s, START.FAME[rk]);
  if (rk <= 1) {
    car.steps.push('ie'); H.ie = { ...newIe(), shu: START.SHU[rk], kura: START.SHU[rk] * 2 };
    out.push(`${R.RANK_NAME[rk]}として${houseName(s)}を構えている（手勢${H.ie.shu}・蔵${H.ie.kura}石）`);
  }
  const L = s.clans[me.clan].leader, seat = L ? s.generals[L].loc : -1;
  const own = (i: number | null | undefined) => (i !== null && i !== undefined && s.castles[i].owner === me.clan && i !== seat ? s.castles[i] : null);
  const c = rk <= 1 ? own(gov) ?? (rk === 0 ? own(me.loc) ?? pickCastle(s) : null) : null;
  if (c) {
    car.steps.push('shiro'); H.fuchu = c.i; car.since = s.turn; H.title = `${c.name}城主`;
    const sv = (H.sv ??= {}); sv.fchian = c.chian; sv.fember = c.ember ?? 0; sv.fturn = s.turn;
    c.garrison = Math.max(c.garrison, Math.round(garrisonMax(c) * 0.5));
    out.push(`${c.name}を預かっている（城持ち）`);
  }
  car.best = [...car.steps]; // 始めからの節目には、取り立ての褒美を出さない
  syncGovernor(s);
  return out;
}
// 登城して城を願い出る（条件を満たしていれば）
export function canAskCastle(s: GameState) { const H = s.hero!, me = s.generals[H.id]; return freeHero(s) && hasStep(s, 'ie') && !hasStep(s, 'shiro') && me.rank <= 1 && me.merit >= CAREER.SHIRO_MERIT * 0.8 && H.favor >= CAREER.SHIRO_FAVOR - 10; }
// 知行: 治める城の石高に応じた月の収入（物語の外だけ）
export function chigyo(s: GameState): number {
  if (!freeHero(s)) return 0;
  const me = s.generals[s.hero!.id];
  return Math.round(domain(s).filter((c) => c.owner === me.clan).reduce((t, c) => t + castleKoku(c), 0) * CAREER.CHIGYO * (1 + lv(s, 'sanjutsu') * 0.05)); // 算術一段ごとに5%
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
  syncGovernor(s); // 預かっていた城の城主を外す
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
// 家に仕える（願い出た仕官と、誘いを受けた時）。配下は家臣に（枠を超えた者は預け）
export function joinClan(s: GameState, clan: string, rank: number): { kept: string[]; az: string[] } {
  const H = s.hero!, me = s.generals[H.id], C = s.clans[clan], L = s.generals[C.leader!];
  const fol = followersOf(s);
  me.clan = clan; s.player = clan; me.status = 'hero'; H.career!.ronin = undefined;
  me.rank = Math.min(me.rank, rank); if (me.rank < 1) me.rank = 1; // 新参は侍大将まで
  me.merit = Math.max(me.merit, R.MERIT_AT[me.rank]);
  H.favor = 35 + Math.round(fameOf(s) / 4) + Math.min(3, H.kubi ?? 0) * 3; H.title = undefined; H.kubi = 0;
  const kept = followersToRetainers(s); // 配下は家臣に（上限まで）。あふれた者は主家の武将に
  const az: string[] = [];
  for (const g of fol) if (!kept.includes(g.name)) { g.clan = clan; g.status = 'free'; g.loc = L.loc; g.rank = Math.max(2, g.rank); (H.azuke ??= []).push(g.id); az.push(g.name); } // 枠を超えた者は預け（主家の直臣として仕え、枠が空けば呼び戻せる）
  H.followers = [];
  const d = delegateOf(s); for (const k of Object.keys(d) as (keyof typeof d)[]) d[k] = true; // 家の政は大名（AI）が行う
  addLog(s, `${me.name}が${C.name}家に仕官した。`, 'info', true);
  return { kept, az };
}
// bonus: 目通りの問答で、家の欲しい働きを答えれば上がる（roninkake.ts）
export function askService(s: GameState, bonus = 0): { ok: boolean; text: string; who?: string; line?: string; hired?: boolean } {
  const H = s.hero!, me = s.generals[H.id], clan = lordHere(s);
  if (!clan) return { ok: false, text: 'この城下には仕官を願える大名がいない' };
  const C = s.clans[clan], L = s.generals[C.leader!];
  H.jun++;
  const lf = H.career?.left;
  if (lf && lf.clan === clan && s.turn - lf.turn < CAREER.RETURN_MONTHS) { H.jun++; return { ok: true, who: L.id, line: '一度わが家を捨てた者を、また抱えると思うか。', text: `出奔した${C.name}家には、${CAREER.RETURN_MONTHS / 12}年は戻れない（あと${CAREER.RETURN_MONTHS - (s.turn - lf.turn)}か月）。` }; }
  const tried = (H.career ??= { steps: [] }).tried ??= {};
  if (tried[clan] === s.turn) return { ok: true, who: L.id, line: '今日は会わぬ。', text: '門前で待たされたまま、日が暮れた。' };
  tried[clan] = s.turn;
  const p = Math.max(0.05, Math.min(0.95, serviceChance(s, clan) + bonus));
  if (rand(s) < p) {
    const { kept, az } = joinClan(s, clan, serviceRank(s));
    return { ok: true, hired: true, who: L.id, line: fameOf(s) >= 40 ? `${me.name}か。名は聞いておる。……わが家で働け。` : `よかろう。働きしだいで取り立ててやる。`, text: `${C.name}家に仕官した（${R.RANK_NAME[me.rank]}）。主君は${L.name}。${kept.length ? `配下の${kept.join('・')}は家臣に。` : ''}${az.length ? `家臣の枠を超えた${az.join('・')}は${C.name}家に預けた（直臣として仕え、枠が空けば屋敷から呼び戻せる）。` : ''}${kept.length + az.length >= 2 ? '一党を率いての仕官として迎えられた。' : ''}` };
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
  { const car = (H.career ??= { steps: [] }); car.best = [...new Set([...(car.best ?? []), ...car.steps])]; car.steps = car.steps.filter((k) => k === 'ie'); car.since = undefined; car.kuniAt = undefined; car.lostAt = s.turn; } // 新しい主家では城を預かるところから（越えた節目は残る）
  if (homenOf(s)) s.fronts = (s.fronts ?? []).filter((f) => f.leader !== me.id);
  return `${me.name}は${clanName(s, me.clan)}家に降った。`;
}

// ───────── 本体の城主の欄: 主人公が預かった居城の城主は主人公（status は 'hero' のまま） ─────────
export function syncGovernor(s: GameState) {
  const H = s.hero; if (!H || H.story === 'toshiie') return;
  const me = s.generals[H.id];
  for (const c of s.castles) if (c.governor === H.id && (c.i !== H.fuchu || c.owner !== me.clan || !me.clan)) c.governor = null;
  if (H.fuchu === undefined || !me.clan || ['dead', 'captive', 'army', 'camp'].includes(me.status)) return; // 部隊を率いている間は城主の欄を空ける
  const c = s.castles[H.fuchu];
  if (c.owner !== me.clan || c.governor === H.id) return;
  if (c.governor) { const x = s.generals[c.governor]; if (x && x.status === 'governor') x.status = 'free'; } // 前の城主は待機に
  c.governor = H.id;
}
// ───────── 方面軍団長（本体の方面軍団＝知行の仕組みを使う） ─────────
export const homenOf = (s: GameState): Front | undefined => (s.fronts ?? []).find((f) => f.leader === s.hero?.id && !f.vacant);
function makeHomen(s: GameState): Front | null {
  const H = s.hero!, me = s.generals[H.id], clan = me.clan!;
  const ex = homenOf(s);
  if (ex && !ex.manual) return ex;
  if (clan !== s.player) return ex ?? null;
  const lordLoc = s.clans[clan].leader ? s.generals[s.clans[clan].leader!].loc : -1;
  const dom = domain(s).filter((c) => c.owner === clan);
  if (!dom.length) return null;
  const taken = new Set((s.fronts ?? []).flatMap((f) => f.castles));
  const near = clanCastles(s, clan).filter((c) => !dom.includes(c) && c.i !== lordLoc && !taken.has(c.i) && dom.some((d) => hexDist(d.hex, c.hex) <= R.hx(4))).sort((a, b) => Math.min(...dom.map((d) => hexDist(d.hex, a.hex))) - Math.min(...dom.map((d) => hexDist(d.hex, b.hex))));
  const castles = [...dom, ...near].slice(0, CAREER.HOMEN_CASTLES);
  if (ex) { // 領主の領を方面に広げる
    for (const c of castles) { for (const o of s.fronts ?? []) if (o !== ex) o.castles = o.castles.filter((i) => i !== c.i); if (!ex.castles.includes(c.i)) ex.castles.push(c.i); }
    giveYoriki(s, ex);
    addLog(s, `${me.name}が方面軍団長に任じられた（${ex.castles.map((i) => s.castles[i].name).join('・')}）。`, 'info', true);
    return ex;
  }
  const f: Front = { id: (s.nextFrontId = (s.nextFrontId ?? 0) + 1), leader: me.id, castles: castles.map((c) => c.i), policy: 'defend', target: null, seat: dom[0].i, gold: 0, food: 0 };
  for (const c of castles) for (const o of s.fronts ?? []) o.castles = o.castles.filter((i) => i !== c.i);
  (s.fronts ??= []).push(f);
  // 家臣は方面の侍大将として軍勢を率いる（主人公の陪臣として方面だけで使われる）
  for (const g of Object.values(s.generals)) if ((H.retainers ?? []).includes(g.id)) g.liege = me.id;
  addLog(s, `${me.name}が方面軍団長に任じられた（${castles.map((c) => c.name).join('・')}）。`, 'info', true);
  return f;
}
// 与力: 方面の城にいる主家の武将（主人公の家臣・当主・一門を除く）を方面軍団長に付ける
export function giveYoriki(s: GameState, f: Front): string[] {
  const H = s.hero!, me = s.generals[H.id], L = s.clans[me.clan!].leader, out: string[] = [];
  for (const g of Object.values(s.generals)) if (g.clan === me.clan && g.id !== me.id && g.id !== L && !g.kin && !g.liege && !g.yoriki && f.castles.includes(g.loc) && ['free', 'governor', 'camp', 'army'].includes(g.status)) { g.yoriki = me.id; out.push(g.name); }
  return out;
}
export function setHomenPolicy(s: GameState, p: FrontPolicy, target: string | null): string {
  const f = homenOf(s);
  if (!f) return '方面を任されていない';
  f.policy = p; f.target = p === 'attack' ? target : null;
  return `方面の方針を${R.FRONT_POLICY_NAME[p]}にした${f.target ? `（目標: ${f.target.startsWith('clan:') ? `${clanName(s, f.target.slice(5))}家` : s.castles[+f.target.slice(7)].name}）` : ''}。`;
}

// ───────── 謀反（独立）と出奔 ─────────
// 謀反: 治める城（方面軍団長なら方面の城と軍勢、率いている軍勢も）ごと主家を離れ、家を立てる。家臣（陪臣）はついて来る。成れば大名プレイへ
export function canRebel(s: GameState): string | null {
  const H = s.hero!, me = s.generals[H.id];
  if (!freeHero(s) || !me.clan) return '物語の外の、主家に仕える主人公だけ';
  if (!domain(s).some((c) => c.owner === me.clan)) return '治める城がなければ謀反は起こせない';
  if (H.field) return '城下にいる時だけ';
  const own = new Set([...domain(s).map((c) => c.i), ...(homenOf(s)?.castles ?? [])]);
  if (!own.has(H.town) || s.castles[H.town].owner !== me.clan) return '自分の治める城の城下で起こす';
  return null;
}
export function rebel(s: GameState): { ok: boolean; text: string; clan?: string; notes?: string[] } {
  const why = canRebel(s);
  if (why) return { ok: false, text: why };
  const H = s.hero!, me = s.generals[H.id], from = me.clan!;
  const f = homenOf(s);
  const cold = (gid: string | null | undefined) => { const g = gid ? s.generals[gid] : null; return !!g && g.yoriki === H.id && (H.rel[g.id] ?? 0) < 60; }; // 親しくない与力（ついて来ない）
  const castles = [...new Set([...(f?.castles ?? []).filter((i) => !cold(s.castles[i].governor)), ...domain(s).filter((c) => c.owner === from).map((c) => c.i), ...pactCastles(s)])]; // 約束した味方の城も。親しい与力（親しさ60から）の城もついて来る
  const armies = [...new Set([...Object.values(s.armies).filter((a) => a.clan === from && (a.heroLed || (f && a.front === f.id)) && !cold(a.main)), ...pactArmies(s)])];
  { const L0 = s.clans[from].leader, lordLoc = L0 ? s.generals[L0].loc : null; // 残る与力は主家の武将に（ついて行く城にいれば、主君の城へ）
    for (const g of Object.values(s.generals)) if (g.yoriki === H.id && cold(g.id)) {
      g.yoriki = undefined;
      for (const i of castles) if (s.castles[i].governor === g.id) s.castles[i].governor = null;
      for (const cp of Object.values(s.camps ?? {})) if (cp.main === g.id && cp.camp !== undefined && castles.includes(cp.camp)) dissolveCamp(s, cp); // 離れる城で率いていた軍団の名簿は解く
      if (castles.includes(g.loc) && lordLoc !== null && g.status !== 'army' && g.status !== 'camp') { g.status = 'free'; g.loc = lordLoc; }
    } }
  const lordName = s.clans[from].leader ? s.generals[s.clans[from].leader!].name : '';
  for (const id of H.retainers ?? []) { const g = s.generals[id]; if (g && g.clan === from && g.status !== 'dead' && g.status !== 'captive') g.liege = me.id; } // 家臣（一門の子も）は名簿から改めて主人公の陪臣にして、皆ついて来させる
  me.status = 'free';
  const id = splitClan(s, me, from, castles, armies, '謀反');
  if (!id) { me.status = 'hero'; return { ok: false, text: '謀反は成らなかった' }; }
  recordRebel(s, id, from, H.rel); // 旧主との因縁（大名になってから）
  for (const g of Object.values(s.generals)) if (g.liege === me.id && g.status !== 'dead') { g.clan = id; if (g.status === 'kashin') g.status = 'free'; g.liege = undefined; }
  (H.career ??= { steps: [] }).served = [...(H.career.served ?? []), clanName(s, from)];
  addFame(s, 10);
  const home = domain(s)[0]?.i ?? castles[0];
  for (const c of s.castles) if (c.governor === me.id) c.governor = null; // 当主になる（城主の欄は空ける）
  const notes = afterRebel(s, id, from, home);
  return { ok: true, clan: id, notes, text: `${clanName(s, from)}家（${lordName}）に背き、${castles.filter((i) => s.castles[i].owner === id).length}城を率いて${s.clans[id].name}家を立てた。${notes.join('')}` };
}
// 出奔: 主家に暇を乞い、家臣を連れて浪人になる（治める城は返す）
export function leaveLord(s: GameState): string {
  const H = s.hero!, me = s.generals[H.id], from = me.clan ? clanName(s, me.clan) : '';
  const f = homenOf(s); if (f) { s.fronts = (s.fronts ?? []).filter((x) => x !== f); for (const a of Object.values(s.armies)) if (a.front === f.id) a.front = undefined; }
  const L = me.clan && s.clans[me.clan].leader ? s.clans[me.clan].leader! : null;
  if (L) H.rel[L] = Math.max(0, (H.rel[L] ?? 0) - 30);
  const left = me.clan;
  const msg = becomeRonin(s);
  if (left) (H.career ??= { steps: [] }).left = { clan: left, turn: s.turn }; // 出奔した家には、二年は戻れない
  addLog(s, `${me.name}が${from}家を出奔した。`, 'info', true);
  return msg.replace(/^.*?家は滅んだ。/, `${from}家に暇を乞い、出奔した。`);
}

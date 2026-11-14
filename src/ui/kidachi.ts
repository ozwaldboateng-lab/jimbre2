// 起ちの場面: 家を選んで始めたときに流す、その家の紙芝居（本拠 → 当主の言葉 → 家中 → 四方の敵 → 最初の評定）
// どの家でもデータから組み立てる。主な家の当主には、史実に寄せた言葉を書き足してある
import type { OpeningBeat } from '../data/openings';
import { HEXES, PROVINCES, hexDist } from '../engine/map';
import { capital } from '../engine/ops';
import { clanPower, neighbors } from '../engine/diplomacy';
import { clanCastles, clanKoku, clanName, clanTroops, treatyOf } from '../engine/state';
import type { GameState, General } from '../engine/types';

const KEY = 'sengoku-kidachi';
export function kidachiOn() { try { const v = localStorage.getItem(KEY); return v ? v === 'on' : !navigator.webdriver; } catch { return true; } }
export function setKidachiOn(on: boolean) { try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* 記録できなくても続ける */ } }

// 主な家の当主の言葉（家のid → 言葉）。なければ年齢と家の大きさで決める
const LORD_LINE: Record<string, string> = {
  oda: 'うつけと笑う者は笑わせておけ。この尾張から、天下を塗り替えてやる。',
  takeda: '甲斐の山は険しく、米は少ない。ならば、外へ出るまでよ。風林火山の旗のもとに。',
  uesugi: '義のない戦はせぬ。だが、義のためならば、どこへでも兵を出そう。',
  hojo: '関東は北条の地。民を安んじ、ひとつひとつ城を固めてゆく。',
  mori: '一本の矢は折れても、三本束ねれば折れぬ。毛利は一つになって、中国を治める。',
  imagawa: '海道一の弓取りの名に恥じぬよう、駿河・遠江・三河を守り抜く。',
  matsudaira: 'ようやく岡崎に戻った。ここから、松平の家を立て直す。',
  saito: '美濃は豊かな国だ。この国を守る者は、天下に手が届く。',
  asakura: '越前の守りは固い。一乗谷の栄えを、末永く。',
  shimazu: '薩摩の兵は精強だ。九州を島津の旗で染めてみせよう。',
  otomo: '豊後から九州を見渡す。南蛮の船も、われらの力となろう。',
  chosokabe: '土佐の一領具足とともに、四国を一つにまとめる。',
  date: '奥州はまだ群雄の地。伊達がその上に立つ。',
  miyoshi: '京を押さえる者が天下を動かす。三好の世を続けるのだ。',
  honganji: '仏法を守るためならば、門徒は一つになって起つ。',
  azai: '北近江は小さな国だが、湖と街道を押さえておる。',
};

const homeLine = (st: GameState, clan: string) => {
  const cs = clanCastles(st, clan);
  const provs = [...new Set(cs.map((c) => PROVINCES[HEXES[c.hex].p].name))];
  return { cs, provs };
};

export function kidachiBeats(st: GameState): OpeningBeat[] {
  const me = st.clans[st.player];
  const lord = me.leader ? st.generals[me.leader] : null;
  const home = capital(st, st.player);
  if (!home) return [];
  const { cs, provs } = homeLine(st, st.player);
  const koku = clanKoku(st, st.player), age = lord?.born !== undefined ? st.year - lord.born : null;
  const beats: OpeningBeat[] = [];
  // 1. 本拠
  beats.push({ head: `${me.name}家`, text: `${provs.slice(0, 3).join('・')}${provs.length > 3 ? 'ほか' : ''}に城${cs.length}、${koku.toFixed(0)}万石、兵${clanTroops(st, st.player).toLocaleString('ja-JP')}。本拠は${home.name}。`, at: home.id, zoom: 1.8, light: [st.player], mark: [home.id] });
  // 2. 当主の言葉
  if (lord) {
    const line = LORD_LINE[st.player]
      ?? (age !== null && age < 25 ? '若輩と侮る者もおろう。だが、この家を背負うのはわしだ。見ておれ。'
        : age !== null && age >= 55 ? '残された時は長くない。この家を、より大きくして次へ渡さねばならぬ。'
        : cs.length <= 2 ? '小さな家だ。だが、小さいからこそ、機を見て動ける。'
        : koku >= 80 ? '大きな家を保つのは、攻めるより難しい。だが、守るだけでは終わらぬ。'
        : 'この乱世、待っていても道は開けぬ。こちらから動くまでだ。');
    beats.push({ who: lord.id, name: lord.name, label: `当主${age !== null ? `・${age}歳` : ''}`, text: line, at: home.id, zoom: 1.8, light: [st.player] });
  }
  // 3. 家中: 一門か宿老の筆頭
  const vassals = Object.values(st.generals).filter((g) => g.clan === st.player && g.id !== me.leader && g.status !== 'dead' && g.status !== 'young' && g.status !== 'captive' && !g.liege);
  const elder = [...vassals].sort((a, b) => a.rank - b.rank || Number(!!b.kin) - Number(!!a.kin) || (b.lea + b.int) - (a.lea + a.int))[0];
  if (elder) {
    const rival = (elder.bonds ?? []).some((x) => x.kind === 'rival' && st.generals[x.id]?.clan === st.player);
    const line = rival ? '殿、家中には足並みの揃わぬ者もおります。ご用心を。'
      : elder.kin ? '一門として、どこまでもお供いたしまする。'
      : vassals.length <= 6 ? '人は少のうございます。人材を集めることが肝要かと。'
      : '家臣一同、殿のお下知を待っておりまする。';
    beats.push({ head: '家中', text: `家臣は${vassals.length}人。筆頭は${elder.name}。`, at: home.id, zoom: 1.8, light: [st.player] }, { who: elder.id, name: elder.name, label: elder.kin ? '一門' : '重臣', text: line, at: home.id, zoom: 1.8, light: [st.player] });
  }
  // 4. 四方の敵
  const near = [...neighbors(st, st.player, 6)].filter((id) => st.clans[id]?.alive && id !== 'kokujin');
  const myP = clanPower(st, st.player);
  const allies = near.filter((id) => treatyOf(st, st.player, id));
  const foes = near.filter((id) => !treatyOf(st, st.player, id)).sort((a, b) => clanPower(st, b) - clanPower(st, a));
  const hunters = Object.values(st.clans).filter((c) => c.alive && c.target === st.player).map((c) => c.id);
  if (near.length) {
    const big = foes[0];
    const capOf = (id: string) => capital(st, id)?.id;
    const parts: string[] = [];
    if (big) { const r = clanPower(st, big) / Math.max(1, myP); parts.push(`${r >= 1 ? 'いちばんの脅威は' : '隣国でいちばん大きいのは'}${clanName(st, big)}家（国力は当家の${r.toFixed(1)}倍）`); }
    if (foes.length > 1) parts.push(`ほかに${foes.slice(1, 4).map((id) => clanName(st, id) + '家').join('・')}が境を接する`);
    if (hunters.length) parts.push(`${hunters.slice(0, 2).map((id) => clanName(st, id) + '家').join('・')}は当家を狙っている`);
    if (allies.length) parts.push(`${allies.map((id) => clanName(st, id) + '家').join('・')}とは結んでいる`);
    beats.push({ head: '四方の敵', text: `${parts.join('。')}。`, at: home.id, zoom: 1.1, light: [st.player, ...near], arrow: foes.slice(0, 3).map((id) => capOf(id)).filter((x): x is string => !!x).map((id) => [id, home.id] as [string, string]) });
  }
  // 5. 最初の評定: 当面の目当て（弱い隣国、なければ大きな隣国に備える）
  const dist = (id: string) => { const c = capital(st, id); return c ? hexDist(c.hex, home.hex) : 99; };
  const weak = foes.filter((id) => clanPower(st, id) < myP * 0.8).sort((a, b) => clanPower(st, a) / myP + dist(a) / 12 - (clanPower(st, b) / myP + dist(b) / 12))[0]; // 弱くて近い家
  const aim = weak ? `まずは${clanName(st, weak)}家を降し、足場を固める。` : foes[0] ? `${clanName(st, foes[0])}家に備えつつ、国を富ませて機を待つ。` : 'まずは国を富ませ、兵を養う。';
  beats.push({ head: '最初の評定', text: `${home.name}の広間に家臣が集う。${aim}`, bg: 'zashiki_day', at: home.id, zoom: 1.8 });
  if (lord) beats.push({ who: lord.id, name: lord.name, label: '当主', text: weak ? `${clanName(st, weak)}を取る。皆、支度にかかれ。` : '焦るな。だが、機が来たら迷うな。', bg: 'zashiki_day', at: home.id, zoom: 1.8 });
  void ((g: General) => g);
  return beats;
}

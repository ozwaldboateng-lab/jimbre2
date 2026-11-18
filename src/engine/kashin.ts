// 武将で遊ぶ: 主人公の家臣団（物語の外）。足軽大将から召し抱えられ、身分と節目で上限が増える。
// 家臣は主家に属したまま、主人公の家臣（status 'kashin'・liege＝主人公）として、大名のAIには使わせない。
// 使い道: 城代（城を空けている間の治め）・代わりに働かせる（使い番・物見・普請）・合戦（手勢を率いて働きを上げる）・家中の進言の担い手
import type { Act } from './hero';
import { hexDist } from './map';
import { addLog, clamp100, rand } from './kashin_util';
import type { GameState, General } from './types';

export const KASHIN = {
  FUCHI: 30, // 家臣一人の月の扶持（貫）
  SHITAKU: 100, // 召し抱える時の支度金
  REL: 50, // 召し抱えられる親しさ
  DAIKAN: { chian: 2, ember: 1 }, // 城代の毎月の治め（統率60で1倍）
  PROXY: ['tsukaiban', 'monomi', 'fushin'] as string[], // 家臣に任せられる主命
};
// 抱えられる人数: 足軽組頭0・足軽大将1・侍大将3・城持ち5・国持ち8
export function capOf(s: GameState): number {
  const H = s.hero!, me = s.generals[H.id], st = H.career?.steps ?? [];
  if (st.includes('kuni')) return 8;
  if (st.includes('shiro')) return 5;
  return [8, 3, 1, 0][me.rank] ?? 0;
}
export const retainersOf = (s: GameState): General[] => (s.hero?.retainers ?? []).map((id) => s.generals[id]).filter((g) => g && g.status !== 'dead');
export const freeRetainers = (s: GameState) => retainersOf(s).filter((g) => !Object.values(s.hero!.daikan ?? {}).includes(g.id) && s.hero!.quest?.proxy !== g.id);
const domain = (s: GameState) => { const H = s.hero!; return [...(H.fuchu !== undefined ? [H.fuchu] : []), ...(H.ryo ?? [])]; };
const home = (s: GameState) => { const d = domain(s); return d.length ? d[0] : s.hero!.town; };
export const canRecruit = (s: GameState, g: General) => { const H = s.hero!, me = s.generals[H.id]; return H.story !== 'toshiie' && !!me.clan && g.status === 'ronin' && g.loc === H.town && !H.followers?.includes(g.id); };

// 浪人を家臣に召し抱える（親しさ50・支度金・扶持）
export function recruit(s: GameState, gid: string): Act {
  const H = s.hero!, me = s.generals[H.id], g = s.generals[gid];
  if (!g || !canRecruit(s, g)) return { ok: false, text: 'その人は召し抱えられない' };
  if (retainersOf(s).length >= capOf(s)) return { ok: false, text: capOf(s) ? `家臣はいま${capOf(s)}人まで（出世すれば増やせる）` : '足軽大将になるまで家臣は持てない' };
  const rel = H.rel[gid] ?? 0;
  if (rel < KASHIN.REL) return { ok: false, text: `まだ親しくない（親しさ${rel}／${KASHIN.REL}）` };
  if (H.gold < KASHIN.SHITAKU) return { ok: false, text: `支度金${KASHIN.SHITAKU}貫が要る` };
  H.jun++;
  const p = 0.35 + (H.fame ?? 0) / 150 + me.cha / 300 + (rel - KASHIN.REL) / 150;
  if (rand(s) < Math.min(0.9, p)) {
    H.gold -= KASHIN.SHITAKU;
    take(s, g);
    return { ok: true, who: gid, line: 'よかろう。おぬしの家で、もう一度槍を振ろう。', text: `${g.name}を家臣に召し抱えた（家臣${retainersOf(s).length}／${capOf(s)}人。扶持は月${KASHIN.FUCHI}貫）。` };
  }
  H.rel[gid] = clamp100(rel - 5);
  return { ok: true, who: gid, line: '……今はまだ、宮仕えの気にはなれぬ。', text: `${g.name}は召し抱えに応じなかった。名を上げれば、聞いてくれるかもしれない。` };
}
// 家臣にする（召し抱え・与力・仕官に連れて来た配下）
export function take(s: GameState, g: General) {
  const H = s.hero!, me = s.generals[H.id];
  g.clan = me.clan; g.status = 'kashin'; g.liege = me.id; g.army = null; g.loc = home(s);
  for (const c of s.castles) if (c.governor === g.id) c.governor = null;
  if (!(H.retainers ??= []).includes(g.id)) H.retainers.push(g.id);
}
// 家臣を手放す（浪人に戻る）
export function release(s: GameState, gid: string, why = '') {
  const H = s.hero!, g = s.generals[gid];
  H.retainers = (H.retainers ?? []).filter((x) => x !== gid);
  for (const [k, v] of Object.entries(H.daikan ?? {})) if (v === gid) delete H.daikan![+k];
  if (g && g.status !== 'dead') { g.clan = null; g.status = 'ronin'; g.liege = undefined; }
  if (why) addLog(s, `${g?.name ?? ''}が${why}`, 'info', true);
}
// 与力: 城を預かった時、主君が家中の若い者を一人預けてくれる
export function yoriki(s: GameState): General | null {
  const H = s.hero!, me = s.generals[H.id];
  if (retainersOf(s).length >= capOf(s)) return null;
  const cand = Object.values(s.generals).filter((g) => g.clan === me.clan && g.status === 'free' && g.rank >= 2 && g.id !== me.id && !g.kin && !(s.clans[me.clan!].leader === g.id)).sort((a, b) => (b.bra + b.lea) - (a.bra + a.lea));
  const g = cand[0];
  if (!g) return null;
  take(s, g);
  return g;
}
// 城代を置く（家臣を一人、治める城に。空けている間、毎月見回る）
export function setDaikan(s: GameState, ci: number, gid: string | null) {
  const H = s.hero!;
  H.daikan ??= {};
  if (!gid) { delete H.daikan[ci]; return; }
  for (const [k, v] of Object.entries(H.daikan)) if (v === gid) delete H.daikan[+k];
  H.daikan[ci] = gid; const g = s.generals[gid]; if (g) g.loc = ci;
}
// 家臣を遣わして下の主命を果たさせる（翌月に首尾が出る）
export const canProxy = (s: GameState) => { const q = s.hero?.quest; return !!q && !q.proxy && q.done < q.need && KASHIN.PROXY.includes(q.kind) && freeRetainers(s).length > 0; };
export function proxy(s: GameState): Act {
  const H = s.hero!, q = H.quest!;
  if (!canProxy(s)) return { ok: false, text: '任せられる主命か家臣がいない' };
  const g = freeRetainers(s).sort((a, b) => (b.int + b.lea) - (a.int + a.lea))[0];
  q.proxy = g.id; q.proxyAt = s.turn; H.jun++;
  return { ok: true, who: g.id, line: 'お任せあれ。', text: `${g.name}を${s.castles[q.castle].name}へ遣わした。来月には首尾が分かる。` };
}

// 毎月: 扶持・城代の治め・遣わした家臣の首尾・家臣の居場所
export function kashinMonth(s: GameState): string[] {
  const H = s.hero;
  if (!H || H.story === 'toshiie') return [];
  const me = s.generals[H.id], out: string[] = [];
  const rs = retainersOf(s);
  H.retainers = rs.map((g) => g.id);
  if (!rs.length) return out;
  // 主家が替わった・浪人になった: 家臣はついて来る
  for (const g of rs) if (g.clan !== me.clan) { if (me.clan) { g.clan = me.clan; g.status = 'kashin'; } }
  // 扶持
  const cost = rs.length * KASHIN.FUCHI;
  if (H.gold >= cost) H.gold -= cost;
  else { H.gold = 0; const g = rs[rs.length - 1]; if (rand(s) < 0.5) { release(s, g.id, '扶持が払われず、暇を取った。'); out.push(`扶持が払えず、家臣の${g.name}が去った。`); } }
  // 城代の治め（主人公がその城下にいない月）
  for (const [k, gid] of Object.entries(H.daikan ?? {})) {
    const c = s.castles[+k], g = s.generals[gid];
    if (!c || !g || g.status === 'dead' || c.owner !== me.clan || !domain(s).includes(c.i)) { delete H.daikan![+k]; continue; }
    g.loc = c.i;
    if (H.town === c.i) continue;
    const f = g.lea / 60;
    c.chian = clamp100(c.chian + KASHIN.DAIKAN.chian * f); c.ember = Math.max(0, (c.ember ?? 0) - KASHIN.DAIKAN.ember * f);
  }
  // 遣わした家臣の首尾
  const q = H.quest;
  if (q?.proxy && q.proxyAt !== undefined && s.turn > q.proxyAt && q.done < q.need) {
    const g = s.generals[q.proxy];
    const p = 0.6 + ((g?.int ?? 50) + (g?.lea ?? 50)) / 500;
    if (g && rand(s) < p) { q.done = q.need; q.ok = true; q.note = `家臣の${g.name}が果たした。`; out.push(`遣わした${g.name}が主命（${q.kind === 'tsukaiban' ? '使い番' : q.kind === 'monomi' ? '物見' : '普請'}）を果たして戻った。登城して報告せよ。`); }
    else { q.proxy = undefined; out.push(`遣わした${g?.name ?? '家臣'}は首尾よくいかなかった。自分で行くか、また遣わすか。`); }
    if (g) g.loc = home(s);
  }
  // 城代でない家臣は、主人公の城（なければ主人公の町）に
  for (const g of rs) if (!Object.values(H.daikan ?? {}).includes(g.id) && q?.proxy !== g.id) g.loc = home(s);
  return out;
}
// 合戦: 陣に加わる時、家臣の統率で軍勢の士気が上がる（家臣一人ごと、統率に応じて最大+0.05、合わせて+0.15まで）
export function battleBoost(s: GameState): number {
  return Math.min(0.15, retainersOf(s).filter((g) => !Object.values(s.hero!.daikan ?? {}).includes(g.id)).reduce((t, g) => t + Math.min(0.05, g.lea / 1600), 0));
}
// 浪人になる時: 家臣は配下（仲間）になってついて来る
export function retainersToFollowers(s: GameState) {
  const H = s.hero!;
  for (const g of retainersOf(s)) { g.clan = null; g.status = 'ronin'; g.liege = undefined; (H.followers ??= []).includes(g.id) || H.followers!.push(g.id); }
  H.retainers = []; H.daikan = {};
}
// 仕官する時: 配下は家臣になる（上限まで。あふれた者は主家の武将に）
export function followersToRetainers(s: GameState): string[] {
  const H = s.hero!, out: string[] = [];
  for (const id of [...(H.followers ?? [])]) { const g = s.generals[id]; if (!g || g.status === 'dead') continue; if (retainersOf(s).length < capOf(s)) { take(s, g); out.push(g.name); } }
  return out;
}
export const nearRetainer = (s: GameState, ci: number) => retainersOf(s).filter((g) => hexDist(s.castles[g.loc].hex, s.castles[ci].hex) <= 0);

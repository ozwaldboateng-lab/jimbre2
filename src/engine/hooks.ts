// 戦闘解決の差し替え口。UIはプレイヤーが関わる合戦を戦術マップで戦わせる。
import { battle } from './combat';
import { recordBattle } from './yari';
import { gunyakuBattle, ryoshuOf } from './ryoshu';
import type { Target } from './move';
import type { Army, BattleReport, GameState } from './types';

type Resolver = (s: GameState, a: Army, t: Target, joined: Army[]) => Promise<BattleReport>;
let hook: Resolver | null = null;
export function setBattleHook(f: Resolver | null) { hook = f; }

// プレイヤーが攻め手で「自ら指揮」を選んだとき、またはプレイヤーが守り手のときは合戦画面へ
export async function resolveBattle(s: GameState, a: Army, t: Target, charge: boolean, joined: Army[] = [], command = false): Promise<BattleReport> {
  const defClan = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
  const ryo = ryoshuOf(s);
  if (ryo) { // 領主: 領の部隊が攻める・領の城や部隊が攻められる合戦（主家のほかの合戦は任せる）
    const fiefInvolved = (a.clan === s.player && a.front === ryo.id) || joined.some((j) => j.front === ryo.id) || (t.kind === 'castle' && ryo.castles.includes(t.castle) && defClan === s.player) || (t.kind === 'army' && t.army.front === ryo.id);
    if (a.clan === s.player) gunyakuBattle(s, [a, ...joined], defClan); else if (t.kind === 'army' && t.army.front === ryo.id) gunyakuBattle(s, [t.army], a.clan);
    if (hook && fiefInvolved && ((a.clan === s.player && command) || defClan === s.player)) { const r = await hook(s, a, t, joined); recordBattle(s, a, t, joined, r); return r; }
  }
  if (hook && !s.hero && ((a.clan === s.player && command) || defClan === s.player)) return hook(s, a, t, joined);
  // 武将で遊ぶ: 主人公が加わっている軍勢の合戦は、合戦の画面で主人公の一隊だけを采配する（ほかの部隊はAI）。「任せる」にしていればAIだけで
  const H = s.hero;
  const leadsUnit = !!H && H.leads !== undefined && H.leads !== null; // 軍勢の総大将（侍大将から）の時だけ合戦の画面。率いていない合戦は、月の終わりに槍働きの盤で戦う
  const r = hook && H && H.selfCommand && leadsUnit && H.army !== null && H.army !== undefined && (a.id === H.army || joined.some((j) => j.id === H.army) || (t.kind === 'army' && t.army.id === H.army)) ? await hook(s, a, t, joined) : await battle(s, a, t, charge, joined);
  if (H) recordBattle(s, a, t, joined, r); // 武将で遊ぶ: 槍働きと論功行賞のため、主人公の軍勢の合戦を記録
  return r;
}

// 戦闘解決の差し替え口。UIはプレイヤーが関わる合戦を戦術マップで戦わせる。
import { battle } from './combat';
import type { Target } from './move';
import type { Army, BattleReport, GameState } from './types';

type Resolver = (s: GameState, a: Army, t: Target, joined: Army[]) => Promise<BattleReport>;
let hook: Resolver | null = null;
export function setBattleHook(f: Resolver | null) { hook = f; }

// プレイヤーが攻め手で「自ら指揮」を選んだとき、またはプレイヤーが守り手のときは合戦画面へ
export async function resolveBattle(s: GameState, a: Army, t: Target, charge: boolean, joined: Army[] = [], command = false): Promise<BattleReport> {
  const defClan = t.kind === 'army' ? t.army.clan : s.castles[t.castle].owner;
  if (hook && !s.hero && ((a.clan === s.player && command) || defClan === s.player)) return hook(s, a, t, joined);
  // 武将で遊ぶ: 主人公が加わっている軍勢の合戦は、合戦の画面で主人公の一隊だけを采配する（ほかの部隊はAI）。「任せる」にしていればAIだけで
  const H = s.hero;
  if (hook && H && H.selfCommand && H.army !== null && H.army !== undefined && (a.id === H.army || joined.some((j) => j.id === H.army) || (t.kind === 'army' && t.army.id === H.army))) return hook(s, a, t, joined);
  return battle(s, a, t, charge, joined);
}

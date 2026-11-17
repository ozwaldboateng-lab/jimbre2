// 物語（前田利家 ― 残り火）の間、物語に出てくる史実の人物は、史実の没年までは討死・病没・処断・捕縛で消えない（主君や盟友が途中で消えて筋が崩れないように）
import type { GameState } from './types';
export const STORY_PROTECT: Record<string, number> = { // id → 史実の没年（この年になるまで守る）
  maeda_toshiie: 1599, oda_nobunaga: 1582, shibata_katsuie: 1583, ikeda_tsuneoki: 1584, sassa_narimasa: 1588, kinoshita_tokichiro: 1598, maeda_toshimasu: 1612, fuwa_mitsuharu: 1580, tokugawa_ieyasu: 1616,
};
export const storyProtected = (s: GameState, id: string) => !!s.hero?.story && (STORY_PROTECT[id] ?? 0) > s.year;

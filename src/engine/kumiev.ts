// 組頭・足軽大将の演出の出来事を、月の処理から溜めておく（場面は kumikake.ts が作る。ここは何も読み込まない ― 月の処理から呼ぶため）
import type { GameState } from './types';

// yori: 寄親が付いた（old: 前の寄親）・rival: 同輩が付いた・ahead: 同輩に先を越された・rivalDead: 同輩が討ち死に・suisen: 功績は満ちたが推挙されない・promote: 取り立てられた（pull: 寄親の出世に伴い）
export type KumiEv = { k: 'yori' | 'rival' | 'ahead' | 'rivalDead' | 'suisen' | 'promote'; id?: string; old?: string; rank?: number; pull?: boolean };
type KX = { kk?: KumiEv[] };
export function pushKumi(s: GameState, ev: KumiEv) { if (!s.hero) return; const H = s.hero as unknown as KX; (H.kk ??= []).push(ev); }
export function takeKumi(s: GameState): KumiEv[] { if (!s.hero) return []; const H = s.hero as unknown as KX; const out = H.kk ?? []; H.kk = []; return out; }

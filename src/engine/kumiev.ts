// 組頭・足軽大将の演出の出来事を、月の処理から溜めておく（場面は kumikake.ts が作る。ここは何も読み込まない ― 月の処理から呼ぶため）
import type { GameState } from './types';

// yori: 寄親が付いた（old: 前の寄親）・rival: 同輩が付いた・ahead: 同輩に先を越された・rivalDead: 同輩が討ち死に・suisen: 功績は満ちたが推挙されない・promote: 取り立てられた（pull: 寄親の出世に伴い）
// 方面軍団長（ryokake.ts）: homenGoal 目標の言い渡し・homenRemind 残り一年の催促・homenOk 目標を果たした・homenNg 解任（ids: 去る与力）・yorikiWin 城を落とした・yorikiLost 与力が部隊を失った（id）・gonjo 与力の言上（id）・senpo 与力が先鋒を願い出る（id）
// 城主から（ryokake.ts）: kazo 加増（c）・genpo 減封（c）・seki 席次（up・n・id 隣の城主）・zan 讒言（id・ok 退けられた）・mitsushi 寝返りの密使（clan）・nyujo 入城（c）・inkyo 権六の隠居の願い・letter 権六の便り
// 侍大将から: yoriko 寄子が付いた（心得を授ける）・yorikoSour 冷遇の続いた寄子の不満・quarrel 寄子二人の手柄争い（a・b）
// 足軽大将から: oath 家臣を召し抱えた・grow 家臣が腕を上げた（kind: 型が変わって乗る駒）・hurt 家臣の手傷（この二つは盤のあとの掛け合いに）・leave 家臣の暇乞い（unpaid: 扶持が払えず）・mochi 合戦の持ち場の言い渡し
export type KumiEv = { k: 'yori' | 'rival' | 'ahead' | 'rivalDead' | 'suisen' | 'promote' | 'oath' | 'grow' | 'hurt' | 'leave' | 'mochi' | 'yokichi' | 'yoriko' | 'yorikoSour' | 'quarrel' | 'kazo' | 'genpo' | 'seki' | 'zan' | 'mitsushi' | 'nyujo' | 'inkyo' | 'letter' | 'homenGoal' | 'homenRemind' | 'homenOk' | 'homenNg' | 'yorikiWin' | 'yorikiLost' | 'gonjo' | 'senpo'; ids?: string[]; c?: number; up?: boolean; ok?: boolean; clan?: string; n?: number; a?: string; b?: string; id?: string; old?: string; rank?: number; pull?: boolean; kind?: string; unpaid?: boolean };
type KX = { kk?: KumiEv[] };
export function pushKumi(s: GameState, ev: KumiEv) { if (!s.hero) return; const H = s.hero as unknown as KX; (H.kk ??= []).push(ev); }
export function takeKumi(s: GameState, only?: KumiEv['k'][]): KumiEv[] { if (!s.hero) return []; const H = s.hero as unknown as KX; const all = H.kk ?? []; const out = only ? all.filter((e) => only.includes(e.k)) : all; H.kk = only ? all.filter((e) => !only.includes(e.k)) : []; return out; }

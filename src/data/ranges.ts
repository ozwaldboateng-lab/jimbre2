// 険山（軍勢が越えられない山脈）と、残した通り道（峠・川筋）。地図の生成（tools/build-map.mjs）で緯度経度から決めて map.json に入れる
import raw from './map.json';
const M = raw as unknown as { hexes: { x?: number }[]; ranges: { name: string; solo?: number }[]; passes: [number, string][] };
export const RANGES: { name: string; hexes: number[]; solo?: boolean }[] = M.ranges.map((r, ri) => ({ name: r.name, hexes: M.hexes.flatMap((h, i) => (h.x === ri ? [i] : [])), ...(r.solo ? { solo: true } : {}) }));
// 案内の札だけ（効果はない）。のちに雪で閉じる峠にも使う
export const PASSES: Record<number, string> = Object.fromEntries(M.passes);

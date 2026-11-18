# 汎用の場面絵（SCENES_ORDER_GENERIC.txt の16枚）を取り込む: 番号で名前を決め、960×540 の WebP に縮めて assets/scenes/ に置き、src/data/sceneArt.ts を作り直す
# 使い方: python3 tools/import-scenes.py <絵のあるフォルダ>   （ファイル名の先頭が「01_」〜「16_」）
import base64, os, re, sys
from PIL import Image
KEYS = {1: 'fire_castle', 2: 'night_fire', 3: 'zashiki_day', 4: 'zashiki_night', 5: 'chashitsu', 6: 'hondo', 7: 'senjo', 8: 'yukimichi',
        9: 'minato', 10: 'ichi', 11: 'ishigaki', 12: 'tsukiyo', 13: 'gosho', 14: 'mura', 15: 'jinmaku', 16: 'amemichi',
        101: 'kaijo', 102: 'tenshu_dawn', 103: 'utage', 104: 'kuyo',  # 101〜: エンディングの場面（tools/import-ending.py が置く）
        201: 'story_arako', 202: 'story_ta_yoru', 203: 'story_sakaya', 204: 'story_kiyosu_tsuji', 205: 'story_kiyosu_niwa', 206: 'story_denchu', 207: 'story_moribe', 208: 'story_okehazama', 209: 'story_kayazu', 210: 'story_ino', 211: 'story_okehazama_sen', 212: 'story_moribe_sen',
        213: 'story_zashiki_arako', 214: 'story_kanegasaki', 215: 'story_anegawa', 216: 'story_kita_michi', 217: 'story_fuchu', 218: 'story_kieta_mura', 219: 'story_hyojo', 220: 'story_fuyu_echizen',
        221: 'story_kitanosho', 222: 'story_tedorigawa', 223: 'story_hokuriku_jin', 224: 'story_nanao', 225: 'story_nanao_minato', 226: 'story_uozu', 227: 'story_honnoji_ho', 228: 'story_shizugatake',
        229: 'story_kanazawa', 230: 'story_kaga_ta', 231: 'story_suemori', 232: 'story_gouu', 233: 'story_suemori_asa', 234: 'story_tateyama', 235: 'story_toyama_jin', 236: 'story_moriyama',
        237: 'story_kanazawa_asa', 238: 'story_kanazawa_niwa', 239: 'story_kyushu', 240: 'story_osaka_hiroma', 241: 'story_nagoya', 242: 'story_fushimi', 243: 'story_byosho', 244: 'story_yukiakari'}  # 201〜: 前田利家 ― 残り火（ART_ORDER_TOSHIIE.txt の S1〜S12、ART_ORDER_TOSHIIE_PART2.txt の S13〜S20、ART_ORDER_TOSHIIE_PART3.txt の S21〜S28、ART_ORDER_TOSHIIE_PART4.txt の S29〜S36、ART_ORDER_TOSHIIE_PART5.txt の S37〜S44。ファイル名の先頭「S1_」も読む）
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'assets', 'scenes')
os.makedirs(out, exist_ok=True)
if len(sys.argv) > 1:
    for f in sorted(os.listdir(sys.argv[1])):
        m = re.match(r'(\d+)_', f) or re.match(r'S(\d+)_', f)
        if m and f.startswith('S'): m = re.match(r'S(\d+)_', f); n = 200 + int(m.group(1))
        else: n = int(m.group(1)) if m else -1
        if not m or n not in KEYS or not re.search(r'\.(png|jpe?g|webp)$', f, re.I): continue
        k = KEYS[n]
        im = Image.open(os.path.join(sys.argv[1], f)).convert('RGB')
        w, h = im.size; th = round(w * 9 / 16)
        if th < h: im = im.crop((0, (h - th) // 2, w, (h - th) // 2 + th))  # 16:9 に揃える
        im = im.resize((960, 540), Image.LANCZOS)
        done = False
        for size in ((960, 540), (800, 450), (704, 396)):  # 1枚 70KB までに収める（1枚の HTML の容量のため）。細かい絵は少し小さくする
            im2 = im.resize(size, Image.LANCZOS) if size != (960, 540) else im
            for q in (60, 52, 45, 38):
                im2.save(os.path.join(out, f'{k}.webp'), 'WEBP', quality=q, method=6)
                if os.path.getsize(os.path.join(out, f'{k}.webp')) <= 70000: done = True; break
            if done: break
        print('imported', f, '->', k)
lines = ['// 汎用の場面絵（assets/scenes/*.webp を埋め込んだもの。tools/import-scenes.py が作る）', 'export const SCENE_ART: Record<string, string> = {']
for k in KEYS.values():
    p = os.path.join(out, f'{k}.webp')
    if os.path.exists(p): lines.append(f"  {k}: 'data:image/webp;base64,{base64.b64encode(open(p, 'rb').read()).decode()}',")
lines.append('};')
open(os.path.join(root, 'src', 'data', 'sceneArt.ts'), 'w').write('\n'.join(lines) + '\n')
print('sceneArt:', sum(1 for k in KEYS.values() if os.path.exists(os.path.join(out, f'{k}.webp'))), 'images')

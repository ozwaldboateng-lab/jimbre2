# エンディングの絵（ART_ORDER_ENDING.txt の8枚）を取り込む
#   01〜04: 幕引きの場面 → assets/scenes/{kaijo,tenshu_dawn,utage,kuyo}.webp（960×540、70KBまで）→ import-scenes.py で sceneArt.ts に
#   05〜07: 最後の一枚絵 → assets/ending/{shogun,kampaku,fall}.webp（1672×941）、08: 年代記の地紙 → assets/ending/paper.webp（512×512）
#   src/data/ending.ts を作り直す（今の ending.webp も一緒に）
# 使い方: python3 tools/import-ending.py <絵のあるフォルダ>
import base64, os, re, subprocess, sys
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENES = {1: 'kaijo', 2: 'tenshu_dawn', 3: 'utage', 4: 'kuyo'}
FINAL = {5: 'shogun', 6: 'kampaku', 7: 'fall'}
sc_out = os.path.join(root, 'assets', 'scenes'); en_out = os.path.join(root, 'assets', 'ending')
os.makedirs(en_out, exist_ok=True)
def fit(im, w, h):
    W, H = im.size; th = round(W * h / w)
    if th < H: im = im.crop((0, (H - th) // 2, W, (H - th) // 2 + th))
    return im.resize((w, h), Image.LANCZOS)
def save_under(im, path, limit, sizes, qs=(60, 52, 45, 38)):
    for size in sizes:
        im2 = im.resize(size, Image.LANCZOS) if size != im.size else im
        for q in qs:
            im2.save(path, 'WEBP', quality=q, method=6)
            if os.path.getsize(path) <= limit: return
for f in sorted(os.listdir(sys.argv[1])):
    m = re.match(r'(\d+)_', f)
    if not m or not re.search(r'\.(png|jpe?g|webp)$', f, re.I): continue
    n = int(m.group(1)); im = Image.open(os.path.join(sys.argv[1], f)).convert('RGB')
    if n in SCENES: save_under(fit(im, 960, 540), os.path.join(sc_out, f'{SCENES[n]}.webp'), 70000, ((960, 540), (800, 450)))
    elif n in FINAL: save_under(fit(im, 1672, 941), os.path.join(en_out, f'{FINAL[n]}.webp'), 480000, ((1672, 941), (1440, 810)), (72, 64, 56, 48))
    elif n == 8: save_under(fit(im, 512, 512), os.path.join(en_out, 'paper.webp'), 60000, ((512, 512),), (70, 60, 50))
    else: continue
    print('imported', f)
subprocess.run([sys.executable, os.path.join(root, 'tools', 'import-scenes.py')], check=True)
b64 = lambda p: 'data:image/webp;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
lines = ['// エンディングの絵（assets/ending.webp と assets/ending/*.webp を埋め込んだもの。tools/import-ending.py が作る）',
         f"export const ENDING_ART = '{b64(os.path.join(root, 'assets', 'ending.webp'))}'; // 天下統一（官位なし・新しい世）"]
names = {'shogun': 'ENDING_SHOGUN', 'kampaku': 'ENDING_KAMPAKU', 'fall': 'ENDING_FALL', 'paper': 'ENDING_PAPER'}
for k, v in names.items():
    p = os.path.join(en_out, f'{k}.webp')
    lines.append(f"export const {v} = '{b64(p) if os.path.exists(p) else ''}';")
open(os.path.join(root, 'src', 'data', 'ending.ts'), 'w').write('\n'.join(lines) + '\n')
print('ending.ts written')

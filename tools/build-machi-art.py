# 城下の町の絵: assets/machi/<番号>_<名前>.png（建物・埋め草は透明背景、地面は不透明）を WebP にして dist/tiles/machi/ に書き出し、その道と大きさを src/data/machiArt.ts へ（注文書は ART_ORDER_MACHI.txt）
# ページに埋め込まないのは、アーティファクトの大きさの上限（16MB）のため。合戦の地面（dist/tiles/battle）と同じく、ページの隣のファイルとして公開する
# 建物・埋め草: 薄い透明のむら（アルファ16未満）を消し、絵のある所まで切り詰め、元の縮尺の55%に縮める（足もとは下の端の中ほど）。w は元の幅（縮尺をそろえるため）
# 地面: パソコン用 1600×1000、スマホ用 1000×1250
import base64, glob, io, os, re, sys
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY = {1: 'shiro_s', 2: 'shiro_l', 3: 'buke', 4: 'ie_s', 5: 'ie_m', 6: 'ie_l', 7: 'nagaya', 8: 'dojo', 9: 'tera', 10: 'chaya', 11: 'ichi', 12: 'nanban', 13: 'kaido', 14: 'mura',
       15: 'machiya2', 16: 'machiya', 17: 'kura', 18: 'matsu', 19: 'yanagi', 20: 'kodachi', 21: 'hei', 22: 'ido', 23: 'kuruma', 24: 'taru', 25: 'ground_pc', 26: 'ground_sp', 27: 'shiro_yake', 28: 'ground_snow'}
GROUND = {'ground_pc': (1600, 1000), 'ground_sp': (1000, 1250), 'ground_snow': (1600, 1000)}
SCALE = 0.55
out = {}
ODIR = os.path.join(root, 'dist/tiles/machi'); os.makedirs(ODIR, exist_ok=True)
def save(key, im, q):
    path = os.path.join(ODIR, key + '.webp'); im.save(path, 'WEBP', quality=q, method=6)
    return 'tiles/machi/' + key + '.webp', os.path.getsize(path)
for f in sorted(glob.glob(os.path.join(root, 'assets/machi/*.png'))):
    m = re.match(r'(\d+)_', os.path.basename(f))
    key = KEY.get(int(m.group(1))) if m else None
    if not key: print('skip', f); continue
    im = Image.open(f)
    if key in GROUND:
        im = im.convert('RGB').resize(GROUND[key], Image.LANCZOS)
        src, n = save(key, im, 72)
        out[key] = {'src': src, 'w': im.width, 'h': im.height}
        print(key, im.size, n // 1024, 'KB'); continue
    im = im.convert('RGBA')
    ow = im.width
    a = im.getchannel('A').point(lambda v: 0 if v < 16 else v)
    im.putalpha(a)
    bb = a.point(lambda v: 255 if v > 40 else 0).getbbox() or (0, 0, im.width, im.height)
    im = im.crop(bb)
    cw = im.width  # 切り詰めたあとの元の縮尺での幅
    im = im.resize((max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))), Image.LANCZOS)
    src, n = save(key, im, 80)
    out[key] = {'src': src, 'w': cw, 'h': round(im.height / SCALE)}
    print(key, 'orig', ow, '-> crop', cw, 'stored', im.size, n // 1024, 'KB')
with open(os.path.join(root, 'src/data/machiArt.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-machi-art.py）。城下の町の絵（WebP。ページの隣の tiles/machi/ に置く）。w・h は元の縮尺での大きさ（人の背丈24px）。地面は w・h が絵の大きさ\n')
    w.write('export const MACHI_ART: Record<string, { src: string; w: number; h: number }> = {\n')
    for k, v in out.items(): w.write(f"  {k}: {{ w: {v['w']}, h: {v['h']}, src: '{v['src']}' }},\n")
    w.write('};\n')
print(len(out), 'items')

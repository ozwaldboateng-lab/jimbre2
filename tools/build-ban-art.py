# 槍働きの盤の駒の絵: assets/ban/<番号>_<名前>_<正面|背面>.png（透明背景）を WebP にして src/data/banArt.ts へ埋め込む（注文書は ART_ORDER_BAN.txt）
# 正面（こちらを向く）は敵の駒、背面（向こうを向く）は味方の駒。向きのない絵（柵など）は両方に使う
# 薄い透明のむら（アルファ16未満）は消し、絵のある所まで切り詰めて、高さ320pxに縮める（足もとは下の端）
import base64, glob, io, os, re
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = [('名のある将', 'sho'), ('主人公', 'hero'), ('騎馬', 'kiba'), ('足軽', 'ashi'), ('弓', 'yumi'), ('鉄砲', 'teppo'), ('柵', 'saku'), ('矢盾', 'tate')]
H = 320
out = {}
for f in sorted(glob.glob(os.path.join(root, 'assets/ban/*.png'))):
    name = os.path.splitext(os.path.basename(f))[0]
    key = next((k for word, k in KEYS if word in name), None)
    if not key:
        print('skip', name); continue
    sides = ['f'] if '正面' in name else ['b'] if '背面' in name else ['f', 'b']
    im = Image.open(f).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 16 else v)
    im.putalpha(a)
    bb = a.point(lambda v: 255 if v > 40 else 0).getbbox() or (0, 0, im.width, im.height)
    pad = 6
    im = im.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(im.width, bb[2] + pad), min(im.height, bb[3] + pad)))
    im = im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=82, method=6)
    uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()
    for sd in sides: out.setdefault(f'{key}_{sd}', []).append(uri)
    print(name, '->', key, sides, im.size, len(buf.getvalue()) // 1024, 'KB')
with open(os.path.join(root, 'src/data/banArt.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-ban-art.py）。槍働きの盤の駒の絵（WebP・透明背景・高さ320px・足もとは下の端）\n')
    w.write('// 鍵は「種類_向き」: 向きは f（正面＝敵の駒）・b（背面＝味方の駒）。まだない種類は文字の駒になる\n')
    w.write('export const BAN_ART: Record<string, string[]> = {\n')
    for k, v in out.items(): w.write(f"  {k}: [\n" + ''.join(f"    '{x}',\n" for x in v) + '  ],\n')
    w.write('};\n')
print({k: len(v) for k, v in out.items()}, sum(len(x) for v in out.values() for x in v) // 1024, 'KB')

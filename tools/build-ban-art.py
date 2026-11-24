# 槍働きの盤の駒の絵: assets/ban/<番号>_<名前>.png（透明背景）を WebP にして src/data/banArt.ts へ埋め込む（注文書は ART_ORDER_BAN.txt）
import base64, glob, io, os, re
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = {'騎馬武者': 'kiba', '足軽': 'ashi', '弓': 'yumi', '鉄砲': 'teppo', '名のある将': 'sho', '主人公': 'hero'}
out = {}
for f in sorted(glob.glob(os.path.join(root, 'assets/ban/*.png'))):
    m = re.match(r'\d*_?(.+?)(_\D+)?$', os.path.splitext(os.path.basename(f))[0])
    key = KEYS.get(m.group(1)) if m else None
    if not key:
        print('skip', f); continue
    im = Image.open(f).convert('RGBA')
    im = im.resize((256, 256), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=82, method=6)
    out.setdefault(key, []).append('data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode())
with open(os.path.join(root, 'src/data/banArt.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-ban-art.py）。槍働きの盤の駒の絵（WebP・透明背景）。まだなければ空で、文字の駒になる\n')
    w.write("export const BAN_ART: Partial<Record<'kiba' | 'ashi' | 'yumi' | 'teppo' | 'sho' | 'hero', string[]>> = {\n")
    for k, v in out.items(): w.write(f"  {k}: [\n" + ''.join(f"    '{x}',\n" for x in v) + '  ],\n')
    w.write('};\n')
print({k: len(v) for k, v in out.items()}, sum(len(x) for v in out.values() for x in v) // 1024, 'KB')

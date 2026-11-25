# 浪人の演出の顔（ART_ORDER_RONIN.txt の01〜07）を取り込む: 200×250 の WebP にして src/data/portraits.ts に足す（同じ id があれば差し替える）
# 使い方: python3 tools/import-ronin-faces.py <絵のあるフォルダ>   （ファイル名の先頭が「01_」〜「07_」）
import base64, io, os, re, sys
from PIL import Image

KEYS = {1: 'g_shihan', 2: 'g_choro', 3: 'g_shonin', 4: 'g_kunishu', 5: 'g_yato', 6: 'g_onna', 7: 'g_sosho'}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, 'src/data/portraits.ts')
src = open(path, encoding='utf-8').read()
for f in sorted(os.listdir(sys.argv[1])):
    m = re.match(r'(\d+)_', f)
    if not m or int(m.group(1)) not in KEYS or not f.lower().endswith('.png'): continue
    k = KEYS[int(m.group(1))]
    im = Image.open(os.path.join(sys.argv[1], f)).convert('RGB').resize((200, 250), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=72, method=6)
    line = f"  {k}: 'data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}',"
    if re.search(rf"^  {k}: ", src, re.M): src = re.sub(rf"^  {k}: .*$", lambda _: line, src, count=1, flags=re.M)
    else: src = src.rstrip().removesuffix('};').rstrip() + '\n' + line + '\n};\n'
    print('imported', f, '->', k, len(buf.getvalue()) // 1024, 'KB')
open(path, 'w', encoding='utf-8').write(src)

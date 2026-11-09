# 合戦の盤面に置く地形の絵（正方形いっぱいに描いたもの）に、六角形のぼかしの縁をつけて webp にする。
#   python3 tools/battle-sprites.py <元の絵> <出力.webp>
# 出力は 512×512・背景透過。中央の六角形（頂点が上下）は不透明、縁の外へ向かってやわらかく消える。
# 六角形の半径は一辺の 1/(2×PAD)。ゲームでは絵の一辺をマスの半径×2×PAD で描くと、六角形がマスに重なる
import sys
import numpy as np
from PIL import Image
PAD = 1.18
src, out = sys.argv[1], sys.argv[2]
N = 512
im = Image.open(src).convert('RGB').resize((N, N), Image.LANCZOS)
R = N / 2 / PAD
y, x = np.mgrid[0:N, 0:N].astype(np.float32) + 0.5 - N / 2
ax, ay = np.abs(x), np.abs(y)
m = np.maximum(ax / (np.sqrt(3) / 2 * R), (ay + ax / np.sqrt(3)) / R)  # 1 で六角形の縁
t = np.clip((1.14 - m) / (1.14 - 0.86), 0, 1)
a = (t * t * (3 - 2 * t) * 255).astype(np.uint8)
rgba = np.dstack([np.asarray(im), a])
Image.fromarray(rgba, 'RGBA').save(out, 'WEBP', quality=85, method=6)

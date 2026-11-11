# 合戦の盤面に置く地形の絵を、512×512・背景透過の webp にする。
#   python3 tools/battle-sprites.py square <元の絵> <出力.webp>   … 正方形いっぱいに描いた絵: 中央の六角形を残し、縁の外へやわらかく消す
#   python3 tools/battle-sprites.py hex    <元の絵> <出力.webp>   … 六角形に切り抜いてある絵（森）: 少し大きめに置き、縁を木立の形のようにむらのあるぼかしにする
#   python3 tools/battle-sprites.py clump  <元の絵> <出力.webp>   … 背景透過の丸い塊（森）: 直径をマスの高さの約1.1倍にそろえ、真ん中に置く
#   python3 tools/battle-sprites.py sprite <元の絵> <出力.webp>   … 背景透過の置物（丘）: 形はそのまま、幅をマスの幅の約1.2倍にそろえ、縁を少しやわらげる
# どれも、出力の中の六角形（頂点が上下）の半径は一辺の 1/(2×PAD)。ゲームでは絵の一辺をマスの半径×2×PAD で描く
import sys
import numpy as np
from PIL import Image, ImageFilter
PAD = 1.18
N = 512
R = N / 2 / PAD
mode, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) + 0.5 - N / 2
def hexm(x, y, r):  # 1 で六角形の縁
    ax, ay = np.abs(x), np.abs(y)
    return np.maximum(ax / (np.sqrt(3) / 2 * r), (ay + ax / np.sqrt(3)) / r)
def smooth(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)
def noise(seed, cells):
    rng = np.random.default_rng(seed)
    a = Image.fromarray((rng.random((cells, cells)) * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC)
    return np.asarray(a).astype(np.float32) / 255
im = Image.open(src).convert('RGBA')
seed = sum(map(ord, src)) % 10000
if mode == 'square':
    rgb = np.asarray(im.convert('RGB').resize((N, N), Image.LANCZOS))
    a = smooth((1.14 - hexm(xx, yy, R)) / 0.28)
elif mode == 'hex':
    a0 = np.asarray(im)[..., 3]; ys, xs = np.where(a0 > 128)
    cx, cy, rh = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, (ys.max() - ys.min()) / 2
    k = (R * 1.12) / rh  # 元の六角形をマスより1割ほど大きく
    big = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (N, N)); canvas.alpha_composite(big, (round(N / 2 - cx * k), round(N / 2 - cy * k)))
    c = np.asarray(canvas).astype(np.float32)
    rgb = c[..., :3]
    m = hexm(xx, yy, R * 1.12)
    jag = (noise(seed, 18) - 0.5) * 0.16 + (noise(seed + 1, 48) - 0.5) * 0.08  # 木立の外形のようなむら
    a = smooth((1.0 - (m + jag)) / 0.2) * (c[..., 3] / 255)
elif mode == 'clump':
    a0 = np.asarray(im)[..., 3]; ys, xs = np.where(a0 > 24)
    crop = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = (2 * R * 1.1) / max(crop.width, crop.height)
    sp = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (N, N)); canvas.alpha_composite(sp, ((N - sp.width) // 2, (N - sp.height) // 2))
    c = np.asarray(canvas).astype(np.float32)
    rgb = c[..., :3]
    a = np.asarray(Image.fromarray(c[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255
    # まん丸にしない: 外形を角度ごとにふくらませ・へこませる（いびつな木立の塊）。中心は少しずらす
    rng = np.random.default_rng(seed)
    th = np.arctan2(yy, xx); r = np.hypot(xx, yy) / (R * 1.1)
    lobe = sum(rng.uniform(0.04, 0.11) * np.sin(f * th + rng.uniform(0, 6.28)) for f in (2, 3, 5))
    lobe += (noise(seed + 3, 24) - 0.5) * 0.1  # 梢の細かなでこぼこ
    a *= smooth((0.97 + lobe - r) / 0.07)
elif mode == 'sprite':
    a0 = np.asarray(im)[..., 3]; ys, xs = np.where(a0 > 24)
    crop = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    k = (np.sqrt(3) * R * 1.2) / crop.width
    sp = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (N, N)); canvas.alpha_composite(sp, ((N - sp.width) // 2, round(N / 2 - sp.height * 0.55)))
    c = np.asarray(canvas).astype(np.float32)
    rgb = c[..., :3]
    a = np.asarray(Image.fromarray(c[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5))).astype(np.float32) / 255
else:
    raise SystemExit('mode: square | hex | clump | sprite')
Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (np.clip(a, 0, 1) * 255).astype(np.uint8)]), 'RGBA').save(out, 'WEBP', quality=85, method=6)

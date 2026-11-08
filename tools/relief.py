# 下絵の地図（陰影つき）と、マスの地形を決めるための標高の格子を、標高タイル（terrarium 形式）から作る。
#   python3 tools/dl-dem.py 9 <タイルの置き場>     … 標高タイルを取ってくる（elevation-tiles-prod.s3.amazonaws.com）
#   python3 tools/relief.py <タイルの置き場> 9 [Natural Earth の湖 .shp]
# 出力: dist/tiles/relief.webp（下絵）、data/dem_jp.bin・data/dem_jp.json（1kmごとの標高。tools/build-map.mjs が読む）
# 町・道は入らない（標高だけから作る）。湖は Natural Earth の輪郭（琵琶湖）と、標高の平らな面（猪苗代湖など）から
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
D = sys.argv[1]; Z = int(sys.argv[2]); LAKES_SHP = sys.argv[3] if len(sys.argv) > 3 else None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAT0, LAT1, LON0, LON1 = 29.5, 43.0, 127.5, 143.0
KX = math.cos(math.radians(35.5)) * 111.32; KY = 110.57
n = 2 ** Z
tx = lambda lon: (lon + 180) / 360 * n
def ty(lat): r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * n
x0, x1 = int(tx(LON0)), int(tx(LON1)); y0, y1 = int(ty(LAT1)), int(ty(LAT0))
W = (x1 - x0 + 1) * 256; H = (y1 - y0 + 1) * 256
E = np.zeros((H, W), np.float32)
for x in range(x0, x1 + 1):
    for y in range(y0, y1 + 1):
        a = np.asarray(Image.open(f'{D}/{x}_{y}.png').convert('RGB')).astype(np.float32)
        E[(y - y0) * 256:(y - y0 + 1) * 256, (x - x0) * 256:(x - x0 + 1) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

def grid(pxkm):
    OW = int((LON1 - LON0) * KX * pxkm); OH = int((LAT1 - LAT0) * KY * pxkm)
    lon = LON0 + (np.arange(OW) + 0.5) / OW * (LON1 - LON0); lat = LAT1 - (np.arange(OH) + 0.5) / OH * (LAT1 - LAT0)
    X, Y = np.meshgrid((tx(lon) - x0) * 256, np.array([(ty(l) - y0) * 256 for l in lat]))
    xi = np.clip(np.floor(X).astype(int), 0, W - 2); yi = np.clip(np.floor(Y).astype(int), 0, H - 2); fx = X - xi; fy = Y - yi
    e = E[yi, xi] * (1 - fx) * (1 - fy) + E[yi, xi + 1] * fx * (1 - fy) + E[yi + 1, xi] * (1 - fx) * fy + E[yi + 1, xi + 1] * fx * fy
    return e.astype(np.float32), OW, OH

# ── 標高の格子（1km）
e1, GW, GH = grid(1.0)
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
np.clip(np.round(e1), -32000, 32000).astype('<i2').tofile(os.path.join(ROOT, 'data/dem_jp.bin'))
json.dump({'lon0': LON0, 'lon1': LON1, 'lat0': LAT0, 'lat1': LAT1, 'w': GW, 'h': GH, 'pxkm': 1}, open(os.path.join(ROOT, 'data/dem_jp.json'), 'w'))

# ── 下絵
PXKM = 2.0 * 2 ** (Z - 8)  # z8 で 1kmに2ピクセル
e, OW, OH = grid(PXKM)
cell = 1000 / PXKM
ll2px = lambda lat, lon: ((lon - LON0) / (LON1 - LON0) * OW, (LAT1 - lat) / (LAT1 - LAT0) * OH)
# 湖
lake = np.zeros((OH, OW), bool)
if LAKES_SHP:
    import shapefile
    for sr in shapefile.Reader(LAKES_SHP).iterShapeRecords():
        b = sr.shape.bbox
        if b[2] < LON0 or b[0] > LON1 or b[3] < LAT0 or b[1] > LAT1: continue
        m = Image.new('L', (OW, OH), 0); dr = ImageDraw.Draw(m)
        parts = list(sr.shape.parts) + [len(sr.shape.points)]
        for k in range(len(parts) - 1):
            ring = sr.shape.points[parts[k]:parts[k + 1]]
            dr.polygon([ll2px(la, lo) for lo, la in ring], fill=255 if k == 0 else 0)
        lake |= np.asarray(m) > 0
# 平らな湖面（種の点から、同じ高さの平らな所を塗る）: [名, 緯度, 経度]
for name, la, lo in [('猪苗代湖', 37.48, 140.09), ('霞ヶ浦', 36.05, 140.38), ('北浦', 36.0, 140.55), ('諏訪湖', 36.05, 138.08), ('中禅寺湖', 36.735, 139.48), ('十和田湖', 40.46, 140.88), ('田沢湖', 39.72, 140.66), ('芦ノ湖', 35.22, 139.0), ('宍道湖', 35.45, 132.95), ('中海', 35.47, 133.2)]:
    sx, sy = map(int, ll2px(la, lo))
    if not (0 <= sx < OW and 0 <= sy < OH): continue
    lv = e[sy, sx]; lim = int(30 * PXKM)
    seen = np.zeros((OH, OW), bool); st = [(sy, sx)]; cnt = 0
    while st and cnt < (lim * lim * 4):
        y, x = st.pop()
        if y < 0 or x < 0 or y >= OH or x >= OW or seen[y, x] or abs(y - sy) > lim or abs(x - sx) > lim: continue
        if abs(e[y, x] - lv) > 0.8: continue
        seen[y, x] = True; cnt += 1; st += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    lake |= seen
    print(name, '湖面', cnt, 'px', round(float(lv), 1), 'm')
gy, gx = np.gradient(e, cell)
slope = np.arctan(np.hypot(gx, gy) * 1.6); aspect = np.arctan2(-gx, gy)
az, alt = math.radians(315), math.radians(42)
hs = np.clip(np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect), 0, 1)
rng = np.random.default_rng(7)
def noise(scale):
    s = max(2, int(OW / scale)); sh = max(2, int(OH / scale))
    return np.asarray(Image.fromarray((rng.random((sh, s)) * 255).astype(np.uint8)).resize((OW, OH), Image.BICUBIC)).astype(np.float32) / 255
nz = noise(8) * 0.5 + noise(40) * 0.3 + noise(160) * 0.2
from PIL import ImageFilter
land = np.asarray(Image.fromarray(((e > 0.5) * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))) > 127  # 海すれすれの低地のまだらをならす
land &= ~lake
def lerp(a, b, t): t = np.clip(t, 0, 1)[..., None]; return a * (1 - t) + b * t
C = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
full = lambda c: np.broadcast_to(c, (OH, OW, 3)).astype(np.float32)
sl = np.degrees(slope)
col = lerp(full(C('#7a8a4e')), C('#687c44'), (e - 20) / 150)
col = lerp(col, C('#3e5a32'), np.maximum((e - 120) / 400, (sl - 6) / 10))
col = lerp(col, C('#34492e'), (e - 1200) / 600)
col = lerp(col, C('#7d7462'), (e - 2000) / 500)
col = lerp(col, C('#d9d6cc'), (e - 2700) / 400)
col = col * (0.92 + 0.16 * nz[..., None]) * (0.5 + 0.72 * hs)[..., None]
sea = lerp(full(C('#2f5b66')), C('#1a3346'), (-e) / 250)
sea = lerp(sea, C('#13283b'), (-e - 250) / 3000) * (0.96 + 0.06 * nz[..., None])
water = full(C('#36606a')) * (0.95 + 0.08 * nz[..., None])  # 湖
img = np.where(land[..., None], col, np.where(lake[..., None], water, sea))
os.makedirs(os.path.join(ROOT, 'dist/tiles'), exist_ok=True)
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(ROOT, 'dist/tiles/relief.webp'), 'WEBP', quality=80, method=6)
print('relief', OW, OH, 'dem', GW, GH)

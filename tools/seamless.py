# 継ぎ目のある正方形の絵を、敷き詰めても境目が見えない絵にする（半分ずらした写しと、端に近いほど写しが勝つように混ぜる）
#   python3 tools/seamless.py <元の絵> <出力.webp> [一辺=1024]
import sys
import numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
N = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
a = np.asarray(Image.open(src).convert('RGB').resize((N, N), Image.LANCZOS)).astype(np.float32)
b = np.roll(np.roll(a, N // 2, 0), N // 2, 1)
t = np.abs(np.arange(N) - (N - 1) / 2) / (N / 2)  # 0（真ん中）〜1（端）
w = np.clip((np.maximum(t[:, None], t[None, :]) - 0.55) / 0.4, 0, 1)
w = w * w * (3 - 2 * w)
Image.fromarray((a * (1 - w[..., None]) + b * w[..., None]).astype(np.uint8)).save(out, 'WEBP', quality=82, method=6)

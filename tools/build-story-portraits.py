# 物語だけの人物の顔: assets/story/portraits/<id>.png（320×400）を 200×250 の WebP にして src/data/portraits_story.ts へ埋め込む
# 武将の顔（tools/build-portraits.py → portraits.ts）とは別にしておく（id は src/data/story_toshiie.ts の STORY_CAST と同じ）
import base64, glob, io, os
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []
for f in sorted(glob.glob(os.path.join(root, 'assets/story/portraits/*.png'))):
    gid = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB').resize((200, 250), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=72, method=6)
    out.append((gid, base64.b64encode(buf.getvalue()).decode()))
with open(os.path.join(root, 'src/data/portraits_story.ts'), 'w', encoding='utf-8') as w:
    w.write('// 自動生成（tools/build-story-portraits.py）。物語だけの人物の id → 顔画像（200×250 WebP）\n')
    w.write('export const STORY_PORTRAITS: Record<string, string> = {\n')
    for gid, b64 in out: w.write(f"  {gid}: 'data:image/webp;base64,{b64}',\n")
    w.write('};\n')
print(len(out), 'story portraits', sum(len(b) for _, b in out) // 1024, 'KB')

"""
AI生成→背景切り抜き済みのねこ写真（1080x1080 PNG）を、アプリ用にそろえて書き出す。

  python3 scripts/prepare-cat-photos.py <切り抜き済みPNGのフォルダ>

- 4枚の足元の高さと体の中心をそろえる（食べる写真は前かがみなので位置を補正）
- 横720 x 縦1080 の範囲で切り出し、480x720 の WebP（透過）にする
"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "public" / "cat"
out.mkdir(parents=True, exist_ok=True)

# 写真ごとの位置補正（元画像のピクセル）。食べる写真は足元が高く、少し左に寄っている
OFFSET = {"normal": (0, 0), "happy": (0, 0), "yawn": (0, 0), "eating": (35, 140)}
CROP_X, CROP_W, CROP_H = 180, 720, 1080

for name, (dx, dy) in OFFSET.items():
    im = Image.open(src / f"{name}-cut.png").convert("RGBA")
    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    canvas.alpha_composite(im, (dx, dy))
    crop = canvas.crop((CROP_X, 0, CROP_X + CROP_W, CROP_H)).resize((480, 720), Image.LANCZOS)
    crop.save(out / f"{name}.webp", "WEBP", quality=84, method=6)
    print(name, (out / f"{name}.webp").stat().st_size // 1024, "KB")

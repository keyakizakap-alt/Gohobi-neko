"""
AI生成→背景切り抜き済みのねこ写真（1080x1080 PNG）を、アプリ用にそろえて書き出す。

  python3 scripts/prepare-cat-photos.py <切り抜き済みPNGのフォルダ>

- 入力は <フォルダ>/<名前>-cut.png
- すべての写真の足元の高さと体の中心をそろえる
- 横720 x 縦1080 の範囲で切り出し、480x720 の WebP（透過）にする
"""
import sys
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "public" / "cat"
out.mkdir(parents=True, exist_ok=True)

CROP_X, CROP_W, CROP_H = 180, 720, 1080

# 写真ごとの補正（元画像のピクセル）
#  - offset: (dx, dy) だけずらす
#  - fit:    横幅を指定のピクセルに縮め、足元を FLOOR_Y、中心を横の中央に合わせる（横長の寝姿用）
FLOOR_Y = 1040
SPEC = {
    "normal": {"offset": (0, 0)},
    "happy": {"offset": (0, 0)},
    "yawn": {"offset": (0, 0)},
    "eating": {"offset": (35, 140)},  # 前かがみで足元が高く、少し左に寄っている
    "hungry": {"offset": (0, 0)},
    "groom": {"offset": (-75, 0)},  # 頭をかしげ、耳が右にはみ出しているので左へ寄せる
    "sleep": {"fit": 640},  # 丸まった寝姿。横長なので幅に合わせて縮める
}

for name, spec in SPEC.items():
    path = src / f"{name}-cut.png"
    if not path.exists():
        print("skip", name)
        continue
    im = Image.open(path).convert("RGBA")
    canvas = Image.new("RGBA", im.size, (0, 0, 0, 0))
    if "fit" in spec:
        l, t, r, b = im.getbbox()
        body = im.crop((l, t, r, b))
        scale = spec["fit"] / body.width
        body = body.resize((round(body.width * scale), round(body.height * scale)), Image.LANCZOS)
        x = CROP_X + (CROP_W - body.width) // 2
        canvas.alpha_composite(body, (x, FLOOR_Y - body.height))
    else:
        canvas.alpha_composite(im, spec["offset"])
    crop = canvas.crop((CROP_X, 0, CROP_X + CROP_W, CROP_H)).resize((480, 720), Image.LANCZOS)
    crop.save(out / f"{name}.webp", "WEBP", quality=84, method=6)
    print(name, (out / f"{name}.webp").stat().st_size // 1024, "KB", "bbox", crop.getbbox())

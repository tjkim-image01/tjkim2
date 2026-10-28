"""banner-v1.jpg 의 한글 제목·부제를 종이 결로 덮고 영어·일본어 글자를 얹는다.

  python3 make_banner_i18n.py  →  banner-en-v1.jpg, banner-ja-v1.jpg
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).parent
SRC = HERE / "banner-v1.jpg"
INK = (24, 20, 18)
SUB = (40, 34, 30)
CX = 1280  # 배너 가운데 = 모바일 안전 영역 가운데

# 한글 글자가 있는 영역 — 가운데 구분선(매듭, y 768~806)은 남긴다
BOXES = [(640, 530, 1920, 768), (960, 806, 1600, 920)]
LIFT = 250  # 이만큼 위쪽 빈 종이에서 결을 가져온다

FONTS = {
    "en": {
        "title": ("/System/Library/Fonts/Supplemental/Baskerville.ttc", 1, 140, "TJ Kim Collection"),
        "sub": ("/System/Library/Fonts/Supplemental/Baskerville.ttc", 0, 50, "Korean History, Read Through Objects"),
    },
    "ja": {
        "title": ("/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc", 0, 128, "TJキム・コレクション"),
        "sub": ("/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc", 0, 54, "モノで読む韓国の歴史"),
    },
}


def cover(img):
    """종이보다 어두운 픽셀(글자와 그 번짐)만 골라 위쪽 종이 결로 채운다."""
    for x0, y0, x1, y1 in BOXES:
        box = img.crop((x0, y0, x1, y1))
        mask = box.convert("L").point(lambda v: 255 if v < 218 else 0)
        mask = mask.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(8))
        img.paste(img.crop((x0, y0 - LIFT, x1, y1 - LIFT)), (x0, y0), mask)


def text(draw, spec, cy, fill, tracking=0):
    path, index, size, s = spec
    font = ImageFont.truetype(path, size, index=index)
    if not tracking:
        draw.text((CX, cy), s, font=font, fill=fill, anchor="mm")
        return
    widths = [draw.textlength(c, font=font) for c in s]
    x = CX - (sum(widths) + tracking * (len(s) - 1)) / 2
    for c, w in zip(s, widths):
        draw.text((x, cy), c, font=font, fill=fill, anchor="lm")
        x += w + tracking


for lang, spec in FONTS.items():
    img = Image.open(SRC).convert("RGB")
    cover(img)
    d = ImageDraw.Draw(img)
    text(d, spec["title"], 672, INK)
    text(d, spec["sub"], 855, SUB, tracking=6 if lang == "en" else 14)
    out = HERE / f"banner-{lang}-v1.jpg"
    img.save(out, quality=92)
    print(out, out.stat().st_size)

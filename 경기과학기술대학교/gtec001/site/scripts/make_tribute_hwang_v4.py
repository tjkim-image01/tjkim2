"""황지영 교수님 축전 v4 (2026-10-24) — 조씨 가족 영화 포스터 v2(이마리 중심, Pureday M_charactor_02)를 바탕 그림으로 쓰고 축전 글씨를 얹는다.
v3(세 캐릭터 누끼 합성 + 문구 수정)의 글·서명·하단 정보는 그대로, 배치만 포스터의 아래 제목 여백으로 옮김. 글씨는 나눔 붓 스크립트.
→ public/catalog/tribute_hwang.jpg      실행: python -X utf8 scripts/make_tribute_hwang_v4.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
HERE = os.path.dirname(os.path.abspath(__file__))
POSTER = r"C:\Users\USER\Downloads\app\painter'sroom\pureworld\Pureday\M_charactor_02\images\2026-10-24\조씨 가족 영화 포스터 v1\jo_family_movie_poster_v2.png"
W, H = 1240, 1754

# 포스터(1792×2400, 3:4)를 폭 1240 으로 → 1661 높이, 위에 붙이고 아래 93px 는 포스터 바닥색으로 이어 붙인다
po = Image.open(POSTER).convert("RGB"); s = W / po.width; ph = round(po.height * s)
po = po.resize((W, ph), Image.LANCZOS)
base_col = tuple(int(v) for v in Image.fromarray(__import__("numpy").asarray(po)[ph - 40:ph - 2].reshape(-1, 3)).convert("RGB").resize((1, 1), Image.BOX).getpixel((0, 0)))
im = Image.new("RGBA", (W, H), base_col + (255,)); im.paste(po, (0, 0))
# 글 뒤 바탕: 포스터 아래 여백을 더 밝고 고르게 (y 1280 부터 서서히 크림으로)
band = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(band)
y0, y1 = 1250, 1430
for y in range(y0, H):
    a = 235 if y >= y1 else int(235 * (y - y0) / (y1 - y0))
    bd.line([(0, y), (W, y)], fill=(250, 246, 240, a))
im = Image.alpha_composite(im, band)
d = ImageDraw.Draw(im)

F = lambda f, s: ImageFont.truetype(os.path.join(HERE, "fonts", f), s)
BR = "NanumBrushScript-Regular.ttf"
F_K = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 21)
ink = (43, 40, 51, 255); soft = (107, 102, 117, 255); accent = (200, 107, 92, 255)


def fit(text, size, max_w=1080):
    while size > 36:
        f = F(BR, size)
        if d.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return F(BR, size)


# 상단 작은 머리글(하늘 부분)
d.text((W // 2, 58), "CONGRATULATIONS · 축전", font=F_K, fill=soft, anchor="mm"); d.rectangle((W // 2 - 60, 82, W // 2 + 60, 86), fill=accent)
# 본문: 포스터 아래 제목 여백
T1, T2 = "Move : 이소", "졸업전시를 축하합니다."
L1, L2 = "졸업은 휴재가 아니라 본격 연재의 시작입니다.", "첫 화를 응원합니다."
d.text((W // 2, 1368), T1 + "   " + T2, font=fit(T1 + "   " + T2, 82), fill=ink, anchor="mm")
d.text((W // 2, 1462), L1, font=fit(L1, 58), fill=ink, anchor="mm")
d.text((W // 2, 1536), L2, font=fit(L2, 58), fill=ink, anchor="mm")
d.text((W - 110, 1618), "황지영 드림", font=F(BR, 66), fill=ink, anchor="rm")
d.text((110, H - 72), "경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시회 · 2026. 10. 28 – 11. 02", font=F_K, fill=soft, anchor="lm")
d.text((110, H - 42), "이마리 · 조성민 · 조하임 — 퓨어데이 캐릭터 (가족 포스터 v2)", font=F_K, fill=(140, 134, 148, 255), anchor="lm")
# 편지 봉투 장식(하늘 양쪽)
for (ex, ey, ang, sc) in [(70, 120, -14, 1.0), (120, 250, 16, .7), (1060, 110, 20, 1.05), (1110, 250, -10, .75)]:
    w0, h0 = int(80 * sc), int(54 * sc); env = Image.new("RGBA", (w0, h0), (0, 0, 0, 0)); ed = ImageDraw.Draw(env)
    ed.rectangle((0, 0, w0 - 1, h0 - 1), fill=(255, 248, 234, 255), outline=(225, 205, 180, 255)); ed.polygon([(0, 0), (w0 // 2, int(h0 * .55)), (w0 - 1, 0)], fill=(236, 220, 196, 255)); ed.ellipse((w0 // 2 - 6, int(h0 * .45), w0 // 2 + 6, int(h0 * .45) + 12), fill=(200, 107, 92, 255))
    env = env.rotate(ang, expand=True, resample=Image.BICUBIC); im.alpha_composite(env, (ex, ey))
out = os.path.join(HERE, "..", "public", "catalog", "tribute_hwang.jpg"); im.convert("RGB").save(out, quality=92); print("saved", os.path.abspath(out))

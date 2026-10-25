"""황지영 교수님 축전 페이지 합성 v3 (v2 + 문구 수정 2026-10-24) — 이마리 + 조성민 박사 + 조하임(아들) 세 캐릭터가 함께, 글씨는 한글 흘림체(나눔 붓/펜 스크립트)
→ public/catalog/tribute_hwang.jpg      실행: python -X utf8 scripts/make_tribute_hwang.py
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = r"C:\Users\USER\Downloads\app\painter'sroom\pureworld\Pureday"
MARI = BASE + r"\W_charactor_15\images\2026-10-18\이마리 캐릭터 셋 v2\lee_mari_set_sheet_v2.png"
JO = BASE + r"\M_charactor_02\images\2026-10-18\조성민 캐릭터 셋 v3b\jo_seongmin_s2set_sheet_v3.png"
HAIM = BASE + r"\M_charactor_01\images\2026-10-18\시즌2 그림체 v3 샘플\jo_haim_s2style_v3_sheet_v1.png"
W, H = 1240, 1754

def cutout(path, height):
    """시트의 밝은 바탕을 투명으로. 캐릭터 높이를 height 로 맞춘다."""
    ch = Image.open(path).convert("RGB"); s = height / ch.height; cw, chh = int(ch.width * s), int(ch.height * s)
    c = ch.resize((cw, chh), Image.LANCZOS).convert("RGBA"); px = c.load()
    for y in range(chh):
        for x in range(cw):
            r, g, b, a = px[x, y]; mx, mn = max(r, g, b), min(r, g, b)
            if mx > 226 and mx - mn < 28: px[x, y] = (r, g, b, 0)
            elif mx > 212 and mx - mn < 36: px[x, y] = (r, g, b, int(255 * (1 - (mx - 212) / 14 * 0.6)))
    # 투명 여백 잘라내기
    bb = c.getbbox(); return c.crop(bb) if bb else c

im = Image.new("RGBA", (W, H), (252, 250, 245, 255)); d = ImageDraw.Draw(im)
for y in range(H):
    t = y / H; d.line([(0, y), (W, y)], fill=(int(252 + (236 - 252) * t), int(250 + (228 - 250) * t), int(245 + (242 - 245) * t), 255))
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
gd.ellipse((-100, H * 0.42, W + 100, H * 1.05), fill=(255, 214, 232, 95)); gd.ellipse((W * 0.2, H * 0.5, W * 0.8, H * 0.95), fill=(255, 240, 210, 70))
glow = glow.filter(ImageFilter.GaussianBlur(120)); im = Image.alpha_composite(im, glow)

# 세 사람: 조성민(왼쪽, 뒤) · 이마리(가운데, 앞) · 조하임(오른쪽, 뒤). 바닥선 y=H-150
floor = H - 150
jo = cutout(JO, int(H * 0.50)); mari = cutout(MARI, int(H * 0.52)); haim = cutout(HAIM, int(H * 0.515))
group_w = jo.width * 0.62 + mari.width * 0.72 + haim.width; x0 = int((W - group_w) / 2)
# 그림자
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh); sd.ellipse((x0 + 20, floor - 30, x0 + group_w - 20, floor + 22), fill=(60, 50, 70, 85)); sh = sh.filter(ImageFilter.GaussianBlur(18)); im = Image.alpha_composite(im, sh)
jx = x0 + 55; im.alpha_composite(jo, (jx, floor - jo.height + 6))
mx_ = int(x0 + jo.width * 0.62); hx = int(mx_ + mari.width * 0.72)
im.alpha_composite(haim, (hx, floor - haim.height + 4))
im.alpha_composite(mari, (mx_, floor - mari.height))
d = ImageDraw.Draw(im)

F = lambda f, s: ImageFont.truetype(os.path.join(HERE, "fonts", f), s)
BR = "NanumBrushScript-Regular.ttf"; PEN = "NanumPenScript-Regular.ttf"
F_T = F(BR, 112); F_B = F(BR, 70); F_S = F(BR, 78); F_K = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 22)
ink = (43, 40, 51, 255); soft = (107, 102, 117, 255); accent = (200, 107, 92, 255)
d.text((W // 2, 120), "CONGRATULATIONS · 축전", font=F_K, fill=soft, anchor="mm"); d.rectangle((W // 2 - 60, 146, W // 2 + 60, 151), fill=accent)
d.text((W // 2, 250), "Move : 이소", font=F_T, fill=ink, anchor="mm")
d.text((W // 2, 370), "졸업전시를 축하합니다.", font=F_T, fill=ink, anchor="mm")
# v3 (2026-10-24 문구 수정): "졸업은 휴재가 아니라 본격 연재의 시작입니다. 첫 화를 응원합니다." — 긴 줄은 폭 1060px 안에 들어가게 글자 크기 자동 축소
def fit(text, size, max_w=1060):
    while size > 40:
        f = F(BR, size)
        if d.textlength(text, font=f) <= max_w: return f
        size -= 2
    return F(BR, size)
L1, L2 = "졸업은 휴재가 아니라 본격 연재의 시작입니다.", "첫 화를 응원합니다."
d.text((W // 2, 520), L1, font=fit(L1, 70), fill=ink, anchor="mm")
d.text((W // 2, 605), L2, font=F_B, fill=ink, anchor="mm")
# 서명: 오른쪽 아래(캐릭터 옆)
d.text((W - 120, 705), "황지영 드림", font=F_S, fill=ink, anchor="rm")
d.text((110, H - 100), "경기과학기술대학교 웹툰일러스트학과 제3회 졸업전시회 · 2026. 10. 28 – 11. 02", font=F_K, fill=soft, anchor="lm")
d.text((110, H - 68), "이마리 · 조성민 · 조하임 — 퓨어데이 캐릭터", font=F_K, fill=(140, 134, 148, 255), anchor="lm")
# 편지 봉투 장식
for (ex, ey, ang, sc) in [(120, 180, -14, 1.0), (170, 330, 16, .75), (1040, 150, 20, 1.1), (1100, 330, -10, .8), (90, 760, 8, .8), (1110, 720, -16, .9)]:
    w0, h0 = int(80 * sc), int(54 * sc); env = Image.new("RGBA", (w0, h0), (0, 0, 0, 0)); ed = ImageDraw.Draw(env)
    ed.rectangle((0, 0, w0 - 1, h0 - 1), fill=(255, 248, 234, 255), outline=(225, 205, 180, 255)); ed.polygon([(0, 0), (w0 // 2, int(h0 * .55)), (w0 - 1, 0)], fill=(236, 220, 196, 255)); ed.ellipse((w0 // 2 - 6, int(h0 * .45), w0 // 2 + 6, int(h0 * .45) + 12), fill=(200, 107, 92, 255))
    env = env.rotate(ang, expand=True, resample=Image.BICUBIC); im.alpha_composite(env, (ex, ey))
out = os.path.join(HERE, "..", "public", "catalog", "tribute_hwang.jpg"); im.convert("RGB").save(out, quality=90); print("saved", os.path.abspath(out))

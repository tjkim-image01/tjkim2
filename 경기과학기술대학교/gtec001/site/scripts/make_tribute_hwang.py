"""황지영 교수님 축전 페이지 합성 — 이마리 캐릭터(W_charactor_15 v2) + 축전 문안 → public/catalog/tribute_hwang.jpg"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
SRC = r"C:\Users\USER\Downloads\app\painter'sroom\pureworld\Pureday\W_charactor_15\images\2026-10-18\이마리 캐릭터 셋 v2\lee_mari_set_sheet_v2.png"
W, H = 1240, 1754
im = Image.new("RGBA", (W, H), (252, 250, 245, 255)); d = ImageDraw.Draw(im)
# 배경: 아이보리 → 연보라·연분홍 파스텔 그라데이션(표지·캐릭터 시트 톤)
for y in range(H):
    t = y / H; r = int(252 + (238 - 252) * t); g = int(250 + (228 - 250) * t); b = int(245 + (240 - 245) * t); d.line([(0, y), (W, y)], fill=(r, g, b, 255))
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow); gd.ellipse((W * 0.35, H * 0.18, W * 1.15, H * 0.95), fill=(255, 214, 232, 90)); glow = glow.filter(ImageFilter.GaussianBlur(120)); im = Image.alpha_composite(im, glow)
# 캐릭터: 오른쪽 아래, 높이 62%. 시트의 밝은 바탕은 투명 처리
ch = Image.open(SRC).convert("RGB"); s = H * 0.62 / ch.height; cw, chh = int(ch.width * s), int(ch.height * s)
c = ch.resize((cw, chh), Image.LANCZOS).convert("RGBA"); px = c.load()
for y in range(chh):
    for x in range(cw):
        r, g, b, a = px[x, y]; mx, mn = max(r, g, b), min(r, g, b)
        if mx > 228 and mx - mn < 26: px[x, y] = (r, g, b, 0)
        elif mx > 215 and mx - mn < 34: px[x, y] = (r, g, b, int(255 * (1 - (mx - 215) / 13 * 0.6)))
cx, cy = W - cw - 90, H - chh - 170
sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(sh); sd.ellipse((cx + cw * 0.18, H - 195, cx + cw * 0.82, H - 150), fill=(60, 50, 70, 80)); sh = sh.filter(ImageFilter.GaussianBlur(16)); im = Image.alpha_composite(im, sh)
im.alpha_composite(c, (cx, cy)); d = ImageDraw.Draw(im)
def font(names, size):
    for f in names:
        p = "C:/Windows/Fonts/" + f
        if os.path.exists(p): return ImageFont.truetype(p, size)
    return ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", size)
F_T = font(["HANBatangB.ttf", "HANBatang.ttf", "malgunbd.ttf"], 60); F_B = font(["HANBatang.ttf", "malgun.ttf"], 42); F_S = font(["HANBatangB.ttf", "HANBatang.ttf", "malgunbd.ttf"], 46); F_K = font(["malgun.ttf"], 22)
ink = (43, 40, 51, 255); soft = (107, 102, 117, 255); accent = (200, 107, 92, 255)
d.text((110, 130), "CONGRATULATIONS · 축전", font=F_K, fill=soft); d.rectangle((110, 170, 230, 176), fill=accent)
d.text((110, 225), "《Move : 이소》", font=F_T, fill=ink); d.text((110, 310), "졸업전시를 축하합니다.", font=F_T, fill=ink)
d.text((110, 460), "둥지를 떠나는 오늘,", font=F_B, fill=ink)
d.text((110, 525), "더 높이 날아오를 내일을", font=F_B, fill=ink)
d.text((110, 590), "응원합니다.", font=F_B, fill=ink)
d.text((110, H - 300), "황지영 드림", font=F_S, fill=ink)
d.text((110, H - 225), "경기과학기술대학교 웹툰일러스트학과", font=F_K, fill=soft); d.text((110, H - 193), "제4회 졸업전시회 · 2026. 10. 28 – 11. 02", font=F_K, fill=soft)
# 편지 봉투 장식(표지 모티프) — 글·얼굴을 피해 왼쪽 중간·오른쪽 위에
for (ex, ey, ang, sc) in [(150, 760, -14, 1.0), (300, 840, 16, .8), (980, 160, 20, 1.1), (1080, 300, -10, .8), (520, 700, 6, .7)]:
    w0, h0 = int(80 * sc), int(54 * sc); env = Image.new("RGBA", (w0, h0), (0, 0, 0, 0)); ed = ImageDraw.Draw(env)
    ed.rectangle((0, 0, w0 - 1, h0 - 1), fill=(255, 248, 234, 255), outline=(225, 205, 180, 255)); ed.polygon([(0, 0), (w0 // 2, int(h0 * .55)), (w0 - 1, 0)], fill=(236, 220, 196, 255)); ed.ellipse((w0 // 2 - 6, int(h0 * .45), w0 // 2 + 6, int(h0 * .45) + 12), fill=(200, 107, 92, 255))
    env = env.rotate(ang, expand=True, resample=Image.BICUBIC); im.alpha_composite(env, (ex, ey))
out = os.path.join(os.path.dirname(__file__), "..", "public", "catalog", "tribute_hwang.jpg"); im.convert("RGB").save(out, quality=90); print("saved", os.path.abspath(out))

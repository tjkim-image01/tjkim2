"""황지영 교수님 축전 v6 (2026-10-26) — v5(가족 네 명 그림, A4 맞춤)에서 그림 속 고딕 글씨를 지우고(OpenCV inpaint) 같은 자리에 흘림체(나눔 붓 스크립트)로 다시 쓴다.
글: 졸업전시를 축하합니다. / 둥지를 떠나는 오늘, / 더 높이 날아오를 내일을 응원합니다 / 황지영 교수
→ public/catalog/tribute_hwang.jpg      실행: python -X utf8 scripts/make_tribute_hwang_v6.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
import cv2
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\USER\.codex\generated_images\01a12dfa-c5a7-79e1-a6dd-a3fb288e8dce\exec-cae33e2a-9728-4063-be56-1cfa8eec4f37.png"
W, H = 1240, 1754

po = Image.open(SRC).convert("RGB"); ph = round(po.height * W / po.width)
po = po.resize((W, ph), Image.LANCZOS)

# 1) 원래 글씨 지우기 — 글씨 상자 안의 남색 획(+번진 가장자리)을 마스크로 잡아 주변 배경으로 메운다
a = np.asarray(po).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = (r * 299 + g * 587 + b * 114) // 1000
ink = (lum < 200) & (b >= r - 10)          # 남색 글씨와 그 가장자리(밝은 배경 위라 이 정도면 글씨만 잡힘)
BOXES = [(92, 192, 258, 988), (195, 257, 412, 830), (258, 320, 264, 982), (1566, 1622, 505, 735)]  # (y0, y1, x0, x1)
mask = np.zeros(ink.shape, np.uint8)
for y0, y1, x0, x1 in BOXES: mask[y0:y1, x0:x1] = ink[y0:y1, x0:x1] * 255
mask = cv2.dilate(mask, np.ones((7, 7), np.uint8), iterations=1)
bgr = cv2.cvtColor(np.asarray(po), cv2.COLOR_RGB2BGR)
bgr = cv2.inpaint(bgr, mask, 9, cv2.INPAINT_TELEA)
# 메운 자리에 남는 옅은 자국은 살짝 흐려서 고르게
soft = cv2.GaussianBlur(cv2.dilate(mask, np.ones((15, 15), np.uint8)), (0, 0), 6)[..., None] / 255.0
bgr = (bgr * (1 - soft) + cv2.GaussianBlur(bgr, (0, 0), 5) * soft).astype(np.uint8)
po = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))

# 2) A4 맞춤(v5 와 같음): 위에 그림, 아래 띠는 그림 바닥색 + 전시 정보
a = np.asarray(po)[ph - 30:ph - 4, W // 2 - 200:W // 2 + 200].reshape(-1, 3)
base = tuple(int(c) for c in a.mean(axis=0))
im = Image.new("RGB", (W, H), base); im.paste(po, (0, 0))
fade = Image.new("RGB", (W, 24), base); mask = Image.linear_gradient("L").resize((W, 24))
im.paste(fade, (0, ph - 24), mask)
im = im.convert("RGBA")

# 3) 흘림체 글씨 — 글 뒤에 흰 빛을 깔아 배경 위에서도 읽히게
F = lambda s: ImageFont.truetype(os.path.join(HERE, "fonts", "NanumBrushScript-Regular.ttf"), s)
navy = (28, 36, 82, 255)
LINES = [("졸업전시를 축하합니다", 138, 112), ("둥지를 떠나는 오늘,", 224, 74), ("더 높이 날아오를 내일을 응원합니다", 290, 74), ("황지영 교수", 1592, 64)]
glow = Image.new("RGBA", (W, H), (255, 255, 255, 0)); gd = ImageDraw.Draw(glow)
for t, y, s in LINES: gd.text((W // 2, y), t, font=F(s), fill=(255, 255, 255, 200), anchor="mm", stroke_width=6, stroke_fill=(255, 255, 255, 200))
im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(9)))
d = ImageDraw.Draw(im)
for t, y, s in LINES: d.text((W // 2, y), t, font=F(s), fill=navy, anchor="mm")
# 붓 글꼴의 마침표는 글자 폭이 넓어 멀리 떨어지므로, 첫 줄 마지막 글자 '다'의 실제 획 끝(오른쪽·아래) 바로 옆에 따로 찍는다
tl = Image.new("L", (W, 260), 0); ImageDraw.Draw(tl).text((W // 2, 138), LINES[0][0], font=F(112), fill=255, anchor="mm")
ta = np.asarray(tl) > 96; cols = np.where(ta.any(0))[0]; x1 = cols.max(); tail = ta[:, x1 - 50:x1 + 1]; y1 = np.where(tail.any(1))[0].max()
d.ellipse((x1 + 6, y1 - 11, x1 + 16, y1 - 1), fill=navy)

d.text((W // 2, ph + (H - ph) // 2), "경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시회 · 2026. 10. 28 – 11. 02",
       font=ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 21), fill=(107, 102, 117, 255), anchor="mm")
out = os.path.join(HERE, "..", "public", "catalog", "tribute_hwang.jpg"); im.convert("RGB").save(out, quality=90); print("saved", os.path.abspath(out), im.size)

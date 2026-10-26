"""황지영 교수님 축전 v5 (2026-10-26) — 사용자가 준 완성 그림(가족 네 명, 축전 글씨 포함 1086×1448, 3:4)으로 교체.
다른 축전과 같은 A4 비율(1240×1754, 3D 플래카드 1.7×2.4)로 맞추려고 폭 1240 으로 키워 위에 두고, 아래 남는 띠는 그림 바닥색으로 이어 전시 정보 한 줄을 넣는다.
→ public/catalog/tribute_hwang.jpg      실행: python -X utf8 scripts/make_tribute_hwang_v5.py"""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\USER\.codex\generated_images\01a12dfa-c5a7-79e1-a6dd-a3fb288e8dce\exec-cae33e2a-9728-4063-be56-1cfa8eec4f37.png"
W, H = 1240, 1754

po = Image.open(SRC).convert("RGB"); ph = round(po.height * W / po.width)
po = po.resize((W, ph), Image.LANCZOS)
# 띠 색: 그림 바닥 가운데(꽃 없는 크림 부분)의 평균
a = np.asarray(po)[ph - 30:ph - 4, W // 2 - 200:W // 2 + 200].reshape(-1, 3)
base = tuple(int(c) for c in a.mean(axis=0))
im = Image.new("RGB", (W, H), base); im.paste(po, (0, 0))
# 이음매가 보이지 않게 그림 바닥 24px 를 띠 색으로 서서히 녹인다
fade = Image.new("RGB", (W, 24), base); mask = Image.linear_gradient("L").resize((W, 24))
im.paste(fade, (0, ph - 24), mask)
d = ImageDraw.Draw(im)
F_K = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 21)
soft = (107, 102, 117)
d.text((W // 2, ph + (H - ph) // 2), "경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시회 · 2026. 10. 28 – 11. 02", font=F_K, fill=soft, anchor="mm")
out = os.path.join(HERE, "..", "public", "catalog", "tribute_hwang.jpg"); im.save(out, quality=90); print("saved", os.path.abspath(out), im.size, "band", base)

"""개회식 진행 캐릭터 초상 → public/hosts/dean.png · public/hosts/mc.png (600×840, 투명 배경). 실행: python -X utf8 scripts/make_hosts.py
- 학과장 고원상: scripts/_src/dean_webtoon_chatgpt.png (ChatGPT 가 본인 증명사진을 보고 그린 웹툰풍 전신, 프롬프트 _src/dean_prompt.txt) 가 있으면 그걸 쓰고,
  없으면 증명사진(경기과학기술대학교/KakaoTalk_20261024_124652097.jpg)에서 얼굴만 잘라 웹툰 필터 + 정장 몸으로 만든다.
- 졸전 준비 위원장 안소희: 작가 프로필 캐릭터(public/artists/we18/avatar.jpg) 카드.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import os, cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, "..")
PHOTO = os.path.join(SITE, "..", "..", "KakaoTalk_20261024_124652097.jpg")
GEN = os.path.join(HERE, "_src", "dean_webtoon_chatgpt.png")
AVATAR = os.path.join(SITE, "public", "artists", "we18", "avatar.jpg")
W, H = 600, 840
F = lambda f, s: ImageFont.truetype(f"C:/Windows/Fonts/{f}", s)
ink = (43, 40, 51, 255); soft = (107, 102, 117, 255); cream = (252, 250, 245, 255)

def plate(d, name, role, y=680, color=cream):
    d.rounded_rectangle((120, y, 480, y + 118), radius=24, fill=color)
    d.text((300, y + 36), name, font=F("malgunbd.ttf", 44), fill=ink, anchor="mm")
    d.text((300, y + 86), role, font=F("malgun.ttf", 22), fill=soft, anchor="mm")

def white_to_alpha(g, hard=238, soft_=222):
    """바깥 흰 배경만 투명으로. 눈 흰자·와이셔츠처럼 인물 안쪽의 흰색은 테두리와 이어지지 않으므로 남긴다."""
    g = g.convert("RGBA"); a = np.array(g); mn = a[..., :3].min(axis=2)
    near = (mn > soft_).astype(np.uint8)                       # 흰색에 가까운 픽셀
    n, lab = cv2.connectedComponents(near, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))); border.discard(0)
    bg = np.isin(lab, list(border))                              # 테두리와 이어진 흰 영역 = 배경
    alpha = np.where(bg & (mn > hard), 0, np.where(bg, (255 * (hard - mn.astype(np.int32)) / (hard - soft_)).astype(np.int32), 255)).astype(np.uint8)
    a[..., 3] = np.minimum(a[..., 3], alpha); return Image.fromarray(a, "RGBA")

# ---------- 학과장 ----------
if os.path.exists(GEN):
    g = white_to_alpha(Image.open(GEN)); g = g.crop(g.getbbox())
    fig_h = 690; sc = fig_h / g.height; g = g.resize((int(g.width * sc), fig_h), Image.LANCZOS)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); im.alpha_composite(g, (int(300 - g.width / 2), 12)); d = ImageDraw.Draw(im)
    plate(d, "고원상", "웹툰일러스트학과 학과장", y=712)
    im.save(os.path.join(SITE, "public", "hosts", "dean.png")); print("dean ok (chatgpt webtoon)")
else:
    def toon(pil):
        bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR); bgr = cv2.resize(bgr, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
        sm = cv2.bilateralFilter(bgr, 15, 90, 9); sm = cv2.stylization(sm, sigma_s=60, sigma_r=0.55); sm = cv2.bilateralFilter(sm, 9, 60, 7)
        Z = sm.reshape((-1, 3)).astype(np.float32); _, lab, cen = cv2.kmeans(Z, 9, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0), 2, cv2.KMEANS_PP_CENTERS)
        col = cv2.addWeighted(cen[lab.flatten()].astype(np.uint8).reshape(sm.shape), 0.55, sm, 0.45, 0)
        gray = cv2.GaussianBlur(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY), (5, 5), 0); ed = cv2.GaussianBlur(cv2.dilate(cv2.Canny(gray, 35, 95), np.ones((2, 2), np.uint8)), (3, 3), 0)
        a = (ed.astype(np.float32) / 255.0 * 0.75)[..., None]; out = (col.astype(np.float32) * (1 - a) + np.array([48, 40, 43], dtype=np.float32) * a).astype(np.uint8)
        return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
    ph = ImageOps.exif_transpose(Image.open(PHOTO)).convert("RGB")
    face = ph.crop((52, 16, 158, 186)); face = toon(face.resize((face.width * 4, face.height * 4), Image.LANCZOS))
    s = 330 / face.height; face = face.resize((int(face.width * s), 330), Image.LANCZOS)
    mask = Image.new("L", face.size, 0); ImageDraw.Draw(mask).ellipse((2, 2, face.width - 3, face.height - 3), fill=255); face.putalpha(mask.filter(ImageFilter.GaussianBlur(3)))
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((110, 400, 490, 840), radius=70, fill=(43, 46, 88, 255)); d.polygon([(300, 405), (232, 445), (300, 640), (368, 445)], fill=cream); d.polygon([(300, 445), (284, 476), (300, 600), (316, 476)], fill=(200, 107, 92, 255)); d.ellipse((262, 388, 338, 430), fill=(236, 208, 190, 255))
    fx, fy = int(300 - face.width / 2), int(395 - face.height); d.ellipse((fx - 8, fy - 8, fx + face.width + 8, fy + face.height + 8), fill=cream); im.alpha_composite(face, (fx, fy)); d = ImageDraw.Draw(im)
    plate(d, "고원상", "웹툰일러스트학과 학과장"); im.save(os.path.join(SITE, "public", "hosts", "dean.png")); print("dean ok (photo filter)")

# ---------- 졸전 준비 위원장 안소희 ----------
av = Image.open(AVATAR).convert("RGB").resize((470, 470), Image.LANCZOS)
im2 = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d2 = ImageDraw.Draw(im2)
d2.rounded_rectangle((50, 40, 550, 640), radius=40, fill=cream); d2.rounded_rectangle((50, 40, 550, 70), radius=14, fill=(233, 138, 168, 255))
card = Image.new("RGBA", av.size, (0, 0, 0, 0)); cm = Image.new("L", av.size, 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, 469, 469), radius=30, fill=255); card.paste(av, (0, 0)); card.putalpha(cm)
im2.alpha_composite(card, (65, 95)); d2 = ImageDraw.Draw(im2)
d2.text((300, 605), "웹툰 「좀순愛」 작가 · 부스 WE18", font=F("malgun.ttf", 22), fill=soft, anchor="mm")
plate(d2, "안소희", "졸전 준비 위원장"); im2.save(os.path.join(SITE, "public", "hosts", "mc.png")); print("mc ok")

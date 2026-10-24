"""개회식 진행 캐릭터 초상 — 학과장 고원상(본인 사진 얼굴 + 정장 몸), 졸전 준비 위원장 안소희(작가 캐릭터 카드)
→ public/hosts/dean.png · public/hosts/mc.png (600×840, 투명 배경)   실행: python -X utf8 scripts/make_hosts.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance
import os, cv2, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, "..")
PHOTO = os.path.join(SITE, "..", "..", "KakaoTalk_20261024_124652097.jpg")
AVATAR = os.path.join(SITE, "public", "artists", "we18", "avatar.jpg")
W, H = 600, 840
F = lambda f, s: ImageFont.truetype(f"C:/Windows/Fonts/{f}", s)
ink = (43, 40, 51, 255); soft = (107, 102, 117, 255); cream = (252, 250, 245, 255)

def plate(d, name, role, y=680, color=cream):
    d.rounded_rectangle((120, y, 480, y + 118), radius=24, fill=color)
    d.text((300, y + 36), name, font=F("malgunbd.ttf", 44), fill=ink, anchor="mm")
    d.text((300, y + 86), role, font=F("malgun.ttf", 22), fill=soft, anchor="mm")

# ---------- 학과장: 사진에서 얼굴만 ----------
ph = ImageOps.exif_transpose(Image.open(PHOTO)).convert("RGB")
arr = cv2.cvtColor(np.array(ph), cv2.COLOR_RGB2BGR)
faces = []
try:
    casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = casc.detectMultiScale(cv2.cvtColor(arr, cv2.COLOR_BGR2GRAY), 1.1, 4)
except Exception as ex: print("얼굴 검출 모듈 없음 → 증명사진 기준 고정 좌표 사용:", ex)
if len(faces): x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
else: x, y, w, h = int(ph.width * 0.30), int(ph.height * 0.17), int(ph.width * 0.43), int(ph.height * 0.47)  # 증명사진(205×273) 얼굴 위치
# 얼굴 상자보다 넉넉히(머리카락·턱 포함) 타원으로 자른다
cx, cy = x + w / 2, y + h * 0.5; rw, rh = w * 0.72, h * 0.95
box = (int(cx - rw), int(cy - rh - h * 0.05), int(cx + rw), int(cy + rh))
box = (max(0, box[0]), max(0, box[1]), min(ph.width, box[2]), min(ph.height, box[3]))
if not len(faces): box = (52, 16, 158, 186)  # 증명사진: 머리 윗부분~턱, 어깨·정장은 제외("얼굴만")
face = ph.crop(box)
# 작은 증명사진이라 4배 확대 → 웹툰 스타일(면은 평평하게, 선은 먹선): 양방향 필터 반복 + 색 단계 축소 + 적응 임계 먹선
face = face.resize((face.width * 4, face.height * 4), Image.LANCZOS)
def toon(pil):
    """작은 증명사진용 웹툰 필터: 노이즈를 먼저 크게 누르고(스타일라이즈) → 색 8단계 → 부드러운 캐니 먹선"""
    bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    bgr = cv2.resize(bgr, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    sm = cv2.bilateralFilter(bgr, 15, 90, 9)
    sm = cv2.stylization(sm, sigma_s=60, sigma_r=0.55)
    sm = cv2.bilateralFilter(sm, 9, 60, 7)
    Z = sm.reshape((-1, 3)).astype(np.float32)
    _, lab, cen = cv2.kmeans(Z, 9, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 15, 1.0), 2, cv2.KMEANS_PP_CENTERS)
    flat = cen[lab.flatten()].astype(np.uint8).reshape(sm.shape)
    col = cv2.addWeighted(flat, 0.55, sm, 0.45, 0)
    # 피부 밝고 따뜻하게
    hsv = cv2.cvtColor(col, cv2.COLOR_BGR2HSV).astype(np.float32); hsv[..., 1] *= 1.12; hsv[..., 2] *= 1.10; hsv = np.clip(hsv, 0, 255).astype(np.uint8); col = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    gray = cv2.GaussianBlur(cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    ed = cv2.Canny(gray, 35, 95); ed = cv2.dilate(ed, np.ones((2, 2), np.uint8)); ed = cv2.GaussianBlur(ed, (3, 3), 0)
    a = (ed.astype(np.float32) / 255.0 * 0.75)[..., None]
    ink_c = np.array([48, 40, 43], dtype=np.float32)
    out = (col.astype(np.float32) * (1 - a) + ink_c * a).astype(np.uint8)
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))
face = toon(face)
target_h = 330; s = target_h / face.height; face = face.resize((int(face.width * s), target_h), Image.LANCZOS)
mask = Image.new("L", face.size, 0); ImageDraw.Draw(mask).ellipse((2, 2, face.width - 3, face.height - 3), fill=255); mask = mask.filter(ImageFilter.GaussianBlur(3))
face.putalpha(mask)
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
# 몸: 남색 정장 + 흰 셔츠 + 넥타이(기존 자리표시와 같은 실루엣)
d.rounded_rectangle((110, 400, 490, 840), radius=70, fill=(43, 46, 88, 255))
d.polygon([(300, 405), (232, 445), (300, 640), (368, 445)], fill=(252, 250, 245, 255))
d.polygon([(300, 445), (284, 476), (300, 600), (316, 476)], fill=(200, 107, 92, 255))
d.ellipse((262, 388, 338, 430), fill=(236, 208, 190, 255))  # 목
# 얼굴 뒤 흰 테두리(스티커 느낌)
ring = Image.new("RGBA", (W, H), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
fx, fy = int(300 - face.width / 2), int(395 - face.height)
rd.ellipse((fx - 8, fy - 8, fx + face.width + 8, fy + face.height + 8), fill=(252, 250, 245, 255)); im = Image.alpha_composite(im, ring)
im.alpha_composite(face, (fx, fy)); d = ImageDraw.Draw(im)
plate(d, "고원상", "웹툰일러스트학과 학과장")
im.save(os.path.join(SITE, "public", "hosts", "dean.png")); print("dean ok, face box", box)

# ---------- 졸전 준비 위원장 안소희: 작가 캐릭터 카드 ----------
av = Image.open(AVATAR).convert("RGB").resize((470, 470), Image.LANCZOS)
im2 = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d2 = ImageDraw.Draw(im2)
d2.rounded_rectangle((50, 40, 550, 640), radius=40, fill=cream)
d2.rounded_rectangle((50, 40, 550, 70), radius=14, fill=(233, 138, 168, 255))  # 웹툰 분홍 띠
card = Image.new("RGBA", av.size, (0, 0, 0, 0)); cm = Image.new("L", av.size, 0); ImageDraw.Draw(cm).rounded_rectangle((0, 0, 469, 469), radius=30, fill=255); card.paste(av, (0, 0)); card.putalpha(cm)
im2.alpha_composite(card, (65, 95)); d2 = ImageDraw.Draw(im2)
d2.text((300, 605), "웹툰 「좀순愛」 작가 · 부스 WE18", font=F("malgun.ttf", 22), fill=soft, anchor="mm")
plate(d2, "안소희", "졸전 준비 위원장")
im2.save(os.path.join(SITE, "public", "hosts", "mc.png")); print("mc ok")

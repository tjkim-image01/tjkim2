"""배포용 웹 포스터 (2026-10-25) — 도록 표지 그림(박시온, 표지 PDF 3쪽 원본 2480×3508)을 바탕으로, 아래에 전시 정보와 QR 4개(홈·3D 전시장·작가·방명록).
카톡·SNS 로 나눠 주는 용도라 A 비율 1500×2121 JPG 한 장. 인쇄용은 만들지 않음(사용자 요청).
→ public/poster/move_iso_poster.jpg      실행: python -X utf8 scripts/make_poster_web.py"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import io, json, pymupdf, qrcode

HERE = Path(__file__).resolve().parent
SITE = HERE.parent
RAW = SITE.parent.parent  # 경기과학기술대학교/ (원자료, 읽기만)
OUT = SITE / "public" / "poster" / "move_iso_poster.jpg"
BASE = "https://hwangjiyoung1977-ops.github.io/2026gtec/"
EX = json.loads((SITE / "src" / "data" / "exhibition.json").read_text(encoding="utf-8"))
W, H = 1500, 2121

LINKS = [  # (이름, 영문, 주소)
    ("홈", "HOME", BASE),
    ("3D 전시장", "GALLERY", BASE + "#/gallery"),
    ("작가 42명", "ARTISTS", BASE + "#/artists"),
    ("방명록", "GUESTBOOK", BASE + "#/guestbook"),
]

night = (23, 26, 51); star = (255, 244, 214); soft = (206, 200, 228); accent = (200, 107, 92)
SERIF_B = "C:/Windows/Fonts/NanumMyeongjoExtraBold.ttf"
SERIF = "C:/Windows/Fonts/NanumMyeongjoBold.ttf"
SANS = "C:/Windows/Fonts/malgun.ttf"
SANS_B = "C:/Windows/Fonts/malgunbd.ttf"
F = ImageFont.truetype

# 1) 표지 그림(글자 없는 원본 이미지가 아니라 표지 3쪽 = 로고·새·우체통이 있는 그림) — PDF 안의 원본 픽셀을 그대로 꺼냄
doc = pymupdf.open(next(RAW.glob("*표지.pdf")))
xref = doc[2].get_images()[0][0]
cover = Image.open(io.BytesIO(doc.extract_image(xref)["image"])).convert("RGB").resize((W, H), Image.LANCZOS)
im = cover.convert("RGBA")

# 2) 아래쪽을 밤색으로 서서히 덮어 정보·QR 자리 확보 (우체통 윗부분은 비침)
fade = Image.new("RGBA", (W, H), (0, 0, 0, 0)); fd = ImageDraw.Draw(fade)
y0, y1 = 1270, 1500
for y in range(y0, H):
    a = 238 if y >= y1 else int(238 * ((y - y0) / (y1 - y0)) ** 1.4)
    fd.line([(0, y), (W, y)], fill=night + (a,))
im = Image.alpha_composite(im, fade)
d = ImageDraw.Draw(im)

# 3) 전시 정보
cx = W // 2
d.text((cx, 1548), EX["dates"], font=F(SERIF_B, 64), fill=star, anchor="mm")
d.text((cx, 1618), f'{EX["school"]} {EX["dept"]} {EX["edition"]}', font=F(SERIF, 34), fill=star, anchor="mm")
d.text((cx, 1668),"온라인 3D 가상 전시장 · 졸업생 42명 · 웹툰 · 일러스트 · 출판만화 · 애니메이션", font=F(SANS, 25), fill=soft, anchor="mm")

# 4) QR 카드 4장 — 흰 카드가 여백(quiet zone) 역할, 홈은 테라코타 테두리로 강조
card, gap, top = 264, 44, 1712
left = (W - (card * 4 + gap * 3)) // 2
for i, (ko, en, url) in enumerate(LINKS):
    x = left + i * (card + gap)
    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, box_size=10)
    q.add_data(url); q.make(fit=True)
    qi = q.make_image(fill_color=night, back_color="white").convert("RGB").resize((card - 40, card - 40), Image.NEAREST)
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x, top + 8, x + card, top + card + 8), 22, fill=(0, 0, 0, 110))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((x, top, x + card, top + card), 22, fill=(255, 255, 255),
                        outline=accent if i == 0 else None, width=6 if i == 0 else 0)
    im.paste(qi, (x + 20, top + 20))
    d.text((x + card // 2, top + card + 38), ko, font=F(SANS_B, 32), fill=star, anchor="mm")
    d.text((x + card // 2, top + card + 72), en, font=F(SANS, 18), fill=soft, anchor="mm")

# 5) 홈 주소 글자 (QR 못 찍는 사람용)
d.text((cx, H - 26),BASE.removeprefix("https://").rstrip("/"), font=F(SANS, 26), fill=star, anchor="mm")

OUT.parent.mkdir(parents=True, exist_ok=True)
im.convert("RGB").save(OUT, quality=90, optimize=True, progressive=True)
print(OUT, OUT.stat().st_size // 1024, "KB")

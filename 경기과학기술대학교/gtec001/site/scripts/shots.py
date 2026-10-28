"""미리보기 스크린샷 검수 — Playwright + 설치된 Chrome. dev 서버(5201)가 떠 있어야 한다.
실행: python -X utf8 scripts/shots.py [출력폴더]   → PC·휴대폰 화면 각 페이지 png
"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "../video/02_중간렌더"); OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:5201/#"
PAGES = [("home", "/", 2500), ("artists", "/artists", 2500), ("artist_we11", "/artists/we11", 3000), ("about", "/about", 2500), ("qr", "/qr", 3000),
         ("intro", "/intro", 5500), ("gallery_entrance", "/gallery?skipintro=1", 7000), ("booth_we11", "/gallery?booth=we11", 9000), ("booth_il04", "/gallery?booth=il04", 9000), ("booth_co04", "/gallery?booth=co04", 9000)]
IPHONE = dict(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
              user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    for tag, ctx_opts in [("pc", dict(viewport={"width": 1440, "height": 900})), ("m", IPHONE)]:
        ctx = b.new_context(**ctx_opts); pg = ctx.new_page()
        for name, path, wait in PAGES:
            pg.goto(BASE + path); pg.wait_for_timeout(wait)
            full = not path.startswith("/gallery") and not path.startswith("/intro")
            pg.screenshot(path=str(OUT / f"{tag}_{name}.png"), full_page=full)
            print("saved", tag, name)
        ctx.close()
    b.close()
print("done →", OUT.resolve())

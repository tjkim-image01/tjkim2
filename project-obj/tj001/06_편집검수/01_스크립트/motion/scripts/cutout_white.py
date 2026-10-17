"""흰 배경 캐릭터 PNG → 투명 PNG (가장자리에서 이어진 흰색만 제거, 옷 안의 흰색은 보존).
실행: /Users/jatu/app/youtube3/.venv-tts/bin/python scripts/cutout_white.py <in.png> [<in2.png>...]  → 05_제작소스/01_이미지/02_그림판/<이름>.png 덮어쓰기(원본은 _raw.png 로 보관)
"""
import sys
from collections import deque
from pathlib import Path
import numpy as np
from PIL import Image

for p in sys.argv[1:]:
    p = Path(p)
    raw = p.with_name(p.stem + "_raw.png")
    if not raw.exists():
        p.rename(raw)
    im = Image.open(raw).convert("RGBA"); a = np.array(im).astype(np.int16)
    rgb = a[..., :3]; h, w = rgb.shape[:2]
    white = (rgb.min(axis=2) > 232) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 18)
    seen = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    # 가장자리 부드럽게: 흰색에 가까운 경계 픽셀은 반투명
    edge = (~seen) & (rgb.min(axis=2) > 215)
    dil = seen.copy()
    for _ in range(2):
        dil = dil | np.roll(dil, 1, 0) | np.roll(dil, -1, 0) | np.roll(dil, 1, 1) | np.roll(dil, -1, 1)
    near = dil & edge
    alpha[near] = 120
    out = np.dstack([a[..., :3].astype(np.uint8), alpha])
    ys, xs = np.where(alpha > 0)
    crop = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(crop, "RGBA").save(p)
    print(p.name, crop.shape[1], "x", crop.shape[0])

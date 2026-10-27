"""로컬 DB(item_drive_media) 덤프의 Drive 파일 ID로 삐라 스캔을 내려받는다 (drive.google.com/thumbnail, 키 불필요). tj001 06_download_postcards.py 와 같다.
입력: 02_조사/01_원본자료/05_삐라_DB이미지목록_20261015.txt (item_code|n|title|year|location|file_ids)
출력: 05_제작소스/01_이미지/01_삐라/<item_code>_<n>.jpg, index.json
실행: python3 01_download_leaflets.py [per_item=4] [width=1600]
"""
import json, sys, time, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "02_조사/01_원본자료/05_삐라_DB이미지목록_20261015.txt"
OUT = ROOT / "05_제작소스/01_이미지/01_삐라"; OUT.mkdir(parents=True, exist_ok=True)
PER = int(sys.argv[1]) if len(sys.argv) > 1 else 4
W = int(sys.argv[2]) if len(sys.argv) > 2 else 1600
index, ok, fail = [], 0, 0
for line in SRC.read_text(encoding="utf-8").splitlines():
    if line.count("|") < 5: continue
    code, n, title, year, loc, ids = line.split("|", 5)
    files = []
    for i, fid in enumerate(ids.split(",")[:PER], 1):
        dst = OUT / f"{code}_{i}.jpg"
        if not dst.exists() or dst.stat().st_size < 1000:
            url = f"https://drive.google.com/thumbnail?id={fid}&sz=w{W}"
            for attempt in range(3):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(req, timeout=60) as r:
                        data = r.read(); ctype = r.headers.get("Content-Type", "")
                    if ctype.startswith("image/") and len(data) > 1000:
                        dst.write_bytes(data); ok += 1; break
                except Exception as e:
                    time.sleep(1.5 * (attempt + 1))
            else:
                fail += 1; print("FAIL", code, i, flush=True); continue
            time.sleep(0.25)
        files.append(dst.name)
    index.append({"code": code, "title": title, "year": year, "location": loc, "files": files})
    print(f"{code} {len(files)}/{n} {title[:50]}", flush=True)
(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"DONE downloaded={ok} failed={fail} items={len(index)}")

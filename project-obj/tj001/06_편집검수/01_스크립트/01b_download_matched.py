"""drive_tree_cache.json(공개 폴더 목록)과 재고 엽서 목록을 대조해, Drive에 스캔이 있는 엽서를 내려받는다."""
import json, re, sys, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT/"05_제작소스/01_이미지"; OUT.mkdir(exist_ok=True)
ENV = Path("/Users/jatu/app/tjkim/claude3/backend/.env")
KEY = next(l.split("=",1)[1].strip().strip('"') for l in ENV.read_text().splitlines() if l.startswith("GOOGLE_DRIVE_API_KEY="))
tree = json.load(open(Path(__file__).with_name("drive_tree_cache.json")))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.casefold())
inv = {}
for l in (ROOT/"02_조사/01_원본자료/03_재고_엽서집계_20261015.md").read_text(encoding="utf-8").splitlines():
    m = re.match(r"- (BOOK|MAP|OTHER|PRINT) (\S+) \| (.+?) \| (.*?) \|", l)
    if m: inv[norm(m.group(2))] = (m.group(2), m.group(3), m.group(4))
files = [f for v in tree.values() for f in v if f["mime"].startswith("image/")]
matched = {}
for f in files:
    stem = re.sub(r"\s*\(\d+\)\s*$", "", f["name"].rsplit(".",1)[0]); k = norm(stem)
    if k in inv: matched.setdefault(k, []).append(f)
print("postcards with drive images:", len(matched))
for k, fs in matched.items(): print(" ", inv[k][0], "|", inv[k][1][:70], "|", inv[k][2], "|", len(fs), "files")
limit = int(sys.argv[1]) if len(sys.argv) > 1 else 3
for k, fs in matched.items():
    fs = sorted(fs, key=lambda f: f["name"])
    for i, f in enumerate(fs[:limit], 1):
        dst = OUT / f"{inv[k][0]}_{i}{Path(f['name']).suffix.lower() or '.jpg'}"
        if dst.exists(): continue
        try:
            with urllib.request.urlopen(f"https://www.googleapis.com/drive/v3/files/{f['id']}?alt=media&key={KEY}", timeout=120) as r: dst.write_bytes(r.read())
            print("saved", dst.name, f["path"])
        except Exception as e: print("fail", f["name"], e)

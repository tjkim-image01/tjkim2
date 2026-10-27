"""공개 Google Drive 폴더(재고 시트 '이미지폴더' 탭)에서 엽서 Item No.로 스캔 이미지를 찾아 내려받는다.
API 키는 tjkim/claude3/backend/.env 의 GOOGLE_DRIVE_API_KEY 를 실행 시에만 읽는다(출력·복사하지 않음).
실행: python3 01_fetch_drive_images.py  → 05_제작소스/01_이미지/<ItemNo>_<n>.jpg
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "05_제작소스" / "01_이미지"; OUT.mkdir(parents=True, exist_ok=True)
ENV = Path("/Users/jatu/app/tjkim/claude3/backend/.env")
KEY = next((l.split("=",1)[1].strip().strip('"').strip("'") for l in ENV.read_text().splitlines() if l.startswith("GOOGLE_DRIVE_API_KEY=")), None)
if not KEY: sys.exit("API 키 없음")
FOLDERS = ["1Vr3zVVUbR9qk9SrFoAkM_1Y-ZZxw5Ler","1oWVP7uuznxXRy_fbBuM1hQFRPG5jFEcp","10dLw-77NNst1TwTwK3S3jFxXXR68Q3e-",
           "1ncfjuJHrw1C4RscigcDgdBDcTobzad-g","1CXquYSSP_J_QjOCItlp6si9os6H2mFgr","1KzBW3x016vfZoFCRIgwpH2twEbmK9yUo","1qcZlcNrXtpvHh-ZtJEiFFXF85QFXd7me"]
WANT = sys.argv[1:] or ["AP20130215008","APKC240601087","APAC190101059","APKC260209026","APKC240608103","APKC210925669-17","APKC231127237C-16","AP20120217012","APKC230615122A","APAC160221109","AP20150311253","APKC260209025"]
FOLDER_MIME = "application/vnd.google-apps.folder"

def api(params):
    url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode({**params, "key": KEY})
    with urllib.request.urlopen(url, timeout=60) as r: return json.load(r)

def list_all(q, fields="files(id,name,mimeType,size),nextPageToken"):
    out, tok = [], None
    while True:
        p = {"q": q, "fields": fields, "pageSize": 1000, "supportsAllDrives": "true", "includeItemsFromAllDrives": "true"}
        if tok: p["pageToken"] = tok
        d = api(p); out += d.get("files", []); tok = d.get("nextPageToken")
        if not tok: return out

# 1) 키만으로 이름 검색이 되는지 먼저 시도
hits = {}
try:
    for w in WANT:
        fs = list_all(f"name contains '{w}' and trashed=false")
        if fs: hits[w] = fs; print("direct", w, len(fs))
except Exception as e: print("direct search failed:", e)

# 2) 안 되면 폴더 트리 순회 (캐시 파일에 저장)
cache = Path(__file__).with_name("drive_tree_cache.json")
if not hits:
    tree = json.loads(cache.read_text()) if cache.exists() else {}
    stack = [(f, "") for f in FOLDERS]; seen = set(tree.keys())
    while stack:
        fid, pth = stack.pop()
        if fid in seen: continue
        try: fs = list_all(f"'{fid}' in parents and trashed=false")
        except Exception as e: print("list fail", fid, e); continue
        seen.add(fid); tree[fid] = [{"id":f["id"],"name":f["name"],"mime":f["mimeType"],"path":pth} for f in fs]
        for f in fs:
            if f["mimeType"] == FOLDER_MIME: stack.append((f["id"], pth + "/" + f["name"]))
        print(f"folder {pth or fid}: {len(fs)} files, {len(stack)} pending", flush=True)
        if len(seen) % 20 == 0: cache.write_text(json.dumps(tree, ensure_ascii=False))
    cache.write_text(json.dumps(tree, ensure_ascii=False))
    norm = lambda s: re.sub(r"[^a-z0-9]", "", s.casefold())
    for w in WANT:
        nw = norm(w)
        for fid, fs in tree.items():
            for f in fs:
                if f["mime"].startswith("image/") and norm(f["name"].rsplit(".",1)[0]).startswith(nw):
                    hits.setdefault(w, []).append({"id": f["id"], "name": f["name"], "mimeType": f["mime"], "path": f["path"]})

for w, fs in hits.items():
    for i, f in enumerate(fs[:6], 1):
        ext = Path(f["name"]).suffix or ".jpg"
        dst = OUT / f"{w}_{i}{ext}"
        if dst.exists(): continue
        url = f"https://www.googleapis.com/drive/v3/files/{f['id']}?alt=media&key={KEY}"
        try:
            with urllib.request.urlopen(url, timeout=120) as r: dst.write_bytes(r.read())
            print("saved", dst.name, f.get("path",""))
        except Exception as e: print("download fail", f["name"], e)
print("DONE hits:", {k: len(v) for k, v in hits.items()})

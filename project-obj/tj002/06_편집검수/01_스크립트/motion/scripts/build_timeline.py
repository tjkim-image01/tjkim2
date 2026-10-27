"""tj002 타임라인 — 음성 durations.json(숏·대사 시각) → src/timeline_<key>.json, public/narration_<key>.wav,
public/leaflets(실물)·thumbs(420px)·art(캐릭터 누끼)·sfx·fonts, public/bgm_<key>.wav.

키: short(1편 S01~S12) | long(롱폼 P0~P6) | D E F G H I J K L (숏 시리즈 — 한 대본의 파트가 각각 한 편)
실행: python3 scripts/build_timeline.py <key> [--mock]
  --mock: 음성이 아직 없을 때 대본 글자 수로 시간을 추정(정지 프레임 검수용). narration 은 무음.
"""
import json, os, re, shutil, subprocess, sys
from pathlib import Path
MOT = Path(__file__).resolve().parents[1]; ROOT = MOT.parents[2]
KEY = sys.argv[1]; MOCK = "--mock" in sys.argv
FPS = 30
IMG = ROOT / "05_제작소스/01_이미지"
S1, S2 = "DEFGHIJKL", "MNOPQR"
SERIES = KEY in list(S1 + S2)
if KEY == "long": SRC, V = ROOT / "03_원고/03_롱폼/01_대본_대화_v01.md", ROOT / "05_제작소스/03_음성/02_롱폼"
elif KEY == "long2": SRC, V = ROOT / "03_원고/03_롱폼/02_대본_대화_선전물100년_v01.md", ROOT / "05_제작소스/03_음성/05_롱폼2"
elif KEY in S1: SRC, V = ROOT / "03_원고/02_숏폼/02_대본_대화_시리즈_v01.md", ROOT / "05_제작소스/03_음성/03_숏폼시리즈"
elif KEY in S2: SRC, V = ROOT / "03_원고/02_숏폼/03_대본_대화_시리즈2_v01.md", ROOT / "05_제작소스/03_음성/04_숏폼시리즈2"
else: SRC, V = ROOT / "03_원고/02_숏폼/01_대본_대화_v01.md", ROOT / "05_제작소스/03_음성/01_숏폼"
LONGISH = KEY in ("long", "long2")
TITLES = {"P1": ["Part 1", "종이 폭탄"], "P2": ["Part 2", "종이 한 장에 뭘 적었나"], "P3": ["Part 3", "반대편도 뿌렸다"],
          "P4": ["Part 4", "풍선, 그리고 공책"], "P5": ["Part 5", "멈췄다가, 다시"], "P6": ["정리", "하늘에서 떨어진 DM"],
          "X1": ["Part 1", "판화로 판 전쟁"], "X2": ["Part 2", "포스터, 생활을 바꾸다"], "X3": ["Part 3", "포스터가 날개를 달다"],
          "X4": ["Part 4", "똑똑해진 종이"], "X5": ["Part 5", "다시 벽으로"], "X6": ["정리", "지금은 손바닥 위에"]}
part_of = lambda s: s.split("-")[0] if "-" in s else "S"

def table(md, first_col):
    rows, hdr = [], None
    for ln in md.splitlines():
        if not ln.startswith("|"): hdr = None if hdr and rows else hdr; continue
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        if hdr is None:
            if cells and cells[0] == first_col: hdr = cells
            continue
        if set("".join(cells)) <= set("-: "): continue
        rows.append(dict(zip(hdr, cells)))
    return rows

script_emo = {}
for r in table(SRC.read_text(encoding="utf-8"), "숏"):
    if r.get("대사"): script_emo.setdefault(r["숏"], []).append(r.get("감정", "일반"))

def mock_durations():
    rows = [r for r in table(SRC.read_text(encoding="utf-8"), "숏") if r.get("대사")]
    if SERIES: rows = [r for r in rows if part_of(r["숏"]) == KEY]
    GAP_IN, GAP_SHOT, GAP_PART, LEAD, TAIL = 0.24, 0.42, 1.9, 0.8, 2.2
    shots, t, prev_part, prev_shot = [], LEAD, None, None
    for r in rows:
        sid, p = r["숏"], part_of(r["숏"])
        if sid != prev_shot:
            if prev_shot is not None: t += GAP_PART if (LONGISH and p != prev_part) else GAP_SHOT
            shots.append({"shot": sid, "part": p, "start": round(t, 3), "end": None, "lines": []})
        elif shots[-1]["lines"]: t += GAP_IN
        txt = r["대사"]; dur = 0.55 + 0.175 * len(re.sub(r"[\s.,!?…]", "", txt))
        shots[-1]["lines"].append({"who": r["화자"], "text": r.get("자막") or txt, "speech": round(dur, 3), "file": f"typecast/{p}/{r['화자']}/{sid}.wav", "at": round(t, 3), "emotion": r.get("감정", "일반"), "say": txt})
        t += dur; shots[-1]["end"] = round(t, 3); prev_part, prev_shot = p, sid
    return {"voice": "mock", "total": round(t + TAIL, 3), "shots": shots}

if MOCK:
    d = mock_durations()
else:
    d = json.loads((V / "tts/durations.json").read_text(encoding="utf-8"))
    if SERIES:
        shots = [s for s in d["shots"] if s["part"] == KEY]
        off = shots[0]["start"] - 0.8
        for s in shots:
            s["start"] = round(s["start"] - off, 3); s["end"] = round(s["end"] - off, 3)
            for ln in s["lines"]: ln["at"] = round(ln["at"] - off, 3)
        d = {"voice": d["voice"], "total": round(shots[-1]["end"] + 2.2, 3), "shots": shots, "_offset": off}
# 대사 감정: 음성 lines.json 이 있으면 그것, 없으면 대본
emo = {}
for f in sorted((V / "typecast").glob("*/lines.json")) if V.exists() else []:
    for ln in json.loads(f.read_text()):
        emo[(f.parent.name, ln["file"])] = ln.get("emotion", "일반")
parts, shots, lines = [], [], []
for sh in d["shots"]:
    p = sh["part"]
    if not parts or parts[-1]["id"] != p:
        parts.append({"id": p, "title": TITLES.get(p) if LONGISH else None, "header": "", "firstLine": sh["lines"][0]["at"], "start": sh["start"], "end": sh["end"]})
    parts[-1]["end"] = sh["end"]
    shots.append({"id": sh["shot"], "part": p, "start": sh["start"], "end": sh["end"]})
    for i, ln in enumerate(sh["lines"]):
        try: _, part, fname = ln["file"].split("/", 2)
        except ValueError: part, fname = p, ""
        e = emo.get((part, fname)) or ln.get("emotion") or (script_emo.get(sh["shot"], ["일반"] * 9)[i] if i < len(script_emo.get(sh["shot"], [])) else "일반")
        lines.append({"part": p, "shot": sh["shot"], "who": ln["who"], "emo": e, "text": ln["say"], "sub": ln["text"], "start": ln["at"], "end": round(ln["at"] + ln["speech"], 3), "words": []})
for i, p in enumerate(parts):
    p["end"] = parts[i + 1]["start"] if i + 1 < len(parts) else d["total"]
for i, s in enumerate(shots):
    s["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else d["total"]
shots[0]["start"] = 0.0   # 첫 장면은 0초부터

pub = MOT / "public"; pub.mkdir(exist_ok=True)
nar = pub / f"narration_{KEY}.wav"
if MOCK:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(d["total"]), str(nar)], check=True)
elif SERIES:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(d["_offset"]), "-t", str(d["total"]), "-i", str(V / "narration.wav"), str(nar)], check=True)
else:
    shutil.copy(V / "narration.wav", nar)
TH = IMG / "01_삐라_thumb"; TH.mkdir(exist_ok=True)
for f in sorted((IMG / "01_삐라").glob("*.jpg")):
    o = TH / f.name
    if not o.exists():
        subprocess.run(["sips", "-Z", "420", str(f), "--out", str(o)], capture_output=True, check=True)
CUT = IMG / "02_그림판_누끼"; CUT.mkdir(exist_ok=True)
todo = []
for f in sorted((IMG / "02_그림판").glob("CHAR_*.png")):
    if f.stem.endswith("_raw"): continue
    o = CUT / f.name
    if not o.exists() or o.stat().st_mtime < f.stat().st_mtime:
        shutil.copy(f, o); (CUT / (f.stem + "_raw.png")).unlink(missing_ok=True); todo.append(str(o))
if todo:
    subprocess.run(["/Users/jatu/app/youtube3/.venv-tts/bin/python", str(MOT / "scripts/cutout_white.py"), *todo], check=True)
for name, src in [("leaflets", IMG / "01_삐라"), ("thumbs", TH), ("art", CUT), ("sfx", ROOT / "05_제작소스/04_음악효과음/sfx")]:
    dst = pub / name
    if dst.is_symlink(): dst.unlink()
    elif dst.exists(): shutil.rmtree(dst)
    os.symlink(src, dst)
fonts = pub / "fonts"; fonts.mkdir(exist_ok=True)
for f in (ROOT / "05_제작소스/05_폰트").glob("*.*"):
    if not (fonts / f.name).exists(): shutil.copy(f, fonts / f.name)
art = sorted(x.name for x in CUT.glob("CHAR_*.png") if not x.stem.endswith("_raw"))
bgm = ROOT / "05_제작소스/04_음악효과음/bgm_flow.wav"
if bgm.exists():
    shutil.copy(bgm, pub / f"bgm_{KEY}.wav"); art.append("bgm")
tl = {"fps": FPS, "duration": d["total"], "art": art, "parts": parts, "shots": shots, "lines": lines, "mock": MOCK}
(MOT / "src" / f"timeline_{KEY}.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({"key": KEY, "mock": MOCK, "duration": d["total"], "shots": [(s["id"], s["start"], s["end"]) for s in shots], "lines": len(lines)}, ensure_ascii=False))

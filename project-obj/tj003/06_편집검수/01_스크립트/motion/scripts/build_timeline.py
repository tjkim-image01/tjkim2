"""tj003 타임라인 — 음성 durations.json(숏·대사 시각) → src/timeline_<key>.json, public/narration_<key>.wav, public 자산 링크.
키: long | A | B | C (쇼츠는 한 대본의 A/B/C 파트가 각각 한 편).

실행: python3 scripts/build_timeline.py long|A|B|C [--mock]
  --mock: 음성이 아직 없을 때 대본 글자 수로 시간을 추정해 타임라인만 만든다(정지 프레임 검수용). narration 은 무음.
"""
import json, os, re, shutil, subprocess, sys
from pathlib import Path
MOT = Path(__file__).resolve().parents[1]; ROOT = MOT.parents[2]
KEY = sys.argv[1]; MOCK = "--mock" in sys.argv
FPS, BPM = 30, 108
LONG = KEY == "long"
SRC = ROOT / ("03_원고/03_롱폼/01_대본_대화_v01.md" if LONG else "03_원고/02_숏폼/01_대본_대화_v01.md")
V = ROOT / "05_제작소스/03_음성" / ("02_롱폼" if LONG else "01_숏폼")
TITLES = {"P1": ["Part 1", "1914, 기념 소인"], "P2": ["Part 2", "하이드 레이 집안"], "P3": ["Part 3", "1925, 한 시간에 200채"],
          "P4": ["Part 4", "1937, 런던에서 온 엽서"], "P5": ["Part 5", "코리아 하우스"], "P6": ["정리", "앞면은 풍경, 뒷면은 사람"]}

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

def mock_durations():
    md = SRC.read_text(encoding="utf-8")
    lines = [r for r in table(md, "숏") if r.get("대사")]
    part_of = lambda s: s.split("-")[0]
    if not LONG: lines = [r for r in lines if part_of(r["숏"]) == KEY]
    GAP_IN, GAP_SHOT, GAP_PART, LEAD, TAIL = 0.24, 0.42, 1.9, 0.8, 2.2
    shots, t, prev_part, prev_shot = [], LEAD, None, None
    for r in lines:
        sid, p = r["숏"], part_of(r["숏"])
        if sid != prev_shot:
            if prev_shot is not None: t += GAP_PART if (LONG and p != prev_part) else GAP_SHOT
            shots.append({"shot": sid, "part": p if LONG else KEY, "start": round(t, 3), "end": None, "lines": []})
        elif shots[-1]["lines"]: t += GAP_IN
        txt = r["대사"]; dur = 0.55 + 0.175 * len(re.sub(r"[\s.,!?…]", "", txt))
        shots[-1]["lines"].append({"who": r["화자"], "text": r.get("자막") or txt, "speech": round(dur, 3), "file": "", "at": round(t, 3), "emotion": r.get("감정", "일반"), "say": txt})
        t += dur; shots[-1]["end"] = round(t, 3); prev_part, prev_shot = p, sid
    return {"voice": "mock", "total": round(t + TAIL, 3), "shots": shots}

if MOCK:
    d = mock_durations()
else:
    d = json.loads((V / "tts/durations.json").read_text(encoding="utf-8"))
    if not LONG:   # 쇼츠: 해당 파트만 잘라 0초부터 다시 센다
        shots = [s for s in d["shots"] if s["part"] == KEY]
        off = shots[0]["start"] - 0.8
        for s in shots:
            s["start"] = round(s["start"] - off, 3); s["end"] = round(s["end"] - off, 3)
            for ln in s["lines"]: ln["at"] = round(ln["at"] - off, 3)
        d = {"voice": d["voice"], "total": round(shots[-1]["end"] + 2.2, 3), "shots": shots, "_offset": off}

parts, shots, lines = [], [], []
for sh in d["shots"]:
    p = sh["part"]
    if not parts or parts[-1]["id"] != p:
        parts.append({"id": p, "title": TITLES.get(p) if LONG else None, "header": "", "firstLine": sh["lines"][0]["at"], "start": sh["start"], "end": sh["end"]})
    parts[-1]["end"] = sh["end"]
    shots.append({"id": sh["shot"], "part": p, "start": sh["start"], "end": sh["end"]})
    for ln in sh["lines"]:
        lines.append({"part": p, "shot": sh["shot"], "who": ln["who"], "emotion": ln.get("emotion") or "일반", "text": ln["say"], "sub": ln["text"], "start": ln["at"], "end": round(ln["at"] + ln["speech"], 3), "words": []})
for i, p in enumerate(parts):
    p["end"] = parts[i + 1]["start"] if i + 1 < len(parts) else d["total"]
for i, s in enumerate(shots):
    s["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else d["total"]
bgm_src = ROOT / "05_제작소스/04_음악효과음" / "bgm_flow.wav"
tl = {"fps": FPS, "duration": d["total"], "bpm": BPM, "parts": parts, "shots": shots, "lines": lines, "mock": MOCK, "bgm": bgm_src.exists()}
(MOT / "src" / f"timeline_{KEY}.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
(MOT / "public").mkdir(exist_ok=True)
nar = MOT / "public" / f"narration_{KEY}.wav"
if MOCK:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(d["total"]), str(nar)], check=True)
elif LONG:
    shutil.copy(V / "narration.wav", nar)
else:   # 쇼츠: 전체 narration 에서 파트 구간만 잘라낸다
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(d["_offset"]), "-t", str(d["total"]), "-i", str(V / "narration.wav"), str(nar)], check=True)
# 캐릭터 누끼: 02_그림판 원본(흰 배경, 그림판 생성의 참조)은 두고 02_그림판_누끼 에 투명 PNG(캔버스 유지)를 만든다
IMG = ROOT / "05_제작소스/01_이미지"; CUT = IMG / "02_그림판_누끼"; CUT.mkdir(exist_ok=True)
todo = []
for f in sorted((IMG / "02_그림판").glob("CHAR_*.png")):
    if f.stem.endswith("_raw"): continue
    o = CUT / f.name
    if not o.exists() or o.stat().st_mtime < f.stat().st_mtime:
        shutil.copy(f, o); (CUT / (f.stem + "_raw.png")).unlink(missing_ok=True); todo.append(str(o))
if todo:
    subprocess.run(["/Users/jatu/app/youtube3/.venv-tts/bin/python", str(MOT / "scripts/cutout_white.py"), *todo], check=True)
for name, src in [("postcards", IMG / "01_엽서"), ("cut", IMG / "03_오림"), ("art", CUT), ("sfx", ROOT / "05_제작소스/04_음악효과음/sfx")]:
    dst = MOT / "public" / name
    if dst.is_symlink() or dst.exists():
        if dst.is_symlink(): dst.unlink()
        else: shutil.rmtree(dst)
    os.symlink(src, dst)
fonts = MOT / "public/fonts"; fonts.mkdir(exist_ok=True)
for f in (ROOT / "05_제작소스/05_폰트").glob("*.*"):
    shutil.copy(f, fonts / f.name)
bgm = ROOT / "05_제작소스/04_음악효과음" / "bgm_flow.wav"
if bgm.exists(): shutil.copy(bgm, MOT / "public" / "bgm.wav")
print(json.dumps({"key": KEY, "mock": MOCK, "duration": d["total"], "parts": [(p["id"], p["start"], p["end"]) for p in parts], "shots": len(shots), "lines": len(lines)}, ensure_ascii=False))

"""tj001 타임라인 — 07_voice_dialog.py 가 만든 tts/durations.json(숏·대사 시각) → src/timeline_<mode>.json,
public/narration_<mode>.wav, public/postcards/*.jpg (05_제작소스/01_이미지/엽서 복사), public/art/* (그림판·캐릭터).

실행: python3 scripts/build_timeline.py long|short
"""
import json, shutil, subprocess, sys
from pathlib import Path
MOT = Path(__file__).resolve().parents[1]; ROOT = MOT.parents[2]
MODE = sys.argv[1]
V = ROOT / "05_제작소스/03_음성" / ("01_숏폼" if MODE == "short" else "02_롱폼")
d = json.loads((V / "tts/durations.json").read_text(encoding="utf-8"))
FPS = 30
TITLES = {"P1": ["Part 1", "거절당한 아이디어"], "P2": ["Part 2", "황금기, 70억 장"], "P3": ["Part 3", "1900년 5월 10일, 조선"],
          "P4": ["Part 4", "봉투 속 열 장"], "P5": ["Part 5", "뒤집어 봐"], "P6": ["정리", "우리는 매일 엽서를 보낸다"]}
HEAD = {"P0": "황제 얼굴이 왜 엽서에?", **{k: v[1] for k, v in TITLES.items()}, "S": "황제 얼굴이 왜 일본 엽서에?"}
parts, shots, lines = [], [], []
for sh in d["shots"]:
    p = sh["part"]
    if not parts or parts[-1]["id"] != p:
        parts.append({"id": p, "title": TITLES.get(p), "header": HEAD.get(p, ""), "firstLine": sh["lines"][0]["at"], "start": sh["start"], "end": sh["end"]})
    parts[-1]["end"] = sh["end"]
    shots.append({"id": sh["shot"], "part": p, "start": sh["start"], "end": sh["end"]})
    for ln in sh["lines"]:
        lines.append({"part": p, "shot": sh["shot"], "who": ln["who"], "text": ln["say"], "sub": ln["text"], "start": ln["at"], "end": round(ln["at"] + ln["speech"], 3), "words": []})
# 파트 경계: 다음 파트 시작 = 이전 파트 끝 (제목 카드는 그 사이 GAP_PART 에 뜬다)
for i, p in enumerate(parts):
    if i + 1 < len(parts):
        p["end"] = parts[i + 1]["start"]
    else:
        p["end"] = d["total"]
for i, s in enumerate(shots):
    s["end"] = shots[i + 1]["start"] if i + 1 < len(shots) else d["total"]
tl = {"fps": FPS, "duration": d["total"], "parts": parts, "shots": shots, "lines": lines}
(MOT / "src" / f"timeline_{MODE}.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
(MOT / "public").mkdir(exist_ok=True)
shutil.copy(V / "narration.wav", MOT / "public" / f"narration_{MODE}.wav")
# 자산: 복사 대신 심볼릭 링크 (디스크 절약)
import os
for name, src in [("postcards", ROOT / "05_제작소스/01_이미지/엽서"), ("thumbs", ROOT / "05_제작소스/01_이미지/엽서_thumb"), ("art", ROOT / "05_제작소스/01_이미지/02_그림판")]:
    dst = MOT / "public" / name
    if dst.is_symlink() or dst.exists():
        if dst.is_symlink(): dst.unlink()
        else: shutil.rmtree(dst)
    os.symlink(src, dst)
pc = MOT / "public/postcards"; art = MOT / "public/art"
fonts = MOT / "public/fonts"; fonts.mkdir(exist_ok=True)
for f in (ROOT / "05_제작소스/05_폰트").glob("*.*"):
    shutil.copy(f, fonts / f.name)
bgm = ROOT / "05_제작소스/04_음악효과음" / f"bgm_{MODE}.wav"
if bgm.exists(): shutil.copy(bgm, MOT / "public" / f"bgm_{MODE}.wav")
print(json.dumps({"mode": MODE, "duration": d["total"], "parts": [(p["id"], p["start"], p["end"]) for p in parts], "shots": len(shots), "lines": len(lines), "postcards": len(list(pc.glob('*.jpg'))), "art": sorted(x.name for x in art.glob('*'))}, ensure_ascii=False))

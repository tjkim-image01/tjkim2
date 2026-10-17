"""SRT 자막 내보내기 (v02~, 2인 대화판) — Remotion 타임라인(motion/src/timeline_<mode>.json)의 대사별 start/end 와
대본 '자막' 열(sub)을 쓴다. sub 를 ' / ' 로 나눈 조각은 글자수 비례로 시간 배분 (화면 자막과 같은 규칙).
실행: python3 04_export_subs.py [v02]  → 07_최종산출물/05_자막/01_tj003_longform_<ver>.srt, 02_tj003_shorts_<ver>.srt
(v01 은 edge-tts 1인 나레이션판 — 옛 대본·durations.json 'scenes' 형식)
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
VER = sys.argv[1] if len(sys.argv) > 1 else "v01"
OUT = ROOT / "07_최종산출물/05_자막"; OUT.mkdir(parents=True, exist_ok=True)
MOT = ROOT / "06_편집검수/01_스크립트/motion/src"
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
for mode, name in [("long", f"01_tj003_longform_{VER}.srt"), ("A", f"02_tj003_shorts_A_{VER}.srt"), ("B", f"03_tj003_shorts_B_{VER}.srt"), ("C", f"04_tj003_shorts_C_{VER}.srt")]:
    tl = json.loads((MOT / f"timeline_{mode}.json").read_text(encoding="utf-8"))
    cues, k = [], 1
    for l in tl["lines"]:
        parts = [p.strip() for p in l["sub"].split(" / ") if p.strip()]
        w = [max(1, len(p)) for p in parts]; tot = sum(w); t = l["start"]; dur = l["end"] - l["start"]
        for p, ww in zip(parts, w):
            d = dur * ww / tot
            cues.append(f"{k}\n{ts(t)} --> {ts(t + d - 0.05)}\n{p}\n"); k += 1; t += d
    (OUT / name).write_text("\n".join(cues), encoding="utf-8")
    print(name, k - 1, "cues", "duration", tl["duration"])

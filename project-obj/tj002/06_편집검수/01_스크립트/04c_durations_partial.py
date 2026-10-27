"""시리즈 음성 중 이미 받은 파트(lines.json 있는 것)만으로 tts/durations.json·narration.wav 를 만든다.
04b_voice_series.py 와 같은 간격 규칙이라, 앞쪽 파트의 시각은 전체 완료 후와 같다. 실행: python3 04c_durations_partial.py
"""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "05_제작소스/03_음성/03_숏폼시리즈"
GAP_IN, GAP_SHOT, GAP_PART, LEAD, TAIL = 0.24, 0.42, 1.9, 0.8, 2.2
order = "DEFGHIJKL"
info, t = [], LEAD
for p in order:
    f = OUT / "typecast" / p / "lines.json"
    if not f.exists(): break
    lines = json.loads(f.read_text()); shots = {}
    for ln in lines: shots.setdefault(ln["shot"], []).append(ln)
    first = True
    for sid, rows in shots.items():
        if not first: t += GAP_SHOT
        elif info: t += GAP_PART
        first = False
        start, outrows = t, []
        for ln in rows:
            outrows.append({"who": ln["who"], "text": ln["sub"], "speech": ln["speech"], "file": f"typecast/{p}/{ln['file']}", "at": round(t, 3), "emotion": ln.get("emotion_applied"), "say": ln["text"]})
            t += ln["speech"] + GAP_IN
        t -= GAP_IN
        info.append({"shot": sid, "part": p, "start": round(start, 3), "end": round(t, 3), "lines": outrows})
total = round(t + TAIL, 3)
(OUT / "tts").mkdir(exist_ok=True)
(OUT / "tts/durations.json").write_text(json.dumps({"voice": "typecast(partial)", "total": total, "shots": info}, ensure_ascii=False, indent=1), encoding="utf-8")
inputs, filt, k = [], [], 0
for sh in info:
    for ln in sh["lines"]:
        inputs += ["-i", str(OUT / ln["file"])]; ms = int(ln["at"] * 1000)
        filt.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{k}]"); k += 1
filt.append("".join(f"[a{i}]" for i in range(k)) + f"amix=inputs={k}:normalize=0:dropout_transition=0,apad=whole_dur={total}[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-t", str(total), "-ar", "48000", str(OUT / "narration.wav")], check=True)
print("parts", sorted({s["part"] for s in info}), "total", total)

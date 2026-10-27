"""장면별 Edge-TTS 생성 + 길이 측정 + 전체 나레이션 wav 합본.

실행: /Users/jatu/app/youtube3/.venv-tts/bin/python 02_make_tts.py long|short [voice] [rate]
입력: 03_원고/03_롱폼/01_대본_tts.txt 또는 03_원고/02_숏폼/01_대본_tts.txt (빈 줄로 장면 구분, 숫자 한글)
출력: 05_제작소스/03_음성/0N_*/S01.mp3 …, durations.json [{id,start,dur,text}], narration.wav (장면 사이 GAP 무음)
"""
import asyncio, json, subprocess, sys
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[2]
MODE = sys.argv[1]
CFG = {
    "long":  dict(src=ROOT/"03_원고/03_롱폼/01_대본_tts.txt",  out=ROOT/"05_제작소스/03_음성/02_롱폼", voice="ko-KR-InJoonNeural", rate="+6%", gap=0.55, lead=0.6, tail=2.5),
    "short": dict(src=ROOT/"03_원고/02_숏폼/01_대본_tts.txt",  out=ROOT/"05_제작소스/03_음성/01_숏폼", voice="ko-KR-SunHiNeural",  rate="+8%", gap=0.35, lead=0.4, tail=1.6),
}[MODE]
voice = sys.argv[2] if len(sys.argv) > 2 else CFG["voice"]
rate = sys.argv[3] if len(sys.argv) > 3 else CFG["rate"]
out = CFG["out"]; out.mkdir(parents=True, exist_ok=True)
paras = [p.strip().replace("\n", " ") for p in CFG["src"].read_text(encoding="utf-8").split("\n\n") if p.strip()]

async def gen():
    for i, text in enumerate(paras, 1):
        f = out / f"S{i:02d}.mp3"
        await edge_tts.Communicate(text, voice, rate=rate).save(str(f))
        print(f"S{i:02d} {len(text)}자", flush=True)
asyncio.run(gen())

def dur(f):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)

t, rows = CFG["lead"], []
for i, text in enumerate(paras, 1):
    d = dur(out / f"S{i:02d}.mp3")
    rows.append({"id": f"S{i:02d}", "start": round(t, 3), "dur": round(d, 3), "text": text})
    t += d + CFG["gap"]
total = round(t - CFG["gap"] + CFG["tail"], 3)
(out / "durations.json").write_text(json.dumps({"voice": voice, "rate": rate, "gap": CFG["gap"], "total": total, "scenes": rows}, ensure_ascii=False, indent=1), encoding="utf-8")

# 합본: 각 장면을 start 위치에 놓는다 (adelay) → narration.wav 48k stereo
inputs, filt = [], []
for i, r in enumerate(rows):
    inputs += ["-i", str(out / f"{r['id']}.mp3")]
    filt.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(r['start']*1000)}|{int(r['start']*1000)}[a{i}]")
filt.append("".join(f"[a{i}]" for i in range(len(rows))) + f"amix=inputs={len(rows)}:normalize=0:dropout_transition=0,apad=whole_dur={total}[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-t", str(total), "-ar", "48000", str(out / "narration.wav")], check=True)
print(json.dumps({"total": total, "scenes": [(r["id"], r["start"], r["dur"]) for r in rows]}, ensure_ascii=False))

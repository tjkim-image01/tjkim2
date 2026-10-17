"""무음 렌더 + 나레이션(+BGM 있으면) 믹스 → 07_최종산출물. 음량 검사까지.

실행: python3 03_mix.py long|short [v01]
입력: 06_편집검수/02_중간렌더/tj001_<mode>_silent.mp4, 05_제작소스/03_음성/0N_*/narration.wav, (선택) 05_제작소스/04_음악효과음/bgm_<mode>.wav
출력: 07_최종산출물/02_숏폼/01_tj001_shorts_<ver>.mp4 또는 03_롱폼/01_tj001_longform_<ver>.mp4
"""
import json, subprocess, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
MODE, VER = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "v01")
voice_dir = ROOT / "05_제작소스/03_음성" / ("01_숏폼" if MODE == "short" else "02_롱폼")
silent = ROOT / "06_편집검수/02_중간렌더" / f"tj001_{MODE}_silent.mp4"
bgm = ROOT / "05_제작소스/04_음악효과음" / f"bgm_{MODE}.wav"
out = ROOT / "07_최종산출물" / ("02_숏폼" if MODE == "short" else "03_롱폼") / (f"01_tj001_shorts_{VER}.mp4" if MODE == "short" else f"01_tj001_longform_{VER}.mp4")
out.parent.mkdir(parents=True, exist_ok=True)
total = json.loads((voice_dir / "durations.json").read_text())["total"]
inputs = ["-i", str(silent), "-i", str(voice_dir / "narration.wav")]
if bgm.exists():
    inputs += ["-stream_loop", "-1", "-i", str(bgm)]
    fc = f"[1:a]volume=1.0[v];[2:a]volume=0.2,afade=t=out:st={total-2.5}:d=2.5[b];[v][b]amix=inputs=2:normalize=0:duration=first[a]"
else:
    fc = "[1:a]volume=1.0,anull[a]"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-t", str(total), str(out)], check=True)
probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,r_frame_rate,duration,codec_name", "-of", "json", str(out)], capture_output=True, text=True).stdout
vol = subprocess.run(["ffmpeg", "-i", str(out), "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
vol = [l.strip() for l in vol.splitlines() if "mean_volume" in l or "max_volume" in l]
print(out); print(probe); print(vol)
(ROOT / "06_편집검수/03_검수기록" / f"02_미디어검사_{MODE}_{VER}.json").write_text(json.dumps({"file": str(out.relative_to(ROOT)), "probe": json.loads(probe), "volume": vol, "bgm": bgm.exists()}, ensure_ascii=False, indent=1))

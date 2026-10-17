"""tj001 음성 — blog 의 Typecast 커넥터(Aside u3, 사용자가 열어 둔 Typecast 프로젝트)로 장면별 음성을 받고,
tj001 타임라인이 읽는 durations.json(장면 start/dur/text) + narration.wav 를 만든다. (Edge-TTS 02_make_tts.py 를 대체)

실행: python3 05_voice_typecast.py long|short
입력: 03_원고/03_롱폼/02_대본_typecast_v01.md 또는 03_원고/02_숏폼/02_대본_typecast_v01.md (배역 표 + 숏/화자/감정/대사/자막 표)
출력: 05_제작소스/03_음성/0N_*/typecast/<화자>/S01_1.wav…, lines.json, durations.json, narration.wav
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path

sys.path.insert(0, "/Users/jatu/blog")
from lib.com.jatu.aside.connector.typecast import TypecastConnector, parse_script

ROOT = Path(__file__).resolve().parents[2]
MODE = sys.argv[1]
CFG = {
    "long":  dict(src=ROOT / "03_원고/03_롱폼/02_대본_typecast_v01.md", out=ROOT / "05_제작소스/03_음성/02_롱폼", gap=0.55, lead=0.6, tail=2.5),
    "short": dict(src=ROOT / "03_원고/02_숏폼/02_대본_typecast_v01.md", out=ROOT / "05_제작소스/03_음성/01_숏폼", gap=0.35, lead=0.4, tail=1.6),
}[MODE]
PROJECT = "https://studio.typecast.ai/text-to-speech/6acc17574203cf0c1de041e3"   # jatu012 와 같은 u3 프로젝트 (2026-10-15)
ACCOUNT = "u3"


class StableTypecast(TypecastConnector):
    """jatu012 06_voice.py 와 같은 보강: Slate 전체 선택 단축키가 불안정해 범위 선택으로 지우고, 성우 지정은 3회 재시도"""
    def clear(self):
        self.reopen()
        self._repl(r"""
await tc.keyboard.press('Escape').catch(()=>{});
await tc.evaluate(()=>{
 const ed=document.querySelector('[data-slate-editor=true]');ed.focus();
 const ss=ed.querySelectorAll('[data-slate-string]');
 if(ss.length){const r=document.createRange();r.setStart(ss[0].firstChild,0);const last=ss[ss.length-1].firstChild;r.setEnd(last,last.textContent.length);const s=window.getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));}
});await sleep(200);await tc.keyboard.press('Backspace');await sleep(600);console.log('OK:');
""")
        if "".join(self.state()["text"]).strip():
            raise RuntimeError("Editor clear failed")

    def set_actor(self, idx, name):
        for attempt in range(3):
            try:
                return super().set_actor(idx, name)
            except Exception as e:
                if attempt == 2:
                    raise
                print(f"[retry actor] {idx} {name}: {str(e)[-120:]}", flush=True)
                self._repl("await tc.keyboard.press('Escape'); await sleep(800); console.log('OK:');")


out = CFG["out"]; tc_dir = out / "typecast"; tc_dir.mkdir(parents=True, exist_ok=True)
cast, lines = parse_script(CFG["src"])
print(f"[voice] {CFG['src'].name} {len(lines)}줄 {cast} → {tc_dir}", flush=True)
lines = StableTypecast(project_url=PROJECT, account=ACCOUNT).run(cast, lines, tc_dir, "cdn")
(tc_dir / ".script_hash").write_text(hashlib.sha1(CFG["src"].read_bytes()).hexdigest())

# --- tj001 형식 durations.json: 장면(숏) = 한 줄. 44.1k mono wav → 장면별 S01.wav 로도 복사
t, rows = CFG["lead"], []
for ln in lines:
    src = tc_dir / ln["file"]; dst = out / f"{ln['shot']}.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-ar", "48000", "-ac", "2", str(dst)], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(dst)], capture_output=True, text=True).stdout)
    rows.append({"id": ln["shot"], "start": round(t, 3), "dur": round(d, 3), "text": ln["text"], "actor": ln["actor"], "emotion": ln.get("emotion_applied")})
    t += d + CFG["gap"]
total = round(t - CFG["gap"] + CFG["tail"], 3)
(out / "durations.json").write_text(json.dumps({"voice": f"typecast:{cast}", "gap": CFG["gap"], "total": total, "scenes": rows}, ensure_ascii=False, indent=1), encoding="utf-8")
for f in out.glob("S*.mp3"):   # 이전 Edge-TTS 산출물 정리
    f.unlink()
inputs, filt = [], []
for i, r in enumerate(rows):
    inputs += ["-i", str(out / f"{r['id']}.wav")]
    filt.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(r['start']*1000)}|{int(r['start']*1000)}[a{i}]")
filt.append("".join(f"[a{i}]" for i in range(len(rows))) + f"amix=inputs={len(rows)}:normalize=0:dropout_transition=0,apad=whole_dur={total}[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-t", str(total), "-ar", "48000", str(out / "narration.wav")], check=True)
print(json.dumps({"total": total, "scenes": [(r["id"], r["start"], r["dur"]) for r in rows]}, ensure_ascii=False))

"""2인 대화 대본 → Typecast(Aside u3) 음성. blog voice_auto 와 같은 결과 형식(typecast/<화자>/<숏>_<n>.wav, lines.json, tts/durations.json).

실행: python3 04e_voice_series2.py series2 | long2 [D E ... / P0 P1 ...]
  short: 03_원고/02_숏폼/01_대본_대화_v01.md 전체를 한 번에
  long : 03_원고/03_롱폼/01_대본_대화_v01.md 를 파트(P0~P6)별로 나눠 한 파트씩 (이미 받은 파트는 건너뜀)
출력: 05_제작소스/03_음성/0N_*/typecast/, 05_제작소스/03_음성/0N_*/tts/durations.json (숏 단위 start/len/lines[].at)
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, "/Users/jatu/blog")
from lib.com.jatu.aside.connector.typecast import TypecastConnector, parse_script
import lib.com.jatu.aside.connector.typecast as _tcmod
# 멈춘(CDP 응답 없는) Typecast 탭에 붙으면 60초씩 날아간다 → 후보 탭마다 10초 안에 못 붙으면 다음 후보, 다 실패하면 새 탭
_tcmod._JS_TAB = _tcmod._JS_TAB.replace(
    "const tc = __t ? await attachBrowserTab(__t.targetId) : await openTab(__url);\nif (!__t) await sleep(6000);",
    """let tc = null;
for (const cand of [__t, ...__all.filter(x => x !== __t)].filter(Boolean)) {
  try { tc = await Promise.race([attachBrowserTab(cand.targetId), sleep(10000).then(() => { throw new Error('attach timeout'); })]); __t = cand; break; }
  catch (e) { console.log('[tab skip] ' + cand.targetId.slice(0, 6) + ' ' + String(e).slice(0, 60)); }
}
if (!tc) { __t = null; tc = await openTab(__url); await sleep(6000); }""")
assert "attach timeout" in _tcmod._JS_TAB, "_JS_TAB 패치 실패"

ROOT = Path(__file__).resolve().parents[2]
MODE = sys.argv[1]
SRC = ROOT / ("03_원고/02_숏폼/03_대본_대화_시리즈2_v01.md" if MODE == "series2" else "03_원고/03_롱폼/02_대본_대화_선전물100년_v01.md")
OUT = ROOT / "05_제작소스/03_음성" / ("04_숏폼시리즈2" if MODE == "series2" else "05_롱폼2")
PROJECT = "https://studio.typecast.ai/text-to-speech/6ad016234fbb921fb1b85e70"  # 물건 영상(tj001~) 전용. 6acc1757… 은 블로그 jatu0xx 공용이라 동시에 쓰면 충돌
ACCOUNT = "u3"
GAP_IN, GAP_SHOT, GAP_PART, LEAD, TAIL = 0.24, 0.42, 1.9, 0.8, 2.2


class StableTypecast(TypecastConnector):
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

    def type_paragraphs(self, texts):
        """빈 단락(지우기 실패 잔여)은 무시하고 비교"""
        import json as _j, re as _r
        body = r"""
const __texts = %s;
await tc.locator('[data-slate-editor=true]').first().click(); await sleep(300);
await tc.keyboard.press('Meta+ArrowDown'); await sleep(200);
for (let i = 0; i < __texts.length; i++) {
  if (i > 0) { await tc.keyboard.press('Enter'); await sleep(250); }
  await tc.keyboard.insertText(__texts[i]); await sleep(250);
}
await sleep(800);
console.log('OK:' + JSON.stringify(await tcText()));
""" % _j.dumps(texts, ensure_ascii=False)
        out = self._repl(body, timeout=115)
        got = [x for x in _j.loads(self._marker(out, "OK:")) if x.strip()]
        norm = lambda s: _r.sub(r"\s+", "", s)
        if [norm(x) for x in got] != [norm(x) for x in texts]:
            raise RuntimeError(f"입력 결과가 대본과 다릅니다: {got}")
        if len(_j.loads(self._marker(out, "OK:"))) != len(texts):
            # 빈 단락이 섞이면 성우 칩 인덱스가 어긋나므로 지운다: 맨 끝 빈 단락은 Backspace 로
            self._repl("await tc.keyboard.press('Meta+ArrowDown'); await sleep(150); await tc.keyboard.press('Backspace'); await sleep(400); console.log('OK:' + JSON.stringify(await tcText()));")


cast, all_lines = parse_script(SRC)
part_of = lambda shot: shot.split("-")[0] if "-" in shot else "S"
parts = []
for ln in all_lines:
    p = part_of(ln["shot"])
    if not parts or parts[-1] != p:
        parts.append(p)
want = set(sys.argv[2:]) or set(parts)
tc_root = OUT / "typecast"; tc_root.mkdir(parents=True, exist_ok=True)

for p in parts:
    if p not in want:
        continue
    pdir = tc_root / p
    lines = [dict(ln) for ln in all_lines if part_of(ln["shot"]) == p]
    h = hashlib.sha1(json.dumps(lines, ensure_ascii=False).encode()).hexdigest()
    if (pdir / "lines.json").exists() and (pdir / ".hash").exists() and (pdir / ".hash").read_text() == h:
        print(f"[voice] {p} 있음 — 건너뜀", flush=True); continue
    print(f"[voice] {p}: {len(lines)}줄 {cast}", flush=True)
    for attempt in range(2):
        try:
            StableTypecast(project_url=PROJECT, account=ACCOUNT).run(cast, lines, pdir, "cdn")
            (pdir / ".hash").write_text(h); break
        except Exception as e:
            print(f"[voice] {p} 실패 (시도 {attempt + 1}): {str(e)[-300:]}", flush=True)
            if attempt == 1:
                raise
            time.sleep(10)

# ---- durations.json (숏 단위) : 모든 파트가 있을 때만
info, t = [], LEAD
for p in parts:
    f = tc_root / p / "lines.json"
    if not f.exists():
        print(f"[voice] {p} 아직 없음 — durations 생략"); sys.exit(0)
    lines = json.loads(f.read_text())
    shots = {}
    for ln in lines:
        shots.setdefault(ln["shot"], []).append(ln)
    first = True
    for sid, rows in shots.items():
        if not first:
            t += GAP_SHOT
        elif info:
            t += GAP_PART
        first = False
        start, outrows = t, []
        for ln in rows:
            outrows.append({"who": ln["who"], "text": ln["sub"], "speech": ln["speech"], "file": f"typecast/{p}/{ln['file']}", "at": round(t, 3), "emotion": ln.get("emotion_applied"), "say": ln["text"]})
            t += ln["speech"] + GAP_IN
        t -= GAP_IN
        info.append({"shot": sid, "part": p, "start": round(start, 3), "end": round(t, 3), "lines": outrows})
total = round(t + TAIL, 3)
(OUT / "tts").mkdir(exist_ok=True)
(OUT / "tts/durations.json").write_text(json.dumps({"voice": f"typecast:{cast}", "total": total, "shots": info}, ensure_ascii=False, indent=1), encoding="utf-8")
# narration.wav
inputs, filt, k = [], [], 0
for sh in info:
    for ln in sh["lines"]:
        inputs += ["-i", str(OUT / ln["file"])]
        ms = int(ln["at"] * 1000)
        filt.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{k}]"); k += 1
filt.append("".join(f"[a{i}]" for i in range(k)) + f"amix=inputs={k}:normalize=0:dropout_transition=0,apad=whole_dur={total}[out]")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-t", str(total), "-ar", "48000", str(OUT / "narration.wav")], check=True)
print(json.dumps({"total": total, "shots": [(s["shot"], s["start"], s["end"]) for s in info]}, ensure_ascii=False))

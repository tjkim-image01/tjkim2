"""tj002 BGM — Flow Music(Aside u1)을 짧은 repl 호출로 나눠 받는다.
blog flow_music.py 는 생성 대기까지 repl 한 번으로 하는데, 2026-10-15 Aside 데몬이 약 2분 넘는 repl 연결을 끊어("other side closed") 매번 실패했다.
→ ① 탭 열고 프롬프트 전송 ② 20초마다 짧게 붙어 새 곡(m4a) 확인 ③ 없으면 메뉴 Download → WAV.

실행: python3 02b_bgm_flow_steps.py [u3]   → 05_제작소스/04_음악효과음/bgm_flow.wav (+ .m4a), 09_작업기록/02_세션/flow_music.json
"""
import json, os, re, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASIDE = os.path.expanduser("~/.local/bin/aside")
ACC = sys.argv[1] if len(sys.argv) > 1 else "u3"   # Flow Music 로그인: u3 (2026-10-15 확인, u0·u1·u2·u4·u9 는 로그아웃)
URL = "https://www.flowmusic.app/"
OUT = ROOT / "05_제작소스/04_음악효과음/bgm_flow.wav"
prompt = "\n".join(l for l in (ROOT / "04_제작설계/03_bgm_prompt.md").read_text(encoding="utf-8").splitlines() if not l.lstrip().startswith("#")).strip()
M4A = r"producer-app-public\/clips\/.*\.m4a(?:$|\?)"


class Session:
    """대화형 aside repl 한 프로세스를 계속 열어 둔다 (한 번짜리 repl 은 끝날 때 탭까지 닫힌다). 명령마다 120초 제한."""
    def __init__(self):
        import queue, threading
        self.p = subprocess.Popen([ASIDE, "--account", ACC, "repl"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
        self.q = queue.Queue()
        threading.Thread(target=lambda: [self.q.put(l) for l in self.p.stdout], daemon=True).start()
        self.n = 0

    def __call__(self, js, timeout=115):
        import queue
        self.n += 1; tag = f"__END{self.n}__"
        code = "await (async () => { try { " + " ".join(l.strip() for l in js.strip().splitlines()) + " } catch (e) { console.log('ERR:' + String(e).slice(0, 300)); } })(); console.log('" + tag + "');"
        self.p.stdin.write(code + "\n"); self.p.stdin.flush()
        out, t0 = [], time.time()
        while time.time() - t0 < timeout:
            try:
                l = self.q.get(timeout=1)
            except queue.Empty:
                continue
            out.append(l)
            if tag in l:
                break
        return "".join(out)


repl = Session()


def mark(out, m):
    for l in out.splitlines():
        if m in l:
            return l.split(m, 1)[1].strip()
    return None


ATTACH = r"""
const page = globalThis.fp; if (!page) { console.log('NOTAB'); return; }
"""

# ① 전송
out = repl(r"""
globalThis.fp = await openTab(%s); const page = fp; await sleep(3000);
const agree = page.getByRole('button', { name: '동의함' }); if (await agree.count()) { try { await agree.first().click(); await sleep(500); } catch (_) {} }
let chat = page.locator('textarea[aria-label="Chat message"]');
for (let i = 0; i < 25 && !(await chat.count()); i++) { await sleep(1000); chat = page.locator('textarea[aria-label="Chat message"]'); }
if (!(await chat.count())) { console.log('NOCHAT:' + page.url()); return; }
const n = await page.locator('button[aria-label^="More options for"]').count();
await page.evaluate(() => { window.__known = performance.getEntriesByType('resource').map(e => e.name).filter(u => /%s/.test(u)); });
await chat.fill(%s); await sleep(500);
await page.locator('button[aria-label="Send message"]').click(); await sleep(4000);
console.log('SENT:' + n); console.log('SESSION:' + page.url());
""" % (json.dumps(URL), M4A, json.dumps(prompt)))
print(out[-600:], flush=True)
n0, session = mark(out, "SENT:"), mark(out, "SESSION:")
if n0 is None:
    sys.exit("전송 실패")
n0 = int(n0)

# ② 대기
res, title, t0 = None, None, time.time()
while time.time() - t0 < 600:
    time.sleep(20)
    out = repl((ATTACH + r"""
const btn = page.locator('button[aria-label^="More options for"]'); const n = await btn.count();
const r = await page.evaluate(() => { const k = window.__known || []; return performance.getEntriesByType('resource').map(e => e.name).reverse().find(u => /%s/.test(u) && !k.includes(u)) || ''; });
console.log('COUNT:' + n); if (n > N0) console.log('TITLE:' + (await btn.nth(n - 1).getAttribute('aria-label'))); console.log('RES:' + r); console.log('URL:' + page.url());
""" % M4A).replace("SESSION", json.dumps(session)).replace("N0", str(n0)))
    cnt, res, title = mark(out, "COUNT:"), mark(out, "RES:"), mark(out, "TITLE:")
    print(f"[bgm] {int(time.time() - t0)}s count={cnt} title={title} res={(res or '')[:80]}", flush=True)
    if "NOTAB" in out:
        sys.exit("Flow 탭이 사라졌습니다")
    if res:
        break
    if title and time.time() - t0 > 60:
        # 곡은 나왔는데 m4a 가 아직 안 불렸으면 메뉴로 WAV 저장 (③)
        out = repl((ATTACH + r"""
const btn = page.locator('button[aria-label^="More options for"]'); await btn.nth((await btn.count()) - 1).click(); await sleep(600);
await page.getByRole('menuitem', { name: 'Download', exact: true }).hover(); await sleep(600);
const dl = page.waitForEvent('download', { timeout: 70000 });
await page.getByRole('menuitem', { name: 'WAV', exact: true }).click();
await (await dl).saveAs(%s); console.log('SAVED');
""" % json.dumps(str(OUT))).replace("SESSION", json.dumps(session)))
        print(out[-300:], flush=True)
        if "SAVED" in out:
            break
if res:
    m4a = OUT.with_suffix(".m4a")
    subprocess.run(["curl", "-fsSL", "-o", str(m4a), res], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(m4a), "-c:a", "pcm_s16le", str(OUT)], check=True)
if not OUT.exists():
    sys.exit("BGM 받기 실패")
info = {"project": "tj002", "account": ACC, "session_url": session, "title": (title or "").replace("More options for", "").strip(), "resource": res, "output": str(OUT)}
(ROOT / "09_작업기록/02_세션/flow_music.json").write_text(json.dumps(info, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(info, ensure_ascii=False))

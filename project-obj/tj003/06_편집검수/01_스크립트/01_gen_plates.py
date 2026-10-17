"""ChatGPT(Aside u1/u0) 그림판·캐릭터 생성 — jatu012 21_gen_plates.py 방식(전송 후 대화를 다시 열어 직접 회수).
session.json 은 tj003 안(09_작업기록/02_세션/chatgpt_session.json)에 둔다 (blog 저장소를 건드리지 않음).

실행: python3 08_gen_plates.py <계정 u1|u0> [이름...]   (이름 생략 = plates.json 전체, 있는 파일은 건너뜀)
"""
import base64, json, os, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, "/Users/jatu/blog")
from lib.com.jatu.aside.connector.chatgpt import AsideChatGPTConnector, IMAGE_PREFIX

ROOT = Path(__file__).resolve().parents[2]
SPEC = json.loads((ROOT / "04_제작설계/02_프롬프트/plates.json").read_text(encoding="utf-8"))
acc = sys.argv[1]; names = sys.argv[2:] or [p["name"] for p in SPEC["panels"]]
ASIDE = os.path.expanduser("~/.local/bin/aside")
SESSION = ROOT / "09_작업기록/02_세션/chatgpt_session.json"; SESSION.parent.mkdir(parents=True, exist_ok=True)


class Conn(AsideChatGPTConnector):
    def __init__(self, thread, account):
        super().__init__("tj003", thread, account)
        self.session_file = SESSION


JS = r"""await openTab('https://chatgpt.com/c/CID'); for (let k=0;k<15;k++){ await sleep(3000); try{ if(await page.evaluate(()=>document.querySelectorAll('main img').length>0 || /내가 한 말|You said/.test(document.body.innerText))) break; }catch(e){} }
for (let k=0;k<10;k++){ const ok = await page.evaluate(() => { const im=[...document.querySelectorAll('main img')].filter(i => /생성된 이미지|Generated image/i.test(i.alt||'')); im.forEach(i => { i.loading='eager'; i.scrollIntoView(); }); return im.length && im.every(i => i.complete && i.naturalWidth > 0); }); if (ok) break; await sleep(2000); }
const R = await page.evaluate(async () => {
  const gen = !!document.querySelector('form button[aria-label*="중지"], button[data-testid="stop-button"]');
  const imgs = [...document.querySelectorAll('main img')].filter(i => /생성된 이미지|Generated image/i.test(i.alt || '') && i.naturalWidth > 400);
  if (!imgs.length) return 'NOIMG:' + gen;
  if (gen) return 'GENERATING';
  const im = imgs[imgs.length - 1];
  const b = await (await fetch(im.src)).blob();
  const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return 'B64:' + im.naturalWidth + 'x' + im.naturalHeight + ':' + btoa(s);
});
console.log(R); await closeTab(page);"""


def grab(cid, out):
    p = subprocess.run([ASIDE, "--account", acc, "repl", JS.replace("CID", cid)], capture_output=True, text=True, timeout=170)
    for l in (p.stdout + p.stderr).splitlines():
        if l.startswith("B64:"):
            _, dim, b = l.strip().split(":", 2)
            Path(out).write_bytes(base64.b64decode(b)); return dim
        if l.startswith("NOIMG") or l.startswith("GENERATING"):
            return None
    return None


for p in SPEC["panels"]:
    if p["name"] not in names:
        continue
    out = ROOT / p["out"]; out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        print(f"[plates] 있음: {p['name']}", flush=True); continue
    refs = [str(ROOT / r) for r in p.get("reference_images", [])]
    missing = [r for r in refs if not Path(r).exists()]
    if missing:
        print(f"[plates] 참조 없음 → 건너뜀: {p['name']} {missing}", flush=True); continue
    prompt = p["prompt"].replace("STYLE.", SPEC["style"]) if "STYLE." in p["prompt"] else p["prompt"]
    ok = False
    for attempt in range(3):
        g = Conn(f"plate-{p['name']}-{attempt}", acc)
        g.orientation = p.get("orientation", "landscape")
        g.new_conversation()
        try:
            g._send(IMAGE_PREFIX + prompt.strip(), refs)
        except Exception as e:
            print(f"[plates] 전송 실패 {p['name']} (시도 {attempt}): {str(e)[-200:]}", flush=True); time.sleep(20); continue
        cid = g.conversation_id
        print(f"[plates] {p['name']} 전송 → {cid}", flush=True)
        t0 = time.time()
        while time.time() - t0 < 600:
            time.sleep(25)
            try:
                dim = grab(cid, str(out))
            except Exception as e:
                print(f"[plates] 회수 오류 {str(e)[-100:]}", flush=True); continue
            if dim:
                # 같은 인물·흰 배경이라 포즈만 바뀐 결과도 dhash 8비트 안에 들어 오탐한다(2026-10-15 LAUGH 3회) → 거의 동일(2비트 이하)만 되돌림으로 본다
                h = g._dhash(str(out)); echo = next((Path(r).name for r in refs if bin(h ^ g._dhash(r)).count("1") <= 2), None)
                if echo:
                    os.replace(out, str(out) + ".echo"); print(f"[plates] {p['name']} 첨부 되돌림({echo}) — 재시도", flush=True); break
                print(f"[plates] 저장: {out} {dim} ({int(time.time() - t0)}s)", flush=True); ok = True; break
        if ok:
            break
    if not ok:
        print(f"[plates] 실패: {p['name']}", flush=True)
print("PLATES DONE", flush=True)

"""tj003 YouTube 비공개 업로드 (티제이 김 컬렉션 채널 = Aside u5).

blog lib/com/jatu/aside/upload/youtube.py 의 대화형 REPL(AsideRepl)을 쓰되, 2026-10-16 tj002 업로드에서 드러난 문제를 피한다.
- Studio 탭이 다른 영상 편집 화면이면 page.getByRole 이 뒤 화면 요소를 잡는다 → 먼저 채널 대시보드로 이동, 모든 조작을 업로드 창(ytcp-uploads-dialog) 안으로 한정
- 제목 fill 이 기본 제목(파일명) 뒤에 붙고 설명 fill 은 실패 → focus·전체 선택·지우기 후 insertText, 결과 확인
  (클릭은 안 됨: 제목 칸이 길어지면 설명 칸을 덮어 설명이 제목에 들어간다 — tj003 롱폼)
- 저장 뒤 뜨는 '동영상 처리 중' 창을 닫아야 다음 업로드 창이 열린다
- 아동용 여부 필수 → '아니요, 아동용이 아닙니다'
- 파일 전송이 끝날 때까지 기다린 뒤 비공개 저장. 공개·일부 공개는 절대 고르지 않는다.

실행: python3 05_youtube_upload.py <영상.mp4> <업로드자료.md>   (결과: 영상 옆 .youtube-upload.json)
"""
import json, re, sys, time
from pathlib import Path
sys.path.insert(0, "/Users/jatu/blog/lib/com/jatu/aside/upload")
from youtube import AsideRepl, read_metadata  # noqa: E402

ACCOUNT = "u5"
CHANNEL_ID = "UC-gAXUw8Au-q7WgW6ud_KbA"   # 티제이 김 컬렉션
DLG = "ytcp-uploads-dialog"

video, meta_file = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
meta = read_metadata(meta_file)
log = video.with_suffix(".youtube-upload.log")
out_json = video.with_suffix(".youtube-upload.json")
if out_json.exists():
    sys.exit(f"이미 업로드 기록이 있습니다: {out_json}")


def val(text, key):
    # REPL 이 입력 코드도 되돌려 보여 주므로 마지막 줄(실제 출력)을 쓴다
    m = [x for x in re.findall(r"^\s*(?:repl\s*>\s*)?" + key + r":(.*)$", text, re.M) if "'+" not in x and "+'" not in x]
    return m[-1].strip() if m else None


import os, subprocess
NAV = ("await (async()=>{ const ts=(await listBrowserTabs()).filter(t=>t.url.startsWith('https://studio.youtube.com/')); "
       f"const t=ts.find(t=>t.url.includes('/channel/{CHANNEL_ID}'))||ts[0]; "
       "const p = t ? await attachBrowserTab(t.targetId) : null; if (!p) { console.log('NOSTUDIO'); return; } "
       "p.on('dialog', d => d.accept().catch(()=>{})); "   # 다른 영상 편집 화면의 '저장하지 않고 나가기' 확인창 → 나가기(저장 안 함)
       f"if (!p.url().endsWith('/channel/{CHANNEL_ID}')) {{ await p.goto('https://studio.youtube.com/channel/{CHANNEL_ID}'); await sleep(5000); }} "
       "console.log('NAV:' + p.url()); })();")
nav = subprocess.run([os.path.expanduser("~/.local/bin/aside"), "--account", ACCOUNT, "repl", NAV], capture_output=True, text=True, timeout=110)
if f"NAV:https://studio.youtube.com/channel/{CHANNEL_ID}" not in nav.stdout + nav.stderr:
    sys.exit("Studio 채널 대시보드로 가지 못했습니다:\n" + (nav.stdout + nav.stderr)[-500:])
r = AsideRepl(ACCOUNT, log)
_js = r.js


def _retry_js(code):
    # 이동 직후 실행 컨텍스트가 바뀌면 "Cannot find context" → 잠시 뒤 다시
    for k in range(4):
        try:
            return _js(code)
        except RuntimeError as e:
            if "context" not in str(e).lower() or k == 3:
                raise
            time.sleep(3)


r.js = _retry_js


def J(code):
    """매 명령마다 Studio 탭에 다시 붙어 P 로 쓴다 (대화형 세션의 전역 page 는 이동 뒤 'Cannot find context' 로 깨진다)"""
    return r.js("await (async()=>{ const P = await globalThis.__att(); " + code + " })()")
CLOSE_JS = ("const n = await P.evaluate(() => { let k = 0; for (const d of document.querySelectorAll('tp-yt-paper-dialog, [role=dialog]')) { const rc = d.getBoundingClientRect(); if (!rc.width || !rc.height || getComputedStyle(d).visibility === 'hidden') continue; "
            "const b = [...d.querySelectorAll('button, ytcp-button')].find(x => x.innerText.trim() === '닫기'); if (b) { b.click(); k++; } } return k; }); await sleep(800); console.log('CLOSED:' + n)")
staged = r.directory / video.name
try:
    os.link(video, staged)   # 복사 대신 하드 링크 (디스크 여유가 적다)
    (r.directory / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    r.js("globalThis.__att = async()=>{ const ts=(await listBrowserTabs()).filter(t=>t.url.startsWith('https://studio.youtube.com/')); "
         f"const t=ts.find(t=>t.url.includes('/channel/{CHANNEL_ID}'))||ts.find(t=>!/\\/video\\//.test(t.url))||ts[0]; return await attachBrowserTab(t.targetId); }}; console.log('ok')")
    o = J("console.log('URL:'+P.url())")
    if CHANNEL_ID not in (val(o, "URL") or ""):
        raise RuntimeError("채널 대시보드로 가지 못했습니다: " + str(val(o, "URL")))
    J(CLOSE_JS)   # 지난 업로드의 '동영상 처리 중' 창이 남아 있으면 닫는다 (안 닫으면 업로드 창이 안 열림)
    J("await P.getByRole('button',{name:'만들기',exact:true}).click(); await sleep(800); await P.getByRole('menuitem',{name:'동영상 업로드',exact:true}).click(); await sleep(2000); console.log('ok')")
    J(f"await P.locator('{DLG} input[type=file][name=Filedata]').setInputFiles({json.dumps('./' + video.name)}); console.log('ok')")
    for _ in range(60):
        o = J(f"console.log('ED:'+await P.locator('{DLG} [contenteditable=true]').count())")
        if val(o, "ED") == "2":
            break
        time.sleep(2)
    else:
        raise RuntimeError("세부정보 화면이 열리지 않았습니다 — Studio 확인 후 재시도")
    time.sleep(2)
    o = J("await (async()=>{ const m=JSON.parse(await fs.readFile('./meta.json','utf8')); "
             f"const eds=P.locator('{DLG} [contenteditable=true]'); "
             "const put=async(i,s)=>{ const b=eds.nth(i); await b.evaluate(e=>{ e.scrollIntoView({block:'center'}); e.focus(); }); await sleep(300); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await sleep(300); await P.keyboard.insertText(s); await sleep(700); return (await b.evaluate(e=>e.innerText)).trim(); }; "
             "const T=await put(0,m.title); const D=await put(1,m.description); "
             "console.log('TOK:'+(T===m.title)); console.log('DLEN:'+D.length+'/'+m.description.length); })()")
    if val(o, "TOK") != "true":
        raise RuntimeError("제목이 맞게 들어가지 않았습니다: " + o[-400:])
    o = J(f"await (async()=>{{ const rs=P.locator('{DLG} [role=radiogroup] [role=radio]'); await rs.nth(1).click(); await sleep(600); "
             "console.log('MFK:'+JSON.stringify(await rs.evaluateAll(es=>es.map(e=>[e.innerText.trim().slice(0,10),e.getAttribute('aria-checked')])))); })()")
    mfk = json.loads(val(o, "MFK"))
    if not (mfk[1][0].startswith("아니요") and mfk[1][1] == "true"):
        raise RuntimeError("아동용 아님 선택 실패: " + str(mfk))
    for want in ("동영상 요소", "검토", "공개 상태"):
        o = J(f"await (async()=>{{ await P.locator('{DLG} #next-button').click(); await sleep(1800); "
                 f"console.log('TAB:'+await P.evaluate(()=>[...document.querySelectorAll('{DLG} [role=tab]')].filter(x=>x.getAttribute('aria-selected')==='true').map(x=>x.innerText.trim()).join('|'))); }})()")
        if val(o, "TAB") != want:
            raise RuntimeError(f"단계 이동 실패: {want} ≠ {val(o, 'TAB')}")
    o = J(f"await (async()=>{{ const v=P.locator('{DLG} [role=radio]'); await v.nth(0).click(); await sleep(700); "
             "console.log('VIS:'+JSON.stringify(await v.evaluateAll(es=>es.map(e=>[e.innerText.trim().split('\\n')[0],e.getAttribute('aria-checked')])))); "
             f"console.log('LINK:'+await P.evaluate(()=>{{ const a=[...document.querySelectorAll('{DLG} a')].map(a=>a.href).find(h=>/youtube\\.com\\/(shorts\\/|watch\\?v=)|youtu\\.be\\//.test(h)); return a||''; }})); }})()")
    vis = json.loads(val(o, "VIS"))
    link = val(o, "LINK")
    if not (vis[0][0] == "비공개" and vis[0][1] == "true" and all(x[1] != "true" for x in vis[1:])):
        raise RuntimeError("비공개가 확인되지 않아 저장하지 않습니다: " + str(vis))
    # 파일 전송이 끝날 때까지 (업로드 중 n%) 기다린다
    for _ in range(180):
        o = J(f"console.log('PROG:'+((await P.evaluate(()=>{{ const t=document.querySelector('{DLG}')?.innerText||''; const m=t.match(/(업로드 중|Uploading)[^\\n]*/); return m?m[0]:'done'; }}))))")
        prog = val(o, "PROG") or ""
        if "업로드 중" not in prog and "Uploading" not in prog:
            break
        print("[upload]", prog[:80], flush=True)
        time.sleep(5)
    o = J(f"await (async()=>{{ const d=P.locator('{DLG} #done-button'); console.log('DONE:'+(await d.innerText()).trim()); await d.click(); "
             f"for(let i=0;i<20;i++){{ await sleep(1000); if(!(await P.locator('{DLG} [role=dialog]').count())) break; }} "
             f"console.log('LEFT:'+await P.locator('{DLG} [role=dialog]').count()); }})()")
    time.sleep(2); J(CLOSE_JS)
    if val(o, "DONE") != "저장":
        raise RuntimeError("마지막 버튼이 '저장'이 아닙니다: " + str(val(o, "DONE")))
    vid = re.split(r"/|v=", link)[-1] if link else None
    res = {"account": ACCOUNT, "channel_id": CHANNEL_ID, "video": str(video), "video_id": vid, "url": link, "visibility": "private",
           "made_for_kids": False, "title": meta["title"], "metadata": str(meta_file), "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
    out_json.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(res, ensure_ascii=False))
finally:
    r.close()   # 세션 폴더의 영상 사본은 브라우저가 아직 읽을 수 있으니 여기서 지우지 않는다 (업로드 확인 후 정리)

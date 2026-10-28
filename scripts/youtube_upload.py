"""YouTube 비공개 업로드 스크립트 (티제이 김 컬렉션 언어별 채널 = Aside u5).

  python scripts/youtube_upload.py <영상> <업로드자료.md> [ko|en|ja]

- 언어별 채널: ko 티제이 김 컬렉션 / en TJ Kim Collection / ja TJキム・コレクション (기본 ko)
- Studio 탭이 없으면 openTab으로 열고, 다른 영상 편집 화면이면 먼저 채널 대시보드로 이동
- 다른 채널로 로그인돼 있으면 channel_switcher 에서 핸들을 마우스로 눌러 전환 (JS click 으로는 안 바뀜)
- 만들기·동영상 업로드도 마우스 좌표 클릭 (getByRole 은 Aside 에서 CDP 시간 초과)
- 모든 조작을 업로드 창(ytcp-uploads-dialog) 안으로 한정
- 제목, 설명 focus / 선택 / 지우기 후 insertText
- 아동용 여부 필수: '아니요, 아동용이 아닙니다'
- 자세히 보기(고급 설정) 클릭 후 채널 기본 태그를 지우고 [태그] 입력칸에 콤마 구분 태그 입력
- 파일 전송이 끝날 때까지 기다린 뒤 비공개 저장
"""
import json, re, sys, time, os, subprocess
from pathlib import Path

ACCOUNT = "u5"
CHANNELS = {   # output/youtube-channel/channel-i18n.md
    "ko": ("UC-gAXUw8Au-q7WgW6ud_KbA", "@tjkimcollection"),
    "en": ("UC_Etd3MCSdC1dPOicZ-Q7tw", "@tjkimcollection-us"),
    "ja": ("UCRREust7LSVUVouPHwfsZ7w", "@tjkimcollection-jp"),
}
LANG = sys.argv[3] if len(sys.argv) > 3 else "ko"
CHANNEL_ID, HANDLE = CHANNELS[LANG]
DLG = "ytcp-uploads-dialog"

sys.path.insert(0, "/Users/jatu/blog/lib/com/jatu/aside/upload")
from youtube import AsideRepl  # noqa: E402


def read_upload_metadata(path: Path) -> dict:
    text = path.read_text(encoding='utf-8')
    def section(name: str) -> str:
        match = re.search(r'^##\s+' + re.escape(name) + r'\s*\n(.*?)(?=^##\s|\Z)', text, re.M | re.S)
        return match.group(1).strip() if match else ""
    title = section('제목')
    desc = section('설명')
    tags = section('태그')
    if not title:
        raise ValueError('Missing Markdown section: 제목')
    if not desc:
        raise ValueError('Missing Markdown section: 설명')
    if len(title) > 100:
        raise ValueError('YouTube title length exceeded (max 100)')
    if len(desc) > 5000:
        raise ValueError('YouTube description length exceeded (max 5000)')
    return {'title': title, 'description': desc, 'tags': tags}


video = Path(sys.argv[1]).resolve()
meta_file = Path(sys.argv[2]).resolve()
meta = read_upload_metadata(meta_file)

log = video.with_suffix(".youtube-upload.log")
out_json = video.with_suffix(".youtube-upload.json")
if out_json.exists():
    sys.exit(f"이미 업로드 기록이 있습니다: {out_json}")


def val(text, key):
    m = [x for x in re.findall(r"^\s*(?:repl\s*>\s*)?" + key + r":(.*)$", text, re.M) if "'+" not in x and "+'" not in x]
    return m[-1].strip() if m else None


r = AsideRepl(ACCOUNT, log)
_js = r.js


def _retry_js(code):
    for k in range(4):
        try:
            return _js(code)
        except RuntimeError as e:
            if "context" not in str(e).lower() or k == 3:
                raise
            time.sleep(3)


r.js = _retry_js


def J(code):
    return r.js("await (async()=>{ const P = await globalThis.__att(); " + code + " })()")


CLOSE_JS = ("const n = await P.evaluate(() => { let k = 0; for (const d of document.querySelectorAll('tp-yt-paper-dialog, [role=dialog]')) { const rc = d.getBoundingClientRect(); if (!rc.width || !rc.height || getComputedStyle(d).visibility === 'hidden') continue; "
            "const b = [...d.querySelectorAll('button, ytcp-button')].find(x => x.innerText.trim() === '닫기'); if (b) { b.click(); k++; } } return k; }); await sleep(800); console.log('CLOSED:' + n)")

staged = r.directory / video.name
try:
    if not staged.exists():
        os.link(video, staged)
    (r.directory / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    
    # 보이는 요소 중 한 줄이 글자와 정확히 같은 것을 마우스로 누른다 (sel 범위 안에서)
    r.js("globalThis.__press = async(P, sel, text)=>{ const pt = await P.evaluate(([sel,text])=>{ "
         "const e=[...document.querySelectorAll(sel)].filter(x=>{const b=x.getBoundingClientRect(); return b.width>0&&b.height>0}).find(x=>x.innerText.split('\\n').map(s=>s.trim()).includes(text)); "
         "if(!e) return null; e.scrollIntoView({block:'center'}); const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2}; }, [sel,text]); "
         "if(!pt) return false; await P.mouse.click(pt.x, pt.y); return true; }; console.log('ok')")

    # Studio 탭 연결 설정 (없으면 openTab으로 열기)
    r.js("globalThis.__att = async()=>{ const ts=(await listBrowserTabs()).filter(t=>t.url.startsWith('https://studio.youtube.com/')); "
         f"let t=ts.find(t=>t.url.includes('/channel/{CHANNEL_ID}'))||ts.find(t=>!/\\/video\\//.test(t.url))||ts[0]; "
         f"let p = t ? await attachBrowserTab(t.targetId) : await openTab('https://studio.youtube.com/channel/{CHANNEL_ID}'); "
         "await sleep(4000); "
         f"if (!p.url().includes('/channel/{CHANNEL_ID}')) {{ await p.goto('https://studio.youtube.com/channel/{CHANNEL_ID}'); await sleep(5000); }} "
         "if ((await p.title()).includes('죄송') || (await p.content()).includes('권한이 없습니다')) { "
         "  await p.goto('https://www.youtube.com/channel_switcher?next=%2F'); await sleep(4000); "
         f"  await globalThis.__press(p, 'ytd-account-item-renderer', '{HANDLE}'); await sleep(6000); "
         # 전환 직후 채널 주소로 바로 가면 '권한 없음' — Studio 첫 화면을 한 번 거쳐야 열린다
         "  await p.goto('https://studio.youtube.com/'); await sleep(6000); "
         f"  if (!p.url().includes('/channel/{CHANNEL_ID}')) {{ await p.goto('https://studio.youtube.com/channel/{CHANNEL_ID}'); await sleep(6000); }} "
         "} "
         "return p; }; console.log('ok')")

    o = J("console.log('URL:'+P.url()); console.log('DENIED:'+(await P.evaluate(()=>document.body.innerText)).includes('권한이 없습니다'))")
    if val(o, "DENIED") != "false":
        raise RuntimeError(f"{HANDLE} 채널로 전환하지 못했습니다")
    print("[upload] Studio 대시보드 연결 확인:", val(o, "URL"), flush=True)
    if CHANNEL_ID not in (val(o, "URL") or ""):
        raise RuntimeError("채널 대시보드로 가지 못했습니다: " + str(val(o, "URL")))
    
    J(CLOSE_JS)
    J("await P.evaluate(()=>{ for (const d of document.querySelectorAll('tp-yt-paper-dialog')) { const b=[...d.querySelectorAll('ytcp-button, button')].find(x=>x.getBoundingClientRect().width&&x.innerText.trim()==='계속'); if (b) b.click(); } }); await sleep(800); "
      "console.log('CREATE:'+await globalThis.__press(P, 'ytcp-button, button', '만들기')); await sleep(1200); "
      "console.log('MENU:'+await globalThis.__press(P, 'tp-yt-paper-item, ytcp-text-menu [role=menuitem]', '동영상 업로드')); await sleep(2500)")
    J(f"await P.locator('{DLG} input[type=file][name=Filedata]').setInputFiles({json.dumps('./' + video.name)}); console.log('ok')")
    
    for _ in range(60):
        o = J(f"console.log('ED:'+await P.locator('{DLG} [contenteditable=true]').count())")
        if val(o, "ED") == "2":
            break
        time.sleep(2)
    else:
        raise RuntimeError("세부정보 화면이 열리지 않았습니다 — Studio 확인 후 재시도")
    time.sleep(2)

    # 1. 제목 및 설명 입력
    o = J("await (async()=>{ const m=JSON.parse(await fs.readFile('./meta.json','utf8')); "
          f"const eds=P.locator('{DLG} [contenteditable=true]'); "
          "const put=async(i,s)=>{ const b=eds.nth(i); await b.evaluate(e=>{ e.scrollIntoView({block:'center'}); e.focus(); }); await sleep(300); await P.keyboard.press('Meta+A'); await P.keyboard.press('Backspace'); await sleep(300); await P.keyboard.insertText(s); await sleep(700); return (await b.evaluate(e=>e.innerText)).trim(); }; "
          "const T=await put(0,m.title); const D=await put(1,m.description); "
          "console.log('TOK:'+(T===m.title)); console.log('DLEN:'+D.length+'/'+m.description.length); })()")
    if val(o, "TOK") != "true":
        raise RuntimeError("제목이 맞게 들어가지 않았습니다: " + o[-400:])

    # 2. 아동용 아님 선택
    o = J(f"await (async()=>{{ const rs=P.locator('{DLG} [role=radiogroup] [role=radio]'); await rs.nth(1).click(); await sleep(600); "
          "console.log('MFK:'+JSON.stringify(await rs.evaluateAll(es=>es.map(e=>[e.innerText.trim().slice(0,10),e.getAttribute('aria-checked')])))); })()")
    mfk = json.loads(val(o, "MFK"))
    if not (mfk[1][0].startswith("아니요") and mfk[1][1] == "true"):
        raise RuntimeError("아동용 아님 선택 실패: " + str(mfk))

    # 3. 상세 검색 태그 입력 (자세히 보기 열기 -> 태그 입력)
    if meta.get("tags"):
        print("[upload] 태그 입력 진행 중...", flush=True)
        # 자세히 보기 → 채널 업로드 기본값으로 미리 들어간 태그 지우기 → 입력칸에 초점 (페이지 안에서)
        PREP_JS = (f"const d=document.querySelector('{DLG}'); if(!d) return 'NO_DLG'; "
                   "const more=[...d.querySelectorAll('ytcp-button, button')].find(b=>b.getBoundingClientRect().width&&/^(자세히 보기|Show more)$/.test(b.innerText.trim())); "
                   "if (more) { more.scrollIntoView({block:'center'}); more.click(); await new Promise(r=>setTimeout(r,1500)); } "
                   "const inp=d.querySelector('input[aria-label=\\\"태그\\\"], #tags-container input'); if(!inp) return 'NO_TAG_INPUT'; "
                   "const bar=inp.closest('ytcp-chip-bar')||d; "
                   "for (let k=0; k<60 && bar.querySelector('ytcp-chip #delete-icon'); k++) { bar.querySelector('ytcp-chip #delete-icon').click(); await new Promise(r=>setTimeout(r,150)); } "
                   "inp.scrollIntoView({block:'center'}); inp.focus(); return 'READY:'+bar.querySelectorAll('ytcp-chip').length;")
        CHIPS_JS = (f"const inp=document.querySelector('{DLG} input[aria-label=\\\"태그\\\"], {DLG} #tags-container input'); "
                    "const bar=inp.closest('ytcp-chip-bar')||document.querySelector('" + DLG + "'); "
                    "return JSON.stringify([...bar.querySelectorAll('ytcp-chip')].map(c=>c.innerText.trim()).filter(Boolean));")
        TAG_JS = ("const m=JSON.parse(await fs.readFile('./meta.json','utf8')); "
                  f"console.log('PREP:'+await P.evaluate(async()=>{{ {PREP_JS} }})); await sleep(500); "
                  "await P.keyboard.insertText(m.tags); await sleep(600); await P.keyboard.press('Enter'); await sleep(1000); "
                  f"console.log('TAGS_CHIPS:'+await P.evaluate(()=>{{ {CHIPS_JS} }}))")
        o = J(TAG_JS)
        chips = json.loads(val(o, "TAGS_CHIPS") or "[]")
        want = [t.strip() for t in meta["tags"].split(",") if t.strip()]
        print("[upload] 태그", len(chips), "/", len(want), flush=True)
        if chips != want:
            raise RuntimeError("태그가 맞게 들어가지 않았습니다: " + str(chips))

    # 4. 단계 진행 (동영상 요소 -> 검토 -> 공개 상태)
    for want in ("동영상 요소", "검토", "공개 상태"):
        o = J(f"await (async()=>{{ await P.locator('{DLG} #next-button').click(); await sleep(1800); "
              f"console.log('TAB:'+await P.evaluate(()=>[...document.querySelectorAll('{DLG} [role=tab]')].filter(x=>x.getAttribute('aria-selected')==='true').map(x=>x.innerText.trim()).join('|'))); }})()")
        if val(o, "TAB") != want:
            raise RuntimeError(f"단계 이동 실패: {want} ≠ {val(o, 'TAB')}")

    # 5. 비공개 라디오 선택 및 링크 획득
    o = J(f"await (async()=>{{ const v=P.locator('{DLG} [role=radio]'); await v.nth(0).click(); await sleep(700); "
          "console.log('VIS:'+JSON.stringify(await v.evaluateAll(es=>es.map(e=>[e.innerText.trim().split('\\n')[0],e.getAttribute('aria-checked')])))); "
          f"console.log('LINK:'+await P.evaluate(()=>{{ const a=[...document.querySelectorAll('{DLG} a')].map(a=>a.href).find(h=>/youtube\\.com\\/(shorts\\/|watch\\?v=)|youtu\\.be\\//.test(h)); return a||''; }})); }})()")
    vis = json.loads(val(o, "VIS"))
    link = val(o, "LINK")
    if not (vis[0][0] == "비공개" and vis[0][1] == "true" and all(x[1] != "true" for x in vis[1:])):
        raise RuntimeError("비공개가 확인되지 않아 저장하지 않습니다: " + str(vis))

    # 6. 파일 전송 완료 대기
    for _ in range(180):
        o = J(f"console.log('PROG:'+((await P.evaluate(()=>{{ const t=document.querySelector('{DLG}')?.innerText||''; const m=t.match(/(업로드 중|Uploading)[^\\n]*/); return m?m[0]:'done'; }}))))")
        prog = val(o, "PROG") or ""
        if "업로드 중" not in prog and "Uploading" not in prog:
            break
        print("[upload]", prog[:80], flush=True)
        time.sleep(5)

    # 7. 완료 버튼 클릭
    o = J(f"await (async()=>{{ const d=P.locator('{DLG} #done-button'); console.log('DONE:'+(await d.innerText()).trim()); await d.click(); "
          f"for(let i=0;i<20;i++){{ await sleep(1000); if(!(await P.locator('{DLG} [role=dialog]').count())) break; }} "
          f"console.log('LEFT:'+await P.locator('{DLG} [role=dialog]').count()); }})()")
    time.sleep(2)
    J(CLOSE_JS)
    if val(o, "DONE") != "저장":
        raise RuntimeError("마지막 버튼이 '저장'이 아닙니다: " + str(val(o, "DONE")))

    vid = re.split(r"/|v=", link)[-1] if link else None
    res = {
        "account": ACCOUNT,
        "channel_id": CHANNEL_ID,
        "video": str(video),
        "video_id": vid,
        "url": link,
        "visibility": "private",
        "made_for_kids": False,
        "title": meta["title"],
        "metadata": str(meta_file),
        "tags": meta.get("tags", ""),
        "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%S%z")
    }
    out_json.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(res, ensure_ascii=False))
finally:
    r.close()


"""Exercise the real browser player and save review frames for each episode."""
import argparse
import base64
import html
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SESSION='series-v24'


def browser(*args,input=None):
    return subprocess.check_output(['agent-browser','--session',SESSION,*args],input=input,text=True,timeout=180)


def check(ep):
    qa=ROOT/'episodes'/ep/'qa/head-first-v24';qa.mkdir(exist_ok=True)
    browser('open',f'http://127.0.0.1:5185/series/site/studio.html?ep={ep}')
    browser('wait','--fn','window.sumukExport?.ready === true')
    result=json.loads(browser('eval','--stdin',input=(ROOT/'scripts/qa_head_first_v24.browser.js').read_text()))
    frames=json.loads(browser('eval','({head:window.qaHeadData,complete:window.qaCompleteData})'))
    for key,url in frames.items():
        (qa/f'{key}.png').write_bytes(base64.b64decode(url.split(',')[1]))
    result['episode']=ep
    (qa/'browser-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print('BROWSER_PASS',ep,result['people'],'people',round(result['final_render_ms']),'ms',flush=True)
    return result


def contact_sheet():
    sheet=Image.new('RGB',(1500,1100),(248,245,234));draw=ImageDraw.Draw(sheet)
    for i,n in enumerate(range(2,12)):
        ep=f'ep{n:02d}';path=ROOT/'episodes'/ep/'qa/head-first-v24/complete.png'
        if not path.exists():continue
        # The complete camera puts the 1000×652 plate at y≈367–1073.
        image=Image.open(path).crop((40,360,1040,1085));image.thumbnail((360,270))
        x=(i%4)*375;y=(i//4)*355
        sheet.paste(image,(x,y+30));draw.text((x+8,y+8),ep,fill=(40,40,35))
    sheet.save(ROOT/'production/head-first-v24-contact.jpg')


def write_review():
    cards=[]
    for n in range(2,12):
        ep=f'ep{n:02d}';E=ROOT/'episodes'/ep;info=json.loads((E/'episode.json').read_text())
        qa=E/'qa/head-first-v24'
        assert (qa/'browser-check.json').exists() and (qa/'asset-check.json').exists(),ep
        image=Image.open(qa/'complete.png').convert('RGB').crop((40,360,1040,1085))
        image.thumbnail((800,580));image.save(qa/'preview.jpg',quality=90)
        title=html.escape(info['title'])
        cards.append(f'<li><a href="studio.html?ep={ep}"><img src="../episodes/{ep}/qa/head-first-v24/preview.jpg" alt="{title} 완성 검토 화면" loading="lazy"><span>{n-1:02d} · {ep.upper()}</span><h2>{title}</h2><p>그리는 과정 열기 ↗</p></a></li>')
    page='''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>머리부터, 한 사람씩 · 드로잉 10편 검토</title><link rel="icon" href="data:,"><style>
*{box-sizing:border-box}body{margin:0;background:#f8f5ea;color:#30382f;font-family:system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:48px 28px 64px}a{color:inherit}header>a{font-size:14px}h1{font-size:clamp(27px,4vw,42px);font-weight:600;margin:28px 0 18px}header p{line-height:1.9;margin:4px 0;color:#626858}ol{list-style:none;padding:0;margin:36px 0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px 24px}li a{display:block;text-decoration:none}img{display:block;width:100%;aspect-ratio:1000/725;object-fit:cover;background:#eee8d7}li span{display:block;margin-top:14px;color:#7b755e;font-size:12px;letter-spacing:.06em}h2{font-size:19px;font-weight:600;margin:8px 0}li p{font-size:13px;margin:9px 0;color:#626858}li a:hover h2{text-decoration:underline}li a:focus-visible{outline:3px solid #786442;outline-offset:6px}@media(max-width:800px){ol{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){main{padding:28px 18px}ol{grid-template-columns:1fr;gap:28px}}
</style></head><body><main><header><a href="./">TJ KIM 컬렉션</a><h1>머리부터, 한 사람씩</h1>
<p>머리·얼굴 채색 → 몸 채색 → 세선 정리 → 다음 사람 → 물건 → 색별 배경</p>
<p>그림을 누르면 새 검토 플레이어가 열립니다. 인물별 머리·몸과 배경 색별 바로가기를 이용할 수 있습니다.</p>
</header><ol>'''+''.join(cards)+'</ol></main></body></html>'
    (ROOT/'site/review-v24.html').write_text(page)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episodes',nargs='*');parser.add_argument('--review-only',action='store_true');args=parser.parse_args()
    if args.review_only:
        write_review();contact_sheet();raise SystemExit(0)
    results=[]
    for ep in args.episodes or [f'ep{i:02d}' for i in range(2,12)]:
        results.append(check(ep));contact_sheet()
    if len(results)==10:(ROOT/'production/head-first-v24-browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')

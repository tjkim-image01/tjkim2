"""Exercise the photo archive in a dedicated browser session without changing saved production settings."""
from pathlib import Path
import subprocess,json,time,urllib.request
P=Path(__file__).resolve().parents[1];Q=P/'site/qa';S='pen001-archive-check'
def ab(*args):
 if args[0]=='click':
  ab('scrollintoview',args[1]);ab('eval','(async()=>{let p=scrollY,n=0;while(n<8){await new Promise(requestAnimationFrame);n=Math.abs(scrollY-p)<.1?n+1:0;p=scrollY;}return true;})()')
 r=subprocess.run(['agent-browser','--session',S,'--json',*map(str,args)],capture_output=True,text=True,check=True)
 d=json.loads(r.stdout);assert d['success'],d;return d.get('data',{})
def ev(js):return ab('eval',js).get('result')
def wait(js):ab('wait','--fn',js)
checks=[]
for lang in ['ko','en','ja']:
 ab('open',f'http://127.0.0.1:5185/?lang={lang}');wait('window.pen001?.ready===true')
 for width,height in [(320,740),(390,844),(768,1024),(1440,1000)]:
  ab('set','viewport',width,height);state=ev('({lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:document.querySelectorAll("#artGrid .art-card").length,films:document.querySelectorAll(".film-card").length})')
  assert state['lang']==lang and state['scrollWidth']<=width and state['cards']==17 and state['films']==10,state
  checks.append({'page':'home',**state})
 ab('set','viewport',390,844);ab('screenshot',Q/f'home-{lang}-mobile.png')
 ab('fill','#search','zzzz-no-match');wait('!document.querySelector("#empty").hidden');ab('click','#reset');wait('document.querySelectorAll("#artGrid .art-card").length===17')
 ab('check','#videoOnly');wait('document.querySelectorAll("#artGrid .art-card").length===10');ab('uncheck','#videoOnly')
 ab('click','[data-category="work"]');assert ev('document.querySelectorAll("#artGrid .art-card").length')==6
 ab('click','[data-category="all"]');checks.append({'search_reset_category_video_filter':lang})
 ab('click','#slideshowNav');wait('document.querySelector("#viewer").open');first=ev('document.querySelector("#viewerTitle").textContent');ab('click','#nextImage');assert ev('document.querySelector("#viewerTitle").textContent')!=first
 ab('press','Escape');wait('!document.querySelector("#viewer").open');checks.append({'slideshow_keyboard_close':lang})
 ab('open',f'http://127.0.0.1:5185/work.html?id=cloth&lang={lang}');wait('window.pen001?.ready===true')
 for width,height in [(320,740),(390,844),(768,1024),(1440,1000)]:
  ab('set','viewport',width,height);state=ev('({lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,title:document.querySelector("h1").textContent})');assert state['scrollWidth']<=width,state;checks.append({'page':'work',**state})
 ab('click','[data-tab="album"]');wait('document.querySelector("#workPicture img")?.complete');assert '/assets/photos/album-3.jpg' in ev('document.querySelector("#workPicture img").src')
 ab('click','#enlargeWork');wait('document.querySelector("#viewer").open');wait('document.querySelector("#viewerStage img").complete');width=ev('document.querySelector("#viewerStage img").naturalWidth');assert width>=4000,width
 ev('document.querySelector("#zoom").value=2;document.querySelector("#zoom").dispatchEvent(new Event("input",{bubbles:true}))');assert ev('document.querySelector("#zoomValue").textContent')=='200%';ab('press','Escape')
 ab('click','[data-tab="film"]');wait('document.querySelector("#workPicture video")?.readyState>=1');state=ev('({duration:document.querySelector("#workPicture video").duration,source:document.querySelector("#workPicture video").src,poster:document.querySelector("#workPicture video").poster})');assert state['duration']==67.5 and f'-{lang}-v18-cover.mp4' in state['source'] and f'/{lang}.png' in state['poster'],state;checks.append({'video':lang,**state})
 ab('click','[data-tab="scene"]');ab('set','viewport',390,844);ab('screenshot',Q/f'work-{lang}-mobile.png')
 ab('open',f'http://127.0.0.1:5185/?lang={lang}');wait('window.pen001?.ready===true');ev('document.documentElement.dataset.theme="dark"');ab('screenshot',Q/f'home-{lang}-dark.png');ev('document.documentElement.dataset.theme="light"')
 if lang=='ko':ab('set','viewport',1440,1000);ab('screenshot',Q/'home-desktop.png')
 errors=ev('performance.getEntriesByType("resource").filter(e=>e.responseStatus>=400).map(e=>({url:e.name,status:e.responseStatus}))');assert not errors,errors
# Every actual photograph, video/cover and language download resolves on the new origin.
data=json.loads((P/'site/data/collection.json').read_text());urls={p['url'] for p in data['photos']}
for w in data['works']:
 for edition in w['editions'].values():urls.update([edition['video'],edition['poster']])
urls.update(b['url'] for b in data['bundles'].values())
for url in urls:
 with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:5185'+url,method='HEAD'),timeout=15) as r:assert r.status==200,url
with urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:5185'+next(iter(data['works'][0]['editions'].values()))['video'],headers={'Range':'bytes=0-1023'}),timeout=15) as r:assert r.status==206 and len(r.read())==1024
report={'ok':True,'checks':checks,'resolved_assets':len(urls),'original_photo_widths':[p['width'] for p in data['photos']],'video_range_requests':True}
(Q/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('ARCHIVE_QA_PASSED',len(checks),'browser checks,',len(urls),'assets',flush=True);ab('close')

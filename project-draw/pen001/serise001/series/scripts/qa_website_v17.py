"""Real browser QA using the agent-browser CLI, with a dedicated task session."""
from pathlib import Path
import json,subprocess,time
P=Path(__file__).resolve().parents[1];Q=P/'production/qa-web-v17';Q.mkdir(exist_ok=True);session='sumuk-v17-website-qa'
def ab(*args):
 if args[0]=='click':
  ab('scrollintoview',args[1])
  ab('eval','(async()=>{let previous=scrollY,stable=0;while(stable<8){await new Promise(requestAnimationFrame);const current=scrollY;stable=Math.abs(current-previous)<.1?stable+1:0;previous=current;}return true;})()')
 r=subprocess.run(['agent-browser','--session',session,'--json',*map(str,args)],capture_output=True,text=True,check=True);d=json.loads(r.stdout);assert d.get('success'),d;return d.get('data',{})
def ev(js):return ab('eval',js).get('result')
def wait(js):
 for _ in range(50):
  if ev(js):return
  time.sleep(.2)
 raise AssertionError('Browser condition failed: '+js)
results=[]
for lang in ['ko','en','ja']:
 ab('set','viewport',390,844);ab('open',f'http://127.0.0.1:5184/series/site/?lang={lang}');wait('document.querySelectorAll(".story-card").length===10')
 for theme in ['light','dark']:
  ev(f'document.documentElement.dataset.theme={json.dumps(theme)}');ab('screenshot',Q/f'home-{lang}-{theme}-390.png');item=ev('({lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:document.querySelectorAll(".story-card").length,title:document.querySelector("h1").innerText,primary:document.querySelector(".actions a").href})');assert item['lang']==lang and item['scrollWidth']<=item['width'] and item['cards']==10;assert 'lang='+lang in item['primary'];results.append({'page':'home','theme':theme,**item})
 ab('fill','#search','zzzz-no-match');wait('!document.querySelector("#empty").hidden');ab('scrollintoview','#clearSearch');ab('wait','--fn',"!!document.querySelector('#clearSearch').getClientRects().length");ab('click','#clearSearch');wait('document.querySelectorAll(".story-card").length===10')
 ab('click','#categories button[data-category="놀이·음악"]');assert ev('document.querySelectorAll(".story-card").length')==3;ab('click','#categories button[data-category="전체"]')
 ab('open',f'http://127.0.0.1:5184/series/site/watch.html?ep=ep02&lang={lang}');wait('document.querySelector("#video").readyState>=1')
 ev('document.querySelector("#video").pause();document.querySelector("#video").muted=true')
 for width,height in [(320,740),(390,844),(768,1024),(1440,1000)]:
  ab('set','viewport',width,height);item=ev('({lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,duration:document.querySelector("#video").duration,source:document.querySelector("#video").src,playlist:document.querySelectorAll("#playlist button").length,download:document.querySelector("#downloadLink").href})');assert item['scrollWidth']<=item['width'] and item['duration']==66 and item['playlist']==10;assert f'-{lang}-v14.mp4' in item['source'];results.append({'page':'watch',**item})
 ab('set','viewport',390,844);ab('screenshot',Q/f'watch-{lang}-390.png')
# Change language at a nonzero position; the same moment and the corresponding audio must remain selected.
ab('open','http://127.0.0.1:5184/series/site/watch.html?ep=ep02&lang=ko');wait('document.querySelector("#video").readyState>=1');ev('document.querySelector("#video").currentTime=23.4');ab('select','#editionLanguage','en');wait('document.documentElement.lang==="en"&&document.querySelector("#video").readyState>=1');state=ev('({time:document.querySelector("#video").currentTime,source:document.querySelector("#video").src})');assert abs(state['time']-23.4)<.1 and '-en-v14' in state['source'];results.append({'language_change_keeps_position':state})
ev('document.querySelector("#video").muted=true');ab('click','#next');wait('location.search.includes("ep=ep03")&&document.querySelector("#video").readyState>=1');state=ev('({lang:document.documentElement.lang,source:document.querySelector("#video").src,url:location.href})');assert state['lang']=='en' and '-en-v17' in state['source'];results.append({'next_keeps_language':state});ev('document.querySelector("#video").pause()')
(Q/'results.json').write_text(json.dumps({'ok':True,'checks':results},ensure_ascii=False,indent=2)+'\n');print('WEBSITE_QA_PASSED',len(results),'checks',flush=True)

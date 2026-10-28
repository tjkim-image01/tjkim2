"""Append-only EN/JA Typecast narration using the shared lib connector.
Never clears the PEN project. Verifies and records its unchanged original prefix.
"""
import sys,json,time,re,urllib.request,subprocess
from pathlib import Path
sys.path.insert(0,'/Users/jatu/app/model3d')
from lib.com.jatu.aside.connector.typecast import TypecastConnector
P=Path(__file__).resolve().parents[1]/'episodes/ep02/locales'
PROJECT='https://studio.typecast.ai/text-to-speech/6ad0eb6480cf3c32a08d186c'
class LocalizedTypecast(TypecastConnector):
 def _play(self,idx=0):
  return self._repl(r"""
await tc.keyboard.press('Escape');await tc.locator('[data-slate-editor=true] p').nth(%d).click();await tc.keyboard.press('Home');
let ok=false;for(let retry=0;retry<30;retry++){const p=tc.getByRole('button',{name:'Play',exact:true});if(await p.count()){await p.click();ok=true;break;}const stop=tc.getByRole('button',{name:'Pause',exact:true});if(await stop.count())await stop.click();await sleep(350);}if(!ok)throw Error('Play unavailable');console.log('OK:');
""" % idx)
tc=LocalizedTypecast(project_url=PROJECT,account='u9')
languages=['en','ja'];data=[json.loads((P/f'{l}.json').read_text()) for l in languages]
data[1]['actor']='이노우에 다이치'
for d in data:(P/f"{d['language']}.json").write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
import atexit
language_out=tc._repl("console.log('LANG:'+await tc.getByRole('button',{name:'change project language',exact:true}).innerText());")
original_language=tc._marker(language_out,'LANG:')
def restore_language():
 if original_language!='한국어':return
 out=tc._repl(r'''
await tc.keyboard.press('Escape');const b=tc.getByRole('button',{name:'change project language',exact:true});if((await b.innerText()).trim()!=='한국어'){
await b.click();await tc.getByRole('radio',{name:'하나의 언어 선택추천최고의 퀄리티를 보장합니다.',exact:true}).click();await tc.getByRole('button',{name:'close modal',exact:true}).click();await sleep(300);const change=tc.getByRole('button',{name:'변경하기',exact:true});if(await change.count())await change.click();await sleep(400);}
console.log('OK:');
''')
 print('RESTORED original Korean project language',flush=True)
atexit.register(restore_language)
state=tc.state();before=state['text'];assert before[0].startswith('구름이 남아 있어도')
backup=P/'typecast-before-localization.json'
if not backup.exists():backup.write_text(json.dumps(state,ensure_ascii=False,indent=2))
texts=[d['narration'] for d in data]
if before[-2:]==texts:offset=len(before)-2;original=before[:-2]
else:
 offset=len(before);original=before[:]
 out=tc._repl(r'''
await tc.keyboard.press('Escape');const texts=%s;
await tc.evaluate(()=>{const editor=document.querySelector('[data-slate-editor=true]');editor.focus();const last=[...editor.querySelectorAll('p')].at(-1);const r=document.createRange();r.selectNodeContents(last);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);});
for(const t of texts){await tc.keyboard.press('Enter');await tc.keyboard.insertText(t);await sleep(350);}
console.log('OK:'+JSON.stringify(await tcText()));
'''%json.dumps(texts,ensure_ascii=False))
 got=json.loads(tc._marker(out,'OK:'));assert got[:offset]==original and got[offset:]==texts,got[offset:]
print('PRESERVED',len(original),'APPENDED',2,'OFFSET',offset,flush=True)
for j,d in enumerate(data):
 # Reset discovery filters so both native English and Japanese voices are searchable.
 out=tc._repl(r'''
await tc.keyboard.press('Escape');const i=%d,name=%s;
const chips=await tcChips();if(chips[i]!==name){
await tc.evaluate(i=>document.querySelectorAll('button.actor-selector')[i].click(),i);await sleep(700);
await tc.evaluate(()=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(x=>x.innerText.trim()==='초기화');b?.click();});
await tc.getByRole('button',{name:'보이스 찾기',exact:true}).click();await sleep(400);
await tc.locator('input[placeholder="보이스 찾기"]').fill(name);await sleep(1500);
const ok=await tc.evaluate(n=>{const b=[...document.querySelectorAll('[role=dialog] button')].find(x=>(x.querySelector('span.font-semibold')?.innerText.trim()===n)||x.innerText.trim().startsWith(n+'\n'));if(!b)return false;b.click();return true;},name);if(!ok)throw Error('Voice missing: '+name);await sleep(600);
}console.log('OK:'+JSON.stringify(await tcChips()));
'''%(offset+j,json.dumps(d['actor'],ensure_ascii=False)))
 chips=json.loads(tc._marker(out,'OK:'));assert chips[offset+j]==d['actor'],chips[-2:]
 print('ACTOR',d['language'],d['actor'],flush=True)
# Auto detect is necessary for the two appended languages; original text stays intact.
out=tc._repl(r'''
await tc.keyboard.press('Escape');const label=await tc.getByRole('button',{name:'change project language',exact:true}).innerText();
if(label.trim()!=='자동'){
await tc.getByRole('button',{name:'change project language',exact:true}).click();await sleep(400);
await tc.getByRole('radio',{name:'언어 자동 감지다국어 프로젝트에 적합합니다.',exact:true}).click();
await tc.getByRole('button',{name:'close modal',exact:true}).click();await sleep(400);
const change=tc.getByRole('button',{name:'변경하기',exact:true});if(await change.count())await change.click();await sleep(700);
}console.log('OK:');
''')
for j,d in enumerate(data):
 dest=P/d['language'];dest.mkdir(exist_ok=True)
 if (dest/'raw.wav').exists():print('EXISTS',d['language'],flush=True);continue
 tc._pause();tc._repl("await tc.evaluate(()=>window.__tcLog=[]);console.log('OK:');");tc._play(offset+j)
 seq=urls=None
 for attempt in range(40):
  time.sleep(2);log=tc._log();seq=tc._match(d['narration'],tc._speaks(log));cdn=tc._cdn(log)
  if seq and all(s['file_key'] in cdn for s in seq):urls=[cdn[s['file_key']] for s in seq];break
 assert urls,('No actual Typecast audio',d['language'])
 tc._pause();parts=[]
 for k,u in enumerate(urls):
  f=dest/f'part-{k:02d}.wav';urllib.request.urlretrieve(u,f);parts.append(f)
 (dest/'generated-segments.json').write_text(json.dumps(seq,ensure_ascii=False,indent=2))
 args=sum((['-i',str(f)] for f in parts),[])
 filt=''.join(f'[{k}:a]aresample=48000,aformat=channel_layouts=mono[a{k}];' for k in range(len(parts)))+''.join(f'[a{k}]' for k in range(len(parts)))+f'concat=n={len(parts)}:v=0:a=1[o]'
 subprocess.run(['ffmpeg','-y','-v','error',*args,'-filter_complex',filt,'-map','[o]',str(dest/'raw.wav')],check=True)
 print('READY',d['language'],subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest/'raw.wav')],text=True).strip(),flush=True)
final=tc.state();assert final['text'][:len(original)]==original
(P/'typecast-preservation.json').write_text(json.dumps({'provider':'Typecast','connector':'lib/com/jatu/aside/connector/typecast.py','project':PROJECT,'account':'u9','original_prefix_unchanged':True,'original_paragraphs':len(original),'new_paragraphs':2,'offset':offset,'actors':{d['language']:d['actor'] for d in data}},ensure_ascii=False,indent=2))
print('COMPLETE',flush=True)

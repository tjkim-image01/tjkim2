"""Generate only the new series paragraphs via the user's existing Typecast connector.
Append-only; resumable; no credentials, project clears, direct synthesis API, or ElevenLabs.
"""
import sys,json,time,urllib.request,subprocess,atexit,hashlib
from pathlib import Path
sys.path.insert(0,'/Users/jatu/app/model3d')
from lib.com.jatu.aside.connector.typecast import TypecastConnector
P=Path(__file__).resolve().parents[1];R=P/'production';R.mkdir(exist_ok=True)
PROJECT='https://studio.typecast.ai/text-to-speech/6ad0eb6480cf3c32a08d186c'
class SeriesTypecast(TypecastConnector):
 def _pause(self):
  self._repl("for(const n of ['Pause','Stop']){const b=tc.getByRole('button',{name:n,exact:true});if(await b.count())await b.click();}await sleep(350);console.log('OK:');")
 def play(self,idx):
  self._repl(r'''
await tc.keyboard.press('Escape');await tc.locator('[data-slate-editor=true] p').nth(%d).click();await tc.keyboard.press('Home');
let ok=false;for(let r=0;r<30;r++){const p=tc.getByRole('button',{name:'Play',exact:true});if(await p.count()){await p.click();ok=true;break;}const stop=tc.getByRole('button',{name:'Pause',exact:true});if(await stop.count())await stop.click();const generating=tc.getByRole('button',{name:'Stop',exact:true});if(await generating.count())await generating.click();await sleep(500);}if(!ok)throw Error('Play unavailable');console.log('OK:');
'''%idx)
 def actor(self,idx,name):
  out=self._repl(r'''
await tc.keyboard.press('Escape');await tc.keyboard.press('Escape');const i=%d,name=%s, before=await tcChips();if(before[i]!==name){
await tc.evaluate(i=>document.querySelectorAll('button.actor-selector')[i].click(),i);await sleep(650);
const reset=tc.getByRole('button',{name:'초기화',exact:true});if(await reset.count())await reset.click();await sleep(450);
await tc.getByRole('button',{name:'보이스 찾기',exact:true}).click();await sleep(350);await tc.locator('input[placeholder="보이스 찾기"]').fill(name);await sleep(1300);
const ok=await tc.evaluate(n=>{const b=[...document.querySelectorAll('button')].find(x=>x.querySelector('span.font-semibold')?.innerText.trim()===n||x.innerText.trim().startsWith(n+'\n'));if(!b)return false;b.click();return true;},name);if(!ok)throw Error('Voice missing '+name);await sleep(450);}
console.log('OK:'+JSON.stringify(await tcChips()));
'''%(idx,json.dumps(name,ensure_ascii=False)))
  chips=json.loads(self._marker(out,'OK:'));assert chips[idx]==name,(idx,name,chips[idx])
 def language(self,auto):
  target='자동' if auto else '한국어'
  out=self._repl(r'''
await tc.keyboard.press('Escape');const b=tc.getByRole('button',{name:'change project language',exact:true});if((await b.innerText()).trim()!==%s){await b.click();await sleep(300);await tc.getByRole('radio',{name:%s,exact:true}).click();await tc.getByRole('button',{name:'close modal',exact:true}).click();await sleep(350);const confirm=tc.getByRole('button',{name:'변경하기',exact:true});if(await confirm.count())await confirm.click();await sleep(500);}console.log('OK:'+await tc.getByRole('button',{name:'change project language',exact:true}).innerText());
'''%(json.dumps(target),json.dumps('언어 자동 감지다국어 프로젝트에 적합합니다.' if auto else '하나의 언어 선택추천최고의 퀄리티를 보장합니다.',ensure_ascii=False)))
  assert self._marker(out,'OK:')==target,out

tc=SeriesTypecast(project_url=PROJECT,account='u9')
jobs=[]
for lang in ['ko','en','ja']:
 for n in range(3,12):
  f=P/f'episodes/ep{n:02d}/locales/{lang}.json';d=json.loads(f.read_text());jobs.append({**d,'metadata':str(f)})
texts=[d['narration'] for d in jobs];state=tc.state();before=state['text'];assert before[0].startswith('구름이 남아 있어도')
backup=R/'typecast-before-series.json'
if not backup.exists():backup.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
if before[-len(texts):]==texts:offset=len(before)-len(texts);original=before[:offset]
else:
 original=before[:];offset=len(before)
 out=tc._repl(r'''
await tc.keyboard.press('Escape');const texts=%s;await tc.evaluate(()=>{const e=document.querySelector('[data-slate-editor=true]');e.focus();const p=[...e.querySelectorAll('p')].at(-1),r=document.createRange();r.selectNodeContents(p);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);});
for(const t of texts){await tc.keyboard.press('Enter');await tc.keyboard.insertText(t);await sleep(240);}await sleep(600);console.log('OK:'+JSON.stringify(await tcText()));
'''%json.dumps(texts,ensure_ascii=False))
 got=json.loads(tc._marker(out,'OK:'));assert got[:offset]==original and got[offset:]==texts,'Append verification failed'
print('APPENDED',len(texts),'PRESERVED',len(original),'OFFSET',offset,flush=True)
(R/'typecast-jobs.json').write_text(json.dumps({'offset':offset,'jobs':[{'episode':d['episode'],'language':d['language'],'paragraph':offset+i,'actor':d['actor']} for i,d in enumerate(jobs)]},ensure_ascii=False,indent=2)+'\n')
for i,d in enumerate(jobs):tc.actor(offset+i,d['actor']);print('ACTOR',d['episode'],d['language'],d['actor'],flush=True)
original_language='한국어' # original PEN setting before this series run
def restore():
 try:tc._pause();tc.language(original_language=='자동');print('LANGUAGE_RESTORED',original_language,flush=True)
 except Exception as e:print('RESTORE_FAILED',str(e),flush=True)
atexit.register(restore);tc.language(True)
for i,d in enumerate(jobs):
 dest=Path(d['metadata']).parent/d['language'];dest.mkdir(exist_ok=True);dst=dest/'raw.wav'
 if dst.exists():print('EXISTS',d['episode'],d['language'],flush=True);continue
 tc._pause();tc.play(offset+i);urls=seq=None
 for attempt in range(50):
  time.sleep(2);log=tc._log();seq=tc._match(d['narration'],tc._speaks(log));cdn=tc._cdn(log)
  if seq and all(s['file_key'] in cdn for s in seq):urls=[cdn[s['file_key']] for s in seq];break
 assert urls,('No actual Typecast narration',d['episode'],d['language'])
 tc._pause();parts=[]
 for j,u in enumerate(urls):
  f=dest/f'part-{j:02d}.wav';urllib.request.urlretrieve(u,f);parts.append(f)
 (dest/'generated-segments.json').write_text(json.dumps(seq,ensure_ascii=False,indent=2)+'\n')
 args=sum((['-i',str(f)] for f in parts),[]);filt=''.join(f'[{j}:a]aresample=48000,aformat=channel_layouts=mono[a{j}];' for j in range(len(parts)))+''.join(f'[a{j}]' for j in range(len(parts)))+f'concat=n={len(parts)}:v=0:a=1[o]'
 subprocess.run(['ffmpeg','-y','-v','error',*args,'-filter_complex',filt,'-map','[o]',str(dst)],check=True)
 dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dst)]));assert dur>10
 (dest/'provenance.json').write_text(json.dumps({'provider':'Typecast','connector':'/Users/jatu/app/model3d/lib/com/jatu/aside/connector/typecast.py','project':PROJECT,'actor':d['actor'],'paragraph':offset+i,'raw_duration':dur,'raw_sha256':hashlib.sha256(dst.read_bytes()).hexdigest()},ensure_ascii=False,indent=2)+'\n')
 print('READY',d['episode'],d['language'],dur,flush=True)
 final=tc.state();assert final['text'][:len(original)]==original
 (R/'typecast-progress.json').write_text(json.dumps({'original_prefix_unchanged':True,'original_paragraphs':len(original),'appended':len(jobs),'last_ready':[d['episode'],d['language']],'completed':sum((Path(x['metadata']).parent/x['language']/'raw.wav').exists() for x in jobs),'total':len(jobs)},ensure_ascii=False,indent=2)+'\n')
print('TYPECAST_SERIES_COMPLETE',flush=True)

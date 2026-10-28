"""Append-only Typecast generation on u9. All prior PEN001 text is preserved.
A dedicated project hit the account's 3/3 project limit. This uses the existing
PEN workspace without deleting any paragraph, and verifies its original prefix.
"""
import json,sys,re,subprocess,shutil,argparse
from pathlib import Path
ROOT=Path('/Users/jatu/app/model3d');sys.path.insert(0,str(ROOT))
from lib.com.jatu.aside.connector.typecast import TypecastConnector
P=Path(__file__).resolve().parents[1];OUT=P/'audio/typecast';OUT.mkdir(parents=True,exist_ok=True)
PROJECT='https://studio.typecast.ai/text-to-speech/6ad0eb6480cf3c32a08d186c'
all_lines=json.loads((P/'voice-lines.json').read_text());parser=argparse.ArgumentParser();parser.add_argument('--only');args=parser.parse_args();lines=[x for x in all_lines if not args.only or x['id'] in args.only.split(',')];norm=lambda s:re.sub(r'\s+','',s)
class PenTypecast(TypecastConnector):
 offset=0
 def _play(self,idx=0):
  return self._repl(r"""
await tc.locator('[data-slate-editor=true] p').nth(%d).click();
await tc.keyboard.press('Home');
for(let retry=0;retry<30;retry++){
 const play=tc.getByRole('button',{name:'Play',exact:true});
 if(await play.count()){await play.click();break;}
 const pause=tc.getByRole('button',{name:'Pause',exact:true});
 if(await pause.count())await pause.click();
 await sleep(400);
}
console.log('OK:');
""" % (self.offset+idx))
 def set_actor(self,idx,name):
  out=self._repl(r'''
const i=%d,name=%s;const before=await tcChips();
if(before[i]!==name){
 await tc.keyboard.press('Escape');await tc.evaluate(i=>document.querySelectorAll('button.actor-selector')[i].click(),i);await sleep(400);
 await tc.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='보이스 찾기'||b.innerText.trim()==='보이스 찾기')?.click());await sleep(350);
 await tc.locator('input[placeholder="보이스 찾기"]').fill(name);
 let picked=false;for(let j=0;j<16&&!picked;j++){await sleep(400);picked=await tc.evaluate(n=>{const b=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim().startsWith(n)).at(-1);if(!b)return false;b.click();return true;},name);}if(!picked)throw new Error('voice missing');
}
console.log('OK:'+JSON.stringify(await tcChips()));
'''%(idx,json.dumps(name,ensure_ascii=False)))
  chips=json.loads(self._marker(out,'OK:'));assert chips[idx]==name,(idx,chips)
tc=PenTypecast(project_url=PROJECT,account='u9')
try:
 state=tc.state();before=state['text'];desired=[l['text'] for l in lines]
 assert before and before[0].startswith('구름이 남아 있어도'), 'Refusing to modify a different project'
 backup=P/'audio/typecast-before.json'
 if not backup.exists():backup.write_text(json.dumps(state,ensure_ascii=False,indent=2))
 if [norm(x) for x in before[-len(desired):]]==[norm(x) for x in desired]:tc.offset=len(before)-len(desired);original=before[:tc.offset]
 else:
  original=before.copy();tc.offset=len(before)
  # Normal keyboard editing appends only new paragraphs. Never select-all/clear.
  body=r'''
const texts=%s;await tc.evaluate(()=>{const editor=document.querySelector('[data-slate-editor=true]');editor.focus();const last=[...editor.querySelectorAll('p')].at(-1);const range=document.createRange();range.selectNodeContents(last);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});await sleep(200);
for(const text of texts){await tc.keyboard.press('Enter');await tc.keyboard.insertText(text);await sleep(250);}
await sleep(800);console.log('OK:'+JSON.stringify(await tcText()));
'''%json.dumps(desired,ensure_ascii=False)
  tc._repl(body)
 after=tc.state();assert after['text'][:len(original)]==original, 'Prior text changed';assert [norm(x) for x in after['text'][tc.offset:]]==[norm(x) for x in desired],after['text'][tc.offset:]
 (P/'audio/typecast-after-append.json').write_text(json.dumps(after,ensure_ascii=False,indent=2))
 print('Preserved',len(original),'paragraphs; appended',len(desired),'at',tc.offset,flush=True)
 for i,line in enumerate(lines):tc.set_actor(tc.offset+i,'한준');line.update(actor='한준',provider='Typecast',temporary=False,emotion='일반')
 import time,urllib.request
 for i,line in enumerate(lines):
  if (OUT/line['file']).exists():
   print('EXISTS',line['id'],flush=True);continue
  tc._pause();tc._play(i);urls=None
  for attempt in range(25):
   time.sleep(2);log=tc._log();seq=tc._match(line['text'],tc._speaks(log));cdn=tc._cdn(log)
   if seq and all(v['file_key'] in cdn for v in seq):urls=[cdn[v['file_key']] for v in seq];break
  assert urls,('No actual Typecast audio',line['id'])
  tc._pause();parts=[]
  for j,url in enumerate(urls):
   part=OUT/(line['id']+f'.part{j}.wav');urllib.request.urlretrieve(url,part);parts.append(part)
  dst=OUT/line['file']
  if len(parts)==1:parts[0].replace(dst)
  else:
   gap=OUT/'gap.wav';subprocess.run(['ffmpeg','-y','-v','error','-f','lavfi','-i','anullsrc=r=44100:cl=mono','-t','.16',str(gap)],check=True)
   inputs=[x for f in parts for x in (f,gap)][:-1];args=sum((['-i',str(f)] for f in inputs),[])
   filt=''.join(f'[{j}:a]aresample=44100,aformat=channel_layouts=mono[a{j}];' for j in range(len(inputs)))+''.join(f'[a{j}]' for j in range(len(inputs)))+f'concat=n={len(inputs)}:v=0:a=1[o]'
   subprocess.run(['ffmpeg','-y','-v','error',*args,'-filter_complex',filt,'-map','[o]',str(dst)],check=True)
  print('READY',line['id'],flush=True)
 for line in lines:
  line['duration']=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(OUT/line['file'])],text=True));assert line['duration']>1
 final=tc.state();assert final['text'][:len(original)]==original
 (P/'audio/typecast-preservation.json').write_text(json.dumps({'project':PROJECT,'account':'u9','actor':'한준','original_paragraphs':len(original),'appended_paragraphs':len(lines),'original_prefix_unchanged':True,'first_new_paragraph':tc.offset},ensure_ascii=False,indent=2))
 existing=json.loads((OUT/'lines.json').read_text()) if (OUT/'lines.json').exists() else [];merged={x['id']:x for x in existing};merged.update({x['id']:x for x in lines});(OUT/'lines.json').write_text(json.dumps([merged[x['id']] for x in all_lines if x['id'] in merged],ensure_ascii=False,indent=2));print('TYPECAST_READY',[(x['id'],x['duration']) for x in lines],flush=True)
finally:pass

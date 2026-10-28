"""Match the actual first audible voice of EN/JA to each episode's Korean track.
The 6s Tj intro is always narration-free. Keeps original generated audio and timing metadata.
"""
from pathlib import Path
import json,re,subprocess,time,math,shutil,argparse
P=Path(__file__).resolve().parents[1];R=P/'production';parser=argparse.ArgumentParser();parser.add_argument('--once',action='store_true');args=parser.parse_args()
def limits(file):
 r=subprocess.run(['ffmpeg','-hide_banner','-i',str(file),'-af','silencedetect=noise=-40dB:d=0.10','-f','null','-'],capture_output=True,text=True,check=True)
 ends=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',r.stderr)];starts=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',r.stderr)]
 assert ends and starts,(file,r.stderr[-500:]);return ends[0],starts[-1]
def align(E,lang):
 A=E/f'locales/{lang}';ready=A/'sound-sync-ready.json'
 if ready.exists():return
 source=A/'voice-director.m4a';meta=E/f'locales/{lang}.json';ko=E/'audio/voice-director.m4a';target,endko=limits(ko);assert target>=8.1,(E.name,'KO starts during intro',target)
 backup=A/'voice-before-korean-sync.m4a';meta_backup=A/'metadata-before-korean-sync.json'
 if not backup.exists():shutil.copy2(source,backup);shutil.copy2(meta,meta_backup)
 d=json.loads(meta_backup.read_text());first,last=limits(backup);available=64.3-target;tempo=max(1,math.ceil((last-first)/available*100)/100);assert tempo<1.15,(E.name,lang,tempo)
 pre=min(.15,first);offset=first-pre;delay=target-pre/tempo;tmp=A/'voice-director.sync.tmp.m4a'
 subprocess.run(['ffmpeg','-y','-v','error','-ss',str(offset),'-t',str(last-offset+.28),'-i',str(backup),'-af',f'atempo={tempo},adelay={round(delay*1000)}:all=1,apad,atrim=duration=66','-ar','48000','-ac','2','-c:a','aac','-b:a','160k',str(tmp)],check=True)
 measured,end=limits(tmp);assert abs(measured-target)<.08,(E.name,lang,measured,target);tmp.replace(source)
 def convert(ct):return max(2.1,target+(ct+6-first)/tempo-6)
 for c in d['captions']:c['start']=round(convert(c['start']),5);c['end']=round(convert(c['end']),5)
 d.setdefault('timing',{}).update(sync_reference='korean',first_audible=measured,korean_first_audible=target,narration_start=target,sync_tempo=tempo,narration_end=end,alignment=d.get('timing',{}).get('alignment','')+'; first audible narration aligned to Korean after intro')
 meta.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');report={'episode':E.name,'language':lang,'reference':'Korean actual audible onset','korean_first_audible':target,'previous_first_audible':first,'first_audible':measured,'difference':measured-target,'tempo':tempo,'narration_end':end,'intro_voice_free':measured>=8.1};ready.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('NARRATION_ALIGNED',E.name,lang,round(first,3),'→',round(measured,3),'KO',round(target,3),flush=True)
errors={}
while True:
 for n in range(2,12):
  E=P/f'episodes/ep{n:02d}'
  for lang in ['en','ja']:
   A=E/f'locales/{lang}';key=E.name+'/'+lang
   if key in errors or (A/'sound-sync-ready.json').exists() or not (A/'voice-director.m4a').exists():continue
   if n>2 and not (A/'sound-ready.json').exists():continue
   try:align(E,lang)
   except Exception as exc:errors[key]=str(exc);print('ALIGN_FAILED',key,str(exc),flush=True)
 completed=sum((P/f'episodes/ep{n:02d}/locales/{l}/sound-sync-ready.json').exists() for n in range(2,12) for l in ['en','ja']);(R/'narration-sync-progress.json').write_text(json.dumps({'completed':completed,'total':20,'errors':errors},ensure_ascii=False,indent=2)+'\n')
 if completed==20:print('NARRATION_ALIGNMENT_COMPLETE',flush=True);break
 if args.once:break
 time.sleep(3)

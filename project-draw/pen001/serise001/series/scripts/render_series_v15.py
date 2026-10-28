"""Resume new 2–10 exports as actual Typecast sound becomes ready. Never overwrites approved v14."""
import json,time,os,subprocess,hashlib,concurrent.futures
from pathlib import Path
P=Path(__file__).resolve().parents[1];R=P/'production';errors={};pending={}
def key(ep,lang):return ep+'/'+lang
def revision(ep):return 'v14' if ep=='ep02' else 'v15'
def destination(ep,lang):return P/f'episodes/{ep}/output/{ep}-short-{lang}-{revision(ep)}.mp4'
def current(ep,lang):
 output=destination(ep,lang)
 if not output.exists():return False
 if lang=='ko':return True
 report=P/f'episodes/{ep}/output/{revision(ep)}/{lang}-manifest.json'
 if not report.exists():return False
 data=json.loads(report.read_text());return bool(data.get('narration_sync')) and abs(data['narration_sync'].get('difference',10))<.08
def render(ep,lang):
 E=P/'episodes'/ep;O=E/('output/'+revision(ep));O.mkdir(parents=True,exist_ok=True);settings=O/'settings.json'
 if not settings.exists():settings.write_bytes((E/'config/player-settings.json').read_bytes())
 metadata=E/f'locales/{lang}.json';locale=json.loads(metadata.read_text());video=O/f'{lang}.h264';mix=O/f'{lang}-mix.wav';output=destination(ep,lang);temporary=O/f'{lang}.tmp.mp4';env={**os.environ,'SUMUK_EPISODE':ep}
 with (O/f'{lang}-render.log').open('a') as log:
  subprocess.run(['node',str(P/'scripts/export_sumuk.cjs'),str(settings),str(metadata),str(video),'both'],env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
  subprocess.run(['ffmpeg','-y','-v','error','-r','30','-f','h264','-i',str(video),'-i',str(mix),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t','66','-movflags','+faststart','-metadata','title='+locale['settings']['title']+' · TJ KIM Collection','-metadata:s:a:0','language='+{'ko':'kor','en':'eng','ja':'jpn'}[lang],str(temporary)],stdout=log,stderr=subprocess.STDOUT,check=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(temporary)]));v=next(s for s in probe['streams'] if s['codec_type']=='video');a=next(s for s in probe['streams'] if s['codec_type']=='audio');assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],a['codec_name'])==(1080,1920,'30/1','h264','aac');assert abs(float(probe['format']['duration'])-66)<.05
 subprocess.run(['ffmpeg','-v','error','-i',str(temporary),'-f','null','-'],check=True,capture_output=True)
 assert all(len(c['text'])<=18 and '\n' not in c['text'] for c in locale['captions'])
 if output.exists():
  import shutil
  archive=E/'versions/before-korean-onset/output';archive.mkdir(parents=True,exist_ok=True)
  if not (archive/output.name).exists():shutil.copy2(output,archive/output.name)
 temporary.replace(output);report={'episode':ep,'language':lang,'file':str(output.relative_to(P)),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'probe':probe,'settings':json.loads(settings.read_text()),'voice':json.loads((E/f'locales/{lang}/sound-ready.json').read_text()) if (E/f'locales/{lang}/sound-ready.json').exists() else locale.get('timing'),'locale_sha256':hashlib.sha256(metadata.read_bytes()).hexdigest(),'renderer_revision':'series-v15','full_decode_pass':True,'narration_sync':json.loads((E/f'locales/{lang}/sound-sync-ready.json').read_text()) if lang!='ko' else None}
 (O/f'{lang}-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('VIDEO_READY',ep,lang,output.stat().st_size,flush=True)
 return key(ep,lang)
jobs=[('ep02',l) for l in ['en','ja']]+[(f'ep{n:02d}',l) for n in range(3,12) for l in ['ko','en','ja']]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 while True:
  for f,(ep,lang) in list(pending.items()):
   if not f.done():continue
   del pending[f]
   try:
    f.result()
    from publish_series_catalogue import publish
    publish()
   except Exception as exc:errors[key(ep,lang)]=str(exc);print('RENDER_FAILED',ep,lang,str(exc),flush=True)
  active={key(*v) for v in pending.values()}
  for ep,lang in jobs:
   k=key(ep,lang)
   if len(pending)>=2:break
   if k in active or k in errors or current(ep,lang):continue
   if lang!='ko' and not (P/f'episodes/{ep}/locales/{lang}/sound-sync-ready.json').exists():continue
   if ep!='ep02' and not (P/f'episodes/{ep}/locales/{lang}/sound-ready.json').exists():continue
   pending[pool.submit(render,ep,lang)]=(ep,lang);print('RENDER_START',ep,lang,flush=True)
  completed=[key(ep,l) for ep,l in jobs if current(ep,l)];progress={'completed':len(completed),'total':29,'approved_episode_1_exports':1,'ready':completed,'active':[key(*v) for v in pending.values()],'errors':errors};(R/'render-progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n')
  if len(completed)==29:print('SERIES_RENDER_COMPLETE',flush=True);break
  time.sleep(3)

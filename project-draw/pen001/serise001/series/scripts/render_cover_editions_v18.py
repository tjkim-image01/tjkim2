"""Add the approved 1.5-second localized cover before each unchanged SVG film."""
import concurrent.futures, hashlib, json, subprocess, time
from pathlib import Path
import numpy as np
from PIL import Image

P=Path(__file__).resolve().parents[1]
R=P/'production'
JOBS=[(f'ep{n:02d}',l) for n in range(3,12) for l in ['ko','en','ja']]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def paths(ep,lang):
 E=P/'episodes'/ep
 body=E/f'output/ep02-short-{lang}-v14.mp4' if ep=='ep02' else E/f'output/{ep}-short-{lang}-v17.mp4'
 return E,E/f'art/covers-v18/{lang}.png',body,E/f'output/{ep}-short-{lang}-v18-cover.mp4',E/'output/v18'
def current(ep,lang):
 E,cover,body,output,O=paths(ep,lang);m=O/f'{lang}-manifest.json'
 if not all(p.exists() for p in [cover,body,output,m]):return False
 d=json.loads(m.read_text())
 return d.get('cover_sha256')==sha(cover) and d.get('body_sha256')==sha(body) and d.get('full_decode_pass') and d.get('sha256')==sha(output)
def frame(p,t):
 raw=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-frames:v','1','-vf','scale=270:480','-f','rawvideo','-pix_fmt','rgb24','-'])
 return np.frombuffer(raw,np.uint8).reshape(480,270,3)
def audio(p,t,duration):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-t',str(duration),'-vn','-ar','16000','-ac','1','-f','f32le','-']),np.float32)
def render(ep,lang):
 E,cover,body,output,O=paths(ep,lang);O.mkdir(parents=True,exist_ok=True)
 assert Image.open(cover).size==(1080,1920)
 temporary=O/f'{lang}.tmp.mp4'
 graph=('[0:v]setsar=1,setpts=PTS-STARTPTS[card];[1:v]setsar=1,setpts=PTS-STARTPTS[body];'
        '[card][body]concat=n=2:v=1:a=0,format=yuv420p[v];'
        '[1:a]adelay=1500:all=1,apad,atrim=duration=67.5,asetpts=PTS-STARTPTS[a]')
 metadata=E/f'locales/{lang}.json'
 title=json.loads(metadata.read_text())['settings']['title'] if metadata.exists() else json.loads((E/'config/player-settings.json').read_text())['title']
 with (O/f'{lang}-render.log').open('w') as log:
  subprocess.run(['ffmpeg','-hide_banner','-nostdin','-y','-loglevel','warning','-loop','1','-framerate','30','-t','1.5','-i',str(cover),'-i',str(body),
   '-filter_complex_threads','1','-filter_complex',graph,'-map','[v]','-map','[a]','-map_metadata','1',
   '-c:v','libx264','-preset','fast','-crf','17','-threads','2','-r','30','-fps_mode','cfr','-video_track_timescale','15360',
   '-color_primaries','bt709','-color_trc','iec61966-2-1','-colorspace','bt709','-color_range','tv',
   '-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-metadata','title='+title+' · TJ KIM Collection',
   '-metadata:s:a:0','language='+{'ko':'kor','en':'eng','ja':'jpn'}[lang],'-t','67.5','-movflags','+faststart',str(temporary)],check=True,stdout=log,stderr=log)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(temporary)]))
 v=next(s for s in probe['streams'] if s['codec_type']=='video')
 assert (v['width'],v['height'],v['r_frame_rate'],v['nb_frames'])==(1080,1920,'30/1','2025')
 assert abs(float(probe['format']['duration'])-67.5)<.03
 mae=lambda a,b:float(np.abs(a.astype(float)-b.astype(float)).mean())
 checks={'cover_last_frame_mae':mae(frame(temporary,44/30),frame(cover,0)),
  'first_body_frame_mae':mae(frame(temporary,1.5),frame(body,0)),
  'body_frame_mae':mae(frame(temporary,29.5),frame(body,28)),
  'audio_correlation':float(np.corrcoef(audio(body,10,5),audio(temporary,11.5,5))[0,1]),
  'cover_silence_peak':float(np.abs(audio(temporary,0,1.49)).max())}
 assert all(checks[k]<4 for k in ['cover_last_frame_mae','first_body_frame_mae','body_frame_mae']),checks
 assert checks['audio_correlation']>.995 and checks['cover_silence_peak']<.001,checks
 subprocess.run(['ffmpeg','-v','error','-i',str(temporary),'-f','null','-'],capture_output=True,check=True)
 temporary.replace(output)
 report={'episode':ep,'language':lang,'revision':'localized-cover-v18','file':str(output.relative_to(P)),
  'sha256':sha(output),'cover_sha256':sha(cover),'body_sha256':sha(body),'cover_seconds':1.5,'body_seconds':66,
  'duration':67.5,'full_decode_pass':True,'checks':checks,'probe':probe,'poster':str(cover.relative_to(P)),
  'timing':'All body picture, captions, voice, music and intro drums move together by exactly 1.5 seconds.'}
 (O/f'{lang}-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print('COVER_VIDEO_READY',ep,lang,flush=True)
def main():
 errors={};pending={};attempts={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  while True:
   for f,job in list(pending.items()):
    if not f.done():continue
    del pending[f]
    try:f.result()
    except Exception as exc:errors['/'.join(job)]=str(exc);print('COVER_FAILED',*job,str(exc),flush=True)
   ready=[j for j in JOBS if current(*j)]
   for job in JOBS:
    if len(pending)>=2:break
    if job in ready or job in pending.values() or attempts.get(job,0)>=2:continue
    E,c,b,o,O=paths(*job)
    if not c.exists() or not (E/f'output/v17/{job[1]}-manifest.json').exists():continue
    attempts[job]=attempts.get(job,0)+1;errors.pop('/'.join(job),None)
    pending[pool.submit(render,*job)]=job;print('COVER_START',*job,flush=True)
   state={'completed':len(ready),'total':27,'ready':['/'.join(j) for j in ready],
     'active':['/'.join(j) for j in pending.values()],'errors':errors}
   (R/'cover-v18-progress.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
   if len(ready)==27:print('ALL_COVER_VIDEOS_COMPLETE',flush=True);return
   if errors and not pending and all(j in ready or attempts.get(j,0)>=2 for j in JOBS):raise RuntimeError(str(errors))
   time.sleep(3)
if __name__=='__main__':main()

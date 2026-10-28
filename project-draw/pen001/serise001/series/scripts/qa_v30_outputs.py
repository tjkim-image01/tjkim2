"""Inspect actual MP4 pixels and decoded audio as each edition finishes."""
from pathlib import Path
import json,subprocess,time,io
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];QA=ROOT/'production/v30/qa';QA.mkdir(exist_ok=True)
TIMES=[.5,3.1,13.5,33.5,65.5]
def pcm(video,start,duration):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(start),'-i',str(video),'-t',str(duration),'-vn','-ac','1','-ar','16000','-f','f32le','-']),dtype='<f4')
def check(E,lang):
 video=E/f'output/{E.name}-short-{lang}-v30-cover.mp4';silence=pcm(video,0,1.35);music=pcm(video,1.7,1);speech=pcm(video,12,4)
 rms=lambda x:float(np.sqrt(np.mean(x*x)))
 assert rms(silence)<.0001,(E.name,lang,'cover audio')
 assert rms(music)>.0001,(E.name,lang,'missing immediate music')
 assert rms(speech)>.002,(E.name,lang,'missing body audio')
 imgs=[]
 for t in TIMES:
  out=QA/f'{E.name}-{lang}-{t}.jpg'
  subprocess.run(['ffmpeg','-v','error','-ss',str(t),'-i',str(video),'-frames:v','1','-vf','scale=216:384','-y',str(out)],check=True)
  im=Image.open(out).convert('RGB');assert np.std(np.asarray(im).astype(float))>4,(E.name,lang,t,'blank frame');imgs.append(im)
 report=dict(episode=E.name,language=lang,cover_rms=rms(silence),immediate_music_rms=rms(music),body_audio_rms=rms(speech),frames_checked=TIMES,passed=True)
 (QA/f'{E.name}-{lang}-output-check.json').write_text(json.dumps(report,indent=2)+'\n');return report
if __name__=='__main__':
 reports={}
 while len(reports)<30:
  for i in range(2,12):
   E=ROOT/'episodes'/f'ep{i:02}'
   for lang in ['ko','en','ja']:
    key=E.name+'-'+lang
    if key in reports or not (E/f'output/v30/{lang}/manifest.json').exists():continue
    p=QA/f'{key}-output-check.json'
    reports[key]=json.loads(p.read_text()) if p.exists() else check(E,lang)
    (QA/'output-checks.json').write_text(json.dumps(reports,indent=2)+'\n');print('QA_PASS',key,flush=True)
   if all(E.name+'-'+lang in reports for lang in ['ko','en','ja']):
    dst=QA/f'{E.name}-contact.jpg'
    if not dst.exists():
     sheet=Image.new('RGB',(1080,1242),'#f8f5ea');d=ImageDraw.Draw(sheet)
     for row,lang in enumerate(['ko','en','ja']):
      for col,t in enumerate(TIMES):d.text((col*216+5,row*414+5),f'{E.name} {lang} / {t}s',fill='#343931');sheet.paste(Image.open(QA/f'{E.name}-{lang}-{t}.jpg'),(col*216,row*414+30))
     sheet.save(dst,quality=90)
  if len(reports)<30:time.sleep(10)
 print('COMPLETE: all 30 files have decoded audio and five-frame QA',flush=True)

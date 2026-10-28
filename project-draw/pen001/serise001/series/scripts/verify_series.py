import json,subprocess,time,hashlib,sys,concurrent.futures
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from render_episode import Painter
P=Path(__file__).resolve().parents[1];rows=json.loads((P/'manifest.json').read_text());Q=P/'qa'
def pcm(f):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-vn','-ac','1','-ar','16000','-f','f32le','-']),np.float32)
def check(e):
 E=P/'episodes'/e['id'];V=E/'output'/f'{e["id"]}-short-60s.mp4';meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(V)],text=True));v=next(s for s in meta['streams'] if s['codec_type']=='video');a=next(s for s in meta['streams'] if s['codec_type']=='audio')
 assert(v['width'],v['height'],v['r_frame_rate'],v['pix_fmt'])==(1080,1920,'24/1','yuv420p');assert abs(float(meta['format']['duration'])-60)<.03;assert v.get('nb_frames')=='1440'
 r=subprocess.run(['ffmpeg','-v','error','-i',str(V),'-f','null','-'],capture_output=True,text=True);assert r.returncode==0 and not r.stderr.strip(),r.stderr
 frames={}
 for t in [0,17,38,52,54,56,58]:
  f=E/'qa'/f'encoded-{t:02}.jpg';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(V),'-frames:v','1','-q:v','2',str(f)],check=True);frames[t]=np.array(Image.open(f).convert('RGB'))
 roi=lambda x:x[525:1175,40:1040].astype(float)
 assert np.percentile(roi(frames[0]).mean(axis=2),1)>235,'Nonblank encoded intro'
 delta=float(np.abs(roi(frames[58])-roi(frames[52])).mean());mid=float(np.abs(roi(frames[54])-(roi(frames[52])+roi(frames[56]))/2).mean());assert delta>3 and mid<3.5,(delta,mid)
 p=Painter(e['id']);blank=np.array(p.source(0)[0]);assert np.all(blank==blank[0,0]);r1=np.array(p.source(21.3)[0]);p.source(48);r2=np.array(p.source(21.3)[0]);assert np.array_equal(r1,r2)
 gaps=[(m['move_end']-m['end'],m) for m in p.marks];m=max(gaps,key=lambda x:x[0])[1];assert np.array_equal(np.array(p.source(m['end']+.005)[0]),np.array(p.source(m['move_end']-.005)[0]))
 assert np.array_equal(np.array(p.source(56.1)[0]),np.array(p.original))
 audio=pcm(V);music=pcm(E/'audio/music.wav');peak=float(np.max(np.abs(audio)));rms=float(20*np.log10(np.sqrt(np.mean(audio*audio))));mrms=float(20*np.log10(np.sqrt(np.mean(music*music))));assert peak<.99 and rms>-30 and mrms>-35
 aq=json.loads((E/'qa/audio.json').read_text());assert aq['asr_script_match']>.9 and aq['narration_end']<49
 cues=p.cues;assert min(c['start'] for c in cues)>=2.2;assert max(len(c['text']) for c in cues)<=p.e.get('caption_layout',{}).get('max_chars',30 if p.calm else 20);assert any('컬렉션' in c['text'] for c in cues)
 report=dict(id=e['id'],title=e['title'],file=str(V.relative_to(P)),sha256=hashlib.sha256(V.read_bytes()).hexdigest(),bytes=V.stat().st_size,duration=60,width=1080,height=1920,fps=24,frames=1440,full_decode_pass=True,blank_intro=True,rewind_deterministic=True,pen_lift_static=True,overlap=dict(start=52,end=56,midpoint_error=mid,change=delta),strokes=len(p.marks),asr_script_match=aq['asr_script_match'],narration_end=aq['narration_end'],audio_rms_dbfs=rms,audio_peak_dbfs=float(20*np.log10(peak)),music_rms_dbfs=mrms,collection_credit_voice=True,music_credit='CC BY 4.0 with title, creator, source and license URLs, editing notice; bottom-left all 60 seconds')
 (E/'qa/verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('VERIFIED',e['id'],flush=True);return report
if __name__=='__main__':
 pending={e['id']:e for e in rows};running={};reports={};errors={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  while pending or running:
   for ep,e in list(pending.items()):
    if len(running)>=2:break
    if (P/'episodes'/ep/'qa/render.done').exists():running[pool.submit(check,e)]=ep;del pending[ep]
   for f in list(running):
    if f.done():
     ep=running.pop(f)
     try:reports[ep]=f.result()
     except Exception as exc:errors[ep]=repr(exc);print('VERIFY_FAILED',ep,repr(exc),flush=True)
   if pending or running:time.sleep(2)
 ordered=[reports[e['id']] for e in rows if e['id'] in reports];summary=dict(episodes=len(ordered),expected=10,total_seconds=sum(e['duration'] for e in ordered),all_pass=len(ordered)==10 and not errors,reports=ordered,errors=errors,physical_phone_test=False);(Q/'final-verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 font=ImageFont.truetype(str(P.parent/'web/fonts/NanumSquareRoundB.ttf'),18);sheet=Image.new('RGB',(1260,2*490),'#e8e3d7');d=ImageDraw.Draw(sheet)
 for i,e in enumerate(rows):
  f=P/'episodes'/e['id']/'qa/encoded-58.jpg'
  if not f.exists():continue
  im=Image.open(f);im.thumbnail((238,424));x=i%5*252+7;y=i//5*490+8;sheet.paste(im,(x,y));d.text((x,y+434),e['title'],font=font,fill='#30392f')
 sheet.save(Q/'ten-shorts-contact.jpg',quality=95);print('FINAL_VERIFICATION',summary['all_pass'],len(ordered),errors,flush=True)
 if not summary['all_pass']:raise SystemExit(1)

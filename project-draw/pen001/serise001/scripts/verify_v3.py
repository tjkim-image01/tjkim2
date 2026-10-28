import json,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1];Q=P/'qa';V=P/'output/serise001-ep01-short-60s-v3.mp4'
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(V)],text=True));v=next(x for x in meta['streams'] if x['codec_type']=='video');assert(v['width'],v['height'],v['r_frame_rate'],v['nb_frames'])==(1080,1920,'24/1','1440');assert float(meta['format']['duration'])==60
r=subprocess.run(['ffmpeg','-v','error','-i',str(V),'-f','null','-'],capture_output=True,text=True);assert r.returncode==0 and not r.stderr.strip(),r.stderr
frames={}
for t in [0,10,50,52,53,54,55,56,58]:
 out=Q/f'v3-encoded-{t:02}.png';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(V),'-frames:v','1',str(out)],check=True);frames[t]=np.array(Image.open(out).convert('RGB'))
roi=lambda a:a[540:1160,45:1035].astype(float)
assert np.percentile(roi(frames[0]).mean(axis=2),1)>235
before=Q/'v2-drawing-comparison.png';subprocess.run(['ffmpeg','-y','-v','error','-ss','10','-i',str(P/'output/serise001-ep01-short-60s-v2.mp4'),'-frames:v','1',str(before)],check=True)
approved_delta=float(np.abs(roi(frames[10])-roi(np.array(Image.open(before)))).mean());assert approved_delta<2.5,approved_delta
blend_error=float(np.abs(roi(frames[54])-(roi(frames[52])+roi(frames[56]))/2).mean());change=float(np.abs(roi(frames[56])-roi(frames[52])).mean());assert blend_error<2.5 and change>5,(blend_error,change)
original_delta=float(np.abs(roi(frames[58])-roi(np.array(Image.open(Q/'original-outro-full.png').convert('RGB')))).mean());assert original_delta<3,original_delta
last_hold=float(np.abs(roi(frames[58])-roi(frames[56])).mean());assert last_hold<1.5,last_hold
def pcm(path):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-vn','-ac','1','-ar','16000','-f','f32le','-']),np.float32)
def db(a):return float(20*np.log10(max(1e-9,np.sqrt(np.mean(a*a)))))
old=pcm(P/'audio/music-original.wav');music=pcm(P/'audio/music-bed-v3.wav');mixed=pcm(V);gain=db(music)-db(old);assert gain>8;assert float(np.max(np.abs(mixed)))<.99
asr=json.loads((Q/'collection-voice-asr.json').read_text());assert '컬렉션' in ''.join(x['text'] for x in asr)
license=json.loads((P/'audio/music/license.json').read_text());assert license['license']=='CC BY 4.0'
sheet=Image.new('RGB',(972,1830),'#eae5da');d=ImageDraw.Draw(sheet)
for i,t in enumerate(frames):
 im=Image.fromarray(frames[t]);im.thumbnail((312,555));x=i%3*324+6;y=i//3*610+8;sheet.paste(im,(x,y));d.text((x+4,y+566),str(t)+'s',fill='#332f29')
sheet.save(Q/'contact-final-v3.jpg',quality=95)
report=dict(file=str(V),sha256=hashlib.sha256(V.read_bytes()).hexdigest(),duration=60,width=1080,height=1920,fps=24,full_decode_pass=True,blank_start=True,approved_drawing_region_mae=approved_delta,overlap=dict(start=52,end=56,midpoint_error=blend_error,final_difference=change,original_region_mae=original_delta,final_hold_mae=last_hold),collection_voice=asr,old_music_rms_dbfs=db(old),new_music_rms_dbfs=db(music),music_gain_db=gain,mix_peak_dbfs=float(20*np.log10(np.max(np.abs(mixed)))),music_license=license['license'],video_credit='bottom-left at x70, y1700–1772, 18px, all 60s; title, creator, source, license URL and changes',physical_phone_test=False)
(Q/'verification-v3.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))

import json,subprocess,hashlib,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1];Q=P/'qa';V=P/'output/serise001-ep01-short-60s-v2.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(V)],text=True));video=next(s for s in probe['streams'] if s['codec_type']=='video');audio=next(s for s in probe['streams'] if s['codec_type']=='audio')
assert (video['width'],video['height'])==(1080,1920);assert abs(float(probe['format']['duration'])-60)<.05;assert video['pix_fmt']=='yuv420p'
dec=subprocess.run(['ffmpeg','-v','error','-i',str(V),'-f','null','-'],capture_output=True,text=True);assert dec.returncode==0;assert not dec.stderr.strip(),dec.stderr
pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(V),'-vn','-ac','1','-ar','16000','-f','f32le','-']);samples=np.frombuffer(pcm,np.float32);rms=float(np.sqrt(np.mean(samples*samples)));peak=float(np.max(np.abs(samples)));assert rms>.01 and peak<1
frames=[]
for t in [0,2.0,6.0,12.0,19.0,27.0,38.0,46.0,58.0]:
 f=Q/f'v2-encoded-{t:04.1f}.jpg';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(V),'-frames:v','1','-q:v','2',str(f)],check=True);frames.append((t,f))
sheet=Image.new('RGB',(972,3*610),'#eae5da');d=ImageDraw.Draw(sheet)
for i,(t,f) in enumerate(frames):
 im=Image.open(f);im.thumbnail((312,555));x=i%3*324+6;y=i//3*610+8;sheet.paste(im,(x,y));d.text((x+5,y+565),f'{t:.1f} s',fill='#332f29')
sheet.save(Q/'contact-final-v2.jpg',quality=94)
sys.path.insert(0,str(P/'scripts'));from render_sample import Painter,MARKS
p=Painter();m=MARKS[8];mid=(m['end']+m['move_end'])/2
s1=np.array(p.source(m['end']+.005)[0]);s2=np.array(p.source(m['move_end']-.005)[0]);rest_equal=bool(np.array_equal(s1,s2));assert rest_equal,'Artwork changed while pen lifted'
end1=np.array(p.source(50.01)[0]);end2=np.array(p.source(59)[0]);assert np.array_equal(end1,end2)
# A rewind must reconstruct the same image, not leave later strokes behind.
r1=np.array(p.source(21.2)[0]);p.source(44.1);r2=np.array(p.source(21.2)[0]);assert np.array_equal(r1,r2)
# Primary regression: no finished reference image or complete underdrawing.
initial=np.array(p.source(0)[0].convert('RGB'));paper=initial[0,0]
assert np.all(initial==paper),'First frame contains artwork'
sketches=[m for m in MARKS if m['element']=='sketch'];assert len(sketches)==3
assert all(m['phase']=='ink' for m in sketches)
assert all(m['start']>=3-1e-6 for m in MARKS if m['element']!='sketch')
coverage={}
for t in [0,3,12,27,40,50]:
 rgb=np.array(p.source(t)[0].convert('RGB')).astype('int16')
 coverage[t]=float(np.mean(np.max(np.abs(rgb-paper.astype('int16')),axis=2)>5))
assert coverage[0]==0 and coverage[3]<.01 and coverage[50]>.1
# Colour itself must accumulate along the moving brush instead of popping in.
wash=next(m for m in MARKS if m['phase']=='wash')
before=np.array(p.source(wash['start']-1e-5)[0])
early=np.array(p.source(wash['start']+(wash['end']-wash['start'])*.1)[0])
done=np.array(p.source(wash['end'])[0])
early_changed=np.any(before!=early,axis=2).sum();done_changed=np.any(before!=done,axis=2).sum()
assert 0<early_changed<done_changed*.6
encoded_initial=np.array(Image.open(Q/'v2-encoded-00.0.jpg').crop((45,540,1035,1160))).astype('int16')
assert np.percentile(np.max(encoded_initial,axis=2)-np.min(encoded_initial,axis=2),99)<30
assert np.percentile(encoded_initial.mean(axis=2),1)>235
measured=json.loads((P/'audio/timing.json').read_text());assert measured['placements'][-1]['end']<50
report=dict(revision='v2',file=str(V),sha256=hashlib.sha256(V.read_bytes()).hexdigest(),bytes=V.stat().st_size,duration=float(probe['format']['duration']),video=dict(width=video['width'],height=video['height'],fps=video['r_frame_rate'],codec=video['codec_name'],pixel_format=video['pix_fmt'],frames=video.get('nb_frames')),audio=dict(codec=audio['codec_name'],sample_rate=audio['sample_rate'],channels=audio['channels'],rms_dbfs=20*np.log10(rms),peak_dbfs=20*np.log10(peak)),full_decode_pass=True,blank_start=True,sparse_layout_strokes=len(sketches),coverage=coverage,first_colour_fraction_at_10_percent=float(early_changed/done_changed),pen_lift_art_static=rest_equal,completed_art_static_last_10s=True,rewind_deterministic=True,strokes=len(MARKS),caption_timing='estimated within measured paragraph audio; same audio as v1, ASR sanity check in speech-asr.json',physical_phone_test=False)
(Q/'verification-v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

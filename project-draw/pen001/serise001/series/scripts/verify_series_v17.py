"""Audit current deliverables: picture format, audible onsets, decoded mix and archival preservation."""
from pathlib import Path
import json,subprocess,hashlib,re,time
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1];R=P/'production';Q=R/'qa-v17';Q.mkdir(exist_ok=True)
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(f)]))
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
def pcm(f,seconds=16):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-t',str(seconds),'-ar','16000','-ac','1','-f','f32le','-']),dtype='<f4')
def frame(f,t,out):subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(f),'-frames:v','1','-q:v','2',str(out)],check=True)
report={'renderer':'SVG vector-v17 for EP03–EP11; preserved approved EP02 v14', 'format':[1080,1920,30,66],'exports':[],'narration_reference':'Each episode Korean actual first audible narration; EN/JA differences below 0.08s','intro':{'seconds':6,'voice_free':True},'captions':'One calm line; max18 characters including spaces/punctuation','provider':'Typecast via existing lib connector','body_sound_effects':False,'jing':False}
rows=json.loads((P/'manifest.json').read_text())
old_first=json.loads((P/'episodes/ep02/output/v14/manifest.json').read_text())['exports']['ko']['sha256']
for previous in rows:
 while True:
  e=next(x for x in json.loads((P/'manifest.json').read_text()) if x['id']==previous['id'])
  if e.get('status')=='ready' and (e['id']=='ep02' or all('-v17.mp4' in v['video'] for v in e['editions'].values())):break
  time.sleep(3)
 E=P/'episodes'/e['id'];rev='v14' if e['id']=='ep02' else 'v17';sheet=Image.new('RGB',(810,1000),'#e6e1d3');draw=ImageDraw.Draw(sheet)
 for col,lang in enumerate(['ko','en','ja']):
  f=(P/'site'/e['editions'][lang]['video']).resolve();d=probe(f);v=next(s for s in d['streams'] if s['codec_type']=='video');a=next(s for s in d['streams'] if s['codec_type']=='audio');assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],a['codec_name'])==(1080,1920,'30/1','h264','aac');assert abs(float(d['format']['duration'])-66)<.05
  meta=json.loads((E/f'locales/{lang}.json').read_text()) if (E/f'locales/{lang}.json').exists() else None;captions=meta['captions'] if meta else json.loads((E/'audio/captions.json').read_text());assert all(len(c['text'])<=18 and '\n' not in c['text'] for c in captions)
  mix=E/f'output/{rev}/{lang}-mix.wav';expected=pcm(mix);actual=pcm(f);n=min(len(expected),len(actual));corr=float(np.corrcoef(expected[:n],actual[:n])[0,1]);assert corr>.985,(e['id'],lang,'wrong decoded mix',corr)
  peak=subprocess.run(['ffmpeg','-hide_banner','-i',str(f),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True).stderr;maxdb=float(re.search(r'max_volume: ([\-\d.]+) dB',peak).group(1));assert maxdb<-.3,(e['id'],lang,maxdb)
  sync=json.loads((E/f'locales/{lang}/sound-sync-ready.json').read_text()) if lang!='ko' else None
  if sync:assert abs(sync['difference'])<.08 and sync['first_audible']>8.1 and sync['narration_end']<65
  for row,t in enumerate([28,63.5]):
   out=Q/f'{e["id"]}-{lang}-{t:g}.jpg';frame(f,t,out);im=Image.open(out).convert('RGB');im.thumbnail((260,463));x=col*270+5;y=row*500+25;sheet.paste(im,(x,y));draw.text((x,y-18),f'{lang.upper()}  {t:g}s',fill='#292d25')
  blank=Q/f'{e["id"]}-{lang}-blank.png';frame(f,.5,blank);pixels=np.array(Image.open(blank).convert('RGB'));deviation=float(pixels.std(axis=(0,1)).max());assert deviation<1.5,(e['id'],lang,'not blank initial paper',deviation)
  item={'episode':e['id'],'language':lang,'file':str(f.relative_to(P)),'sha256':sha(f),'bytes':f.stat().st_size,'duration':66,'fps':30,'audio_peak_db':maxdb,'decoded_mix_correlation':corr,'blank_initial_frame':True,'caption_max_chars':max(len(c['text']) for c in captions),'narration_sync':sync}
  report['exports'].append(item);(R/'verify-v17-progress.json').write_text(json.dumps({'completed':len(report['exports']),'total':30,'last':e['id']+'/'+lang},ensure_ascii=False,indent=2)+'\n');print('VERIFIED',e['id'],lang,round(corr,4),maxdb,flush=True)
 sheet.save(Q/f'{e["id"]}-contact.jpg',quality=94)
 if e['id']!='ep02':
  data=json.loads((E/'art/painting.json').read_text());assert all(m['element']!='sketch' for m in data['strokes']);assert data['group_order'][-2:]==['objects','background'];assert all(m['start']>=.8-1e-6 for m in data['strokes']);assert max(m['end'] for m in data['strokes'])<=49.8+.01
report['first_korean_unchanged']=sha(P/'episodes/ep02/output/ep02-short-ko-v14.mp4')==old_first;assert report['first_korean_unchanged']
old=json.loads((P/'episodes/ep02/qa/player-only-video-hashes.json').read_text());report['old_videos_unchanged']={ep:sha(P/f'episodes/{ep}/output/{ep}-short-60s.mp4')==value for ep,value in old.items()};assert all(report['old_videos_unchanged'].values())
report['typecast_preservation']=json.loads((R/'typecast-progress.json').read_text());assert report['typecast_preservation']['completed']==27 and report['typecast_preservation']['original_prefix_unchanged']
report['narration_alignment']=json.loads((R/'narration-sync-progress.json').read_text());assert report['narration_alignment']['completed']==20 and not report['narration_alignment']['errors']
report['workflow_sha256']=sha(Path('/Users/jatu/app/tjkim2/lib/com/jatu/draw/sumuk.py'));(R/'delivery-v17.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('ALL_30_VERIFIED',flush=True)

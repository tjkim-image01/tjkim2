"""Validate delivered exports and preserve a compact audit manifest/contact sheets."""
import json,hashlib,subprocess,shutil,difflib,re
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
P=Path(__file__).resolve().parents[1];E=P/'episodes/ep02';O=E/'output/v14';Q=O/'qa';Q.mkdir(exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def probe(p):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
report={'revision':'portrait-intro-v14','settings':json.loads((O/'settings.json').read_text()),'exports':{},'historical_attribution':'Uncho, attributed; no verified pupil claim','audio_provider':'Typecast via lib.com.jatu.aside.connector.typecast','music':'Flow Music · 윷판의 웃음','effects':'Intro only; no jing or body SFX','original_image':'AI-cleaned crop of the TJ KIM collection image, labeled in video'}
for lang in ['ko','en','ja']:
 f=E/f'output/ep02-short-{lang}-v14.mp4';data=probe(f);v=next(s for s in data['streams'] if s['codec_type']=='video');a=next(s for s in data['streams'] if s['codec_type']=='audio');assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],a['codec_name'])==(1080,1920,'30/1','h264','aac');assert abs(float(data['format']['duration'])-66)<.05
 cues=json.loads((E/'audio/captions.json').read_text()) if lang=='ko' else json.loads((E/f'locales/{lang}.json').read_text())['captions'];assert all(len(c['text'])<=18 and '\n' not in c['text'] for c in cues)
 times=[0,1.6,4.8,13,28,44,59.7,63.5];sheet=Image.new('RGB',(1080,1040),'#e6e1d3');draw=ImageDraw.Draw(sheet)
 for i,t in enumerate(times):
  dst=Q/f'{lang}-{t:g}s.jpg';subprocess.run(['ffmpeg','-y','-v','error','-ss',str(t),'-i',str(f),'-frames:v','1','-q:v','2',str(dst)],check=True)
  im=Image.open(dst).convert('RGB');im.thumbnail((260,463));x=(i%4)*270+5;y=(i//4)*520+24;sheet.paste(im,(x,y));draw.text((x,y-18),f'{lang.upper()}  {t:g}s',fill='#302f28')
 sheet.save(Q/f'{lang}-contact.jpg',quality=94)
 peak=subprocess.run(['ffmpeg','-hide_banner','-i',str(f),'-af','volumedetect','-f','null','-'],capture_output=True,text=True,check=True).stderr
 match=re.search(r'max_volume: ([\-\d.]+) dB',peak);maxdb=float(match.group(1));assert maxdb<-.5,maxdb
 item={'file':str(f.relative_to(P)),'sha256':sha(f),'bytes':f.stat().st_size,'probe':data,'caption_count':len(cues),'caption_max_chars':max(len(c['text']) for c in cues),'audio_peak_db':maxdb}
 if lang!='ko':
  l=json.loads((E/f'locales/{lang}.json').read_text());recognized=''.join(x['text'] for x in json.loads((E/f'locales/{lang}/asr.json').read_text()));norm=lambda s:re.sub(r'[^\w]','',s).lower();ratio=difflib.SequenceMatcher(None,norm(l['narration']),norm(recognized),autojunk=False).ratio();item.update(actor=l['actor'],timing=l['timing'],asr_script_similarity=ratio);assert ratio>(.9 if lang=='en' else .75),(lang,ratio)
 report['exports'][lang]=item
old=json.loads((E/'qa/player-only-video-hashes.json').read_text());report['prior_videos_preserved']={k:sha(P/f'episodes/{k}/output/{k}-short-60s.mp4')==v for k,v in old.items()};assert all(report['prior_videos_preserved'].values())
report['saved_settings_unchanged']=json.loads((E/'config/player-settings.json').read_text())==report['settings'];assert report['saved_settings_unchanged']
source=O/'workflow-source';source.mkdir(exist_ok=True);files=[P/'scripts/export_sumuk.cjs',P/'scripts/generate_localized_voice.py',*[P/'site'/n for n in ['studio.js','director.js','live-brush.js','brush-motion.js','calligraphy-portrait.js','ink-paper.js','effects-gain.js']],Path('/Users/jatu/app/tjkim2/lib/com/jatu/draw/sumuk.py')];report['workflow_sources_at_delivery']={}
for f in files:shutil.copy2(f,source/f.name);report['workflow_sources_at_delivery'][str(f)]=sha(f)
report['typecast_preservation']=json.loads((E/'locales/typecast-preservation.json').read_text());assert report['typecast_preservation']['original_prefix_unchanged']
(O/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'ok':True,'exports':{k:{'bytes':v['bytes'],'peak_db':v['audio_peak_db'],'caption_max':v['caption_max_chars'],'asr':v.get('asr_script_similarity')} for k,v in report['exports'].items()},'preserved_videos':len(old)},ensure_ascii=False,indent=2))

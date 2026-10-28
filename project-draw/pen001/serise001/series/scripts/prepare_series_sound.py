"""Check actual Typecast speech, align condensed captions, and pace the 66s editions.
Waits for resumable Typecast generation; never substitutes another voice provider.
"""
from pathlib import Path
import json,subprocess,time,re,difflib,hashlib,argparse
import numpy as np
from faster_whisper import WhisperModel
P=Path(__file__).resolve().parents[1];R=P/'production';LANGS=['ko','en','ja']
parser=argparse.ArgumentParser();parser.add_argument('--once',action='store_true');args=parser.parse_args()
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True,cpu_threads=4)
def norm(s):return ''.join(c for c in s.lower() if c.isalnum())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)]))
def ff(*a):subprocess.run(['ffmpeg','-y','-v','error',*map(str,a)],check=True)
def prepare(E,lang):
 meta=E/f'locales/{lang}.json';d=json.loads(meta.read_text());A=E/f'locales/{lang}';src=A/'raw.wav';source_hash=sha(src);rawdur=duration(src)
 cached=A/'asr.json'
 if cached.exists() and (A/'asr-source.sha256').exists() and (A/'asr-source.sha256').read_text()==source_hash:rows=json.loads(cached.read_text())
 else:
  prompt={'ko':'다듬이질, 소반, 장기, 떡메, 엿장수, 운초, 티제이킴 컬렉션.','en':'Korea, Uncho, dadeumijil, soban, janggi, TJ Kim Collection.','ja':'タドゥミジル、ソバン、チャンギ、トック、ヨッ、ウンチョ、ティージェイキム・コレクション。'}[lang]
  segments,info=model.transcribe(str(src),language=lang,beam_size=3,word_timestamps=True,condition_on_previous_text=False,initial_prompt=prompt)
  rows=[{'start':s.start,'end':s.end,'text':s.text,'words':[{'text':w.word,'start':w.start,'end':w.end} for w in s.words or []]} for s in segments]
  cached.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');(A/'asr-source.sha256').write_text(source_hash)
 recognized='';times=[]
 for row in rows:
  for w in row['words']:
   chars=norm(w['text']);recognized+=chars
   times.extend([(w['start']+(w['end']-w['start'])*i/max(1,len(chars)),w['start']+(w['end']-w['start'])*(i+1)/max(1,len(chars))) for i in range(len(chars))])
 canonical=''.join(norm(b['text']) for b in d['blocks']);matcher=difflib.SequenceMatcher(None,canonical,recognized,autojunk=False);ratio=matcher.ratio();threshold={'ko':.77,'en':.88,'ja':.69}[lang]
 assert ratio>=threshold,(E.name,lang,'ASR mismatch',ratio,' '.join(r['text'] for r in rows))
 # Full-script matching plus the final branding verifies that the generated tail was not truncated.
 tail=norm(' '.join(r['text'] for r in rows)[-100:]);assert any(x in tail for x in {'ko':['컬렉션','티제이','티제이킴','tjkim','collection'],'en':['collection','tjkim'],'ja':['コレクション','キム','collection','tjkim']}[lang]),('Missing collection tail',E.name,lang,tail)
 mapping={}
 for a,b,n in matcher.get_matching_blocks():
  for i in range(n):mapping[a+i]=times[b+i]
 estimates=[];cursor=0
 for block in d['blocks']:
  size=len(norm(block['text']));matches=[mapping[i] for i in range(cursor,cursor+size) if i in mapping]
  estimates.append((min(t[0] for t in matches),max(t[1] for t in matches)) if matches else (rawdur*cursor/len(canonical),rawdur*(cursor+size)/len(canonical)));cursor+=size
 noise=subprocess.run(['ffmpeg','-hide_banner','-i',str(src),'-af','silencedetect=noise=-37dB:d=0.10','-f','null','-'],capture_output=True,text=True,check=True).stderr
 quiet=[];s0=None
 for line in noise.splitlines():
  q=re.search(r'silence_start: ([\d.]+)',line)
  if q:s0=float(q.group(1))
  q=re.search(r'silence_end: ([\d.]+)',line)
  if q and s0 is not None:quiet.append((s0+float(q.group(1)))/2);s0=None
 bounds=[0.]
 for i in range(len(estimates)-1):
  target=(estimates[i][1]+estimates[i+1][0])/2
  candidates=[q for q in quiet if q>bounds[-1]+.35 and abs(q-target)<.9]
  pick=min(candidates,key=lambda q:abs(q-target)) if candidates else target
  bounds.append(max(bounds[-1]+.25,min(rawdur-.2,pick)))
 bounds.append(rawdur);assert all(a<b for a,b in zip(bounds,bounds[1:])),bounds
 tempo=max(.88,min(1.15,rawdur/53.0));assert rawdur/tempo<56.5,('Narration needs shortening',E.name,lang,rawdur)
 gap=max(0,min(1.4,(53-rawdur/tempo)/max(1,len(d['blocks'])-1)))
 sr=48000;chunks=[];cues=[];cursor=2.2 # main-content timeline; actual video voice starts at 8.2s
 for i,b in enumerate(d['blocks']):
  out=A/f'paced-{i:02d}.wav';ff('-ss',bounds[i],'-t',bounds[i+1]-bounds[i],'-i',src,'-af',f'atempo={tempo:.8f}','-ar',sr,'-ac','1',out)
  pcm=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(out),'-f','f32le','-ac','1','-ar',str(sr),'-']),dtype='<f4').copy();seconds=len(pcm)/sr;chunks.append(pcm)
  extra=gap if i<len(d['blocks'])-1 else 0
  cues.append({'start':round(cursor,5),'end':round(cursor+seconds+extra*.6,5),'text':b['caption'],'words':[]});cursor+=seconds+extra
  if extra:chunks.append(np.zeros(round(extra*sr),np.float32))
 speech=np.concatenate(chunks);rawpcm=A/'paced.f32';rawpcm.write_bytes(speech.astype('<f4').tobytes())
 ff('-f','f32le','-ar',sr,'-ac','1','-i',rawpcm,'-af','loudnorm=I=-17:TP=-2:LRA=7,adelay=8200:all=1,apad,atrim=duration=66','-ar',sr,'-ac','2','-c:a','aac','-b:a','160k',A/'voice-director.m4a')
 assert 6+cursor<65,('Voice overrun',cursor)
 translations={}
 if lang!='ko':
  translations.update({'TJ KIM 컬렉션 소장품':'From the TJ KIM Collection' if lang=='en' else 'TJ KIM コレクション所蔵',f"풍속화 속 한국  /  {int(E.name[2:])-1:02d}":f"KOREAN LIFE IN PAINTINGS  /  {int(E.name[2:])-1:02d}" if lang=='en' else f"風俗画に見る韓国  /  {int(E.name[2:])-1:02d}",'그린 그림에서 소장 이미지로':'Painting to collection image' if lang=='en' else '所蔵画像へ重なる','소장 이미지 · AI 정리 편집본':'Collection image · AI cleanup' if lang=='en' else '所蔵画像・AI整画像'})
  art=json.loads((E/'art/painting.json').read_text())
  for label in art.get('group_labels',{}).values():
   match=re.search(r'인물 (\d+)',label);part='Face and hair' if '얼굴' in label else 'Body and hands' if '몸' in label else 'Legs and clothing';jp='顔と髪' if '얼굴' in label else '体と手' if '몸' in label else '脚と衣服'
   translations[label]=(f'Figure {match.group(1)} · {part}' if lang=='en' else f'人物{match.group(1)}・{jp}') if match else ('Objects of daily life' if '물건' in label else 'The setting') if lang=='en' else ('暮らしの道具' if '물건' in label else '暮らしの背景')
 d.update(captions=cues,translations=translations,timing={'intro':6,'narration_start':8.2,'raw_duration':rawdur,'tempo':tempo,'inter_block_pause':gap,'narration_end':6+cursor,'alignment':'Whisper word timestamps mapped to canonical blocks, silence-centered cuts; calm one-line condensed captions'},asr_script_similarity=ratio,raw_sha256=source_hash)
 meta.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
 if lang=='ko':
  import shutil
  shutil.copy2(A/'voice-director.m4a',E/'audio/voice-director.m4a');(E/'audio/captions.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n')
 (A/'sound-ready.json').write_text(json.dumps({'source_sha256':source_hash,'asr_ratio':ratio,'voice_end':6+cursor,'caption_count':len(cues),'caption_max_chars':max(len(c['text']) for c in cues),'tempo':tempo,'pause':gap},ensure_ascii=False,indent=2)+'\n')
 print('SOUND_READY',E.name,lang,round(ratio,3),'ends',round(6+cursor,2),flush=True)

failures={};last_progress=None
while True:
 progressed=False
 for n in range(3,12):
  E=P/f'episodes/ep{n:02d}'
  for lang in LANGS:
   A=E/f'locales/{lang}';src=A/'raw.wav';ready=A/'sound-ready.json';key=f'{E.name}/{lang}'
   if not src.exists() or ready.exists():continue
   digest=sha(src)
   if failures.get(key,{}).get('sha256')==digest:continue
   try:prepare(E,lang);progressed=True
   except Exception as exc:failures[key]={'sha256':digest,'error':str(exc)};print('SOUND_REJECTED',key,str(exc),flush=True)
 completed=sum((P/f'episodes/ep{n:02d}/locales/{l}/sound-ready.json').exists() for n in range(3,12) for l in LANGS)
 progress={'completed':completed,'total':27,'errors':failures};(R/'audio-progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n')
 if completed==27:print('SOUND_SERIES_COMPLETE',flush=True);break
 if args.once:break
 time.sleep(3)

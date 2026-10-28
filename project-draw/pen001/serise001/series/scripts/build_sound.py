import json,subprocess,re,difflib,sys,argparse
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel
P=Path(__file__).resolve().parents[1];BASE=P.parent
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True,cpu_threads=4)
def run(*a):subprocess.run(['ffmpeg','-y','-v','error',*map(str,a)],check=True)
def norm(s):return re.sub(r'[^가-힣a-zA-Z0-9]','',s).lower()
def probe(f):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(f)],text=True))
parser=argparse.ArgumentParser();parser.add_argument('--episodes',nargs='*');args=parser.parse_args()
for e in json.loads((P/'manifest.json').read_text()):
 if args.episodes and e['id'] not in args.episodes:continue
 print('ALIGNING',e['id'],flush=True)
 E=P/'episodes'/e['id'];A=E/'audio';src=P/'audio/typecast'/e['voice_file'];rawdur=probe(src);tempo=max(.94,rawdur/46);run('-i',src,'-af',f'atempo={tempo},aresample=48000,loudnorm=I=-17:TP=-2:LRA=7','-ac','1','-ar','48000',A/'narration.wav');dur=probe(A/'narration.wav')
 # Local ASR supplies times; canonical script supplies every visible subtitle.
 segments,info=model.transcribe(str(A/'narration.wav'),language='ko',beam_size=1,best_of=1,word_timestamps=True,condition_on_previous_text=False,initial_prompt='조선, 윷놀이, 다듬이질, 소반, 장기, 떡메, 엿장수, 티제이킴 컬렉션.')
 asr=[];asrchars=[];times=[]
 for segment in segments:
  for w in segment.words or []:
   asr.append(dict(text=w.word,start=w.start,end=w.end));t=norm(w.word)
   for i,c in enumerate(t):asrchars.append(c);times.append((w.start+(w.end-w.start)*i/max(1,len(t)),w.start+(w.end-w.start)*(i+1)/max(1,len(t))))
 words=e['voice_text'].split();canonical=''.join(norm(w) for w in words);recognized=''.join(asrchars);matcher=difflib.SequenceMatcher(None,canonical,recognized,autojunk=False);mapping={}
 for a,b,n in matcher.get_matching_blocks():
  for j in range(n):mapping[a+j]=times[b+j]
 ratio=matcher.ratio();assert ratio>.70,(e['id'],ratio)
 known=sorted(mapping);stamps=[];offset=0;prev=0
 for w in words:
  n=len(norm(w));matches=[mapping[i] for i in range(offset,offset+n) if i in mapping]
  if matches:s0=min(t[0] for t in matches);s1=max(t[1] for t in matches)
  else:
   earlier=[k for k in known if k<offset];later=[k for k in known if k>=offset+n];s0=mapping[earlier[-1]][1] if earlier else prev;s1=mapping[later[0]][0] if later else min(dur,s0+.3)
  s0=max(prev,s0);s1=max(s0+.035,min(dur,s1));stamps.append(dict(word=w,start=2.2+s0,end=2.2+s1));prev=s1;offset+=n
 # Chunk into one line, keeping punctuation boundaries and at most 18 characters.
 cues=[];group=[]
 for w in stamps:
  if group and len(' '.join(x['word'] for x in group+[w]))>18:
   cues.append(dict(start=group[0]['start'],end=group[-1]['end'],text=' '.join(x['word'] for x in group),words=group));group=[]
  group.append(w)
  if re.search(r'[.!?]$',w['word']):cues.append(dict(start=group[0]['start'],end=group[-1]['end'],text=' '.join(x['word'] for x in group),words=group));group=[]
 if group:cues.append(dict(start=group[0]['start'],end=group[-1]['end'],text=' '.join(x['word'] for x in group),words=group))
 for text,s0,s1 in [('이 작품은',51.5,52.2),('TJ KIM 컬렉션',52.2,53.4),('소장품입니다.',53.4,54.329188)]:
  ws=text.split();unit=(s1-s0)/sum(len(w) for w in ws);cursor=s0;ct=[]
  for w in ws:ct.append(dict(word=w,start=cursor,end=cursor+unit*len(w)));cursor+=unit*len(w)
  cues.append(dict(start=s0,end=s1,text=text,words=ct))
 run('-i',A/'narration.wav','-i',BASE/'audio/N06-paced.wav','-filter_complex','[0:a]adelay=2200:all=1[a];[1:a]adelay=51500:all=1[b];[a][b]amix=inputs=2:normalize=0,apad,atrim=duration=60[v]','-map','[v]','-ar','48000','-ac','2',A/'voice.wav')
 run('-i',BASE/'audio/music-normalized-v3.wav','-i',A/'voice.wav','-filter_complex','[0:a][1:a]sidechaincompress=threshold=0.045:ratio=2.5:attack=100:release=650:makeup=1[m]','-map','[m]','-ar','48000','-ac','2',A/'music.wav')
 run('-i',A/'voice.wav','-i',A/'music.wav','-filter_complex','[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.89:level=0[m]','-map','[m]','-t','60','-c:a','aac','-b:a','192k',A/'mix.m4a')
 for name in ['voice','music']:run('-i',A/(name+'.wav'),'-c:a','aac','-b:a','160k',A/(name+'.m4a'))
 (A/'captions.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n');(E/'qa/audio.json').write_text(json.dumps(dict(episode=e['id'],original_seconds=rawdur,tempo=tempo,narration_end=2.2+dur,asr_script_match=ratio,words=asr,alignment='ASR word times aligned to canonical script; interpolated for unmatched tokens',caption_lines=len(cues)),ensure_ascii=False,indent=2)+'\n');print('SOUND_READY',e['id'],round(2.2+dur,2),round(ratio,3),flush=True)

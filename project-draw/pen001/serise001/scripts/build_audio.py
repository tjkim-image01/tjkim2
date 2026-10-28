import json,subprocess,wave,math
from pathlib import Path
import numpy as np
P=Path(__file__).resolve().parents[1];A=P/'audio';SR=48000
lines=json.loads((A/'typecast/lines.json').read_text());starts=[2.2,12.0,20.2,28.0,39.0];tempo=.90
placements=[];cues=[]
# Human-sized subtitle phrases. Their internal word timing is estimated from
# actual generated audio durations, with punctuation-weighted spacing.
phrases=[['K팝보다 먼저,','조선을 세계에 알린','그림이 있었습니다.','미술 한류의 원조,','기산 김준근의 풍속화.'],['그 흐름을 잇는','작가로 전해지는 운초.','한 사람의 마지막 길을','함께하는 이들입니다.'],['짚으로 덮은 상여와','긴 멜대.','관을 어깨에 메고,','장지로 향합니다.'],['낯선 조선에 온 외국인들.','사람들의 옷차림과','생활, 의례가 궁금했습니다.','이런 풍속화는,','문화를 전하는 창이었습니다.'],['갓 아래의 얼굴과','길게 흐르는 옷자락.','한 획씩 따라가면,','오래전 마지막 배웅이','우리 앞에 나타납니다.']]
# Captions must match the spoken words; punctuation and 'K팝' are display forms.
phrases[0]=['K팝보다 먼저,','조선을 세계에 알린','그림이 있었습니다.','미술 한류의 원조라 불리는,','기산 김준근의 풍속화입니다.']
phrases[1]=['그 흐름을 잇는','작가로 전해지는 운초.','이 그림에는,','한 사람의 마지막 길을','함께하는 이들이 있습니다.']
phrases[3]=['낯선 조선에 온 외국인들은,','사람들의 옷차림과 생활,','의례를 궁금해했습니다.','이런 풍속화는,','그 문화를 전하는 창이었습니다.']
phrases[4]=['갓 아래의 얼굴과','길게 흐르는 옷자락.','한 획씩 따라가면,','오래전 사람들의 마지막 배웅이,','오늘 우리 앞에 다시 나타납니다.']
for i,line in enumerate(lines):
 src=A/'typecast'/line['file'];out=A/(line['id']+'-paced.wav')
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-af',f'atempo={tempo},aresample={SR},loudnorm=I=-17:TP=-2:LRA=7','-ac','1',str(out)],check=True)
 dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(out)],text=True))
 placements.append(dict(id=line['id'],start=starts[i],end=starts[i]+dur,duration=dur,file=out.name,text=line['text'],provider='Typecast',actor='한준',tempo=tempo))
 words=phrases[i];weights=[len(s.replace(' ',''))+.7 for s in words];cursor=starts[i]
 for s,weight in zip(words,weights):
  end=cursor+dur*weight/sum(weights);cues.append(dict(start=round(cursor,4),end=round(end,4),text=s));cursor=end
# Original, quiet, pentatonic plucked strings and a soft sustained pad.
# This is newly synthesized music; it is not sampled from a historical record.
t=np.arange(SR*60)/SR;music=np.zeros_like(t);rng=np.random.default_rng(31)
notes=[146.832,195.998,220.,261.626,293.665,391.995]
for k,start in enumerate(np.arange(0,59,2.7)):
 f=notes[[0,2,3,1,4,2,5,3,1,0,2,4,1,3,0,2,1,4,3,2,0,1][k]];tt=t-start;valid=(tt>=0)&(tt<7)
 env=(1-np.exp(-tt[valid]*20))*np.exp(-tt[valid]/1.9)
 timbre=sum(np.sin(2*np.pi*f*h*tt[valid]+.015*np.sin(tt[valid]*4))/(h**1.8) for h in range(1,7))
 music[valid]+=.075*env*timbre
pad=sum(np.sin(2*np.pi*f*t+0.15*np.sin(t*.31)) for f in [73.416,110,146.832])/3
music+=.018*pad*(.6+.4*np.sin(t*.08)**2)
# Dip under each paragraph and rise modestly after the last line.
gain=np.ones_like(t)*.31
for s in placements:
 gate=np.minimum(np.clip((t-s['start']+.35)/.35,0,1),np.clip((s['end']+.6-t)/.6,0,1));gain*=1-.55*gate
music*=gain*np.clip(t/1.5,0,1)*np.clip((60-t)/2.5,0,1)
with wave.open(str(A/'music-original.wav'),'w') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(np.int16(np.clip(music,-1,1)*32767).tobytes())
args=['ffmpeg','-y','-v','error','-i',str(A/'music-original.wav')]
for s in placements:args+=['-i',str(A/s['file'])]
filt=''
for i,s in enumerate(placements):filt+=f'[{i+1}:a]adelay={round(s["start"]*1000)}:all=1[v{i}];'
filt+='[0:a]'+''.join(f'[v{i}]' for i in range(len(placements)))+f'amix=inputs={len(placements)+1}:duration=longest:normalize=0,alimiter=limit=0.89:level=0,apad,atrim=duration=60[mix]'
subprocess.run(args+['-filter_complex',filt,'-map','[mix]','-ar',str(SR),'-ac','2','-c:a','aac','-b:a','192k',str(A/'sample-60s.m4a')],check=True)
(A/'timing.json').write_text(json.dumps(dict(duration=60,placements=placements,captions=cues,word_alignment='estimated character-weighted timing within measured paragraph audio',music='original synthesized pentatonic instrumental'),ensure_ascii=False,indent=2))
(A/'captions.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2))
print('AUDIO_READY',[(s['id'],round(s['start'],2),round(s['end'],2)) for s in placements]);print('max_caption',max(len(s['text']) for s in cues))

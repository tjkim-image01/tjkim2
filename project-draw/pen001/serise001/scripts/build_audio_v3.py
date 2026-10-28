"""Preserve the five approved voice takes; add collection credit and licensed music."""
import argparse,json,subprocess
from pathlib import Path
P=Path(__file__).resolve().parents[1];A=P/'audio'
p=argparse.ArgumentParser();p.add_argument('--music',required=True);args=p.parse_args();music=Path(args.music).resolve();assert music.is_file()
def run(*a):subprocess.run(['ffmpeg','-y','-v','error',*map(str,a)],check=True)
run('-i',A/'typecast/N06.wav','-af','atempo=0.90,aresample=48000,loudnorm=I=-17:TP=-2:LRA=7','-ac','1',A/'N06-paced.wav')
dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(A/'N06-paced.wav')],text=True));start=51.5;assert start+dur<59
old=json.loads((A/'timing.json').read_text());placements=old['placements']+[dict(id='N06',start=start,end=start+dur,duration=dur,file='N06-paced.wav',text='이 작품은 티제이킴 컬렉션 소장품입니다.',provider='Typecast',actor='한준',tempo=.90)]
inputs=sum((['-i',str(A/x['file'])] for x in placements),[])
filt=''.join(f'[{i}:a]adelay={round(x["start"]*1000)}:all=1[v{i}];' for i,x in enumerate(placements))+''.join(f'[v{i}]' for i in range(len(placements)))+f'amix=inputs={len(placements)}:duration=longest:normalize=0,apad,atrim=duration=60[voice]'
run(*inputs,'-filter_complex',filt,'-map','[voice]','-ar','48000','-ac','2',A/'voice-60s-v3.wav')
music_duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(music)],text=True));music_tempo=max(.5,min(1,music_duration/60))
run('-stream_loop','-1','-i',music,'-t','60','-af',f'atempo={music_tempo},loudnorm=I=-24:TP=-8:LRA=7,aresample=48000,afade=t=in:st=0:d=1.2,afade=t=out:st=58:d=2','-ac','2',A/'music-normalized-v3.wav')
run('-i',A/'music-normalized-v3.wav','-i',A/'voice-60s-v3.wav','-filter_complex','[0:a][1:a]sidechaincompress=threshold=0.045:ratio=2.5:attack=100:release=650:makeup=1[m]','-map','[m]','-ar','48000','-ac','2',A/'music-bed-v3.wav')
run('-i',A/'voice-60s-v3.wav','-i',A/'music-bed-v3.wav','-filter_complex','[0:a][1:a]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.89:level=0[mix]','-map','[mix]','-c:a','aac','-b:a','192k','-t','60',A/'sample-60s-v3.m4a')
for stem in ['voice-60s-v3','music-bed-v3']:run('-i',A/(stem+'.wav'),'-c:a','aac','-b:a','192k',A/(stem+'.m4a'))
cues=json.loads((A/'captions.json').read_text());phrases=['이 작품은','TJ KIM 컬렉션','소장품입니다.'];weights=[len(x.replace(' ',''))+.7 for x in phrases];cursor=start
for text,w in zip(phrases,weights):end=cursor+dur*w/sum(weights);cues.append(dict(start=round(cursor,4),end=round(end,4),text=text));cursor=end
(A/'captions-v3.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n');(A/'timing-v3.json').write_text(json.dumps(dict(duration=60,placements=placements,captions=cues,music=str(music),music_loudness_target_lufs=-24,music_ducking='sidechain threshold .045 ratio 2.5; voice timing unchanged'),ensure_ascii=False,indent=2)+'\n');print('AUDIO_V3_READY',start,start+dur,flush=True)

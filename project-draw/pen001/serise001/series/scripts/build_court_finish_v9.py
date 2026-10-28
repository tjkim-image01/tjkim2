from pathlib import Path
import wave,json,subprocess
import numpy as np
P=Path(__file__).resolve().parents[1];A=P/'episodes/ep02/audio';sr=48000
with wave.open(str(A/'flow-music/court-drum-source.wav')) as w:a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').reshape(-1,2).astype(float)/32768;sr=w.getframerate()
out=np.zeros((round(1.55*sr),2))
for start,duration,at,gain,pan in [(6.72,.50,0,.65,.22),(7.84,.50,.16,.75,.78),(8.60,1.08,.38,1,.5)]:
 clip=a[round(start*sr):round((start+duration)*sr)].copy();clip[:240]*=np.linspace(0,1,240)[:,None];n=int(.12*sr);clip[-n:]*=np.linspace(1,0,n)[:,None];rms=np.sqrt(np.mean(clip[:int(.3*sr)]**2));clip*=.15/max(rms,1e-5);mono=clip.mean(1);clip=np.column_stack([mono*(1.3-pan*.6),mono*(.7+pan*.6)]);i=round(at*sr);out[i:i+len(clip)]+=clip*gain
out*=min(1,.78/max(abs(out).max(),1e-6))
with wave.open(str(A/'court-finish-v9.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((out*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(A/'court-finish-v9.wav'),'-af','lowpass=f=5000','-c:a','aac','-b:a','192k',str(A/'court-finish-v9.m4a')],check=True)
p=P/'episodes/ep02/episode.json';e=json.loads(p.read_text());e['player_revision']='music-court-v9';e['player_music'].update(finish_instrument='three-buk-inspired',finish_file='court-finish-v9.m4a',finish_duration=1.55,finish_at=3.5,intro_rim_file='court-finish-v9.m4a');e['player_music'].pop('jing_file',None);p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
(A/'flow-music/v9-edit.json').write_text(json.dumps({'source':'https://www.flowmusic.app/song/2adede80-5821-4c15-926b-0749b41e898f','finish':'Three short original Flow hide-drum excerpts arranged left/right/centre. Inspired by the three-drum setup the user identified; not a historical acoustic recording or a reconstruction claim.','source_cuts':[6.72,7.84,8.60],'finish_at':3.5,'jing_finish_removed':True,'jing_at_48_removed':True},ensure_ascii=False,indent=2)+'\n')

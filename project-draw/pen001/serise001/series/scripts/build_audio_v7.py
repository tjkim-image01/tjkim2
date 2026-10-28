"""Balance separate percussion stems; retain all painting data and videos."""
from pathlib import Path
import json,wave,subprocess
import numpy as np
P=Path(__file__).resolve().parents[1];A=P/'episodes/ep02/audio';sr=48000
with wave.open(str(A/'flow-music/percussion-cues-source.wav')) as w:src=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64).reshape(-1,2)/32768

def excerpt(start,end):
 a=src[round(start*sr):round(end*sr)].copy();n=min(int(.16*sr),len(a)//4);a[:240]*=np.linspace(0,1,240)[:,None];a[-n:]*=np.linspace(1,0,n)[:,None];return a

def balance(a,target):
 # Match the loudest 300 ms energy window instead of averaging in long silence.
 n=round(.3*sr);mono=np.mean(a*a,axis=1);energy=np.array([mono[i:i+n].mean() for i in range(0,max(1,len(a)-n),2400)])
 level=np.sqrt(energy.max());a=a*target/max(level,1e-6);peak=np.max(abs(a));return a*min(1,.82/max(peak,1e-6))

def put(out,a,at,gain=1):
 i=round(at*sr);j=min(len(out),i+len(a));out[i:j]+=a[:j-i]*gain

def save(name,a):
 with wave.open(str(A/name),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())

# A softer roll. Its control is now independent of other percussion.
buk=balance(excerpt(12.79,13.54),.085);roll=np.zeros((66*sr,2));times=[1,1.35,1.65,1.93,2.17,2.38,2.56,2.73,2.88,3.02,3.15,3.27,3.39]
for i,t in enumerate(times):put(roll,buk,t,.55+.30*i/12)
# Warm inharmonic gong resonance, supported by the original Flow metallic decay.
t=np.arange(round(4.7*sr))/sr;rng=np.random.default_rng(71);gong=np.zeros(len(t))
freqs=[173,231,287,349,431,523,641,773,929,1117,1321,1571,1867,2203,2591,3019]
for i,f in enumerate(freqs):
 decay=1.65+i*.21;phase=2*np.pi*(f*t+.018*np.sin(2*np.pi*(2.1+i*.17)*t)*np.exp(-t*2.1));gong+=np.sin(phase+rng.uniform(-.5,.5))*np.exp(-t/decay)/(1+i*.30)
gong*= (1-np.exp(-t*170))*np.exp(-t/2.8);gong[-int(.9*sr):]*=np.linspace(1,0,int(.9*sr));gong/=max(abs(gong))
metal=excerpt(0,4.7);metal=balance(metal,.11);jing=balance(np.column_stack([gong,gong])*.6+metal*.35,.17)
accents=np.zeros((66*sr,2))
for at,start,end in [(20.4,12.72,14.6),(34.2,38.32,40.6)]:put(accents,balance(excerpt(start,end),.11),at)
put(accents,jing,48,.72)
for name,a in [('roll-v7.wav',roll),('accents-v7.wav',accents),('jing-v7.wav',jing)]:
 save(name,a);subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(A/name),'-c:a','aac','-b:a','192k',str(A/Path(name).with_suffix('.m4a'))],check=True)
report={'revision':'audio-balance-v7','jing':'Original Flow metallic decay plus original synthesized inharmonic gong resonance. Not an acoustic jing recording.','finish_at':3.5,'roll_at':times,'middle_at':[20.4,34.2,48],'balance':'Active 300ms energy normalization; independent roll, jing and middle-accent gain controls.','tracks':{}}
for name,a in [('roll',roll),('jing',jing),('accents',accents)]:
 n=round(.3*sr);powers=np.mean(a*a,axis=1);rms=max(np.sqrt(np.mean(powers[i:i+n])) for i in range(0,len(a)-n,2400));report['tracks'][name]={'peak':float(np.max(abs(a))),'max_300ms_rms_db':float(20*np.log10(rms))}
(A/'flow-music/v7-edit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(report)
p=P/'episodes/ep02/episode.json';e=json.loads(p.read_text());e['player_revision']='jing-balance-v7';e['player_music'].update(effects_file='accents-v7.m4a',roll_file='roll-v7.m4a',jing_file='jing-v7.m4a',intro_rim_file='jing-v7.m4a',finish_instrument='jing',gain_controls=True);p.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')

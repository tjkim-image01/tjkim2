"""Separate music from film-time effects so editors can move music freely."""
from pathlib import Path
import wave,json,subprocess
import numpy as np
P=Path(__file__).resolve().parents[1];A=P/'episodes/ep02/audio';F=A/'flow-music';sr=48000
with wave.open(str(F/'percussion-cues-source.wav')) as w:source=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(np.float64).reshape(-1,2)/32768
out=np.zeros((sr*65,2));events=[]
def add(clip,at,gain,label):
 start=round(at*sr);end=min(len(out),start+len(clip));out[start:end]+=clip[:end-start]*gain;events.append(dict(at=at,gain=gain,label=label))
def excerpt(start,end):
 clip=source[round(start*sr):round(end*sr)].copy();fade=min(round(.1*sr),len(clip)//3);clip[:240]*=np.linspace(0,1,240)[:,None];clip[-fade:]*=np.linspace(1,0,fade)[:,None];return clip
# Original Flow-generated buk cue: an accelerating roll tied to the writing.
buk=excerpt(12.79,13.54)
roll=[1,1.35,1.65,1.93,2.17,2.38,2.56,2.73,2.88,3.02,3.15,3.27,3.39]
for i,at in enumerate(roll):add(buk,at,.17+.20*i/(len(roll)-1),'buk roll')
# Original physically modelled wooden rim-like stroke, not a claimed recording.
t=np.arange(round(.32*sr))/sr;rng=np.random.default_rng(61)
rim=(.46*np.sin(2*np.pi*1090*t)*np.exp(-t*43)+.26*np.sin(2*np.pi*1740*t+.5)*np.exp(-t*64)+.12*np.sin(2*np.pi*2630*t)*np.exp(-t*93)+.10*rng.normal(0,1,len(t))*np.exp(-t*170))*(1-np.exp(-t*2200));rim*=.78/max(abs(rim));rim=np.column_stack([rim,rim])
add(rim,3.5,.68,'single wooden janggu-rim-like finish')
for at,start,end,gain in [(20.4,12.72,14.6,.14),(34.2,38.32,40.6,.12),(48,0,5,.32)]:add(excerpt(start,end),at,gain,'Flow percussion accent')
def save(path,a):
 with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes((np.clip(a,-1,1)*32767).astype('<i2').tobytes())
save(A/'janggu-rim.wav',rim*.68);save(A/'effects-director-v6.wav',out)
for src,dst in [(A/'effects-director-v6.wav',A/'effects-director-v6.m4a'),(F/'meokbit-jangdan-source.wav',F/'meokbit-jangdan-source.m4a')]:subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(src),'-c:a','aac','-b:a','192k',str(dst)],check=True)
(F/'v6-edit.json').write_text(json.dumps(dict(music='Original full 174.496s music source; music start and source offset are editor parameters. No speech ducking or film-time effects baked into music.',rim='Original modal synthesis of a wooden janggu-rim-like stage effect; not an acoustic instrument recording.',effects=events),ensure_ascii=False,indent=2)+'\n')
print('V6 separated audio ready; no video written')

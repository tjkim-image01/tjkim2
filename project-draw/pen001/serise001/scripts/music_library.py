"""Local music catalogue, upload conversion and loudness/waveform preparation."""
from pathlib import Path
from array import array
import json,subprocess,uuid,math
ROOT=Path(__file__).resolve().parents[1];MUSIC=ROOT/'series/music';TRACKS=MUSIC/'tracks'
def tracks():
 TRACKS.mkdir(parents=True,exist_ok=True)
 return sorted([json.loads(p.read_text()) for p in TRACKS.glob('*.json')],key=lambda t:(t.get('order',100),t['title']))
def prepare(source,title,mood,track_id=None,order=100,provenance=None):
 track_id=track_id or 'upload-'+uuid.uuid4().hex
 dest=MUSIC/(track_id+'-ready.m4a');MUSIC.mkdir(parents=True,exist_ok=True);TRACKS.mkdir(parents=True,exist_ok=True)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(source)]));audio=next((s for s in probe['streams'] if s['codec_type']=='audio'),None)
 if not audio or any(s['codec_type']=='video' and not s.get('disposition',{}).get('attached_pic') for s in probe['streams']):raise ValueError('음악 파일을 선택해 주세요.')
 duration=float(probe['format']['duration'])
 if not 1<=duration<=1800:raise ValueError('1초~30분의 음원을 선택해 주세요.')
 tmp=dest.with_name(dest.stem+'-working.m4a')
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(source),'-vn','-af','silenceremove=start_periods=1:start_duration=0.08:start_threshold=-45dB:start_silence=0.04,dynaudnorm=f=350:g=11:m=6:p=0.85,loudnorm=I=-20:TP=-2:LRA=7','-ar','48000','-c:a','aac','-b:a','192k','-movflags','+faststart',str(tmp)],check=True,timeout=180);tmp.replace(dest)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)],text=True).strip())
 pcm=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(dest),'-vn','-ac','1','-ar','16000','-f','s16le','-']);a=array('h');a.frombytes(pcm);step=max(1,len(a)//480);waveform=[]
 for i in range(0,len(a),step):
  v=a[i:i+step];waveform.append(round(math.sqrt(sum(x*x for x in v)/max(1,len(v)))/32768,5))
 maximum=max(waveform) or 1
 meta={'id':track_id,'title':title[:120],'mood':mood[:150],'duration':round(duration,3),'url':'/series/music/'+dest.name,'waveform':[round(x/maximum,4) for x in waveform],'order':order,'recommended_offset':0,'level_adjusted':True,'provenance':provenance or '사용자가 선택한 음악 파일'}
 path=TRACKS/(track_id+'.json');temp=path.with_suffix('.tmp');temp.write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');temp.replace(path);return meta

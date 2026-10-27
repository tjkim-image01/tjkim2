import concurrent.futures,json,subprocess,time
from pathlib import Path
BASE=Path('/Users/jatu/app/tjkim2/project-obj/tj002/07_최종산출물')
OUT=BASE/'02_숏폼/thumbnail-intro-v02'
OUT.mkdir(exist_ok=True)
def probe(p):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]))
def run(v):
 stem=v.stem.removesuffix('_v01'); image=list((BASE/'04_표지/thumbnail-v02').glob(stem+'_thumb_v02.jpg'))
 if len(image)!=1: raise RuntimeError(f'Missing unique thumbnail: {v}')
 info=probe(v);vs=next(s for s in info['streams'] if s['codec_type']=='video'); fps=vs['r_frame_rate']
 dest=OUT/(stem+'_intro1p5_v02.mp4');temp=dest.with_suffix('.partial.mp4');log=dest.with_suffix('.ffmpeg.log')
 cmd=['ffmpeg','-hide_banner','-y','-threads','2','-loop','1','-framerate',fps,'-t','1.5','-i',str(image[0]),'-i',str(v),'-filter_complex_threads','2','-filter_complex',f'[0:v]scale={vs["width"]}:{vs["height"]},setsar=1,format=yuv420p,setpts=PTS-STARTPTS[intro];[1:v]setsar=1,format=yuv420p,setpts=PTS-STARTPTS[body];[intro][body]concat=n=2:v=1:a=0[v];[1:a]asetpts=PTS-STARTPTS,adelay=1500:all=1[a]','-map','[v]','-map','[a]','-c:v','h264_videotoolbox','-b:v','10M','-profile:v','high','-pix_fmt','yuv420p','-r',fps,'-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(temp)]
 with log.open('w') as f:subprocess.run(cmd,stdout=f,stderr=f,check=True)
 after=probe(temp); dur=float(after['format']['duration']); orig=float(info['format']['duration'])
 if abs(dur-orig-1.5)>.12:raise RuntimeError(f'Duration mismatch: {v.name} {dur} {orig}')
 # Decode the opening and transition to catch corrupt output where the join occurs.
 subprocess.run(['ffmpeg','-v','error','-i',str(temp),'-t','2.2','-f','null','-'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
 temp.rename(dest)
 result={'source':str(v),'thumbnail':str(image[0]),'output':str(dest),'source_duration':orig,'output_duration':dur,'intro_seconds':1.5,'audio_delay_ms':1500,'verification':'duration and opening/transition decode passed'}
 print(json.dumps(result,ensure_ascii=False),flush=True);return result
videos=sorted((BASE/'02_숏폼').glob('*_v01.mp4'))
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 futures=[pool.submit(run,v) for v in videos]
 for f in concurrent.futures.as_completed(futures):
  results.append(f.result()); (OUT/'render-manifest.json').write_text(json.dumps(sorted(results,key=lambda r:r['source']),ensure_ascii=False,indent=2))
print(f'COMPLETE {len(results)}',flush=True)

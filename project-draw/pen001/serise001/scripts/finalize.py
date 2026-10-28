import json,subprocess,argparse
from pathlib import Path
args=argparse.ArgumentParser();args.add_argument('--revision',choices=['v2','v3'],default='v2');revision=args.parse_args().revision
P=Path(__file__).resolve().parents[1];O=P/'output';out=O/f'serise001-ep01-short-60s-{revision}.mp4'
cmd=['ffmpeg','-y','-v','error','-i',str(O/f'art-{revision}-60s.mp4'),'-i',str(O/('subtitles-v3-alpha.mov' if revision=='v3' else 'subtitles-alpha.mov')),'-i',str(P/('audio/sample-60s-v3.m4a' if revision=='v3' else 'audio/sample-60s.m4a')),'-filter_complex','[0:v][1:v]overlay=0:1435:format=auto,format=yuv420p[v]','-map','[v]','-map','2:a','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-t','60','-movflags','+faststart',str(out)]
if revision=='v3':
 credit='국악연주곡_경기아리랑 — 한국저작권위원회, 공유마당, CC BY 4.0. 템포·음량 조절 및 편집. Source: https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263029&menuNo=200020 License: https://creativecommons.org/licenses/by/4.0/'
 # Compose directly from the approved drawing master to avoid another video
 # encoding pass when adding the dissolve, credit and new narration.
 cmd=['ffmpeg','-y','-v','error','-i',str(O/'art-v2-60s.mp4')]
 for file in ['original-outro-full.png','branding-footer.png','music-credit-overlay.png']:cmd+=['-loop','1','-framerate','24','-i',str(P/'qa'/file)]
 cmd+=['-i',str(O/'subtitles-v3-alpha.mov'),'-i',str(P/'audio/sample-60s-v3.m4a'),'-filter_complex',"[1:v]format=rgba,fade=t=in:st=52:d=4:alpha=1[original];[0:v][original]overlay=0:0:format=auto[a];[a][2:v]overlay=0:0:enable='gte(t,50)':format=auto[b];[b][3:v]overlay=0:0:format=auto[c];[c][4:v]overlay=0:1435:format=auto,format=yuv420p[v]",'-map','[v]','-map','5:a','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-c:a','copy','-t','60','-movflags','+faststart','-metadata','comment='+credit,str(out)]
subprocess.run(cmd,check=True)
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
cues=json.loads((P/('audio/captions-v3.json' if revision=='v3' else 'audio/captions.json')).read_text());out.with_suffix('.srt').write_text('\n\n'.join(f"{i+1}\n{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}" for i,c in enumerate(cues))+'\n')
print('FINAL_READY',out,flush=True)

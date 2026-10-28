"""Adapt the installed shorts-kinetic-subtitles renderer to measured narration."""
import json,bisect,subprocess,argparse
from pathlib import Path
from functools import lru_cache
from PIL import ImageFont,Image,ImageDraw
import kinetic_template as k
parser=argparse.ArgumentParser();parser.add_argument('--revision',choices=['v2','v3'],default='v2');revision=parser.parse_args().revision
P=Path(__file__).resolve().parents[1];cues=json.loads((P/('audio/captions-v3.json' if revision=='v3' else 'audio/captions.json')).read_text())
k.WIDTH=1080;k.HEIGHT=300;k.BASE_SIZE=54;k.MAX_LINE_WIDTH=960;k.TEXT_TOP=72
k.KEYWORD_FRAGMENTS=('한류','조선','기산','운초','상여','멜대','장지','외국인','풍속화','배웅','컬렉션')
@lru_cache(maxsize=96)
def font(n):return ImageFont.truetype(str(P/'web/fonts/NanumSquareRoundEB.ttf'),n)
k.font=font
events=[]
for cue in cues:
 words=cue['text'].split();weights=[k.visible_length(w) for w in words];cursor=cue['start']
 for i,(word,weight) in enumerate(zip(words,weights)):
  end=cursor+(cue['end']-cue['start'])*weight/sum(weights);events.append(k.Event(cursor,end,words,i,k.is_keyword(word)));cursor=end
assert max(len(c['text']) for c in cues)<=20
widths=[ImageDraw.Draw(Image.new('RGB',(1,1))).textbbox((0,0),c['text'],font=font(54))[2] for c in cues]
assert max(widths)<980,widths
ends=[e.end for e in events];out=P/('output/subtitles-v3-alpha.mov' if revision=='v3' else 'output/subtitles-alpha.mov')
proc=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s','1080x300','-r','24','-i','-','-an','-c:v','qtrle','-pix_fmt','argb',str(out)],stdin=subprocess.PIPE)
for f in range(60*24):
 t=f/24;i=bisect.bisect_right(ends,t);e=events[i] if i<len(events) and events[i].start<=t else None;proc.stdin.write(k.render_frame(e,t).tobytes())
proc.stdin.close();assert proc.wait()==0
(P/('qa/subtitles-v3.json' if revision=='v3' else 'qa/subtitles.json')).write_text(json.dumps(dict(lines=len(cues),max_chars=max(len(c['text']) for c in cues),max_width_px=max(widths),one_line=True,first_subtitle=cues[0]['start'],last_subtitle=cues[-1]['end'],timing='estimated word timing inside measured paragraph audio',overlay_y=1435,keywords=k.KEYWORD_FRAGMENTS),ensure_ascii=False,indent=2))
print('SUBTITLES_READY',out,flush=True)

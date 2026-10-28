"""Keep the approved 0–52s drawing; dissolve only the final still composition."""
import json,subprocess,argparse
from pathlib import Path
from PIL import Image
from render_sample import Painter,MARKS,PS,txt,font
P=Path(__file__).resolve().parents[1];Q=P/'qa';O=P/'output'
spec=json.loads((P/'art/original-outro.json').read_text());art=Image.open(P/'art'/spec['asset']).convert('RGBA');l,t,r,b=spec['crop'];x,y,x2,y2=spec['placement']
p=Painter();original=Image.new('RGBA',p.base.size,(248,245,234,255));original.alpha_composite(art.crop((l,t,r,b)).resize((round((x2-x)*PS),round((y2-y)*PS)),Image.Resampling.LANCZOS),(round(x*PS),round(y*PS)))
p.stable=original;p.count=len(MARKS)
frame=p.frame(58);frame.save(Q/'original-outro-full.png')
footer=Image.new('RGBA',(1080,1920));footer.alpha_composite(p.paper.crop((0,1380,1080,1690)).convert('RGBA'),(0,1380));txt(footer,'TJ KIM 컬렉션 소장품',1412,40,(101,94,77));txt(footer,'낯선 나라를 전하던 그림이',1574,31,(121,111,88));txt(footer,'오늘은 우리의 시간을 되돌려 줍니다.',1624,31,(121,111,88));footer.save(Q/'branding-footer.png')
from PIL import ImageDraw
credits=Image.new('RGBA',(1080,1920));dc=ImageDraw.Draw(credits)
credit_lines=['음악: 국악연주곡_경기아리랑 | 한국저작권위원회 · 공유마당','CC BY 4.0 · 템포·음량 편집 | creativecommons.org/licenses/by/4.0/','출처: gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263029&menuNo=200020']
for i,line in enumerate(credit_lines):dc.text((70,1700+i*27),line,font=font(18),fill=(124,119,106,255))
credits.save(Q/'music-credit-overlay.png')
parser=argparse.ArgumentParser();parser.add_argument('--assets-only',action='store_true');args=parser.parse_args()
if args.assets_only:print('OUTRO_ASSETS_READY',flush=True);raise SystemExit(0)
cmd=['ffmpeg','-y','-v','error','-i',str(O/'art-v2-60s.mp4'),'-loop','1','-framerate','24','-i',str(Q/'original-outro-full.png'),'-loop','1','-framerate','24','-i',str(Q/'branding-footer.png'),'-filter_complex',"[1:v]format=rgba,fade=t=in:st=52:d=4:alpha=1[original];[0:v][original]overlay=0:0:format=auto[art];[art][2:v]overlay=0:0:enable='gte(t,50)':format=auto,format=yuv420p[v]",'-map','[v]','-an','-t','60','-r','24','-c:v','h264_videotoolbox','-b:v','8500k','-pix_fmt','yuv420p','-movflags','+faststart',str(O/'art-v3-60s.mp4')]
subprocess.run(cmd,check=True);print('OUTRO_READY',O/'art-v3-60s.mp4',flush=True)

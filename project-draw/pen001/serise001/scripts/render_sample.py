"""V2: new vector painting from blank paper; colour then ink per object."""
import math,json,bisect,subprocess,argparse
from functools import lru_cache
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageChops
P=Path(__file__).resolve().parents[1];A=P/'art/assets-v2';QA=P/'qa';FPS=24;W,H=1080,1920
DATA=json.loads((A/'painting.json').read_text());MARKS=DATA['strokes'];PS=DATA.get('pixel_scale',1);FONT=P/'web/fonts'
@lru_cache(maxsize=48)
def font(n,bold=False):return ImageFont.truetype(str(FONT/('NanumSquareRoundEB.ttf' if bold else 'NanumSquareRoundB.ttf')),n)
def txt(im,s,y,n=42,color=(52,57,49),bold=False):
 d=ImageDraw.Draw(im);f=font(n,bold);box=d.textbbox((0,0),s,font=f);d.text(((W-box[2]+box[0])/2-box[0],y),s,font=f,fill=color)
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
class Painter:
 def __init__(self):
  self.base=Image.open(A/'initial.png').convert('RGBA');self.stable=self.base.copy();self.count=0
  self.layers=[Image.open(A/m['file']).convert('RGBA') for m in MARKS]
  self.ends=[m['end'] for m in MARKS];self.st=[m['start'] for m in MARKS]
  self.brushes=[Image.open(P/'art/brush'/f'deep-{i:02d}.png').convert('RGBA') for i in range(32)]
  self.yy,self.xx=np.mgrid[0:H,0:W];rng=np.random.default_rng(61);noise=rng.normal(0,.45,(H,W));background=np.clip(np.array([248,245,234])+noise[:,:,None],0,255).astype('uint8');self.paper=Image.fromarray(background)
 def source(self,t):
  n=bisect.bisect_right(self.ends,t+1e-8)
  if n<self.count:self.stable=self.base.copy();self.count=0
  while self.count<n:
   m=MARKS[self.count];self.stable.alpha_composite(self.layers[self.count],tuple(round(v*PS) for v in m['bounds'][:2]));self.count+=1
  im=self.stable.copy();tip=None;penup=False
  if n<len(MARKS):
   m=MARKS[n];pts=np.array(m['points'],float);lengths=np.linalg.norm(np.diff(pts,axis=0),axis=1);cum=np.r_[0,np.cumsum(lengths)];u=max(0,min(1,(t-m['start'])/(m['end']-m['start'])));distance=cum[-1]*u
   if t>=m['start']:
    k=min(len(lengths)-1,max(0,int(np.searchsorted(cum,distance,side='right')-1)));frac=(distance-cum[k])/max(1e-6,lengths[k]);tip=pts[k]+(pts[k+1]-pts[k])*frac
    l,top,r,b=m['bounds'];mask=Image.new('L',(round((r-l)*PS),round((b-top)*PS)));d=ImageDraw.Draw(mask);local=[(float((x-l)*PS),float((y-top)*PS)) for x,y in list(pts[:k+1])+[tip]];width=(m['width']+1)*PS
    if len(local)>1:d.line(local,fill=255,width=round(width),joint='curve')
    for x,y in local:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
    layer=self.layers[n].copy();layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask));im.alpha_composite(layer,(round(l*PS),round(top*PS)))
   else:
    penup=True
    if n:
     prev=MARKS[n-1];last=np.array(prev['points'][-1]);u=ease((t-prev['end'])/max(.01,m['start']-prev['end']));tip=last+(pts[0]-last)*u
    else:tip=pts[0]
  return im,tip,penup
 def view(self,t):
  views=[(0,(88,90,952,632)),(22.0,(100,116,448,582)),(35.0,(458,206,949,631))]
  idx=max(i for i,v in enumerate(views) if v[0]<=t);box=np.array(views[idx][1],float)
  transition=0
  if idx and t<views[idx][0]+.55:transition=ease((t-views[idx][0])/.55)
  if t>=47.8:
   u=ease((t-47.8)/2.0);box=box*(1-u)+np.array([88,90,952,632])*u
  return box,idx,transition,views
 def place(self,source,box,tip,penup,t):
  l,top,r,b=box;scale=min(1000/(r-l),1010/(b-top));cw,ch=round((r-l)*scale),round((b-top)*scale);x=(W-cw)//2;y=round(850-ch/2)
  scene=source.crop(tuple(v*PS for v in box)).resize((cw,ch),Image.Resampling.LANCZOS);im=self.paper.copy().convert('RGBA');im.alpha_composite(scene,(x,y))
  if tip is not None and t>=.8 and t<49.8:
   px=x+(tip[0]-l)*scale;py=y+(tip[1]-top)*scale-(12 if penup else 0)
   if -20<px<W+20 and 200<py<1440:
    # The same 3D flat-brush pose sprites used by the reference pen project.
    pose=round((math.sin(t*.64)*.18+.5)*31)%32;brush=self.brushes[pose];s=.78
    brush=brush.resize((round(224*s),round(288*s)),Image.Resampling.LANCZOS)
    im.alpha_composite(brush,(round(px-112*s),round(py-246.857*s)))
  return im.convert('RGB')
 def frame(self,t):
  src,tip,penup=self.source(t);box,idx,trans,views=self.view(t);im=self.place(src,box,tip,penup,t)
  if trans:
   prev=self.place(src,np.array(views[idx-1][1],float),tip,penup,t);im=Image.blend(prev,im,trans)
  d=ImageDraw.Draw(im);d.line((70,104,1010,104),fill=(201,193,173),width=1)
  d.rectangle((70,88,79,105),fill=(142,67,47));txt(im,'풍속화 속 한국  /  01',119,25,(127,119,97))
  if t<10.7:
   txt(im,'K팝보다 먼저,',186,58,bold=True);txt(im,'조선을 알린 그림',260,58,bold=True)
  else:
   txt(im,'마지막 길을 함께',196,61,bold=True);txt(im,'운초 전칭 · 장례 행렬',284,27,(140,116,80))
  if t<50:
   labels={'sketch':'종이 위에 구도를 잡다','bier':'상여와 멜대','rear':'행렬에 사람이 더해지다','right':'도포의 바탕에서 얼굴까지','left':'옷차림에 남은 시대','front':'함께 걷는 사람들','finish':'마지막 붓질'}
   current=MARKS[min(len(MARKS)-1,bisect.bisect_right(self.ends,t))]
   txt(im,labels[current['element']],1404,25,(144,120,83))
  else:
   txt(im,'그림에 남은, 사람들의 마지막 배웅',1412,36,(101,94,77))
   d.line((445,1523,635,1523),fill=(151,103,70),width=2)
   txt(im,'낯선 나라를 전하던 그림이',1574,31,(121,111,88));txt(im,'오늘은 우리의 시간을 되돌려 줍니다.',1624,31,(121,111,88))
  txt(im,'조선을 그리다 · 한 장의 풍속, 한 사람의 삶',1790,23,(148,139,119))
  txt(im,'TJ KIM COLLECTION  ·  APKC260507306',1830,20,(163,153,132))
  return im

def render(preview=False):
 painter=Painter()
 if preview:
  for t in [0,.5,2.0,6.0,12.0,19.0,27.0,38.0,46.0,51.0,58.0]:painter.frame(t).save(QA/f'v2-frame-{t:04.1f}.jpg',quality=94)
  return
 out=P/'output/art-v2-60s.mp4';cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','h264_videotoolbox','-b:v','8500k','-pix_fmt','yuv420p','-movflags','+faststart',str(out)]
 enc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=(QA/'render-art-v2.log').open('w'))
 try:
  for f in range(60*FPS):
   enc.stdin.write(painter.frame(f/FPS).tobytes())
   if f%(FPS*5)==0:print('ART_RENDER',f//FPS,'/60',flush=True)
  enc.stdin.close();assert enc.wait()==0
 except BaseException:enc.terminate();raise
 print('VIDEO_READY',out,flush=True)
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--preview',action='store_true');args=a.parse_args();render(args.preview)

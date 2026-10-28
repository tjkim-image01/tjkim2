import sys,json,math,bisect,subprocess,argparse
from pathlib import Path
from functools import lru_cache
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageChops
P=Path(__file__).resolve().parents[1];BASE=P.parent;sys.path.insert(0,str(BASE/'scripts'));import kinetic_template as k
W,H,FPS=1080,1920,24;PAPER=(248,245,234)
@lru_cache(maxsize=160)
def font(n,bold=False):return ImageFont.truetype(str(BASE/'web/fonts'/('NanumSquareRoundEB.ttf' if bold else 'NanumSquareRoundB.ttf')),n)
k.WIDTH=1080;k.HEIGHT=300;k.BASE_SIZE=52;k.MAX_LINE_WIDTH=970;k.TEXT_TOP=72;k.KEYWORD_FRAGMENTS=('조선','외국','그림','윷','다듬','주막','모자','음악','소반','장기','떡','엿','빨래','노동','컬렉션','사람');k.font=lambda n:font(n,True)
def ease(v):v=max(0,min(1,v));return v*v*(3-2*v)
def txt(im,text,y,size,color=(52,57,49),bold=False):
 d=ImageDraw.Draw(im);f=font(size,bold);b=d.textbbox((0,0),text,font=f);size=min(size,round(size*980/max(1,b[2]-b[0])));f=font(size,bold);b=d.textbbox((0,0),text,font=f);d.text(((W-(b[2]-b[0]))/2-b[0],y),text,font=f,fill=color)
class Painter:
 def __init__(self,ep):
  self.E=P/'episodes'/ep;self.e=json.loads((self.E/'episode.json').read_text());self.A=self.E/'art';data=json.loads((self.A/'painting.json').read_text());self.marks=data['strokes'];self.layers=[Image.open(self.A/m['file']).convert('RGBA') for m in self.marks];self.initial=Image.open(self.A/'initial.png').convert('RGBA');self.stable=self.initial.copy();self.count=0;self.ends=[m['end'] for m in self.marks];self.original=Image.open(self.A/'original-layout.png').convert('RGBA');self.paths=[]
  for m in self.marks:
   p=np.array(m['points'],float);c=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))];self.paths.append((p,c))
  self.brushes=[Image.open(BASE/'art/brush'/f'deep-{i:02d}.png').convert('RGBA').resize((175,225),Image.Resampling.LANCZOS) for i in range(32)]
  self.bases=[self.background(i) for i in range(3)];self.labels={}
  for g,label in {'sketch':'종이 위에 구도를 잡다','background':'풍경의 큰 색을 놓다','left':'사람의 옷차림과 몸짓','center':'장면을 설명하는 손과 도구','right':'인물의 표정과 옷 주름','detail':'작은 흔적을 더하다'}.items():
   im=Image.new('RGBA',(1080,55));txt(im,label,0,25,(144,120,83));self.labels[g]=im
  for g,label in data.get('group_labels',{}).items():
   im=Image.new('RGBA',(1080,55));txt(im,label,0,25,(144,120,83));self.labels[g]=im
  self.calm=self.e.get('caption_style')=='calm-myeongjo'
  self.cues=json.loads((self.E/'audio/captions.json').read_text());self.events=[]
  for c in self.cues:
   words=[x['word'] for x in c['words']]
   for i,x in enumerate(c['words']):self.events.append(k.Event(x['start'],x['end'],words,i,k.is_keyword(x['word'])))
  self.eventends=[e.end for e in self.events]
 def background(self,state):
  im=Image.new('RGB',(W,H),PAPER);d=ImageDraw.Draw(im);d.line((70,104,1010,104),fill=(201,193,173),width=1);d.rectangle((70,88,79,105),fill=(142,67,47));txt(im,f'풍속화 속 한국  /  {self.e["number"]:02}',119,25,(127,119,97))
  if state==0:txt(im,self.e['hook'],186,52,bold=True);txt(im,self.e['title'],266,58,bold=True)
  else:txt(im,self.e['title'],196,58,bold=True);txt(im,'운초 전칭 · TJ KIM 컬렉션',284,27,(140,116,80))
  if state==2:txt(im,'TJ KIM 컬렉션 소장품',1412,40,(101,94,77));txt(im,'낯선 나라를 전하던 그림이',1574,31,(121,111,88));txt(im,'오늘은 우리의 시간을 되돌려 줍니다.',1624,31,(121,111,88))
  lines=['음악: 국악연주곡_경기아리랑 | 한국저작권위원회 · 공유마당','CC BY 4.0 · 템포·음량 편집 | creativecommons.org/licenses/by/4.0/','출처: gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263029&menuNo=200020']
  for i,line in enumerate(lines):d.text((70,1700+i*27),line,font=font(18),fill=(124,119,106))
  txt(im,'조선을 그리다 · 한 장의 풍속, 한 사람의 삶',1790,23,(148,139,119));txt(im,'TJ KIM COLLECTION  ·  APKC260507306',1830,20,(163,153,132));return im
 def source(self,t):
  n=bisect.bisect_right(self.ends,t+1e-8)
  if n<self.count:self.stable=self.initial.copy();self.count=0
  while self.count<n:
   m=self.marks[self.count];self.stable.alpha_composite(self.layers[self.count],tuple(m['bounds'][:2]));self.count+=1
  im=self.stable.copy();tip=None;up=False
  if n<len(self.marks):
   m=self.marks[n];pts,cum=self.paths[n];u=max(0,min(1,(t-m['start'])/(m['end']-m['start'])));dist=cum[-1]*u
   if t>=m['start']:
    j=min(len(pts)-2,max(0,int(np.searchsorted(cum,dist,side='right')-1)));f=(dist-cum[j])/max(1e-6,cum[j+1]-cum[j]);tip=pts[j]+(pts[j+1]-pts[j])*f;l,top,r,b=m['bounds'];mask=Image.new('L',(r-l,b-top));d=ImageDraw.Draw(mask);p=[(float(x-l),float(y-top)) for x,y in list(pts[:j+1])+[tip]];width=m['width']+1
    if len(p)>1:d.line(p,fill=255,width=round(width),joint='curve')
    for x,y in p:d.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
    layer=self.layers[n].copy();layer.putalpha(ImageChops.multiply(layer.getchannel('A'),mask));im.alpha_composite(layer,(l,top))
   else:
    up=True
    if n:
     prev=self.marks[n-1];a=np.array(prev['points'][-1]);u=ease((t-prev['end'])/max(.01,m['start']-prev['end']));tip=a+(pts[0]-a)*u
    else:tip=pts[0]
  if t>52:im=Image.blend(im,self.original,ease((t-52)/4))
  return im,tip,up,n
 def frame(self,t,captions=True):
  scene,tip,up,n=self.source(t);im=self.bases[0 if t<10.7 else 1 if t<50 else 2].copy();zoom=1+.08*ease((t-22)/.8)*(1-ease((t-47.8)/2));l=(1000-1000/zoom)/2;top=(652-652/zoom)/2
  if zoom>1.001:scene=scene.crop((l,top,1000-l,652-top)).resize((1000,652),Image.Resampling.LANCZOS)
  im.paste(scene,(40,524),scene)
  if tip is not None and .8<=t<49.8:
   x=40+(tip[0]-l)*zoom;y=524+(tip[1]-top)*zoom-(12 if up else 0)
   pose=round((math.sin(t*.64)*.18+.5)*31)%32;im.paste(self.brushes[pose],(round(x-87.5),round(y-193)),self.brushes[pose])
  if t<50:
   label=self.labels[self.marks[min(n,len(self.marks)-1)]['element']];im.paste(label,(0,1404),label)
  if t>52:txt(im,('소장 이미지 · AI 정리 편집본' if self.calm else '소장 원본 · 테두리 정리본') if t>=56 else '그린 그림에서 소장 이미지로',1340 if self.e.get('caption_layout') else 1265,23,(148,139,119))
  if captions and self.calm:
   cue=next((c for c in self.cues if c['start']<=t<c['end']),None)
   if cue:
    spec=self.e.get('caption_layout',{});alpha=round(255*min(1,(t-cue['start'])/.22,(cue['end']-t)/.22));overlay=Image.new('RGBA',(1080,150));draw=ImageDraw.Draw(overlay);size=spec.get('font_size',48)
    f=ImageFont.truetype(str(P/'site/fonts/NanumMyeongjo-Regular.ttf'),size);width=draw.textlength(cue['text'],font=f)
    if width>950:f=ImageFont.truetype(str(P/'site/fonts/NanumMyeongjo-Regular.ttf'),round(size*950/width))
    width=draw.textlength(cue['text'],font=f);draw.text(((1080-width)/2,0),cue['text'],font=f,fill=(61,67,54,alpha));im.paste(overlay,(0,spec.get('top',1505)),overlay)
  elif captions:
   i=bisect.bisect_right(self.eventends,t);e=self.events[i] if i<len(self.events) and self.events[i].start<=t else None
   if e is not None:cap=k.render_frame(e,t);im.paste(cap,(0,1435),cap)
  return im
 def render(self):
  out=self.E/'output'/f'{self.e["id"]}-short-60s.mp4';out.parent.mkdir(exist_ok=True);credit='국악연주곡_경기아리랑 - 한국저작권위원회, 공유마당, CC BY 4.0. 템포·음량 편집. https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263029&menuNo=200020 https://creativecommons.org/licenses/by/4.0/'
  temp=out.with_name(out.stem+'.rendering.mp4')
  cmd=['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s','1080x1920','-r','24','-i','-','-i',str(self.E/'audio/mix.m4a'),'-map','0:v','-map','1:a','-c:v','h264_videotoolbox','-b:v','8500k','-pix_fmt','yuv420p','-c:a','copy','-t','60','-movflags','+faststart','-metadata','comment='+credit,str(temp)]
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=(self.E/'qa/render.log').open('w'))
  for f in range(1440):
   t=f/24;im=self.frame(t);proc.stdin.write(im.tobytes())
   if f in [0,72,240,576,912,1200,1296,1392]:im.save(self.E/'qa'/f'frame-{round(t):02}.jpg',quality=94)
   if f%240==0:print(self.e['id'],f//24,'/60',flush=True)
  proc.stdin.close();assert proc.wait()==0;temp.replace(out)
  self.frame(0).save(self.A/'poster.jpg',quality=94)
  def stamp(t):ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
  out.with_suffix('.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i,c in enumerate(self.cues))+'\n');print('VIDEO_READY',out,flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('episode');p.add_argument('--preview',action='store_true');a=p.parse_args();r=Painter(a.episode)
 if a.preview:
  for t in [0,3,10,24,38,50,54,58]:r.frame(t).save(r.E/'qa'/f'preview-{t:02}.jpg',quality=95)
 else:r.render()

"""First homepage episode: one person at a time, head/body/lower, objects, background."""
import json, math, shutil, hashlib
from pathlib import Path
import numpy as np, cv2
from PIL import Image,ImageDraw
from trace_art import trace_paths
P=Path(__file__).resolve().parents[1];E=P/'episodes/ep02';A=E/'art';W,H=1000,652
BACKUP=E/'versions/before-figure-first'
if not BACKUP.exists():
 BACKUP.mkdir(parents=True)
 for name in ['art','output','qa'] :shutil.copytree(E/name,BACKUP/name)
 shutil.copy2(E/'episode.json',BACKUP/'episode.json')
data=json.loads((BACKUP/'art/painting.json').read_text())
polys={
'rear_woman':[(375,146),(411,146),(440,161),(452,178),(452,197),(441,221),(429,228),(436,237),(457,250),(473,277),(484,303),(480,324),(470,338),(441,350),(392,365),(356,373),(313,360),(287,338),(299,299),(312,268),(326,235),(344,218),(336,213),(347,202),(356,194),(362,174)],
'rear_man':[(588,137),(640,135),(662,143),(672,184),(668,210),(661,239),(676,247),(702,256),(718,274),(729,315),(734,353),(753,362),(780,367),(803,383),(819,410),(842,416),(866,429),(863,442),(845,456),(807,477),(771,484),(729,464),(697,424),(660,407),(626,385),(589,376),(557,357),(532,349),(513,342),(499,336),(485,328),(486,319),(499,316),(518,322),(536,330),(554,291),(571,264),(592,249),(608,243),(603,230),(595,216),(598,195),(588,190)],
'front_man':[(315,254),(348,250),(380,259),(383,281),(404,292),(402,300),(380,300),(385,317),(381,337),(365,354),(363,372),(383,388),(405,388),(410,398),(399,408),(376,414),(380,441),(410,439),(427,455),(438,480),(430,493),(450,497),(477,499),(480,507),(456,518),(453,538),(445,552),(420,562),(394,571),(360,572),(326,565),(294,556),(266,553),(242,540),(228,523),(236,485),(243,459),(217,452),(182,438),(188,425),(210,414),(241,400),(259,369),(280,343),(303,331),(324,324),(326,303),(308,297),(308,288)],
'front_woman':[(679,257),(701,265),(714,288),(713,315),(706,339),(712,352),(724,376),(730,401),(743,418),(755,450),(784,481),(800,505),(820,522),(856,528),(883,535),(877,547),(856,558),(840,581),(827,593),(797,609),(768,619),(720,628),(665,622),(628,610),(589,600),(553,580),(530,566),(518,552),(516,534),(525,517),(542,500),(556,481),(560,462),(546,460),(526,453),(512,447),(510,439),(512,431),(528,427),(552,429),(572,429),(600,403),(618,374),(629,352),(643,346),(645,335),(635,322),(627,313),(631,305),(635,292),(649,271)]}
def polygon(points):
 a=np.zeros((H,W),np.uint8);cv2.fillPoly(a,[np.array(points,np.int32)],255);return a>0
lower={
'front_man':polygon([(246,457),(277,469),(305,473),(320,484),(335,488),(350,502),(380,521),(416,525),(449,519),(456,530),(445,553),(421,563),(394,573),(360,573),(326,566),(294,557),(268,554),(243,541),(229,523)]),
'rear_woman':polygon([(368,310),(405,299),(432,311),(441,350),(392,366),(356,374),(339,361)]),
'rear_man':np.indices((H,W))[0]>=375,
'front_woman':polygon([(681,400),(710,398),(730,410),(743,424),(755,453),(778,477),(802,506),(820,522),(856,528),(884,535),(877,548),(856,558),(840,581),(827,593),(797,609),(768,619),(720,629),(665,623),(628,610),(589,601),(553,581),(530,567),(518,552),(516,534),(525,517),(542,500),(556,481),(561,462),(587,461),(619,450),(642,430),(652,411)])}
head_end={'front_man':363,'rear_woman':235,'rear_man':264,'front_woman':355}
heads={
'front_man':polygon([(315,254),(348,250),(380,259),(383,281),(404,292),(402,300),(380,300),(385,317),(381,337),(365,354),(356,362),(337,351),(326,337),(323,324),(326,303),(308,297),(308,288)]),
'rear_woman':polygon([(375,146),(411,146),(440,161),(452,178),(452,197),(441,221),(429,228),(414,247),(397,240),(382,225),(367,217),(344,222),(336,213),(347,202),(356,194),(362,174)]),
'rear_man':polygon([(588,137),(640,135),(662,143),(672,184),(668,210),(661,239),(652,250),(643,267),(627,259),(608,244),(603,230),(595,216),(598,195),(588,190)]),
'front_woman':polygon([(679,257),(701,265),(714,288),(713,315),(706,339),(712,352),(694,360),(677,352),(662,346),(643,346),(645,335),(635,322),(627,313),(631,305),(635,292),(649,271)])}
names={'front_man':'앞쪽 남성','rear_woman':'뒤쪽 여인','rear_man':'뒤쪽 남성','front_woman':'앞쪽 여인'}
owner=np.zeros((H,W),np.uint8)
people=['front_man','rear_woman','rear_man','front_woman']
for who in ['rear_woman','rear_man','front_man','front_woman']:owner[polygon(polys[who])]=people.index(who)+1
yy=np.indices((H,W))[0];region=np.zeros((H,W),np.uint8);groups=[]
for i,who in enumerate(people):
 person=owner==i+1;face=person&heads[who];legs=person&lower[who]&~face;body=person&~face&~legs
 for part,mask,seconds in [('face',face,2.7),('body',body,3.3),('legs',legs,2.5)]:
  ident=len(groups)+1;region[mask]=ident;key=f'{who}_{part}';label=names[who]+' · '+{'face':'얼굴과 머리','body':'몸과 손','legs':'다리·아랫옷'}[part];groups.append((ident,key,label,seconds))
objects=polygon([(359,381),(487,337),(621,379),(614,410),(582,440),(566,465),(567,509),(535,519),(526,478),(500,465),(474,454),(433,435),(411,417),(368,417)])&(owner==0)
region[objects]=13;groups.append((13,'objects','물건 · 놀이판과 윷',7.0));groups.append((0,'background','배경 · 마루와 난간, 식물',8.0))
# Guide lines are omitted; no background or full-figure underdrawing appears early.
old=[m for m in data['strokes'] if m['element']!='sketch'];strokes=[];svg=[];cursor=.8
background_sources={3,14,21,22,24,31,32,35,37,38,42,56,57,60,100,102,122,131,133,134,135,138,139,140,141}
colors=np.array([(248,245,234),(210,130,90),(80,155,195),(95,165,100),(210,170,70),(165,90,155),(90,170,170),(190,90,90),(180,160,80),(130,100,180),(80,170,140),(190,130,170),(120,155,210),(100,90,70)],np.uint8)
overlay=np.array(Image.open(A/'original-layout.png').convert('RGB'));overlay=(overlay*.45+colors[region]*.55).astype(np.uint8);Image.fromarray(overlay).save(E/'qa/semantic-regions.png')
for ident,key,label,budget in groups:
 ms=[]
 for m in old:
  l,t,r,b=m['bounds'];im=Image.open(BACKUP/'art'/m['file']).convert('RGBA');a=np.array(im.getchannel('A'))
  keep=np.ones(a.shape,bool) if m['id'] in background_sources and ident==0 else np.zeros(a.shape,bool) if m['id'] in background_sources else region[t:b,l:r]==ident
  a=np.where(keep,a,0).astype(np.uint8)
  ys,xs=np.nonzero(a)
  if not len(xs):continue
  x0,x1=int(xs.min()),int(xs.max())+1;y0,y1=int(ys.min()),int(ys.max())+1;a=a[y0:y1,x0:x1];l+=x0;t+=y0;r=l+a.shape[1];b=t+a.shape[0];width=m['width'];pts=[]
  if width<5:
   paths=trace_paths(a)
   for length,path in sorted(paths,reverse=True):pts.extend([(x+l,y+t) for x,y in path])
  else:
   for row in list(range(0,a.shape[0],max(1,int(width*.6))))+[a.shape[0]-1]:
    xx=np.flatnonzero(a[row]);
    if len(xx):
     pair=[(l+int(xx[0]),t+row),(l+int(xx[-1]),t+row)];pts+=pair if len(pts)//2%2==0 else pair[::-1]
  if len(pts)<2:
   pts=[(l+int(xs0),t+int(ys0)) for ys0,xs0 in zip(*np.nonzero(a))];pts=pts[:1]*2 if len(pts)==1 else pts
  color=im.getpixel((int(xs[0]),int(ys[0])))[:3];layer=Image.new('RGBA',(r-l,b-t),color+(0,));layer.putalpha(Image.fromarray(a));fn=f'figure-strokes/{len(strokes)+len(ms):04d}.png';(A/'figure-strokes').mkdir(exist_ok=True);layer.save(A/fn)
  cost=max(.2,math.sqrt(np.count_nonzero(a))/30);ms.append(dict(id=len(strokes)+len(ms),file=fn,bounds=[l,t,r,b],points=pts,width=width,phase=m['phase'],element=key,label=label,cost=cost,source_id=m['id']))
  contours,_=cv2.findContours((a>0).astype(np.uint8),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE);paths=[]
  for c in contours:
   p=cv2.approxPolyDP(c,.5,True).reshape(-1,2);paths.append('M '+' L '.join(f'{x+l} {y+t}' for x,y in p)+' Z')
  svg.append('<path d="'+' '.join(paths)+'" fill="rgb'+str(color)+'" fill-rule="evenodd"/>')
 ms.sort(key=lambda m:(0 if m['phase']=='wash' else 1,m['source_id']))
 weight=sum(m['cost'] for m in ms)
 for m in ms:
  alloc=budget*m['cost']/weight;pause=min(.055,alloc*.1);m.update(start=cursor,end=cursor+alloc-pause,move_end=cursor+alloc);cursor+=alloc
 strokes+=ms
scale=49/(cursor-.8)
for m in strokes:
 for k in ['start','end','move_end']:m[k]=.8+(m[k]-.8)*scale
new={**data,'strokes':strokes,'group_order':[g[1] for g in groups],'group_labels':{g[1]:g[2] for g in groups},'method':'semantic figure-first pigment strokes: each person face, body, lower clothes; objects; background. No initial global guides.'}
(A/'painting.json').write_text(json.dumps(new,ensure_ascii=False,separators=(',',':')))
complete=Image.open(A/'initial.png').convert('RGBA')
for m in strokes:complete.alpha_composite(Image.open(A/m['file']),tuple(m['bounds'][:2]))
complete.save(A/'complete.png');(A/'drawing.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 652"><rect width="1000" height="652" fill="#f8f5ea"/>'+'\n'.join(svg)+'</svg>')
qa={'strokes':len(strokes),'sequence':[{'group':g,'start':min(m['start'] for m in strokes if m['element']==g),'end':max(m['end'] for m in strokes if m['element']==g)} for g in new['group_order']],'no_global_guides':True,'other_videos':{e['id']:hashlib.sha256((P/'site'/e['video']).resolve().read_bytes()).hexdigest() for e in json.loads((P/'manifest.json').read_text()) if e['id']!='ep02'}}
(E/'qa/figure-first.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2));print(json.dumps(qa['sequence'],ensure_ascii=False,indent=2));print('strokes',len(strokes))

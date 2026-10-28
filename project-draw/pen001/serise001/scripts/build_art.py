"""A midway painting study: retain completed washes, slowly draw selected features.
Each hand-authored gesture has independent RGBA pigment and a local path mask.
"""
import json,math,shutil,hashlib,cv2
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageChops
from scipy import ndimage as ndi
P=Path(__file__).resolve().parents[1];OUT=P/'art/assets'
if OUT.exists():shutil.rmtree(OUT)
(OUT/'strokes').mkdir(parents=True)
source=P/'art/base.png';im=Image.open(source).convert('RGB');W,H=im.size
raw=np.array(im).astype(float)
yy,xx=np.mgrid[:H,:W];xn=xx/W;yn=yy/H;features=np.stack([np.ones_like(xn),xn,yn,xn*yn,xn*xn,yn*yn],axis=-1)
background_samples=((xx>36)&(xx<65)&(yy>82)&(yy<612))|((xx>40)&(xx<740)&(yy>82)&(yy<109))|((xx>900)&(xx<938)&(yy>105)&(yy<205))|((xx>150)&(xx<430)&(yy>585)&(yy<612))|((xx>795)&(xx<930)&(yy>573)&(yy<612))
coef=np.linalg.lstsq(features[background_samples],raw[background_samples],rcond=None)[0];background_field=features@coef
rgb=np.clip((raw-background_field)*1.06+[248,245,234],0,255).astype('uint8')
rgb[:,942:]=[248,245,234];rgb[615:,:]=[248,245,234];rgb[440:615,:139]=[248,245,234]
# Keep only the painting, excluding frame, handwritten caption, seals and title.
area=Image.new('L',(W,H));d=ImageDraw.Draw(area)
d.polygon([(107,106),(949,108),(956,626),(101,625)],fill=255)
# Source paper softly joins the new sheet without isolating future silhouettes.
d.rectangle((0,445,139,605),fill=0);d.rectangle((740,0,901,195),fill=0);d.rectangle((947,0,W,H),fill=0);d.rectangle((0,621,W,H),fill=0)
area=area.filter(ImageFilter.GaussianBlur(4));a=np.array(area)/255
# Manual gestures and viewing groups. Durations include pen-up rests.
specs=[]
def S(group,label,points,width=14,seconds=1.2,kind='ink'):
 specs.append(dict(group=group,label=label,points=points,width=width,seconds=seconds,kind=kind))
# 1: The long pole establishes what the people are carrying.
S('bier','멜대의 긴 선',[(193,302),(253,316),(309,330),(360,337)],12,2.4)
S('bier','상여 지붕의 능선',[(300,155),(339,130),(400,118),(447,119),(513,140),(569,158),(622,181),(657,207)],15,3)
S('bier','짚 지붕의 왼쪽 끝',[(301,162),(284,189),(292,222),(318,231),(336,256)],14,1.9)
S('bier','지붕 아래로 흐르는 짚',[(555,179),(552,208),(537,239),(531,269)],16,1.8)
S('bier','짚의 결 1',[(398,143),(374,149),(355,163)],15,1)
S('bier','짚의 결 2',[(459,140),(438,150),(415,158)],15,1)
S('bier','짚의 결 3',[(521,158),(501,168),(478,174)],15,1)
S('bier','짚의 결 4',[(614,200),(597,211),(591,226)],15,1)
S('bier','상여 옆판의 선',[(430,341),(461,350),(494,357)],12,1.5)
# 2: The colour is already dry. A few large human contours are completed.
S('women','주황 저고리의 소매',[(241,280),(231,311),(226,346),(231,377)],13,1.7)
S('women','앞쪽 여인의 치마선',[(334,366),(326,410),(310,456),(305,488),(321,515),(349,533)],13,2.4)
S('women','치맛자락의 긴 주름',[(367,370),(373,413),(378,456),(393,500)],12,1.8)
S('women','초록 저고리의 어깨',[(341,300),(326,312),(314,338),(305,374)],12,1.7)
S('women','초록 소매의 곡선',[(388,309),(409,329),(426,358),(431,385),(411,401)],12,1.7)
S('women','쪽머리의 둥근 선',[(337,271),(352,263),(375,265),(383,277)],22,1.2)
S('women','얼굴의 코와 입',[(363,290),(366,301),(360,308),(351,309)],9,1.3)
# 3: Three hats, three faces. Deliberate pauses separate the people.
S('men','가운데 갓의 검은 관',[(524,270),(539,268),(548,273)],35,1.4)
S('men','가운데 갓의 챙',[(505,294),(531,295),(558,296)],13,1.6)
S('men','가운데 얼굴의 수염',[(526,330),(539,334),(550,328)],12,1.3)
S('men','앞사람 갓의 관',[(632,306),(649,306),(660,307)],31,1.4)
S('men','앞사람 갓의 챙',[(614,322),(642,323),(670,323)],13,1.6)
S('men','앞사람 얼굴의 선',[(648,343),(656,348),(655,361),(643,367)],10,1.4)
# 4: Long strokes follow the cloth. They are not a screen-wide wipe.
S('robes','가운데 도포의 어깨',[(513,341),(493,367),(481,395),(485,425)],12,1.8)
S('robes','가운데 도포의 긴 선',[(535,399),(521,450),(512,502),(508,551)],13,2.1)
S('robes','가운데 옷의 밑단',[(483,561),(518,575),(556,578),(580,563)],13,1.8)
S('robes','앞사람 도포의 왼쪽 선',[(614,375),(596,413),(597,442),(612,458)],13,1.8)
S('robes','앞사람 도포의 오른쪽 선',[(678,390),(692,429),(692,476),(699,535),(714,583)],13,2.1)
S('robes','앞사람 도포의 주름',[(650,447),(641,489),(630,541),(628,580)],12,2)
S('robes','오른쪽 인물의 소매',[(857,317),(878,326),(900,345),(924,352),(936,366),(922,383),(898,388)],13,2.1)
S('robes','오른쪽 인물의 옷자락',[(843,400),(826,447),(798,493),(768,523)],13,2.1)
# Fit the pacing to 48.4 seconds, retaining a substantial final look.
budget=48.4;scale=budget/sum(s['seconds'] for s in specs)
ink=(rgb.mean(axis=2)<183)&(np.arange(H)[:,None]>100)
# Union of the real selected pigments. Base starts midway, with the remaining
# painting already present. Selected dark features are represented only as a
# light construction guide until their own gesture is drawn.
marks=[];union=Image.new('L',(W,H));cursor=1.6
for j,s in enumerate(specs):
 pts=s['points'];width=s['width'];m=Image.new('L',(W,H));dd=ImageDraw.Draw(m);dd.line(pts,fill=255,width=width,joint='curve')
 for x,y in pts:dd.ellipse((x-width/2,y-width/2,x+width/2,y+width/2),fill=255)
 alpha=np.array(m)/255*ink*a
 m=Image.fromarray(np.uint8(alpha*255));union=ImageChops.lighter(union,m)
 box=m.getbbox()
 if box is None:raise RuntimeError(s['label']+' has no pigment')
 rgba=Image.fromarray(rgb).convert('RGBA');rgba.putalpha(m);rgba=rgba.crop(box);fn=f'strokes/{j:03d}.png';rgba.save(OUT/fn)
 duration=s['seconds']*scale;pause=min(.28,duration*.18)
 marks.append(dict(id=j,file=fn,bounds=list(box),points=pts,width=width,start=cursor,end=cursor+duration-pause,move_end=cursor+duration,phase='ink',element=s['group'],label=s['label']))
 cursor+=duration
selected=np.array(union)>0
# A local inpainting interpolates only unfinished marks, rather than hiding a
# cutout of the completed object. Other already-painted details remain intact.
expanded=ndi.binary_dilation(selected,iterations=2)
_,indices=ndi.distance_transform_edt(expanded,return_indices=True)
nearest=cv2.inpaint(rgb,np.uint8(expanded*255),5,cv2.INPAINT_TELEA)
initial=rgb.astype(float).copy();initial[selected]=nearest[selected]*.86+rgb[selected]*.14
blank=np.zeros((H,W,3),dtype=float)+[248,245,234]
initial=initial*a[:,:,None]+blank*(1-a[:,:,None]);final=rgb*a[:,:,None]+blank*(1-a[:,:,None])
Image.fromarray(np.uint8(initial)).save(OUT/'initial.jpg',quality=98)
Image.fromarray(np.uint8(final)).save(OUT/'complete.jpg',quality=98)
Image.fromarray(np.uint8(blank)).save(OUT/'paper.jpg',quality=96)
Image.fromarray(np.uint8(np.array(union))).save(OUT/'selected-features.png')
data=dict(width=W,height=H,strokes=marks,draw_end=cursor,duration=60,start_state='midway: colour and non-selected lines already drawn; pale guides at selected marks',method='30 hand-authored feature gestures with individual pigment PNGs; continuous local reveal only',source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),global_scan=False)
(OUT/'painting.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(P/'qa/art-build.json').write_text(json.dumps(dict(strokes=len(marks),draw_end=cursor,average_gesture_seconds=budget/len(marks),pen_up_rest_seconds=sum(s['move_end']-s['end'] for s in marks),start_state=data['start_state'],global_scan=False),ensure_ascii=False,indent=2))
print('ART_READY',len(marks),cursor)

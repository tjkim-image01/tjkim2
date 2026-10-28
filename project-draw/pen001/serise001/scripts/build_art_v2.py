"""Redraw the supplied procession as native vector geometry, starting blank.
Every colour fill and every line is a separate authored pigment gesture.
The photograph supplies the subject/layout only; no bitmap enters the paint.
"""
import json,math,hashlib
from pathlib import Path
from functools import lru_cache
import numpy as np
from PIL import Image,ImageDraw,ImageFilter,ImageChops
from svgpathtools import parse_path
P=Path(__file__).resolve().parents[1];OUT=P/'art/assets-v2';(OUT/'strokes').mkdir(parents=True,exist_ok=True)
W,H=978,638;SCALE=2;IW,IH=W*SCALE,H*SCALE;PAPER=(248,245,234)
marks=[];svg_shapes=[];rng=np.random.default_rng(77)

def sample(d):
 p=parse_path(d);parts=[]
 for sub in p.continuous_subpaths():
  pts=[]
  for seg in sub:
   n=max(3,int(seg.length(error=1e-3)/2)+2)
   pts.extend((float(z.real),float(z.imag)) for t in np.linspace(0,1,n,endpoint=False) for z in [seg.point(t)])
  if len(sub):z=sub[-1].end;pts.append((float(z.real),float(z.imag)))
  if pts:parts.append(pts)
 return parts

def tf(pts,x=0,y=0,sx=1,sy=1,rot=0):
 c=math.cos(rot);s=math.sin(rot)
 return [(x+sx*(a*c-b*s),y+sy*(a*s+b*c)) for a,b in pts]

def mask_poly(d,transform):
 im=Image.new('L',(IW,IH));dr=ImageDraw.Draw(im)
 for pts in sample(d):dr.polygon([(a*SCALE,b*SCALE) for a,b in tf(pts,**transform)],fill=255)
 return im

def line_mask(pts,width):
 im=Image.new('L',(IW,IH));d=ImageDraw.Draw(im);pts2=[(a*SCALE,b*SCALE) for a,b in pts];r=width*SCALE/2
 d.line(pts2,fill=255,width=max(1,round(width*SCALE)),joint='curve')
 for x,y in pts2:d.ellipse((x-r,y-r,x+r,y+r),fill=255)
 return im

def add_image(full,pts,width,phase,group,label,cost=1):
 bbox=full.getchannel('A').getbbox()
 if not bbox:return
 # Crop with a little transparent breathing room, preserving native coordinates.
 l,t,r,b=bbox;pad=3*SCALE;l=max(0,l-pad);t=max(0,t-pad);r=min(IW,r+pad);b=min(IH,b+pad)
 im=full.crop((l,t,r,b));idx=len(marks);fn=f'strokes/{idx:03d}.png';im.save(OUT/fn)
 length=sum(math.dist(pts[j],pts[j+1]) for j in range(len(pts)-1))
 marks.append(dict(id=idx,file=fn,bounds=[l/SCALE,t/SCALE,r/SCALE,b/SCALE],points=[[round(a,3),round(b,3)] for a,b in pts],width=width,phase=phase,element=group,label=label,cost=max(.1,cost),length=length))

def pigment(mask,color,phase,opaque=False):
 if isinstance(color,str):color=tuple(bytes.fromhex(color.lstrip('#')))
 a=np.array(mask,float)/255
 yy,xx=np.mgrid[:IH,:IW]
 grain=.55*np.sin(xx*.79+yy*.13)+.45*np.sin(xx*.17-yy*.61)
 if phase=='wash':
  n=grain*2.4+np.sin(xx*.018+yy*.012)*1.3
  rgb=np.clip(np.array(color)[None,None,:]+n[:,:,None],0,255).astype('uint8')
  if not opaque:a*=.93+.05*np.sin(xx*.07+yy*.11)
 else:
  rgb=np.broadcast_to(np.array(color,dtype='uint8'),(IH,IW,3)).copy();a*=.86+.10*(grain+1)/2
 im=Image.fromarray(rgb).convert('RGBA');im.putalpha(Image.fromarray(np.uint8(np.clip(a*255,0,255))));return im

def ink(d,group,label,transform=None,width=1.65,color='#626251',cost=1):
 tr=transform or {}
 for pts in sample(d):
  pts=tf(pts,**tr);mask=line_mask(pts,width);im=pigment(mask,color,'ink');add_image(im,pts,width,'ink',group,label,cost)
 svg_shapes.append(dict(d=d,transform=tr,stroke=color,width=width,fill='none'))

def wash(d,color,group,label,transform=None,route=None,width=None,cost=2):
 tr=transform or {};mask=mask_poly(d,tr);bbox=mask.getbbox()
 if not bbox:return
 # Sweep a real brush-sized stripe across the shape. A mask as wide as the
 # object would expose the whole coloured object at the first brush contact.
 l,t,r,b=[v/SCALE for v in bbox]
 width=min(26,max(9,min(r-l,b-t)*.32))
 rows=np.linspace(t,b,max(2,math.ceil((b-t)/(width*.7))+1))
 pts=[];alpha=np.array(mask)
 for y in rows:
  row=alpha[min(IH-1,round(y*SCALE))]
  xs=np.flatnonzero(row)
  if not len(xs):continue
  left,right=float(xs[0]/SCALE),float(xs[-1]/SCALE)
  ends=[(left,y),(right,y)]
  if len(pts)//2%2:ends.reverse()
  pts.extend(ends)
 if len(pts)<2:pts=[((l+r)/2,t),((l+r)/2,b)]
 tube=line_mask(pts,width);mask=ImageChops.multiply(mask,tube)
 im=pigment(mask,color,'wash',opaque=True);add_image(im,pts,width,'wash',group,label,cost)
 svg_shapes.append(dict(d=d,transform=tr,stroke='none',width=0,fill=color))

def filled(d,color,g,label,tr=None,route=None,width=None,edge=True,cost=2):
 wash(d,color,g,label,tr,route,width,cost)
 if edge:ink(d,g,label+'의 먹선',tr,cost=.9)

# Very sparse composition marks: they contain no full human outlines.
ink('M 282 194 Q 429 103 625 196','sketch','상여가 놓일 자리',width=.7,color='#c3bba6',cost=1)
ink('M 152 568 Q 494 607 900 563','sketch','행렬의 발높이',width=.65,color='#d8d0bd',cost=1)
ink('M 324 211 L 633 236','sketch','덮개 아래의 기준선',width=.65,color='#d2c8b2',cost=.8)

# Bier: unbroken timber underpainting, then straw roof and its own ink texture.
g='bier'
body='M 286 207 L 614 218 L 647 346 Q 499 414 286 356 Z'
filled(body,'#b59b60',g,'상여의 나무 몸체',route='M 330 211 C 325 258 343 308 363 373',width=650,cost=3)
filled('M 297 224 L 559 235 L 574 288 L 300 275 Z','#e7dfb8',g,'옆판의 밝은 장식',route='M 295 247 L 575 263',width=75,cost=2)
for x,y in [(378,244),(424,248),(468,251)]:
 filled(f'M {x} {y-8} Q {x+11} {y} {x+19} {y+3} L {x+7} {y+10} L {x-4} {y+2} Z','#cc9d99',g,'옆판의 연분홍 장식',cost=.5)
ink('M 301 294 L 603 314 M 304 317 L 609 339 M 308 343 L 565 369',g,'나무판의 가로 결',width=1.9,cost=.8)
roof='M 288 191 C 297 154 336 129 377 120 Q 422 110 462 124 L 515 143 Q 587 156 632 184 Q 664 205 662 226 L 633 213 Q 640 264 622 300 Q 615 320 620 345 L 599 366 L 584 337 L 570 353 L 557 324 L 541 335 L 531 291 Q 526 252 546 216 L 475 219 L 412 216 L 350 221 L 321 236 L 311 216 L 290 219 Z'
wash(roof,'#c9ac64',g,'길게 이어지는 짚의 바탕',route='M 300 186 C 365 142 431 143 499 169 C 563 192 591 216 599 344',width=185,cost=5)
# Overlapping ochre glazes are local gestures, not a prepared composite.
wash('M 300 185 Q 380 128 453 135 Q 514 150 543 175 L 493 180 Q 401 146 330 204 Z','#dbc681',g,'지붕의 밝은 짚',route='M 314 189 Q 416 134 530 170',width=90,cost=1.4)
wash('M 556 219 Q 590 219 616 231 Q 630 291 604 345 L 587 319 L 576 336 L 562 302 Z','#b89a54',g,'아래로 늘어지는 짚',route='M 591 223 Q 608 274 591 336',width=95,cost=1.5)
ink(roof,g,'짚 덮개의 바깥 곡선',width=2,cost=2.3)
for j,d in enumerate([
 'M 326 171 q 16 -11 30 -10','M 371 147 q 15 -8 28 -6','M 419 143 q 15 -6 28 -2',
 'M 467 155 q 16 -5 27 0','M 516 170 q 15 -4 27 2','M 559 187 q 15 -2 25 4',
 'M 605 205 q 12 0 22 7','M 345 191 q 12 -9 23 -8','M 393 173 q 13 -7 25 -3',
 'M 442 180 q 14 -7 28 -3','M 494 192 q 10 -5 24 -2',
 'M 551 237 q -4 18 -4 34','M 575 243 q 6 28 1 49','M 601 250 q 8 29 -4 58','M 616 273 q 1 23 -7 38']):
 ink(d,g,'짚 한 다발의 결',width=2.8 if j<11 else 2.1,color='#8b7542',cost=.45)

# Figure functions work in a head-relative local coordinate system. These are
# complete new curved drawings, with skin/wash separated from eyes and outline.
FACE='M -18 9 Q -21 18 -16 37 Q -10 51 3 52 Q 18 49 22 33 L 19 13 Q 4 1 -18 9 Z'
ROBE='M -14 48 Q -32 53 -42 79 C -51 108 -61 143 -56 165 Q -53 178 -41 174 L -39 194 Q -45 217 -56 238 Q -3 257 54 239 L 42 197 L 46 161 Q 59 144 49 122 L 36 79 Q 28 58 14 48 Z'
EXTEND='M -14 48 Q -33 53 -43 80 Q -56 112 -55 146 L -40 167 L -35 194 L -57 238 Q -3 257 55 239 L 42 195 L 44 151 Q 66 148 81 130 L 95 121 L 86 103 L 70 103 L 47 83 Q 32 57 14 48 Z'

def man(x,y,g,scale=1,angle=0,extended=False,rear=False,hat=True):
 tr=dict(x=x,y=y,sx=scale,sy=scale,rot=angle);cl=EXTEND if extended else ROBE
 # feet before robe; their visible tips are drawn now, no future shapes exist.
 filled('M -42 238 L -45 260 Q -33 269 -14 264 L -5 255 L -4 240 Z','#dfd7bb',g,'왼발의 버선',tr,cost=.6)
 filled('M 6 241 L 8 264 Q 24 273 44 263 L 45 252 L 35 238 Z','#dfd7bb',g,'오른발의 버선',tr,cost=.6)
 wash(cl,'#edf0e4' if not rear else '#e7eadf',g,'도포의 흰 바탕',tr,route='M 0 51 C -7 110 -11 181 1 247',width=(210 if extended else 135)*scale,cost=3)
 wash('M -10 64 Q -5 130 -23 191 L -30 240 L -5 246 Q 8 157 8 69 Z','#d7decd',g,'도포 안쪽의 옅은 담채',tr,route='M -3 65 C 1 131 -14 186 -16 241',width=34*scale,cost=1)
 ink(cl,g,'도포의 바깥 선',tr,width=1.8,cost=2)
 ink('M -10 51 L 0 81 L 13 52 M -25 63 Q -13 89 -16 116 L -36 153 M 0 82 Q 6 136 -7 196 L -10 245 M 27 105 Q 23 148 24 196 L 31 240',g,'깃과 도포 주름',tr,width=1.6,cost=.9)
 if extended:
  filled('M 83 107 Q 93 103 100 111 Q 107 115 99 122 L 89 126 L 82 120 Z','#e3cba4',g,'길을 가리키는 손',tr,cost=.5)
  ink('M 45 151 Q 31 155 19 145 L 10 125 L 18 111',g,'접은 팔의 주름',tr,cost=.6)
 else:
  filled('M -49 158 L -37 152 L -28 163 Q -28 174 -40 180 L -48 172 Z','#e4cdaa',g,'멜대 아래의 손',tr,cost=.45)
  ink('M 38 104 Q 19 125 3 146 L -12 172 M -39 193 Q -24 180 -16 162',g,'팔을 모은 선',tr,cost=.7)
 # neck and head only become visible as this skin stroke is made.
 filled(FACE,'#f0e6ca',g,'얼굴의 살빛',tr,route='M 1 8 Q -1 28 3 49',width=47*scale,cost=1)
 if hat:
  crown='M -13 9 L -12 -21 Q 1 -27 16 -20 L 18 9 Z'
  filled(crown,'#43483b',g,'갓의 검은 관',tr,cost=1)
  filled('M -33 12 Q 0 4 34 13 Q 22 20 -27 19 Z','#474c40',g,'갓의 넓은 챙',tr,cost=.7)
 else:
  filled('M -23 13 Q -27 2 -12 -1 Q -13 -12 1 -10 Q 13 -8 14 -1 Q 28 2 25 14 L 10 12 Q -4 17 -23 13 Z','#41463b',g,'상투와 머리',tr,cost=.8)
 # Two eyes, hooked nose, moustache, short chin beard.
 ink('M -13 25 l 9 0 M 7 25 l 9 1 M -8 28 l 1 0 M 11 29 l 1 0',g,'눈썹 아래의 눈',tr,width=1.6,cost=.45)
 ink('M 4 28 l 3 8 l -6 1 M -4 41 Q 3 35 11 41 M -4 44 L 9 44 M -3 46 L 2 55 L 7 46',g,'코와 수염',tr,width=1.5,cost=.65)

# Draw rear figures on top of the bier as actual opaque brushwork. Foreground
# people will later paint over these overlaps, like working on real paper.
man(278,170,'rear',scale=.72,hat=False,rear=True)
man(579,248,'rear',scale=.66,hat=False,rear=True)
man(712,243,'right',scale=.93,rear=True)
# Long pole is a distinct ochre gesture, before foreground sleeves cover it.
filled('M 192 299 L 737 365 L 738 372 L 190 306 Z','#c1a064','left','멜대의 나무색',route='M 191 303 L 738 369',width=12,cost=2)
man(175,166,'left',scale=1.02,angle=.015)

# Two women: different sleeve shapes and flowing skirts, not a repeated doll.
def woman(x,y,g,orange=False):
 tr=dict(x=x,y=y);dress='M -18 68 Q -23 111 -38 170 Q -44 196 -25 211 Q 11 235 45 210 Q 39 171 28 131 L 22 72 Z'
 skirt='#e1d9b8' if orange else '#dda184';coat='#d69c51' if orange else '#bdce94'
 filled('M -28 213 L -32 229 Q -14 239 1 229 L 6 217 Z','#e3dec8',g,'왼쪽 버선',tr,cost=.45)
 filled('M 14 216 L 14 234 Q 30 243 49 233 L 42 218 Z','#e3dec8',g,'오른쪽 버선',tr,cost=.45)
 filled(dress,skirt,g,'치마의 큰 색면',tr,route='M 0 76 C -9 126 -15 177 7 216',width=105,cost=3.3)
 # Broad shadow is painted separately, not embedded black linework.
 wash('M -9 85 Q -12 148 -26 185 Q -16 205 0 218 L 7 211 Q -6 154 6 88 Z','#b5b99b' if orange else '#c98e73',g,'치마의 접힌 담채',tr,route='M -2 87 Q -13 163 -9 208',width=36,cost=1.1)
 coatpath='M -15 43 Q -32 48 -43 70 L -48 119 L -28 129 L -17 104 L -11 84 L 24 86 L 39 119 L 56 119 L 54 98 Q 40 62 18 44 Z'
 filled(coatpath,coat,g,'저고리의 고운 색',tr,route='M -36 65 Q 1 43 37 87 L 49 114',width=70,cost=2.7)
 filled('M -9 52 L 4 67 L 18 48 L 22 57 L 6 78 L -11 59 Z','#f1edda',g,'저고리의 흰 동정',tr,cost=.6)
 filled('M -7 78 L 18 77 L 18 90 L -8 89 Z','#bc8571',g,'가슴의 고름',tr,cost=.55)
 filled('M -43 120 L -31 122 L -27 137 Q -36 145 -43 136 Z','#e6ceaa',g,'내려놓은 손',tr,cost=.4)
 filled('M 46 114 L 58 112 L 63 122 Q 58 134 48 131 Z','#e6ceaa',g,'소매 끝의 손',tr,cost=.4)
 ink('M -15 92 Q -20 144 -29 179 Q -27 202 -8 216 M 5 96 Q 6 156 21 207 M 18 96 Q 26 158 37 202',g,'치맛자락의 긴 먹선',tr,width=1.65,cost=1.5)
 filled(FACE,'#f3e8cf',g,'여인의 얼굴빛',tr,route='M 1 8 L 2 48',width=45,cost=.8)
 filled('M -23 12 Q -26 1 -11 -2 Q 1 -7 19 3 L 23 17 Q 6 13 -9 19 L -20 27 Z','#424a3e',g,'빗어 올린 머리',tr,cost=.9)
 filled('M -10 2 Q -30 -11 -31 -1 Q -33 9 -13 9 Z','#424a3e',g,'뒤로 맨 쪽머리',tr,cost=.6)
 ink('M -12 27 l 9 0 M 7 27 l 9 0 M -8 30 l 1 0 M 11 30 l 1 0 M 3 30 l 2 7 l -4 1 M -4 43 l 12 0',g,'눈과 코와 입',tr,width=1.45,cost=.8)
woman(265,263,'left',orange=True)
woman(354,297,'left',orange=False)
# The three front men complete the human rhythm of the procession.
man(536,320,'front',scale=1.0,angle=.015)
man(836,285,'front',scale=1.02,extended=True)
man(648,348,'front',scale=.96,angle=-.025)
# Last, a few quiet earth strokes tie the already-drawn feet to the ground.
for d in ['M 143 457 Q 180 464 221 455','M 305 568 Q 355 581 410 567','M 480 598 Q 534 611 579 599','M 599 619 Q 653 629 708 615','M 787 568 Q 842 579 891 566']:
 ink(d,'finish','발 아래 옅은 흙',width=4.7,color='#d5cdb5',cost=.6)

# Rescale geometry to fit the available picture area while preserving aspect.
# Native coordinates are retained, and frame cameras use the complete picture.
budgets={'sketch':2.2,'bier':11.0,'rear':4.0,'right':4.0,'left':13.0,'front':13.3,'finish':1.5}
# These groups were authored in depth order; right-rear is painted before left.
totals={g:sum(m['cost'] for m in marks if m['element']==g) for g in budgets}
cursor=.8
for m in marks:
 allocation=budgets[m['element']]*m['cost']/totals[m['element']]
 pause=min(.075,allocation*.12);m.update(start=cursor,end=cursor+allocation-pause,move_end=cursor+allocation);cursor+=allocation
paper=Image.new('RGB',(IW,IH),PAPER);paper.save(OUT/'initial.png');paper.save(OUT/'paper.png')
complete=paper.convert('RGBA')
for m in marks:complete.alpha_composite(Image.open(OUT/m['file']),tuple(round(v*SCALE) for v in m['bounds'][:2]))
complete.convert('RGB').save(OUT/'complete.png')
# Export the authored vector reference as a reusable drawing artifact.
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 978 638">','<rect width="978" height="638" fill="#f8f5ea"/>']
for sh in svg_shapes:
 tr=sh['transform'];parts=[]
 if tr:parts=[f'translate({tr.get("x",0)} {tr.get("y",0)})',f'scale({tr.get("sx",1)} {tr.get("sy",1)})',f'rotate({math.degrees(tr.get("rot",0))})']
 svg.append(f'<path d="{sh["d"]}" transform="{" ".join(parts)}" fill="{sh["fill"]}" stroke="{sh["stroke"]}" stroke-width="{sh["width"]}" stroke-linecap="round" stroke-linejoin="round"/>')
svg.append('</svg>');(P/'art/procession-v2.svg').write_text('\n'.join(svg))
data=dict(width=W,height=H,pixel_scale=SCALE,strokes=marks,draw_end=cursor,duration=60,start_state='blank paper; no source bitmap or completed drawing in initial layer',source_sha256=hashlib.sha256((P/'art/base.png').read_bytes()).hexdigest(),method='new native vector redraw, independent flat pigments and independently authored ink paths',global_scan=False)
(OUT/'painting.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
report=dict(revision='v2',strokes=len(marks),draw_end=cursor,groups={g:dict(strokes=sum(m['element']==g for m in marks),seconds=budgets[g]) for g in budgets},initial_rgb_unique=len(np.unique(np.array(paper).reshape(-1,3),axis=0)),source_bitmap_in_initial=False,colour_layers_contain_ink=False)
(P/'qa/art-build-v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))

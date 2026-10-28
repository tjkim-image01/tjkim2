"""Restore the established 395-pigment choreography on the approved v19 image.

Color-specific washes precede ink inside each person/part. Original timing and
camera groups survive. Source pixels supply contours; brush routes never draw
SVG outlines. Disconnected fine contours have explicit pen lifts, not DFS walks.
No MP4 output or saved-setting changes.
"""
import json,shutil,math
from pathlib import Path
import cv2,numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d
from trace_art import trace_paths
from scipy.spatial import cKDTree

P=Path(__file__).resolve().parents[1];E=P/'episodes/ep06';A=E/'art';O=A/'raster-v20';SCALE=4

def ink_program(old,ink):
 from build_raster_review_v19 import mask
 spec=json.loads((P/'production/scene-masks.json').read_text())['ep06']
 owner=np.zeros((1304,2000),np.int16);regions=np.zeros_like(owner);groups={};yy=np.indices(owner.shape)[0]
 for i in reversed(range(len(spec['people']))):owner[mask(spec['people'][i]['poly'])>0]=i+1
 for i,p in enumerate(spec['people']):
  own=owner==i+1;face=own&(mask(p['head'])>0);legs=own&(yy>=p['legs']*2)&~face
  for h in p['hands']:legs&=mask(h)==0
  for part,area in [('face',face),('body',own&~face&~legs),('legs',legs)]:
   ident=len(groups)+1;regions[area]=ident;groups[p['key']+'_'+part]=ident
 objects=np.zeros(owner.shape,np.uint8)
 for poly in spec['objects']:objects|=mask(poly)
 ident=len(groups)+1;regions[(objects>0)&(owner==0)]=ident;groups['objects']=ident;groups['background']=0
 assigned={i:[] for i,m in enumerate(old['strokes']) if m['phase']=='ink'}
 for group,ident in groups.items():
  ids=[i for i,m in enumerate(old['strokes']) if m['element']==group and m['phase']=='ink']
  anchors=[];owners=[]
  for i in ids:
   for point in old['strokes'][i]['points']:anchors.append(point);owners.append(i)
  tree=cKDTree(anchors)
  target=ink.copy();target[regions!=ident]=0
  target=cv2.morphologyEx(target,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  for ln,pts in trace_paths(target):
   if ln<4:continue
   points=np.asarray(pts,dtype=float)/2
   if len(points)>3:
    for axis in [0,1]:points[:,axis]=gaussian_filter1d(points[:,axis],.35,mode='nearest')
   _,nearest=tree.query(np.mean(points,axis=0));assigned[owners[int(nearest)]].append(points.tolist())
 return assigned,regions,groups

def finish_washes(marks,regions,groups,wash,rgb):
 """Give skipped pale pigments real local touch-up passes during their wash.

 They are not filled at a stage boundary: the brush visits every added area.
 """
 from build_raster_review_v19 import scan_routes,brush_support
 content=np.any(np.abs(cv2.resize(rgb,(2000,1304),interpolation=cv2.INTER_AREA).astype(float)-[248,245,234])>2,axis=2)
 added=0
 for group,ident in groups.items():
  ids=[i for i,m in enumerate(marks) if m['element']==group and m['phase']=='wash']
  covered=np.zeros((1304,2000),np.uint8)
  for i in ids:
   m=marks[i];l,t,r,b=m['bounds'];alpha=np.array(Image.open(A/m['file']))[:,:,3]
   a=cv2.resize(alpha,((r-l)*2,(b-t)*2),interpolation=cv2.INTER_AREA)
   allowed=np.zeros_like(covered);allowed[t*2:b*2,l*2:r*2]=a
   allowed=cv2.bitwise_and(allowed,brush_support(m['points'],m['width']));covered|=allowed
  missing=((regions==ident)&content&(covered<4)).astype(np.uint8)*255
  count,cc,stats,_=cv2.connectedComponentsWithStats(missing)
  keep=np.zeros_like(missing)
  for j in range(1,count):
   if stats[j,cv2.CC_STAT_AREA]>=5:keep[cc==j]=255
  if not keep.any():continue
  anchors=[];owners=[]
  for i in ids:
   for point in marks[i]['points']:anchors.append(point);owners.append(i)
  tree=cKDTree(anchors);extra={}
  for pts in scan_routes(keep,16):
   support=brush_support(pts,16);paint=cv2.bitwise_and(keep,support)
   if np.count_nonzero(paint)<2:continue
   _,near=tree.query(np.mean(pts,axis=0));i=owners[int(near)]
   extra.setdefault(i,[]).append((pts,paint));keep[paint>0]=0;added+=1
  for i,passes in extra.items():
   m=marks[i];l,t,r,b=m['bounds'];old=np.array(Image.open(A/m['file']))[:,:,3]
   alpha2=np.zeros((1304,2000),np.uint8);alpha2[t*2:b*2,l*2:r*2]=cv2.resize(old,((r-l)*2,(b-t)*2),interpolation=cv2.INTER_AREA)
   m['brush_paths']=[m['points']]+[pts for pts,_ in passes]
   for pts,paint in passes:alpha2|=paint
   ys,xs=np.nonzero(alpha2);l=max(0,int(xs.min())//2-1);t=max(0,int(ys.min())//2-1);r=min(1000,math.ceil((xs.max()+1)/2)+1);b=min(652,math.ceil((ys.max()+1)/2)+1)
   alpha=cv2.resize(alpha2[t*2:b*2,l*2:r*2],((r-l)*4,(b-t)*4),interpolation=cv2.INTER_LINEAR)
   rgba=np.zeros((*alpha.shape,4),np.uint8);rgba[:,:,:3]=wash[t*4:b*4,l*4:r*4];rgba[:,:,3]=alpha
   Image.fromarray(rgba).save(A/m['file']);m['bounds']=[l,t,r,b];m['points']=[p for path in m['brush_paths'] for p in path]
 return added

def main():
 O.mkdir(exist_ok=True);(O/'strokes').mkdir(exist_ok=True)
 backup=E/'versions/before-raster-v20';backup.mkdir(exist_ok=True)
 for src in [A/'painting.json',E/'episode.json']:
  if not (backup/src.name).exists():shutil.copy2(src,backup/src.name)
 old=json.loads((E/'versions/before-raster-v19/painting.json').read_text())
 rgb=np.array(Image.open(A/'raster-v19/working-reference-4000.png').convert('RGB'))
 wash=np.array(Image.open(A/'raster-v19/wash-working-4000.png').convert('RGB'))
 small=cv2.resize(rgb,(2000,1304),interpolation=cv2.INTER_AREA)
 gray=cv2.bilateralFilter(cv2.cvtColor(small,cv2.COLOR_RGB2GRAY),9,28,7)
 closed=cv2.morphologyEx(gray,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
 ink=(((closed.astype(float)-gray)>16)|(gray<132)).astype(np.uint8)*255
 ink=cv2.dilate(ink,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
 ink4=cv2.resize(ink,(4000,2608),interpolation=cv2.INTER_LINEAR)
 assigned,regions,groups=ink_program(old,ink)
 ink_distance=cv2.distanceTransform(ink,cv2.DIST_L2,5)
 marks=[];subpath_count=0
 for i,m0 in enumerate(old['strokes']):
  m=dict(m0);l,t,r,b=m['bounds']
  old_alpha=np.array(Image.open(A/m['file']).convert('RGBA'))[:,:,3]
  alpha=cv2.resize(old_alpha,((r-l)*SCALE,(b-t)*SCALE),interpolation=cv2.INTER_LINEAR)
  if m['phase']=='wash':
   # Keep the existing pigment-specific footprint, rather than filling a whole
   # face/body rectangle with every color in a single horizontal scan.
   alpha=cv2.GaussianBlur(alpha,(0,0),1.1)
   texture=wash[t*SCALE:b*SCALE,l*SCALE:r*SCALE]
  else:
   if assigned[i]:
    remaining=assigned[i].copy();cursor=np.array(m['points'][0],float);ordered=[]
    while remaining:
     k=min(range(len(remaining)),key=lambda j:min(np.linalg.norm(np.array(remaining[j][0])-cursor),np.linalg.norm(np.array(remaining[j][-1])-cursor)))
     pts=remaining.pop(k)
     if np.linalg.norm(np.array(pts[-1])-cursor)<np.linalg.norm(np.array(pts[0])-cursor):pts.reverse()
     ordered.append(pts);cursor=np.array(pts[-1])
    points=np.asarray([p for path in ordered for p in path]);samples=np.rint(points*2).astype(int);samples[:,0]=np.clip(samples[:,0],0,1999);samples[:,1]=np.clip(samples[:,1],0,1303)
    reveal=max(4.8,m['width'],float(ink_distance[samples[:,1],samples[:,0]].max())+1.5);pad=reveal/2+2
    l=max(0,int(np.floor(points[:,0].min()-pad)));t=max(0,int(np.floor(points[:,1].min()-pad)))
    r=min(1000,int(np.ceil(points[:,0].max()+pad)));b=min(652,int(np.ceil(points[:,1].max()+pad)))
    alpha=ink4[t*SCALE:b*SCALE,l*SCALE:r*SCALE].copy()
    texture=rgb[t*SCALE:b*SCALE,l*SCALE:r*SCALE]
    m['brush_paths']=ordered;m['points']=points.tolist();m['reveal_width']=reveal;subpath_count+=len(ordered)
    if reveal>9 and m['width']<5:m['brush_kind']='medium'
    rgba=np.zeros((*alpha.shape,4),np.uint8);rgba[:,:,:3]=texture;rgba[:,:,3]=alpha
    fn=f'raster-v20/strokes/{i:04d}.png';Image.fromarray(rgba).save(A/fn)
    m.update(id=i,file=fn,bounds=[l,t,r,b],pixel_scale=SCALE,source_id=m0['id']);marks.append(m);continue
   margin=3
   nl=max(0,l-margin);nt=max(0,t-margin);nr=min(1000,r+margin);nb=min(652,b+margin)
   seed=np.zeros(((nb-nt)*SCALE,(nr-nl)*SCALE),np.uint8)
   seed[(t-nt)*SCALE:(b-nt)*SCALE,(l-nl)*SCALE:(r-nl)*SCALE]=alpha
   radius=12 if m['width']<5 else 5
   seed=cv2.dilate(seed,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(radius*2+1,radius*2+1)))
   native=ink4[nt*SCALE:nb*SCALE,nl*SCALE:nr*SCALE]
   alpha=cv2.min(seed,native)
   l,t,r,b=nl,nt,nr,nb;texture=rgb[t*SCALE:b*SCALE,l*SCALE:r*SCALE]
   if m['width']<5:
    detection=cv2.resize(alpha,((r-l)*2,(b-t)*2),interpolation=cv2.INTER_AREA)
    paths=trace_paths((detection>32).astype(np.uint8)*255)
    remaining=[]
    for ln,pts in paths:
     if ln<3:continue
     points=np.asarray(pts,dtype=float)/2+[l,t]
     # Smooth the control motion only. The rendered fine line is still the
     # unchanged high-resolution raster contour, never a fitted vector line.
     if len(points)>3:
      for axis in [0,1]:points[:,axis]=gaussian_filter1d(points[:,axis],.4,mode='nearest')
     remaining.append(points.tolist())
    cursor=np.array(m['points'][0],float);ordered=[]
    while remaining:
     k=min(range(len(remaining)),key=lambda j:min(np.linalg.norm(np.array(remaining[j][0])-cursor),np.linalg.norm(np.array(remaining[j][-1])-cursor)))
     pts=remaining.pop(k)
     if np.linalg.norm(np.array(pts[-1])-cursor)<np.linalg.norm(np.array(pts[0])-cursor):pts.reverse()
     ordered.append(pts);cursor=np.array(pts[-1])
    if ordered:
     m['brush_paths']=ordered;m['points']=[pt for path in ordered for pt in path]
     m['reveal_width']=4.8;subpath_count+=len(ordered)
  rgba=np.zeros((*alpha.shape,4),np.uint8);rgba[:,:,:3]=texture;rgba[:,:,3]=alpha
  fn=f'raster-v20/strokes/{i:04d}.png';Image.fromarray(rgba).save(A/fn)
  m.update(id=i,file=fn,bounds=[l,t,r,b],pixel_scale=SCALE,source_id=m0['id'])
  marks.append(m)
 touchups=finish_washes(marks,regions,groups,wash,rgb)
 new={k:v for k,v in old.items() if k not in ['strokes','vector_paint']}
 new.update(strokes=marks,pixel_scale=SCALE,method='Established 395-pigment color-first choreography on approved high-resolution source pixels; explicit fine-ink pen lifts; no full-region scans or DFS',original='raster-v19/working-reference-4000.png',raster_paint={'version':20,'pixel_scale':SCALE,'working_size':[4000,2608],'reference':'raster-v19/working-reference-4000.png','native_ai_size':[1536,1024],'no_end_fill':True,'choreography_source':'versions/before-raster-v19/painting.json','pigment_specific_washes':True,'disconnected_ink_pen_lifts':True})
 (A/'painting.json').write_text(json.dumps(new,ensure_ascii=False,separators=(',',':')))
 ep=json.loads((E/'episode.json').read_text());ep.update(player_revision='raster-v20-review',player_only=True,review_status='awaiting-user');(E/'episode.json').write_text(json.dumps(ep,ensure_ascii=False,indent=2)+'\n')
 report={'marks':len(marks),'original_order_and_timing_unchanged':all(all(m[k]==o[k] for k in ['start','end','element','phase']) for m,o in zip(marks,old['strokes'])),'ink_subpaths':subpath_count,'local_wash_touchup_passes':touchups,'approved_base_unchanged':True,'MP4_created':False}
 (O/'build-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)

if __name__=='__main__':main()

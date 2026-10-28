"""Convert editable pigment masks to subpixel SVG curves, preserving semantic order/timing.
Fine ink is reconstructed as separate continuous centerlines, never a polyline joining unrelated fragments.
This only creates editable vector assets and does not export MP4s.
"""
import argparse,json,math,shutil
from pathlib import Path
import numpy as np,cv2
from scipy.ndimage import gaussian_filter1d
from PIL import Image
from trace_art import trace_paths
P=Path(__file__).resolve().parents[1]
def fmt(n):return f'{n:.3f}'.rstrip('0').rstrip('.')
def curve(points,closed=False):
 pts=np.asarray(points,dtype=float)
 if len(pts)<2:return ''
 if len(pts)>4:
  pts=gaussian_filter1d(pts,sigma=.65 if not closed else .85,axis=0,mode='wrap' if closed else 'nearest')
  pts=cv2.approxPolyDP(pts.astype(np.float32).reshape(-1,1,2),.24 if not closed else .38,closed).reshape(-1,2).astype(float)
 n=len(pts)
 if n<2:return ''
 d=f'M{fmt(pts[0,0])},{fmt(pts[0,1])}'
 for i in range(n if closed else n-1):
  p0=pts[(i-1)%n] if closed or i else pts[i];p1=pts[i];p2=pts[(i+1)%n];p3=pts[(i+2)%n] if closed or i+2<n else p2
  c1=p1+(p2-p0)/6;c2=p2-(p3-p1)/6
  # Limit handles so short raster-grid fluctuations cannot produce large overshoots.
  dist=np.linalg.norm(p2-p1)
  for anchor,control in [(p1,c1),(p2,c2)]:
   delta=control-anchor;length=np.linalg.norm(delta)
   if length>dist*.42:control[:]=anchor+delta*dist*.42/length
  d+=f'C{fmt(c1[0])},{fmt(c1[1])} {fmt(c2[0])},{fmt(c2[1])} {fmt(p2[0])},{fmt(p2[1])}'
 if closed:d+='Z'
 return d

def build(ep):
 E=P/'episodes'/ep;A=E/'art';meta=A/'painting.json';data=json.loads(meta.read_text());backup=E/'versions/before-vector-v17';backup.mkdir(parents=True,exist_ok=True)
 if not (backup/'painting.json').exists():shutil.copy2(meta,backup/'painting.json')
 geometries=[];svgs=[];fine_before=fine_after=0
 for m in data['strokes']:
  im=Image.open(A/m['file']).convert('RGBA');pixels=np.array(im);alpha=pixels[:,:,3];binary=(alpha>24).astype(np.uint8)*255;l,t,r,b=m['bounds'];ys,xs=np.nonzero(binary)
  if not len(xs):geometries.append(None);continue
  color=tuple(int(x) for x in pixels[ys[0],xs[0],:3]);opacity=float(np.median(alpha[binary>0]))/255;fill='#'+''.join(f'{v:02x}' for v in color)
  g={'color':fill,'alpha':round(opacity,5),'fill':'','paths':[],'width':0,'kind':'fill','source_bounds':m['bounds']}
  if m['width']<5 and m['phase']=='ink' and m['element']!='sketch':
   # A one-source-pixel hole is raster damage, not a deliberate pen lift.
   padded=cv2.copyMakeBorder(binary,3,3,3,3,cv2.BORDER_CONSTANT,value=0);closed=cv2.morphologyEx(padded,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3)))[3:-3,3:-3]
   fine_before+=cv2.connectedComponents(binary)[0]-1;fine_after+=cv2.connectedComponents(closed)[0]-1
   paths=trace_paths(closed);segments=[]
   for length,points in paths:
    points=np.array(points,dtype=float)+[l,t];d=curve(points);segments.append({'d':d,'points':np.round(points,3).tolist(),'length':round(length,4)})
   # Keep isolated small marks such as pupils as smooth shapes rather than square pixels.
   count,labels,stats,centers=cv2.connectedComponentsWithStats(closed)
   dots=[]
   for i in range(1,count):
    if stats[i,cv2.CC_STAT_AREA]<=4:
     x,y=centers[i]+[l,t];rad=.65;dots.append(f'M{fmt(x-rad)},{fmt(y)}a{rad},{rad} 0 1,0 {2*rad},0a{rad},{rad} 0 1,0 {-2*rad},0')
   # Nearest-endpoint ordering preserves the existing brush's local travel without drawing travel lines.
   ordered=[];cursor=np.array(m['points'][0],float)
   while segments:
    i=min(range(len(segments)),key=lambda j:min(np.linalg.norm(np.array(segments[j]['points'][0])-cursor),np.linalg.norm(np.array(segments[j]['points'][-1])-cursor)))
    v=segments.pop(i)
    if np.linalg.norm(np.array(v['points'][-1])-cursor)<np.linalg.norm(np.array(v['points'][0])-cursor):v['points'].reverse();v['d']=curve(v['points'])
    ordered.append(v);cursor=np.array(v['points'][-1])
   g.update(kind='stroke',paths=ordered,fill=''.join(dots),width=1.3)
  else:
   contours,hierarchy=cv2.findContours(binary,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
   g['fill']=''.join(curve(c.reshape(-1,2).astype(float)+[l,t],True) for c in contours if len(c)>=3)
  if not g['fill'] and not g['paths']:
   # A degenerate one-pixel remnant is still represented by a smooth vector dot.
   x=l+float(xs.mean());y=t+float(ys.mean());g['fill']=f'M{fmt(x-.5)},{fmt(y)}a.5,.5 0 1,0 1,0a.5,.5 0 1,0 -1,0'
  geometries.append(g)
  bits=[f'<path d="{g["fill"]}" fill="{fill}" fill-rule="evenodd" stroke="{fill}" stroke-width="1.3" stroke-linejoin="round" opacity="{opacity:.5f}"/>' ] if g['fill'] else []
  bits += [f'<path d="{v["d"]}" fill="none" stroke="{fill}" stroke-width="{g["width"]}" stroke-linecap="round" stroke-linejoin="round" opacity="{opacity:.5f}"/>' for v in g['paths']]
  svgs.append(f'<g id="stroke-{m["id"]}" data-element="{m["element"]}">'+''.join(bits)+'</g>')
 # Reconnect only tiny, collinear gaps in the same semantic/color ink group.
 # This repairs tile-boundary holes without joining unrelated facial features.
 endpoints=[]
 for gi,g in enumerate(geometries):
  if not g or g['kind']!='stroke':continue
  for pi,v in enumerate(g['paths']):
   pts=np.asarray(v['points'],float)
   if len(pts)<2:continue
   for end in [0,-1]:
    a=pts[end];b=pts[min(2,len(pts)-1)] if end==0 else pts[max(0,len(pts)-3)];direction=a-b;length=np.linalg.norm(direction)
    if length>.01:endpoints.append((gi,pi,end,a,direction/length))
 candidates=[]
 for i,a in enumerate(endpoints):
  gi,pi,_,position,direction=a
  for j in range(i+1,len(endpoints)):
   gj,pj,_,other,outward=endpoints[j]
   if (gi==gj and pi==pj) or data['strokes'][gi]['element']!=data['strokes'][gj]['element'] or geometries[gi]['color']!=geometries[gj]['color']:continue
   delta=other-position;distance=np.linalg.norm(delta)
   if not .7<distance<=3.6:continue
   unit=delta/distance;aa=float(np.dot(direction,unit));bb=float(np.dot(outward,-unit))
   if aa>.86 and bb>.86:candidates.append((distance+(2-aa-bb),i,j))
 used=set();bridges=0
 for _,i,j in sorted(candidates):
  if i in used or j in used:continue
  gi,pi,_,a,da=endpoints[i];gj,pj,_,b,db=endpoints[j];target=max(gi,gj);distance=float(np.linalg.norm(b-a));c1=a+da*distance/3;c2=b+db*distance/3
  d=f'M{fmt(a[0])},{fmt(a[1])}C{fmt(c1[0])},{fmt(c1[1])} {fmt(c2[0])},{fmt(c2[1])} {fmt(b[0])},{fmt(b[1])}'
  geometries[target]['paths'].append({'d':d,'points':[a.tolist(),b.tolist()],'length':distance,'short_gap_bridge':True});used.update([i,j]);bridges+=1
  g=geometries[target];svgs.append(f'<path d="{d}" fill="none" stroke="{g["color"]}" stroke-width="{g["width"]}" stroke-linecap="round" opacity="{g["alpha"]}"/>')
 record={'version':17,'coordinate_size':[1000,652],'rendering':'SVG cubic curves drawn directly in final camera coordinates; no 1000px raster intermediate','minimum_screen_stroke':1.7,'fill_coverage_overlap':1.3,'short_gap_bridges':bridges,'geometries':geometries,'fine_components_before':int(fine_before),'fine_components_after':int(fine_after),'source_order_and_timing_unchanged':True}
 (A/'painting-vector.json').write_text(json.dumps(record,ensure_ascii=False,separators=(',',':')))
 (A/'drawing-vector.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 652"><rect width="1000" height="652" fill="#f8f5ea"/>'+''.join(svgs)+'</svg>')
 # Preserve more detail for the final reference dissolve too; same layout coordinates, native source pixels.
 original=Image.open(A/'original-clean.png').convert('RGB');scale=min(928/original.width,604/original.height);w=round(original.width*scale);h=round(original.height*scale);plate=Image.new('RGB',(2000,1304),(248,245,234));plate.paste(original.resize((w*2,h*2),Image.Resampling.LANCZOS),((1000-w),(652-h)));plate.save(A/'original-layout-hires.png')
 data['vector_paint']={'file':'painting-vector.json','svg':'drawing-vector.svg','revision':17,'reference':'original-layout-hires.png'};meta.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
 report={'episode':ep,'marks':len(data['strokes']),'vector_fills':sum(v['kind']=='fill' for v in geometries if v),'vector_ink_marks':sum(v['kind']=='stroke' for v in geometries if v),'fine_components_before':int(fine_before),'fine_components_after':int(fine_after),'short_gap_bridges':bridges,'source_images_preserved':True,'stroke_timing_preserved':True}
 (E/'qa/vector-v17.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('episodes',nargs='*',default=['ep03']);args=parser.parse_args()
 for ep in args.episodes:build(ep)

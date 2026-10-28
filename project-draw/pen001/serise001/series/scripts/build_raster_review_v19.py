"""EP06 review only: photographic pigment rasters revealed along brush routes.

No SVG contours, quantized colors, finished underlay or MP4 creation. The AI
edit is native 1536x1024. The working plate and pigment assets are 4000x2608.
"""
from pathlib import Path
import argparse, json, math, shutil
import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d
from trace_art import trace_paths

P = Path(__file__).resolve().parents[1]
E = P/'episodes/ep06'
A = E/'art'
O = A/'raster-v19'
SCALE = 4
W,H = 1000,652
TW,TH = W*2,H*2
PAPER = (248,245,234)

def mask(poly):
    out = np.zeros((TH,TW),np.uint8)
    if poly: cv2.fillPoly(out,[np.rint(np.array(poly)*2).astype(np.int32)],255)
    return out

def length(points):
    return sum(math.dist(a,b) for a,b in zip(points,points[1:]))

def scan_routes(area,width):
    routes=[]
    step=max(2,round(width*.68*2))
    yy,xx=np.nonzero(area)
    if not len(xx):return []
    # Separate row runs, so the brush lifts instead of crossing empty paper.
    rowlist=list(range(max(0,int(yy.min())-step//3),int(yy.max())+step//2+1,step))
    for i,y in enumerate(rowlist):
        y=min(TH-1,y)
        band=area[max(0,y-step//2):min(TH,y+step//2+1)].max(axis=0)
        xs=np.flatnonzero(band)
        if not len(xs):continue
        splits=np.split(xs,np.where(np.diff(xs)>max(3,width*.4*2))[0]+1)
        if i%2:splits=splits[::-1]
        for run in splits:
            if len(run)<2:continue
            x0=max(0,int(run[0])-2);x1=min(TW-1,int(run[-1])+2)
            # One manageable sweep, rather than a tiny tiled color polygon.
            pieces=max(1,math.ceil((x1-x0)/2/(270 if width>20 else 160)))
            edges=np.linspace(x0,x1,pieces+1)
            for j in range(pieces):
                a,b=edges[j:j+2]
                if i%2:a,b=b,a
                routes.append([[float(a)/2,y/2],[float((a+b)/2)/2,y/2],[float(b)/2,y/2]])
    return routes

def brush_support(points,width):
    m=np.zeros((TH,TW),np.uint8)
    pts=np.rint(np.array(points)*2).astype(np.int32)
    thickness=max(2,round(width*2*.96))
    cv2.polylines(m,[pts],False,255,thickness,cv2.LINE_AA)
    for p in [pts[0],pts[-1]]:cv2.circle(m,tuple(p),thickness//2,255,-1,cv2.LINE_AA)
    return m

def continuous_routes(paths):
    """Join touching skeleton branches with real retracing, never gap chords."""
    segments=[pts for ln,pts in paths if ln>=5]
    endpoints={}
    for i,pts in enumerate(segments):
        for p in [pts[0],pts[-1]]:endpoints.setdefault(tuple(p),[]).append(i)
    visited=set();routes=[]
    for seed in sorted(range(len(segments)),key=lambda i:-length(segments[i])):
        if seed in visited:continue
        first=segments[seed];visited.add(seed);route=list(first)
        stack=[(tuple(first[0]),None),(tuple(first[-1]),first)]
        while stack:
            node,back=stack[-1]
            available=[i for i in endpoints.get(node,[]) if i not in visited]
            if available:
                direction=np.array(route[-1])-np.array(route[-2])
                def score(i):
                    pts=segments[i] if tuple(segments[i][0])==node else segments[i][::-1]
                    d=np.array(pts[1])-np.array(pts[0]);return np.dot(d,direction)/max(1,np.linalg.norm(d)*np.linalg.norm(direction))
                i=max(available,key=score);visited.add(i)
                pts=segments[i] if tuple(segments[i][0])==node else segments[i][::-1]
                route.extend(pts[1:]);stack.append((tuple(pts[-1]),pts))
            else:
                stack.pop()
                if back and stack:route.extend(back[-2::-1])
        if len(route)>1:routes.append(route)
    return routes

def main(source):
    O.mkdir(parents=True,exist_ok=True)
    backup=E/'versions/before-raster-v19';backup.mkdir(parents=True,exist_ok=True)
    for f in ['art/painting.json','episode.json','config/player-settings.json']:
        dst=backup/Path(f).name
        if not dst.exists():shutil.copy2(E/f,dst)
    shutil.copy2(source,O/'imagegen-base-1536.png')
    original=Image.open(source).convert('RGB')
    im=original.copy();im.thumbnail((928*SCALE,604*SCALE),Image.Resampling.LANCZOS)
    # Pillow.thumbnail never enlarges: explicitly create the supersampled plate.
    ratio=min(928/original.width,604/original.height)
    size=(round(original.width*ratio*SCALE),round(original.height*ratio*SCALE))
    im=original.resize(size,Image.Resampling.LANCZOS)
    plate=Image.new('RGB',(W*SCALE,H*SCALE),PAPER)
    offset=((W*SCALE-size[0])//2,(H*SCALE-size[1])//2);plate.paste(im,offset)
    plate.save(O/'working-reference-4000.png')
    rgb=np.array(plate.resize((TW,TH),Image.Resampling.LANCZOS))
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    # Detect lines at 2000px, above the old 1000px quantized/traced plate.
    # Masks only direct the brush; all visible contours come from original pixels.
    smooth=cv2.bilateralFilter(gray,9,28,7)
    local=cv2.morphologyEx(smooth,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
    edge=(local.astype(float)-smooth)>22
    dark=(smooth<112)
    ink=(edge|dark).astype(np.uint8)*255
    count,labels,stats,_=cv2.connectedComponentsWithStats(ink)
    clean=np.zeros_like(ink)
    for i in range(1,count):
        if stats[i,cv2.CC_STAT_AREA]>=10:clean[labels==i]=255
    clean=cv2.morphologyEx(clean,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    ink=cv2.dilate(clean,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
    under=cv2.inpaint(rgb,ink,5,cv2.INPAINT_TELEA)
    under=cv2.bilateralFilter(under,5,12,12)
    Image.fromarray(under).resize((W*SCALE,H*SCALE),Image.Resampling.LANCZOS).save(O/'wash-working-4000.png')

    semantic=json.loads((P/'production/scene-masks.json').read_text())['ep06']
    owner=np.zeros((TH,TW),np.int16)
    for i in reversed(range(len(semantic['people']))):owner[mask(semantic['people'][i]['poly'])>0]=i+1
    regions=np.zeros_like(owner);groups=[];yy=np.indices((TH,TW))[0]
    old=json.loads((backup/'painting.json').read_text())
    for i,person in enumerate(semantic['people']):
        own=owner==i+1;face=own&(mask(person['head'])>0);legs=own&(yy>=person['legs']*2)&~face
        for hand in person['hands']:legs&=mask(hand)==0
        body=own&~face&~legs
        for part,area in [('face',face),('body',body),('legs',legs)]:
            key=person['key']+'_'+part;ident=len(groups)+1;regions[area]=ident
            oldmarks=[m for m in old['strokes'] if m['element']==key]
            groups.append((ident,key,old['group_labels'][key],min(m['start'] for m in oldmarks),max(m.get('move_end',m['end']) for m in oldmarks)))
    objects=np.zeros((TH,TW),np.uint8)
    for poly in semantic['objects']:objects|=mask(poly)
    ident=len(groups)+1;regions[(objects>0)&(owner==0)]=ident
    for ident,key in [(ident,'objects'),(0,'background')]:
        oldmarks=[m for m in old['strokes'] if m['element']==key]
        groups.append((ident,key,old['group_labels'][key],min(m['start'] for m in oldmarks),max(m.get('move_end',m['end']) for m in oldmarks)))
    under4=np.array(Image.fromarray(under).resize((W*SCALE,H*SCALE),Image.Resampling.LANCZOS))
    rgb4=np.array(plate)
    out=O/'strokes';out.mkdir(exist_ok=True)
    for file in out.glob('*.png'):file.unlink()
    marks=[];group_reports=[]
    for ident,key,label,start,end in groups:
        region=(regions==ident).astype(np.uint8)*255
        if key=='background':
            content=np.zeros_like(region);content[round(offset[1]/2):round((offset[1]+size[1])/2),round(offset[0]/2):round((offset[0]+size[0])/2)]=255
            region&=content
        candidates=[]
        width=10 if key.endswith('_face') else 20 if key.endswith(('_body','_legs')) else 30
        for pts in scan_routes(region,width):candidates.append(('wash',pts,width))
        linearea=clean & region
        # Very dark hair/large pigment marks use a real broad sweep, then details.
        thick=cv2.morphologyEx(linearea,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
        for pts in scan_routes(thick,7):candidates.append(('ink',pts,7))
        thin=linearea & cv2.bitwise_not(cv2.erode(thick,np.ones((3,3),np.uint8)))
        paths=continuous_routes(trace_paths(thin))
        paths.sort(key=lambda x:-length(x))
        for pts in paths:
            points=np.array(pts,dtype=float)/2
            # Routes can be smoothed: they reveal pixels, never redraw ink shapes.
            if len(points)>3:
                for axis in [0,1]:points[:,axis]=gaussian_filter1d(points[:,axis],.45,mode='nearest')
            candidates.append(('ink',points.tolist(),4.2))
        local=[];cover_wash=np.zeros_like(region);cover_ink=np.zeros_like(region)
        for phase,pts,width in candidates:
            support=brush_support(pts,width)
            allowed=region if phase=='wash' else cv2.bitwise_and(region,ink)
            alpha=cv2.bitwise_and(support,allowed)
            cover=cover_wash if phase=='wash' else cover_ink
            # Repeated image pixels are the same real pigment; no palette flattening.
            if np.count_nonzero((alpha>0)&(cover==0)) < (5 if phase=='ink' else 20):continue
            cover|=alpha
            ys,xs=np.nonzero(alpha)
            if not len(xs):continue
            l=max(0,int(xs.min())//2-2);t=max(0,int(ys.min())//2-2)
            r=min(W,math.ceil((int(xs.max())+1)/2)+2);b=min(H,math.ceil((int(ys.max())+1)/2)+2)
            tex=under4 if phase=='wash' else rgb4
            rgba=np.zeros(((b-t)*SCALE,(r-l)*SCALE,4),np.uint8)
            rgba[:,:,:3]=tex[t*SCALE:b*SCALE,l*SCALE:r*SCALE]
            ap=Image.fromarray(alpha[t*2:b*2,l*2:r*2]).resize(((r-l)*SCALE,(b-t)*SCALE),Image.Resampling.BILINEAR)
            rgba[:,:,3]=np.array(ap)
            fn=f'raster-v19/strokes/{len(marks)+len(local):04d}.png';Image.fromarray(rgba).save(A/fn)
            cost=max(5,length(pts))**.65*(1.35 if phase=='ink' else 1)
            local.append(dict(id=len(marks)+len(local),file=fn,bounds=[l,t,r,b],points=pts,width=width,phase=phase,element=key,label=label,cost=cost,pixel_scale=SCALE))
        weight=sum(m['cost'] for m in local);cursor=start
        for m in local:
            allocation=(end-start)*m['cost']/weight
            m.update(start=cursor,end=cursor+allocation*.97,move_end=cursor+allocation)
            cursor+=allocation
        marks.extend(local)
        group_reports.append({'group':key,'strokes':len(local),'wash_coverage':round(float(np.count_nonzero(cover_wash))/max(1,np.count_nonzero(region)),5),'ink_coverage':round(float(np.count_nonzero(cover_ink&ink))/max(1,np.count_nonzero(region&ink)),5)})
        print(key,len(local),flush=True)
    data={k:v for k,v in old.items() if k not in ['strokes','vector_paint']}
    data.update(strokes=marks,pixel_scale=SCALE,method='High resolution source-pixel raster pigments, continuous brush-tip masks, no SVG geometry, no completion fill',original='raster-v19/working-reference-4000.png',raster_paint={'version':19,'pixel_scale':SCALE,'working_size':[4000,2608],'reference':'raster-v19/working-reference-4000.png','native_ai_size':list(original.size),'no_end_fill':True})
    (A/'painting.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
    e=json.loads((E/'episode.json').read_text());e['player_revision']='raster-v19-review';e['player_only']=True;e['review_status']='awaiting-user';(E/'episode.json').write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
    report={'episode':'ep06','native_ai_size':list(original.size),'working_size':[4000,2608],'strokes':len(marks),'groups':group_reports,'MP4_created':False,'SVG_rendering':False,'saved_settings_unchanged':True}
    (O/'build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('source',type=Path);main(parser.parse_args().source)

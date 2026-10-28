"""Preserve the approved bitmap and map its pixels to four authored strokes.

The map controls reveal time only: no replacement font, traced outline or
generated calligraphy is substituted for the user's approved image.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'episodes/ep02/review/tj-v27'

STROKES=[
 dict(name='T · 힘 있는 가로획',start=.6,end=1.75,
      nodes=[[151,291,5],[109,373,95],[127,435,185],[290,366,170],[506,279,160],[700,206,135],[847,130,8]]),
 dict(name='T · 길게 내리는 세로획',start=1.95,end=3.15,
      nodes=[[448,370,115],[411,508,155],[357,731,150],[302,951,140],[278,1092,80],[281,1250,12],[291,1320,1]]),
 dict(name='j · 연결과 긴 마무리',start=3.38,end=5.55,
      nodes=[[389,884,15],[430,806,18],[501,740,10],[564,683,13],[612,637,30],[659,626,84],[634,810,80],[648,1002,115],[687,1191,160],[649,1336,195],[555,1442,175],[434,1486,125],[329,1458,64],[262,1380,2]]),
 dict(name='j · 점과 붓 들기',start=5.83,end=6.3,
      nodes=[[596,572,3],[625,531,72],[680,482,103],[724,445,2]]),
]


def sample(nodes):
    nodes=np.asarray(nodes,float);points=[]
    for i in range(len(nodes)-1):
        a=nodes[max(0,i-1)];b=nodes[i];c=nodes[i+1];d=nodes[min(len(nodes)-1,i+2)]
        for t in np.linspace(0,1,max(8,int(np.linalg.norm(c[:2]-b[:2])/1.6)),endpoint=False):
            xy=.5*((2*b[:2])+(-a[:2]+c[:2])*t+(2*a[:2]-5*b[:2]+4*c[:2]-d[:2])*t*t+(-a[:2]+3*b[:2]-3*c[:2]+d[:2])*t*t*t)
            points.append([*xy,b[2]+(c[2]-b[2])*t])
    return np.array(points+[nodes[-1].tolist()])


def main():
    image=Image.open(OUT/'approved.png').convert('RGB');width,height=image.size
    yy,xx=np.mgrid[:height,:width];pixels=np.column_stack((xx.ravel(),yy.ravel()))
    best=np.full(len(pixels),np.inf);born=np.zeros(len(pixels),np.uint16);owners=np.zeros(len(pixels),np.uint8)
    strokes=[]
    for i,stroke in enumerate(STROKES):
        pts=sample(stroke['nodes']);distance=np.r_[0,np.cumsum(np.linalg.norm(np.diff(pts[:,:2],axis=0),axis=1))]
        progress=distance/distance[-1]
        # Normalize by the local contact width to separate the T crossing from
        # its stem and the fine connecting line from the broad j descender.
        dist,index=cKDTree(pts[:,:2]).query(pixels)
        score=dist/np.maximum(10,pts[index,2]/2+6)
        if i==3:
            dot=(pixels[:,0]>550)&(pixels[:,0]<765)&(pixels[:,1]>400)&(pixels[:,1]<600)
            score=np.where(dot,score*.15,np.inf)
        else:
            dot=(pixels[:,0]>568)&(pixels[:,0]<756)&(pixels[:,1]>410)&(pixels[:,1]<600)
            score=np.where(dot,np.inf,score)
        if i<2:
            # All ink in this lower-right area belongs to j, not the nearby
            # broad T stem. It must wait for the connecting stroke's brush.
            score=np.where((pixels[:,0]>=450)&(pixels[:,1]>=600),np.inf,score)
        take=score<best;best[take]=score[take];owners[take]=i
        birth=stroke['start']+(stroke['end']-stroke['start'])*progress[index]
        born[take]=np.rint(birth[take]*1000).astype(np.uint16)
        samples=[dict(x=round(x,3),y=round(y,3),width=round(w,3),u=round(float(u),6)) for (x,y,w),u in zip(pts,progress)]
        strokes.append({k:v for k,v in stroke.items() if k!='nodes'}|dict(points=samples))
    birth=np.zeros((height,width,4),np.uint8)
    birth[:,:,0]=(born.reshape(height,width)&255).astype(np.uint8)
    birth[:,:,1]=(born.reshape(height,width)>>8).astype(np.uint8);birth[:,:,3]=255
    Image.fromarray(birth).save(OUT/'birth.png')
    plan=dict(width=width,height=height,duration=8.4,write_end=6.3,strokes=strokes,
              brush=dict(shaft_cm=20,bristles_cm=5.5,diameter_mm=11),
              approved_sha256=hashlib.sha256((OUT/'approved.png').read_bytes()).hexdigest())
    (OUT/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({k:v for k,v in plan.items() if k!='strokes'},ensure_ascii=False))


if __name__=='__main__':main()

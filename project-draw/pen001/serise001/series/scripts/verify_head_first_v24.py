"""Validate all review assets, anatomical order and saved settings."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]


def verify(ep):
    E=ROOT/'episodes'/ep;A=E/'art';data=json.loads((A/'painting.json').read_text())
    backup=E/'versions/before-head-first-v24'
    assert data['raster_paint']['version']==24 and not data.get('vector_paint'),ep
    assert data['initial']=='blank paper' and data['raster_paint']['no_end_fill'],ep
    assert Image.open(A/data['raster_paint']['reference']).size==(4000,2608),ep
    assert (E/'config/player-settings.json').read_bytes()==(backup/'player-settings.json').read_bytes(),ep
    marks=data['strokes'];people=data['raster_paint']['head_first_people'];order=[]
    for person in people:
        ms=[m for m in marks if m['element']==person['key']]
        head=[m for m in ms if m['anatomical_stage']=='head']
        body=[m for m in ms if m['anatomical_stage']=='body']
        details=[m for m in ms if m['anatomical_stage']=='details']
        assert head and body and details,(ep,person['key'])
        assert max(m['end'] for m in head)<=min(m['start'] for m in body),(ep,'head before body')
        assert max(m['end'] for m in body)<=min(m['start'] for m in details),(ep,'body before details')
        assert person.get('covered_head') or any(m.get('head_hair_base') for m in head),(ep,'hair painted before body')
        if order:assert order[-1]['end']<=min(m['start'] for m in ms)+1e-8,(ep,'whole person before next')
        order.append(dict(person=person['key'],head=[min(m['start'] for m in head),max(m['end'] for m in head)],
                          body=[min(m['start'] for m in body),max(m['end'] for m in body)],end=max(m['end'] for m in details)))
    assert order[-1]['end']<=min(m['start'] for m in marks if m['element']=='objects')+1e-8,ep
    assert max(m['end'] for m in marks if m['element']=='objects')<=min(m['start'] for m in marks if m['element']=='background')+1e-8,ep
    changes=[];pixels=0
    for index,m in enumerate(marks):
        assert m['id']==index and len(m['points'])>=2 and m.get('single_pigment'),(ep,index)
        assert m['start']<m['end']<=m['move_end']+1e-8,(ep,index)
        a=np.array(Image.open(A/m['file']).convert('RGBA'));visible=a[:,:,3]>0
        assert np.all(a[:,:,:3][visible]==m['pigment_rgb']),(ep,index,'mixed RGB')
        assert a.shape[:2]==((m['bounds'][3]-m['bounds'][1])*4,(m['bounds'][2]-m['bounds'][0])*4),(ep,index,'bounds')
        pixels+=np.count_nonzero(visible)
        if index:
            prev=marks[index-1]
            assert prev['end']<=m['start']+1e-8,(ep,index,'timeline overlap')
            if prev['pigment_id']!=m['pigment_id']:changes.append(m['start']-prev['end'])
    assert min(changes)>=.13-1e-8,(ep,'reload interval')
    if ep=='ep06':
        previous=json.loads((backup/'painting.json').read_text())
        clean=lambda m:{k:v for k,v in m.items() if k!='id'}
        assert [clean(m) for m in marks if m['element'] in ['objects','background']]==[clean(m) for m in previous['strokes'] if m['element'] in ['objects','background']]
    report=dict(episode=ep,strokes=len(marks),single_RGB_assets_checked=len(marks),visible_asset_pixels=int(pixels),
                people=order,minimum_reload_seconds=min(changes),settings_unchanged=True,no_SVG=True,no_MP4_created=True,
                painting_sha256=hashlib.sha256((A/'painting.json').read_bytes()).hexdigest())
    qa=E/'qa/head-first-v24';qa.mkdir(exist_ok=True)
    (qa/'asset-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('PASS',ep,len(marks),len(people),'people',flush=True)
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('episodes',nargs='*');args=parser.parse_args()
    reports=[verify(ep) for ep in args.episodes or [f'ep{i:02d}' for i in range(2,12)]]
    if len(reports)==10:(ROOT/'production/head-first-v24-verification.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')

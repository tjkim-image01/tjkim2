"""Inspect final cover typography and a centered 3:4 thumbnail crop; never edits the assets."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
P=Path(__file__).resolve().parents[1]
Q=P/'production/qa-cover-v18';Q.mkdir(exist_ok=True)
results=[]
for n in range(2,12):
 E=P/f'episodes/ep{n:02d}';folder=E/'art/covers-v18'
 sheet=Image.new('RGB',(810,888),'#e6e1d3');draw=ImageDraw.Draw(sheet)
 for col,lang in enumerate(['ko','en','ja']):
  im=Image.open(folder/f'{lang}.png').convert('RGB');assert im.size==(1080,1920)
  a=np.array(im);dark=np.all(a<45,axis=2);rows=np.where(dark[:850].sum(axis=1)>30)[0]
  top=int(rows[0]);assert top>=250,(E.name,lang,top)
  results.append({'episode':E.name,'language':lang,'size':[1080,1920],'main_title_top':top,'top_crop_240_clear':True})
  small=im.copy();small.thumbnail((270,480));sheet.paste(small,(col*270,24))
  draw.text((col*270+8,5),f'{lang.upper()}  top={top}px',fill='#222')
  crop=im.crop((0,240,1080,1680));crop.thumbnail((270,360));sheet.paste(crop,(col*270,528))
  draw.text((col*270+8,507),'Centered 3:4 preview',fill='#222')
 sheet.save(Q/f'{E.name}-covers.jpg',quality=95)
(Q/'layout-report.json').write_text(json.dumps({'ok':True,'covers':results,'count':len(results)},ensure_ascii=False,indent=2)+'\n')
print('ALL_30_COVER_LAYOUTS_PASSED',min(r['main_title_top'] for r in results),flush=True)

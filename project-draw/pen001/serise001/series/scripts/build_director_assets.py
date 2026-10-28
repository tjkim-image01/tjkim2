"""Compile native 3D brush sprites and semantic cameras for the player only."""
from pathlib import Path
from PIL import Image
import json,hashlib
P=Path(__file__).resolve().parents[1];E=P/'episodes/ep02';A=E/'art/brush-v4'
def camera_box(ms,face=False):
 l=min(m['bounds'][0] for m in ms);t=min(m['bounds'][1] for m in ms);r=max(m['bounds'][2] for m in ms);b=max(m['bounds'][3] for m in ms);cx=(l+r)/2;cy=(t+b)/2
 w=min(815,max(210 if face else 300,(r-l)*(1.65 if face else 1.2),(b-t)*1.25*(1.45 if face else 1.18)));h=w/1.25;cx=max(w/2,min(1000-w/2,cx));cy=max(h/2,min(652-h/2,cy))
 return [round(cx-w/2,3),round(cy-h/2,3),round(cx+w/2,3),round(cy+h/2,3)]
def main():
 data=json.loads((E/'art/painting.json').read_text());shots=[];meta={}
 for group in data['group_order']:
  ms=[m for m in data['strokes'] if m['element']==group];start=min(m['start'] for m in ms);end=max(m['move_end'] for m in ms)
  if group.endswith('_body'):ms=[m for m in data['strokes'] if m['element'].rsplit('_',1)[0]==group.rsplit('_',1)[0]]
  box=[0,0,1000,652] if group=='background' else camera_box(ms,group.endswith('_face'));shots.append(dict(element=group,start=start,end=end,box=box,zoom=round(1000/(box[2]-box[0]),2)))
 for kind,label in [('fine','세필'),('medium','중필'),('large','대필'),('flat','평붓')]:
  files=[A/kind/f'{i:03d}.png' for i in range(96)];assert all(f.exists() for f in files);unique=len({hashlib.sha256(f.read_bytes()).hexdigest() for f in files});assert unique==96
  atlas=Image.new('RGBA',(2304,2304))
  for i,f in enumerate(files):atlas.alpha_composite(Image.open(f).convert('RGBA').resize((192,288),Image.Resampling.LANCZOS),((i%12)*192,(i//12)*288))
  dest=A/f'{kind}-atlas.png';tmp=dest.with_suffix('.tmp');atlas.save(tmp,format='PNG',optimize=True);tmp.replace(dest)
  meta[kind]=dict(label=label,frames=96,unique_frames=unique,atlas=dest.name,width=192,height=288,columns=12,rows=8,anchor=[62.4,253.2])
 (A/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 e=json.loads((E/'episode.json').read_text());e.update(player_only=True,player_revision='director-brush-soak-v4',player_director=dict(intro_duration=4,shots=shots,brush_types=meta,brush_frames=96,viewport=[40,376,1000,800],ink_bleed=.45));(E/'episode.json').write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
 print('PLAYER_ASSETS_READY; no MP4 touched')
if __name__=='__main__':main()

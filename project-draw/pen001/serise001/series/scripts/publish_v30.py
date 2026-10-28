"""Link only validated local v30 outputs, then build three fresh download bundles."""
from pathlib import Path
import json,time,hashlib,importlib.util,shutil
ROOT=Path(__file__).resolve().parents[1]
def write(p,d):
 tmp=p.with_suffix('.v30.tmp');tmp.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');tmp.replace(p)
def main():
 manifest=ROOT/'manifest.json';backup=ROOT/'production/v30/before/manifest.json'
 if not backup.exists():shutil.copy2(manifest,backup)
 while True:
  rows=json.loads(manifest.read_text());count=0
  for row in rows:
   ep=row['id'];E=ROOT/'episodes'/ep;info=json.loads((E/'episode.json').read_text())
   row['drawing_order']=info['drawing_order'];row['player_revision']='raster-v30';row['player_only']=False;row['player_duration']=66
   for lang in ['ko','en','ja']:
    p=E/f'output/v30/{lang}/manifest.json'
    if not p.exists():continue
    d=json.loads(p.read_text());assert d['full_decode'] and d['frames']==2025 and d['seconds']==67.5
    video=E/f'output/{ep}-short-{lang}-v30-cover.mp4';assert video.is_file() and hashlib.sha256(video.read_bytes()).hexdigest()==d['sha256']
    edition=row['editions'][lang];edition.update(video=f'../episodes/{ep}/output/{video.name}',ready=True,revision='raster-logo-v30',duration=67.5)
    info['exports'][lang]=video.name;count+=1
   if '-v30-' in row['editions']['ko']['video']:row['video']=row['editions']['ko']['video']
   write(E/'episode.json',info)
  write(manifest,rows)
  progress=dict(verified_editions=count,total=30,public_deploy=False);write(ROOT/'production/v30/catalogue-progress.json',progress)
  if count==30:break
  time.sleep(10)
 # Adapt the established package format; keep old ZIPs. Same 7.5s SRT offset.
 spec=importlib.util.spec_from_file_location('package_v30',ROOT/'scripts/package_series_editions.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 source=(ROOT/'scripts/package_series_editions.py').read_text().replace('_10_v18.zip','_10_v30.zip').replace('localized-cover-v18','raster-logo-v30')
 scope={'__name__':'package_v30','__file__':str(ROOT/'scripts/package_series_editions.py')};exec(compile(source,'package_v30','exec'),scope)
 bundles={lang:scope['package'](lang,rows) for lang in ['ko','en','ja']}
 write(ROOT/'output/bundles.json',bundles)
 # Local archive uses absolute /series URLs. Public t001 source still points at
 # the public v18 release and is preserved until an actual deployment request.
 archive=ROOT.parents[1]/'site/data/collection.json';d=json.loads(archive.read_text())
 b=ROOT/'production/v30/before/collection.json'
 if not b.exists():shutil.copy2(archive,b)
 byid={e['id']:e for e in rows}
 for w in d['works']:
  if w.get('episode') not in byid:continue
  e=byid[w['episode']]
  for lang in ['ko','en','ja']:
   w['editions'][lang]={**e['editions'][lang]}
   for key in ['video','poster']:w['editions'][lang][key]='/series/'+w['editions'][lang][key].removeprefix('../')
 d['bundles']={k:{**v,'url':'/series/'+v['url'].removeprefix('../')} for k,v in bundles.items()};write(archive,d)
 write(ROOT/'production/v30/delivery.json',dict(verified_editions=30,episodes=10,languages=['ko','en','ja'],bundles=bundles,public_deploy=False))
 print('COMPLETE: 30 validated MP4s, 3 bundles, local catalogue',flush=True)
if __name__=='__main__':main()

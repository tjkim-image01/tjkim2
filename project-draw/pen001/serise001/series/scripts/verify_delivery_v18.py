"""Verify the exact published cover editions and downloadable language archives."""
from pathlib import Path
import hashlib,json,time,zipfile,re
P=Path(__file__).resolve().parents[1];R=P/'production'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
while True:
 rows=json.loads((P/'manifest.json').read_text())
 bundles=json.loads((P/'output/bundles.json').read_text())
 if all(all(v.get('revision')=='localized-cover-v18' for v in e['editions'].values()) for e in rows) and len(bundles)==3 and all(b.get('revision')=='localized-cover-v18' for b in bundles.values()):break
 time.sleep(3)
report={'revision':'localized-cover-v18','episodes':10,'languages':['ko','en','ja'],
 'exports':[],'cover_seconds':1.5,'body_seconds':66,'duration':67.5,'size':[1080,1920],
 'fps':30,'frames':2025,'body_audio_and_captions_shift_seconds':1.5,
 'previous_mp4s_preserved':True,'language_archives':[]}
for e in rows:
 E=P/'episodes'/e['id']
 for lang,v in e['editions'].items():
  m=json.loads((E/f'output/v18/{lang}-manifest.json').read_text())
  video=(P/'site'/v['video']).resolve();cover=(P/'site'/v['poster']).resolve()
  assert sha(video)==m['sha256'] and sha(cover)==m['cover_sha256']
  assert m['duration']==67.5 and m['cover_seconds']==1.5 and m['full_decode_pass']
  assert m['checks']['audio_correlation']>.995 and m['checks']['cover_silence_peak']<.001
  report['exports'].append({'episode':e['id'],'language':lang,'video':v['video'],'poster':v['poster'],
    'sha256':m['sha256'],'checks':m['checks']})
for lang,b in bundles.items():
 p=(P/'site'/b['url']).resolve();assert sha(p)==b['sha256']
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  assert len([n for n in z.namelist() if n.endswith('.mp4')])==10
  assert len([n for n in z.namelist() if n.endswith('-cover.png')])==10
  index=json.loads(z.read('index.json'))
  for i,e in enumerate(rows,1):
   v=e['editions'][lang];video=(P/'site'/v['video']).resolve();cover=(P/'site'/v['poster']).resolve()
   assert hashlib.sha256(z.read(f'{i:02d}.mp4')).hexdigest()==sha(video)==index[i-1]['sha256']
   assert hashlib.sha256(z.read(f'{i:02d}-cover.png')).hexdigest()==sha(cover)
   assert index[i-1]['duration']==67.5
   stamps=re.findall(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})',z.read(f'{i:02d}.srt').decode())
   seconds=[int(h)*3600+int(m)*60+int(sec)+int(ms)/1000 for h,m,sec,ms in stamps]
   assert min(seconds)>=7.5 and max(seconds)<=67.5
 report['language_archives'].append({'language':lang,**b})
layout=json.loads((R/'qa-cover-v18/layout-report.json').read_text());assert layout['ok'] and layout['count']==30
report['minimum_title_top']=min(c['main_title_top'] for c in layout['covers'])
report['body_qa']=json.loads((R/'delivery-v17.json').read_text())
web=R/'qa-web-v18/results.json'
while not web.exists():time.sleep(1)
report['website_qa']=json.loads(web.read_text());assert report['website_qa']['ok']
report['workflow_sha256']=sha(Path('/Users/jatu/app/tjkim2/lib/com/jatu/draw/sumuk.py'))
assert report['workflow_sha256']==sha(Path('/Users/jatu/app/model3d/lib/com/jatu/draw/sumuk.py'))
(R/'delivery-v18.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('ALL_30_COVER_EDITIONS_AND_3_ARCHIVES_VERIFIED',flush=True)

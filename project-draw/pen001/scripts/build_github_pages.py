"""Create a curated, server-free Pages export. Private research and production logs are excluded."""
from pathlib import Path
import argparse,json,shutil,re,hashlib,io
from PIL import Image

P=Path(__file__).resolve().parents[1];S=P/'site';SER=P/'serise001/series'
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True);parser.add_argument('--frontend',choices=['t001','legacy'],default='t001');args=parser.parse_args()
O=args.output.absolute();O.mkdir(parents=True,exist_ok=True)
BASE='/pen001';RELEASE='https://github.com/tjkim-image01/pen001/releases/download/v31/'
def copy(src,dst):
 dst=O/dst;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
def write(dst,value):
 dst=O/dst;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_text(value)
def jsread(name):return (O/name).read_text()
def public_paths(value):
 if isinstance(value,str) and value.startswith('/'):return BASE+value
 if isinstance(value,list):return [public_paths(x) for x in value]
 if isinstance(value,dict):return {k:public_paths(v) for k,v in value.items()}
 return value

for name in ['index.html','work.html','archive.js','archive.css']:copy(S/name,Path(name))
shutil.copytree(S/'assets',O/'assets',dirs_exist_ok=True)
for name in ['index.html','work.html']:
 text=jsread(name);text=re.sub(r'((?:href|src)=")/(?!/)',r'\1'+BASE+'/',text);write(name,text)
text=jsread('archive.css');text=re.sub(r"url\((['\"]?)/(?!/)",r'url(\1'+BASE+'/',text);write('archive.css',text)
text=jsread('archive.js').replace('new URL(path,location.origin)',"new URL(path.startsWith('/')&&!path.startsWith('/pen001/')?'/pen001'+path:path,location.origin)")
text=text.replace("fetch('/data/collection.json'","fetch('/pen001/data/collection.json'");write('archive.js',text)
data=public_paths(json.loads((S/'data/collection.json').read_text()))
for lang,b in data['bundles'].items():b['url']=RELEASE+Path(b['url']).name
for work in data['works']:
 for edition in work.get('editions',{}).values():
  edition['video']=RELEASE+Path(edition['video']).name
write('data/collection.json',json.dumps(data,ensure_ascii=False,indent=2)+'\n')

# The watch page and live editor retain their browser rendering; no server APIs are published.
for src in (SER/'site').rglob('*'):
 relative=src.relative_to(SER/'site')
 if not src.is_file():continue
 if src.name.startswith(('review-','render-','bench-','intro-v31','qa-')):continue
 if relative.parts[0]=='tool-render' and src.suffix=='.html':continue
 copy(src,Path('series/site')/relative)
for name in ['approved.png','birth.png','plan.json']:
 copy(SER/'episodes/ep02/review/tj-v27'/name,Path('series/episodes/ep02/review/tj-v27')/name)
for src in (P/'serise001/web/fonts').glob('*'):
 if src.is_file():copy(src,Path('web/fonts')/src.name)
for n in range(1,11):copy(P/f'serise001/research/album-{n}.jpg',Path(f'research/album-{n}.jpg'))
write('research/music-license.md','Music: original Flow Music generation. Intro drums only.\n')
write('series/research/sources.md','# TJ KIM Collection\n\nCollection APKC260507306. Uncho, attributed.\n\nhttps://contents.history.go.kr/collection/level.do?levelId=mp_009\n')
for w in data['works']:
 if not w['episode']:continue
 E=SER/'episodes'/w['episode'];D=Path('series/episodes')/w['episode']
 for name in ['episode.json','config/player-settings.json','audio/captions.json','audio/voice-director.m4a']:
  copy(E/name,D/name)
 info=json.loads((E/'episode.json').read_text());art=json.loads((E/'art/painting.json').read_text())
 if (E/'art/thumb.jpg').exists():copy(E/'art/thumb.jpg',D/'art/thumb.jpg')
 for key in ['file','roll_file','finish_file','jing_file']:
  value=info.get('player_music',{}).get(key)
  if value and (E/'audio'/value).is_file():copy(E/'audio'/value,D/'audio'/value)
 if (E/'audio/music-director.m4a').exists():copy(E/'audio/music-director.m4a',D/'audio/music-director.m4a')
 for name in ['art/painting.json','art/original-clean.png','art/'+(art.get('raster_paint',{}).get('reference') or art.get('vector_paint',{}).get('reference') or 'original-layout.png')]:copy(E/name,D/name)
 if art.get('vector_paint'):copy(E/'art'/art['vector_paint']['file'],D/'art'/art['vector_paint']['file'])
 else:
  for mark in art['strokes']:copy(E/'art'/mark['file'],D/'art'/mark['file'])
 for folder in ['brush-v4','brush-v5']:
  for src in (E/'art'/folder).glob('*.png'):copy(src,D/'art'/folder/src.name)
 for lang in ['ko','en','ja']:
  locale=E/f'locales/{lang}.json'
  if locale.exists():
   copy(locale,D/f'locales/{lang}.json');l=json.loads(locale.read_text());copy(E/l['voice'],D/l['voice'])
  edition=w['editions'][lang]
  for key in ['poster']:
   path=edition[key].removeprefix(BASE+'/series/');copy(SER/path,Path('series')/path)

manifest=json.loads((SER/'manifest.json').read_text())
for e in manifest:
 e.pop('previous_video',None)
 for edition in e.get('editions',{}).values():
  edition['video']=RELEASE+Path(edition['video']).name
 if e.get('video'):e['video']=RELEASE+Path(e['video']).name
write('series/manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
bundles=json.loads((SER/'output/bundles.json').read_text())
for b in bundles.values():b['url']=RELEASE+Path(b['url']).name
write('series/output/bundles.json',json.dumps(bundles,ensure_ascii=False,indent=2)+'\n')
tracks=[]
for src in sorted((SER/'music/tracks').glob('*.json')):
 t=json.loads(src.read_text());copy(P/'serise001'/t['url'].lstrip('/'),Path(t['url'].lstrip('/')));t['url']=BASE+t['url'];tracks.append(t)
write('series/music/library.json',json.dumps({'tracks':tracks},ensure_ascii=False)+'\n')

studio=jsread('series/site/studio.js').replace("const SETTINGS_URL='/api/series-settings?episode='+EPID;","const SETTINGS_URL=EPBASE+'/config/player-settings.json';")
start=studio.index("$('save').onclick=");end=studio.index('\n',start)
studio=studio[:start]+"$('save').onclick=()=>{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));dirty=false;$('saveState').textContent=LOCALE==='en'?'Saved in this browser':LOCALE==='ja'?'このブラウザに保存しました':'이 브라우저에 저장됨';message(LOCALE==='en'?'Settings saved in this browser.':LOCALE==='ja'?'設定をこのブラウザに保存しました。':'설정을 이 브라우저에 저장했습니다.');};"+studio[end:]
write('series/site/studio.js',studio)
music=jsread('series/site/music-library.js')
music=music.replace("fetch('/api/series-music'","fetch('../music/library.json'")
music=music.replace('this.tracks=tracks;if(signature===this.catalogueSignature)', 'tracks.push(...await this.localTracks());this.tracks=tracks;if(signature===this.catalogueSignature)')
# Static uploads use the browser's IndexedDB, so user music never requires a public write API.
start=music.index(' async upload(input)');end=music.index('\n updateStatus()',start)
music=music[:start]+''' async musicDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('pen001-music',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async localTracks(){const db=await this.musicDB();const rows=await new Promise((resolve,reject)=>{const r=db.transaction('tracks').objectStore('tracks').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});db.close();this.localURLs??=new Map();return rows.map(r=>{if(!this.localURLs.has(r.id))this.localURLs.set(r.id,URL.createObjectURL(r.file));const{file,...track}=r;return{...track,url:this.localURLs.get(r.id)}});}
 async upload(input){const file=input.files[0];if(!file)return;input.disabled=true;const status=this.box.querySelector('#musicLibraryStatus');try{if(file.size>50*1024*1024)throw Error('50MB 이하 음원을 선택해 주세요.');const ac=new OfflineAudioContext(1,1,48000),b=await ac.decodeAudioData(await file.arrayBuffer()),samples=b.getChannelData(0),waveform=[];for(let i=0;i<512;i++){let peak=0;for(let k=Math.floor(i*samples.length/512);k<(i+1)*samples.length/512;k+=Math.max(1,Math.floor(samples.length/512/100)))peak=Math.max(peak,Math.abs(samples[k]));waveform.push(peak);}const row={id:'user-'+crypto.randomUUID(),file,title:file.name,mood:'내 음악',duration:b.duration,waveform};const db=await this.musicDB();await new Promise((resolve,reject)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(row);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();this.catalogueSignature=null;await this.refresh();await this.choose(row.id,true);status.textContent='이 브라우저에 음악을 저장했습니다.';}catch(e){status.textContent=e.message;}finally{input.disabled=false;input.value='';}}
'''+music[end:]
write('series/site/music-library.js',music)
# The old collection shell uses network-first paths tailored to localhost; the Pages archive does not register it.
for name in ['series/site/collection.js','series/site/watch.js']:
 text=jsread(name).replace('?revision=localized-cover-v18','?revision=raster-immediate-brush-v31');text=re.sub(r"if\('serviceWorker'in navigator\)navigator\.serviceWorker\.register\('\./sw\.js'\)\.catch\(\(\)=>\{\}\);?",'',text);write(name,text)
write('.nojekyll','')
# JPEG marker surgery removes location/camera metadata without re-encoding image data.
# Keep ICC color information and, when needed, only the orientation tag.
scrubbed=0
for file in O.rglob('*.jpg'):
 raw=file.read_bytes()
 with Image.open(io.BytesIO(raw)) as im:orientation=im.getexif().get(274);has_exif=bool(im.info.get('exif'))
 if not has_exif:continue
 pixel_hash=hashlib.sha256(Image.open(io.BytesIO(raw)).tobytes()).hexdigest()
 output=bytearray(raw[:2]);offset=2
 if orientation not in [None,1]:
  ex=Image.Exif();ex[274]=orientation;body=ex.tobytes();output+=b'\xff\xe1'+(len(body)+2).to_bytes(2,'big')+body
 while offset<len(raw):
  start=offset
  if raw[offset]!=255:raise ValueError('Invalid JPEG marker')
  while raw[offset]==255:offset+=1
  marker=raw[offset];offset+=1
  if marker in [0xda,0xd9]:output+=raw[start:];break
  if marker in [0xd8,0x01] or 0xd0<=marker<=0xd7:output+=raw[start:offset];continue
  length=int.from_bytes(raw[offset:offset+2],'big');end=offset+length
  if marker not in [0xe1,0xed,0xfe]:output+=raw[start:end]
  offset=end
 file.write_bytes(output)
 assert not Image.open(file).getexif().get(34853)
 assert hashlib.sha256(Image.open(file).tobytes()).hexdigest()==pixel_hash
 scrubbed+=1
if args.frontend=='t001':
 # The approved Stitch redesign replaces the homepage. Keep legacy deep links,
 # source photographs, films and browser editors available at their existing URLs.
 frontend=P.parents[1]/'web/t001/dist'
 if not (frontend/'index.html').exists():raise FileNotFoundError('Run npm run build in web/t001 before exporting Pages.')
 shutil.copytree(frontend,O,dirs_exist_ok=True)
files=[f for f in O.rglob('*') if f.is_file()]
assert all(f.stat().st_size<100*1024*1024 for f in files)
size=sum(f.stat().st_size for f in files);assert size<1_000_000_000,size
report={'revision':'v31','files':len(files),'bytes':size,'megabytes':round(size/1e6,1),'base_path':BASE,'frontend':args.frontend,'photos':10,'paintings':17,'videos':30,'live_editors':10,'video_delivery':'GitHub release v31','large_downloads':'GitHub release v31','public_files_only':True,'jpeg_metadata_removed':scrubbed,'decoded_photograph_pixels_unchanged':True}
write('deployment.json',json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report),flush=True)

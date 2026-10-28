"""Archive actual new Flow generations and register each finished song live."""
from pathlib import Path
import sys,json,re,urllib.request,hashlib,subprocess
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P.parent/'scripts'));from music_library import prepare
F=P/'episodes/ep02/audio/flow-music';F.mkdir(parents=True,exist_ok=True)
items=[('7dcdd5b8-d0a2-40b8-88b0-4884c31e8495','flow-calm','종이 위의 바람','고요함 · 가야금과 대금 · 72 BPM'),('eaf8b26f-70af-4b05-b469-3721296072a3','flow-playful','윷판의 웃음','경쾌한 놀이 · 장구·북·피리 · 98 BPM'),('d9c68328-784d-40cb-9a70-c83e0e5c7ae5','flow-night','먹빛의 밤','묵직한 긴장감 · 거문고와 해금 · 66 BPM'),('09405b2c-0ffd-4319-8b28-6a9b5972d8d7','flow-march','붓끝의 행진','웅장한 장단 · 북·장구·징 · 104 BPM')]
for order,(uid,tid,title,mood) in enumerate(items,1):
 url='https://www.flowmusic.app/song/'+uid;html=subprocess.check_output(['curl','-L','--fail','-s',url],text=True);data=json.loads(re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',html).group(1));clip=next(q['state']['data'] for q in data['props']['sdc']['queryClient']['queries'] if q['queryKey'][0]=='clip');assert clip['duration']['status']=='completed',clip['duration']
 (F/(tid+'-metadata.json')).write_text(json.dumps(clip,ensure_ascii=False,indent=2)+'\n');wav=next(u for u in re.findall(r'https[^\s<>"\']+\.wav',html));source=F/(tid+'-source.wav');subprocess.run(['curl','-L','--fail','-s',wav,'-o',str(source)],check=True)
 track=prepare(source,title,mood,tid,order,{'service':'Google Flow Music','song':url,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'instrumentation':'Generation prompt; AI rendition, not an acoustic ensemble recording.','date':'2026-10-25'})
 print('ADDED',title,track['duration'],flush=True)

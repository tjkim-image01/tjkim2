from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import functools,argparse,re,json,uuid
from music_library import tracks as music_tracks,prepare as prepare_music
from urllib.parse import urlsplit,parse_qs
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def settings_file(self):
  parsed=urlsplit(self.path)
  if parsed.path=='/api/settings':return ROOT/'config/player-settings.json'
  if parsed.path=='/api/series-settings':
   episode=parse_qs(parsed.query).get('episode',[''])[0]
   if re.fullmatch(r'ep(0[2-9]|1[01])',episode):return ROOT/'series/episodes'/episode/'config/player-settings.json'
  return None
 def log_message(self,format,*args):
  # Hundreds of tiny pigment requests must not fill the process output pipe.
  with (ROOT/'qa/server.log').open('a') as log:log.write(f'{self.log_date_time_string()} {format%args}\n')
 def json_response(self,data,status=200):
  body=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  if urlsplit(self.path).path=='/api/series-music':self.json_response({'tracks':music_tracks()});return
  if urlsplit(self.path).path in ['/api/settings','/api/series-settings']:
   file=self.settings_file()
   if file is None:self.json_response({'error':'Unknown episode'},400);return
   self.json_response(json.loads(file.read_text()) if file.exists() else {});return
  super().do_GET()
 def do_POST(self):
  origin=self.headers.get('Origin')
  if origin and origin not in getattr(self.server,'allowed_origins',{f'http://127.0.0.1:{self.server.server_port}',f'http://localhost:{self.server.server_port}'}):
   self.json_response({'error':'Origin rejected'},403);return
  if urlsplit(self.path).path=='/api/series-music':
   source=None
   try:
    size=int(self.headers.get('Content-Length','0'))
    if not 0<size<=52428800:raise ValueError('50MB 이하 음악 파일을 선택해 주세요.')
    title=parse_qs(urlsplit(self.path).query).get('filename',['내 음악'])[0]
    folder=ROOT/'series/music/uploads';folder.mkdir(parents=True,exist_ok=True);source=folder/(uuid.uuid4().hex+'.source');source.write_bytes(self.rfile.read(size))
    self.json_response(prepare_music(source,Path(title).stem,'직접 추가한 음악'))
   except Exception as exc:
    if source and source.exists():source.unlink()
    self.json_response({'error':str(exc)},400)
   return
  file=self.settings_file()
  if file is None:self.json_response({'error':'Unknown endpoint'},404);return
  try:
   size=int(self.headers.get('Content-Length','0'))
   if not 0<size<=131072:raise ValueError('Invalid settings size')
   data=json.loads(self.rfile.read(size))
   if not isinstance(data,dict) or data.get('version')!=1:raise ValueError('Invalid settings format')
   limits={'musicStart':(3.8,130),'musicOffset':(0,1800),'effectsVolume':(0,3),'rollVolume':(0,2),'jingVolume':(0,3),'finishVolume':(0,3),'inkBleed':(0,1),'drawDuration':(30,120),'playbackRate':(.5,2),'zoom':(.7,1.6),'panX':(-600,600),'panY':(-600,600),'brushSize':(.5,1.5),'captionSize':(32,72),'volume':(0,1),'fadeSeconds':(1,6),'musicVolume':(0,1)}
   switches=['effectsEnabled','showBrush','showGuides','showWash','showInk','showCaptions','sound','loop','revealOriginal','musicEnabled']
   allowed={'version','camera','brushType','musicTrack','hook','title','byline','captionEdits',*limits,*switches}
   if set(data)-allowed:raise ValueError('Unknown settings')
   for k,(lo,hi) in limits.items():
    if k in data and (type(data[k]) not in (int,float) or not lo<=data[k]<=hi):raise ValueError('Invalid '+k)
   for k in switches:
    if k in data and type(data[k]) is not bool:raise ValueError('Invalid '+k)
   for k in ['hook','title','byline']:
    if k in data and (not isinstance(data[k],str) or len(data[k])>150):raise ValueError('Invalid '+k)
   if data.get('camera','auto') not in ['auto','full','left','front']:raise ValueError('Invalid camera')
   if data.get('brushType','auto') not in ['auto','fine','medium','large','flat']:raise ValueError('Invalid brushType')
   if 'musicTrack' in data and data['musicTrack'] not in {t['id'] for t in music_tracks()}:raise ValueError('Unknown music track')
   edits=data.get('captionEdits',{})
   if not isinstance(edits,dict) or len(edits)>100 or any(not str(k).isdigit() or not isinstance(v,str) or len(v)>90 for k,v in edits.items()):raise ValueError('Invalid captions')
   file.parent.mkdir(exist_ok=True,parents=True);tmp=file.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(file)
   self.json_response({'saved':True})
  except (ValueError,TypeError,json.JSONDecodeError) as exc:self.json_response({'error':str(exc)},400)
 def send_head(self):
  path=self.translate_path(self.path)
  if not Path(path).is_file() or 'Range' not in self.headers:return super().send_head()
  try:
   f=open(path,'rb');size=Path(path).stat().st_size;m=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
   if not m:f.close();return super().send_head()
   start=int(m[1]);end=min(size-1,int(m[2]) if m[2] else size-1)
   if start>=size:f.close();self.send_error(416);return None
   self.send_response(206);self.send_header('Content-Type',self.guess_type(path));self.send_header('Accept-Ranges','bytes');self.send_header('Content-Range',f'bytes {start}-{end}/{size}');self.send_header('Content-Length',str(end-start+1));self.end_headers();f.seek(start);self.range_left=end-start+1;return f
  except OSError:self.send_error(404);return None
 def copyfile(self,source,outputfile):
  left=getattr(self,'range_left',None)
  if left is None:return super().copyfile(source,outputfile)
  try:
   while left>0:
    chunk=source.read(min(left,1024*1024))
    if not chunk:break
    outputfile.write(chunk);left-=len(chunk)
  except (BrokenPipeError,ConnectionResetError):pass
  finally:del self.range_left
 def end_headers(self):self.send_header('Cache-Control','no-cache');super().end_headers()
def main():
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=5184);p.add_argument('--host',default='127.0.0.1');a=p.parse_args();server=ThreadingHTTPServer((a.host,a.port),functools.partial(Handler,directory=str(ROOT)));server.allowed_origins={f'http://127.0.0.1:{a.port}',f'http://localhost:{a.port}',f'http://{a.host}:{a.port}'};print(f'PREVIEW http://{a.host}:{a.port}/series/site/',flush=True);server.serve_forever()

if __name__=='__main__':main()

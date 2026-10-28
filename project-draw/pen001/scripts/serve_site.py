"""PEN001 archive, with the existing drawing player/media/settings routes on the same origin."""
from pathlib import Path
import sys,functools,argparse
from http.server import ThreadingHTTPServer
from urllib.parse import urlsplit,unquote
P=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(P/'serise001/scripts'))
from serve import Handler as SeriesHandler,ROOT as SERIES
SITE=P/'site'
class Handler(SeriesHandler):
 def translate_path(self,path):
  raw=unquote(urlsplit(path).path)
  if raw.startswith(('/series/','/research/','/web/','/audio/','/art/')):return super().translate_path(path)
  candidate=(SITE/raw.lstrip('/')).resolve()
  return str(candidate) if candidate.is_relative_to(SITE) else str(SITE/'not-found')
 def log_message(self,format,*args):
  with (SITE/'qa/server.log').open('a') as f:f.write(f'{self.log_date_time_string()} {format%args}\n')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=5185);parser.add_argument('--host',default='0.0.0.0');a=parser.parse_args()
 server=ThreadingHTTPServer((a.host,a.port),functools.partial(Handler,directory=str(SERIES)))
 server.allowed_origins={f'http://127.0.0.1:{a.port}',f'http://localhost:{a.port}',f'http://192.168.42.192:{a.port}'}
 print(f'PEN001 http://127.0.0.1:{a.port}/',flush=True);server.serve_forever()

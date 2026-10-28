from pathlib import Path
import tempfile,sys,threading,json,urllib.request,urllib.error,functools
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P.parent/'scripts'));import serve,music_library
r={}
with tempfile.TemporaryDirectory(prefix='tjkim-upload-api-') as temp:
 root=Path(temp);(root/'qa').mkdir();serve.ROOT=root;music_library.MUSIC=root/'series/music';music_library.TRACKS=music_library.MUSIC/'tracks'
 server=serve.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(serve.Handler,directory=str(root)));thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();base='http://127.0.0.1:'+str(server.server_port)
 try:
  source=(P/'episodes/ep02/audio/jing-v7.wav').read_bytes();request=urllib.request.Request(base+'/api/series-music?filename=test.wav',data=source,method='POST',headers={'Content-Type':'application/octet-stream'});t=json.load(urllib.request.urlopen(request));assert t['id'].startswith('upload-');assert (root/t['url'].lstrip('/')).exists();assert json.load(urllib.request.urlopen(base+'/api/series-music'))['tracks'][0]['id']==t['id'];r['uploadPersistedAndListed']=True
  req=urllib.request.Request(base+t['url'],headers={'Range':'bytes=0-127'});resp=urllib.request.urlopen(req);assert resp.status==206 and len(resp.read())==128;r['uploadedMusicStreams']=True
  settings={'version':1,'musicTrack':t['id'],'musicStart':7.2,'musicOffset':1.2,'finishVolume':2.4};req=urllib.request.Request(base+'/api/series-settings?episode=ep02',data=json.dumps(settings).encode(),headers={'Content-Type':'application/json'},method='POST');assert json.load(urllib.request.urlopen(req))['saved'];assert json.load(urllib.request.urlopen(base+'/api/series-settings?episode=ep02'))==settings;r['selectionAndStartPersist']=True
  try:urllib.request.urlopen(urllib.request.Request(base+'/api/series-music?filename=invalid.txt',data=b'not audio',method='POST'));raise AssertionError('Invalid accepted')
  except urllib.error.HTTPError as e:assert e.code==400;r['invalidAudioRejected']=True
 finally:server.shutdown();server.server_close()
(P/'episodes/ep02/qa/upload-api-v9.json').write_text(json.dumps(r,indent=2)+'\n');print(r)

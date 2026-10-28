from pathlib import Path
import sys,tempfile,json,subprocess,array,math
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P.parent/'scripts'));import music_library as lib
report={}
# Exercise conversion and catalogue persistence outside the user's live library.
with tempfile.TemporaryDirectory(prefix='tjkim-music-qa-') as folder:
 lib.MUSIC=Path(folder);lib.TRACKS=lib.MUSIC/'tracks';track=lib.prepare(P/'episodes/ep02/audio/jing-v7.wav','업로드 검증','검증','qa-upload');assert lib.tracks()[0]['id']=='qa-upload';assert (lib.MUSIC/'qa-upload-ready.m4a').exists();report['uploadConversionAndCatalogue']=True
 invalid=Path(folder)/'invalid';invalid.write_text('not audio')
 try:lib.prepare(invalid,'invalid','invalid');raise AssertionError('Invalid audio accepted')
 except subprocess.CalledProcessError:report['invalidFileRejected']=True
for p in sorted((P/'../series/music/tracks').resolve().glob('*.json')):
 d=json.loads(p.read_text());wav=(P/'../').resolve()/d['url'].lstrip('/');raw=subprocess.check_output(['ffmpeg','-hide_banner','-loglevel','error','-i',str(wav),'-t','66','-ac','1','-ar','16000','-f','s16le','-']);a=array.array('h');a.frombytes(raw);rms=[20*math.log10(math.sqrt(sum(x*x for x in a[i:i+16000])/max(1,len(a[i:i+16000])))/32768+1e-9) for i in range(0,len(a),16000)];report[d['id']]={'duration':d['duration'],'firstSecondRmsDb':round(rms[0],1),'quietestSecondDb':round(min(rms),1),'secondsBelowMinus50':sum(x < -50 for x in rms)}
(P/'episodes/ep02/qa/music-files-v8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))

"""Build only EP02 player audio from original Flow Music generations; never video."""
from pathlib import Path
import subprocess,json,hashlib
P=Path(__file__).resolve().parents[1];A=P/'episodes/ep02/audio';F=A/'flow-music'
filters='''[0:a]asplit=2[head][tail];
[head]atrim=0:59,asetpts=PTS-STARTPTS[h];
[tail]atrim=166.496:174.496,asetpts=PTS-STARTPTS[t];
[h][t]acrossfade=d=2:c1=tri:c2=tri,afade=t=in:d=0.35,afade=t=out:st=62:d=3,volume=0.35[b];
[b][1:a]sidechaincompress=threshold=0.045:ratio=3:attack=18:release=380:makeup=1[ducked];
[2:a]asplit=3[e1][e2][e3];
[e1]atrim=12.72:14.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.025,afade=t=out:st=1.15:d=0.73,volume=0.14,adelay=20400|20400[s1];
[e2]atrim=38.32:40.6,asetpts=PTS-STARTPTS,afade=t=in:d=0.025,afade=t=out:st=1.5:d=0.78,volume=0.12,adelay=34200|34200[s2];
[e3]atrim=0:5,asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=3:d=2,volume=0.32,adelay=48000|48000[s3];
[ducked][s1][s2][s3]amix=inputs=4:duration=first:normalize=0,alimiter=limit=0.8:level=0[out]'''.replace('\n','')
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(F/'meokbit-jangdan-source.wav'),'-i',str(A/'voice-director.m4a'),'-i',str(F/'percussion-cues-source.wav'),'-filter_complex',filters,'-map','[out]','-t','65','-c:a','aac','-b:a','192k',str(A/'music-director-v5.m4a')],check=True)
metadata={'created_on':'2026-10-25','service':'Google Flow Music','account_display':'MidnightTrailer','session':'https://www.flowmusic.app/session/83a5a72a-9c59-4c4a-b6a1-df754e3172fe','tracks':[{'title':'먹빛의 장단','url':'https://www.flowmusic.app/song/24993b62-107e-4c3e-8b23-1a028f981c6b','source':'meokbit-jangdan-source.wav'},{'title':'먹빛 타악 효과음','url':'https://www.flowmusic.app/song/f4da4b75-7525-490a-8212-78775042e13a','source':'percussion-cues-source.wav'}],'edits':{'duration':65,'music':'first 59s + last 8s, 2s crossfade, voice sidechain ducking','effects':[{'at':20.4,'source_start':12.72,'source_end':14.6},{'at':34.2,'source_start':38.32,'source_end':40.6},{'at':48,'source_start':0,'source_end':5}]},'old_cc_recording_used':False,'on_screen_old_cc_credit':False,'provenance':'Original AI generations requested by the account holder; not a public-domain assertion. No old Arirang source appears in this mix. Google does not claim ownership of original generated content; account/service terms still apply.','terms_sources':['https://www.flowmusic.app/privacynotice','https://policies.google.com/terms','https://blog.google/innovation-and-ai/models-and-research/google-labs/believe-flow-music-partnership/']}
for track in metadata['tracks']:track['sha256']=hashlib.sha256((F/track['source']).read_bytes()).hexdigest()
(F/'provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
ep=P/'episodes/ep02/episode.json';e=json.loads(ep.read_text());e['player_music']={'file':'music-director-v5.m4a','title':'먹빛의 장단','source':'Google Flow Music original generation','hide_credit':True,'effects_at':[20.4,34.2,48]};ep.write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
p=P/'site/studio.js';s=p.read_text().replace("(INFO.player_director?'music-director.m4a':'music.m4a')","(INFO.player_music?.file||(INFO.player_director?'music-director.m4a':'music.m4a'))")
s=s.replace("ctx.save();ctx.font='400 18px Nanum'", "if(!INFO.player_music?.hide_credit){ctx.save();ctx.font='400 18px Nanum'")
s=s.replace("ctx.fillText(line,70,1700+i*27));ctx.restore();", "ctx.fillText(line,70,1700+i*27));ctx.restore();}")
s=s.replace("from './director.js'","from './director.js?revision=tj-gugak-v5'")
p.write_text(s)
p=P/'site/studio.html';s=p.read_text().replace('src="studio.js"','src="studio.js?revision=tj-gugak-v5"');p.write_text(s)
print('65s player music + effects ready; no video created')

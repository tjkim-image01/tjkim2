"""Publish only files that actually exist and have a passing output manifest."""
from pathlib import Path
import json,uuid,os
P=Path(__file__).resolve().parents[1]
TRACKS={'flow-calm':{'en':'Wind over Paper','ja':'紙の上の風'},'flow-main':{'en':'Rhythm in Ink','ja':'墨色のリズム'},'flow-playful':{'en':'Laughter at the Game','ja':'遊びの笑顔'},'flow-night':{'en':'Night in Ink','ja':'墨色の夜'},'flow-march':{'en':'March of the Brush','ja':'筆先の行進'}}
def publish():
 path=P/'manifest.json';rows=json.loads(path.read_text());counts={'ko':0,'en':0,'ja':0}
 for e in rows:
  E=P/'episodes'/e['id'];approved=e['id']=='ep02';e.setdefault('previous_video',e['video']);e['duration']=66;e['poster']='../episodes/ep02/art/intro-poster-v14.jpg';e['player_only']=False;e['player_revision']='portrait-intro-v14' if approved else 'series-v15';e['editions']=e.get('editions',{}) if approved else {}
  settings=json.loads((E/'config/player-settings.json').read_text());track=json.loads((P/f"music/tracks/{settings['musicTrack']}.json").read_text());e['music_track']=track['id'];e['music_note_i18n']={l:(f"Music: {TRACKS[track['id']]['en']}. Original Flow Music generation; intro drum sounds edited from generated audio." if l=='en' else f"音楽：{TRACKS[track['id']]['ja']}。Flow Music生成曲。ドラム効果音はイントロのみです。" if l=='ja' else f"음악: Flow Music 생성곡 〈{track['title']}〉. 북 효과음은 인트로에만 사용했습니다.") for l in ['ko','en','ja']};e['music_note']=e['music_note_i18n']['ko']
  for lang in ['ko','en','ja']:
   revision='v14' if approved else 'v15'
   vector_report=E/f'output/v17/{lang}-manifest.json'
   if not approved and vector_report.exists() and json.loads(vector_report.read_text()).get('full_decode_pass'):revision='v17'
   file=f"{e['id']}-short-{lang}-{revision}.mp4";exists=(E/'output'/file).exists() and (approved or (E/f'output/{revision}/{lang}-manifest.json').exists())
   if lang!='ko':
    synced=E/f'output/{revision}/{lang}-manifest.json'
    exists=exists and synced.exists() and bool(json.loads(synced.read_text()).get('narration_sync'))
   if approved:
    edition=e['editions'][lang];edition.update(ready=exists,video=f"../episodes/{e['id']}/output/{file}")
   else:
    d=json.loads((E/f'locales/{lang}.json').read_text());e['editions'][lang]={'title':d['settings']['title'],'hook':d['settings']['hook'],'narration':[b['text'] for b in d['blocks']],'video':f"../episodes/{e['id']}/output/{file}",'ready':exists,'language':lang,'actor':d['actor']}
   edition=e['editions'][lang]
   cover_report=E/f'output/v18/{lang}-manifest.json'
   if cover_report.exists():
    c=json.loads(cover_report.read_text());covered=P/c['file'];poster=P/c['poster']
    if c.get('full_decode_pass') and covered.exists() and poster.exists():
     edition.update(video='../'+c['file'],poster='../'+c['poster'],ready=True,duration=67.5,cover_seconds=1.5,revision='localized-cover-v18');exists=True
   if approved and edition.get('revision')!='localized-cover-v18':
    covered=E/f'upload/01_pen001_shorts_ep02_{lang}_v15_thumb1p5.mp4';poster=E/f'upload/01_pen001_shorts_ep02_{lang}_thumbnail_v01.png'
    if covered.exists() and poster.exists():
     edition.update(video='../'+str(covered.relative_to(P)),poster='../'+str(poster.relative_to(P)),ready=True,duration=67.5,cover_seconds=1.5,revision='approved-cover-v15');exists=True
   if exists:counts[lang]+=1
  e['player_revision']='vector-v17' if (E/'art/painting-vector.json').exists() else e['player_revision']
  e['video']=e['editions']['ko']['video'];e['status']='ready' if all(v.get('ready') for v in e['editions'].values()) else 'producing';e['drawing_order']='각 인물 얼굴 → 몸 → 다리 → 물건 → 배경';e['caption_style']='calm-myeongjo';e['caption_layout']={'max_chars':18,'font_size':54,'top':1374,'one_line':True}
  if not approved:
   e['narration']=e['editions']['ko']['narration'];e['voice_text']=' '.join(e['narration'])
  e['duration']=e['editions']['ko'].get('duration',66);e['poster']=e['editions']['ko'].get('poster',e['poster'])
  ep=json.loads((E/'episode.json').read_text());ep['exports']={l:os.path.relpath((P/'site'/v['video']).resolve(),E/'output') for l,v in e['editions'].items() if v['ready']}
  ep['cover_exports']={l:v['poster'] for l,v in e['editions'].items() if v.get('poster')}
  epfile=E/'episode.json';eptmp=epfile.with_name(epfile.name+'.'+uuid.uuid4().hex+'.tmp');eptmp.write_text(json.dumps(ep,ensure_ascii=False,indent=2)+'\n');eptmp.replace(epfile)
 tmp=path.with_name(path.name+'.'+uuid.uuid4().hex+'.tmp');tmp.write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
 progress=P/'production/catalogue-progress.json';progress.write_text(json.dumps({'ready':counts,'total_per_language':10,'total_exports':30,'completed':sum(counts.values())},ensure_ascii=False,indent=2)+'\n');return counts
if __name__=='__main__':print(publish())

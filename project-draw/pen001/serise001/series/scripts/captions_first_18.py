"""Concise complete sentences, one visible line, including punctuation/spaces <=18."""
from pathlib import Path
import json,shutil,hashlib
from fontTools import subset
from fontTools.ttLib import TTFont
P=Path(__file__).resolve().parents[1];E=P/'episodes/ep02';B=E/'versions/before-caption-18'
if not B.exists():
 B.mkdir(parents=True)
 for name in ['output','audio','qa']:shutil.copytree(E/name,B/name)
 shutil.copy2(E/'episode.json',B/'episode.json')
 shutil.copy2(P/'site/studio.js',B/'studio.js')
 shutil.copy2(P/'scripts/render_episode.py',B/'render_episode.py')
items=[
 (2.2,5.24,'조선에선 뭘 하며 놀았을까요?'),
 (5.3,7.66,'네 사람이 둘러앉았습니다.'),
 (7.7,9.55,'오늘은 윷놀이를 그립니다.'),
 (9.6,11.74,'윷을 던져 말을 옮깁니다.'),
 (11.8,14.08,'어느 길로 갈지 고민합니다.'),
 (14.2,15.86,'운만으로 끝나진 않습니다.'),
 (15.94,18.64,'작은 도구가 사람을 모읍니다.'),
 (18.84,21.5,'나무 조각이 궁금했겠지요.'),
 (21.56,24.08,'윷판의 길도 낯설었겠지요.'),
 (24.38,26.55,'옷차림만 궁금했을까요?'),
 (26.61,29.4,'놀이도 조선을 전했겠지요.'),
 (29.48,32.16,'한복과 손짓을 따라 그립니다.'),
 (32.22,35.28,'작은 판이 사람을 모읍니다.'),
 (35.42,38.02,'그림은 한순간을 보여 줍니다.'),
 (38.18,41.35,'조선 놀이의 전부는 아닙니다.'),
 (41.8,46.0,'누군가에겐 처음 본 조선입니다.'),
 (51.5,54.5,'TJ KIM 컬렉션 소장품입니다.'),
]
cues=[]
for start,end,text in items:
 assert len(text)<=18,(len(text),text)
 assert '\n' not in text and text.endswith(('.','?','!'))
 assert not cues or start>=cues[-1]['end']
 cues.append(dict(start=start,end=end,text=text,words=[]))
(E/'audio/captions.json').write_text(json.dumps(cues,ensure_ascii=False,indent=2)+'\n')
e=json.loads((E/'episode.json').read_text());e.update(revision='figure-first-caption18-v3',caption_layout=dict(max_chars=18,font_size=54,top=1212,one_line=True,complete_sentence=True,type='condensed-sentences'));(E/'episode.json').write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
f=TTFont(P/'site/fonts/NanumMyeongjo-Regular.ttf');options=subset.Options();options.flavor='woff2';s=subset.Subsetter(options=options);s.populate(text=''.join(c['text'] for c in cues)+'0123456789.,!? ');s.subset(f)
for r in f['name'].names:
 names={1:'TJ Kim Myeongjo',2:'Regular',3:'TJKimMyeongjo-20261025-caption18',4:'TJ Kim Myeongjo Regular',6:'TJKimMyeongjo-Regular',16:'TJ Kim Myeongjo',17:'Regular'}
 if r.nameID in names:r.string=names[r.nameID].encode(r.getEncoding())
f.flavor='woff2';f.save(P/'site/fonts/TJKimMyeongjo.woff2')
qa=dict(revision=e['revision'],count=len(cues),max_chars=max(len(c['text']) for c in cues),counts=[dict(text=c['text'],chars=len(c['text']),seconds=round(c['end']-c['start'],2)) for c in cues],font_size=54,previous_size=48,text_top=1212,picture_bottom=1176,other_video_hashes={row['id']:hashlib.sha256((P/'episodes'/row['id']/'output'/f'{row["id"]}-short-60s.mp4').read_bytes()).hexdigest() for row in json.loads((P/'manifest.json').read_text()) if row['id']!='ep02'})
(E/'qa/captions-18.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in qa.items() if k not in ['other_video_hashes']},ensure_ascii=False,indent=2))

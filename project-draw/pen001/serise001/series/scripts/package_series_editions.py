"""Create language-specific downloads only after all ten current editions are verified."""
import json,time,zipfile,hashlib,os
from pathlib import Path
P=Path(__file__).resolve().parents[1];O=P/'output';O.mkdir(exist_ok=True)
def stamp(sec):
 ms=round(sec*1000);return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}'
def package(lang,episodes):
 filename=f'TJ_KIM_FOLK_SHORTS_{lang.upper()}_10_v18.zip';tmp=O/(filename+'.tmp');dst=O/filename;index=[];sources=[];audio=[]
 with zipfile.ZipFile(tmp,'w',allowZip64=True) as z:
  for i,e in enumerate(episodes,1):
   edition=e['editions'][lang];E=P/'episodes'/e['id'];video=(P/'site'/edition['video']).resolve();assert video.exists()
   meta=json.loads((E/f'locales/{lang}.json').read_text()) if (E/f'locales/{lang}.json').exists() else None
   captions=meta['captions'] if meta else json.loads((E/'audio/captions.json').read_text());sub='\n\n'.join(f"{j}\n{stamp(7.5+c['start'])} --> {stamp(7.5+c['end'])}\n{c['text']}" for j,c in enumerate(captions,1))+'\n'
   z.write(video,f'{i:02d}.mp4',compress_type=zipfile.ZIP_STORED);z.write((P/'site'/edition['poster']).resolve(),f'{i:02d}-cover.png',compress_type=zipfile.ZIP_STORED);z.writestr(f'{i:02d}.srt',sub,compress_type=zipfile.ZIP_DEFLATED)
   z.writestr(f'{i:02d}-narration.txt',edition['title']+'\n\n'+'\n\n'.join(edition['narration'])+'\n\nTJ KIM Collection · APKC260507306\n',compress_type=zipfile.ZIP_DEFLATED)
   index.append({'episode':i,'title':edition['title'],'file':f'{i:02d}.mp4','cover':f'{i:02d}-cover.png','sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'duration':67.5})
   sources.append({'episode':i,'attribution':'Uncho, attributed','collection':'TJ KIM Collection · APKC260507306','references':e['sources'],'final_image':'AI-edited collection crop; original album photograph retained separately','cover':'AI-generated editorial cover based on this episode artwork'})
   sync=json.loads((E/f'locales/{lang}/sound-sync-ready.json').read_text()) if lang!='ko' else {'reference':'Korean original onset'}
   audio.append({'episode':i,'cover_seconds':1.5,'all_body_audio_shifted_by':1.5,'voice_provider':'Typecast','voice':{'ko':'한준','en':'아레스','ja':'이노우에 다이치'}[lang],'music_provider':'Google Flow Music','music_track':e['music_track'],'music_note':e['music_note_i18n'][lang],'effects':'Intro only; generated drum sounds. No jing or body sound effects.','narration_onset':sync})
  for name,data in [('index.json',index),('sources.json',sources),('audio-provenance.json',audio)]:z.writestr(name,json.dumps(data,ensure_ascii=False,indent=2)+'\n',compress_type=zipfile.ZIP_DEFLATED)
  text={'ko':'TJ KIM 컬렉션 · 풍속화 속 한국\n\n01~10번 순서로 감상하세요. 각 영상은 1080×1920, 30fps, 67.5초입니다. SRT 자막은 영상과 같은 시각을 사용합니다. 작가는 운초 전칭이며 마지막 이미지는 소장 이미지의 AI 정리 편집본입니다. 음성은 Typecast, 음악과 도입 북은 Flow Music 생성 원본에서 제작했습니다. 영어·일본어 해설 시작은 각 한국어판의 실제 첫 목소리에 맞췄습니다.\n','en':'TJ KIM Collection · Everyday Korea\n\nWatch files 01–10 in order. Each film is 1080×1920, 30fps and 67.5 seconds. SRT captions use the film timeline. The paintings are attributed to Uncho; the final images are AI-cleaned collection crops. Narration: Typecast. Music and intro drums: original Flow Music generation. English and Japanese narration onsets match the corresponding Korean film.\n','ja':'TJ KIM コレクション · 風俗画に見る韓国\n\n01～10の順でご覧ください。各動画は1080×1920、30fps、67.5秒です。SRT字幕は動画と同じ時刻を使います。ウンチョ作と伝わり、最後の画像は所蔵画像のAI編集版です。音声はTypecast、音楽と導入のドラムはFlow Music生成原本から制作しました。英語・日本語の解説開始は各韓国語版の実際の声の開始に合わせています。\n'}[lang];z.writestr('README.txt',text,compress_type=zipfile.ZIP_DEFLATED)
 tmp.replace(dst);return {'url':'../output/'+filename,'bytes':dst.stat().st_size,'size_mb':round(dst.stat().st_size/1e6),'sha256':hashlib.sha256(dst.read_bytes()).hexdigest(),'episodes':10,'language':lang,'revision':'localized-cover-v18','source_fingerprint':fingerprint(lang,episodes)}
def fingerprint(lang,episodes):
 return hashlib.sha256(''.join(str((P/'site'/e['editions'][lang]['video']).resolve())+hashlib.sha256((P/'site'/e['editions'][lang]['video']).read_bytes()).hexdigest() for e in episodes).encode()).hexdigest()

def main():
 while True:
  rows=json.loads((P/'manifest.json').read_text());bundlefile=O/'bundles.json';bundles=json.loads(bundlefile.read_text()) if bundlefile.exists() else {}
  for lang in ['ko','en','ja']:
   if lang in bundles and bundles[lang].get('source_fingerprint')==fingerprint(lang,rows):continue
   if all(e.get('editions',{}).get(lang,{}).get('ready') and '-v18-cover.mp4' in e['editions'][lang]['video'] for e in rows):
    bundles[lang]=package(lang,rows);tmp=O/'bundles.tmp.json';tmp.write_text(json.dumps(bundles,ensure_ascii=False,indent=2)+'\n');tmp.replace(bundlefile);print('BUNDLE_READY',lang,bundles[lang]['size_mb'],flush=True)
  if len(bundles)==3 and all(v.get('revision')=='localized-cover-v18' for v in bundles.values()):print('BUNDLES_COMPLETE',flush=True);break
  time.sleep(5)

if __name__=='__main__':main()

"""Verify the requested v31 correction, preserved sources and delivered bundles."""
from pathlib import Path
import json,hashlib,subprocess,time
import numpy as np
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'production/v31';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
while True:
 try:
  checks=json.loads((P/'qa/output-checks.json').read_text())
  videos=list((ROOT/'episodes').glob('ep*/output/*-v31-cover.mp4'))
  ready=len(checks)==30 and len(videos)==30 and (P/'native-video-qa.json').exists() and (P/'delivery.json').stat().st_mtime>=max(v.stat().st_mtime for v in videos)
  if ready:break
 except (FileNotFoundError,json.JSONDecodeError):pass
 time.sleep(5)
assert len(checks)==30
assert json.loads((P/'native-video-qa.json').read_text())['passed']
semantic=json.loads((P/'ep06-semantic-qa.json').read_text());assert semantic['passed'] and semantic['stages']['figures']['visible']==0 and semantic['stages']['background']['ratio']==1
baseline=json.loads((ROOT/'production/v30/baseline-sha256.json').read_text());reports=[];preserved=0
for ep,files in baseline.items():
 E=ROOT/'episodes'/ep
 for name,oldsha in files.items():
  if name=='episode.json' or (ep=='ep06' and name=='art/painting.json'):continue
  assert sha(E/name)==oldsha,(ep,name)
 info=json.loads((E/'episode.json').read_text());assert info['player_director']['intro_brush_visible_from']==0 and info['player_director']['intro_duration']==6
 for lang in ['ko','en','ja']:
  for rev in ['18','30']:
   m=E/(f'output/v18/{lang}-manifest.json' if rev=='18' else f'output/v30/{lang}/manifest.json');old=json.loads(m.read_text());video=E/f'output/{ep}-short-{lang}-v{rev}-cover.mp4';assert sha(video)==old['sha256'],(ep,lang,rev);preserved+=1
  d=json.loads((E/f'output/v31/{lang}/manifest.json').read_text());video=Path(d['path']);assert d['full_decode'] and d['frames']==2025 and d['seconds']==67.5 and sha(video)==d['sha256'];assert info['exports'][lang]==video.name
  if ep!='ep06':assert d['audio_packets_identical'] and d['copied_picture_slices']==1785 and all(d['body_pixel_checks'].values())
  else:
   def audio(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a','-c:a','copy','-f','adts','-'])
   assert audio(video)==audio(E/f'output/{ep}-short-{lang}-v30-cover.mp4'),(ep,lang,'Audio changed')
  reports.append({'episode':ep,'language':lang,'path':str(video),'sha256':d['sha256']})
# Verify the first post-cover frame for all three freshly rendered EP06 editions.
def rgb(p,t):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-']),np.uint8).astype(float)
ref=rgb(P/'intro.mp4',0);first={}
for lang in ['ko','en','ja']:
 im=rgb(ROOT/f'episodes/ep06/output/ep06-short-{lang}-v31-cover.mp4',1.5);first[lang]=float(np.abs(im-ref).mean());assert first[lang]<6,first
bundles=json.loads((ROOT/'output/bundles.json').read_text())
for lang,d in bundles.items():
 p=ROOT/'output'/Path(d['url']).name;assert '_v31.zip' in p.name and sha(p)==d['sha256']
rows=json.loads((ROOT/'manifest.json').read_text());assert all('-v31-cover.mp4' in e['editions'][lang]['video'] for e in rows for lang in ['ko','en','ja'])
lib=ROOT.parents[3]/'lib/com/jatu/draw';shared=Path('/Users/jatu/app/model3d/lib/com/jatu/draw')
# Use the workspace-root lib, not a similarly named project folder.
lib=Path('/Users/jatu/app/tjkim2/lib/com/jatu/draw');library_files=[lib/'sumuk.py',*[p for p in (lib/'sumuk_v30').rglob('*') if p.is_file() and '__pycache__' not in p.parts]]
for p in library_files:assert p.read_bytes()==(shared/p.relative_to(lib)).read_bytes(),p
result=dict(complete=True,episodes=10,editions=30,languages=['ko','en','ja'],intro_first_brush_seconds=0,body_start_seconds=6,body_seconds=66,delivery_seconds=67.5,EP06_background_target_pixels=semantic['target_pixels'],EP06_early_background_pixels=0,EP06_late_background_coverage=1,EP06_first_frame_MAE=first,old_delivery_files_preserved=preserved,other_body_json_and_all_saved_settings_narration_preserved=True,library_copies_identical=True,library_files=len(library_files),outputs=reports,bundles=bundles,public_deployed=False)
(P/'completed.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
with (ROOT.parents[1]/'AGENTS.md').open('a') as f:f.write('\n- 2026-10-27 v31 완료: EP06 오른팔 바깥 배경 누끼를 교정하고, 10편 모두 표지 직후 첫 프레임부터 붓/첫 획이 나오게 했다. EP06 실제 플레이어에서 배경 대상13,187픽셀이 배경 전0개/배경 후전부 표시되는 것을 확인했다. EP02~EP11 KO/EN/JA v31 MP430개(1080×1920,30fps,67.5초/2025프레임), 언어별ZIP3개와 로컬 링크 갱신 완료. EP06은 직접 재렌더, 다른27개는 검증된 공통 도입과8초 이후1785개 그림 슬라이스/AAC를 복사했고 본문 픽셀/음성패킷 동일성을 확인했다. 전 영상 완전 디코드/실제 오디오/5시점 프레임, Aside 실제 video요소 3대표편의 첫붓·SPS전환·본문·마지막 시점 디코드 검수 통과. 기존v18/v30 영상60개와 저장 설정/음성·자막, 다른9편 그림데이터는 SHA256 보존 확인. lib 양쪽 사본에 즉시도입·배경제외마스크 제작/검사기와 검증예시 저장. 제작·검수기록 series/production/v31/completed.json. 공개 배포는 하지 않았다.\n')
print('COMPLETE: corrected EP06, immediate brush, 30 MP4s and 3 ZIPs verified',flush=True)

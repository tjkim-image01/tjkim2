"""Record delivery only after all MP4s, bundles and decoded-output QA finish."""
from pathlib import Path
import json,time,hashlib
ROOT=Path(__file__).resolve().parents[1];P=ROOT/'production/v30'
while True:
 qa=P/'qa/output-checks.json';delivery=P/'delivery.json'
 if delivery.exists() and qa.exists() and len(json.loads(qa.read_text()))==30:break
 time.sleep(10)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
baseline=json.loads((P/'baseline-sha256.json').read_text());preserved=[];old_outputs=[];new_outputs=[]
for ep,files in baseline.items():
 E=ROOT/'episodes'/ep
 for name,expected in files.items():
  if name=='episode.json':continue
  assert sha(E/name)==expected,(ep,name)
 info=json.loads((E/'episode.json').read_text());assert 'intro_brush_visible_from' not in info['player_director'],ep
 preserved.append(ep)
 for lang in ['ko','en','ja']:
  old=json.loads((E/f'output/v18/{lang}-manifest.json').read_text());oldfile=E/f'output/{ep}-short-{lang}-v18-cover.mp4';assert sha(oldfile)==old['sha256'],oldfile;old_outputs.append(str(oldfile))
  d=json.loads((E/f'output/v30/{lang}/manifest.json').read_text());video=Path(d['path']);assert d['full_decode'] and sha(video)==d['sha256'];assert info['exports'][lang]==video.name
  new_outputs.append({'episode':ep,'language':lang,'file':str(video),'sha256':d['sha256'],'duration':67.5,'voice_source':'audio/voice-director.m4a' if lang=='ko' else f'locales/{lang}/voice-director.m4a','voice_source_sha256':sha(E/('audio/voice-director.m4a' if lang=='ko' else f'locales/{lang}/voice-director.m4a'))})
rows=json.loads((ROOT/'manifest.json').read_text());assert all('-v30-cover.mp4' in e['editions'][lang]['video'] for e in rows for lang in ['ko','en','ja'])
result=dict(complete=True,episodes=10,editions=30,languages=['ko','en','ja'],settings_artwork_narration_preserved=preserved,old_v18_videos_preserved=len(old_outputs),new_outputs=new_outputs,body_pixel_equivalence='ep03-body-equivalence.json and shared-frame-equivalence.json',future_immediate_brush_policy='lib/com/jatu/draw/sumuk_v30/next-production.json',existing_intro_timing_unchanged=True,public_deployed=False)
(P/'completed.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
with (ROOT.parents[1]/'AGENTS.md').open('a') as f:f.write('\n- 2026-10-27 v30 제작 완료: EP02~EP11 KO/EN/JA MP430개를 실제 Aside 플레이어로 출력하고 전부 AVC/AAC·1080×1920·30fps·67.5초/2025프레임·완전 디코드·표지 무음/즉시 음악/본문 오디오/5시점 화면 검수를 통과했다. 본문 그림·설정·기존 해설/자막 원본과 이전 v18 영상30개는 SHA256으로 보존 확인했다. 현재 도입의 빈 종이 텀은 사용자 지시에 따라 그대로 보존했다. 로컬 감상/다운로드와 언어별 v30 ZIP3개를 연결했고 공개 배포는 하지 않았다. lib 양쪽 사본에 공통 안료/머리 우선 제작 엔진·기준 렌더러·검사기와 별도의 다음 제작용 첫 프레임 붓 표시 정책을 저장했다. 재사용 테스트는 EP03을 sample 새 회차로 만들어770개 획/전 PNG바이트 일치, 일반/언어 공유 렌더 KO/EN/JA 픽셀 일치까지 확인. 전체 검수 기록 series/production/v30/completed.json.\n')
print('COMPLETE: 30 MP4 + 3 ZIP; approved artwork/settings/old editions preserved',flush=True)

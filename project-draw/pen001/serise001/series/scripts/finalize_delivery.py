"""Package only clips that have passed complete decoding and content checks."""
from pathlib import Path
import json, shutil, zipfile
from fontTools.ttLib import TTFont

ROOT=Path(__file__).resolve().parents[1]
report=json.loads((ROOT/'qa/final-verification.json').read_text())
site_report=json.loads((ROOT/'qa/site-final.json').read_text())
assert report['all_pass'] and report['episodes']==10 and site_report['allPass']
episodes=json.loads((ROOT/'manifest.json').read_text())
for e in episodes:
    e['status']='ready'
    p=ROOT/'episodes'/e['id']/'episode.json'
    data=json.loads(p.read_text());data['status']='ready';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps(episodes,ensure_ascii=False,indent=2)+'\n')

# Renamed derivatives honor the font's Reserved Font Names.
for weight in ['B','EB']:
    source=ROOT/f'site/fonts/NanumPage{weight}.woff2'
    destination=ROOT/f'site/fonts/TJKimPage{weight}.woff2'
    if source.exists():
        font=TTFont(source)
        for record in font['name'].names:
            names={1:'TJ Kim Page',2:'ExtraBold' if weight=='EB' else 'Regular',3:f'TJKimPage-{weight}-subset-20261025',4:f'TJ Kim Page {weight}',6:f'TJKimPage-{weight}',16:'TJ Kim Page',17:'ExtraBold' if weight=='EB' else 'Regular'}
            if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding())
        font.save(destination);source.unlink()
css=ROOT/'site/collection.css'
css.write_text(css.read_text().replace('fonts/NanumPage','fonts/TJKimPage').replace('font-family:Nanum','font-family:TJKimPage').replace('1.8 Nanum,','1.8 TJKimPage,'))
shutil.copy2(ROOT.parent/'web/fonts/OFL.txt',ROOT/'site/fonts/OFL.txt')
(ROOT/'site/fonts/MODIFICATIONS.txt').write_text('TJ Kim Page: character subset and renamed derivative of NAVER Nanum Myeongjo. Modified 2026-10-25. Licensed under SIL OFL 1.1; see OFL.txt.\n')

research=ROOT/'research';research.mkdir(exist_ok=True)
shutil.copy2(ROOT.parent/'research/music-license.md',research/'music-license.md')
shutil.copy2(ROOT.parent/'audio/music/license.json',research/'music-license.json')
sources=['# 풍속화 속 한국 · 해설과 자료 출처','',
'소장품: TJ KIM 컬렉션 APKC260507306, 운초 전칭. 개별 작품의 연대와 주문자, 기산 김준근과의 사제 관계는 확정하지 않았다.',
'장면의 인물·도구·동작은 앨범 사진을 관찰했다. 외국인의 호기심과 시선은 수출 풍속화의 일반적인 배경에 비추어 제안한 해석이며 특정 외국인의 증언이 아니다.',
'영상 마지막 이미지는 각 장면을 AI로 분리하고 테두리·글씨·인장을 정리한 편집본이다. 보존·복원용 정본이 아니다. 비교 기준은 보존한 앨범 사진이다. 편집 프롬프트와 도구 기록은 각 편 research/image-edit.json에 있다.','']
for e in episodes:
    sources += [f"## {e['id'].upper()} · {e['title']}",'',f"앨범 사진: [album-{e['album']}.jpg](../../research/album-{e['album']}.jpg), {'왼쪽' if e['side']=='left' else '오른쪽'} 장면.",'']
    sources += [f"- [{s['title']}]({s['url']})" for s in e['sources']]
    sources += ['']
sources += ['## 음악','', '〈국악연주곡_경기아리랑〉 — 한국저작권위원회, 공유마당, CC BY 4.0. 60초 길이의 템포 조절(음높이 유지), 페이드, 해설 아래 음량 조절 및 편집.', '', '[음원 출처](https://gongu.copyright.or.kr/gongu/wrt/wrt/view.do?wrtSn=13263029&menuNo=200020) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.ko)', '', '곡명·저작자·출처·라이선스 URL·편집 안내는 각 영상의 왼쪽 아래에 60초 내내 표시했다. 재배포 시 영상 속 크레딧과 이 출처 문서를 함께 유지한다.','']
(research/'sources.md').write_text('\n'.join(sources))

table='\n'.join(f"| {e['id'].upper()} | {e['title']} | 60초 | [MP4](episodes/{e['id']}/output/{e['id']}-short-60s.mp4) |" for e in episodes)
readme=f'''# 그림으로 만나는 조선의 하루 · TJ KIM 컬렉션

2026-10-25 제작 완료. 기존 승인된 EP01을 보존하고, 앨범의 서로 다른 장면으로 새 숏 10편(EP02~EP11)을 제작했다. 합계 10분. 새 10편은 사용자 검토용 완성본이다.

- 홈페이지: http://127.0.0.1:5184/series/site/
- 연속 재생: http://127.0.0.1:5184/series/site/watch.html?ep=ep02&play=1
- 편별 드로잉 조절: http://127.0.0.1:5184/series/site/studio.html?ep=ep02
- 기존 첫 이야기: http://127.0.0.1:5184/web/
- 일괄 다운로드: [TJ_KIM_FOLK_SHORTS_10.zip](output/TJ_KIM_FOLK_SHORTS_10.zip)

| 제작 번호 | 제목 | 길이 | 파일 |
|---|---|---|---|
{table}

홈페이지에서는 새 열 편을 1~10번째 이야기로 표시한다. 파일의 EP02~EP11은 기존 EP01 이후의 제작 번호다.

## 영상과 음성

1080×1920, H.264/AAC, 24fps, 각 1,440프레임. 빈 종이에서 시작해 드문 구도선, 독립된 색면, 먹선·세부를 만든다. 획을 나눠 보여 주는 벡터 드로잉 애니메이션이며 실제 사람이 붓으로 그리는 촬영물은 아니다. 50초에 그림을 마치고 52~56초에 테두리 정리 편집본으로 겹쳐진다. 끝에 소장처를 음성과 화면으로 안내한다.

원본 앨범 사진은 상위 research/album-N.jpg에 보존했다. AI 이미지 편집 도구로 한 장면씩 분리·테두리 정리한 편집본은 art/original-clean.png, 입력·도구·프롬프트 기록은 각 편 research/image-edit.json이다. 장면은 이 편집본에서 색면·먹선을 추출해 편집 가능한 drawing.svg와 개별 안료 마스크로 다시 구성했다. 디지털 단순화와 AI 정리 때문에 원본 사진과 세부 차이가 있을 수 있다. 원본 비교 링크는 앨범 사진으로 연결한다.

내레이션은 Typecast 한준. 정본 대본과 음성 인식 단어 시간을 정렬해 한 줄 키네틱 자막을 만들었다. 인식이 일치하지 않는 경계는 인접 시간으로 보간했으며, 자막의 한국어 문구는 정본을 유지했다. 각 편 output의 SRT는 일반 자막용이며 최종 MP4의 애니메이션 효과는 포함하지 않는다.

음악은 공개 녹음 〈국악연주곡_경기아리랑〉(한국저작권위원회/공유마당, CC BY 4.0). 실제 녹음의 이용조건에 따라 왼쪽 아래에 출처를 표시했다. 자세한 조건은 [음악 출처](research/music-license.md)와 [자료 출처](research/sources.md)를 참고한다.

## 플레이어와 수정

검색·주제 분류·밝기 전환, 10편 자동 이어보기, 대본·출처·앨범 원본 보기, 개별 MP4 저장을 지원한다. 편별 작업실에서 시간, 배속, 확대·화면 위치, 레이어, 붓, 자막, 음량, 음악, 오버랩을 조절하고 저장·내보내기·불러오기를 할 수 있다.

편별 설정은 episodes/epXX/config/player-settings.json, 미저장 초안은 해당 브라우저의 편별 localStorage에 보관된다. 저장 옵션은 실시간 작업실에 적용되며 이미 출력한 MP4는 고정 파일이다. 내레이션 녹음은 60초이므로 작업실에서 그리기 시간을 늘리면 이후 구간은 무음이다. 자막 문구를 바꿔도 녹음은 바뀌지 않는다.

서버를 다시 시작하려면 serise001 폴더에서 `python3 scripts/serve.py --port 5184`를 실행한다. 서버는 이 컴퓨터의 127.0.0.1에 연결된다. 외부 공개 배포는 수행하지 않았다.

## 검증과 재현

qa/final-verification.json: 10/10 통과. 전편 전체 디코딩, 60초·화면 크기·프레임 수, 실제 인코딩 영상의 빈 종이 시작과 오버랩, 되감기 재현성, 펜을 든 구간, 음성·음악 레벨과 소장처 안내를 확인했다. qa/ten-shorts-contact.jpg는 실제 MP4에서 뽑은 마지막 장면 모음이다.

qa/site-verification.json 및 qa/site-final.json: 목록 10개, 검색·필터·빈 결과·화면 밝기, 다음 편 자동 전환, 편별 저장 후 재접속 및 EP01/다른 편 설정 격리를 확인했다. 390px iPhone 13 브라우저 에뮬레이션에서 홈·감상·작업실의 가로 넘침이 없다. 실제 휴대전화 기기로는 검사하지 않았다. Lighthouse 모바일 모사 검사: 성능 86, 접근성 100, 모범 사례 100(로컬 서버, 당시 측정).

의존성은 상위 .venv에 설치되어 있다. 이 폴더에서 `../.venv/bin/python scripts/render_all.py`로 고정 대본·아트·음원 기반 재출력, `../.venv/bin/python scripts/verify_series.py`로 영상 검증을 실행한다. render_all.py는 완료 표시가 있는 편을 건너뛰므로 재출력이 필요하면 해당 편 qa/render.done을 제거한다. 이미지 생성이나 음성 유료 생성은 재출력 시 다시 실행하지 않는다.

변경된 그림이나 대본에 맞춰 새 음성과 타이밍이 필요하면 해당 제작 스크립트를 명시적으로 실행해야 한다. 작업실 저장 설정은 MP4 렌더러에 자동 전달되지 않는다.
'''
(ROOT/'README.md').write_text(readme)
ledger=ROOT/'풍속화_속_한국_기획서.md'
ledger.write_text(ledger.read_text().replace('| 제작 중 |','| 제작 완료·검토용 |')+'\n## 완료 기록\n\n2026-10-25: 새 10편 실제 MP4 출력 및 전편 검증 통과. 총 600초. 홈페이지·이어보기·편별 작업실과 일괄 다운로드 연결. 기존 EP01 파일과 설정 보존. 새 편에 대한 사용자 평가는 아직 받지 않았다.\n')
agents=ROOT.parents[1]/'AGENTS.md'
with agents.open('a') as f:f.write('\n- 새 10편 EP02~EP11과 모아보기는 `serise001/series/`에 있다. 홈페이지는 `/series/site/`, 연속 감상은 `watch.html`, 편별 실시간 수정은 `studio.html?ep=ep02`. 편별 설정은 `series/episodes/epXX/config/player-settings.json`이며 EP01 설정과 분리한다. 새 10편의 사용자 평가를 아직 승인으로 기록하지 않는다.\n')

out=ROOT/'output';out.mkdir(exist_ok=True)
archive=out/'TJ_KIM_FOLK_SHORTS_10.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
    z.write(ROOT/'README.md','README.md')
    for file in research.iterdir():
        if file.is_file():z.write(file,'출처/'+file.name)
    for e in episodes:
        folder=ROOT/'episodes'/e['id']
        for file in (folder/'output').iterdir():
            if file.suffix in ['.mp4','.srt']:z.write(file,f"{e['id'].upper()}_{e['title']}/{file.name}")
        for file in folder.glob('*.md'):z.write(file,f"{e['id'].upper()}_{e['title']}/{file.name}")
print(json.dumps({'episodes':len(episodes),'archive':str(archive),'archive_bytes':archive.stat().st_size},ensure_ascii=False))

# PEN001 소장품 홈페이지

전용 URL: http://127.0.0.1:5185/

같은 Wi-Fi 휴대폰: http://192.168.42.192:5185/

## 실행

저장소 루트 `/Users/jatu/app/tjkim2`에서:

```sh
project-draw/pen001/serise001/.venv/bin/python project-draw/pen001/scripts/serve_site.py --port 5185
```

이 서버는 기존 5184 서버와 별개다. `/series/`, `/research/`와 기존 플레이어 API를 같은 origin에서 제공하므로 동영상 탐색, 다운로드, 드로잉 편집이 이어진다. 기존 홈페이지와 MP4는 보존한다.

## 구성

- `index.html`: 사진 중심 전용 홈페이지. 주제 탐색, 검색, 실물 앨범, 슬라이드쇼, 10편 영상과 언어별 ZIP.
- `work.html?id=cloth&lang=ko`: 실물 장면, 앨범 전체, 드로잉 영상 전환과 관련 기록.
- `archive.js`, `archive.css`: 빌드 없는 반응형 UI. 한국어·영어·일본어, 밝은/어두운 화면.
- `data/collection.json`: 실제 장착된 그림 17점, 촬영 사진 10장, 영상 장면 10점의 연결 정보.
- `assets/photos/`: Drive에서 다운로드한 약 4,030px 폭의 원본 JPEG. 사진을 재생성하거나 보정하지 않았다.
- `research/photo-provenance.json`: 실제 Drive 파일명·파일 ID·원본 URL·크기·해시.
- `scripts/build_archive_data.py`는 상위 `pen001/scripts/`에 있다. 그림의 위치는 실물 사진 좌표로 기록한다. SVG viewport가 해당 부분을 표시하며 사진 파일은 변경하지 않는다.

## 참고 사이트와 디자인

사용자 지정 참고: https://contents.history.go.kr/collection/level.do?levelId=mp_009

2026-10-26에 실제 브라우저로 첫 화면, 목록 메뉴, 사진·스타일 자원 구조를 확인했다. `research/reference-structure.json`, `research/reference-desktop.png`에 조사 기록을 보관한다. 참고 사이트의 로고·박물관 작품 이미지를 이 소장품으로 사용하지 않는다. 원문 설명을 복제하지 않고 짧은 배경 설명과 출처 링크를 제공한다.

사진과 주제 분류를 중심으로 한 새로운 로컬 소장품 아카이브다. 기존 영상 모아보기의 주소와 자료는 유지한다. 디자인은 native HTML/CSS의 편집형 아카이브이며 공식 공공기관 디자인 시스템을 구현했다고 주장하지 않는다.

디자인 값: DESIGN_VARIANCE 3 / MOTION_INTENSITY 2 / VISUAL_DENSITY 5. 참고 페이지의 차분한 사진 배치와 넉넉한 여백을 따른다. 밝은 단색 바탕, 먹빛 글자, 실물 표지에서 가져온 한 가지 붉은 강조색. 붓글씨 제목과 명조 소제목은 풍속화 앨범이라는 주제와 참고 화면의 서체를 따른다. 세 칸의 사진 주제 탐색은 실제 자료의 분류 경로이며 마케팅 기능 카드가 아니다.

## 검수

- `qa/results.json`: 33개 브라우저 확인, 73개 실제 사진/영상/표지/ZIP 경로, 영상 Range 응답.
- `qa/touch-results.json`: 실제 모바일 touch 입력으로 두 손가락 확대, 드래그, 다음 장 넘기기.
- `qa/mobile-network.json`: 같은 Wi-Fi의 홈페이지, 원본 사진, 영상, 편집 API 응답.
- `qa/film-text-contrast.json`: 가로 스크롤 영역의 영상 제목·설명 대비 수동 확인. 최소 약 5.5:1 이상.
- `qa/photograph-crops.jpg`: 사진별 표시 범위 검수.

기본 홈페이지와 상세 화면은 세 언어에서 320/390/768/1440px 폭을 확인했다. 언어 전환 시 상세 영상의 재생 위치도 유지한다. 자동 접근성 검사에서 위반 0개를 확인했고, 화면 밖 영상 제목에 대한 대비 미판정은 별도로 계산해 확인했다.

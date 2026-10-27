# gtec001 — MOVE : 이소 · 경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시 가상 전시장

> 번호 안내: 학교 졸업전시 작업은 `tjkim2/경기과학기술대학교/gtec001` 부터 시작한다(2026-10-23). 작업 방식은 [proejct-web/jhong003](../../proejct-web/jhong003/README.md)(기획 → 자료 → 사이트 → 영상 → 기록)을 따른다. 원자료(학생 폴더·도록 PDF·표지 PDF·서명)는 한 단계 위 폴더 `경기과학기술대학교/` 에 그대로 두고 읽기만 한다.

졸업전시 도록 「MOVE : 이소 — 여정의 끝, 그리고 또다른 시작」(2026.10.28–11.02)을 **메타버스형 가상 전시장 + 전시 웹사이트**로 옮긴 것. 졸업생 42명(웹툰 21 · 일러스트 16 · 출판만화 4 · 애니메이션 1)이 부스 하나씩을 갖고, 입구와 부스마다 QR 로 휴대폰에서 같은 전시장에 들어온다.

- 자료 정리: [01.기획/00_자료정리.md](01.기획/00_자료정리.md) · 기획서: [01.기획/01_기획서.md](01.기획/01_기획서.md) · 인트로 영상 대본(초안): [01.기획/02_인트로영상_대본.md](01.기획/02_인트로영상_대본.md)
- 사이트: [site/](site/) — Vite + React + TS + three.js, HashRouter (`npm run dev` → http://localhost:5201, `--host` 라 같은 와이파이의 휴대폰에서 `http://<PC IP>:5201` 로 접속)
- 진행 기록: [process.md](process.md) · 프롬프트 기록: [wiki/01_프롬프트_기록.md](wiki/01_프롬프트_기록.md)

## 폴더

```
gtec001/
  01.기획/                  자료정리 · 기획서 · 인트로 대본
  site/
    scripts/build_data.py   원자료 → public/artists·sign·brand·catalog + src/data/*.json
    scripts/overrides.json  PDF 줄바꿈 보정 문안(인사말·졸준위·정예선)
    src/lib/layout.ts       평면도(로비·3관·부스 42 좌표) — 3D 와 미니맵이 공유
    src/three/world.ts      three.js 월드(하늘·로비·복도·부스·조작·지연 로딩)
    src/pages/              Home · Gallery(3D) · Artists · Artist · About · QR · Intro
    public/artists/<id>/    main·p1~p6 (large/thumb/tex) · avatar
    public/sign/<id>.png    서명(투명)
    public/brand/           cover.jpg(표지) · logo_paper.jpg(로고)
    public/catalog/         인사말·축전·졸준위·서명 페이지(도록) — 입구 플래카드에도 씀
    public/hosts/           학과장·사회자 초상(자리표시 → 교체)  · src/data/hosts.json 대사
    public/interviews/      작가 인터뷰 mp4·txt 자리(생기면 자동 표시)
    scripts/shots.py        Playwright 스크린샷 검수(PC·iPhone)
  video/                    인트로 영상(Remotion) — 아직 미제작, 웹 인트로(코드)로 대체 중
  wiki/                     프롬프트 기록
```

## 페이지

| 경로 | 내용 |
|---|---|
| `#/` | 홈 — 밤하늘 히어로(표지) · 4개 전시관 · 작가 42 카드 · 입구 QR · 인사말 |
| `#/gallery` | 3D 전시장. `?booth=<id>` 로 특정 부스 앞에서 시작, `?skipintro=1` 인트로 생략 |
| `#/booth/<id>` | 부스 QR 용 → `#/gallery?booth=<id>` |
| `#/intro` | 인트로(웹 버전). `public/videos/intro.mp4` 가 생기면 그 영상을 재생 |
| `#/artists`, `#/artists/<id>` (`#/a/<id>`) | 작가 목록(분야 필터) · 작가 페이지(소개·소감·서명·웹툰 리더·작품·부스 QR) |
| `#/about` | 학과장 인사말 · 축전 13장 · 졸업전시준비위원회 · 판권 |
| `#/photo` | 포토존 — 내 사진 + 작가 캐릭터 스티커 합성(기기 안 처리), 저장·공유. `?with=<id>` 로 캐릭터 미리 선택 |
| `#/guestbook` | 방명록 — 입구 방명록대 QR 로 휴대폰에서 작성. `public/config.json` 의 `guestbook_url`(앱스 스크립트 웹앱)이 있으면 구글 시트에 기록, 없으면 기기에만 저장 |
| `#/qr` | 인쇄용 QR 모음(입구 1 + 부스 42). 주소 칸에 배포 주소를 넣고 인쇄 |

작가 id: `we01~we21`(웹툰), `il01~il16`(일러스트), `co01~co04`(출판만화), `an01`(애니메이션). 도록 순서.

## 다시 만들기

```bash
cd 경기과학기술대학교/gtec001/site
python -X utf8 -I scripts/build_data.py   # 원자료 → 이미지·json (약 1~2분, PIL·pymupdf·python-docx·olefile 필요)
npm install && npm run dev                 # 미리보기 5201
npm run build                              # dist/ (정적 호스팅, base ./)
```

## 방명록 서버 연결(5분)

1. 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script → [site/scripts/guestbook_apps_script.gs](site/scripts/guestbook_apps_script.gs) 내용 붙여넣기 → 저장
2. 배포 → 새 배포 → 웹 앱, 실행 주체 "나", 액세스 "모든 사용자" → 웹앱 URL 복사
3. `site/public/config.json` 의 `guestbook_url` 에 붙여넣기(배포본은 `dist/config.json`). 재빌드 없이 바로 반영
4. 글은 시트 "방명록" 탭에 시각·이름·내용·기기·id 로 쌓인다. 3D 입구 방명록대의 펼친 책에도 최근 8개가 45초마다 갱신되어 보인다

## 저작권

작품·글·서명 © 2026 경기과학기술대학교 제4회 웹툰일러스트학과 졸업생. 도록(편집 정예선, 표지 박시온) 자료를 소개 목적으로 옮긴 미리보기이며, 공개 전 학과·작가 확인이 필요하다.

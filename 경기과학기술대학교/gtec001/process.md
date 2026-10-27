# gtec001 · MOVE : 이소 가상 전시장 — 진행 기록

갱신: 2026-10-24 01:10

## 단계별 현황

| 단계 | 상태 | 세부 | 결과물 |
|---|---|---|---|
| 자료 조사 | 완료 | 학생 폴더 42개(이미지 346장, 글 43파일: txt·docx·hwp·hwpx, cp949 2개), 서명 34장, 도록 PDF 200쪽(학생 페이지 42·축전 10·졸준위·서명), 표지 PDF 3쪽(로고·책등·표지). 표지 컨셉 = 밤하늘·고글 쓴 새·편지·우체통 | 01.기획/00_자료정리.md |
| 기획 | 완료 | 로비 + 3관(서 웹툰 21 · 북 일러스트 16 · 동 만화4+애니1), 부스 색 = 대표작 팔레트, QR 규칙, 인트로 v0/v1 | 01.기획/01_기획서.md · 02_인트로영상_대본.md |
| 데이터 | 완료 | build_data.py: PDF 학생 페이지를 좌표로 읽어 이름·영문·메일·SNS·제목, 원문 파일(hwp 는 olefile 로 직접 디코드)에서 소개·소감, 이미지 3단계 리사이즈(large/thumb/tex), 서명 투명화·여백 자르기, 대표작 8색 양자화로 팔레트(벽·바닥·포인트). 정예선(원문 없음)·인사말·졸준위 2인은 overrides.json 손 보정 | site/public/artists (107MB) · src/data/artists.json · exhibition.json |
| 사이트 | 완료(미리보기) | 홈·작가 목록·작가·소개·QR 인쇄·인트로·3D 전시장 7페이지. tsc 통과, `npm run build` 통과(dist 111MB, js 942KB) | site/ |
| 3D 전시장 | 완료(v1) | three.js: 별하늘 돔 캔버스 텍스처, 로비(우체통·로고 배너·편지 180장 인스턴스), 분야색 아치, 입구 게이트·환영 벽·표지 벽, 부스 42(벽·바닥·기둥·띠·액자·이름표·서명+QR 안내판 전부 코드), 걷기 영역 판정(원+복도+부스), 드래그 시점, 조이스틱, 미니맵 순간이동, 작가 서랍, 클릭 패널, 거리 기반 텍스처 로딩/해제 | site/src/three/world.ts · lib/layout.ts |
| 검수 | 완료 | Playwright(설치된 Chrome, swiftshader) `site/scripts/shots.py` 로 PC·iPhone 10페이지씩 스크린샷. agent-browser 는 세션이 멈춰 대체 | video/02_중간렌더/pc_*.png · m_*.png |
| v2 보강 | 완료 | 요청 #2~#6: 로비 3방향 안내 푯말, 관 입구 설명판(왼쪽)+대표작 썸네일 벽(오른쪽, 캔버스 한 장·uv 로 칸 판정, 누르면 그 부스 앞으로)+관 입장 토스트, 은하수 LED(복도·로비·입구 전구 ~900개 인스턴스 + 글로우 Points + 하늘 은하수 띠 2겹), 부스 핀스팟(기구·빛기둥은 전 부스, 실제 SpotLight 는 가까운 8개 풀), 입구 축전 플래카드 10장(봉·술·이름표·개별 조명), 로비 포토존 배경판 + `/photo` 합성 페이지(내 사진 업로드 없이 기기 안 캔버스 합성, 캐릭터 스티커 드래그·크기, 저장·공유), 학과장·사회자 스탠디 + 개회식 패널 + 인트로 대사 + 홈 구역(사진은 자리표시, hosts/*.png 교체), 작가 인터뷰 구역(interviews/<id>.mp4·txt 가 생기면 캐릭터 말풍선+영상 자동 표시) | world.ts · GalleryPage · PhotoPage · hosts.json · 02_중간렌더/v2_*.png |
| 부하 시험 | 완료 | `vite preview`(dist, 단일 Node 프로세스)에 동시 20·60·150·300명이 각각 입장 1회 분량(19요청, 약 3MB)을 받는 시험. 오류 0, 300명 동시에도 p95 0.48초·최대 0.69초, 처리량 136MB/s(로컬 한계). 정적 사이트라 서버 상태가 없어 "다운"될 요인은 호스팅 대역폭뿐 → 배포는 CDN(Vercel/Cloudflare Pages) 권장. 단, 3D 는 **접속자 기기 GPU 부담**이므로 저사양 휴대폰 실기기 검수가 남음 | process.md 이 표 |
| 포토존 QR | 완료 | 3D 포토존 옆 QR 안내판(`#/photo?open=1`) → 휴대폰에서 포토존이 열리며 첫 화면에 「지금 사진 찍기(카메라)·앨범」 버튼. 사진 선택 후 캔버스로 자동 스크롤 | world.ts · PhotoPage.tsx · v3_photozone_qr.png · v3_photo_m_qr.png |
| 축전 추가 | 완료 | 황지영 교수님 축전(요청 #9): 이마리 캐릭터(W_charactor_15 v2)를 누끼 처리해 A4 축전 페이지로 합성(`scripts/make_tribute_hwang.py`), 전시 소개 축전 8번째·입구 플래카드 11장째로 등록. v2 세 캐릭터·흘림체, v3 문구 "졸업은 휴재가 아니라 본격 연재의 시작입니다. 첫 화를 응원합니다." | public/catalog/tribute_hwang.jpg |
| 방명록 | 완료(서버 연결 대기) | 요청 #10: 입구 방명록대(펼친 책 = 최근 글 8개 텍스처, 45초 갱신) + QR 판 → `#/guestbook?open=1`. 페이지는 이름·내용(300자) 작성·목록·30초 자동 갱신. 저장소는 `lib/guestbook.ts`: `config.json` 의 `guestbook_url`(구글 앱스 스크립트 웹앱, text/plain POST 로 preflight 회피) → 없으면 localStorage. 앱스 스크립트 원본 `scripts/guestbook_apps_script.gs`, 설치법 README | GuestbookPage · guestbook.ts · world.ts |
| 3D 도슨트 | 제거 | 14:30 에 model3d 조아름 GLB 를 로비 도슨트로 넣었다가 14:50 사용자 요청("학생들 전시에만 집중")으로 코드·모델 전부 제거. 필요하면 커밋 2681be1 에서 되살릴 수 있음 | — |
| 인트로 영상 | 대본만 | 웹 v0(코드 7초)로 대체 중. Remotion v1 은 다음 단계 | 01.기획/02_인트로영상_대본.md |
| 배포 | 완료 | **본 주소 https://hwangjiyoung1977-ops.github.io/2026gtec/** (교수님 계정 저장소, deploy_2026gtec.sh 로 dist 푸시). 이전: GitHub Pages(저장소 tjkim-image01/tjkim2, 기존 admin001 워크플로에 gtec001 빌드를 합쳐 한 사이트로). 주소 **https://hwangjiyoung1977-ops.github.io/2026gtec/** (admin001 은 루트 그대로). main 에 push 하면 자동 빌드·배포. 원자료(PDF·학생 폴더)는 .gitignore, 축소 이미지(110MB)만 커밋. 공개 QR 은 이 주소의 #/qr 에서 인쇄 | .github/workflows/pages.yml |

## 작업 기록

- 2026-10-23 23:25 요청 수신 → jhong003 구조·tjkim2 규칙 읽기, 학교 폴더 조사(파일 수·규격·글 양식·PDF 텍스트·페이지 렌더). hwp 는 olefile 미설치라 pip 설치 후 BodyText 레코드(tag 67) 직접 파싱. cp949 txt 2개, 파일명 오타(도룩용), 안소희 하위 폴더, 문수연 1-1 없음 확인.
- 23:40 gtec001 폴더 생성, site 스캐폴드(jhong003 package.json 기반 + three·qrcode), npm install 30초.
- 23:45~00:00 build_data.py 작성·3회 수정(원문 우선, 번호 뒤 공백 없는 경우, 라벨식 소감, 서명.png 제외, 표지 페이지 인덱스 착오 → index 2 가 표지·도록 1쪽이 로고). 데이터 42명 전원 PDF·폴더 매칭.
- 00:00 사이트 소스 16파일 작성, tsc 통과. 첫 스크린샷에서 표지가 책등으로 나와 히어로 깨짐 + 3D 시작 시점이 뒤(입구 벽)를 봄 → 수정. 히어로 보조 버튼 글자색 보정.
- 00:10 재검수 통과. 문서(README·자료정리·기획서·대본·process·wiki) 작성. 00:20 사용자 미리보기 안내.
- 01:20 휴대폰 미리보기 QR 3장(`qr/`, PC 주소 192.168.42.36:5201) 생성, 입구 QR 첨부해 사용자 메일로 링크 발송. 부하 시험(요청 #7)과 포토존 QR(요청 #8) 반영.
- 10-25 배포용 웹 포스터(요청, 인쇄용 A2·A3 는 취소): 표지 PDF 3쪽 원본 그림(2480×3508) 바탕 + 하단 날짜·학과·회차 + QR 4개(홈·3D 전시장·작가·방명록, 홈은 테두리 강조) + 홈 주소. `site/scripts/make_poster_web.py` → `site/public/poster/move_iso_poster.jpg`(1500×2121, 471KB). QR 4개 OpenCV 로 판독 확인. 회차 표기는 제4회 그대로(사용자 확인).
- 10-25 11:00 **방명록 시트 연결 완료**: 교수님이 웹앱 배포·승인 → URL(…AKfycbwL0PeM…/exec)을 public/config.json 에 넣고 deploy_2026gtec.sh(포스터 파일도 함께 공개됨). POST 시험 글 1건(이름 「연결 테스트」) → GET 으로 읽힘 확인, 시트에서 지우도록 안내. 앞서 기기에만 저장된 시험 글은 시트로 옮겨지지 않음.
- 10-25 11:15 "시트에 안 보임" → GET 결과 글 3건이 시트에 있음. 스크립트가 쓰는 탭은 「방명록」(없으면 새로 만듦)이라 첫 탭만 보면 비어 보임. "글 남길 때 로딩이 김" → 웹앱 응답 2~4초 × (POST + 다시 읽기) 대기가 원인. 누르는 즉시 목록 맨 위에 글을 보이고(시각 칸 「저장 중…」) 저장은 뒤에서, 실패 시 입력칸으로 되돌림. 시트 시각 문자열의 「(한국 표준시)」 괄호를 떼고 읽도록 fmtTime 보정. 배포·공개 페이지 목록 확인(콘솔 오류 0).
- 10-25 방명록 버그 테스트(공개 사이트, PC·iPhone): 빈 글 차단·익명·HTML/스크립트 주입 무해화·줄바꿈/이모지·이름 20자/내용 300자 제한·새로고침 유지·연타 중복 없음·가로 넘침 없음·콘솔 오류 0 — 22개 항목 통과. 단 웹앱 미배포라 글은 각 기기에만 저장.
- 10-25 작품 클릭 → 정면 보기(요청): 카메라가 0.7초에 걸쳐 액자 정면으로 이동, 눈높이를 작품 중심에 맞춰 사다리꼴 왜곡 없음, 화면 중심을 설명 패널 반대쪽으로 옮김(setViewOffset). 옆(휴대폰은 아래 시트)에 작가·작품 소개·작가의 말·서명, ←/→·썸네일로 다른 작품 정면 이동, 크게 보기(웹툰은 세로 스크롤). 닫거나 걸으면 원래 시점.
- 10-25 시트를 2026GTEC 안 새 폴더 「방명록」(drive 1XRRrzRF_A5YEBeva8lTgWFzCmK6zJFI5)으로 이동(시트 ID 그대로라 스크립트 수정 없음). 웹앱 배포·권한 허용은 여전히 교수님 몫.
- 21:30 방명록 구글 시트(요청): 교수님 공유 폴더(drive 1yF0gQdFHmAajxp-xzVdFxXkzc6Y7CngY)에 시트 「MOVE 이소 졸업전시 방명록」(ID 1Se60j89HaCcoKXN-Dp1xFsDY9gcf9kzs5zQWhjSE0-I) 생성, 1행 머리글 작성(Aside google-sheets 스킬, 교수님 계정 u0/u/2). 독립형 앱스 스크립트 프로젝트 「MOVE 이소 방명록 웹앱」(1B3NBtU2…, `scripts/guestbook_apps_script_standalone.gs` 주입·저장·이름 변경)까지 완료. **웹앱 배포의 "액세스 승인"(구글 OAuth 허용)은 계정 소유자가 눌러야 하는 단계라 교수님께 넘김** — 승인 후 웹앱 URL 을 받으면 public/config.json 에 넣고 deploy_2026gtec.sh. u1 브라우저는 CDP 멈춤(인스타그램 탭)으로 u0 프로필의 교수님 계정 세션을 씀.
- 20:45 공개 주소를 교수님 계정 **https://hwangjiyoung1977-ops.github.io/2026gtec/** 로 이전(요청 "tjkim2 빼고 짧게"). 저장소 2026gtec 은 교수님이 생성·tjkim-image01 협력자 초대(API 로 수락), 빌드 결과만 `scripts/deploy_2026gtec.sh` 로 main 에 푸시, Pages 는 교수님이 Settings 에서 켬. 옛 주소 둘(/tjkim2/hwangjiyoung/, /tjkim2/gtec001/)은 새 주소로 자동 이동. 앞으로 전시장 수정 = 소스 커밋 + `bash scripts/deploy_2026gtec.sh`.
- 20:15 홈 문구 "4년의 이야기" → "3년의 이야기"(3년제), 개회식 마지막 대사도 3년으로. 호칭 "졸전 준비 위원장" → 띄어쓰기 없이 "졸전준비위원장"(데이터·화면·이름표 카드 전부). 짧은 주소용 배포 스크립트 `scripts/deploy_hwangjiyoung.sh` 추가(저장소 생성 대기).
- 19:45 안소희 서명이 세로로 서 있음(원본이 세로 A4 로 제출) → 시계 반대 방향 90° 회전, build_data.py 에 SIGN_ROTATE 로 고정.
- 14:50 "조아름 3D 도슨트 설정은 빼 주세요, 학생 전시에만 집중": world.ts loadDocent/docentWave, GalleryPage 대사·토스트, public/models GLB 3개 삭제. 학과장·졸전 준비 위원장 등신대는 유지. model3d 로컬 조아름 자료는 project/m008 로 번호 변경(미푸시).
- 14:30 요청 "이 모델로 새로 업로드해서 웹에서 보여줘": model3d 의 조아름 3D 캐릭터를 가상 전시장 로비 도슨트로 배치·배포. model3d 저장소의 m003 폴더(468MB, 미추적)는 깃허브에 올리지 않음(요청 시 blend/fbx 제외하고 올릴 수 있음).
- 14:10 "눈 흰자가 날아갔어·와이셔츠도 흰색으로": 흰 배경 제거가 인물 안쪽 흰색(눈 흰자·셔츠)까지 지운 것이 원인 → 테두리와 이어진 흰 영역만 배경으로 판정(연결 요소)하도록 수정.
- 14:00 요청 "학과장 등신대를 웹툰 스타일로": 같은 ChatGPT 대화에서 굵은 펜 선·2단계 셀 셰이딩으로 재생성(v2, `_src/dean_prompt2.txt`), v1 은 `_src/dean_webtoon_chatgpt_v1.png`. 입구 방명록대가 학과장 등신대를 가려 왼쪽 벽 쪽(x -3.1, z 로비+10.6)으로 옮기고 등신대 둘은 중앙 쪽으로. model3d 저장소는 git pull 결과 이미 최신(origin/main = c3b0f1d), 로컬 project/m003 은 미추적 작업분.
- 13:50 요청 #14~#16: 등신대 2.4m 로 확대, 학과장 얼굴 웹툰풍 — 필터(OpenCV stylization)로는 부족해 jhong003 의 ChatGPT 이미지 연결기(Aside u0, `--ref` 사진 첨부)로 전신 웹툰 캐릭터 생성(`site/scripts/_src/dean_webtoon_chatgpt.png`, 프롬프트 `_src/dean_prompt.txt`, 대화 chong/project/gtec001/session.json). 공개 주소를 **/tjkim2/hwangjiyoung/** 로 변경(황지영 교수님 선물용, 사용자 표기 "hwanfjiyoung" 은 오타로 보고 hwangjiyoung), 옛 /gtec001/ 은 새 주소로 자동 이동.
- 13:30 진행자 교체(요청 #12·#13): 학과장 고원상 = 본인 증명사진(KakaoTalk_20261024_124652097.jpg, 205×273)에서 얼굴만 타원으로 잘라 정장 몸 위에(`scripts/make_hosts.py`, OpenCV 5 에 CascadeClassifier 가 없어 고정 좌표). 사회자 → **졸업전시 위원장 안소희**(작가 프로필 캐릭터 카드, 부스 WE18). hosts.json 이름·호칭·개회식 첫 대사·입구 말풍선 수정, 화면의 "사회자" 표기 전부 "졸업전시 위원장"으로.
- 13:10 사용자 "전시장에 안 들어가져" → 공개 주소를 PC·iPhone 에뮬레이션으로 점검: 번들 200, 콘솔 오류 0, 3D 정상. 원인 후보는 배포 직후 옛 index.html 캐시(max-age 600)가 사라진 번들을 가리키는 것 → index.html 에 스크립트 로드 실패 시 1회 주소 바꿔 재요청하는 가드 추가, WebGL 생성 실패 시 안내+2D 링크 표시. 재푸시.
- 12:45 황지영 교수님 축전 v4(요청 "포스터 v2로 해서 축전 글씨랑"): 바탕을 퓨어데이 가족 영화 포스터 v2(이마리 중심, `Pureday/M_charactor_02/images/2026-10-24/조씨 가족 영화 포스터 v1/jo_family_movie_poster_v2.png`)로 바꾸고 축전 글(Move : 이소 졸업전시를 축하합니다 / 졸업은 휴재가 아니라 본격 연재의 시작입니다 / 첫 화를 응원합니다 / 황지영 드림)을 포스터 아래 제목 여백에 배치(`scripts/make_tribute_hwang_v4.py`, 크림 밴드로 가독성 확보). v3 이미지는 `site/scripts/_prev/tribute_hwang_v3_20261024_1214.jpg` 보존.
- 12:14 황지영 교수님 축전 v3(문구 수정 요청): 본문 두 줄을 "졸업은 휴재가 아니라 본격 연재의 시작입니다. / 첫 화를 응원합니다."로 교체(`scripts/make_tribute_hwang.py`, 긴 줄은 폭 1060px 안에 자동 축소 — 70pt 그대로 931px). 이전 v2 이미지는 `site/scripts/_prev/tribute_hwang_v2_20261024_1024.jpg` 로 보존, `public/catalog/tribute_hwang.jpg` 교체(dev 서버는 즉시 반영, dist 는 재빌드 필요).
- 10:25 황지영 교수님 축전 v2(요청 #11): 이마리 + 조성민 박사 + 조하임 세 캐릭터, 글씨 나눔 붓/펜 스크립트(흘림체, OFL, scripts/fonts). 붓글씨 폰트에 《》 글리프가 없어 괄호 제거.
- 02:40 사용자: "핸드폰에서 링크했는데 다른 사람이 안 보인대" → 192.168.x 주소는 같은 와이파이에서만 열림. GitHub Pages 배포로 전환: 워크플로 수정, gtec001 커밋 a2b6c76 push(자격증명은 Windows 자격 증명 관리자의 tjkim-image01 항목, 원격 URL 에 사용자명 넣음).
- 02:10 황지영 교수님 축전 합성(1차는 글이 캐릭터에 가려 재배치), 방명록 전 과정 구현. 방명록 서버는 사용자가 앱스 스크립트를 배포해 URL 을 넣어야 공유 저장이 시작됨.
- 01:40 메일 QR 깨짐 → JPG 로 다시 첨부 + `site/public/qr/entrance.png` 링크 동봉. 휴대폰 포토존에서 버튼이 안 보임(캔버스가 화면을 다 차지, 오른쪽 열이 넘침) → 캔버스 최대 높이 50vh, 버튼 줄을 화면 아래 고정(sticky), 격자 min-width 0, 캔버스 하단 글자 겹침 정리.
- 00:30~01:10 요청 #2(푯말·관 설명·썸네일→부스·은하수 LED·핀스팟), #3(포토존·사진 합성), #4(인터뷰 영상 자리), #5(입구 축전 플래카드), #6(학과장+사회자 개회식 캐릭터) 반영. Playwright 검수 스크립트(`scripts/shots.py`, `window.__world` 로 시점 지정)로 입구·게이트·관 입구·부스·포토존·인트로 확인. 푯말 긴 글자 넘침 → fitText 로 축소. 빌드 통과.

## 알려진 한계 · 다음 할 일

- 학과장·사회자 사진은 자리표시 실루엣(`site/public/hosts/dean.png·mc.png`). 실제 사진(누끼 PNG)으로 바꾸면 입구 스탠디·개회식 패널·인트로·홈이 함께 바뀐다. 대사는 `src/data/hosts.json`.
- 작가 인터뷰: `site/public/interviews/<id>.mp4`(+ 소개 대사 `<id>.txt`)를 넣으면 작가 페이지에 캐릭터 소개 구역이 생긴다. 3D 부스 안 스크린 재생은 다음 단계.
- 포토존 스티커는 학생 프로필 아이콘(1-1) 원형 자르기. 캐릭터 누끼(전신)가 오면 `avatar` 대신 쓰도록 PhotoPage 의 스티커 소스만 바꾸면 된다.
- 인트로는 코드 애니메이션. Remotion 영상은 대본대로 제작 예정(약 2~3시간, 음성 포함).
- 부스는 공통 구조에 색만 작가별. "작가 스타일" 을 더 살리려면 분야·장르별 소품(웹툰 = 스마트폰 스크롤 기둥, 일러스트 = 이젤, 만화 = 책 진열대, 애니 = 스크린)과 조명을 추가.
- 서명 없는 8명은 안내판에 이름으로 대체. 학생 원문의 맞춤법은 손대지 않음(작가 확인 후).
- 휴대폰 실기기 검수 전(헤드리스 iPhone UA 로만 확인). 같은 와이파이에서 `http://192.168.42.36:5201` 로 시험 가능(IP 는 PC 마다 다름, dev 서버 로그 참고).
- 스크린샷 재촬영: dev 서버 띄운 뒤 `python -X utf8 scripts/shots.py`.

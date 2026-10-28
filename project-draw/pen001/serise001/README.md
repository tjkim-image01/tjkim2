# 풍속화 속 한국 · EP01 · 마지막 길을 함께

**[수정한 1분 샘플 감상](http://127.0.0.1:5184/web/)** · [최신 V3 MP4](output/serise001-ep01-short-60s-v3.mp4)

현재 범위는 사용자 검토용 세로 1분 샘플이다. 3~5분 본편과 EP02·EP03은 샘플 확인 후 진행한다. V1은 완성된 그림에 가까운 밑그림 때문에 거부된 버전이며, `versions/v1-rejected`에 보존했다.

## 최신 수정 V3

제목과 그리기 속도는 사용자 확인을 받았다. 이를 유지하면서 다음을 추가했다.

- 52~56초: 직접 그린 그림에서 바깥 테두리·글씨·인장을 정리한 원본 편집본으로 크로스 디졸브. 56~60초는 원본 편집본 감상.
- 한준 목소리로 “이 작품은 티제이킴 컬렉션 소장품입니다.”를 51.5~54.33초에 추가. 화면에는 `TJ KIM 컬렉션 소장품` 표기.
- 기존 합성 배경음을 한국저작권위원회의 실제 공개 음원 〈국악연주곡_경기아리랑〉으로 교체. [CC BY 4.0 이용조건·출처](research/music-license.md).
- 음악 출처는 영상 전체 60초 동안 **왼쪽 아래**에 18px, 3줄로 표시. 곡명·저작자·공유마당·라이선스와 원문 URL·편집 내역을 포함한다. 그림과 해설 자막 영역은 가리지 않는다.
- 플레이어에 원본 전환 켜기·끄기, 오버랩 시간(1~6초), 배경음악 별도 음량·켜기 옵션 추가. 기존 사용자 옵션은 보존했다.
- 음악 RMS는 종전 -43.2dBFS에서 -27.4dBFS로 올렸고 해설 중에는 자동으로 낮춘다. 전체 믹스 최고 피크는 -1.44dBFS. 1080×1920, 24fps, 60초를 유지하고 승인된 드로잉 마스터에서 한 번 인코딩했다.

검수: `qa/verification-v3.json`, `qa/outro-player-verification.json`, `qa/contact-final-v3.jpg`. 실제 MP4 전체 디코드, 빈 종이 시작, 기존 그리기 유지, 오버랩 중간·끝, 소장처 음성 인식, 음원 동기화와 별도 음량을 확인했다. [테두리 편집본·프롬프트와 도구 기록](research/original-edit.md).

V3 재현:

```sh
.venv/bin/python scripts/build_audio_v3.py --music audio/music/gyeonggi-arirang-source.mp3
.venv/bin/python scripts/render_subtitles.py --revision v3
.venv/bin/python scripts/render_original_outro.py --assets-only
.venv/bin/python scripts/finalize.py --revision v3
.venv/bin/python scripts/verify_v3.py
```

이하 V2 제작 기록은 이전 단계의 기록이다. V3에 적용된 음악과 소장처 멘트는 위 내용을 따른다.

## 이번 수정

- 빈 종이에서 시작한다. 초기 배경에는 원본 사진이나 완성된 그림이 없다.
- 옅은 구도선 3획 뒤, 상여와 인물의 색면을 붓으로 칠하고 먹선·얼굴·옷 주름을 더한다. 색면은 붓의 이동 경로에 따라 드러난다.
- 원본 `art/base.png`의 구도와 소재를 따라 새 SVG 도형과 선으로 그렸다. 인물과 옷자락은 단순화한 재해석이며 원화와 동일한 복제화는 아니다.
- 총 304개의 독립 안료 동작을 약 50초까지 진행하고, 마지막 10초는 완성 그림을 보여 준다. 부분 확대 후 마지막에 전체 구도로 돌아온다.
- 기존 1분 해설·음성·음악·한 줄 키네틱 자막은 유지했다.

## 산출물

- `output/serise001-ep01-short-60s-v2.mp4`: 1080×1920, 24fps, 60초 시청 파일.
- 같은 이름의 `.srt`: 자막 파일.
- `web/index.html`: 로컬 감상 화면.
- `art/procession-v2.svg`: 다시 그린 그림의 벡터 원고.
- `art/assets-v2/painting.json`: 획별 안료·경로·타이밍.
- `qa/verification-v2.json`, `qa/contact-final-v2.jpg`: 실제 인코딩 파일 검수.

## 해설과 출처

소장품 `APKC260507306`, 작가 표기는 `운초 전칭`이다. 생몰년과 직접 사제 관계를 독립 자료로 확정하지 않았으므로 단정적인 전기 설명을 넣지 않았다. ‘미술 한류의 원조’는 KBS 기사의 비유적 표현을 따른다. [출처와 판단](research/sources.md).

Typecast u9 한준의 새 음성 5문단을 0.90배로 조절하고 실제 파일 길이로 배치했다. 기존 프로젝트의 45문단은 보존했다. 자막 단어 시간은 문단 길이 안에서 글자 수로 추정했으며 강제 정렬은 아니다. 새로 합성한 조용한 오음계 배경음은 실제 전통 악기 녹음으로 표기하지 않는다.

## 재현

```sh
cd /Users/jatu/app/tjkim2/project-draw/pen001/serise001
.venv/bin/python scripts/build_art_v2.py
.venv/bin/python scripts/render_sample.py
.venv/bin/python scripts/finalize.py
.venv/bin/python scripts/verify.py
python3 scripts/serve.py
```

기존 음성과 자막 알파 영상을 재사용한다. 음성 재생성이 필요할 때만 `scripts/generate_voice.py`를 사용한다. 3D 붓 포즈 스프라이트는 참고 프로젝트 `church_save/project-pen/002`에서 재사용했다. 글꼴은 NanumSquareRound이고 라이선스는 `web/fonts/OFL.txt`에 있다. 참고 프로젝트와 원본 이미지는 수정하지 않았다.

## 시리즈 유지 사항

훅 → 작가의 짧은 소개 → 그림 속 행위와 도구 → 당시 외국인이 궁금해한 조선 → 전체 감상이라는 구조를 유지한다. 각 편의 실제 장면에 맞는 근거를 찾는다. 이번 작품을 김준근의 원화라고 일반화하지 않는다. 사용자 평가 전에는 추가 편을 완료작으로 기록하지 않는다.

## 작업용 드로잉 플레이어

[http://127.0.0.1:5184/web/](http://127.0.0.1:5184/web/)에서 MP4 재생과 별도로 안료·먹선을 실시간으로 그리는 플레이어를 연다. [고정 MP4 감상 화면](http://127.0.0.1:5184/web/video.html)은 따로 보존했다.

- 재생·정지, 시간 막대, 이전·다음 획, 대상별 단계 이동.
- 그리는 시간 30~120초, 재생 배속, 자동·고정·부분 카메라, 확대와 드래그 이동.
- 붓 표시와 크기, 구도선·색면·먹선 표시 여부.
- 제목과 작가 표기, 자막 문구·크기, 음성·음량, 반복 재생.
- 현재 프레임 PNG 저장, 설정 JSON 내보내기·불러오기, 기본값 복원.

‘설정 저장’을 누르면 로컬 서버의 `config/player-settings.json`에 저장한다. 저장 전 변경은 같은 브라우저의 임시 저장소에 남는다. 다음 방문에서 설정을 불러오며 초기 재생 위치는 항상 빈 종이다. 설정 변경은 이 작업용 플레이어에 적용되며, 이미 인코딩한 MP4를 자동으로 바꾸지는 않는다. 그리는 시간을 50초보다 늘려도 기존 해설 음원은 60초까지만 재생된다. 자막 수정은 음성을 다시 합성하지 않는다.

서버는 `python3 scripts/serve.py`로 실행한다. `/api/settings`는 현재 프로젝트의 고정 설정 파일만 읽고 쓴다. 서버를 재실행해도 저장 파일은 유지된다.

### 플레이어 확인 결과

Aside 브라우저에서 빈 종이 시작, 재생 시간 진행, 대상별 단계 이동, 색면·먹선·구도선 표시, 그리는 시간 80초로 변경 후 저장·재접속 복원을 확인했다. 검수용 변경은 기본 설정(50초 그리기)으로 복원해 저장했다. 결과는 `qa/studio-verification.json`, 화면은 `qa/studio-desktop.png`에 있다. V2 MP4도 전체 디코드, 음성, 60초 길이, 초반 빈 종이와 마지막 완성 그림 유지 확인을 통과했다(`qa/verification-v2.json`).

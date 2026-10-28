# 윷놀이 쇼츠 3개 언어 썸네일과 1.5초 도입

제작일: 2026-10-25 (Asia/Seoul)

한국어는 사용자가 지정한 `upload/01_pen001_shorts_ep02_ko_v14.mp4`, 영어·일본어는 기존 `output/ep02-short-{en,ja}-v14.mp4`에 해당 언어 썸네일을 앞에 추가했다.

- 최종 썸네일: 상위 `upload/01_pen001_shorts_ep02_{ko,en,ja}_thumbnail_v01.png`
- 최종 영상: 상위 `upload/01_pen001_shorts_ep02_{ko,en,ja}_v15_thumb1p5.mp4`
- 이미지 규격: 1080×1920 PNG, 9:16
- 영상 규격: 1080×1920, 30fps, H.264/AAC, 67.5초 / 2025프레임
- 0~1.5초 / 0~44번 프레임: 해당 언어의 정지 썸네일, 무음
- 1.5초 / 45번 프레임부터: 기존 66초 영상 전체. 기존 붓글씨 도입을 포함하며 음성·음악·자막은 모두 함께 1.5초 이동한다.
- 영상은 CRF 17로 인코딩하고 오디오는 AAC 256kbps로 출력했다. 페이드·효과음은 추가하지 않았다.
- 원본 v14 파일과 기존 플레이어 설정은 보존했다.

## 썸네일 문구

| 언어 | 큰 제목 | 빨간 부제 |
| --- | --- | --- |
| 한국어 | 조선의 / 보드게임 | 윷놀이 |
| 영어 | JOSEON’S / BOARD / GAME | YUTNORI |
| 일본어 | 朝鮮時代の / ボード / ゲーム | ユンノリ |

공통: 01 / TJ KIM COLLECTION. 원화의 네 인물을 바탕으로 만든 AI 편집 썸네일이며 원화 자체의 원본 복제본으로 제공하지 않는다.

내장 image_gen으로 한국어판을 생성한 뒤 같은 구도로 영어·일본어 문구를 바꿨다. 생성 프롬프트 전문은 `generation-prompts.json`, 생성 원본은 `{ko,en,ja}-generated.png`, 모아보기는 `preview-ko-en-ja.jpg`에 있다. 영상용 최종 PNG만 1080×1920으로 정규화했다.

재출력: `python3 build_openers.py`. 언어별 프레임 수·길이 검증은 `{ko,en,ja}-verification.json`에 기록한다.

내용 검증: `uv run --with numpy --with pillow python verify_openers.py`. 44번 프레임이 썸네일이고 45번부터 원래 영상인지, 본편 이미지의 인코딩 차이, 음성의 1.5초 지연, 썸네일 구간 무음, 전체 디코딩 오류를 확인한다. `content-verification.json` 및 `{ko,en,ja}-boundary-and-body.jpg`를 참조한다.

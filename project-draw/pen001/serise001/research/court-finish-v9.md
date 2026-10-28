# 세 북 맺음과 징 제거 — 2026-10-25

사용자 요청: 징 효과음 전체 철회, 특히 48초 징 제거. 앞과 좌우에 큰 북 세 개가 둘러선 모양을 원한다고 선택했다.

- 이 묘사는 삼고무형 북 배치로 이해한다. 이를 조선시대 특정 궁중악기명과 동일시하지 않는다.
- 국립국악원 공연 자료는 삼고무와 이매방 계열 북춤을 별도로 소개한다: https://www.gugak.go.kr/site/program/performance/detail?menuid=001001001001&performance_id=30853
- 진고(궁중 제례악의 큰 북): https://www.gugak.go.kr/ency/topic/view/103
- 뇌고(여섯 북면으로 된 역사적 제례악기): https://www.gugak.go.kr/ency/topic/view/95
- 뇌도(북 세 개를 자루에 꽂은 악기): https://www.gugak.go.kr/ency/topic/view/96

새 Flow 생성 원본: https://www.flowmusic.app/song/2adede80-5821-4c15-926b-0749b41e898f
`court-finish-v9.m4a`: 이 원본의 가죽 북 타격을 추출해 좌·우·가운데의 짧은 세 타격으로 편집한 1.55초 효과. Tj 완성 시점 3.5초부터 재생된다. 삼고무 전체 장단/안무나 역사적 음색의 정확한 복원이라고 주장하지 않는다.

`accents-v9.m4a`: 20.4초/34.2초의 기존 북 계열 타격만 유지했다. 48초의 징 효과음을 지웠다. `qa/no-gong-v9.json`에서 48초 이후 별도 효과음 파형이 0임을 확인했다. 배경음악에 포함된 악기 소리와는 별개다.

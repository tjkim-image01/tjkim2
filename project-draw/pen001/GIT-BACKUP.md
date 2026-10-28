# PEN001 Git 백업 범위

2026-10-28: 제작 코드, 승인 이미지와 붓질 자산, 편별 설정·대본·재생용 음원,
검수 자료, YouTube 업로드 문서·결과를 tjkim2 저장소에 보관한다.

용량이 큰 MP4, ZIP, 중간 H.264·float 오디오, 원본 WAV·MOV는 이 저장소의
Git 추적에서 제외하고 로컬에 보존한다. Git 백업만으로 전체 작업 폴더를
삭제하거나 모든 원본이 복원된다고 판단하면 안 된다.

공개 v31 최종 MP4 30개와 언어별 ZIP 3개는 별도 저장소의 Release에 있다.

- 공개 홈페이지: https://tjkim-image01.github.io/pen001/?v=31
- v31 미디어: https://github.com/tjkim-image01/pen001/releases/tag/v31
- 배포 검증: `deploy/pages-v31-verification.json`
- 제작 검증: `serise001/series/production/v31/completed.json`

`deploy/github-pages/`는 공개 배포용 독립 Git 저장소이며 이 저장소에서는
제외한다. 가상환경, node_modules, 빌드 출력, 임시 파일도 제외한다.

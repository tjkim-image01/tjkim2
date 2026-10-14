# tjkim2

tjkim 소장 자료(고서·고지도·판화·기록물)를 활용한 신규 사이트 개발 저장소.

## 참고 디렉토리

기존 작업은 **`/Users/jatu/app/tjkim`** (GitHub `tjkim-image01/search`)에 있다. 개발 전 반드시 참고한다.

| 경로 | 내용 |
|---|---|
| `/Users/jatu/app/tjkim/wiki/deployment/recovery.md` | **먼저 읽을 것.** 현행 폴더, 배포 주소, 복구 절차, 로컬 실행 |
| `/Users/jatu/app/tjkim/claude3/` | 어드민 + 데이터·API 원본 (FastAPI + React/Vite) |
| `/Users/jatu/app/tjkim/shop2/` | 공개 상점. 신규 사이트의 베이스 후보 |
| `/Users/jatu/app/tjkim/shop2/wiki/` | 상점 기획 문서 (원칙·기획서·홈 구조) |
| `/Users/jatu/app/tjkim/web-gallery2/` | 3D 전시관 사이트 |
| `/Users/jatu/app/tjkim/wiki/deployment/README.md` | Supabase·Render·Vercel 배포 상세 절차 |

## 공유 인프라

- DB: tjkim Supabase 프로젝트(`vkhkfgocyhkeufkmfdbg`)를 기존 사이트들과 공유한다. 상품 데이터는 **읽기 전용**으로 쓰고, 신규 테이블은 별도 접두사로 분리한다.
- 로컬 DB: tjkim의 `claude3/bin/start.sh`로 Docker PostgreSQL(포트 54330)을 띄운다.
- 배포: Vercel(프론트) + Render(백엔드) + Supabase(DB). 로그인은 GitHub `tjkim-image01`.

## admin001 (신규 어드민)

DB 없이 Google 시트를 원본으로 쓰는 정적 어드민. 소스 [admin001/](admin001/), 기획 [project/admin001](project/admin001),
**운영 매뉴얼 [wiki/admin001-manual.md](wiki/admin001-manual.md)** (설정·사용법·문제 해결·복구).

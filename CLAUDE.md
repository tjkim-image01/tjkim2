# tjkim2 작업 지침

이 저장소는 tjkim 프로젝트의 신규 사이트다. 작업 전 기존 디렉토리 **`/Users/jatu/app/tjkim`**을 참고한다.

1. 먼저 `/Users/jatu/app/tjkim/wiki/deployment/recovery.md`를 읽어 현행 폴더·배포 구조·DB를 파악한다.
2. 데이터·API 구조는 `/Users/jatu/app/tjkim/claude3/`를, 공개 사이트 구현 패턴은 `/Users/jatu/app/tjkim/shop2/`를 따른다.
3. 기존 tjkim 디렉토리는 **읽기만 하고 수정하지 않는다.**
4. 공유 DB의 기존 테이블(`items` 등)은 읽기 전용이다. 신규 테이블은 별도 접두사로 만든다.
5. 비밀값(DB 접속 문자열, API 키)은 `.env`에만 두고 커밋하지 않는다.

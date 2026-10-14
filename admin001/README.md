# admin001 — tjkim 소장품 어드민 (정적 · Google 시트 · Apps Script)

DB 없다. 화면은 GitHub Pages의 정적 사이트이고, 백엔드는 시트에 붙은 **Google Apps Script 웹 앱** 하나다.
Apps Script가 tjkim.image01 권한으로 시트를 읽고 쓰며, 아이디/비밀번호 검사도 거기서 한다.
운영 매뉴얼은 [../wiki/admin001-manual.md](../wiki/admin001-manual.md), 기획은 [../project/admin001](../project/admin001).

## 구조

| 경로 | 내용 |
|---|---|
| `apps-script/Code.js` | 백엔드. `doPost`로 JSON 요청을 받아 로그인·시트 읽기/셀 쓰기/행 추가·Drive 이미지 색인을 처리 |
| `apps-script/appsscript.json` | 매니페스트(권한 범위, 웹 앱 설정) |
| `src/lib/api.ts` | 웹 앱 호출. POST + text/plain(JSON)으로 preflight 없이 호출, 토큰은 localStorage |
| `src/lib/images.ts` | 서버 색인 결과를 합쳐 폴더명/파일명과 Item No. 대조 |
| `src/data/fields.ts` | 시트 열 정의(헤더 이름이 곧 키). 상세·등록 화면이 같은 정의를 쓴다 |
| `src/data/parse.ts` | 연도·수량·신청 이력 해석 규칙 (claude3 import_service 이식) |
| `src/data/store.ts` | 적재·IndexedDB 캐시(10분)·검색·동의어 확장·필터 |
| `src/app/AppContext.tsx` | 설정·로그인·데이터셋·저장 상태 |
| `src/pages/*` | 로그인 · 검색 목록 · 상세(인라인 편집) · 등록 · 이미지 연결 · 설정 |

## 시트

탭: `BOOK` `MAP` `OTHER` `PRINT`(물건) · `동의어` · `카테고리` · `시대` · `이미지폴더` · `설정`.
물건 탭의 앞 37열은 엑셀 원문, 뒤쪽 열은 어드민 보조 열이다. **헤더 이름은 바꾸지 않는다.** 열 순서·행 정렬·행 삭제는 자유다.

시트를 처음 만들 때는 `../project/scripts/build_sheet.py`로 xlsx를 만들어 Drive에 올린 뒤 Google 시트로 변환한다.

## 로컬 실행

```bash
cd admin001
cp .env.example .env   # VITE_API_URL (설정 화면에서 넣어도 된다)
npm install
npm run dev            # http://localhost:5173/tjkim2/
```

## 배포

- 화면: `main`에 push하면 `.github/workflows/pages.yml`이 빌드해 GitHub Pages에 올린다. 저장소 Variables에 `VITE_API_URL`을 두면 빌드에 들어간다. `vite.config.ts`의 `base`는 저장소 이름(`/tjkim2/`)이다.
- 백엔드: `apps-script/` 내용을 시트의 Apps Script 편집기에 붙여 넣고 웹 앱으로 배포한다. 절차는 매뉴얼 2.1절. 코드를 고치면 **배포 관리 → 새 버전**으로 올려야 URL이 유지된다.

# admin001 — tjkim 소장품 어드민 (정적 · Google 시트)

서버도 DB도 없다. 브라우저가 Google 로그인으로 받은 토큰으로 **Google 시트를 직접 읽고 쓴다.**
GitHub Pages에 올라가는 정적 사이트다. 기획과 결정 사항은 [../project/admin001](../project/admin001).

## 구조

| 경로 | 내용 |
|---|---|
| `src/lib/google.ts` | Google 로그인(GIS 토큰 클라이언트). 토큰은 세션 저장소, 만료되면 조용히 재발급 |
| `src/lib/sheets.ts` | Sheets v4 · Drive v3 호출. 쓰기 전에 Item No. 열을 다시 읽어 행을 찾는다 |
| `src/lib/images.ts` | Drive 이미지 전체 색인 → 폴더명/파일명과 Item No. 대조 |
| `src/data/fields.ts` | 시트 열 정의(헤더 이름이 곧 키). 상세·등록 화면이 같은 정의를 쓴다 |
| `src/data/parse.ts` | 연도·수량·신청 이력 해석 규칙 (claude3 import_service 이식) |
| `src/data/store.ts` | 적재·IndexedDB 캐시·검색·동의어 확장·필터 |
| `src/app/AppContext.tsx` | 설정·로그인·데이터셋·저장 상태 |
| `src/pages/*` | 로그인 · 검색 목록 · 상세(인라인 편집) · 등록 · 이미지 연결 · 설정 |

## 시트

탭: `BOOK` `MAP` `OTHER` `PRINT`(물건) · `동의어` · `카테고리` · `시대` · `이미지폴더` · `설정`.
물건 탭의 앞 37열은 엑셀 원문, 뒤쪽 열은 어드민 보조 열이다. **헤더 이름은 바꾸지 않는다.** 열 순서·행 정렬·행 삭제는 자유다.

시트를 처음 만들 때는 `../project/scripts/build_sheet.py`로 xlsx를 만들어 Drive에 올린 뒤 Google 시트로 변환한다.

## 로컬 실행

```bash
cd admin001
cp .env.example .env   # VITE_GOOGLE_CLIENT_ID, VITE_SHEET_ID (설정 화면에서 넣어도 된다)
npm install
npm run dev            # http://localhost:5173
```

OAuth 클라이언트의 "승인된 JavaScript 원본"에 `http://localhost:5173`과 배포 주소가 있어야 한다.

## 배포

`main`에 push하면 `.github/workflows/pages.yml`이 빌드해 GitHub Pages에 올린다.
저장소 Variables에 `VITE_GOOGLE_CLIENT_ID`, `VITE_SHEET_ID`를 두면 빌드에 들어간다.
`vite.config.ts`의 `base`는 저장소 이름(`/tjkim2/`)이다. 저장소 이름이 바뀌면 같이 바꾼다.

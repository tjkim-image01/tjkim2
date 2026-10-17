# proejct-web/tj001 — 삐라 상점 & 재고 관리 어드민

tj002(삐라 영상)의 레트로 팝 톤으로 만든 **정적 쇼핑몰 + Google 시트 실시간 재고 관리 어드민**.
영상 18편을 보다가 화면에 나온 삐라를 담고 구매 문의로 넘어가며, 어드민(`/#/admin`)에서 재고 수량·판매상태(판매중/예약중/판매완료)·가격·노출여부·구매문의를 실시간으로 관리한다.

- 기획: [01.기획/01_기획서.md](01.기획/01_기획서.md) (화면 캡처 `01.기획/shot_*.jpg`)
- 소스: [site/](site/) — Vite + React + TS, HashRouter
- 백엔드(Apps Script): [site/apps-script/Code.js](site/apps-script/Code.js) (`admin001/apps-script/Code.js`와 통합)

## 실행

```bash
cd site
npm install
npm run dev        # http://localhost:5190 (어드민: http://localhost:5190/#/admin)
npm run build      # dist/ (정적 배포물)
npm run preview
```

## 데이터 처리 구조 (GitHub Pages 정적 배포 + Google 시트 연동)

1. **기본 상품 소개·이미지·영상 (정적 빌드)**
   - 86점 상품의 기본 마크다운(`site/src/content/products/*.md`)과 이미지(`public/items/`, `public/thumbs/`), 영상(`public/videos/`)은 빌드 결과물에 포함되어 페이지 진입 시 즉시 표시된다.
2. **실시간 재고·가격·품절·문의 (Google 시트 + Apps Script 웹 앱)**
   - 정적 호스팅(GitHub Pages)에는 DB 서버가 없으므로, **`admin001`과 동일한 Google 시트(`tjkim-items`) + Google Apps Script 웹 앱**을 데이터부로 사용한다.
   - 어드민(`/#/admin`)에서 로그인(기본값 `admin` / `admin`) 후 재고 수량(`qty`), 판매 상태(`판매중` / `예약중` / `판매완료`), 판매가(`USD`), 노출 여부를 수정하면 **브라우저 즉시 반영 + Google 시트 자동 저장**이 동시에 이루어진다.
   - 기존 배포된 `admin001` v1 Apps Script와도 자동 호환되어 `PRINT` 탭의 `QTY`, `판매가 (US$)`, `Condition`, `Location`, `Shop게시`, `MEMO-4` 열에 즉시 기록되며, `site/apps-script/Code.js`(v2)를 Apps Script 편집기에 반영해 새 버전으로 배포하면 전용 **`삐라상점_재고`** 탭과 **`삐라상점_문의`** 탭이 자동 생성되어 방문자 화면에서도 로그인 없이 실시간 재고 조회 및 문의 시트 접수가 동작한다.

## 배포 (GitHub Pages)

- 루트 저장소(`main` 브랜치)에 push하면 [`.github/workflows/pages.yml`](../../.github/workflows/pages.yml)이 자동으로 빌드해 GitHub Pages에 배포한다:
  - 소장품 전체 어드민(`admin001`): `https://tjkim-image01.github.io/tjkim2/`
  - **삐라 상점(`tj001`)**: `https://tjkim-image01.github.io/tjkim2/tj001/`
  - **삐라 상점 재고 어드민**: `https://tjkim-image01.github.io/tjkim2/tj001/#/admin`

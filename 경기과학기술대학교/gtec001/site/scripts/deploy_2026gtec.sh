#!/usr/bin/env bash
# 전시장을 교수님 계정 저장소(hwangjiyoung1977-ops/2026gtec)에 배포한다 → https://hwangjiyoung1977-ops.github.io/2026gtec/
#  - 소스는 그대로 tjkim2/경기과학기술대학교/gtec001/site 에 두고, 빌드 결과(dist)만 그 저장소의 main 브랜치 루트에 올린다.
#  - 푸시 계정: tjkim-image01(협력자). 저장소 설정: Settings → Pages → Source "Deploy from a branch", Branch main / (root)
# 실행: bash scripts/deploy_2026gtec.sh   (site 폴더에서)
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="https://tjkim-image01@github.com/hwangjiyoung1977-ops/2026gtec.git"
WORK="${TMP:-/tmp}/2026gtec-deploy"
cd "$SITE"
npm run build >/dev/null
rm -rf "$WORK"; mkdir -p "$WORK"; cd "$WORK"
git init -q -b main
git remote add origin "$REPO"
if GIT_TERMINAL_PROMPT=0 git fetch -q origin main 2>/dev/null; then git reset -q --soft origin/main; fi
git rm -rq --cached . 2>/dev/null || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$SITE/dist/." .
cp index.html 404.html
touch .nojekyll
printf '# MOVE : 이소 — 경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시 가상 전시장\n\n빌드 결과만 담은 배포용 저장소(교수님 계정). 소스는 tjkim-image01/tjkim2 의 경기과학기술대학교/gtec001/site.\n' > README.md
git add -A
git -c user.name="Godpainter1-GOD" -c user.email="hwangjiyoung1977@gmail.com" commit -qm "deploy $(date +%Y-%m-%d_%H:%M) from gtec001/site" || { echo "변경 없음"; exit 0; }
GIT_TERMINAL_PROMPT=0 git push -q origin main
echo "pushed → https://hwangjiyoung1977-ops.github.io/2026gtec/ (반영까지 1~3분)"

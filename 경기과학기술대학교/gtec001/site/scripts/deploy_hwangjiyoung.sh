#!/usr/bin/env bash
# 전시장을 짧은 주소 저장소(tjkim-image01/hwangjiyoung)에 배포한다 → https://tjkim-image01.github.io/hwangjiyoung/
#  - 소스는 그대로 tjkim2/경기과학기술대학교/gtec001/site 에 두고, 빌드 결과(dist)만 그 저장소의 main 브랜치 루트에 올린다.
#  - 저장소 설정: Settings → Pages → Source "Deploy from a branch", Branch main / (root)
# 실행: bash scripts/deploy_hwangjiyoung.sh   (site 폴더에서. 처음 한 번은 저장소가 비어 있어야 한다)
set -euo pipefail
SITE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="https://tjkim-image01@github.com/tjkim-image01/hwangjiyoung.git"
WORK="${TMP:-/tmp}/hwangjiyoung-deploy"
cd "$SITE"
npm run build >/dev/null
rm -rf "$WORK"; mkdir -p "$WORK"; cd "$WORK"
git init -q -b main
git remote add origin "$REPO"
git fetch -q origin main 2>/dev/null && git reset -q --soft origin/main || true
# 이전 내용은 전부 새 dist 로 교체
git rm -rq --cached . 2>/dev/null || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$SITE/dist/." .
cp index.html 404.html
touch .nojekyll
printf '# MOVE : 이소 — 경기과학기술대학교 웹툰일러스트학과 제4회 졸업전시 가상 전시장\n\n빌드 결과만 담은 배포용 저장소. 소스는 tjkim-image01/tjkim2 의 경기과학기술대학교/gtec001/site.\n' > README.md
git add -A
git -c user.name="Godpainter1-GOD" -c user.email="hwangjiyoung1977@gmail.com" commit -qm "deploy $(date +%Y-%m-%d_%H:%M) from gtec001/site" || { echo "변경 없음"; exit 0; }
GIT_TERMINAL_PROMPT=0 git push -q origin main
echo "pushed → https://tjkim-image01.github.io/hwangjiyoung/ (반영까지 1~3분)"

#!/bin/zsh
# tj001 Remotion 렌더: 타임라인 빌드 → 타입 검사 → (stills) → 렌더 → 07_최종산출물 복사 + 검사
# 실행: ./09_render.sh long|short [v01] [stills]
set -e
MODE=$1; VER=${2:-v01}; STILLS=$3
cd "$(dirname "$0")/motion"
python3 scripts/build_timeline.py $MODE
node_modules/.bin/tsc --noEmit
if [ -n "$STILLS" ]; then node scripts/stills.mjs $MODE; fi
if [ "$MODE" = "short" ]; then COMP=Tj001Short; OUT=../../../07_최종산출물/02_숏폼/01_tj001_shorts_$VER.mp4; else COMP=Tj001Long; OUT=../../../07_최종산출물/03_롱폼/01_tj001_longform_$VER.mp4; fi
mkdir -p "$(dirname "$OUT")"
node_modules/.bin/remotion render $COMP "$OUT" --codec=h264 --crf=19 --x264-preset=fast --concurrency=6 --log=error
ffprobe -v error -show_entries stream=codec_type,width,height,duration -of csv=p=0 "$OUT"
ffmpeg -i "$OUT" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
echo "DONE $OUT"

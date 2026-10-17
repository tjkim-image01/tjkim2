#!/bin/zsh
# tj003 Remotion 렌더: 타임라인 빌드 → 타입 검사 → (stills) → 렌더(나레이션·BGM·효과음 포함) → 음량 정규화(-14 LUFS) → 07_최종산출물 + 미디어 검사
# 실행: ./04_render.sh long|A|B|C [v01] [stills]
set -e
KEY=$1; VER=${2:-v01}; STILLS=$3
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/motion"
python3 scripts/build_timeline.py $KEY
node_modules/.bin/tsc --noEmit
if [ -n "$STILLS" ]; then node scripts/stills.mjs $KEY $VER; fi
if [ "$KEY" = "long" ]; then COMP=Tj003Long; OUT=../../../07_최종산출물/03_롱폼/01_tj003_longform_$VER.mp4; else
  case $KEY in A) N=02;; B) N=03;; C) N=04;; esac
  COMP=Tj003Short$KEY; OUT=../../../07_최종산출물/02_숏폼/${N}_tj003_shorts_${KEY}_$VER.mp4; fi
RAW=../../02_중간렌더/tj003_${KEY}_raw_$VER.mp4
mkdir -p "$(dirname "$OUT")" ../../02_중간렌더
node_modules/.bin/remotion render $COMP "$RAW" --codec=h264 --crf=19 --x264-preset=fast --concurrency=4 --log=error
ffmpeg -y -loglevel error -i "$RAW" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 "$OUT"
ffprobe -v error -show_entries stream=codec_type,width,height,duration -of csv=p=0 "$OUT" | tee "../../03_검수기록/02_미디어검사_${KEY}_${VER}.txt"
ffmpeg -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:|Peak" | tail -2 | tee -a "../../03_검수기록/02_미디어검사_${KEY}_${VER}.txt"
echo "DONE $OUT"

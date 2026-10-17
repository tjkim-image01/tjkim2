#!/bin/zsh
# 표지: 최종 mp4 에서 대표 프레임을 뽑는다 (롱폼: P0 'Korea House' 주소 장면 / 쇼츠: 두 번째 숏)
# 실행: ./07_thumbs.sh [v01]
set -e
VER=${1:-v01}
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/../.."
OUT="$ROOT/07_최종산출물/04_표지"; mkdir -p "$OUT"
t() { python3 -c "import json,sys; tl=json.load(open('$HERE/motion/src/timeline_$1.json')); s=[x for x in tl['shots'] if x['id']=='$2'][0]; print(round(s['start']+$3,2))"; }
ffmpeg -y -loglevel error -ss "$(t long P0-I2 2.0)" -i "$ROOT/07_최종산출물/03_롱폼/01_tj003_longform_$VER.mp4" -frames:v 1 -q:v 2 "$OUT/01_tj003_longform_thumb_$VER.jpg"
ffmpeg -y -loglevel error -ss "$(t A A-S02 2.0)" -i "$ROOT/07_최종산출물/02_숏폼/02_tj003_shorts_A_$VER.mp4" -frames:v 1 -q:v 2 "$OUT/02_tj003_shorts_A_thumb_$VER.jpg"
ffmpeg -y -loglevel error -ss "$(t B B-S08 1.5)" -i "$ROOT/07_최종산출물/02_숏폼/03_tj003_shorts_B_$VER.mp4" -frames:v 1 -q:v 2 "$OUT/03_tj003_shorts_B_thumb_$VER.jpg"
ffmpeg -y -loglevel error -ss "$(t C C-S04 1.5)" -i "$ROOT/07_최종산출물/02_숏폼/04_tj003_shorts_C_$VER.mp4" -frames:v 1 -q:v 2 "$OUT/04_tj003_shorts_C_thumb_$VER.jpg"
ls -la "$OUT"

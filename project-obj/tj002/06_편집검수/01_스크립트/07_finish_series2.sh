#!/bin/zsh
# 시리즈2(M~R) + 롱폼2 마무리: 음성(Typecast u3) → 렌더 → 웹용 인코딩 → 삐라 상점 사이트 반영
# 실행: ./07_finish_series2.sh   (Typecast 로그인 필요. 이미 받은 파트는 건너뜀)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
LOG=../../09_작업기록/03_로그
python3 04e_voice_series2.py series2 > $LOG/voice_series2.log 2>&1
python3 04e_voice_series2.py long2 > $LOG/voice_long2.log 2>&1
test -f ../../05_제작소스/03_음성/04_숏폼시리즈2/tts/durations.json
test -f ../../05_제작소스/03_음성/05_롱폼2/tts/durations.json
: > $LOG/render_series.log
./06b_render_series.sh v01 M N O P Q R
./06_render.sh long2 v01 > $LOG/render_long2_v01.log 2>&1
grep -c "완료" $LOG/render_series.log
python3 /Users/jatu/app/tjkim2/proejct-web/tj001/site/scripts_add_series2.py
echo FINISH_SERIES2_DONE

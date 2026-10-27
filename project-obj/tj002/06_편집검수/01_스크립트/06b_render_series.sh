#!/bin/zsh
# 숏 시리즈를 한 편씩 렌더. 한 편이 LIMIT 초 넘게 걸리면(브라우저 탭 멈춤) 죽이고 한 번 더 시도한다.
# 실행: ./06b_render_series.sh v01 E F G ...
VER=$1; shift; LIMIT=600
HERE="$(cd "$(dirname "$0")" && pwd)"; cd "$HERE"
LOG=../../09_작업기록/03_로그
for k in "$@"; do
  for attempt in 1 2; do
    ./06_render.sh $k $VER > $LOG/render_${k}_${VER}.log 2>&1 &
    pid=$!; waited=0
    while kill -0 $pid 2>/dev/null && [ $waited -lt $LIMIT ]; do sleep 5; waited=$((waited + 5)); done
    if kill -0 $pid 2>/dev/null; then
      pkill -P $pid; kill $pid; pkill -f "remotion render Tj002Short$k"; pkill -f chrome-headless-shell; sleep 3
      echo "$k 시간 초과 (시도 $attempt)" >> $LOG/render_series.log
    elif grep -q "^DONE" $LOG/render_${k}_${VER}.log; then
      echo "$k 완료" >> $LOG/render_series.log; break
    else
      echo "$k 실패 (시도 $attempt)" >> $LOG/render_series.log
    fi
  done
done
echo SERIES_END >> $LOG/render_series.log

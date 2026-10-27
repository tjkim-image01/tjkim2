#!/bin/zsh
# tj002 Remotion 렌더: 타임라인 빌드 → 타입 검사 → (stills) → 렌더(나레이션·BGM·효과음 포함) → 음량 정규화(-14 LUFS) → 07_최종산출물 + 자막 SRT
# 실행: ./06_render.sh short|long|D..L [v01] [stills]
set -e
KEY=$1; VER=${2:-v01}; STILLS=$3
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/motion"
python3 scripts/build_timeline.py $KEY
node_modules/.bin/tsc --noEmit
if [ -n "$STILLS" ]; then node scripts/stills.mjs $KEY $VER; fi
case $KEY in
  short) COMP=Tj002Short; OUT=../../../07_최종산출물/02_숏폼/01_tj002_shorts_$VER.mp4; SRT=../../../07_최종산출물/05_자막/01_tj002_shorts_$VER.srt;;
  long)  COMP=Tj002Long;  OUT=../../../07_최종산출물/03_롱폼/01_tj002_longform_$VER.mp4; SRT=../../../07_최종산출물/05_자막/01_tj002_longform_$VER.srt;;
  long2) COMP=Tj002Long2; OUT=../../../07_최종산출물/03_롱폼/02_tj002_longform2_$VER.mp4; SRT=../../../07_최종산출물/05_자막/02_tj002_longform2_$VER.srt;;
  *)     N=$(python3 -c "print('%02d' % ('DEFGHIJKLMNOPQR'.index('$KEY') + 2))"); COMP=Tj002Short$KEY; OUT=../../../07_최종산출물/02_숏폼/${N}_tj002_shorts_${KEY}_$VER.mp4; SRT=../../../07_최종산출물/05_자막/${N}_tj002_shorts_${KEY}_$VER.srt;;
esac
RAW=../../02_중간렌더/tj002_${KEY}_raw_$VER.mp4
mkdir -p "$(dirname "$OUT")" "$(dirname "$SRT")" ../../02_중간렌더
node_modules/.bin/remotion render $COMP "$RAW" --codec=h264 --crf=19 --x264-preset=fast --concurrency=2 --timeout=120000 --log=error
ffmpeg -y -loglevel error -i "$RAW" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 "$OUT"
python3 - "$KEY" "$SRT" <<'PY'
import json, sys
key, srt = sys.argv[1], sys.argv[2]
tl = json.load(open(f"src/timeline_{key}.json"))
ts = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)) % 1000:03d}"
out = []
for i, l in enumerate(tl["lines"], 1):
    out.append(f"{i}\n{ts(l['start'])} --> {ts(l['end'] + 0.2)}\n{l['who']}: {l['sub'].replace(' / ', chr(10))}\n")
open(srt, "w", encoding="utf-8").write("\n".join(out)); print("srt", srt)
PY
ffprobe -v error -show_entries stream=codec_type,width,height,duration -of csv=p=0 "$OUT" | tee "../../03_검수기록/02_미디어검사_${KEY}_${VER}.txt"
ffmpeg -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:|Peak" | tail -2 | tee -a "../../03_검수기록/02_미디어검사_${KEY}_${VER}.txt"
echo "DONE $OUT"

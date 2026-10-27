"""Long.tsx / Short.tsx 가 참조하는 postcards/*.jpg, art/*.png 가 public 에 있는지 검사. 실행: python3 scripts/check_assets.py"""
import re
from pathlib import Path
MOT = Path(__file__).resolve().parents[1]
missing = set()
for src in ["Long.tsx", "Short.tsx", "kit.tsx"]:
    s = (MOT / "src" / src).read_text(encoding="utf-8")
    for m in re.findall(r'"([A-Za-z0-9_\-]+\.jpg)"', s):
        if not (MOT / "public/postcards" / m).exists(): missing.add("postcards/" + m)
    for m in re.findall(r'plate="([A-Z0-9_]+)"', s) + re.findall(r'src="(CHAR_[A-Z]+)"', s) + re.findall(r'Plate name="([A-Z0-9_]+)"', s):
        if not (MOT / "public/art" / (m + ".png")).exists(): missing.add("art/" + m + ".png")
print("MISSING:", sorted(missing) if missing else "none")

"""ShortSeries/Long 의 큐("화자:단어")가 해당 숏의 대사에 실제로 있는지 검사. 실행: python3 scripts/check_cues.py <tsx> <대본md> [편들]"""
import re, sys
from pathlib import Path
tsx, md = Path(sys.argv[1]).read_text(encoding="utf-8"), Path(sys.argv[2]).read_text(encoding="utf-8")
want = set(sys.argv[3:])
lines = {}
for ln in md.splitlines():
    m = re.match(r"\| ([A-Z]\d?-[A-Z]\d{1,2}|S\d\d) \| (\S+) \| [^|]+ \| ([^|]+) \|", ln)
    if m: lines.setdefault(m.group(1), []).append((m.group(2), m.group(3)))
norm = lambda s: re.sub(r"[.,!?…“”\"'\s]", "", s)
bad, n, cur = [], 0, None
for tok in re.finditer(r'id(?:=|: )"([A-Z]\d?-[A-Z]\d{1,2})"|c\("([A-Z]\d?-[A-Z]\d{1,2})", "([^"]*:[^"]*)"\)|c\("([^"]*:[^"]*)"\)', tsx):
    if tok.group(1): cur = tok.group(1); continue
    shot, cue = (tok.group(2), tok.group(3)) if tok.group(2) else (cur, tok.group(4))
    if not shot or (want and shot.split("-")[0] not in want): continue
    who_raw, word = cue.split(":", 1); m = re.match(r"^(.*?)(\d)?$", who_raw); who, k = m.group(1), int(m.group(2) or 1) - 1
    ls = [t for w, t in lines.get(shot, []) if w == who]
    n += 1
    if len(ls) <= k: bad.append(f"{shot} {cue}: {who} 대사 {k+1}번째 없음"); continue
    if word and norm(word) not in norm(ls[k]) and word not in ls[k]: bad.append(f"{shot} {cue}: '{word}' 없음 → {ls[k][:50]}")
print(f"checked {n} cues, bad {len(bad)}"); print("\n".join(bad))

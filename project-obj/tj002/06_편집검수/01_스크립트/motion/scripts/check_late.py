"""숏마다 첫 화면 요소(c(...) 큐 중 가장 이른 것)가 첫 대사보다 늦게 나오는지 검사 — 빈 화면 찾기.
실행: python3 scripts/check_late.py <tsx> <timeline키...>   (예: src/ShortSeries.tsx M N O)
c() 없이 처음부터 보이는 요소가 있는 숏은 잘못 걸릴 수 있으니 걸린 숏은 프레임으로 확인한다."""
import json, re, sys
from pathlib import Path
SRC = Path(__file__).resolve().parents[1] / "src"
tsx = Path(sys.argv[1]).read_text(encoding="utf-8")
LIMIT = 0.6
norm = lambda s: re.sub(r"[.,!?…“”\"'\s]", "", s)
blocks, cur = {}, None
for part in re.split(r'(id(?:=|: )"[A-Z]\d?-[A-Z]\d{1,2}")', tsx):
    m = re.match(r'id(?:=|: )"([A-Z]\d?-[A-Z]\d{1,2})"', part)
    if m: cur = m.group(1); continue
    if cur: blocks[cur] = blocks.get(cur, "") + part
for key in sys.argv[2:]:
    tl = json.loads((SRC / f"timeline_{key}.json").read_text())
    for s in tl["shots"]:
        body = blocks.get(s["id"], "")
        lines = [l for l in tl["lines"] if l["shot"] == s["id"]]
        if not lines or not body: continue
        times = []
        for a in re.findall(r'\bc\(([^()]*)\)', body):
            a = a.strip()
            if re.fullmatch(r"-?[\d.]+", a): times.append(s["start"] + float(a)); continue
            m = re.fullmatch(r'"([^":]*?)(\d)?:([^"]*)"', a)
            if not m: continue
            who, n, word = m.group(1), int(m.group(2) or 1) - 1, m.group(3)
            ls = [l for l in lines if l["who"] == who]
            if len(ls) <= n: continue
            l = ls[n]
            if not word: times.append(l["start"]); continue
            i = norm(l["text"]).find(norm(word))
            times.append(l["start"] + (l["end"] - l["start"]) * (i / max(1, len(norm(l["text"])))) if i >= 0 else l["start"])
        if not times: continue
        late = min(times) - lines[0]["start"]
        if late > LIMIT: print(f"{s['id']}: 첫 요소가 첫 대사보다 {late:.1f}초 늦음")
print("done", sys.argv[2:])

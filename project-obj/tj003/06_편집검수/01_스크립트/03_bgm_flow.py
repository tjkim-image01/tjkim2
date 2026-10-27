"""tj003 BGM — blog 의 Flow Music 커넥터(Aside u1, www.flowmusic.app)로 레트로 BGM 1곡을 받는다.
실행: python3 02_bgm_flow.py   → 05_제작소스/04_음악효과음/bgm_flow.wav (+ .m4a)
"""
import json, sys
from pathlib import Path
sys.path.insert(0, "/Users/jatu/blog")
from lib.com.jatu.aside.connector.flow_music import AsideFlowMusicConnector
ROOT = Path(__file__).resolve().parents[2]
c = AsideFlowMusicConnector(project_name="tj003", prompt_file=ROOT / "04_제작설계/03_bgm_prompt.md", account="u1",
                            output_file=ROOT / "05_제작소스/04_음악효과음/bgm_flow.wav")
r = c.generate(max_wait_sec=540)
(ROOT / "09_작업기록/02_세션/flow_music.json").write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(r, ensure_ascii=False))

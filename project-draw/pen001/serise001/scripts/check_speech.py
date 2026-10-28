import json
from pathlib import Path
from faster_whisper import WhisperModel
P=Path(__file__).resolve().parents[1]
model=WhisperModel('small',device='cpu',compute_type='int8',local_files_only=True,cpu_threads=6)
segments,info=model.transcribe(str(P/'audio/sample-60s.m4a'),language='ko',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
rows=[]
for s in segments:
 row=dict(start=s.start,end=s.end,text=s.text,words=[dict(start=w.start,end=w.end,word=w.word,probability=w.probability) for w in s.words]);rows.append(row);print(round(s.start,2),round(s.end,2),s.text,flush=True)
(P/'qa/speech-asr.json').write_text(json.dumps(dict(language=info.language,segments=rows),ensure_ascii=False,indent=2))

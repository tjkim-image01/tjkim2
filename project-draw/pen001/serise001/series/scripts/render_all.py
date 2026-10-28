import json,subprocess,time,concurrent.futures
from pathlib import Path
P=Path(__file__).resolve().parents[1];eps=[e['id'] for e in json.loads((P/'manifest.json').read_text())];pending=set(eps);running={};status={e:'waiting for audio' for e in eps}
def render(ep):
 E=P/'episodes'/ep
 with (E/'qa/render-progress.log').open('w') as out:r=subprocess.run([str(P.parent/'.venv/bin/python'),str(P/'scripts/render_episode.py'),ep],stdout=out,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError((E/'qa/render-progress.log').read_text()[-2000:])
 (E/'qa/render.done').write_text('rendered\n');return ep
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 while pending or running:
  for ep in eps:
   if ep not in pending:continue
   E=P/'episodes'/ep
   if (E/'qa/render.done').exists():pending.remove(ep);status[ep]='rendered';continue
   if len(running)<2 and (E/'qa/audio.json').exists():running[pool.submit(render,ep)]=ep;pending.remove(ep);status[ep]='rendering';print('START_RENDER',ep,flush=True)
  for future in list(running):
   if not future.done():continue
   ep=running.pop(future)
   try:future.result();status[ep]='rendered';print('RENDERED',ep,flush=True)
   except Exception as exc:status[ep]='failed';print('RENDER_FAILED',ep,str(exc),flush=True)
  (P/'qa/production-status.json').write_text(json.dumps(status,indent=2))
  if pending or running:time.sleep(2)
print('ALL_RENDER_JOBS_FINISHED',flush=True)

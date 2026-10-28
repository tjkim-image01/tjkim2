"""Resume approved SVG editions, preserving all earlier MP4s and saved player settings."""
import concurrent.futures, hashlib, json, os, subprocess, time
from pathlib import Path
from publish_series_catalogue import publish

P = Path(__file__).resolve().parents[1]
R = P / 'production'
REV = 'v17'
LANGS = ['ko', 'en', 'ja']
JOBS = [(f'ep{n:02d}', lang) for n in range(3, 12) for lang in LANGS]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def signature(ep, lang):
    E = P / 'episodes' / ep
    files = [E/'config/player-settings.json', E/f'locales/{lang}.json',
             E/'art/painting.json', E/'art/painting-vector.json', E/'art/original-layout-hires.png',
             *[P/'site'/f for f in ['studio.js','director.js','vector-paint.js','live-brush.js',
                                   'brush-motion.js','calligraphy-portrait.js']], P/'scripts/export_sumuk.cjs']
    return hashlib.sha256(''.join(digest(f) for f in files).encode()).hexdigest()

def current(ep, lang):
    E = P/'episodes'/ep
    manifest = E/f'output/{REV}/{lang}-manifest.json'
    file = E/f'output/{ep}-short-{lang}-{REV}.mp4'
    if not manifest.exists() or not file.exists(): return False
    m = json.loads(manifest.read_text())
    return m.get('source_signature') == signature(ep,lang) and m.get('full_decode_pass') and m.get('sha256') == digest(file)

def render(ep, lang):
    E = P/'episodes'/ep
    O = E/f'output/{REV}'
    O.mkdir(parents=True, exist_ok=True)
    source_signature = signature(ep,lang)
    settings = json.loads((E/'config/player-settings.json').read_text())
    assert settings['playbackRate'] == 1
    frozen = O/'settings.json'
    frozen.write_text(json.dumps(settings,ensure_ascii=False,indent=2)+'\n')
    locale = json.loads((E/f'locales/{lang}.json').read_text())
    # The Korean review uses the user's saved titles/caption edits, not an older authored default.
    if lang == 'ko': locale['settings'] = {}
    metadata = O/f'{lang}-locale.json'
    metadata.write_text(json.dumps(locale,ensure_ascii=False,indent=2)+'\n')
    video = O/f'{lang}.h264'
    mix = O/f'{lang}-mix.wav'
    output = E/f'output/{ep}-short-{lang}-{REV}.mp4'
    temporary = O/f'{lang}.tmp.mp4'
    duration = 6 + max(60,settings['drawDuration']+10)
    with (O/f'{lang}-render.log').open('a') as log:
        subprocess.run(['node',str(P/'scripts/export_sumuk.cjs'),str(frozen),str(metadata),str(video),'both'],
                       env={**os.environ,'SUMUK_EPISODE':ep},stdout=log,stderr=subprocess.STDOUT,check=True,timeout=600)
        subprocess.run(['ffmpeg','-y','-v','error','-r','30','-f','h264','-i',str(video),'-i',str(mix),
                        '-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-t',str(duration),
                        '-movflags','+faststart','-metadata','title='+settings['title']+' · TJ KIM Collection',
                        '-metadata:s:a:0','language='+{'ko':'kor','en':'eng','ja':'jpn'}[lang],str(temporary)],
                       stdout=log,stderr=subprocess.STDOUT,check=True)
    probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(temporary)]))
    v = next(s for s in probe['streams'] if s['codec_type']=='video')
    a = next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height'],v['r_frame_rate'],v['codec_name'],a['codec_name']) == (1080,1920,'30/1','h264','aac')
    assert abs(float(probe['format']['duration'])-duration)<.05
    subprocess.run(['ffmpeg','-v','error','-i',str(temporary),'-f','null','-'],check=True,capture_output=True)
    assert all(len(c['text'])<=18 and '\n' not in c['text'] for c in locale['captions'])
    assert source_signature == signature(ep,lang), 'Sources changed during rendering; rerun with new settings'
    temporary.replace(output)
    report = {'episode':ep,'language':lang,'file':str(output.relative_to(P)),
              'sha256':digest(output),'source_signature':source_signature,'renderer_revision':'vector-v17',
              'probe':probe,'settings':settings,'full_decode_pass':True,
              'voice':json.loads((E/f'locales/{lang}/sound-ready.json').read_text()),
              'narration_sync':json.loads((E/f'locales/{lang}/sound-sync-ready.json').read_text()) if lang!='ko' else None}
    (O/f'{lang}-manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('VIDEO_READY',ep,lang,output.stat().st_size,flush=True)

def main():
    errors = {}; pending = {}; attempts = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        while True:
            for future, job in list(pending.items()):
                if not future.done(): continue
                del pending[future]
                try:
                    future.result(); publish()
                except Exception as exc:
                    errors['/'.join(job)] = str(exc)
                    print('RENDER_FAILED',*job,str(exc),flush=True)
            ready = [job for job in JOBS if current(*job)]
            active = list(pending.values())
            for job in JOBS:
                if len(pending)>=2: break
                if job in ready or job in active or attempts.get(job,0)>=2: continue
                attempts[job] = attempts.get(job,0)+1
                errors.pop('/'.join(job),None)
                pending[pool.submit(render,*job)] = job
                print('RENDER_START',*job,flush=True)
            progress = {'revision':'vector-v17','completed':len(ready),'total':len(JOBS),
                        'ready':['/'.join(j) for j in ready], 'active':['/'.join(j) for j in pending.values()],
                        'errors':errors,'preserved_first_episode_exports':3}
            (R/'render-v17-progress.json').write_text(json.dumps(progress,ensure_ascii=False,indent=2)+'\n')
            if len(ready)==len(JOBS):
                print('SERIES_VECTOR_RENDER_COMPLETE',flush=True); return
            if not pending: raise RuntimeError(json.dumps(errors,ensure_ascii=False))
            time.sleep(3)

if __name__=='__main__': main()

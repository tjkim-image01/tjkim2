"""Prepend a 45-frame localized thumbnail and 1.5 s silence to each v14 export."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import subprocess

WORK = Path(__file__).resolve().parent
UPLOAD = WORK.parent
EPISODE = UPLOAD.parent


def render(lang):
    source = (UPLOAD / '01_pen001_shorts_ep02_ko_v14.mp4' if lang == 'ko'
              else EPISODE / f'output/ep02-short-{lang}-v14.mp4')
    thumbnail = UPLOAD / f'01_pen001_shorts_ep02_{lang}_thumbnail_v01.png'
    target = UPLOAD / f'01_pen001_shorts_ep02_{lang}_v15_thumb1p5.mp4'
    graph = ('[0:v]setsar=1,setpts=PTS-STARTPTS[card];'
             '[1:v]setsar=1,setpts=PTS-STARTPTS[body];'
             '[card][body]concat=n=2:v=1:a=0,format=yuv420p[v];'
             '[1:a]adelay=1500:all=1,apad,atrim=duration=67.5,asetpts=PTS-STARTPTS[a]')
    command = ['ffmpeg', '-hide_banner', '-nostdin', '-y', '-loglevel', 'warning',
               '-loop', '1', '-framerate', '30', '-t', '1.5', '-i', str(thumbnail),
               '-i', str(source), '-filter_complex_threads', '1', '-filter_complex', graph,
               '-map', '[v]', '-map', '[a]', '-map_metadata', '1',
               '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-threads', '2',
               '-r', '30', '-fps_mode', 'cfr', '-video_track_timescale', '15360',
               '-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1',
               '-colorspace', 'bt709', '-color_range', 'tv',
               '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
               '-metadata:s:a:0', f'language={dict(ko="kor",en="eng",ja="jpn")[lang]}',
               '-t', '67.5', '-movflags', '+faststart', str(target)]
    with (WORK / f'{lang}-render.log').open('w') as log:
        subprocess.run(command, check=True, stdout=log, stderr=log)
    result = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-count_frames', '-show_entries',
        'stream=codec_type,codec_name,width,height,r_frame_rate,nb_read_frames,duration:format=duration,size',
        '-of', 'json', str(target)]))
    video = next(s for s in result['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in result['streams'] if s['codec_type'] == 'audio')
    assert video['nb_read_frames'] == '2025', result
    assert (video['width'], video['height']) == (1080, 1920), result
    assert abs(float(video['duration']) - 67.5) < .001, result
    assert abs(float(audio['duration']) - 67.5) < .03, result
    (WORK / f'{lang}-verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(f'{lang}: {target.name}, 2025 frames, 67.5 seconds', flush=True)


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(render, ['ko', 'en', 'ja']))

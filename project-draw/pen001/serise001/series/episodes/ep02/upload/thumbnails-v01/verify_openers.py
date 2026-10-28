"""Check thumbnail boundary, body image preservation, audio delay, and decoding."""
from pathlib import Path
import json
import subprocess
import numpy as np
from PIL import Image

WORK = Path(__file__).resolve().parent
UPLOAD = WORK.parent
EPISODE = UPLOAD.parent


def frame(path, time):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(time),
        '-i', str(path), '-frames:v', '1', '-vf', 'scale=270:480',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    return np.frombuffer(raw, np.uint8).reshape(480, 270, 3)


def audio(path, time, duration):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(time),
        '-i', str(path), '-t', str(duration), '-vn', '-ar', '16000',
        '-ac', '1', '-f', 'f32le', '-'])
    return np.frombuffer(raw, np.float32)


report = {}
for lang in ['ko', 'en', 'ja']:
    source = (UPLOAD / '01_pen001_shorts_ep02_ko_v14.mp4' if lang == 'ko'
              else EPISODE / f'output/ep02-short-{lang}-v14.mp4')
    target = UPLOAD / f'01_pen001_shorts_ep02_{lang}_v15_thumb1p5.mp4'
    opening = frame(target, 44/30)
    first = frame(target, 1.5)
    body = frame(target, 31.5)
    reference = frame(source, 30)
    expected_first = frame(source, 0)
    # Compare output frame 44 against the normalized thumbnail itself.
    thumb = frame(UPLOAD / f'01_pen001_shorts_ep02_{lang}_thumbnail_v01.png', 0)
    mae = lambda x, y: float(np.abs(x.astype(float)-y.astype(float)).mean())
    a, b = audio(source, 10, 5), audio(target, 11.5, 5)
    correlation = float(np.corrcoef(a, b)[0, 1])
    silence_peak = float(np.abs(audio(target, 0, 1.49)).max())
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target),
        '-f', 'null', '-'], capture_output=True, text=True, check=True)
    values = dict(last_thumbnail_frame_mae=mae(opening, thumb),
                  first_body_frame_mae=mae(first, expected_first),
                  body_frame_mae=mae(body, reference),
                  audio_correlation_at_1p5s_delay=correlation,
                  thumbnail_audio_peak=silence_peak,
                  decode_errors=decoded.stderr.strip())
    assert values['last_thumbnail_frame_mae'] < 4, values
    assert values['first_body_frame_mae'] < 4, values
    assert values['body_frame_mae'] < 4, values
    assert correlation > .995, values
    assert silence_peak < .001, values
    assert not values['decode_errors'], values
    report[lang] = values
    strip = Image.new('RGB', (810, 480))
    for i, pixels in enumerate([opening, first, body]):
        strip.paste(Image.fromarray(pixels), (i*270, 0))
    strip.save(WORK / f'{lang}-boundary-and-body.jpg', quality=94)
    print(lang, values, flush=True)
(WORK / 'content-verification.json').write_text(json.dumps(report, indent=2)+'\n')

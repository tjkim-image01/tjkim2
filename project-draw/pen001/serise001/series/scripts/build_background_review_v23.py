"""EP06 background: separate paper, wall, floor and wood pigment passes.

Preserve v22 figures/objects. Geometry distinguishes pale
surfaces with similar hues; a stroke never reveals several source RGB colors.
Only the review player changes. No settings, source image or MP4 edits.
"""
import copy
import hashlib
import json
import math
import shutil
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from build_person_review_v21 import clip_paths, curve, person_mask, polygon, recover, support
from build_pigment_review_v22 import density

ROOT = Path(__file__).resolve().parents[1]
EP = ROOT / 'episodes/ep06'
ART = EP / 'art'
OUT = ART / 'raster-v23'
PALETTE = {
    'window_paper': ('창호지 · 미색', [214, 195, 156]),
    'wall_yellow': ('벽 · 연한 노랑', [238, 207, 119]),
    'floor_ochre': ('바닥 · 황토색', [218, 150, 41]),
    'wood_gold': ('창 아래 나무판 · 황금 갈색', [222, 158, 58]),
    'wood_brown': ('나무틀 · 갈색', [165, 108, 48]),
}


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / 'strokes').mkdir(exist_ok=True)
    backup = EP / 'versions/before-raster-v23'
    backup.mkdir(exist_ok=True)
    for source in (ART / 'painting.json', EP / 'episode.json'):
        if not (backup / source.name).exists():
            shutil.copy2(source, backup / source.name)
    data = json.loads((backup / 'painting.json').read_text())
    episode = json.loads((backup / 'episode.json').read_text())
    reference = np.array(Image.open(ART / 'raster-v19/working-reference-4000.png').convert('RGB'))
    wash = np.array(Image.open(ART / 'raster-v19/wash-working-4000.png').convert('RGB'))
    settings_hash = hashlib.sha256((EP / 'config/player-settings.json').read_bytes()).hexdigest()

    # The wall and window paper share a pale warm hue. HSV alone collapses
    # them to one ivory pigment. Identify their actual architectural surfaces.
    yy, xx = np.mgrid[:1304, :2000] / 2
    families = np.full(xx.shape, 3, np.uint8)
    families[yy >= 362] = 2
    families[(xx >= 275) & (xx < 722) & (yy < 301)] = 1
    families[((xx < 262) & (yy < 291)) | ((xx >= 735) & (yy < 294))] = 0
    families[(((xx >= 262) & (xx < 275)) | ((xx >= 722) & (xx < 735))) & (yy < 304)] = 4
    families[(xx < 47) | (xx >= 954) | (yy < 24) | (yy >= 629)] = 255

    # Old touch-up masks reached into the improved figure silhouettes. Do not
    # repaint sleeves/faces with background pigments during the final stage.
    occupied = person_mask('left_woman', reference) | person_mask('right_woman', reference)
    # The old object masks were rectangular envelopes. Trace the approved
    # plate's silhouettes so the floor can reach right up to each object.
    objects = polygon([(150,481),(218,466),(245,479),(245,517),(175,526),(150,516)])
    objects |= polygon([(456,542),(493,486),(536,483),(700,487),(955,523),(954,567),(733,548),(590,545),(507,547),(457,557)])
    objects |= polygon([(259,535),(263,536),(318,414),(315,414)])
    cv2.ellipse(objects, (480,1078), (156,46), 0, 0, 360, 255, -1)
    occupied |= objects
    families[occupied > 16] = 255

    marks = [copy.deepcopy(m) for m in data['strokes'] if m['element'] != 'background']
    wash_marks = []
    coverage = {}
    for family, (pigment, (name, rgb)) in enumerate(PALETTE.items()):
        allowed = ((families == family).astype(np.uint8) * 255)
        painted = np.zeros(wash.shape[:2], np.float32)
        program = []
        def sweep(nodes, width):
            paths = clip_paths([curve(nodes)], allowed)
            if paths:
                program.append(dict(paths=paths, width=width, label=name))
        if pigment == 'window_paper':
            for left, right in [(47, 262), (735, 954)]:
                for x in np.arange(left+2, right+10, 23):
                    sweep([(x, 24), (x+2, 150), (x-1, 294)], 30)
        elif pigment == 'wall_yellow':
            for x in np.arange(276, 730, 24):
                sweep([(x, 24), (x+3, 150), (x-2, 303)], 32)
        elif pigment == 'floor_ochre':
            for x in np.arange(-85, 960, 24):
                sweep([(x, 362), (x+64, 495), (x+132, 629)], 32)
        elif pigment == 'wood_gold':
            for y in [300, 320, 341, 361]:
                sweep([(47, y), (490, y+1), (954, y)], 28)
        else:
            for x in [268, 728]:
                sweep([(x, 24), (x+1, 165), (x, 304)], 18)
        # Fill small missed corners with actual brush routes, never a final
        # region fill. These use the same loaded pigment as the main sweeps.
        coverage[pigment] = recover(allowed, program, 18, 60)
        for entry in program:
            paths = clip_paths(entry['paths'], allowed)
            if not paths:
                continue
            swept = cv2.min(allowed, support(paths, entry['width']))
            ys, xs = np.nonzero(swept > 1)
            if len(xs) < 12:
                continue
            l, t = int(xs.min())//2, int(ys.min())//2
            r, b = math.ceil((xs.max()+1)/2), math.ceil((ys.max()+1)/2)
            source = cv2.resize(swept[t*2:b*2, l*2:r*2], ((r-l)*4, (b-t)*4), interpolation=cv2.INTER_LINEAR)
            previous = painted[t*4:b*4, l*4:r*4]
            desired = np.maximum(previous, source.astype(np.float32)/255 * density(wash[t*4:b*4, l*4:r*4], rgb))
            # Overlap continues the same wash density, rather than forming
            # dark parallel stripes from repeated source-over compositing.
            alpha = np.rint(255*(desired-previous)/np.maximum(.00001,1-previous)).astype(np.uint8)
            previous[:] = desired
            ys, xs = np.nonzero(alpha > 1)
            if len(xs) < 12:
                continue
            x0, y0 = int(xs.min())//4*4, int(ys.min())//4*4
            x1, y1 = math.ceil((xs.max()+1)/4)*4, math.ceil((ys.max()+1)/4)*4
            alpha = alpha[y0:y1, x0:x1]
            rgba = np.zeros((*alpha.shape, 4), np.uint8)
            rgba[:, :, :3], rgba[:, :, 3] = rgb, alpha
            filename = f'raster-v23/strokes/{len(wash_marks):04d}.png'
            Image.fromarray(rgba).save(ART / filename)
            mark = dict(phase='wash', element='background', pixel_scale=4,
                        width=entry['width'], reveal_width=entry['width'],
                        brush_kind='flat' if entry['width'] > 20 else 'medium')
            mark.update(file=filename,
                        bounds=[l+x0//4, t+y0//4, l+x1//4, t+y1//4],
                        points=[p for path in paths for p in path], brush_paths=paths,
                        pigment_id=pigment, pigment_name=name, pigment_rgb=rgb,
                        single_pigment=True, label=name+' · 색별 채색')
            # Include lifted travel in the time budget for disconnected paths.
            length = sum(sum(math.dist(a, b) for a, b in zip(path, path[1:])) for path in paths)
            travel = sum(math.dist(a[-1], b[0])*.32 for a, b in zip(paths, paths[1:]))
            mark['cost'] = max(3, length+travel)
            wash_marks.append(mark)

    # Visible blocks of each loaded color, with enough time to see the reload.
    cursor, stages = 38.8, []
    budget = 47 - cursor - .2 * len(PALETTE)
    costs = {pid: sum(m['cost'] for m in wash_marks if m['pigment_id'] == pid) for pid in PALETTE}
    weights = {pid: math.sqrt(cost) for pid, cost in costs.items()}
    for pid in PALETTE:
        selected = [m for m in wash_marks if m['pigment_id'] == pid]
        if not selected:
            raise ValueError(f'No brush routes for {pid}')
        cursor += .2
        start = cursor
        duration = budget * weights[pid] / sum(weights.values())
        for mark in selected:
            dt = duration * mark['cost'] / costs[pid]
            mark.update(id=len(marks), start=cursor, end=cursor+dt*.94, move_end=cursor+dt)
            cursor += dt
            marks.append(mark)
        stages.append(dict(pigment_id=pid, name=PALETTE[pid][0], rgb=PALETTE[pid][1], start=start, end=cursor, strokes=len(selected)))
    # Keep the existing fine architectural lines after every background wash.
    marks.extend(copy.deepcopy(m) for m in data['strokes'] if m['element'] == 'background' and m['phase'] == 'ink')
    for index, mark in enumerate(marks):
        mark['id'] = index
    data.update(strokes=marks)
    data['raster_paint'].update(version=23, background_color_passes=stages,
                                continuous_mask_paths=True,
                                background_color_change_lift_seconds=.2,
                                choreography_source='scripts/build_background_review_v23.py')
    data['raster_paint']['pigments'].update({pid: dict(name=name, rgb=rgb) for pid, (name, rgb) in PALETTE.items()})
    episode.update(player_revision='raster-v23-review', player_only=True, review_status='awaiting-user')
    (ART / 'painting.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    (EP / 'episode.json').write_text(json.dumps(episode, ensure_ascii=False, indent=2)+'\n')
    report = dict(background_color_passes=stages, coverage=coverage, strokes=len(marks),
                  non_background_strokes_unchanged=all(a == b for a, b in zip(
                      [{k: v for k, v in m.items() if k != 'id'} for m in data['strokes'] if m['element'] != 'background'],
                      [{k: v for k, v in m.items() if k != 'id'} for m in json.loads((backup/'painting.json').read_text())['strokes'] if m['element'] != 'background'])),
                  saved_settings_sha256=settings_hash, MP4_created=False)
    (OUT / 'build-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()

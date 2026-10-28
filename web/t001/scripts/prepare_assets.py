"""Prepare real collection image crops, without AI edits or private image metadata."""
from pathlib import Path
import json
import shutil
from PIL import Image

HERE = Path(__file__).resolve().parents[1]
REPO = HERE.parents[1]
SOURCE = REPO / 'project-draw/pen001/site'
PUBLIC = HERE / 'public/assets'
PUBLIC.mkdir(parents=True, exist_ok=True)
data = json.loads((SOURCE / 'data/collection.json').read_text())
media = 'https://tjkim-image01.github.io/pen001'
for work in data['works']:
    with Image.open(SOURCE / f"assets/photos/album-{work['album']}.jpg") as image:
        x, y, w, h = work['crop']
        crop = image.crop((x, y, x+w, y+h))
        crop.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        crop.save(PUBLIC / f"{work['id']}.webp", quality=92, method=6)
    work['image'] = f"assets/{work['id']}.webp"
    for edition in work['editions'].values():
        for key in ['video', 'poster']:
            edition[key] = media + edition[key]
for photo in data['photos']:
    with Image.open(SOURCE / f"assets/photos/album-{photo['id']}.jpg") as image:
        image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        image.save(PUBLIC / f"album-{photo['id']}.webp", quality=88, method=6)
    photo['url'] = f"assets/album-{photo['id']}.webp"
    photo['original'] = media + f"/assets/photos/album-{photo['id']}.jpg"
for bundle in data['bundles'].values():
    bundle['url'] = 'https://github.com/tjkim-image01/pen001/releases/download/v18/' + Path(bundle['url']).name
for name in ['ArchiveSans-Regular.woff2', 'ArchiveJapanese.woff2', 'ArchiveSans-OFL.txt', 'ArchiveJapanese-LICENSE.txt', 'MODIFICATIONS.txt']:
    shutil.copy2(SOURCE / 'assets' / name, PUBLIC / name)
(HERE / 'src').mkdir(exist_ok=True)
(HERE / 'src/collection.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n')
print(f"Prepared {len(data['works'])} real artwork crops and {len(data['photos'])} album photographs; EXIF omitted.")

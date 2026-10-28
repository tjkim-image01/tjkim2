# 그림 속 조선 · t001

PEN001's new video-led collection site, based on a Google Stitch design. The reference shop is `proejct-web/tj001/site`: films lead to the physical objects, with a saved-works collection. The previous homepage plan and retro visual treatment are discarded.

## Run

```sh
npm ci
npm run dev
```

Local: http://127.0.0.1:5196/

Home, ten films with continuous playback, 17-work gallery with search and theme filters, work details, photograph zoom, ten-page album, saved works, and collection introduction. Korean, English and Japanese UI with the already-produced localized film editions. Saves and language choice remain in this browser. No simulated price, checkout or inquiry submission.

## Build and publish

```sh
npm run build
cd ../..
project-draw/pen001/serise001/.venv/bin/python project-draw/pen001/scripts/build_github_pages.py --output project-draw/pen001/deploy/github-pages/public
```

Commit and push only the dedicated repository in `project-draw/pen001/deploy/github-pages`. Its GitHub Actions workflow publishes https://tjkim-image01.github.io/pen001/. The new homepage uses hash routes and relative paths. Existing film, original-photo and drawing-editor URLs remain available. ZIP bundles stay on GitHub release v18. The legacy photo archive detail URLs also remain usable.

Images in `public/assets` are photographic crops and resized album images, without EXIF, made by `scripts/prepare_assets.py`. Local source photographs remain untouched. Source facts and the previous site's curated data are preserved. Attribution is **운초 전칭 / Attributed to Uncho**, not a confirmed pupil relationship or authenticated date.

Stitch project: https://stitch.withgoogle.com/projects/735876044285396946

`design/stitch-desktop.html` is the original generated reference, retained for traceability. Its invented demonstration artwork, measurements and conservation text are excluded from the actual website. The follow-up mobile Stitch request returned a transport error; responsive implementation follows the successful desktop direction directly. `design/` and QA harnesses are excluded from the production build. Fonts and icons retain their licenses.

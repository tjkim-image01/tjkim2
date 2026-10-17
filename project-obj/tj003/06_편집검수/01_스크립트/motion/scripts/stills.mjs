// 숏마다 대표 프레임 1장씩 → ../../02_중간렌더/<key>_stills/<shot>.png + 그리드 jpg
// 실행: node scripts/stills.mjs long|A|B|C [v01]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
const key = process.argv[2] || "long", ver = process.argv[3] || "v01";
const tl = JSON.parse(fs.readFileSync(`src/timeline_${key}.json`, "utf8"));
const url = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comps = await getCompositions(url), composition = comps.find((x) => x.id === (key === "long" ? "Tj003Long" : `Tj003Short${key}`));
const out = path.resolve(`../../02_중간렌더/${key}_stills`); fs.mkdirSync(out, { recursive: true });
const files = [];
for (const sh of tl.shots) {
  const ls = tl.lines.filter((x) => x.shot === sh.id); const last = ls[ls.length - 1];
  const t = last.start + Math.max(0.3, (last.end - last.start) * 0.85);
  const frame = Math.min(composition.durationInFrames - 1, Math.round(t * tl.fps));
  const f = path.join(out, sh.id + ".png");
  await renderStill({ composition, serveUrl: url, frame, output: f, imageFormat: "png", inputProps: composition.defaultProps });
  files.push([f, t]); console.log(sh.id, frame);
}
const cols = key === "long" ? 4 : 6, scale = key === "long" ? "scale=640:-1" : "scale=300:-1";
const fc = files.map((f, i) => `[${i}:v]${scale}[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") +
  `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) === 0 ? 0 : Array.from({ length: i % cols }, (_, k) => `w${k}`).join("+")}_${Math.floor(i / cols) === 0 ? 0 : Array.from({ length: Math.floor(i / cols) }, (_, k) => `h${k * cols}`).join("+")}`).join("|")}:fill=black[o]`;
const grid = path.resolve(`../../03_검수기록/10_${key}_stills_${ver}.jpg`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...files.flatMap(([f]) => ["-i", f]), "-filter_complex", fc, "-map", "[o]", "-q:v", "3", grid]);
console.log("grid", grid);

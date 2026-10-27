// 지정한 숏의 지정 시각(숏 시작 기준 초) 프레임 → 그리드 jpg. 빈 화면·겹침 확인용
// 실행: node scripts/peek.mjs <mode> <out.jpg> X3-C1@1 X3-C1@4 ...
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
const [mode, outJpg, ...specs] = process.argv.slice(2);
const tl = JSON.parse(fs.readFileSync(`src/timeline_${mode}.json`, "utf8"));
const url = await bundle({ entryPoint: path.resolve("src/index.ts") });
const id = mode === "long2" ? "Tj002Long2" : mode === "long" ? "Tj002Long" : `Tj002Short${mode}`;
const composition = (await getCompositions(url)).find((x) => x.id === id);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "peek-")); const files = [];
for (const s of specs) {
  const [shot, off] = s.split("@"); const sh = tl.shots.find((x) => x.id === shot);
  const frame = Math.min(composition.durationInFrames - 1, Math.round((sh.start + Number(off)) * tl.fps));
  const f = path.join(dir, `${files.length}.png`);
  await renderStill({ composition, serveUrl: url, frame, output: f, imageFormat: "png" }); files.push(f);
}
const long = mode.startsWith("long"), cols = Math.min(files.length, long ? 3 : 5);
const rows = Math.ceil(files.length / cols);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
  files.map((_, i) => `[${i}:v]scale=${long ? 640 : 300}:-1[v${i}]`).join(";") + ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:layout=` +
  files.map((_, i) => `${long ? (i % cols) * 640 : (i % cols) * 300}_${Math.floor(i / cols) * (long ? 360 : 534)}`).join("|") + ":fill=black", outJpg]);
fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(url, { recursive: true, force: true });
console.log("ok", outJpg, rows, "rows");

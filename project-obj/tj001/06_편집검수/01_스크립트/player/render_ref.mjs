/* jatu004 렌더러 — 로컬 Chrome(headless)에서 SEEK(t)로 프레임을 뽑아 ffmpeg 에 파이프.
 * 실행: node player/render.mjs [fps] [출력]   (프로젝트 폴더에서, 로컬 서버 8434 필요)
 * 소리는 섞지 않는다 (영상만) → 편집 단계에서 voice/BGM 믹스
 */
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const FPS = Number(process.argv[2] || 30);
const OUT = process.argv[3] || "result/collage_video.mp4";
const URL = "http://127.0.0.1:8434/player/index.html";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell",
  args: ["--no-sandbox", "--force-color-profile=srgb", "--disable-lcd-text"] });
const page = await browser.newPage();
await page.setViewport({ width: 1960, height: 1120 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluate(() => window.READY);
const dur = await page.evaluate(() => window.TL.duration);
const frames = Math.ceil(dur * FPS);
console.log(`duration ${dur}s → ${frames} frames @ ${FPS}fps`);

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS),
  "-i", "-", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", OUT], { stdio: ["pipe", "inherit", "inherit"] });

for (let i = 0; i < frames; i++) {
  const t = i / FPS;
  await page.evaluate((tt) => window.SEEK(tt), t);
  const data = await page.evaluate(() => document.getElementById("stage").toDataURL("image/png").split(",")[1]);
  const buf = Buffer.from(data, "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`frame ${i}/${frames} (${t.toFixed(1)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("DONE " + OUT);

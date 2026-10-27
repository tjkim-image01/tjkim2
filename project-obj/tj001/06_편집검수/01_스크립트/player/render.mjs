/* tj001 렌더러 — 로컬 Chrome(headless)에서 SEEK(t) 프레임을 뽑아 ffmpeg 로 파이프 (영상만, 소리는 03_mix.py).
 * 실행: node player/render.mjs long|short [fps] [출력]   (01_스크립트 폴더에서, 로컬 서버 8436 필요)
 *   cd <tj001 루트> && python3 -m http.server 8436 --bind 127.0.0.1 &
 */
import { spawn } from "node:child_process";
import puppeteer from "puppeteer-core";

const WHICH = process.argv[2] || "long";
const FPS = Number(process.argv[3] || 30);
const OUT = process.argv[4] || `../02_중간렌더/tj001_${WHICH}_silent.mp4`;
const URL = `http://127.0.0.1:8436/06_편집검수/01_스크립트/player/index.html?tl=${WHICH}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const START = Number(process.env.START || 0), END = process.env.END ? Number(process.env.END) : null;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell", args: ["--no-sandbox", "--force-color-profile=srgb", "--disable-lcd-text", "--allow-file-access-from-files"] });
const page = await browser.newPage();
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("[page]", m.text()); });
await page.setViewport({ width: 1960, height: 1960 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluate(() => window.READY);
const { dur, W, H } = await page.evaluate(() => ({ dur: window.TL.duration, W: window.TL.W, H: window.TL.H }));
const t1 = END ?? dur;
const frames = Math.ceil((t1 - START) * FPS);
console.log(`${WHICH} ${W}x${H} duration ${dur}s → frames ${frames} @ ${FPS}fps → ${OUT}`);

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
for (let i = 0; i < frames; i++) {
  const t = START + i / FPS;
  const data = await page.evaluate((tt) => { window.SEEK(tt); return document.getElementById("stage").toDataURL("image/png").split(",")[1]; }, t);
  const buf = Buffer.from(data, "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 300 === 0) console.log(`frame ${i}/${frames} (${t.toFixed(1)}s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await browser.close();
console.log("DONE " + OUT);

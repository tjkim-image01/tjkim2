/* 검수용: 지정 시각들의 프레임을 뽑아 그리드 JPG 로 저장.
 * node player/preview.mjs long "1,5,9,14" ../03_검수기록/long_grid.jpg [cols]
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
const WHICH = process.argv[2] || "long";
const TIMES = (process.argv[3] || "1,10,20").split(",").map(Number);
const OUT = process.argv[4] || `../03_검수기록/${WHICH}_grid.jpg`;
const COLS = Number(process.argv[5] || (WHICH === "short" ? 6 : 3));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "shell", args: ["--no-sandbox", "--force-color-profile=srgb"] });
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.type(), m.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
await page.setViewport({ width: 1960, height: 1960 });
await page.goto(`http://127.0.0.1:8436/06_편집검수/01_스크립트/player/index.html?tl=${WHICH}`, { waitUntil: "networkidle0" });
await page.evaluate(() => window.READY);
if (process.env.NOLABEL) await page.evaluate(() => { window.__NOLABEL = true; });
const info = await page.evaluate(() => ({ dur: window.TL.duration, W: window.TL.W, H: window.TL.H, n: window.TL.items.length }));
console.log(info);
mkdirSync("/tmp/tj001_prev", { recursive: true });
const files = [];
for (const t of TIMES) {
  const data = await page.evaluate((tt) => { window.SEEK(tt); if (!window.__NOLABEL) { const c=document.getElementById("stage").getContext("2d"); c.setTransform(1,0,0,1,0,0); c.fillStyle="rgba(0,0,0,0.65)"; c.fillRect(0,0,150,54); c.fillStyle="#fff"; c.font="36px sans-serif"; c.fillText(tt.toFixed(1)+"s",10,40); } return document.getElementById("stage").toDataURL("image/jpeg", 0.85).split(",")[1]; }, t);
  const f = `/tmp/tj001_prev/${WHICH}_${t.toFixed(1)}.jpg`; writeFileSync(f, Buffer.from(data, "base64")); files.push(f);
}
await browser.close();
const scale = WHICH === "short" ? "scale=270:-1" : "scale=640:-1";
const inputs = files.flatMap((f) => ["-i", f]);
const rows = Math.ceil(files.length / COLS);
let fc = files.map((_, i) => `[${i}:v]${scale}[v${i}]`).join(";");
const pad = files.length % COLS ? COLS - (files.length % COLS) : 0;
let layout = files.map((_, i) => `${(i % COLS) === 0 ? 0 : Array.from({ length: i % COLS }, (_, k) => `w${k}`).join("+")}_${Math.floor(i / COLS) === 0 ? 0 : Array.from({ length: Math.floor(i / COLS) }, (_, k) => `h${k * COLS}`).join("+")}`).join("|");
fc += ";" + files.map((_, i) => `[v${i}]`).join("") + `xstack=inputs=${files.length}:layout=${layout}:fill=black[out]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", fc, "-map", "[out]", "-q:v", "3", OUT]);
console.log("saved", OUT);

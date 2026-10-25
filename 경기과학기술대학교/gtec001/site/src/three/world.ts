// 가상 전시장(three.js). 평면도는 lib/layout.ts 와 공유한다.
//  - 입구(+z) → 로비(별하늘 돔·로고 배너·편지 입자·우체통) → 세 전시관 복도 → 부스 42개
//  - 부스: 뒷벽 대표작 + 양 옆벽 작품 + 이름표 + 서명·QR 안내판. 벽·바닥 색은 작가 대표작 팔레트
//  - 텍스처는 카메라 가까운 부스만 읽고(30m) 멀어지면 버린다(45m)
import * as THREE from "three";
import QRCode from "qrcode";
import { Artist, artImg, signOf, urlOfArtist, urlOfGuestbook, siteBase, v, EX, DEPTS, HOSTS, ENTRANCE_BUBBLES } from "../lib/data";
import { listEntries, fmtTime } from "../lib/guestbook";
import { BOOTHS, Booth, BOOTH_D, BOOTH_H, BOOTH_W, ENTRANCE_Z, HALL_HALF, LOBBY_R, WINGS, Wing, WING_START, isWalkable, wingAt, wingLength } from "../lib/layout";

export type Hit = { kind: "main" | "work" | "plate" | "qr" | "thumb" | "wing" | "photo" | "host" | "guestbook"; booth?: Booth; wing?: Wing; index: number; obj?: THREE.Object3D };
export type WorldOpts = { canvas: HTMLCanvasElement; onHit: (h: Hit) => void; onNear: (b: Booth | null) => void; onWing: (w: Wing | null) => void; onReady: () => void };

const DEPT_COLOR: Record<string, string> = Object.fromEntries(DEPTS.map((d) => [d.code, d.color]));
const texLoader = new THREE.TextureLoader();
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);

function loadTex(url: string): Promise<THREE.Texture> {
  return new Promise((res, rej) => texLoader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; res(t); }, undefined, rej));
}
function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, weight: string, family: string) {
  let size = px; do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; } while (ctx.measureText(text).width > maxW && size > 14);
}
const F_SERIF = '"Noto Serif KR", "Gowun Batang", serif', F_SANS = '"Pretendard", "Apple SD Gothic Neo", sans-serif';

// ---------- 하늘·로비 ----------
function skyTexture() {
  return canvasTex(1024, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#0E1030"); g.addColorStop(0.55, "#1E2452"); g.addColorStop(0.8, "#3B3F80"); g.addColorStop(1, "#6A5E8C");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) { const x = rnd() * 1024, y = rnd() * 380, r = rnd() * 1.4 + .2; ctx.fillStyle = `rgba(255,244,214,${.35 + rnd() * .65})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    // 구름 띠
    for (let i = 0; i < 14; i++) { const x = rnd() * 1024, y = 330 + rnd() * 120; const rg = ctx.createRadialGradient(x, y, 0, x, y, 120 + rnd() * 80); rg.addColorStop(0, "rgba(140,130,190,.35)"); rg.addColorStop(1, "rgba(140,130,190,0)"); ctx.fillStyle = rg; ctx.fillRect(x - 220, y - 220, 440, 440); }
  });
}
function floorTexture(a: string, b: string) {
  const t = canvasTex(256, 256, (ctx) => { ctx.fillStyle = a; ctx.fillRect(0, 0, 256, 256); ctx.strokeStyle = b; ctx.lineWidth = 2; ctx.strokeRect(1, 1, 254, 254); ctx.globalAlpha = .25; ctx.strokeRect(128, 1, 1, 254); ctx.strokeRect(1, 128, 254, 1); });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// 이름표 1024×300
function plateTexture(a: Artist) {
  return canvasTex(1024, 300, (ctx) => {
    ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 1024, 300);
    ctx.fillStyle = DEPT_COLOR[a.dept]; ctx.fillRect(0, 0, 18, 300);
    ctx.fillStyle = "#6B6675"; ctx.font = `600 22px ${F_SANS}`; ctx.fillText(`${a.dept_en.toUpperCase()} · ${a.dept_ko} · BOOTH ${a.id.toUpperCase()}`, 50, 52);
    ctx.fillStyle = "#2B2833"; ctx.font = `700 86px ${F_SERIF}`; ctx.fillText(a.name, 46, 150);
    const nw = ctx.measureText(a.name).width; ctx.font = `500 30px ${F_SANS}`; ctx.fillStyle = "#6B6675"; ctx.fillText(a.name_en, 60 + nw, 150);
    ctx.fillStyle = "#2B2833"; ctx.font = `600 40px ${F_SERIF}`; let t = `「${a.title}」`; while (ctx.measureText(t).width > 940 && t.length > 6) t = t.slice(0, -3) + "…」"; ctx.fillText(t, 48, 230);
    ctx.fillStyle = DEPT_COLOR[a.dept]; ctx.fillRect(48, 258, 300, 5);
  });
}
// 서명 + QR 안내판 600×900
async function qrBoardTexture(a: Artist) {
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, urlOfArtist(a.id), { width: 420, margin: 1, color: { dark: "#171A33", light: "#FFFFFF" } });
  let sign: HTMLImageElement | null = null;
  if (a.sign) { sign = new Image(); sign.src = signOf(a); try { await sign.decode(); } catch { sign = null; } }
  return canvasTex(600, 900, (ctx) => {
    ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 600, 900);
    ctx.fillStyle = DEPT_COLOR[a.dept]; ctx.fillRect(0, 0, 600, 14);
    ctx.fillStyle = "#6B6675"; ctx.font = `600 20px ${F_SANS}`; ctx.textAlign = "center"; ctx.fillText("ARTIST SIGNATURE", 300, 54);
    if (sign) { const s = Math.min(440 / sign.width, 200 / sign.height); const w = sign.width * s, h = sign.height * s; ctx.drawImage(sign, 300 - w / 2, 180 - h / 2, w, h); }
    else { ctx.fillStyle = "#2B2833"; ctx.font = `700 64px ${F_SERIF}`; ctx.fillText(a.name, 300, 200); }
    ctx.fillStyle = "#2B2833"; ctx.font = `600 26px ${F_SANS}`; ctx.fillText("휴대폰으로 보기 · 작가 페이지", 300, 320);
    ctx.drawImage(qr, 90, 345, 420, 420);
    ctx.fillStyle = "#6B6675"; ctx.font = `500 22px ${F_SANS}`; ctx.fillText(`${a.name} · ${a.title}`.slice(0, 30), 300, 820);
    ctx.font = `500 18px ${F_SANS}`; ctx.fillText("QR 을 찍으면 이 부스가 휴대폰에서 열립니다", 300, 856);
  });
}

// ---------- 부스 ----------
type Frame = { mesh: THREE.Mesh; url: string; kind: Hit["kind"]; index: number };
type BoothObj = { booth: Booth; group: THREE.Group; frames: Frame[]; loaded: boolean; loading: boolean; plate: THREE.Mesh; qr: THREE.Mesh; qrDone: boolean };

function framed(w: number, h: number, frameColor: string, kind: Hit["kind"], index: number, url: string, booth: Booth): { group: THREE.Group; frame: Frame } {
  const g = new THREE.Group();
  const bd = 0.06; // 액자 테두리
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + bd * 2, h + bd * 2, 0.05), new THREE.MeshStandardMaterial({ color: frameColor, roughness: .6 }));
  back.position.z = -0.03; g.add(back);
  const mat = new THREE.MeshBasicMaterial({ color: 0xd9d2c4 });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); art.position.z = 0.001; g.add(art);
  art.userData = { booth, kind, index };
  return { group: g, frame: { mesh: art, url, kind, index } };
}

// 부스 핀스팟 조명 기구(검은 캔 + 빛기둥). 실제 SpotLight 는 가까운 부스에만 풀로 붙인다(spotPool)
function spotFixture(from: THREE.Vector3, to: THREE.Vector3, radius: number, color: string) {
  const g = new THREE.Group();
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: .5, metalness: .4 }));
  const dir = new THREE.Vector3().subVectors(to, from); const len = dir.length(); dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  can.position.copy(from); can.quaternion.copy(q); g.add(can);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, len, 20, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.085, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.position.copy(from).addScaledVector(dir, len / 2); cone.quaternion.copy(q); cone.renderOrder = 5; g.add(cone);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); bulb.position.copy(from).addScaledVector(dir, 0.12); g.add(bulb);
  return g;
}
function softSprite() {
  return canvasTex(64, 64, (ctx) => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });
}
// 관 설명판 1024×768
function wingBoardTexture(w: Wing, n: number) {
  return canvasTex(1024, 768, (ctx) => {
    ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 1024, 768); ctx.fillStyle = w.color; ctx.fillRect(0, 0, 1024, 26); ctx.fillRect(0, 742, 1024, 26);
    ctx.fillStyle = "#6B6675"; ctx.font = `600 26px ${F_SANS}`; ctx.fillText(w.en, 64, 96);
    ctx.fillStyle = "#2B2833"; ctx.font = `700 84px ${F_SERIF}`; ctx.fillText(w.name, 60, 190);
    ctx.fillStyle = w.color; ctx.fillRect(64, 215, 160, 8);
    ctx.fillStyle = "#2B2833"; ctx.font = `400 34px ${F_SANS}`;
    const words = w.desc.split(" "); let line = "", y = 290; const maxW = 900;
    for (const wd of words) { const t = line ? line + " " + wd : wd; if (ctx.measureText(t).width > maxW) { ctx.fillText(line, 64, y); y += 52; line = wd; } else line = t; }
    if (line) ctx.fillText(line, 64, y);
    ctx.fillStyle = "#6B6675"; ctx.font = `600 28px ${F_SANS}`; ctx.fillText(`졸업생 ${n}명 · 부스 ${n}개 · 복도 양쪽 · 옆 벽의 대표작을 누르면 그 작가 부스 앞으로 갑니다`, 64, 690);
  });
}
// 로비 안내 푯말(3방향 화살표)
function signpost(): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 12), new THREE.MeshStandardMaterial({ color: 0xF6F1E7 })); pole.position.y = 1.7; g.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.12, 20), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); base.position.y = 0.06; g.add(base);
  WINGS.forEach((w, i) => {
    const n = BOOTHS.filter((b) => b.wing === w.key).length;
    const tex = canvasTex(1024, 192, (ctx) => { ctx.fillStyle = w.color; ctx.fillRect(0, 0, 1024, 192); ctx.fillStyle = "#1B1F3B"; ctx.textAlign = "left"; fitText(ctx, `${w.arrow}  ${w.name}`, 800, 76, "700", F_SERIF); ctx.fillText(`${w.arrow}  ${w.name}`, 40, 118); ctx.font = `600 40px ${F_SANS}`; ctx.textAlign = "right"; ctx.fillText(`${n}명`, 984, 118); });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(w.color) }));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = 0.031;
    const back = face.clone(); back.position.z = -0.031; back.rotation.y = Math.PI;
    const holder = new THREE.Group(); holder.add(board, face, back);
    // 입구(+z)에서 걸어오며 읽도록 모두 +z 를 향하고, 화살표 글자로 방향을 알린다. 서·동 판은 살짝 그쪽으로 튼다
    holder.position.set(w.dir[0] * 0.25, 2.95 - i * 0.6, 0); holder.rotation.y = w.dir[0] * -0.35;
    g.add(holder);
  });
  return g;
}
// 관 입구 대표작 썸네일 벽: 캔버스 한 장에 격자로 그린다(클릭은 uv 로 칸을 찾는다)
type ThumbWall = { mesh: THREE.Mesh; booths: Booth[]; cols: number; rows: number };
async function thumbWallTexture(w: Wing, booths: Booth[], cols: number, rows: number) {
  const W = 2048, H = 1536; const cw = W / cols, ch = H / rows; const pad = 14;
  const imgs = await Promise.all(booths.map(async (b) => { const im = new Image(); im.src = artImg(b.artist, b.artist.main!.thumb); try { await im.decode(); return im; } catch { return null; } }));
  return canvasTex(W, H, (ctx) => {
    ctx.fillStyle = "#1E2244"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = w.color; ctx.fillRect(0, 0, W, 10);
    booths.forEach((b, i) => {
      const x = (i % cols) * cw + pad, y = Math.floor(i / cols) * ch + pad, iw = cw - pad * 2, ih = ch - pad * 2 - 44;
      ctx.fillStyle = "#FCFAF5"; ctx.fillRect(x - 4, y - 4, iw + 8, ih + 8 + 44);
      const im = imgs[i];
      if (im) { const s = Math.max(iw / im.width, ih / im.height); const sw = iw / s, sh = ih / s; ctx.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, iw, ih); }
      else { ctx.fillStyle = "#D9D0BF"; ctx.fillRect(x, y, iw, ih); }
      ctx.fillStyle = "#2B2833"; ctx.font = `700 ${Math.round(Math.min(30, cw / 9))}px ${F_SERIF}`; ctx.textAlign = "left"; ctx.fillText(b.artist.name, x + 6, y + ih + 32);
      ctx.fillStyle = "#6B6675"; ctx.font = `500 ${Math.round(Math.min(20, cw / 13))}px ${F_SANS}`; ctx.textAlign = "right"; let t = b.artist.title; while (ctx.measureText(t).width > iw - 90 && t.length > 3) t = t.slice(0, -2) + "…"; ctx.fillText(t, x + iw - 4, y + ih + 30);
    });
  });
}

function buildBooth(b: Booth, scene: THREE.Scene): BoothObj {
  const a = b.artist; const pal = a.palette!;
  const g = new THREE.Group(); g.position.set(b.x, 0, b.z); g.rotation.y = b.yaw;
  const wallC = new THREE.Color(pal.mood === "dark" ? pal.dark : pal.wall).lerp(new THREE.Color(pal.mood === "dark" ? "#1a1a22" : "#ffffff"), pal.mood === "dark" ? 0.2 : 0.15);
  const wallMat = new THREE.MeshStandardMaterial({ color: wallC, roughness: .95 });
  const floorMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.floor), roughness: .9 });
  const frameColor = pal.mood === "dark" ? "#F6F1E7" : (a.dept === "webtoon" ? "#2B2833" : a.dept === "illust" ? "#F6F1E7" : a.dept === "comics" ? "#1b1b1b" : "#6CC0A0");
  // 바닥
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(BOOTH_W, BOOTH_D + 1.2), floorMat); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.015, -0.6); g.add(fl);
  // 뒷벽·옆벽
  const back = new THREE.Mesh(new THREE.BoxGeometry(BOOTH_W, BOOTH_H, 0.2), wallMat); back.position.set(0, BOOTH_H / 2, BOOTH_D / 2); g.add(back);
  const sideGeo = new THREE.BoxGeometry(0.2, BOOTH_H, BOOTH_D);
  const l = new THREE.Mesh(sideGeo, wallMat); l.position.set(-BOOTH_W / 2, BOOTH_H / 2, 0); g.add(l);
  const r = new THREE.Mesh(sideGeo, wallMat); r.position.set(BOOTH_W / 2, BOOTH_H / 2, 0); g.add(r);
  // 상단 띠(분야색)
  const band = new THREE.Mesh(new THREE.BoxGeometry(BOOTH_W, 0.18, 0.24), new THREE.MeshStandardMaterial({ color: DEPT_COLOR[a.dept] })); band.position.set(0, BOOTH_H - 0.09, BOOTH_D / 2); g.add(band);
  // 포인트 색 기둥(앞쪽 모서리)
  const postMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.accent) });
  for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, BOOTH_H, 0.16), postMat); p.position.set(sx * (BOOTH_W / 2), BOOTH_H / 2, -BOOTH_D / 2); g.add(p); }

  const frames: Frame[] = [];
  // 대표작: 뒷벽 중앙
  if (a.main) {
    // 세로 그림은 폭이 좁아 뒤 이름표가 양옆으로 삐져나오므로, 조금 낮게 걸고 이름표 아래(3.0m)까지만 키운다
    const ar = a.main.w / a.main.h; const tall = ar < 1; const maxW = 3.4, maxH = tall ? 2.2 : 2.5, y0 = tall ? 0.75 : 1.25;
    let w = maxW, h = w / ar; if (h > maxH) { h = maxH; w = h * ar; }
    const f = framed(w, h, frameColor, "main", 0, artImg(a, a.main.tex), b); f.group.position.set(0, y0 + h / 2, BOOTH_D / 2 - 0.11); f.group.rotation.y = Math.PI; g.add(f.group); frames.push(f.frame);
  }
  // 이름표: 뒷벽 위
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ map: plateTexture(a) }));
  plate.position.set(0, BOOTH_H - 0.58, BOOTH_D / 2 - 0.11); plate.rotation.y = Math.PI; plate.userData = { booth: b, kind: "plate", index: 0 }; g.add(plate);
  // 옆벽 작품: 왼쪽 절반·오른쪽 절반
  const half = Math.ceil(a.works.length / 2); const sides = [a.works.slice(0, half), a.works.slice(half)];
  sides.forEach((list, si) => {
    if (!list.length) return;
    const wallX = (si === 0 ? -1 : 1) * (BOOTH_W / 2 - 0.11); const usable = BOOTH_D - 0.5; const slot = usable / list.length;
    list.forEach((w, k) => {
      const idx = si === 0 ? k : half + k; const ar = w.w / w.h;
      let fh = Math.min(w.strip ? 3.1 : 2.3, BOOTH_H - 0.7), fw = fh * ar; const maxW = slot - 0.25; if (fw > maxW) { fw = maxW; fh = fw / ar; }
      const f = framed(fw, fh, frameColor, "work", idx, artImg(a, w.tex), b);
      const zc = -BOOTH_D / 2 + 0.25 + slot * (k + 0.5) + 0.15; // 복도 쪽→안쪽 순서
      f.group.position.set(wallX, (w.strip ? 0.35 : 0.9) + fh / 2, zc); f.group.rotation.y = si === 0 ? Math.PI / 2 : -Math.PI / 2; g.add(f.group); frames.push(f.frame);
    });
  });
  // 서명·QR 안내판: 앞쪽 오른쪽 기둥 옆, 복도를 향해
  const qr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ color: 0xfcfaf5 }));
  const stand = new THREE.Group(); stand.position.set(BOOTH_W / 2 - 0.55, 0, -BOOTH_D / 2 + 0.35);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x444455 })); pole.position.y = 0.5; stand.add(pole);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x444455 })); base.position.y = 0.02; stand.add(base);
  qr.position.set(0, 1.45, 0); qr.rotation.y = Math.PI; qr.rotation.x = 0.15; qr.userData = { booth: b, kind: "qr", index: 0 }; stand.add(qr); g.add(stand);
  // 핀스팟 조명: 천장 레일(앞쪽 상단) → 대표작·양 옆벽
  const rail = new THREE.Mesh(new THREE.BoxGeometry(BOOTH_W - 0.4, 0.06, 0.06), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, metalness: .5, roughness: .4 })); rail.position.set(0, BOOTH_H + 0.25, -BOOTH_D / 2 + 0.7); g.add(rail);
  const warm = pal.mood === "dark" ? "#FFE9C4" : "#FFF3DC";
  g.add(spotFixture(new THREE.Vector3(0, BOOTH_H + 0.2, -BOOTH_D / 2 + 0.7), new THREE.Vector3(0, 2.0, BOOTH_D / 2 - 0.1), 1.6, warm));
  g.add(spotFixture(new THREE.Vector3(-1.9, BOOTH_H + 0.2, -BOOTH_D / 2 + 0.7), new THREE.Vector3(-BOOTH_W / 2 + 0.1, 1.8, 0.6), 1.3, warm));
  g.add(spotFixture(new THREE.Vector3(1.9, BOOTH_H + 0.2, -BOOTH_D / 2 + 0.7), new THREE.Vector3(BOOTH_W / 2 - 0.1, 1.8, 0.6), 1.3, warm));
  scene.add(g);
  return { booth: b, group: g, frames, loaded: false, loading: false, plate, qr, qrDone: false };
}

// ---------- 월드 ----------
export class World {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; booths: BoothObj[] = [];
  yaw = Math.PI; pitch = 0; pos = new THREE.Vector3(0, 1.6, ENTRANCE_Z - 2);
  keys = new Set<string>(); move = { x: 0, y: 0 }; look = { dx: 0, dy: 0 }; run = false;
  raycaster = new THREE.Raycaster(); clickables: THREE.Object3D[] = []; letters!: THREE.InstancedMesh; letterSeeds: number[] = [];
  lastNear: Booth | null = null; lastWing: Wing | null | undefined = undefined; t0 = performance.now(); disposed = false; opts: WorldOpts; loadTimer = 0;
  spotPool: THREE.SpotLight[] = []; leds!: THREE.InstancedMesh; ledPos: THREE.Vector3[] = []; ledPhase: number[] = []; ledGlow!: THREE.Points; milky: THREE.Points[] = [];
  thumbWalls: ThumbWall[] = []; bookRefresh = 0;
  // 작품 정면 보기: 카메라를 작품 앞으로 부드럽게 옮긴다. inset = 설명 패널이 가리는 오른쪽(px)·아래(px)
  focus: { fx: number; fz: number; tx: number; tz: number; fy: number; ty: number; fp: number; tp: number; t0: number; dur: number } | null = null;
  inset = { right: 0, bottom: 0 };
  eye = 1.6; eyeTarget = 1.6;   // 눈높이: 작품 정면 보기 때는 작품 중심 높이로 맞춘다

  constructor(opts: WorldOpts) {
    this.opts = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas: opts.canvas, antialias: !isMobile, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.camera = new THREE.PerspectiveCamera(isMobile ? 75 : 68, 1, 0.1, 400);
    this.scene.fog = new THREE.Fog(0x1a1d3c, 60, 160);
    this.build(); this.resize(); window.addEventListener("resize", this.resize);
    this.renderer.setAnimationLoop(this.tick); opts.onReady();
    (window as unknown as { __world?: World }).__world = this; // 검수 스크립트(scripts/shots.py)에서 시점을 잡기 위한 손잡이
  }
  resize = () => { const w = this.opts.canvas.clientWidth || window.innerWidth, h = this.opts.canvas.clientHeight || window.innerHeight; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.applyInset(); };
  // 패널이 가린 만큼 화면 중심을 옮긴다(작품이 남은 영역 가운데에 오도록)
  applyInset() {
    const w = this.opts.canvas.clientWidth || window.innerWidth, h = this.opts.canvas.clientHeight || window.innerHeight;
    if (this.inset.right || this.inset.bottom) this.camera.setViewOffset(w, h, this.inset.right / 2, this.inset.bottom / 2, w, h); else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }
  setInset(right: number, bottom: number) { this.inset = { right, bottom }; this.applyInset(); if (!right && !bottom) this.eyeTarget = 1.6; }
  // 부스의 특정 작품 액자(대표작 index 0 / 작품 index i)
  frameMesh(artistId: string, kind: "main" | "work", index: number): THREE.Object3D | undefined {
    const o = this.booths.find((x) => x.booth.artist.id === artistId); return o?.frames.find((f) => f.kind === kind && f.index === index)?.mesh;
  }
  focusArt(obj: THREE.Object3D) {
    const mesh = obj as THREE.Mesh; mesh.updateWorldMatrix(true, false);
    const c = new THREE.Vector3(); mesh.getWorldPosition(c);
    const q = new THREE.Quaternion(); mesh.getWorldQuaternion(q); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q); n.y = 0; n.normalize();
    const g = (mesh.geometry as THREE.PlaneGeometry).parameters || { width: 1.5, height: 1.5 }; const sc = new THREE.Vector3(); mesh.getWorldScale(sc);
    const aw = g.width * sc.x, ah = g.height * sc.y;
    const W = this.opts.canvas.clientWidth || window.innerWidth, H = this.opts.canvas.clientHeight || window.innerHeight;
    const vis = Math.max(0.35, (H - this.inset.bottom) / H); const half = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspectAvail = Math.max(0.4, (W - this.inset.right) / Math.max(1, H - this.inset.bottom));
    const dist = Math.max(1.2, Math.max((ah / 2) / (half * vis), (aw / 2) / (half * vis * aspectAvail)) * 1.32);
    const tx = c.x + n.x * dist, tz = c.z + n.z * dist;
    const ty = Math.atan2(n.x, n.z); let dy = ty - this.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const tp = 0; this.eyeTarget = c.y;   // 작품 중심과 같은 높이에서 수평으로 → 사다리꼴 왜곡 없는 정면
    this.focus = { fx: this.pos.x, fz: this.pos.z, tx, tz, fy: this.yaw, ty: this.yaw + dy, fp: this.pitch, tp, t0: performance.now(), dur: 700 };
    const ob = this.booths.find((o) => o.frames.some((f) => f.mesh === obj)); if (ob) this.loadBooth(ob);
  }
  dispose() { this.disposed = true; this.renderer.setAnimationLoop(null); window.removeEventListener("resize", this.resize); window.clearInterval(this.bookRefresh); this.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mat = m.material as THREE.Material | THREE.Material[]; if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => { const mm = x as THREE.MeshBasicMaterial; mm.map?.dispose(); x.dispose(); }); }); this.renderer.dispose(); }

  build() {
    const S = this.scene;
    // 빛: 전체는 어둑하게, 부스는 핀스팟 풀(가까운 부스에만 실제 SpotLight)
    S.add(new THREE.HemisphereLight(0x9aa6ff, 0x3a2f28, 0.7));
    const sun = new THREE.DirectionalLight(0xfff1dc, 0.5); sun.position.set(30, 60, 20); S.add(sun);
    S.add(new THREE.AmbientLight(0xffffff, 0.12));
    for (let i = 0; i < (isMobile ? 4 : 8); i++) {
      const sl = new THREE.SpotLight(0xfff0d6, 0, 18, 0.55, 0.6, 1.5); sl.position.set(0, 30, 0); sl.target.position.set(0, 0, 0); S.add(sl); S.add(sl.target); this.spotPool.push(sl);
    }
    // 하늘 돔
    const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 48, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false })); S.add(sky);
    // 큰 바닥
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshStandardMaterial({ color: 0x1f2340, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; S.add(ground);
    // 로비 바닥·테두리
    const lobbyTex = floorTexture("#2C2F55", "#3D4280"); lobbyTex.repeat.set(10, 10);
    const lobby = new THREE.Mesh(new THREE.CircleGeometry(LOBBY_R + 0.5, 64), new THREE.MeshStandardMaterial({ map: lobbyTex, roughness: .8 })); lobby.rotation.x = -Math.PI / 2; lobby.position.y = 0.005; S.add(lobby);
    const ring = new THREE.Mesh(new THREE.RingGeometry(LOBBY_R + 0.5, LOBBY_R + 0.9, 64), new THREE.MeshBasicMaterial({ color: 0xF6F1E7 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; S.add(ring);
    // 로비 가운데 상징: 우체통 + 로고 배너(양면)
    const post = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.7), new THREE.MeshStandardMaterial({ color: 0xB8343A, roughness: .5 })); box.position.y = 1.35; post.add(box);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.92, 24, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xB8343A })); cap.rotation.z = Math.PI / 2; cap.rotation.y = Math.PI / 2; cap.position.y = 1.9; post.add(cap);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x3b2a2a })); leg.position.y = 0.4; post.add(leg);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), new THREE.MeshStandardMaterial({ color: 0x222 })); slot.position.set(0, 1.55, 0.36); post.add(slot);
    post.position.set(0, 0, 0); S.add(post);
    const logoTex = texLoader.load(EX.logo, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.6), new THREE.MeshBasicMaterial({ map: logoTex, side: THREE.DoubleSide })); banner.position.set(0, 4.6, 0); S.add(banner);
    const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 6, 10), new THREE.MeshStandardMaterial({ color: 0xF6F1E7 })); bannerPole.position.set(0, 3, -0.02); S.add(bannerPole);
    // 로비 둘레 표지판(각 관 입구) + 복도
    for (const w of WINGS) {
      const [dx, dz] = w.dir; const L = wingLength(w.key);
      const corridorTex = floorTexture("#2A2D4F", "#3A3E72"); corridorTex.repeat.set(2, L / 4);
      const cor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF * 2, L), new THREE.MeshStandardMaterial({ map: corridorTex, roughness: .85 }));
      cor.rotation.x = -Math.PI / 2; cor.rotation.z = Math.atan2(dx, dz); const mid = L / 2; cor.position.set(dx * mid, 0.004, dz * mid); S.add(cor);
      // 관 이름 아치
      const arch = new THREE.Group(); arch.position.set(dx * (LOBBY_R + 1.2), 0, dz * (LOBBY_R + 1.2)); arch.rotation.y = Math.atan2(dx, dz);
      const archMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(w.color) });
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), archMat); p.position.set(sx * (HALL_HALF + 0.2), 2.5, 0); arch.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(HALL_HALF * 2 + 0.7, 0.9, 0.3), archMat); top.position.y = 5.2; arch.add(top);
      const signTex = canvasTex(1024, 128, (ctx) => { ctx.fillStyle = w.color; ctx.fillRect(0, 0, 1024, 128); ctx.fillStyle = "#1B1F3B"; ctx.textAlign = "center"; fitText(ctx, w.label, 980, 60, "700", F_SERIF); ctx.fillText(w.label, 512, 84); });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF * 2 + 0.6, 0.85), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })); sign.position.set(0, 5.2, -0.16); sign.rotation.y = Math.PI; arch.add(sign);
      const sign2 = sign.clone(); sign2.position.z = 0.16; sign2.rotation.y = 0; arch.add(sign2);
      S.add(arch);
      // 복도 끝 벽
      const end = new THREE.Mesh(new THREE.BoxGeometry(HALL_HALF * 2 + BOOTH_D * 2 + 1, BOOTH_H, 0.3), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); end.position.set(dx * (L + 0.1), BOOTH_H / 2, dz * (L + 0.1)); end.rotation.y = Math.atan2(dx, dz); S.add(end);
    }
    // 입구 통로 + 게이트 + 뒷벽(표지 그림)
    const entTex = floorTexture("#2A2D4F", "#3A3E72"); entTex.repeat.set(2, 8);
    const ent = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF * 2, ENTRANCE_Z - LOBBY_R + 8), new THREE.MeshStandardMaterial({ map: entTex, roughness: .85 })); ent.rotation.x = -Math.PI / 2; ent.position.set(0, 0.004, (ENTRANCE_Z + 8 + LOBBY_R) / 2); S.add(ent);
    const gate = new THREE.Group(); gate.position.set(0, 0, LOBBY_R + 1.5);
    const gMat = new THREE.MeshStandardMaterial({ color: 0xF6F1E7, roughness: .7 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), gMat); p.position.set(sx * (HALL_HALF + 0.3), 3, 0); gate.add(p); }
    const gateTop = new THREE.Mesh(new THREE.BoxGeometry(HALL_HALF * 2 + 1.2, 1.2, 0.4), gMat); gateTop.position.y = 6.2; gate.add(gateTop);
    const gateSign = canvasTex(1024, 160, (ctx) => { ctx.fillStyle = "#F6F1E7"; ctx.fillRect(0, 0, 1024, 160); ctx.fillStyle = "#1B1F3B"; ctx.textAlign = "center"; ctx.font = `700 64px ${F_SERIF}`; ctx.fillText("MOVE : 이소", 512, 78); ctx.font = `500 28px ${F_SANS}`; ctx.fillText(`${EX.school} ${EX.dept} ${EX.edition} · ${EX.dates}`, 512, 128); });
    const gs = new THREE.Mesh(new THREE.PlaneGeometry(HALL_HALF * 2 + 1, 1.1), new THREE.MeshBasicMaterial({ map: gateSign })); gs.position.set(0, 6.2, 0.21); gate.add(gs); S.add(gate);
    const coverTex = texLoader.load(EX.cover, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(HALL_HALF * 2 + 6, 9, 0.3), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); wallBack.position.set(0, 4.5, ENTRANCE_Z + 8); S.add(wallBack);
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 7.3), new THREE.MeshBasicMaterial({ map: coverTex })); cover.position.set(0, 4.2, ENTRANCE_Z + 7.8); cover.rotation.y = Math.PI; S.add(cover);
    // 입구 통로 양쪽 벽 + 환영 문구
    for (const sx of [-1, 1]) {
      const wl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, ENTRANCE_Z - LOBBY_R + 8), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); wl.position.set(sx * (HALL_HALF + 0.15), 2, (ENTRANCE_Z + 8 + LOBBY_R) / 2); S.add(wl);
    }
    // 입구 통로 양쪽 벽에 교수님·선후배 축전 플래카드(도록 페이지) — 봉에 매단 세로 현수막
    const trib = EX.tributes; const perSide = Math.ceil(trib.length / 2);
    trib.forEach((tb, i) => {
      const sx = i < perSide ? -1 : 1; const k = i % perSide; const z = LOBBY_R + 5 + k * 2.75;
      const g = new THREE.Group(); g.position.set(sx * (HALL_HALF - 0.08), 0, z); g.rotation.y = sx * -Math.PI / 2;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 10), new THREE.MeshStandardMaterial({ color: 0xC9A96E, metalness: .6, roughness: .35 })); bar.rotation.z = Math.PI / 2; bar.position.set(0, 3.55, 0.05); g.add(bar);
      for (const hx of [-0.8, 0.8]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 6), new THREE.MeshBasicMaterial({ color: 0xF6F1E7 })); s.position.set(hx, 3.8, 0.05); g.add(s); }
      const tex = texLoader.load(v(`catalog/${tb.img}`), (t) => { t.colorSpace = THREE.SRGBColorSpace; });
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.4), new THREE.MeshBasicMaterial({ map: tex })); cloth.position.set(0, 2.3, 0.06); g.add(cloth);
      const tassel = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(DEPTS[i % 4].color) })); tassel.position.set(0, 1.06, 0.06); g.add(tassel);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.22), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 132, (ctx) => { ctx.fillStyle = "#F6F1E7"; ctx.fillRect(0, 0, 1024, 132); ctx.fillStyle = "#1B1F3B"; ctx.font = `600 58px ${F_SERIF}`; ctx.textAlign = "center"; ctx.fillText(tb.who, 512, 88); }) })); label.position.set(0, 0.82, 0.06); g.add(label);
      // 플래카드 전용 작은 조명
      g.add(spotFixture(new THREE.Vector3(0, 4.3, 1.1), new THREE.Vector3(0, 2.3, 0.06), 1.0, "#FFF3DC"));
      S.add(g);
    });
    // 입구 게이트 안쪽: 학과장·사회자 스탠디(세워 둔 등신대) + 말풍선. 누르면 개회식 안내
    HOSTS.forEach((h, i) => {
      const sx = h.id === "mc" ? 1 : -1; const g = new THREE.Group(); g.position.set(sx * (HALL_HALF - 1.7), 0, LOBBY_R + 3.6); g.rotation.y = sx * -0.22;
      const tex = texLoader.load(h.img, (t) => { t.colorSpace = THREE.SRGBColorSpace; });
      // 등신대: 높이 2.4m(실제 키보다 조금 크게, 멀리서도 보이도록)
      const fig = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 2.4), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })); fig.position.set(0, 1.22, 0); fig.userData = { kind: "host", index: i }; g.add(fig); this.clickables.push(fig);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); foot.position.set(0, 0.03, 0.05); g.add(foot);
      const bub = canvasTex(1024, 300, (ctx) => {
        ctx.fillStyle = "#FCFAF5"; ctx.beginPath(); ctx.roundRect(8, 8, 1008, 230, 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(470, 236); ctx.lineTo(512, 290); ctx.lineTo(554, 236); ctx.fill();
        ctx.fillStyle = h.color; ctx.font = `700 30px ${F_SANS}`; ctx.fillText(`${h.name} · ${h.role}`, 50, 70);
        ctx.fillStyle = "#2B2833"; ctx.font = `500 40px ${F_SANS}`; const words = ENTRANCE_BUBBLES[h.id].split(" "); let line = "", y = 135;
        for (const wd of words) { const t = line ? line + " " + wd : wd; if (ctx.measureText(t).width > 920) { ctx.fillText(line, 50, y); y += 52; line = wd; } else line = t; } if (line) ctx.fillText(line, 50, y);
      });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.65), new THREE.MeshBasicMaterial({ map: bub, transparent: true })); b.position.set(0, 2.85, 0.02); b.userData = { kind: "host", index: i }; g.add(b); this.clickables.push(b);
      g.add(spotFixture(new THREE.Vector3(0, 4.4, 1.8), new THREE.Vector3(0, 1.3, 0), 1.4, "#FFF3DC"));
      S.add(g);
    });
    // 입구 방명록대: 게이트 안쪽 가운데 왼편. 펼친 책(최근 글이 보임) + QR 판. 누르면 방명록 페이지
    {
      const g = new THREE.Group(); g.position.set(-3.1, 0, LOBBY_R + 10.6); g.rotation.y = 0.5;  // 입구 왼쪽 벽 쪽(학과장 등신대를 가리지 않게)
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x6B4A33, roughness: .7 });
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), woodMat); stand.position.y = 0.5; g.add(stand);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.06, 20), woodMat); base.position.y = 0.03; g.add(base);
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.9), woodMat); desk.position.set(0, 1.05, 0); desk.rotation.x = -0.35; g.add(desk);
      const bookMat = new THREE.MeshBasicMaterial({ color: 0xfcfaf5 });
      const book = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.78), bookMat); book.position.set(0, 1.085, 0.0); book.rotation.x = -Math.PI / 2 - 0.35 + Math.PI / 2; book.rotation.x = -0.35 + -Math.PI / 2 + Math.PI / 2;
      // 평면을 책상 기울기(-0.35)에 맞춰 눕힌다
      book.rotation.set(-Math.PI / 2 - 0.35, 0, 0); book.position.set(0, 1.085 + 0.0, 0.0); book.userData = { kind: "guestbook", index: 0 }; g.add(book); this.clickables.push(book);
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0x2B2E58 })); pen.position.set(0.45, 1.12, 0.1); pen.rotation.z = 1.1; pen.rotation.x = -0.35; g.add(pen);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.3), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 236, (ctx) => { ctx.fillStyle = "#2B2E58"; ctx.fillRect(0, 0, 1024, 236); ctx.fillStyle = "#FFF4D6"; ctx.textAlign = "center"; ctx.font = `700 110px ${F_SERIF}`; ctx.fillText("방명록 GUESTBOOK", 512, 150); }) })); sign.position.set(0, 1.42, -0.42); sign.rotation.x = -0.25; g.add(sign);
      // QR 판(오른쪽 기둥)
      const qs = new THREE.Group(); qs.position.set(1.05, 0, 0.25);
      const qpole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x444455 })); qpole.position.y = 0.5; qs.add(qpole);
      const qboard = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), new THREE.MeshBasicMaterial({ color: 0xfcfaf5 })); qboard.position.set(0, 1.45, 0); qboard.rotation.x = 0.12; qboard.userData = { kind: "guestbook", index: 1 }; qs.add(qboard); this.clickables.push(qboard); g.add(qs);
      g.add(spotFixture(new THREE.Vector3(0, 4.2, 1.4), new THREE.Vector3(0, 1.1, 0), 1.0, "#FFF3DC"));
      S.add(g);
      const drawBook = async () => {
        const { entries } = await listEntries(8).catch(() => ({ entries: [] as { name: string; message: string; time: string }[] }));
        if (this.disposed) return;
        const t = canvasTex(1180, 780, (ctx) => {
          ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 1180, 780); ctx.fillStyle = "#E7DFCF"; ctx.fillRect(586, 0, 8, 780);
          ctx.fillStyle = "#6B6675"; ctx.font = `600 26px ${F_SANS}`; ctx.fillText("GUESTBOOK · 다녀간 분들의 한마디", 60, 60); ctx.textAlign = "right"; ctx.fillText("QR 을 찍어 휴대폰으로 쓰세요 →", 1120, 60); ctx.textAlign = "left";
          for (let i = 0; i < 44; i++) { ctx.fillStyle = "rgba(43,40,51,.07)"; ctx.fillRect(40, 110 + i * 15, 510, 1); ctx.fillRect(630, 110 + i * 15, 510, 1); }
          const cols = [60, 630]; entries.slice(0, 8).forEach((e, i) => {
            const x = cols[i % 2], y = 120 + Math.floor(i / 2) * 160;
            ctx.fillStyle = "#2B2833"; ctx.font = `700 30px ${F_SERIF}`; ctx.fillText(e.name, x, y + 30);
            ctx.fillStyle = "#6B6675"; ctx.font = `500 20px ${F_SANS}`; ctx.fillText(fmtTime(e.time), x + ctx.measureText(e.name).width * 1.6 + 40, y + 30);
            ctx.fillStyle = "#2B2833"; ctx.font = `500 26px ${F_SANS}`; const words = e.message.split(""); let line = "", ly = y + 72, n = 0;
            for (const ch of words) { if (ctx.measureText(line + ch).width > 490 || ch === "\n") { ctx.fillText(line, x, ly); ly += 34; line = ch === "\n" ? "" : ch; if (++n >= 2) { line += "…"; break; } } else line += ch; }
            if (line) ctx.fillText(line, x, ly);
          });
          if (!entries.length) { ctx.fillStyle = "#6B6675"; ctx.font = `500 34px ${F_SERIF}`; ctx.fillText("첫 번째 방명록을 남겨 주세요.", 60, 220); }
        });
        bookMat.map?.dispose(); bookMat.map = t; bookMat.needsUpdate = true;
      };
      drawBook(); this.bookRefresh = window.setInterval(drawBook, 45000);
      (async () => {
        const qr = document.createElement("canvas"); await QRCode.toCanvas(qr, urlOfGuestbook(), { width: 420, margin: 1, color: { dark: "#171A33", light: "#FFFFFF" } });
        if (this.disposed) return;
        const t = canvasTex(560, 800, (ctx) => {
          ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 560, 800); ctx.fillStyle = "#2B2E58"; ctx.fillRect(0, 0, 560, 14);
          ctx.fillStyle = "#2B2833"; ctx.textAlign = "center"; ctx.font = `700 42px ${F_SERIF}`; ctx.fillText("✎ 방명록 쓰기", 280, 80);
          ctx.font = `500 24px ${F_SANS}`; ctx.fillStyle = "#6B6675"; ctx.fillText("QR 을 찍으면 휴대폰에서 방명록이 열립니다", 280, 125); ctx.fillText("이름과 한마디를 남겨 주세요", 280, 158);
          ctx.drawImage(qr, 70, 190, 420, 420);
          ctx.font = `600 26px ${F_SANS}`; ctx.fillStyle = "#2B2833"; ctx.fillText("GUESTBOOK · MOVE : 이소", 280, 680);
        });
        const m = qboard.material as THREE.MeshBasicMaterial; m.map = t; m.needsUpdate = true;
      })();
    }
    // 로비 포토존: 작가 캐릭터(프로필 아이콘) 콜라주 배경판 + 안내. 누르면 사진 합성 페이지
    {
      const g = new THREE.Group(); const ang = Math.PI * 1.25; g.position.set(Math.cos(ang) * (LOBBY_R - 2.2), 0, Math.sin(ang) * (LOBBY_R - 2.2)); g.rotation.y = Math.atan2(-g.position.x, -g.position.z);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 0.16), new THREE.MeshStandardMaterial({ color: 0xF6F1E7 })); frame.position.set(0, 1.75, 0); g.add(frame);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.9), new THREE.MeshBasicMaterial({ color: 0x2A2F5C })); board.position.set(0, 1.75, 0.085); board.userData = { kind: "photo", index: 0 }; g.add(board); this.clickables.push(board);
      (async () => {
        const imgs = await Promise.all(BOOTHS.map(async (b) => { const im = new Image(); im.src = b.artist.avatar ? artImg(b.artist, b.artist.avatar) : artImg(b.artist, b.artist.main!.thumb); try { await im.decode(); return im; } catch { return null; } }));
        if (this.disposed) return;
        const t = canvasTex(2048, 1380, (ctx) => {
          const gr = ctx.createLinearGradient(0, 0, 0, 1380); gr.addColorStop(0, "#2E3474"); gr.addColorStop(1, "#171A33"); ctx.fillStyle = gr; ctx.fillRect(0, 0, 2048, 1380);
          for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(255,244,214,${0.3 + Math.random() * .6})`; ctx.beginPath(); ctx.arc(Math.random() * 2048, Math.random() * 1380, Math.random() * 2 + .5, 0, 7); ctx.fill(); }
          const cols = 11, r = 78; imgs.forEach((im, i) => { const cx = 130 + (i % cols) * 180 + ((Math.floor(i / cols) % 2) * 90), cy = 150 + Math.floor(i / cols) * 175; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.clip(); if (im) ctx.drawImage(im, cx - r, cy - r, r * 2, r * 2); ctx.restore(); ctx.strokeStyle = "#FCFAF5"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); });
          ctx.fillStyle = "rgba(23,26,51,.72)"; ctx.fillRect(0, 880, 2048, 500);
          ctx.fillStyle = "#FFF4D6"; ctx.textAlign = "center"; ctx.font = `700 150px ${F_SERIF}`; ctx.fillText("PHOTO ZONE", 1024, 1060);
          ctx.font = `600 54px ${F_SANS}`; ctx.fillText("작가 42명의 캐릭터와 함께 사진 찍기 — 여기를 누르면 내 사진을 올려 합성할 수 있어요", 1024, 1160);
          ctx.font = `500 44px ${F_SANS}`; ctx.fillStyle = "rgba(255,244,214,.8)"; ctx.fillText("MOVE : 이소 · 2026. 10. 28 – 11. 02", 1024, 1250);
        });
        const m = board.material as THREE.MeshBasicMaterial; m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
      })();
      const mark = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 40), new THREE.MeshBasicMaterial({ color: 0xFFF4D6, transparent: true, opacity: .7 })); mark.rotation.x = -Math.PI / 2; mark.position.set(0, 0.02, 2.6); g.add(mark);
      // 포토존 QR 안내판: 휴대폰으로 찍으면 휴대폰의 포토존이 열리고 바로 사진을 올릴 수 있다
      const qstand = new THREE.Group(); qstand.position.set(2.75, 0, 0.9); qstand.rotation.y = -0.35;
      const qpole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0x444455 })); qpole.position.y = 0.5; qstand.add(qpole);
      const qbase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x444455 })); qbase.position.y = 0.02; qstand.add(qbase);
      const qboard = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.0), new THREE.MeshBasicMaterial({ color: 0xfcfaf5 })); qboard.position.set(0, 1.5, 0); qboard.rotation.x = 0.12; qboard.userData = { kind: "photo", index: 1 }; qstand.add(qboard); this.clickables.push(qboard); g.add(qstand);
      (async () => {
        const qr = document.createElement("canvas");
        await QRCode.toCanvas(qr, `${siteBase()}#/photo?open=1`, { width: 420, margin: 1, color: { dark: "#171A33", light: "#FFFFFF" } });
        if (this.disposed) return;
        const t = canvasTex(560, 800, (ctx) => {
          ctx.fillStyle = "#FCFAF5"; ctx.fillRect(0, 0, 560, 800); ctx.fillStyle = "#C86B5C"; ctx.fillRect(0, 0, 560, 14);
          ctx.fillStyle = "#2B2833"; ctx.textAlign = "center"; ctx.font = `700 40px ${F_SERIF}`; ctx.fillText("📷 휴대폰으로 포토존", 280, 80);
          ctx.font = `500 24px ${F_SANS}`; ctx.fillStyle = "#6B6675"; ctx.fillText("QR 을 찍으면 내 휴대폰에서 포토존이 열리고", 280, 125); ctx.fillText("바로 사진을 찍어 캐릭터와 합성할 수 있어요", 280, 158);
          ctx.drawImage(qr, 70, 190, 420, 420);
          ctx.font = `600 26px ${F_SANS}`; ctx.fillStyle = "#2B2833"; ctx.fillText("PHOTO ZONE · MOVE : 이소", 280, 680);
          ctx.font = `500 20px ${F_SANS}`; ctx.fillStyle = "#6B6675"; ctx.fillText("사진은 휴대폰 안에서만 합성됩니다", 280, 720);
        });
        const m = qboard.material as THREE.MeshBasicMaterial; m.map = t; m.needsUpdate = true;
      })();
      g.add(spotFixture(new THREE.Vector3(0, 4.6, 2.2), new THREE.Vector3(0, 1.75, 0.1), 2.2, "#FFF3DC"));
      S.add(g);
    }
    const welcome = canvasTex(2048, 512, (ctx) => { ctx.fillStyle = "#2B2E58"; ctx.fillRect(0, 0, 2048, 512); ctx.fillStyle = "#FFF4D6"; ctx.font = `600 64px ${F_SERIF}`; ctx.fillText("여정의 끝, 그리고 또다른 시작", 80, 150); ctx.font = `400 40px ${F_SANS}`; ctx.fillStyle = "rgba(255,244,214,.85)"; ctx.fillText(`졸업생 ${BOOTHS.length}명 · 웹툰관(서) · 일러스트관(북) · 출판만화·애니메이션관(동)`, 80, 240); ctx.fillText("작품을 누르면 크게 보입니다 · 부스 안내판의 QR 로 휴대폰에서도 볼 수 있습니다", 80, 320); });
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), new THREE.MeshBasicMaterial({ map: welcome })); m.position.set(sx * (HALL_HALF - 0.01), 2.2, ENTRANCE_Z + 2.5); m.rotation.y = sx * -Math.PI / 2; S.add(m); }
    // 로비 안내 푯말(입구 축에서 살짝 오른쪽)
    const sp = signpost(); sp.position.set(2.6, 0, LOBBY_R - 4); S.add(sp);
    // 관 입구: 설명판(왼쪽) + 대표작 썸네일 벽(오른쪽) + 뒷벽
    for (const w of WINGS) {
      const [dx, dz] = w.dir; const nx = -dz, nz = dx; const boothsW = BOOTHS.filter((b) => b.wing === w.key);
      const a0 = LOBBY_R + 1.6, a1 = WING_START; const mid = (a0 + a1) / 2, len = a1 - a0; const yawW = Math.atan2(dx, dz);
      for (const side of [1, -1] as const) {
        const back = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, BOOTH_H, 0.2), new THREE.MeshStandardMaterial({ color: 0x2B2E58 }));
        back.position.set(dx * mid + nx * side * (HALL_HALF + 0.1), BOOTH_H / 2, dz * mid + nz * side * (HALL_HALF + 0.1)); back.rotation.y = yawW + Math.PI / 2; S.add(back);
        const px = dx * mid + nx * side * (HALL_HALF - 0.01), pz = dz * mid + nz * side * (HALL_HALF - 0.01);
        const faceYaw = Math.atan2(-nx * side, -nz * side); // 복도 안쪽을 향함
        if (side === 1) {
          const board = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.5, (len - 0.5) * 0.75), new THREE.MeshBasicMaterial({ map: wingBoardTexture(w, boothsW.length) }));
          board.position.set(px, 0.9 + (len - 0.5) * 0.375, pz); board.rotation.y = faceYaw; board.userData = { kind: "wing", wing: w, index: 0 }; S.add(board); this.clickables.push(board);
        } else {
          const n = boothsW.length; const cols = Math.max(2, Math.ceil(Math.sqrt(n * 1.4))); const rows = Math.ceil(n / cols);
          const wall = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.5, (len - 0.5) * 0.75), new THREE.MeshBasicMaterial({ color: 0x1E2244 }));
          wall.position.set(px, 0.9 + (len - 0.5) * 0.375, pz); wall.rotation.y = faceYaw; wall.userData = { kind: "thumb", wing: w, index: -1 }; S.add(wall); this.clickables.push(wall);
          const tw: ThumbWall = { mesh: wall, booths: boothsW, cols, rows }; this.thumbWalls.push(tw);
          thumbWallTexture(w, boothsW, cols, rows).then((t) => { if (this.disposed) { t.dispose(); return; } const m = wall.material as THREE.MeshBasicMaterial; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; });
          // 벽 위 작은 제목
          const cap = new THREE.Mesh(new THREE.PlaneGeometry(len - 0.5, 0.36), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 96, (ctx) => { ctx.fillStyle = w.color; ctx.fillRect(0, 0, 1024, 96); ctx.fillStyle = "#1B1F3B"; ctx.textAlign = "center"; const cap = `${w.name} 작가 ${n}명 — 대표작을 누르면 그 부스로`; fitText(ctx, cap, 980, 50, "700", F_SERIF); ctx.fillText(cap, 512, 66); }) }));
          cap.position.set(px, 0.9 + (len - 0.5) * 0.75 + 0.25, pz); cap.rotation.y = faceYaw; S.add(cap);
        }
      }
    }
    // 은하수 LED: 복도·로비·입구를 따라 작은 전구 + 글로우, 하늘에는 은하수 띠
    const palette = ["#FFD6E8", "#FFF4D6", "#CFE8FF", "#D8F5E6", "#E8D8FF", "#FFFFFF"].map((c) => new THREE.Color(c));
    const addLed = (x: number, y: number, z: number) => { this.ledPos.push(new THREE.Vector3(x, y, z)); this.ledPhase.push(Math.random() * Math.PI * 2); };
    for (const w of WINGS) { const [dx, dz] = w.dir; const nx = -dz, nz = dx; const L = wingLength(w.key); for (let a = LOBBY_R + 1.6; a < L; a += 0.75) for (const side of [1, -1]) addLed(dx * a + nx * side * (HALL_HALF + 0.12), BOOTH_H + 0.4, dz * a + nz * side * (HALL_HALF + 0.12)); }
    for (let z = LOBBY_R + 1; z < ENTRANCE_Z + 7.5; z += 0.75) for (const sx of [-1, 1]) addLed(sx * (HALL_HALF + 0.1), 4.3, z);
    for (let t = 0; t < Math.PI * 2; t += 0.045) addLed(Math.cos(t) * (LOBBY_R + 0.4), 3.4 + Math.sin(t * 6) * 0.25, Math.sin(t) * (LOBBY_R + 0.4));
    for (let t = 0; t < Math.PI * 2; t += 0.09) addLed(Math.cos(t) * 5.5, 6.2 + Math.sin(t * 4) * 0.3, Math.sin(t) * 5.5); // 배너 둘레 고리
    const nL = this.ledPos.length;
    this.leds = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), nL);
    const ledColors = new Float32Array(nL * 3);
    const mm = new THREE.Matrix4();
    this.ledPos.forEach((p, i) => { mm.makeTranslation(p.x, p.y, p.z); this.leds.setMatrixAt(i, mm); const c = palette[i % palette.length]; this.leds.setColorAt(i, c); ledColors.set([c.r, c.g, c.b], i * 3); });
    S.add(this.leds);
    const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute("position", new THREE.Float32BufferAttribute(this.ledPos.flatMap((p) => [p.x, p.y, p.z]), 3)); glowGeo.setAttribute("color", new THREE.BufferAttribute(ledColors, 3));
    this.ledGlow = new THREE.Points(glowGeo, new THREE.PointsMaterial({ size: 0.7, map: softSprite(), vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); S.add(this.ledGlow);
    // 하늘 은하수 띠(서관→동관 위를 가로지르는 호)
    for (let layer = 0; layer < 2; layer++) {
      const n = isMobile ? 1500 : 3200; const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); const A = new THREE.Vector3(-1, 0.25, -0.15).normalize(), B = new THREE.Vector3(1, 0.25, 0.15).normalize(), up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < n; i++) {
        const t = Math.random(); const v = t < 0.5 ? A.clone().lerp(up, t * 2) : up.clone().lerp(B, (t - 0.5) * 2); v.normalize();
        const g = (Math.random() + Math.random() + Math.random() - 1.5) * 0.09; const side = new THREE.Vector3(0, 0, 1).cross(v).normalize();
        v.addScaledVector(side, g).addScaledVector(new THREE.Vector3(0, 0, 1), (Math.random() - 0.5) * 0.05).normalize().multiplyScalar(175);
        pos.set([v.x, v.y, v.z], i * 3); const c = palette[Math.floor(Math.random() * palette.length)]; col.set([c.r, c.g, c.b], i * 3);
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: layer ? 2.2 : 1.1, map: softSprite(), vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); S.add(pts); this.milky.push(pts);
    }
    // 편지 입자(로비 위)
    const N = isMobile ? 90 : 180; const lg = new THREE.PlaneGeometry(0.32, 0.22);
    this.letters = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: 0xFFF8EA, side: THREE.DoubleSide }), N);
    for (let i = 0; i < N; i++) this.letterSeeds.push(Math.random() * 1000);
    S.add(this.letters);
    // 부스
    for (const b of BOOTHS) { const o = buildBooth(b, S); this.booths.push(o); this.clickables.push(...o.frames.map((f) => f.mesh), o.plate, o.qr); }
  }

  // 텍스처 지연 로딩
  async loadBooth(o: BoothObj) {
    if (o.loaded || o.loading) return; o.loading = true;
    await Promise.all(o.frames.map(async (f) => { try { const t = await loadTex(f.url); if (this.disposed) { t.dispose(); return; } const m = f.mesh.material as THREE.MeshBasicMaterial; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; } catch { /* 없는 그림은 빈 액자 */ } }));
    if (!o.qrDone) { try { const t = await qrBoardTexture(o.booth.artist); const m = o.qr.material as THREE.MeshBasicMaterial; m.map = t; m.needsUpdate = true; o.qrDone = true; } catch { /* QR 실패 시 빈 판 */ } }
    o.loaded = true; o.loading = false;
  }
  unloadBooth(o: BoothObj) {
    if (!o.loaded) return;
    for (const f of o.frames) { const m = f.mesh.material as THREE.MeshBasicMaterial; m.map?.dispose(); m.map = null; m.color.set(0xd9d2c4); m.needsUpdate = true; }
    o.loaded = false;
  }
  updateLoading() {
    const near = isMobile ? 26 : 34, far = isMobile ? 40 : 52;
    const sorted = this.booths.map((o) => ({ o, d: Math.hypot(o.booth.x - this.pos.x, o.booth.z - this.pos.z) })).sort((a, b) => a.d - b.d);
    let budget = 3;
    for (const { o, d } of sorted) { if (d < near && !o.loaded && !o.loading && budget-- > 0) this.loadBooth(o); else if (d > far && o.loaded) this.unloadBooth(o); }
    // 핀스팟 풀: 가까운 부스부터 실제 조명을 붙인다
    const from = new THREE.Vector3(), to = new THREE.Vector3();
    this.spotPool.forEach((sl, i) => {
      const e = sorted[i]; if (!e || e.d > 40) { sl.intensity = 0; return; }
      e.o.group.localToWorld(from.set(0, BOOTH_H + 0.2, -BOOTH_D / 2 + 0.7)); e.o.group.localToWorld(to.set(0, 1.9, BOOTH_D / 2));
      sl.position.copy(from); sl.target.position.copy(to); sl.target.updateMatrixWorld(); sl.intensity = 110;
    });
  }

  // 이동·시점
  teleport(b: Booth) {
    this.pos.set(b.fx, 1.6, b.fz); this.yaw = Math.atan2(-b.frontDir[0], -b.frontDir[1]); this.pitch = 0.02;
    this.loadBooth(this.booths.find((o) => o.booth === b)!);
  }
  teleportLobby() { this.pos.set(0, 1.6, LOBBY_R + 6); this.yaw = 0; this.pitch = 0; }
  setView(x: number, z: number, yaw: number) { this.pos.set(x, 1.6, z); this.yaw = yaw; }
  tryMove(dx: number, dz: number) {
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    if (isWalkable(nx, nz)) { this.pos.x = nx; this.pos.z = nz; return; }
    if (isWalkable(nx, this.pos.z)) { this.pos.x = nx; return; }
    if (isWalkable(this.pos.x, nz)) { this.pos.z = nz; }
  }
  pick(clientX: number, clientY: number): Hit | null {
    const r = this.opts.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera); this.raycaster.far = 14;
    const hits = this.raycaster.intersectObjects(this.clickables, false);
    if (!hits.length) return null; const h = hits[0]; const u = h.object.userData as Hit;
    if (u.kind === "thumb") {
      const tw = this.thumbWalls.find((t) => t.mesh === h.object); if (!tw || !h.uv) return null;
      const c = Math.floor(h.uv.x * tw.cols), r = Math.floor((1 - h.uv.y) * tw.rows); const i = r * tw.cols + c;
      if (i >= tw.booths.length) return null; return { kind: "thumb", booth: tw.booths[i], wing: u.wing, index: i };
    }
    return { booth: u.booth, wing: u.wing, kind: u.kind, index: u.index, obj: h.object };
  }
  nearest(): Booth | null {
    let best: Booth | null = null, bd = 7.5;
    for (const b of BOOTHS) { const d = Math.hypot(b.x - this.pos.x, b.z - this.pos.z); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  tick = () => {
    if (this.disposed) return;
    const now = performance.now(); const dt = Math.min(0.05, (now - this.t0) / 1000); this.t0 = now;
    if (this.focus) {
      const f = this.focus; const k = Math.min(1, (now - f.t0) / f.dur); const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.pos.x = f.fx + (f.tx - f.fx) * e; this.pos.z = f.fz + (f.tz - f.fz) * e; this.yaw = f.fy + (f.ty - f.fy) * e; this.pitch = f.fp + (f.tp - f.fp) * e;
      this.look.dx = 0; this.look.dy = 0; this.move.x = 0; this.move.y = 0; if (k >= 1) this.focus = null;
    }
    // 시점
    this.yaw -= this.look.dx * 0.0032; this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch - this.look.dy * 0.0028)); this.look.dx = 0; this.look.dy = 0;
    // 이동(키보드 + 조이스틱)
    let mx = this.move.x, my = this.move.y;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my += 1; if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my -= 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1; if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
    const len = Math.hypot(mx, my); if (len > 1) { mx /= len; my /= len; }
    if (len > 0.01 && !this.focus) this.eyeTarget = 1.6;   // 걷기 시작하면 원래 눈높이로
    this.eye += (this.eyeTarget - this.eye) * Math.min(1, dt * 6);
    const speed = (this.run || this.keys.has("ShiftLeft") ? 7.5 : 4.2) * dt;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw); const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    if (len > 0.01) this.tryMove((fx * my + rx * mx) * speed, (fz * my + rz * mx) * speed);
    this.camera.position.copy(this.pos); this.camera.position.y = this.eye + Math.sin(now / 160) * (len > 0.01 ? 0.025 : 0);
    const look = new THREE.Vector3(this.pos.x + fx * Math.cos(this.pitch), this.eye + Math.sin(this.pitch), this.pos.z + fz * Math.cos(this.pitch)); this.camera.lookAt(look);
    // 편지 입자
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    const t = now / 1000;
    for (let i = 0; i < this.letters.count; i++) {
      const sd = this.letterSeeds[i]; const r = 2 + (sd % 11); const ang = sd + t * 0.12 * (1 + (sd % 3) / 3);
      const y = 9.5 - ((t * (0.35 + (sd % 5) * 0.08) + sd) % 8);
      p.set(Math.cos(ang) * r + Math.sin(t + sd) * 0.4, y, Math.sin(ang) * r); e.set(t * 0.8 + sd, t * 0.6 + sd * 2, t * 0.5); q.setFromEuler(e); m.compose(p, q, s); this.letters.setMatrixAt(i, m);
    }
    this.letters.instanceMatrix.needsUpdate = true;
    // LED 반짝임(일부만 매 프레임) + 은하수 천천히 회전
    const nL = this.ledPos.length; const step = Math.max(1, Math.floor(nL / 160));
    const off = Math.floor(now / 16) % step;
    for (let i = off; i < nL; i += step) { const p = this.ledPos[i]; const sc = 0.75 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.2 + this.ledPhase[i])); m.makeScale(sc, sc, sc).setPosition(p); this.leds.setMatrixAt(i, m); }
    this.leds.instanceMatrix.needsUpdate = true;
    (this.ledGlow.material as THREE.PointsMaterial).opacity = 0.65 + 0.2 * Math.sin(t * 1.3);
    this.milky.forEach((pts, i) => { pts.rotation.y = t * 0.004 * (i ? -1 : 1); (pts.material as THREE.PointsMaterial).opacity = 0.75 + 0.2 * Math.sin(t * (0.7 + i * 0.4)); });
    // 지연 로딩·근접 부스·현재 관
    if (now - this.loadTimer > 400) {
      this.loadTimer = now; this.updateLoading();
      const nb = this.nearest(); if (nb !== this.lastNear) { this.lastNear = nb; this.opts.onNear(nb); }
      const wg = wingAt(this.pos.x, this.pos.z); if (wg !== this.lastWing) { this.lastWing = wg; this.opts.onWing(wg); }
    }
    this.renderer.render(this.scene, this.camera);
  };
}
export { isMobile };

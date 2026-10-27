// 가상 전시장 평면도. 3D(world.ts)와 미니맵이 같은 좌표를 쓴다. 단위 m, y 위, 입구는 +z 쪽.
//   남(+z): 입구 통로 → 중앙 로비(원형) → 서(-x) 웹툰관 · 북(-z) 일러스트관 · 동(+x) 출판만화·애니메이션관
import { ARTISTS, Artist, DeptCode } from "./data";

export const LOBBY_R = 13;          // 로비 반지름
export const HALL_HALF = 4;         // 복도 반폭
export const BOOTH_W = 6.4;         // 부스 폭(복도 방향)
export const BOOTH_D = 4.2;         // 부스 깊이
export const BOOTH_H = 4.0;         // 벽 높이
export const WING_START = LOBBY_R + 4;   // 로비 가장자리에서 첫 부스까지
export const ENTRANCE_Z = LOBBY_R + 22;  // 입구 시작 위치(+z)

export type Wing = { key: "W" | "N" | "E"; depts: DeptCode[]; label: string; name: string; en: string; color: string; dir: [number, number]; arrow: string; desc: string };
export const WINGS: Wing[] = [
  { key: "W", depts: ["webtoon"], label: "웹툰관 Webtoon", name: "웹툰관", en: "WEBTOON HALL", color: "#E98AA8", dir: [-1, 0], arrow: "←",
    desc: "세로로 흐르는 이야기. 웹툰 전공 졸업생 21명이 기획·콘티·작화까지 직접 완성한 졸업 작품을 원고 스트립 그대로 겁니다. SF 디스토피아, 로맨스, 심리 스릴러, 이세계, 힐링 일상까지 스물한 가지 장르가 복도 양쪽으로 이어집니다." },
  { key: "N", depts: ["illust"], label: "일러스트관 Illustration", name: "일러스트관", en: "ILLUSTRATION HALL", color: "#6FA8DC", dir: [0, -1], arrow: "↑",
    desc: "한 장에 담긴 세계. 일러스트 전공 졸업생 16명의 아트북·캐릭터 디자인·타로 카드·굿즈 일러스트입니다. 캐릭터의 개성과 세계관을 색과 빛으로 보여 주는 작품들이 액자에 걸려 있습니다." },
  { key: "E", depts: ["comics", "anim"], label: "출판만화·애니메이션관 Comics · Animation", name: "출판만화·애니메이션관", en: "COMICS · ANIMATION HALL", color: "#F2A15A", dir: [1, 0], arrow: "→",
    desc: "책으로, 그리고 움직임으로. 출판만화 전공 4명의 흑백 원고와 애니메이션 전공 1명의 단편 애니메이션입니다. 펜선과 스크린톤, 그리고 프레임이 이어지는 이야기를 만나 보세요." },
];
export const wingOf = (dept: DeptCode) => WINGS.find((w) => w.depts.includes(dept))!;
// 지금 어느 관 복도에 있나(로비·입구면 null)
export function wingAt(x: number, z: number): Wing | null {
  for (const w of WINGS) {
    const [dx, dz] = w.dir; const along = x * dx + z * dz, across = x * -dz + z * dx;
    if (along > LOBBY_R && Math.abs(across) < HALL_HALF + 0.5) return w;
  }
  return null;
}

export type Booth = {
  artist: Artist; wing: Wing["key"]; i: number; side: 1 | -1;
  x: number; z: number; yaw: number;          // 바닥 중심, yaw: 로컬 +z(복도→안쪽) 의 월드 방향
  fx: number; fz: number;                     // 부스 앞(복도 쪽) 서는 자리
  frontDir: [number, number];                 // 부스 안쪽을 바라보는 방향(단위)
};

function build(): Booth[] {
  const out: Booth[] = [];
  for (const w of WINGS) {
    const list = w.depts.flatMap((d) => ARTISTS.filter((a) => a.dept === d));
    const [dx, dz] = w.dir;                        // 복도 진행 방향
    // 복도 왼쪽/오른쪽 법선
    const nx = -dz, nz = dx;                        // 진행 방향을 +90° 돌린 벡터
    list.forEach((a, k) => {
      const slot = Math.floor(k / 2); const side = (k % 2 === 0 ? 1 : -1) as 1 | -1;
      const along = WING_START + BOOTH_W / 2 + slot * BOOTH_W;
      const cx = dx * along + nx * side * (HALL_HALF + BOOTH_D / 2);
      const cz = dz * along + nz * side * (HALL_HALF + BOOTH_D / 2);
      const inX = nx * side, inZ = nz * side;        // 복도에서 부스 안쪽으로 향하는 방향
      const yaw = Math.atan2(inX, inZ);              // (sinθ, cosθ) = (inX, inZ)
      const fx = dx * along + nx * side * (HALL_HALF - 1.6), fz = dz * along + nz * side * (HALL_HALF - 1.6);
      out.push({ artist: a, wing: w.key, i: k, side, x: cx, z: cz, yaw, fx, fz, frontDir: [inX, inZ] });
    });
  }
  return out;
}
export const BOOTHS: Booth[] = build();
export const boothOf = (id: string) => BOOTHS.find((b) => b.artist.id === id);

export function wingLength(key: Wing["key"]) {
  const n = BOOTHS.filter((b) => b.wing === key).length;
  return WING_START + Math.ceil(n / 2) * BOOTH_W + 1.5;
}

// 걷기 가능 영역: 로비 원 + 입구 통로 + 세 복도 + 부스 안쪽
export function isWalkable(x: number, z: number): boolean {
  const m = 0.35; // 벽에서 띄우는 여유
  if (x * x + z * z < (LOBBY_R - m) ** 2) return true;
  if (Math.abs(x) < HALL_HALF - m && z > 0 && z < ENTRANCE_Z + 6) return true;
  for (const w of WINGS) {
    const L = wingLength(w.key); const [dx, dz] = w.dir;
    const along = x * dx + z * dz, across = x * -dz + z * dx;
    if (along > 0 && along < L - m && Math.abs(across) < HALL_HALF - m) return true;
  }
  for (const b of BOOTHS) {
    // 부스 로컬 좌표
    const rx = x - b.x, rz = z - b.z; const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
    const lx = rx * c - rz * s, lz = rx * s + rz * c; // 월드→로컬(yaw 역회전)
    if (Math.abs(lx) < BOOTH_W / 2 - m && lz > -BOOTH_D / 2 - 0.5 && lz < BOOTH_D / 2 - 0.6) return true;
  }
  return false;
}

// 미니맵용 전체 범위
export function bounds() {
  let minX = -LOBBY_R, maxX = LOBBY_R, minZ = -LOBBY_R, maxZ = ENTRANCE_Z + 4;
  for (const b of BOOTHS) { minX = Math.min(minX, b.x - 4); maxX = Math.max(maxX, b.x + 4); minZ = Math.min(minZ, b.z - 4); maxZ = Math.max(maxZ, b.z + 4); }
  return { minX, maxX, minZ, maxZ };
}

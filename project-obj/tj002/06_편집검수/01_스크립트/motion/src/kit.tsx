// tj002 레트로 팝 부품: 무대(색면·하프톤·선버스트), 전환(찢기·슬라이드·펀치), 실물 삐라(착지·폭우·벽·확대경),
// 큰 활자·숫자 카운터·효과음 글자·도장, 캐릭터 포즈 교체, 말풍선 자막, 소품(B-29·탄피·풍선·파출소·공책)
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { C, FONT, FONT_H, FONT_N, Timeline, back, clamp01, mk, pop, ramp, rnd, shake, wobble } from "./lib";

export type Ctx = { TL: Timeline; W: number; H: number } & ReturnType<typeof mk>;
export const TR = 0.36;           // 전환 길이(초)
export type Trans = "tear" | "slide" | "punch" | "iris" | "none";

const zig = (x: number, H: number, n = 14, amp = 34, dir = 1) => {
  // x 위치에 세로 지그재그 경계 (찢긴 종이)
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) pts.push(`${x + (i % 2 ? amp : -amp) * dir + (rnd(i, 7) - 0.5) * amp}px ${(H * i) / n}px`);
  return pts;
};

/** 숏 구간. 들어올 때 전환(찢기 와이프·색면 슬라이드·줌 펀치·원형), 나가는 장면은 아래에 남는다 */
export const Scene: React.FC<{ ctx: Ctx; id: string; t: number; trans?: Trans; zoom?: [number, number]; children: (lt: number) => React.ReactNode }> = ({
  ctx, id, t, trans = "tear", zoom = [1, 1.03], children,
}) => {
  const sh = ctx.shot(id);
  if (!sh || t < sh.start - TR || t > sh.end + TR) return null;
  const q = trans === "none" ? 1 : interpolate(t, [sh.start - TR, sh.start], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const z = interpolate(t, [sh.start, sh.end], zoom, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { W, H } = ctx;
  let clip: string | undefined, tf = "";
  if (q < 1) {
    if (trans === "tear") {
      const x = -80 + (W + 160) * q;
      clip = `polygon(0px 0px, ${zig(x, H).join(", ")}, 0px ${H}px)`;
    } else if (trans === "slide") tf = `translateX(${(1 - q) * W}px) rotate(${(1 - q) * 6}deg)`;
    else if (trans === "punch") tf = `scale(${1.6 - 0.6 * q})`;
    else if (trans === "iris") clip = `circle(${q * Math.hypot(W, H) * 0.6}px at 50% 32%)`;
  }
  const [sx, sy] = trans === "punch" ? shake(t, sh.start, 0.4, 22) : [0, 0];
  return (
    <AbsoluteFill style={{ clipPath: clip, transform: tf || undefined, opacity: trans === "punch" ? Math.min(1, q * 2) : 1, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translate(${sx}px,${sy}px) scale(${z})`, transformOrigin: "50% 35%" }}>{children(t - sh.start)}</AbsoluteFill>
      {q < 1 && trans === "tear" && <TearEdge x={-80 + (W + 160) * q} H={H} />}
    </AbsoluteFill>
  );
};

/** 찢긴 종이 가장자리 흰 띠 */
const TearEdge: React.FC<{ x: number; H: number }> = ({ x, H }) => {
  const pts = zig(x, H).map((s) => s.replace(/px/g, "").split(" ").map(Number));
  const d = "M " + pts.map(([a, b]) => `${a} ${b}`).join(" L ");
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
      <path d={d} fill="none" stroke={C.cream} strokeWidth={22} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={4} transform="translate(-10,0)" />
    </svg>
  );
};

/** 원색 종이 무대: 색면 + 회전하는 선버스트 + 하프톤 + 큰 도형 */
export const Stage: React.FC<{ W: number; H: number; color: string; t: number; burst?: boolean; dots?: string; shapes?: boolean; cx?: number; cy?: number }> = ({
  W, H, color, t, burst = true, dots = "rgba(28,28,28,0.13)", shapes = true, cx = W / 2, cy = H * 0.32,
}) => {
  const R = Math.hypot(W, H);
  const rays = 18, rot = t * 6;
  const id = `ht${color.slice(1)}`;
  return (
    <AbsoluteFill style={{ background: color }}>
      <svg width={W} height={H} style={{ position: "absolute" }}>
        <defs>
          <pattern id={id} width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <circle cx={6} cy={6} r={4.2} fill={dots} />
          </pattern>
          <radialGradient id={`${id}g`} cx="50%" cy="32%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity={0} /><stop offset="1" stopColor="#fff" stopOpacity={1} /></radialGradient>
          <mask id={`${id}m`}><rect width={W} height={H} fill={`url(#${id}g)`} /></mask>
        </defs>
        {burst && (
          <g transform={`translate(${cx},${cy}) rotate(${rot})`}>
            {Array.from({ length: rays }, (_, i) => {
              const a0 = (i * 2 * Math.PI) / rays, a1 = a0 + Math.PI / rays;
              return <path key={i} d={`M0 0 L ${R * Math.cos(a0)} ${R * Math.sin(a0)} L ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`} fill="rgba(255,255,255,0.16)" />;
            })}
          </g>
        )}
        {shapes && (<>
          <circle cx={W * 0.12 + wobble(t, 0.08, 20)} cy={H * 0.1} r={W * 0.16} fill="none" stroke="rgba(28,28,28,0.12)" strokeWidth={18} />
          <g transform={`translate(${W * 0.9},${H * 0.55}) rotate(${t * 20})`}><rect x={-70} y={-70} width={140} height={140} fill="rgba(255,255,255,0.18)" /></g>
        </>)}
        <rect width={W} height={H} fill={`url(#${id})`} mask={`url(#${id}m)`} />
      </svg>
    </AbsoluteFill>
  );
};

/** 하프톤 무대 바닥 (캐릭터가 서는 곳) */
export const Floor: React.FC<{ W: number; y: number; H: number; color?: string }> = ({ W, y, H, color = C.cream }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
    <defs><pattern id="floorDots" width={18} height={18} patternUnits="userSpaceOnUse"><circle cx={5} cy={5} r={3.4} fill="rgba(28,28,28,0.16)" /></pattern></defs>
    <path d={`M0 ${y} Q ${W / 2} ${y - 60} ${W} ${y} L ${W} ${H} L 0 ${H} Z`} fill={color} stroke={C.ink} strokeWidth={8} />
    <path d={`M0 ${y} Q ${W / 2} ${y - 60} ${W} ${y} L ${W} ${H} L 0 ${H} Z`} fill="url(#floorDots)" />
  </svg>
);

/** 실물 삐라 한 장: 크림 테두리 + 먹 그림자(인쇄 어긋남), 위에서 빙글 떨어져 '툭' 착지(drop), 확대(kb) */
export const Leaf: React.FC<{
  src: string; x: number; y: number; w: number; rot?: number; p?: number; drop?: boolean; kb?: number; t?: number; o?: number; aspect?: number; cropB?: number; dir?: string; from?: [number, number]; z?: number;
}> = ({ src, x, y, w, rot = 0, p = 1, drop = true, kb = 0, t = 0, o = 1, aspect = 1.3, cropB = 0, dir = "leaflets", from, z }) => {
  const q = clamp01(p);
  if (q <= 0) return null;
  const h = w * aspect;
  // 떨어지기: 위에서 좌우로 흔들리며 내려와 착지 직전 회전이 rot 로 수렴
  let dx = 0, dy = 0, dr = 0, sc = 1;
  if (drop) {
    const fall = 1 - q;
    dx = Math.sin(fall * 9) * 120 * fall; dy = -900 * fall * fall; dr = Math.sin(fall * 7) * 35 * fall;
    sc = q > 0.97 ? 1 : 0.92 + 0.08 * q;
  } else if (from) {
    dx = from[0] * (1 - q); dy = from[1] * (1 - q); dr = (1 - q) * 25 * Math.sign(from[0] || 1); sc = 0.8 + 0.2 * q;
  }
  return (
    <div style={{
      position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o * Math.min(1, q * 3), zIndex: z,
      transform: `translate(${dx}px,${dy}px) rotate(${rot + dr + wobble(t, 0.25, 0.6)}deg) scale(${sc})`,
      background: C.cream, padding: w * 0.03, boxSizing: "border-box", border: `5px solid ${C.ink}`,
      boxShadow: `14px 16px 0 ${C.ink}`,
    }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#d9cdb5" }}>
        <Img src={staticFile(`${dir}/${src}`)} style={{ width: "100%", height: `${100 / (1 - cropB)}%`, objectFit: "cover", objectPosition: "50% 0%", transform: `scale(${1 + 0.1 * kb})`, transformOrigin: "50% 40%" }} />
      </div>
    </div>
  );
};

/** 삐라 폭우: 썸네일 n장이 회전·팔랑이며 쏟아진다 (결정적 난수). t0 시작, 각 장이 화면을 지나는 데 fallDur 초 */
export const LeafRain: React.FC<{ srcs: string[]; t: number; t0: number; n: number; W: number; H: number; span?: number; fallDur?: number; seed?: number; size?: [number, number]; ox?: [number, number]; stopAt?: number; o?: number }> = ({
  srcs, t, t0, n, W, H, span = 2.5, fallDur = 2.6, seed = 1, size = [110, 210], ox = [0, 1], stopAt, o = 1,
}) => {
  if (t < t0) return null;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const birth = t0 + rnd(i, seed) * span;
        const tt = Math.min(t, stopAt ?? 1e9) - birth;
        if (tt < 0) return null;
        const k = tt / (fallDur * (0.8 + rnd(i, seed + 3) * 0.5));
        if (k > 1.2 && stopAt === undefined) return null;
        const w = size[0] + (size[1] - size[0]) * rnd(i, seed + 1);
        const x0 = W * (ox[0] + (ox[1] - ox[0]) * rnd(i, seed + 2));
        const x = x0 + Math.sin(tt * (2 + rnd(i, seed + 4) * 2) + i) * 70;
        const y = -w * 1.4 + k * (H + w * 2.8);
        const r = rnd(i, seed + 5) * 360 + tt * (rnd(i, seed + 6) > 0.5 ? 1 : -1) * 160;
        const flip = Math.cos(tt * 4 + i);
        return (
          <div key={i} style={{ position: "absolute", left: x - w / 2, top: y, width: w, height: w * 1.3, opacity: o, transform: `rotate(${r}deg) scaleX(${0.35 + 0.65 * Math.abs(flip)})`, border: `3px solid ${C.ink}`, background: C.cream, boxShadow: `6px 7px 0 rgba(28,28,28,0.55)`, overflow: "hidden" }}>
            <Img src={staticFile(`thumbs/${srcs[i % srcs.length]}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </>
  );
};

/** 삐라 벽 (격자) */
export const LeafWall: React.FC<{ srcs: string[]; W: number; top: number; cols: number; p: number; t: number; dim?: number; gap?: number }> = ({ srcs, W, top, cols, p, t, dim = 0, gap = 14 }) => {
  const cw = (W - gap * (cols + 1)) / cols, ch = cw * 1.3;
  return (
    <>
      {srcs.map((s, i) => {
        const c = i % cols, r = Math.floor(i / cols); const q = clamp01(p * srcs.length * 0.5 - i * 0.3);
        if (q <= 0) return null;
        return (
          <div key={i} style={{ position: "absolute", left: gap + c * (cw + gap), top: top + r * (ch + gap), width: cw, height: ch, opacity: (1 - dim) * q, transform: `translateY(${-300 * (1 - back(q))}px) rotate(${(rnd(i, 9) - 0.5) * 8 + wobble(t + i, 0.2, 0.5)}deg)`, border: `4px solid ${C.ink}`, background: C.cream, boxShadow: `8px 9px 0 ${C.ink}`, overflow: "hidden" }}>
            <Img src={staticFile(`thumbs/${s}`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        );
      })}
    </>
  );
};

/** 확대경: 원 안에 src 의 (fx,fy) 부분을 mag 배로 */
export const Magnifier: React.FC<{ src: string; x: number; y: number; r: number; fx: number; fy: number; mag: number; p: number; iw: number; ih: number }> = ({ src, x, y, r, fx, fy, mag, p, iw, ih }) => {
  const q = clamp01(p); if (q <= 0) return null;
  const s = back(q);
  return (
    <div style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, transform: `scale(${s}) rotate(${(1 - q) * -30}deg)` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", border: `14px solid ${C.ink}`, background: C.cream, boxShadow: `10px 12px 0 rgba(28,28,28,0.5)` }}>
        <Img src={staticFile(`leaflets/${src}`)} style={{ position: "absolute", width: iw * mag, height: ih * mag, left: r - fx * iw * mag, top: r - fy * ih * mag, maxWidth: "none" }} />
      </div>
      <div style={{ position: "absolute", left: r * 1.55, top: r * 1.55, width: r * 0.32, height: r * 1.1, background: C.ink, borderRadius: r * 0.1, transform: "rotate(-45deg)", transformOrigin: "50% 0%" }} />
    </div>
  );
};

/** 큰 활자: 굵은 먹 테두리 + 어긋난 그림자, 종이처럼 날아와 붙는다 */
export const Big: React.FC<{ x: number; y: number; size: number; p: number; color?: string; shadow?: string; rot?: number; font?: string; stroke?: number; from?: number; children: React.ReactNode; maxW?: number; lh?: number }> = ({
  x, y, size, p, color = C.cream, shadow = C.ink, rot = -3, font = FONT_H, stroke, from = 1, children, maxW = 1000, lh = 1.05,
}) => {
  const q = clamp01(p); if (q <= 0) return null;
  const s = interpolate(q, [0, 1], [2.2, 1], { easing: back }) ;
  const sw = stroke ?? Math.max(6, size * 0.09);
  const style: React.CSSProperties = { fontFamily: font, fontSize: size, lineHeight: lh, textAlign: "center", whiteSpace: "pre-line", wordBreak: "keep-all" };
  return (
    <div style={{ position: "absolute", left: x - maxW / 2, top: y, width: maxW, opacity: Math.min(1, q * 2.5), transform: `translateY(-50%) rotate(${rot + (1 - q) * 18 * from}deg) scale(${s})`, transformOrigin: "50% 50%" }}>
      <div style={{ ...style, position: "absolute", left: size * 0.07, top: size * 0.08, width: "100%", color: shadow, WebkitTextStroke: `${sw}px ${shadow}` }}>{children}</div>
      <div style={{ ...style, position: "relative", color: C.ink, WebkitTextStroke: `${sw}px ${C.ink}` }}>{children}</div>
      <div style={{ ...style, position: "absolute", left: 0, top: 0, width: "100%", color }}>{children}</div>
    </div>
  );
};

/** 숫자 롤링 카운터 */
export const Counter: React.FC<{ x: number; y: number; t: number; a: number; d?: number; from?: number; to: number; size: number; color?: string; suffix?: string; prefix?: string; rot?: number; fmt?: (n: number) => string }> = ({
  x, y, t, a, d = 1.2, from = 0, to, size, color = C.yellow, suffix = "", prefix = "", rot = -4, fmt,
}) => {
  if (t < a) return null;
  const k = Easing.out(Easing.cubic)(clamp01((t - a) / d));
  const n = from + (to - from) * k;
  const s = fmt ? fmt(n) : Math.round(n).toLocaleString("en-US");
  return <Big x={x} y={y} size={size} p={pop(t, a, 30, 9)} color={color} font={FONT_N} rot={rot} from={0}>{prefix}{s}{suffix}</Big>;
};

/** 효과음 글자 (터지는 별 모양 + 글자, 흔들림) */
export const Sfx: React.FC<{ x: number; y: number; text: string; t: number; a: number; size?: number; color?: string; fill?: string; rot?: number; r?: number; dur?: number }> = ({
  x, y, text, t, a, size = 110, color = C.cream, fill = C.red, rot = -8, r, dur = 99,
}) => {
  if (t < a || t > a + dur) return null;
  const q = pop(t, a, 30, 8); const out = dur < 99 ? 1 - ramp(t, a + dur - 0.25, 0.25) : 1;
  const R = r ?? size * (text.length * 0.42 + 0.9);
  const n = 14;
  const pts = Array.from({ length: n * 2 }, (_, i) => {
    const ang = (i * Math.PI) / n; const rr = i % 2 ? R * 0.68 : R * (0.95 + rnd(i, 3) * 0.15);
    return `${rr * Math.cos(ang)},${rr * Math.sin(ang) * 0.62}`;
  }).join(" ");
  const [sx, sy] = shake(t, a, 0.4, 14);
  return (
    <div style={{ position: "absolute", left: x + sx, top: y + sy, opacity: out, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${q})` }}>
      <svg width={2.4 * R} height={1.6 * R} viewBox={`${-1.2 * R} ${-0.8 * R} ${2.4 * R} ${1.6 * R}`} style={{ position: "absolute", left: -1.2 * R, top: -0.8 * R, overflow: "visible" }}>
        <polygon points={pts} fill={C.ink} transform="translate(12,14)" />
        <polygon points={pts} fill={fill} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "relative", transform: "translate(-50%,-50%)", left: 0, top: 0 }}>
        <Big x={0} y={0} size={size} p={1} color={color} rot={0} maxW={R * 2.2}>{text}</Big>
      </div>
    </div>
  );
};

/** 도장 쾅 (크게 찍혔다가 내려앉음) */
export const Stamp: React.FC<{ x: number; y: number; text: string; p: number; w?: number; h?: number; rot?: number; color?: string; size?: number }> = ({ x, y, text, p, w = 380, h = 150, rot = -10, color = C.red, size }) => {
  const q = clamp01(p); if (q <= 0) return null;
  const s = 2.4 - 1.4 * Easing.in(Easing.cubic)(Math.min(1, q * 1.1));
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: Math.min(1, q * 3), transform: `rotate(${rot}deg) scale(${s})`, border: `10px solid ${color}`, borderRadius: 14, boxShadow: `inset 0 0 0 5px ${C.cream}, inset 0 0 0 9px ${color}`, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,243,220,0.55)" }}>
      <div style={{ fontFamily: FONT_H, fontSize: size ?? h * 0.5, color, letterSpacing: 2 }}>{text}</div>
    </div>
  );
};

/** 색 띠 라벨 (레트로 TV 자막 띠) */
export const Ribbon: React.FC<{ x: number; y: number; text: string; p: number; bg?: string; color?: string; size?: number; rot?: number; from?: number; font?: string }> = ({ x, y, text, p, bg = C.ink, color = C.yellow, size = 52, rot = -2, from = -1, font = FONT_H }) => {
  const q = clamp01(p); if (q <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) translateX(${from * 1200 * (1 - back(q))}px) rotate(${rot}deg)` }}>
      <div style={{ background: bg, color, fontFamily: font, fontSize: size, padding: `${size * 0.22}px ${size * 0.6}px`, whiteSpace: "nowrap", border: `5px solid ${C.ink}`, boxShadow: `9px 10px 0 ${C.ink}` }}>{text}</div>
    </div>
  );
};

// ---------- 캐릭터 ----------
export const WHO: Record<string, { name: string; color: string; key: string }> = {
  태진: { name: "태진", color: C.blue, key: "TAEJIN" },
  옥자: { name: "옥자 이모", color: C.red, key: "OKJA" },
};
export type Pose = "BASE" | "SURPRISE" | "LAUGH" | "POINT";
export const poseOf = (emo: string, who: string): Pose => (emo === "높은 톤" ? "SURPRISE" : emo === "기쁨" ? "LAUGH" : who === "태진" ? "POINT" : "BASE");

/** 포즈 교체 스프라이트: x 가운데, y 발끝, h 키. 포즈가 바뀌는 순간 찌그러졌다 튐 */
export const Char: React.FC<{ ctx: Ctx; who: string; pose: Pose; since: number; x: number; y: number; h: number; t: number; talking: boolean; flip?: boolean; dim?: boolean }> = ({ ctx, who, pose, since, x, y, h, t, talking, flip, dim }) => {
  const key = WHO[who].key;
  const want = `CHAR_${key}_${pose}.png`;
  const file = ctx.TL.art.includes(want) ? want : `CHAR_${key}_BASE.png`;
  if (!ctx.TL.art.includes(file)) return null;
  const k = clamp01((t - since) / 0.35);
  const squash = 1 + Math.sin(k * Math.PI) * 0.08 * (1 - k);
  const bob = talking ? Math.abs(Math.sin(t * 9)) * 10 : wobble(t, 0.4, 4);
  return (
    <Img src={staticFile(`art/${file}`)} style={{
      position: "absolute", left: x, top: y - bob, height: h, opacity: dim ? 0.92 : 1,
      transform: `translate(-50%,-100%) scaleX(${(flip ? -1 : 1) / squash}) scaleY(${squash})`, transformOrigin: "50% 100%",
      filter: `drop-shadow(10px 10px 0 rgba(28,28,28,0.35))${dim ? " saturate(0.85)" : ""}`,
    }} />
  );
};

/** 말풍선 자막: 화자 쪽으로 꼬리, 대사마다 팝. sub 의 ' / ' 조각을 글자수 비례로 순서대로 */
export const Bubble: React.FC<{ ctx: Ctx; t: number; y: number; tails: Record<string, number>; W: number }> = ({ ctx, t, y, tails, W }) => {
  const l = ctx.TL.lines.find((x) => t >= x.start - 0.12 && t <= x.end + 0.35);
  if (!l) return null;
  const who = WHO[l.who];
  const chunks = l.sub.split(" / ").map((s) => s.trim()).filter(Boolean);
  const weights = chunks.map((x) => x.length + 4), sum = weights.reduce((a, b) => a + b, 0);
  const prog = clamp01((t - l.start) / Math.max(0.3, l.end - l.start)) * sum;
  let cum = 0, idx = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) { if (prog < cum + weights[i]) { idx = i; break; } cum += weights[i]; }
  const chunkStart = l.start + ((l.end - l.start) * weights.slice(0, idx).reduce((a, b) => a + b, 0)) / sum;
  const text = chunks[idx];
  const size = text.length > 24 ? 52 : text.length > 15 ? 62 : 74;
  const q = pop(t, l.start - 0.12, 30, 10);
  const q2 = idx > 0 ? pop(t, chunkStart, 30, 12) : 1;
  const o = 1 - ramp(t, l.end + 0.15, 0.2);
  const tx = tails[l.who] ?? W / 2;
  const bw = 940;
  return (
    <div style={{ position: "absolute", left: (W - bw) / 2, top: y, width: bw, opacity: o, transform: `scale(${0.6 + 0.4 * q})`, transformOrigin: `${tx - (W - bw) / 2}px 100%` }}>
      <div style={{ position: "relative", background: C.cream, border: `7px solid ${C.ink}`, borderRadius: 46, padding: "26px 34px 30px", boxShadow: `12px 14px 0 ${C.ink}`, textAlign: "center" }}>
        <div style={{ position: "absolute", left: 30, top: -34, background: who.color, color: C.cream, fontFamily: FONT_H, fontSize: 40, padding: "4px 24px", border: `5px solid ${C.ink}`, borderRadius: 999, transform: "rotate(-3deg)" }}>{who.name}</div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size, lineHeight: 1.22, color: C.ink, wordBreak: "keep-all", transform: `scale(${0.85 + 0.15 * q2})`, opacity: Math.min(1, q2 * 2) }}>{text}</div>
        <svg width={90} height={70} style={{ position: "absolute", left: tx - (W - bw) / 2 - 45, bottom: -62, overflow: "visible" }}>
          <path d={`M 18 0 L ${l.who === "태진" ? 10 : 80} 62 L 70 0`} fill={C.cream} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          <rect x={10} y={-12} width={70} height={12} fill={C.cream} />
        </svg>
      </div>
    </div>
  );
};

// ---------- 소품 (SVG) ----------
/** B-29 실루엣 (오른쪽을 향함), 크기 s */
export const Plane: React.FC<{ x: number; y: number; s?: number; rot?: number; color?: string }> = ({ x, y, s = 1, rot = 0, color = C.ink }) => (
  <svg style={{ position: "absolute", left: x - 260 * s, top: y - 130 * s, overflow: "visible" }} width={520 * s} height={260 * s} viewBox="-260 -130 520 260">
    <g transform={`rotate(${rot})`} fill={color} stroke={C.cream} strokeWidth={5}>
      <path d="M -230 -8 Q -240 0 -230 8 L 210 14 Q 250 6 252 0 Q 250 -6 210 -14 Z" />
      <path d="M -40 -6 L -10 -125 L 30 -125 L 40 -6 Z" />
      <path d="M -40 6 L -10 125 L 30 125 L 40 6 Z" />
      <path d="M -205 -6 L -235 -55 L -215 -55 L -175 -6 Z" />
      <path d="M -205 6 L -235 55 L -215 55 L -175 6 Z" />
      <path d="M -220 -6 L -250 -60 L -238 -60 L -205 -6 Z" />
      {[-90, -45, 45, 90].map((e) => <ellipse key={e} cx={-2} cy={e} rx={26} ry={9} />)}
    </g>
  </svg>
);

/** 폭탄 탄피: open 0→1 로 세로로 갈라짐 */
export const Shell: React.FC<{ x: number; y: number; s?: number; open: number; p: number }> = ({ x, y, s = 1, open, p }) => {
  const q = clamp01(p); if (q <= 0) return null;
  const a = open * 16;
  const half = (side: number) => (
    <g transform={`translate(${side * open * 90},${open * 20}) rotate(${side * a})`}>
      <path d={side < 0 ? "M 0 -170 Q -70 -150 -80 -60 L -80 120 L 0 120 Z" : "M 0 -170 Q 70 -150 80 -60 L 80 120 L 0 120 Z"} fill={C.mint} stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
      <path d={side < 0 ? "M -80 40 L 0 40 M -80 70 L 0 70" : "M 80 40 L 0 40 M 80 70 L 0 70"} stroke={C.ink} strokeWidth={7} />
      <path d={side < 0 ? "M -40 120 L -90 190 L -10 190 L 0 120 Z" : "M 40 120 L 90 190 L 10 190 L 0 120 Z"} fill={C.red} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
    </g>
  );
  return (
    <svg style={{ position: "absolute", left: x - 200 * s, top: y - 220 * s, overflow: "visible" }} width={400 * s} height={440 * s} viewBox="-200 -220 400 440">
      <g transform={`scale(${back(q)}) rotate(${(1 - q) * -40})`}>{half(-1)}{half(1)}</g>
    </svg>
  );
};

/** 풍선 + 매달린 삐라 꾸러미 (trash = 쓰레기 봉투) */
export const Balloon: React.FC<{ x: number; y: number; s?: number; t: number; color?: string; trash?: boolean }> = ({ x, y, s = 1, t, color = C.red, trash }) => {
  const sway = wobble(t, 0.6, 8);
  return (
    <svg style={{ position: "absolute", left: x - 150 * s, top: y - 170 * s, overflow: "visible" }} width={300 * s} height={520 * s} viewBox="-150 -170 300 520">
      <g transform={`rotate(${sway})`}>
        <ellipse cx={0} cy={0} rx={trash ? 130 : 110} ry={trash ? 120 : 135} fill={trash ? "#E8E8E8" : color} stroke={C.ink} strokeWidth={9} />
        <ellipse cx={-40} cy={-55} rx={22} ry={34} fill="rgba(255,255,255,0.55)" />
        <path d="M -12 133 L 12 133 L 0 150 Z" fill={trash ? "#E8E8E8" : color} stroke={C.ink} strokeWidth={6} />
        <path d={`M 0 150 Q ${20 + sway * 2} 210 0 260`} fill="none" stroke={C.ink} strokeWidth={5} />
        {trash ? (
          <g transform="translate(0,300)"><path d="M -60 -40 Q 0 -60 60 -40 L 70 60 Q 0 80 -70 60 Z" fill="#5a5a5a" stroke={C.ink} strokeWidth={8} /><path d="M -20 -48 L 0 -70 L 20 -48" fill="none" stroke={C.ink} strokeWidth={7} /></g>
        ) : (
          <g transform="translate(0,300)">
            {[0, 1, 2].map((i) => <rect key={i} x={-62 + i * 4} y={-38 + i * 8} width={124} height={70} fill={C.cream} stroke={C.ink} strokeWidth={6} />)}
            <path d="M 0 -40 L 0 50 M -66 10 L 66 10" stroke={C.red} strokeWidth={9} />
          </g>
        )}
      </g>
    </svg>
  );
};

/** 파출소 창구 */
export const Police: React.FC<{ x: number; y: number; s?: number; p: number }> = ({ x, y, s = 1, p }) => {
  const q = clamp01(p); if (q <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 330 * s, top: y - 300 * s, width: 660 * s, height: 600 * s, transform: `translateY(${(1 - back(q)) * 400}px)` }}>
      <svg width="100%" height="100%" viewBox="0 0 660 600">
        <rect x={20} y={70} width={620} height={510} fill={C.cream} stroke={C.ink} strokeWidth={10} />
        <path d="M 0 80 L 330 0 L 660 80 Z" fill={C.ink} />
        <rect x={150} y={95} width={360} height={100} rx={10} fill={C.sky} stroke={C.ink} strokeWidth={8} />
        <text x={330} y={170} textAnchor="middle" fontFamily={FONT_H} fontSize={74} fill={C.cream} stroke={C.ink} strokeWidth={3}>파출소</text>
        <rect x={110} y={240} width={440} height={220} fill="#2B4A6B" stroke={C.ink} strokeWidth={9} />
        <path d="M 330 240 L 330 460 M 110 350 L 550 350" stroke={C.ink} strokeWidth={7} />
        <rect x={60} y={460} width={540} height={60} fill={C.yellow} stroke={C.ink} strokeWidth={9} />
        <circle cx={590} cy={60} r={22} fill={C.red} stroke={C.ink} strokeWidth={6} />
      </svg>
    </div>
  );
};

/** 공책 (cross: 0→1 빨간 X) */
export const Notebook: React.FC<{ x: number; y: number; s?: number; p: number; rot?: number; cross?: number; label?: string }> = ({ x, y, s = 1, p, rot = -6, cross = 0, label = "공 책" }) => {
  const q = clamp01(p); if (q <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: x - 170 * s, top: y - 220 * s, overflow: "visible", transform: `scale(${back(q)}) rotate(${rot + (1 - q) * 40}deg)` }} width={340 * s} height={440 * s} viewBox="-170 -220 340 440">
      <rect x={-150} y={-200} width={300} height={400} rx={10} fill={C.ink} transform="translate(12,14)" />
      <rect x={-150} y={-200} width={300} height={400} rx={10} fill={C.sky} stroke={C.ink} strokeWidth={9} />
      <rect x={-150} y={-200} width={46} height={400} fill={C.red} stroke={C.ink} strokeWidth={7} />
      <rect x={-80} y={-130} width={200} height={110} rx={6} fill={C.cream} stroke={C.ink} strokeWidth={6} />
      <text x={20} y={-55} textAnchor="middle" fontFamily={FONT_H} fontSize={60} fill={C.ink}>{label}</text>
      {cross > 0 && (<g stroke={C.red} strokeWidth={34} strokeLinecap="round">
        <path d={`M -150 -200 L ${-150 + 300 * clamp01(cross * 2)} ${-200 + 400 * clamp01(cross * 2)}`} />
        {cross > 0.5 && <path d={`M 150 -200 L ${150 - 300 * clamp01(cross * 2 - 1)} ${-200 + 400 * clamp01(cross * 2 - 1)}`} />}
      </g>)}
    </svg>
  );
};

/** 연필 */
export const Pencil: React.FC<{ x: number; y: number; s?: number; p: number; rot?: number }> = ({ x, y, s = 1, p, rot = 30 }) => {
  const q = clamp01(p); if (q <= 0) return null;
  return (
    <svg style={{ position: "absolute", left: x - 220 * s, top: y - 40 * s, overflow: "visible", transform: `scale(${back(q)}) rotate(${rot + (1 - q) * -90}deg)` }} width={440 * s} height={80 * s} viewBox="-220 -40 440 80">
      <path d="M -180 -28 L 140 -28 L 210 0 L 140 28 L -180 28 Z" fill={C.yellow} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
      <path d="M 140 -28 L 210 0 L 140 28 Z" fill="#F2D3A6" stroke={C.ink} strokeWidth={7} />
      <path d="M 186 -10 L 210 0 L 186 10 Z" fill={C.ink} />
      <rect x={-215} y={-28} width={40} height={56} rx={8} fill={C.pink} stroke={C.ink} strokeWidth={8} />
      <path d="M -175 -28 L -175 28 M -160 -28 L -160 28" stroke={C.ink} strokeWidth={6} />
    </svg>
  );
};

/** 음표 (S07) */
export const Note: React.FC<{ x: number; y: number; s?: number; color?: string }> = ({ x, y, s = 1, color = C.ink }) => (
  <svg style={{ position: "absolute", left: x, top: y, overflow: "visible" }} width={80 * s} height={120 * s} viewBox="0 0 80 120">
    <ellipse cx={22} cy={96} rx={22} ry={16} fill={color} transform="rotate(-20 22 96)" />
    <rect x={38} y={10} width={9} height={88} fill={color} />
    <path d="M 46 10 Q 80 26 70 58 Q 66 34 46 32 Z" fill={color} />
  </svg>
);

/** 상단 칩: 시리즈 표시 */
export const Chip: React.FC<{ W: number; text: string }> = ({ W, text }) => (
  <div style={{ position: "absolute", left: 0, width: W, top: 44, textAlign: "center" }}>
    <span style={{ display: "inline-block", background: C.ink, color: C.yellow, fontFamily: FONT_H, fontSize: 34, padding: "6px 26px", borderRadius: 999, border: `4px solid ${C.cream}` }}>{text}</span>
  </div>
);

/** 인쇄 질감 */
export const Grain: React.FC<{ seed: number }> = ({ seed }) => (
  <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.1, pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id={`grain${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
    </svg>
  </AbsoluteFill>
);

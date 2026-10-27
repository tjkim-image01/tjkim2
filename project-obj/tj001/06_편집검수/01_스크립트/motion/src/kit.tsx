// 장면 공용 부품: 장면 틀, 그림 판, 캐릭터, 큰 글자, 실물 엽서(켄번스·뒤집기·부채꼴·벽), 도장, 자막
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { C, FONT, FONT_T, Timeline, clamp01, mk, pop, ramp, wobble } from "./lib";

export const FADE = 0.28;
export type Ctx = { TL: Timeline; W: number; H: number } & ReturnType<typeof mk>;

/** 숏 구간 + 들어올 때 페이드 + 천천히 미는 카메라. 나가는 장면은 그대로 두고 다음 장면이 위에 덮인다 */
export const Scene: React.FC<{ ctx: Ctx; id: string; t: number; zoom?: [number, number]; origin?: [number, number]; first?: boolean; children: (lt: number) => React.ReactNode }> = ({
  ctx, id, t, zoom = [1, 1.05], origin, first, children,
}) => {
  const sh = ctx.shot(id);
  if (!sh || t < sh.start - FADE || t > sh.end + FADE) return null;
  const fin = first ? 1 : ramp(t, sh.start - FADE, FADE * 2);
  const z = interpolate(t, [sh.start, sh.end], zoom, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  const o = origin ?? [ctx.W / 2, ctx.H / 2];
  return (
    <AbsoluteFill style={{ opacity: fin, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${o[0]}px ${o[1]}px` }}>{children(t - sh.start)}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Plate: React.FC<{ name: string; W: number; H: number; o?: number; blur?: number }> = ({ name, W, H, o = 1, blur = 0 }) => (
  <Img src={staticFile(`art/${name}.png`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover", opacity: o, filter: blur ? `blur(${blur}px)` : undefined }} />
);

/** 캐릭터 (누끼 png): x 가운데, y 발끝, h 키 */
export const Sprite: React.FC<{ src: string; x: number; y: number; h: number; t?: number; rot?: number; o?: number; flip?: boolean; talking?: boolean }> = ({ src, x, y, h, t = 0, rot = 0, o = 1, flip, talking }) => {
  const bob = talking ? Math.abs(wobble(t, 1.6, 6)) : wobble(t, 0.35, 3);
  return (
    <Img src={staticFile(`art/${src}.png`)} style={{
      position: "absolute", left: x, top: y - bob, height: h, opacity: o,
      transform: `translate(-50%,-100%) rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: "50% 100%",
      filter: "drop-shadow(0 18px 22px rgba(31,42,55,0.28))",
    }} />
  );
};

export const Svg: React.FC<{ W: number; H: number; children: React.ReactNode; blend?: React.CSSProperties["mixBlendMode"] }> = ({ W, H, children, blend }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: blend }}>{children}</svg>
);

/** 큰 글자 (종이 위 먹색, 강조는 주홍) */
export const Txt: React.FC<{ x: number; y: number; size: number; fill?: string; p?: number; weight?: number; rot?: number; anchor?: "start" | "middle" | "end"; font?: string; children: React.ReactNode }> = ({
  x, y, size, fill = C.ink, p = 1, weight = 800, rot = 0, anchor = "middle", font = FONT_T, children,
}) => {
  const q = clamp01(p);
  return (
    <g opacity={q} transform={`translate(${x},${y + 22 * (1 - q)}) rotate(${rot}) scale(${0.88 + 0.12 * q})`}>
      <text x={0} y={0} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={fill}>{children}</text>
    </g>
  );
};

/** 글자 밑 종이 판 + 글자 (오른쪽 빈 공간용) */
export const Label: React.FC<{ x: number; y: number; text: string; size?: number; p?: number; fill?: string; bg?: string; anchor?: "start" | "middle" | "end"; w?: number }> = ({ x, y, text, size = 56, p = 1, fill = C.ink, bg = C.cream2, anchor = "middle", w }) => {
  const q = clamp01(p);
  const tw = w ?? [...text].reduce((a, ch) => a + (ch === " " ? 0.3 : /[가-힣]/.test(ch) ? 0.96 : 0.58) * size, 0) + size * 0.9;
  const left = anchor === "start" ? x - size * 0.45 : anchor === "end" ? x - tw + size * 0.45 : x - tw / 2;
  return (
    <g opacity={q} transform={`translate(0,${18 * (1 - q)})`}>
      <rect x={left} y={y - size * 0.95} width={tw} height={size * 1.4} rx={size * 0.2} fill={bg} stroke="rgba(31,42,55,0.18)" strokeWidth={2} />
      <text x={x} y={y} textAnchor={anchor} fontFamily={FONT_T} fontWeight={800} fontSize={size} fill={fill}>{text}</text>
    </g>
  );
};

/** 주홍 도장 (쾅) */
export const Seal: React.FC<{ x: number; y: number; text: string; p: number; w?: number; h?: number; rot?: number; color?: string }> = ({ x, y, text, p, w = 360, h = 150, rot = -8, color = C.red }) => {
  const q = clamp01(p); const s = 1.8 - 0.8 * Easing.in(Easing.cubic)(q);
  return (
    <g opacity={q} transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.12} fill="none" stroke={color} strokeWidth={10} />
      <rect x={-w / 2 + 14} y={-h / 2 + 14} width={w - 28} height={h - 28} rx={h * 0.08} fill="none" stroke={color} strokeWidth={3} />
      <text x={0} y={h * 0.2} textAnchor="middle" fontFamily={FONT_T} fontWeight={800} fontSize={h * 0.55} fill={color}>{text}</text>
    </g>
  );
};

/** 소인(우체국 도장) 모양 */
export const Postmark: React.FC<{ x: number; y: number; r: number; p: number; text?: string; color?: string }> = ({ x, y, r, p, text, color = "rgba(31,42,55,0.8)" }) => {
  const q = clamp01(p); const s = 1.5 - 0.5 * q;
  return (
    <g opacity={q} transform={`translate(${x},${y}) rotate(-14) scale(${s})`}>
      <circle r={r} fill="none" stroke={color} strokeWidth={r * 0.07} />
      <circle r={r * 0.8} fill="none" stroke={color} strokeWidth={r * 0.04} />
      {text && <text y={r * 0.12} textAnchor="middle" fontFamily={FONT_T} fontWeight={800} fontSize={r * 0.34} fill={color}>{text}</text>}
      {[-1, 0, 1].map((i) => <path key={i} d={`M ${r * 1.15} ${i * r * 0.28} q ${r * 0.25} ${-r * 0.1} ${r * 0.5} 0 t ${r * 0.5} 0 t ${r * 0.5} 0`} fill="none" stroke={color} strokeWidth={r * 0.06} />)}
    </g>
  );
};

/** 실물 엽서 한 장: 종이 테두리 + 그림자, 켄번스(kb: 0→1 로 1.0→1.08 확대), 뒤집기(flip 0→1: 앞→뒤) */
export const Card: React.FC<{
  src: string; back?: string; x: number; y: number; w: number; h?: number; rot?: number; p?: number; kb?: number; flip?: number; t?: number; o?: number; z?: number;
  fromY?: number; label?: string; fit?: "cover" | "contain"; dir?: string;
}> = ({ src, back, x, y, w, h, rot = 0, p = 1, kb = 0, flip = 0, t = 0, o = 1, z, fromY = 60, label, fit = "cover", dir = "postcards" }) => {
  const q = clamp01(p); const hh = h ?? w * 9 / 14;
  const showBack = back && flip >= 0.5;
  const sx = Math.abs(Math.cos(flip * Math.PI)) < 0.03 ? 0.03 : Math.cos(flip * Math.PI);
  const scale = 1 + 0.08 * kb;
  return (
    <div style={{
      position: "absolute", left: x - w / 2, top: y - hh / 2, width: w, height: hh, zIndex: z, opacity: q * o,
      transform: `translateY(${fromY * (1 - q)}px) rotate(${rot + wobble(t, 0.3, 0.4)}deg) scale(${0.9 + 0.1 * q}) scaleX(${Math.abs(sx)})`,
      background: C.cream2, padding: w * 0.025, boxSizing: "border-box", boxShadow: "0 22px 40px rgba(31,42,55,0.32), 0 2px 6px rgba(31,42,55,0.18)",
      borderRadius: 4,
    }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", background: "#8c7b63" }}>
        <Img src={staticFile(`${dir}/${showBack ? back : src}`)} style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${scale}) ${showBack ? "scaleX(-1)" : ""}`, transformOrigin: "50% 50%" }} />
      </div>
      {label && <div style={{ position: "absolute", left: 0, right: 0, bottom: -w * 0.085, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: w * 0.045, color: C.ink2 }}>{label}</div>}
    </div>
  );
};

/** 엽서 벽 (격자, 들어오는 순서 p 0→1) */
export const Wall: React.FC<{ srcs: string[]; W: number; H: number; cols: number; p: number; t: number; dim?: number; gap?: number }> = ({ srcs, W, H, cols, p, t, dim = 0, gap = 16 }) => {
  const cw = (W - gap * (cols + 1)) / cols, ch = cw * 9 / 14; const rows = Math.ceil(srcs.length / cols);
  const oy = (H - (rows * (ch + gap) - gap)) / 2;
  return (
    <>
      {srcs.map((s, i) => {
        const c = i % cols, r = Math.floor(i / cols); const q = clamp01(p * srcs.length - i * 0.6);
        return <Card key={i} src={s} x={gap + c * (cw + gap) + cw / 2} y={oy + r * (ch + gap) + ch / 2} w={cw} rot={(i % 3 - 1) * 1.5} p={q} t={t + i} fromY={30} o={1 - dim} dir="thumbs" />;
      })}
    </>
  );
};

/** 종이 질감 */
export const Grain: React.FC<{ seed: number }> = ({ seed }) => (
  <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.12, pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id={`grain${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
    </svg>
  </AbsoluteFill>
);

export const WHO: Record<string, { name: string; color: string; sprite: string }> = {
  태진: { name: "태진", color: C.blue, sprite: "CHAR_TAEJIN" },
  하린: { name: "하린", color: C.red, sprite: "CHAR_HARIN" },
};

/** 아래 자막: 화자 칩 + 대사 (' / ' 로 나눈 조각을 글자수 비례로 순서대로) */
export const Subtitle: React.FC<{ ctx: Ctx; t: number; bottom?: number; size?: number; maxW?: number }> = ({ ctx, t, bottom = 56, size = 42, maxW = 1660 }) => {
  const l = ctx.TL.lines.find((x) => t >= x.start - 0.12 && t <= x.end + 0.25);
  if (!l) return null;
  const o = Math.min(ramp(t, l.start - 0.12, 0.15), 1 - ramp(t, l.end + 0.1, 0.15));
  const who = WHO[l.who];
  const chunks = l.sub.split(" / ").map((s) => s.trim()).filter(Boolean);
  const weights = chunks.map((x) => x.length), sum = weights.reduce((a, b) => a + b, 0);
  const progress = clamp01((t - l.start) / (l.end - l.start)) * sum;
  let cum = 0;
  const visible = chunks.find((_, i) => { cum += weights[i]; return progress < cum; }) ?? chunks[chunks.length - 1];
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", opacity: o }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, background: "rgba(31,42,55,0.86)", borderRadius: 999, padding: `${size * 0.33}px ${size * 0.8}px ${size * 0.33}px ${size * 0.38}px`, maxWidth: maxW }}>
        <span style={{ background: who.color, color: C.cream2, fontFamily: FONT, fontWeight: 800, fontSize: size * 0.7, borderRadius: 999, padding: `${size * 0.15}px ${size * 0.5}px`, whiteSpace: "nowrap" }}>{who.name}</span>
        <span style={{ color: C.cream2, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.3 }}>{visible}</span>
      </div>
    </div>
  );
};

/** 파트 제목 카드 */
export const PartTitle: React.FC<{ ctx: Ctx; t: number; size?: number }> = ({ ctx, t, size = 104 }) => {
  const p = ctx.TL.parts.find((x) => x.title && t >= x.start - 0.1 && t < x.firstLine + 0.2);
  if (!p || !p.title) return null;
  const o = Math.min(ramp(t, p.start + 0.3, 0.35), 1 - ramp(t, p.firstLine - 0.35, 0.4));
  const y = 18 * (1 - ramp(t, p.start + 0.3, 0.5));
  return (
    <AbsoluteFill style={{ opacity: o, justifyContent: "center", alignItems: "center", background: `rgba(31,42,55,${0.62 * o})` }}>
      <div style={{ transform: `translateY(${y}px)`, textAlign: "center" }}>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: size * 0.38, color: C.gold, letterSpacing: 6 }}>{p.title[0]}</div>
        <div style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: size, color: C.cream2, marginTop: 10, textShadow: "4px 5px 0 rgba(0,0,0,0.35)" }}>{p.title[1]}</div>
        <div style={{ width: 160, height: 8, borderRadius: 4, background: C.red, margin: "26px auto 0" }} />
      </div>
    </AbsoluteFill>
  );
};

/** 두 캐릭터: 말하는 쪽이 앞으로 나오고 살짝 커진다 */
export const Duo: React.FC<{ ctx: Ctx; t: number; lx: number; rx: number; y: number; h: number; hide?: boolean }> = ({ ctx, t, lx, rx, y, h, hide }) => {
  if (hide) return null;
  const l = ctx.TL.lines.find((x) => t >= x.start - 0.1 && t <= x.end + 0.2);
  const who = l?.who;
  const k = (name: string) => (who === name ? 1 : 0.9);
  return (
    <>
      <Sprite src="CHAR_TAEJIN" x={lx} y={y + (who === "태진" ? 0 : 8)} h={h * k("태진")} t={t} talking={who === "태진"} o={who && who !== "태진" ? 0.82 : 1} />
      <Sprite src="CHAR_HARIN" x={rx} y={y + (who === "하린" ? 0 : 8)} h={h * k("하린")} t={t} talking={who === "하린"} o={who && who !== "하린" ? 0.82 : 1} flip />
    </>
  );
};

export { pop, ramp };

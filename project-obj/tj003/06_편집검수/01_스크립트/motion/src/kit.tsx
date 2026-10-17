// tj003 부품 — 애플 런칭 구조(한 요소의 연속 변형·스프링·단색) + 아카이브 재료(실물 엽서·손글씨·소인)
import React from "react";
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile } from "remotion";
import { C, FONT, FONT_H, FONT_T, Timeline, clamp01, mix, mk, pop, ramp, rnd, sp, wobble } from "./lib";

export const FADE = 0.22;
export type Ctx = { TL: Timeline; W: number; H: number } & ReturnType<typeof mk>;

/** 숏 구간. 들어올 때 짧은 페이드. 나가는 장면은 그대로 두고 다음 장면이 덮는다 */
export const Scene: React.FC<{ ctx: Ctx; id: string; t: number; first?: boolean; bg?: string; children: (lt: number) => React.ReactNode }> = ({ ctx, id, t, first, bg, children }) => {
  const sh = ctx.shot(id);
  if (!sh || t < sh.start - FADE || t > sh.end + FADE) return null;
  const fin = first ? 1 : ramp(t, sh.start - FADE, FADE * 2);
  return (
    <AbsoluteFill style={{ opacity: fin, overflow: "hidden", background: bg }}>
      {children(t - sh.start)}
    </AbsoluteFill>
  );
};

/** 종이 무대: 색면 + 섬유 질감 + 비네트 */
export const Stage: React.FC<{ color?: string; seed?: number; vignette?: number }> = ({ color = C.cream, seed = 1, vignette = 0.18 }) => (
  <AbsoluteFill style={{ background: color }}>
    <svg width="100%" height="100%" style={{ position: "absolute", left: 0, top: 0, opacity: 0.16, mixBlendMode: "multiply" }}>
      <filter id={`fiber${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.015 0.9" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#fiber${seed})`} />
    </svg>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(28,28,28,${vignette}) 100%)` }} />
  </AbsoluteFill>
);

export const Svg: React.FC<{ W: number; H: number; children: React.ReactNode }> = ({ W, H, children }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>{children}</svg>
);

/** 실물 엽서(앞/뒤 flip, 켄번스). src 는 postcards/ 또는 cut/ 경로 포함 */
export const Card: React.FC<{
  src: string; back?: string; x: number; y: number; w: number; h?: number; rot?: number; p?: number; kb?: number; flip?: number; t?: number; o?: number; z?: number;
  fromY?: number; label?: string; fit?: "cover" | "contain"; shadow?: boolean; border?: number; focus?: [number, number];
}> = ({ src, back, x, y, w, h, rot = 0, p = 1, kb = 0, flip = 0, t = 0, o = 1, z, fromY = 40, label, fit = "cover", shadow = true, border, focus }) => {
  const q = clamp01(p); const hh = h ?? w * 0.66;
  const showBack = back && flip >= 0.5;
  const sx = Math.abs(Math.cos(flip * Math.PI)) < 0.03 ? 0.03 : Math.cos(flip * Math.PI);
  const pad = border ?? w * 0.02;
  const scale = 1 + 0.1 * kb;
  const origin = focus ? `${focus[0] * 100}% ${focus[1] * 100}%` : "50% 50%";
  return (
    <div style={{
      position: "absolute", left: x - w / 2, top: y - hh / 2, width: w, height: hh, zIndex: z, opacity: q * o,
      transform: `translateY(${fromY * (1 - q)}px) rotate(${rot + (t ? wobble(t, 0.25, 0.3) : 0)}deg) scale(${0.94 + 0.06 * q}) scaleX(${Math.abs(sx)})`,
      background: C.cream2, padding: pad, boxSizing: "border-box", borderRadius: 6,
      boxShadow: shadow ? "0 24px 48px rgba(28,28,28,0.28), 0 2px 6px rgba(28,28,28,0.16)" : undefined,
    }}>
      <div style={{ width: "100%", height: "100%", overflow: "hidden", background: C.paper }}>
        <Img src={staticFile(showBack ? back! : src)} style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${scale})`, transformOrigin: origin }} />
      </div>
      {label && <div style={{ position: "absolute", left: 0, right: 0, bottom: -w * 0.07, textAlign: "center", fontFamily: FONT, fontWeight: 700, fontSize: Math.max(18, w * 0.038), color: C.ink2, whiteSpace: "nowrap" }}>{label}</div>}
    </div>
  );
};

/** 애플식 모핑 도형: 키프레임 [{at,w,h,r,fill}] 을 스프링으로 잇는다. 글자는 안에 넣을 수 있다 */
export type MorphKey = { at: number; w: number; h: number; r: number; fill?: string };
export const Morph: React.FC<{ t: number; x: number; y: number; keys: MorphKey[]; children?: React.ReactNode; o?: number }> = ({ t, x, y, keys, children, o = 1 }) => {
  let w = keys[0].w, h = keys[0].h, r = keys[0].r, fill = keys[0].fill ?? C.ink;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]; const q = sp(t, k.at);
    w = mix(w, k.w, q); h = mix(h, k.h, q); r = mix(r, k.r, q); if (k.fill && q > 0.5) fill = k.fill;
  }
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: r, background: fill, opacity: o, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </div>
  );
};

/** 큰 글자 (스프링으로 살짝 떠오름, 튕김 없음) */
export const Txt: React.FC<{ x: number; y: number; size: number; fill?: string; p?: number; weight?: number; anchor?: "start" | "middle" | "end"; font?: string; rot?: number; children: React.ReactNode }> = ({
  x, y, size, fill = C.ink, p = 1, weight = 800, anchor = "middle", font = FONT_T, rot = 0, children,
}) => {
  const q = clamp01(p);
  return (
    <g opacity={q} transform={`translate(${x},${y + 16 * (1 - q)}) rotate(${rot})`}>
      <text x={0} y={0} textAnchor={anchor} fontFamily={font} fontWeight={weight} fontSize={size} fill={fill}>{children}</text>
    </g>
  );
};

/** 알약 라벨 (크림 바탕·먹 글자). 강조는 red */
export const Pill: React.FC<{ x: number; y: number; text: string; size?: number; p?: number; fill?: string; bg?: string; anchor?: "start" | "middle" | "end"; font?: string }> = ({ x, y, text, size = 44, p = 1, fill = C.ink, bg = C.cream2, anchor = "middle", font = FONT_T }) => {
  const q = clamp01(p);
  const tw = [...text].reduce((a, ch) => a + (ch === " " ? 0.3 : /[가-힣]/.test(ch) ? 0.98 : /[A-Z0-9]/.test(ch) ? 0.66 : 0.52) * size, 0) + size * 1.2;
  const left = anchor === "start" ? x : anchor === "end" ? x - tw : x - tw / 2;
  return (
    <g opacity={q} transform={`translate(0,${12 * (1 - q)})`}>
      <rect x={left} y={y - size * 0.92} width={tw} height={size * 1.5} rx={size * 0.75} fill={bg} stroke="rgba(28,28,28,0.14)" strokeWidth={2} />
      <text x={left + tw / 2} y={y + size * 0.1} textAnchor="middle" fontFamily={font} fontWeight={800} fontSize={size} fill={fill}>{text}</text>
    </g>
  );
};

/** 소인·씰·우표 오림(cut/)이 '쾅' 찍힌다: 1.5→1, 회전 살짝 */
export const Stamp: React.FC<{ src: string; x: number; y: number; w: number; p: number; rot?: number; round?: boolean; o?: number }> = ({ src, x, y, w, p, rot = -6, round, o = 1 }) => {
  const q = clamp01(p); const s = 1.5 - 0.5 * Easing.out(Easing.cubic)(q);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: q * o, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${s})`, borderRadius: round ? "50%" : 6, overflow: "hidden", boxShadow: "0 10px 24px rgba(28,28,28,0.25)", background: C.cream2 }}>
      <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

/** 손글씨 트레이스: 이미지가 줄 단위로 펜이 지나가듯 드러난다. lines = 줄 수, p 0→1 */
export const HandReveal: React.FC<{ src: string; x: number; y: number; w: number; h: number; p: number; lines?: number; rot?: number; pen?: boolean; o?: number; frame?: boolean }> = ({ src, x, y, w, h, p, lines = 6, rot = 0, pen = true, o = 1, frame = true }) => {
  const q = clamp01(p);
  const li = Math.min(lines - 1, Math.floor(q * lines)); const lf = q * lines - li;   // 현재 줄, 줄 안 진행
  const lineH = h / lines;
  const revealH = li * lineH + lineH;             // 현재 줄까지 세로로 열고
  const cutRight = (1 - lf) * w;                  // 현재 줄은 오른쪽을 가린다
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg)`, opacity: o }}>
      {frame && <div style={{ position: "absolute", inset: -14, background: C.cream2, borderRadius: 6, boxShadow: "0 24px 48px rgba(28,28,28,0.26)" }} />}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.08 }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: w, height: Math.max(0, revealH - lineH), overflow: "hidden" }}>
          <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: "cover", display: "block" }} />
        </div>
        <div style={{ position: "absolute", left: 0, top: li * lineH, width: Math.max(0, w - cutRight), height: lineH, overflow: "hidden" }}>
          <Img src={staticFile(src)} style={{ width: w, height: h, objectFit: "cover", display: "block", transform: `translateY(${-li * lineH}px)` }} />
        </div>
        {pen && q > 0 && q < 1 && (
          <div style={{ position: "absolute", left: w - cutRight - 6, top: li * lineH + lineH * 0.2, width: 12, height: lineH * 0.6, borderRadius: 6, background: C.red, opacity: 0.85, boxShadow: `0 0 0 6px rgba(197,57,43,0.18)` }} />
        )}
      </div>
    </div>
  );
};

/** 번역 카드: 영어 원문(손글씨체 작게) 위에 한국어 번역이 '툭' 붙는다 */
export const Translate: React.FC<{ x: number; y: number; w: number; en?: string; ko: string; p: number; size?: number; align?: "left" | "center" }> = ({ x, y, w, en, ko, p, size = 40, align = "left" }) => {
  const q = clamp01(p);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y, width: w, opacity: q, transform: `translateY(${14 * (1 - q)}px)`, textAlign: align }}>
      {en && <div style={{ fontFamily: FONT_H, fontSize: size * 0.95, color: C.blue, lineHeight: 1.15, marginBottom: 6 }}>{en}</div>}
      <div style={{ display: "inline-block", background: C.ink, color: C.cream2, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.35, padding: `${size * 0.22}px ${size * 0.5}px`, borderRadius: 8, wordBreak: "keep-all" }}>{ko}</div>
    </div>
  );
};

/** 지도 경로: 점들을 잇는 점선이 그려진다. pts 는 [x,y,label?] */
export const Route: React.FC<{ pts: [number, number, string?][]; p: number; color?: string; size?: number; dot?: number }> = ({ pts, p, color = C.red, size = 30, dot = 10 }) => {
  const q = clamp01(p); const segs = pts.length - 1;
  const d = pts.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt[0]} ${pt[1]}`).join(" ");
  const total = pts.slice(1).reduce((a, pt, i) => a + Math.hypot(pt[0] - pts[i][0], pt[1] - pts[i][1]), 0);
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`14 12`} style={{ strokeDashoffset: 0 }} pathLength={1000} strokeDashoffset={0} opacity={0} />
      <path d={d} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${total * q} ${total + 10}`} />
      {pts.map((pt, i) => { const on = q * segs >= i - 0.05 || i === 0; const s = pop(0.5 + (on ? 1 : 0), 0.5); return (
        <g key={i} opacity={on ? 1 : 0.25}>
          <circle cx={pt[0]} cy={pt[1]} r={dot * (on ? 1 : 0.6)} fill={on ? color : C.gray} stroke={C.cream2} strokeWidth={3} />
          {pt[2] && <text x={pt[0] + dot + 10} y={pt[1] + size * 0.35} fontFamily={FONT_T} fontWeight={800} fontSize={size} fill={on ? C.ink : C.gray} opacity={s}>{pt[2]}</text>}
        </g>); })}
    </g>
  );
};

/** 연표 띠: years 중 active 까지 점등. x 가운데, y 선 높이 */
export const YearLine: React.FC<{ x: number; y: number; w: number; years: [string, string][]; active: number; p: number; size?: number }> = ({ x, y, w, years, active, p, size = 34 }) => {
  const q = clamp01(p); const n = years.length; const left = x - w / 2; const step = w / (n - 1);
  return (
    <g opacity={q} transform={`translate(0,${10 * (1 - q)})`}>
      <line x1={left} y1={y} x2={left + w} y2={y} stroke="rgba(28,28,28,0.25)" strokeWidth={3} />
      <line x1={left} y1={y} x2={left + step * Math.max(0, Math.min(n - 1, active))} y2={y} stroke={C.red} strokeWidth={5} strokeLinecap="round" />
      {years.map(([yr, lb], i) => { const on = i <= active; return (
        <g key={yr}>
          <circle cx={left + step * i} cy={y} r={on ? 12 : 8} fill={on ? C.red : C.cream2} stroke={on ? C.red : "rgba(28,28,28,0.35)"} strokeWidth={3} />
          <text x={left + step * i} y={y - 26} textAnchor="middle" fontFamily={FONT_T} fontWeight={800} fontSize={size} fill={on ? C.ink : C.gray}>{yr}</text>
          <text x={left + step * i} y={y + size * 1.3} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size * 0.7} fill={on ? C.ink2 : C.gray}>{lb}</text>
        </g>); })}
    </g>
  );
};

/** 숫자 롤링 카운터 */
export const Counter: React.FC<{ x: number; y: number; to: number; p: number; size?: number; fill?: string; suffix?: string; prefix?: string; anchor?: "start" | "middle" | "end" }> = ({ x, y, to, p, size = 160, fill = C.red, suffix = "", prefix = "", anchor = "middle" }) => {
  const q = clamp01(p); const v = Math.round(to * Easing.out(Easing.cubic)(q));
  return <text x={x} y={y} textAnchor={anchor} fontFamily={FONT_T} fontWeight={800} fontSize={size} fill={fill} opacity={q > 0 ? 1 : 0}>{prefix}{v.toLocaleString()}{suffix}</text>;
};

/** 엽서 격자(애플식: 가운데부터 바깥으로 차오른다) */
export const Grid: React.FC<{ srcs: string[]; cx: number; cy: number; cols: number; cw: number; ch: number; gap: number; p: number; t: number; o?: number }> = ({ srcs, cx, cy, cols, cw, ch, gap, p, t, o = 1 }) => {
  const rows = Math.ceil(srcs.length / cols);
  const w = cols * cw + (cols - 1) * gap, h = rows * ch + (rows - 1) * gap;
  const order = srcs.map((_, i) => { const c = i % cols, r = Math.floor(i / cols); return Math.hypot(c - (cols - 1) / 2, r - (rows - 1) / 2); });
  const maxD = Math.max(...order);
  return (
    <>
      {srcs.map((s, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const q = clamp01((p * (maxD + 1.2) - order[i]) / 1.2);
        return <Card key={i} src={s} x={cx - w / 2 + c * (cw + gap) + cw / 2} y={cy - h / 2 + r * (ch + gap) + ch / 2} w={cw} h={ch} p={q} t={0} fromY={18} shadow={false} border={3} o={o} />;
      })}
    </>
  );
};

/** 캐릭터 스프라이트(art/CHAR_<이름>_<포즈>.png). 모서리 반응 컷용 */
export const POSE: Record<string, string> = { "높은 톤": "SURPRISE", "기쁨": "LAUGH", "슬픔": "BASE", "낮은 톤": "BASE", "일반": "BASE", "화남": "POINT", "속삭임": "BASE" };
export const WHO: Record<string, { name: string; color: string; key: string }> = {
  태진: { name: "태진", color: C.blue, key: "TAEJIN" },
  하린: { name: "하린", color: C.red, key: "HARIN" },
};
export const Char: React.FC<{ who: string; emotion?: string; x: number; y: number; h: number; t: number; talking?: boolean; flip?: boolean; o?: number }> = ({ who, emotion = "일반", x, y, h, t, talking, flip, o = 1 }) => {
  const key = WHO[who]?.key ?? "TAEJIN";
  const pose = POSE[emotion] ?? "BASE";
  const bob = talking ? Math.abs(wobble(t, 1.5, 5)) : wobble(t, 0.3, 2);
  return (
    <Img src={staticFile(`art/CHAR_${key}_${pose}.png`)} style={{
      position: "absolute", left: x, top: y - bob, height: h, opacity: o,
      transform: `translate(-50%,-100%) scaleX(${flip ? -1 : 1})`, transformOrigin: "50% 100%",
      filter: "drop-shadow(0 14px 18px rgba(28,28,28,0.25))",
    }} />
  );
};

/** 현재 대사의 화자가 모서리에 나타나 반응한다 (말할 때만) */
export const Reaction: React.FC<{ ctx: Ctx; t: number; lx: number; rx: number; y: number; h: number; hide?: boolean }> = ({ ctx, t, lx, rx, y, h, hide }) => {
  if (hide) return null;
  const l = ctx.TL.lines.find((x) => t >= x.start - 0.15 && t <= x.end + 0.25);
  if (!l) return null;
  const o = Math.min(ramp(t, l.start - 0.15, 0.25), 1 - ramp(t, l.end + 0.05, 0.25));
  const q = pop(t, l.start - 0.15, 30, 16);
  const left = l.who === "태진";
  return <Char who={l.who} emotion={l.emotion} x={left ? lx : rx} y={y + 40 * (1 - q)} h={h} t={t} talking flip={!left} o={o} />;
};

/** 아래 자막: 화자 칩 + 대사 (' / ' 조각을 글자수 비례로) */
export const Subtitle: React.FC<{ ctx: Ctx; t: number; bottom?: number; size?: number; maxW?: number }> = ({ ctx, t, bottom = 54, size = 40, maxW = 1500 }) => {
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
      <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(28,28,28,0.9)", borderRadius: 999, padding: `${size * 0.3}px ${size * 0.8}px ${size * 0.3}px ${size * 0.35}px`, maxWidth: maxW }}>
        <span style={{ background: who.color, color: C.cream2, fontFamily: FONT, fontWeight: 800, fontSize: size * 0.68, borderRadius: 999, padding: `${size * 0.12}px ${size * 0.45}px`, whiteSpace: "nowrap" }}>{who.name}</span>
        <span style={{ color: C.cream2, fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 1.3, wordBreak: "keep-all" }}>{visible}</span>
      </div>
    </div>
  );
};

/** 파트 제목 카드(애플식: 크림 카드 + 검정 워드마크) */
export const PartTitle: React.FC<{ ctx: Ctx; t: number; size?: number }> = ({ ctx, t, size = 96 }) => {
  const p = ctx.TL.parts.find((x) => x.title && t >= x.start - 0.1 && t < x.firstLine + 0.2);
  if (!p || !p.title) return null;
  const o = Math.min(ramp(t, p.start + 0.2, 0.3), 1 - ramp(t, p.firstLine - 0.3, 0.3));
  const q = sp(t, p.start + 0.2);
  return (
    <AbsoluteFill style={{ opacity: o, justifyContent: "center", alignItems: "center", background: C.ink }}>
      <div style={{ transform: `scale(${0.96 + 0.04 * q})`, textAlign: "center" }}>
        <div style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: size * 0.36, color: C.red, letterSpacing: 4 }}>{p.title[0]}</div>
        <div style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: size, color: C.cream2, marginTop: 8, letterSpacing: -1 }}>{p.title[1]}</div>
      </div>
    </AbsoluteFill>
  );
};

export const Grain: React.FC<{ seed: number }> = ({ seed }) => (
  <AbsoluteFill style={{ mixBlendMode: "multiply", opacity: 0.09, pointerEvents: "none" }}>
    <svg width="100%" height="100%">
      <filter id={`grain${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#grain${seed})`} />
    </svg>
  </AbsoluteFill>
);

/** 효과음 트랙: [시각(초), 이름, 볼륨?] 목록 → sfx/<이름>.wav */
export const SfxTrack: React.FC<{ events: [number, string, number?][]; fps: number }> = ({ events, fps }) => (
  <>
    {events.filter((e) => Number.isFinite(e[0]) && e[0] >= 0).map(([at, name, vol], i) => (
      <Sequence key={`${name}-${i}`} from={Math.round(at * fps)} durationInFrames={Math.round(fps * 3)}>
        <Audio src={staticFile(`sfx/${name}.wav`)} volume={vol ?? 0.5} />
      </Sequence>
    ))}
  </>
);

export { pop, ramp, sp, rnd, interpolate };

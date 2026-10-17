// tj003 공용: 팔레트(아카이브 톤 + 강조 1색), 타임라인, 스프링·이징 도우미
import { Easing, interpolate, spring } from "remotion";
import tlLong from "./timeline_long.json";
import tlA from "./timeline_A.json";
import tlB from "./timeline_B.json";
import tlC from "./timeline_C.json";

export const C = {
  ink: "#1C1C1C",      // 먹 (글자·도형)
  ink2: "#4A4A4A",
  cream: "#F4EBDA",    // 종이 무대
  cream2: "#FBF6EA",   // 카드
  paper: "#E9DDC6",    // 어두운 종이
  red: "#C5392B",      // 강조 1색 (우체국 빨강)
  blue: "#1F4E8C",     // 잉크 (손글씨 번역)
  gray: "#9A948A",
  white: "#FFFFFF",
};
export const FONT = "NanumSquareRound";
export const FONT_T = "Pretendard";
export const FONT_H = "NanumPen";

export type Word = { w: string; s: number; e: number };
export type Line = { part: string; shot: string; who: string; emotion?: string; text: string; sub: string; start: number; end: number; words: Word[] };
export type Part = { id: string; title: string[] | null; header: string; firstLine: number; start: number; end: number };
export type Timeline = { fps: number; duration: number; bpm?: number; parts: Part[]; shots: { id: string; part: string; start: number; end: number }[]; lines: Line[] };
export const TLS: Record<string, Timeline> = {
  long: tlLong as unknown as Timeline, A: tlA as unknown as Timeline, B: tlB as unknown as Timeline, C: tlC as unknown as Timeline,
};

export const mk = (TL: Timeline) => {
  const shot = (id: string) => TL.shots.find((s) => s.id === id)!;
  const line = (shotId: string, who: string, n = 0) => TL.lines.filter((l) => l.shot === shotId && l.who === who)[n];
  const norm = (s: string) => s.replace(/[.,!?…“”"'\s]/g, "");
  const at = (shotId: string, who: string, prefix: string, n = 0) => {
    const l = line(shotId, who, n);
    if (!l) return shot(shotId).start;
    const w = l.words.find((x) => norm(x.w).startsWith(norm(prefix)));
    if (w) return w.s;
    const index = l.text.indexOf(prefix);
    return index >= 0 ? l.start + (l.end - l.start) * (index / l.text.length) : l.start;
  };
  /** 시각 지정: 숫자 = 숏 시작 기준 초, "화자:단어" = 그 단어 시작, "화자:" = 대사 시작, "화자2:단어" = 두 번째 대사 */
  const cue = (shotId: string, c: number | string) => {
    if (typeof c === "number") return shot(shotId).start + c;
    const [whoRaw, word] = c.split(":");
    const m = whoRaw.match(/^(.*?)(\d)?$/)!;
    const who = m[1], n = m[2] ? Number(m[2]) - 1 : 0;
    return word ? at(shotId, who, word, n) : (line(shotId, who, n)?.start ?? shot(shotId).start);
  };
  /** 비트 격자: bpm 기준 t 에 가장 가까운 이전 박자 시각 */
  const beat = (t: number) => { const b = 60 / (TL.bpm ?? 108); return Math.floor(t / b) * b; };
  return { shot, line, at, cue, beat };
};

export const ease = Easing.bezier(0.33, 0, 0.2, 1);
export const ramp = (t: number, a: number, d = 0.5, e = ease) =>
  interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
/** 스프링 0→1 (살짝 넘침). damping 이 클수록 점잖다 */
export const pop = (t: number, a: number, fps = 30, damping = 14) =>
  t < a ? 0 : spring({ frame: (t - a) * fps, fps, config: { damping, stiffness: 150, mass: 0.8 } });
/** 애플식 스프링: 넘침 없이 묵직하게 */
export const sp = (t: number, a: number, fps = 30) =>
  t < a ? 0 : spring({ frame: (t - a) * fps, fps, config: { damping: 200, stiffness: 120, mass: 1 } });
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const wobble = (t: number, speed = 1, amp = 1, phase = 0) => Math.sin(t * speed * 2 * Math.PI + phase) * amp;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 결정적 난수 (파티클·격자 흔들림용) */
export const rnd = (i: number, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

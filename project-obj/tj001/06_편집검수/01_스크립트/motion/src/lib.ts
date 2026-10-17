// tj001 공용: 팔레트, 타임라인, 애니메이션 도우미 (jatu012 motion_long 의 lib.ts 를 엽서 편 팔레트로)
import { Easing, interpolate, spring } from "remotion";
import tlLong from "./timeline_long.json";
import tlShort from "./timeline_short.json";

export const C = {
  ink: "#1F2A37",     // 먹
  ink2: "#4A5563",
  cream: "#F2E9D8",   // 종이
  cream2: "#FBF6EA",
  kraft: "#D9C7A3",
  red: "#C5392B",     // 주홍 (강조)
  blue: "#2C5F8A",    // 우편 파랑
  gold: "#C9A24A",
  gray: "#9AA3AD",
  white: "#FFFFFF",
};
export const FONT = "NanumSquareRound";
export const FONT_T = "Pretendard";

export type Word = { w: string; s: number; e: number };
export type Line = { part: string; shot: string; who: string; text: string; sub: string; start: number; end: number; words: Word[] };
export type Part = { id: string; title: string[] | null; header: string; firstLine: number; start: number; end: number };
export type Timeline = { fps: number; duration: number; parts: Part[]; shots: { id: string; part: string; start: number; end: number }[]; lines: Line[] };
export const TLS: Record<string, Timeline> = { long: tlLong as unknown as Timeline, short: tlShort as unknown as Timeline };

export const mk = (TL: Timeline) => {
  const shot = (id: string) => TL.shots.find((s) => s.id === id)!;
  const line = (shotId: string, who: string, n = 0) => TL.lines.filter((l) => l.shot === shotId && l.who === who)[n];
  const norm = (s: string) => s.replace(/[.,!?…“”"'\s]/g, "");
  /** shotId·화자의 대사에서 prefix 로 시작하는 단어의 시작 시각. 단어 시각이 없으면 글자 비율로 */
  const at = (shotId: string, who: string, prefix: string, n = 0) => {
    const l = line(shotId, who, n);
    if (!l) return shot(shotId).start;
    const w = l.words.find((x) => norm(x.w).startsWith(norm(prefix)));
    if (w) return w.s;
    const index = l.text.indexOf(prefix);
    return index >= 0 ? l.start + (l.end - l.start) * (index / l.text.length) : l.start;
  };
  /** 시각 지정: 숫자 = 숏 시작 기준 초, "화자:단어" = 그 단어 시작, "화자:" = 그 대사 시작, "화자2:단어" = 그 화자의 두 번째 대사 */
  const cue = (shotId: string, c: number | string) => {
    if (typeof c === "number") return shot(shotId).start + c;
    const [whoRaw, word] = c.split(":");
    const m = whoRaw.match(/^(.*?)(\d)?$/)!;
    const who = m[1], n = m[2] ? Number(m[2]) - 1 : 0;
    return word ? at(shotId, who, word, n) : (line(shotId, who, n)?.start ?? shot(shotId).start);
  };
  return { shot, line, at, cue };
};

export const ease = Easing.bezier(0.33, 0, 0.2, 1);
/** a 초부터 d 초 동안 0→1 */
export const ramp = (t: number, a: number, d = 0.5, e = ease) =>
  interpolate(t, [a, a + d], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: e });
/** a 초에 튀어나오는 스프링 (0→1, 살짝 넘침) */
export const pop = (t: number, a: number, fps = 30, damping = 11) =>
  t < a ? 0 : spring({ frame: (t - a) * fps, fps, config: { damping, stiffness: 140, mass: 0.7 } });
/** 숨 쉬듯 흔들림 */
export const wobble = (t: number, speed = 1, amp = 1, phase = 0) => Math.sin(t * speed * 2 * Math.PI + phase) * amp;
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// tj002 공용: 레트로 팝 팔레트, 타임라인, 애니메이션 도우미 (tj001 lib.ts 기반)
import { Easing, interpolate, spring } from "remotion";
import tlShort from "./timeline_short.json";
import tlLong from "./timeline_long.json";
import tlD from "./timeline_D.json";
import tlE from "./timeline_E.json";
import tlF from "./timeline_F.json";
import tlG from "./timeline_G.json";
import tlH from "./timeline_H.json";
import tlI from "./timeline_I.json";
import tlJ from "./timeline_J.json";
import tlK from "./timeline_K.json";
import tlL from "./timeline_L.json";
import tlM from "./timeline_M.json";
import tlN from "./timeline_N.json";
import tlO from "./timeline_O.json";
import tlP from "./timeline_P.json";
import tlQ from "./timeline_Q.json";
import tlR from "./timeline_R.json";
import tlLong2 from "./timeline_long2.json";

export const C = {
  red: "#E63B2E",     // 빨강
  yellow: "#F6C445",  // 노랑
  sky: "#4FB3E8",     // 하늘
  cream: "#FFF3DC",   // 크림
  ink: "#1C1C1C",     // 먹
  mint: "#5BC8A0",
  pink: "#F28CA8",
  blue: "#2F6FD6",    // 태진
  white: "#FFFFFF",
};
export const FONT = "NanumSquareRound";
export const FONT_T = "Pretendard";
export const FONT_H = "BlackHanSans";   // 제목·효과음
export const FONT_N = "BagelFatOne";    // 숫자
export const FONT_P = "NanumPen";       // 손글씨

export type Word = { w: string; s: number; e: number };
export type Line = { part: string; shot: string; who: string; emo: string; text: string; sub: string; start: number; end: number; words: Word[] };
export type Part = { id: string; title: string[] | null; header: string; firstLine: number; start: number; end: number };
export type Timeline = { fps: number; duration: number; art: string[]; parts: Part[]; shots: { id: string; part: string; start: number; end: number }[]; lines: Line[] };
export const EPS = ["D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"] as const;
export type Ep = (typeof EPS)[number];
export const TLS: Record<string, Timeline> = {
  short: tlShort as unknown as Timeline, long: tlLong as unknown as Timeline,
  D: tlD as unknown as Timeline, E: tlE as unknown as Timeline, F: tlF as unknown as Timeline, G: tlG as unknown as Timeline, H: tlH as unknown as Timeline,
  I: tlI as unknown as Timeline, J: tlJ as unknown as Timeline, K: tlK as unknown as Timeline, L: tlL as unknown as Timeline,
  M: tlM as unknown as Timeline, N: tlN as unknown as Timeline, O: tlO as unknown as Timeline, P: tlP as unknown as Timeline, Q: tlQ as unknown as Timeline, R: tlR as unknown as Timeline,
  long2: tlLong2 as unknown as Timeline,
};

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

/** a 초에 b 초 동안 흔들림 (줌 펀치·쾅) — 결정적 */
export const shake = (t: number, a: number, d = 0.35, amp = 18) => {
  if (t < a || t > a + d) return [0, 0];
  const k = 1 - (t - a) / d;
  return [Math.sin(t * 97) * amp * k, Math.cos(t * 83) * amp * k];
};
/** 결정적 난수 (0~1) */
export const rnd = (i: number, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
/** back 이징 (살짝 넘쳤다 돌아옴) */
export const back = Easing.out(Easing.back(1.8));

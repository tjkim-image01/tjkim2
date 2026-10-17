// tj001 표지 — 롱폼 1920x1080 / 숏폼 1080x1920. 주인공은 실물 황제 엽서(AP20130215008_1)
import React from "react";
import { AbsoluteFill } from "remotion";
import { C, FONT, FONT_T } from "./lib";
import { Card, Grain, Plate, Seal, Sprite, Svg } from "./kit";

const EMP = "AP20130215008_1.jpg";
const title = (size: number): React.CSSProperties => ({ fontFamily: FONT_T, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: -2, wordBreak: "keep-all" });

export const ThumbLong: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Plate name="INTRO" W={1920} H={1080} />
    <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(31,42,55,0.92) 0%, rgba(31,42,55,0.82) 46%, rgba(31,42,55,0.15) 72%, rgba(31,42,55,0) 100%)" }} />
    <Card src={EMP} x={1480} y={540} w={600} h={900} fit="contain" rot={4} p={1} />
    <Svg W={1920} H={1080}><Seal x={1640} y={880} text="비매품" p={1} w={330} h={140} rot={-10} /></Svg>
    <div style={{ position: "absolute", left: 90, top: 110, width: 1000 }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: C.gold, letterSpacing: 4 }}>TJ KIM COLLECTION · 엽서</div>
      <div style={{ ...title(168), color: C.cream2, marginTop: 34, textShadow: "6px 7px 0 rgba(0,0,0,0.35)" }}>황제 얼굴이<br /><span style={{ color: "#F0614E" }}>왜 엽서에?</span></div>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 46, color: C.cream2, marginTop: 44, opacity: 0.92 }}>1900 · 일본이 공짜로 뿌린 대한제국 황제 엽서</div>
    </div>
    <Sprite src="CHAR_HARIN" x={1080} y={1100} h={560} flip />
    <Grain seed={7} />
  </AbsoluteFill>
);

export const ThumbShort: React.FC = () => (
  <AbsoluteFill style={{ background: C.cream }}>
    <Plate name="V_DESK" W={1080} H={1920} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(242,233,216,0.97) 0%, rgba(242,233,216,0.9) 22%, rgba(242,233,216,0) 40%)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 70, textAlign: "center" }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 36, color: C.ink2, letterSpacing: 3 }}>티제이 김 컬렉션 · 엽서</div>
      <div style={{ ...title(150), color: C.ink, marginTop: 20 }}>임금님이<br /><span style={{ color: C.red }}>왜 엽서에?</span></div>
    </div>
    <Card src={EMP} x={540} y={1010} w={560} h={820} fit="contain" rot={-3} p={1} />
    <Svg W={1080} H={1920}><Seal x={760} y={1340} text="비매품" p={1} w={320} h={136} rot={-10} /></Svg>
    <Sprite src="CHAR_TAEJIN" x={190} y={1912} h={470} />
    <Sprite src="CHAR_HARIN" x={890} y={1912} h={470} flip />
    <Grain seed={8} />
  </AbsoluteFill>
);

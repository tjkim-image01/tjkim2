// tj001 숏폼 9:16 — 위: 실물 엽서, 아래: 두 캐릭터 + 한 줄 키네틱 자막
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, FONT_T, TLS, clamp01, mk, pop, ramp } from "./lib";
import { Card, Ctx, Grain, Label, Plate, Postmark, Scene, Seal, Sprite, Svg, Txt, WHO, Wall } from "./kit";

const W = 1080, H = 1920;
const TL = TLS.short;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const CX = 540, CY = 600;   // 위쪽 엽서 영역 중심 (160~1040)
const SUB_TOP = 1200;       // 자막 구역 1200~1440, 캐릭터 머리 1440 아래
const EMP = ["AP20130215008_1.jpg", "AP20130215008_2.jpg"];
const PARIS = ["APAC190101059_1.jpg", "APAC190101059_2.jpg", "APAC190101059_3.jpg"];
const SET = ["APKC260209026_1.jpg", "APKC240614118_2.jpg", "APKC240612115_2.jpg", "APKC240608098_2.jpg", "APKC240606093_2.jpg"];
const DONKEY = ["APKC230615122EE_2.jpg", "APKC230615122EE_1.jpg"];
const WALL = [...SET, ...PARIS, ...EMP, ...DONKEY, "APKC240601087_1.jpg", "APKC180111001_1.jpg", "APKC240608094_1.jpg", "APKC230303039_1.jpg", "APKC240614118_4.jpg", "APKC230615122A_1.jpg"];

const Shot: React.FC<{ t: number; id: string; first?: boolean; zoom?: [number, number]; children: (t: number, c: (c: number | string) => number) => React.ReactNode }> = ({ t, id, first, zoom, children }) => (
  <Scene ctx={ctx} id={id} t={t} first={first} zoom={zoom ?? [1, 1.04]}>{() => (<>
    <Plate name="V_DESK" W={W} H={H} />
    {children(t, (c) => ctx.cue(id, c))}
  </>)}</Scene>
);

/** 두 캐릭터 (아래쪽), 말하는 쪽이 앞으로 */
const Pair: React.FC<{ t: number }> = ({ t }) => {
  const l = TL.lines.find((x) => t >= x.start - 0.1 && t <= x.end + 0.2); const who = l?.who;
  return (<>
    <Sprite src="CHAR_TAEJIN" x={235} y={1912} h={who === "태진" ? 470 : 430} t={t} talking={who === "태진"} o={who === "하린" ? 0.8 : 1} />
    <Sprite src="CHAR_HARIN" x={845} y={1912} h={who === "하린" ? 470 : 430} t={t} talking={who === "하린"} o={who === "태진" ? 0.8 : 1} flip />
  </>);
};

/** 한 줄 키네틱 자막: 조각(' / ')을 순서대로, 글자가 타자처럼 나타남 */
const Kinetic: React.FC<{ t: number }> = ({ t }) => {
  const l = TL.lines.find((x) => t >= x.start - 0.1 && t <= x.end + 0.3);
  if (!l) return null;
  const who = WHO[l.who];
  const chunks = l.sub.split(" / ").map((s) => s.trim()).filter(Boolean);
  const weights = chunks.map((x) => x.length + 2), sum = weights.reduce((a, b) => a + b, 0);
  const prog = clamp01((t - l.start) / Math.max(0.3, l.end - l.start)) * sum;
  let cum = 0, idx = chunks.length - 1, local = 1;
  for (let i = 0; i < chunks.length; i++) { if (prog < cum + weights[i]) { idx = i; local = (prog - cum) / weights[i]; break; } cum += weights[i]; }
  const text = chunks[idx]; const n = Math.ceil(text.length * clamp01(local * 1.6));
  const size = text.length > 22 ? 50 : text.length > 14 ? 58 : 68;
  const o = Math.min(ramp(t, l.start - 0.1, 0.15), 1 - ramp(t, l.end + 0.15, 0.2));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top: SUB_TOP, textAlign: "center", opacity: o }}>
      <div style={{ display: "inline-block", background: who.color, color: C.cream2, fontFamily: FONT, fontWeight: 800, fontSize: 32, borderRadius: 999, padding: "6px 26px", marginBottom: 10, boxShadow: "0 3px 8px rgba(31,42,55,0.25)" }}>{who.name}</div>
      <div style={{ display: "inline-block", maxWidth: 1000, background: "rgba(251,246,234,0.94)", borderRadius: 20, padding: `${size * 0.18}px ${size * 0.5}px`, boxShadow: "0 6px 18px rgba(31,42,55,0.22)", border: "2px solid rgba(31,42,55,0.14)" }}>
        <div style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: size, lineHeight: 1.25, color: C.ink, wordBreak: "keep-all" }}>
          {text.slice(0, n)}<span style={{ opacity: 0 }}>{text.slice(n)}</span>
        </div>
      </div>
    </div>
  );
};

export const Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      <Shot t={t} id="S01" first>{(t, c) => (<>
        <Card src={EMP[0]} x={CX} y={CY} w={600} h={880} fit="contain" p={pop(t, c(0))} kb={ramp(t, c(0), 5)} t={t} />
        <Svg W={W} H={H}><Label x={CX} y={160} text="임금님이 왜 엽서에?" size={66} p={pop(t, c("하린:"))} fill={C.red} /></Svg>
      </>)}</Shot>
      <Shot t={t} id="S02">{(t, c) => (<>
        <Card src={EMP[0]} back={EMP[1]} x={CX} y={CY} w={600} h={880} fit="contain" p={1} kb={0.3} flip={ramp(t, c("태진:근데"), 0.9)} t={t} />
        <Svg W={W} H={H}>
          <Label x={CX} y={160} text="대한제국 황제 · 1900" size={60} p={pop(t, c("태진:"))} />
          <Label x={CX} y={1120} text="POST CARD · JAPAN" size={48} p={pop(t, c("태진:포스트"))} />
          <Seal x={CX + 220} y={940} text="비매품" p={pop(t, c("태진:비매품"))} w={280} h={120} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="S03">{(t, c) => (<>
        <Card src={EMP[1]} x={CX} y={CY} w={600} h={880} fit="contain" p={1} kb={0.6} t={t} />
        <Svg W={W} H={H}><Seal x={CX + 220} y={940} text="비매품" p={1} w={280} h={120} /><Txt x={CX} y={190} size={110} fill={C.red} p={pop(t, c("하린:공짜"))}>공짜로?</Txt></Svg>
      </>)}</Shot>
      <Shot t={t} id="S04">{(t, c) => (<Svg W={W} H={H}>
        <Txt x={CX} y={360} size={220} fill="rgba(31,42,55,0.14)" p={1}>1865</Txt>
        <g opacity={pop(t, c("태진:천팔백"))}>
          <rect x={CX - 300} y={440} width={600} height={330} rx={14} fill={C.kraft} stroke="rgba(31,42,55,0.35)" strokeWidth={4} />
          <path d={`M ${CX - 300} 450 L ${CX} 660 L ${CX + 300} 450`} fill="none" stroke="rgba(31,42,55,0.35)" strokeWidth={4} />
        </g>
        <Label x={CX} y={870} text="봉투 없는 편지?" size={60} p={pop(t, c("태진:봉투"))} />
        <Label x={CX} y={1000} text="“남이 읽잖아. 품위 없어.”" size={54} p={pop(t, c("태진:남이"))} fill={C.red} />
        <Seal x={CX + 230} y={560} text="거절" p={pop(t, c("태진:남이") + 1.2)} w={300} h={130} />
      </Svg>)}</Shot>
      <Shot t={t} id="S05">{(t, c) => (<Svg W={W} H={H}>
        <Txt x={CX} y={500} size={96} fill={C.red} p={pop(t, c("하린:"))}>그냥 인스타 스토리잖아</Txt>
        <Label x={CX} y={700} text="사진 + 한 줄 + 남 보라고" size={54} p={pop(t, c("하린:") + 0.6)} />
      </Svg>)}</Shot>
      <Shot t={t} id="S06">{(t, c) => (<>
        {PARIS.map((s, i) => <Card key={s} src={s} x={CX - 160 + i * 160} y={CY - 60 + i * 50} w={520} rot={-8 + i * 7} p={pop(t, c(0.1) + i * 0.3)} kb={ramp(t, c(0), 6)} t={t + i} />)}
        <Svg W={W} H={H}>
          <Label x={CX} y={160} text="1869 오스트리아 · 석 달 300만 장" size={50} p={pop(t, c("태진:"))} fill={C.blue} />
          <Txt x={CX} y={1030} size={120} fill={C.red} p={pop(t, c("태진:천구백오"))}>70억 장</Txt>
          <Label x={CX} y={1120} text="1905년 한 해 · 전 세계" size={40} p={pop(t, c("태진:천구백오"))} bg="transparent" />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="S07">{(t, c) => (<>
        <Card src="APKC240601087_1.jpg" x={CX} y={CY} w={600} h={880} fit="contain" p={pop(t, c(0))} kb={ramp(t, c(0), 6)} t={t} />
        <Svg W={W} H={H}>
          <Label x={CX} y={160} text="1900. 5. 10 조선 1전 우체엽서" size={52} p={pop(t, c("태진:"))} fill={C.blue} />
          <Label x={CX} y={1120} text="양반은 안 썼다. 왜?" size={56} p={pop(t, c("태진:근데"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="S08">{(t, c) => (<Svg W={W} H={H}>
        <Txt x={CX} y={520} size={100} fill={C.red} p={pop(t, c("하린:"))}>“남이 읽는다”?</Txt>
        <Label x={CX} y={700} text="1865 = 1900" size={80} p={pop(t, c("하린:") + 0.8)} />
      </Svg>)}</Shot>
      <Shot t={t} id="S09">{(t, c) => (<>
        {SET.map((s, i) => <Card key={s} src={s} x={CX - 240 + i * 120} y={CY + (i % 2) * 60} w={420} rot={-10 + i * 5} p={pop(t, c("태진:십") + i * 0.2)} t={t + i} />)}
        <Svg W={W} H={H}>
          <Seal x={CX - 250} y={260} text="정답" p={pop(t, c("태진:"))} w={240} h={110} color={C.blue} />
          <Label x={CX + 120} y={280} text="먼저 쓴 건 상인 · 서민" size={46} p={pop(t, c("태진:먼저"))} />
          <Label x={CX} y={1120} text="10년 뒤 ‘조선풍속’ 세트, 봉투째" size={48} p={pop(t, c("태진:십"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="S10">{(t, c) => (<>
        <Card src={SET[0]} x={CX} y={CY} w={700} p={1} kb={ramp(t, c(0), 4)} t={t} />
        <Svg W={W} H={H}><Seal x={CX} y={1100} text="구경거리" p={pop(t, c("하린:"))} w={420} h={130} /></Svg>
      </>)}</Shot>
      <Shot t={t} id="S11">{(t, c) => (<>
        <Card src={DONKEY[0]} back={DONKEY[1]} x={CX} y={CY} w={760} p={1} kb={0.3} flip={ramp(t, c("태진:뒤집"), 0.9)} t={t} />
        <Svg W={W} H={H}>
          <Postmark x={CX + 250} y={420} r={80} p={pop(t, c("태진:우표"))} text="京城" />
          <Label x={CX} y={1120} text="우표 · 소인 · 손글씨" size={52} p={pop(t, c("태진:우표"))} />
          <Txt x={CX} y={170} size={80} fill={C.red} p={pop(t, c("태진:백"))}>100년 전 DM</Txt>
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="S12" zoom={[1.06, 1.0]}>{(t, c) => (<>
        <Wall srcs={WALL} W={W} H={1120} cols={4} p={ramp(t, c(0), 1.8)} t={t} dim={0.2} />
        <Svg W={W} H={H}>
          <rect x={90} y={520} width={900} height={300} rx={16} fill="rgba(31,42,55,0.9)" opacity={pop(t, c("하린:티제이"))} />
          <Txt x={CX} y={630} size={58} fill={C.cream2} p={pop(t, c("하린:티제이"))}>TJ Kim Collection</Txt>
          <Txt x={CX} y={740} size={66} fill={C.gold} p={pop(t, c("하린:엽서"))}>엽서 1,000장+</Txt>
          <Label x={CX} y={1120} text="뒷면 이야기는 롱폼에서 →" size={48} p={pop(t, c("하린:"))} fill={C.red} />
        </Svg>
      </>)}</Shot>

      <Pair t={t} />
      <Kinetic t={t} />
      <Grain seed={5} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 36, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink2, letterSpacing: 2 }}>티제이 김 컬렉션 · 엽서</div>
      <Audio src={staticFile("narration_short.wav")} />
    </AbsoluteFill>
  );
};

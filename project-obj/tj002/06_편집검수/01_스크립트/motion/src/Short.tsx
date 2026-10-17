// tj002 숏폼 9:16 — 위: 원색 무대 + 실물 삐라·소품·큰 활자, 가운데: 말풍선 자막, 아래: 태진·옥자 (포즈 교체)
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_P, TLS, clamp01, mk, pop, ramp } from "./lib";
import {
  Balloon, Big, Bubble, Char, Chip, Counter, Ctx, Floor, Grain, Leaf, LeafRain, LeafWall, Magnifier, Note, Notebook, Pencil, Plane, Police,
  Ribbon, Scene, Sfx, Shell, Stage, Stamp, Trans, poseOf,
} from "./kit";

const W = 1080, H = 1920;
const TL = TLS.short;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const CX = 540;
const FLOOR_Y = 1590, FEET = 2230, CH_H = 980, BUBBLE_Y = 1060;   // CH_H = 1024x1536 캔버스 높이 기준   // 캐릭터는 무릎 위까지 보이게 (발은 화면 밖)
const TJ_X = 250, OK_X = 830;

// 실물 (05_제작소스/01_이미지/01_삐라)
const FATHER = "APAC241013210_1.jpg";     // 아버지는 어데 게세요 (유엔군)
const SAFE_R = "APKC210526397C_1.jpg";    // 안전보장 증명서 (빨강)
const SAFE_B = "APKC210526397D_1.jpg";    // 보증안전적노표 (파랑)
const MORNING = "APAC230216028_1.jpg";    // Oh! What a Beautiful Morning (북측 → 미군)
const MOURN = "APAC230216029B_1.jpg";     // Don't let your loved ones mourn for you
const HEAD = "APAC230216029A_1.jpg";      // Use your head, soldier
const CHUSEOK = "APAC241013212_2.jpg";    // 추석은 왔건마는 (유엔군)
const RAIN = [
  "APAC241013210_1.jpg", "APKC210526397C_1.jpg", "APAC230216028_1.jpg", "APAC241013212_2.jpg", "APKC210526397D_1.jpg", "APAC230216029A_1.jpg",
  "APAC251106150B_1.jpg", "APAC251106147B_2.jpg", "APKC230619131_1.jpg", "APAC251106151A_1.jpg", "APAC190103002B_2.jpg", "APAC241013206_3.jpg",
  "APAC230216029B_1.jpg", "APAC251106150D_1.jpg", "APAC251106147B_1.jpg", "APAC230216031A_1.jpg", "APAC240608104_2.jpg", "APAC241028216A_1.jpg",
];
const WALL = [...RAIN, "APAC230216026_3.jpg", "APAC251106150B_2.jpg", "APKC260215107_2.jpg", "APAC241013210_3.jpg", "APAC230216028_3.jpg", "APAC241013206_1.jpg"];

type Cue = (c: number | string) => number;
const Shot: React.FC<{ t: number; id: string; color: string; trans?: Trans; burst?: boolean; zoom?: [number, number]; children: (t: number, c: Cue) => React.ReactNode }> = ({ t, id, color, trans, burst, zoom, children }) => (
  <Scene ctx={ctx} id={id} t={t} trans={trans} zoom={zoom}>{() => (<>
    <Stage W={W} H={H} color={color} t={t} burst={burst} />
    {children(t, (c) => ctx.cue(id, c))}
  </>)}</Scene>
);

/** 두 캐릭터: 말하는 쪽은 대사 감정 포즈, 듣는 쪽은 숏별 반응 포즈(REACT) */
const REACT: Record<string, Partial<Record<string, ReturnType<typeof poseOf>>>> = {
  S02: { 옥자: "LAUGH" }, S04: { 옥자: "SURPRISE" }, S05: { 태진: "LAUGH" }, S06: { 옥자: "SURPRISE" }, S09: { 태진: "LAUGH" }, S12: { 옥자: "POINT" },
};
const Pair: React.FC<{ t: number }> = ({ t }) => {
  const cur = TL.lines.find((x) => t >= x.start - 0.15 && t <= x.end + 0.25);
  const lastBy = (who: string) => [...TL.lines].reverse().find((x) => x.who === who && x.start - 0.15 <= t);
  const shotNow = [...TL.shots].reverse().find((s) => s.start - 0.2 <= t)?.id ?? "S01";
  const pose = (who: string) => {
    if (cur?.who === who) return { pose: poseOf(cur.emo, who), since: cur.start - 0.15 };
    const r = REACT[shotNow]?.[who];
    const sh = ctx.shot(shotNow);
    if (r && cur && t >= cur.start + 0.6) return { pose: r, since: cur.start + 0.6 };
    const l = lastBy(who);
    return { pose: "BASE" as const, since: l ? l.end + 0.25 : sh.start };
  };
  const tj = pose("태진"), ok = pose("옥자");
  return (<>
    <Char ctx={ctx} who="태진" pose={tj.pose} since={tj.since} x={TJ_X} y={FEET} h={cur?.who === "태진" ? CH_H : CH_H * 0.93} t={t} talking={cur?.who === "태진"} dim={cur?.who === "옥자"} />
    <Char ctx={ctx} who="옥자" pose={ok.pose} since={ok.since} x={OK_X} y={FEET} h={cur?.who === "옥자" ? CH_H : CH_H * 0.93} t={t} talking={cur?.who === "옥자"} dim={cur?.who === "태진"} />
  </>);
};

// ---------- 효과음 큐 (초, 파일, 볼륨) ----------
type S = [number, string, number];
const sfxCues = (): S[] => {
  const c = (id: string, x: number | string) => ctx.cue(id, x);
  const out: S[] = [];
  TL.shots.slice(1).forEach((s) => out.push([s.start - 0.36, "rip", 0.35]));
  out.push([c("S01", 0.05), "flutter", 0.5], [c("S01", 1.0), "thud", 0.7], [c("S01", "옥자:삐라"), "pop", 0.5]);
  out.push([c("S02", "태진:공책"), "pop", 0.5], [c("S02", "태진:연필"), "pop", 0.5], [c("S02", "태진:경찰"), "stamp", 0.6], [c("S02", "태진:이천칠"), "stamp", 0.6]);
  out.push([c("S03", 0.2), "flutter", 0.4]);
  out.push([c("S04", 0.1), "plane", 0.5], [c("S04", "태진:이십오억"), "ding", 0.45], [c("S04", "태진:폭탄"), "boom", 0.6]);
  out.push([c("S05", "옥자:"), "boom", 0.7]);
  out.push([c("S06", "태진:적을"), "whoosh", 0.5], [c("S06", "태진:안전보장"), "whoosh", 0.5], [c("S06", "태진:안전 보장") + 0.25, "stamp", 0.6]);
  out.push([c("S07", 0.2), "thud", 0.6], [c("S07", "옥자:왓"), "ding", 0.45]);
  out.push([c("S08", "태진:그리고") , "thud", 0.6]);
  out.push([c("S09", 0.1), "whoosh", 0.5], [c("S09", 1.0), "whoosh", 0.5], [c("S09", 1.9), "whoosh", 0.5]);
  out.push([c("S10", 0.1), "rise", 0.45], [c("S10", "태진:공책"), "pop", 0.5], [c("S10", "태진:이천 년"), "stamp", 0.5], [c("S10", "태진:이천이십사"), "boing", 0.6]);
  out.push([c("S11", "옥자:공책"), "stamp", 0.6]);
  out.push([c("S12", 0.1), "flutter", 0.5], [c("S12", "태진:티제이"), "ding", 0.5]);
  return out;
};

export const Short: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* S01 하늘에서 삐라 한 장 → 툭 */}
      <Shot t={t} id="S01" color={C.sky} trans="none">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={10} W={W} H={1100} span={1.2} fallDur={3.2} seed={11} size={[90, 150]} o={0.85} />
        <Leaf src={FATHER} x={CX} y={590} w={500} aspect={1.2} cropB={0.06} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1.2), 5)} t={t} />
        <Sfx x={CX + 300} y={860} text="툭!" t={t} a={c(1.0)} size={86} fill={C.yellow} color={C.red} dur={1.3} />
        <Big x={CX} y={250} size={104} p={pop(t, c("옥자:삐라"), 30, 9)} color={C.yellow} lh={1.0}>{"삐라 주워서\n공책 받았다!"}</Big>
      </>)}</Shot>

      {/* S02 파출소 → 공책·연필 → 경찰 규칙 → 2007 폐지 */}
      <Shot t={t} id="S02" color={C.yellow}>{(t, c) => (<>
        <Police x={CX} y={560} s={1.05} p={ramp(t, c(0), 0.6)} />
        <Notebook x={CX - 270} y={430} s={0.85} p={pop(t, c("태진:공책"))} rot={-12} />
        <Pencil x={CX + 260} y={380} s={0.9} p={pop(t, c("태진:연필"))} rot={-30} />
        <Stamp x={CX} y={830} text="경찰 규칙" p={ramp(t, c("태진:경찰"), 0.25)} w={440} h={140} rot={-6} />
        <Ribbon x={CX} y={200} text="삐라 신고 = 공책 · 연필" p={pop(t, c("태진:삐라"))} size={58} />
        <Big x={CX + 60} y={950} size={120} p={pop(t, c("태진:이천칠"))} color={C.cream} font="BagelFatOne" rot={6}>2007</Big>
        <Stamp x={CX + 360} y={1035} text="폐지" p={ramp(t, c("태진:이천칠") + 0.45, 0.25)} w={210} h={100} rot={-14} />
      </>)}</Shot>

      {/* S03 그 많은 종이, 어디서? */}
      <Shot t={t} id="S03" color={C.cream} trans="slide">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={16} W={W} H={1150} span={2.6} fallDur={3.0} seed={23} size={[100, 170]} />
        {[0, 1, 2].map((i) => <Big key={i} x={200 + i * 340} y={420 + (i % 2) * 180} size={230} p={pop(t, c(0.3 + i * 0.35))} color={[C.red, C.sky, C.yellow][i]} font="BagelFatOne" rot={-12 + i * 12}>?</Big>)}
        <Ribbon x={CX} y={880} text="그 많은 종이, 어디서?" p={pop(t, c("옥자:대체"))} bg={C.red} color={C.cream} size={64} />
      </>)}</Shot>

      {/* S04 B-29 + 삐라 폭우 + 25억~40억 + 탄피 22,500 */}
      <Shot t={t} id="S04" color={C.red} trans="punch">{(t, c) => {
        const px = -400 + (t - c(0)) * 520;
        const shellAt = c("태진:폭탄");
        return (<>
          <LeafRain srcs={RAIN} t={t} t0={c(0.5)} n={110} W={W} H={1250} span={Math.max(2, shellAt - c(0.5))} fallDur={2.4} seed={41} size={[80, 150]} />
          <Plane x={px} y={230} s={1.0} rot={-4} />
          <Ribbon x={CX} y={210} text="한국전쟁 3년" p={pop(t, c("태진:한국전쟁"))} bg={C.cream} color={C.ink} size={50} from={1} />
          {t < shellAt - 0.1 && <Counter x={CX} y={480} t={t} a={c("태진:이십오억")} d={1.0} from={0} to={25} size={170} suffix="억" color={C.yellow} />}
          {t < shellAt - 0.1 && <Counter x={CX} y={670} t={t} a={c("태진:사십억")} d={0.8} from={25} to={40} size={130} prefix="~" suffix="억 장" color={C.cream} rot={3} />}
          {t >= shellAt - 0.1 && <div style={{ position: "absolute", inset: 0, background: `rgba(28,28,28,${0.55 * clamp01((t - shellAt + 0.1) * 4)})` }} />}
          <Shell x={CX} y={620} s={0.95} p={pop(t, shellAt - 0.1)} open={ramp(t, c("태진:이만"), 0.5)} />
          <LeafRain srcs={RAIN} t={t} t0={c("태진:이만")} n={30} W={W} H={1100} span={0.4} fallDur={1.6} seed={47} size={[80, 130]} ox={[0.3, 0.7]} />
          <Counter x={CX} y={930} t={t} a={c("태진:이만")} d={1.2} to={22500} size={130} suffix="장" color={C.yellow} rot={-2} />
          <Big x={CX} y={330} size={66} p={pop(t, c("태진:이만"))} color={C.cream} rot={0}>탄피 1개 =</Big>
        </>);
      }}</Shot>

      {/* S05 종이 폭탄! */}
      <Shot t={t} id="S05" color={C.yellow} trans="punch">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={24} W={W} H={1150} span={0.5} fallDur={1.8} seed={53} size={[90, 160]} />
        <Sfx x={CX} y={560} text="종이 폭탄!" t={t} a={c("옥자:")} size={140} fill={C.red} color={C.yellow} r={470} />
        <Big x={CX} y={930} size={64} p={pop(t, c("옥자:") + 0.5)} color={C.cream} rot={4}>{"( 진짜로 폭탄 탄피에 담았다 )"}</Big>
      </>)}</Shot>

      {/* S06 "적을 삐라로 파묻어라" + 안전보장증 적·청 + 도장 */}
      <Shot t={t} id="S06" color={C.sky}>{(t, c) => (<>
        <Ribbon x={CX} y={170} text="“적을 삐라로 파묻어라”" p={pop(t, c("태진:적을"))} bg={C.ink} color={C.yellow} size={60} />
        <Big x={CX} y={255} size={38} p={pop(t, c("태진:적을") + 0.3)} color={C.cream} rot={0} font={FONT_P}>— 당시 미국 육군 장관</Big>
        <Leaf src={SAFE_R} x={CX - 170} y={620} w={480} aspect={0.79} rot={-8} drop={false} from={[-900, 0]} p={ramp(t, c("태진:이게"), 0.5)} t={t} />
        <Leaf src={SAFE_B} x={CX + 180} y={700} w={480} aspect={0.8} rot={7} drop={false} from={[900, 0]} p={ramp(t, c("태진:안전보장"), 0.5)} t={t + 1} />
        <Stamp x={CX} y={960} text="안전 보장" p={ramp(t, c("태진:안전 보장") + 0.25, 0.25)} w={460} h={150} rot={-8} />
      </>)}</Shot>

      {/* S07 영어 삐라 Beautiful Morning 착지 + 확대경 + 음표 */}
      <Shot t={t} id="S07" color={C.pink} trans="slide">{(t, c) => (<>
        <Leaf src={MORNING} x={CX} y={600} w={540} aspect={1.5} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c(1), 4)} t={t} />
        <Magnifier src={MORNING} x={CX + 210} y={350} r={190} fx={0.42} fy={0.17} mag={0.62} iw={1500} ih={2250} p={ramp(t, c("옥자:왓"), 0.45)} />
        {[0, 1, 2, 3].map((i) => { const k = t - c("옥자:왓") - i * 0.25; return k > 0 ? <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - clamp01((k - 1.6) / 0.5), transform: `translate(${120 + i * 70 + Math.sin(k * 3 + i) * 30}px, ${700 - k * 260}px)` }}><Note x={0} y={0} s={1 + (i % 2) * 0.3} /></div> : null; })}
        <Ribbon x={CX} y={1000} text="영어 삐라?!" p={pop(t, c("옥자:영어"))} bg={C.yellow} color={C.ink} size={60} rot={3} />
      </>)}</Shot>

      {/* S08 북한 → 미군 : Morning 왼쪽으로, Mourn 오른쪽 착지 */}
      <Shot t={t} id="S08" color={C.mint}>{(t, c) => {
        const sh = ramp(t, c("태진:그리고") - 0.4, 0.5);
        return (<>
          <Ribbon x={CX} y={160} text="북한 → 미군" p={pop(t, c("태진:"))} bg={C.red} color={C.cream} size={64} />
          <Leaf src={MORNING} x={CX - 230 * sh} y={600 - 40 * sh} w={540 - 160 * sh} aspect={1.5} rot={3 - 9 * sh} p={1} drop={false} t={t} />
          <Big x={CX - 230 * sh} y={1000} size={56} p={pop(t, c("태진:가족"))} color={C.cream} rot={-3}>“가족 생각해라”</Big>
          <Leaf src={MOURN} x={CX + 230} y={560} w={430} aspect={0.75} rot={6} p={ramp(t, c("태진:그리고"), 0.8)} t={t + 2} />
          <Big x={CX + 230} y={830} size={50} p={pop(t, c("태진:울게"))} color={C.yellow} rot={4}>“너 때문에{"\n"}가족이 운다”</Big>
        </>);
      }}</Shot>

      {/* S09 서로 집에 가라고 종이로 싸움 — 핑퐁 */}
      <Shot t={t} id="S09" color={C.yellow} trans="punch">{(t, c) => {
        const k = t - c(0);
        const lx = (ph: number) => { const s = Math.sin((k - ph) * Math.PI / 0.9); return CX + s * 300; };
        return (<>
          <Leaf src={SAFE_R} x={lx(0)} y={420 + Math.abs(Math.sin(k * Math.PI / 0.9)) * -120} w={300} aspect={0.79} rot={k * 220} drop={false} p={1} t={t} />
          <Leaf src={HEAD} x={W - lx(0.45)} y={700 + Math.abs(Math.sin((k - 0.45) * Math.PI / 0.9)) * -120} w={300} aspect={1.38} rot={-k * 200} drop={false} p={1} t={t} />
          <Big x={260} y={210} size={96} p={pop(t, c(0.2))} color={C.red} rot={-8}>집에 가라!</Big>
          <Big x={820} y={1000} size={88} p={pop(t, c(0.7))} color={C.sky} rot={6} font="BagelFatOne">GO HOME!</Big>
          <Sfx x={CX} y={860} text="ㅋㅋㅋ" t={t} a={c("옥자:종이로")} size={80} fill={C.pink} color={C.cream} r={210} />
        </>);
      }}</Shot>

      {/* S10 풍선 상승 → 연도 띠 1955 · 1970s · 2000 · 2024 → 쓰레기 풍선 */}
      <Shot t={t} id="S10" color={C.cream} trans="iris">{(t, c) => {
        const k = t - c(0); const trashAt = c("태진:이천이십사");
        const steps: [string, string, string, string][] = [["1955", "풍선 삐라", "태진:풍선", C.red], ["1970s", "주우면 공책", "태진:공책", C.sky], ["2000", "정부 중단", "태진:이천 년", C.mint], ["2024", "오물풍선", "태진:이천이십사", C.ink]];
        return (<>
          {t < trashAt + 0.2 && <Balloon x={300 + Math.sin(k) * 30} y={900 - k * 110} s={1.0} t={t} />}
          {t >= trashAt && <Balloon x={240} y={1000 - (t - trashAt) * 170} s={0.95} t={t} trash />}
          {steps.map(([y, label, cue, col], i) => {
            const p = pop(t, c(cue));
            return p > 0 ? (
              <div key={y} style={{ position: "absolute", left: 470, top: 180 + i * 205, opacity: clamp01(p * 2), transform: `translateX(${(1 - p) * 500}px) rotate(${i % 2 ? 2 : -2}deg)`, display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ fontFamily: "BagelFatOne", fontSize: 74, color: C.cream, background: col, border: `6px solid ${C.ink}`, padding: "0 20px", boxShadow: `8px 9px 0 ${C.ink}` }}>{y}</span>
                <span style={{ fontFamily: "BlackHanSans", fontSize: 58, color: C.ink }}>{label}</span>
              </div>
            ) : null;
          })}
          <Leaf src={CHUSEOK} x={220} y={300} w={240} aspect={1.33} rot={-8} p={pop(t, c("태진:공책"))} drop={false} from={[-500, 0]} t={t} />
        </>);
      }}</Shot>

      {/* S11 요즘은 공책 안 줘? */}
      <Shot t={t} id="S11" color={C.yellow}>{(t, c) => (<>
        <Notebook x={CX} y={600} s={1.45} p={pop(t, c(0))} rot={-4} cross={ramp(t, c("옥자:공책"), 0.5)} />
        <Big x={CX} y={200} size={92} p={pop(t, c("옥자:요즘"))} color={C.cream} rot={-4}>요즘은?</Big>
      </>)}</Shot>

      {/* S12 삐라 벽 + TJ Kim Collection 100장+ */}
      <Shot t={t} id="S12" color={C.ink} burst={false} zoom={[1.05, 1]}>{(t, c) => (<>
        <LeafWall srcs={WALL} W={W} top={140} cols={6} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c("태진:대신"), 0.5) * 0.45} />
        <Ribbon x={CX} y={440} text="TJ Kim Collection" p={pop(t, c("태진:티제이"))} bg={C.yellow} color={C.ink} size={68} />
        <Counter x={CX} y={640} t={t} a={c("태진:백")} d={0.9} to={100} size={190} suffix="장+" color={C.red} />
        <Ribbon x={CX} y={900} text="뒷면 이야기는 롱폼에서 →" p={pop(t, c("태진:뒷면"))} bg={C.cream} color={C.red} size={54} from={1} />
      </>)}</Shot>

      <Floor W={W} y={FLOOR_Y} H={H} />
      <Pair t={t} />
      <Bubble ctx={ctx} t={t} y={BUBBLE_Y} tails={{ 태진: TJ_X + 40, 옥자: OK_X - 40 }} W={W} />
      <Chip W={W} text="티제이 김 컬렉션 · 삐라" />
      <Grain seed={7} />
      <Audio src={staticFile("narration_short.wav")} />
      {TL.art.includes("bgm") && <Audio src={staticFile("bgm_short.wav")} volume={(f) => 0.16 * Math.min(1, f / 15) * Math.min(1, (TL.duration * 30 - f) / 45)} />}
      {sfxCues().map(([s, f, v], i) => s >= 0 && (
        <Sequence key={i} from={Math.round(s * fps)} durationInFrames={Math.round(2.5 * fps)}><Audio src={staticFile(`sfx/${f}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

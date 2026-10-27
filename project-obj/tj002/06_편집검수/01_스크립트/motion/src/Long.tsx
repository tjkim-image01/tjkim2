// tj002 롱폼 16:9 「삐라 주우면 공책 줬다 — 하늘에서 떨어진 종이 100년」 — 레트로 팝 무대, 양쪽 아래 태진·옥자, 가운데 말풍선
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_P, TLS, clamp01, mk, pop, ramp } from "./lib";
import {
  Balloon, Big, Bubble, Char, Chip, Counter, Ctx, Floor, Grain, Leaf, LeafRain, LeafWall, Magnifier, Note, Notebook, Pencil, Plane, Police,
  Ribbon, Scene, Sfx, Shell, Stage, Stamp, Trans, poseOf,
} from "./kit";

const W = 1920, H = 1080, CX = 960;
const TL = TLS.long;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const FLOOR_Y = 1000, FEET = 1400, CH_H = 820, BUBBLE_Y = 840;
const TJ_X = 250, OK_X = 1670;
const RX = 1180;   // 캐릭터 사이 오른쪽 내용 중심

const FATHER1 = "APAC241013210_1.jpg", FATHER3 = "APAC241013210_3.jpg", SAFE_R = "APKC210526397C_1.jpg", SAFE_B = "APKC210526397D_1.jpg";
const MORNING = "APAC230216028_1.jpg", HEAD = "APAC230216029A_1.jpg", CHUSEOK = "APAC241013212_2.jpg", MAC_B = "APKC230619131_3.jpg", ANAL = "APAC190103002B_1.jpg";
const RAIN = [FATHER1, SAFE_R, MORNING, CHUSEOK, SAFE_B, HEAD, "APAC251106150B_1.jpg", "APAC251106147B_2.jpg", "APKC230619131_1.jpg", "APAC251106151A_1.jpg", "APAC190103002B_2.jpg", "APAC241013206_3.jpg",
  "APAC230216029B_1.jpg", "APAC251106150D_1.jpg", "APAC251106147B_1.jpg", "APAC230216031A_1.jpg", "APAC240608104_2.jpg", "APAC241028216A_1.jpg"];
const WALL = [...RAIN, "APAC230216026_3.jpg", "APAC251106150B_2.jpg", "APKC260215107_2.jpg", "APAC241013210_3.jpg", "APAC230216028_3.jpg", "APAC241013206_1.jpg", "APAC251106149B_1.jpg", "APAC251106149C_1.jpg", "APAC241028216A_3.jpg", "APAC230216025B_1.jpg", "APAC251106148D_1.jpg", "APAC251106149F_1.jpg"];

type Cue = (c: number | string) => number;
const Shot: React.FC<{ t: number; id: string; color: string; trans?: Trans; burst?: boolean; zoom?: [number, number]; children: (t: number, c: Cue) => React.ReactNode }> = ({ t, id, color, trans, burst, zoom, children }) => (
  <Scene ctx={ctx} id={id} t={t} trans={trans} zoom={zoom}>{() => (<>
    <Stage W={W} H={H} color={color} t={t} burst={burst} cy={H * 0.4} />
    {children(t, (c) => ctx.cue(id, c))}
  </>)}</Scene>
);

const REACT: Record<string, Partial<Record<string, ReturnType<typeof poseOf>>>> = {
  "P0-I2": { 옥자: "LAUGH" }, "P1-A1": { 옥자: "SURPRISE" }, "P1-A3": { 옥자: "SURPRISE" }, "P2-B1": { 옥자: "BASE" }, "P2-B3": { 옥자: "LAUGH" },
  "P3-C2": { 옥자: "LAUGH" }, "P3-C3": { 옥자: "LAUGH" }, "P4-D2": { 옥자: "SURPRISE" }, "P5-E2": { 옥자: "SURPRISE" }, "P6-F2": { 옥자: "POINT" },
};
const Pair: React.FC<{ t: number }> = ({ t }) => {
  const cur = TL.lines.find((x) => t >= x.start - 0.15 && t <= x.end + 0.25);
  const lastBy = (who: string) => [...TL.lines].reverse().find((x) => x.who === who && x.start - 0.15 <= t);
  const shotNow = [...TL.shots].reverse().find((s) => s.start - 0.2 <= t)?.id ?? TL.shots[0].id;
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
    <Char ctx={ctx} who="태진" pose={tj.pose} since={tj.since} x={TJ_X} y={FEET} h={cur?.who === "태진" ? CH_H : CH_H * 0.94} t={t} talking={cur?.who === "태진"} dim={cur?.who === "옥자"} />
    <Char ctx={ctx} who="옥자" pose={ok.pose} since={ok.since} x={OK_X} y={FEET} h={cur?.who === "옥자" ? CH_H : CH_H * 0.94} t={t} talking={cur?.who === "옥자"} dim={cur?.who === "태진"} />
  </>);
};

/** 파트 제목 카드 (레트로 TV 타이틀) */
const PartTitle: React.FC<{ t: number }> = ({ t }) => {
  const p = TL.parts.find((x) => x.title && t >= x.start - 0.1 && t < x.firstLine + 0.1);
  if (!p || !p.title) return null;
  const o = Math.min(ramp(t, p.start - 0.1, 0.25), 1 - ramp(t, p.firstLine - 0.35, 0.35));
  const colors = [C.red, C.yellow, C.sky, C.mint, C.pink, C.ink];
  const i = TL.parts.indexOf(p) % colors.length;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Stage W={W} H={H} color={colors[i]} t={t} cy={H * 0.5} />
      <Ribbon x={CX} y={400} text={p.title[0]} p={pop(t, p.start + 0.1)} bg={C.ink} color={C.yellow} size={56} />
      <Big x={CX} y={580} size={150} p={pop(t, p.start + 0.3, 30, 9)} color={C.cream} maxW={1700}>{p.title[1]}</Big>
    </AbsoluteFill>
  );
};

type S = [number, string, number];
const sfxCues = (): S[] => {
  const c = (id: string, x: number | string) => ctx.cue(id, x);
  const out: S[] = [];
  TL.shots.slice(1).forEach((s) => out.push([s.start - 0.36, "rip", 0.3]));
  out.push([c("P0-I1", 0.05), "flutter", 0.5], [c("P0-I1", 1.0), "thud", 0.7], [c("P0-I2", "옥자:파출소"), "pop", 0.5], [c("P0-I2", "옥자:공책"), "pop", 0.5], [c("P0-I2", "옥자:연필"), "pop", 0.5], [c("P0-I2", "태진:경찰"), "stamp", 0.6], [c("P0-I2", "태진:이천칠"), "stamp", 0.6]);
  out.push([c("P0-I3", 0.2), "flutter", 0.4], [c("P1-A1", 0.1), "plane", 0.5], [c("P1-A1", "태진:이십오억"), "ding", 0.45], [c("P1-A1", "옥자:"), "boing", 0.5]);
  out.push([c("P1-A2", "태진:적을"), "whoosh", 0.5], [c("P1-A3", "태진:비"), "plane", 0.4], [c("P1-A3", "태진2:오백"), "boom", 0.6], [c("P1-A3", "태진2:이만"), "ding", 0.5], [c("P1-A3", "옥자:"), "boing", 0.5]);
  out.push([c("P1-A4", "태진:영어"), "pop", 0.5], [c("P1-A4", "태진:표준어"), "stamp", 0.6]);
  out.push([c("P2-B1", "태진:이게"), "whoosh", 0.5], [c("P2-B1", "태진:안전보장증서"), "whoosh", 0.5], [c("P2-B1", "태진:이거 들고") + 0.3, "stamp", 0.6]);
  out.push([c("P2-B2", "태진:아버지"), "thud", 0.6], [c("P2-B2", "태진:추석"), "thud", 0.6], [c("P2-B3", "태진:지친"), "pop", 0.5], [c("P2-B3", "태진2:삐라마다"), "stamp", 0.6]);
  out.push([c("P3-C1", 0.2), "thud", 0.6], [c("P3-C2", "태진:오"), "ding", 0.45], [c("P3-C2", "옥자:"), "boing", 0.5], [c("P3-C3", "태진:매일"), "ding", 0.45]);
  out.push([c("P4-D1", "태진:천구백오십오"), "rise", 0.45], [c("P4-D1", "태진:풍선 사천"), "ding", 0.5], [c("P4-D2", "태진:여배우"), "pop", 0.5], [c("P4-D2", "태진:잡지"), "pop", 0.5], [c("P4-D2", "태진:워크맨"), "pop", 0.5], [c("P4-D2", "옥자:"), "boing", 0.6]);
  out.push([c("P4-D3", "태진:공책"), "pop", 0.5], [c("P4-D3", "태진:연필"), "pop", 0.5], [c("P5-E1", "태진:이천 년"), "stamp", 0.6], [c("P5-E1", "태진:이천사"), "stamp", 0.6]);
  out.push([c("P5-E2", "태진:민간"), "rise", 0.45], [c("P5-E2", "태진:육백"), "boom", 0.6], [c("P5-E2", "옥자:쓰레기"), "stamp", 0.5], [c("P6-F1", 0.1), "flutter", 0.5], [c("P6-F2", 0.1), "flutter", 0.5], [c("P6-F2", "태진:티제이"), "ding", 0.5]);
  return out;
};

export const Long: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* P0 훅 */}
      <Shot t={t} id="P0-I1" color={C.sky} trans="none">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={12} W={W} H={700} span={1.5} fallDur={3.0} seed={11} size={[80, 140]} o={0.8} />
        <Leaf src={FATHER1} x={CX} y={400} w={360} aspect={1.5} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1.2), 5)} t={t} />
        <Sfx x={CX + 260} y={560} text="툭!" t={t} a={c(1.0)} size={80} fill={C.yellow} color={C.red} dur={1.3} />
        <Big x={CX + 480} y={330} size={96} p={pop(t, c("옥자:삐라"), 30, 9)} color={C.yellow} maxW={700}>이거 삐라잖아!</Big>
      </>)}</Shot>
      <Shot t={t} id="P0-I2" color={C.yellow}>{(t, c) => (<>
        <Police x={CX} y={430} s={0.85} p={ramp(t, c("옥자:파출소"), 0.6)} />
        <Notebook x={CX - 420} y={330} s={0.7} p={pop(t, c("옥자:공책"))} rot={-12} />
        <Pencil x={CX + 420} y={300} s={0.8} p={pop(t, c("옥자:연필"))} rot={-30} />
        <Stamp x={CX} y={660} text="경찰 규칙" p={ramp(t, c("태진:경찰"), 0.25)} w={420} h={130} rot={-6} />
        <Big x={CX + 520} y={560} size={110} p={pop(t, c("태진:이천칠"))} color={C.cream} font="BagelFatOne" rot={6}>2007</Big>
        <Stamp x={CX + 520} y={690} text="폐지" p={ramp(t, c("태진:이천칠") + 0.45, 0.25)} w={200} h={90} rot={-14} />
      </>)}</Shot>
      <Shot t={t} id="P0-I3" color={C.cream} trans="slide">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={16} W={W} H={760} span={2.6} fallDur={3.0} seed={23} size={[90, 150]} />
        {[0, 1, 2].map((i) => <Big key={i} x={640 + i * 320} y={300 + (i % 2) * 150} size={200} p={pop(t, c(0.3 + i * 0.35))} color={[C.red, C.sky, C.yellow][i]} font="BagelFatOne" rot={-12 + i * 12}>?</Big>)}
        <Ribbon x={CX} y={660} text="1950년, 하늘부터" p={pop(t, c("태진:천구백오십"))} bg={C.red} color={C.cream} size={64} />
      </>)}</Shot>

      {/* P1 종이 폭탄 */}
      <Shot t={t} id="P1-A1" color={C.red} trans="punch">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0.3)} n={90} W={W} H={800} span={4} fallDur={2.4} seed={41} size={[70, 130]} />
        <Plane x={-400 + (t - c(0)) * 520} y={170} s={0.9} rot={-4} />
        <Ribbon x={CX} y={150} text="한국전쟁 3년" p={pop(t, c("태진:한국전쟁"))} bg={C.cream} color={C.ink} size={50} />
        <Counter x={CX - 200} y={420} t={t} a={c("태진:이십오억")} d={1.0} to={25} size={170} suffix="억" color={C.yellow} />
        <Counter x={CX + 260} y={560} t={t} a={c("태진:사십억")} d={0.8} from={25} to={40} size={130} prefix="~" suffix="억 장" color={C.cream} rot={3} />
        <Sfx x={CX + 420} y={330} text="40억?!" t={t} a={c("옥자:")} size={90} fill={C.yellow} color={C.red} r={300} dur={2.5} />
      </>)}</Shot>
      <Shot t={t} id="P1-A2" color={C.red}>{(t, c) => (<>
        <Big x={CX} y={300} size={120} p={pop(t, c("태진:사람"))} color={C.yellow}>사람 수의 100배</Big>
        <Ribbon x={CX} y={540} text="“적을 삐라로 파묻어라”" p={pop(t, c("태진:적을"))} bg={C.ink} color={C.yellow} size={66} />
        <Big x={CX} y={650} size={40} p={pop(t, c("태진:적을") + 0.3)} color={C.cream} rot={0} font={FONT_P}>— 당시 미국 육군 장관</Big>
      </>)}</Shot>
      <Shot t={t} id="P1-A3" color={C.sky}>{(t, c) => {
        const shellAt = c("태진2:오백");
        return (<>
          {t < shellAt && <Plane x={-400 + (t - c("태진:비")) * 500} y={150} s={0.8} rot={-4} />}
          <Ribbon x={CX + 380} y={250} text="① B-29 삐라 폭탄" p={pop(t, c("태진:비"))} bg={C.cream} color={C.ink} size={46} from={1} />
          <Ribbon x={CX + 380} y={360} text="② 비행기에서 손으로" p={pop(t, c("태진:작은"))} bg={C.yellow} color={C.ink} size={46} from={1} />
          <Ribbon x={CX + 380} y={470} text="③ 대포알에 넣어서" p={pop(t, c("태진:대포"))} bg={C.pink} color={C.ink} size={46} from={1} />
          {t >= shellAt - 0.1 && <div style={{ position: "absolute", inset: 0, background: `rgba(28,28,28,${0.5 * clamp01((t - shellAt + 0.1) * 4)})` }} />}
          <Shell x={CX - 380} y={380} s={0.75} p={pop(t, shellAt - 0.1)} open={ramp(t, c("태진2:이만"), 0.5)} />
          <LeafRain srcs={RAIN} t={t} t0={c("태진2:이만")} n={30} W={W} H={760} span={0.4} fallDur={1.6} seed={47} size={[70, 120]} ox={[0.2, 0.45]} />
          <Big x={CX - 380} y={150} size={54} p={pop(t, c("태진2:오백"))} color={C.cream} rot={0} maxW={700}>500파운드 탄피 1개 =</Big>
          <Counter x={CX - 380} y={660} t={t} a={c("태진2:이만")} d={1.2} to={22500} size={110} suffix="장" color={C.yellow} rot={-2} />
          <Sfx x={CX + 380} y={720} text="종이 폭탄!" t={t} a={c("옥자:")} size={80} fill={C.red} color={C.yellow} r={300} />
        </>);
      }}</Shot>
      <Shot t={t} id="P1-A4" color={C.cream}>{(t, c) => (<>
        <Ribbon x={CX - 500} y={400} text="bill (영어)" p={pop(t, c("태진:영어"))} bg={C.sky} color={C.ink} size={70} font="BagelFatOne" />
        <Big x={CX - 200} y={400} size={90} p={pop(t, c("태진:일본"))} color={C.ink} rot={0}>→</Big>
        <Ribbon x={CX + 60} y={400} text="ビラ (일본)" p={pop(t, c("태진:일본"))} bg={C.pink} color={C.ink} size={70} from={1} />
        <Big x={CX + 360} y={400} size={90} p={pop(t, c("태진:삐라가"))} color={C.ink} rot={0}>→</Big>
        <Ribbon x={CX + 600} y={400} text="삐라" p={pop(t, c("태진:삐라가"))} bg={C.red} color={C.cream} size={90} />
        <Stamp x={CX} y={640} text="표준어: 전단" p={ramp(t, c("태진:표준어"), 0.25)} w={440} h={120} rot={-6} color={C.blue} />
      </>)}</Shot>

      {/* P2 종이 한 장에 뭘 적었나 */}
      <Shot t={t} id="P2-B1" color={C.mint}>{(t, c) => (<>
        <Ribbon x={CX} y={150} text="안전보장증서 · Safe Conduct Pass" p={pop(t, c("태진:안전보장증서"))} size={50} />
        <Leaf src={SAFE_R} x={CX - 230} y={430} w={420} aspect={0.79} rot={-7} drop={false} from={[-900, 0]} p={ramp(t, c("태진:이게"), 0.5)} t={t} />
        <Leaf src={SAFE_B} x={CX + 230} y={470} w={420} aspect={0.8} rot={6} drop={false} from={[900, 0]} p={ramp(t, c("태진:안전보장증서"), 0.5)} t={t + 1} />
        <Stamp x={CX} y={680} text="안전 보장" p={ramp(t, c("태진:이거 들고") + 0.3, 0.25)} w={420} h={130} rot={-8} />
        <Sfx x={CX + 480} y={300} text="비행기표?" t={t} a={c("옥자:")} size={70} fill={C.yellow} color={C.red} r={260} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="P2-B2" color={C.cream}>{(t, c) => (<>
        <Leaf src={FATHER3} x={CX - 260} y={420} w={330} aspect={1.44} rot={-5} p={ramp(t, c("태진:아버지") - 0.6, 0.9)} t={t} />
        <Leaf src={CHUSEOK} x={CX + 260} y={440} w={340} aspect={1.33} rot={5} p={ramp(t, c("태진:추석") - 0.6, 0.9)} t={t + 1} />
        <Big x={CX - 260} y={700} size={48} p={pop(t, c("태진:아버지"))} color={C.yellow} font={FONT_P} stroke={4} maxW={520}>“아버지는 어데 게세요?”</Big>
        <Big x={CX + 260} y={700} size={44} p={pop(t, c("태진:추석"))} color={C.yellow} font={FONT_P} stroke={4} maxW={520}>{"“추석은 왔건마는\n고향은 멀고멀다”"}</Big>
        <Sfx x={CX} y={200} text="찡…" t={t} a={c("옥자:")} size={80} fill={C.sky} color={C.cream} r={220} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="P2-B3" color={C.sky}>{(t, c) => (<>
        <Ribbon x={CX} y={150} text="미군 분석 보고서" p={pop(t, c("태진:분석"))} size={56} />
        <Big x={CX - 300} y={380} size={110} p={pop(t, c("태진:지친"))} color={C.yellow}>{"협박 < 향수"}</Big>
        <Leaf src={ANAL} x={CX + 330} y={430} w={360} aspect={1.31} rot={4} p={ramp(t, c("태진2:이 컬렉션"), 0.9)} kb={ramp(t, c("태진2:언어"), 4)} t={t} />
        <Stamp x={CX - 300} y={620} text="성적표" p={ramp(t, c("태진2:삐라마다"), 0.25)} w={320} h={130} rot={-8} />
        <Sfx x={1560} y={230} text="꼼꼼하네" t={t} a={c("옥자:")} size={64} fill={C.pink} color={C.cream} r={240} dur={3} />
      </>)}</Shot>

      {/* P3 반대편도 뿌렸다 */}
      <Shot t={t} id="P3-C1" color={C.pink}>{(t, c) => (<>
        <Leaf src={HEAD} x={CX - 250} y={430} w={400} aspect={1.38} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("옥자:유즈"), 4)} t={t} />
        <Big x={CX + 300} y={330} size={80} p={pop(t, c("옥자:유즈"))} color={C.cream} font="BagelFatOne" maxW={760}>{"Use your head,\nsoldier!"}</Big>
        <Ribbon x={CX + 300} y={520} text="북한 → 미군" p={pop(t, c("태진:북한"))} bg={C.red} color={C.cream} size={56} from={1} />
        <Ribbon x={CX + 300} y={640} text="머리를 붙여 두고 싶으면 집에 가라" p={pop(t, c("태진:머리"))} bg={C.cream} color={C.ink} size={40} from={1} />
      </>)}</Shot>
      <Shot t={t} id="P3-C2" color={C.mint}>{(t, c) => (<>
        <Leaf src={MORNING} x={CX - 280} y={430} w={380} aspect={1.5} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:오"), 4)} t={t} />
        <Magnifier src={MORNING} x={CX - 100} y={280} r={150} fx={0.42} fy={0.17} mag={0.5} iw={1500} ih={2250} p={ramp(t, c("태진:오"), 0.45)} />
        {[0, 1, 2, 3].map((i) => { const k = t - c("태진:오") - i * 0.25; return k > 0 ? <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - clamp01((k - 1.6) / 0.5), transform: `translate(${CX + 120 + i * 60 + Math.sin(k * 3 + i) * 30}px, ${520 - k * 220}px)` }}><Note x={0} y={0} s={1 + (i % 2) * 0.3} /></div> : null; })}
        <Ribbon x={CX + 330} y={360} text="뮤지컬 노래 제목" p={pop(t, c("태진:뮤지컬"))} bg={C.cream} color={C.ink} size={48} from={1} />
        <Ribbon x={CX + 330} y={480} text="11시 휘파람 노래, 기억나지?" p={pop(t, c("태진:아침"))} bg={C.yellow} color={C.ink} size={44} from={1} />
        <Ribbon x={CX + 330} y={600} text="가족 생각해라" p={pop(t, c("태진:가족"))} bg={C.red} color={C.cream} size={50} from={1} />
        <Sfx x={CX} y={720} text="ㅋㅋㅋ" t={t} a={c("옥자:")} size={70} fill={C.pink} color={C.cream} r={200} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="P3-C3" color={C.yellow}>{(t, c) => (<>
        <Leaf src={MAC_B} x={CX - 300} y={430} w={360} aspect={1.56} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:매일"), 4)} t={t} />
        <svg style={{ position: "absolute", left: CX - 80, top: 300, overflow: "visible" }} width={10} height={10}>
          {[1, 2, 3].map((i) => <path key={i} d={`M 0 ${-50 * i} A ${50 * i} ${50 * i} 0 0 1 0 ${50 * i}`} fill="none" stroke={C.red} strokeWidth={12} opacity={clamp01((t - c("태진:매일") - i * 0.25) * 3) * (0.5 + 0.5 * Math.sin(t * 8 + i))} />)}
        </svg>
        <Ribbon x={CX + 300} y={380} text="매일 밤 9시" p={pop(t, c("태진:매일"))} bg={C.red} color={C.cream} size={60} from={1} />
        <Big x={CX + 300} y={530} size={110} p={pop(t, c("태진:구백오십"))} color={C.cream} font="BagelFatOne" rot={4}>950kc</Big>
        <Ribbon x={CX + 300} y={690} text="라디오 광고 삐라" p={pop(t, c("태진:라디오"))} bg={C.cream} color={C.ink} size={48} from={1} />
        <Sfx x={CX + 300} y={190} text="구독 · 좋아요" t={t} a={c("옥자:")} size={54} fill={C.mint} color={C.ink} r={250} dur={3} />
      </>)}</Shot>

      {/* P4 풍선, 그리고 공책 */}
      <Shot t={t} id="P4-D1" color={C.cream} trans="iris">{(t, c) => (<>
        {t < c("태진:천구백오십오") && <Plane x={-400 + (t - c(0)) * 520} y={170} s={0.8} rot={-4} />}
        {t >= c("태진:천구백오십오") && <Balloon x={CX - 400} y={600 - (t - c("태진:천구백오십오")) * 70} s={0.95} t={t} />}
        <Ribbon x={CX + 150} y={330} text="1955 백령도 풍선 실험" p={pop(t, c("태진:천구백오십오"))} bg={C.red} color={C.cream} size={56} from={1} />
        <Counter x={CX + 150} y={520} t={t} a={c("태진:풍선 사천")} d={1.0} to={4000} size={150} suffix="개" color={C.yellow} />
        <Sfx x={CX + 560} y={250} text="아하!" t={t} a={c("옥자:")} size={64} fill={C.yellow} color={C.red} r={200} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="P4-D2" color={C.pink}>{(t, c) => (<>
        <Ribbon x={CX} y={150} text="1980년대 남쪽 꾸러미" p={pop(t, c("태진:팔십"))} size={54} />
        {["여배우 사진", "잡지", "워크맨"].map((w, i) => <Ribbon key={w} x={CX - 420 + i * 420} y={420 + (i % 2) * 90} text={w} p={pop(t, c(`태진:${w.slice(0, 2)}`))} bg={[C.yellow, C.mint, C.sky][i]} color={C.ink} size={70} from={i % 2 ? 1 : -1} rot={i % 2 ? 3 : -3} />)}
        <Sfx x={CX} y={680} text="워크맨?!" t={t} a={c("옥자:")} size={96} fill={C.red} color={C.yellow} r={340} dur={4} />
      </>)}</Shot>
      <Shot t={t} id="P4-D3" color={C.yellow}>{(t, c) => (<>
        <Police x={CX - 300} y={430} s={0.75} p={ramp(t, c(0), 0.6)} />
        <Notebook x={CX + 230} y={400} s={0.75} p={pop(t, c("태진:공책"))} rot={-10} />
        <Pencil x={CX + 520} y={330} s={0.8} p={pop(t, c("태진:연필"))} rot={-30} />
        <Big x={CX + 330} y={640} size={60} p={pop(t, c("태진:마지막"))} color={C.cream} rot={-2} maxW={800}>{"이모의 공책 =\n그 전쟁의 마지막 조각"}</Big>
      </>)}</Shot>

      {/* P5 멈췄다가, 다시 */}
      <Shot t={t} id="P5-E1" color={C.sky}>{(t, c) => (<>
        <Stamp x={CX - 350} y={420} text="2000 정부 중단" p={ramp(t, c("태진:이천 년"), 0.25)} w={620} h={150} rot={-6} />
        <Stamp x={CX + 350} y={520} text="2004 장비 철거" p={ramp(t, c("태진:이천사"), 0.25)} w={620} h={150} rot={5} color={C.blue} />
        <Big x={CX} y={720} size={120} p={pop(t, c("옥자:"))} color={C.cream} font="BagelFatOne">끝?</Big>
      </>)}</Shot>
      <Shot t={t} id="P5-E2" color={C.red} trans="punch">{(t, c) => (<>
        <Balloon x={CX - 480} y={720 - (t - c(0)) * 110} s={0.9} t={t} trash />
        <Ribbon x={CX + 100} y={300} text="민간 풍선 → 2024. 5. 28" p={pop(t, c("태진:민간"))} bg={C.cream} color={C.ink} size={56} from={1} />
        <Counter x={CX + 100} y={520} t={t} a={c("태진:육백")} d={1.0} to={600} size={170} suffix="개" color={C.yellow} />
        <Notebook x={CX + 560} y={400} s={0.7} p={pop(t, c("옥자:공책"))} rot={-6} cross={ramp(t, c("옥자:쓰레기"), 0.5)} />
      </>)}</Shot>

      {/* P6 하늘에서 떨어진 DM */}
      <Shot t={t} id="P6-F1" color={C.cream}>{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={20} W={W} H={760} span={3} fallDur={3.5} seed={91} size={[70, 130]} o={0.8} />
        <Counter x={CX - 300} y={330} t={t} a={c("태진:백 년")} d={0.8} to={100} size={170} suffix="년" color={C.red} />
        <Big x={CX + 240} y={340} size={90} p={pop(t, c("태진:디엠"))} color={C.yellow} maxW={800}>{"하늘에서\n떨어진 DM"}</Big>
        <Ribbon x={CX} y={640} text="그 DM 받고 공책 번 사람이 나야" p={pop(t, c("옥자:"))} bg={C.red} color={C.cream} size={54} />
      </>)}</Shot>
      <Shot t={t} id="P6-F2" color={C.ink} burst={false} zoom={[1.05, 1]}>{(t, c) => (<>
        <LeafWall srcs={WALL} W={W} top={60} cols={10} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c("태진:티제이"), 0.5) * 0.45} />
        <Ribbon x={CX} y={300} text="TJ Kim Collection" p={pop(t, c("태진:티제이"))} bg={C.yellow} color={C.ink} size={68} />
        <Counter x={CX} y={480} t={t} a={c("태진:백")} d={0.9} to={100} size={170} suffix="장+" color={C.red} />
        <Ribbon x={CX} y={660} text="다음 편: 뒷면 분석표 읽어 드립니다" p={pop(t, c("태진:다음"))} bg={C.cream} color={C.red} size={48} from={1} />
        <Sfx x={CX + 500} y={200} text="구독!" t={t} a={c("옥자:")} size={70} fill={C.red} color={C.yellow} r={200} dur={5} />
      </>)}</Shot>

      <Floor W={W} y={FLOOR_Y} H={H} />
      <Pair t={t} />
      <Bubble ctx={ctx} t={t} y={BUBBLE_Y} tails={{ 태진: 560, 옥자: 1360 }} W={W} />
      <PartTitle t={t} />
      <Chip W={W} text="티제이 김 컬렉션 · 삐라" />
      <Grain seed={7} />
      <Audio src={staticFile("narration_long.wav")} />
      {TL.art.includes("bgm") && <Audio src={staticFile("bgm_long.wav")} volume={(f) => 0.16 * Math.min(1, f / 15) * Math.min(1, (TL.duration * 30 - f) / 45)} loop />}
      {sfxCues().map(([s, f, v], i) => Number.isFinite(s) && s >= 0 && (
        <Sequence key={i} from={Math.round(s * fps)} durationInFrames={Math.round(2.5 * fps)}><Audio src={staticFile(`sfx/${f}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

// tj002 롱폼2 16:9 「선전물 100년 — 종이로 마음을 움직이는 법」 — 판화 → 포스터 → 삐라 → 포스터 → 휴대폰
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT_P, TLS, clamp01, mk, pop, ramp } from "./lib";
import {
  Balloon, Big, Bubble, Char, Chip, Counter, Ctx, Floor, Grain, Leaf, LeafRain, LeafWall, Magnifier, Note, Notebook, Pencil, Plane, Police,
  Ribbon, Scene, Sfx, Shell, Stage, Stamp, Trans, poseOf,
} from "./kit";

const W = 1920, H = 1080, CX = 960;
const TL = TLS.long2;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const FLOOR_Y = 1000, FEET = 1400, CH_H = 820, BUBBLE_Y = 840;
const TJ_X = 250, OK_X = 1670;
const RX = 1180;   // 캐릭터 사이 오른쪽 내용 중심

const FATHER1 = "APAC241013210_1.jpg", FATHER3 = "APAC241013210_3.jpg", SAFE_R = "APKC210526397C_1.jpg", SAFE_B = "APKC210526397D_1.jpg";
const MORNING = "APAC230216028_1.jpg", HEAD = "APAC230216029A_1.jpg", CHUSEOK = "APAC241013212_2.jpg", MAC_B = "APKC230619131_3.jpg", ANAL = "APAC190103002B_1.jpg";
const UKIYO = "APKC190903128_1.jpg", UKIYO_W = "APKC190903128_3.jpg", TRIP = "APAC170114003_4.jpg", TRIP_W = "APAC170114003_3.jpg", UNITED = "APAC240926190_1.jpg";
const JP45 = "APAC211070665B_1.jpg", JAYU = "APAC230216026_1.jpg", NK = "APAC180604114_1.jpg", CN = "APAC200125042_1.jpg", IUS = "APKC260411283_1.jpg";
const RAIN = [FATHER1, SAFE_R, MORNING, CHUSEOK, SAFE_B, HEAD, "APAC251106150B_1.jpg", "APAC251106147B_2.jpg", "APKC230619131_1.jpg", "APAC251106151A_1.jpg", "APAC190103002B_2.jpg", "APAC241013206_3.jpg",
  "APAC230216029B_1.jpg", "APAC251106150D_1.jpg", "APAC251106147B_1.jpg", "APAC230216031A_1.jpg", "APAC240608104_2.jpg", "APAC241028216A_1.jpg"];
const WALL = [UKIYO, TRIP, UNITED, NK, CN, IUS, JP45, JAYU, ...RAIN, "APAC230216026_3.jpg", "APAC251106150B_2.jpg", "APKC260215107_2.jpg", "APAC241013210_3.jpg", "APAC230216028_3.jpg", "APAC241013206_1.jpg", "APAC251106149B_1.jpg", "APAC251106149C_1.jpg", "APAC241028216A_3.jpg", "APAC230216025B_1.jpg", "APAC251106148D_1.jpg", "APAC251106149F_1.jpg"];

type Cue = (c: number | string) => number;
const Shot: React.FC<{ t: number; id: string; color: string; trans?: Trans; burst?: boolean; zoom?: [number, number]; children: (t: number, c: Cue) => React.ReactNode }> = ({ t, id, color, trans, burst, zoom, children }) => (
  <Scene ctx={ctx} id={id} t={t} trans={trans} zoom={zoom}>{() => (<>
    <Stage W={W} H={H} color={color} t={t} burst={burst} cy={H * 0.4} />
    {children(t, (c) => ctx.cue(id, c))}
  </>)}</Scene>
);

const REACT: Record<string, Partial<Record<string, ReturnType<typeof poseOf>>>> = {
  "X1-A1": { 옥자: "SURPRISE" }, "X1-A3": { 옥자: "BASE" }, "X2-B1": { 옥자: "SURPRISE" }, "X2-B4": { 옥자: "SURPRISE" }, "X3-C1": { 옥자: "SURPRISE" },
  "X4-D1": { 옥자: "SURPRISE" }, "X5-E1": { 옥자: "SURPRISE" }, "X5-E3": { 옥자: "BASE" }, "X6-F2": { 옥자: "LAUGH" }, "X6-F3": { 옥자: "POINT" },
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
  out.push([c("X0-I1", 0.05), "flutter", 0.5], [c("X0-I1", "태진:종이"), "pop", 0.5]);
  out.push([c("X1-A1", "태진:첫") + 0.5, "thud", 0.6], [c("X1-A1", "옥자:"), "boing", 0.5], [c("X1-A2", "태진:실제보다"), "stamp", 0.6], [c("X1-A3", "태진:조선"), "boom", 0.4]);
  out.push([c("X2-B1", "태진:천구백사십삼") + 0.5, "thud", 0.6], [c("X2-B1", "태진:이즈"), "ding", 0.45], [c("X2-B1", "옥자:명절"), "boing", 0.5], [c("X2-B3", "태진:유나이티드 위"), "boom", 0.5], [c("X2-B3", "옥자:"), "boing", 0.5]);
  out.push([c("X2-B4", "태진:천구백사십이"), "pop", 0.5], [c("X2-B4", "태진:국제기구"), "pop", 0.5], [c("X2-B4", "태진:오 년"), "pop", 0.5]);
  out.push([c("X3-C1", "태진:적의"), "plane", 0.5], [c("X3-C1", "태진:일미"), "stamp", 0.5], [c("X3-C2", "태진:같은") + 0.4, "thud", 0.6], [c("X3-C2", "옥자:"), "flutter", 0.5]);
  out.push([c("X4-D1", 0.1), "plane", 0.5], [c("X4-D1", "태진:이십오억"), "ding", 0.45], [c("X4-D1", "태진:분석표"), "stamp", 0.5]);
  out.push([c("X4-D2", "태진:판화는"), "pop", 0.5], [c("X4-D2", "태진:포스터는"), "pop", 0.5], [c("X4-D2", "태진:삐라는"), "pop", 0.5], [c("X4-D2", "옥자:"), "boing", 0.5]);
  out.push([c("X5-E1", "태진:이건") + 0.5, "thud", 0.6], [c("X5-E1", "태진:붓으로"), "stamp", 0.5], [c("X5-E2", "태진:맨 앞"), "pop", 0.5], [c("X5-E2", "옥자:엄마"), "boing", 0.5], [c("X5-E3", "태진:천구백오십"), "ding", 0.45]);
  out.push([c("X6-F1", "태진:지금은"), "whoosh", 0.5], [c("X6-F1", "옥자:"), "boing", 0.5], [c("X6-F2", "옥자:알림"), "ding", 0.5], [c("X6-F3", 0.1), "flutter", 0.5], [c("X6-F3", "태진:티제이"), "ding", 0.5]);
  return out;
};

/** 휴대폰 + 알림 카드 */
const Phone: React.FC<{ x: number; y: number; p: number; t: number; notes: [string, string, number][] }> = ({ x, y, p, t, notes }) => {
  const q = clamp01(p); if (q <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x - 170, top: y - 300, width: 340, height: 600, transform: `translateY(${(1 - q) * 300}px) rotate(${(1 - q) * 12}deg)`, opacity: Math.min(1, q * 2) }}>
      <div style={{ position: "absolute", inset: 0, background: C.ink, borderRadius: 46, border: `8px solid ${C.ink}`, boxShadow: `14px 16px 0 rgba(28,28,28,0.5)` }} />
      <div style={{ position: "absolute", left: 18, top: 50, right: 18, bottom: 40, background: C.sky, borderRadius: 24, overflow: "hidden", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {notes.map(([img, txt, at], i) => { const k = clamp01((t - at) * 3); return k > 0 ? (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: C.cream, border: `4px solid ${C.ink}`, borderRadius: 14, padding: 8, transform: `translateX(${(1 - k) * 340}px)` }}>
            <div style={{ width: 54, height: 54, flex: "0 0 54px", border: `3px solid ${C.ink}`, overflow: "hidden" }}><img src={`thumbs/${img}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
            <div style={{ fontFamily: "BlackHanSans", fontSize: 22, lineHeight: 1.15, color: C.ink }}>{txt}</div>
          </div>) : null; })}
      </div>
      <div style={{ position: "absolute", left: 130, top: 18, width: 80, height: 14, borderRadius: 7, background: "#333" }} />
    </div>
  );
};

export const Long2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* X0 훅 */}
      <Shot t={t} id="X0-I1" color={C.sky} trans="none">{(t, c) => (<>
        <LeafRain srcs={[UKIYO, TRIP, UNITED, JP45, JAYU, NK, CN, IUS, ...RAIN]} t={t} t0={c(0)} n={18} W={W} H={760} span={3} fallDur={3.4} seed={21} size={[90, 160]} o={0.85} />
        <Ribbon x={CX} y={170} text="티제이 김 컬렉션 · 100년 치 선전물" p={pop(t, c("태진:"))} bg={C.ink} color={C.yellow} size={46} />
        <Big x={CX} y={400} size={140} p={pop(t, c("태진:종이"), 30, 9)} color={C.cream} maxW={1400}>{"종이로 마음을\n움직이는 법"}</Big>
      </>)}</Shot>

      {/* X1 판화로 판 전쟁 */}
      <Shot t={t} id="X1-A1" color={C.cream}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="청일전쟁 · 일본 전쟁 판화(錦絵)" p={pop(t, c("태진:첫"))} bg={C.ink} color={C.yellow} size={46} />
        <Leaf src={UKIYO} x={CX} y={470} w={860} aspect={0.61} rot={-2} p={ramp(t, c("태진:첫"), 0.9)} kb={ramp(t, c("태진:세 장"), 5)} t={t} />
        <Ribbon x={CX} y={780} text="세 장을 이어 붙인 그림" p={pop(t, c("태진:세 장"))} bg={C.yellow} color={C.ink} size={44} from={1} />
        <Sfx x={CX + 520} y={240} text="화려!" t={t} a={c("옥자:")} size={70} fill={C.red} color={C.yellow} r={180} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="X1-A2" color={C.yellow}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="사진 대신 판화로 전쟁 소식" p={pop(t, c("태진:사진이"))} bg={C.ink} color={C.yellow} size={46} />
        <Leaf src={UKIYO_W} x={CX} y={450} w={900} aspect={0.51} rot={2} drop={false} p={1} kb={ramp(t, c(0), 8)} t={t} />
        <Stamp x={CX + 380} y={640} text="실제보다 멋있게" p={ramp(t, c("태진:실제보다"), 0.25)} w={420} h={120} rot={-8} />
        <Ribbon x={CX - 300} y={720} text="보도가 아니라 홍보" p={pop(t, c("옥자:보도"))} bg={C.red} color={C.cream} size={46} />
      </>)}</Shot>
      <Shot t={t} id="X1-A3" color={C.ink} burst={false}>{(t, c) => (<>
        <Leaf src={UKIYO} x={CX} y={420} w={820} aspect={0.61} rot={-1} drop={false} p={1} o={0.85} kb={0.6} t={t} />
        <Ribbon x={CX} y={740} text="판화 속 무대 = 조선" p={pop(t, c("태진:조선"))} bg={C.cream} color={C.red} size={56} />
      </>)}</Shot>

      {/* X2 포스터, 생활을 바꾸다 */}
      <Shot t={t} id="X2-B1" color={C.red}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="1943 미국" p={pop(t, c("태진:천구백사십삼"))} bg={C.cream} color={C.ink} size={52} />
        <Leaf src={TRIP} x={CX - 260} y={470} w={340} aspect={1.38} rot={-4} p={ramp(t, c(0.1), 0.9)} t={t} />
        <Big x={CX + 260} y={330} size={84} p={pop(t, c("태진:이즈"))} color={C.yellow} font="BagelFatOne" maxW={700}>{"Is Your Trip\nNecessary?"}</Big>
        <Ribbon x={CX + 260} y={580} text="쓸데없는 여행은 전쟁을 방해한다" p={pop(t, c("태진:쓸데없는"))} bg={C.cream} color={C.ink} size={38} from={1} />
        <Sfx x={CX + 260} y={720} text="귀성길!" t={t} a={c("옥자:명절")} size={64} fill={C.yellow} color={C.red} r={180} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="X2-B2" color={C.yellow}>{(t, c) => (<>
        <Leaf src={TRIP_W} x={CX} y={430} w={680} aspect={0.75} rot={2} drop={false} p={1} kb={ramp(t, c(0), 6)} t={t} />
        <Ribbon x={CX} y={760} text="전쟁이 생활 안으로" p={pop(t, c("태진:전쟁이"))} bg={C.ink} color={C.yellow} size={52} />
      </>)}</Shot>
      <Shot t={t} id="X2-B3" color={C.sky}>{(t, c) => (<>
        <Leaf src={UNITED} x={CX - 270} y={430} w={370} aspect={1.4} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:대포"), 4)} t={t} />
        <Big x={CX + 260} y={300} size={80} p={pop(t, c("태진:유나이티드 위"))} color={C.cream} font="BagelFatOne" maxW={700}>{"United\nWe Are Strong"}</Big>
        <Ribbon x={CX + 260} y={560} text="United Nations = 연합국" p={pop(t, c("태진:유나이티드 네이션스"))} bg={C.red} color={C.cream} size={46} from={1} />
        <Sfx x={CX + 260} y={720} text="유엔?!" t={t} a={c("옥자:")} size={70} fill={C.yellow} color={C.red} r={170} dur={3} />
      </>)}</Shot>
      <Shot t={t} id="X2-B4" color={C.mint}>{(t, c) => (<>
        <Ribbon x={CX - 200} y={230} text="1942 연합국 공동선언" p={pop(t, c("태진:천구백사십이"))} bg={C.cream} color={C.ink} size={50} />
        <Ribbon x={CX - 100} y={400} text="1945 국제연합" p={pop(t, c("태진:국제기구"))} bg={C.sky} color={C.ink} size={50} from={1} />
        <Ribbon x={CX} y={570} text="1950 한국의 유엔군" p={pop(t, c("태진:오 년"))} bg={C.red} color={C.cream} size={50} />
        <Leaf src={SAFE_R} x={CX + 430} y={480} w={300} aspect={0.79} rot={6} drop={false} from={[700, 0]} p={ramp(t, c("태진:오 년"), 0.5)} t={t} />
      </>)}</Shot>

      {/* X3 포스터가 날개를 달다 */}
      <Shot t={t} id="X3-C1" color={C.sky} trans="punch">{(t, c) => (<>
        <Plane x={-400 + (t - c(0)) * 360} y={330} s={0.8} rot={-4} />
        {t < c("태진:천구백사십오") && <Big x={CX} y={590} size={120} p={pop(t, c("태진:포스터는"))} color={C.cream}>벽 → 하늘</Big>}
        <LeafRain srcs={RAIN} t={t} t0={c("태진:하늘에서")} n={30} W={W} H={760} span={2} fallDur={2.6} seed={31} size={[70, 120]} o={0.8} />
        <Ribbon x={CX} y={160} text="적의 벽엔 못 붙인다 → 하늘에서 뿌린다" p={pop(t, c("태진:적의"))} bg={C.ink} color={C.yellow} size={44} />
        <Leaf src={JP45} x={CX - 230} y={480} w={320} aspect={1.5} rot={-4} p={ramp(t, c("태진:천구백사십오"), 0.9)} t={t} />
        <Big x={CX + 300} y={440} size={70} p={pop(t, c("태진:일미"))} color={C.cream} maxW={700}>{"“휴전 성립!\n전투를 중지하라!”"}</Big>
      </>)}</Shot>
      <Shot t={t} id="X3-C2" color={C.cream}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="1945. 8. 4 「조선자유보」" p={pop(t, c("태진:같은"))} bg={C.red} color={C.cream} size={50} />
        <Leaf src={JAYU} x={CX} y={480} w={390} aspect={1.3} rot={-3} p={ramp(t, c("태진:같은"), 0.9)} kb={ramp(t, c("태진:우리말"), 4)} t={t} />
        <Sfx x={CX + 420} y={600} text="날개를 달았다!" t={t} a={c("옥자:")} size={58} fill={C.yellow} color={C.red} r={230} />
      </>)}</Shot>

      {/* X4 똑똑해진 종이 */}
      <Shot t={t} id="X4-D1" color={C.red} trans="punch">{(t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0.3)} n={80} W={W} H={800} span={4} fallDur={2.4} seed={41} size={[70, 130]} />
        <Plane x={-400 + (t - c(0)) * 520} y={170} s={0.9} rot={-4} />
        <Counter x={CX - 220} y={380} t={t} a={c("태진:이십오억")} d={1.0} to={25} size={170} suffix="억" color={C.yellow} />
        <Counter x={CX + 200} y={520} t={t} a={c("태진:사십억")} d={0.8} from={25} to={40} size={120} prefix="~" suffix="억 장" color={C.cream} rot={3} />
        <Leaf src={ANAL} x={CX + 450} y={330} w={260} aspect={1.31} rot={8} drop={false} from={[700, 0]} p={ramp(t, c("태진:분석표"), 0.5)} t={t} />
        <Stamp x={CX + 450} y={560} text="분석표" p={ramp(t, c("태진:분석표") + 0.3, 0.25)} w={240} h={100} rot={-8} />
      </>)}</Shot>
      <Shot t={t} id="X4-D2" color={C.yellow}>{(t, c) => (<>
        <Leaf src={UKIYO_W} x={CX - 420} y={330} w={340} aspect={0.51} rot={-4} drop={false} p={pop(t, c("태진:판화는"))} t={t} />
        <Leaf src={TRIP} x={CX} y={300} w={180} aspect={1.38} rot={3} drop={false} p={pop(t, c("태진:포스터는"))} t={t + 1} />
        <Leaf src={ANAL} x={CX + 420} y={300} w={200} aspect={1.31} rot={-3} drop={false} p={pop(t, c("태진:삐라는"))} t={t + 2} />
        <Ribbon x={CX - 420} y={560} text="판화 = 멋있게" p={pop(t, c("태진:판화는"))} bg={C.cream} color={C.ink} size={44} />
        <Ribbon x={CX} y={560} text="포스터 = 짧게" p={pop(t, c("태진:포스터는"))} bg={C.sky} color={C.ink} size={44} />
        <Ribbon x={CX + 420} y={560} text="삐라 = 계산해서" p={pop(t, c("태진:삐라는"))} bg={C.red} color={C.cream} size={44} />
        <Sfx x={CX} y={720} text="종이가 공부를!" t={t} a={c("옥자:")} size={58} fill={C.mint} color={C.ink} r={240} />
      </>)}</Shot>

      {/* X5 다시 벽으로 */}
      <Shot t={t} id="X5-E1" color={C.cream}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="1960s 북한 포스터 — 손그림 원화" p={pop(t, c("태진:육십"))} bg={C.ink} color={C.yellow} size={44} />
        <Leaf src={NK} x={CX - 100} y={480} w={380} aspect={1.36} rot={-3} p={ramp(t, c(0.2), 0.9)} t={t} />
        <Stamp x={CX + 340} y={500} text="붓으로 그림" p={ramp(t, c("태진:붓으로"), 0.25)} w={340} h={110} rot={-8} />
      </>)}</Shot>
      <Shot t={t} id="X5-E2" color={C.mint}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="1970s 중국 체육 포스터" p={pop(t, c("태진:칠십"))} bg={C.ink} color={C.yellow} size={46} />
        <Leaf src={CN} x={CX} y={440} w={700} aspect={0.73} rot={2} p={ramp(t, c("태진:칠십"), 0.9)} kb={ramp(t, c("태진:맨 앞"), 4)} t={t} />
        <Ribbon x={CX - 150} y={745} text="행진 앞에서 책 읽는 청년" p={pop(t, c("태진:맨 앞"))} bg={C.cream} color={C.ink} size={42} />
        <Sfx x={CX + 420} y={680} text="엄마 잔소리!" t={t} a={c("옥자:엄마")} size={56} fill={C.yellow} color={C.red} r={210} />
      </>)}</Shot>
      <Shot t={t} id="X5-E3" color={C.sky}>{(t, c) => (<>
        <Ribbon x={CX} y={160} text="1963 국제학생연맹(IUS) 포스터" p={pop(t, c("태진:천구백육십삼"))} bg={C.ink} color={C.yellow} size={44} />
        <Leaf src={IUS} x={CX - 220} y={480} w={370} aspect={1.42} rot={-3} p={ramp(t, c("태진:천구백육십삼"), 0.9)} t={t} />
        <Big x={CX + 300} y={420} size={86} p={pop(t, c("태진:천구백오십"))} color={C.cream} font="BagelFatOne" maxW={700}>{"1950. 6. 25\n1963. 6. 25"}</Big>
        <Ribbon x={CX + 300} y={680} text="같은 6·25, 다른 그림" p={pop(t, c("옥자:"))} bg={C.red} color={C.cream} size={44} from={1} />
      </>)}</Shot>

      {/* X6 지금은 손바닥 위에 */}
      <Shot t={t} id="X6-F1" color={C.yellow}>{(t, c) => (<>
        {[UKIYO_W, TRIP, SAFE_R, NK].map((s, i) => (
          <Leaf key={s} src={s} x={560 + i * 220} y={360} w={170} aspect={i === 0 ? 0.6 : 1.35} rot={(i % 2 ? 4 : -4)} drop={false} from={[0, -500]} p={ramp(t, c(0.2 + i * 0.4), 0.5)} t={t + i} />
        ))}
        {[0, 1, 2].map((i) => <Big key={i} x={670 + i * 220} y={360} size={60} p={ramp(t, c(0.6 + i * 0.4), 0.3)} color={C.ink} rot={0}>→</Big>)}
        <Phone x={1440} y={430} p={ramp(t, c("태진:지금은"), 0.6)} t={t} notes={[]} />
        <Sfx x={1440} y={740} text="휴대폰?" t={t} a={c("옥자:")} size={60} fill={C.red} color={C.yellow} r={170} />
      </>)}</Shot>
      <Shot t={t} id="X6-F2" color={C.pink}>{(t, c) => (<>
        <Ribbon x={CX - 180} y={160} text="짧게 · 그림 한 장 · 받는 사람 계산" p={pop(t, c("태진:짧게"))} bg={C.ink} color={C.yellow} size={44} />
        <Big x={CX - 180} y={420} size={110} p={pop(t, c("태진:백 년"))} color={C.cream} maxW={900}>{"100년 전과\n같다"}</Big>
        <Phone x={1360} y={430} p={1} t={t} notes={[[SAFE_R, "들고 오면 안전 보장!", c("태진:짧게")], [TRIP, "그 여행 꼭 가야 해?", c("태진:그림")], [FATHER1, "아버지는 어데 게세요?", c("태진:누구한테")], [MORNING, "가족 생각해라", c("옥자:알림")]]} />
      </>)}</Shot>
      <Shot t={t} id="X6-F3" color={C.ink} burst={false} zoom={[1.05, 1]}>{(t, c) => (<>
        <LeafWall srcs={WALL} W={W} top={60} cols={10} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c("태진:티제이"), 0.5) * 0.45} />
        <Ribbon x={CX} y={300} text="TJ Kim Collection" p={pop(t, c("태진:티제이"))} bg={C.yellow} color={C.ink} size={68} />
        <Big x={CX} y={480} size={110} p={pop(t, c("태진:백 년"))} color={C.red} font="BagelFatOne">100년 치 선전물</Big>
        <Ribbon x={CX} y={660} text="다음 편에서 또 다른 종이로" p={pop(t, c("태진:다음엔"))} bg={C.cream} color={C.red} size={46} from={1} />
      </>)}</Shot>

      <Floor W={W} y={FLOOR_Y} H={H} />
      <Pair t={t} />
      <Bubble ctx={ctx} t={t} y={BUBBLE_Y} tails={{ 태진: 560, 옥자: 1360 }} W={W} />
      <PartTitle t={t} />
      <Chip W={W} text="티제이 김 컬렉션 · 선전물 100년" />
      <Grain seed={7} />
      <Audio src={staticFile("narration_long2.wav")} />
      {TL.art.includes("bgm") && <Audio src={staticFile("bgm_long2.wav")} volume={(f) => 0.16 * Math.min(1, f / 15) * Math.min(1, (TL.duration * 30 - f) / 45)} loop />}
      {sfxCues().map(([s, f, v], i) => Number.isFinite(s) && s >= 0 && (
        <Sequence key={i} from={Math.round(s * fps)} durationInFrames={Math.round(2.5 * fps)}><Audio src={staticFile(`sfx/${f}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

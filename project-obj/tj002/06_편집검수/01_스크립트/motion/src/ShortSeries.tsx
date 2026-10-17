// tj002 숏 시리즈 9:16 — M 공습예고·정전 · N 포로수용소 광고 · O 엄마의 편지 · P 중공군 만화책 · Q 분석표 · R 1945 종전 삐라 / D 안전보장증서 · E 향수 삐라 · F 맥아더 라디오 · G 영어 삐라 · H 풍선 70년 · I 어원·1945 · J 원화 · K 비둘기 · L 겨울
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, Ep, FONT_P, TLS, clamp01, mk, pop, ramp } from "./lib";
import {
  Balloon, Big, Bubble, Char, Chip, Counter, Ctx, Floor, Grain, Leaf, LeafRain, LeafWall, Magnifier, Note, Notebook, Plane,
  Ribbon, Scene, Sfx, Stage, Stamp, Trans, poseOf,
} from "./kit";

const W = 1080, H = 1920, CX = 540;
const FLOOR_Y = 1590, FEET = 2230, CH_H = 980, BUBBLE_Y = 1060;
const TJ_X = 250, OK_X = 830;

// 실물
const SAFE_R = "APKC210526397C_1.jpg", SAFE_B = "APKC210526397D_1.jpg", CPV = "APAC230216031A_1.jpg", POW = "APAC230216031A_3.jpg";
const FATHER1 = "APAC241013210_1.jpg", FATHER3 = "APAC241013210_3.jpg", CHUSEOK = "APAC241013212_2.jpg", MOON = "APAC251106151A_1.jpg", CAT = "APAC251106150D_1.jpg", CAT_B = "APAC251106150D_2.jpg";
const MAC = "APKC230619131_1.jpg", MAC_B = "APKC230619131_3.jpg", ANAL = "APAC190103002B_1.jpg", ANAL2 = "APAC240608104_3.jpg";
const MORNING = "APAC230216028_1.jpg", HEAD = "APAC230216029A_1.jpg", MOURN = "APAC230216029B_1.jpg", MOURN_B = "APAC230216029B_2.jpg";
const JAYU = "APAC230216026_1.jpg", JP = "APAC230216025B_1.jpg", ART = "APAC241028216A_1.jpg", PRINT = "APAC241028216A_3.jpg";
const DOVE = "APAC251106147B_1.jpg", DOVE_B = "APAC251106147B_2.jpg", DOVE2 = "APAC251106147F_1.jpg", DOVE3 = "APAC251106148D_1.jpg", MONSTER = "APAC251106147F_2.jpg";
const WMAP = "APAC251106149B_1.jpg", WCOLD = "APAC251106149C_1.jpg", WNURSE = "APAC251106149F_1.jpg";

// 시리즈2 실물
const RAID = "APKC210526397E_1.jpg", RAID_B = "APKC210526397E_2.jpg", CEASE = "APAC230216031C_1.jpg", CEASE_B = "APAC230216031C_2.jpg", Y54 = "APKC230301037E_2.jpg";
const PING = "APKC260527328_3.jpg", YALU = "APKC260527328_1.jpg", ORDER = "APKC260527328_2.jpg", POW1 = "APAC230216030B_1.jpg", POW2 = "APAC230216030B_2.jpg", HEAR = "APAC210916611_1.jpg";
const LETTER = "APAC230119009B_1.jpg", REMEMBER = "APAC230119009C_1.jpg", HOME = "APAC230119009C_2.jpg", ROKC = "APKC230619132B_1.jpg", ROKC2 = "APKC230619132A_4.jpg";
const ESCAPE = "APAC251106151C_1.jpg", HUT = "APAC251106149D_1.jpg", FIRE = "APAC251106150C_2.jpg", KID = "APAC251106148B_1.jpg", MAP = "APAC251106148F_1.jpg";
const ETIQ = "APAC190103002C_1.jpg", ETIQ_B = "APAC190103002C_2.jpg", ETIQ_S = "APAC190103002C_3.jpg", ONE = "APAC190103002F_1.jpg", CHINA = "APAC190103002D_2.jpg", FREE = "APAC190103002I_1.jpg";
const JP45 = "APAC211070665B_1.jpg", JP45_B = "APAC211070665B_2.jpg", AUS = "APAC200330076_1.jpg";
const RAIN = [FATHER1, SAFE_R, MORNING, CHUSEOK, SAFE_B, HEAD, "APAC251106150B_1.jpg", DOVE_B, MAC, MOON, "APAC190103002B_2.jpg", "APAC241013206_3.jpg", MOURN, CAT, DOVE, CPV, "APAC240608104_2.jpg", "APAC241028216A_1.jpg"];
const WALL = [...RAIN, "APAC230216026_3.jpg", "APAC251106150B_2.jpg", "APKC260215107_2.jpg", "APAC241013210_3.jpg", "APAC230216028_3.jpg", "APAC241013206_1.jpg"];

type Cue = (c: number | string) => number;
type ShotFn = (t: number, c: Cue) => React.ReactNode;
type ShotDef = { id: string; color: string; trans?: Trans; burst?: boolean; zoom?: [number, number]; body: ShotFn };
type ReactMap = Record<string, Partial<Record<string, ReturnType<typeof poseOf>>>>;

/** 공통 엔딩: 삐라 벽 + TJ Kim Collection + 100장+ */
const Ending = (t: number, c: Cue, line = "티제이") => (<>
  <LeafWall srcs={WALL} W={W} top={140} cols={6} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c(`태진:${line}`), 0.5) * 0.45} />
  <Ribbon x={CX} y={440} text="TJ Kim Collection" p={pop(t, c(`태진:${line}`))} bg={C.yellow} color={C.ink} size={68} />
  <Counter x={CX} y={640} t={t} a={c("태진:백") > c(0) ? c("태진:백") : c(`태진:${line}`) + 0.8} d={0.9} to={100} size={190} suffix="장+" color={C.red} />
</>);

const EPISODES: Record<Ep, { shots: ShotDef[]; react: ReactMap; sfx: (c: (id: string, x: number | string) => number) => [number, string, number][] }> = {
  // ───────── D 안전보장증서 = 비행기표?
  D: {
    react: { "D-S02": { 옥자: "SURPRISE" }, "D-S04": { 옥자: "LAUGH" }, "D-S06": { 옥자: "SURPRISE" }, "D-S08": { 옥자: "LAUGH" }, "D-S10": { 옥자: "POINT" } },
    shots: [
      { id: "D-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={SAFE_R} x={CX} y={560} w={620} aspect={0.79} rot={-5} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Sfx x={CX + 280} y={860} text="툭!" t={t} a={c(1.0)} size={86} fill={C.yellow} color={C.red} dur={1.3} />
        <Big x={CX} y={950} size={110} p={pop(t, c("옥자:비행기"))} color={C.yellow}>비행기표?</Big>
      </>) },
      { id: "D-S02", color: C.yellow, body: (t, c) => (<>
        <Ribbon x={CX} y={190} text="안전보장증서 · Safe Conduct Pass" p={pop(t, c("태진:안전"))} size={48} />
        <Leaf src={SAFE_R} x={CX} y={600} w={660} aspect={0.79} rot={-3} drop={false} from={[-900, 0]} p={ramp(t, c("태진:안전"), 0.5)} kb={ramp(t, c("태진:이거"), 4)} t={t} />
        <Stamp x={CX} y={840} text="안전 보장" p={ramp(t, c("태진:안전을") + 0.2, 0.25)} w={460} h={150} rot={-8} />
        <Ribbon x={CX} y={950} text="제일 많이 뿌린 종류" p={pop(t, c("태진:제일"))} bg={C.red} color={C.cream} size={54} from={1} />
      </>) },
      { id: "D-S03", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Leaf src={SAFE_R} x={CX - 230} y={560} w={470} aspect={0.79} rot={-8} p={ramp(t, c(0), 0.9)} t={t} />
        <Leaf src={SAFE_B} x={CX + 230} y={640} w={470} aspect={0.8} rot={7} p={ramp(t, c(0.4), 0.9)} t={t + 1} />
        <Big x={CX - 250} y={930} size={120} p={pop(t, c("옥자:빨간"))} color={C.red}>빨강</Big>
        <Big x={CX + 250} y={930} size={120} p={pop(t, c("옥자:파란"))} color={C.sky} rot={4}>파랑</Big>
      </>) },
      { id: "D-S04", color: C.sky, body: (t, c) => (<>
        <Leaf src={SAFE_R} x={CX - 230} y={520} w={450} aspect={0.79} rot={-6} drop={false} p={1} t={t} />
        <Leaf src={SAFE_B} x={CX + 230} y={600} w={450} aspect={0.8} rot={6} drop={false} p={1} t={t + 1} />
        <Ribbon x={CX - 230} y={790} text="빨강 = 한국어" p={pop(t, c("태진:빨간"))} bg={C.red} color={C.cream} size={50} />
        <Ribbon x={CX + 230} y={870} text="파랑 = 중국어" p={pop(t, c("태진:파란"))} bg={C.blue} color={C.cream} size={50} from={1} />
        <Ribbon x={CX} y={955} text="맥아더 명의 · 리지웨이 명의" p={pop(t, c("태진:맥아더"))} size={48} />
      </>) },
      { id: "D-S05", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Leaf src={SAFE_R} x={CX} y={520} w={560} aspect={0.79} rot={-4} drop={false} p={1} kb={0.5} t={t} />
        <Stamp x={CX + 160} y={700} text="사인" p={ramp(t, c("옥자:사인"), 0.25)} w={240} h={110} rot={-14} color={C.blue} />
        <Sfx x={CX} y={920} text="할인 쿠폰!" t={t} a={c("옥자:쿠폰")} size={110} fill={C.red} color={C.yellow} r={400} />
      </>) },
      { id: "D-S06", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={180} text="중공군 → 미군" p={pop(t, c("태진:중공군"))} bg={C.red} color={C.cream} size={64} />
        <Leaf src={CPV} x={CX} y={580} w={720} aspect={0.77} rot={3} p={ramp(t, c("태진:이건"), 0.9)} kb={ramp(t, c("태진:영어"), 4)} t={t} />
        <Big x={CX} y={930} size={60} p={pop(t, c("태진:계급"))} color={C.cream} rot={-2}>“계급 · 국적에 상관없이”</Big>
      </>) },
      { id: "D-S07", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Leaf src={SAFE_R} x={CX - 250} y={520} w={380} aspect={0.79} rot={-10} drop={false} p={1} t={t} />
        <Leaf src={CPV} x={CX + 250} y={560} w={420} aspect={0.77} rot={9} drop={false} p={1} t={t + 1} />
        <Sfx x={CX} y={900} text="서로 오라고?!" t={t} a={c("옥자:")} size={100} fill={C.yellow} color={C.red} r={430} />
      </>) },
      { id: "D-S08", color: C.cream, body: (t, c) => (<>
        <Leaf src={POW} x={CX} y={560} w={560} aspect={1.46} rot={-2} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:밥"), 4)} t={t} />
        <Ribbon x={CX} y={190} text="뒷면: 포로수용소 생활 사진" p={pop(t, c("태진:뒷면"))} size={48} />
        <Big x={CX} y={940} size={84} p={pop(t, c("태진:밥"))} color={C.yellow}>밥 · 치료</Big>
        <Stamp x={CX + 280} y={300} text="광고" p={ramp(t, c("태진:광고"), 0.25)} w={220} h={110} rot={12} />
      </>) },
      { id: "D-S09", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={520} text="치킨집 전단!" t={t} a={c("옥자:치킨")} size={110} fill={C.red} color={C.yellow} r={450} />
        <Ribbon x={CX} y={820} text="사진 있고" p={pop(t, c("옥자:사진"))} bg={C.cream} color={C.ink} size={60} />
        <Ribbon x={CX} y={930} text="쿠폰 있고" p={pop(t, c("옥자:쿠폰"))} bg={C.cream} color={C.ink} size={60} from={1} />
      </>) },
      { id: "D-S10", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="100년 뒤엔 치킨 전단도" p={pop(t, c("태진:백 년"))} bg={C.cream} color={C.red} size={54} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("D-S01", 0.05), "flutter", 0.5], [c("D-S01", 1.0), "thud", 0.7], [c("D-S02", "태진:안전을") + 0.2, "stamp", 0.6], [c("D-S03", 0.9), "thud", 0.5], [c("D-S03", 1.3), "thud", 0.5],
      [c("D-S05", "옥자:사인"), "stamp", 0.5], [c("D-S05", "옥자:쿠폰"), "boing", 0.6], [c("D-S06", 0.9), "thud", 0.6], [c("D-S07", "옥자:"), "boom", 0.6], [c("D-S08", 0.9), "thud", 0.6], [c("D-S08", "태진:광고"), "stamp", 0.5],
      [c("D-S09", "옥자:치킨"), "boing", 0.6], [c("D-S10", 0.1), "flutter", 0.5], [c("D-S10", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── E 아버지는 어데 게세요 — 향수 삐라
  E: {
    react: { "E-S02": { 옥자: "SURPRISE" }, "E-S04": { 옥자: "BASE" }, "E-S07": { 옥자: "LAUGH" }, "E-S09": { 옥자: "LAUGH" }, "E-S11": { 옥자: "POINT" } },
    shots: [
      { id: "E-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={FATHER3} x={CX} y={580} w={520} aspect={1.44} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={950} size={80} p={pop(t, c("옥자:아버지"))} color={C.yellow} font={FONT_P} stroke={5}>“아버지는 어데 게세요?”</Big>
      </>) },
      { id: "E-S02", color: C.cream, body: (t, c) => (<>
        <Leaf src={FATHER1} x={CX} y={560} w={500} aspect={1.5} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:아이들"), 4)} t={t} />
        <Ribbon x={CX} y={180} text="북한군 대상" p={pop(t, c("태진:북한군"))} bg={C.red} color={C.cream} size={60} />
        <Big x={CX} y={930} size={74} p={pop(t, c("태진:집"))} color={C.yellow}>{"겁주기 ✕\n집 생각 ○"}</Big>
      </>) },
      { id: "E-S03", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Leaf src={FATHER1} x={CX} y={520} w={420} aspect={1.5} rot={-3} drop={false} p={1} kb={0.6} t={t} />
        <Sfx x={CX} y={900} text="찡…" t={t} a={c("옥자:")} size={120} fill={C.sky} color={C.cream} r={330} />
      </>) },
      { id: "E-S04", color: C.ink, burst: false, body: (t, c) => (<>
        <div style={{ position: "absolute", left: CX - 170, top: 150, width: 340, height: 340, borderRadius: "50%", background: C.yellow, border: `8px solid ${C.ink}`, opacity: pop(t, c("태진:보름달")) }} />
        <Leaf src={CHUSEOK} x={CX} y={620} w={520} aspect={1.33} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:보름달"), 4)} t={t} />
        <Big x={CX} y={950} size={66} p={pop(t, c("태진:추석은"))} color={C.cream} font={FONT_P} stroke={5}>{"추석은 왔건마는\n고향은 멀고멀다"}</Big>
      </>) },
      { id: "E-S05", color: C.yellow, body: (t, c) => (<>
        <Leaf src={MOON} x={CX} y={560} w={460} aspect={1.6} rot={4} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:중추"), 4)} t={t} />
        <Ribbon x={CX} y={180} text="중국어판 · 중추절" p={pop(t, c("태진:중공군"))} size={54} />
        <Big x={CX} y={940} size={62} p={pop(t, c("태진:중추"))} color={C.cream} rot={-2}>{"달은 밝은데\n나는 이국 땅에"}</Big>
      </>) },
      { id: "E-S06", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Leaf src={CHUSEOK} x={CX - 220} y={560} w={360} aspect={1.33} rot={-8} drop={false} from={[-700, 0]} p={ramp(t, c(0), 0.5)} t={t} />
        <Leaf src={MOON} x={CX + 220} y={600} w={330} aspect={1.6} rot={7} drop={false} from={[700, 0]} p={ramp(t, c(0.2), 0.5)} t={t + 1} />
        <Big x={CX} y={950} size={120} p={pop(t, c("옥자:명절"))} color={C.red}>명절마다?</Big>
      </>) },
      { id: "E-S07", color: C.red, trans: "punch", body: (t, c) => (<>
        <Ribbon x={CX} y={190} text="미군 분석 보고서" p={pop(t, c("태진:미군"))} bg={C.cream} color={C.ink} size={56} />
        <Big x={CX} y={520} size={120} p={pop(t, c("태진:협박"))} color={C.yellow}>{"협박 < 향수"}</Big>
        <Stamp x={CX} y={860} text="명절 전 살포" p={ramp(t, c("태진:명절"), 0.25)} w={520} h={150} rot={-6} color={C.cream} />
      </>) },
      { id: "E-S08", color: C.mint, body: (t, c) => (<>
        <Leaf src={CAT} x={CX} y={560} w={780} aspect={0.69} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c(1), 4)} t={t} />
        <Sfx x={CX + 300} y={900} text="야옹!" t={t} a={c("옥자:고양이")} size={96} fill={C.yellow} color={C.red} dur={1.6} />
      </>) },
      { id: "E-S09", color: C.yellow, body: (t, c) => (<>
        <Leaf src={CAT} x={CX} y={500} w={700} aspect={0.69} rot={-2} drop={false} p={1} kb={0.5} t={t} />
        <Ribbon x={CX} y={190} text="“고양이 앞에 쥐 — 살 길은 고향뿐”" p={pop(t, c("태진:그대들"))} size={44} />
        <Leaf src={CAT_B} x={CX + 220} y={800} w={440} aspect={0.69} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:뒤"), 0.5)} t={t + 2} />
        <Stamp x={CX - 240} y={840} text="귀향증" p={ramp(t, c("태진:귀향증") + 0.2, 0.25)} w={300} h={130} rot={-12} />
      </>) },
      { id: "E-S10", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Leaf src={FATHER1} x={CX - 300} y={520} w={300} aspect={1.5} rot={-10} p={ramp(t, c(0), 0.8)} t={t} />
        <Leaf src={CHUSEOK} x={CX} y={600} w={300} aspect={1.33} rot={2} p={ramp(t, c(0.3), 0.8)} t={t + 1} />
        <Leaf src={CAT} x={CX + 300} y={540} w={330} aspect={0.69} rot={9} p={ramp(t, c(0.6), 0.8)} t={t + 2} />
        <Big x={CX} y={950} size={88} p={pop(t, c("옥자:집에"))} color={C.red}>{"“집에 가라”\n여러 가지로"}</Big>
      </>) },
      { id: "E-S11", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="종이 한 장으로 마음을" p={pop(t, c("태진:종이"))} bg={C.cream} color={C.red} size={54} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("E-S01", 0.05), "flutter", 0.5], [c("E-S01", 1.0), "thud", 0.7], [c("E-S02", 0.9), "thud", 0.6], [c("E-S03", "옥자:"), "boing", 0.5], [c("E-S04", 0.9), "thud", 0.6], [c("E-S04", "태진:보름달"), "pop", 0.5],
      [c("E-S05", 0.9), "thud", 0.6], [c("E-S06", 0.5), "whoosh", 0.5], [c("E-S07", "태진:협박"), "boom", 0.6], [c("E-S07", "태진:명절"), "stamp", 0.6], [c("E-S08", 0.9), "thud", 0.6], [c("E-S08", "옥자:고양이"), "boing", 0.6],
      [c("E-S09", "태진:뒤"), "whoosh", 0.5], [c("E-S09", "태진:귀향증") + 0.2, "stamp", 0.6], [c("E-S10", 0.8), "thud", 0.5], [c("E-S10", 1.1), "thud", 0.5], [c("E-S10", 1.4), "thud", 0.5], [c("E-S11", 0.1), "flutter", 0.5], [c("E-S11", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── F 맥아더 라디오 + 성적표
  F: {
    react: { "F-S02": { 옥자: "SURPRISE" }, "F-S04": { 옥자: "LAUGH" }, "F-S06": { 옥자: "SURPRISE" }, "F-S08": { 옥자: "LAUGH" }, "F-S10": { 옥자: "POINT" } },
    shots: [
      { id: "F-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={MAC} x={CX} y={580} w={520} aspect={1.48} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={1020} size={130} p={pop(t, c("옥자:누구"))} color={C.yellow}>누구?</Big>
      </>) },
      { id: "F-S02", color: C.yellow, body: (t, c) => (<>
        <Leaf src={MAC} x={CX} y={540} w={480} aspect={1.48} rot={2} drop={false} p={1} kb={0.4} t={t} />
        <Ribbon x={CX} y={190} text="맥아더 · 1950" p={pop(t, c("태진:맥아더"))} size={64} />
        <Big x={CX} y={950} size={110} p={pop(t, c("태진:뒷면"))} color={C.red} rot={3}>뒷면엔?</Big>
      </>) },
      { id: "F-S03", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="항복해라?" t={t} a={c("옥자:")} size={120} fill={C.ink} color={C.yellow} r={430} />
      </>) },
      { id: "F-S04", color: C.cream, body: (t, c) => (<>
        <Leaf src={MAC_B} x={CX - 60} y={560} w={480} aspect={1.56} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:매일"), 4)} t={t} />
        <svg style={{ position: "absolute", left: CX + 150, top: 300, overflow: "visible" }} width={10} height={10}>
          {[1, 2, 3].map((i) => <path key={i} d={`M 0 ${-60 * i} A ${60 * i} ${60 * i} 0 0 1 0 ${60 * i}`} fill="none" stroke={C.red} strokeWidth={14} opacity={clamp01((t - c("태진:매일") - i * 0.25) * 3) * (0.5 + 0.5 * Math.sin(t * 8 + i))} />)}
        </svg>
        <Ribbon x={CX} y={190} text="매일 밤 9시" p={pop(t, c("태진:매일"))} bg={C.red} color={C.cream} size={64} />
        <Big x={CX + 200} y={880} size={120} p={pop(t, c("태진:구백오십"))} color={C.yellow} font="BagelFatOne" rot={6}>950kc</Big>
        <Ribbon x={CX} y={965} text="라디오 광고 삐라" p={pop(t, c("태진:라디오"))} size={56} from={1} />
      </>) },
      { id: "F-S05", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={520} text="채널 홍보!" t={t} a={c("옥자:삐라로")} size={110} fill={C.red} color={C.yellow} r={420} />
        <Big x={CX} y={930} size={100} p={pop(t, c("옥자:구독"))} color={C.cream} rot={-4}>구독 · 좋아요</Big>
      </>) },
      { id: "F-S06", color: C.sky, body: (t, c) => (<>
        <Leaf src={ANAL} x={CX - 140} y={600} w={520} aspect={1.31} rot={-3} p={ramp(t, c("태진:그리고"), 0.9)} kb={ramp(t, c("태진:삐라 번호"), 5)} t={t} />
        <Ribbon x={CX} y={190} text="미군 분석표" p={pop(t, c("태진:미군"))} size={64} />
        {["번호", "언어", "대상", "번역", "비고"].map((w, i) => <Ribbon key={w} x={CX + 300} y={430 + i * 120} text={w} p={pop(t, c(`태진:${w}`))} bg={[C.red, C.yellow, C.mint, C.pink, C.cream][i]} color={C.ink} size={54} from={1} rot={i % 2 ? 3 : -3} />)}
      </>) },
      { id: "F-S07", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Leaf src={ANAL} x={CX} y={520} w={440} aspect={1.31} rot={-2} drop={false} p={1} kb={0.5} t={t} />
        <Sfx x={CX} y={920} text="성적표!" t={t} a={c("옥자:")} size={120} fill={C.red} color={C.yellow} r={360} />
      </>) },
      { id: "F-S08", color: C.cream, body: (t, c) => (<>
        <Leaf src={ANAL2} x={CX} y={540} w={500} aspect={1.29} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:어떤"), 4)} t={t} />
        <Big x={CX} y={880} size={72} p={pop(t, c("태진:어떤"))} color={C.yellow}>어떤 삐라가 먹히나</Big>
        <Ribbon x={CX} y={985} text="= 유튜브 조회수 분석" p={pop(t, c("태진:유튜브"))} bg={C.red} color={C.cream} size={52} from={1} />
      </>) },
      { id: "F-S09", color: C.red, trans: "punch", body: (t, c) => (<>
        <Counter x={CX} y={520} t={t} a={c("옥자:칠십")} d={0.8} to={70} size={220} suffix="년 전" color={C.yellow} />
        <Big x={CX} y={900} size={96} p={pop(t, c("옥자:데이터"))} color={C.cream}>데이터 분석</Big>
      </>) },
      { id: "F-S10", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c, "그 성적표")}
        <Ribbon x={CX} y={900} text="성적표까지 함께" p={pop(t, c("태진:같이"))} bg={C.cream} color={C.red} size={54} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("F-S01", 0.05), "flutter", 0.5], [c("F-S01", 1.0), "thud", 0.7], [c("F-S02", "태진:뒷면"), "pop", 0.5], [c("F-S03", "옥자:"), "boing", 0.5], [c("F-S04", 0.9), "thud", 0.6], [c("F-S04", "태진:매일"), "ding", 0.45],
      [c("F-S05", "옥자:삐라로"), "boing", 0.6], [c("F-S06", "태진:그리고") + 0.9, "thud", 0.6], ...["번호", "언어", "대상", "번역", "비고"].map((w): [number, string, number] => [c("F-S06", `태진:${w}`), "pop", 0.45]),
      [c("F-S07", "옥자:"), "boom", 0.6], [c("F-S08", 0.9), "thud", 0.6], [c("F-S09", "옥자:칠십"), "ding", 0.5], [c("F-S10", 0.1), "flutter", 0.5], [c("F-S10", "태진:그 성적표"), "ding", 0.5]],
  },

  // ───────── G 북한이 미군에게 보낸 영어 삐라
  G: {
    react: { "G-S02": { 옥자: "SURPRISE" }, "G-S04": { 옥자: "BASE" }, "G-S05": { 옥자: "SURPRISE" }, "G-S07": { 옥자: "BASE" }, "G-S09": { 옥자: "SURPRISE" }, "G-S11": { 옥자: "POINT" } },
    shots: [
      { id: "G-S01", color: C.pink, trans: "none", body: (t, c) => (<>
        <Leaf src={MORNING} x={CX} y={600} w={540} aspect={1.5} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c(1), 4)} t={t} />
        <Magnifier src={MORNING} x={CX + 210} y={350} r={190} fx={0.42} fy={0.17} mag={0.62} iw={1500} ih={2250} p={ramp(t, c("옥자:오"), 0.45)} />
        {[0, 1, 2, 3].map((i) => { const k = t - c("옥자:오") - i * 0.25; return k > 0 ? <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - clamp01((k - 1.6) / 0.5), transform: `translate(${120 + i * 70 + Math.sin(k * 3 + i) * 30}px, ${700 - k * 260}px)` }}><Note x={0} y={0} s={1 + (i % 2) * 0.3} /></div> : null; })}
        <Big x={CX} y={960} size={96} p={pop(t, c("옥자:노래"))} color={C.yellow}>노래 제목?</Big>
      </>) },
      { id: "G-S02", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={180} text="북한 → 미군" p={pop(t, c("태진:북한"))} bg={C.red} color={C.cream} size={64} />
        <Leaf src={MORNING} x={CX} y={560} w={460} aspect={1.5} rot={-3} drop={false} p={1} kb={0.5} t={t} />
        <Big x={CX} y={880} size={62} p={pop(t, c("태진:아침"))} color={C.cream} rot={-2}>{"“11시에 휘파람 불던\n그 노래, 기억나지?”"}</Big>
        <Ribbon x={CX} y={990} text="가족을 생각해라" p={pop(t, c("태진:가족"))} bg={C.yellow} color={C.ink} size={56} from={1} />
      </>) },
      { id: "G-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="북한이?!" t={t} a={c("옥자:")} size={130} fill={C.red} color={C.yellow} r={400} />
      </>) },
      { id: "G-S04", color: C.sky, body: (t, c) => (<>
        <Leaf src={MORNING} x={CX - 230} y={520} w={340} aspect={1.5} rot={-8} drop={false} from={[-700, 0]} p={ramp(t, c(0), 0.5)} t={t} />
        <Leaf src={HEAD} x={CX + 230} y={560} w={360} aspect={1.38} rot={7} drop={false} from={[700, 0]} p={ramp(t, c(0.2), 0.5)} t={t + 1} />
        <Ribbon x={CX} y={190} text="북한 · 중공군 → 미군 · 영국군" p={pop(t, c("태진:북한"))} size={46} />
        <Big x={CX} y={940} size={80} p={pop(t, c("태진:겁주는"))} color={C.yellow}>{"겁주기 ½\n집 생각 ½"}</Big>
      </>) },
      { id: "G-S05", color: C.red, trans: "punch", body: (t, c) => (<>
        <Leaf src={HEAD} x={CX} y={560} w={560} aspect={1.38} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:유즈"), 4)} t={t} />
        <Big x={CX} y={900} size={84} p={pop(t, c("태진:유즈"))} color={C.yellow} font="BagelFatOne" rot={-2}>{"Use your head,\nsoldier!"}</Big>
        <Ribbon x={CX} y={1000} text="머리를 붙여 두고 싶으면" p={pop(t, c("태진:머리를 붙"))} bg={C.cream} color={C.ink} size={50} from={1} />
      </>) },
      { id: "G-S06", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="무서운 농담" t={t} a={c("옥자:무서운")} size={110} fill={C.ink} color={C.yellow} r={440} />
      </>) },
      { id: "G-S07", color: C.cream, body: (t, c) => (<>
        <Leaf src={MOURN} x={CX} y={480} w={640} aspect={0.72} rot={2} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:이건"), 4)} t={t} />
        <Ribbon x={CX} y={160} text="“Don't let your loved ones mourn”" p={pop(t, c("태진:이건"))} size={42} />
        <Leaf src={MOURN_B} x={CX + 250} y={760} w={300} aspect={1.38} rot={7} drop={false} from={[800, 0]} p={ramp(t, c("태진:뒷면"), 0.5)} t={t + 2} />
        <Big x={CX - 230} y={880} size={96} p={pop(t, c("태진:오천"))} color={C.red} font="BagelFatOne" rot={-6}>{"5,000\n마일"}</Big>
      </>) },
      { id: "G-S08", color: C.sky, trans: "slide", body: (t, c) => (<>
        <Leaf src={MOURN_B} x={CX} y={540} w={480} aspect={1.38} rot={-3} drop={false} p={1} kb={0.5} t={t} />
        <Big x={CX} y={950} size={84} p={pop(t, c("옥자:미군도"))} color={C.cream}>미군도 집에…</Big>
      </>) },
      { id: "G-S09", color: C.yellow, body: (t, c) => (<>
        <Leaf src={MORNING} x={CX - 220} y={520} w={300} aspect={1.5} rot={-8} drop={false} p={1} t={t} />
        <Leaf src={HEAD} x={CX + 220} y={560} w={320} aspect={1.38} rot={7} drop={false} p={1} t={t + 1} />
        <Ribbon x={CX} y={190} text="100장 중 1장도 안 남아" p={pop(t, c("태진:백 장"))} bg={C.red} color={C.cream} size={52} />
        <Counter x={CX} y={930} t={t} a={c("태진:오백")} d={0.9} to={500} size={190} prefix="$" suffix="+" color={C.red} />
      </>) },
      { id: "G-S10", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="여기에?!" t={t} a={c("옥자:")} size={130} fill={C.yellow} color={C.red} r={400} />
      </>) },
      { id: "G-S11", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>{Ending(t, c)}</>) },
    ],
    sfx: (c) => [[c("G-S01", 0.05), "flutter", 0.5], [c("G-S01", 0.9), "thud", 0.7], [c("G-S01", "옥자:오"), "ding", 0.45], [c("G-S02", "태진:가족"), "pop", 0.5], [c("G-S03", "옥자:"), "boing", 0.6], [c("G-S04", 0.5), "whoosh", 0.5],
      [c("G-S05", 0.9), "thud", 0.6], [c("G-S05", "태진:유즈"), "boom", 0.5], [c("G-S06", "옥자:무서운"), "boing", 0.6], [c("G-S07", 0.9), "thud", 0.6], [c("G-S07", "태진:뒷면"), "whoosh", 0.5], [c("G-S07", "태진:오천"), "pop", 0.5],
      [c("G-S09", "태진:오백"), "ding", 0.5], [c("G-S10", "옥자:"), "boing", 0.6], [c("G-S11", 0.1), "flutter", 0.5], [c("G-S11", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── H 풍선 70년
  H: {
    react: { "H-S02": { 옥자: "SURPRISE" }, "H-S04": { 옥자: "BASE" }, "H-S05": { 옥자: "SURPRISE" }, "H-S07": { 옥자: "BASE" }, "H-S09": { 옥자: "SURPRISE" }, "H-S11": { 옥자: "POINT" } },
    shots: [
      { id: "H-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Balloon x={CX} y={520 - (t - c(0)) * 40} s={1.3} t={t} />
        <Big x={CX} y={960} size={100} p={pop(t, c("옥자:풍선"))} color={C.yellow}>풍선 삐라</Big>
      </>) },
      { id: "H-S02", color: C.cream, body: (t, c) => {
        const k = t - c(0); const px = -400 + k * 560;
        return (<>
          {t < c("태진:휴전") + 0.5 && <Plane x={px} y={260} s={0.9} rot={-4} />}
          <LeafRain srcs={RAIN} t={t} t0={c(0.3)} n={14} W={W} H={900} span={1.5} fallDur={2.4} seed={61} size={[70, 120]} stopAt={c("태진:휴전")} o={0.9} />
          {t >= c("태진:휴전") && <Balloon x={300} y={780 - (t - c("태진:휴전")) * 90} s={1.0} t={t} />}
          <Ribbon x={CX} y={190} text="전쟁: 비행기 → 휴전: 풍선" p={pop(t, c("태진:휴전"))} size={50} />
          <Ribbon x={CX + 120} y={620} text="1955 백령도" p={pop(t, c("태진:천구백오십오"))} bg={C.red} color={C.cream} size={60} from={1} />
          <Counter x={CX + 120} y={880} t={t} a={c("태진:사천")} d={1.0} to={4000} size={150} suffix="개" color={C.yellow} />
        </>);
      } },
      { id: "H-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        {[0, 1, 2, 3, 4, 5].map((i) => <Balloon key={i} x={140 + i * 160} y={520 + (i % 2) * 120 - (t - c(0)) * 60} s={0.5} t={t + i} color={[C.red, C.sky, C.mint, C.pink, C.red, C.sky][i]} />)}
        <Sfx x={CX} y={930} text="4,000개?!" t={t} a={c("옥자:")} size={120} fill={C.red} color={C.yellow} r={420} />
      </>) },
      { id: "H-S04", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={300} text="10차례로 나눠서" p={pop(t, c("태진:열"))} size={64} />
        <svg style={{ position: "absolute", left: 0, top: 560 }} width={W} height={400}>
          {[0, 1, 2].map((i) => <path key={i} d={`M -100 ${80 + i * 90} Q 170 ${20 + i * 90} 440 ${80 + i * 90} T 980 ${80 + i * 90} T 1500 ${80 + i * 90}`} fill="none" stroke={C.sky} strokeWidth={26} strokeLinecap="round" opacity={pop(t, c("태진:천구백육십팔") + i * 0.15)} transform={`translate(${((t * 120) % 540) - 540},0)`} />)}
        </svg>
        <Big x={CX} y={950} size={84} p={pop(t, c("태진:천구백육십팔"))} color={C.cream} rot={-3}>{"1968\n강에 띄우기"}</Big>
      </>) },
      { id: "H-S05", color: C.pink, body: (t, c) => (<>
        <Ribbon x={CX} y={200} text="1980년대 남쪽 꾸러미" p={pop(t, c("태진:팔십"))} size={56} />
        {["여배우 사진", "잡지", "워크맨"].map((w, i) => <Ribbon key={w} x={CX} y={450 + i * 190} text={w} p={pop(t, c(`태진:${w.slice(0, 2)}`))} bg={[C.yellow, C.mint, C.sky][i]} color={C.ink} size={78} from={i % 2 ? 1 : -1} rot={i % 2 ? 3 : -3} />)}
      </>) },
      { id: "H-S06", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="워크맨?!" t={t} a={c("옥자:")} size={130} fill={C.red} color={C.yellow} r={400} />
        <Big x={CX} y={960} size={72} p={pop(t, c("옥자:나도"))} color={C.cream}>나도 없었는데</Big>
      </>) },
      { id: "H-S07", color: C.sky, body: (t, c) => (<>
        <Stamp x={CX} y={480} text="2000 정부 중단" p={ramp(t, c("태진:이천 년"), 0.25)} w={720} h={170} rot={-6} />
        <Stamp x={CX} y={820} text="2004 장비 철거" p={ramp(t, c("태진:이천사"), 0.25)} w={720} h={170} rot={5} color={C.blue} />
      </>) },
      { id: "H-S08", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Big x={CX} y={620} size={220} p={pop(t, c("옥자:"))} color={C.red} font="BagelFatOne">끝?</Big>
      </>) },
      { id: "H-S09", color: C.red, trans: "punch", body: (t, c) => (<>
        <Balloon x={260} y={1000 - (t - c(0)) * 150} s={0.95} t={t} trash />
        <Ribbon x={CX + 120} y={240} text="민간 풍선 →" p={pop(t, c("태진:민간"))} bg={C.cream} color={C.ink} size={56} />
        <Ribbon x={CX + 120} y={480} text="2024. 5. 28" p={pop(t, c("태진:이천이십사"))} bg={C.ink} color={C.yellow} size={64} from={1} />
        <Counter x={CX + 120} y={800} t={t} a={c("태진:육백")} d={1.0} to={600} size={190} suffix="개" color={C.yellow} />
      </>) },
      { id: "H-S10", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Notebook x={CX - 200} y={600} s={1.2} p={1} rot={-4} cross={ramp(t, c("옥자:공책"), 0.5)} />
        <Balloon x={CX + 260} y={420} s={0.8} t={t} trash />
        <Sfx x={CX} y={950} text="쓰레기?!" t={t} a={c("옥자:쓰레기")} size={110} fill={C.red} color={C.yellow} r={400} />
      </>) },
      { id: "H-S11", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Counter x={CX} y={900} t={t} a={c("태진:칠십")} d={0.8} to={70} size={120} suffix="년" color={C.cream} />
      </>) },
    ],
    sfx: (c) => [[c("H-S01", 0.1), "rise", 0.5], [c("H-S02", 0.1), "plane", 0.5], [c("H-S02", "태진:휴전"), "rise", 0.45], [c("H-S02", "태진:사천"), "ding", 0.5], [c("H-S03", "옥자:"), "boing", 0.6], [c("H-S04", "태진:천구백육십팔"), "whoosh", 0.5],
      ...["여배우", "잡지", "워크맨"].map((w): [number, string, number] => [c("H-S05", `태진:${w}`), "pop", 0.5]), [c("H-S06", "옥자:"), "boing", 0.6], [c("H-S07", "태진:이천 년"), "stamp", 0.6], [c("H-S07", "태진:이천사"), "stamp", 0.6],
      [c("H-S08", "옥자:"), "pop", 0.5], [c("H-S09", 0.1), "rise", 0.45], [c("H-S09", "태진:육백"), "boom", 0.6], [c("H-S10", "옥자:공책"), "stamp", 0.6], [c("H-S10", "옥자:쓰레기"), "boing", 0.6], [c("H-S11", 0.1), "flutter", 0.5], [c("H-S11", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── I 삐라는 어디서 온 말? + 1945
  I: {
    react: { "I-S02": { 옥자: "SURPRISE" }, "I-S04": { 옥자: "SURPRISE" }, "I-S06": { 옥자: "BASE" }, "I-S07": { 옥자: "LAUGH" }, "I-S09": { 옥자: "POINT" } },
    shots: [
      { id: "I-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <LeafRain srcs={RAIN} t={t} t0={c(0)} n={10} W={W} H={1100} span={1.2} fallDur={3.2} seed={71} size={[90, 150]} o={0.85} />
        <Big x={CX} y={560} size={230} p={pop(t, c("옥자:삐라"))} color={C.yellow} font="BagelFatOne">삐라?</Big>
        <Big x={CX} y={950} size={72} p={pop(t, c("옥자:우리말"))} color={C.cream}>우리말 아니지?</Big>
      </>) },
      { id: "I-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={300} text="bill (영어)" p={pop(t, c("태진:영어"))} bg={C.sky} color={C.ink} size={70} font="BagelFatOne" />
        <Big x={CX} y={430} size={80} p={pop(t, c("태진:일본"))} color={C.ink} rot={0}>↓</Big>
        <Ribbon x={CX} y={560} text="ビラ (일본)" p={pop(t, c("태진:일본"))} bg={C.pink} color={C.ink} size={70} from={1} />
        <Big x={CX} y={690} size={80} p={pop(t, c("태진:삐라가"))} color={C.ink} rot={0}>↓</Big>
        <Ribbon x={CX} y={810} text="삐라" p={pop(t, c("태진:삐라가"))} bg={C.red} color={C.cream} size={90} />
        <Stamp x={CX + 260} y={960} text="표준어: 전단" p={ramp(t, c("태진:표준어"), 0.25)} w={420} h={120} rot={-8} color={C.blue} />
      </>) },
      { id: "I-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="전쟁 전에도?" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={460} />
      </>) },
      { id: "I-S04", color: C.mint, body: (t, c) => {
        const px = -400 + (t - c("태진:미군")) * 560;
        return (<>
          {t >= c("태진:미군") && <Plane x={px} y={220} s={0.9} rot={-4} />}
          <Leaf src={JAYU} x={CX} y={620} w={560} aspect={1.3} rot={-3} p={ramp(t, c("태진:이게"), 0.9)} kb={ramp(t, c("태진:한글"), 4)} t={t} />
          <Ribbon x={CX} y={190} text="조선자유보 · 1945. 8. 4" p={pop(t, c("태진:조선자유보"))} size={54} />
          <Ribbon x={CX} y={970} text="미군이 비행기에서 뿌린 한글 신문" p={pop(t, c("태진:미군"))} bg={C.cream} color={C.ink} size={46} from={1} />
        </>);
      } },
      { id: "I-S05", color: C.red, trans: "punch", body: (t, c) => (<>
        <Counter x={CX} y={520} t={t} a={c("옥자:해방")} d={0.7} from={30} to={11} size={240} suffix="일 전" color={C.yellow} fmt={(n) => String(Math.round(n))} />
        <Big x={CX} y={900} size={110} p={pop(t, c("옥자:해방"))} color={C.cream}>해방!</Big>
      </>) },
      { id: "I-S06", color: C.cream, body: (t, c) => (<>
        <Leaf src={JAYU} x={CX - 60} y={600} w={540} aspect={1.3} rot={2} drop={false} p={1} kb={0.4} t={t} />
        <Magnifier src={JAYU} x={CX + 250} y={760} r={190} fx={0.3} fy={0.8} mag={0.7} iw={1500} ih={1947} p={ramp(t, c("태진:폭격"), 0.45)} />
        <Ribbon x={CX} y={190} text="폭격 사진 2장 · 지도 · 태극기" p={pop(t, c("태진:폭격"))} size={46} />
        <Big x={CX} y={990} size={90} p={pop(t, c("태진:곧"))} color={C.red} rot={-3}>“곧 끝난다”</Big>
      </>) },
      { id: "I-S07", color: C.sky, body: (t, c) => (<>
        <Leaf src={JP} x={CX} y={560} w={680} aspect={0.855} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:이걸"), 4)} t={t} />
        <Ribbon x={CX} y={190} text="1945 일본군 항복 삐라" p={pop(t, c("태진:같은"))} size={56} />
        <Big x={CX} y={950} size={64} p={pop(t, c("태진:이걸"))} color={C.yellow}>{"“들고 나오면\n해치지 않는다”"}</Big>
      </>) },
      { id: "I-S08", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="전쟁보다 먼저!" t={t} a={c("옥자:")} size={100} fill={C.red} color={C.yellow} r={480} />
      </>) },
      { id: "I-S09", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="5년 뒤 → 수십억 장" p={pop(t, c("태진:오 년"))} bg={C.cream} color={C.red} size={56} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("I-S01", 0.05), "flutter", 0.5], [c("I-S01", "옥자:삐라"), "boing", 0.5], [c("I-S02", "태진:영어"), "pop", 0.5], [c("I-S02", "태진:일본"), "pop", 0.5], [c("I-S02", "태진:삐라가"), "pop", 0.5], [c("I-S02", "태진:표준어"), "stamp", 0.6],
      [c("I-S03", "옥자:"), "boing", 0.6], [c("I-S04", "태진:이게") + 0.9, "thud", 0.6], [c("I-S04", "태진:미군"), "plane", 0.5], [c("I-S05", "옥자:해방"), "boom", 0.6], [c("I-S06", "태진:폭격"), "ding", 0.45], [c("I-S07", 0.9), "thud", 0.6],
      [c("I-S08", "옥자:"), "boing", 0.6], [c("I-S09", 0.1), "flutter", 0.5], [c("I-S09", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── J 삐라 원화
  J: {
    react: { "J-S02": { 옥자: "SURPRISE" }, "J-S04": { 옥자: "SURPRISE" }, "J-S06": { 옥자: "BASE" }, "J-S08": { 옥자: "POINT" } },
    shots: [
      { id: "J-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={ART} x={CX} y={520} w={860} aspect={0.67} rot={-2} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={950} size={84} p={pop(t, c("옥자:손으로"))} color={C.yellow}>손으로 그렸다?</Big>
      </>) },
      { id: "J-S02", color: C.cream, body: (t, c) => (<>
        <Leaf src={ART} x={CX - 200} y={560} w={520} aspect={0.67} rot={-6} drop={false} from={[-800, 0]} p={ramp(t, c("태진:삐라"), 0.5)} t={t} />
        <Leaf src={PRINT} x={CX + 230} y={740} w={480} aspect={0.7} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:옆에"), 0.5)} t={t + 1} />
        <Ribbon x={CX} y={190} text="삐라 원화 · 1952" p={pop(t, c("태진:삐라"))} size={60} />
        <Ribbon x={CX - 200} y={880} text="펜화 원본" p={pop(t, c("태진:펜"))} bg={C.red} color={C.cream} size={52} />
        <Ribbon x={CX + 230} y={980} text="인쇄본" p={pop(t, c("태진:옆에"))} bg={C.sky} color={C.ink} size={52} from={1} />
      </>) },
      { id: "J-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="뭘 그렸어?" t={t} a={c("옥자:")} size={120} fill={C.red} color={C.yellow} r={430} />
      </>) },
      { id: "J-S04", color: C.mint, body: (t, c) => (<>
        <Leaf src={ART} x={CX} y={500} w={900} aspect={0.67} rot={0} drop={false} p={1} kb={ramp(t, c(0), 6)} t={t} />
        <Magnifier src={ART} x={CX - 220} y={760} r={170} fx={0.22} fy={0.45} mag={0.8} iw={1600} ih={1066} p={ramp(t, c("태진:유엔"), 0.45)} />
        <Ribbon x={CX + 120} y={720} text="거인 유엔군 장교" p={pop(t, c("태진:유엔"))} bg={C.sky} color={C.ink} size={48} from={1} />
        <Ribbon x={CX + 120} y={830} text="매달린 중공군 장교 둘" p={pop(t, c("태진:그 팔"))} bg={C.yellow} color={C.ink} size={48} from={1} />
        <Ribbon x={CX + 120} y={940} text="피리 부는 저승사자" p={pop(t, c("태진:저 멀리"))} bg={C.ink} color={C.yellow} size={48} from={1} />
      </>) },
      { id: "J-S05", color: C.pink, trans: "punch", body: (t, c) => (<>
        {[0, 1, 2, 3].map((i) => { const k = t - c("옥자:피리") - i * 0.25; return k > 0 ? <div key={i} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - clamp01((k - 1.8) / 0.5), transform: `translate(${200 + i * 180 + Math.sin(k * 3 + i) * 30}px, ${900 - k * 260}px)` }}><Note x={0} y={0} s={1.3 + (i % 2) * 0.4} /></div> : null; })}
        <Big x={CX} y={520} size={100} p={pop(t, c("옥자:피리"))} color={C.yellow}>피리 부는 사나이</Big>
        <Ribbon x={CX} y={900} text="동화를 삐라에" p={pop(t, c("옥자:동화"))} bg={C.cream} color={C.ink} size={60} />
      </>) },
      { id: "J-S06", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={260} text="미군 삐라 화가 부대" p={pop(t, c("태진:미군"))} size={60} />
        <Ribbon x={CX - 180} y={580} text="글 — 번역가" p={pop(t, c("태진:글은"))} bg={C.cream} color={C.ink} size={64} />
        <Ribbon x={CX + 180} y={760} text="그림 — 화가" p={pop(t, c("태진:그림은"))} bg={C.red} color={C.cream} size={64} from={1} />
      </>) },
      { id: "J-S07", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Leaf src={ART} x={CX} y={520} w={760} aspect={0.67} rot={-2} drop={false} p={1} kb={0.6} t={t} />
        <Big x={CX} y={930} size={100} p={pop(t, c("옥자:화가"))} color={C.red}>화가의 원본</Big>
      </>) },
      { id: "J-S08", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        <LeafWall srcs={WALL} W={W} top={140} cols={6} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c("태진:원화"), 0.5) * 0.5} />
        <Ribbon x={CX} y={380} text="인쇄본 수십억 장" p={pop(t, c("태진:인쇄"))} bg={C.cream} color={C.ink} size={60} />
        <Leaf src={ART} x={CX} y={700} w={560} aspect={0.67} rot={-3} drop={false} p={pop(t, c("태진:원화"))} t={t} />
        <Ribbon x={CX} y={950} text="원화는 한 장" p={pop(t, c("태진:한 장"))} bg={C.red} color={C.cream} size={70} from={1} />
        <Ribbon x={CX} y={250} text="TJ Kim Collection" p={pop(t, c("태진:티제이"))} bg={C.yellow} color={C.ink} size={56} />
      </>) },
    ],
    sfx: (c) => [[c("J-S01", 0.05), "flutter", 0.5], [c("J-S01", 1.0), "thud", 0.7], [c("J-S02", "태진:삐라"), "whoosh", 0.5], [c("J-S02", "태진:옆에"), "whoosh", 0.5], [c("J-S03", "옥자:"), "boing", 0.6], [c("J-S04", "태진:유엔"), "ding", 0.45],
      [c("J-S04", "태진:그 팔"), "pop", 0.5], [c("J-S04", "태진:저 멀리"), "pop", 0.5], [c("J-S05", "옥자:피리"), "boing", 0.5], [c("J-S06", "태진:글은"), "pop", 0.5], [c("J-S06", "태진:그림은"), "pop", 0.5], [c("J-S07", "옥자:화가"), "stamp", 0.5],
      [c("J-S08", 0.1), "flutter", 0.5], [c("J-S08", "태진:원화"), "thud", 0.6], [c("J-S08", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── K 평화를 가장한 비둘기
  K: {
    react: { "K-S02": { 옥자: "SURPRISE" }, "K-S04": { 옥자: "BASE" }, "K-S06": { 옥자: "BASE" }, "K-S08": { 옥자: "POINT" } },
    shots: [
      { id: "K-S01", color: C.pink, trans: "none", body: (t, c) => (<>
        <Leaf src={DOVE} x={CX} y={580} w={560} aspect={1.38} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={950} size={100} p={pop(t, c("옥자:분홍"))} color={C.cream}>분홍 비둘기?</Big>
      </>) },
      { id: "K-S02", color: C.cream, body: (t, c) => (<>
        <Leaf src={DOVE} x={CX - 80} y={560} w={520} aspect={1.38} rot={2} drop={false} p={1} kb={0.5} t={t} />
        <Magnifier src={DOVE} x={CX + 250} y={420} r={190} fx={0.5} fy={0.42} mag={0.8} iw={1600} ih={2215} p={ramp(t, c("태진:비둘기 몸"), 0.45)} />
        <Ribbon x={CX} y={190} text="“평화를 가장한 공산당 비둘기”" p={pop(t, c("태진:평화"))} size={44} />
        <Ribbon x={CX} y={970} text="비둘기 몸에 낫과 망치" p={pop(t, c("태진:비둘기 몸"))} bg={C.red} color={C.cream} size={54} from={1} />
      </>) },
      { id: "K-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="속은 다르다!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={460} />
      </>) },
      { id: "K-S04", color: C.sky, body: (t, c) => (<>
        <Leaf src={DOVE_B} x={CX - 120} y={560} w={480} aspect={1.38} rot={-3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:뒷면"), 4)} t={t} />
        <Ribbon x={CX} y={190} text="뒷면: 아이들만 남아 울고 있다" p={pop(t, c("태진:뒷면"))} size={46} />
        <Leaf src={DOVE2} x={CX + 300} y={520} w={260} aspect={1.38} rot={8} drop={false} from={[600, 0]} p={ramp(t, c("태진:같은"), 0.5)} t={t + 1} />
        <Leaf src={DOVE3} x={CX + 300} y={820} w={230} aspect={1.38} rot={-6} drop={false} from={[600, 0]} p={ramp(t, c("태진:팔백만"), 0.5)} t={t + 2} />
      </>) },
      { id: "K-S05", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={620} size={110} p={pop(t, c("옥자:그림"))} color={C.cream}>{"그림으로\n미워하게"}</Big>
      </>) },
      { id: "K-S06", color: C.cream, body: (t, c) => (<>
        <Leaf src={FATHER1} x={CX - 230} y={560} w={380} aspect={1.5} rot={-8} drop={false} from={[-700, 0]} p={ramp(t, c("태진:집"), 0.5)} t={t} />
        <Leaf src={MONSTER} x={CX + 230} y={600} w={380} aspect={1.38} rot={7} drop={false} from={[700, 0]} p={ramp(t, c("태진:상대"), 0.5)} t={t + 1} />
        <Ribbon x={CX - 230} y={880} text="향수" p={pop(t, c("태진:집"))} bg={C.sky} color={C.ink} size={64} />
        <Ribbon x={CX + 230} y={880} text="괴물" p={pop(t, c("태진:상대"))} bg={C.red} color={C.cream} size={64} from={1} />
        <Big x={CX} y={985} size={90} p={pop(t, c("태진:양쪽"))} color={C.yellow}>양쪽 다</Big>
      </>) },
      { id: "K-S07", color: C.sky, trans: "slide", body: (t, c) => (<>
        <Big x={CX} y={620} size={88} p={pop(t, c("옥자:"))} color={C.cream}>{"전쟁 뒤에도\n서로 미운 이유"}</Big>
      </>) },
      { id: "K-S08", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        <LeafWall srcs={WALL} W={W} top={140} cols={6} p={ramp(t, c(0), 1.6)} t={t} dim={ramp(t, c("태진:종이"), 0.5) * 0.5} />
        <Ribbon x={CX} y={420} text="휴전 뒤 교과서에까지" p={pop(t, c("태진:교과서"))} bg={C.cream} color={C.ink} size={56} />
        <Counter x={CX} y={660} t={t} a={c("태진:칠십")} d={0.9} to={70} size={200} suffix="년" color={C.red} />
        <Ribbon x={CX} y={920} text="TJ Kim Collection 삐라 100장+" p={pop(t, c("태진:티제이"))} bg={C.yellow} color={C.ink} size={52} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("K-S01", 0.05), "flutter", 0.5], [c("K-S01", 1.0), "thud", 0.7], [c("K-S02", "태진:비둘기 몸"), "ding", 0.45], [c("K-S03", "옥자:"), "boing", 0.6], [c("K-S04", 0.9), "thud", 0.6], [c("K-S04", "태진:같은"), "whoosh", 0.5],
      [c("K-S04", "태진:팔백만"), "whoosh", 0.5], [c("K-S05", "옥자:그림"), "boom", 0.5], [c("K-S06", "태진:집"), "whoosh", 0.5], [c("K-S06", "태진:상대"), "whoosh", 0.5], [c("K-S06", "태진:양쪽"), "pop", 0.5], [c("K-S07", "옥자:"), "pop", 0.5],
      [c("K-S08", 0.1), "flutter", 0.5], [c("K-S08", "태진:칠십"), "ding", 0.5]],
  },

  // ───────── L 겨울 삐라
  L: {
    react: { "L-S02": { 옥자: "SURPRISE" }, "L-S04": { 옥자: "BASE" }, "L-S06": { 옥자: "BASE" }, "L-S08": { 옥자: "POINT" } },
    shots: [
      { id: "L-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={WMAP} x={CX} y={580} w={540} aspect={1.25} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={950} size={110} p={pop(t, c("옥자:중국어"))} color={C.yellow}>중국어?</Big>
      </>) },
      { id: "L-S02", color: C.cream, body: (t, c) => (<>
        <Leaf src={WMAP} x={CX - 100} y={560} w={480} aspect={1.25} rot={2} drop={false} p={1} kb={0.5} t={t} />
        <Ribbon x={CX} y={190} text="중공군 대상" p={pop(t, c("태진:중공군"))} bg={C.red} color={C.cream} size={60} />
        <Big x={CX + 220} y={420} size={62} p={pop(t, c("태진:한국의"))} color={C.sky} font="BagelFatOne" rot={6}>{"Korea\nWinter\n1950–51"}</Big>
        <Big x={CX} y={960} size={120} p={pop(t, c("태진:영하"))} color={C.sky} rot={-3}>영하 30도</Big>
      </>) },
      { id: "L-S03", color: C.sky, trans: "punch", body: (t, c) => (<>
        <LeafRain srcs={[WMAP, WCOLD, WNURSE]} t={t} t0={c(0)} n={20} W={W} H={1150} span={0.6} fallDur={2.2} seed={81} size={[70, 120]} o={0.6} />
        <Sfx x={CX} y={620} text="영하 30도?!" t={t} a={c("옥자:")} size={110} fill={C.cream} color={C.sky} r={460} />
      </>) },
      { id: "L-S04", color: C.cream, body: (t, c) => (<>
        <Leaf src={WCOLD} x={CX - 160} y={520} w={520} aspect={0.84} rot={-4} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:겨울"), 4)} t={t} />
        <Ribbon x={CX} y={190} text="“겨울 추위를 못 견디겠다”" p={pop(t, c("태진:겨울"))} size={48} />
        <Ribbon x={CX} y={300} text="“아직 희망은 있다”" p={pop(t, c("태진:아직"))} bg={C.yellow} color={C.ink} size={48} from={1} />
        <Leaf src={WNURSE} x={CX + 270} y={760} w={360} aspect={0.84} rot={7} drop={false} from={[800, 0]} p={ramp(t, c("태진:위험"), 0.5)} t={t + 1} />
        <Ribbon x={CX} y={990} text="위험 · 추위 · 굶주림" p={pop(t, c("태진:위험"))} bg={C.red} color={C.cream} size={52} />
      </>) },
      { id: "L-S05", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={620} size={96} p={pop(t, c("옥자:추운"))} color={C.cream}>{"추운 사람에게\n추위 얘기"}</Big>
      </>) },
      { id: "L-S06", color: C.yellow, body: (t, c) => (<>
        <Leaf src={WNURSE} x={CX} y={540} w={600} aspect={0.84} rot={-2} drop={false} p={1} kb={ramp(t, c(0), 5)} t={t} />
        <Ribbon x={CX} y={860} text="“여기 나오면 따뜻한 밥”" p={pop(t, c("태진:따뜻"))} bg={C.red} color={C.cream} size={50} />
        <Ribbon x={CX} y={970} text="“여기 길이 있다”" p={pop(t, c("태진:여기 길"))} bg={C.cream} color={C.ink} size={50} from={1} />
      </>) },
      { id: "L-S07", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="날씨 예보!" t={t} a={c("옥자:")} size={120} fill={C.sky} color={C.cream} r={430} />
      </>) },
      { id: "L-S08", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="제일 추운 날 떨어진 삐라" p={pop(t, c("태진:제일"))} bg={C.cream} color={C.red} size={52} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("L-S01", 0.05), "flutter", 0.5], [c("L-S01", 1.0), "thud", 0.7], [c("L-S02", "태진:영하"), "boom", 0.5], [c("L-S03", "옥자:"), "boing", 0.6], [c("L-S04", 0.9), "thud", 0.6], [c("L-S04", "태진:위험"), "whoosh", 0.5],
      [c("L-S05", "옥자:추운"), "pop", 0.5], [c("L-S06", "태진:따뜻"), "pop", 0.5], [c("L-S06", "태진:여기 길"), "pop", 0.5], [c("L-S07", "옥자:"), "boing", 0.6], [c("L-S08", 0.1), "flutter", 0.5], [c("L-S08", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── M 폭탄보다 먼저 온 종이
  M: {
    react: { "M-S02": { 옥자: "SURPRISE" }, "M-S04": { 옥자: "BASE" }, "M-S05": { 옥자: "SURPRISE" }, "M-S07": { 옥자: "SURPRISE" }, "M-S09": { 옥자: "POINT" } },
    shots: [
      { id: "M-S01", color: C.red, trans: "none", body: (t, c) => (<>
        <Plane x={-400 + (t - c(0)) * 520} y={190} s={0.9} rot={-4} />
        <Leaf src={RAID} x={CX} y={560} w={430} aspect={1.63} rot={-4} p={ramp(t, c(0.4), 1.0)} kb={ramp(t, c(1.4), 5)} t={t} />
        <Big x={CX} y={960} size={120} p={pop(t, c("옥자:공습"))} color={C.yellow}>공습예고?!</Big>
      </>) },
      { id: "M-S02", color: C.yellow, body: (t, c) => (<>
        <Ribbon x={CX} y={170} text="유엔군 → 민간인" p={pop(t, c("태진:유엔군"))} bg={C.ink} color={C.yellow} size={56} />
        <Leaf src={RAID} x={CX - 220} y={580} w={380} aspect={1.63} rot={-4} drop={false} p={1} t={t} />
        <Magnifier src={RAID} x={CX + 230} y={520} r={210} fx={0.5} fy={0.55} mag={0.6} iw={1600} ih={2604} p={ramp(t, c("태진:지금도"), 0.45)} />
        <Stamp x={CX + 200} y={930} text="한시가 급합니다" p={ramp(t, c("태진:한시가"), 0.25)} w={480} h={130} rot={-6} />
      </>) },
      { id: "M-S03", color: C.cream, trans: "punch", body: (t, c) => (<>
        <Leaf src={RAID_B} x={CX + 260} y={420} w={300} aspect={1.57} rot={10} drop={false} p={1} t={t} />
        <Sfx x={CX} y={700} text="폭탄보다 편지가 먼저!" t={t} a={c("옥자:")} size={84} fill={C.red} color={C.yellow} r={470} />
      </>) },
      { id: "M-S04", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={170} text="북한·중공군 → 미군" p={pop(t, c("태진:북한"))} bg={C.red} color={C.cream} size={60} />
        <Leaf src={CEASE} x={CX} y={560} w={860} aspect={0.72} rot={-2} p={ramp(t, c(0.1), 0.9)} kb={ramp(t, c("태진:정전"), 4)} t={t} />
        <Sfx x={CX + 300} y={900} text="찌익!" t={t} a={c("태진:찢고")} size={90} fill={C.yellow} color={C.red} r={220} />
      </>) },
      { id: "M-S05", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={170} text="휴전 회담 무렵" p={pop(t, c("태진:휴전 회담"))} size={56} />
        <Leaf src={CEASE} x={CX} y={500} w={780} aspect={0.72} rot={2} drop={false} p={1} kb={0.6} t={t} />
        <Big x={CX} y={920} size={64} p={pop(t, c("태진:죽고"))} color={C.yellow} rot={-2}>{"“죽고 싶지 않으면\n휴전을 위해 싸워라”"}</Big>
      </>) },
      { id: "M-S06", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={560} size={120} p={pop(t, c("옥자:"))} color={C.cream}>{"휴전을 위해\n싸워라?!"}</Big>
        <Sfx x={CX + 280} y={860} text="꼬였다!" t={t} a={c("옥자:말이")} size={70} fill={C.yellow} color={C.red} r={200} />
      </>) },
      { id: "M-S07", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={170} text="1954 — 휴전 다음 해" p={pop(t, c("태진:천구백오십사"))} bg={C.red} color={C.cream} size={58} />
        <Leaf src={Y54} x={CX} y={500} w={900} aspect={0.64} rot={-2} p={ramp(t, c(0.2), 0.9)} t={t} />
        <Magnifier src={Y54} x={CX + 250} y={780} r={190} fx={0.78} fy={0.62} mag={0.55} iw={1600} ih={1031} p={ramp(t, c("태진:살 수"), 0.45)} />
      </>) },
      { id: "M-S08", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="끝났는데도?!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={420} />
      </>) },
      { id: "M-S09", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="총은 멈춰도 종이는 안 멈췄다" p={pop(t, c("태진:총은"))} bg={C.cream} color={C.red} size={50} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("M-S01", 0.1), "plane", 0.5], [c("M-S01", 1.4), "thud", 0.7], [c("M-S01", "옥자:공습"), "boom", 0.5], [c("M-S02", "태진:지금도"), "ding", 0.45], [c("M-S02", "태진:한시가"), "stamp", 0.6],
      [c("M-S03", "옥자:"), "boing", 0.6], [c("M-S04", "태진:이건") + 0.9, "thud", 0.6], [c("M-S04", "태진:찢고"), "rip", 0.6], [c("M-S05", "태진:죽고"), "pop", 0.5], [c("M-S06", "옥자:"), "boing", 0.6],
      [c("M-S07", "태진:천구백오십사") + 0.9, "thud", 0.6], [c("M-S07", "태진:살 수"), "ding", 0.45], [c("M-S08", "옥자:"), "boom", 0.6], [c("M-S09", 0.1), "flutter", 0.5], [c("M-S09", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── N 포로수용소를 광고했다
  N: {
    react: { "N-S02": { 옥자: "SURPRISE" }, "N-S04": { 옥자: "BASE" }, "N-S05": { 옥자: "BASE" }, "N-S07": { 옥자: "SURPRISE" }, "N-S08": { 옥자: "SURPRISE" }, "N-S10": { 옥자: "POINT" } },
    shots: [
      { id: "N-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={PING} x={CX} y={540} w={820} aspect={0.72} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Sfx x={CX + 300} y={300} text="핑! 퐁!" t={t} a={c(1.0)} size={70} fill={C.yellow} color={C.red} r={190} dur={2.5} />
        <Big x={CX} y={960} size={100} p={pop(t, c("옥자:탁구"))} color={C.yellow}>전쟁터에서 탁구?!</Big>
      </>) },
      { id: "N-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="북한·중공군 → 유엔군" p={pop(t, c("태진:북한"))} bg={C.red} color={C.cream} size={56} />
        <Leaf src={PING} x={CX} y={430} w={600} aspect={0.72} rot={2} drop={false} p={1} t={t} />
        <Ribbon x={CX} y={700} text="미국 vs 영국 포로 · 탁구 시합" p={pop(t, c("태진:미국"))} bg={C.yellow} color={C.ink} size={46} />
        <Leaf src={YALU} x={CX} y={890} w={900} aspect={0.36} rot={-2} drop={false} from={[900, 0]} p={ramp(t, c("태진:여름"), 0.5)} t={t + 1} />
      </>) },
      { id: "N-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Leaf src={YALU} x={CX} y={860} w={760} aspect={0.36} rot={3} drop={false} p={1} t={t} />
        <Sfx x={CX} y={480} text="리조트 광고?!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={420} />
      </>) },
      { id: "N-S04", color: C.pink, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="명령 — 김일성 · 펑더화이 명의" p={pop(t, c("태진:앞장"))} size={46} />
        <Leaf src={ORDER} x={CX} y={470} w={820} aspect={0.72} rot={-2} p={ramp(t, c(0), 0.9)} kb={ramp(t, c("태진:투항"), 4)} t={t} />
        {[["① 생명", "생명"], ["② 소지품", "물건"], ["③ 학대 금지", "학대"], ["④ 치료", "다치면"]].map(([txt, cue], i) => (
          <Ribbon key={txt} x={CX - 230 + (i % 2) * 460} y={820 + Math.floor(i / 2) * 110} text={txt} p={pop(t, c(`태진:${cue}`))} bg={[C.yellow, C.mint, C.cream, C.sky][i]} color={C.ink} size={50} from={i % 2 ? 1 : -1} rot={i % 2 ? 3 : -3} />
        ))}
      </>) },
      { id: "N-S05", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="Life in a P.O.W. Camp (중공군)" p={pop(t, c("태진:라이프"))} size={46} />
        <Leaf src={POW1} x={CX - 210} y={520} w={420} aspect={1.47} rot={-6} p={ramp(t, c("태진:라이프"), 0.9)} t={t} />
        <Leaf src={POW2} x={CX + 210} y={560} w={420} aspect={1.45} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:밥"), 0.5)} t={t + 1} />
        <Big x={CX} y={960} size={70} p={pop(t, c("태진:결국"))} color={C.yellow}>“결국 집에 간다”</Big>
      </>) },
      { id: "N-S06", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Big x={CX} y={600} size={220} p={pop(t, c("옥자:"))} color={C.red} font="BagelFatOne">진짜?</Big>
      </>) },
      { id: "N-S07", color: C.ink, burst: false, body: (t, c) => (<>
        <Leaf src={PING} x={CX} y={480} w={700} aspect={0.72} rot={-2} drop={false} p={1} o={0.75} t={t} />
        <Stamp x={CX} y={480} text="연출" p={ramp(t, c("태진:연출"), 0.25)} w={340} h={160} rot={-10} />
        <Ribbon x={CX} y={900} text="실제 포로 생활은 혹독했다 (특히 겨울)" p={pop(t, c("태진:실제"))} bg={C.cream} color={C.ink} size={44} />
      </>) },
      { id: "N-S08", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="1956 미국 하원 청문회" p={pop(t, c("태진:천구백오십육"))} bg={C.ink} color={C.yellow} size={56} />
        <Leaf src={HEAR} x={CX} y={540} w={430} aspect={1.57} rot={-3} p={ramp(t, c("태진:천구백오십육"), 0.9)} t={t} />
        <Ribbon x={CX} y={960} text="‘포로들 사이의 공산주의 선전’ 조사" p={pop(t, c("태진:청문회 책자"))} bg={C.cream} color={C.ink} size={44} from={1} />
      </>) },
      { id: "N-S09", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={600} size={110} p={pop(t, c("옥자:"))} color={C.cream}>{"광고는 예쁜데\n속은 달랐다"}</Big>
      </>) },
      { id: "N-S10", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="광고 사진은 누가 찍었는지부터" p={pop(t, c("태진:광고"))} bg={C.cream} color={C.red} size={50} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("N-S01", 0.05), "flutter", 0.5], [c("N-S01", 1.0), "pop", 0.6], [c("N-S01", 1.3), "pop", 0.6], [c("N-S02", "태진:여름"), "whoosh", 0.5], [c("N-S03", "옥자:"), "boing", 0.6],
      [c("N-S04", 0.9), "thud", 0.6], ...["생명", "물건", "학대", "다치면"].map((w): [number, string, number] => [c("N-S04", `태진:${w}`), "pop", 0.45]), [c("N-S05", "태진:밥"), "whoosh", 0.5],
      [c("N-S06", "옥자:"), "boing", 0.5], [c("N-S07", "태진:연출"), "stamp", 0.6], [c("N-S08", "태진:천구백오십육") + 0.9, "thud", 0.6], [c("N-S09", "옥자:"), "pop", 0.5], [c("N-S10", 0.1), "flutter", 0.5], [c("N-S10", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── O 북쪽도 '집에 가라' — 엄마의 편지
  O: {
    react: { "O-S02": { 옥자: "BASE" }, "O-S03": { 옥자: "BASE" }, "O-S05": { 옥자: "SURPRISE" }, "O-S07": { 옥자: "LAUGH" }, "O-S09": { 옥자: "POINT" } },
    shots: [
      { id: "O-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={LETTER} x={CX} y={530} w={860} aspect={0.73} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={960} size={100} p={pop(t, c("옥자:편지"))} color={C.yellow}>편지 읽는 엄마?</Big>
      </>) },
      { id: "O-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="북한·중공군 → 미군" p={pop(t, c("태진:북한"))} bg={C.red} color={C.cream} size={56} />
        <Leaf src={LETTER} x={CX} y={500} w={860} aspect={0.73} rot={2} drop={false} p={1} kb={0.4} t={t} />
        <Ribbon x={CX} y={880} text="“A Soldier's Last Letter”" p={pop(t, c("태진:어 솔저스"))} bg={C.ink} color={C.yellow} size={52} />
        <Stamp x={CX + 220} y={990} text="쓰다 만 편지" p={ramp(t, c("태진:쓰다"), 0.25)} w={360} h={110} rot={-8} />
      </>) },
      { id: "O-S03", color: C.yellow, body: (t, c) => (<>
        <Magnifier src={LETTER} x={CX} y={500} r={330} fx={0.75} fy={0.42} mag={0.75} iw={1600} ih={1165} p={ramp(t, c(0), 0.45)} />
        <Big x={CX} y={930} size={64} p={pop(t, c("태진:참호"))} color={C.cream} font={FONT_P} stroke={5}>{"“Dear Mom, I miss you so much”"}</Big>
      </>) },
      { id: "O-S04", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Leaf src={LETTER} x={CX} y={420} w={520} aspect={0.73} rot={-4} drop={false} p={1} t={t} />
        <Sfx x={CX} y={800} text="쓰다 만 편지…" t={t} a={c("옥자:")} size={84} fill={C.sky} color={C.cream} r={400} />
      </>) },
      { id: "O-S05", color: C.mint, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="“Remember this?”" p={pop(t, c("태진:리멤버"))} bg={C.ink} color={C.yellow} size={56} />
        <Leaf src={REMEMBER} x={CX - 220} y={560} w={360} aspect={1.65} rot={-6} p={ramp(t, c("태진:리멤버"), 0.9)} t={t} />
        <Leaf src={HOME} x={CX + 220} y={600} w={360} aspect={1.62} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:뒤에는"), 0.5)} t={t + 1} />
        <Ribbon x={CX} y={980} text="“You Too Belong Back Home”" p={pop(t, c("태진:유 투"))} bg={C.cream} color={C.red} size={48} from={1} />
      </>) },
      { id: "O-S06", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="수법 그대로!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={420} />
      </>) },
      { id: "O-S07", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="국군 대상 만화 삐라" p={pop(t, c("태진:국군"))} bg={C.blue} color={C.cream} size={56} />
        <Leaf src={ROKC} x={CX} y={500} w={880} aspect={0.71} rot={-2} p={ramp(t, c(0.1), 0.9)} kb={ramp(t, c("태진:살길"), 4)} t={t} />
        <Stamp x={CX + 200} y={400} text="차마 못 읽음" p={ramp(t, c("태진:말풍선"), 0.25)} w={400} h={130} rot={-10} />
        <Ribbon x={CX} y={900} text="“살길을 찾아 투항하라”" p={pop(t, c("태진:살길"))} bg={C.yellow} color={C.ink} size={50} from={1} />
      </>) },
      { id: "O-S08", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Leaf src={ROKC2} x={CX} y={420} w={640} aspect={0.73} rot={4} drop={false} p={1} t={t} />
        <Sfx x={CX} y={820} text="삐-!" t={t} a={c("옥자:욕")} size={120} fill={C.ink} color={C.yellow} r={260} />
      </>) },
      { id: "O-S09", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="엄마 · 가족 · 고향 — 같은 답" p={pop(t, c("태진:그래도"))} bg={C.cream} color={C.red} size={50} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("O-S01", 0.05), "flutter", 0.5], [c("O-S01", 1.0), "thud", 0.7], [c("O-S02", "태진:쓰다"), "stamp", 0.6], [c("O-S03", 0.1), "ding", 0.45], [c("O-S04", "옥자:"), "pop", 0.5],
      [c("O-S05", "태진:리멤버") + 0.9, "thud", 0.6], [c("O-S05", "태진:뒤에는"), "whoosh", 0.5], [c("O-S06", "옥자:"), "boing", 0.6], [c("O-S07", "태진:이건") + 0.9, "thud", 0.6], [c("O-S07", "태진:말풍선"), "stamp", 0.6],
      [c("O-S08", "옥자:욕"), "ding", 0.6], [c("O-S09", 0.1), "flutter", 0.5], [c("O-S09", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── P 중공군에게 보낸 만화책
  P: {
    react: { "P-S02": { 옥자: "SURPRISE" }, "P-S04": { 옥자: "BASE" }, "P-S05": { 옥자: "SURPRISE" }, "P-S07": { 옥자: "SURPRISE" }, "P-S09": { 옥자: "LAUGH" } },
    shots: [
      { id: "P-S01", color: C.yellow, trans: "none", body: (t, c) => (<>
        <Leaf src={ESCAPE} x={CX} y={560} w={440} aspect={1.67} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={960} size={110} p={pop(t, c("옥자:만화"))} color={C.red}>주황색 만화?</Big>
      </>) },
      { id: "P-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="「我是這樣逃出來的」" p={pop(t, c("태진:제목이"))} bg={C.ink} color={C.yellow} size={50} />
        <Ribbon x={CX} y={250} text="나는 이렇게 빠져나왔다" p={pop(t, c("태진:나는"))} bg={C.yellow} color={C.ink} size={44} from={1} />
        <Leaf src={ESCAPE} x={CX - 170} y={630} w={420} aspect={1.67} rot={-3} drop={false} p={1} kb={0.5} t={t} />
        <Counter x={CX + 260} y={640} t={t} a={c("태진:여섯")} d={0.6} to={6} size={220} suffix="칸" color={C.red} />
      </>) },
      { id: "P-S03", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={560} text="탈출 설명서!" t={t} a={c("옥자:탈출")} size={110} fill={C.red} color={C.yellow} r={420} />
        <Big x={CX} y={900} size={64} p={pop(t, c("옥자:조립"))} color={C.cream}>= 조립 설명서</Big>
      </>) },
      { id: "P-S04", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="「共産党容許你過這樣的生活嗎?」" p={pop(t, c("태진:이건"))} bg={C.ink} color={C.yellow} size={40} />
        <Leaf src={HUT} x={CX} y={510} w={860} aspect={0.82} rot={-2} p={ramp(t, c("태진:이건"), 0.9)} kb={ramp(t, c("태진:밭일"), 4)} t={t} />
        <Ribbon x={CX} y={930} text="이렇게 살게 두겠느냐?" p={pop(t, c("태진:공산당이"))} bg={C.cream} color={C.red} size={52} from={1} />
      </>) },
      { id: "P-S05", color: C.red, body: (t, c) => (<>
        <Leaf src={FIRE} x={CX} y={540} w={430} aspect={1.62} rot={3} p={ramp(t, c(0), 0.9)} kb={ramp(t, c(1), 4)} t={t} />
        <Sfx x={CX + 290} y={300} text="활활!" t={t} a={c("태진:불길")} size={70} fill={C.yellow} color={C.red} r={180} />
        <Ribbon x={CX} y={960} text="공산당은 진실이 두렵다" p={pop(t, c("태진:공산당은"))} bg={C.ink} color={C.yellow} size={50} />
      </>) },
      { id: "P-S06", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={600} size={120} p={pop(t, c("옥자:"))} color={C.cream}>{"그림만 봐도\n안다"}</Big>
      </>) },
      { id: "P-S07", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="「孩子，回来吧!」 얘야, 돌아오너라" p={pop(t, c("태진:엄마"))} bg={C.ink} color={C.yellow} size={42} />
        <Leaf src={KID} x={CX} y={400} w={800} aspect={0.67} rot={-2} p={ramp(t, c(0.1), 0.9)} t={t} />
        <Leaf src={MAP} x={CX + 250} y={800} w={330} aspect={1.41} rot={7} drop={false} from={[800, 0]} p={ramp(t, c("태진:지도"), 0.5)} t={t + 1} />
        <Big x={CX - 200} y={820} size={130} p={pop(t, c("태진:죽을"))} color={C.red}>死 · 生</Big>
      </>) },
      { id: "P-S08", color: C.pink, body: (t, c) => (<>
        <Leaf src={MAP} x={CX - 120} y={520} w={500} aspect={1.41} rot={-3} drop={false} p={1} t={t} />
        <Magnifier src={MAP} x={CX + 240} y={780} r={190} fx={0.8} fy={0.93} mag={0.55} iw={1600} ih={2251} p={ramp(t, c("옥자:영어로"), 0.45)} />
        <Sfx x={CX + 270} y={300} text="낙서?!" t={t} a={c("옥자:낙서")} size={80} fill={C.yellow} color={C.red} r={200} />
      </>) },
      { id: "P-S09", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="“GOOD (HA HA)” — 70년 전 댓글" p={pop(t, c("태진:굿"))} bg={C.cream} color={C.red} size={48} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("P-S01", 0.05), "flutter", 0.5], [c("P-S01", 1.0), "thud", 0.7], [c("P-S02", "태진:여섯"), "ding", 0.45], [c("P-S03", "옥자:탈출"), "boing", 0.6], [c("P-S04", "태진:이건") + 0.9, "thud", 0.6],
      [c("P-S05", 0.9), "thud", 0.6], [c("P-S05", "태진:불길"), "boom", 0.5], [c("P-S06", "옥자:"), "pop", 0.5], [c("P-S07", "태진:엄마") + 0.9, "thud", 0.6], [c("P-S07", "태진:지도"), "whoosh", 0.5], [c("P-S07", "태진:죽을"), "stamp", 0.5],
      [c("P-S08", "옥자:영어로"), "ding", 0.45], [c("P-S08", "옥자:낙서"), "boing", 0.6], [c("P-S09", 0.1), "flutter", 0.5], [c("P-S09", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── Q 삐라 성적표 읽어 드립니다
  Q: {
    react: { "Q-S02": { 옥자: "SURPRISE" }, "Q-S03": { 옥자: "BASE" }, "Q-S05": { 옥자: "LAUGH" }, "Q-S06": { 옥자: "SURPRISE" }, "Q-S09": { 옥자: "SURPRISE" }, "Q-S11": { 옥자: "POINT" } },
    shots: [
      { id: "Q-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={ETIQ_S} x={CX} y={560} w={440} aspect={1.64} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={960} size={100} p={pop(t, c("옥자:타자"))} color={C.yellow}>타자 친 종이?</Big>
      </>) },
      { id: "Q-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="극동사령부 분석표" p={pop(t, c("태진:극동"))} bg={C.ink} color={C.yellow} size={58} />
        <Leaf src={ETIQ_S} x={CX - 220} y={580} w={400} aspect={1.64} rot={-3} drop={false} p={1} kb={0.5} t={t} />
        {["이름", "언어", "대상", "목적", "그림 설명", "번역"].map((w, i) => (
          <Ribbon key={w} x={CX + 240} y={320 + i * 105} text={w} p={pop(t, c(`태진:${w}`))} bg={[C.red, C.yellow, C.mint, C.pink, C.sky, C.cream][i]} color={i === 0 ? C.cream : C.ink} size={48} from={1} rot={i % 2 ? 3 : -3} />
        ))}
      </>) },
      { id: "Q-S03", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="「동방예의지국!」 1953. 5. 25" p={pop(t, c("태진:동방"))} bg={C.ink} color={C.yellow} size={50} />
        <Leaf src={ETIQ} x={CX} y={520} w={600} aspect={1.31} rot={-2} p={ramp(t, c("태진:첫 번째"), 0.9)} kb={ramp(t, c("태진:공산당이"), 4)} t={t} />
        <Big x={CX} y={950} size={58} p={pop(t, c("태진:잃어"))} color={C.cream} font={FONT_P} stroke={5}>{"“잃었던 예의와 도덕을 되찾자”"}</Big>
      </>) },
      { id: "Q-S04", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="내 얘기네!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={380} />
      </>) },
      { id: "Q-S05", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="뒷면" p={pop(t, c("태진:뒷면"))} bg={C.red} color={C.cream} size={56} />
        <Leaf src={ETIQ_B} x={CX} y={540} w={500} aspect={1.55} rot={3} p={ramp(t, c("태진:뒷면"), 0.9)} kb={ramp(t, c("태진:짐을"), 4)} t={t} />
        <Big x={CX} y={950} size={68} p={pop(t, c("태진:효도"))} color={C.yellow} rot={-3}>“효도가 다 뭐야! 일이나 해”</Big>
      </>) },
      { id: "Q-S06", color: C.mint, body: (t, c) => (<>
        <Leaf src={ETIQ_S} x={CX} y={480} w={520} aspect={1.64} rot={-2} drop={false} p={1} kb={0.7} t={t} />
        <Ribbon x={CX} y={840} text="목적: to create dissension (갈라놓기)" p={pop(t, c("태진:목적"))} bg={C.ink} color={C.yellow} size={42} />
        <Ribbon x={CX} y={960} text="그림: 담뱃대 든 노학자 · 학생들" p={pop(t, c("태진:그림 설명"))} bg={C.cream} color={C.ink} size={42} from={1} />
      </>) },
      { id: "Q-S07", color: C.pink, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="그림 설명까지?!" t={t} a={c("옥자:")} size={96} fill={C.yellow} color={C.red} r={440} />
      </>) },
      { id: "Q-S08", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="한 시조 · 한 피 · 한 민족" p={pop(t, c("태진:한 시조"))} bg={C.blue} color={C.cream} size={52} />
        <Leaf src={ONE} x={CX - 220} y={540} w={400} aspect={1.31} rot={-6} p={ramp(t, c(0.1), 0.9)} t={t} />
        <Leaf src={CHINA} x={CX + 210} y={600} w={460} aspect={0.73} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:중국어"), 0.5)} t={t + 1} />
        <Ribbon x={CX} y={930} text="「請看今日中國之慘象」" p={pop(t, c("태진:중국어"))} bg={C.ink} color={C.yellow} size={46} from={1} />
      </>) },
      { id: "Q-S09", color: C.yellow, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="주간신보 「자유세계」 1953. 5. 20" p={pop(t, c("태진:주간신보"))} bg={C.ink} color={C.yellow} size={46} />
        <Leaf src={FREE} x={CX} y={520} w={600} aspect={1.31} rot={-3} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 4)} t={t} />
        <Big x={CX} y={950} size={80} p={pop(t, c("태진:하늘에서"))} color={C.red}>하늘에서 신문 배달</Big>
      </>) },
      { id: "Q-S10", color: C.mint, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="회사 기획서!" t={t} a={c("옥자:")} size={110} fill={C.red} color={C.yellow} r={420} />
      </>) },
      { id: "Q-S11", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="기획서까지 함께" p={pop(t, c("태진:그 기획서"))} bg={C.cream} color={C.red} size={52} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("Q-S01", 0.05), "flutter", 0.5], [c("Q-S01", 1.0), "thud", 0.7], ...["이름", "언어", "대상", "목적", "그림 설명", "번역"].map((w): [number, string, number] => [c("Q-S02", `태진:${w}`), "pop", 0.45]),
      [c("Q-S03", "태진:첫 번째") + 0.9, "thud", 0.6], [c("Q-S04", "옥자:"), "boing", 0.6], [c("Q-S05", "태진:뒷면") + 0.9, "thud", 0.6], [c("Q-S05", "태진:효도"), "boom", 0.5], [c("Q-S06", "태진:목적"), "stamp", 0.5],
      [c("Q-S07", "옥자:"), "boing", 0.6], [c("Q-S08", "태진:한 시조") + 0.9, "thud", 0.6], [c("Q-S08", "태진:중국어"), "whoosh", 0.5], [c("Q-S09", 1.0), "thud", 0.6], [c("Q-S10", "옥자:"), "boing", 0.6], [c("Q-S11", 0.1), "flutter", 0.5], [c("Q-S11", "태진:티제이"), "ding", 0.5]],
  },

  // ───────── R 전쟁이 끝난 걸 종이로 알렸다
  R: {
    react: { "R-S02": { 옥자: "SURPRISE" }, "R-S04": { 옥자: "BASE" }, "R-S06": { 옥자: "SURPRISE" }, "R-S08": { 옥자: "BASE" }, "R-S09": { 옥자: "POINT" } },
    shots: [
      { id: "R-S01", color: C.sky, trans: "none", body: (t, c) => (<>
        <Leaf src={JP45} x={CX} y={560} w={460} aspect={1.5} rot={-4} p={ramp(t, c(0), 1.0)} kb={ramp(t, c(1), 5)} t={t} />
        <Big x={CX} y={960} size={100} p={pop(t, c("옥자:휴전"))} color={C.yellow}>휴전 성립?</Big>
      </>) },
      { id: "R-S02", color: C.cream, body: (t, c) => (<>
        <Ribbon x={CX} y={160} text="1945 미군 → 일본군" p={pop(t, c("태진:천구백사십오"))} bg={C.red} color={C.cream} size={56} />
        <Leaf src={JP45} x={CX - 200} y={540} w={420} aspect={1.5} rot={-3} drop={false} p={1} t={t} />
        <Big x={CX + 260} y={480} size={60} p={pop(t, c("태진:일미"))} color={C.ink} rot={4} maxW={420}>{"“휴전 성립!\n전투를 중지하라!”"}</Big>
        <Leaf src={JP45_B} x={CX + 200} y={820} w={480} aspect={0.67} rot={6} drop={false} from={[800, 0]} p={ramp(t, c("태진:뒷면"), 0.5)} t={t + 1} />
        <Stamp x={CX - 200} y={940} text="제8군 사령부" p={ramp(t, c("태진:제팔군"), 0.25)} w={380} h={110} rot={-8} />
      </>) },
      { id: "R-S03", color: C.yellow, trans: "punch", body: (t, c) => (<>
        <Big x={CX} y={600} size={120} p={pop(t, c("옥자:"))} color={C.cream}>{"끝난 걸\n왜 종이로?"}</Big>
      </>) },
      { id: "R-S04", color: C.mint, body: (t, c) => {
        const at = c("태진:이건");
        return (<>
          <Ribbon x={CX} y={160} text="섬 · 정글 — 라디오도 신문도 없다" p={pop(t, c("태진:섬"))} bg={C.ink} color={C.yellow} size={46} />
          {t < at + 0.3 && <Plane x={-400 + (t - c(0)) * 500} y={360} s={0.8} rot={-4} />}
          <Leaf src={AUS} x={CX} y={520} w={640} aspect={0.89} rot={-2} p={ramp(t, at, 0.9)} kb={ramp(t, c("태진:뒤엔"), 4)} t={t} />
          <Ribbon x={CX} y={920} text="“일본은 항복했다 · 전쟁은 끝났다 · 평화가 왔다”" p={pop(t, c("태진:일본은"))} bg={C.cream} color={C.red} size={36} from={1} />
        </>);
      } },
      { id: "R-S05", color: C.cream, trans: "slide", body: (t, c) => (<>
        <Big x={CX} y={600} size={140} p={pop(t, c("옥자:"))} color={C.red}>다들 나왔어?</Big>
      </>) },
      { id: "R-S06", color: C.ink, burst: false, body: (t, c) => (<>
        <Ribbon x={CX} y={220} text="필리핀 루방섬 · 오노다 소위" p={pop(t, c("태진:필리핀"))} bg={C.cream} color={C.ink} size={50} />
        <Leaf src={JP45} x={CX} y={560} w={440} aspect={1.5} rot={-4} p={ramp(t, c(0.2), 0.9)} t={t} />
        <Stamp x={CX} y={580} text="삐라 = 속임수?" p={ramp(t, c("태진:속임수"), 0.25)} w={480} h={130} rot={-6} />
        <Counter x={CX} y={930} t={t} a={c("태진:필리핀")} d={Math.max(1, c("태진:천구백칠십사") - c("태진:필리핀"))} from={1945} to={1974} size={170} color={C.yellow} fmt={(n) => String(Math.round(n))} />
      </>) },
      { id: "R-S07", color: C.red, trans: "punch", body: (t, c) => (<>
        <Sfx x={CX} y={620} text="29년?!" t={t} a={c("옥자:")} size={140} fill={C.yellow} color={C.red} r={340} />
      </>) },
      { id: "R-S08", color: C.sky, body: (t, c) => (<>
        <Ribbon x={CX} y={260} text="종이는 왔는데 믿음은 안 왔다" p={pop(t, c("태진:종이는"))} bg={C.ink} color={C.yellow} size={50} />
        <LeafRain srcs={RAIN} t={t} t0={c("태진:한국전쟁")} n={40} W={W} H={1100} span={2} fallDur={2.6} seed={93} size={[80, 140]} />
        <Ribbon x={CX} y={800} text="5년 뒤 → 한국전쟁 삐라" p={pop(t, c("태진:한국전쟁"))} bg={C.red} color={C.cream} size={56} from={1} />
      </>) },
      { id: "R-S09", color: C.ink, burst: false, zoom: [1.05, 1], body: (t, c) => (<>
        {Ending(t, c)}
        <Ribbon x={CX} y={900} text="믿게 만드는 게 삐라의 일" p={pop(t, c("태진:믿게"))} bg={C.cream} color={C.red} size={52} from={1} />
      </>) },
    ],
    sfx: (c) => [[c("R-S01", 0.05), "flutter", 0.5], [c("R-S01", 1.0), "thud", 0.7], [c("R-S02", "태진:뒷면"), "whoosh", 0.5], [c("R-S02", "태진:제팔군"), "stamp", 0.6], [c("R-S03", "옥자:"), "pop", 0.5],
      [c("R-S04", 0.1), "plane", 0.45], [c("R-S04", "태진:이건") + 0.9, "thud", 0.6], [c("R-S05", "옥자:"), "pop", 0.5], [c("R-S06", "태진:속임수"), "stamp", 0.6], [c("R-S06", "태진:이십구"), "ding", 0.5],
      [c("R-S07", "옥자:"), "boom", 0.6], [c("R-S08", "태진:한국전쟁"), "flutter", 0.5], [c("R-S09", 0.1), "flutter", 0.5], [c("R-S09", "태진:티제이"), "ding", 0.5]],
  },
};

/** 두 캐릭터: 말하는 쪽은 대사 감정 포즈, 듣는 쪽은 숏별 반응 포즈 */
const Pair: React.FC<{ ctx: Ctx; t: number; react: ReactMap }> = ({ ctx, t, react }) => {
  const TL = ctx.TL;
  const cur = TL.lines.find((x) => t >= x.start - 0.15 && t <= x.end + 0.25);
  const lastBy = (who: string) => [...TL.lines].reverse().find((x) => x.who === who && x.start - 0.15 <= t);
  const shotNow = [...TL.shots].reverse().find((s) => s.start - 0.2 <= t)?.id ?? TL.shots[0].id;
  const pose = (who: string) => {
    if (cur?.who === who) return { pose: poseOf(cur.emo, who), since: cur.start - 0.15 };
    const r = react[shotNow]?.[who];
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

export const ShortSeries: React.FC<{ ep: Ep }> = ({ ep }) => {
  const TL = TLS[ep];
  const ctx: Ctx = { TL, W, H, ...mk(TL) };
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const E = EPISODES[ep];
  const cues = E.sfx((id, x) => ctx.cue(id, x));
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {E.shots.map((s) => (
        <Scene key={s.id} ctx={ctx} id={s.id} t={t} trans={s.trans} zoom={s.zoom}>{() => (<>
          <Stage W={W} H={H} color={s.color} t={t} burst={s.burst} />
          {s.body(t, (c) => ctx.cue(s.id, c))}
        </>)}</Scene>
      ))}
      <Floor W={W} y={FLOOR_Y} H={H} />
      <Pair ctx={ctx} t={t} react={E.react} />
      <Bubble ctx={ctx} t={t} y={BUBBLE_Y} tails={{ 태진: TJ_X + 40, 옥자: OK_X - 40 }} W={W} />
      <Chip W={W} text="티제이 김 컬렉션 · 삐라" />
      <Grain seed={7} />
      <Audio src={staticFile(`narration_${ep}.wav`)} />
      {TL.art.includes("bgm") && <Audio src={staticFile(`bgm_${ep}.wav`)} volume={(f) => 0.16 * Math.min(1, f / 15) * Math.min(1, (TL.duration * 30 - f) / 45)} />}
      {cues.map(([s, f, v], i) => Number.isFinite(s) && s >= 0 && (
        <Sequence key={i} from={Math.round(s * fps)} durationInFrames={Math.round(2.5 * fps)}><Audio src={staticFile(`sfx/${f}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  );
};

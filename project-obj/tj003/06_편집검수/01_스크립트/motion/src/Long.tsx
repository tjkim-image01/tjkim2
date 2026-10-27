// tj003 롱폼 「스코틀랜드에 '코리아 하우스'가 있었다」 16:9 — 실물 뒷면이 주인공, 캐릭터는 모서리 반응 컷
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, FONT_H, FONT_T, TLS, clamp01, mk, pop, ramp, sp } from "./lib";
import { Card, Counter, Ctx, Grain, Grid, HandReveal, Morph, PartTitle, Pill, Reaction, Route, Scene, SfxTrack, Stage, Stamp, Subtitle, Svg, YearLine, Translate, Txt } from "./kit";

const W = 1920, H = 1080;
const TL = TLS.long;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const P = (s: string) => `postcards/${s}`, K = (s: string) => `cut/${s}`;
const ALBUM = ["APKC230615122CC_1.jpg", "APKC230615122A_1.jpg", "APKC230615122HH_1.jpg", "APKC230615122B_1.jpg", "APKC230615122TA_1.jpg", "APKC230615122EE_2.jpg", "APKC230615122GG_1.jpg", "APKC230615122NN_2.jpg",
  "APKC230615122I_1.jpg", "AP20130215008_1.jpg", "APAC170923151_1.jpg", "APAC151211986_2.jpg", "APAC241006194A_1.jpg", "APAC241006194B_1.jpg", "APAC241006196A_1.jpg", "APAC231209245B1_1.jpg",
  "APKC230615122CC_2.jpg", "APKC230615122A_2.jpg", "APKC230615122HH_2.jpg", "APKC230615122B_2.jpg", "APKC230615122TA_2.jpg", "APKC230615122EE_1.jpg", "APAC241006195B_1.jpg", "APAC231209245B2_1.jpg"];
const YEARS: [string, string][] = [["1887", "도쿄"], ["1902", "제물포"], ["1914", "서울"], ["1927", "켈소"], ["1937", "엽서"]];
/** 효과음: [숏, 큐, 이름, 볼륨] — 도장 stamp · 엽서 착지 thud · 뒤집기 flutter · 선 그리기 whoosh · 숫자 ding · 강조 boom/pop */
const SFX_DEF: [string, number | string, string, number?][] = [
  ["P0-I1", 0.05, "pop"], ["P0-I1", 1.4, "pop"], ["P0-I1", 2.6, "pop"], ["P0-I1", 3.6, "whoosh", 0.3], ["P0-I1", 3.9, "thud"], ["P0-I2", "하린:스코틀랜드", "boing", 0.4],
  ["P1-A1", 0.1, "thud"], ["P1-A2", "태진:소인", "flutter"], ["P1-A2", "태진:다이쇼", "stamp"], ["P1-A2", "태진:서울", "whoosh", 0.3],
  ["P1-A3", "태진:", "whoosh", 0.3], ["P1-A3", "태진:이때", "ding", 0.4],
  ["P2-B1", "태진:", "whoosh", 0.3], ["P2-B1", "태진:한국에서", "ding", 0.4], ["P2-B2", "태진:", "flutter"], ["P2-B2", "태진:영국공사관", "thud"], ["P2-B2", "태진:타이타닉", "thud"], ["P2-B2", "태진:천구백이십오", "thud"],
  ["P3-C1", "하린:", "flutter"], ["P3-C1", "태진:육백오십", "ding", 0.4], ["P3-C2", 0, "thud"], ["P3-C2", "태진:이백", "boom", 0.5],
  ["P3-C3", 0, "thud"], ["P3-C4", 0, "thud"], ["P3-C4", "태진:피해액", "whoosh", 0.3],
  ["P4-D1", "하린:런던", "stamp"], ["P4-D1", "태진:천구백이십칠", "pop", 0.4], ["P4-D2", 0.2, "whoosh", 0.3], ["P4-D2", "태진:이때", "ding", 0.4],
  ["P4-D3", "태진:", "whoosh", 0.3], ["P4-D4", "태진:", "whoosh", 0.3], ["P4-D5", "태진:천구백삼십칠", "pop", 0.4],
  ["P4-D6", "태진:하나는", "stamp"], ["P4-D6", "태진:한국", "stamp"], ["P4-D7", "하린:", "pop", 0.4],
  ["P5-E1", 0, "thud"], ["P5-E1", "태진:시베리아", "whoosh", 0.3], ["P5-E2", "태진:", "boom", 0.5],
  ["P6-F1", 0, "flutter"], ["P6-F2", "태진:다음엔", "thud"], ["P6-F2", "태진:천구백사십오", "thud"],
];
const SFX: [number, string, number?][] = SFX_DEF.map(([id, c, name, v]) => [ctx.cue(id, c), name, v]);

const Shot: React.FC<{ t: number; id: string; first?: boolean; color?: string; seed?: number; children: (t: number, c: (c: number | string) => number) => React.ReactNode }> = ({ t, id, first, color, seed = 1, children }) => (
  <Scene ctx={ctx} id={id} t={t} first={first}>{() => (<>
    <Stage color={color} seed={seed} />
    {children(t, (c) => ctx.cue(id, c))}
  </>)}</Scene>
);
const Stripe: React.FC<{ y: number; w: number; p: number; text: string; pct: number }> = ({ y, w, p, text, pct }) => (
  <g opacity={clamp01(p)}>
    <rect x={960 - w / 2} y={y} width={w} height={44} rx={8} fill="rgba(28,28,28,0.12)" />
    <rect x={960 - w / 2} y={y} width={w * pct * clamp01(p)} height={44} rx={8} fill={C.red} />
    <text x={960 - w / 2} y={y - 18} fontFamily={FONT} fontWeight={700} fontSize={30} fill={C.ink2}>{text}</text>
    <text x={960 - w / 2 + w * pct * clamp01(p) + 16} y={y + 33} fontFamily={FONT_T} fontWeight={800} fontSize={40} fill={C.red}>{Math.round(pct * 100 * clamp01(p))}%</text>
  </g>
);

export const Long: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const hasBgm = (TL as unknown as { bgm?: boolean }).bgm;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {/* ───── P0 훅: 애플식 오프닝 — 워드마크 → 알약 → 원 → 엽서 */}
      <Shot t={t} id="P0-I1" first>{(t, c) => (<>
        <Morph t={t} x={960} y={500} keys={[{ at: 0, w: 900, h: 220, r: 30, fill: C.ink }, { at: 1.4, w: 520, h: 100, r: 50 }, { at: 2.6, w: 130, h: 130, r: 65, fill: C.red }, { at: 3.6, w: 1040, h: 680, r: 10, fill: C.cream2 }]}>
          <span style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: 92, color: C.cream2, opacity: 1 - ramp(t, 1.2, 0.3), whiteSpace: "nowrap" }}>뒷면 읽어 드립니다.</span>
        </Morph>
        <Card src={P("APKC230615122GG_1.jpg")} x={960} y={500} w={1000} h={640} p={sp(t, 3.9)} kb={ramp(t, 3.9, 8)} focus={[0.78, 0.62]} t={t} />
        <Svg W={W} H={H}>
          <Pill x={960} y={930} text="오늘은 뒷면만 — 주소 하나부터" size={44} p={pop(t, c("태진:"))} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P0-I2">{(t, c) => (<>
        <Card src={P("APKC230615122GG_1.jpg")} x={960} y={460} w={1300} h={830} p={1} kb={0.6 + 0.4 * ramp(t, 0, 6)} focus={[0.82, 0.68]} t={t} />
        <Svg W={W} H={H}>
          <Pill x={960} y={930} text="“Korea House”, Kelso, Scotland" size={54} p={pop(t, c("하린:"))} font={FONT_H} fill={C.blue} />
          <Txt x={1560} y={300} size={220} fill={C.red} p={pop(t, c("하린:스코틀랜드"))}>?</Txt>
          <Pill x={960} y={1010} text="그 집 주인을 알려면 → 1914년 서울" size={40} p={pop(t, c("태진:"))} fill={C.red} />
        </Svg>
      </>)}</Shot>

      {/* ───── P1 1914, 기념 소인 */}
      <Shot t={t} id="P1-A1" color="#DCE7EE">{(t, c) => (<>
        <Card src={P("APKC230615122EE_2.jpg")} x={960} y={480} w={1180} h={760} p={sp(t, 0.1)} kb={ramp(t, 0.1, 8)} t={t} />
        <Svg W={W} H={H}>
          <Pill x={960} y={930} text="원산 · 내금강 장안사" size={46} p={pop(t, c("태진:원산"))} />
          <Pill x={960} y={1010} text="조선총독부 철도국 · 경원선 전통 기념 엽서" size={40} p={pop(t, c("태진:조선총독부"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P1-A2" color="#DCE7EE">{(t, c) => (<>
        <Card src={P("APKC230615122EE_2.jpg")} back={P("APKC230615122EE_1.jpg")} x={700} y={520} w={1100} h={720} p={1} flip={ramp(t, c("태진:소인"), 0.9)} kb={0.3} t={t} />
        <Svg W={W} H={H}>
          <Route pts={[[1330, 760, "용산"], [1380, 620, "의정부"], [1440, 480, "철원"], [1540, 360, "원산"]]} p={ramp(t, c("태진:서울"), 2.4)} size={34} />
          <Pill x={1300} y={880} text="1911 용산~의정부 → 1914. 8 전 구간" size={32} p={pop(t, c("태진:천구백십일"))} />
          <Txt x={1420} y={230} size={80} fill={C.red} p={pop(t, c("태진:다이쇼"))}>1914. 9. 16</Txt>
        </Svg>
        <Stamp src={K("ee_postmark.jpg")} x={1060} y={300} w={300} p={pop(t, c("태진:다이쇼") + 0.1, 30, 10)} rot={-8} />
      </>)}</Shot>
      <Shot t={t} id="P1-A3" color="#DCE7EE">{(t, c) => (<>
        <HandReveal src={K("ee_address.jpg")} x={700} y={430} w={1040} h={520} lines={3} p={ramp(t, c("태진:"), 3.2)} />
        <Translate x={790} y={740} w={880} en="Master Arthur Hyde Lay, British Consulate General, Keijo" ko="아서 하이드 레이 도련님, 영국 총영사관, 경성" p={pop(t, c("태진:마스터"))} size={36} />
        <Svg W={W} H={H}>
          <Pill x={1540} y={300} text="'Master' = 소년 호칭" size={40} p={pop(t, c("태진:마스터는"))} />
          <Txt x={1540} y={470} size={150} fill={C.red} p={pop(t, c("태진:이때"))}>14세</Txt>
          <Pill x={1540} y={620} text="1914. 1 아버지, 총영사로 서울 부임" size={36} p={pop(t, c("태진2:"))} fill={C.red} />
          <Pill x={1540} y={700} text="아서 하이드 레이 · 제물포 영사 10년" size={34} p={pop(t, c("태진2:아서"))} />
        </Svg>
      </>)}</Shot>

      {/* ───── P2 하이드 레이 집안 */}
      <Shot t={t} id="P2-B1">{(t, c) => { const a = t >= c("태진:천구백십사") ? 2 : t >= c("태진:천구백이") ? 1 : t >= c("태진:천팔백팔십칠") ? 0 : -1; return (<>
        <Svg W={W} H={H}>
          <YearLine x={960} y={420} w={1400} years={YEARS} active={a} p={ramp(t, c("태진:"), 0.6)} size={46} />
          <Txt x={960} y={720} size={120} fill={C.red} p={pop(t, c("태진:한국에서"))}>한국에서 25년</Txt>
          <Pill x={960} y={860} text="중국 출생 → 1887 도쿄 영국공사관 통역생" size={36} p={pop(t, c("태진:천팔백팔십칠"))} />
        </Svg>
      </>); }}</Shot>
      <Shot t={t} id="P2-B2">{(t, c) => (<>
        <Grid srcs={ALBUM.slice(0, 20).map(P)} cx={960} cy={470} cols={5} cw={300} ch={200} gap={16} p={ramp(t, c("태진:"), 2.6)} t={t} o={1 - 0.6 * ramp(t, c("태진:영국공사관"), 0.6)} />
        <Card src={P("APKC230615122CC_1.jpg")} x={560} y={480} w={360} h={540} fit="contain" rot={-4} p={pop(t, c("태진:영국공사관"))} t={t} label="영국공사관" />
        <Card src={P("APKC230615122A_1.jpg")} x={960} y={480} w={520} h={340} rot={2} p={pop(t, c("태진:타이타닉"))} t={t + 1} label="타이타닉 · 1912" />
        <Card src={P("APKC230615122HH_1.jpg")} x={1380} y={480} w={360} h={470} fit="contain" rot={5} p={pop(t, c("태진:천구백이십오"))} t={t + 2} label="대관식 15주년 · 1925" />
        <Svg W={W} H={H}><Pill x={960} y={920} text="앨범 40장 · 수신인이 적힌 3장이 모두 하이드 레이" size={40} p={pop(t, c("태진:이"))} fill={C.red} /></Svg>
      </>)}</Shot>
      <Shot t={t} id="P2-B3">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Txt x={960} y={330} size={84} fill={C.ink} p={pop(t, c("태진:"))} font={FONT_H}>“great ability, courtesy and tact”</Txt>
          <Pill x={960} y={430} text="능력 · 예의 · 재치 — 1909 서울 영자신문" size={40} p={pop(t, c("태진:능력"))} />
          <Pill x={700} y={640} text="테니스에 진심" size={48} p={pop(t, c("태진:테니스"))} fill={C.red} />
          <Pill x={1220} y={640} text="가든파티의 주인공, 매리언" size={48} p={pop(t, c("태진:아내"))} fill={C.red} />
        </Svg>
      </>)}</Shot>

      {/* ───── P3 1925, 한 시간에 200채 */}
      <Shot t={t} id="P3-C1" color={C.paper} seed={3}>{(t, c) => (<>
        <Grid srcs={[1, 2, 3, 4, 5, 6].map((i) => K(`flood_photo_${i}.jpg`))} cx={960} cy={460} cols={3} cw={440} ch={290} gap={18} p={ramp(t, c("하린:"), 1.8)} t={t} />
        <Svg W={W} H={H}>
          <Pill x={720} y={880} text="1925 을축년 대홍수 · 7. 16~18" size={44} p={pop(t, c("태진:"))} fill={C.red} />
          <Counter x={1330} y={905} to={650} p={ramp(t, c("태진:육백오십"), 1.2)} size={96} suffix="mm" />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P3-C2" color={C.paper} seed={3}>{(t, c) => (<>
        <Card src={K("flood_photo_1.jpg")} x={430} y={430} w={660} h={440} p={sp(t, 0)} kb={ramp(t, 0, 8)} t={t} />
        <HandReveal src={K("flood_note_1.jpg")} x={1300} y={400} w={900} h={600} lines={8} p={ramp(t, c("태진:"), 5)} />
        <Translate x={1300} y={740} w={900} ko="조선 집 한 채가 떠내려간다. 강에서 100피트 높이 여름 별장에서, 게일 부인은 한 시간 동안 집 200채가 떠내려가는 것을 셌다." p={pop(t, c("태진:강에서"))} size={34} />
        <Svg W={W} H={H}><Counter x={560} y={830} to={200} p={ramp(t, c("태진:이백"), 1.2)} size={170} suffix="채" /><Txt x={560} y={900} size={38} fill={C.ink2} p={pop(t, c("태진:이백"))} font={FONT}>한 시간 동안</Txt></Svg>
      </>)}</Shot>
      <Shot t={t} id="P3-C3" color={C.paper} seed={3}>{(t, c) => (<>
        <Card src={K("flood_photo_2.jpg")} x={400} y={300} w={600} h={400} rot={-2} p={sp(t, 0)} t={t} />
        <Card src={K("flood_photo_4.jpg")} x={430} y={720} w={600} h={400} rot={2} p={sp(t, c("태진:당신이"))} t={t + 1} />
        <HandReveal src={K("flood_note_4.jpg")} x={1300} y={330} w={860} h={560} lines={9} p={ramp(t, c("태진:"), 6)} />
        <Translate x={1260} y={640} w={860} en="where you had so often motored down with us" ko="당신이 우리와 자주 차를 타고 영등포 가던 그 큰 용산 길 — 영등포 사람들은 언덕 꼭대기로 피난했다" p={pop(t, c("태진:당신이"))} size={30} />
        <Svg W={W} H={H}><Pill x={960} y={130} text="받는 사람은 서울을 떠난 사람" size={40} p={pop(t, c("하린:"))} fill={C.red} /></Svg>
      </>)}</Shot>
      <Shot t={t} id="P3-C4" color={C.paper} seed={3}>{(t, c) => (<>
        <Card src={K("flood_photo_6.jpg")} x={560} y={420} w={900} h={600} p={sp(t, 0)} kb={ramp(t, 0, 8)} t={t} />
        <HandReveal src={K("flood_note_6.jpg")} x={1400} y={330} w={760} h={500} lines={5} p={ramp(t, c("태진:마지막"), 3)} />
        <Translate x={1400} y={620} w={760} ko="지난달 홍수 뒤 한강 위 우리 철교" p={pop(t, c("태진:지난달"))} size={34} />
        <Svg W={W} H={H}>
          <Stripe y={780} w={1150} p={ramp(t, c("태진:피해액"), 1.4)} text="피해액 1억 300만 원 = 조선총독부 1년 예산" pct={0.58} />
          <Pill x={960} y={910} text="Mrs. Gale = 제임스 게일(성서 번역 · 한영자전) 부인으로 추정 · 1927 같은 해에 떠남" size={30} p={pop(t, c("태진2:"))} />
        </Svg>
      </>)}</Shot>

      {/* ───── P4 1937, 런던에서 온 엽서 */}
      <Shot t={t} id="P4-D1">{(t, c) => (<>
        <Card src={P("APKC230615122GG_1.jpg")} x={700} y={470} w={1200} h={770} p={sp(t, 0)} kb={ramp(t, 0, 8)} focus={[0.7, 0.3]} t={t} />
        <Stamp src={K("gg_postmark.jpg")} x={1420} y={230} w={400} p={pop(t, c("하린:런던"), 30, 10)} rot={-5} />
        <Svg W={W} H={H}>
          <Txt x={1420} y={430} size={76} fill={C.red} p={pop(t, c("하린:천구백삼십칠"))}>1937. 7. 10</Txt>
          <Pill x={1380} y={530} text="Mrs Arthur Hyde Lay, “Korea House”, Kelso" size={30} p={pop(t, c("태진:받는"))} font={FONT_H} fill={C.blue} />
          <Pill x={1380} y={620} text="1927 은퇴 → 집 이름 'Korea House'" size={36} p={pop(t, c("태진:천구백이십칠"))} fill={C.red} />
          <Txt x={1380} y={720} size={50} fill={C.ink} p={pop(t, c("태진:가장"))} font={FONT_H}>“best and happiest years”</Txt>
          <Pill x={1300} y={880} text="가장 좋고 행복한 시절을 한국에서" size={34} p={pop(t, c("태진:가장"))} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D2">{(t, c) => (<>
        <HandReveal src={K("gg_front_rot.jpg")} x={620} y={470} w={1000} h={620} lines={8} p={ramp(t, 0.2, 5)} />
        <Translate x={760} y={800} w={860} en="Gratefully, Rosetta S. Hall" ko="감사를 담아, 로제타 S. 홀" p={pop(t, c("태진:"))} size={40} />
        <Svg W={W} H={H}>
          <Pill x={1480} y={300} text="1890 조선에 온 여의사" size={40} p={pop(t, c("태진:천팔백구십"))} />
          <Pill x={1480} y={400} text="1909 평양 농아학교" size={40} p={pop(t, c("태진:평양"))} />
          <Pill x={1480} y={500} text="1928 조선여자의학강습소" size={40} p={pop(t, c("태진:조선여자"))} />
          <Pill x={1480} y={600} text="1933 은퇴" size={40} p={pop(t, c("태진:천구백삼십삼"))} />
          <Txt x={1480} y={860} size={170} fill={C.red} p={pop(t, c("태진:이때"))}>71세</Txt>
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D3">{(t, c) => (<>
        <HandReveal src={K("gg_back_rot.jpg")} x={640} y={520} w={600} h={930} lines={14} p={ramp(t, c("태진:"), 9)} />
        <Translate x={1380} y={200} w={820} en="Yours of 8th already rec'd here! Thank you so much —" ko="8일자 편지 벌써 받았어요! 정말 고마워요. 제 친구가 기꺼이 갈 거예요." p={pop(t, c("태진:팔일자"))} size={32} />
        <Translate x={1380} y={470} w={820} en="off for a “garden party” at Dr. Martindale's country residence in Sussex" ko="지금 서식스의 마틴데일 박사 시골집 가든파티로 — 거기서 다른 대표들을 만나요" p={pop(t, c("태진:우린"))} size={32} />
      </>)}</Shot>
      <Shot t={t} id="P4-D4">{(t, c) => (<>
        <HandReveal src={K("gg_back_rot.jpg")} x={640} y={520} w={600} h={930} lines={14} p={1} pen={false} />
        <Svg W={W} H={H}>
          <Route pts={[[1180, 660, "런던"], [1110, 740, "서식스"], [1320, 460, "엡워스"], [1440, 230, "에든버러"]]} p={ramp(t, c("태진:"), 3.2)} size={36} />
          <Pill x={1300} y={880} text="화요일 7:25 출발 → 엡워스 → 에든버러" size={32} p={pop(t, c("태진:화요일"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D5">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Txt x={960} y={300} size={92} fill={C.ink} p={pop(t, c("태진:"))}>국제여의사회(MWIA) 4차 대회</Txt>
          <Txt x={960} y={420} size={110} fill={C.red} p={pop(t, c("태진:천구백삼십칠"))}>에든버러 1937. 7. 13~18</Txt>
          <Pill x={960} y={560} text="루이자 마틴데일 — 1937년 회장" size={42} p={pop(t, c("태진:마틴데일"))} />
          <Pill x={960} y={660} text="로제타 홀, 대표로 참석(추정)" size={42} p={pop(t, c("태진:로제타"))} />
          <Pill x={960} y={760} text="엡워스 = 감리교 창시자 웨슬리의 고향" size={40} p={pop(t, c("태진:엡워스"))} fill={C.red} />
          <Txt x={960} y={890} size={48} fill={C.ink2} p={pop(t, c("하린:"))} font={FONT}>71세, 대회 가는 길에 옛 서울 이웃에게</Txt>
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D6">{(t, c) => (<>
        <Card src={P("APKC230615122GG_1.jpg")} x={960} y={500} w={1300} h={830} p={1} kb={0.8} focus={[0.5, 0.65]} t={t} o={0.45} />
        <Stamp src={K("gg_seal_pax.jpg")} x={640} y={470} w={380} p={pop(t, c("태진:하나는"), 30, 10)} rot={-4} />
        <Stamp src={K("gg_seal_xmas.jpg")} x={1280} y={470} w={360} p={pop(t, c("태진:한국"), 30, 10)} rot={4} />
        <Svg W={W} H={H}>
          <Pill x={640} y={760} text="PAX — 국제여성평화자유연맹" size={36} p={pop(t, c("태진:국제"))} />
          <Pill x={1280} y={760} text="한국 크리스마스 씰 1936–37 · 연날리기" size={36} p={pop(t, c("태진:한국"))} fill={C.red} />
          <Txt x={1280} y={880} size={64} fill={C.blue} p={pop(t, c("태진:옆에"))} font={FONT_H}>“In Pagoda Park”</Txt>
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D7">{(t, c) => (<>
        <Stamp src={K("gg_seal_xmas.jpg")} x={560} y={500} w={520} p={1} rot={0} />
        <Svg W={W} H={H}>
          <Pill x={1300} y={300} text="이 씰을 만든 사람 — 아들 셔우드 홀" size={44} p={pop(t, c("태진:"))} />
          <Pill x={1300} y={420} text="1932 한국 최초 크리스마스 씰 · 해주 결핵요양원" size={36} p={pop(t, c("태진:천구백삼십이"))} fill={C.red} />
          <g opacity={pop(t, c("하린:"))}>
            <rect x={1000} y={600} width={280} height={110} rx={55} fill={C.ink} /><text x={1140} y={670} textAnchor="middle" fontFamily={FONT_T} fontWeight={800} fontSize={44} fill={C.cream2}>로제타 홀</text>
            <line x1={1280} y1={655} x2={1360} y2={655} stroke={C.red} strokeWidth={6} strokeDasharray="12 10" />
            <rect x={1360} y={600} width={280} height={110} rx={55} fill={C.red} /><text x={1500} y={670} textAnchor="middle" fontFamily={FONT_T} fontWeight={800} fontSize={44} fill={C.cream2}>셔우드 홀</text>
          </g>
          <Txt x={1200} y={860} size={50} fill={C.ink2} p={pop(t, c("하린:일흔하나"))} font={FONT}>아들이 만든 씰을 들고 다니며 — 71세, 런던에서</Txt>
        </Svg>
      </>)}</Shot>

      {/* ───── P5 코리아 하우스 */}
      <Shot t={t} id="P5-E1">{(t, c) => (<>
        <Card src={K("nn_card.jpg")} x={620} y={480} w={900} h={570} p={sp(t, 0)} kb={ramp(t, 0, 8)} focus={[0.75, 0.5]} t={t} />
        <Svg W={W} H={H}>
          <Txt x={1420} y={300} size={80} fill={C.blue} p={pop(t, c("태진:비아"))} font={FONT_H}>“Via Siberia”</Txt>
          <Route pts={[[1180, 620, "일본"], [1300, 470, "블라디보스토크"], [1500, 400, "모스크바"], [1700, 560, "켈소"]]} p={ramp(t, c("태진:시베리아"), 2.6)} size={30} />
          <Pill x={1250} y={880} text="조선을 떠난 사람들이 모두 'Korea House'로" size={34} p={pop(t, c("하린:"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P5-E2" color={C.ink} seed={5}>{(t, c) => (<>
        <Svg W={W} H={H}>
          <Txt x={960} y={470} size={200} fill={C.cream2} p={pop(t, c("태진:"))}>Korea House</Txt>
          <Txt x={960} y={580} size={54} fill={C.red} p={pop(t, c("태진:") + 0.4)}>Kelso, Scotland · 1927</Txt>
          <Txt x={960} y={800} size={48} fill="rgba(251,246,234,0.8)" p={pop(t, c("태진:나라"))} font={FONT}>나라 이름이 '조선'으로 지워진 시절 — 그 집은 Korea였다</Txt>
        </Svg>
      </>)}</Shot>

      {/* ───── P6 정리 */}
      <Shot t={t} id="P6-F1" color={C.ink} seed={5}>{(t, c) => (<>
        <Grid srcs={ALBUM.map(P)} cx={960} cy={470} cols={8} cw={210} ch={140} gap={14} p={ramp(t, 0, 2.4)} t={t} o={0.55} />
        <Svg W={W} H={H}><Txt x={960} y={900} size={100} fill={C.cream2} p={pop(t, c("하린:"))}>앞면은 풍경, 뒷면은 사람</Txt></Svg>
      </>)}</Shot>
      <Shot t={t} id="P6-F2" color={C.ink} seed={5}>{(t, c) => (<>
        <Svg W={W} H={H}>
          <Txt x={960} y={250} size={64} fill={C.cream2} p={pop(t, c("태진:"))}>TJ Kim Collection · 앨범 40장</Txt>
        </Svg>
        <Card src={P("APAC241006194A_1.jpg")} x={640} y={560} w={560} h={370} rot={-4} p={pop(t, c("태진:다음엔"))} t={t} label="날지 못한 비행기 · 1910" />
        <Card src={P("APAC231209245B2_2.jpg")} x={1280} y={560} w={560} h={350} rot={3} p={pop(t, c("태진:천구백사십오"))} t={t + 1} label="“내일 주소 보낼게” · 1945" />
        <Svg W={W} H={H}><Txt x={960} y={930} size={72} fill={C.red} p={pop(t, c("하린:"))}>「뒷면 읽어 드립니다」 쇼츠로 계속</Txt></Svg>
      </>)}</Shot>

      <Reaction ctx={ctx} t={t} lx={175} rx={1745} y={1088} h={320} />
      <Grain seed={3} />
      <PartTitle ctx={ctx} t={t} />
      <Subtitle ctx={ctx} t={t} maxW={1180} />
      <Audio src={staticFile("narration_long.wav")} />
      {hasBgm && <Audio src={staticFile("bgm.wav")} volume={0.15} loop />}
      <SfxTrack events={SFX} fps={fps} />
    </AbsoluteFill>
  );
};

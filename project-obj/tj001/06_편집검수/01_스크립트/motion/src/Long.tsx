// tj001 롱폼 「황제 얼굴이 왜 엽서에?」 16:9 — 그림판(왼쪽) + 실물 엽서(오른쪽) + 두 캐릭터 + 대사 자막
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, TLS, clamp01, mk, pop, ramp } from "./lib";
import { Card, Ctx, Duo, Grain, Label, PartTitle, Plate, Postmark, Scene, Seal, Sprite, Subtitle, Svg, Txt, Wall } from "./kit";

const W = 1920, H = 1080;
const TL = TLS.long;
const ctx: Ctx = { TL, W, H, ...mk(TL) };
const RX = 1400;   // 오른쪽 빈 공간 중심
const duo = (t: number, hide?: boolean) => <Duo ctx={ctx} t={t} lx={300} rx={640} y={1010} h={400} hide={hide} />;

/** 숏 하나 = 그림판 + 내용. zoom 은 장면 안에서 천천히 미는 정도 */
const Shot: React.FC<{ t: number; id: string; plate: string; first?: boolean; zoom?: [number, number]; children: (t: number, c: (c: number | string) => number) => React.ReactNode }> = ({ t, id, plate, first, zoom, children }) => (
  <Scene ctx={ctx} id={id} t={t} first={first} zoom={zoom}>
    {() => (<>
      <Plate name={plate} W={W} H={H} />
      {children(t, (c) => ctx.cue(id, c))}
    </>)}
  </Scene>
);

const EMP = ["AP20130215008_1.jpg", "AP20130215008_2.jpg"];
const PARIS = ["APAC190101059_1.jpg", "APAC190101059_2.jpg", "APAC190101059_3.jpg", "APAC190101059_4.jpg"];
const PILE = ["APKC240608094_1.jpg", "APKC240606093_3.jpg", "APKC240614118_4.jpg", "APKC240608098_2.jpg", "APKC230615122A_1.jpg", "APKC240601087_1.jpg", "APKC240608102_4.jpg", "APKC240612115_2.jpg"];
const SET = ["APKC260209026_1.jpg", "APKC260209026_2.jpg", "APKC240614118_2.jpg", "APKC240614118_4.jpg", "APKC240612115_2.jpg", "APKC240608098_2.jpg", "APKC240608094_1.jpg", "APKC240608100_2.jpg", "APKC240606093_2.jpg", "APKC240611114_1.jpg"];
const PLACES: [string, string][] = [["APKC180111001_1.jpg", "경성 명월관 · 1935?"], ["APKC160708059A_1.jpg", "금강산 외금강 · 1930"], ["APKC180111002_1.jpg", "경주 명소 · 1930s"], ["APAC200929130_1.jpg", "평양 을밀대"], ["APAC260302123_1.jpg", "부산 세관"], ["APKC230615122F_1.jpg", "인천"]];
const DONKEY = ["APKC230615122EE_2.jpg", "APKC230615122EE_1.jpg"];
const WALL = [...PILE, ...SET, ...PLACES.map((p) => p[0]), ...PARIS, ...EMP, ...DONKEY, "APKC230303039_1.jpg", "APKC240601087_1.jpg", "APKC240608097_2.jpg", "APKC240614118_3.jpg", "APAC160221109_1.jpg", "APKC230615122A_1.jpg", "AP20120217012_1.jpg", "APAC151211986_1.jpg"];

export const Long: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const part = TL.parts.find((p) => t >= p.start && t < p.end) ?? TL.parts[0];
  const inTitle = TL.parts.some((p) => p.title && t >= p.start && t < p.firstLine);
  const headerO = 0.9 * (inTitle ? 0 : ramp(t, part.firstLine - 0.2, 0.4));
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {/* ───── P0 훅 */}
      <Shot t={t} id="P0-I1" plate="INTRO" first zoom={[1.0, 1.06]}>{(t, c) => (<>
        {PILE.map((s, i) => <Card key={s} src={s} x={1180 + (i % 4) * 150 + (i > 3 ? 70 : 0)} y={330 + Math.floor(i / 4) * 210} w={300} rot={(i * 37) % 23 - 11} p={pop(t, c(0.2 + i * 0.12))} t={t + i} />)}
        <Svg W={W} H={H}><Label x={RX} y={820} text="엽서 1,000장+" size={74} p={pop(t, c("태진:천"))} fill={C.red} /></Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P0-I2" plate="INTRO" zoom={[1.0, 1.04]}>{(t, c) => (<>
        <Card src={EMP[0]} back={EMP[1]} x={RX} y={440} w={480} h={700} fit="contain" p={pop(t, c(0.1))} kb={ramp(t, c(0.1), 6)} flip={ramp(t, c("태진:근데"), 0.9)} t={t} label="H. M. The COREAN Emperor · 1900" />
        <Svg W={W} H={H}>
          <Label x={RX} y={890} text="POST CARD · JAPAN" size={50} p={pop(t, c("태진:포스트"))} />
          <Seal x={RX + 170} y={700} text="비매품" p={pop(t, c("태진:비매품"))} w={280} h={120} />
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P0-I3" plate="INTRO" zoom={[1.02, 1.0]}>{(t, c) => (<>
        <Card src={EMP[1]} x={RX} y={440} w={480} h={700} fit="contain" p={1} kb={0.4} t={t} />
        <Svg W={W} H={H}>
          <Seal x={RX + 170} y={700} text="비매품" p={1} w={280} h={120} />
          <Label x={RX} y={890} text="1865년, 독일 우체국으로" size={50} p={pop(t, c("태진:천팔백"))} fill={C.blue} />
        </Svg>
        {duo(t)}
      </>)}</Shot>

      {/* ───── P1 거절당한 아이디어 */}
      <Shot t={t} id="P1-A1" plate="P1_POST1865">{(t, c) => (<Svg W={W} H={H}>
        <Txt x={RX} y={300} size={200} fill="rgba(31,42,55,0.16)" p={1}>1865</Txt>
        <Label x={RX} y={470} text="독일 · 우편 관리 슈테판" size={48} p={pop(t, c("태진:독일"))} />
        <Label x={RX} y={600} text="편지를 봉투 없이 보내자" size={60} p={pop(t, c("태진:편지"))} fill={C.blue} />
        <Label x={RX} y={760} text="싸고 편하다 → 통과?" size={52} p={pop(t, c("하린:"))} />
      </Svg>)}</Shot>
      <Shot t={t} id="P1-A2" plate="P1_POST1865">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Txt x={RX} y={300} size={200} fill="rgba(31,42,55,0.16)" p={1}>1865</Txt>
          <Seal x={RX} y={450} text="거절" p={pop(t, c("태진:"))} w={420} h={170} />
          <Label x={RX} y={640} text="종이 낭비?" size={50} p={pop(t, c("하린:"))} fill={C.gray} />
          <Label x={RX} y={790} text="“남이 읽는다”" size={78} p={pop(t, c("태진2:남이"))} fill={C.red} />
          <Label x={RX} y={900} text="품위가 없다" size={46} p={pop(t, c("태진2:품위"))} />
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P1-A3" plate="P1_POST1865">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Label x={RX} y={260} text="완전 인스타 스토리잖아" size={56} p={pop(t, c("하린:"))} fill={C.red} />
          <Label x={RX - 70} y={430} text="1869. 10. 1 오스트리아" size={52} p={pop(t, c("태진:천팔백"))} fill={C.blue} />
          <Label x={RX} y={540} text="세계 최초의 엽서" size={52} p={pop(t, c("태진:세계"))} />
          <Postmark x={RX + 330} y={420} r={78} p={pop(t, c("태진:세계"))} text="1869" />
        </Svg>
        <Svg W={W} H={H}>
          {Array.from({ length: 36 }).map((_, i) => { const q = clamp01(ramp(t, c("태진:석"), 2.2) * 36 - i); return <rect key={i} x={RX - 330 + (i % 12) * 56} y={620 + Math.floor(i / 12) * 44} width={46} height={32} rx={3} fill="#E9D7A8" stroke="rgba(31,42,55,0.3)" opacity={q} />; })}
          <Label x={RX} y={870} text="석 달 만에 300만 장" size={70} p={pop(t, c("태진:석"))} fill={C.red} />
        </Svg>
      </>)}</Shot>

      {/* ───── P2 황금기 */}
      <Shot t={t} id="P2-B1" plate="P2_PARIS1900">{(t, c) => (<Svg W={W} H={H}>
        <Label x={RX} y={330} text="왜 그렇게 잘 팔렸어?" size={52} p={pop(t, c("하린:"))} fill={C.gray} />
        {["싸다", "빠르다", "짧다"].map((w, i) => <Label key={w} x={RX - 260 + i * 260} y={520} text={w} size={64} p={pop(t, c("태진:") + i * 0.35)} fill={i === 1 ? C.red : C.ink} />)}
        <Label x={RX} y={700} text="+ 사진이 올라탄다" size={60} p={pop(t, c("태진:그리고"))} fill={C.blue} />
      </Svg>)}</Shot>
      <Shot t={t} id="P2-B2" plate="P2_PARIS1900">{(t, c) => (<>
        {PARIS.map((s, i) => <Card key={s} src={s} x={RX - 240 + i * 160} y={430 + (i % 2) * 40} w={420} rot={-9 + i * 6} p={pop(t, c(0.2 + i * 0.3))} kb={ramp(t, c(0.2), 8)} t={t + i} />)}
        <Svg W={W} H={H}>
          <Label x={RX} y={780} text="Paris Exposition 1900 · 35장 세트" size={46} p={pop(t, c("태진:서른"))} />
          <Label x={RX} y={900} text="APAC190101059 · TJ Kim Collection" size={28} p={pop(t, c("태진:서른"))} fill={C.gray} bg="transparent" />
          <Label x={RX} y={260} text="색이 아직도 선명해" size={52} p={pop(t, c("하린:색이"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P2-B3" plate="P2_PARIS1900">{(t, c) => (<Svg W={W} H={H}>
        <Txt x={RX} y={300} size={150} fill={C.red} p={pop(t, c("태진:칠십"))}>70억 장</Txt>
        <Label x={RX} y={390} text="1905년 한 해 · 전 세계" size={44} p={pop(t, c("태진:칠십"))} />
        <Label x={RX} y={500} text="집집마다 엽서 앨범 = 요즘 폰 사진첩" size={46} p={pop(t, c("하린:"))} fill={C.blue} />
        <g opacity={pop(t, c("태진2:"))} transform={`translate(0,-50) translate(${RX},640) scale(0.85) translate(${-RX},-640)`}>
          <rect x={RX - 280} y={640} width={560} height={300} rx={6} fill={C.cream2} stroke="rgba(31,42,55,0.3)" strokeWidth={3} />
          <line x1={RX} y1={700} x2={RX} y2={920} stroke={C.ink} strokeWidth={3} strokeDasharray={`${260 * ramp(t, c("태진2:뒷면"), 0.8)} 400`} />
          <rect x={RX + 150} y={660} width={100} height={110} fill="none" stroke="rgba(31,42,55,0.5)" strokeDasharray="6 5" strokeWidth={2} />
          <text x={RX - 140} y={800} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={40} fill={C.blue} opacity={ramp(t, c("태진2:왼쪽"), 0.4)}>글</text>
          <text x={RX + 140} y={880} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={40} fill={C.blue} opacity={ramp(t, c("태진2:오른쪽"), 0.4)}>주소</text>
        </g>
        <Label x={RX} y={900} text="1907 뒷면 분할 → 앞면 전체가 사진" size={40} p={pop(t, c("태진2:그래서"))} fill={C.red} />
      </Svg>)}</Shot>

      {/* ───── P3 조선 1900 */}
      <Shot t={t} id="P3-C1" plate="P3_SEOUL1900">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Label x={RX} y={300} text="조선은?" size={80} p={pop(t, c("하린:"))} />
          <Label x={RX} y={480} text="1884 우정총국 · 우표 발행" size={52} p={pop(t, c("태진:천팔백"))} fill={C.blue} />
          <Label x={RX} y={620} text="갑신정변 → 21일 만에 중단" size={56} p={pop(t, c("태진:갑신"))} fill={C.red} />
          <Txt x={RX} y={880} size={190} fill="rgba(197,57,43,0.9)" p={pop(t, c("하린2:"))}>21일</Txt>
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P3-C2" plate="P3_SEOUL1900">{(t, c) => (<>
        <Card src="APKC240601087_1.jpg" x={RX + 180} y={420} w={480} h={700} fit="contain" rot={3} p={pop(t, c(0.1))} kb={ramp(t, c(0.1), 6)} t={t} label="조선우편배달부 · 1900s" />
        <Svg W={W} H={H}>
          <Label x={RX - 300} y={300} text="1900. 5. 10" size={76} p={pop(t, c("태진:천구백"))} fill={C.red} anchor="middle" />
          <Label x={RX - 300} y={420} text="대한제국 1전 우체엽서" size={44} p={pop(t, c("태진:일"))} />
          <Label x={RX - 300} y={520} text="오얏꽃 문양" size={40} p={pop(t, c("태진:오얏"))} fill={C.gold} />
          <Label x={RX} y={880} text="양반은 안 썼다 — 이유는?" size={50} p={pop(t, c("태진2:"))} fill={C.red} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P3-C3" plate="P3_SEOUL1900">{(t, c) => (<>
        <Svg W={W} H={H}>
          <Seal x={RX} y={300} text="정답" p={pop(t, c("태진:"))} w={300} h={140} color={C.blue} />
          <Label x={RX} y={470} text="1865 = 1900" size={80} p={pop(t, c("태진:천팔백"))} />
          <Label x={RX} y={620} text="먼저 쓴 사람: 상인 · 서민" size={56} p={pop(t, c("태진:대신"))} fill={C.blue} />
          <Label x={RX} y={740} text="싸고 빠른 게 더 급한 사람들" size={42} p={pop(t, c("태진:싸고"))} fill={C.gray} />
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P3-C4" plate="P3_SEOUL1900">{(t, c) => (<>
        <Card src="APKC230303039_1.jpg" x={RX - 170} y={480} w={520} rot={-5} p={pop(t, c(0.1))} kb={ramp(t, c(0.1), 6)} t={t} label="Korea Life and City Trade Cards · Paris" />
        <Card src={EMP[0]} x={RX + 230} y={500} w={300} h={440} fit="contain" rot={6} p={pop(t, c("하린:"))} t={t + 3} />
        <Svg W={W} H={H}>
          <Label x={RX} y={220} text="1900 파리 박람회 한국관" size={52} p={pop(t, c("태진:같은"))} fill={C.blue} />
          <Label x={RX} y={860} text="알레베크 사진엽서 48장 — 한국 최초" size={48} p={pop(t, c("태진:마흔"))} fill={C.red} />
        </Svg>
      </>)}</Shot>

      {/* ───── P4 봉투 속 열 장 */}
      <Shot t={t} id="P4-D1" plate="P4_SOUVENIR">{(t, c) => (<>
        {SET.map((s, i) => <Card key={s} src={s} x={RX - 330 + i * 72} y={430 + (i % 2) * 30} w={300} rot={-6 + i * 1.4} p={pop(t, c("태진:이거") + i * 0.14)} t={t + i} />)}
        <Svg W={W} H={H}>
          <Label x={RX} y={260} text="1910 → ‘조선풍속’ 세트" size={56} p={pop(t, c("태진:"))} fill={C.red} />
          <Label x={RX} y={700} text="봉투에 열 장" size={48} p={pop(t, c("태진:봉투"))} />
          <Label x={RX} y={860} text="기생 · 지게꾼 · 빨래터… 관광 기념품?" size={44} p={pop(t, c("하린:"))} fill={C.gray} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D2" plate="P4_SOUVENIR">{(t, c) => (<>
        {PLACES.map(([s, lb], i) => <Card key={s} src={s} x={RX - 300 + (i % 3) * 300} y={330 + Math.floor(i / 3) * 230} w={270} rot={(i % 2) * 4 - 2} p={pop(t, c(0.1) + i * 0.2)} t={t + i} label={lb} />)}
        <Svg W={W} H={H}>
          {[["조선풍속", 59, C.red], ["경성", 44, C.blue], ["금강산", 32, C.gold]].map(([n, v, col], i) => { const q = ramp(t, c("태진:쉰") + i * 0.5, 0.8); return (<g key={String(n)} opacity={pop(t, c("태진:쉰") + i * 0.5)}>
            <text x={RX - 330} y={720 + i * 70} fontFamily={FONT} fontWeight={800} fontSize={40} fill={String(col)}>{n}</text>
            <rect x={RX - 130} y={720 + i * 70 - 30} width={(Number(v) / 59) * 400 * q} height={38} rx={8} fill={String(col)} />
            <text x={RX - 120 + (Number(v) / 59) * 400 * q} y={720 + i * 70} fontFamily={FONT} fontWeight={800} fontSize={40} fill={String(col)}>{v}</text>
          </g>); })}
          <Label x={RX} y={905} text="내 컬렉션 제목에 나오는 횟수" size={30} p={pop(t, c("태진:쉰"))} fill={C.gray} bg="transparent" />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P4-D3" plate="P4_SOUVENIR">{(t, c) => (<>
        <Card src={SET[0]} x={RX} y={520} w={560} p={1} kb={ramp(t, c(0), 10)} t={t} />
        <Svg W={W} H={H}>
          <g opacity={pop(t, c("태진:조선을"))}>
            <path d={`M ${RX - 560} 330 Q ${RX - 300} 300 ${RX - 290} 400`} fill="none" stroke={C.red} strokeWidth={8} strokeLinecap="round" />
            <Label x={RX - 560} y={300} text="구경거리로 본 시선" size={44} fill={C.red} p={1} />
          </g>
          <g opacity={pop(t, c("태진:그리고"))}>
            <path d={`M ${RX + 420} 800 Q ${RX + 330} 770 ${RX + 290} 700`} fill="none" stroke={C.blue} strokeWidth={8} strokeLinecap="round" />
            <Label x={RX + 170} y={860} text="제 모습을 지키려는 시선" size={44} fill={C.blue} p={1} />
          </g>
          <Label x={RX} y={200} text="연구자 견해: 두 시선이 겹친다" size={48} p={pop(t, c("태진:"))} />
        </Svg>
      </>)}</Shot>

      {/* ───── P5 뒤집어 봐 */}
      <Shot t={t} id="P5-E1" plate="P5_BACKSIDE">{(t, c) => (<>
        <Card src={DONKEY[0]} back={DONKEY[1]} x={RX} y={500} w={760} p={pop(t, c(0.1))} kb={ramp(t, c(0.1), 5)} flip={ramp(t, c("태진:뒤집어"), 1.0)} t={t} label="원산 · 내금강 장안사 엽서 · Used with Stamp" />
        <Svg W={W} H={H}>
          <Label x={RX} y={200} text="진짜 재미는 뒷면" size={56} p={pop(t, c("태진:근데"))} fill={C.red} />
          <Label x={RX} y={900} text="우표 · 소인 · 손글씨" size={48} p={pop(t, c("하린:"))} />
        </Svg>
      </>)}</Shot>
      <Shot t={t} id="P5-E2" plate="P5_BACKSIDE" zoom={[1.0, 1.08]}>{(t, c) => (<>
        <Card src={DONKEY[1]} x={RX} y={500} w={760} p={1} kb={ramp(t, c(0), 8)} t={t} />
        <Svg W={W} H={H}>
          <Postmark x={RX + 250} y={330} r={80} p={pop(t, c("태진:일본"))} text="京城" />
          <Label x={RX - 200} y={240} text="경성 소인 · 영국 영사관으로 실제 배달" size={44} p={pop(t, c("태진:실제"))} />
          <Label x={RX} y={815} text="누가 · 어디서 · 누구한테" size={48} p={pop(t, c("태진:누가"))} fill={C.blue} />
          <Label x={RX} y={900} text="100년 전 ‘보내기’ 버튼 = DM" size={52} p={pop(t, c("하린:"))} fill={C.red} />
        </Svg>
        {duo(t)}
      </>)}</Shot>

      {/* ───── P6 정리 */}
      <Shot t={t} id="P6-O1" plate="P6_TODAY">{(t, c) => (<>
        <Card src={PARIS[0]} x={RX + 120} y={430} w={420} rot={4} p={pop(t, c("태진:"))} t={t} />
        <Svg W={W} H={H}>
          <Label x={RX} y={220} text="요즘은 아무도 안 보내잖아" size={50} p={pop(t, c("하린:"))} fill={C.gray} />
          <Label x={RX} y={660} text="종이는 사라졌지만" size={48} p={pop(t, c("태진:종이"))} />
          <Label x={RX} y={770} text="사진 한 장 + 한 줄 + 남 보라고 보내기" size={46} p={pop(t, c("태진:근데"))} fill={C.blue} />
          <Label x={RX} y={885} text="오늘도 열 번은 했을걸" size={54} p={pop(t, c("태진:너"))} fill={C.red} />
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P6-O2" plate="OUTRO" zoom={[1.08, 1.0]}>{(t, c) => (<>
        <Wall srcs={WALL} W={W} H={H} cols={8} p={ramp(t, c(0), 2.5)} t={t} dim={0.25} />
        <Svg W={W} H={H}>
          <Label x={960} y={500} text="다음 편: 하늘에서 떨어진 종이" size={66} p={pop(t, c("태진:하늘"))} fill={C.red} />
          <Label x={960} y={620} text="90장" size={120} p={pop(t, c("태진:구십"))} fill={C.red} />
        </Svg>
        {duo(t)}
      </>)}</Shot>
      <Shot t={t} id="P6-O3" plate="OUTRO" zoom={[1.0, 1.04]}>{(t, c) => (<>
        <Wall srcs={WALL} W={W} H={H} cols={8} p={1} t={t} dim={0.55} />
        <Svg W={W} H={H}>
          <rect x={360} y={250} width={1200} height={560} rx={16} fill="rgba(31,42,55,0.9)" opacity={pop(t, c(0))} />
          <Txt x={960} y={400} size={86} fill={C.cream2} p={pop(t, c(0.1))}>황제 얼굴이 왜 엽서에?</Txt>
          <Txt x={960} y={500} size={44} fill={C.gold} p={pop(t, c(0.4))} weight={700}>TJ Kim Collection · 엽서 367건 · 약 1,050장</Txt>
          <Txt x={960} y={640} size={56} fill={C.red} p={pop(t, c("하린:궁금"))}>구독 · 댓글로 맞혀 봐</Txt>
          <Txt x={960} y={760} size={24} fill={C.gray} p={pop(t, c(0.6))} weight={700}>컬렉션 수치는 2026-10-15 재고 시트 기준 · 연구자 해석은 한국민족문화대백과(오혜리, 2024) 등 인용</Txt>
        </Svg>
      </>)}</Shot>

      <Grain seed={3} />
      <div style={{ position: "absolute", left: 56, top: 44, fontFamily: FONT, fontWeight: 700, fontSize: 28, color: C.ink2, opacity: headerO, letterSpacing: 1 }}>{part.header}</div>
      <div style={{ position: "absolute", right: 56, top: 44, fontFamily: FONT, fontWeight: 800, fontSize: 26, color: C.red, opacity: headerO }}>TJ Kim Collection · 엽서</div>
      <PartTitle ctx={ctx} t={t} />
      <Subtitle ctx={ctx} t={t} />
      <Audio src={staticFile("narration_long.wav")} />
    </AbsoluteFill>
  );
};

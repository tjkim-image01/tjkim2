// tj003 쇼츠 9:16 — A 날지 못한 비행기 · B 내일 주소 보낼게 · C 한 시간에 200채
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT, FONT_H, FONT_T, TLS, clamp01, mk, pop, ramp, sp } from "./lib";
import { Card, Counter, Ctx, Grain, HandReveal, Morph, Pill, Reaction, Route, Scene, SfxTrack, Stage, Stamp, Subtitle, Svg, Translate, Txt, WHO } from "./kit";

const W = 1080, H = 1920, CX = 540;
const P = (s: string) => `postcards/${s}`, K = (s: string) => `cut/${s}`;
const SFX_DEF: Record<string, [string, number | string, string, number?][]> = {
  A: [["A-S01", 0, "thud"], ["A-S01", "하린:날개", "boing", 0.4], ["A-S02", 0, "thud"], ["A-S02", "태진:한", "stamp"], ["A-S03", 0, "thud"], ["A-S04", "태진:뒷면", "flutter"], ["A-S04", "태진:끝", "pop"], ["A-S05", "하린:", "boing", 0.4],
    ["A-S06", 0, "thud"], ["A-S06", "태진:이건", "thud"], ["A-S07", 0, "pop"], ["A-S07", 0.5, "whoosh", 0.3], ["A-S08", 0, "thud"], ["A-S08", "태진:앞면", "stamp"], ["A-S09", 0, "thud"], ["A-S10", 0, "whoosh", 0.3], ["A-S10", "태진:조선이", "boom", 0.5], ["A-S11", "하린:뒷면", "ding", 0.4]],
  B: [["B-S01", 0.2, "whoosh", 0.3], ["B-S02", "태진:", "stamp"], ["B-S03", "태진:", "whoosh", 0.3], ["B-S03", "태진:사랑", "pop"], ["B-S04", "하린:", "thud"], ["B-S05", "태진:", "flutter"], ["B-S05", "태진:소인", "stamp"], ["B-S06", "하린:", "boing", 0.4],
    ["B-S07", "태진:", "pop"], ["B-S07", "태진:칠", "whoosh", 0.3], ["B-S07", "태진:천구백사십오", "boom", 0.5], ["B-S08", "하린:육", "boom", 0.5], ["B-S09", 0, "thud"], ["B-S10", "하린:", "ding", 0.4]],
  C: [["C-S01", 0, "thud"], ["C-S02", 0, "thud"], ["C-S02", "태진:사흘", "ding", 0.4], ["C-S03", "태진:", "whoosh", 0.3], ["C-S04", "하린:", "boom", 0.5], ["C-S05", 0, "thud"], ["C-S05", "태진:당신이", "whoosh", 0.3], ["C-S06", "하린:", "pop"],
    ["C-S07", "태진:", "whoosh", 0.3], ["C-S07", "태진:오십팔", "ding", 0.4], ["C-S08", 0, "thud"], ["C-S08", "태진:", "whoosh", 0.3], ["C-S09", "하린:", "pop"], ["C-S10", "태진:스코틀랜드", "boom", 0.5]],
};

/** 한 줄 키네틱 자막(위쪽 자막 구역) */
const Kinetic: React.FC<{ ctx: Ctx; t: number; top: number }> = ({ ctx, t, top }) => {
  const l = ctx.TL.lines.find((x) => t >= x.start - 0.1 && t <= x.end + 0.3);
  if (!l) return null;
  const who = WHO[l.who];
  const chunks = l.sub.split(" / ").map((s) => s.trim()).filter(Boolean);
  const weights = chunks.map((x) => x.length + 2), sum = weights.reduce((a, b) => a + b, 0);
  const prog = clamp01((t - l.start) / Math.max(0.3, l.end - l.start)) * sum;
  let cum = 0, idx = chunks.length - 1;
  for (let i = 0; i < chunks.length; i++) { if (prog < cum + weights[i]) { idx = i; break; } cum += weights[i]; }
  const text = chunks[idx]; const size = text.length > 24 ? 46 : text.length > 14 ? 54 : 64;
  const o = Math.min(ramp(t, l.start - 0.1, 0.15), 1 - ramp(t, l.end + 0.15, 0.2));
  return (
    <div style={{ position: "absolute", left: 40, right: 40, top, textAlign: "center", opacity: o }}>
      <div style={{ display: "inline-block", background: who.color, color: C.cream2, fontFamily: FONT, fontWeight: 800, fontSize: 30, borderRadius: 999, padding: "6px 24px", marginBottom: 10 }}>{who.name}</div>
      <div style={{ display: "inline-block", maxWidth: 980, background: C.ink, borderRadius: 18, padding: `${size * 0.2}px ${size * 0.5}px` }}>
        <div style={{ fontFamily: FONT_T, fontWeight: 800, fontSize: size, lineHeight: 1.25, color: C.cream2, wordBreak: "keep-all" }}>{text}</div>
      </div>
    </div>
  );
};

export const Short: React.FC<{ ep: "A" | "B" | "C" }> = ({ ep }) => {
  const TL = TLS[ep];
  const ctx: Ctx = { TL, W, H, ...mk(TL) };
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const Shot: React.FC<{ id: string; first?: boolean; color?: string; seed?: number; children: (t: number, c: (c: number | string) => number) => React.ReactNode }> = ({ id, first, color, seed = 1, children }) => (
    <Scene ctx={ctx} id={id} t={t} first={first}>{() => (<><Stage color={color} seed={seed} />{children(t, (c) => ctx.cue(id, c))}</>)}</Scene>
  );
  const Y = 620;   // 위쪽 실물 영역 중심 (160~1100)
  const hasBgm = (TL as unknown as { bgm?: boolean }).bgm;
  return (
    <AbsoluteFill style={{ background: C.cream }}>
      {ep === "A" && (<>
        <Shot id="A-S01" first>{(t, c) => (<>
          <Card src={P("APAC241006194A_1.jpg")} x={CX} y={Y} w={960} h={620} p={sp(t, 0)} kb={ramp(t, 0, 6)} t={t} />
          <Svg W={W} H={H}><Txt x={CX} y={1080} size={150} fill={C.red} p={pop(t, c("하린:날개"))}>날개 수십 장</Txt></Svg>
        </>)}</Shot>
        <Shot id="A-S02">{(t, c) => (<>
          <Card src={P("APAC241006194B_1.jpg")} x={CX} y={Y} w={960} h={620} p={sp(t, 0)} kb={ramp(t, 0, 6)} t={t} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={1000} text="1908 데키비이 후작의 다익기 · 8마력" size={42} p={pop(t, c("태진:"))} />
            <Txt x={CX} y={1130} size={110} fill={C.red} p={pop(t, c("태진:한"))}>비행 기록 0회</Txt>
          </Svg>
        </>)}</Shot>
        <Shot id="A-S03">{(t, c) => (<>
          <Card src={P("APAC241006195B_1.jpg")} x={CX} y={Y} w={600} h={800} fit="contain" p={sp(t, 0)} t={t} />
          <Svg W={W} H={H}><Txt x={CX} y={1120} size={88} fill={C.ink} p={pop(t, c("하린:"))}>못 난 비행기를 엽서로?</Txt></Svg>
        </>)}</Shot>
        <Shot id="A-S04">{(t, c) => (<>
          <Card src={P("APAC241006194A_1.jpg")} back={P("APAC241006194A_2.jpg")} x={CX} y={Y} w={960} h={620} p={1} flip={ramp(t, c("태진:뒷면"), 0.9)} t={t} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={200} text="1910 프랑스 — 비행 열풍" size={42} p={pop(t, c("태진:"))} fill={C.red} />
            <Txt x={CX} y={1080} size={120} fill={C.blue} p={pop(t, c("태진:우정"))} font={FONT_H}>“Amitiés”</Txt>
            <Pill x={CX} y={1160} text="우정을 담아 — 끝." size={48} p={pop(t, c("태진:끝"))} />
          </Svg>
        </>)}</Shot>
        <Shot id="A-S05">{(t, c) => (<>
          <Card src={P("APAC241006194A_2.jpg")} x={CX} y={Y} w={960} h={620} p={1} kb={0.6} t={t} />
          <Svg W={W} H={H}><Txt x={CX} y={1100} size={160} fill={C.red} p={pop(t, c("하린:"))}>그게 다야?</Txt></Svg>
        </>)}</Shot>
        <Shot id="A-S06">{(t, c) => (<>
          <Card src={P("APAC241006194B_2.jpg")} x={CX} y={400} w={860} h={440} rot={-3} p={sp(t, 0)} t={t} />
          <Card src={P("APAC241006196A_2.jpg")} x={CX} y={860} w={860} h={440} rot={2} p={sp(t, c("태진:이건"))} t={t + 1} />
          <Svg W={W} H={H}>
            <Txt x={CX} y={1140} size={66} fill={C.blue} p={pop(t, c("태진:많은"))} font={FONT_H}>“Bien des amitiés, Jules”</Txt>
            <Txt x={CX} y={1220} size={66} fill={C.blue} p={pop(t, c("태진:내일"))} font={FONT_H}>“Demain je vous écrirai. Madeleine”</Txt>
          </Svg>
        </>)}</Shot>
        <Shot id="A-S07">{(t, c) => (<>
          <Morph t={t} x={CX} y={560} keys={[{ at: 0, w: 120, h: 120, r: 60, fill: C.ink }, { at: 0.5, w: 820, h: 540, r: 24, fill: C.cream2 }]} />
          <Card src={P("APAC241006194B_1.jpg")} x={CX} y={560} w={760} h={480} p={sp(t, 0.8)} t={t} shadow={false} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={960} text="1910년판 짤" size={64} p={pop(t, c("하린:"))} fill={C.red} />
            <Pill x={CX} y={1080} text="글 한 줄, 사진이 본문" size={48} p={pop(t, c("하린:글은"))} />
          </Svg>
        </>)}</Shot>
        <Shot id="A-S08">{(t, c) => (<>
          <Card src={P("APAC241006196B_2.jpg")} x={CX} y={Y} w={960} h={620} p={sp(t, 0)} kb={ramp(t, 0, 6)} focus={[0.8, 0.1]} t={t} />
          <Stamp src={K("metrot_note.jpg")} x={CX} y={1020} w={720} p={pop(t, c("태진:앞면"), 30, 10)} rot={-3} />
          <Svg W={W} H={H}><Pill x={CX} y={1200} text="15 Mai 1910 — Blessé à la face (얼굴 부상)" size={38} p={pop(t, c("태진:천구백십"))} fill={C.red} /></Svg>
        </>)}</Shot>
        <Shot id="A-S09">{(t, c) => (<>
          <Card src={P("APAC241006196A_1.jpg")} x={CX} y={Y} w={960} h={620} p={1} kb={0.5} t={t} />
          <Svg W={W} H={H}><Txt x={CX} y={1100} size={80} fill={C.ink} p={pop(t, c("하린:"))}>사고 사진도 엽서로</Txt></Svg>
        </>)}</Shot>
        <Shot id="A-S10" color={C.ink} seed={5}>{(t, c) => (<>
          <HandReveal src={P("APAC241006194A_2.jpg")} x={CX} y={560} w={900} h={580} lines={1} p={ramp(t, 0, 2)} pen={false} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={960} text="수신: 파리의 재단사 Clapal" size={40} p={pop(t, c("태진:"))} />
            <Txt x={CX} y={1120} size={92} fill={C.cream2} p={pop(t, c("태진:조선이"))}>1910</Txt>
            <Txt x={CX} y={1210} size={52} fill={C.red} p={pop(t, c("태진:파리"))}>날지 못한 비행기가 엽서로 날았다</Txt>
          </Svg>
        </>)}</Shot>
        <Shot id="A-S11" color={C.ink} seed={5}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={560} size={64} fill={C.cream2} p={pop(t, c("하린:"))}>TJ Kim Collection</Txt>
          <Txt x={CX} y={700} size={92} fill={C.red} p={pop(t, c("하린:뒷면"))}>「뒷면 읽어 드립니다」</Txt>
        </Svg>)}</Shot>
      </>)}

      {ep === "B" && (<>
        <Shot id="B-S01" first>{(t, c) => (<>
          <HandReveal src={K("mx_text.jpg")} x={CX} y={Y} w={960} h={590} lines={8} p={ramp(t, 0.2, 2.5)} />
          <Svg W={W} H={H}><Txt x={CX} y={1120} size={120} fill={C.blue} p={pop(t, c("하린:"))} font={FONT_H}>“Dearest Darling”?</Txt></Svg>
        </>)}</Shot>
        <Shot id="B-S02">{(t, c) => (<>
          <Card src={P("APAC231209245B2_2.jpg")} x={CX} y={Y} w={960} h={600} p={1} kb={0.4} focus={[0.75, 0.3]} t={t} />
          <Stamp src={K("mx_postmark.jpg")} x={CX} y={1010} w={460} p={pop(t, c("태진:"), 30, 10)} rot={-5} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={1210} text="1945. 3. 25 Tacoma · PFC John C. Maxwell" size={36} p={pop(t, c("태진:워싱턴"))} />
            <Pill x={CX} y={1290} text="→ 아내, McCamey, Texas" size={40} p={pop(t, c("태진:텍사스"))} fill={C.red} />
          </Svg>
        </>)}</Shot>
        <Shot id="B-S03">{(t, c) => (<>
          <HandReveal src={K("mx_text.jpg")} x={CX} y={480} w={960} h={590} lines={8} p={ramp(t, c("태진:"), 7)} />
          <Translate x={CX} y={820} w={960} ko="사랑하는 당신, 교회 갈 준비 중이야. 체스터가 같이 있어. 어제 기초훈련 부대로 옮겼고, 주소는 내일 보낼게." p={pop(t, c("태진:교회"))} size={36} align="center" />
          <Translate x={CX} y={1080} w={960} en="Love, Love, Johnnie" ko="사랑, 사랑, 조니" p={pop(t, c("태진:사랑"))} size={40} align="center" />
        </>)}</Shot>
        <Shot id="B-S04">{(t, c) => (<>
          <Card src={P("APAC231209245B2_2.jpg")} x={CX} y={Y} w={960} h={600} p={1} kb={0.5} t={t} o={0.5} />
          <Svg W={W} H={H}><Txt x={CX} y={1100} size={84} fill={C.ink} p={pop(t, c("하린:"))}>전쟁 얘기가 한 줄도 없다</Txt></Svg>
        </>)}</Shot>
        <Shot id="B-S05">{(t, c) => (<>
          <Card src={P("APAC231209245B2_2.jpg")} back={P("APAC231209245B2_1.jpg")} x={CX} y={Y} w={960} h={600} p={1} flip={ramp(t, c("태진:"), 0.9)} t={t} />
          <Stamp src={K("mx_slogan.jpg")} x={CX} y={1040} w={620} p={pop(t, c("태진:소인"), 30, 10)} rot={3} />
          <Svg W={W} H={H}><Pill x={CX} y={1240} text="주 정부 무료 배포 — “첫 전후 휴가는 워싱턴으로”" size={34} p={pop(t, c("태진:주"))} fill={C.red} /></Svg>
        </>)}</Shot>
        <Shot id="B-S06">{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={600} size={200} fill={C.red} p={pop(t, c("하린:"))}>?</Txt>
          <Txt x={CX} y={760} size={80} fill={C.ink} p={pop(t, c("하린:어디"))}>이 사람은 어디로?</Txt>
        </Svg>)}</Shot>
        <Shot id="B-S07" color={C.paper} seed={3}>{(t, c) => (<>
          <Svg W={W} H={H}>
            <Pill x={CX} y={300} text="미 7보병사단 병사 유품" size={46} p={pop(t, c("태진:"))} fill={C.red} />
            {["한국군 모자", "일본군 인식표", "일본 지도"].map((w, i) => <Pill key={w} x={CX} y={420 + i * 90} text={w} size={40} p={pop(t, c("태진:한국군") + i * 0.5)} />)}
            <Route pts={[[200, 900, "포트루이스"], [500, 850], [820, 930, "인천"]]} p={ramp(t, c("태진:칠"), 2.4)} size={34} />
            <Txt x={CX} y={1140} size={120} fill={C.red} p={pop(t, c("태진:천구백사십오"))}>1945. 9. 8</Txt>
            <Pill x={CX} y={1240} text="7사단 인천 상륙" size={44} p={pop(t, c("태진:천구백사십오"))} />
          </Svg>
        </>)}</Shot>
        <Shot id="B-S08" color={C.paper} seed={3}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={520} size={58} fill={C.blue} p={pop(t, c("하린:"))} font={FONT_H}>“will send you the address tomorrow”</Txt>
          <Txt x={CX} y={640} size={72} fill={C.ink} p={pop(t, c("하린:"))}>“내일 주소 보낼게”</Txt>
          <Txt x={CX} y={820} size={110} fill={C.red} p={pop(t, c("하린:육"))}>→ 6개월 뒤 인천</Txt>
        </Svg>)}</Shot>
        <Shot id="B-S09">{(t, c) => (<>
          <Card src={P("APAC231209245B1_1.jpg")} x={CX} y={Y} w={960} h={600} p={sp(t, 0)} kb={ramp(t, 0, 6)} t={t} />
          <Svg W={W} H={H}><Pill x={CX} y={1080} text="같은 묶음: “Practicing Heavy Shelling” 만화 엽서" size={34} p={pop(t, c("태진:같은"))} /></Svg>
        </>)}</Shot>
        <Shot id="B-S10" color={C.ink} seed={5}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={560} size={64} fill={C.cream2} p={pop(t, c("하린:"))}>TJ Kim Collection</Txt>
          <Txt x={CX} y={700} size={92} fill={C.red} p={pop(t, c("하린:"))}>「뒷면 읽어 드립니다」</Txt>
        </Svg>)}</Shot>
      </>)}

      {ep === "C" && (<>
        <Shot id="C-S01" first color={C.paper} seed={3}>{(t, c) => (<>
          <Card src={K("flood_photo_1.jpg")} x={CX} y={Y} w={960} h={640} p={sp(t, 0)} kb={ramp(t, 0, 6)} t={t} />
          <Svg W={W} H={H}><Txt x={CX} y={1100} size={100} fill={C.red} p={pop(t, c("하린:"))}>집이 떠내려간다</Txt></Svg>
        </>)}</Shot>
        <Shot id="C-S02" color={C.paper} seed={3}>{(t, c) => (<>
          <Card src={P("APKC230615122I_1.jpg")} x={CX} y={Y} w={900} h={880} fit="contain" p={sp(t, 0)} t={t} />
          <Svg W={W} H={H}>
            <Pill x={CX} y={1120} text="1925. 7 을축년 대홍수" size={46} p={pop(t, c("태진:"))} fill={C.red} />
            <Counter x={CX} y={1290} to={650} p={ramp(t, c("태진:사흘"), 1.2)} size={130} suffix="mm · 3일" />
          </Svg>
        </>)}</Shot>
        <Shot id="C-S03" color={C.paper} seed={3}>{(t, c) => (<>
          <HandReveal src={K("flood_note_1.jpg")} x={CX} y={480} w={940} h={630} lines={8} p={ramp(t, c("태진:"), 6)} />
          <Translate x={CX} y={840} w={940} ko="강에서 100피트 높이 여름 별장에서, 게일 부인은 한 시간 동안 집 200채가 떠내려가는 것을 셌다." p={pop(t, c("태진:강"))} size={36} align="center" />
        </>)}</Shot>
        <Shot id="C-S04" color={C.paper} seed={3}>{(t, c) => (<Svg W={W} H={H}>
          <Counter x={CX} y={700} to={200} p={ramp(t, c("하린:"), 1.4)} size={320} suffix="채" />
          <Txt x={CX} y={840} size={70} fill={C.ink} p={pop(t, c("하린:"))}>한 시간 동안</Txt>
        </Svg>)}</Shot>
        <Shot id="C-S05" color={C.paper} seed={3}>{(t, c) => (<>
          <Card src={K("flood_photo_2.jpg")} x={CX} y={400} w={880} h={520} p={sp(t, 0)} t={t} />
          <HandReveal src={K("flood_note_4.jpg")} x={CX} y={960} w={860} h={540} lines={9} p={ramp(t, c("태진:당신이"), 6)} frame={false} />
          <Svg W={W} H={H}><Pill x={CX} y={1300} text="영등포까지 전부 침수 · 주민 언덕 피난" size={38} p={pop(t, c("태진:영등포"))} fill={C.red} /></Svg>
        </>)}</Shot>
        <Shot id="C-S06" color={C.paper} seed={3}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={560} size={50} fill={C.blue} p={pop(t, c("하린:"))} font={FONT_H}>“where you had so often motored down with us”</Txt>
          <Txt x={CX} y={760} size={80} fill={C.ink} p={pop(t, c("하린:같이"))}>받는 사람은 서울을 떠난 사람</Txt>
        </Svg>)}</Shot>
        <Shot id="C-S07" color={C.paper} seed={3}>{(t, c) => (<Svg W={W} H={H}>
          <rect x={90} y={520} width={900} height={60} rx={10} fill="rgba(28,28,28,0.12)" />
          <rect x={90} y={520} width={900 * 0.58 * ramp(t, c("태진:"), 1.4)} height={60} rx={10} fill={C.red} />
          <Txt x={CX} y={470} size={44} fill={C.ink2} p={pop(t, c("태진:"))} font={FONT}>피해액 = 조선총독부 1년 예산의</Txt>
          <Txt x={CX} y={760} size={220} fill={C.red} p={pop(t, c("태진:오십팔"))}>58%</Txt>
          <Pill x={CX} y={960} text="Mrs. Gale = 제임스 게일(성서 번역) 부인으로 추정" size={34} p={pop(t, c("태진:게일"))} />
        </Svg>)}</Shot>
        <Shot id="C-S08" color={C.paper} seed={3}>{(t, c) => (<>
          <Card src={K("flood_photo_6.jpg")} x={CX} y={520} w={960} h={640} p={sp(t, 0)} kb={ramp(t, 0, 6)} t={t} />
          <HandReveal src={K("flood_note_6.jpg")} x={CX} y={1000} w={760} h={500} lines={5} p={ramp(t, c("태진:"), 3)} frame={false} />
        </>)}</Shot>
        <Shot id="C-S09" color={C.paper} seed={3}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={640} size={96} fill={C.ink} p={pop(t, c("하린:"))}>100년 전 재난 문자</Txt>
          <Txt x={CX} y={760} size={48} fill={C.ink2} p={pop(t, c("하린:뉴스"))} font={FONT}>뉴스 사진에 손편지를</Txt>
        </Svg>)}</Shot>
        <Shot id="C-S10" color={C.ink} seed={5}>{(t, c) => (<Svg W={W} H={H}>
          <Txt x={CX} y={560} size={56} fill={C.cream2} p={pop(t, c("태진:"))}>이 여섯 장이 누구 앨범에 있었는지는</Txt>
          <Txt x={CX} y={720} size={110} fill={C.red} p={pop(t, c("태진:스코틀랜드"))}>Korea House</Txt>
          <Txt x={CX} y={820} size={48} fill={C.cream2} p={pop(t, c("태진:스코틀랜드"))}>롱폼: 스코틀랜드의 '코리아 하우스'</Txt>
        </Svg>)}</Shot>
      </>)}

      <Reaction ctx={ctx} t={t} lx={190} rx={890} y={1916} h={520} />
      <Kinetic ctx={ctx} t={t} top={1380} />
      <Grain seed={5} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 36, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.ink2, letterSpacing: 2 }}>티제이 김 컬렉션 · 뒷면 읽어 드립니다</div>
      <Audio src={staticFile(`narration_${ep}.wav`)} />
      {hasBgm && <Audio src={staticFile("bgm.wav")} volume={0.15} loop />}
      <SfxTrack events={SFX_DEF[ep].map(([id, c, name, v]) => [ctx.cue(id, c), name, v] as [number, string, number?])} fps={fps} />
    </AbsoluteFill>
  );
};

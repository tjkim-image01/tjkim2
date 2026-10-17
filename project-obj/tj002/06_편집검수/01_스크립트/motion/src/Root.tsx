import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { EPS, FONT, FONT_H, FONT_N, FONT_P, FONT_T, TLS } from "./lib";
import { Short } from "./Short";
import { ShortSeries } from "./ShortSeries";
import { Long } from "./Long";
import { Long2 } from "./Long2";

loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundR.ttf"), weight: "400" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundB.ttf"), weight: "700" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundEB.ttf"), weight: "800" });
loadFont({ family: FONT_T, url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });
loadFont({ family: FONT_H, url: staticFile("fonts/BlackHanSans-Regular.ttf"), weight: "400" });
loadFont({ family: FONT_N, url: staticFile("fonts/BagelFatOne-Regular.ttf"), weight: "400" });
loadFont({ family: FONT_P, url: staticFile("fonts/NanumPenScript-Regular.ttf"), weight: "400" });

// tj002 「삐라 주워서 공책 받아 봤어?」 숏폼 1편(Tj002Short) · 숏 시리즈 D~L(Tj002ShortD…) · 롱폼(Tj002Long)
export const Root: React.FC = () => (
  <>
    <Composition id="Tj002Short" component={Short} durationInFrames={Math.ceil(TLS.short.duration * TLS.short.fps)} fps={TLS.short.fps} width={1080} height={1920} />
    <Composition id="Tj002Long2" component={Long2} durationInFrames={Math.ceil(TLS.long2.duration * TLS.long2.fps)} fps={TLS.long2.fps} width={1920} height={1080} />
    <Composition id="Tj002Long" component={Long} durationInFrames={Math.ceil(TLS.long.duration * TLS.long.fps)} fps={TLS.long.fps} width={1920} height={1080} />
    {EPS.map((ep) => (
      <Composition key={ep} id={`Tj002Short${ep}`} component={ShortSeries} defaultProps={{ ep }} durationInFrames={Math.ceil(TLS[ep].duration * TLS[ep].fps)} fps={TLS[ep].fps} width={1080} height={1920} />
    ))}
  </>
);

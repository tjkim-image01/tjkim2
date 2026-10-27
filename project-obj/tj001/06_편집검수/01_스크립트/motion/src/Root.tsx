import React from "react";
import { Composition, Still, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FONT, FONT_T, TLS } from "./lib";
import { Long } from "./Long";
import { Short } from "./Short";
import { ThumbLong, ThumbShort } from "./Thumb";

loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundR.ttf"), weight: "400" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundB.ttf"), weight: "700" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundEB.ttf"), weight: "800" });
loadFont({ family: FONT_T, url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });

// tj001 「황제 얼굴이 왜 엽서에?」 롱폼 16:9 · 숏폼 9:16
export const Root: React.FC = () => (
  <>
    <Composition id="Tj001Long" component={Long} durationInFrames={Math.ceil(TLS.long.duration * TLS.long.fps)} fps={TLS.long.fps} width={1920} height={1080} />
    <Composition id="Tj001Short" component={Short} durationInFrames={Math.ceil(TLS.short.duration * TLS.short.fps)} fps={TLS.short.fps} width={1080} height={1920} />
    <Still id="ThumbLong" component={ThumbLong} width={1920} height={1080} />
    <Still id="ThumbShort" component={ThumbShort} width={1080} height={1920} />
  </>
);

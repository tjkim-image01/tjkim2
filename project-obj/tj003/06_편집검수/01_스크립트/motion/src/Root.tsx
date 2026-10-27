import React from "react";
import { Composition, staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { FONT, FONT_H, FONT_T, TLS } from "./lib";
import { Long } from "./Long";
import { Short } from "./Short";

loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundR.ttf"), weight: "400" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundB.ttf"), weight: "700" });
loadFont({ family: FONT, url: staticFile("fonts/NanumSquareRoundEB.ttf"), weight: "800" });
loadFont({ family: FONT_T, url: staticFile("fonts/Pretendard-ExtraBold.otf"), weight: "800" });
loadFont({ family: FONT_H, url: staticFile("fonts/NanumPenScript-Regular.ttf"), weight: "400" });

// tj003 「뒷면 읽어 드립니다」 롱폼 16:9 · 쇼츠 A/B/C 9:16
export const Root: React.FC = () => (
  <>
    <Composition id="Tj003Long" component={Long} durationInFrames={Math.ceil(TLS.long.duration * TLS.long.fps)} fps={TLS.long.fps} width={1920} height={1080} />
    {(["A", "B", "C"] as const).map((ep) => (
      <Composition key={ep} id={`Tj003Short${ep}`} component={Short} defaultProps={{ ep }} durationInFrames={Math.ceil(TLS[ep].duration * TLS[ep].fps)} fps={TLS[ep].fps} width={1080} height={1920} />
    ))}
  </>
);

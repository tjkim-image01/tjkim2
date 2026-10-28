import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 정적 호스팅(Vercel·GitHub Pages 하위 경로)에서도 동작하도록 상대 경로로 빌드한다. 라우팅은 HashRouter.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "./",
  build: { chunkSizeWarningLimit: 1500 },
  // 배포마다 바뀌는 값. 이름이 같은 이미지(진행자·서명·축전·표지)가 브라우저 캐시에 남지 않도록 ?v= 로 붙인다
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
});

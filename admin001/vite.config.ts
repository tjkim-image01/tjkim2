import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://<계정>.github.io/<저장소>/ 에 올라가므로 base가 저장소 이름이다.
// 사용자 정의 도메인을 쓰면 VITE_BASE=/ 로 빌드한다.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/tjkim2/',
})

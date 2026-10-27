/**
 * 앱 설정 — 빌드 시 .env(VITE_*) 값이 기본이고, 설정 화면에서 바꾼 값은 localStorage에 둔다.
 * API 주소는 비밀이 아니다(비밀번호 검사는 서버가 한다).
 */

export interface AppConfig {
  apiUrl: string
}

const KEY = 'admin001.config'

const defaults: AppConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
}

export function readConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    const saved = JSON.parse(raw) as Partial<AppConfig>
    return { apiUrl: saved.apiUrl || defaults.apiUrl }
  } catch {
    return { ...defaults }
  }
}

export function writeConfig(config: AppConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config))
  } catch {
    /* 저장 불가 환경 */
  }
}

export const APP_NAME = 'tjkim 소장품'

/**
 * 앱 설정 — 빌드 시 .env(VITE_*) 값이 기본이고, 설정 화면에서 바꾼 값은 localStorage에 둔다.
 * 둘 다 비밀이 아니다(OAuth 클라이언트 ID는 공개값, 시트 ID는 공유 권한이 지킨다).
 */

export interface AppConfig {
  clientId: string
  spreadsheetId: string
}

const KEY = 'admin001.config'

const defaults: AppConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  spreadsheetId: import.meta.env.VITE_SHEET_ID ?? '',
}

export function readConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...defaults }
    const saved = JSON.parse(raw) as Partial<AppConfig>
    return {
      clientId: saved.clientId || defaults.clientId,
      spreadsheetId: saved.spreadsheetId || defaults.spreadsheetId,
    }
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

/** 시트 URL이나 ID 어느 쪽을 붙여넣어도 ID만 뽑는다 */
export function parseSpreadsheetId(value: string): string {
  const v = value.trim()
  const m = v.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{20,})/)
  if (m) return m[1]
  return v
}

export const APP_NAME = 'tjkim 소장품'

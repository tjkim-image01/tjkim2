/**
 * Google 로그인(Google Identity Services 토큰 클라이언트).
 *
 * 정적 사이트라 서버 비밀이 없다. 로그인한 사람의 액세스 토큰(1시간)으로
 * Sheets/Drive API를 브라우저에서 직접 부른다. 누가 수정할 수 있는지는
 * 시트의 공유 설정이 정한다.
 */

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const TOKEN_KEY = 'admin001.token'
const USER_KEY = 'admin001.user'

export interface StoredToken {
  access_token: string
  expires_at: number // epoch ms
}

export interface GoogleUser {
  email: string
  name?: string
  picture?: string
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

interface TokenClient {
  requestAccessToken(options?: { prompt?: string; hint?: string }): void
  callback?: (response: TokenResponse) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string; message?: string }) => void
          }): TokenClient
          revoke(token: string, done?: () => void): void
        }
      }
    }
  }
}

export class AuthError extends Error {}

let gisLoading: Promise<void> | null = null
let tokenClient: TokenClient | null = null
let tokenClientId = ''

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisLoading) return gisLoading
  gisLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new AuthError('Google 로그인 스크립트를 불러오지 못했습니다'))
    document.head.appendChild(script)
  })
  return gisLoading
}

export function getStoredToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const token = JSON.parse(raw) as StoredToken
    // 만료 1분 전부터는 없는 것으로 본다
    if (token.expires_at - 60_000 < Date.now()) return null
    return token
  } catch {
    return null
  }
}

export function getStoredUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as GoogleUser) : null
  } catch {
    return null
  }
}

function storeToken(token: StoredToken) {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  } catch {
    /* 저장 불가 환경이면 메모리 토큰만 쓴다 */
  }
  memoryToken = token
}

let memoryToken: StoredToken | null = null

export function currentToken(): string | null {
  const stored = getStoredToken() ?? memoryToken
  if (!stored) return null
  if (stored.expires_at - 60_000 < Date.now()) return null
  return stored.access_token
}

/**
 * 토큰을 요청한다. interactive=false면 이미 승인한 계정에서 조용히 재발급을 시도한다
 * (만료 뒤 자동 갱신용). 사용자가 아직 승인한 적이 없으면 AuthError를 던진다.
 */
export async function requestToken(clientId: string, interactive: boolean): Promise<StoredToken> {
  if (!clientId) throw new AuthError('OAuth 클라이언트 ID가 설정되지 않았습니다 (설정 화면)')
  await loadGis()
  const oauth2 = window.google!.accounts.oauth2
  if (!tokenClient || tokenClientId !== clientId) {
    tokenClient = oauth2.initTokenClient({ client_id: clientId, scope: SCOPES, callback: () => {} })
    tokenClientId = clientId
  }
  const client = tokenClient
  const hint = getStoredUser()?.email
  return new Promise<StoredToken>((resolve, reject) => {
    client.callback = (response) => {
      if (response.error || !response.access_token) {
        reject(new AuthError(response.error_description ?? response.error ?? '로그인이 취소되었습니다'))
        return
      }
      const token: StoredToken = {
        access_token: response.access_token,
        expires_at: Date.now() + (response.expires_in ?? 3600) * 1000,
      }
      storeToken(token)
      resolve(token)
    }
    try {
      client.requestAccessToken(
        interactive ? { prompt: hint ? '' : 'select_account', hint } : { prompt: '', hint },
      )
    } catch (error) {
      reject(new AuthError(String(error)))
    }
  })
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUser> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new AuthError('사용자 정보를 읽지 못했습니다')
  const data = (await response.json()) as { email: string; name?: string; picture?: string }
  const user: GoogleUser = { email: data.email, name: data.name, picture: data.picture }
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* 무시 */
  }
  return user
}

export function signOut() {
  const token = currentToken()
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* 무시 */
  }
  memoryToken = null
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token)
  }
}

/**
 * API 호출용 토큰. 없거나 만료됐으면 조용히 재발급을 시도하고, 그래도 안 되면 AuthError.
 */
export async function ensureToken(clientId: string): Promise<string> {
  const existing = currentToken()
  if (existing) return existing
  const refreshed = await requestToken(clientId, false)
  return refreshed.access_token
}

/**
 * Apps Script 웹 앱 호출 — 서버는 tjkim.image01 권한으로 시트를 읽고 쓴다.
 *
 * 요청은 POST + text/plain(JSON 문자열). Content-Type을 JSON으로 두면 브라우저가 preflight를
 * 보내는데 Apps Script는 그걸 받지 못하므로 "단순 요청" 형태를 유지한다. 응답은 302를 따라간다.
 */

const TOKEN_KEY = 'admin001.token'
const USER_KEY = 'admin001.user'

export class ApiError extends Error {}
export class AuthError extends ApiError {}

export interface ApiUser {
  name: string
}

let apiUrl = ''
export function configureApi(url: string) {
  apiUrl = url.trim()
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as ApiUser) : null
  } catch {
    return null
  }
}

function storeSession(token: string, user: ApiUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    /* 저장 불가 환경 */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch {
    /* 무시 */
  }
}

export async function call<T>(action: string, params: Record<string, unknown> = {}, auth = true): Promise<T> {
  if (!apiUrl) throw new ApiError('API 주소가 설정되지 않았습니다 (설정 화면)')
  const body: Record<string, unknown> = { action, ...params }
  if (auth) {
    const token = getToken()
    if (!token) throw new AuthError('로그인이 필요합니다')
    body.token = token
  }
  let response: Response
  try {
    response = await fetch(apiUrl, { method: 'POST', body: JSON.stringify(body), redirect: 'follow' })
  } catch {
    throw new ApiError('서버에 연결하지 못했습니다. API 주소와 네트워크를 확인하세요')
  }
  if (!response.ok) throw new ApiError(`서버 오류 (${response.status})`)
  let data: { error?: string } & T
  try {
    data = (await response.json()) as { error?: string } & T
  } catch {
    throw new ApiError('서버 응답을 읽지 못했습니다. 웹 앱 배포 설정(모든 사용자)을 확인하세요')
  }
  if (data.error) {
    if (/로그인/.test(data.error)) {
      clearSession()
      throw new AuthError(data.error)
    }
    throw new ApiError(data.error)
  }
  return data
}

export async function login(username: string, password: string): Promise<ApiUser> {
  const data = await call<{ token: string; user: ApiUser }>('login', { username, password }, false)
  storeSession(data.token, data.user)
  return data.user
}

export async function health(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url.trim()}?action=health`, { redirect: 'follow' })
    const data = (await response.json()) as { ok?: boolean }
    return data.ok === true
  } catch {
    return false
  }
}

export interface RawDataset {
  spreadsheetId: string
  title: string
  modifiedTime: string
  tabs: Record<string, string[][]>
}

export function fetchRawDataset(): Promise<RawDataset> {
  return call<RawDataset>('dataset')
}

export type CellValue = string | number | boolean | null

export function updateCells(tab: string, code: string, changes: Record<string, CellValue>) {
  return call<{ row: number; written: Record<string, string> }>('updateCells', { tab, code, changes })
}

export function appendRow(tab: string, values: Record<string, CellValue>) {
  return call<{ row: number; cells: Record<string, string> }>('appendRow', { tab, values })
}

export interface FolderImage {
  id: string
  name: string
  mimeType: string
}

export async function folderImages(folderId: string): Promise<FolderImage[]> {
  const data = await call<{ images: FolderImage[] }>('folderImages', { folderId })
  return data.images
}

export interface IndexRoot {
  id: string
  name: string
}
export interface IndexResult {
  rootId: string
  folders: { id: string; name: string; path: string }[]
  files: { id: string; name: string; folderId: string }[]
  truncated: boolean
}

export async function imageIndexRoots(): Promise<IndexRoot[]> {
  const data = await call<{ roots: IndexRoot[] }>('imageIndex')
  return data.roots
}

export function imageIndexRoot(rootId: string): Promise<IndexResult> {
  return call<IndexResult>('imageIndex', { rootId })
}

export function changePassword(newPassword: string) {
  return call<{ ok: boolean }>('changePassword', { newPassword })
}

export function thumbnailUrl(fileId: string, width = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`
}

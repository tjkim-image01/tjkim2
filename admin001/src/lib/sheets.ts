/**
 * Google Sheets v4 / Drive v3 호출 — 전부 fetch. 서버 없음.
 *
 * 쓰기 규칙: 행 번호를 캐시하지 않는다. 쓰기 직전에 키 열(Item No.)을 다시 읽어
 * 행을 찾는다. 사람이 시트에서 행을 지우거나 정렬해도 엉뚱한 행을 덮지 않는다.
 */

import { AuthError, ensureToken } from './google'

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE = 'https://www.googleapis.com/drive/v3'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type CellValue = string | number | boolean | null

let clientIdForAuth = ''
export function configureAuth(clientId: string) {
  clientIdForAuth = clientId
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await ensureToken(clientIdForAuth)
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (response.status === 401) throw new AuthError('로그인이 만료되었습니다. 다시 로그인하세요')
  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? detail
    } catch {
      /* 본문 없음 */
    }
    if (response.status === 403) detail = `권한이 없습니다. 시트 공유 설정을 확인하세요 (${detail})`
    if (response.status === 404) detail = `시트를 찾을 수 없습니다 (${detail})`
    throw new ApiError(response.status, detail)
  }
  return (await response.json()) as T
}

export function quoteTab(tab: string): string {
  return `'${tab.replace(/'/g, "''")}'`
}

export function columnLetter(index0: number): string {
  let n = index0 + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export interface SheetMeta {
  title: string
  tabs: { title: string; sheetId: number; rowCount: number; columnCount: number }[]
}

export async function getSheetMeta(spreadsheetId: string): Promise<SheetMeta> {
  const data = await call<{
    properties: { title: string }
    sheets: { properties: { title: string; sheetId: number; gridProperties: { rowCount: number; columnCount: number } } }[]
  }>(`${SHEETS}/${spreadsheetId}?fields=properties.title,sheets.properties`)
  return {
    title: data.properties.title,
    tabs: data.sheets.map((s) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
      rowCount: s.properties.gridProperties.rowCount,
      columnCount: s.properties.gridProperties.columnCount,
    })),
  }
}

/** 여러 탭을 한 번에 읽는다. 각 탭은 2차원 배열(문자열). 빈 셀은 ''. */
export async function batchGetTabs(spreadsheetId: string, tabs: string[]): Promise<Record<string, string[][]>> {
  const params = new URLSearchParams()
  for (const tab of tabs) params.append('ranges', quoteTab(tab))
  params.set('valueRenderOption', 'FORMATTED_VALUE')
  params.set('dateTimeRenderOption', 'FORMATTED_STRING')
  const data = await call<{ valueRanges: { range: string; values?: string[][] }[] }>(
    `${SHEETS}/${spreadsheetId}/values:batchGet?${params.toString()}`,
  )
  const result: Record<string, string[][]> = {}
  data.valueRanges.forEach((vr, i) => {
    result[tabs[i]] = vr.values ?? []
  })
  return result
}

/** 키 열(기본 D = Item No.)을 읽어 값 → 행 번호(1-based) 맵을 만든다. */
export async function readKeyColumn(spreadsheetId: string, tab: string, keyColumn: string): Promise<Map<string, number>> {
  const range = `${quoteTab(tab)}!${keyColumn}:${keyColumn}`
  const data = await call<{ values?: string[][] }>(
    `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
  )
  const map = new Map<string, number>()
  ;(data.values ?? []).forEach((row, i) => {
    const v = (row[0] ?? '').trim()
    if (v && !map.has(v)) map.set(v, i + 1)
  })
  return map
}

export async function updateCells(
  spreadsheetId: string,
  updates: { tab: string; row: number; col0: number; value: CellValue }[],
): Promise<void> {
  if (updates.length === 0) return
  const data = updates.map((u) => ({
    range: `${quoteTab(u.tab)}!${columnLetter(u.col0)}${u.row}`,
    values: [[u.value ?? '']],
  }))
  await call(`${SHEETS}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  })
}

export async function appendRow(spreadsheetId: string, tab: string, values: CellValue[]): Promise<number> {
  const range = `${quoteTab(tab)}!A1`
  const data = await call<{ updates: { updatedRange: string } }>(
    `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: [values.map((v) => v ?? '')] }) },
  )
  const m = data.updates.updatedRange.match(/!A(\d+)/)
  return m ? Number(m[1]) : 0
}

export interface DriveFileMeta {
  id: string
  name: string
  modifiedTime: string
  webViewLink?: string
}

export async function getDriveFile(fileId: string): Promise<DriveFileMeta> {
  return call<DriveFileMeta>(`${DRIVE}/files/${fileId}?fields=id,name,modifiedTime,webViewLink&supportsAllDrives=true`)
}

export interface DriveImage {
  id: string
  name: string
  mimeType: string
  parents: string[]
  modifiedTime: string
  size?: string
}

/** 로그인 계정이 볼 수 있는 이미지 파일을 전부 나열한다 (1,000개/페이지). */
export async function listAllImages(onPage?: (count: number) => void): Promise<DriveImage[]> {
  const out: DriveImage[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: "mimeType contains 'image/' and trashed = false",
      fields: 'nextPageToken,files(id,name,mimeType,parents,modifiedTime,size)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const data = await call<{ nextPageToken?: string; files: DriveImage[] }>(`${DRIVE}/files?${params}`)
    out.push(...data.files)
    onPage?.(out.length)
    pageToken = data.nextPageToken
  } while (pageToken)
  return out
}

export interface DriveFolder {
  id: string
  name: string
  parents?: string[]
}

export async function listAllFolders(onPage?: (count: number) => void): Promise<DriveFolder[]> {
  const out: DriveFolder[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: 'nextPageToken,files(id,name,parents)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const data = await call<{ nextPageToken?: string; files: DriveFolder[] }>(`${DRIVE}/files?${params}`)
    out.push(...data.files)
    onPage?.(out.length)
    pageToken = data.nextPageToken
  } while (pageToken)
  return out
}

/** 비공개 파일도 토큰으로 받아 object URL로 보여준다 (썸네일 URL이 안 될 때 대체). */
export async function fetchImageBlobUrl(fileId: string): Promise<string> {
  const token = await ensureToken(clientIdForAuth)
  const response = await fetch(`${DRIVE}/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new ApiError(response.status, '이미지를 받지 못했습니다')
  return URL.createObjectURL(await response.blob())
}

export function thumbnailUrl(fileId: string, width = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`
}

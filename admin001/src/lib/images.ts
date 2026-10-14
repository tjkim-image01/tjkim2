/**
 * Drive 이미지 색인 — 로그인 계정이 볼 수 있는 이미지를 전부 나열해
 * 폴더명/파일명을 Item No.와 대조한다. 결과는 IndexedDB에 둔다.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval'
import { normalizeKey } from '../data/parse'
import { listAllFolders, listAllImages, type DriveImage } from './sheets'
import { ensureToken } from './google'
import { readConfig } from '../config'

const INDEX_KEY = 'admin001.image-index'

export interface FolderImage {
  id: string
  name: string
  mimeType: string
}

export interface ImageIndex {
  builtAt: number
  fileCount: number
  folderCount: number
  /** normalizeKey(폴더명) → 폴더 ID 목록 */
  byFolderKey: Record<string, { folderId: string; folderName: string; path: string; count: number }[]>
  /** normalizeKey(파일명) → 파일 목록 */
  byFileKey: Record<string, { id: string; name: string; folderId: string; folderName: string }[]>
}

export async function readImageIndex(): Promise<ImageIndex | null> {
  try {
    return ((await idbGet(INDEX_KEY)) as ImageIndex | undefined) ?? null
  } catch {
    return null
  }
}

export async function buildImageIndex(onProgress: (msg: string) => void): Promise<ImageIndex> {
  onProgress('폴더 목록 받는 중…')
  const folders = await listAllFolders((n) => onProgress(`폴더 ${n.toLocaleString()}개…`))
  const folderById = new Map(folders.map((f) => [f.id, f]))
  const pathOf = (id: string): string => {
    const parts: string[] = []
    let cur = folderById.get(id)
    let guard = 0
    while (cur && guard++ < 20) {
      parts.unshift(cur.name)
      cur = cur.parents?.[0] ? folderById.get(cur.parents[0]) : undefined
    }
    return parts.join('/')
  }
  onProgress('이미지 목록 받는 중…')
  const images = await listAllImages((n) => onProgress(`이미지 ${n.toLocaleString()}장…`))
  onProgress('색인 만드는 중…')
  const byFolderKey: ImageIndex['byFolderKey'] = {}
  const byFileKey: ImageIndex['byFileKey'] = {}
  const folderCounts = new Map<string, number>()
  for (const img of images) {
    const folderId = img.parents?.[0]
    if (folderId) folderCounts.set(folderId, (folderCounts.get(folderId) ?? 0) + 1)
    const folderName = folderId ? folderById.get(folderId)?.name ?? '' : ''
    const fk = normalizeKey(img.name, true)
    if (fk) (byFileKey[fk] ??= []).push({ id: img.id, name: img.name, folderId: folderId ?? '', folderName })
  }
  for (const [folderId, count] of folderCounts) {
    const f = folderById.get(folderId)
    if (!f) continue
    const key = normalizeKey(f.name)
    if (!key) continue
    ;(byFolderKey[key] ??= []).push({ folderId, folderName: f.name, path: pathOf(folderId), count })
  }
  const index: ImageIndex = { builtAt: Date.now(), fileCount: images.length, folderCount: folderCounts.size, byFolderKey, byFileKey }
  try {
    await idbSet(INDEX_KEY, index)
  } catch {
    /* 무시 */
  }
  return index
}

export interface Candidate {
  folderId: string
  folderName: string
  path: string
  matchType: 'folder' | 'filename'
  fileIds: string[]
}

export function findCandidates(index: ImageIndex, itemCode: string): Candidate[] {
  const key = normalizeKey(itemCode)
  const out: Candidate[] = []
  for (const f of index.byFolderKey[key] ?? []) {
    out.push({ folderId: f.folderId, folderName: f.folderName, path: f.path, matchType: 'folder', fileIds: [] })
  }
  const files = index.byFileKey[key] ?? []
  const grouped = new Map<string, Candidate>()
  for (const f of files) {
    if (out.some((c) => c.folderId === f.folderId)) continue
    const c = grouped.get(f.folderId) ?? { folderId: f.folderId, folderName: f.folderName, path: f.folderName, matchType: 'filename' as const, fileIds: [] }
    c.fileIds.push(f.id)
    grouped.set(f.folderId, c)
  }
  return [...out, ...grouped.values()]
}

export async function listFolderImages(folderId: string): Promise<FolderImage[]> {
  const token = await ensureToken(readConfig().clientId)
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id,name,mimeType)',
    pageSize: '200',
    orderBy: 'name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error(`Drive 폴더를 읽지 못했습니다 (${response.status})`)
  const data = (await response.json()) as { files: DriveImage[] }
  return data.files.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }))
}

/**
 * Drive 이미지 색인 — 서버(Apps Script)가 이미지폴더 탭의 루트를 하나씩 순회해 준 결과를
 * 합쳐 폴더명/파일명을 Item No.와 대조한다. 결과는 IndexedDB에 둔다.
 */

import { get as idbGet, set as idbSet } from 'idb-keyval'
import { normalizeKey } from '../data/parse'
import { folderImages, imageIndexRoot, imageIndexRoots, type FolderImage } from './api'

export type { FolderImage }

const INDEX_KEY = 'admin001.image-index'

export interface ImageIndex {
  builtAt: number
  fileCount: number
  folderCount: number
  truncatedRoots: string[]
  /** normalizeKey(폴더명) → 폴더 목록 */
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
  onProgress('이미지 루트 폴더 확인 중…')
  const roots = await imageIndexRoots()
  if (roots.length === 0) throw new Error('이미지폴더 탭에 사용 중인 루트가 없습니다')
  const byFolderKey: ImageIndex['byFolderKey'] = {}
  const byFileKey: ImageIndex['byFileKey'] = {}
  const truncatedRoots: string[] = []
  let fileCount = 0
  let folderCount = 0
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i]
    onProgress(`${i + 1}/${roots.length} ${root.name} 순회 중…`)
    const result = await imageIndexRoot(root.id)
    if (result.truncated) truncatedRoots.push(root.name)
    const folderById = new Map(result.folders.map((f) => [f.id, f]))
    const counts = new Map<string, number>()
    for (const file of result.files) {
      counts.set(file.folderId, (counts.get(file.folderId) ?? 0) + 1)
      const key = normalizeKey(file.name, true)
      if (key) (byFileKey[key] ??= []).push({ id: file.id, name: file.name, folderId: file.folderId, folderName: folderById.get(file.folderId)?.name ?? '' })
    }
    for (const folder of result.folders) {
      const key = normalizeKey(folder.name)
      const count = counts.get(folder.id) ?? 0
      if (!key || count === 0) continue
      ;(byFolderKey[key] ??= []).push({ folderId: folder.id, folderName: folder.name, path: folder.path, count })
      folderCount++
    }
    fileCount += result.files.length
  }
  const index: ImageIndex = { builtAt: Date.now(), fileCount, folderCount, truncatedRoots, byFolderKey, byFileKey }
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

export function listFolderImages(folderId: string): Promise<FolderImage[]> {
  return folderImages(folderId)
}

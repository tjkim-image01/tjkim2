import type { IndexResult, IndexRoot } from './api'
import { imageCodeKey, type ImageIndex } from './image-match.ts'

export function imageRootIds(roots: IndexRoot[]): string[] {
  return [...new Set(roots.map((root) => root.id))].sort()
}

/** The older API stops at depth four or 20,000 files. Resume at child folders. */
export async function scanImageRoots(
  roots: IndexRoot[],
  readRoot: (id: string) => Promise<IndexResult>,
  onProgress: (message: string) => void,
): Promise<ImageIndex> {
  if (!roots.length) throw new Error('이미지 상위 폴더를 먼저 등록해 주세요')
  const index: ImageIndex = {
    version: 2, builtAt: Date.now(), rootIds: imageRootIds(roots),
    fileCount: 0, folderCount: 0, truncatedRoots: [], byFolderKey: {}, byFileKey: {},
  }
  const queue = roots.map((root) => ({ ...root, parentPath: '' }))
  const scanned = new Set<string>()
  const files = new Map<string, { id: string; name: string; folderId: string }>()
  const folders = new Map<string, { id: string; name: string; path: string }>()

  while (queue.length) {
    const current = queue.shift()!
    if (scanned.has(current.id)) continue
    scanned.add(current.id)
    onProgress(`${scanned.size}개 폴더 확인 · ${current.name} · 사진 ${files.size.toLocaleString()}장`)
    const result = await readRoot(current.id)
    const root = result.folders.find((folder) => folder.id === current.id)
    if (!root) throw new Error(`${current.name}: 상위 폴더를 읽지 못했습니다. 기존 사진 목록을 유지합니다`)
    const rootDepth = root.path.split('/').length
    const relativeDepth = (path: string) => path.split('/').length - rootDepth
    const fullPath = (path: string) => current.parentPath ? `${current.parentPath}/${path}` : path
    const children = result.folders.filter((folder) => relativeDepth(folder.path) === 1)
    if (result.truncated && !children.length) {
      throw new Error(`${current.name}: 사진 목록을 끝까지 읽지 못했습니다. 기존 사진 목록을 유지합니다`)
    }
    for (const folder of result.folders) {
      folders.set(folder.id, { ...folder, path: fullPath(folder.path) })
      const depth = relativeDepth(folder.path)
      if ((result.truncated && depth === 1) || (!result.truncated && depth === 4)) {
        const path = fullPath(folder.path)
        queue.push({ id: folder.id, name: folder.name, parentPath: path.slice(0, -(folder.name.length + 1)) })
      }
    }
    for (const file of result.files) files.set(file.id, file)
  }

  const counts = new Map<string, number>()
  for (const file of files.values()) {
    const folder = folders.get(file.folderId)
    if (!folder) throw new Error('사진이 속한 폴더 정보가 누락됐습니다. 기존 사진 목록을 유지합니다')
    counts.set(folder.id, (counts.get(folder.id) ?? 0) + 1)
    const image = { ...file, folderName: folder.name, path: folder.path }
    const fileKey = imageCodeKey(file.name, true)
    const folderKey = imageCodeKey(folder.name)
    if (fileKey) (index.byFileKey[fileKey] ??= []).push(image)
    if (folderKey && folderKey !== fileKey) (index.byFileKey[folderKey] ??= []).push(image)
  }
  for (const folder of folders.values()) {
    const count = counts.get(folder.id) ?? 0
    if (!count) continue
    ;(index.byFolderKey[imageCodeKey(folder.name)] ??= []).push({
      folderId: folder.id, folderName: folder.name, path: folder.path, count,
    })
  }
  index.fileCount = files.size
  index.folderCount = counts.size
  return index
}

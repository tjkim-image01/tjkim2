/** Recursive Drive indexes support both product folders and year folders. */
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { folderImages, imageIndexRoot, imageIndexRoots, type FolderImage } from './api'
import { imageCodeKey, type ImageIndex } from './image-match'

export { driveId, findCandidates, itemImages, imagesInLinkedFolder } from './image-match'
export type { ImageIndex, Candidate } from './image-match'
export type { FolderImage }

const INDEX_KEY = 'admin001.image-index'
export const IMAGE_ARCHIVE_ID = '1oQ55NzBeK_7ZttxFoazJD0Q16iz3fCXB'

export async function readImageIndex(): Promise<ImageIndex> {
  const cached = await idbGet<ImageIndex>(INDEX_KEY).catch(() => undefined)
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}drive-image-index.json`, { cache: 'no-cache' })
    if (!response.ok) throw new Error(`이미지 목록을 읽지 못했습니다 (${response.status})`)
    const published = await response.json() as ImageIndex
    if (published.version !== 2 || !published.byFileKey) throw new Error('이미지 목록 형식이 올바르지 않습니다')
    return cached?.version === 2 && cached.builtAt > published.builtAt ? cached : published
  } catch (error) {
    if (cached?.version === 2) return cached
    throw error
  }
}

export async function buildImageIndex(onProgress: (msg: string) => void): Promise<ImageIndex> {
  onProgress('이미지 루트 폴더 확인 중…')
  const roots = await imageIndexRoots()
  if (roots.length === 0) throw new Error('이미지폴더 탭에 사용 중인 루트가 없습니다')
  const index: ImageIndex = {
    version: 2, builtAt: Date.now(), sourceFolderId: IMAGE_ARCHIVE_ID,
    fileCount: 0, folderCount: 0, truncatedRoots: [], byFolderKey: {}, byFileKey: {},
  }
  const seenFiles = new Set<string>()
  const seenFolders = new Set<string>()
  for (let i = 0; i < roots.length; i++) {
    const root = roots[i]
    onProgress(`${i + 1}/${roots.length} ${root.name} 순회 중…`)
    const result = await imageIndexRoot(root.id)
    if (result.truncated) index.truncatedRoots.push(root.name)
    const folderById = new Map(result.folders.map((folder) => [folder.id, folder]))
    const counts = new Map<string, number>()
    for (const file of result.files) {
      counts.set(file.folderId, (counts.get(file.folderId) ?? 0) + 1)
      if (seenFiles.has(file.id)) continue
      seenFiles.add(file.id)
      const folder = folderById.get(file.folderId)
      const image = { ...file, folderName: folder?.name ?? '', path: folder?.path ?? '' }
      const fileKey = imageCodeKey(file.name, true)
      if (fileKey) (index.byFileKey[fileKey] ??= []).push(image)
      const folderKey = imageCodeKey(folder?.name ?? '')
      if (folderKey && folderKey !== fileKey) (index.byFileKey[folderKey] ??= []).push(image)
    }
    for (const folder of result.folders) {
      const count = counts.get(folder.id) ?? 0
      if (!count || seenFolders.has(folder.id)) continue
      seenFolders.add(folder.id)
      const key = imageCodeKey(folder.name)
      ;(index.byFolderKey[key] ??= []).push({ folderId: folder.id, folderName: folder.name, path: folder.path, count })
    }
  }
  if (index.truncatedRoots.length) throw new Error(`일부 폴더만 읽었습니다. 이전 이미지 목록을 유지합니다: ${index.truncatedRoots.join(', ')}`)
  index.fileCount = seenFiles.size
  index.folderCount = seenFolders.size
  await idbSet(INDEX_KEY, index)
  return index
}

export function listFolderImages(folderId: string): Promise<FolderImage[]> {
  return folderImages(folderId)
}

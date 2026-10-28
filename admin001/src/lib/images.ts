/** Recursive Drive indexes support both product folders and year folders. */
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { folderImages, imageIndexRoot, imageIndexRoots, type FolderImage, type IndexRoot } from './api'
import { driveId, type ImageIndex } from './image-match'
import { scanImageRoots } from './image-index'

export { driveId, findCandidates, itemImages, imagesInLinkedFolder } from './image-match'
export type { ImageIndex, Candidate } from './image-match'
export type { FolderImage }

const INDEX_KEY = 'admin001.image-index'
const ROOTS_KEY = 'admin001.local-image-roots'
export const IMAGE_ARCHIVE_ID = '1oQ55NzBeK_7ZttxFoazJD0Q16iz3fCXB'

export function localImageRoots(): IndexRoot[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(ROOTS_KEY) ?? '[]')
    return Array.isArray(saved) ? saved.filter((root): root is IndexRoot =>
      root && typeof root.id === 'string' && driveId(root.id) === root.id && typeof root.name === 'string',
    ) : []
  } catch {
    return []
  }
}

export function saveLocalImageRoots(roots: IndexRoot[]) {
  localStorage.setItem(ROOTS_KEY, JSON.stringify(roots))
}

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

export async function buildImageIndex(onProgress: (msg: string) => void, configuredRoots?: IndexRoot[]): Promise<ImageIndex> {
  onProgress('이미지 상위 폴더 확인 중…')
  const roots = configuredRoots ?? [...await imageIndexRoots(), ...localImageRoots()]
  const index = await scanImageRoots(roots, imageIndexRoot, onProgress)
  await idbSet(INDEX_KEY, index)
  return index
}

export function listFolderImages(folderId: string): Promise<FolderImage[]> {
  return folderImages(folderId)
}

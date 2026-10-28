/** Keep code punctuation: ABC-1 must never become ABC1. */
export function imageCodeKey(value: string, filename = false): string {
  let result = value.normalize('NFKC').trim()
  if (filename) result = result
    .replace(/\.[^.]+$/, '')
    .replace(/^\[(?:크기변환|크기변경|리사이즈)\]\s*/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
  return result.toLowerCase().replace(/\s+/g, '')
}

export interface IndexedImage {
  id: string
  name: string
  folderId: string
  folderName: string
  path?: string
}

export interface ImageIndex {
  version: 2
  builtAt: number
  sourceFolderId?: string
  rootIds?: string[]
  fileCount: number
  folderCount: number
  truncatedRoots: string[]
  byFolderKey: Record<string, { folderId: string; folderName: string; path: string; count: number }[]>
  byFileKey: Record<string, IndexedImage[]>
}

export interface Candidate {
  folderId: string
  folderName: string
  path: string
  matchType: 'folder' | 'filename'
  fileIds: string[]
}

/** Historical notes in image columns are not valid Drive IDs. */
export function driveId(value = ''): string {
  if (/^[A-Za-z0-9_-]{20,200}$/.test(value.trim())) return value.trim()
  try {
    const url = new URL(value)
    if (url.hostname !== 'drive.google.com') return ''
    const id = url.pathname.match(/\/(?:d|folders)\/([A-Za-z0-9_-]+)/)?.[1] ?? url.searchParams.get('id') ?? ''
    return /^[A-Za-z0-9_-]{20,200}$/.test(id) ? id : ''
  } catch {
    return ''
  }
}

export function itemImages(index: ImageIndex | null, itemCode: string): IndexedImage[] {
  const images = index?.byFileKey[imageCodeKey(itemCode)] ?? []
  const number = (name: string) => Number(name.match(/\((\d+)\)\.[^.]+$/)?.[1] ?? 0)
  return [...new Map(images.map((image) => [image.id, image])).values()].sort((a, b) =>
    number(a.name) - number(b.name) || a.name.localeCompare(b.name, 'ko', { numeric: true }) || a.id.localeCompare(b.id),
  )
}

export function findCandidates(index: ImageIndex, itemCode: string): Candidate[] {
  const key = imageCodeKey(itemCode)
  const candidates = new Map<string, Candidate>()
  for (const folder of index.byFolderKey[key] ?? []) {
    candidates.set(folder.folderId, { ...folder, matchType: 'folder', fileIds: [] })
  }
  for (const image of itemImages(index, itemCode)) {
    const candidate = candidates.get(image.folderId) ?? {
      folderId: image.folderId, folderName: image.folderName,
      path: image.path || image.folderName, matchType: 'filename' as const, fileIds: [],
    }
    candidate.fileIds.push(image.id)
    candidates.set(image.folderId, candidate)
  }
  return [...candidates.values()]
}

/** A year folder contains many products; hide its neighbours' pictures. */
export function imagesInLinkedFolder<T extends { name: string }>(images: T[], code: string, sharedFolder: boolean): T[] {
  const matching = images.filter((image) => imageCodeKey(image.name, true) === imageCodeKey(code))
  const containsOtherItems = images.some((image) => /^(?:ab|am|ao|ap)(?:[a-z]{2})?\d{6,}/.test(imageCodeKey(image.name, true)))
  return matching.length || sharedFolder || containsOtherItems ? matching : images
}

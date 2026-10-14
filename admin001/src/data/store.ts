/**
 * 데이터 적재·캐시·검색 — 전부 브라우저 안에서.
 *
 * - Apps Script API에서 시트 4탭(BOOK/MAP/OTHER/PRINT)과 보조 탭을 한 번에 받는다.
 * - IndexedDB에 저장하고, 시트 수정 시각이 같으면 그대로 쓴다.
 * - 검색·필터는 메모리에서 한다 (9천 행이면 수십 ms).
 */

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { APPLICATION_FIELDS, ITEM_TYPES, KEY_FIELD, SEARCH_FIELDS, type ItemType } from './fields'
import {
  imageStatus,
  isFlag,
  normalizeKey,
  parseApplication,
  parseNumber,
  splitList,
  text,
  yearRange,
  type Application,
  type ImageStatus,
} from './parse'
import { fetchRawDataset } from '../lib/api'

export const ITEM_TABS: ItemType[] = [...ITEM_TYPES]
export const AUX_TABS = ['동의어', '카테고리', '시대', '이미지폴더', '설정'] as const

export interface Item {
  code: string
  tab: ItemType
  row: number // 적재 당시 행 번호(1-based). 쓰기 때는 서버가 다시 찾는다
  cells: Record<string, string> // 헤더 → 원문
  // 파생
  type: ItemType
  title: string
  maker: string
  yearFrom: number | null
  yearTo: number | null
  qty: number | null
  listPriceKrw: number | null
  salePriceUsd: number | null
  image: ImageStatus
  overseas: boolean
  shopPublished: boolean
  location: string
  categories: string[]
  eras: string[]
  applications: Application[]
  searchText: string // 소문자 결합 텍스트
  codeKey: string // normalizeKey(code)
}

export interface Synonym {
  conceptId: string
  canonical: string
  term: string
  relation: string
  weight: number
  active: boolean
}

export interface Dataset {
  spreadsheetId: string
  title: string
  modifiedTime: string
  loadedAt: number
  headers: Record<string, string[]> // 탭 → 헤더 배열
  items: Item[]
  synonyms: Synonym[]
  categories: { top: string; sub: string | null; active: boolean }[]
  eras: { code: string; name: string; from: number | null; to: number | null; active: boolean }[]
  imageRoots: { name: string; folderId: string; active: boolean }[]
  settings: Record<string, string>
}

const CACHE_KEY = 'admin001.dataset'

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const rec: Record<string, string> = {}
  headers.forEach((h, i) => {
    if (h) rec[h] = text(row[i])
  })
  return rec
}

export function buildItem(tab: ItemType, row: number, cells: Record<string, string>): Item {
  const code = cells[KEY_FIELD]
  const [yearFrom0, yearTo0] = yearRange(cells['Year'] ?? '')
  const yearFrom = parseNumber(cells['연도from'] ?? '') ?? yearFrom0
  const yearTo = parseNumber(cells['연도to'] ?? '') ?? yearTo0
  const typeRaw = text(cells['Type']).toUpperCase() as ItemType
  const type = (ITEM_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : tab
  const applications: Application[] = []
  for (const col of APPLICATION_FIELDS) {
    const parsed = parseApplication(col, cells[col] ?? '')
    if (parsed) applications.push(parsed)
  }
  const location = cells['Location'] ?? ''
  const searchText = SEARCH_FIELDS.map((f) => cells[f] ?? '')
    .join(' \n ')
    .toLowerCase()
  return {
    code,
    tab,
    row,
    cells,
    type,
    title: cells['TITLE'] ?? '',
    maker: cells['Maker (CN)'] ?? '',
    yearFrom,
    yearTo,
    qty: parseNumber(cells['QTY'] ?? ''),
    listPriceKrw: parseNumber(cells['정가 (원)'] ?? ''),
    salePriceUsd: parseNumber(cells['판매가 (US$)'] ?? ''),
    image: imageStatus(cells['Image'] ?? ''),
    overseas: isFlag(cells['해외보관'] ?? '') || location.startsWith('00'),
    shopPublished: isFlag(cells['Shop게시'] ?? ''),
    location,
    categories: splitList(cells['카테고리'] ?? ''),
    eras: splitList(cells['시대'] ?? ''),
    applications,
    searchText,
    codeKey: normalizeKey(code),
  }
}

export async function fetchDataset(onProgress?: (msg: string) => void): Promise<Dataset> {
  onProgress?.('시트 전체를 받는 중… (몇 초 걸립니다)')
  const raw = await fetchRawDataset()
  const values = raw.tabs
  const itemTabs = ITEM_TABS.filter((t) => values[t])
  if (itemTabs.length === 0) throw new Error('시트에 BOOK/MAP/OTHER/PRINT 탭이 없습니다')

  const headers: Record<string, string[]> = {}
  const items: Item[] = []
  const seen = new Set<string>()
  for (const tab of itemTabs) {
    const rows = values[tab] ?? []
    const head = (rows[0] ?? []).map((h) => text(h))
    headers[tab] = head
    for (let i = 1; i < rows.length; i++) {
      const cells = rowToRecord(head, rows[i])
      const code = cells[KEY_FIELD]
      if (!code || seen.has(code)) continue
      seen.add(code)
      items.push(buildItem(tab, i + 1, cells))
    }
  }

  const aux = (tab: string) => {
    const rows = values[tab] ?? []
    const head = (rows[0] ?? []).map((h) => text(h))
    headers[tab] = head
    return rows.slice(1).map((r) => rowToRecord(head, r))
  }
  const synonyms: Synonym[] = aux('동의어')
    .filter((r) => r['표현'])
    .map((r) => ({
      conceptId: r['개념ID'],
      canonical: r['대표어'],
      term: r['표현'],
      relation: r['관계'] || 'synonym',
      weight: parseNumber(r['가중치']) ?? 1,
      active: r['사용'] === '' ? true : isFlag(r['사용']),
    }))
  const categories = aux('카테고리').map((r) => ({
    top: r['대분류'],
    sub: r['소분류'] || null,
    active: r['사용'] === '' ? true : isFlag(r['사용']),
  }))
  const eras = aux('시대').map((r) => ({
    code: r['코드'],
    name: r['이름'],
    from: parseNumber(r['시작연도']),
    to: parseNumber(r['끝연도']),
    active: r['사용'] === '' ? true : isFlag(r['사용']),
  }))
  const imageRoots = aux('이미지폴더').map((r) => ({
    name: r['이름'],
    folderId: r['폴더ID'],
    active: r['사용'] === '' ? true : isFlag(r['사용']),
  }))
  const settings: Record<string, string> = {}
  for (const r of aux('설정')) if (r['키']) settings[r['키']] = r['값']

  const dataset: Dataset = {
    spreadsheetId: raw.spreadsheetId,
    title: raw.title,
    modifiedTime: raw.modifiedTime,
    loadedAt: Date.now(),
    headers,
    items,
    synonyms,
    categories,
    eras,
    imageRoots,
    settings,
  }
  try {
    await idbSet(CACHE_KEY, dataset)
  } catch {
    /* 캐시 실패는 무시 */
  }
  return dataset
}

export async function readCachedDataset(): Promise<Dataset | null> {
  try {
    return ((await idbGet(CACHE_KEY)) as Dataset | undefined) ?? null
  } catch {
    return null
  }
}

export async function clearCachedDataset() {
  try {
    await idbDel(CACHE_KEY)
  } catch {
    /* 무시 */
  }
}

/** 캐시가 10분 이내면 캐시를, 아니면 새로 받는다. 새로고침 버튼은 force. */
export async function loadDataset(onProgress?: (msg: string) => void, force = false): Promise<Dataset> {
  if (!force) {
    const cached = await readCachedDataset()
    if (cached && Date.now() - cached.loadedAt < 10 * 60 * 1000) return cached
  }
  return fetchDataset(onProgress)
}

// ---- 검색 -------------------------------------------------------------------

export interface Filters {
  q: string
  type: ItemType | ''
  image: ImageStatus | ''
  overseas: '' | 'Y' | 'N'
  location: string
  yearFrom: number | null
  yearTo: number | null
  priceMin: number | null
  priceMax: number | null
  category: string
  era: string
  shop: '' | 'Y' | 'N'
}

export const EMPTY_FILTERS: Filters = {
  q: '',
  type: '',
  image: '',
  overseas: '',
  location: '',
  yearFrom: null,
  yearTo: null,
  priceMin: null,
  priceMax: null,
  category: '',
  era: '',
  shop: '',
}

export interface ExpandedTerm {
  term: string
  canonical: string
}

/** 검색어를 동의어로 확장한다. 따옴표로 감싼 말과 Item No. 모양은 확장하지 않는다. */
export function expandTerms(q: string, synonyms: Synonym[]): { terms: string[]; expanded: ExpandedTerm[] } {
  const tokens = q.match(/"[^"]+"|\S+/g) ?? []
  const terms: string[] = []
  const expanded: ExpandedTerm[] = []
  for (const tok of tokens) {
    if (tok.startsWith('"') && tok.endsWith('"')) {
      terms.push(tok.slice(1, -1).toLowerCase())
      continue
    }
    const low = tok.toLowerCase()
    terms.push(low)
    if (/^[a-z]{2,4}\d{8,}/i.test(tok)) continue
    const key = normalizeKey(tok)
    const concepts = new Set(synonyms.filter((s) => s.active && normalizeKey(s.term) === key).map((s) => s.conceptId))
    for (const s of synonyms) {
      if (!s.active || !concepts.has(s.conceptId)) continue
      const t = s.term.toLowerCase()
      if (t !== low && !terms.includes(t)) {
        terms.push(t)
        expanded.push({ term: s.term, canonical: s.canonical })
      }
    }
  }
  return { terms, expanded }
}

export function searchItems(items: Item[], filters: Filters, synonyms: Synonym[], excluded: string[] = []) {
  const { terms, expanded } = expandTerms(filters.q.trim(), synonyms)
  const activeTerms = terms.filter((t) => !excluded.includes(t))
  const codeQuery = filters.q.trim() ? normalizeKey(filters.q.trim()) : ''
  const location = filters.location.toLowerCase()
  const result = items.filter((it) => {
    if (filters.type && it.type !== filters.type) return false
    if (filters.image && it.image !== filters.image) return false
    if (filters.overseas === 'Y' && !it.overseas) return false
    if (filters.overseas === 'N' && it.overseas) return false
    if (filters.shop === 'Y' && !it.shopPublished) return false
    if (filters.shop === 'N' && it.shopPublished) return false
    if (location && !it.location.toLowerCase().includes(location)) return false
    if (filters.yearFrom !== null && (it.yearFrom === null || (it.yearTo ?? it.yearFrom) < filters.yearFrom)) return false
    if (filters.yearTo !== null && (it.yearFrom === null || it.yearFrom > filters.yearTo)) return false
    if (filters.priceMin !== null && (it.listPriceKrw === null || it.listPriceKrw < filters.priceMin)) return false
    if (filters.priceMax !== null && (it.listPriceKrw === null || it.listPriceKrw > filters.priceMax)) return false
    if (filters.category && !it.categories.some((c) => c === filters.category)) return false
    if (filters.era && !it.eras.some((e) => e === filters.era)) return false
    if (activeTerms.length === 0) return true
    if (codeQuery && it.codeKey.startsWith(codeQuery)) return true
    return activeTerms.some((t) => it.searchText.includes(t))
  })
  // 코드 정확 일치 → 코드 접두 일치 → 나머지
  if (codeQuery) {
    result.sort((a, b) => rank(a, codeQuery) - rank(b, codeQuery))
  }
  return { items: result, expanded }
}

function rank(it: Item, codeQuery: string): number {
  if (it.codeKey === codeQuery) return 0
  if (it.codeKey.startsWith(codeQuery)) return 1
  return 2
}

/** 같은 기관에 이미 제안한 적이 있는지 (중복 신청 경고) */
export function findDuplicateApplication(item: Item, institution: string): Application | null {
  const key = normalizeKey(institution)
  if (!key) return null
  return item.applications.find((a) => normalizeKey(a.institution) === key || normalizeKey(a.institution).includes(key)) ?? null
}

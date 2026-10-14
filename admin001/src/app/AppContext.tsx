/**
 * 전역 상태: 설정, 로그인 사용자, 데이터셋(시트 전체), 저장 큐.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { readConfig, writeConfig, type AppConfig } from '../config'
import {
  AuthError,
  currentToken,
  fetchUserInfo,
  getStoredUser,
  requestToken,
  signOut as googleSignOut,
  type GoogleUser,
} from '../lib/google'
import { appendRow, configureAuth, readKeyColumn, updateCells, type CellValue } from '../lib/sheets'
import { buildItem, clearCachedDataset, loadDataset, type Dataset, type Item } from '../data/store'
import { KEY_FIELD, type ItemType } from '../data/fields'

export type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'saved'; at: number } | { status: 'error'; message: string }

interface AppState {
  config: AppConfig
  setConfig: (c: AppConfig) => void
  user: GoogleUser | null
  signIn: () => Promise<void>
  signOut: () => void
  dataset: Dataset | null
  loading: boolean
  progress: string
  error: string | null
  reload: (force?: boolean) => Promise<void>
  /** 물건 한 건의 셀 여러 개를 시트에 쓴다. 성공하면 메모리 데이터도 갱신한다. */
  saveCells: (item: Item, changes: Record<string, CellValue>) => Promise<void>
  /** 새 물건 행 추가 */
  createItem: (tab: ItemType, cells: Record<string, CellValue>) => Promise<Item>
  saveState: Record<string, SaveState> // itemCode → 상태
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppProvider 밖에서 useApp을 호출했습니다')
  return v
}

function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig>(() => readConfig())
  const [user, setUser] = useState<GoogleUser | null>(() => (currentToken() ? getStoredUser() : null))
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  const loadingRef = useRef(false)

  useEffect(() => {
    configureAuth(config.clientId)
  }, [config.clientId])

  const setConfig = useCallback((c: AppConfig) => {
    writeConfig(c)
    setConfigState(c)
    setDataset(null)
  }, [])

  const reload = useCallback(
    async (force = false) => {
      if (!config.spreadsheetId || loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        if (force) await clearCachedDataset(config.spreadsheetId)
        const ds = await loadDataset(config.spreadsheetId, setProgress, force)
        setDataset(ds)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        if (e instanceof AuthError) setUser(null)
      } finally {
        setLoading(false)
        setProgress('')
        loadingRef.current = false
      }
    },
    [config.spreadsheetId],
  )

  const signIn = useCallback(async () => {
    setError(null)
    const token = await requestToken(config.clientId, true)
    const info = await fetchUserInfo(token.access_token)
    setUser(info)
  }, [config.clientId])

  const signOut = useCallback(() => {
    googleSignOut()
    setUser(null)
    setDataset(null)
  }, [])

  // 로그인돼 있고 시트가 정해져 있으면 자동 적재
  useEffect(() => {
    if (user && config.spreadsheetId && !dataset && !loading) void reload()
  }, [user, config.spreadsheetId, dataset, loading, reload])

  const replaceItem = useCallback((next: Item) => {
    setDataset((prev) => {
      if (!prev) return prev
      const idx = prev.items.findIndex((i) => i.code === next.code)
      const items = idx >= 0 ? prev.items.map((i, k) => (k === idx ? next : i)) : [...prev.items, next]
      return { ...prev, items }
    })
  }, [])

  const saveCells = useCallback(
    async (item: Item, changes: Record<string, CellValue>) => {
      if (!dataset) return
      const code = item.code
      setSaveState((s) => ({ ...s, [code]: { status: 'saving' } }))
      try {
        const headers = dataset.headers[item.tab]
        const keyCol = headers.indexOf(KEY_FIELD)
        if (keyCol < 0) throw new Error(`${item.tab} 탭에 ${KEY_FIELD} 열이 없습니다`)
        // 쓰기 직전에 키 열을 다시 읽어 행을 찾는다
        const keyMap = await readKeyColumn(dataset.spreadsheetId, item.tab, colLetter(keyCol))
        const row = keyMap.get(code)
        if (!row) throw new Error('시트에서 이 물건의 행을 찾지 못했습니다. 시트에서 지워졌을 수 있습니다')
        const stamped: Record<string, CellValue> = { ...changes, 수정일시: nowStamp(), 수정자: user?.email ?? '' }
        const updates = Object.entries(stamped)
          .filter(([key]) => headers.includes(key))
          .map(([key, value]) => ({ tab: item.tab, row, col0: headers.indexOf(key), value }))
        await updateCells(dataset.spreadsheetId, updates)
        const cells = { ...item.cells }
        for (const [k, v] of Object.entries(stamped)) if (headers.includes(k)) cells[k] = v === null ? '' : String(v)
        replaceItem(buildItem(item.tab, row, cells))
        setSaveState((s) => ({ ...s, [code]: { status: 'saved', at: Date.now() } }))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setSaveState((s) => ({ ...s, [code]: { status: 'error', message } }))
        if (e instanceof AuthError) setUser(null)
        throw e
      }
    },
    [dataset, replaceItem, user?.email],
  )

  const createItem = useCallback(
    async (tab: ItemType, cells: Record<string, CellValue>) => {
      if (!dataset) throw new Error('데이터가 아직 없습니다')
      const headers = dataset.headers[tab]
      const code = String(cells[KEY_FIELD] ?? '').trim()
      if (!code) throw new Error('Item No.가 비었습니다')
      if (dataset.items.some((i) => i.code === code)) throw new Error('이미 있는 Item No.입니다')
      const keyMap = await readKeyColumn(dataset.spreadsheetId, tab, colLetter(headers.indexOf(KEY_FIELD)))
      if (keyMap.has(code)) throw new Error('시트에 이미 있는 Item No.입니다')
      const stamped: Record<string, CellValue> = { ...cells, Type: tab, 수정일시: nowStamp(), 수정자: user?.email ?? '' }
      const values = headers.map((h) => stamped[h] ?? '')
      const row = await appendRow(dataset.spreadsheetId, tab, values)
      const record: Record<string, string> = {}
      headers.forEach((h, i) => {
        const v = values[i]
        record[h] = v === null ? '' : String(v)
      })
      const item = buildItem(tab, row, record)
      replaceItem(item)
      return item
    },
    [dataset, replaceItem, user?.email],
  )

  const value = useMemo<AppState>(
    () => ({ config, setConfig, user, signIn, signOut, dataset, loading, progress, error, reload, saveCells, createItem, saveState }),
    [config, setConfig, user, signIn, signOut, dataset, loading, progress, error, reload, saveCells, createItem, saveState],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function colLetter(index0: number): string {
  let n = index0 + 1
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

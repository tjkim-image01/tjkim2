/**
 * 전역 상태: 설정(API 주소), 로그인 사용자, 데이터셋(시트 전체), 저장 상태.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { readConfig, writeConfig, type AppConfig } from '../config'
import {
  AuthError,
  appendRow,
  clearSession,
  configureApi,
  getStoredUser,
  getToken,
  login as apiLogin,
  updateCells,
  type ApiUser,
  type CellValue,
} from '../lib/api'
import { buildItem, clearCachedDataset, loadDataset, type Dataset, type Item } from '../data/store'
import { KEY_FIELD, type ItemType } from '../data/fields'
import { readImageIndex, type ImageIndex } from '../lib/images'

export type SaveState = { status: 'idle' } | { status: 'saving' } | { status: 'saved'; at: number } | { status: 'error'; message: string }

interface AppState {
  config: AppConfig
  setConfig: (c: AppConfig) => void
  user: ApiUser | null
  signIn: (username: string, password: string) => Promise<void>
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
  imageIndex: ImageIndex | null
  imageLoading: boolean
  imageError: string | null
  setImageIndex: (index: ImageIndex) => void
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('AppProvider 밖에서 useApp을 호출했습니다')
  return v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<AppConfig>(() => readConfig())
  const [user, setUser] = useState<ApiUser | null>(() => (getToken() ? getStoredUser() : null))
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  const [imageIndex, setImageIndex] = useState<ImageIndex | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  configureApi(config.apiUrl)
  useEffect(() => {
    configureApi(config.apiUrl)
  }, [config.apiUrl])

  useEffect(() => {
    if (!user) return
    let active = true
    setImageLoading(true)
    setImageError(null)
    void readImageIndex().then((index) => {
      if (active) setImageIndex(index)
    }).catch((error: unknown) => {
      if (active) setImageError(error instanceof Error ? error.message : String(error))
    }).finally(() => {
      if (active) setImageLoading(false)
    })
    return () => { active = false }
  }, [user, config.apiUrl])

  const setConfig = useCallback((c: AppConfig) => {
    writeConfig(c)
    setConfigState(c)
    setDataset(null)
  }, [])

  const reload = useCallback(
    async (force = false) => {
      if (!config.apiUrl || loadingRef.current) return
      loadingRef.current = true
      setLoading(true)
      setError(null)
      try {
        if (force) await clearCachedDataset()
        const ds = await loadDataset(setProgress, force)
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
    [config.apiUrl],
  )

  const signIn = useCallback(async (username: string, password: string) => {
    setError(null)
    const info = await apiLogin(username, password)
    setUser(info)
  }, [])

  const signOut = useCallback(() => {
    clearSession()
    setUser(null)
    setDataset(null)
  }, [])

  // 로그인돼 있고 API가 정해져 있으면 자동 적재
  useEffect(() => {
    if (user && config.apiUrl && !dataset && !loading && !error) void reload()
  }, [user, config.apiUrl, dataset, loading, error, reload])

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
        const result = await updateCells(item.tab, code, changes)
        const cells = { ...item.cells, ...result.written }
        replaceItem(buildItem(item.tab, result.row, cells))
        setSaveState((s) => ({ ...s, [code]: { status: 'saved', at: Date.now() } }))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setSaveState((s) => ({ ...s, [code]: { status: 'error', message } }))
        if (e instanceof AuthError) setUser(null)
        throw e
      }
    },
    [dataset, replaceItem],
  )

  const createItem = useCallback(
    async (tab: ItemType, cells: Record<string, CellValue>) => {
      if (!dataset) throw new Error('데이터가 아직 없습니다')
      const code = String(cells[KEY_FIELD] ?? '').trim()
      if (!code) throw new Error('Item No.가 비었습니다')
      if (dataset.items.some((i) => i.code === code)) throw new Error('이미 있는 Item No.입니다')
      const result = await appendRow(tab, cells)
      const item = buildItem(tab, result.row, result.cells)
      replaceItem(item)
      return item
    },
    [dataset, replaceItem],
  )

  const value = useMemo<AppState>(
    () => ({ config, setConfig, user, signIn, signOut, dataset, loading, progress, error, reload, saveCells, createItem, saveState,
      imageIndex, imageLoading, imageError, setImageIndex }),
    [config, setConfig, user, signIn, signOut, dataset, loading, progress, error, reload, saveCells, createItem, saveState,
      imageIndex, imageLoading, imageError],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

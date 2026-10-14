import { useEffect } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from './AppContext'
import { APP_NAME } from '../config'
import LoginPage from '../pages/LoginPage'
import ListPage from '../pages/ListPage'
import DetailPage from '../pages/DetailPage'
import NewPage from '../pages/NewPage'
import SettingsPage from '../pages/SettingsPage'
import ImagesPage from '../pages/ImagesPage'
import { Icon } from '../components/Icon'

function TopBar() {
  const { dataset, loading, progress, reload, user, signOut, error } = useApp()
  const synced = dataset ? new Date(dataset.loadedAt) : null
  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className={`dot ${error ? 'dot-error' : loading ? 'dot-busy' : dataset ? 'dot-ok' : ''}`} />
        <span className="topbar-title">{dataset?.title ?? APP_NAME}</span>
        {dataset && (
          <span className="muted small">
            {dataset.items.length.toLocaleString()}건 · 동기화 {synced?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {loading && <span className="muted small">{progress || '불러오는 중…'}</span>}
        {error && <span className="error small">{error}</span>}
      </div>
      <div className="topbar-right">
        <button type="button" className="btn btn-ghost" onClick={() => void reload(true)} disabled={loading} title="시트에서 다시 읽기">
          <Icon name="refresh" /> 새로고침
        </button>
        {dataset && (
          <a className="btn btn-ghost" href={`https://docs.google.com/spreadsheets/d/${dataset.spreadsheetId}`} target="_blank" rel="noreferrer" title="Google 시트 열기">
            <Icon name="sheet" /> 시트
          </a>
        )}
        {user && (
          <button type="button" className="btn btn-ghost user-chip" onClick={signOut} title="로그아웃">
            <Icon name="user" />
            <span>{user.name}</span>
          </button>
        )}
      </div>
    </header>
  )
}

function Rail() {
  const items = [
    { to: '/', icon: 'search', label: '검색' },
    { to: '/new', icon: 'plus', label: '등록' },
    { to: '/images', icon: 'image', label: '이미지' },
    { to: '/settings', icon: 'settings', label: '설정' },
  ] as const
  return (
    <nav className="rail" aria-label="주 메뉴">
      <div className="rail-logo" title={APP_NAME}>tj</div>
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.to === '/'} className={({ isActive }: { isActive: boolean }) => `rail-item${isActive ? ' active' : ''}`}>
          <Icon name={it.icon} />
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  const { config, user } = useApp()
  const location = useLocation()
  const navigate = useNavigate()
  const configured = Boolean(config.apiUrl)

  // '/' 키로 검색창 포커스
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      e.preventDefault()
      if (location.pathname !== '/') navigate('/')
      requestAnimationFrame(() => document.getElementById('global-search')?.focus())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [location.pathname, navigate])

  if (!configured && location.pathname !== '/settings') return <Navigate to="/settings" replace />
  if (!user && location.pathname !== '/settings') return <LoginPage />

  return (
    <div className="shell">
      <Rail />
      <div className="shell-main">
        <TopBar />
        <main className="content">
          <Routes>
            <Route path="/" element={<ListPage />} />
            <Route path="/item/:code" element={<DetailPage />} />
            <Route path="/new" element={<NewPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

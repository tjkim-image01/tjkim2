import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { APP_NAME } from '../config'

export default function LoginPage() {
  const { signIn, config } = useApp()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn(username.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={(e) => void submit(e)}>
        <div className="login-mark">tj</div>
        <h1>{APP_NAME}</h1>
        <p className="muted">Google 시트에 있는 소장품 목록을 보고 고칩니다.</p>
        <label className="login-field">
          <span>아이디</span>
          <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label className="login-field">
          <span>비밀번호</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !config.apiUrl || !password}>
          {busy ? '확인 중…' : '로그인'}
        </button>
        {error && <p className="error">{error}</p>}
        {!config.apiUrl && (
          <p className="error">
            API 주소가 없습니다. <Link to="/settings">설정</Link>에서 Apps Script 웹 앱 주소를 입력하세요.
          </p>
        )}
      </form>
    </div>
  )
}

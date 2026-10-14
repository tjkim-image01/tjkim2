import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { APP_NAME } from '../config'

export default function LoginPage() {
  const { signIn, config } = useApp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onClick = async () => {
    setBusy(true)
    setError(null)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-mark">tj</div>
        <h1>{APP_NAME}</h1>
        <p className="muted">Google 시트에 있는 소장품 목록을 보고 고칩니다. 시트를 편집할 수 있는 Google 계정으로 들어오세요.</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={() => void onClick()} disabled={busy || !config.clientId}>
          <GoogleMark /> {busy ? '로그인 중…' : 'Google로 계속'}
        </button>
        {error && <p className="error">{error}</p>}
        {!config.clientId && (
          <p className="error">
            OAuth 클라이언트 ID가 없습니다. <Link to="/settings">설정</Link>에서 입력하세요.
          </p>
        )}
        <p className="muted small">처음 한 번 "확인되지 않은 앱" 경고가 나올 수 있습니다. 테스트 사용자로 등록된 계정이면 계속 진행하면 됩니다.</p>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.8 6C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

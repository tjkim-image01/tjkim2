import { useState } from 'react'
import { useApp } from '../app/AppContext'
import { parseSpreadsheetId } from '../config'
import { Icon } from '../components/Icon'

export default function SettingsPage() {
  const { config, setConfig, dataset, reload, loading, user } = useApp()
  const [clientId, setClientId] = useState(config.clientId)
  const [sheet, setSheet] = useState(config.spreadsheetId)
  const [saved, setSaved] = useState(false)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setConfig({ clientId: clientId.trim(), spreadsheetId: parseSpreadsheetId(sheet) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const origin = window.location.origin

  return (
    <section className="settings">
      <h1>설정</h1>

      <form className="form" onSubmit={save}>
        <h2>연결</h2>
        <div className="form-row">
          <label>
            <span>Google 시트</span>
            <input type="text" value={sheet} onChange={(e) => setSheet(e.target.value)} placeholder="시트 URL 또는 ID" />
            <small className="muted">BOOK · MAP · OTHER · PRINT 탭과 동의어 · 카테고리 · 시대 · 이미지폴더 탭이 있는 시트. 편집하려면 이 계정에 편집 권한이 있어야 합니다.</small>
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>OAuth 클라이언트 ID</span>
            <input type="text" className="mono" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
            <small className="muted">
              Google Cloud 콘솔 → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트(웹). 승인된 JavaScript 원본에 <span className="mono">{origin}</span> 을 넣습니다. 비밀값이 아니라 공개돼도 됩니다.
            </small>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">저장</button>
          {saved && <span className="ok"><Icon name="check" /> 저장됨</span>}
        </div>
      </form>

      <div className="form">
        <h2>데이터</h2>
        {dataset ? (
          <dl className="stats">
            <div><dt>시트</dt><dd><a href={`https://docs.google.com/spreadsheets/d/${dataset.spreadsheetId}`} target="_blank" rel="noreferrer">{dataset.title} <Icon name="external" size={14} /></a></dd></div>
            <div><dt>물건</dt><dd className="mono">{dataset.items.length.toLocaleString()}건</dd></div>
            <div><dt>탭</dt><dd>{Object.keys(dataset.headers).join(' · ')}</dd></div>
            <div><dt>동의어</dt><dd className="mono">{dataset.synonyms.length}표현</dd></div>
            <div><dt>카테고리</dt><dd className="mono">{dataset.categories.length}개</dd></div>
            <div><dt>시대</dt><dd className="mono">{dataset.eras.length}개</dd></div>
            <div><dt>이미지 루트</dt><dd className="mono">{dataset.imageRoots.length}개 폴더</dd></div>
            <div><dt>시트 수정 시각</dt><dd className="mono">{dataset.modifiedTime ? new Date(dataset.modifiedTime).toLocaleString('ko-KR') : '—'}</dd></div>
            <div><dt>마지막 적재</dt><dd className="mono">{new Date(dataset.loadedAt).toLocaleString('ko-KR')}</dd></div>
            <div><dt>로그인</dt><dd>{user?.email ?? '—'}</dd></div>
          </dl>
        ) : (
          <p className="muted">아직 불러온 데이터가 없습니다.</p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void reload(true)} disabled={loading || !config.spreadsheetId}>
            <Icon name="refresh" /> 캐시 지우고 다시 읽기
          </button>
        </div>
      </div>

      <div className="form">
        <h2>시트 구조</h2>
        <p className="muted small">
          앞 37열은 엑셀 원문 그대로이고, 뒤쪽 열(해외보관·연도from/to·시대·카테고리·지역·언어·Shop게시·이미지폴더·대표이미지·이야기·수정일시·수정자)은 어드민이 쓰는 보조 열입니다.
          열 순서를 바꿔도 되지만 <strong>헤더 이름은 바꾸지 마세요</strong>. 행은 시트에서 지워도 되고(어드민은 쓰기 전에 Item No.로 행을 다시 찾습니다), 정렬해도 됩니다.
        </p>
      </div>
    </section>
  )
}

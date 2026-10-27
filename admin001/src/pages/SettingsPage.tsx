import { useState } from 'react'
import { useApp } from '../app/AppContext'
import { Icon } from '../components/Icon'
import { changePassword, health } from '../lib/api'
import { IMAGE_ARCHIVE_ID } from '../lib/images'

export default function SettingsPage() {
  const { config, setConfig, dataset, reload, loading, user, imageIndex } = useApp()
  const [apiUrl, setApiUrl] = useState(config.apiUrl)
  const [saved, setSaved] = useState(false)
  const [check, setCheck] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle')
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<string | null>(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = apiUrl.trim()
    setCheck('checking')
    const ok = await health(url)
    setCheck(ok ? 'ok' : 'fail')
    setConfig({ apiUrl: url })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pw1.length < 4) return setPwMsg('4자 이상이어야 합니다')
    if (pw1 !== pw2) return setPwMsg('두 입력이 다릅니다')
    try {
      await changePassword(pw1)
      setPw1('')
      setPw2('')
      setPwMsg('바뀌었습니다. 다음 로그인부터 새 비밀번호를 씁니다')
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <section className="settings">
      <h1>설정</h1>

      <form className="form" onSubmit={(e) => void save(e)}>
        <h2>연결</h2>
        <div className="form-row">
          <label>
            <span>API 주소 (Apps Script 웹 앱)</span>
            <input type="text" className="mono" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" />
            <small className="muted">시트에 연결된 Apps Script를 "웹 앱 · 나로 실행 · 모든 사용자"로 배포하면 나오는 주소. 배포 절차는 매뉴얼 2.1절.</small>
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={check === 'checking'}>{check === 'checking' ? '확인 중…' : '저장'}</button>
          {saved && check === 'ok' && <span className="ok"><Icon name="check" /> 서버 응답 확인</span>}
          {saved && check === 'fail' && <span className="error"><Icon name="warn" /> 저장했지만 서버가 응답하지 않습니다</span>}
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
            <div><dt>이미지 보관함</dt><dd><a href={`https://drive.google.com/drive/folders/${IMAGE_ARCHIVE_ID}`} target="_blank" rel="noreferrer">Old Images26-1016 <Icon name="external" size={14} /></a></dd></div>
            {imageIndex && <div><dt>찾은 사진</dt><dd className="mono">{imageIndex.fileCount.toLocaleString()}장 · 제품번호로 자동 연결</dd></div>}
            <div><dt>시트 수정 시각</dt><dd className="mono">{dataset.modifiedTime ? new Date(dataset.modifiedTime).toLocaleString('ko-KR') : '—'}</dd></div>
            <div><dt>마지막 적재</dt><dd className="mono">{new Date(dataset.loadedAt).toLocaleString('ko-KR')}</dd></div>
            <div><dt>로그인</dt><dd>{user?.name ?? '—'}</dd></div>
          </dl>
        ) : (
          <p className="muted">아직 불러온 데이터가 없습니다.</p>
        )}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void reload(true)} disabled={loading || !config.apiUrl}>
            <Icon name="refresh" /> 캐시 지우고 다시 읽기
          </button>
        </div>
      </div>

      {user && (
        <form className="form" onSubmit={(e) => void submitPassword(e)}>
          <h2>비밀번호 변경</h2>
          <div className="form-row">
            <label>
              <span>새 비밀번호</span>
              <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password" />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>다시 입력</span>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-ghost" disabled={!pw1}>바꾸기</button>
            {pwMsg && <span className="small">{pwMsg}</span>}
          </div>
        </form>
      )}

      <div className="form">
        <h2>시트 구조</h2>
        <p className="muted small">
          앞 37열은 엑셀 원문 그대로이고, 뒤쪽 열(해외보관·연도from/to·시대·카테고리·지역·언어·Shop게시·이미지폴더·대표이미지·이야기·수정일시·수정자)은 어드민이 쓰는 보조 열입니다.
          열 순서를 바꿔도 되지만 <strong>헤더 이름은 바꾸지 마세요</strong>. 행은 시트에서 지워도 되고(저장할 때 Item No.로 행을 다시 찾습니다), 정렬해도 됩니다.
        </p>
      </div>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Icon } from '../components/Icon'
import { buildImageIndex, findCandidates, readImageIndex, type ImageIndex } from '../lib/images'
import { thumbnailUrl } from '../lib/api'

export default function ImagesPage() {
  const { dataset, saveCells } = useApp()
  const [index, setIndex] = useState<ImageIndex | null>(null)
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onlyUnlinked, setOnlyUnlinked] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(0)

  useEffect(() => {
    void readImageIndex().then(setIndex)
  }, [])

  const rebuild = async () => {
    setBusy(true)
    setError(null)
    try {
      setIndex(await buildImageIndex(setProgress))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const matches = useMemo(() => {
    if (!index || !dataset) return []
    const out: { code: string; title: string; linked: string; candidates: ReturnType<typeof findCandidates> }[] = []
    for (const it of dataset.items) {
      const linked = it.cells['이미지폴더'] ?? ''
      if (onlyUnlinked && linked) continue
      const candidates = findCandidates(index, it.code)
      if (candidates.length === 0) continue
      out.push({ code: it.code, title: it.title, linked, candidates })
    }
    return out
  }, [index, dataset, onlyUnlinked])

  const applyAll = async () => {
    if (!dataset) return
    const targets = matches.filter((m) => !m.linked && m.candidates.length === 1 && m.candidates[0].matchType === 'folder')
    if (targets.length === 0) return
    if (!window.confirm(`폴더명이 정확히 일치하는 ${targets.length}건을 시트에 연결합니다. 계속할까요?`)) return
    setApplying(true)
    setApplied(0)
    try {
      for (const m of targets) {
        const item = dataset.items.find((i) => i.code === m.code)
        if (!item) continue
        await saveCells(item, { 이미지폴더: m.candidates[0].folderId })
        setApplied((n) => n + 1)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <section className="images-page">
      <h1>이미지 연결</h1>
      <p className="muted">
        시트의 <span className="mono">이미지폴더</span> 탭에 적힌 Drive 루트를 서버가 순회해, 폴더명이나 파일명이 Item No.와 같은 것을 찾아 물건의 <span className="mono">이미지폴더</span> 열에 넣습니다.
      </p>
      <div className="form-actions">
        <button type="button" className="btn btn-primary" onClick={() => void rebuild()} disabled={busy}>
          <Icon name="refresh" /> {busy ? progress || '색인 중…' : '재색인'}
        </button>
        {index && (
          <span className="muted small">
            이미지 {index.fileCount.toLocaleString()}장 · 일치 가능 폴더 {index.folderCount.toLocaleString()}개 · {new Date(index.builtAt).toLocaleString('ko-KR')}
            {index.truncatedRoots.length > 0 && ` · 일부만 순회: ${index.truncatedRoots.join(', ')}`}
          </span>
        )}
        {error && <span className="error">{error}</span>}
      </div>

      {index && dataset && (
        <>
          <div className="form-actions">
            <label className="check">
              <input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} /> 아직 연결 안 된 물건만
            </label>
            <button type="button" className="btn btn-ghost" onClick={() => void applyAll()} disabled={applying}>
              {applying ? `연결 중… ${applied}` : '폴더명 정확 일치 건 모두 연결'}
            </button>
            <span className="muted small">후보 {matches.length.toLocaleString()}건</span>
          </div>
          <div className="table-wrap">
            <table className="items">
              <thead>
                <tr><th>Item No.</th><th>제목</th><th>후보</th><th></th></tr>
              </thead>
              <tbody>
                {matches.slice(0, 300).map((m) => (
                  <tr key={m.code}>
                    <td className="mono"><Link to={`/item/${encodeURIComponent(m.code)}`}>{m.code}</Link></td>
                    <td className="col-title">{m.title}</td>
                    <td>
                      {m.candidates.map((c) => (
                        <div key={c.folderId} className="candidate">
                          <span className={`pill ${c.matchType === 'folder' ? 'pill-ok' : 'pill-weak'}`}>{c.matchType === 'folder' ? '폴더명' : '파일명'}</span>
                          <span className="small">{c.path || c.folderName}</span>
                          {c.fileIds.slice(0, 3).map((id) => <img key={id} src={thumbnailUrl(id, 120)} alt="" className="cand-thumb" loading="lazy" />)}
                          <button
                            type="button"
                            className="btn btn-ghost small"
                            disabled={m.linked === c.folderId}
                            onClick={() => {
                              const item = dataset.items.find((i) => i.code === m.code)
                              if (item) void saveCells(item, { 이미지폴더: c.folderId, ...(c.fileIds[0] && !item.cells['대표이미지'] ? { 대표이미지: c.fileIds[0] } : {}) })
                            }}
                          >
                            {m.linked === c.folderId ? '연결됨' : '연결'}
                          </button>
                        </div>
                      ))}
                    </td>
                    <td></td>
                  </tr>
                ))}
                {matches.length === 0 && <tr><td colSpan={4} className="muted empty-row">일치하는 후보가 없습니다.</td></tr>}
              </tbody>
            </table>
            {matches.length > 300 && <p className="muted small">상위 300건만 표시합니다.</p>}
          </div>
        </>
      )}
    </section>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Icon } from '../components/Icon'
import { buildImageIndex, driveId, findCandidates, IMAGE_ARCHIVE_ID, itemImages, localImageRoots, saveLocalImageRoots } from '../lib/images'
import DriveImage from '../components/DriveImage'

export default function ImagesPage() {
  const { dataset, saveCells, imageIndex: index, setImageIndex, imageLoading, imageError } = useApp()
  const [progress, setProgress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [folderUrl, setFolderUrl] = useState('')
  const [localRoots, setLocalRoots] = useState(localImageRoots)
  const roots = useMemo(() => [...new Map([
    ...(dataset?.imageRoots.filter((root) => root.active).map((root) => ({ id: root.folderId, name: root.name })) ?? []),
    ...localRoots,
  ].map((root) => [root.id, root])).values()], [dataset, localRoots])

  const rebuild = async (configuredRoots = roots) => {
    setBusy(true)
    setError(null)
    try {
      setImageIndex(await buildImageIndex(setProgress, configuredRoots))
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  const registerFolder = async (event: React.FormEvent) => {
    event.preventDefault()
    const id = driveId(folderUrl)
    if (!id || (folderUrl.includes('://') && !/\/folders\//.test(folderUrl))) {
      setError('Google Drive 상위 폴더의 주소를 입력해 주세요')
      return
    }
    if (roots.some((root) => root.id === id)) {
      setError('이미 등록된 상위 폴더입니다. 재색인을 누르면 하위 사진을 다시 찾습니다')
      return
    }
    const root = { id, name: `추가 폴더 ${localRoots.length + 1}` }
    try {
      const next = [...localRoots, root]
      saveLocalImageRoots(next)
      setLocalRoots(next)
      setFolderUrl('')
      await rebuild([...roots, root])
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  const removeFolder = async (id: string) => {
    const next = localRoots.filter((root) => root.id !== id)
    try {
      saveLocalImageRoots(next)
      setLocalRoots(next)
      setError(null)
      await rebuild(roots.filter((root) => root.id !== id))
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    }
  }

  const matches = useMemo(() => {
    if (!index || !dataset) return []
    const search = query.trim().toLowerCase()
    return dataset.items.filter((item) =>
      (!search || `${item.code} ${item.title}`.toLowerCase().includes(search)) && itemImages(index, item.code).length > 0,
    ).map((item) => ({ item, candidates: findCandidates(index, item.code) }))
  }, [index, dataset, query])

  return (
    <section className="images-page">
      <h1>이미지 연결</h1>
      <p className="muted">등록된 상위 폴더의 하위 폴더까지 찾고, 제품번호가 같은 사진을 자동으로 보여줍니다. 연도별 폴더에 여러 제품이 함께 있어도 해당 제품의 사진만 표시합니다.</p>
      <details className="image-roots">
        <summary>등록된 상위 폴더 {roots.length}개</summary>
        <ul>
          {roots.map((root) => <li key={root.id}>
            <a href={`https://drive.google.com/drive/folders/${root.id}`} target="_blank" rel="noreferrer">{root.name}</a>
            {localRoots.some((local) => local.id === root.id) && <>
              <span className="muted small"> · 이 브라우저에 추가됨</span>
              <button type="button" className="btn btn-ghost small" disabled={busy} onClick={() => void removeFolder(root.id)}>등록 해제</button>
            </>}
          </li>)}
        </ul>
        <form className="form-actions" onSubmit={(event) => void registerFolder(event)}>
          <input type="url" value={folderUrl} onChange={(event) => setFolderUrl(event.target.value)} placeholder="Google Drive 상위 폴더 주소" aria-label="상위 폴더 주소" required disabled={busy} />
          <button type="submit" className="btn btn-ghost" disabled={busy || !dataset || !folderUrl.trim()}>상위 폴더 등록 · 사진 찾기</button>
        </form>
        <p className="muted small">추가한 폴더는 이 브라우저에 저장됩니다. 사진을 옮긴 뒤 재색인하면 하위 폴더도 다시 찾습니다.</p>
      </details>
      <div className="form-actions">
        <a className="btn btn-ghost" href={`https://drive.google.com/drive/folders/${IMAGE_ARCHIVE_ID}`} target="_blank" rel="noreferrer">
          이미지 보관함 열기 <Icon name="external" size={14} />
        </a>
        <button type="button" className="btn btn-primary" onClick={() => void rebuild()} disabled={busy || imageLoading || !dataset}>
          <Icon name="refresh" /> {busy ? progress || '색인 중…' : '재색인'}
        </button>
        {index && <span className="muted small">이미지 {index.fileCount.toLocaleString()}장 · {new Date(index.builtAt).toLocaleString('ko-KR')}</span>}
        {imageLoading && <span className="muted small">이미지 목록을 읽는 중…</span>}
        {(error || (!index && imageError)) && <span className="error">{error || imageError}</span>}
      </div>
      {index && dataset && <>
        <div className="form-actions">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제품번호 또는 제목으로 이미지 찾기" aria-label="이미지 찾기" />
          <span className="muted small">사진이 연결된 물건 {matches.length.toLocaleString()}건</span>
        </div>
        <div className="table-wrap">
          <table className="items">
            <thead><tr><th>Item No.</th><th>제목</th><th>사진 · 저장 폴더</th></tr></thead>
            <tbody>
              {matches.slice(0, 300).map(({ item, candidates }) => <tr key={item.code}>
                <td className="mono"><Link to={`/item/${encodeURIComponent(item.code)}`}>{item.code}</Link></td>
                <td className="col-title">{item.title}</td>
                <td>{candidates.map((candidate) => <div key={candidate.folderId} className="candidate">
                  <span className="pill pill-ok">자동 연결 · {candidate.fileIds.length}장</span>
                  <a className="small" href={`https://drive.google.com/drive/folders/${candidate.folderId}`} target="_blank" rel="noreferrer">{candidate.path || candidate.folderName}</a>
                  {candidate.fileIds.slice(0, 3).map((id) => <DriveImage key={id} fileId={id} width={120} alt="" className="cand-thumb" loading="lazy" />)}
                  {candidate.fileIds[0] && <button type="button" className="btn btn-ghost small"
                    disabled={driveId(item.cells['대표이미지']) === candidate.fileIds[0]}
                    onClick={() => { void saveCells(item, { 대표이미지: candidate.fileIds[0] }).catch((error: unknown) => setError(error instanceof Error ? error.message : String(error))) }}>
                    {driveId(item.cells['대표이미지']) === candidate.fileIds[0] ? '대표 지정됨' : '첫 사진을 대표로'}
                  </button>}
                </div>)}</td>
              </tr>)}
              {!matches.length && <tr><td colSpan={3} className="muted empty-row">일치하는 사진이 없습니다.</td></tr>}
            </tbody>
          </table>
          {matches.length > 300 && <p className="muted small">상위 300건입니다. 제품번호나 제목을 입력해 나머지 사진을 찾을 수 있습니다.</p>}
        </div>
      </>}
    </section>
  )
}

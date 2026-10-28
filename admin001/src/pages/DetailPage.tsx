import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { lastListPath } from '../lib/nav'
import { useApp } from '../app/AppContext'
import EditableField from '../components/EditableField'
import { Icon } from '../components/Icon'
import { FIELD_GROUPS, TYPE_LABEL } from '../data/fields'
import { findDuplicateApplication } from '../data/store'
import { driveId, itemImages, imagesInLinkedFolder, listFolderImages, type FolderImage } from '../lib/images'
import DriveImage from '../components/DriveImage'

// 원가 열은 시트에 보존하고 상세 화면에서만 숨긴다.
const HIDDEN_DETAIL_FIELDS = new Set(['한국원가', '현지구입가', '원가분석'])

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function DetailPage() {
  const { code = '' } = useParams()
  const decoded = decodeURIComponent(code)
  const { dataset, saveCells, saveState, loading } = useApp()
  const item = useMemo(() => dataset?.items.find((i) => i.code === decoded) ?? null, [dataset, decoded])
  const state = saveState[decoded]
  const [institution, setInstitution] = useState('')
  const dup = item && institution.trim() ? findDuplicateApplication(item, institution) : null

  if (!dataset) return <p className="muted">{loading ? '시트를 읽는 중입니다…' : '데이터가 없습니다.'}</p>
  if (!item) {
    return (
      <section>
        <p className="error">Item No. <span className="mono">{decoded}</span> 를 찾지 못했습니다.</p>
        <Link to={lastListPath()} className="btn btn-ghost"><Icon name="back" /> 목록으로</Link>
      </section>
    )
  }

  const save = (key: string) => (value: string | number | boolean | null) => saveCells(item, { [key]: value })

  return (
    <section className="detail">
      <header className="detail-head">
        <div>
          <Link to={lastListPath()} className="btn btn-ghost back"><Icon name="back" /> 목록</Link>
          <h1>
            <span className="mono code">{item.code}</span>
            <span className={`pill type-${item.type}`}>{TYPE_LABEL[item.type]}</span>
            {item.overseas && <span className="pill pill-overseas">해외</span>}
          </h1>
          <p className="detail-title">{item.title || <span className="muted">(제목 없음)</span>}</p>
        </div>
        <div className="save-state">
          {state?.status === 'saving' && <span className="muted">시트에 저장 중…</span>}
          {state?.status === 'saved' && <span className="ok"><Icon name="check" /> 저장됨 {new Date(state.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>}
          {state?.status === 'error' && <span className="error"><Icon name="warn" /> {state.message}</span>}
        </div>
      </header>

      <div className="detail-body">
        <aside className="detail-media">
          <MediaPanel key={item.code} code={item.code} expectedImage={item.image === 'HAVE'} folderId={driveId(item.cells['이미지폴더'])} primaryId={driveId(item.cells['대표이미지'])} onSetPrimary={(id) => saveCells(item, { 대표이미지: id })} />
        </aside>

        <div className="detail-fields">
          {/* 해시 라우터라 <a href="#…">를 쓰면 경로가 바뀌어 목록으로 튕긴다. 버튼으로 스크롤만 한다. */}
          <nav className="section-nav">
            {FIELD_GROUPS.map((g) => (
              <button key={g.title} type="button" onClick={() => scrollToSection(`sec-${g.title}`)}>{g.title}</button>
            ))}
            <button type="button" onClick={() => scrollToSection('sec-applications')}>이력</button>
          </nav>

          {FIELD_GROUPS.map((g) => (
            <section key={g.title} id={`sec-${g.title}`} className="field-group">
              <h2>{g.title}</h2>
              <dl>
                {g.fields.filter((f) => !HIDDEN_DETAIL_FIELDS.has(f.key)).map((f) => (
                  <div key={f.key} className={`field-row kind-${f.kind}`}>
                    <dt>{f.key}</dt>
                    <dd>
                      <EditableField field={f} value={item.cells[f.key] ?? ''} onSave={save(f.key)} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section id="sec-applications" className="field-group">
            <h2>신청 이력 해석 <span className="muted small">({item.applications.length}건 · 원문에서 자동 해석)</span></h2>
            <div className="dup-check">
              <label>
                <span>중복 확인</span>
                <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="기관명을 입력하면 이미 제안했는지 확인" />
              </label>
              {institution.trim() && (dup ? (
                <p className="warn"><Icon name="warn" /> 이미 제안한 기록이 있습니다: <strong>{dup.institution}</strong> {dup.dateRaw ?? ''} ({dup.sourceColumn})</p>
              ) : (
                <p className="ok"><Icon name="check" /> 이 기관에 제안한 기록이 없습니다.</p>
              ))}
            </div>
            {item.applications.length === 0 ? (
              <p className="muted">해석된 신청 이력이 없습니다.</p>
            ) : (
              <table className="apps">
                <thead>
                  <tr><th>기관</th><th>날짜</th><th>원문</th><th>열</th></tr>
                </thead>
                <tbody>
                  {item.applications.map((a, i) => (
                    <tr key={i}>
                      <td>{a.institution}</td>
                      <td className="mono">{a.date ?? a.dateRaw ?? '—'}</td>
                      <td className="muted">{a.raw}</td>
                      <td className="muted small">{a.sourceColumn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}

function MediaPanel({ code, expectedImage, folderId, primaryId, onSetPrimary }: { code: string; expectedImage: boolean; folderId: string; primaryId: string; onSetPrimary: (id: string) => Promise<void> }) {
  const { imageIndex, imageLoading, imageError } = useApp()
  const indexed = useMemo(() => itemImages(imageIndex, code), [imageIndex, code])
  const [linked, setLinked] = useState<{ folderId: string; code: string; images: FolderImage[] } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const sharedFolder = useMemo(() => Object.values(imageIndex?.byFolderKey ?? {}).flat().some((folder) =>
    folder.folderId === folderId && /^(?:AB|AM|AO|AP)(?:\d{4}|\d{2}[-_].*)$/i.test(folder.folderName),
  ), [imageIndex, folderId])

  useEffect(() => {
    let alive = true
    if (!folderId) return
    setStatus('loading')
    listFolderImages(folderId)
      .then((list) => {
        if (!alive) return
        setLinked({ folderId, code, images: imagesInLinkedFolder(list, code, sharedFolder) })
        setStatus('idle')
      })
      .catch((e) => {
        if (!alive) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : String(e))
      })
    return () => {
      alive = false
    }
  }, [folderId, code, sharedFolder])

  // A stale manually linked folder must not hide photos found in the parent index.
  const images = useMemo(() => {
    const direct = linked?.folderId === folderId && linked.code === code ? linked.images : []
    return [...new Map([...direct, ...indexed].map((image) => [image.id, image])).values()]
  }, [linked, folderId, code, indexed])
  const folders = useMemo(() => [...new Map(indexed.map((image) => [image.folderId, image.folderName])).entries()], [indexed])

  const ordered = useMemo(() => {
    if (!primaryId) return images
    const idx = images.findIndex((i) => i.id === primaryId)
    if (idx <= 0) return images
    return [images[idx], ...images.slice(0, idx), ...images.slice(idx + 1)]
  }, [images, primaryId])

  return (
    <div className="media">
      {primaryId && !images.some((i) => i.id === primaryId) && (
        <figure className="media-primary">
          <DriveImage fileId={primaryId} width={1200} alt="대표 이미지" />
          <figcaption className="muted small">대표 이미지</figcaption>
        </figure>
      )}
      {ordered.map((img, i) => (
        <figure key={img.id} className={i === 0 && img.id === primaryId ? 'media-primary' : ''}>
          <a href={`https://drive.google.com/file/d/${img.id}/view`} target="_blank" rel="noreferrer">
            <DriveImage fileId={img.id} width={1200} alt={img.name} loading="lazy" />
          </a>
          <figcaption>
            <span className="small">{img.name}</span>
            {img.id === primaryId ? (
              <span className="pill pill-ok">대표</span>
            ) : (
              <button type="button" className="btn btn-ghost small" onClick={() => void onSetPrimary(img.id)}>대표로</button>
            )}
          </figcaption>
        </figure>
      ))}
      {!images.length && !primaryId && !imageLoading && status !== 'loading' && (
        <div className="media-empty">
          <Icon name="image" size={28} />
          {expectedImage && <p className="small">목록에는 ‘이미지 있음’으로 기록되어 있지만 연결된 사진이 없습니다.</p>}
          <p className="muted small">제품번호와 일치하는 사진을 찾지 못했습니다. <Link to="/images">상위 폴더를 확인하고 사진 다시 찾기</Link></p>
        </div>
      )}
      {imageLoading && !images.length && <p className="muted small">이미지 목록을 읽는 중…</p>}
      {imageError && !imageIndex && <p className="error small">{imageError}</p>}
      {folderId && status === 'loading' && <p className="muted small">Drive 폴더를 읽는 중…</p>}
      {folderId && status === 'error' && <p className="error small">{message}</p>}
      {!folderId && folders.map(([id, name]) => (
        <a key={id} className="muted small" href={`https://drive.google.com/drive/folders/${id}`} target="_blank" rel="noreferrer">
          {name || 'Drive 폴더'} 열기 <Icon name="external" size={14} />
        </a>
      ))}
      {folderId && (
        <a className="muted small" href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noreferrer">
          Drive 폴더 열기 <Icon name="external" size={14} />
        </a>
      )}
    </div>
  )
}

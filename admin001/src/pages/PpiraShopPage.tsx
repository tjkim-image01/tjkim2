import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Icon } from '../components/Icon'
import { PPIRA_BASE_ITEMS, PPIRA_SHOP_URL, type PpiraBaseItem } from '../data/ppiraItems'
import type { Item } from '../data/store'
import { call } from '../lib/api'

type SaleStatus = 'sale' | 'reserved' | 'sold' | 'hidden'

interface PpiraMeta {
  status?: SaleStatus
  visible?: boolean
  featured?: boolean
  episode?: string
}

interface InquiryRecord {
  row?: number
  inquiryId: string
  createdAt: string
  name: string
  contact: string
  codes: string
  summary: string
  totalUsd: string
  memo: string
  status: string
}

const MEMO4_TAG_RE = /\[PPIRA:(\{.*?\})\]/s

function unpackMemo4(raw: string | undefined): PpiraMeta {
  if (!raw) return {}
  const m = raw.match(MEMO4_TAG_RE)
  if (!m) return {}
  try {
    return JSON.parse(m[1]) as PpiraMeta
  } catch {
    return {}
  }
}

function packMemo4(existingRaw: string | undefined, meta: PpiraMeta): string {
  const base = (existingRaw || '').replace(MEMO4_TAG_RE, '').trim()
  const tag = `[PPIRA:${JSON.stringify(meta)}]`
  return base ? `${base} ${tag}` : tag
}

function deriveStatus(item: Item | undefined, meta: PpiraMeta): SaleStatus {
  if (meta.visible === false || item?.cells['Shop게시']?.trim().toUpperCase() === 'N') {
    return 'hidden'
  }
  if (meta.status) return meta.status
  const qty = item?.qty ?? 1
  if (qty <= 0) return 'sold'
  return 'sale'
}

export default function PpiraShopPage() {
  const { dataset, saveCells, saveState, loading } = useApp()
  const [subTab, setSubTab] = useState<'inventory' | 'inquiries'>('inventory')
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all')
  const [epFilter, setEpFilter] = useState<string>('all')
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([])
  const [inqLoading, setInqLoading] = useState(false)
  const [inqNote, setInqNote] = useState<string | null>(null)

  // 시트 데이터와 86개 기본 카탈로그 결합
  const rows = useMemo(() => {
    const byCode = new Map<string, Item>()
    if (dataset) {
      for (const it of dataset.items) {
        byCode.set(it.code, it)
      }
    }
    return PPIRA_BASE_ITEMS.map((base: PpiraBaseItem) => {
      const sheetItem = byCode.get(base.code)
      const meta = unpackMemo4(sheetItem?.cells['MEMO-4'])
      const status = deriveStatus(sheetItem, meta)
      const qty = sheetItem?.qty !== null && sheetItem?.qty !== undefined ? sheetItem.qty : status === 'sold' ? 0 : 1
      const priceUsd =
        sheetItem?.salePriceUsd !== null && sheetItem?.salePriceUsd !== undefined
          ? sheetItem.salePriceUsd
          : base.price_usd
      const condition = sheetItem?.cells['Condition'] || base.condition || 'No Tag'
      const location = sheetItem?.location || ''
      const memo = sheetItem?.cells['MEMO-1'] || ''
      const featured = meta.featured !== undefined ? meta.featured : base.featured
      const episode = meta.episode !== undefined ? meta.episode : base.episode
      const title = sheetItem?.title || base.title

      return {
        base,
        sheetItem,
        meta,
        code: base.code,
        title,
        status,
        qty,
        priceUsd,
        condition,
        location,
        memo,
        featured,
        episode,
      }
    })
  }, [dataset])

  const stats = useMemo(() => {
    let sale = 0
    let reserved = 0
    let sold = 0
    let hidden = 0
    let featured = 0
    for (const r of rows) {
      if (r.status === 'sale') sale++
      else if (r.status === 'reserved') reserved++
      else if (r.status === 'sold') sold++
      else if (r.status === 'hidden') hidden++
      if (r.featured) featured++
    }
    return { total: rows.length, sale, reserved, sold, hidden, featured }
  }, [rows])

  const episodes = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      if (r.episode) s.add(r.episode)
    }
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (epFilter === 'with_ep' && !r.episode) return false
      if (epFilter !== 'all' && epFilter !== 'with_ep' && r.episode !== epFilter) return false
      if (query) {
        const hay = `${r.code} ${r.title} ${r.location} ${r.memo} ${r.episode}`.toLowerCase()
        if (!hay.includes(query)) return false
      }
      return true
    })
  }, [rows, q, statusFilter, epFilter])

  const loadInquiries = async () => {
    setInqLoading(true)
    setInqNote(null)
    try {
      const res = await call<{ ok: boolean; inquiries?: InquiryRecord[] }>('ppiraAdminData', {})
      setInquiries(res.inquiries || [])
    } catch {
      setInqNote(
        '구글 시트에 문의함 엔드포인트(Code.js v2-ppira)가 아직 배포되지 않았거나 문의 내역이 없습니다. Apps Script에 최신 Code.js를 새 버전으로 배포하면 고객 문의가 실시간 표시됩니다.',
      )
    } finally {
      setInqLoading(false)
    }
  }

  useEffect(() => {
    if (subTab === 'inquiries') {
      void loadInquiries()
    }
  }, [subTab])

  const handleStatusChange = async (r: (typeof rows)[number], nextStatus: SaleStatus) => {
    if (!r.sheetItem) return
    const nextQty = nextStatus === 'sold' ? 0 : r.qty <= 0 ? 1 : r.qty
    const nextVisible = nextStatus !== 'hidden'
    const nextMeta: PpiraMeta = {
      ...r.meta,
      status: nextStatus,
      visible: nextVisible,
      featured: r.featured,
      episode: r.episode,
    }
    await saveCells(r.sheetItem, {
      QTY: nextQty,
      Shop게시: nextVisible ? 'Y' : 'N',
      'MEMO-4': packMemo4(r.sheetItem.cells['MEMO-4'], nextMeta),
    })
  }

  const handleQtyChange = async (r: (typeof rows)[number], nextQty: number) => {
    if (!r.sheetItem) return
    const safeQty = Math.max(0, nextQty)
    const nextStatus: SaleStatus = safeQty <= 0 ? 'sold' : r.status === 'sold' ? 'sale' : r.status
    const nextMeta: PpiraMeta = {
      ...r.meta,
      status: nextStatus,
      visible: nextStatus !== 'hidden',
      featured: r.featured,
      episode: r.episode,
    }
    await saveCells(r.sheetItem, {
      QTY: safeQty,
      Shop게시: nextStatus !== 'hidden' ? 'Y' : 'N',
      'MEMO-4': packMemo4(r.sheetItem.cells['MEMO-4'], nextMeta),
    })
  }

  const handleToggleFeatured = async (r: (typeof rows)[number]) => {
    if (!r.sheetItem) return
    const nextFeatured = !r.featured
    const nextMeta: PpiraMeta = {
      ...r.meta,
      status: r.status,
      visible: r.status !== 'hidden',
      featured: nextFeatured,
      episode: r.episode,
    }
    await saveCells(r.sheetItem, {
      'MEMO-4': packMemo4(r.sheetItem.cells['MEMO-4'], nextMeta),
    })
  }

  const handleFieldBlur = async (
    r: (typeof rows)[number],
    colName: '판매가 (US$)' | 'Condition' | 'Location' | 'MEMO-1',
    value: string,
  ) => {
    if (!r.sheetItem) return
    const prev = (r.sheetItem.cells[colName] ?? '').trim()
    const next = value.trim()
    if (prev === next) return
    await saveCells(r.sheetItem, { [colName]: next })
  }

  const handleInquiryStatus = async (inquiry: InquiryRecord, status: string) => {
    try {
      await call('ppiraUpdateInquiry', { inquiryId: inquiry.inquiryId, status, deductStock: false })
      setInquiries((prev) => prev.map((it) => (it.inquiryId === inquiry.inquiryId ? { ...it, status } : it)))
      if (status === '거래완료' && inquiry.status !== '거래완료') {
        const codes = (inquiry.codes || '')
          .split(/[,\s]+/)
          .map((c) => c.trim())
          .filter(Boolean)
        for (const code of codes) {
          const target = rows.find((r) => r.code === code)
          if (target && target.sheetItem) {
            await handleQtyChange(target, Math.max(0, target.qty - 1))
          }
        }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="ppira-admin">
      <div className="detail-head" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>
            삐라상점 관리 <span className="muted small">({stats.total}점 · PRINT 시트 실시간 연동)</span>
          </h1>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            여기서 재고·판매상태·가격을 수정하면 Google 시트(<code>tjkim-items</code>)에 즉시 저장되며, 분리된 공개 쇼핑몰(
            <code>tjsites/site001-bira</code>)에 자동 반영됩니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="segmented">
            <button
              type="button"
              className={subTab === 'inventory' ? 'active' : ''}
              onClick={() => setSubTab('inventory')}
            >
              재고·가격 관리 <small>({stats.total})</small>
            </button>
            <button
              type="button"
              className={subTab === 'inquiries' ? 'active' : ''}
              onClick={() => setSubTab('inquiries')}
            >
              고객 구매 문의함 {inquiries.length > 0 && <small>({inquiries.length})</small>}
            </button>
          </div>
          <a
            className="btn"
            href={PPIRA_SHOP_URL}
            target="_blank"
            rel="noreferrer"
            title="분리된 고객용 삐라상점 열기"
          >
            <Icon name="external" /> 삐라상점 열기
          </a>
        </div>
      </div>

      {/* KPI 요약 바 */}
      <div className="ppira-kpi-grid">
        <button
          type="button"
          className={`ppira-kpi ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <span className="small muted">전체 상품</span>
          <strong>{stats.total}점</strong>
        </button>
        <button
          type="button"
          className={`ppira-kpi ${statusFilter === 'sale' ? 'active' : ''}`}
          onClick={() => setStatusFilter('sale')}
        >
          <span className="small muted">판매중</span>
          <strong className="ok">{stats.sale}점</strong>
        </button>
        <button
          type="button"
          className={`ppira-kpi ${statusFilter === 'reserved' ? 'active' : ''}`}
          onClick={() => setStatusFilter('reserved')}
        >
          <span className="small muted">예약중</span>
          <strong className="warn">{stats.reserved}점</strong>
        </button>
        <button
          type="button"
          className={`ppira-kpi ${statusFilter === 'sold' ? 'active' : ''}`}
          onClick={() => setStatusFilter('sold')}
        >
          <span className="small muted">품절 (QTY=0)</span>
          <strong className="error">{stats.sold}점</strong>
        </button>
        <button
          type="button"
          className={`ppira-kpi ${statusFilter === 'hidden' ? 'active' : ''}`}
          onClick={() => setStatusFilter('hidden')}
        >
          <span className="small muted">숨김 (비노출)</span>
          <strong>{stats.hidden}점</strong>
        </button>
      </div>

      {subTab === 'inventory' ? (
        <>
          <div className="toolbar" style={{ marginTop: 12 }}>
            <div className="searchbar" style={{ flex: 1 }}>
              <Icon name="search" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="품번(APAC...), 제목, 보관위치, 메모 검색…"
              />
              {q && (
                <button type="button" className="btn btn-ghost" onClick={() => setQ('')}>
                  <Icon name="close" />
                </button>
              )}
            </div>
            <select value={epFilter} onChange={(e) => setEpFilter(e.target.value)} aria-label="에피소드 필터">
              <option value="all">전체 에피소드</option>
              <option value="with_ep">영상 연결 상품만</option>
              {episodes.map((ep) => (
                <option key={ep} value={ep}>
                  {ep} 연결 상품
                </option>
              ))}
            </select>
          </div>

          <div className="list-meta muted small">
            표시 <strong>{filtered.length}</strong>건 / 전체 {rows.length}건 · 셀 값을 바꾸면 즉시 Google 시트{' '}
            <code>PRINT</code> 탭에 자동 저장됩니다.
          </div>

          <div className="table-wrap table-wrapper">
            <table className="items ppira-table">
              <thead>
                <tr>
                  <th className="col-thumb">실물</th>
                  <th>품번 / 제목</th>
                  <th>영상</th>
                  <th>판매 상태 (클릭 즉시 변경)</th>
                  <th>재고(QTY)</th>
                  <th>판매가(US$)</th>
                  <th>등급</th>
                  <th>보관위치</th>
                  <th>메모(MEMO-1)</th>
                  <th>저장</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = saveState[r.code]
                  const thumbSrc = `${PPIRA_SHOP_URL}items/${r.code}_1.jpg`
                  return (
                    <tr key={r.code} className={r.status === 'hidden' ? 'row-muted' : ''}>
                      <td className="col-thumb">
                        <a href={`${PPIRA_SHOP_URL}#/shop/${r.code}`} target="_blank" rel="noreferrer" title="쇼핑몰 상세 보기">
                          <img
                            src={thumbSrc}
                            alt={r.title}
                            loading="lazy"
                            onError={(e) => {
                              ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
                            }}
                          />
                        </a>
                      </td>
                      <th scope="row" className="col-title">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Link to={`/item/${encodeURIComponent(r.code)}`} className="mono" style={{ fontWeight: 600 }}>
                            {r.code}
                          </Link>
                          <button
                            type="button"
                            className={`ppira-star ${r.featured ? 'on' : ''}`}
                            onClick={() => void handleToggleFeatured(r)}
                            title={r.featured ? '추천 상품 해제' : '추천 상품 지정'}
                          >
                            ★
                          </button>
                        </div>
                        <div className="small" style={{ marginTop: 2 }}>
                          {r.title}
                        </div>
                      </th>
                      <td className="mono small">{r.episode || <span className="muted">—</span>}</td>
                      <td>
                        <div className="ppira-status-group">
                          {(
                            [
                              ['sale', '판매중'],
                              ['reserved', '예약중'],
                              ['sold', '품절'],
                              ['hidden', '숨김'],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              disabled={!r.sheetItem}
                              className={`ppira-st-btn st-${key} ${r.status === key ? 'active' : ''}`}
                              onClick={() => void handleStatusChange(r, key)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="ppira-qty-box">
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={!r.sheetItem || r.qty <= 0}
                            onClick={() => void handleQtyChange(r, r.qty - 1)}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            className="mono ppira-qty-input"
                            key={`${r.code}-qty-${r.qty}`}
                            defaultValue={r.qty}
                            disabled={!r.sheetItem}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10)
                              if (!Number.isNaN(v) && v !== r.qty) void handleQtyChange(r, v)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={!r.sheetItem}
                            onClick={() => void handleQtyChange(r, r.qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="mono ppira-inline-input num"
                          key={`${r.code}-price-${r.priceUsd ?? ''}`}
                          defaultValue={r.priceUsd !== null && r.priceUsd !== undefined ? String(r.priceUsd) : ''}
                          placeholder="문의"
                          disabled={!r.sheetItem}
                          onBlur={(e) => void handleFieldBlur(r, '판매가 (US$)', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="ppira-inline-select"
                          value={r.condition}
                          disabled={!r.sheetItem}
                          onChange={(e) => void handleFieldBlur(r, 'Condition', e.target.value)}
                        >
                          <option value="A">A (극미)</option>
                          <option value="B+">B+ (양호)</option>
                          <option value="B">B (보통)</option>
                          <option value="No Tag">No Tag</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="mono ppira-inline-input"
                          key={`${r.code}-loc-${r.location}`}
                          defaultValue={r.location}
                          placeholder="위치"
                          disabled={!r.sheetItem}
                          onBlur={(e) => void handleFieldBlur(r, 'Location', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="ppira-inline-input ppira-memo-input"
                          key={`${r.code}-memo-${r.memo}`}
                          defaultValue={r.memo}
                          placeholder="관리 메모…"
                          disabled={!r.sheetItem}
                          onBlur={(e) => void handleFieldBlur(r, 'MEMO-1', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur()
                          }}
                        />
                      </td>
                      <td className="small mono" style={{ whiteSpace: 'nowrap' }}>
                        {!r.sheetItem ? (
                          <span className="muted">{loading ? '로딩중' : '미매칭'}</span>
                        ) : st?.status === 'saving' ? (
                          <span className="warn">저장중…</span>
                        ) : st?.status === 'saved' ? (
                          <span className="ok">✓ 저장됨</span>
                        ) : st?.status === 'error' ? (
                          <span className="error" title={st.message}>
                            오류
                          </span>
                        ) : (
                          <span className="muted">시트연동</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="muted small">
              구글 시트 <code>삐라상점_문의</code> 탭에 접수된 고객 구매 문의 목록입니다.
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => void loadInquiries()} disabled={inqLoading}>
              <Icon name="refresh" /> 문의 새로고침
            </button>
          </div>
          {inqNote && (
            <div className="form" style={{ maxWidth: 'none', marginBottom: 12 }}>
              <p className="small" style={{ margin: 0 }}>
                {inqNote}
              </p>
            </div>
          )}
          <div className="table-wrap table-wrapper">
            <table className="items">
              <thead>
                <tr>
                  <th>접수번호</th>
                  <th>접수일시</th>
                  <th>고객명</th>
                  <th>연락처</th>
                  <th>문의 품목</th>
                  <th className="num">총액(USD)</th>
                  <th>문의 메모</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-row muted">
                      {inqLoading ? '문의 내역을 불러오는 중…' : '접수된 문의가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inq) => (
                    <tr key={inq.inquiryId}>
                      <th scope="row" className="mono small">
                        {inq.inquiryId}
                      </th>
                      <td className="mono small">{inq.createdAt}</td>
                      <td>
                        <strong>{inq.name}</strong>
                      </td>
                      <td className="mono small">{inq.contact}</td>
                      <td className="small">
                        <div className="mono">{inq.codes}</div>
                        <div className="muted">{inq.summary}</div>
                      </td>
                      <td className="num mono">{inq.totalUsd}</td>
                      <td className="small">{inq.memo || '—'}</td>
                      <td>
                        <select
                          value={inq.status || '신규접수'}
                          onChange={(e) => void handleInquiryStatus(inq, e.target.value)}
                        >
                          <option value="신규접수">신규접수</option>
                          <option value="연락완료">연락완료</option>
                          <option value="거래완료">거래완료 (재고차감)</option>
                          <option value="취소">취소</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

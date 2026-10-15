import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { Icon } from '../components/Icon'
import { ITEM_TYPES, TYPE_LABEL, type ItemType } from '../data/fields'
import { formatMoney } from '../data/parse'
import { EMPTY_FILTERS, searchItems, type Filters } from '../data/store'
import { thumbnailUrl } from '../lib/api'
import { rememberListSearch } from '../lib/nav'

const PAGE_SIZE = 50

function filtersFromParams(p: URLSearchParams): Filters {
  const num = (k: string) => (p.get(k) ? Number(p.get(k)) : null)
  return {
    q: p.get('q') ?? '',
    type: (p.get('type') as ItemType) || '',
    image: (p.get('image') as Filters['image']) || '',
    overseas: (p.get('overseas') as Filters['overseas']) || '',
    location: p.get('location') ?? '',
    yearFrom: num('yf'),
    yearTo: num('yt'),
    priceMin: num('pmin'),
    priceMax: num('pmax'),
    category: p.get('cat') ?? '',
    era: p.get('era') ?? '',
    shop: (p.get('shop') as Filters['shop']) || '',
  }
}

function paramsFromFilters(f: Filters, page: number, excluded: string[]): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.type) p.set('type', f.type)
  if (f.image) p.set('image', f.image)
  if (f.overseas) p.set('overseas', f.overseas)
  if (f.location) p.set('location', f.location)
  if (f.yearFrom !== null) p.set('yf', String(f.yearFrom))
  if (f.yearTo !== null) p.set('yt', String(f.yearTo))
  if (f.priceMin !== null) p.set('pmin', String(f.priceMin))
  if (f.priceMax !== null) p.set('pmax', String(f.priceMax))
  if (f.category) p.set('cat', f.category)
  if (f.era) p.set('era', f.era)
  if (f.shop) p.set('shop', f.shop)
  if (page > 0) p.set('page', String(page))
  for (const ex of excluded) p.append('ex', ex)
  return p
}

export default function ListPage() {
  const { dataset, loading, error } = useApp()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const page = Math.max(0, Number(params.get('page') ?? '0'))
  const excluded = params.getAll('ex')
  const [input, setInput] = useState(filters.q)
  const [draft, setDraft] = useState<Filters>(filters)
  const advancedCount = Object.entries(filters).filter(([k, v]) => k !== 'q' && k !== 'type' && v !== '' && v !== null).length
  const [open, setOpen] = useState(advancedCount > 0)

  useEffect(() => {
    setInput(filters.q)
    setDraft(filters)
  }, [filters])

  useEffect(() => {
    const s = params.toString()
    rememberListSearch(s ? `?${s}` : '')
  }, [params])

  const apply = (next: Partial<Filters>, resetPage = true) => {
    // 검색어가 바뀌면 이전 검색어에서 제외한 동의어는 의미가 없으므로 같이 지운다
    const keepExcluded = next.q === undefined || next.q === filters.q
    setParams(paramsFromFilters({ ...filters, ...next }, resetPage ? 0 : page, keepExcluded ? excluded : []))
  }

  const result = useMemo(() => {
    if (!dataset) return { items: [], expanded: [] }
    return searchItems(dataset.items, filters, dataset.synonyms, excluded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, filters, params])

  const total = result.items.length
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = result.items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    if (!dataset) return c
    const base = { ...filters, type: '' as const }
    for (const it of searchItems(dataset.items, base, dataset.synonyms, excluded).items) c[it.type] = (c[it.type] ?? 0) + 1
    return c
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, filters, params])

  const categories = useMemo(() => {
    const set = new Set<string>()
    dataset?.items.forEach((i) => i.categories.forEach((c) => set.add(c)))
    return [...set].sort()
  }, [dataset])
  const eras = useMemo(() => dataset?.eras.filter((e) => e.active).map((e) => e.name) ?? [], [dataset])

  return (
    <section className="list-page">
      <form
        className="searchbar"
        onSubmit={(e) => {
          e.preventDefault()
          apply({ q: input })
        }}
      >
        <Icon name="search" size={20} />
        <input
          id="global-search"
          type="search"
          placeholder="Item No., 제목, 저자, 설명… ( / 키로 포커스 )"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
        />
        {input && (
          <button type="button" className="btn btn-ghost" onClick={() => { setInput(''); apply({ q: '' }) }} aria-label="지우기">
            <Icon name="close" />
          </button>
        )}
        <button type="submit" className="btn btn-primary">검색</button>
        <button type="button" className={`btn btn-ghost${advancedCount ? ' has-badge' : ''}`} onClick={() => setOpen((v) => !v)}>
          <Icon name="filter" /> 필터{advancedCount ? <span className="badge">{advancedCount}</span> : null}
        </button>
      </form>

      {result.expanded.length > 0 && (
        <div className="chips">
          <span className="muted small">함께 찾음</span>
          {result.expanded.filter((t) => !excluded.includes(t.term.toLowerCase())).map((t) => (
            <span key={t.term} className="chip">
              {t.term}
              <button type="button" aria-label={`${t.term} 제외`} onClick={() => setParams(paramsFromFilters(filters, 0, [...excluded, t.term.toLowerCase()]))}>×</button>
            </span>
          ))}
          {excluded.map((t) => (
            <span key={`ex-${t}`} className="chip chip-muted">
              제외: {t}
              <button type="button" aria-label="제외 해제" onClick={() => setParams(paramsFromFilters(filters, 0, excluded.filter((x) => x !== t)))}>×</button>
            </span>
          ))}
        </div>
      )}

      <div className="type-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!filters.type} className={!filters.type ? 'active' : ''} onClick={() => apply({ type: '' })}>
          전체 <em>{Object.values(counts).reduce((a, b) => a + b, 0).toLocaleString()}</em>
        </button>
        {ITEM_TYPES.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={filters.type === t} className={filters.type === t ? 'active' : ''} onClick={() => apply({ type: t })}>
            {TYPE_LABEL[t]} <em>{(counts[t] ?? 0).toLocaleString()}</em>
          </button>
        ))}
      </div>

      {open && (
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault()
            apply(draft)
          }}
        >
          <label>
            <span>이미지</span>
            <select value={draft.image ?? ''} onChange={(e) => setDraft({ ...draft, image: e.target.value as Filters['image'] })}>
              <option value="">전체</option>
              <option value="HAVE">있음</option>
              <option value="WEAK">Weak</option>
              <option value="NONE">없음</option>
            </select>
          </label>
          <label>
            <span>보관</span>
            <select value={draft.overseas} onChange={(e) => setDraft({ ...draft, overseas: e.target.value as Filters['overseas'] })}>
              <option value="">전체</option>
              <option value="N">국내</option>
              <option value="Y">해외</option>
            </select>
          </label>
          <label>
            <span>위치</span>
            <input type="text" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="00-Japan" />
          </label>
          <label>
            <span>연도</span>
            <span className="range">
              <input type="number" value={draft.yearFrom ?? ''} onChange={(e) => setDraft({ ...draft, yearFrom: e.target.value ? Number(e.target.value) : null })} placeholder="from" />
              <input type="number" value={draft.yearTo ?? ''} onChange={(e) => setDraft({ ...draft, yearTo: e.target.value ? Number(e.target.value) : null })} placeholder="to" />
            </span>
          </label>
          <label>
            <span>정가(원)</span>
            <span className="range">
              <input type="number" value={draft.priceMin ?? ''} onChange={(e) => setDraft({ ...draft, priceMin: e.target.value ? Number(e.target.value) : null })} placeholder="최소" />
              <input type="number" value={draft.priceMax ?? ''} onChange={(e) => setDraft({ ...draft, priceMax: e.target.value ? Number(e.target.value) : null })} placeholder="최대" />
            </span>
          </label>
          <label>
            <span>카테고리</span>
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              <option value="">전체</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span>시대</span>
            <select value={draft.era} onChange={(e) => setDraft({ ...draft, era: e.target.value })}>
              <option value="">전체</option>
              {eras.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Shop</span>
            <select value={draft.shop} onChange={(e) => setDraft({ ...draft, shop: e.target.value as Filters['shop'] })}>
              <option value="">전체</option>
              <option value="Y">게시</option>
              <option value="N">미게시</option>
            </select>
          </label>
          <div className="filters-actions">
            <button type="submit" className="btn btn-primary">적용</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setDraft({ ...EMPTY_FILTERS, q: filters.q, type: filters.type }); apply({ ...EMPTY_FILTERS, q: filters.q, type: filters.type }) }}>초기화</button>
          </div>
        </form>
      )}

      {!dataset && loading && <p className="muted">시트를 읽는 중입니다…</p>}
      {!dataset && !loading && error && <p className="error">{error}</p>}

      {dataset && (
        <>
          <div className="list-meta muted small">
            {total.toLocaleString()}건 {total > PAGE_SIZE && `· ${page + 1}/${pageCount} 페이지`}
          </div>
          <div className="table-wrap">
            <table className="items">
              <thead>
                <tr>
                  <th className="col-thumb"></th>
                  <th>Item No.</th>
                  <th>제목</th>
                  <th>제작</th>
                  <th className="num">연도</th>
                  <th>위치</th>
                  <th className="num">정가(원)</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((it) => {
                  const thumb = it.cells['대표이미지']
                  return (
                    <tr key={it.code}>
                      <td className="col-thumb">
                        <Link to={`/item/${encodeURIComponent(it.code)}`} tabIndex={-1}>
                          {thumb ? <img src={thumbnailUrl(thumb, 160)} alt="" loading="lazy" /> : <span className="thumb-empty" />}
                        </Link>
                      </td>
                      <td className="mono">
                        <Link to={`/item/${encodeURIComponent(it.code)}`}>{it.code}</Link>
                      </td>
                      <td className="col-title">
                        <Link to={`/item/${encodeURIComponent(it.code)}`}>{it.title || <span className="muted">(제목 없음)</span>}</Link>
                        {it.categories.length > 0 && <div className="tags">{it.categories.map((c) => <span key={c} className="tag">{c}</span>)}</div>}
                      </td>
                      <td className="col-maker">{it.maker}</td>
                      <td className="num mono">{it.yearFrom ?? ''}{it.yearTo ? `–${it.yearTo}` : ''}</td>
                      <td>{it.location}</td>
                      <td className="num mono">{formatMoney(it.listPriceKrw)}</td>
                      <td className="col-status">
                        <span className={`pill type-${it.type}`}>{TYPE_LABEL[it.type]}</span>
                        {it.overseas && <span className="pill pill-overseas">해외</span>}
                        {it.image === 'HAVE' && <span className="pill pill-ok">이미지</span>}
                        {it.image === 'WEAK' && <span className="pill pill-weak">Weak</span>}
                        {it.shopPublished && <span className="pill pill-shop">Shop</span>}
                      </td>
                    </tr>
                  )
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted empty-row">조건에 맞는 물건이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="pager">
              <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setParams(paramsFromFilters(filters, page - 1, excluded))}>이전</button>
              <span className="mono small">{page + 1} / {pageCount}</span>
              <button type="button" className="btn btn-ghost" disabled={page + 1 >= pageCount} onClick={() => setParams(paramsFromFilters(filters, page + 1, excluded))}>다음</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

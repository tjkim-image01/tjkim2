import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../app/AppContext'
import { CREATE_FIELDS, FIELD_BY_KEY, ITEM_TYPES, KEY_FIELD, TYPE_LABEL, type ItemType } from '../data/fields'
import { parseNumber, suggestItemCode } from '../data/parse'
import type { CellValue } from '../lib/sheets'

const FALLBACK_PREFIX: Record<ItemType, string> = { BOOK: 'ABKC', MAP: 'AMKC', OTHER: 'AOKC', PRINT: 'APKC' }

export default function NewPage() {
  const { dataset, createItem } = useApp()
  const navigate = useNavigate()
  const [type, setType] = useState<ItemType>('BOOK')
  const [code, setCode] = useState('')
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 종류별로 가장 흔한 4글자 접두사
  const prefixes = useMemo(() => {
    const out = { ...FALLBACK_PREFIX }
    if (!dataset) return out
    for (const t of ITEM_TYPES) {
      const counts = new Map<string, number>()
      for (const it of dataset.items) {
        if (it.type !== t) continue
        const p = it.code.slice(0, 4).toUpperCase()
        if (/^[A-Z]{4}$/.test(p)) counts.set(p, (counts.get(p) ?? 0) + 1)
      }
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
      if (best) out[t] = best[0]
    }
    return out
  }, [dataset])

  const existing = useMemo(() => new Set(dataset?.items.map((i) => i.code) ?? []), [dataset])
  const suggested = suggestItemCode(prefixes[type], existing)
  const finalCode = (code.trim() || suggested).toUpperCase()
  const duplicate = existing.has(finalCode)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || duplicate) return
    setBusy(true)
    setError(null)
    try {
      const cells: Record<string, CellValue> = { [KEY_FIELD]: finalCode }
      for (const [k, v] of Object.entries(values)) {
        const f = FIELD_BY_KEY[k]
        if (!v.trim()) continue
        if (f && (f.kind === 'int' || f.kind === 'money')) {
          const n = parseNumber(v)
          if (n === null) throw new Error(`${k}: 숫자가 아닙니다`)
          cells[k] = n
        } else cells[k] = v.trim()
      }
      const item = await createItem(type, cells)
      navigate(`/item/${encodeURIComponent(item.code)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  if (!dataset) return <p className="muted">시트를 먼저 불러와야 합니다.</p>

  return (
    <section className="new-page">
      <h1>물건 등록</h1>
      <p className="muted">필수는 종류와 Item No.뿐입니다. 나머지는 등록 뒤 상세 화면에서 바로 고칠 수 있습니다.</p>
      <form className="form" onSubmit={(e) => void submit(e)}>
        <div className="form-row">
          <label>
            <span>종류</span>
            <div className="segmented">
              {ITEM_TYPES.map((t) => (
                <button key={t} type="button" className={t === type ? 'active' : ''} onClick={() => setType(t)}>
                  {TYPE_LABEL[t]} <small className="mono">{t}</small>
                </button>
              ))}
            </div>
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Item No.</span>
            <input type="text" className="mono" value={code} onChange={(e) => setCode(e.target.value)} placeholder={suggested} />
            <small className="muted">비워 두면 <span className="mono">{suggested}</span> (접두사 {prefixes[type]} + 오늘 날짜 + 순번)</small>
            {duplicate && <small className="error">이미 있는 번호입니다.</small>}
          </label>
        </div>
        {CREATE_FIELDS.filter((k) => k !== 'Type').map((k) => {
          const f = FIELD_BY_KEY[k]
          return (
            <div className="form-row" key={k}>
              <label>
                <span>{k}</span>
                {f?.kind === 'select' ? (
                  <select value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })}>
                    <option value="">(없음)</option>
                    {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f?.kind === 'textarea' ? (
                  <textarea rows={3} value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
                ) : (
                  <input type="text" value={values[k] ?? ''} onChange={(e) => setValues({ ...values, [k]: e.target.value })} placeholder={f?.hint} />
                )}
              </label>
            </div>
          )
        })}
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy || duplicate}>{busy ? '시트에 추가 중…' : `${type} 탭에 추가`}</button>
        </div>
      </form>
    </section>
  )
}

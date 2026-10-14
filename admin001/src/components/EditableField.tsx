/**
 * 읽기 모양이다가 클릭하면 그 자리에서 고치는 필드. Enter(한 줄)·Cmd/Ctrl+Enter(여러 줄)·
 * 포커스 아웃이면 저장, Esc면 취소. 값이 같으면 저장하지 않는다.
 */

import { useEffect, useRef, useState } from 'react'
import type { FieldDef } from '../data/fields'
import { formatMoney, isFlag, parseNumber } from '../data/parse'
import type { CellValue } from '../lib/api'

interface Props {
  field: FieldDef
  value: string
  onSave: (value: CellValue) => Promise<void>
  disabled?: boolean
}

export function displayValue(field: FieldDef, value: string): string {
  if (!value) return ''
  if (field.kind === 'money') {
    const n = parseNumber(value)
    return n === null ? value : formatMoney(n, field.digits ?? 0)
  }
  if (field.kind === 'flag') return isFlag(value) ? '예' : value
  return value
}

export default function EditableField({ field, value, onSave, disabled }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const readOnly = disabled || field.kind === 'readonly'

  const commit = async () => {
    if (busy) return
    const next = draft.trim()
    if (next === value) {
      setEditing(false)
      return
    }
    setBusy(true)
    setError(null)
    try {
      let out: CellValue = next
      if (field.kind === 'int' || field.kind === 'money') {
        if (next === '') out = ''
        else {
          const n = parseNumber(next)
          if (n === null) throw new Error('숫자가 아닙니다')
          out = n
        }
      }
      await onSave(out)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
    setError(null)
  }

  if (field.kind === 'flag') {
    const checked = isFlag(value)
    return (
      <label className={`field-flag${readOnly ? ' readonly' : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          disabled={readOnly || busy}
          onChange={async (e) => {
            setBusy(true)
            setError(null)
            try {
              await onSave(e.target.checked ? 'Y' : '')
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err))
            } finally {
              setBusy(false)
            }
          }}
        />
        <span>{checked ? '예' : '아니오'}</span>
        {busy && <span className="muted small">저장 중…</span>}
        {error && <span className="error small">{error}</span>}
      </label>
    )
  }

  if (!editing) {
    const shown = displayValue(field, value)
    return (
      <button
        type="button"
        className={`field-value kind-${field.kind}${readOnly ? ' readonly' : ''}${shown ? '' : ' empty'}`}
        onClick={() => !readOnly && setEditing(true)}
        title={readOnly ? undefined : '클릭해서 수정'}
        disabled={readOnly}
      >
        {shown || (readOnly ? '—' : field.hint ?? '비어 있음')}
      </button>
    )
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    } else if (e.key === 'Enter' && (field.kind !== 'textarea' || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void commit()
    }
  }

  return (
    <div className="field-editor">
      {field.kind === 'select' ? (
        <select ref={inputRef as React.RefObject<HTMLSelectElement>} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => void commit()} onKeyDown={onKey} disabled={busy}>
          <option value="">(없음)</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {draft && !field.options?.includes(draft) && <option value={draft}>{draft}</option>}
        </select>
      ) : field.kind === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          rows={Math.min(14, Math.max(3, draft.split('\n').length + 1))}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKey}
          disabled={busy}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          inputMode={field.kind === 'int' || field.kind === 'money' ? 'decimal' : undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKey}
          disabled={busy}
        />
      )}
      <div className="field-editor-hint muted small">
        {busy ? '저장 중…' : field.kind === 'textarea' ? 'Cmd/Ctrl+Enter 저장 · Esc 취소' : 'Enter 저장 · Esc 취소'}
        {error && <span className="error"> {error}</span>}
      </div>
    </div>
  )
}

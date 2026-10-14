/**
 * 셀 원문 해석 규칙 — claude3 import_service.py의 규칙을 그대로 옮겼다.
 * 원문은 시트에 그대로 두고, 검색·표시용으로만 즉석 해석한다.
 */

const YEAR_RE = /(?<!\d)(1[0-9]{3}|20[0-9]{2})(?!\d)/g
// '기관명19-0823', '기관명-2017-0203', '코베이25-0122A' (영문 접미사 3자까지)
const APP_RE = /^(?<name>.*?)[\s-]*(?<date>(?:\d{4}|\d{2})-\d{4})(?<suffix>[A-Za-z]{0,3})$/
const QTY_RE = /^\s*(\d+)/

export function text(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

export function yearRange(raw: string): [number | null, number | null] {
  const years = [...raw.matchAll(YEAR_RE)].map((m) => Number(m[1]))
  if (years.length === 0) return [null, null]
  const lo = Math.min(...years)
  const hi = Math.max(...years)
  return [lo, hi > lo ? hi : null]
}

export function parseInt0(raw: string): number | null {
  const s = text(raw)
  if (!s) return null
  const m = QTY_RE.exec(s)
  return m ? Number(m[1]) : null
}

export function parseNumber(raw: string): number | null {
  const s = text(raw).replace(/[,$₩원\s]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export type ImageStatus = 'HAVE' | 'WEAK' | 'NONE' | null

export function imageStatus(raw: string): ImageStatus {
  const s = text(raw).toLowerCase()
  if (!s) return null
  if (s === '있음' || s === 'have') return 'HAVE'
  if (s === 'weak') return 'WEAK'
  if (['no', 'none', 'x', '없음'].includes(s)) return 'NONE'
  return null
}

export function isFlag(raw: string): boolean {
  const s = text(raw).toLowerCase()
  return ['y', 'yes', 'true', '1', '예', '해외', 'o', '✓'].includes(s)
}

export interface Application {
  sourceColumn: string
  institution: string
  dateRaw: string | null
  date: string | null // ISO
  raw: string
}

export function dateToken(token: string): string | null {
  const [head, tail] = token.split('-')
  if (!tail || tail.length !== 4) return null
  const year = head.length === 2 ? 2000 + Number(head) : Number(head)
  const month = Number(tail.slice(0, 2))
  const day = Number(tail.slice(2))
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 신청 이력 셀 해석. '기관명+날짜' 또는 날짜 없는 순수 기관명만 인정한다. */
export function parseApplication(sourceColumn: string, raw: string): Application | null {
  const s = text(raw)
  if (!s || s.includes('\n')) return null
  const m = APP_RE.exec(s)
  if (m?.groups) {
    const name = m.groups.name.replace(/^[\s,\-·]+|[\s,\-·]+$/g, '')
    if (name.length >= 2 && /[A-Za-z가-힣]/.test(name)) {
      const token = m.groups.date
      const suffix = m.groups.suffix || ''
      return { sourceColumn, institution: name, dateRaw: token + suffix, date: dateToken(token), raw: s }
    }
    return null
  }
  if (!/[\d,]|http/.test(s) && s.length >= 2 && s.length <= 40 && /[가-힣]/.test(s)) {
    return { sourceColumn, institution: s, dateRaw: null, date: null, raw: s }
  }
  return null
}

/** 폴더명·파일명 비교 키: 확장자·복사본 접미사 제거, 영숫자만, 소문자 */
export function normalizeKey(value: string, filename = false): string {
  let v = value.normalize('NFKC').trim()
  if (filename) {
    v = v.replace(/\.[^.]+$/, '').replace(/\s*\(\d+\)\s*$/, '')
  }
  return v.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** 세미콜론 구분 목록 */
export function splitList(raw: string): string[] {
  return text(raw)
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function formatMoney(n: number | null, digits = 0): string {
  if (n === null) return ''
  return n.toLocaleString('ko-KR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Item No. 제안: 접두사 + YYMMDD + 3자리 순번 */
export function suggestItemCode(prefix: string, existing: Set<string>, date = new Date()): string {
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const base = `${prefix}${yy}${mm}${dd}`
  for (let n = 1; n < 1000; n++) {
    const code = `${base}${String(n).padStart(3, '0')}`
    if (!existing.has(code)) return code
  }
  return `${base}999`
}

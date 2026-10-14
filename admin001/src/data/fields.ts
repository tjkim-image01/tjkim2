/**
 * 시트 열 정의 — 단일 원천. 열 이름은 시트 헤더와 글자 그대로 같아야 한다.
 * 시트 헤더 순서는 이 배열이 아니라 실제 1행을 읽어 결정한다(열 순서를 바꿔도 동작).
 */

export type FieldKind = 'text' | 'textarea' | 'int' | 'money' | 'select' | 'flag' | 'readonly'

export interface FieldDef {
  key: string // 시트 헤더
  kind: FieldKind
  options?: string[]
  hint?: string
  digits?: number
}

export const ITEM_TYPES = ['BOOK', 'MAP', 'OTHER', 'PRINT'] as const
export type ItemType = (typeof ITEM_TYPES)[number]
export const TYPE_LABEL: Record<ItemType, string> = { BOOK: '책', MAP: '지도', OTHER: '기타', PRINT: '판화·사진' }

export const KEY_FIELD = 'Item No.'

export interface FieldGroup {
  title: string
  fields: FieldDef[]
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: '기본',
    fields: [
      { key: 'Item No.', kind: 'readonly' },
      { key: 'Type', kind: 'select', options: [...ITEM_TYPES] },
      { key: 'TITLE', kind: 'textarea' },
      { key: 'Maker (CN)', kind: 'text', hint: '저자·제작자·출판사' },
      { key: 'Year', kind: 'text', hint: '원문. 예: 1975 (1832-1852)' },
      { key: '연도from', kind: 'int' },
      { key: '연도to', kind: 'int' },
      { key: 'Size', kind: 'text' },
      { key: 'Condition', kind: 'text' },
      { key: 'QTY', kind: 'int' },
      { key: 'Image', kind: 'select', options: ['있음', 'Weak', 'NO'] },
      { key: 'No.', kind: 'text', hint: '기존 관리번호 (JP01 등)' },
    ],
  },
  {
    title: '분류',
    fields: [
      { key: '시대', kind: 'text', hint: '세미콜론(;)으로 여러 개' },
      { key: '카테고리', kind: 'text', hint: '세미콜론(;)으로 여러 개' },
      { key: '지역', kind: 'text' },
      { key: '언어', kind: 'text' },
      { key: 'Shop게시', kind: 'flag' },
    ],
  },
  {
    title: '보관·배송',
    fields: [
      { key: 'Location', kind: 'text' },
      { key: '해외보관', kind: 'flag' },
      { key: '배송', kind: 'text' },
    ],
  },
  {
    title: '가격·구매',
    fields: [
      { key: '정가 (원)', kind: 'money', digits: 0 },
      { key: '판매가 (US$)', kind: 'money', digits: 2 },
      { key: '한국원가', kind: 'money', digits: 2 },
      { key: '현지구입가', kind: 'money', digits: 2 },
      { key: '원가분석', kind: 'textarea' },
      { key: '구매처', kind: 'text' },
      { key: '결제일', kind: 'text' },
      { key: '결제방법', kind: 'text' },
      { key: 'Lot#', kind: 'text' },
      { key: 'Site', kind: 'text' },
    ],
  },
  {
    title: '설명',
    fields: [
      { key: '작품설명 (한글)', kind: 'textarea' },
      { key: '작품설명 (Non-한글)', kind: 'textarea' },
      { key: '이야기', kind: 'textarea', hint: '역사적 배경·일화' },
    ],
  },
  {
    title: '신청 이력 (최근 → 과거)',
    fields: [
      { key: '신청', kind: 'text' },
      { key: '신청 (전)', kind: 'text' },
      { key: '신청 (전전)', kind: 'text' },
      { key: 'MEMO-6', kind: 'text' },
      { key: 'MEMO-7', kind: 'text' },
      { key: 'MEMO-8', kind: 'text' },
      { key: 'MEMO-9', kind: 'text' },
      { key: 'MEMO-10', kind: 'text' },
    ],
  },
  {
    title: '메모',
    fields: [
      { key: 'MEMO-1', kind: 'text' },
      { key: 'MEMO-2', kind: 'text' },
      { key: 'MEMO-3', kind: 'text' },
      { key: 'MEMO-4', kind: 'text' },
      { key: 'MEMO-5', kind: 'textarea' },
    ],
  },
  {
    title: '이미지',
    fields: [
      { key: '이미지폴더', kind: 'text', hint: 'Drive 폴더 ID' },
      { key: '대표이미지', kind: 'text', hint: 'Drive 파일 ID' },
    ],
  },
  {
    title: '시스템',
    fields: [
      { key: '수정일시', kind: 'readonly' },
      { key: '수정자', kind: 'readonly' },
    ],
  },
]

export const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields)
export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]))

/** 신청 이력으로 해석하는 열 (최근 → 오래된 순) */
export const APPLICATION_FIELDS = ['신청', '신청 (전)', '신청 (전전)', 'MEMO-6', 'MEMO-7', 'MEMO-8', 'MEMO-9', 'MEMO-10']

/** 검색 대상 텍스트 열 */
export const SEARCH_FIELDS = ['Item No.', 'TITLE', 'Maker (CN)', '작품설명 (한글)', '작품설명 (Non-한글)', 'No.', 'Location', '카테고리', '시대']

/** 등록 화면에서 처음 보여줄 필드 */
export const CREATE_FIELDS = ['Type', 'TITLE', 'Maker (CN)', 'Year', 'Size', 'QTY', 'Location', '정가 (원)', '판매가 (US$)', 'Image']

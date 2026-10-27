/**
 * 목록 화면의 마지막 검색 조건(쿼리 문자열)을 기억해, 상세에서 "목록"으로 돌아갈 때 그대로 복원한다.
 */

const KEY = 'admin001.lastList'

export function rememberListSearch(search: string) {
  try {
    sessionStorage.setItem(KEY, search)
  } catch {
    /* 무시 */
  }
}

export function lastListPath(): string {
  try {
    return '/' + (sessionStorage.getItem(KEY) ?? '')
  } catch {
    return '/'
  }
}

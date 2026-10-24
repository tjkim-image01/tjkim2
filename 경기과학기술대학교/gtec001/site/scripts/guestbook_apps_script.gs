/**
 * MOVE : 이소 방명록 — 구글 시트에 기록하는 앱스 스크립트 웹앱.
 * 설치(5분):
 *  1. 구글 시트 새로 만들기 → 시트 이름 "방명록" (첫 줄: 시각 | 이름 | 내용 | 기기 | id)
 *  2. 확장 프로그램 → Apps Script → 이 파일 내용 붙여넣기 → 저장
 *  3. 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포 → 웹앱 URL 복사
 *  4. 사이트 public/config.json 에 { "guestbook_url": "<웹앱 URL>" } 저장(또는 VITE_GUESTBOOK_URL)
 *  스크립트를 고치면 "배포 관리 → 새 버전" 으로 다시 배포해야 반영된다.
 */
const SHEET = "방명록";
const MAX_LIST = 300;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(["시각", "이름", "내용", "기기", "id"]); }
  return sh;
}
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// GET ?limit=100 → 최근 글(새 글부터)
function doGet(e) {
  const limit = Math.min(MAX_LIST, Number((e && e.parameter && e.parameter.limit) || 100));
  const sh = sheet_(); const last = sh.getLastRow();
  if (last < 2) return json_({ ok: true, entries: [] });
  const n = Math.min(limit, last - 1);
  const rows = sh.getRange(last - n + 1, 1, n, 5).getValues().reverse();
  const entries = rows.filter(r => r[2]).map(r => ({ time: r[0] instanceof Date ? r[0].toISOString() : String(r[0]), name: String(r[1]), message: String(r[2]), id: String(r[4] || r[0]) }));
  return json_({ ok: true, entries });
}

// POST (text/plain, JSON 본문) {name, message, id, ua} → 한 줄 추가
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const name = String(body.name || "익명").slice(0, 20);
    const message = String(body.message || "").trim().slice(0, 300);
    if (!message) return json_({ ok: false, error: "내용이 비었습니다." });
    const lock = LockService.getScriptLock(); lock.waitLock(5000);
    try { sheet_().appendRow([new Date(), name, message, String(body.ua || "").slice(0, 80), String(body.id || Utilities.getUuid())]); }
    finally { lock.releaseLock(); }
    return json_({ ok: true });
  } catch (err) { return json_({ ok: false, error: String(err) }); }
}

/**
 * tjkim 소장품 어드민 — Apps Script 백엔드 (웹 앱).
 *
 * 역할: 정적 사이트(GitHub Pages)가 보내는 JSON 요청을 받아, 스크립트 소유자(tjkim.image01)의
 * 권한으로 Google 시트를 읽고 쓰고 Drive 이미지를 찾는다. DB도 서버도 따로 없다.
 *
 * 배포: 웹 앱, "나(소유자)로 실행", 액세스 "모든 사용자". 그래서 비밀번호 검사는 여기서 한다.
 * 비밀번호·시트 ID는 스크립트 속성(프로젝트 설정 → 스크립트 속성)에 둔다. 없으면 기본값.
 *
 * 요청 형식: POST 본문(text/plain)에 JSON { action, token, ...인자 }. 응답은 JSON.
 */

var DEFAULTS = {
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'admin',
  SHEET_ID: '1ytZITjaZlP3h9T5qjJXwRaHtPw8Cz9MJWwNkw0t3mZo',
  TOKEN_DAYS: '30',
};
var ITEM_TABS = ['BOOK', 'MAP', 'OTHER', 'PRINT'];
var AUX_TABS = ['동의어', '카테고리', '시대', '이미지폴더', '설정'];
var KEY_HEADER = 'Item No.';

function prop_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v === null || v === '' ? DEFAULTS[key] : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'health') return json_({ ok: true, time: new Date().toISOString() });
  return json_({ ok: true, name: 'tjkim-admin-api', hint: 'POST JSON {action, token, ...}' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return json_({ error: '요청 본문이 JSON이 아닙니다' });
  }
  try {
    var action = body.action;
    if (action === 'login') return json_(login_(body));
    var user = requireAuth_(body.token);
    switch (action) {
      case 'me':
        return json_({ user: user });
      case 'dataset':
        return json_(dataset_());
      case 'updateCells':
        return json_(updateCells_(body, user));
      case 'appendRow':
        return json_(appendRow_(body, user));
      case 'folderImages':
        return json_({ images: folderImages_(body.folderId) });
      case 'imageIndex':
        return json_(imageIndex_(body));
      case 'changePassword':
        return json_(changePassword_(body));
      default:
        return json_({ error: '알 수 없는 action: ' + action });
    }
  } catch (err) {
    return json_({ error: String(err && err.message ? err.message : err) });
  }
}

// ---- 인증 -------------------------------------------------------------------

function login_(body) {
  var username = String(body.username || '').trim();
  var password = String(body.password || '');
  if (username !== prop_('ADMIN_USER') || password !== prop_('ADMIN_PASS')) {
    Utilities.sleep(500);
    throw new Error('아이디 또는 비밀번호가 틀립니다');
  }
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var days = Number(prop_('TOKEN_DAYS')) || 30;
  var expires = Date.now() + days * 86400000;
  var store = PropertiesService.getScriptProperties();
  store.setProperty('tok:' + token, JSON.stringify({ user: username, expires: expires }));
  pruneTokens_(store);
  return { token: token, user: { name: username }, expires: expires };
}

function requireAuth_(token) {
  if (!token) throw new Error('로그인이 필요합니다');
  var raw = PropertiesService.getScriptProperties().getProperty('tok:' + token);
  if (!raw) throw new Error('로그인이 만료되었습니다. 다시 로그인하세요');
  var rec = JSON.parse(raw);
  if (rec.expires < Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty('tok:' + token);
    throw new Error('로그인이 만료되었습니다. 다시 로그인하세요');
  }
  return { name: rec.user };
}

function pruneTokens_(store) {
  var all = store.getProperties();
  var now = Date.now();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('tok:') !== 0) return;
    try {
      if (JSON.parse(all[k]).expires < now) store.deleteProperty(k);
    } catch (e) {
      store.deleteProperty(k);
    }
  });
}

function changePassword_(body) {
  var next = String(body.newPassword || '');
  if (next.length < 4) throw new Error('비밀번호는 4자 이상');
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASS', next);
  return { ok: true };
}

// ---- 시트 -------------------------------------------------------------------

function sheet_() {
  return SpreadsheetApp.openById(prop_('SHEET_ID'));
}

function cellToString_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    // 시트가 날짜로 해석한 셀은 ISO 날짜 문자열로
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v);
}

function dataset_() {
  var ss = sheet_();
  var file = DriveApp.getFileById(ss.getId());
  var tabs = {};
  ITEM_TABS.concat(AUX_TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var lastRow = sh.getLastRow();
    var lastCol = sh.getLastColumn();
    if (lastRow === 0 || lastCol === 0) {
      tabs[name] = [];
      return;
    }
    var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
    tabs[name] = values.map(function (row) {
      return row.map(cellToString_);
    });
  });
  return {
    spreadsheetId: ss.getId(),
    title: ss.getName(),
    modifiedTime: file.getLastUpdated().toISOString(),
    tabs: tabs,
  };
}

function headerIndex_(sh) {
  var lastCol = sh.getLastColumn();
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(cellToString_);
  var index = {};
  headers.forEach(function (h, i) {
    if (h && index[h] === undefined) index[h] = i;
  });
  return { headers: headers, index: index };
}

/** 키 열을 다시 읽어 행 번호(1-based)를 찾는다. 사람이 행을 지우거나 정렬해도 안전. */
function findRow_(sh, keyCol0, code) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  var keys = sh.getRange(2, keyCol0 + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (cellToString_(keys[i][0]).trim() === code) return i + 2;
  }
  return 0;
}

function stamp_(user) {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function updateCells_(body, user) {
  var tab = String(body.tab || '');
  if (ITEM_TABS.indexOf(tab) < 0) throw new Error('물건 탭이 아닙니다: ' + tab);
  var code = String(body.code || '').trim();
  if (!code) throw new Error('Item No.가 비었습니다');
  var changes = body.changes || {};
  var sh = sheet_().getSheetByName(tab);
  if (!sh) throw new Error('탭이 없습니다: ' + tab);
  var h = headerIndex_(sh);
  if (h.index[KEY_HEADER] === undefined) throw new Error(tab + ' 탭에 ' + KEY_HEADER + ' 열이 없습니다');
  var row = findRow_(sh, h.index[KEY_HEADER], code);
  if (!row) throw new Error('시트에서 이 물건의 행을 찾지 못했습니다. 시트에서 지워졌을 수 있습니다');
  changes['수정일시'] = stamp_(user);
  changes['수정자'] = user.name;
  var written = {};
  Object.keys(changes).forEach(function (key) {
    var col0 = h.index[key];
    if (col0 === undefined || key === KEY_HEADER) return;
    var v = changes[key];
    if (v === null || v === undefined) v = '';
    sh.getRange(row, col0 + 1).setValue(v);
    written[key] = cellToString_(v);
  });
  SpreadsheetApp.flush();
  return { row: row, written: written };
}

function appendRow_(body, user) {
  var tab = String(body.tab || '');
  if (ITEM_TABS.indexOf(tab) < 0) throw new Error('물건 탭이 아닙니다: ' + tab);
  var values = body.values || {};
  var code = String(values[KEY_HEADER] || '').trim();
  if (!code) throw new Error('Item No.가 비었습니다');
  var ss = sheet_();
  for (var t = 0; t < ITEM_TABS.length; t++) {
    var s = ss.getSheetByName(ITEM_TABS[t]);
    if (!s) continue;
    var hi = headerIndex_(s);
    if (hi.index[KEY_HEADER] !== undefined && findRow_(s, hi.index[KEY_HEADER], code)) {
      throw new Error('이미 있는 Item No.입니다 (' + ITEM_TABS[t] + ' 탭)');
    }
  }
  var sh = ss.getSheetByName(tab);
  var h = headerIndex_(sh);
  values['Type'] = tab;
  values['수정일시'] = stamp_(user);
  values['수정자'] = user.name;
  var row = h.headers.map(function (header) {
    var v = values[header];
    return v === null || v === undefined ? '' : v;
  });
  sh.appendRow(row);
  SpreadsheetApp.flush();
  var rowNo = findRow_(sh, h.index[KEY_HEADER], code);
  return { row: rowNo, cells: h.headers.reduce(function (acc, header, i) { if (header) acc[header] = cellToString_(row[i]); return acc; }, {}) };
}

// ---- Drive 이미지 ------------------------------------------------------------

function folderImages_(folderId) {
  if (!folderId) return [];
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var out = [];
  while (files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType() || '';
    if (mime.indexOf('image/') !== 0) continue;
    out.push({ id: f.getId(), name: f.getName(), mimeType: mime });
  }
  out.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  return out;
}

/**
 * 이미지폴더 탭의 루트 하나를 순회해 폴더·이미지 목록을 돌려준다.
 * 루트가 크면 6분 제한에 걸릴 수 있으므로 한 번에 루트 하나씩 부른다 (rootId).
 * 깊이 4, 폴더 2,000개, 파일 20,000장 상한.
 */
function imageIndex_(body) {
  var rootId = String(body.rootId || '');
  if (!rootId) {
    var roots = [];
    var sh = sheet_().getSheetByName('이미지폴더');
    if (sh && sh.getLastRow() > 1) {
      var h = headerIndex_(sh);
      var rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
      rows.forEach(function (r) {
        var id = cellToString_(r[h.index['폴더ID']]).trim();
        var use = cellToString_(r[h.index['사용']]).trim().toUpperCase();
        if (id && (use === '' || use === 'Y')) roots.push({ id: id, name: cellToString_(r[h.index['이름']]) });
      });
    }
    return { roots: roots };
  }
  var MAX_DEPTH = 4, MAX_FOLDERS = 2000, MAX_FILES = 20000;
  var root = DriveApp.getFolderById(rootId);
  var queue = [{ folder: root, path: root.getName(), depth: 0 }];
  var folders = [], files = [];
  var start = Date.now();
  while (queue.length) {
    if (Date.now() - start > 280000) return { rootId: rootId, folders: folders, files: files, truncated: true };
    var cur = queue.shift();
    folders.push({ id: cur.folder.getId(), name: cur.folder.getName(), path: cur.path });
    if (folders.length > MAX_FOLDERS) return { rootId: rootId, folders: folders, files: files, truncated: true };
    var fit = cur.folder.getFiles();
    while (fit.hasNext()) {
      var f = fit.next();
      var mime = f.getMimeType() || '';
      if (mime.indexOf('image/') !== 0) continue;
      files.push({ id: f.getId(), name: f.getName(), folderId: cur.folder.getId() });
      if (files.length > MAX_FILES) return { rootId: rootId, folders: folders, files: files, truncated: true };
    }
    if (cur.depth < MAX_DEPTH) {
      var sub = cur.folder.getFolders();
      while (sub.hasNext()) {
        var sf = sub.next();
        queue.push({ folder: sf, path: cur.path + '/' + sf.getName(), depth: cur.depth + 1 });
      }
    }
  }
  return { rootId: rootId, folders: folders, files: files, truncated: false };
}

/** 편집기에서 한 번 실행해 권한을 승인하는 용도 */
function authorizeOnce() {
  var ss = sheet_();
  var n = ss.getSheets().length;
  var f = DriveApp.getFileById(ss.getId());
  Logger.log('ok: ' + ss.getName() + ' tabs=' + n + ' updated=' + f.getLastUpdated());
  return 'ok';
}

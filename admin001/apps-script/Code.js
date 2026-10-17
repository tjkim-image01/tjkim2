/**
 * tjkim 소장품 어드민(admin001) + 삐라 상점(tj001) 통합 Apps Script 백엔드 (웹 앱).
 *
 * 역할:
 * 1. admin001: 전체 소장품(BOOK/MAP/OTHER/PRINT) 조회·수정·등록·이미지 색인
 * 2. tj001(삐라 상점):
 *    - 공개 API(인증 불필요):
 *      · action="ppiraStock" (GET/POST): 상점 방문자에게 실시간 재고·판매상태·가격·노출여부 반환 (원가·보관위치 등 비공개 필드는 제외)
 *      · action="ppiraInquiry" (POST): 구매 문의를 시트 '삐라상점_문의' 탭에 자동 기록
 *    - 어드민 API(로그인 토큰 필요):
 *      · action="ppiraAdminData": 재고 전체(보관위치·관리메모 포함) + 'PRINT' 탭 원본 연동값 + 문의 목록 반환
 *      · action="ppiraSaveItem": '삐라상점_재고' 탭 저장 + 'PRINT' 탭(QTY, 판매가, 상태, 위치, Shop게시 등) 동시 반영
 *      · action="ppiraBulkSync": 86점 초기 일괄 동기화 / 일괄 수정
 *      · action="ppiraUpdateInquiry": 문의 처리상태(접수/연락완료/거래완료/취소) 및 비고 수정
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

var PPIRA_STOCK_TAB = '삐라상점_재고';
var PPIRA_INQ_TAB = '삐라상점_문의';

var PPIRA_STOCK_HEADERS = [
  'Item No.',
  '한글제목',
  '영문제목',
  '판매상태',     // sale(판매중) | reserved(예약중) | sold(판매완료)
  '수량',         // 숫자
  '판매가(USD)',  // 숫자 또는 빈칸(문의)
  '노출',         // Y | N
  '분류그룹',     // safe | home | enemy | chinese | 1945 | ugly | art | analysis | poster | etc
  '영상추천',     // Y | N
  '등장영상',     // 쉼표 구분 (예: S,D,long)
  '연도',
  '발행처',
  '크기',
  '상태(Condition)',
  '보관위치(비공개)',
  '관리메모(비공개)',
  '이미지목록',   // 쉼표 구분 파일명
  '상세설명(MD)',
  '수정일시',
  '수정자',
];

var PPIRA_INQ_HEADERS = [
  '문의번호',
  '접수일시',
  '이름',
  '연락처',
  '품목코드',
  '품목요약',
  '합계(USD)',
  '고객메모',
  '처리상태',     // 접수 | 연락완료 | 거래완료 | 취소
  '관리자비고',
  '수정일시',
];

function prop_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v === null || v === '' ? DEFAULTS[key] : v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'health') return json_({ ok: true, version: 'v2-ppira', time: new Date().toISOString() });
  if (action === 'ppiraStock') {
    try {
      return json_(ppiraPublicStock_());
    } catch (err) {
      return json_({ error: String(err && err.message ? err.message : err) });
    }
  }
  return json_({ ok: true, name: 'tjkim-admin-api', version: 'v2-ppira', hint: 'POST JSON {action, token, ...}' });
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
    // 인증 불필요 공개 액션
    if (action === 'login') return json_(login_(body));
    if (action === 'ppiraStock') return json_(ppiraPublicStock_());
    if (action === 'ppiraInquiry') return json_(ppiraSubmitInquiry_(body));

    // 이하 어드민 인증 필요
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
      // 삐라 상점 어드민 전용 액션
      case 'ppiraAdminData':
        return json_(ppiraAdminData_());
      case 'ppiraSaveItem':
        return json_(ppiraSaveItem_(body, user));
      case 'ppiraBulkSync':
        return json_(ppiraBulkSync_(body, user));
      case 'ppiraUpdateInquiry':
        return json_(ppiraUpdateInquiry_(body, user));
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

// ---- 시트 공통 --------------------------------------------------------------

function sheet_() {
  return SpreadsheetApp.openById(prop_('SHEET_ID'));
}

function cellToString_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
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
  if (lastCol === 0) return { headers: [], index: {} };
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(cellToString_);
  var index = {};
  headers.forEach(function (h, i) {
    if (h && index[h] === undefined) index[h] = i;
  });
  return { headers: headers, index: index };
}

function findRow_(sh, keyCol0, code) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return 0;
  var keys = sh.getRange(2, keyCol0 + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (cellToString_(keys[i][0]).trim() === code) return i + 2;
  }
  return 0;
}

function stamp_() {
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
  changes['수정일시'] = stamp_();
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
  values['수정일시'] = stamp_();
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

// ---- 삐라 상점 (tj001) 전용 -------------------------------------------------

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function parsePriceNum_(v) {
  if (v === null || v === undefined || v === '') return null;
  var cleaned = String(v).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  var n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function readSheetObjects_(sh) {
  if (!sh || sh.getLastRow() < 2) return [];
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(cellToString_);
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      if (headers[j]) obj[headers[j]] = cellToString_(row[j]);
    }
    out.push(obj);
  }
  return out;
}

function readPrintTabMap_(ss) {
  var sh = ss.getSheetByName('PRINT');
  if (!sh || sh.getLastRow() < 2) return {};
  var rows = readSheetObjects_(sh);
  var map = {};
  rows.forEach(function (r) {
    var code = (r['Item No.'] || '').trim();
    if (code) map[code] = r;
  });
  return map;
}

function ppiraPublicStock_() {
  var ss = sheet_();
  var sh = ss.getSheetByName(PPIRA_STOCK_TAB);
  var items = [];
  if (sh && sh.getLastRow() >= 2) {
    var rows = readSheetObjects_(sh);
    rows.forEach(function (r) {
      var code = (r['Item No.'] || '').trim();
      if (!code) return;
      var qtyNum = parsePriceNum_(r['수량']);
      var priceNum = parsePriceNum_(r['판매가(USD)']);
      var status = (r['판매상태'] || 'sale').trim();
      var visible = String(r['노출'] || 'Y').trim().toUpperCase() !== 'N';
      items.push({
        code: code,
        title: r['한글제목'] || '',
        title_en: r['영문제목'] || '',
        status: status,
        qty: qtyNum !== null ? qtyNum : 1,
        price_usd: priceNum,
        visible: visible,
        group: r['분류그룹'] || '',
        featured: String(r['영상추천'] || '').trim().toUpperCase() === 'Y',
        episodes: r['등장영상'] ? r['등장영상'].split(',').map(function (s) { return s.trim(); }).filter(Boolean) : undefined,
        year: r['연도'] || '',
        maker: r['발행처'] || '',
        size: r['크기'] || '',
        condition: r['상태(Condition)'] || '',
        images: r['이미지목록'] ? r['이미지목록'].split(',').map(function (s) { return s.trim(); }).filter(Boolean) : undefined,
        body_md: r['상세설명(MD)'] || '',
        updated_at: r['수정일시'] || '',
      });
    });
  }
  return {
    ok: true,
    hasDedicatedTab: Boolean(sh && sh.getLastRow() >= 2),
    updatedAt: new Date().toISOString(),
    items: items,
  };
}

function ppiraAdminData_() {
  var ss = sheet_();
  var sh = ss.getSheetByName(PPIRA_STOCK_TAB);
  var printMap = readPrintTabMap_(ss);
  var items = [];
  if (sh && sh.getLastRow() >= 2) {
    var rows = readSheetObjects_(sh);
    rows.forEach(function (r) {
      var code = (r['Item No.'] || '').trim();
      if (!code) return;
      var pRow = printMap[code] || {};
      var qtyNum = parsePriceNum_(r['수량']);
      var priceNum = parsePriceNum_(r['판매가(USD)']);
      items.push({
        code: code,
        title: r['한글제목'] || '',
        title_en: r['영문제목'] || pRow['TITLE'] || '',
        status: (r['판매상태'] || 'sale').trim(),
        qty: qtyNum !== null ? qtyNum : (parsePriceNum_(pRow['QTY']) !== null ? parsePriceNum_(pRow['QTY']) : 1),
        price_usd: priceNum !== null ? priceNum : parsePriceNum_(pRow['판매가 (US$)']),
        visible: String(r['노출'] || 'Y').trim().toUpperCase() !== 'N',
        group: r['분류그룹'] || '',
        featured: String(r['영상추천'] || '').trim().toUpperCase() === 'Y',
        episodes: r['등장영상'] ? r['등장영상'].split(',').map(function (s) { return s.trim(); }).filter(Boolean) : undefined,
        year: r['연도'] || pRow['Year'] || '',
        maker: r['발행처'] || pRow['Maker (CN)'] || '',
        size: r['크기'] || pRow['Size'] || '',
        condition: r['상태(Condition)'] || pRow['Condition'] || '',
        location: r['보관위치(비공개)'] || pRow['Location'] || '',
        admin_memo: r['관리메모(비공개)'] || pRow['MEMO-1'] || '',
        images: r['이미지목록'] ? r['이미지목록'].split(',').map(function (s) { return s.trim(); }).filter(Boolean) : undefined,
        body_md: r['상세설명(MD)'] || '',
        updated_at: r['수정일시'] || pRow['수정일시'] || '',
      });
    });
  }

  var printSummary = {};
  Object.keys(printMap).forEach(function (code) {
    var p = printMap[code];
    printSummary[code] = {
      qty: parsePriceNum_(p['QTY']),
      price_usd: parsePriceNum_(p['판매가 (US$)']),
      condition: p['Condition'] || '',
      location: p['Location'] || '',
      shopPublished: p['Shop게시'] || '',
      year: p['Year'] || '',
      maker: p['Maker (CN)'] || '',
      size: p['Size'] || '',
      memo4: p['MEMO-4'] || '',
      updated_at: p['수정일시'] || '',
    };
  });

  var inqSh = ss.getSheetByName(PPIRA_INQ_TAB);
  var inquiries = inqSh ? readSheetObjects_(inqSh) : [];

  return {
    ok: true,
    hasDedicatedTab: Boolean(sh && sh.getLastRow() >= 2),
    items: items,
    printSummary: printSummary,
    inquiries: inquiries,
    syncedAt: new Date().toISOString(),
  };
}

function ppiraSaveItem_(body, user) {
  var item = body.item || {};
  var code = String(item.code || '').trim();
  if (!code) throw new Error('상품 코드(Item No.)가 비었습니다');
  var ss = sheet_();
  var sh = ensureSheet_(ss, PPIRA_STOCK_TAB, PPIRA_STOCK_HEADERS);
  var h = headerIndex_(sh);
  var rowNo = findRow_(sh, h.index['Item No.'] || 0, code);
  var now = stamp_();

  var record = {
    'Item No.': code,
    '한글제목': item.title || '',
    '영문제목': item.title_en || '',
    '판매상태': item.status || 'sale',
    '수량': item.qty !== undefined && item.qty !== null ? item.qty : 1,
    '판매가(USD)': item.price_usd !== undefined && item.price_usd !== null && item.price_usd !== '' ? item.price_usd : '',
    '노출': item.visible === false ? 'N' : 'Y',
    '분류그룹': item.group || 'etc',
    '영상추천': item.featured ? 'Y' : 'N',
    '등장영상': Array.isArray(item.episodes) ? item.episodes.join(',') : (item.episodes || ''),
    '연도': item.year || '',
    '발행처': item.maker || '',
    '크기': item.size || '',
    '상태(Condition)': item.condition || '',
    '보관위치(비공개)': item.location || '',
    '관리메모(비공개)': item.admin_memo || '',
    '이미지목록': Array.isArray(item.images) ? item.images.join(',') : (item.images || ''),
    '상세설명(MD)': item.body_md || '',
    '수정일시': now,
    '수정자': user.name,
  };

  var rowValues = h.headers.map(function (colName) {
    return record[colName] !== undefined ? record[colName] : '';
  });

  if (rowNo > 0) {
    sh.getRange(rowNo, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sh.appendRow(rowValues);
    rowNo = sh.getLastRow();
  }

  var printSh = ss.getSheetByName('PRINT');
  if (printSh) {
    var ph = headerIndex_(printSh);
    if (ph.index[KEY_HEADER] !== undefined) {
      var pRow = findRow_(printSh, ph.index[KEY_HEADER], code);
      if (pRow > 0) {
        var syncCols = {
          'QTY': record['수량'],
          '판매가 (US$)': record['판매가(USD)'],
          'Condition': record['상태(Condition)'],
          'Year': record['연도'],
          'Size': record['크기'],
          'Shop게시': record['노출'] === 'Y' && record['판매상태'] !== 'sold' ? 'Y' : '',
          '수정일시': now,
          '수정자': user.name,
        };
        if (record['보관위치(비공개)']) syncCols['Location'] = record['보관위치(비공개)'];
        Object.keys(syncCols).forEach(function (k) {
          var c0 = ph.index[k];
          if (c0 !== undefined) printSh.getRange(pRow, c0 + 1).setValue(syncCols[k]);
        });
      }
    }
  }

  SpreadsheetApp.flush();
  return { ok: true, row: rowNo, updated_at: now };
}

function ppiraBulkSync_(body, user) {
  var list = body.items || [];
  if (!Array.isArray(list) || list.length === 0) throw new Error('동기화할 상품 목록이 비었습니다');
  var ss = sheet_();
  var sh = ensureSheet_(ss, PPIRA_STOCK_TAB, PPIRA_STOCK_HEADERS);
  var printMap = readPrintTabMap_(ss);
  var existingRows = readSheetObjects_(sh);
  var existingByCode = {};
  existingRows.forEach(function (r) {
    var c = (r['Item No.'] || '').trim();
    if (c) existingByCode[c] = r;
  });

  var now = stamp_();
  var outMatrix = [PPIRA_STOCK_HEADERS];

  list.forEach(function (item) {
    var code = String(item.code || '').trim();
    if (!code) return;
    var prev = existingByCode[code] || {};
    var pRow = printMap[code] || {};
    var rowObj = {
      'Item No.': code,
      '한글제목': item.title !== undefined ? item.title : (prev['한글제목'] || ''),
      '영문제목': item.title_en !== undefined ? item.title_en : (prev['영문제목'] || pRow['TITLE'] || ''),
      '판매상태': item.status || prev['판매상태'] || 'sale',
      '수량': item.qty !== undefined && item.qty !== null ? item.qty : (prev['수량'] !== undefined && prev['수량'] !== '' ? prev['수량'] : (pRow['QTY'] || 1)),
      '판매가(USD)': item.price_usd !== undefined && item.price_usd !== null ? item.price_usd : (prev['판매가(USD)'] !== undefined ? prev['판매가(USD)'] : (parsePriceNum_(pRow['판매가 (US$)']) || '')),
      '노출': item.visible === false ? 'N' : (prev['노출'] || 'Y'),
      '분류그룹': item.group || prev['분류그룹'] || 'etc',
      '영상추천': item.featured !== undefined ? (item.featured ? 'Y' : 'N') : (prev['영상추천'] || 'N'),
      '등장영상': Array.isArray(item.episodes) ? item.episodes.join(',') : (item.episodes || prev['등장영상'] || ''),
      '연도': item.year || prev['연도'] || pRow['Year'] || '',
      '발행처': item.maker || prev['발행처'] || pRow['Maker (CN)'] || '',
      '크기': item.size || prev['크기'] || pRow['Size'] || '',
      '상태(Condition)': item.condition || prev['상태(Condition)'] || pRow['Condition'] || '',
      '보관위치(비공개)': item.location || prev['보관위치(비공개)'] || pRow['Location'] || '',
      '관리메모(비공개)': item.admin_memo || prev['관리메모(비공개)'] || '',
      '이미지목록': Array.isArray(item.images) ? item.images.join(',') : (item.images || prev['이미지목록'] || ''),
      '상세설명(MD)': item.body_md || prev['상세설명(MD)'] || '',
      '수정일시': now,
      '수정자': user.name,
    };
    outMatrix.push(PPIRA_STOCK_HEADERS.map(function (col) { return rowObj[col] !== undefined ? rowObj[col] : ''; }));
  });

  sh.clearContents();
  sh.getRange(1, 1, outMatrix.length, PPIRA_STOCK_HEADERS.length).setValues(outMatrix);
  sh.setFrozenRows(1);
  SpreadsheetApp.flush();
  return { ok: true, count: outMatrix.length - 1, syncedAt: now };
}

function ppiraSubmitInquiry_(body) {
  var name = String(body.name || '').trim();
  var contact = String(body.contact || '').trim();
  var memo = String(body.memo || '').trim();
  var codes = String(body.codes || '').trim();
  var summary = String(body.summary || '').trim();
  var totalUsd = body.total_usd !== undefined && body.total_usd !== null ? String(body.total_usd) : '';
  if (!name || !contact) throw new Error('이름과 연락처를 입력해 주세요');

  var ss = sheet_();
  var sh = ensureSheet_(ss, PPIRA_INQ_TAB, PPIRA_INQ_HEADERS);
  var now = stamp_();
  var inquiryId = 'INQ-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd-HHmmss');

  var rowObj = {
    '문의번호': inquiryId,
    '접수일시': now,
    '이름': name,
    '연락처': contact,
    '품목코드': codes,
    '품목요약': summary,
    '합계(USD)': totalUsd,
    '고객메모': memo,
    '처리상태': '접수',
    '관리자비고': '',
    '수정일시': now,
  };

  var row = PPIRA_INQ_HEADERS.map(function (col) { return rowObj[col] || ''; });
  sh.appendRow(row);
  SpreadsheetApp.flush();
  return { ok: true, inquiryId: inquiryId, createdAt: now };
}

function ppiraUpdateInquiry_(body, user) {
  var inquiryId = String(body.inquiryId || '').trim();
  if (!inquiryId) throw new Error('문의번호가 비었습니다');
  var ss = sheet_();
  var sh = ensureSheet_(ss, PPIRA_INQ_TAB, PPIRA_INQ_HEADERS);
  var h = headerIndex_(sh);
  var rowNo = findRow_(sh, h.index['문의번호'] || 0, inquiryId);
  if (!rowNo) throw new Error('해당 문의 내역을 찾지 못했습니다: ' + inquiryId);
  var now = stamp_();
  if (body.status !== undefined && h.index['처리상태'] !== undefined) {
    sh.getRange(rowNo, h.index['처리상태'] + 1).setValue(String(body.status));
  }
  if (body.adminNote !== undefined && h.index['관리자비고'] !== undefined) {
    sh.getRange(rowNo, h.index['관리자비고'] + 1).setValue(String(body.adminNote));
  }
  if (h.index['수정일시'] !== undefined) {
    sh.getRange(rowNo, h.index['수정일시'] + 1).setValue(now + ' (' + user.name + ')');
  }
  SpreadsheetApp.flush();
  return { ok: true, inquiryId: inquiryId, updatedAt: now };
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

function authorizeOnce() {
  var ss = sheet_();
  var n = ss.getSheets().length;
  var f = DriveApp.getFileById(ss.getId());
  Logger.log('ok: ' + ss.getName() + ' tabs=' + n + ' updated=' + f.getLastUpdated());
  return 'ok';
}

/**
 * 라레브 창업상담 설문 → Google Sheets 수집 엔드포인트
 *
 * - GitHub Pages 설문 폼이 fetch(POST, no-cors)로 JSON을 전송한다.
 * - 첫 제출 시 헤더 행이 없으면 필드명으로 자동 생성한다.
 * - consulting_items 등 다중값은 클라이언트에서 콤마로 join되어 오지만,
 *   혹시 배열로 와도 서버에서 다시 join 처리한다.
 */

// 폼 필드 순서 (지시문 명세 그대로)
var FIELDS = [
  'consult_date', 'consult_type', 'name', 'phone', 'location_email', 'age',
  'gender', 'startup_reason', 'flower_reason', 'current_job', 'startup_timing',
  'flower_experience', 'budget', 'available_time', 'service_experience',
  'business_type', 'location_size', 'store_style', 'brand_concept', 'products',
  'strengths', 'weaknesses', 'consulting_items', 'available_schedule',
  'start_date', 'fee_guide', 'concerns', 'other_requests', 'consultant_summary'
];

// 사람이 읽기 쉬운 한글 헤더 (첫 열은 접수시각)
var HEADERS = [
  '접수시각', '상담일자', '상담형식', '성함', '연락처', '거주지역/이메일', '나이',
  '성별', '창업 결심 계기', '플라워 선택 이유', '현재 직업/경력', '창업 시기',
  '꽃 관련 경험', '예상 창업비용', '하루 운영가능 시간', '서비스업 경험',
  '희망 창업형태', '희망 지역/평수', '매장 스타일', '브랜드 컨셉', '판매 희망상품',
  '본인 강점', '보완 필요부분', '필요 컨설팅 항목', '참여 가능 요일/시간',
  '희망 시작일', '비용안내 여부', '가장 큰 고민', '기타 요청사항', '상담 요약(컨설턴트)'
];

function _sheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function _ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
}

function _flatten(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Array]') {
    return v.join(', ');
  }
  return String(v);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // JSON이 아니면 form-encoded 파라미터로 폴백
        data = (e.parameter) || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var sheet = _sheet();
    _ensureHeader(sheet);

    var row = [new Date()];
    for (var i = 0; i < FIELDS.length; i++) {
      row.push(_flatten(data[FIELDS[i]]));
    }
    sheet.appendRow(row);

    return _json({ result: 'success', row: sheet.getLastRow() });
  } catch (err) {
    return _json({ result: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

// 헬스체크 / 검증용 — 접수된 행 수 반환
function doGet(e) {
  var sheet = _sheet();
  var rows = Math.max(0, sheet.getLastRow() - 1); // 헤더 제외
  return _json({ result: 'ok', count: rows });
}

function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function runSystemSelfCheck() {
  requireAuthorizedUser_();
  const checks = [];
  checks.push(checkRequiredSheets_());
  checks.push(checkRequiredHeaders_());
  checks.push(checkDuplicateMemberIds_());
  checks.push(checkDuplicateOrderNumbers_());
  checks.push(checkDuplicateBookingIds_());
  checks.push(checkDuplicateAuditIds_());
  checks.push(checkNegativeMemberBalances_());
  checks.push(checkBookingOverlaps_());
  checks.push(checkAuditCompleteness_());

  const failed = checks.filter(function(check) { return !check.passed; });
  return {
    success: failed.length === 0,
    checkedAt: formatDate_(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    checks: checks,
    failedCount: failed.length
  };
}

function checkRequiredSheets_() {
  const ss = getSpreadsheet_();
  const missing = Object.keys(SCHEMAS).filter(function(name) {
    return !ss.getSheetByName(name);
  });
  return result_('必要資料表', missing.length === 0, missing.length ? '缺少：' + missing.join(', ') : '完整');
}

function checkRequiredHeaders_() {
  const problems = [];
  Object.keys(SCHEMAS).forEach(function(name) {
    const sheet = getSpreadsheet_().getSheetByName(name);
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    const missing = SCHEMAS[name].filter(function(header) { return headers.indexOf(header) < 0; });
    if (missing.length) problems.push(name + ': ' + missing.join(', '));
  });
  return result_('必要欄位', problems.length === 0, problems.length ? problems.join(' | ') : '完整');
}

function checkDuplicateMemberIds_() {
  return duplicateCheck_(CONFIG.SHEETS.MEMBERS, 'memberId', '會員編號重複');
}

function checkDuplicateOrderNumbers_() {
  return duplicateCheck_(CONFIG.SHEETS.ORDERS, 'orderNumber', '訂單號碼重複');
}

function checkDuplicateBookingIds_() {
  return duplicateCheck_(CONFIG.SHEETS.BOOKINGS, 'bookingId', '預約編號重複');
}

function checkDuplicateAuditIds_() {
  return duplicateCheck_(CONFIG.SHEETS.AUDIT_LOG, 'auditId', '稽核編號重複');
}

function duplicateCheck_(sheetName, key, label) {
  const seen = {};
  const duplicates = [];
  getRecords_(sheetName).forEach(function(record) {
    const value = String(record[key] || '');
    if (!value) return;
    if (seen[value]) duplicates.push(value);
    seen[value] = true;
  });
  return result_(label, duplicates.length === 0, duplicates.length ? duplicates.join(', ') : '無');
}

function checkNegativeMemberBalances_() {
  const invalid = getRecords_(CONFIG.SHEETS.MEMBERS).filter(function(member) {
    return Number(member.remainingHours || 0) < 0;
  }).map(function(member) { return member.memberId; });
  return result_('會員負數餘額', invalid.length === 0, invalid.length ? invalid.join(', ') : '無');
}

function checkBookingOverlaps_() {
  const active = getRecords_(CONFIG.SHEETS.BOOKINGS).filter(function(item) {
    return ['Confirmed', 'Completed'].indexOf(String(item.bookingStatus)) >= 0;
  });
  const conflicts = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (String(active[i].coachName) !== String(active[j].coachName)) continue;
      const aStart = bookingDateTime_(active[i].courseDate, active[i].startTime);
      const aEnd = bookingDateTime_(active[i].courseDate, active[i].endTime);
      const bStart = bookingDateTime_(active[j].courseDate, active[j].startTime);
      const bEnd = bookingDateTime_(active[j].courseDate, active[j].endTime);
      if (aStart < bEnd && aEnd > bStart) {
        conflicts.push(active[i].bookingId + ' / ' + active[j].bookingId);
      }
    }
  }
  return result_('教練時段重疊', conflicts.length === 0, conflicts.length ? conflicts.join(', ') : '無');
}

function checkAuditCompleteness_() {
  const invalid = getRecords_(CONFIG.SHEETS.AUDIT_LOG).filter(function(record) {
    return !String(record.auditId || '').trim() ||
      !String(record.user || '').trim() ||
      !String(record.action || '').trim() ||
      !String(record.entity || '').trim();
  }).map(function(record) {
    return String(record.auditId || 'row-' + record._row);
  });
  return result_('稽核紀錄完整性', invalid.length === 0, invalid.length ? invalid.join(', ') : '完整');
}

function result_(name, passed, detail) {
  return { name: name, passed: passed, detail: detail };
}

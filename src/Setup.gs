const SCHEMAS = Object.freeze({
  CRM_Members: ['createdAt','memberId','chineseName','englishName','birthday','phone','address','memberLevel','latestTransaction','completedHours','remainingHours','status','updatedAt'],
  Orders: ['createdAt','orderNumber','memberId','name','phone','billingAddress','productId','productName','purchaseHours','amount','paymentMethod','transactionStatus','isHoursApplied','appliedAt','updatedAt'],
  Bookings: ['createdAt','bookingId','memberId','studentName','coachName','courseDate','startTime','endTime','totalHours','remainingHoursBefore','remainingHoursAfter','bookingStatus','isHoursDeducted','updatedAt','completedAt','completedBy','cancelledAt','cancelledBy','cancelReason'],
  Products: ['productId','productName','hours','price','active'],
  Coaches: ['coachId','coachName','active'],
  Hour_Ledger: ['createdAt','ledgerId','memberId','referenceType','referenceId','deltaHours','balanceBefore','balanceAfter','note','createdBy'],
  Audit_Log: ['createdAt','auditId','user','action','entity','entityId','beforeJson','afterJson','remarks']
});

function setupSystem() {
  const operator = requireAuthorizedUser_();
  const ss = getSpreadsheet_();
  Object.keys(SCHEMAS).forEach(function(name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    ensureHeaders_(sheet, SCHEMAS[name]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, SCHEMAS[name].length);
  });
  seedProducts_();
  seedCoaches_();
  auditLog_('SYSTEM_SETUP', 'SYSTEM', CONFIG.APP_NAME, null, {
    sheets: Object.keys(SCHEMAS)
  }, '初始化或更新系統資料結構', operator);
  return { success: true, sheets: Object.keys(SCHEMAS), updatedBy: operator };
}

function ensureHeaders_(sheet, requiredHeaders) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].filter(String);
  const merged = current.slice();
  requiredHeaders.forEach(function(header) {
    if (merged.indexOf(header) < 0) merged.push(header);
  });
  sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
}

function seedProducts_() {
  const sheet = getSheet_(CONFIG.SHEETS.PRODUCTS);
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, 3, 5).setValues([
    ['A','私人教練一對一 12 小時',12,16000,true],
    ['B','私人教練一對一 25 小時',25,32000,true],
    ['C','私人教練一對一 5 小時',5,8888,true]
  ]);
}

function seedCoaches_() {
  const sheet = getSheet_(CONFIG.SHEETS.COACHES);
  if (sheet.getLastRow() > 1) return;
  const names = ['Apple','Berry','Cindy','Doofy','Fancy'];
  sheet.getRange(2, 1, names.length, 3)
    .setValues(names.map(function(name, i) { return ['C' + String(i + 1).padStart(3, '0'), name, true]; }));
}

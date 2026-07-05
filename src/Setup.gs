const SCHEMAS = Object.freeze({
  CRM_Members: ['createdAt','memberId','chineseName','englishName','birthday','phone','address','memberLevel','latestTransaction','completedHours','remainingHours','status','updatedAt'],
  Orders: ['createdAt','orderNumber','memberId','name','phone','billingAddress','productId','productName','purchaseHours','amount','paymentMethod','transactionStatus','isHoursApplied','appliedAt','updatedAt'],
  Bookings: ['createdAt','bookingId','memberId','studentName','coachName','courseDate','startTime','endTime','totalHours','remainingHoursBefore','remainingHoursAfter','bookingStatus','isHoursDeducted','updatedAt'],
  Products: ['productId','productName','hours','price','active'],
  Coaches: ['coachId','coachName','active'],
  Hour_Ledger: ['createdAt','ledgerId','memberId','referenceType','referenceId','deltaHours','balanceBefore','balanceAfter','note','createdBy']
});

function setupSystem() {
  const ss = getSpreadsheet_();
  Object.keys(SCHEMAS).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    const headers = SCHEMAS[name];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  });
  seedProducts_();
  seedCoaches_();
  return { success: true, sheets: Object.keys(SCHEMAS) };
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
    .setValues(names.map((name, i) => [`C${String(i + 1).padStart(3, '0')}`, name, true]));
}

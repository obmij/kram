const SCHEMAS = Object.freeze({
  CRM_Members: [
    'createdAt','memberId','chineseName','englishName','birthday','phone','address',
    'memberLevel','latestTransaction','completedHours','remainingHours','status','updatedAt',
    'email','passwordSalt','passwordHash','locale','lastLoginAt'
  ],
  Orders: [
    'createdAt','orderNumber','memberId','name','phone','billingAddress','productId',
    'productName','purchaseHours','amount','paymentMethod','transactionStatus',
    'isHoursApplied','appliedAt','updatedAt','baseAmount','serviceFee'
  ],
  Bookings: [
    'createdAt','bookingId','memberId','studentName','coachName','courseDate','startTime',
    'endTime','totalHours','remainingHoursBefore','remainingHoursAfter','bookingStatus',
    'isHoursDeducted','updatedAt','completedAt','completedBy','cancelledAt','cancelledBy','cancelReason'
  ],
  Products: ['productId','productName','hours','price','active','publicDescription','sortOrder'],
  Coaches: [
    'coachId','coachName','active','title','courseName','specialty','languages',
    'bioZh','bioEn','bioJa','imageUrl','sortOrder'
  ],
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
  const seeds = [
    { productId:'A', productName:'私人教練一對一 12 小時', hours:12, price:16000, active:true, publicDescription:'標準私人教練方案', sortOrder:2 },
    { productId:'B', productName:'私人教練一對一 25 小時', hours:25, price:32000, active:true, publicDescription:'長期訓練方案', sortOrder:3 },
    { productId:'C', productName:'私人教練一對一 5 小時', hours:5, price:8888, active:true, publicDescription:'先練五小時看看', sortOrder:4 },
    { productId:'PROMO10', productName:'PMM 試營運 10 小時', hours:10, price:12000, active:true, publicDescription:'PT 每小時 1000，買 10 小時只要 12000。', sortOrder:1 }
  ];
  const existing = getRecords_(CONFIG.SHEETS.PRODUCTS);
  seeds.forEach(function(seed) {
    const record = existing.find(function(item) { return String(item.productId) === seed.productId; });
    if (!record) {
      appendRecord_(CONFIG.SHEETS.PRODUCTS, seed);
      return;
    }
    const changes = {
      publicDescription: record.publicDescription || seed.publicDescription,
      sortOrder: record.sortOrder || seed.sortOrder
    };
    if (seed.productId === 'PROMO10') {
      changes.productName = seed.productName;
      changes.hours = seed.hours;
      changes.price = seed.price;
      changes.active = true;
    }
    updateRecordFields_(CONFIG.SHEETS.PRODUCTS, record._row, changes);
  });
}

function seedCoaches_() {
  const profiles = coachProfileDefaults_();
  const existing = getRecords_(CONFIG.SHEETS.COACHES);
  Object.keys(profiles).forEach(function(name) {
    const seed = profiles[name];
    const record = existing.find(function(item) { return String(item.coachName) === name; });
    if (!record) {
      appendRecord_(CONFIG.SHEETS.COACHES, Object.assign({ active:true, imageUrl:'' }, seed));
      return;
    }
    updateRecordFields_(CONFIG.SHEETS.COACHES, record._row, {
      active: record.active === '' ? true : record.active,
      title: record.title || seed.title,
      courseName: record.courseName || seed.courseName,
      specialty: record.specialty || seed.specialty,
      languages: record.languages || seed.languages,
      bioZh: record.bioZh || seed.bioZh,
      bioEn: record.bioEn || seed.bioEn,
      bioJa: record.bioJa || seed.bioJa,
      sortOrder: record.sortOrder || seed.sortOrder
    });
  });
}

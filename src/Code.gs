const CONFIG = Object.freeze({
  APP_NAME: 'PMM Private Trainer',
  ADMIN_APP_NAME: 'PMM 私人教練管理系統',
  TIMEZONE: 'Asia/Taipei',
  SHEETS: Object.freeze({
    MEMBERS: 'CRM_Members',
    ORDERS: 'Orders',
    BOOKINGS: 'Bookings',
    PRODUCTS: 'Products',
    COACHES: 'Coaches',
    HOUR_LEDGER: 'Hour_Ledger',
    AUDIT_LOG: 'Audit_Log'
  })
});

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const asset = String(params.asset || '');
  const allowedAssets = ['portal-auth-module', 'portal-transaction-module'];
  if (allowedAssets.indexOf(asset) >= 0) {
    return ContentService.createTextOutput(
      HtmlService.createHtmlOutputFromFile(asset).getContent()
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  const requestedMode = String(params.mode || '').toLowerCase();
  const isAdmin = requestedMode === 'admin' && isAuthorizedEmail_(currentUserEmail_());
  const templateName = isAdmin ? 'admin' : 'index';
  const title = isAdmin ? CONFIG.ADMIN_APP_NAME : CONFIG.APP_NAME;

  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .addMetaTag('theme-color', '#10110f');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) throw new Error('尚未設定 Script Property: SPREADSHEET_ID');
  return SpreadsheetApp.openById(spreadsheetId);
}

function getSheet_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  if (!sheet) throw new Error(`找不到資料表：${sheetName}`);
  return sheet;
}

function formatDate_(date, pattern) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, pattern);
}

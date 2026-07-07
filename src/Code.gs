const CONFIG = Object.freeze({
  APP_NAME: 'PMM 私人教練管理系統',
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

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties()
    .getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error('尚未設定 Script Property: SPREADSHEET_ID');
  }

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

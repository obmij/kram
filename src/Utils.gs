function validateRequired_(data, fields) {
  fields.forEach(function(field) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      throw new Error('缺少必要欄位：' + field);
    }
  });
}

function getRecords_(sheetName) {
  const values = getSheet_(sheetName).getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(function(row) {
    return row.some(function(value) { return value !== ''; });
  }).map(function(row, index) {
    const record = { _row: index + 2 };
    headers.forEach(function(header, column) {
      record[header] = row[column];
    });
    return record;
  });
}

function findRecord_(sheetName, key, value) {
  return getRecords_(sheetName).find(function(record) {
    return String(record[key]) === String(value);
  }) || null;
}

function appendRecord_(sheetName, record) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function(header) {
    return Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
  }));
}

function updateRecordFields_(sheetName, rowNumber, changes) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(changes).forEach(function(field) {
    const column = headers.indexOf(field) + 1;
    if (column > 0) sheet.getRange(rowNumber, column).setValue(changes[field]);
  });
}

function isActive_(value) {
  if (value === true) return true;
  return ['true', 'yes', '1', 'active'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
}

function makeId_(prefix) {
  return prefix + '-' + Utilities.getUuid();
}

function asNumber_(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error((label || '數值') + '格式錯誤');
  return number;
}

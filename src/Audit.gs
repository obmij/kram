function auditLog_(action, entity, entityId, beforeValue, afterValue, remarks, userEmail) {
  const sheet = ensureAuditSheet_();
  const now = new Date();
  const operator = String(userEmail || currentUserEmail_() || 'system');
  const auditId = 'AUD-' + formatDate_(now, 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().slice(0, 8);

  sheet.appendRow([
    now,
    auditId,
    operator,
    String(action || ''),
    String(entity || ''),
    String(entityId || ''),
    auditJson_(beforeValue),
    auditJson_(afterValue),
    String(remarks || '')
  ]);

  return auditId;
}

function ensureAuditSheet_() {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.SHEETS.AUDIT_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.AUDIT_LOG);
  }
  const headers = SCHEMAS.Audit_Log;
  ensureHeaders_(sheet, headers);
  sheet.setFrozenRows(1);
  return sheet;
}

function auditJson_(value) {
  if (value === undefined || value === null || value === '') return '';
  try {
    return JSON.stringify(value, function(key, item) {
      if (item instanceof Date) return item.toISOString();
      if (key === '_row') return undefined;
      return item;
    });
  } catch (error) {
    return JSON.stringify({ serializationError: String(error.message || error) });
  }
}

function listAuditLogs(filters) {
  requireAuthorizedUser_();
  const criteria = filters || {};
  const action = String(criteria.action || '').trim().toLowerCase();
  const entity = String(criteria.entity || '').trim().toLowerCase();
  const entityId = String(criteria.entityId || '').trim().toLowerCase();
  const user = String(criteria.user || '').trim().toLowerCase();

  return getRecords_(CONFIG.SHEETS.AUDIT_LOG)
    .filter(function(record) {
      if (action && String(record.action || '').toLowerCase() !== action) return false;
      if (entity && String(record.entity || '').toLowerCase() !== entity) return false;
      if (entityId && String(record.entityId || '').toLowerCase().indexOf(entityId) < 0) return false;
      if (user && String(record.user || '').toLowerCase().indexOf(user) < 0) return false;
      return true;
    })
    .slice(-200)
    .reverse()
    .map(function(record) {
      return {
        createdAt: displayDateTime_(record.createdAt),
        auditId: record.auditId,
        user: record.user,
        action: record.action,
        entity: record.entity,
        entityId: record.entityId,
        beforeJson: record.beforeJson,
        afterJson: record.afterJson,
        remarks: record.remarks
      };
    });
}

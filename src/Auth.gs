function getCurrentUser() {
  const email = currentUserEmail_();
  return {
    email: email,
    authorized: isAuthorizedEmail_(email)
  };
}

function requireAuthorizedUser_() {
  const email = currentUserEmail_();
  if (!email) {
    throw new Error('無法辨識登入帳號，請使用已登入的 Google 帳號開啟系統');
  }
  if (!isAuthorizedEmail_(email)) {
    throw new Error('此帳號沒有 PMM 管理權限：' + email);
  }
  return email;
}

function currentUserEmail_() {
  return String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
}

function isAuthorizedEmail_(email) {
  const raw = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || '';
  const admins = raw.split(',').map(function(value) {
    return String(value || '').trim().toLowerCase();
  }).filter(Boolean);
  return admins.indexOf(String(email || '').trim().toLowerCase()) >= 0;
}

function configureAdminEmails(emails) {
  const properties = PropertiesService.getScriptProperties();
  const existing = String(properties.getProperty('ADMIN_EMAILS') || '').trim();
  const active = currentUserEmail_();
  const owner = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase();
  if (!owner) throw new Error('無法辨識 Apps Script 專案擁有者');

  if (existing) {
    requireAuthorizedUser_();
  } else if (!active || active !== owner) {
    throw new Error('首次設定管理員只能由 Apps Script 專案擁有者執行');
  }

  const beforeAdmins = existing.split(',').map(function(value) {
    return String(value || '').trim().toLowerCase();
  }).filter(Boolean);
  const values = Array.isArray(emails) ? emails : String(emails || '').split(',');
  const normalized = values.map(function(value) {
    return String(value || '').trim().toLowerCase();
  }).filter(Boolean);
  if (normalized.indexOf(owner) < 0) normalized.push(owner);
  properties.setProperty('ADMIN_EMAILS', normalized.join(','));

  const operator = active || owner;
  if (properties.getProperty('SPREADSHEET_ID')) {
    auditLog_('ADMIN_ALLOWLIST_UPDATED', 'SYSTEM', 'ADMIN_EMAILS', {
      admins: beforeAdmins
    }, {
      admins: normalized
    }, '更新管理員白名單', operator);
  }

  return { success: true, admins: normalized, updatedBy: operator };
}

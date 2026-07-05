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
  const owner = Session.getEffectiveUser().getEmail();
  if (!owner) throw new Error('無法辨識 Apps Script 專案擁有者');
  const values = Array.isArray(emails) ? emails : String(emails || '').split(',');
  const normalized = values.map(function(value) {
    return String(value || '').trim().toLowerCase();
  }).filter(Boolean);
  if (normalized.indexOf(owner.toLowerCase()) < 0) normalized.push(owner.toLowerCase());
  PropertiesService.getScriptProperties().setProperty('ADMIN_EMAILS', normalized.join(','));
  return { success: true, admins: normalized };
}

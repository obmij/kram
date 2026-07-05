function addMember(form) {
  const operator = requireAuthorizedUser_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const now = new Date();
    const name = String(form.englishName || '').trim();
    const initial = name.substring(0, 1).toUpperCase();
    if (!initial) throw new Error('請輸入英文姓名');
    const prefix = initial + formatDate_(now, 'MMdd');
    const serial = getRecords_(CONFIG.SHEETS.MEMBERS).filter(function(item) {
      return String(item.memberId || '').indexOf(prefix) === 0;
    }).length + 1;
    const memberId = prefix + String(serial).padStart(3, '0');
    getSheet_(CONFIG.SHEETS.MEMBERS).appendRow([
      now, memberId, form.chineseName || '', name, form.birthday || '',
      form.phone || '', form.address || '', form.memberLevel || 'Gold',
      '', 0, 0, 'Active', now
    ]);
    return { success: true, memberId: memberId, createdBy: operator };
  } finally {
    lock.releaseLock();
  }
}

function getMember(memberId) {
  requireAuthorizedUser_();
  return findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', memberId);
}

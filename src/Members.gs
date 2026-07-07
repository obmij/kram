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
    const member = {
      createdAt: now,
      memberId: memberId,
      chineseName: form.chineseName || '',
      englishName: name,
      birthday: form.birthday || '',
      phone: form.phone || '',
      address: form.address || '',
      memberLevel: form.memberLevel || 'Gold',
      latestTransaction: '',
      completedHours: 0,
      remainingHours: 0,
      status: 'Active',
      updatedAt: now
    };
    getSheet_(CONFIG.SHEETS.MEMBERS).appendRow([
      member.createdAt, member.memberId, member.chineseName, member.englishName,
      member.birthday, member.phone, member.address, member.memberLevel,
      member.latestTransaction, member.completedHours, member.remainingHours,
      member.status, member.updatedAt
    ]);
    auditLog_('MEMBER_CREATED', 'MEMBER', memberId, null, member, '建立會員', operator);
    return { success: true, memberId: memberId, createdBy: operator };
  } finally {
    lock.releaseLock();
  }
}

function getMember(memberId) {
  requireAuthorizedUser_();
  return findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', memberId);
}

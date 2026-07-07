function changeHours(memberId, delta, type, referenceId, note) {
  const operator = requireAuthorizedUser_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const existing = getRecords_(CONFIG.SHEETS.HOUR_LEDGER).find(function(item) {
      return String(item.referenceType) === String(type) &&
        String(item.referenceId) === String(referenceId);
    });
    if (existing) {
      return { success: true, duplicate: true, balanceAfter: existing.balanceAfter };
    }

    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', memberId);
    if (!member) throw new Error('找不到會員');

    const before = Number(member.remainingHours || 0);
    const amount = Number(delta);
    const after = before + amount;
    if (!Number.isFinite(amount)) throw new Error('時數格式錯誤');
    if (after < 0) throw new Error('剩餘時數不足');

    const now = new Date();
    const ledgerId = makeId_('LEDGER');
    getSheet_(CONFIG.SHEETS.HOUR_LEDGER).appendRow([
      now, ledgerId, memberId, type, referenceId,
      amount, before, after, note || '', operator
    ]);

    const sheet = getSheet_(CONFIG.SHEETS.MEMBERS);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.getRange(member._row, headers.indexOf('remainingHours') + 1).setValue(after);
    sheet.getRange(member._row, headers.indexOf('updatedAt') + 1).setValue(now);
    if (type === 'ORDER') {
      sheet.getRange(member._row, headers.indexOf('latestTransaction') + 1).setValue(referenceId);
    }

    auditLog_('HOURS_CHANGED', 'MEMBER', memberId, {
      remainingHours: before
    }, {
      remainingHours: after,
      deltaHours: amount,
      ledgerId: ledgerId,
      referenceType: type,
      referenceId: referenceId
    }, note || '調整會員時數', operator);

    return { success: true, duplicate: false, balanceAfter: after, changedBy: operator };
  } finally {
    lock.releaseLock();
  }
}

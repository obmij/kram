function completeBooking(bookingId) {
  const operator = requireAuthorizedUser_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const booking = findRecord_(CONFIG.SHEETS.BOOKINGS, 'bookingId', bookingId);
    if (!booking) throw new Error('找不到預約');
    if (String(booking.bookingStatus) === 'Completed') {
      return { success: true, duplicate: true, completedHours: null };
    }
    if (String(booking.bookingStatus) !== 'Confirmed') {
      throw new Error('只有已確認的預約可以完成');
    }

    const courseEnd = bookingDateTime_(booking.courseDate, booking.endTime);
    if (courseEnd.getTime() > Date.now()) {
      throw new Error('課程尚未結束，不可提前標記完成');
    }

    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', booking.memberId);
    if (!member) throw new Error('找不到會員');

    const now = new Date();
    const bookingSheet = getSheet_(CONFIG.SHEETS.BOOKINGS);
    const bookingHeaders = bookingSheet.getRange(1, 1, 1, bookingSheet.getLastColumn()).getValues()[0];
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'bookingStatus', 'Completed');
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'updatedAt', now);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'completedAt', now);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'completedBy', operator);

    const memberSheet = getSheet_(CONFIG.SHEETS.MEMBERS);
    const memberHeaders = memberSheet.getRange(1, 1, 1, memberSheet.getLastColumn()).getValues()[0];
    const completedHours = Number(member.completedHours || 0) + Number(booking.totalHours || 0);
    setCellByHeader_(memberSheet, member._row, memberHeaders, 'completedHours', completedHours);
    setCellByHeader_(memberSheet, member._row, memberHeaders, 'updatedAt', now);

    return {
      success: true,
      duplicate: false,
      completedHours: completedHours,
      completedAt: formatDate_(now, 'yyyy-MM-dd HH:mm'),
      completedBy: operator
    };
  } finally {
    lock.releaseLock();
  }
}

function setCellByHeader_(sheet, row, headers, header, value) {
  const column = headers.indexOf(header);
  if (column < 0) throw new Error('缺少資料欄位：' + header + '，請先執行 setupSystem()');
  sheet.getRange(row, column + 1).setValue(value);
}

function createBooking(form) {
  validateRequired_(form, ['memberId', 'coachName', 'courseDate', 'startTime', 'endTime']);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', form.memberId);
    if (!member) throw new Error('找不到會員');

    const start = new Date(String(form.courseDate) + 'T' + String(form.startTime) + ':00+08:00');
    const end = new Date(String(form.courseDate) + 'T' + String(form.endTime) + ':00+08:00');
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (!Number.isFinite(hours) || hours <= 0 || Math.floor(hours) !== hours) {
      throw new Error('課程時數必須為正整數');
    }
    if (!isOperatingSlot_(start, end)) throw new Error('所選時間不在可預約時段');

    const conflict = getRecords_(CONFIG.SHEETS.BOOKINGS).some(function(item) {
      if (String(item.coachName) !== String(form.coachName)) return false;
      if (String(item.bookingStatus) !== 'Confirmed') return false;
      const bookedStart = new Date(String(item.courseDate) + 'T' + String(item.startTime) + ':00+08:00');
      const bookedEnd = new Date(String(item.courseDate) + 'T' + String(item.endTime) + ':00+08:00');
      return start < bookedEnd && end > bookedStart;
    });
    if (conflict) throw new Error('此教練時段已被預約');

    const before = Number(member.remainingHours || 0);
    const after = before - hours;
    if (after < 0) throw new Error('剩餘時數不足');

    const bookingId = 'BOOK-' + formatDate_(new Date(), 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().slice(0, 8);
    const now = new Date();
    getSheet_(CONFIG.SHEETS.BOOKINGS).appendRow([
      now, bookingId, member.memberId,
      member.chineseName || member.englishName,
      form.coachName, form.courseDate, form.startTime, form.endTime,
      hours, before, after, 'Confirmed', true, now
    ]);

    getSheet_(CONFIG.SHEETS.HOUR_LEDGER).appendRow([
      now, makeId_('LEDGER'), member.memberId, 'BOOKING', bookingId,
      -hours, before, after, '課程預約扣時', 'system'
    ]);

    const memberSheet = getSheet_(CONFIG.SHEETS.MEMBERS);
    const headers = memberSheet.getRange(1, 1, 1, memberSheet.getLastColumn()).getValues()[0];
    memberSheet.getRange(member._row, headers.indexOf('remainingHours') + 1).setValue(after);
    memberSheet.getRange(member._row, headers.indexOf('updatedAt') + 1).setValue(now);

    return { success: true, bookingId: bookingId, totalHours: hours, remainingHours: after };
  } finally {
    lock.releaseLock();
  }
}

function isOperatingSlot_(start, end) {
  const startHour = Number(formatDate_(start, 'H'));
  const endHour = Number(formatDate_(end, 'H'));
  const sameDay = formatDate_(start, 'yyyyMMdd') === formatDate_(end, 'yyyyMMdd');
  const morning = startHour >= 8 && endHour <= 12;
  const afternoon = startHour >= 13 && endHour <= 22;
  return sameDay && (morning || afternoon);
}

function listAvailableSlots(coachName, courseDate) {
  const starts = [8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const bookings = getRecords_(CONFIG.SHEETS.BOOKINGS).filter(function(item) {
    return String(item.coachName) === String(coachName) &&
      String(item.courseDate) === String(courseDate) &&
      String(item.bookingStatus) === 'Confirmed';
  });
  return starts.filter(function(hour) {
    const label = String(hour).padStart(2, '0') + ':00';
    return !bookings.some(function(item) { return String(item.startTime) === label; });
  }).map(function(hour) {
    return {
      startTime: String(hour).padStart(2, '0') + ':00',
      endTime: String(hour + 1).padStart(2, '0') + ':00'
    };
  });
}

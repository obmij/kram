function createBooking(form) {
  validateRequired_(form, ['memberId', 'coachName', 'courseDate', 'startTime', 'endTime']);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', form.memberId);
    if (!member) throw new Error('找不到會員');

    const start = bookingDateTime_(form.courseDate, form.startTime);
    const end = bookingDateTime_(form.courseDate, form.endTime);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    if (!Number.isFinite(hours) || hours <= 0 || Math.floor(hours) !== hours) {
      throw new Error('課程時數必須為正整數');
    }
    if (start.getTime() <= Date.now()) throw new Error('不可預約過去時段');
    if (!isOperatingSlot_(start, end)) throw new Error('所選時間不在可預約時段');
    if (hasCoachConflict_(form.coachName, start, end)) throw new Error('此教練時段已被預約');

    const before = Number(member.remainingHours || 0);
    const after = before - hours;
    if (after < 0) throw new Error('剩餘時數不足');

    const bookingId = 'BOOK-' + formatDate_(new Date(), 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().slice(0, 8);
    const now = new Date();
    getSheet_(CONFIG.SHEETS.BOOKINGS).appendRow([
      now, bookingId, member.memberId,
      member.chineseName || member.englishName,
      form.coachName, normalizeDate_(form.courseDate), normalizeTime_(form.startTime), normalizeTime_(form.endTime),
      hours, before, after, 'Confirmed', true, now, '', ''
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
  return starts.filter(function(hour) {
    const startTime = String(hour).padStart(2, '0') + ':00';
    const endTime = String(hour + 1).padStart(2, '0') + ':00';
    const start = bookingDateTime_(courseDate, startTime);
    const end = bookingDateTime_(courseDate, endTime);
    return start.getTime() > Date.now() && !hasCoachConflict_(coachName, start, end);
  }).map(function(hour) {
    return {
      startTime: String(hour).padStart(2, '0') + ':00',
      endTime: String(hour + 1).padStart(2, '0') + ':00'
    };
  });
}

function hasCoachConflict_(coachName, start, end) {
  return getRecords_(CONFIG.SHEETS.BOOKINGS).some(function(item) {
    if (String(item.coachName) !== String(coachName)) return false;
    if (['Confirmed', 'Completed'].indexOf(String(item.bookingStatus)) < 0) return false;
    const bookedStart = bookingDateTime_(item.courseDate, item.startTime);
    const bookedEnd = bookingDateTime_(item.courseDate, item.endTime);
    return start < bookedEnd && end > bookedStart;
  });
}

function bookingDateTime_(dateValue, timeValue) {
  const date = normalizeDate_(dateValue);
  const time = normalizeTime_(timeValue);
  const result = new Date(date + 'T' + time + ':00+08:00');
  if (isNaN(result.getTime())) throw new Error('日期或時間格式錯誤');
  return result;
}

function normalizeDate_(value) {
  if (value instanceof Date) return formatDate_(value, 'yyyy-MM-dd');
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})[-\/]?(\d{2})[-\/]?(\d{2})/);
  if (!match) throw new Error('日期格式錯誤');
  return match[1] + '-' + match[2] + '-' + match[3];
}

function normalizeTime_(value) {
  if (value instanceof Date) return formatDate_(value, 'HH:mm');
  const text = String(value || '').trim();
  const match = text.match(/^(\d{1,2}):(\d{2})/);
  if (!match) throw new Error('時間格式錯誤');
  return String(Number(match[1])).padStart(2, '0') + ':' + match[2];
}

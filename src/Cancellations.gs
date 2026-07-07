function cancelBooking(bookingId, reason) {
  const operator = requireAuthorizedUser_();
  const cancelReason = String(reason || '').trim();
  if (!cancelReason) throw new Error('請填寫取消原因');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const booking = findRecord_(CONFIG.SHEETS.BOOKINGS, 'bookingId', bookingId);
    if (!booking) throw new Error('找不到預約');

    if (String(booking.bookingStatus) === 'Cancelled') {
      return {
        success: true,
        duplicate: true,
        bookingId: bookingId,
        remainingHours: Number(booking.remainingHoursAfter || 0)
      };
    }
    if (String(booking.bookingStatus) !== 'Confirmed') {
      throw new Error('只有已確認的預約可以取消');
    }

    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', booking.memberId);
    if (!member) throw new Error('找不到會員');

    const hours = Number(booking.totalHours || 0);
    if (!Number.isFinite(hours) || hours <= 0) throw new Error('預約時數資料錯誤');

    const refundType = 'BOOKING_CANCEL';
    const existingRefund = getRecords_(CONFIG.SHEETS.HOUR_LEDGER).find(function(item) {
      return String(item.referenceType) === refundType &&
        String(item.referenceId) === String(bookingId);
    });

    const now = new Date();
    const memberSheet = getSheet_(CONFIG.SHEETS.MEMBERS);
    const memberHeaders = memberSheet.getRange(1, 1, 1, memberSheet.getLastColumn()).getValues()[0];
    const balanceBefore = Number(member.remainingHours || 0);
    let balanceAfter;
    let ledgerId;

    if (existingRefund) {
      balanceAfter = Number(existingRefund.balanceAfter || balanceBefore);
      ledgerId = existingRefund.ledgerId;
    } else {
      balanceAfter = balanceBefore + hours;
      ledgerId = makeId_('LEDGER');
      getSheet_(CONFIG.SHEETS.HOUR_LEDGER).appendRow([
        now,
        ledgerId,
        member.memberId,
        refundType,
        bookingId,
        hours,
        balanceBefore,
        balanceAfter,
        '取消預約退回時數｜' + cancelReason,
        operator
      ]);
    }

    setCellByHeader_(memberSheet, member._row, memberHeaders, 'remainingHours', balanceAfter);
    setCellByHeader_(memberSheet, member._row, memberHeaders, 'updatedAt', now);

    const bookingSheet = getSheet_(CONFIG.SHEETS.BOOKINGS);
    const bookingHeaders = bookingSheet.getRange(1, 1, 1, bookingSheet.getLastColumn()).getValues()[0];
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'bookingStatus', 'Cancelled');
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'remainingHoursAfter', balanceAfter);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'updatedAt', now);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'cancelledAt', now);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'cancelledBy', operator);
    setCellByHeader_(bookingSheet, booking._row, bookingHeaders, 'cancelReason', cancelReason);

    auditLog_('BOOKING_CANCELLED', 'BOOKING', bookingId, {
      bookingStatus: booking.bookingStatus,
      memberRemainingHours: balanceBefore
    }, {
      bookingStatus: 'Cancelled',
      memberRemainingHours: balanceAfter,
      returnedHours: hours,
      ledgerId: ledgerId,
      cancelledAt: now,
      cancelledBy: operator,
      cancelReason: cancelReason
    }, '取消課程並退回會員時數', operator);

    return {
      success: true,
      duplicate: Boolean(existingRefund),
      bookingId: bookingId,
      returnedHours: hours,
      remainingHours: balanceAfter,
      cancelledAt: formatDate_(now, 'yyyy-MM-dd HH:mm'),
      cancelledBy: operator
    };
  } finally {
    lock.releaseLock();
  }
}

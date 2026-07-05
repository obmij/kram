function searchMembers(keyword) {
  requireAuthorizedUser_();
  const term = String(keyword || '').trim().toLowerCase();
  return getRecords_(CONFIG.SHEETS.MEMBERS)
    .filter(function (member) {
      if (!term) return true;
      return [member.memberId, member.chineseName, member.englishName, member.phone]
        .some(function (value) { return String(value || '').toLowerCase().indexOf(term) >= 0; });
    })
    .slice(-100)
    .reverse()
    .map(function (member) {
      return {
        memberId: member.memberId,
        chineseName: member.chineseName,
        englishName: member.englishName,
        phone: member.phone,
        memberLevel: member.memberLevel,
        completedHours: Number(member.completedHours || 0),
        remainingHours: Number(member.remainingHours || 0),
        latestTransaction: member.latestTransaction || '',
        status: member.status || 'Active'
      };
    });
}

function listOrders(status) {
  requireAuthorizedUser_();
  const filter = String(status || 'ALL');
  return getRecords_(CONFIG.SHEETS.ORDERS)
    .filter(function (order) {
      return filter === 'ALL' || String(order.transactionStatus) === filter;
    })
    .slice(-100)
    .reverse()
    .map(function (order) {
      return {
        createdAt: displayDateTime_(order.createdAt),
        orderNumber: order.orderNumber,
        memberId: order.memberId,
        name: order.name,
        productName: order.productName,
        purchaseHours: Number(order.purchaseHours || 0),
        amount: Number(order.amount || 0),
        paymentMethod: order.paymentMethod,
        transactionStatus: order.transactionStatus,
        isHoursApplied: order.isHoursApplied === true
      };
    });
}

function listBookings() {
  requireAuthorizedUser_();
  return getRecords_(CONFIG.SHEETS.BOOKINGS)
    .slice(-100)
    .reverse()
    .map(function (booking) {
      return {
        createdAt: displayDateTime_(booking.createdAt),
        bookingId: booking.bookingId,
        memberId: booking.memberId,
        studentName: booking.studentName,
        coachName: booking.coachName,
        courseDate: displayDate_(booking.courseDate),
        startTime: displayTime_(booking.startTime),
        endTime: displayTime_(booking.endTime),
        totalHours: Number(booking.totalHours || 0),
        bookingStatus: booking.bookingStatus,
        completedAt: displayDateTime_(booking.completedAt)
      };
    });
}

function displayDateTime_(value) {
  return value instanceof Date ? formatDate_(value, 'yyyy-MM-dd HH:mm') : String(value || '');
}

function displayDate_(value) {
  return value instanceof Date ? formatDate_(value, 'yyyy-MM-dd') : String(value || '');
}

function displayTime_(value) {
  return value instanceof Date ? formatDate_(value, 'HH:mm') : String(value || '');
}

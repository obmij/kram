function getDashboardSummary() {
  requireAuthorizedUser_();
  const members = getRecords_(CONFIG.SHEETS.MEMBERS);
  const orders = getRecords_(CONFIG.SHEETS.ORDERS);
  const bookings = getRecords_(CONFIG.SHEETS.BOOKINGS);
  const today = formatDate_(new Date(), 'yyyy-MM-dd');
  const month = formatDate_(new Date(), 'yyyy-MM');

  const pendingOrders = orders.filter(function (order) {
    return String(order.transactionStatus) === 'Pending';
  }).length;

  const todayBookings = bookings.filter(function (booking) {
    return displayDate_(booking.courseDate) === today &&
      String(booking.bookingStatus) === 'Confirmed';
  }).length;

  const monthlyRevenue = orders.filter(function (order) {
    const created = order.createdAt instanceof Date
      ? formatDate_(order.createdAt, 'yyyy-MM')
      : String(order.createdAt).slice(0, 7);
    return created === month && String(order.transactionStatus) === 'Paid';
  }).reduce(function (sum, order) {
    return sum + Number(order.amount || 0);
  }, 0);

  return {
    memberCount: members.filter(function (member) {
      return String(member.status) !== 'Inactive';
    }).length,
    pendingOrders: pendingOrders,
    todayBookings: todayBookings,
    monthlyRevenue: monthlyRevenue
  };
}

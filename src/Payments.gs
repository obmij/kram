function markOrderPaid(orderNumber) {
  const operator = requireAuthorizedUser_();
  const order = findRecord_(CONFIG.SHEETS.ORDERS, 'orderNumber', orderNumber);
  if (!order) throw new Error('找不到訂單');
  if (order.transactionStatus === 'Paid' && order.isHoursApplied === true) {
    return { success: true, duplicate: true };
  }

  const result = changeHours(
    order.memberId,
    Number(order.purchaseHours),
    'ORDER',
    order.orderNumber,
    '付款完成後加值｜' + operator
  );

  const sheet = getSheet_(CONFIG.SHEETS.ORDERS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.getRange(order._row, headers.indexOf('transactionStatus') + 1).setValue('Paid');
  sheet.getRange(order._row, headers.indexOf('isHoursApplied') + 1).setValue(true);
  sheet.getRange(order._row, headers.indexOf('appliedAt') + 1).setValue(new Date());
  sheet.getRange(order._row, headers.indexOf('updatedAt') + 1).setValue(new Date());

  return {
    success: true,
    duplicate: result.duplicate,
    balanceAfter: result.balanceAfter,
    appliedBy: operator
  };
}

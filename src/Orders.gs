function createOrder(data) {
  const operator = requireAuthorizedUser_();
  validateRequired_(data, ['memberId', 'productId', 'paymentMethod']);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const product = findRecord_(CONFIG.SHEETS.PRODUCTS, 'productId', data.productId);
    if (!product || product.active !== true) throw new Error('產品不存在或未啟用');
    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', data.memberId);
    if (!member) throw new Error('找不到會員');
    const now = new Date();
    const orderNumber = generateOrderNumber_(now);
    const order = {
      createdAt: now,
      orderNumber: orderNumber,
      memberId: member.memberId,
      name: member.chineseName || member.englishName,
      phone: member.phone,
      billingAddress: data.billingAddress || member.address || '',
      productId: product.productId,
      productName: product.productName,
      purchaseHours: product.hours,
      amount: product.price,
      paymentMethod: data.paymentMethod,
      transactionStatus: 'Pending',
      isHoursApplied: false,
      appliedAt: '',
      updatedAt: now
    };
    getSheet_(CONFIG.SHEETS.ORDERS).appendRow([
      order.createdAt, order.orderNumber, order.memberId, order.name, order.phone,
      order.billingAddress, order.productId, order.productName,
      order.purchaseHours, order.amount, order.paymentMethod,
      order.transactionStatus, order.isHoursApplied, order.appliedAt, order.updatedAt
    ]);
    auditLog_('ORDER_CREATED', 'ORDER', orderNumber, null, order, '建立待付款訂單', operator);
    return { success: true, orderNumber: orderNumber, amount: product.price, createdBy: operator };
  } finally {
    lock.releaseLock();
  }
}

function generateOrderNumber_(date) {
  const prefix = formatDate_(date, 'yyyyMMdd');
  const count = getRecords_(CONFIG.SHEETS.ORDERS).filter(function(order) {
    return String(order.orderNumber || '').startsWith(prefix);
  }).length;
  return prefix + String(count + 1).padStart(4, '0');
}

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
    getSheet_(CONFIG.SHEETS.ORDERS).appendRow([
      now,
      orderNumber,
      member.memberId,
      member.chineseName || member.englishName,
      member.phone,
      data.billingAddress || member.address || '',
      product.productId,
      product.productName,
      product.hours,
      product.price,
      data.paymentMethod,
      'Pending',
      false,
      '',
      now
    ]);
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

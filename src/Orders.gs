function createOrder(data) {
  const operator = requireAuthorizedUser_();
  validateRequired_(data, ['memberId', 'productId', 'paymentMethod']);
  return createOrderForMember_(data.memberId, data, operator);
}

function createOrderForMember_(memberId, data, operator) {
  validateRequired_(data, ['productId', 'paymentMethod']);
  if (PORTAL_PAYMENT_METHODS.indexOf(String(data.paymentMethod)) < 0) {
    throw new Error('不支援的付款方式');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const product = findRecord_(CONFIG.SHEETS.PRODUCTS, 'productId', data.productId);
    if (!product || !(product.active === '' || isActive_(product.active))) {
      throw new Error('產品不存在或未啟用');
    }
    const member = findRecord_(CONFIG.SHEETS.MEMBERS, 'memberId', memberId);
    if (!member) throw new Error('找不到會員');

    const now = new Date();
    const orderNumber = generateOrderNumber_(now);
    const baseAmount = Number(product.price || 0);
    const serviceFee = String(data.paymentMethod) === '現場現金' ? Math.round(baseAmount * 0.5) : 0;
    const amount = baseAmount + serviceFee;
    const order = {
      createdAt: now,
      orderNumber: orderNumber,
      memberId: member.memberId,
      name: member.chineseName || member.englishName,
      phone: member.phone,
      billingAddress: data.billingAddress || member.address || '',
      productId: product.productId,
      productName: product.productName,
      purchaseHours: Number(product.hours || 0),
      baseAmount: baseAmount,
      serviceFee: serviceFee,
      amount: amount,
      paymentMethod: data.paymentMethod,
      transactionStatus: 'Pending',
      isHoursApplied: false,
      appliedAt: '',
      updatedAt: now
    };
    appendRecord_(CONFIG.SHEETS.ORDERS, order);
    updateRecordFields_(CONFIG.SHEETS.MEMBERS, member._row, {
      latestTransaction: orderNumber,
      updatedAt: now
    });
    auditLog_('ORDER_CREATED', 'ORDER', orderNumber, null, order,
      serviceFee ? '建立待付款訂單；現場現金加收 50% 洗錢服務費' : '建立待付款訂單',
      operator);
    return {
      success: true,
      orderNumber: orderNumber,
      baseAmount: baseAmount,
      serviceFee: serviceFee,
      amount: amount,
      createdBy: operator
    };
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

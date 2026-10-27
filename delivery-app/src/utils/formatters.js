export const formatINR = (amount) => {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
};

export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isTractorOrder = (order) =>
  Boolean(order?.tractorType) || order?.transportType === 'Tractor';

export const formatOrderQuantity = (order) => {
  if (!order) return '—';
  if (isTractorOrder(order)) {
    const n = Number(order.numberOfTractors || order.quantity) || 0;
    return `${n} Tractor${n === 1 ? '' : 's'}`;
  }
  // Dumper's real quantity is only known once the dealer weighs it (order.totalWeight) -- before
  // that, order.quantity is just a booking placeholder (always 1).
  const tons = order.totalWeight || order.approximateTon || order.quantity || 0;
  return `${tons} Tons`;
};

// Dumper orders settle in two separate payments: a small upfront booking payment
// (order.totalAmount) and a final, actual-weighed-tonnage payment (order.finalPaymentAmount,
// Total Weight x Rate Per Ton). finalPaymentAmount is computed and saved the moment the dealer
// enters the weighed tonnage (enterTotalWeight) -- well before that final payment is actually
// PAID -- so once the real weight is known, it (not the upfront booking figure) is the order's
// real bottom-line total, matching formatOrderQuantity's own totalWeight check above. Whether
// that final payment has actually been collected yet is a separate concern (shown by the "Final
// Payment Due" section elsewhere), not something this total should hide behind.
export const getOrderGrandTotal = (order) => {
  if (!order) return 0;
  if (!isTractorOrder(order) && order.totalWeight) {
    // finalPaymentAmount is already net of the upfront booking amount (see
    // orderController.enterTotalWeight) -- add it back so this stays the TRUE bottom-line total,
    // not just what's still owed.
    return (order.finalPaymentAmount || 0) + (order.bookingAmountSnapshot || 0);
  }
  return order.totalAmount || 0;
};

export const formatOrderTransport = (order) => {
  if (!order) return '—';
  if (isTractorOrder(order)) {
    return order.tractorType || 'Tractor';
  }
  return order.vehicleType || '—';
};

export const getTractorPrice = (product, tractorType) => {
  if (!product) return 0;
  if (tractorType === 'Single Patiya') return Number(product.priceSinglePatiya) || 0;
  if (tractorType === 'Double Patiya') return Number(product.priceDoublePatiya) || 0;
  return 0;
};

export const formatShortDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

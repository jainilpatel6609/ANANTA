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
  return `${order.quantity} Tons`;
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

// Splits an order's totalAmount into the dealer's own material-sale portion and Ananta's own
// platform service-charge portion, using the rate snapshotted on the order at booking time (never
// read from the CURRENT admin setting, since a later rate change must never retroactively change
// what an already-issued GST invoice shows). Single source of truth, reused wherever this split
// is needed -- mirrors exactly how orderController.js originally blended the two into one price.
const splitOrderAmount = (order) => {
  const rate = order.serviceChargeRateSnapshot || 0;
  const isTractor = order.vehicleTypeSnapshot === 'TRACTOR' || order.transportType === 'Tractor';

  // Tractor's service charge is added per-tractor before being multiplied by quantity; Dumper's
  // upfront totalAmount is a flat per-order charge (never scaled by quantity -- see
  // orderController.js's DUMPER pricing branch), so the snapshot rate applies once, unscaled.
  const serviceChargeAmount = isTractor ? rate * (order.numberOfTractors || order.quantity || 1) : rate;

  const materialAmount = Math.max(0, (order.totalAmount || 0) - serviceChargeAmount);

  return { serviceChargeAmount, materialAmount };
};

module.exports = { splitOrderAmount };

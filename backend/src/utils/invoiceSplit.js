// Splits an order's total value into the dealer's own material-sale portion and Ananta's own
// platform service-charge portion, using the rate snapshotted on the order at booking time (never
// read from the CURRENT admin setting, since a later rate change must never retroactively change
// what an already-issued GST invoice shows). Single source of truth, reused wherever this split
// is needed -- mirrors exactly how orderController.js originally blended the two into one price.
const splitOrderAmount = (order) => {
  const rate = order.serviceChargeRateSnapshot || 0;
  const isTractor = order.vehicleTypeSnapshot === 'TRACTOR' || order.transportType === 'Tractor';

  // Dumper's upfront totalAmount is just a flat booking token (priced as if for 1 Ton) -- the
  // real sale is by actual weighed tonnage, settled separately via the final (weight-based)
  // payment (see orderController.js's enterTotalWeight). Once that final settlement is PAID, the
  // invoice must reflect the REAL total (totalWeight x pricePerTonSnapshot), not the booking
  // token -- and the service charge (itself a per-Ton rate for Dumper) scales with that same
  // real weight, since it was already baked into pricePerTonSnapshot per-Ton.
  if (!isTractor && order.finalPaymentStatus === 'PAID' && order.totalWeight) {
    const serviceChargeAmount = Math.round(rate * order.totalWeight * 100) / 100;
    const materialAmount = Math.max(0, (order.finalPaymentAmount || 0) - serviceChargeAmount);
    return { serviceChargeAmount, materialAmount };
  }

  // Tractor's service charge is added per-tractor before being multiplied by quantity; Dumper's
  // upfront totalAmount (before final settlement) is a flat per-order charge (never scaled by
  // quantity -- see orderController.js's DUMPER pricing branch), so the snapshot rate applies
  // once, unscaled.
  const serviceChargeAmount = isTractor ? rate * (order.numberOfTractors || order.quantity || 1) : rate;

  const materialAmount = Math.max(0, (order.totalAmount || 0) - serviceChargeAmount);

  return { serviceChargeAmount, materialAmount };
};

module.exports = { splitOrderAmount };

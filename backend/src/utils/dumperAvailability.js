const mongoose = require('mongoose');
const Dumper = require('../models/Dumper');

const { WHEEL_TYPES } = Dumper;

// Dealer ids that currently have at least one enabled AND available dumper of this wheel type.
// Reads live Dumper records so it always reflects current status.
const getDealerIdsWithAvailableDumper = async (wheelType) => {
  const ids = await Dumper.distinct('dealerId', { wheelType: Number(wheelType), status: 'AVAILABLE' });
  return ids.map((id) => id.toString());
};

// Atomically claim one dumper for an order (AVAILABLE -> IN_ORDER). Returns the dumper, or null if it
// is not this dealer's / not that wheel type / no longer available.
const claimDumperForOrder = async ({ dumperId, dealerId, wheelType, orderId }) => {
  if (!mongoose.isValidObjectId(dumperId)) return null;
  const filter = { _id: dumperId, dealerId, status: 'AVAILABLE' };
  if (wheelType) filter.wheelType = Number(wheelType);
  return Dumper.findOneAndUpdate(filter, { status: 'IN_ORDER', orderId }, { new: true });
};

// IN_ORDER -> AVAILABLE for whatever dumper is held by this order.
const releaseDumperForOrder = async (orderId) =>
  Dumper.updateMany({ orderId, status: 'IN_ORDER' }, { status: 'AVAILABLE', orderId: null });

const emptyBucket = () => ({ total: 0, available: 0, inOrder: 0, disabled: 0 });

// Rolls raw dumper rows ({wheelType, status, count}) up into totals + a wheel-wise breakdown.
const buildSummary = (rows = []) => {
  const summary = { ...emptyBucket(), wheels: {} };
  WHEEL_TYPES.forEach((w) => {
    summary.wheels[w] = emptyBucket();
  });
  rows.forEach(({ wheelType, status, count }) => {
    const wheel = summary.wheels[wheelType];
    if (!wheel) return;
    const key = status === 'AVAILABLE' ? 'available' : status === 'IN_ORDER' ? 'inOrder' : 'disabled';
    wheel.total += count;
    wheel[key] += count;
    summary.total += count;
    summary[key] += count;
  });
  return summary;
};

module.exports = {
  getDealerIdsWithAvailableDumper,
  claimDumperForOrder,
  releaseDumperForOrder,
  buildSummary
};

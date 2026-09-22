const Order = require('../models/Order');

// A driver counts as "busy" while any of their orders is still in progress --
// accepted but not yet delivered. Once delivered (or cancelled) they're free again.
const ACTIVE_STATUSES = ['ACCEPTED', 'OUT_FOR_DELIVERY'];

/**
 * A driver -- whether a saved fleet Driver (by id) or a free-text mobile number typed
 * in manually -- can only be on one active delivery at a time. Returns the conflicting
 * Order (a lean {orderNumber} projection) if this driver is already busy on a
 * *different* order, or null if they're free to be assigned.
 *
 * `excludeOrderId` must always be the order being assigned to, so re-selecting a
 * driver already on THIS SAME order (e.g. re-opening the dispatch modal) is never
 * treated as a conflict with itself.
 */
const findConflictingActiveOrder = async ({ driverId, mobile, excludeOrderId }) => {
  const or = [];
  if (driverId) or.push({ driverId });
  if (mobile) or.push({ driverMobile: mobile });
  if (or.length === 0) return null;

  return Order.findOne({
    orderStatus: { $in: ACTIVE_STATUSES },
    _id: { $ne: excludeOrderId },
    $or: or
  }).select('orderNumber');
};

module.exports = { findConflictingActiveOrder };

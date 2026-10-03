const DealerActivityLog = require('../models/DealerActivityLog');

// Records one entry in a dealer's activity log (Driver Fleet / My Dumpers /
// Transport Rates / Depot Profile changes), shown to Admin on the Dealer
// Management screen. A logging failure must never break the action that
// triggered it, so errors are swallowed here.
const logDealerActivity = async ({ dealerId, category, action, description, actor }) => {
  try {
    await DealerActivityLog.create({
      dealerId,
      category,
      action,
      description,
      actorId: actor?._id || null,
      actorName: actor?.name || '',
      actorRole: actor?.role || ''
    });
  } catch (error) {
    console.error('Failed to record dealer activity log:', error.message);
  }
};

module.exports = { logDealerActivity };

const Counter = require('../models/Counter');

const generateDealerCode = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'dealer_code',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSequence = String(counter.seq).padStart(4, '0');
  return `DLR-${paddedSequence}`;
};

module.exports = {
  generateDealerCode
};

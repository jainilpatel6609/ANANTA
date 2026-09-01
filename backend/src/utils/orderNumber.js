const Counter = require('../models/Counter');

const generateOrderNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterId = `order_${currentYear}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSequence = String(counter.seq).padStart(6, '0');
  return `AT-${currentYear}-${paddedSequence}`;
};

module.exports = {
  generateOrderNumber
};

const mongoose = require('mongoose');
const DealerTractorRate = require('../models/DealerTractorRate');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logDealerActivity } = require('../utils/dealerActivityLogger');

const { TRACTOR_TYPES } = DealerTractorRate;

// @desc    Get this dealer's Tractor rates (admin: ?dealerId=)
// @route   GET /api/dealer-tractor-rates
// @access  Private (Dealer, Admin)
const getMyRates = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'ADMIN') {
      if (!req.query.dealerId || !mongoose.isValidObjectId(req.query.dealerId)) {
        return errorResponse(res, 'A valid dealerId is required.', 400);
      }
      filter.dealerId = req.query.dealerId;
    } else {
      filter.dealerId = req.user._id;
    }

    const rates = await DealerTractorRate.find(filter);
    return successResponse(res, 'Tractor rates retrieved successfully.', { rates });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Set (create or update) this dealer's rate for a Patiya type
// @route   PUT /api/dealer-tractor-rates/:tractorType
// @access  Private (Dealer, Admin)
const setRate = async (req, res) => {
  try {
    const tractorType = req.params.tractorType;
    if (!TRACTOR_TYPES.includes(tractorType)) {
      return errorResponse(res, `Tractor type must be one of: ${TRACTOR_TYPES.join(', ')}.`, 400);
    }

    const rate = Number(req.body.ratePerTractor);
    if (!Number.isFinite(rate) || rate <= 0) {
      return errorResponse(res, 'Rate per tractor must be a number greater than 0.', 400);
    }

    let dealerId = req.user._id;
    if (req.user.role === 'ADMIN') {
      if (!req.body.dealerId || !mongoose.isValidObjectId(req.body.dealerId)) {
        return errorResponse(res, 'A valid dealerId is required.', 400);
      }
      dealerId = req.body.dealerId;
    }

    const existing = await DealerTractorRate.findOne({ dealerId, tractorType });
    const dealerTractorRate = await DealerTractorRate.findOneAndUpdate(
      { dealerId, tractorType },
      { $set: { ratePerTractor: rate, isActive: true } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    logDealerActivity({
      dealerId,
      category: 'TRACTOR',
      action: existing ? 'Updated tractor rate' : 'Added tractor rate',
      description: `${tractorType} rate set to ₹${rate}.`,
      actor: req.user
    });

    return successResponse(res, 'Tractor rate saved successfully.', { rate: dealerTractorRate });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Enable / disable this dealer's rate for a Patiya type
// @route   PATCH /api/dealer-tractor-rates/:tractorType/toggle
// @access  Private (Dealer, Admin)
const toggleRate = async (req, res) => {
  try {
    const tractorType = req.params.tractorType;
    if (!TRACTOR_TYPES.includes(tractorType)) {
      return errorResponse(res, `Tractor type must be one of: ${TRACTOR_TYPES.join(', ')}.`, 400);
    }

    const filter = { tractorType };
    filter.dealerId = req.user.role === 'ADMIN' ? req.body.dealerId : req.user._id;
    if (!filter.dealerId || !mongoose.isValidObjectId(filter.dealerId)) {
      return errorResponse(res, 'A valid dealerId is required.', 400);
    }

    const dealerTractorRate = await DealerTractorRate.findOne(filter);
    if (!dealerTractorRate) {
      return errorResponse(res, 'No rate configured for this Patiya type yet.', 404);
    }

    dealerTractorRate.isActive = !dealerTractorRate.isActive;
    await dealerTractorRate.save();

    logDealerActivity({
      dealerId: filter.dealerId,
      category: 'TRACTOR',
      action: 'Changed tractor rate status',
      description: `${tractorType} rate ${dealerTractorRate.isActive ? 'enabled' : 'disabled'}.`,
      actor: req.user
    });

    return successResponse(
      res,
      `Tractor rate ${dealerTractorRate.isActive ? 'enabled' : 'disabled'}.`,
      { rate: dealerTractorRate }
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getMyRates, setRate, toggleRate };

const mongoose = require('mongoose');
const DealerTractorRate = require('../models/DealerTractorRate');
const Location = require('../models/Location');
const Product = require('../models/Product');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logDealerActivity } = require('../utils/dealerActivityLogger');
const { escapeRegex } = require('../utils/escapeRegex');

const { TRACTOR_TYPES, MATERIALS } = DealerTractorRate;

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

    const rates = await DealerTractorRate.find(filter).sort({ material: 1, variantName: 1, tractorType: 1 });
    return successResponse(res, 'Tractor rates retrieved successfully.', { rates });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Create or update the dealer's own rate for one or more Material + Location/Grain +
//          Patiya type combinations in a single save.
// @route   POST /api/dealer-tractor-rates
// @access  Private (Dealer)
const bulkSaveRates = async (req, res) => {
  try {
    const { rates } = req.body;
    if (!Array.isArray(rates) || rates.length === 0) {
      return errorResponse(res, 'At least one rate is required.', 400);
    }

    // Validate every row before writing anything, so a partial/incomplete save never happens.
    const seen = new Set();
    const cleaned = [];
    for (const row of rates) {
      const material = row?.material;
      const variantName = String(row?.variantName || '').trim();
      const tractorType = row?.tractorType;
      const rate = Number(row?.ratePerTractor);

      if (!MATERIALS.includes(material)) {
        return errorResponse(res, `Invalid material "${material}". Must be Sand or Aggregate.`, 400);
      }
      if (!variantName) {
        return errorResponse(res, 'Location/grain is required for every rate row.', 400);
      }
      if (!TRACTOR_TYPES.includes(tractorType)) {
        return errorResponse(res, `Tractor type must be one of: ${TRACTOR_TYPES.join(', ')}.`, 400);
      }
      if (Number.isNaN(rate) || rate <= 0) {
        return errorResponse(res, `Rate for ${material} → ${variantName} (${tractorType}) must be a valid positive number.`, 400);
      }

      const dedupeKey = `${material}::${variantName.toLowerCase()}::${tractorType}`;
      if (seen.has(dedupeKey)) {
        return errorResponse(res, `Duplicate rate for ${material} → ${variantName} (${tractorType}).`, 400);
      }
      seen.add(dedupeKey);

      if (material === 'Sand') {
        const locationExists = await Location.exists({
          name: { $regex: `^${escapeRegex(variantName)}$`, $options: 'i' },
          category: 'Sand',
          isActive: true
        });
        if (!locationExists) {
          return errorResponse(res, `"${variantName}" is not a valid active Sand sourcing location.`, 400);
        }
      } else {
        const matchingProduct = await Product.exists({
          category: 'Aggregate',
          $or: [
            { tractorAggregateTypes: { $regex: `^${escapeRegex(variantName)}$`, $options: 'i' } },
            { aggregateTypes: { $regex: `^${escapeRegex(variantName)}$`, $options: 'i' } }
          ]
        });
        if (!matchingProduct) {
          return errorResponse(res, `"${variantName}" is not a valid active Aggregate grain.`, 400);
        }
      }

      cleaned.push({ material, variantName, tractorType, ratePerTractor: rate });
    }

    const saved = await Promise.all(
      cleaned.map((row) =>
        DealerTractorRate.findOneAndUpdate(
          { dealerId: req.user._id, material: row.material, variantName: row.variantName, tractorType: row.tractorType },
          { $set: { ratePerTractor: row.ratePerTractor, isActive: true } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    logDealerActivity({
      dealerId: req.user._id,
      category: 'TRACTOR',
      action: 'Saved tractor rates',
      description: `Saved rate for: ${cleaned.map((c) => `${c.material} → ${c.variantName} (${c.tractorType}, ₹${c.ratePerTractor})`).join(', ')}.`,
      actor: req.user
    });

    return successResponse(res, 'Tractor rates saved successfully.', { rates: saved });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const findAuthorizedRate = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return { error: ['Rate not found.', 404] };
  const rate = await DealerTractorRate.findById(req.params.id);
  if (!rate) return { error: ['Rate not found.', 404] };
  if (req.user.role === 'DEALER' && rate.dealerId.toString() !== req.user._id.toString()) {
    return { error: ['Unauthorized. This rate belongs to another dealer.', 403] };
  }
  return { rate };
};

// @desc    Enable / disable one of the dealer's own tractor rates
// @route   PATCH /api/dealer-tractor-rates/:id/toggle
// @access  Private (Dealer, Admin)
const toggleRate = async (req, res) => {
  try {
    const { rate, error } = await findAuthorizedRate(req);
    if (error) return errorResponse(res, error[0], error[1]);

    rate.isActive = !rate.isActive;
    await rate.save();

    logDealerActivity({
      dealerId: rate.dealerId,
      category: 'TRACTOR',
      action: 'Changed tractor rate status',
      description: `${rate.material} → ${rate.variantName} (${rate.tractorType}) rate ${rate.isActive ? 'enabled' : 'disabled'}.`,
      actor: req.user
    });

    return successResponse(res, `Rate ${rate.isActive ? 'enabled' : 'disabled'}.`, { rate });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete one of the dealer's own tractor rates
// @route   DELETE /api/dealer-tractor-rates/:id
// @access  Private (Dealer, Admin)
const deleteRate = async (req, res) => {
  try {
    const { rate, error } = await findAuthorizedRate(req);
    if (error) return errorResponse(res, error[0], error[1]);

    logDealerActivity({
      dealerId: rate.dealerId,
      category: 'TRACTOR',
      action: 'Removed tractor rate',
      description: `Deleted rate for ${rate.material} → ${rate.variantName} (${rate.tractorType}).`,
      actor: req.user
    });

    await rate.deleteOne();
    return successResponse(res, 'Tractor rate deleted successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getMyRates, bulkSaveRates, toggleRate, deleteRate };

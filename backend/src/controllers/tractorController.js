const mongoose = require('mongoose');
const Tractor = require('../models/Tractor');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logDealerActivity } = require('../utils/dealerActivityLogger');

const { TRACTOR_TYPES } = Tractor;

// Dealers only ever see / touch their own tractors; admins can act on any dealer's.
const scopeFilter = (req) => {
  if (req.user.role === 'DEALER') return { dealerId: req.user._id };
  return {};
};

const findAuthorizedTractor = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return { error: ['Tractor not found.', 404] };
  const tractor = await Tractor.findById(req.params.id);
  if (!tractor) return { error: ['Tractor not found.', 404] };
  if (req.user.role === 'DEALER' && tractor.dealerId.toString() !== req.user._id.toString()) {
    return { error: ['Unauthorized. This tractor belongs to another dealer.', 403] };
  }
  return { tractor };
};

const parseTractorType = (value) => (TRACTOR_TYPES.includes(value) ? value : null);

const normalizePlate = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

// @desc    List tractors (dealer: own only; admin: all, optionally ?dealerId=&status=&tractorType=)
// @route   GET /api/tractors
const getTractors = async (req, res) => {
  try {
    const filter = scopeFilter(req);
    if (req.user.role === 'ADMIN' && req.query.dealerId) {
      if (!mongoose.isValidObjectId(req.query.dealerId)) return errorResponse(res, 'Invalid dealerId.', 400);
      filter.dealerId = req.query.dealerId;
    }
    if (req.query.status && ['AVAILABLE', 'IN_ORDER', 'DISABLED'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.tractorType && parseTractorType(req.query.tractorType)) {
      filter.tractorType = parseTractorType(req.query.tractorType);
    }

    const tractors = await Tractor.find(filter).sort({ tractorType: 1, createdAt: -1 });
    return successResponse(res, 'Tractors retrieved successfully.', { tractors });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Register a tractor (dealer: for self; admin: body.dealerId required)
// @route   POST /api/tractors
const createTractor = async (req, res) => {
  try {
    const { tractorType, numberPlate } = req.body;

    let dealerId = req.user._id;
    if (req.user.role === 'ADMIN') {
      if (!mongoose.isValidObjectId(req.body.dealerId)) return errorResponse(res, 'A valid dealerId is required.', 400);
      const dealer = await User.findOne({ _id: req.body.dealerId, role: 'DEALER', isDeleted: { $ne: true } });
      if (!dealer) return errorResponse(res, 'Dealer not found.', 404);
      dealerId = dealer._id;
    }

    const type = parseTractorType(tractorType);
    if (!type) return errorResponse(res, `Tractor type must be one of: ${TRACTOR_TYPES.join(', ')}.`, 400);
    const plate = normalizePlate(numberPlate);
    if (!plate) return errorResponse(res, 'Number plate is required.', 400);

    if (await Tractor.exists({ numberPlate: plate })) {
      return errorResponse(res, `A tractor with number plate ${plate} is already registered.`, 409);
    }

    const tractor = await Tractor.create({ dealerId, tractorType: type, numberPlate: plate });

    logDealerActivity({
      dealerId,
      category: 'TRACTOR',
      action: 'Added tractor',
      description: `Registered a ${type} tractor ${plate}.`,
      actor: req.user
    });

    return successResponse(res, 'Tractor registered successfully.', { tractor }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Edit a tractor's type / plate
// @route   PUT /api/tractors/:id
const updateTractor = async (req, res) => {
  try {
    const { tractor, error } = await findAuthorizedTractor(req);
    if (error) return errorResponse(res, error[0], error[1]);

    const { tractorType, numberPlate } = req.body;

    if (tractorType !== undefined) {
      const type = parseTractorType(tractorType);
      if (!type) return errorResponse(res, `Tractor type must be one of: ${TRACTOR_TYPES.join(', ')}.`, 400);
      if (type !== tractor.tractorType && tractor.status === 'IN_ORDER') {
        return errorResponse(res, 'Cannot change tractor type while this tractor is assigned to an order.', 409);
      }
      tractor.tractorType = type;
    }
    if (numberPlate !== undefined) {
      const plate = normalizePlate(numberPlate);
      if (!plate) return errorResponse(res, 'Number plate is required.', 400);
      if (plate !== tractor.numberPlate && (await Tractor.exists({ numberPlate: plate, _id: { $ne: tractor._id } }))) {
        return errorResponse(res, `A tractor with number plate ${plate} is already registered.`, 409);
      }
      tractor.numberPlate = plate;
    }

    const changedFields = tractor.modifiedPaths();
    await tractor.save();

    if (changedFields.length > 0) {
      logDealerActivity({
        dealerId: tractor.dealerId,
        category: 'TRACTOR',
        action: 'Updated tractor',
        description: `Updated tractor ${tractor.numberPlate} — changed: ${changedFields.join(', ')}.`,
        actor: req.user
      });
    }

    return successResponse(res, 'Tractor updated successfully.', { tractor });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete a tractor (not while it is on an order)
// @route   DELETE /api/tractors/:id
const deleteTractor = async (req, res) => {
  try {
    const { tractor, error } = await findAuthorizedTractor(req);
    if (error) return errorResponse(res, error[0], error[1]);
    if (tractor.status === 'IN_ORDER') {
      return errorResponse(res, 'This tractor is assigned to an active order and cannot be deleted right now.', 409);
    }

    logDealerActivity({
      dealerId: tractor.dealerId,
      category: 'TRACTOR',
      action: 'Removed tractor',
      description: `Deleted tractor ${tractor.numberPlate} (${tractor.tractorType}).`,
      actor: req.user
    });

    await tractor.deleteOne();
    return successResponse(res, 'Tractor deleted successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Enable / disable a tractor (Available <-> Disabled; never while In Order)
// @route   PATCH /api/tractors/:id/toggle
const toggleTractor = async (req, res) => {
  try {
    const { tractor, error } = await findAuthorizedTractor(req);
    if (error) return errorResponse(res, error[0], error[1]);
    if (tractor.status === 'IN_ORDER') {
      return errorResponse(res, 'This tractor is assigned to an active order. It can be disabled once that order is completed.', 409);
    }
    tractor.status = tractor.status === 'DISABLED' ? 'AVAILABLE' : 'DISABLED';
    await tractor.save();

    logDealerActivity({
      dealerId: tractor.dealerId,
      category: 'TRACTOR',
      action: 'Changed tractor status',
      description: `Tractor ${tractor.numberPlate} ${tractor.status === 'DISABLED' ? 'disabled' : 'enabled'}.`,
      actor: req.user
    });

    return successResponse(res, `Tractor ${tractor.status === 'DISABLED' ? 'disabled' : 'enabled'}.`, { tractor });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getTractors, createTractor, updateTractor, deleteTractor, toggleTractor };

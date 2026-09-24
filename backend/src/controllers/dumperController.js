const mongoose = require('mongoose');
const Dumper = require('../models/Dumper');
const User = require('../models/User');
const { buildSummary } = require('../utils/dumperAvailability');
const { successResponse, errorResponse } = require('../utils/responseHelper');

const { WHEEL_TYPES } = Dumper;

// Dealers only ever see / touch their own dumpers; admins can act on any dealer's.
const scopeFilter = (req) => {
  if (req.user.role === 'DEALER') return { dealerId: req.user._id };
  return {};
};

const findAuthorizedDumper = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return { error: ['Dumper not found.', 404] };
  const dumper = await Dumper.findById(req.params.id);
  if (!dumper) return { error: ['Dumper not found.', 404] };
  if (req.user.role === 'DEALER' && dumper.dealerId.toString() !== req.user._id.toString()) {
    return { error: ['Unauthorized. This dumper belongs to another dealer.', 403] };
  }
  return { dumper };
};

const parseWheel = (value) => {
  const wheel = Number(value);
  return WHEEL_TYPES.includes(wheel) ? wheel : null;
};

const parseCapacity = (value) => {
  const cap = Number(value);
  return Number.isFinite(cap) && cap > 0 ? cap : null;
};

const normalizePlate = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();

// @desc    List dumpers (dealer: own only; admin: all, optionally ?dealerId=&status=&wheelType=)
// @route   GET /api/dumpers
const getDumpers = async (req, res) => {
  try {
    const filter = scopeFilter(req);
    if (req.user.role === 'ADMIN' && req.query.dealerId) {
      if (!mongoose.isValidObjectId(req.query.dealerId)) return errorResponse(res, 'Invalid dealerId.', 400);
      filter.dealerId = req.query.dealerId;
    }
    if (req.query.status && ['AVAILABLE', 'IN_ORDER', 'DISABLED'].includes(req.query.status)) {
      filter.status = req.query.status;
    }
    if (req.query.wheelType && parseWheel(req.query.wheelType)) {
      filter.wheelType = parseWheel(req.query.wheelType);
    }

    const dumpers = await Dumper.find(filter).sort({ wheelType: 1, createdAt: -1 });
    return successResponse(res, 'Dumpers retrieved successfully.', { dumpers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Register a dumper (dealer: for self; admin: body.dealerId required)
// @route   POST /api/dumpers
const createDumper = async (req, res) => {
  try {
    const { wheelType, numberPlate, capacity } = req.body;

    let dealerId = req.user._id;
    if (req.user.role === 'ADMIN') {
      if (!mongoose.isValidObjectId(req.body.dealerId)) return errorResponse(res, 'A valid dealerId is required.', 400);
      const dealer = await User.findOne({ _id: req.body.dealerId, role: 'DEALER', isDeleted: { $ne: true } });
      if (!dealer) return errorResponse(res, 'Dealer not found.', 404);
      dealerId = dealer._id;
    }

    const wheel = parseWheel(wheelType);
    if (!wheel) return errorResponse(res, `Wheel type must be one of: ${WHEEL_TYPES.join(', ')}.`, 400);
    const plate = normalizePlate(numberPlate);
    if (!plate) return errorResponse(res, 'Number plate is required.', 400);
    const cap = parseCapacity(capacity);
    if (!cap) return errorResponse(res, 'Capacity (Ton) must be a number greater than 0.', 400);

    if (await Dumper.exists({ numberPlate: plate })) {
      return errorResponse(res, `A dumper with number plate ${plate} is already registered.`, 409);
    }

    const dumper = await Dumper.create({ dealerId, wheelType: wheel, numberPlate: plate, capacity: cap });
    return successResponse(res, 'Dumper registered successfully.', { dumper }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Edit a dumper's wheel type / plate / capacity
// @route   PUT /api/dumpers/:id
const updateDumper = async (req, res) => {
  try {
    const { dumper, error } = await findAuthorizedDumper(req);
    if (error) return errorResponse(res, error[0], error[1]);

    const { wheelType, numberPlate, capacity } = req.body;

    if (wheelType !== undefined) {
      const wheel = parseWheel(wheelType);
      if (!wheel) return errorResponse(res, `Wheel type must be one of: ${WHEEL_TYPES.join(', ')}.`, 400);
      if (wheel !== dumper.wheelType && dumper.status === 'IN_ORDER') {
        return errorResponse(res, 'Cannot change wheel type while this dumper is assigned to an order.', 409);
      }
      dumper.wheelType = wheel;
    }
    if (numberPlate !== undefined) {
      const plate = normalizePlate(numberPlate);
      if (!plate) return errorResponse(res, 'Number plate is required.', 400);
      if (plate !== dumper.numberPlate && (await Dumper.exists({ numberPlate: plate, _id: { $ne: dumper._id } }))) {
        return errorResponse(res, `A dumper with number plate ${plate} is already registered.`, 409);
      }
      dumper.numberPlate = plate;
    }
    if (capacity !== undefined) {
      const cap = parseCapacity(capacity);
      if (!cap) return errorResponse(res, 'Capacity (Ton) must be a number greater than 0.', 400);
      dumper.capacity = cap;
    }

    await dumper.save();
    return successResponse(res, 'Dumper updated successfully.', { dumper });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete a dumper (not while it is on an order)
// @route   DELETE /api/dumpers/:id
const deleteDumper = async (req, res) => {
  try {
    const { dumper, error } = await findAuthorizedDumper(req);
    if (error) return errorResponse(res, error[0], error[1]);
    if (dumper.status === 'IN_ORDER') {
      return errorResponse(res, 'This dumper is assigned to an active order and cannot be deleted right now.', 409);
    }
    await dumper.deleteOne();
    return successResponse(res, 'Dumper deleted successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Enable / disable a dumper (Available <-> Disabled; never while In Order)
// @route   PATCH /api/dumpers/:id/toggle
const toggleDumper = async (req, res) => {
  try {
    const { dumper, error } = await findAuthorizedDumper(req);
    if (error) return errorResponse(res, error[0], error[1]);
    if (dumper.status === 'IN_ORDER') {
      return errorResponse(res, 'This dumper is assigned to an active order. It can be disabled once that order is completed.', 409);
    }
    dumper.status = dumper.status === 'DISABLED' ? 'AVAILABLE' : 'DISABLED';
    await dumper.save();
    return successResponse(res, `Dumper ${dumper.status === 'DISABLED' ? 'disabled' : 'enabled'}.`, { dumper });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: dealer-wise dumper counts (total / available / in order / disabled, wheel-wise)
// @route   GET /api/dumpers/admin/summary
const getDealerDumperSummaries = async (req, res) => {
  try {
    const rows = await Dumper.aggregate([
      { $group: { _id: { dealerId: '$dealerId', wheelType: '$wheelType', status: '$status' }, count: { $sum: 1 } } }
    ]);
    const byDealer = {};
    rows.forEach((r) => {
      const key = r._id.dealerId.toString();
      (byDealer[key] = byDealer[key] || []).push({ wheelType: r._id.wheelType, status: r._id.status, count: r.count });
    });
    const summaries = {};
    Object.keys(byDealer).forEach((key) => {
      summaries[key] = buildSummary(byDealer[key]);
    });
    return successResponse(res, 'Dumper summaries retrieved.', { summaries });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { getDumpers, createDumper, updateDumper, deleteDumper, toggleDumper, getDealerDumperSummaries };

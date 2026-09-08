const Location = require('../models/Location');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Get active locations for customer ordering (Filtered strictly by vehicleType and optional category)
// @route   GET /api/locations
// @access  Public / Customer
const getPublicLocations = async (req, res) => {
  try {
    const { vehicleType, category } = req.query;
    const filter = { isActive: true };

    if (vehicleType) {
      const normalized = vehicleType.toUpperCase();
      if (!['DUMPER', 'TRACTOR'].includes(normalized)) {
        return errorResponse(res, 'Invalid vehicleType. Must be DUMPER or TRACTOR.', 400);
      }
      filter.vehicleType = normalized;
    }

    if (category) {
      filter.$or = [
        { category: category },
        { category: 'ALL' },
        { category: { $exists: false } }
      ];
    }

    const locations = await Location.find(filter).sort({ displayOrder: 1, name: 1 });
    return successResponse(res, 'Active locations retrieved successfully.', { locations });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get all locations for Admin management (Filtered by vehicleType and category)
// @route   GET /api/locations/admin
// @access  Private (Admin)
const getAdminLocations = async (req, res) => {
  try {
    const { search, status, vehicleType, category } = req.query;
    const filter = {};

    if (vehicleType) {
      const normalized = vehicleType.toUpperCase();
      if (!['DUMPER', 'TRACTOR'].includes(normalized)) {
        return errorResponse(res, 'Invalid vehicleType. Must be DUMPER or TRACTOR.', 400);
      }
      filter.vehicleType = normalized;
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const locations = await Location.find(filter).sort({ vehicleType: 1, displayOrder: 1, createdAt: -1 });
    return successResponse(res, 'Admin locations retrieved successfully.', { locations });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Create new location for specific vehicleType and category
// @route   POST /api/locations/admin
// @desc    Create new location for specific vehicleType and category
// @route   POST /api/locations/admin
// @access  Private (Admin)
const createLocation = async (req, res) => {
  try {
    const { name, vehicleType, category, state, description, displayOrder, singlePatiyaPrice, doublePatiyaPrice } = req.body;
    if (!name || !name.trim()) {
      return errorResponse(res, 'Location name is required.', 400);
    }

    const normalizedVehicleType = (vehicleType || 'DUMPER').toUpperCase();
    if (!['DUMPER', 'TRACTOR'].includes(normalizedVehicleType)) {
      return errorResponse(res, 'Valid vehicleType (DUMPER or TRACTOR) is required.', 400);
    }

    const categoryVal = category || 'ALL';

    const existing = await Location.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      vehicleType: normalizedVehicleType,
      category: categoryVal
    });

    if (existing) {
      return errorResponse(
        res,
        `Location "${name.trim()}" already exists for ${normalizedVehicleType} under category ${categoryVal}.`,
        409
      );
    }

    const location = await Location.create({
      name: name.trim(),
      vehicleType: normalizedVehicleType,
      category: categoryVal,
      state: state ? state.trim() : 'Gujarat',
      description: description ? description.trim() : '',
      displayOrder: Number(displayOrder) || 0,
      singlePatiyaPrice: singlePatiyaPrice !== undefined && singlePatiyaPrice !== null && singlePatiyaPrice !== '' ? Number(singlePatiyaPrice) : 2350,
      doublePatiyaPrice: doublePatiyaPrice !== undefined && doublePatiyaPrice !== null && doublePatiyaPrice !== '' ? Number(doublePatiyaPrice) : 4500,
      isActive: true
    });

    return successResponse(res, `${normalizedVehicleType} location added successfully.`, { location }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update location with vehicleType verification
// @route   PUT /api/locations/admin/:id
// @access  Private (Admin)
const updateLocation = async (req, res) => {
  try {
    const { name, vehicleType, category, state, description, displayOrder, singlePatiyaPrice, doublePatiyaPrice, isActive } = req.body;
    const location = await Location.findById(req.params.id);

    if (!location) {
      return errorResponse(res, 'Location not found.', 404);
    }

    // Cross-vehicle modification protection
    if (vehicleType && location.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot modify ${location.vehicleType} location via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    if (name && name.trim()) {
      const duplicate = await Location.findOne({
        _id: { $ne: location._id },
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        vehicleType: location.vehicleType,
        category: category || location.category
      });
      if (duplicate) {
        return errorResponse(
          res,
          `Another location named "${name.trim()}" already exists for ${location.vehicleType}.`,
          409
        );
      }
      location.name = name.trim();
    }

    if (category !== undefined) location.category = category;
    if (state !== undefined) location.state = state.trim();
    if (description !== undefined) location.description = description.trim();
    if (displayOrder !== undefined) location.displayOrder = Number(displayOrder) || 0;
    if (singlePatiyaPrice !== undefined && singlePatiyaPrice !== null && singlePatiyaPrice !== '') {
      location.singlePatiyaPrice = Number(singlePatiyaPrice) || 0;
    }
    if (doublePatiyaPrice !== undefined && doublePatiyaPrice !== null && doublePatiyaPrice !== '') {
      location.doublePatiyaPrice = Number(doublePatiyaPrice) || 0;
    }
    if (isActive !== undefined) location.isActive = Boolean(isActive);

    await location.save();
    return successResponse(res, 'Location updated successfully.', { location });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Toggle location active status with vehicleType verification
// @route   PATCH /api/locations/admin/:id/toggle
// @access  Private (Admin)
const toggleLocation = async (req, res) => {
  try {
    const { vehicleType } = req.body;
    const location = await Location.findById(req.params.id);
    if (!location) {
      return errorResponse(res, 'Location not found.', 404);
    }

    if (vehicleType && location.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot toggle ${location.vehicleType} location via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    location.isActive = !location.isActive;
    await location.save();

    return successResponse(
      res,
      `Location "${location.name}" for ${location.vehicleType} is now ${location.isActive ? 'Active' : 'Disabled'}.`,
      { location }
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Soft-delete / Deactivate location with vehicleType verification
// @route   DELETE /api/locations/admin/:id
// @access  Private (Admin)
const deleteLocation = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const location = await Location.findById(req.params.id);
    if (!location) {
      return errorResponse(res, 'Location not found.', 404);
    }

    if (vehicleType && location.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot delete ${location.vehicleType} location via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    location.isActive = false;
    await location.save();

    return successResponse(res, `Location "${location.name}" has been disabled.`, { location });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getPublicLocations,
  getAdminLocations,
  createLocation,
  updateLocation,
  toggleLocation,
  deleteLocation
};

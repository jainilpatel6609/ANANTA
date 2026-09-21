const Location = require('../models/Location');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Parses & validates an optional lat/lng pair. Returns { latitude, longitude } (numbers
// or null if omitted/blank), or throws a plain Error with a customer-facing message.
const parseCoordinates = (latitude, longitude) => {
  const latProvided = latitude !== undefined && latitude !== null && latitude !== '';
  const lngProvided = longitude !== undefined && longitude !== null && longitude !== '';

  if (!latProvided && !lngProvided) {
    return { latitude: null, longitude: null };
  }
  if (latProvided !== lngProvided) {
    throw new Error('Both Latitude and Longitude are required together.');
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('Latitude must be a valid number between -90 and 90.');
  }
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('Longitude must be a valid number between -180 and 180.');
  }
  return { latitude: lat, longitude: lng };
};

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
// @access  Private (Admin)
const createLocation = async (req, res) => {
  try {
    const {
      name,
      vehicleType,
      category,
      state,
      description,
      displayOrder,
      latitude,
      longitude,
      singlePatiyaPrice,
      doublePatiyaPrice,
      dumperWheelConfigs,
      wheel10PricePerTon,
      wheel10ApproxTon,
      wheel12PricePerTon,
      wheel12ApproxTon,
      wheel16PricePerTon,
      wheel16ApproxTon,
      wheel18PricePerTon,
      wheel18ApproxTon
    } = req.body;
    if (!name || !name.trim()) {
      return errorResponse(res, 'Location name is required.', 400);
    }

    let coords;
    try {
      coords = parseCoordinates(latitude, longitude);
    } catch (err) {
      return errorResponse(res, err.message, 400);
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

    // Prepare default or customized wheel tiers for Dumper
    const defaultWheelConfigs = [
      { wheelCount: 10, approximateTon: 25, pricePerTon: 800, isActive: true },
      { wheelCount: 12, approximateTon: 35, pricePerTon: 800, isActive: true },
      { wheelCount: 16, approximateTon: 45, pricePerTon: 800, isActive: true },
      { wheelCount: 18, approximateTon: 50, pricePerTon: 800, isActive: true }
    ];

    const finalDumperWheelConfigs = Array.isArray(dumperWheelConfigs) && dumperWheelConfigs.length > 0
      ? dumperWheelConfigs.map((cfg) => ({
          wheelCount: Number(cfg.wheelCount) || 10,
          approximateTon: Number(cfg.approximateTon) || 25,
          pricePerTon: Number(cfg.pricePerTon) || 800,
          flatPrice: cfg.flatPrice !== undefined && cfg.flatPrice !== null && cfg.flatPrice !== '' ? Number(cfg.flatPrice) : null,
          isActive: cfg.isActive !== false
        }))
      : (normalizedVehicleType === 'DUMPER' ? defaultWheelConfigs : []);

    const location = await Location.create({
      name: name.trim(),
      vehicleType: normalizedVehicleType,
      category: categoryVal,
      state: state ? state.trim() : 'Gujarat',
      description: description ? description.trim() : '',
      displayOrder: Number(displayOrder) || 0,
      latitude: coords.latitude,
      longitude: coords.longitude,
      singlePatiyaPrice: singlePatiyaPrice !== undefined && singlePatiyaPrice !== null && singlePatiyaPrice !== '' ? Number(singlePatiyaPrice) : 2350,
      doublePatiyaPrice: doublePatiyaPrice !== undefined && doublePatiyaPrice !== null && doublePatiyaPrice !== '' ? Number(doublePatiyaPrice) : 4500,
      dumperWheelConfigs: finalDumperWheelConfigs,
      wheel10PricePerTon: wheel10PricePerTon !== undefined ? Number(wheel10PricePerTon) : 800,
      wheel10ApproxTon: wheel10ApproxTon !== undefined ? Number(wheel10ApproxTon) : 25,
      wheel12PricePerTon: wheel12PricePerTon !== undefined ? Number(wheel12PricePerTon) : 800,
      wheel12ApproxTon: wheel12ApproxTon !== undefined ? Number(wheel12ApproxTon) : 35,
      wheel16PricePerTon: wheel16PricePerTon !== undefined ? Number(wheel16PricePerTon) : 800,
      wheel16ApproxTon: wheel16ApproxTon !== undefined ? Number(wheel16ApproxTon) : 45,
      wheel18PricePerTon: wheel18PricePerTon !== undefined ? Number(wheel18PricePerTon) : 800,
      wheel18ApproxTon: wheel18ApproxTon !== undefined ? Number(wheel18ApproxTon) : 50,
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
    const {
      name,
      vehicleType,
      category,
      state,
      description,
      displayOrder,
      latitude,
      longitude,
      singlePatiyaPrice,
      doublePatiyaPrice,
      dumperWheelConfigs,
      wheel10PricePerTon,
      wheel10ApproxTon,
      wheel12PricePerTon,
      wheel12ApproxTon,
      wheel16PricePerTon,
      wheel16ApproxTon,
      wheel18PricePerTon,
      wheel18ApproxTon,
      isActive
    } = req.body;
    const location = await Location.findById(req.params.id);

    if (!location) {
      return errorResponse(res, 'Location not found.', 404);
    }

    let coords;
    try {
      coords = parseCoordinates(latitude, longitude);
    } catch (err) {
      return errorResponse(res, err.message, 400);
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
    if (latitude !== undefined) location.latitude = coords.latitude;
    if (longitude !== undefined) location.longitude = coords.longitude;
    if (singlePatiyaPrice !== undefined && singlePatiyaPrice !== null && singlePatiyaPrice !== '') {
      location.singlePatiyaPrice = Number(singlePatiyaPrice) || 0;
    }
    if (doublePatiyaPrice !== undefined && doublePatiyaPrice !== null && doublePatiyaPrice !== '') {
      location.doublePatiyaPrice = Number(doublePatiyaPrice) || 0;
    }
    if (dumperWheelConfigs !== undefined && Array.isArray(dumperWheelConfigs)) {
      location.dumperWheelConfigs = dumperWheelConfigs.map((cfg) => ({
        wheelCount: Number(cfg.wheelCount) || 10,
        approximateTon: Number(cfg.approximateTon) || 25,
        pricePerTon: Number(cfg.pricePerTon) || 800,
        flatPrice: cfg.flatPrice !== undefined && cfg.flatPrice !== null && cfg.flatPrice !== '' ? Number(cfg.flatPrice) : null,
        isActive: cfg.isActive !== false
      }));
    }
    if (wheel10PricePerTon !== undefined) location.wheel10PricePerTon = Number(wheel10PricePerTon);
    if (wheel10ApproxTon !== undefined) location.wheel10ApproxTon = Number(wheel10ApproxTon);
    if (wheel12PricePerTon !== undefined) location.wheel12PricePerTon = Number(wheel12PricePerTon);
    if (wheel12ApproxTon !== undefined) location.wheel12ApproxTon = Number(wheel12ApproxTon);
    if (wheel16PricePerTon !== undefined) location.wheel16PricePerTon = Number(wheel16PricePerTon);
    if (wheel16ApproxTon !== undefined) location.wheel16ApproxTon = Number(wheel16ApproxTon);
    if (wheel18PricePerTon !== undefined) location.wheel18PricePerTon = Number(wheel18PricePerTon);
    if (wheel18ApproxTon !== undefined) location.wheel18ApproxTon = Number(wheel18ApproxTon);
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

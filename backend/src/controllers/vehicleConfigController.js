const VehicleConfig = require('../models/VehicleConfig');
const VehicleSetting = require('../models/VehicleSetting');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Get active vehicle configurations and capacities for customer wizard (Filtered strictly by vehicleType)
// @route   GET /api/vehicle-configs
// @access  Public / Customer
const getPublicVehicleConfigs = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const settings = await VehicleSetting.getSettings();
    const filter = { isActive: true };

    if (vehicleType) {
      const normalized = vehicleType.toUpperCase();
      if (!['DUMPER', 'TRACTOR'].includes(normalized)) {
        return errorResponse(res, 'Invalid vehicleType. Must be DUMPER or TRACTOR.', 400);
      }
      filter.vehicleType = normalized;
    }

    const configs = await VehicleConfig.find(filter).sort({ displayOrder: 1, wheelCount: 1, approximateTon: 1 });

    // Filter by active vehicle type visibility
    const visibleConfigs = configs.filter((c) => {
      if (c.vehicleType === 'DUMPER' && !settings.dumperEnabled) return false;
      if (c.vehicleType === 'TRACTOR' && !settings.tractorEnabled) return false;
      return true;
    });

    return successResponse(res, 'Vehicle configurations retrieved successfully.', {
      settings: {
        dumperEnabled: settings.dumperEnabled,
        tractorEnabled: settings.tractorEnabled
      },
      configs: visibleConfigs
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get vehicle visibility settings
// @route   GET /api/vehicle-configs/settings
// @access  Public / Customer
const getVehicleSettings = async (req, res) => {
  try {
    const settings = await VehicleSetting.getSettings();
    return successResponse(res, 'Vehicle settings retrieved.', { settings });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get all vehicle configurations for Admin (Filtered by vehicleType)
// @route   GET /api/vehicle-configs/admin
// @access  Private (Admin)
const getAdminVehicleConfigs = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const filter = {};

    if (vehicleType) {
      const normalized = vehicleType.toUpperCase();
      if (!['DUMPER', 'TRACTOR'].includes(normalized)) {
        return errorResponse(res, 'Invalid vehicleType. Must be DUMPER or TRACTOR.', 400);
      }
      filter.vehicleType = normalized;
    }

    const [settings, configs] = await Promise.all([
      VehicleSetting.getSettings(),
      VehicleConfig.find(filter).sort({ vehicleType: 1, displayOrder: 1, createdAt: -1 })
    ]);

    return successResponse(res, 'Admin vehicle configurations retrieved.', {
      settings,
      configs
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Create a new vehicle configuration with strict vehicleType assignment
// @route   POST /api/vehicle-configs/admin
// @access  Private (Admin)
const createVehicleConfig = async (req, res) => {
  try {
    const { vehicleType, optionName, wheelCount, approximateTon, basePricePerTon, flatPrice, displayOrder } = req.body;

    const normalizedVehicleType = (vehicleType || '').toUpperCase();
    if (!['DUMPER', 'TRACTOR'].includes(normalizedVehicleType)) {
      return errorResponse(res, 'Valid vehicle type (DUMPER or TRACTOR) is required.', 400);
    }

    if (!optionName || !optionName.trim()) {
      return errorResponse(res, 'Option name is required.', 400);
    }

    if (approximateTon === undefined || approximateTon === null || Number(approximateTon) <= 0) {
      return errorResponse(res, 'Valid approximate tonnage is required.', 400);
    }

    const config = await VehicleConfig.create({
      vehicleType: normalizedVehicleType,
      optionName: optionName.trim(),
      wheelCount: wheelCount ? Number(wheelCount) : null,
      approximateTon: Number(approximateTon),
      basePricePerTon: Number(basePricePerTon) || 0,
      flatPrice: flatPrice ? Number(flatPrice) : null,
      displayOrder: Number(displayOrder) || 0,
      isActive: true
    });

    return successResponse(res, `${normalizedVehicleType} configuration created successfully.`, { config }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update vehicle configuration with cross-vehicle protection
// @route   PUT /api/vehicle-configs/admin/:id
// @access  Private (Admin)
const updateVehicleConfig = async (req, res) => {
  try {
    const { vehicleType, optionName, wheelCount, approximateTon, basePricePerTon, flatPrice, displayOrder, isActive } = req.body;
    const config = await VehicleConfig.findById(req.params.id);

    if (!config) {
      return errorResponse(res, 'Vehicle configuration not found.', 404);
    }

    // Cross-vehicle mutation protection
    if (vehicleType && config.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot modify ${config.vehicleType} configuration via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    if (optionName && optionName.trim()) config.optionName = optionName.trim();
    if (wheelCount !== undefined) config.wheelCount = wheelCount ? Number(wheelCount) : null;
    if (approximateTon !== undefined) config.approximateTon = Number(approximateTon);
    if (basePricePerTon !== undefined) config.basePricePerTon = Number(basePricePerTon) || 0;
    if (flatPrice !== undefined) config.flatPrice = flatPrice ? Number(flatPrice) : null;
    if (displayOrder !== undefined) config.displayOrder = Number(displayOrder) || 0;
    if (isActive !== undefined) config.isActive = Boolean(isActive);

    await config.save();
    return successResponse(res, `${config.vehicleType} configuration updated successfully.`, { config });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Toggle vehicle configuration active status with cross-vehicle protection
// @route   PATCH /api/vehicle-configs/admin/:id/toggle
// @access  Private (Admin)
const toggleVehicleConfig = async (req, res) => {
  try {
    const { vehicleType } = req.body;
    const config = await VehicleConfig.findById(req.params.id);
    if (!config) {
      return errorResponse(res, 'Vehicle configuration not found.', 404);
    }

    // Cross-vehicle mutation protection
    if (vehicleType && config.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot toggle ${config.vehicleType} configuration via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    config.isActive = !config.isActive;
    await config.save();

    return successResponse(
      res,
      `${config.vehicleType} option "${config.optionName}" is now ${config.isActive ? 'Active' : 'Disabled'}.`,
      { config }
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update vehicle visibility settings (Dumper ON/OFF, Tractor ON/OFF)
// @route   PATCH /api/vehicle-configs/admin/settings
// @access  Private (Admin)
const updateVehicleSettings = async (req, res) => {
  try {
    const { dumperEnabled, tractorEnabled } = req.body;
    const settings = await VehicleSetting.getSettings();

    if (dumperEnabled !== undefined) settings.dumperEnabled = Boolean(dumperEnabled);
    if (tractorEnabled !== undefined) settings.tractorEnabled = Boolean(tractorEnabled);

    await settings.save();

    return successResponse(res, 'Vehicle visibility settings updated successfully.', { settings });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete / Soft-deactivate vehicle configuration with cross-vehicle protection
// @route   DELETE /api/vehicle-configs/admin/:id
// @access  Private (Admin)
const deleteVehicleConfig = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const config = await VehicleConfig.findById(req.params.id);
    if (!config) {
      return errorResponse(res, 'Vehicle configuration not found.', 404);
    }

    if (vehicleType && config.vehicleType !== vehicleType.toUpperCase()) {
      return errorResponse(
        res,
        `Cannot delete ${config.vehicleType} configuration via a ${vehicleType.toUpperCase()} request.`,
        403
      );
    }

    config.isActive = false;
    await config.save();

    return successResponse(res, `${config.vehicleType} configuration disabled successfully.`, { config });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getPublicVehicleConfigs,
  getVehicleSettings,
  getAdminVehicleConfigs,
  createVehicleConfig,
  updateVehicleConfig,
  toggleVehicleConfig,
  updateVehicleSettings,
  deleteVehicleConfig
};

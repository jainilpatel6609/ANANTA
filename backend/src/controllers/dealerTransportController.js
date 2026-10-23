const DealerTransportConfig = require('../models/DealerTransportConfig');
const DealerTractorRate = require('../models/DealerTractorRate');
const Location = require('../models/Location');
const VehicleConfig = require('../models/VehicleConfig');
const Product = require('../models/Product');
const VehicleSetting = require('../models/VehicleSetting');
const PincodeService = require('../services/pincodeService');
const RoadDistanceService = require('../services/roadDistanceService');
const { generateDealerCode } = require('../utils/dealerCode');
const Dumper = require('../models/Dumper');
const { getDealerIdsWithAvailableDumper } = require('../utils/dumperAvailability');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { logDealerActivity } = require('../utils/dealerActivityLogger');

const MATERIALS = ['Sand', 'Aggregate'];

// @desc    Get active sourcing locations grouped by material, for the dealer's
//          Transport Configuration form. Reads from the existing Location collection
//          so admin-managed additions/removals are picked up automatically.
// @route   GET /api/dealer-transport/material-locations
// @access  Private (Dealer)
const getMaterialLocations = async (req, res) => {
  try {
    const filter = {
      isActive: true,
      category: { $in: MATERIALS }
    };
    // Optional: scope to only locations admin has enabled for this vehicleType (e.g. a Sand
    // location disabled under "Tractor Dispatch" but still active for Dumper shouldn't leak
    // into a Tractor-specific rate form).
    if (req.query.vehicleType && ['DUMPER', 'TRACTOR'].includes(req.query.vehicleType)) {
      filter.vehicleType = req.query.vehicleType;
    }

    const locations = await Location.find(filter).sort({ displayOrder: 1, name: 1 });

    const grouped = { Sand: [], Aggregate: [] };
    for (const loc of locations) {
      if (!grouped[loc.category].includes(loc.name)) {
        grouped[loc.category].push(loc.name);
      }
    }

    return successResponse(res, 'Material locations retrieved successfully.', { locations: grouped });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get the Dumper-specific "variant" options per material -- Sand's processing
//          specification (VehicleConfig.optionName, DUMPER-scoped: "Filter Sand", "Without
//          Filter", "Choliyu") and Aggregate's grain size (Product.dumperAggregateTypes /
//          aggregateTypes). Used by the dealer's Transport Configuration form so a Dumper rate
//          can vary by variant at the same Location, the same way Tractor rates already do.
// @route   GET /api/dealer-transport/dumper-variants
// @access  Private (Dealer, Admin)
const getDumperVariants = async (req, res) => {
  try {
    const sandConfigs = await VehicleConfig.find({ vehicleType: 'DUMPER', isActive: true }).sort({ displayOrder: 1, optionName: 1 });
    const sandVariants = [];
    for (const c of sandConfigs) {
      if (!sandVariants.includes(c.optionName)) sandVariants.push(c.optionName);
    }

    const aggregateProducts = await Product.find({ category: 'Aggregate', isActive: true });
    const aggregateVariants = [];
    for (const p of aggregateProducts) {
      const types = p.dumperAggregateTypes?.length ? p.dumperAggregateTypes : p.aggregateTypes || [];
      for (const t of types) {
        if (!aggregateVariants.includes(t)) aggregateVariants.push(t);
      }
    }

    return successResponse(res, 'Dumper variant options retrieved successfully.', {
      variants: { Sand: sandVariants, Aggregate: aggregateVariants }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get the logged-in dealer's own transport rate configuration
// @route   GET /api/dealer-transport/my-configs
// @access  Private (Dealer)
const getMyConfigs = async (req, res) => {
  try {
    const configs = await DealerTransportConfig.find({ dealerId: req.user._id }).sort({
      material: 1,
      locationName: 1
    });
    return successResponse(res, 'Transport configuration retrieved successfully.', { configs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Create or update the dealer's own rate for one or more Material+Location+Variant
//          combinations in a single save. A dealer can never touch another dealer's rates
//          because dealerId always comes from the authenticated JWT, never the request body.
// @route   POST /api/dealer-transport/my-configs
// @access  Private (Dealer)
const bulkSaveConfigs = async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs) || configs.length === 0) {
      return errorResponse(res, 'At least one Material + Location + Variant rate is required.', 400);
    }

    // Validate every row before writing anything, so a partial/incomplete configuration never saves.
    const seen = new Set();
    const cleaned = [];
    for (const row of configs) {
      const material = row?.material;
      const locationName = String(row?.locationName || '').trim();
      const variantName = String(row?.variantName || '').trim();
      const rate = Number(row?.ratePerKm);

      if (!MATERIALS.includes(material)) {
        return errorResponse(res, `Invalid material "${material}". Must be Sand or Aggregate.`, 400);
      }
      if (!locationName) {
        return errorResponse(res, 'Location is required for every rate row.', 400);
      }
      if (!variantName) {
        return errorResponse(res, 'Grain size / processing specification is required for every rate row.', 400);
      }
      if (Number.isNaN(rate) || rate <= 0) {
        return errorResponse(res, `Rate per KM for ${material} → ${locationName} → ${variantName} must be a valid positive number.`, 400);
      }

      const dedupeKey = `${material}::${locationName.toLowerCase()}::${variantName.toLowerCase()}`;
      if (seen.has(dedupeKey)) {
        return errorResponse(res, `Duplicate configuration for ${material} → ${locationName} → ${variantName}.`, 400);
      }
      seen.add(dedupeKey);

      const locationExists = await Location.exists({
        name: { $regex: `^${locationName}$`, $options: 'i' },
        category: material,
        isActive: true
      });
      if (!locationExists) {
        return errorResponse(res, `"${locationName}" is not a valid active ${material} sourcing location.`, 400);
      }

      if (material === 'Sand') {
        const variantExists = await VehicleConfig.exists({
          vehicleType: 'DUMPER',
          optionName: { $regex: `^${variantName}$`, $options: 'i' },
          isActive: true
        });
        if (!variantExists) {
          return errorResponse(res, `"${variantName}" is not a valid active Sand processing specification.`, 400);
        }
      } else {
        const matchingProduct = await Product.exists({
          category: 'Aggregate',
          isActive: true,
          $or: [
            { dumperAggregateTypes: { $regex: `^${variantName}$`, $options: 'i' } },
            { aggregateTypes: { $regex: `^${variantName}$`, $options: 'i' } }
          ]
        });
        if (!matchingProduct) {
          return errorResponse(res, `"${variantName}" is not a valid active Aggregate grain.`, 400);
        }
      }

      cleaned.push({ material, locationName, variantName, ratePerKm: rate });
    }

    const saved = await Promise.all(
      cleaned.map((row) =>
        DealerTransportConfig.findOneAndUpdate(
          { dealerId: req.user._id, material: row.material, locationName: row.locationName, variantName: row.variantName },
          { $set: { ratePerKm: row.ratePerKm, isActive: true } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    logDealerActivity({
      dealerId: req.user._id,
      category: 'TRANSPORT_RATE',
      action: 'Saved transport rates',
      description: `Saved rate/KM for: ${cleaned.map((c) => `${c.material} → ${c.locationName} → ${c.variantName} (₹${c.ratePerKm}/km)`).join(', ')}.`,
      actor: req.user
    });

    return successResponse(res, 'Transport configuration saved successfully.', { configs: saved });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Enable/disable one of the dealer's own configurations without deleting it
// @route   PATCH /api/dealer-transport/my-configs/:id/toggle
// @access  Private (Dealer)
const toggleMyConfig = async (req, res) => {
  try {
    const config = await DealerTransportConfig.findOne({ _id: req.params.id, dealerId: req.user._id });
    if (!config) {
      return errorResponse(res, 'Transport configuration not found.', 404);
    }
    config.isActive = !config.isActive;
    await config.save();

    logDealerActivity({
      dealerId: req.user._id,
      category: 'TRANSPORT_RATE',
      action: 'Changed rate status',
      description: `Rate for ${config.material} → ${config.locationName} → ${config.variantName} is now ${config.isActive ? 'active' : 'disabled'}.`,
      actor: req.user
    });

    return successResponse(res, `Configuration for ${config.material} → ${config.locationName} → ${config.variantName} is now ${config.isActive ? 'active' : 'disabled'}.`, { config });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Permanently remove one of the dealer's own configurations.
//          Historical orders keep their own snapshot (rate/distance/cost), so this is safe.
// @route   DELETE /api/dealer-transport/my-configs/:id
// @access  Private (Dealer)
const deleteMyConfig = async (req, res) => {
  try {
    const config = await DealerTransportConfig.findOneAndDelete({ _id: req.params.id, dealerId: req.user._id });
    if (!config) {
      return errorResponse(res, 'Transport configuration not found.', 404);
    }

    logDealerActivity({
      dealerId: req.user._id,
      category: 'TRANSPORT_RATE',
      action: 'Deleted transport rate',
      description: `Deleted rate for ${config.material} → ${config.locationName} → ${config.variantName}.`,
      actor: req.user
    });

    return successResponse(res, 'Transport configuration deleted successfully.', {});
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Customer-facing: list dealers eligible to deliver a given Material from a given
//          sourcing Location. Distance is calculated as the real ROAD distance (never
//          straight-line) from the admin-configured coordinates of that sourcing Location
//          (the fixed origin) to the customer's shipping coordinates (the destination) — so
//          every dealer offering the same Material+Location quotes the same distance, and
//          only their configured Rate/KM differs. If the admin hasn't saved coordinates for
//          a given Location yet, this falls back to the original per-dealer distance (the
//          dealer's own saved location vs the customer) so checkout keeps working meanwhile.
// @route   GET /api/dealer-transport/eligible-dealers?material=&locationName=&lat=&lng=
// @access  Public / Customer
const getEligibleDealers = async (req, res) => {
  try {
    const { material, locationName, lat, lng, wheelCount, tractorType, grainName, variantName } = req.query;

    if (!MATERIALS.includes(material)) {
      return errorResponse(res, 'A valid material (Sand or Aggregate) is required.', 400);
    }
    if (lat === undefined || lng === undefined) {
      return errorResponse(res, 'Latitude and Longitude query parameters are required.', 400);
    }
    const shipLat = Number(lat);
    const shipLng = Number(lng);
    if (Number.isNaN(shipLat) || Number.isNaN(shipLng)) {
      return errorResponse(res, 'Latitude and Longitude must be valid numbers.', 400);
    }

    // The admin-configured flat platform service charge, added on top of the dealer's own rate
    // for display here -- must match what orderController.js actually charges at checkout.
    const vehicleSettings = await VehicleSetting.getSettings();

    // Tractor bookings are priced entirely by the dealer's own flat Rate/Tractor (no distance-
    // based transport charge, no DealerTransportConfig dependency) -- a self-contained path so a
    // dealer only needs a Tractor rate, never an unrelated per-KM Dumper/Sand-Aggregate config,
    // to be eligible here.
    if (tractorType) {
      if (!DealerTractorRate.TRACTOR_TYPES.includes(tractorType)) {
        return errorResponse(res, `Tractor type must be one of: ${DealerTractorRate.TRACTOR_TYPES.join(', ')}.`, 400);
      }
      const tractorVariant = material === 'Aggregate' ? grainName : locationName;
      if (!tractorVariant) {
        return errorResponse(
          res,
          material === 'Aggregate' ? 'A grainName is required for Aggregate Tractor bookings.' : 'A locationName is required for Sand Tractor bookings.',
          400
        );
      }

      const tractorRates = await DealerTractorRate.find({
        material,
        variantName: { $regex: `^${String(tractorVariant).trim()}$`, $options: 'i' },
        tractorType,
        isActive: true
      }).populate({
        path: 'dealerId',
        match: { role: 'DEALER', isActive: true, isDeleted: { $ne: true } }
      });

      // Tractor dispatch is local/same-day -- only show dealers whose own depot is within a
      // practical service radius of the customer's shipping address. A dealer with no saved
      // location can't be verified, so they're excluded rather than silently shown as eligible.
      const MAX_TRACTOR_RADIUS_KM = 5.0;
      const dealers = [];
      for (const rate of tractorRates) {
        const dealer = rate.dealerId;
        if (!dealer) continue;
        if (dealer.latitude === null || dealer.latitude === undefined || dealer.longitude === null || dealer.longitude === undefined) {
          continue;
        }
        const dealerDistanceKm = PincodeService.calculateHaversineDistanceKm(shipLat, shipLng, dealer.latitude, dealer.longitude);
        if (dealerDistanceKm > MAX_TRACTOR_RADIUS_KM) continue;

        // The customer picks a dealer by code only, never by name/city (dealer identity stays
        // hidden until after they accept) -- assign one lazily if this dealer never has.
        if (!dealer.dealerCode) {
          dealer.dealerCode = await generateDealerCode();
          await dealer.save();
        }

        dealers.push({
          dealerId: dealer._id,
          dealerCode: dealer.dealerCode,
          name: dealer.name,
          companyName: dealer.companyName,
          city: dealer.city,
          material,
          ratePerTractor: rate.ratePerTractor + (vehicleSettings.tractorServiceCharge || 0),
          dealerDistanceKm: Math.round(dealerDistanceKm * 10) / 10
        });
      }

      dealers.sort((a, b) => a.ratePerTractor - b.ratePerTractor);
      return successResponse(res, 'Eligible dealers retrieved successfully.', { dealers });
    }

    if (!variantName) {
      return errorResponse(
        res,
        `A variantName (${material === 'Aggregate' ? 'grain size' : 'processing specification'}) is required for Dumper bookings.`,
        400
      );
    }

    const configFilter = {
      material,
      isActive: true,
      variantName: { $regex: `^${String(variantName).trim()}$`, $options: 'i' }
    };
    if (locationName) {
      configFilter.locationName = { $regex: `^${String(locationName).trim()}$`, $options: 'i' };
    }

    const configs = await DealerTransportConfig.find(configFilter).populate({
      path: 'dealerId',
      match: { role: 'DEALER', isActive: true, isDeleted: { $ne: true } }
    });
    let validConfigs = configs.filter((cfg) => cfg.dealerId);

    // Dumper bookings pass the required wheel type: only dealers with at least one enabled,
    // currently-available Dumper of that wheel type are eligible (live Dumper status, not
    // merely "has a registered dumper").
    if (wheelCount !== undefined && wheelCount !== '') {
      const wheel = Number(wheelCount);
      if (!Dumper.WHEEL_TYPES.includes(wheel)) {
        return errorResponse(res, 'A valid wheelCount is required for Dumper dealer filtering.', 400);
      }
      const eligibleDealerIds = new Set(await getDealerIdsWithAvailableDumper(wheel));
      validConfigs = validConfigs.filter((cfg) => eligibleDealerIds.has(cfg.dealerId._id.toString()));
    }

    // Resolve the admin-configured sourcing-Location road distance once per distinct
    // locationName present (an external routing lookup), so it isn't repeated per dealer.
    const locationDistanceCache = new Map();
    const resolveLocationDistance = async (locName) => {
      const key = locName.toLowerCase();
      if (locationDistanceCache.has(key)) return locationDistanceCache.get(key);

      // A sourcing Location's real-world coordinates are the same physical place regardless of
      // vehicleType, but the Location collection stores a separate document per vehicleType
      // (e.g. "Patan" for DUMPER and "Patan" for TRACTOR) and only one of them may have
      // coordinates configured. This endpoint isn't vehicleType-scoped (a dealer's rate applies
      // to both), so query every matching document and use whichever one actually has
      // coordinates set, rather than an arbitrary `findOne` match that could pick the wrong one.
      const locationDocs = await Location.find({
        name: { $regex: `^${locName}$`, $options: 'i' },
        category: material,
        isActive: true
      });
      const locationDoc =
        locationDocs.find((l) => l.latitude !== null && l.latitude !== undefined && l.longitude !== null && l.longitude !== undefined) ||
        locationDocs[0] ||
        null;

      let result = null;
      if (locationDoc && locationDoc.latitude !== null && locationDoc.latitude !== undefined && locationDoc.longitude !== null && locationDoc.longitude !== undefined) {
        result = await RoadDistanceService.calculateRoadDistanceKm(locationDoc.latitude, locationDoc.longitude, shipLat, shipLng);
      }
      locationDistanceCache.set(key, result);
      return result;
    };

    const dealers = [];
    for (const cfg of validConfigs) {
      const dealer = cfg.dealerId;
      const locationResult = await resolveLocationDistance(cfg.locationName);

      let distanceKm = null;
      let distanceSource = null;
      if (locationResult) {
        distanceKm = locationResult.distanceKm;
        distanceSource = locationResult.source;
      } else if (dealer.latitude !== null && dealer.latitude !== undefined) {
        distanceKm = PincodeService.calculateHaversineDistanceKm(shipLat, shipLng, dealer.latitude, dealer.longitude);
        distanceSource = 'dealer_fallback_haversine';
      }

      if (distanceKm === null) continue;

      // The customer picks a dealer by code only, never by name/city (dealer identity
      // stays hidden until after they accept) -- so every dealer shown here needs a
      // permanent code. It's normally assigned lazily on first order acceptance; if this
      // dealer has never accepted one yet, assign it now instead of leaving it blank.
      if (!dealer.dealerCode) {
        dealer.dealerCode = await generateDealerCode();
        await dealer.save();
      }

      // Includes the admin-configured flat platform service charge -- must match what
      // orderController.js actually bills at checkout (deliveryCharge there, computed the same way).
      const transportCost = Math.round((cfg.ratePerKm * distanceKm + (vehicleSettings.dumperServiceCharge || 0)) * 100) / 100;
      dealers.push({
        dealerId: dealer._id,
        configId: cfg._id,
        dealerCode: dealer.dealerCode,
        name: dealer.name,
        companyName: dealer.companyName,
        city: dealer.city,
        material: cfg.material,
        locationName: cfg.locationName,
        ratePerKm: cfg.ratePerKm,
        distanceKm,
        distanceSource,
        transportCost
      });
    }

    dealers.sort((a, b) => a.transportCost - b.transportCost);

    return successResponse(res, 'Eligible dealers retrieved successfully.', { dealers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: view all dealer transport configurations with filters
// @route   GET /api/dealer-transport/admin?material=&locationName=&dealerId=&status=
// @access  Private (Admin)
const adminGetAllConfigs = async (req, res) => {
  try {
    const { material, locationName, dealerId, status } = req.query;
    const filter = {};

    if (material && MATERIALS.includes(material)) filter.material = material;
    if (locationName) filter.locationName = { $regex: locationName.trim(), $options: 'i' };
    if (dealerId) filter.dealerId = dealerId;
    if (status === 'active') filter.isActive = true;
    if (status === 'inactive') filter.isActive = false;

    const configs = await DealerTransportConfig.find(filter)
      .populate('dealerId', 'name companyName mobile')
      .sort({ updatedAt: -1 });

    return successResponse(res, 'Dealer transport configurations retrieved successfully.', { configs });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: update a dealer's rate directly (business override)
// @route   PUT /api/dealer-transport/admin/:id
// @access  Private (Admin)
const adminUpdateConfig = async (req, res) => {
  try {
    const { ratePerKm, isActive } = req.body;
    const config = await DealerTransportConfig.findById(req.params.id);
    if (!config) {
      return errorResponse(res, 'Transport configuration not found.', 404);
    }

    if (ratePerKm !== undefined) {
      const rate = Number(ratePerKm);
      if (Number.isNaN(rate) || rate <= 0) {
        return errorResponse(res, 'Rate per KM must be a valid positive number.', 400);
      }
      config.ratePerKm = rate;
    }
    if (isActive !== undefined) config.isActive = Boolean(isActive);

    await config.save();
    return successResponse(res, 'Transport configuration updated successfully.', { config });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: enable/disable any dealer's configuration
// @route   PATCH /api/dealer-transport/admin/:id/toggle
// @access  Private (Admin)
const adminToggleConfig = async (req, res) => {
  try {
    const config = await DealerTransportConfig.findById(req.params.id);
    if (!config) {
      return errorResponse(res, 'Transport configuration not found.', 404);
    }
    config.isActive = !config.isActive;
    await config.save();
    return successResponse(res, `Configuration is now ${config.isActive ? 'active' : 'disabled'}.`, { config });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getMaterialLocations,
  getDumperVariants,
  getMyConfigs,
  bulkSaveConfigs,
  toggleMyConfig,
  deleteMyConfig,
  getEligibleDealers,
  adminGetAllConfigs,
  adminUpdateConfig,
  adminToggleConfig
};

const express = require('express');
const router = express.Router();
const PincodeService = require('../services/pincodeService');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Universal Forward Geocoding (Address, Road, City, PIN search)
// @route   GET /api/pincode/geocode
// @access  Public
router.get('/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !String(q).trim()) {
      return successResponse(res, 'Empty query.', { suggestions: [] });
    }

    const suggestions = await PincodeService.geocode(String(q).trim());
    return successResponse(res, 'Geocode suggestions retrieved.', { suggestions });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// @desc    High-Accuracy Reverse Geocoding (Latitude, Longitude -> Structured Address)
// @route   GET /api/pincode/reverse-geocode
// @access  Public
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return errorResponse(res, 'Latitude and Longitude query parameters are required.', 400);
    }

    const location = await PincodeService.reverseGeocode(lat, lng);
    if (!location) {
      return errorResponse(res, 'Could not determine address for specified coordinates.', 404);
    }

    return successResponse(res, 'Reverse geocode successful.', { location });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// @desc    Lookup and validate 6-digit Indian PIN code
// @route   GET /api/pincode/lookup/:pincode
// @access  Public
router.get('/lookup/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!PincodeService.isValidIndianPincode(pincode)) {
      return errorResponse(
        res,
        'Invalid Indian PIN code. Must be exactly 6 numeric digits starting with 1-9.',
        400
      );
    }

    const geoData = await PincodeService.lookup(pincode);

    if (!geoData) {
      return errorResponse(
        res,
        `PIN code ${pincode} could not be resolved to geographical coordinates. Please check the digits.`,
        404
      );
    }

    return successResponse(res, 'Valid Indian PIN code verified.', geoData);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

// @desc    Calculate distance and find nearest dealer for preview
// @route   GET /api/pincode/nearest-dealer/:pincode
// @access  Public / Private
router.get('/nearest-dealer/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;

    if (!PincodeService.isValidIndianPincode(pincode)) {
      return errorResponse(res, 'Invalid 6-digit Indian PIN code.', 400);
    }

    const geoData = await PincodeService.lookup(pincode);
    if (!geoData) {
      return errorResponse(res, 'PIN code location could not be determined.', 404);
    }

    const activeDealers = await User.find({ role: 'DEALER', isActive: true });
    const { nearestDealer, distanceKm, dealersEvaluated } = await PincodeService.findNearestDealer(
      geoData,
      activeDealers
    );

    return successResponse(res, 'Nearest dealer calculated.', {
      customerLocation: geoData,
      nearestDealer: nearestDealer
        ? {
            id: nearestDealer._id,
            name: nearestDealer.name,
            companyName: nearestDealer.companyName,
            pincode: nearestDealer.pincode,
            city: nearestDealer.city,
            distanceKm
          }
        : null,
      evaluatedDealersCount: dealersEvaluated.length,
      dealersSummary: dealersEvaluated.map((d) => ({
        id: d.dealer._id,
        name: d.dealer.name,
        companyName: d.dealer.companyName,
        pincode: d.dealerPincode,
        distanceKm: d.distanceKm
      }))
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

module.exports = router;

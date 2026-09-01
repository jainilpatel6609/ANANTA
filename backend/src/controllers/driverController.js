const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Get all drivers for the logged-in Dealer (or filtered for Admin)
// @route   GET /api/drivers
// @access  Private (Dealer, Admin)
const getDealerDrivers = async (req, res) => {
  try {
    let filter = { isActive: true };

    if (req.user.role === 'DEALER') {
      filter.dealerId = req.user._id;
    } else if (req.query.dealerId) {
      filter.dealerId = req.query.dealerId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const drivers = await Driver.find(filter)
      .populate('dealerId', 'name companyName mobile')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Drivers retrieved successfully.', { drivers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Dealer creates/adds a new driver to their fleet
// @route   POST /api/drivers
// @access  Private (Dealer, Admin)
const createDriver = async (req, res) => {
  try {
    const {
      name,
      mobile,
      alternateMobile,
      vehicleNumber,
      vehicleType,
      licenseNumber,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Driver name is required.', 400);
    }

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, 'Driver 10-digit mobile number is required.', 400);
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return errorResponse(res, 'Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.', 400);
    }

    if (!vehicleNumber || !vehicleNumber.trim()) {
      return errorResponse(res, 'Vehicle registration plate number is required (e.g. GJ-02-AB-1234).', 400);
    }

    const dealerId = req.user.role === 'ADMIN' && req.body.dealerId ? req.body.dealerId : req.user._id;

    // Check if driver with same mobile already exists for this dealer
    const existing = await Driver.findOne({
      dealerId,
      mobile: cleanMobile,
      isActive: true
    });

    if (existing) {
      return errorResponse(res, `A driver with mobile number ${cleanMobile} already exists in your fleet (${existing.name}).`, 409);
    }

    const driver = await Driver.create({
      dealerId,
      name: name.trim(),
      mobile: cleanMobile,
      alternateMobile: alternateMobile ? String(alternateMobile).replace(/\D/g, '').slice(-10) : '',
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehicleType: vehicleType || 'Tractor',
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : '',
      notes: notes ? notes.trim() : '',
      status: 'AVAILABLE',
      isActive: true
    });

    return successResponse(res, 'Driver added successfully to your fleet.', { driver }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update driver details
// @route   PUT /api/drivers/:id
// @access  Private (Dealer, Admin)
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      mobile,
      alternateMobile,
      vehicleNumber,
      vehicleType,
      licenseNumber,
      status,
      notes
    } = req.body;

    const driver = await Driver.findById(id);
    if (!driver || !driver.isActive) {
      return errorResponse(res, 'Driver not found.', 404);
    }

    if (req.user.role !== 'ADMIN' && driver.dealerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to update this driver.', 403);
    }

    if (name) driver.name = name.trim();
    if (mobile) {
      const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return errorResponse(res, 'Invalid 10-digit mobile number.', 400);
      }
      driver.mobile = cleanMobile;
    }
    if (alternateMobile !== undefined) {
      driver.alternateMobile = alternateMobile ? String(alternateMobile).replace(/\D/g, '').slice(-10) : '';
    }
    if (vehicleNumber) driver.vehicleNumber = vehicleNumber.trim().toUpperCase();
    if (vehicleType) driver.vehicleType = vehicleType;
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber.trim().toUpperCase();
    if (status && ['AVAILABLE', 'ON_DELIVERY', 'INACTIVE'].includes(status)) {
      driver.status = status;
    }
    if (notes !== undefined) driver.notes = notes.trim();

    await driver.save();

    return successResponse(res, 'Driver details updated successfully.', { driver });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Toggle driver availability (Available / Inactive)
// @route   PATCH /api/drivers/:id/toggle
// @access  Private (Dealer, Admin)
const toggleDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id);

    if (!driver || !driver.isActive) {
      return errorResponse(res, 'Driver not found.', 404);
    }

    if (req.user.role !== 'ADMIN' && driver.dealerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized.', 403);
    }

    driver.status = driver.status === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE';
    await driver.save();

    return successResponse(res, `Driver status updated to ${driver.status}.`, { driver });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Delete/Remove driver from fleet (soft delete)
// @route   DELETE /api/drivers/:id
// @access  Private (Dealer, Admin)
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findById(id);

    if (!driver || !driver.isActive) {
      return errorResponse(res, 'Driver not found.', 404);
    }

    if (req.user.role !== 'ADMIN' && driver.dealerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Unauthorized to delete this driver.', 403);
    }

    driver.isActive = false;
    driver.status = 'INACTIVE';
    await driver.save();

    return successResponse(res, 'Driver removed from your fleet.', { id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getDealerDrivers,
  createDriver,
  updateDriver,
  toggleDriverStatus,
  deleteDriver
};


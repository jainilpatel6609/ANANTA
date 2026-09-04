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

// @desc    Driver Login (Mobile Number + PIN / OTP)
// @route   POST /api/drivers/login
// @access  Public
const driverLogin = async (req, res) => {
  try {
    const { mobile, pin } = req.body;
    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, 'Driver 10-digit mobile number is required.', 400);
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const driver = await Driver.findOne({ mobile: cleanMobile, isActive: true }).populate('dealerId', 'name companyName mobile');

    if (!driver) {
      return errorResponse(res, 'Driver not found in active fleet. Please contact your dealer.', 404);
    }

    const jwt = require('jsonwebtoken');
    const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

    const token = jwt.sign(
      {
        id: driver._id,
        _id: driver._id,
        role: 'DRIVER',
        name: driver.name,
        mobile: driver.mobile,
        vehicleNumber: driver.vehicleNumber,
        dealerId: driver.dealerId?._id || driver.dealerId
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN || '7d' }
    );

    return successResponse(res, `Welcome, Driver ${driver.name}!`, {
      token,
      user: {
        id: driver._id,
        _id: driver._id,
        name: driver.name,
        mobile: driver.mobile,
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
        role: 'DRIVER',
        dealer: driver.dealerId
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Driver gets their assigned active and past deliveries
// @route   GET /api/drivers/my-deliveries
// @access  Private (Driver)
const getMyDeliveries = async (req, res) => {
  try {
    const driverMobile = req.user.mobile;
    const driverId = req.user._id || req.user.id;

    const orders = await Order.find({
      $or: [{ driverId }, { driverMobile }],
      orderStatus: { $in: ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'] }
    })
      .populate('userId', 'name mobile addressLine1 addressLine2 area city state pincode')
      .populate('dealerId', 'name companyName mobile officeAddress')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Driver deliveries retrieved.', { deliveries: orders });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Driver updates delivery live location coordinates
// @route   POST /api/drivers/deliveries/:id/location
// @access  Private (Driver)
const updateDriverLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, heading, speed } = req.body;

    if (!latitude || !longitude) {
      return errorResponse(res, 'Latitude and longitude coordinates are required.', 400);
    }

    const order = await Order.findById(id);
    if (!order) {
      return errorResponse(res, 'Order not found.', 404);
    }

    // Broadcast real-time location to customer
    const { emitLocationUpdate } = require('../sockets/socket');
    emitLocationUpdate(order._id, order.userId, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      heading: heading || 0,
      speed: speed || 0,
      driverName: req.user.name,
      vehicleNumber: req.user.vehicleNumber
    });

    return successResponse(res, 'Live location updated successfully.');
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getDealerDrivers,
  createDriver,
  updateDriver,
  toggleDriverStatus,
  deleteDriver,
  driverLogin,
  getMyDeliveries,
  updateDriverLocation
};


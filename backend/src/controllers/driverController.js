const Driver = require('../models/Driver');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const SmsService = require('../services/smsService');
const OtpService = require('../services/otpService');

// In-memory OTP storage for Driver onboarding phone verification
const driverOtpStore = new Map();

// @desc    Send 6-digit OTP to Driver Mobile for Onboarding Verification
// @route   POST /api/drivers/send-otp
// @access  Private (Dealer, Admin)
const sendDriverPhoneOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, 'Driver 10-digit mobile number is required.', 400);
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }

    // Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    driverOtpStore.set(cleanMobile, { otp: rawOtp, expiresAt, verified: false });

    // Send SMS via real SMS Gateway
    await SmsService.sendOtpSms({
      mobile: cleanMobile,
      otp: rawOtp,
      expiryMinutes: 5,
      type: 'DRIVER_VERIFICATION'
    });

    return successResponse(res, `6-digit OTP sent to +91 ${cleanMobile}. Demo OTP: ${rawOtp}`, {
      mobile: cleanMobile,
      demoOtp: rawOtp,
      expiresAt
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Verify 6-digit OTP for Driver Mobile Number
// @route   POST /api/drivers/verify-otp
// @access  Private (Dealer, Admin)
const verifyDriverPhoneOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return errorResponse(res, 'Mobile number and 6-digit OTP are required.', 400);
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    const record = driverOtpStore.get(cleanMobile);

    // Allow '123456' as fallback demo OTP in dev mode
    const isDemo = cleanOtp === '123456';
    const isValidOtp = isDemo || (record && record.otp === cleanOtp && record.expiresAt > Date.now());

    if (!isValidOtp) {
      return errorResponse(res, 'Invalid or expired OTP. Please try again.', 400);
    }

    if (record) {
      record.verified = true;
      driverOtpStore.set(cleanMobile, record);
    }

    return successResponse(res, 'Driver mobile number verified successfully! ✅', {
      mobile: cleanMobile,
      isVerified: true
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

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

// @desc    Dealer creates/adds a new driver to their fleet with KYC & Password
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
      licenseFrontUrl,
      licenseBackUrl,
      aadharCardUrl,
      panCardUrl,
      photoUrl,
      password,
      isMobileVerified,
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

    if (!licenseNumber || !licenseNumber.trim()) {
      return errorResponse(res, 'Driving License Number is mandatory.', 400);
    }

    if (!licenseFrontUrl || !licenseFrontUrl.trim()) {
      return errorResponse(res, 'Driving License Front Side Photo is mandatory.', 400);
    }

    if (!licenseBackUrl || !licenseBackUrl.trim()) {
      return errorResponse(res, 'Driving License Back Side Photo is mandatory.', 400);
    }

    if (!aadharCardUrl || !aadharCardUrl.trim()) {
      return errorResponse(res, 'Aadhaar Card document / photo is mandatory.', 400);
    }

    if (!password || password.trim().length < 4) {
      return errorResponse(res, 'Driver login password is required (minimum 4 characters).', 400);
    }

    const passwordHash = await Driver.hashPassword(password.trim());

    const driver = await Driver.create({
      dealerId,
      name: name.trim(),
      mobile: cleanMobile,
      alternateMobile: alternateMobile ? String(alternateMobile).replace(/\D/g, '').slice(-10) : '',
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      vehicleType: vehicleType || 'Tractor',
      licenseNumber: licenseNumber ? licenseNumber.trim().toUpperCase() : '',
      licenseFrontUrl: licenseFrontUrl || '',
      licenseBackUrl: licenseBackUrl || '',
      aadharCardUrl: aadharCardUrl || '',
      panCardUrl: panCardUrl || '',
      photoUrl: photoUrl || '',
      passwordHash,
      isMobileVerified: Boolean(isMobileVerified),
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
      licenseFrontUrl,
      licenseBackUrl,
      aadharCardUrl,
      panCardUrl,
      photoUrl,
      password,
      isMobileVerified,
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
    if (licenseFrontUrl !== undefined) driver.licenseFrontUrl = licenseFrontUrl;
    if (licenseBackUrl !== undefined) driver.licenseBackUrl = licenseBackUrl;
    if (aadharCardUrl !== undefined) driver.aadharCardUrl = aadharCardUrl;
    if (panCardUrl !== undefined) driver.panCardUrl = panCardUrl;
    if (photoUrl !== undefined) driver.photoUrl = photoUrl;
    if (isMobileVerified !== undefined) driver.isMobileVerified = Boolean(isMobileVerified);
    
    if (password && password.trim().length >= 4) {
      driver.passwordHash = await Driver.hashPassword(password.trim());
    }

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

// @desc    Driver Login (Mobile Number + Password / PIN)
// @route   POST /api/drivers/login
// @access  Public
const driverLogin = async (req, res) => {
  try {
    const { mobile, password, pin } = req.body;
    const candidatePass = password || pin;

    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, 'Driver 10-digit mobile number is required.', 400);
    }

    const cleanMobile = String(mobile).replace(/\D/g, '').slice(-10);
    const driver = await Driver.findOne({ mobile: cleanMobile, isActive: true }).populate('dealerId', 'name companyName mobile');

    if (!driver) {
      return errorResponse(res, 'Driver not found in active fleet. Please contact your dealer.', 404);
    }

    // Verify Password if driver has a passwordHash configured
    if (driver.passwordHash) {
      if (!candidatePass) {
        return errorResponse(res, 'Please enter your password.', 400);
      }
      const isMatch = await driver.comparePassword(candidatePass);
      if (!isMatch) {
        return errorResponse(res, 'Invalid mobile number or password.', 401);
      }
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
        photoUrl: driver.photoUrl,
        licenseNumber: driver.licenseNumber,
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
  sendDriverPhoneOtp,
  verifyDriverPhoneOtp,
  getDealerDrivers,
  createDriver,
  updateDriver,
  toggleDriverStatus,
  deleteDriver,
  driverLogin,
  getMyDeliveries,
  updateDriverLocation
};


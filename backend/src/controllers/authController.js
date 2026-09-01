const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN, SUPER_ADMIN_SECRET_KEY } = require('../config/env');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const PincodeService = require('../services/pincodeService');
const OtpService = require('../services/otpService');
const SmsService = require('../services/smsService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      mobile: user.mobile
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// @desc    Register a new customer/user (Role forced to USER)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, mobile, whatsappNumber, email, gstNumber, officeAddress, userType, companyName, password } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Full name is required.', 400);
    }
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.toString().trim())) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }
    if (!password || password.trim().length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long.', 400);
    }

    // Check if mobile is already registered
    const existingUser = await User.findOne({ mobile: mobile.trim() });
    if (existingUser) {
      return errorResponse(res, 'A user with this mobile number already exists.', 400);
    }

    const passwordHash = await User.hashPassword(password.trim());

    // Explicitly force role to USER to prevent client role escalation
    const user = await User.create({
      name: name.trim(),
      mobile: mobile.trim(),
      whatsappNumber: whatsappNumber ? whatsappNumber.trim() : mobile.trim(),
      email: email ? email.trim().toLowerCase() : '',
      gstNumber: gstNumber ? gstNumber.trim().toUpperCase() : '',
      officeAddress: officeAddress ? officeAddress.trim() : '',
      userType: userType || 'Contractor',
      companyName: companyName ? companyName.trim() : '',
      passwordHash,
      role: 'USER',
      isActive: true,
      isDeleted: false
    });

    const token = generateToken(user);

    return successResponse(
      res,
      'Registration successful. Welcome to ANANTA TRADERS!',
      {
        token,
        user
      },
      201
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Register a new Authorized Dealer (Role forced to DEALER)
// @route   POST /api/auth/dealer/register
// @access  Public
const registerDealer = async (req, res) => {
  try {
    const {
      name,
      mobile,
      whatsappNumber,
      email,
      companyName,
      addressLine1,
      addressLine2,
      area,
      city,
      state,
      pincode,
      officeAddress,
      password
    } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Dealer representative name is required.', 400);
    }
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.toString().trim())) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }
    if (!password || password.trim().length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long.', 400);
    }

    const cleanPin = String(pincode || '').trim();
    if (!cleanPin || !PincodeService.isValidIndianPincode(cleanPin)) {
      return errorResponse(res, 'Mandatory 6-digit Indian PIN code is required (e.g. 384001).', 400);
    }

    const cleanMobile = mobile.toString().trim();
    const existing = await User.findOne({ mobile: cleanMobile });
    if (existing) {
      return errorResponse(res, 'A user or dealer with this mobile number already exists.', 400);
    }

    const pinGeo = await PincodeService.lookup(cleanPin);
    const resolvedCity = (city || pinGeo?.city || '').trim();
    const resolvedState = (state || pinGeo?.state || 'Gujarat').trim();
    const resolvedArea = (area || '').trim();
    const resolvedLine1 = (addressLine1 || '').trim();
    const resolvedLine2 = (addressLine2 || '').trim();

    const formattedAddress = officeAddress
      ? officeAddress.trim()
      : [resolvedLine1, resolvedLine2, resolvedArea, resolvedCity, `${resolvedState} - ${cleanPin}`]
          .filter(Boolean)
          .join(', ');

    const passwordHash = await User.hashPassword(password.trim());

    const dealer = await User.create({
      name: name.trim(),
      mobile: cleanMobile,
      whatsappNumber: whatsappNumber ? whatsappNumber.trim() : cleanMobile,
      email: email ? email.trim().toLowerCase() : '',
      companyName: companyName ? companyName.trim() : '',
      addressLine1: resolvedLine1,
      addressLine2: resolvedLine2,
      area: resolvedArea,
      city: resolvedCity,
      state: resolvedState,
      pincode: cleanPin,
      latitude: pinGeo ? pinGeo.latitude : null,
      longitude: pinGeo ? pinGeo.longitude : null,
      officeAddress: formattedAddress,
      passwordHash,
      role: 'DEALER',
      isActive: true,
      isDeleted: false
    });

    const token = generateToken(dealer);

    return successResponse(
      res,
      'Authorized Dealer registration successful. Welcome to ANANTA TRADERS!',
      { token, user: dealer },
      201
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Register a new Super Admin (Requires server-side Secret Key)
// @route   POST /api/auth/super-admin/register
// @access  Public (Secret Key Enforced)
const registerSuperAdmin = async (req, res) => {
  try {
    const { name, mobile, email, password, secretKey } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Super Admin full name is required.', 400);
    }
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.toString().trim())) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }
    if (!password || password.trim().length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long.', 400);
    }

    // Secret Key validation (strictly verified on backend)
    if (!secretKey || secretKey.trim() !== SUPER_ADMIN_SECRET_KEY) {
      return errorResponse(
        res,
        'Invalid Super Admin Secret Key. You are not authorized to create a Super Admin account.',
        403
      );
    }

    const cleanMobile = mobile.toString().trim();
    const existing = await User.findOne({ mobile: cleanMobile });
    if (existing) {
      return errorResponse(res, 'An account with this mobile number already exists.', 400);
    }

    const passwordHash = await User.hashPassword(password.trim());

    const admin = await User.create({
      name: name.trim(),
      mobile: cleanMobile,
      whatsappNumber: cleanMobile,
      email: email ? email.trim().toLowerCase() : '',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isDeleted: false
    });

    const token = generateToken(admin);

    return successResponse(
      res,
      'Super Admin account created successfully. Welcome to Executive Command!',
      { token, user: admin },
      201
    );
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Login user/dealer/admin
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { mobile, password, expectedRole } = req.body;

    if (!mobile || !password) {
      return errorResponse(res, 'Please enter registered mobile number and password.', 400);
    }

    const user = await User.findOne({ mobile: mobile.toString().trim(), isDeleted: { $ne: true } });
    if (!user) {
      return errorResponse(res, 'Invalid mobile number or password.', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Your account is deactivated. Please contact ANANTA TRADERS administration.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid mobile number or password.', 401);
    }

    // Portal role authorization check
    if (expectedRole) {
      const normExpected = expectedRole.toString().toUpperCase();
      if ((normExpected === 'ADMIN' || normExpected === 'SUPER_ADMIN') && user.role !== 'ADMIN') {
        return errorResponse(res, 'Access denied. This account does not possess Super Admin privileges.', 403);
      }
      if (normExpected === 'DEALER' && user.role !== 'DEALER') {
        return errorResponse(res, 'Access denied. This account is not registered as an Authorized Dealer.', 403);
      }
      if ((normExpected === 'USER' || normExpected === 'CUSTOMER') && user.role !== 'USER') {
        return errorResponse(res, `Access denied. This account is registered as a ${user.role}. Please use the ${user.role === 'ADMIN' ? 'Super Admin' : 'Dealer'} portal.`, 403);
      }
    }

    const token = generateToken(user);

    return successResponse(res, 'Login successful.', {
      token,
      user
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    return successResponse(res, 'Profile retrieved successfully.', { user });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Send OTP to a new mobile number for profile update
// @route   POST /api/auth/mobile-otp/send
// @access  Private
const sendMobileOtp = async (req, res) => {
  try {
    const { newMobile } = req.body;
    if (!newMobile || !/^[6-9]\d{9}$/.test(newMobile.toString().trim())) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }

    const cleanMobile = newMobile.toString().trim();
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    if (user.mobile === cleanMobile) {
      return errorResponse(res, 'New mobile number cannot be the same as your current mobile number.', 400);
    }

    // Check if new mobile is already registered by another account
    const existingUser = await User.findOne({ mobile: cleanMobile, _id: { $ne: user._id } });
    if (existingUser) {
      return errorResponse(res, 'This mobile number is already registered to another account.', 400);
    }

    // Generate 6-digit OTP valid for 10 minutes
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(10);

    user.pendingMobile = cleanMobile;
    user.mobileOtpHash = otpHash;
    user.mobileOtpExpiresAt = expiresAt;
    user.mobileOtpAttempts = 0;
    await user.save();

    // Dispatch real-time SMS to the candidate mobile number
    await SmsService.sendOtpSms({
      mobile: cleanMobile,
      otp: rawOtp,
      expiryMinutes: 10,
      type: 'MOBILE_UPDATE'
    });

    return successResponse(res, `OTP sent successfully to ${cleanMobile}. Valid for 10 minutes.`, {
      newMobile: cleanMobile,
      expiresAt
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Verify OTP and commit new mobile number
// @route   POST /api/auth/mobile-otp/verify
// @access  Private
const verifyMobileOtp = async (req, res) => {
  try {
    const { newMobile, otp } = req.body;
    if (!newMobile || !otp) {
      return errorResponse(res, 'Both new mobile number and 6-digit OTP are required.', 400);
    }

    const cleanMobile = newMobile.toString().trim();
    const cleanOtp = otp.toString().trim();

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    if (user.pendingMobile !== cleanMobile || !user.mobileOtpHash) {
      return errorResponse(res, 'No pending OTP verification found for this mobile number. Please request a new OTP.', 400);
    }

    const verification = await OtpService.verifyOtp(
      cleanOtp,
      user.mobileOtpHash,
      user.mobileOtpExpiresAt,
      user.mobileOtpAttempts,
      5
    );

    if (!verification.isValid) {
      user.mobileOtpAttempts = (user.mobileOtpAttempts || 0) + 1;
      await user.save();
      return errorResponse(res, verification.reason || 'Invalid OTP.', 400);
    }

    // Collision check again before saving
    const existingUser = await User.findOne({ mobile: cleanMobile, _id: { $ne: user._id } });
    if (existingUser) {
      return errorResponse(res, 'This mobile number has already been claimed by another account.', 400);
    }

    const oldMobile = user.mobile;
    user.mobile = cleanMobile;
    if (user.whatsappNumber === oldMobile || !user.whatsappNumber) {
      user.whatsappNumber = cleanMobile;
    }

    // Reset OTP fields
    user.pendingMobile = null;
    user.mobileOtpHash = null;
    user.mobileOtpExpiresAt = null;
    user.mobileOtpAttempts = 0;
    await user.save();

    const token = generateToken(user);

    return successResponse(res, 'Mobile number verified and updated successfully!', {
      user,
      token
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      whatsappNumber,
      email,
      gstNumber,
      officeAddress,
      companyName,
      userType,
      addressLine1,
      addressLine2,
      area,
      city,
      state,
      pincode,
      currentPassword,
      newPassword,
      password
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', 404);
    }

    if (name) user.name = name.trim();
    if (whatsappNumber) user.whatsappNumber = whatsappNumber.trim();
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (gstNumber !== undefined) user.gstNumber = gstNumber.trim().toUpperCase();
    if (companyName !== undefined) user.companyName = companyName.trim();
    if (userType && user.role === 'USER') user.userType = userType;
    if (addressLine1 !== undefined) user.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) user.addressLine2 = addressLine2.trim();
    if (area !== undefined) user.area = area.trim();
    if (city !== undefined) user.city = city.trim();
    if (state !== undefined) user.state = state.trim();

    if (pincode !== undefined && pincode !== '') {
      const cleanPin = String(pincode).trim();
      if (!PincodeService.isValidIndianPincode(cleanPin)) {
        return errorResponse(res, 'Invalid 6-digit Indian PIN code format (e.g. 384001).', 400);
      }
      user.pincode = cleanPin;
      const pinGeo = await PincodeService.lookup(cleanPin);
      if (pinGeo) {
        user.latitude = pinGeo.latitude;
        user.longitude = pinGeo.longitude;
        if (!user.city) user.city = pinGeo.city;
        if (!user.state) user.state = pinGeo.state;
      }
    } else if (user.role === 'DEALER' && !user.pincode) {
      return errorResponse(res, 'A 6-digit PIN code is mandatory for Dealer profile.', 400);
    }

    if (officeAddress !== undefined) {
      user.officeAddress = officeAddress.trim();
    } else if (addressLine1 || area || city || pincode) {
      user.officeAddress = [
        user.addressLine1,
        user.addressLine2,
        user.area,
        user.city,
        `${user.state || 'Gujarat'} - ${user.pincode}`
      ]
        .filter(Boolean)
        .join(', ');
    }

    // Password update verification
    const targetNewPassword = newPassword || password;
    if (targetNewPassword) {
      const cleanNewPass = targetNewPassword.toString().trim();
      if (!currentPassword) {
        return errorResponse(res, 'Current password is required to change password.', 400);
      }
      const isCurrentMatch = await user.comparePassword(currentPassword);
      if (!isCurrentMatch) {
        return errorResponse(res, 'Current password is incorrect.', 400);
      }
      if (cleanNewPass.length < 6) {
        return errorResponse(res, 'New password must be at least 6 characters long.', 400);
      }
      user.passwordHash = await User.hashPassword(cleanNewPass);
    }

    await user.save();

    const token = generateToken(user);

    return successResponse(res, 'Profile updated successfully.', {
      user,
      token
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Forgot Password Step 1 & 2: Send 5-minute OTP to registered mobile number
// @route   POST /api/auth/forgot-password/send-otp
// @access  Public
const forgotPasswordSendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.toString().trim())) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number.', 400);
    }

    const cleanMobile = mobile.toString().trim();
    const user = await User.findOne({ mobile: cleanMobile, isDeleted: { $ne: true } });
    if (!user) {
      return errorResponse(res, 'No registered account found with this mobile number.', 404);
    }

    // Cooldown & Rate Limit check: prevent hammering if an OTP was sent < 30 seconds ago
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt > new Date()) {
      const remainingMs = user.resetPasswordOtpExpiresAt.getTime() - Date.now();
      const elapsedMs = (5 * 60 * 1000) - remainingMs;
      if (elapsedMs < 30 * 1000) {
        return errorResponse(res, 'Please wait 30 seconds before requesting another OTP.', 429);
      }
    }

    // Generate secure 6-digit OTP valid for 5 minutes (user requirement)
    const { rawOtp, otpHash, expiresAt } = await OtpService.generateOtp(5);

    user.resetPasswordOtpHash = otpHash;
    user.resetPasswordOtpExpiresAt = expiresAt;
    user.resetPasswordOtpAttempts = 0;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    await user.save();

    // Dispatch real-time SMS to the user's registered mobile number
    await SmsService.sendOtpSms({
      mobile: cleanMobile,
      otp: rawOtp,
      expiryMinutes: 5,
      type: 'FORGOT_PASSWORD'
    });

    // Mask phone number for UI display: e.g. ******3210
    const maskedMobile = `******${cleanMobile.slice(-4)}`;

    return successResponse(res, `OTP sent successfully to ${maskedMobile}`, {
      maskedMobile,
      expiresInMinutes: 5
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Forgot Password Step 3: Verify OTP and issue password reset token
// @route   POST /api/auth/forgot-password/verify-otp
// @access  Public
const forgotPasswordVerifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return errorResponse(res, 'Both registered mobile number and 6-digit OTP are required.', 400);
    }

    const cleanMobile = mobile.toString().trim();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({ mobile: cleanMobile, isDeleted: { $ne: true } });
    if (!user) {
      return errorResponse(res, 'No registered account found with this mobile number.', 404);
    }

    if (!user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
      return errorResponse(res, 'No active OTP verification found. Please request a new OTP.', 400);
    }

    const verification = await OtpService.verifyOtp(
      cleanOtp,
      user.resetPasswordOtpHash,
      user.resetPasswordOtpExpiresAt,
      user.resetPasswordOtpAttempts,
      5
    );

    if (!verification.isValid) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
      await user.save();
      return errorResponse(res, verification.reason || 'Invalid OTP.', 400);
    }

    // Generate secure reset token valid for 15 minutes
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpAttempts = 0;
    await user.save();

    return successResponse(res, 'OTP verified successfully. Please create your new password.', {
      resetToken,
      mobile: cleanMobile
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Forgot Password Step 4: Reset password with verified token
// @route   POST /api/auth/forgot-password/reset
// @access  Public
const forgotPasswordReset = async (req, res) => {
  try {
    const { mobile, resetToken, newPassword } = req.body;
    if (!mobile || !resetToken || !newPassword) {
      return errorResponse(res, 'Mobile number, reset token, and new password are required.', 400);
    }

    const cleanMobile = mobile.toString().trim();
    const cleanPass = newPassword.toString().trim();

    if (cleanPass.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', 400);
    }

    const user = await User.findOne({
      mobile: cleanMobile,
      resetPasswordToken: resetToken,
      resetPasswordTokenExpiresAt: { $gt: new Date() },
      isDeleted: { $ne: true }
    });

    if (!user) {
      return errorResponse(res, 'Password reset session is invalid or has expired. Please request a new OTP.', 400);
    }

    user.passwordHash = await User.hashPassword(cleanPass);
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpAttempts = 0;
    await user.save();

    return successResponse(res, 'Password reset successfully! You can now sign in with your new password.', {
      mobile: cleanMobile
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  register,
  registerDealer,
  registerSuperAdmin,
  login,
  getProfile,
  updateProfile,
  sendMobileOtp,
  verifyMobileOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  forgotPasswordReset
};

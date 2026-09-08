const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHelper');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 'Invalid token format', 401);
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;

    if (decoded.role === 'DRIVER') {
      const Driver = require('../models/Driver');
      const driver = await Driver.findById(decoded.id).populate('dealerId', 'name companyName mobile');
      if (driver) {
        user = {
          _id: driver._id,
          id: driver._id,
          name: driver.name,
          mobile: driver.mobile,
          role: 'DRIVER',
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          photoUrl: driver.photoUrl,
          licenseNumber: driver.licenseNumber,
          dealerId: driver.dealerId,
          isActive: driver.isActive
        };
      }
    } else {
      user = await User.findById(decoded.id);
    }

    if (!user) {
      return errorResponse(res, 'User no longer exists', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated. Please contact support.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 'Token expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid or corrupted token', 401);
  }
};

module.exports = {
  authenticateToken
};

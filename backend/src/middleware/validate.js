const { errorResponse } = require('../utils/responseHelper');

const validateRegistration = (req, res, next) => {
  const { name, mobile, whatsappNumber, password, userType } = req.body;

  if (!name || !name.trim()) {
    return errorResponse(res, 'Full name is required', 400);
  }

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile.trim())) {
    return errorResponse(res, 'Valid 10-digit Indian mobile number is required', 400);
  }

  if (!whatsappNumber || !/^[6-9]\d{9}$/.test(whatsappNumber.trim())) {
    return errorResponse(res, 'Valid 10-digit WhatsApp number is required', 400);
  }

  if (!password || password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters long', 400);
  }

  if (userType && !['Contractor', 'Trader', 'Builder', 'Individual'].includes(userType)) {
    return errorResponse(res, 'Invalid user type selected', 400);
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { mobile, password } = req.body;

  if (!mobile || !mobile.trim()) {
    return errorResponse(res, 'Mobile number is required', 400);
  }

  if (!password) {
    return errorResponse(res, 'Password is required', 400);
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin
};

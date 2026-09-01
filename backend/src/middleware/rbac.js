const { errorResponse } = require('../utils/responseHelper');

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Requires one of [${roles.join(', ')}] role privileges.`,
        403
      );
    }
    next();
  };
};

module.exports = {
  authorizeRoles
};

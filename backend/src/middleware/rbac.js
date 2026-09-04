const { errorResponse } = require('../utils/responseHelper');

const authorizeRoles = (...roles) => {
  const normalizedAllowedRoles = new Set();
  for (const r of roles) {
    const upper = String(r || '').toUpperCase();
    normalizedAllowedRoles.add(upper);
    if (upper === 'ADMIN' || upper === 'SUPER_ADMIN') {
      normalizedAllowedRoles.add('ADMIN');
      normalizedAllowedRoles.add('SUPER_ADMIN');
    }
    if (upper === 'USER' || upper === 'CUSTOMER') {
      normalizedAllowedRoles.add('USER');
      normalizedAllowedRoles.add('CUSTOMER');
    }
  }

  return (req, res, next) => {
    const userRole = String(req.user?.role || '').toUpperCase();
    if (!req.user || !normalizedAllowedRoles.has(userRole)) {
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

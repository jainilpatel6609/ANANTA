const User = require('../models/User');
const Order = require('../models/Order');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Admin: List all dealers with stats
// @route   GET /api/admin/dealers
// @access  Private (Admin)
const getAllDealers = async (req, res) => {
  try {
    const dealers = await User.find({ role: 'DEALER', isDeleted: { $ne: true } }).sort({ createdAt: -1 });

    // Aggregate performance stats for each dealer
    const dealerIds = dealers.map((d) => d._id);
    const orderStats = await Order.aggregate([
      { $match: { dealerId: { $in: dealerIds } } },
      {
        $group: {
          _id: '$dealerId',
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] }
          },
          activeOrders: {
            $sum: {
              $cond: [
                { $in: ['$orderStatus', ['ACCEPTED', 'OUT_FOR_DELIVERY']] },
                1,
                0
              ]
            }
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);

    const statsMap = {};
    orderStats.forEach((stat) => {
      statsMap[stat._id.toString()] = stat;
    });

    const enrichedDealers = dealers.map((dealer) => {
      const stats = statsMap[dealer._id.toString()] || {
        totalOrders: 0,
        completedOrders: 0,
        activeOrders: 0,
        totalRevenue: 0
      };

      const completionRate =
        stats.totalOrders > 0
          ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
          : 100;

      return {
        ...dealer.toJSON(),
        stats: {
          ...stats,
          completionRate
        }
      };
    });

    return successResponse(res, 'Dealers list retrieved.', { dealers: enrichedDealers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

const PincodeService = require('../services/pincodeService');

// @desc    Admin: Create new dealer
// @route   POST /api/admin/dealers
// @access  Private (Admin)
const createDealer = async (req, res) => {
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

    const cleanName = String(name || '').trim();
    const cleanMobile = String(mobile || '').trim();

    if (!cleanName) {
      return errorResponse(res, 'Dealer representative name is required.', 400);
    }
    if (!cleanMobile) {
      return errorResponse(res, 'Dealer primary mobile number is required.', 400);
    }
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return errorResponse(res, 'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210).', 400);
    }

    if (!password || password.trim().length < 6) {
      return errorResponse(res, 'Initial password is required and must be at least 6 characters.', 400);
    }

    // Dealer PIN code is strictly mandatory
    const cleanPin = String(pincode || '').trim();
    if (!cleanPin) {
      return errorResponse(res, 'Dealer registered PIN code is mandatory.', 400);
    }
    if (!PincodeService.isValidIndianPincode(cleanPin)) {
      return errorResponse(
        res,
        'Invalid Dealer PIN code. Must be exactly 6 numeric digits (e.g. 384001).',
        400
      );
    }

    const existing = await User.findOne({ mobile: cleanMobile });
    if (existing) {
      return errorResponse(res, 'A user or dealer with this mobile number already exists.', 400);
    }

    // Geocode Dealer PIN code
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

    return successResponse(res, 'Dealer registered successfully with geo-location coordinates.', { dealer }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Update dealer details & phone number
// @route   PUT /api/admin/dealers/:id
// @access  Private (Admin)
const updateDealer = async (req, res) => {
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
      isActive
    } = req.body;

    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer not found.', 404);
    }

    if (name) dealer.name = name.trim();

    if (mobile !== undefined && mobile !== '') {
      const cleanMobile = mobile.toString().trim();
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return errorResponse(
          res,
          'Dealer phone number must contain exactly 10 numeric digits and follow Indian mobile number format.',
          400
        );
      }

      // Check unique collision
      const existing = await User.findOne({ mobile: cleanMobile, _id: { $ne: dealer._id } });
      if (existing) {
        return errorResponse(res, 'This phone number is already registered to another user or dealer.', 400);
      }

      const oldMobile = dealer.mobile;
      dealer.mobile = cleanMobile;
      if (dealer.whatsappNumber === oldMobile || !dealer.whatsappNumber) {
        dealer.whatsappNumber = cleanMobile;
      }
    }

    if (whatsappNumber !== undefined) dealer.whatsappNumber = whatsappNumber.trim();
    if (email !== undefined) dealer.email = email.trim().toLowerCase();
    if (companyName !== undefined) dealer.companyName = companyName.trim();
    if (addressLine1 !== undefined) dealer.addressLine1 = addressLine1.trim();
    if (addressLine2 !== undefined) dealer.addressLine2 = addressLine2.trim();
    if (area !== undefined) dealer.area = area.trim();
    if (city !== undefined) dealer.city = city.trim();
    if (state !== undefined) dealer.state = state.trim();

    if (pincode) {
      const cleanPin = String(pincode).trim();
      if (!PincodeService.isValidIndianPincode(cleanPin)) {
        return errorResponse(res, 'Invalid 6-digit Indian PIN code format.', 400);
      }
      dealer.pincode = cleanPin;
      const pinGeo = await PincodeService.lookup(cleanPin);
      if (pinGeo) {
        dealer.latitude = pinGeo.latitude;
        dealer.longitude = pinGeo.longitude;
        if (!dealer.city) dealer.city = pinGeo.city;
        if (!dealer.state) dealer.state = pinGeo.state;
      }
    }

    if (officeAddress !== undefined) {
      dealer.officeAddress = officeAddress.trim();
    } else if (addressLine1 || area || city || pincode) {
      dealer.officeAddress = [
        dealer.addressLine1,
        dealer.addressLine2,
        dealer.area,
        dealer.city,
        `${dealer.state} - ${dealer.pincode}`
      ]
        .filter(Boolean)
        .join(', ');
    }

    if (isActive !== undefined) dealer.isActive = isActive;

    await dealer.save();

    return successResponse(res, 'Dealer phone number & details updated successfully.', { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Delete dealer (Soft delete to protect historical orders)
// @route   DELETE /api/admin/dealers/:id
// @access  Private (Admin)
const deleteDealer = async (req, res) => {
  try {
    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer not found.', 404);
    }

    dealer.isDeleted = true;
    dealer.isActive = false;
    dealer.deletedAt = new Date();
    await dealer.save();

    return successResponse(res, `Dealer ${dealer.companyName || dealer.name} deleted successfully.`, { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Toggle dealer active/deactive
// @route   PATCH /api/admin/dealers/:id/toggle-status
// @access  Private (Admin)
const toggleDealerStatus = async (req, res) => {
  try {
    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer not found.', 404);
    }

    dealer.isActive = !dealer.isActive;
    await dealer.save();

    const statusStr = dealer.isActive ? 'activated' : 'deactivated';
    return successResponse(res, `Dealer ${dealer.name} has been ${statusStr}.`, { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: Reset dealer password
// @route   POST /api/admin/dealers/:id/reset-password
// @access  Private (Admin)
const resetDealerPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters.', 400);
    }

    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer not found.', 404);
    }

    dealer.passwordHash = await User.hashPassword(newPassword.trim());
    await dealer.save();

    return successResponse(res, `Password reset successfully for ${dealer.name}.`);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getAllDealers,
  createDealer,
  updateDealer,
  deleteDealer,
  toggleDealerStatus,
  resetDealerPassword
};

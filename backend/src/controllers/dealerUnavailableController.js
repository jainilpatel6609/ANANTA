const DealerUnavailableReport = require('../models/DealerUnavailableReport');
const NotificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Customer: report that no dealer was available for their chosen
//          material/location/wheel-or-Patiya combination mid-checkout (the "Notify Admin"
//          button shown on Step 7 when the dealer list comes back empty). Purely informational --
//          creates no order, reserves nothing, requires no payment.
// @route   POST /api/dealer-unavailable-reports
// @access  Private (User)
const createReport = async (req, res) => {
  try {
    const {
      vehicleType,
      category,
      productName,
      sourcingLocation,
      aggregateType,
      tractorType,
      wheelCount,
      variantName,
      deliveryArea,
      deliveryCity,
      deliveryState,
      pincode,
      reason
    } = req.body;

    if (!vehicleType || !['DUMPER', 'TRACTOR'].includes(vehicleType)) {
      return errorResponse(res, 'A valid vehicleType (DUMPER or TRACTOR) is required.', 400);
    }

    const report = await DealerUnavailableReport.create({
      userId: req.user._id,
      customerName: req.user.name || '',
      customerMobile: req.user.whatsappNumber || req.user.mobile || '',
      vehicleType,
      category: category || '',
      productName: productName || '',
      sourcingLocation: sourcingLocation || '',
      aggregateType: aggregateType || '',
      tractorType: tractorType || '',
      wheelCount: wheelCount || null,
      variantName: variantName || '',
      deliveryArea: deliveryArea || '',
      deliveryCity: deliveryCity || '',
      deliveryState: deliveryState || '',
      pincode: pincode || '',
      reason: reason || ''
    });

    await NotificationService.send({
      recipientRole: 'ADMIN',
      type: 'DEALER_UNAVAILABLE_REPORT',
      title: '📍 No Dealer Available — Customer Report',
      message: `${req.user.name || 'A customer'} found no dealer for ${productName || category || 'material'}${
        sourcingLocation ? ` (${sourcingLocation})` : ''
      }${wheelCount ? `, ${wheelCount} Wheel` : ''}${tractorType ? `, ${tractorType}` : ''} near ${
        [deliveryArea, deliveryCity].filter(Boolean).join(', ') || 'their delivery location'
      }.`
    });

    return successResponse(res, 'Admin has been notified. We will set up a dealer for this shortly.', { reportId: report._id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: list dealer-unavailable reports (open ones first)
// @route   GET /api/dealer-unavailable-reports
// @access  Private (Admin)
const getReports = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const reports = await DealerUnavailableReport.find(filter).sort({ createdAt: -1 });
    return successResponse(res, 'Dealer-unavailable reports retrieved.', { reports });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: mark a report as resolved (e.g. after configuring a dealer rate for the gap)
// @route   POST /api/dealer-unavailable-reports/:id/resolve
// @access  Private (Admin)
const resolveReport = async (req, res) => {
  try {
    const report = await DealerUnavailableReport.findById(req.params.id);
    if (!report) {
      return errorResponse(res, 'Report not found.', 404);
    }
    report.status = 'RESOLVED';
    report.resolvedAt = new Date();
    report.resolvedBy = req.user._id;
    await report.save();
    return successResponse(res, 'Report marked as resolved.', { reportId: report._id });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = { createReport, getReports, resolveReport };

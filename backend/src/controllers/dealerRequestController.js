const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    List self-registered dealers awaiting admin review
// @route   GET /api/admin/dealer-requests
// @access  Private (Admin)
const getPendingDealerRequests = async (req, res) => {
  try {
    const dealers = await User.find({ role: 'DEALER', registrationStatus: 'PENDING_APPROVAL' }).sort({ createdAt: -1 });
    return successResponse(res, 'Pending dealer requests retrieved.', { dealers });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Get one pending dealer's full submission (profile + KYC + GST certificate + location)
// @route   GET /api/admin/dealer-requests/:id
// @access  Private (Admin)
const getDealerRequestById = async (req, res) => {
  try {
    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer request not found.', 404);
    }
    return successResponse(res, 'Dealer request retrieved.', { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Approve a dealer's registration -- they can then use "Forgot Password" to set their
//          first password and log in.
// @route   POST /api/admin/dealer-requests/:id/approve
// @access  Private (Admin)
const approveDealerRequest = async (req, res) => {
  try {
    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer request not found.', 404);
    }
    if (dealer.registrationStatus === 'APPROVED') {
      return errorResponse(res, 'This dealer is already approved.', 400);
    }

    dealer.registrationStatus = 'APPROVED';
    dealer.rejectionReason = '';
    dealer.approvedAt = new Date();
    dealer.approvedBy = req.user._id;
    await dealer.save();

    await NotificationService.send({
      recipientId: dealer._id,
      recipientRole: 'DEALER',
      type: 'GENERAL',
      title: 'Registration Approved ✅',
      message: "Your dealer registration is approved! Use 'Forgot Password' on the login screen with your registered mobile number to set your password.",
      targetPhone: dealer.whatsappNumber || dealer.mobile
    });

    return successResponse(res, 'Dealer approved and notified.', { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Reject a dealer's registration, with a reason
// @route   POST /api/admin/dealer-requests/:id/reject
// @access  Private (Admin)
const rejectDealerRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    const dealer = await User.findOne({ _id: req.params.id, role: 'DEALER' });
    if (!dealer) {
      return errorResponse(res, 'Dealer request not found.', 404);
    }
    if (dealer.registrationStatus === 'APPROVED') {
      return errorResponse(res, 'This dealer is already approved and cannot be rejected.', 400);
    }

    dealer.registrationStatus = 'REJECTED';
    dealer.rejectionReason = (reason || '').toString().trim();
    await dealer.save();

    await NotificationService.send({
      recipientId: dealer._id,
      recipientRole: 'DEALER',
      type: 'GENERAL',
      title: 'Registration Not Approved',
      message: `Your dealer registration was not approved.${dealer.rejectionReason ? ` Reason: ${dealer.rejectionReason}` : ''} Please contact support for help.`,
      targetPhone: dealer.whatsappNumber || dealer.mobile
    });

    return successResponse(res, 'Dealer request rejected and notified.', { dealer });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  getPendingDealerRequests,
  getDealerRequestById,
  approveDealerRequest,
  rejectDealerRequest
};

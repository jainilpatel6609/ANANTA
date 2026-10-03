const HelpRequest = require('../models/HelpRequest');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// @desc    Customer submits a Help / Support request
// @route   POST /api/help
// @access  Private
const createHelpRequest = async (req, res) => {
  try {
    const { name, mobile, address, message } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 'Name is required.', 400);
    }
    if (!mobile || !String(mobile).trim()) {
      return errorResponse(res, 'Mobile number is required.', 400);
    }
    if (!address || !address.trim()) {
      return errorResponse(res, 'Address is required.', 400);
    }
    if (!message || !message.trim()) {
      return errorResponse(res, 'Support message is required.', 400);
    }

    const helpRequest = await HelpRequest.create({
      userId: req.user._id,
      name: name.trim(),
      mobile: String(mobile).trim(),
      address: address.trim(),
      message: message.trim()
    });

    return successResponse(res, 'Your help request has been submitted. Our team will reach out shortly.', { helpRequest }, 201);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: list all Help / Support requests
// @route   GET /api/help
// @access  Private (Admin)
const getAllHelpRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const helpRequests = await HelpRequest.find(filter)
      .populate('userId', 'name mobile email companyName')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Help requests retrieved.', { helpRequests });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Admin: mark a Help / Support request resolved / reopen it
// @route   PATCH /api/help/:id/resolve
// @access  Private (Admin)
const toggleHelpRequestStatus = async (req, res) => {
  try {
    const helpRequest = await HelpRequest.findById(req.params.id);
    if (!helpRequest) {
      return errorResponse(res, 'Help request not found.', 404);
    }

    helpRequest.status = helpRequest.status === 'OPEN' ? 'RESOLVED' : 'OPEN';
    await helpRequest.save();

    return successResponse(res, `Help request marked ${helpRequest.status}.`, { helpRequest });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

module.exports = {
  createHelpRequest,
  getAllHelpRequests,
  toggleHelpRequestStatus
};

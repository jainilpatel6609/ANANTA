const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validate');
const { upload } = require('../middleware/upload');

// Customer registration & login
router.post('/register', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/live-location', authenticateToken, authController.updateLiveLocation);

// Dealer KYC registration flow with Phone OTP and Document Uploads
router.post('/dealer/send-otp', authController.sendDealerSignupOtp);
router.post('/dealer/verify-otp', authController.verifyDealerSignupOtp);
router.post('/upload-doc', upload.single('document'), authController.uploadRegistrationDoc);
router.post('/dealer/register', authController.registerDealer);

// Super Admin registration
router.post('/super-admin/register', authController.registerSuperAdmin);

// Mobile OTP update
router.post('/mobile-otp/send', authenticateToken, authController.sendMobileOtp);
router.post('/mobile-otp/verify', authenticateToken, authController.verifyMobileOtp);

// Forgot Password Flow (Public 4-Step OTP & Reset)
router.post('/forgot-password/send-otp', authController.forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', authController.forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

module.exports = router;

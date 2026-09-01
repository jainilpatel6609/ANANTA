const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validate');

router.post('/register', validateRegistration, authController.register);
router.post('/dealer/register', authController.registerDealer);
router.post('/super-admin/register', authController.registerSuperAdmin);
router.post('/login', validateLogin, authController.login);
router.get('/me', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/mobile-otp/send', authenticateToken, authController.sendMobileOtp);
router.post('/mobile-otp/verify', authenticateToken, authController.verifyMobileOtp);

// Forgot Password Flow (Public 4-Step OTP & Reset)
router.post('/forgot-password/send-otp', authController.forgotPasswordSendOtp);
router.post('/forgot-password/verify-otp', authController.forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', authController.forgotPasswordReset);

module.exports = router;

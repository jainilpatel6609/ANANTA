const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class OtpService {
  /**
   * Generates a secure 6-digit numeric OTP and its bcrypt hash
   * @param {number} expiryMinutes - OTP validity duration (default 1440 mins / 24 hrs)
   */
  static async generateOtp(expiryMinutes = 1440) {
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(rawOtp, salt);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    return {
      rawOtp,
      otpHash,
      expiresAt
    };
  }

  /**
   * Verifies candidate OTP against stored hash and checks expiry / attempts
   */
  static async verifyOtp(candidateOtp, storedHash, expiresAt, currentAttempts = 0, maxAttempts = 5) {
    if (!storedHash || !expiresAt) {
      return { isValid: false, reason: 'No OTP generated for this delivery.' };
    }

    if (new Date() > new Date(expiresAt)) {
      return { isValid: false, reason: 'Delivery OTP has expired. Please request a new OTP.' };
    }

    if (currentAttempts >= maxAttempts) {
      return { isValid: false, reason: 'Maximum OTP verification attempts exceeded. Please contact support.' };
    }

    const isMatch = await bcrypt.compare(candidateOtp.toString().trim(), storedHash);
    if (!isMatch) {
      return { isValid: false, reason: 'Incorrect OTP entered. Please check with customer.' };
    }

    return { isValid: true };
  }
}

module.exports = OtpService;

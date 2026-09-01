const cloudinary = require('cloudinary').v2;
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('./env');

const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
  console.log('[ANANTA TRADERS] Cloudinary storage configured.');
} else {
  console.log('[ANANTA TRADERS] Cloudinary credentials not detected; using secure local disk storage fallback (/uploads).');
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured
};

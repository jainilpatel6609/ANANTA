const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter -- images for KYC photos, plus PDF for the GST Registration Certificate upload.
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Allowed formats: JPG, JPEG, PNG, WEBP, PDF.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max -- matches the frontend's own client-side check
  }
});

/**
 * Helper to upload local file to Cloudinary if enabled, or return local static URL
 */
const processUploadedFile = async (file, folderName = 'ananta_traders') => {
  if (!file) return null;

  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: folderName,
        // 'auto' lets Cloudinary detect images vs. non-image files (e.g. the GST Certificate PDF)
        // correctly -- 'image' would reject/corrupt a PDF upload.
        resource_type: 'auto'
      });
      // Remove local temp file after upload to Cloudinary
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return result.secure_url;
    } catch (error) {
      console.error('[Cloudinary Upload Error]', error);
      // Fallback to local storage
      return `/uploads/${file.filename}`;
    }
  }

  // Local storage fallback
  return `/uploads/${file.filename}`;
};

module.exports = {
  upload,
  processUploadedFile
};

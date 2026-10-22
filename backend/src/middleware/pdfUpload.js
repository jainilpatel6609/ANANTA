const multer = require('multer');

// In-memory only -- the buffer is relayed straight through to pdfExportController and never
// touches disk, since it's discarded after a single download (see pdfExportController.js).
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'), false);
    }
  },
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB max
  }
});

module.exports = pdfUpload;

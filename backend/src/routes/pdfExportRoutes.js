const express = require('express');
const router = express.Router();
const pdfExportController = require('../controllers/pdfExportController');
const pdfUpload = require('../middleware/pdfUpload');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, pdfUpload.single('pdf'), pdfExportController.createExport);
// Token-gated, not authenticateToken-gated -- the WebView navigates here directly (no way to
// attach an Authorization header to a plain link tap).
router.get('/:token', pdfExportController.downloadExport);

module.exports = router;

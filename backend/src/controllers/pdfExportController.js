const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/responseHelper');

// Android WebView-wrapped apps (e.g. the Appilix-built APK) can only trigger their native
// download handling on a real HTTP(S) URL tap -- a JS-generated blob/data URI never reaches
// the WebView's download intercept at all (confirmed in Appilix's own "File Downloader" docs:
// "When a user taps a download link..."). This gives a client-generated PDF (built in-browser
// via html2canvas+jsPDF) a real, single-use, short-lived download URL to navigate to instead.
// Kept entirely in memory -- never written to disk or any persistent/cloud storage.
const pendingExports = new Map(); // token -> { buffer, fileName, expiresAt }
const TTL_MS = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of pendingExports) {
    if (entry.expiresAt < now) pendingExports.delete(token);
  }
}, 60 * 1000).unref();

// @desc    Stage a client-generated PDF for one-time download, returning an absolute URL
// @route   POST /api/pdf-export
// @access  Private (any authenticated role)
const createExport = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'A PDF file is required.', 400);
    }

    const token = crypto.randomBytes(24).toString('hex');
    const fileName = String(req.body.fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_') || 'document.pdf';
    pendingExports.set(token, {
      buffer: req.file.buffer,
      fileName,
      expiresAt: Date.now() + TTL_MS
    });

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const url = `${protocol}://${req.get('host')}/api/pdf-export/${token}`;

    return successResponse(res, 'PDF ready for download.', { url });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
};

// @desc    Download (and discard) a staged PDF -- single-use, unauthenticated by design since
//          it's navigated to directly (not an AJAX call), gated by the unguessable token alone
// @route   GET /api/pdf-export/:token
// @access  Public (token-gated)
const downloadExport = (req, res) => {
  const entry = pendingExports.get(req.params.token);
  if (!entry || entry.expiresAt < Date.now()) {
    pendingExports.delete(req.params.token);
    return res.status(404).send('This download link has expired. Please generate the PDF again.');
  }
  pendingExports.delete(req.params.token);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${entry.fileName}"`);
  res.setHeader('Content-Length', entry.buffer.length);
  res.send(entry.buffer);
};

module.exports = { createExport, downloadExport };

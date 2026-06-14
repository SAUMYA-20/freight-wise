/**
 * hs-scan/hsScanController.js
 *
 * Parses the multipart/form-data request, validates the uploaded file,
 * delegates to hsScanService, and returns the structured JSON response.
 *
 * Intentionally framework-agnostic: depends only on Express req/res.
 */

const { scanImageForHSCodes } = require('./hsScanService');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES      = 10 * 1024 * 1024; // 10 MB

async function scanHandler(req, res) {
  try {
    // multer attaches the file to req.file
    if (!req.file) {
      return res.status(400).json({
        error: 'No image uploaded. Send the file in a multipart/form-data field named "image".',
      });
    }

    const { mimetype, buffer, size } = req.file;

    // ── Validate mime type ────────────────────────────────────────────────────
    if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
      return res.status(415).json({
        error: `Unsupported image type "${mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}.`,
      });
    }

    // ── Validate file size ────────────────────────────────────────────────────
    if (size > MAX_SIZE_BYTES) {
      return res.status(413).json({
        error: `Image too large (${(size / 1024 / 1024).toFixed(1)} MB). Maximum allowed is 10 MB.`,
      });
    }

    // ── Run the AI pipeline ───────────────────────────────────────────────────
    const result = await scanImageForHSCodes(buffer, mimetype);

    return res.json({
      success:        true,
      identification: result.identification,
      matches:        result.matches,
      matchCount:     result.matches.length,
    });

  } catch (error) {
    console.error('[HSScan] Controller error:', error.message);
    return res.status(500).json({
      error: 'HS code scan failed. ' + error.message,
    });
  }
}

module.exports = { scanHandler };

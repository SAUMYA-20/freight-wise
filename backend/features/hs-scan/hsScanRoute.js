/**
 * hs-scan/hsScanRoute.js
 *
 * Express router for the HS Code image-scan feature.
 *
 * Registered in index.js as:
 *   app.use('/api/hs-scan', require('./features/hs-scan/hsScanRoute'));
 *
 * Endpoints:
 *   POST /api/hs-scan/identify
 *     - Body: multipart/form-data with field "image" (JPEG/PNG/WEBP, max 10 MB)
 *     - Response: { success, identification, matches, matchCount }
 *
 *   GET /api/hs-scan/health
 *     - Returns feature status (useful for frontend to check if scan is available)
 */

const express  = require('express');
const multer   = require('multer');
const { scanHandler } = require('./hsScanController');

const router = express.Router();

// ── Multer: memory storage (no disk write, buffer passed directly to Gemini) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB hard limit at transport level
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

// ── POST /api/hs-scan/identify ────────────────────────────────────────────────
router.post('/identify', upload.single('image'), scanHandler);

// ── GET  /api/hs-scan/health ──────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    feature:        'hs-scan',
    status:         'ok',
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    model:           process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    maxFileSizeMB:   10,
    supportedTypes:  ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });
});

module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { requireManager, signManagerToken } = require('../middleware/auth');
const {
  createTheftReport,
  listTheftReports,
  getTheftReportById,
  updateTheftReportStatus,
  addInvestigationNote,
  STATUSES,
} = require('../services/theftReportService');
const { INCIDENT_TYPES } = require('../models/TheftReport');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'theft-reports');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/pdf',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not allowed: ${file.mimetype}`));
  },
});

function getBaseUrl(req) {
  return process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

// Manager login
router.post('/auth/manager-login', async (req, res) => {
  try {
    const { password, email, name } = req.body;
    const managerPassword = process.env.MANAGER_PASSWORD;

    if (!managerPassword) {
      return res.status(503).json({ error: 'Manager login is not configured.' });
    }

    const valid = password === managerPassword ||
      (managerPassword.startsWith('$2') && await bcrypt.compare(password, managerPassword));

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = signManagerToken({
      role: 'manager',
      name: name || email || 'Manager',
      email: email || '',
    });

    res.json({ token, role: 'manager', name: name || 'Manager' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Metadata
router.get('/meta', (_req, res) => {
  res.json({ incidentTypes: INCIDENT_TYPES, statuses: STATUSES });
});

// List reports
router.get('/', async (req, res) => {
  try {
    const { search = '', status = '', page = '1', limit = '10', sort = 'desc' } = req.query;
    const result = await listTheftReports({
      search,
      status,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 50),
      sort,
    });
    res.json(result);
  } catch (err) {
    console.error('List theft reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// Get single report
router.get('/:reportId', async (req, res) => {
  try {
    const isManager = req.headers.authorization || req.headers['x-manager-token'];
    const includeInternal = !!isManager;
    const report = await getTheftReportById(req.params.reportId, includeInternal);

    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report.' });
  }
});

// Submit new report (multipart)
router.post('/', upload.array('evidence', 10), async (req, res) => {
  try {
    const required = ['trackingNumber', 'shipmentId', 'incidentType', 'incidentDateTime', 'location', 'estimatedLossAmount', 'description'];
    for (const field of required) {
      if (!req.body[field]?.trim?.() && !req.body[field]) {
        return res.status(400).json({ error: `Field "${field}" is required.` });
      }
    }

    if (!INCIDENT_TYPES.includes(req.body.incidentType)) {
      return res.status(400).json({ error: `Invalid incident type.` });
    }

    const report = await createTheftReport(req.body, req.files || [], getBaseUrl(req));
    res.status(201).json(report);
  } catch (err) {
    console.error('Create theft report error:', err);
    res.status(500).json({ error: err.message || 'Failed to create report.' });
  }
});

// Update status (manager only)
router.patch('/:reportId/status', requireManager, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const report = await updateTheftReportStatus(
      req.params.reportId,
      status,
      req.user.name || 'Manager'
    );
    res.json(report);
  } catch (err) {
    res.status(err.message === 'Report not found' ? 404 : 400).json({ error: err.message });
  }
});

// Add investigation note (manager only)
router.post('/:reportId/notes', requireManager, async (req, res) => {
  try {
    const { note, isInternal = true } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: 'Note is required.' });

    const report = await addInvestigationNote(
      req.params.reportId,
      note.trim(),
      req.user.name || 'Manager',
      isInternal
    );
    res.json(report);
  } catch (err) {
    res.status(err.message === 'Report not found' ? 404 : 400).json({ error: err.message });
  }
});

module.exports = router;

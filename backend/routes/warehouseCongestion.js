const express = require('express');
const { requireManager } = require('../middleware/auth');
const {
  createRecord,
  saveAndPredict,
  predictForRecord,
  listRecords,
  listPredictions,
  getDashboardStats,
  getDriverView,
  listWarehouses,
} = require('../services/warehouseCongestionService');

const router = express.Router();

function optionalManager(req, _res, next) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const { JWT_SECRET } = require('../middleware/auth');
      req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    } catch { /* public access OK */ }
  }
  next();
}

router.get('/warehouses', async (_req, res) => {
  try {
    const warehouses = await listWarehouses();
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard', async (_req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/driver', async (req, res) => {
  try {
    const { warehouseId, arrivalTime } = req.query;
    if (!warehouseId) return res.status(400).json({ error: 'warehouseId is required.' });
    const view = await getDriverView(warehouseId, arrivalTime);
    res.json(view);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/predictions', async (req, res) => {
  try {
    const { warehouseId, congestionLevel, dateFrom, dateTo, page, limit } = req.query;
    const result = await listPredictions({
      warehouseId,
      congestionLevel,
      dateFrom,
      dateTo,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 20, 50),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/records', async (req, res) => {
  try {
    const { warehouseId, congestionLevel, dateFrom, dateTo, page, limit } = req.query;
    const result = await listRecords({
      warehouseId,
      congestionLevel,
      dateFrom,
      dateTo,
      page: parseInt(page, 10) || 1,
      limit: Math.min(parseInt(limit, 10) || 10, 50),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/records/:recordId', async (req, res) => {
  try {
    const WarehouseCongestionRecord = require('../models/WarehouseCongestionRecord');
    const WarehouseCongestionPrediction = require('../models/WarehouseCongestionPrediction');
    const record = await WarehouseCongestionRecord.findOne({ recordId: req.params.recordId }).lean();
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    const predictions = await WarehouseCongestionPrediction.find({ recordId: record.recordId })
      .sort({ createdAt: -1 }).lean();
    res.json({ record, predictions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/records', optionalManager, async (req, res) => {
  try {
    const createdBy = req.user?.name || req.body.createdBy || 'Warehouse Manager';
    const record = await createRecord(req.body, createdBy);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/records/predict', optionalManager, async (req, res) => {
  try {
    const createdBy = req.user?.name || req.body.createdBy || 'Warehouse Manager';
    const { record, prediction } = await saveAndPredict(req.body, createdBy);
    res.status(201).json({ record, prediction });
  } catch (err) {
    console.error('Predict error:', err);
    res.status(500).json({ error: err.message || 'Prediction failed.' });
  }
});

router.post('/records/:recordId/predict', requireManager, async (req, res) => {
  try {
    const { record, prediction } = await predictForRecord(req.params.recordId);
    res.json({ record, prediction });
  } catch (err) {
    res.status(err.message === 'Record not found' ? 404 : 500).json({ error: err.message });
  }
});

module.exports = router;

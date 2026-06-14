const crypto = require('crypto');
const WarehouseCongestionRecord = require('../models/WarehouseCongestionRecord');
const WarehouseCongestionPrediction = require('../models/WarehouseCongestionPrediction');
const { predictWithGemini } = require('./geminiService');
const { notifyCongestionAlert } = require('./notificationService');

function generateId(prefix) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}

function sanitizeRecordBody(body) {
  const numericFields = [
    'dockCount', 'warehouseCapacity', 'trucksScheduledNextHour', 'trucksScheduledNext2Hours',
    'trucksCurrentlyInside', 'trucksWaitingOutside', 'avgUnloadTime', 'avgLoadTime',
    'trafficDelay', 'activeWorkers', 'dockUtilization',
  ];
  const data = { ...body };
  for (const f of numericFields) {
    if (data[f] !== undefined && data[f] !== '' && data[f] !== null) {
      data[f] = parseFloat(data[f]);
    } else {
      delete data[f];
    }
  }
  return data;
}

async function getHistoricalSummaries(warehouseId, limit = 5) {
  if (!warehouseId) return [];
  const preds = await WarehouseCongestionPrediction.find({ warehouseId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return preds.map((p) => ({
    date: p.createdAt,
    congestionScore: p.congestionScore,
    predictedWaitTimeMinutes: p.predictedWaitTimeMinutes,
    congestionLevel: p.congestionLevel,
  }));
}

async function createRecord(body, createdBy = 'Warehouse Manager') {
  const data = sanitizeRecordBody(body);
  const record = new WarehouseCongestionRecord({
    recordId: generateId('WC'),
    ...data,
    createdBy,
  });
  await record.save();
  return record;
}

async function runPrediction(record, historicalSummaries) {
  const recordObj = record.toObject ? record.toObject() : record;
  const aiResult = await predictWithGemini(recordObj, historicalSummaries);

  const prediction = new WarehouseCongestionPrediction({
    predictionId: generateId('WP'),
    recordId: recordObj.recordId,
    warehouseId: recordObj.warehouseId || '',
    warehouseName: recordObj.warehouseName || 'Unknown Warehouse',
    congestionLevel: aiResult.congestion_level,
    congestionScore: aiResult.congestion_score,
    predictedWaitTimeMinutes: aiResult.predicted_wait_time_minutes,
    recommendedArrivalWindow: aiResult.recommended_arrival_window,
    riskFactors: aiResult.risk_factors || [],
    recommendations: aiResult.recommendations || [],
    confidenceScore: aiResult.confidence_score,
    aiResponse: aiResult,
  });

  await prediction.save();

  const dockUtil = recordObj.dockUtilization || 0;
  const shouldAlert =
    prediction.congestionScore > 70 ||
    prediction.predictedWaitTimeMinutes > 30 ||
    dockUtil > 90;

  if (shouldAlert) {
    notifyCongestionAlert(recordObj, prediction.toObject()).catch(console.error);
    prediction.alertSent = true;
    await prediction.save();
  }

  return prediction;
}

async function saveAndPredict(body, createdBy) {
  const record = await createRecord(body, createdBy);
  const history = await getHistoricalSummaries(record.warehouseId);
  const prediction = await runPrediction(record, history);
  return { record, prediction };
}

async function predictForRecord(recordId) {
  const record = await WarehouseCongestionRecord.findOne({ recordId });
  if (!record) throw new Error('Record not found');
  const history = await getHistoricalSummaries(record.warehouseId);
  const prediction = await runPrediction(record, history);
  return { record, prediction };
}

async function listRecords({ warehouseId, congestionLevel, dateFrom, dateTo, page = 1, limit = 10 }) {
  const query = {};

  if (warehouseId) query.warehouseId = warehouseId;

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  let recordIds = null;
  if (congestionLevel) {
    const preds = await WarehouseCongestionPrediction.find({ congestionLevel })
      .select('recordId')
      .lean();
    recordIds = preds.map((p) => p.recordId);
    if (recordIds.length === 0) return { records: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    query.recordId = { $in: recordIds };
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [records, total] = await Promise.all([
    WarehouseCongestionRecord.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WarehouseCongestionRecord.countDocuments(query),
  ]);

  const ids = records.map((r) => r.recordId);
  const predictions = await WarehouseCongestionPrediction.find({ recordId: { $in: ids } })
    .sort({ createdAt: -1 })
    .lean();

  const predMap = {};
  for (const p of predictions) {
    if (!predMap[p.recordId]) predMap[p.recordId] = p;
  }

  return {
    records: records.map((r) => ({ ...r, latestPrediction: predMap[r.recordId] || null })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function listPredictions({ warehouseId, congestionLevel, dateFrom, dateTo, page = 1, limit = 20 }) {
  const query = {};
  if (warehouseId) query.warehouseId = warehouseId;
  if (congestionLevel) query.congestionLevel = congestionLevel;
  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
    if (dateTo) query.createdAt.$lte = new Date(dateTo);
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const [predictions, total] = await Promise.all([
    WarehouseCongestionPrediction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WarehouseCongestionPrediction.countDocuments(query),
  ]);

  return {
    predictions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getDashboardStats() {
  const [
    totalRecords,
    totalPredictions,
    warehouses,
    recentPredictions,
    highCongestion,
    criticalCongestion,
  ] = await Promise.all([
    WarehouseCongestionRecord.countDocuments(),
    WarehouseCongestionPrediction.countDocuments(),
    WarehouseCongestionRecord.distinct('warehouseId'),
    WarehouseCongestionPrediction.find().sort({ createdAt: -1 }).limit(30).lean(),
    WarehouseCongestionPrediction.countDocuments({ congestionLevel: 'High' }),
    WarehouseCongestionPrediction.countDocuments({ congestionLevel: 'Critical' }),
  ]);

  const avgWait = recentPredictions.length
    ? Math.round(recentPredictions.reduce((s, p) => s + (p.predictedWaitTimeMinutes || 0), 0) / recentPredictions.length)
    : 0;

  const avgScore = recentPredictions.length
    ? Math.round(recentPredictions.reduce((s, p) => s + (p.congestionScore || 0), 0) / recentPredictions.length)
    : 0;

  const trendData = recentPredictions.slice().reverse().map((p) => ({
    date: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    congestionScore: p.congestionScore,
    waitTime: p.predictedWaitTimeMinutes,
    warehouse: p.warehouseName || p.warehouseId,
  }));

  const warehouseNames = await WarehouseCongestionRecord.distinct('warehouseName');

  return {
    totalWarehouses: warehouses.filter(Boolean).length,
    totalRecords,
    activePredictions: totalPredictions,
    highCongestionCount: highCongestion,
    criticalCongestionCount: criticalCongestion,
    averageWaitTimeMinutes: avgWait,
    averageCongestionScore: avgScore,
    trendData,
    warehouseList: warehouses.filter(Boolean).map((id, i) => ({
      warehouseId: id,
      warehouseName: warehouseNames[i] || id,
    })),
  };
}

async function getDriverView(warehouseId, arrivalTime) {
  const latestRecord = await WarehouseCongestionRecord.findOne({ warehouseId })
    .sort({ createdAt: -1 })
    .lean();

  const latestPrediction = await WarehouseCongestionPrediction.findOne({ warehouseId })
    .sort({ createdAt: -1 })
    .lean();

  if (!latestRecord && !latestPrediction) {
    return {
      warehouseId,
      warehouseName: warehouseId,
      message: 'No congestion data available for this warehouse yet.',
      congestionLevel: 'Unknown',
      congestionScore: null,
      predictedWaitTimeMinutes: null,
      recommendedArrivalWindow: null,
      recommendations: ['Contact warehouse dispatch for current wait times'],
      reasoning: 'No historical or operational data on file.',
    };
  }

  if (arrivalTime && latestRecord) {
    const merged = { ...latestRecord, arrivalTime };
    const history = await getHistoricalSummaries(warehouseId);
    const aiResult = await predictWithGemini(merged, history);
    return {
      warehouseId,
      warehouseName: latestRecord.warehouseName || warehouseId,
      arrivalTime,
      congestionLevel: aiResult.congestion_level,
      congestionScore: aiResult.congestion_score,
      predictedWaitTimeMinutes: aiResult.predicted_wait_time_minutes,
      recommendedArrivalWindow: aiResult.recommended_arrival_window,
      riskFactors: aiResult.risk_factors,
      recommendations: aiResult.recommendations,
      reasoning: aiResult.reasoning,
      confidenceScore: aiResult.confidence_score,
      source: aiResult.source,
      basedOnRecord: latestRecord.recordId,
    };
  }

  return {
    warehouseId,
    warehouseName: latestPrediction?.warehouseName || latestRecord?.warehouseName || warehouseId,
    congestionLevel: latestPrediction?.congestionLevel || 'Unknown',
    congestionScore: latestPrediction?.congestionScore,
    predictedWaitTimeMinutes: latestPrediction?.predictedWaitTimeMinutes,
    recommendedArrivalWindow: latestPrediction?.recommendedArrivalWindow,
    riskFactors: latestPrediction?.riskFactors,
    recommendations: latestPrediction?.recommendations,
    reasoning: latestPrediction?.aiResponse?.reasoning || 'Based on latest warehouse operational snapshot.',
    confidenceScore: latestPrediction?.confidenceScore,
    lastUpdated: latestPrediction?.createdAt,
  };
}

async function listWarehouses() {
  const records = await WarehouseCongestionRecord.aggregate([
    { $match: { warehouseId: { $ne: null, $ne: '' } } },
    { $group: {
      _id: '$warehouseId',
      warehouseName: { $last: '$warehouseName' },
      location: { $last: '$location' },
      lastUpdated: { $max: '$createdAt' },
    }},
    { $sort: { lastUpdated: -1 } },
  ]);

  return records.map((r) => ({
    warehouseId: r._id,
    warehouseName: r.warehouseName || r._id,
    location: r.location,
    lastUpdated: r.lastUpdated,
  }));
}

module.exports = {
  createRecord,
  saveAndPredict,
  predictForRecord,
  listRecords,
  listPredictions,
  getDashboardStats,
  getDriverView,
  listWarehouses,
};

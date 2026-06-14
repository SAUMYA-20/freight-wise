const mongoose = require('mongoose');

const CONGESTION_LEVELS = ['Low', 'Moderate', 'High', 'Critical'];

const warehouseCongestionPredictionSchema = new mongoose.Schema({
  predictionId: { type: String, unique: true, index: true },
  recordId: { type: String, required: true, index: true },
  warehouseId: { type: String, index: true },
  warehouseName: { type: String },
  congestionLevel: { type: String, enum: CONGESTION_LEVELS },
  congestionScore: { type: Number, min: 0, max: 100 },
  predictedWaitTimeMinutes: { type: Number },
  recommendedArrivalWindow: { type: String },
  riskFactors: [{ type: String }],
  recommendations: [{ type: String }],
  confidenceScore: { type: Number, min: 0, max: 100 },
  aiResponse: { type: mongoose.Schema.Types.Mixed },
  alertSent: { type: Boolean, default: false },
}, { timestamps: true, collection: 'warehouse_congestion_predictions' });

warehouseCongestionPredictionSchema.index({ createdAt: -1 });
warehouseCongestionPredictionSchema.index({ congestionLevel: 1 });

module.exports = mongoose.model('WarehouseCongestionPrediction', warehouseCongestionPredictionSchema);
module.exports.CONGESTION_LEVELS = CONGESTION_LEVELS;

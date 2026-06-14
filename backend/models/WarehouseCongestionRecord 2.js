const mongoose = require('mongoose');

const warehouseCongestionRecordSchema = new mongoose.Schema({
  recordId: { type: String, unique: true, index: true },
  warehouseId: { type: String, index: true },
  warehouseName: { type: String, index: true },
  location: { type: String },
  dockCount: { type: Number },
  warehouseCapacity: { type: Number },
  arrivalTime: { type: String },
  dayOfWeek: { type: String },
  month: { type: String },
  trucksScheduledNextHour: { type: Number },
  trucksScheduledNext2Hours: { type: Number },
  trucksCurrentlyInside: { type: Number },
  trucksWaitingOutside: { type: Number },
  avgUnloadTime: { type: Number },
  avgLoadTime: { type: Number },
  weather: { type: String },
  holiday: { type: String },
  trafficDelay: { type: Number },
  festivalEventNearby: { type: String },
  activeWorkers: { type: Number },
  equipmentAvailability: { type: String },
  forkliftAvailability: { type: String },
  dockUtilization: { type: Number },
  notes: { type: String },
  createdBy: { type: String, default: 'Warehouse Manager' },
}, { timestamps: true, collection: 'warehouse_congestion_records' });

warehouseCongestionRecordSchema.index({ createdAt: -1 });
warehouseCongestionRecordSchema.index({ warehouseId: 1, createdAt: -1 });

module.exports = mongoose.model('WarehouseCongestionRecord', warehouseCongestionRecordSchema);

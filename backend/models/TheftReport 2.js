const mongoose = require('mongoose');

const EVIDENCE_TYPES = ['image', 'video', 'pdf', 'other'];
const INCIDENT_TYPES = [
  'Package Theft',
  'Cargo Theft',
  'Vehicle Theft',
  'Equipment Theft',
  'Other',
];
const STATUSES = ['Reported', 'Under Investigation', 'Resolved', 'Closed'];

const evidenceSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  type: { type: String, enum: EVIDENCE_TYPES, default: 'other' },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const timelineEntrySchema = new mongoose.Schema({
  action: { type: String, required: true },
  message: { type: String, required: true },
  actor: { type: String, default: 'System' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const investigationNoteSchema = new mongoose.Schema({
  note: { type: String, required: true },
  author: { type: String, required: true },
  isInternal: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const theftReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true, index: true },
  trackingNumber: { type: String, required: true, index: true },
  shipmentId: { type: String, required: true, index: true },
  incidentType: { type: String, enum: INCIDENT_TYPES, required: true },
  incidentDateTime: { type: Date, required: true },
  location: { type: String, required: true },
  estimatedLossAmount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  status: { type: String, enum: STATUSES, default: 'Reported', index: true },
  evidence: [evidenceSchema],
  investigationNotes: [investigationNoteSchema],
  timeline: [timelineEntrySchema],
  reporterName: { type: String },
  reporterEmail: { type: String },
  reporterPhone: { type: String },
}, { timestamps: true });

theftReportSchema.index({ createdAt: -1 });
theftReportSchema.index({ trackingNumber: 'text', shipmentId: 'text', reportId: 'text', location: 'text' });

module.exports = mongoose.model('TheftReport', theftReportSchema);
module.exports.INCIDENT_TYPES = INCIDENT_TYPES;
module.exports.STATUSES = STATUSES;

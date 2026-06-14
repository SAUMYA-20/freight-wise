const crypto = require('crypto');
const path = require('path');
const TheftReport = require('../models/TheftReport');
const { STATUSES } = require('../models/TheftReport');
const { notifyTheftReportSubmitted, notifyStatusChange } = require('./notificationService');

function generateReportId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TR-${date}-${suffix}`;
}

function classifyEvidenceType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'other';
}

function buildEvidenceRecords(files, baseUrl) {
  return files.map((file) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    url: `${baseUrl}/uploads/theft-reports/${file.filename}`,
    type: classifyEvidenceType(file.mimetype),
  }));
}

async function createTheftReport(data, files = [], baseUrl = '') {
  const reportId = generateReportId();
  const evidence = buildEvidenceRecords(files, baseUrl);

  const report = new TheftReport({
    reportId,
    trackingNumber: data.trackingNumber,
    shipmentId: data.shipmentId,
    incidentType: data.incidentType,
    incidentDateTime: new Date(data.incidentDateTime),
    location: data.location,
    estimatedLossAmount: parseFloat(data.estimatedLossAmount),
    description: data.description,
    status: 'Reported',
    evidence,
    reporterName: data.reporterName || '',
    reporterEmail: data.reporterEmail || '',
    reporterPhone: data.reporterPhone || '',
    timeline: [{
      action: 'report_submitted',
      message: 'Theft report submitted and logged.',
      actor: data.reporterName || 'Reporter',
    }],
  });

  await report.save();

  notifyTheftReportSubmitted(report.toObject()).catch((err) => {
    console.error('Failed to send theft report notification:', err.message);
  });

  return report;
}

async function listTheftReports({
  search = '',
  status = '',
  page = 1,
  limit = 10,
  sort = 'desc',
}) {
  const query = {};

  if (status && STATUSES.includes(status)) {
    query.status = status;
  }

  if (search.trim()) {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { reportId: regex },
      { trackingNumber: regex },
      { shipmentId: regex },
      { location: regex },
      { incidentType: regex },
    ];
  }

  const skip = (Math.max(1, page) - 1) * limit;
  const sortOrder = sort === 'asc' ? 1 : -1;

  const [reports, total] = await Promise.all([
    TheftReport.find(query)
      .select('-investigationNotes -timeline -evidence')
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    TheftReport.countDocuments(query),
  ]);

  return {
    reports,
    pagination: {
      page: Math.max(1, page),
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getTheftReportById(reportId, includeInternal = false) {
  const report = await TheftReport.findOne({ reportId }).lean();
  if (!report) return null;

  if (!includeInternal) {
    report.investigationNotes = (report.investigationNotes || []).filter((n) => !n.isInternal);
  }

  return report;
}

async function updateTheftReportStatus(reportId, status, actor) {
  if (!STATUSES.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${STATUSES.join(', ')}`);
  }

  const report = await TheftReport.findOne({ reportId });
  if (!report) throw new Error('Report not found');

  const previousStatus = report.status;
  if (previousStatus === status) return report;

  report.status = status;
  report.timeline.push({
    action: 'status_change',
    message: `Status changed from "${previousStatus}" to "${status}".`,
    actor,
    metadata: { previousStatus, newStatus: status },
  });

  await report.save();

  notifyStatusChange(report.toObject(), previousStatus, actor).catch(console.error);
  return report;
}

async function addInvestigationNote(reportId, note, author, isInternal = true) {
  const report = await TheftReport.findOne({ reportId });
  if (!report) throw new Error('Report not found');

  report.investigationNotes.push({ note, author, isInternal });
  report.timeline.push({
    action: 'note_added',
    message: isInternal ? 'Internal investigation note added.' : 'Investigation note added.',
    actor: author,
  });

  await report.save();
  return report;
}

module.exports = {
  createTheftReport,
  listTheftReports,
  getTheftReportById,
  updateTheftReportStatus,
  addInvestigationNote,
  STATUSES,
};

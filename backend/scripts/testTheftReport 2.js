require('dotenv').config();
const mongoose = require('mongoose');
const { createTheftReport, listTheftReports } = require('../services/theftReportService');

async function test() {
  if (!process.env.MONGODB_URI) {
    console.log('SKIP: No MONGODB_URI configured');
    process.exit(0);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const report = await createTheftReport({
    trackingNumber: 'TRK-TEST-001',
    shipmentId: 'SHP-TEST-001',
    incidentType: 'Cargo Theft',
    incidentDateTime: new Date().toISOString(),
    location: 'Port of Los Angeles',
    estimatedLossAmount: 12500,
    description: 'Integration test theft report',
    reporterName: 'Test User',
  }, [], 'http://localhost:5000');
  console.log('Created:', report.reportId, report.status);

  const list = await listTheftReports({ search: report.reportId });
  console.log('Listed:', list.reports.length, 'report(s)');
  process.exit(0);
}

test().catch((e) => { console.error('ERR:', e.message); process.exit(1); });

/**
 * Production notification service for theft report alerts.
 * Supports: Resend (email), Slack webhook, Microsoft Teams webhook.
 * Falls back to structured console logging when no keys are configured.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFICATION_FROM = process.env.NOTIFICATION_FROM || 'alerts@zodfaraway.com';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'operations@zodfaraway.com';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

async function sendEmail({ subject, html, text }) {
  if (!RESEND_API_KEY) return { channel: 'email', sent: false, reason: 'RESEND_API_KEY not configured' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: NOTIFICATION_FROM,
      to: [NOTIFICATION_EMAIL],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend API error: ${err}`);
  }

  const data = await res.json();
  return { channel: 'email', sent: true, id: data.id };
}

async function sendSlack(message) {
  if (!SLACK_WEBHOOK_URL) return { channel: 'slack', sent: false, reason: 'SLACK_WEBHOOK_URL not configured' };

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });

  if (!res.ok) throw new Error(`Slack webhook error: HTTP ${res.status}`);
  return { channel: 'slack', sent: true };
}

async function sendTeams(title, message) {
  if (!TEAMS_WEBHOOK_URL) return { channel: 'teams', sent: false, reason: 'TEAMS_WEBHOOK_URL not configured' };

  const res = await fetch(TEAMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: 'DC2626',
      summary: title,
      sections: [{ activityTitle: title, activitySubtitle: message }],
    }),
  });

  if (!res.ok) throw new Error(`Teams webhook error: HTTP ${res.status}`);
  return { channel: 'teams', sent: true };
}

function buildTheftAlertContent(report) {
  const url = `${APP_BASE_URL}/theft-reports/${report.reportId}`;
  const subject = `[URGENT] Theft Report ${report.reportId} — ${report.incidentType}`;
  const text = [
    `New theft incident reported: ${report.reportId}`,
    `Type: ${report.incidentType}`,
    `Tracking: ${report.trackingNumber}`,
    `Shipment: ${report.shipmentId}`,
    `Location: ${report.location}`,
    `Estimated Loss: $${report.estimatedLossAmount.toLocaleString()}`,
    `Status: ${report.status}`,
    `View: ${url}`,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px">
      <h2 style="color:#DC2626">Theft Incident Reported</h2>
      <p><strong>Report ID:</strong> ${report.reportId}</p>
      <p><strong>Incident Type:</strong> ${report.incidentType}</p>
      <p><strong>Tracking Number:</strong> ${report.trackingNumber}</p>
      <p><strong>Shipment ID:</strong> ${report.shipmentId}</p>
      <p><strong>Location:</strong> ${report.location}</p>
      <p><strong>Estimated Loss:</strong> $${report.estimatedLossAmount.toLocaleString()}</p>
      <p><strong>Incident Date:</strong> ${new Date(report.incidentDateTime).toLocaleString()}</p>
      <p><strong>Description:</strong> ${report.description}</p>
      <p><a href="${url}" style="background:#0066FF;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">View Report</a></p>
    </div>`;

  const slackMessage = `🚨 *Theft Report ${report.reportId}*\n` +
    `*Type:* ${report.incidentType}\n` +
    `*Tracking:* ${report.trackingNumber} | *Shipment:* ${report.shipmentId}\n` +
    `*Location:* ${report.location}\n` +
    `*Loss:* $${report.estimatedLossAmount.toLocaleString()}\n` +
    `<${url}|View Report>`;

  return { subject, text, html, slackMessage };
}

async function notifyTheftReportSubmitted(report) {
  const content = buildTheftAlertContent(report);
  const results = [];

  for (const fn of [
    () => sendEmail(content),
    () => sendSlack(content.slackMessage),
    () => sendTeams(`Theft Report ${report.reportId}`, content.text),
  ]) {
    try {
      results.push(await fn());
    } catch (err) {
      console.error('Notification channel failed:', err.message);
      results.push({ sent: false, error: err.message });
    }
  }

  const anySent = results.some((r) => r.sent);
  if (!anySent) {
    console.log('[NOTIFICATION] Theft report alert (no channels configured):', content.text);
    results.push({ channel: 'console', sent: true });
  }

  return results;
}

async function notifyStatusChange(report, previousStatus, actor) {
  const url = `${APP_BASE_URL}/theft-reports/${report.reportId}`;
  const subject = `[UPDATE] Theft Report ${report.reportId} — ${previousStatus} → ${report.status}`;
  const text = `Report ${report.reportId} status changed from "${previousStatus}" to "${report.status}" by ${actor}.\nView: ${url}`;

  try {
    if (RESEND_API_KEY) {
      await sendEmail({ subject, text, html: `<p>${text.replace(/\n/g, '<br>')}</p>` });
    }
    if (SLACK_WEBHOOK_URL) {
      await sendSlack(`📋 *Status Update:* ${report.reportId}\n${previousStatus} → *${report.status}* (by ${actor})\n<${url}|View Report>`);
    }
  } catch (err) {
    console.error('Status notification failed:', err.message);
  }
}

async function notifyCongestionAlert(record, prediction) {
  const url = `${APP_BASE_URL}/warehouse-congestion/dashboard`;
  const dispatchEmail = process.env.DISPATCH_NOTIFICATION_EMAIL || NOTIFICATION_EMAIL;

  const subject = `[ALERT] Warehouse Congestion — ${prediction.warehouseName || record.warehouseName} (${prediction.congestionLevel})`;
  const text = [
    `Warehouse congestion alert for ${prediction.warehouseName || record.warehouseId}`,
    `Congestion Level: ${prediction.congestionLevel}`,
    `Congestion Score: ${prediction.congestionScore}/100`,
    `Predicted Wait: ${prediction.predictedWaitTimeMinutes} minutes`,
    `Recommended Arrival: ${prediction.recommendedArrivalWindow}`,
    `Dock Utilization: ${record.dockUtilization ?? 'N/A'}%`,
    `Risk Factors: ${(prediction.riskFactors || []).join(', ')}`,
    `View dashboard: ${url}`,
  ].join('\n');

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px">
      <h2 style="color:#EA580C">Warehouse Congestion Alert</h2>
      <p><strong>Warehouse:</strong> ${prediction.warehouseName || record.warehouseId}</p>
      <p><strong>Level:</strong> ${prediction.congestionLevel} (${prediction.congestionScore}/100)</p>
      <p><strong>Predicted Wait:</strong> ${prediction.predictedWaitTimeMinutes} min</p>
      <p><strong>Recommended Arrival:</strong> ${prediction.recommendedArrivalWindow}</p>
      <p><strong>Risks:</strong> ${(prediction.riskFactors || []).join(', ')}</p>
      <p><a href="${url}">View Dashboard</a></p>
    </div>`;

  const slackMessage = `⚠️ *Warehouse Congestion Alert*\n` +
    `*${prediction.warehouseName}* — ${prediction.congestionLevel} (${prediction.congestionScore}/100)\n` +
    `Wait: ${prediction.predictedWaitTimeMinutes} min | Slot: ${prediction.recommendedArrivalWindow}\n` +
    `<${url}|Dashboard>`;

  const results = [];
  for (const fn of [
    async () => {
      if (!RESEND_API_KEY) return { channel: 'email', sent: false };
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: NOTIFICATION_FROM,
          to: [NOTIFICATION_EMAIL, dispatchEmail].filter(Boolean),
          subject,
          html,
          text,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return { channel: 'email', sent: true };
    },
    () => sendSlack(slackMessage),
    () => sendTeams(`Congestion Alert: ${prediction.warehouseName}`, text),
  ]) {
    try {
      results.push(await fn());
    } catch (err) {
      console.error('Congestion alert channel failed:', err.message);
    }
  }

  if (!results.some((r) => r.sent)) {
    console.log('[NOTIFICATION] Warehouse congestion alert:', text);
  }
  return results;
}

module.exports = {
  notifyTheftReportSubmitted,
  notifyStatusChange,
  notifyCongestionAlert,
};


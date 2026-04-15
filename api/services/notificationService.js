'use strict';

/**
 * VendorIQ — Notification Service
 * ================================
 * Handles all outbound notifications:
 *   - Email via SendGrid
 *   - WhatsApp via 360dialog
 *
 * Used by:
 *   - worker/reportWorker.js   → report_complete email
 *   - worker/monitoringWorker.js → monitor alert email + WhatsApp
 *   - api/routes/subscriptions.js → billing event email
 */

const axios  = require('axios');
const logger = require('../utils/logger');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM       = process.env.EMAIL_FROM || 'reports@vendoriq.in';
const WHATSAPP_KEY     = process.env.WHATSAPP_API_KEY;
const WHATSAPP_NUMBER  = process.env.WHATSAPP_SENDER_NUMBER;

// ── Helpers ────────────────────────────────────────────────────────────────

function riskColor(level) {
  return level === 'HIGH' ? '#DC2626' : level === 'MEDIUM' ? '#F59E0B' : '#16A34A';
}

function baseHtml(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body { margin:0; padding:0; background:#0F172A; font-family:'Segoe UI',Arial,sans-serif; color:#E2E8F0; }
  .wrap { max-width:600px; margin:40px auto; background:#1E293B; border-radius:16px; overflow:hidden; border:1px solid #334155; }
  .header { background:#1A56DB; padding:28px 32px; }
  .header h1 { margin:0; font-size:22px; color:#fff; letter-spacing:-0.5px; }
  .header p  { margin:4px 0 0; font-size:13px; color:#93C5FD; }
  .body { padding:32px; }
  .score-card { background:#0F172A; border-radius:12px; padding:20px 24px; margin:20px 0; border:1px solid #334155; }
  .score-num { font-size:48px; font-weight:700; font-family:monospace; }
  .badge { display:inline-block; padding:4px 12px; border-radius:99px; font-size:12px; font-weight:700; letter-spacing:1px; }
  .flag { background:#1E293B; border:1px solid #475569; border-radius:8px; padding:12px 16px; margin:8px 0; font-size:13px; }
  .flag.critical { border-color:#DC2626; background:#450A0A; }
  .btn { display:inline-block; background:#1A56DB; color:#fff; text-decoration:none; padding:14px 28px; border-radius:10px; font-weight:600; font-size:14px; margin-top:24px; }
  .footer { padding:20px 32px; border-top:1px solid #334155; font-size:12px; color:#64748B; }
</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

// ── SendGrid core ──────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text }) {
  if (!SENDGRID_API_KEY) {
    logger.warn('SendGrid not configured — skipping email', { to, subject });
    return false;
  }
  try {
    await axios.post('https://api.sendgrid.com/v3/mail/send', {
      personalizations: [{ to: [{ email: to }] }],
      from:    { email: EMAIL_FROM, name: 'VendorIQ' },
      subject,
      content: [
        { type: 'text/plain', value: text || subject },
        { type: 'text/html',  value: html },
      ],
    }, {
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });
    logger.info('Email sent', { to, subject });
    return true;
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.response?.data || err.message });
    return false;
  }
}

// ── WhatsApp (360dialog) ───────────────────────────────────────────────────

async function sendWhatsApp(phone, templateName, components = []) {
  if (!WHATSAPP_KEY || !WHATSAPP_NUMBER) {
    logger.warn('WhatsApp not configured — skipping', { phone, template: templateName });
    return false;
  }
  // Sanitize phone: must be E.164 format like 919876543210 (no +)
  const cleaned = phone.replace(/\D/g, '').replace(/^0/, '91');
  try {
    await axios.post('https://waba.360dialog.io/v1/messages', {
      messaging_product: 'whatsapp',
      to:   cleaned,
      type: 'template',
      template: {
        name:       templateName,
        language:   { code: 'en' },
        components,
      },
    }, {
      headers: {
        'D360-API-KEY': WHATSAPP_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 8000,
    });
    logger.info('WhatsApp sent', { phone: cleaned, template: templateName });
    return true;
  } catch (err) {
    logger.error('WhatsApp send failed', { phone: cleaned, template: templateName, error: err.response?.data || err.message });
    return false;
  }
}

// ── Public notification functions ──────────────────────────────────────────

/**
 * Sent when a report finishes processing (status: complete).
 * Triggered by worker/reportWorker.js after PDF upload.
 */
async function notifyReportComplete({ userEmail, userName, vendorName, vhsScore, riskLevel, reportUrl, pdfUrl }) {
  const color = riskColor(riskLevel);
  const html = baseHtml('Your VendorIQ Report is Ready', `
    <div class="header">
      <h1>VendorIQ</h1>
      <p>Your vendor report is ready</p>
    </div>
    <div class="body">
      <p style="margin:0 0 4px;color:#94A3B8;font-size:13px;">Hello ${userName || 'there'},</p>
      <p style="margin:0 0 24px;font-size:15px;">Your risk report for <strong>${vendorName}</strong> has been generated.</p>
      <div class="score-card">
        <div style="color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Vendor Health Score</div>
        <div class="score-num" style="color:${color}">${vhsScore}</div>
        <div style="margin-top:8px">
          <span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${riskLevel} RISK</span>
        </div>
      </div>
      <a href="${reportUrl}" class="btn">View Full Report →</a>
      ${pdfUrl ? `<a href="${pdfUrl}" class="btn" style="margin-left:12px;background:#1E293B;border:1px solid #334155">Download PDF</a>` : ''}
    </div>
    <div class="footer">
      <p>VendorIQ · AI-powered vendor due diligence · <a href="https://vendoriq.in" style="color:#1A56DB">vendoriq.in</a></p>
      <p style="margin-top:4px">This report is valid for 90 days. Report any issues to support@vendoriq.in</p>
    </div>
  `);

  return sendEmail({
    to: userEmail,
    subject: `Report Ready: ${vendorName} — VHS ${vhsScore} (${riskLevel} RISK)`,
    html,
    text: `Your VendorIQ report for ${vendorName} is ready. VHS Score: ${vhsScore} | Risk: ${riskLevel}\nView at: ${reportUrl}`,
  });
}

/**
 * Sent when a monitored vendor's VHS drops significantly or gains a hard flag.
 * Triggered by worker/monitoringWorker.js
 */
async function notifyMonitorAlert({ userEmail, userName, userPhone, vendorName, vendorCin, oldVhs, newVhs, newFlags, reportUrl }) {
  const dropped  = oldVhs !== null && newVhs !== null && (oldVhs - newVhs) >= 10;
  const hasFlags = newFlags && newFlags.length > 0;
  const subject  = hasFlags
    ? `🚨 Alert: ${vendorName} has a new hard flag`
    : `⚠️ Alert: ${vendorName} VHS dropped ${oldVhs} → ${newVhs}`;

  const html = baseHtml('VendorIQ Monitor Alert', `
    <div class="header" style="background:#7F1D1D">
      <h1>VendorIQ Monitor Alert</h1>
      <p>A monitored vendor requires your attention</p>
    </div>
    <div class="body">
      <p style="margin:0 0 4px;color:#94A3B8;font-size:13px;">Hello ${userName || 'there'},</p>
      <p style="margin:0 0 24px;font-size:15px;">A change was detected for <strong>${vendorName}</strong> (${vendorCin}).</p>

      ${dropped ? `
        <div class="score-card">
          <div style="color:#94A3B8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">VHS Score Change</div>
          <div style="display:flex;align-items:center;gap:16px">
            <div>
              <div style="font-size:12px;color:#64748B;margin-bottom:4px">Previous</div>
              <div style="font-size:32px;font-weight:700;font-family:monospace;color:#94A3B8">${oldVhs}</div>
            </div>
            <div style="font-size:24px;color:#DC2626">→</div>
            <div>
              <div style="font-size:12px;color:#64748B;margin-bottom:4px">Current</div>
              <div style="font-size:32px;font-weight:700;font-family:monospace;color:#DC2626">${newVhs}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${hasFlags ? `
        <div style="margin:20px 0">
          <div style="font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">New Hard Flags</div>
          ${newFlags.map(f => `<div class="flag critical">🚨 ${f.message || f.code}</div>`).join('')}
        </div>
      ` : ''}

      <a href="${reportUrl}" class="btn">View Updated Report →</a>
    </div>
    <div class="footer">
      <p>You are receiving this because you have monitoring enabled for ${vendorName}.</p>
      <p><a href="https://vendoriq.in/monitoring" style="color:#1A56DB">Manage your monitors</a> · VendorIQ</p>
    </div>
  `);

  // Send email
  const emailSent = await sendEmail({ to: userEmail, subject, html, text: subject });

  // Send WhatsApp if phone available
  let waSent = false;
  if (userPhone) {
    waSent = await sendWhatsApp(userPhone, 'vendoriq_monitor_alert', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: userName || 'there' },
          { type: 'text', text: vendorName },
          { type: 'text', text: String(newVhs ?? 'N/A') },
          { type: 'text', text: hasFlags ? newFlags.map(f => f.code).join(', ') : 'Score drop' },
          { type: 'text', text: reportUrl },
        ],
      },
    ]);
  }

  return { emailSent, waSent };
}

/**
 * Sent when a bulk audit job completes.
 * Triggered by worker/bulkAuditWorker.js
 */
async function notifyBulkAuditComplete({ userEmail, userName, totalCins, completed, failed, downloadUrl }) {
  const html = baseHtml('Bulk Audit Complete', `
    <div class="header">
      <h1>VendorIQ</h1>
      <p>Your bulk audit is complete</p>
    </div>
    <div class="body">
      <p>Hello ${userName || 'there'}, your bulk audit has finished processing.</p>
      <div class="score-card">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center">
          <div>
            <div style="font-size:28px;font-weight:700;font-family:monospace;color:#E2E8F0">${totalCins}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px">Total</div>
          </div>
          <div>
            <div style="font-size:28px;font-weight:700;font-family:monospace;color:#16A34A">${completed}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px">Complete</div>
          </div>
          <div>
            <div style="font-size:28px;font-weight:700;font-family:monospace;color:#DC2626">${failed}</div>
            <div style="font-size:11px;color:#64748B;margin-top:4px">Failed</div>
          </div>
        </div>
      </div>
      ${downloadUrl ? `<a href="${downloadUrl}" class="btn">Download Results CSV →</a>` : ''}
    </div>
    <div class="footer"><p>VendorIQ · <a href="https://vendoriq.in" style="color:#1A56DB">vendoriq.in</a></p></div>
  `);

  return sendEmail({
    to: userEmail,
    subject: `Bulk Audit Complete — ${completed}/${totalCins} reports ready`,
    html,
    text: `Your VendorIQ bulk audit is done. ${completed} of ${totalCins} reports completed. ${failed} failed.`,
  });
}

/**
 * Subscription lifecycle events — billing confirmation, cancellation.
 */
async function notifySubscriptionEvent({ userEmail, userName, event, planName, nextBillingDate }) {
  const subjects = {
    activated:  `Welcome to VendorIQ ${planName}!`,
    charged:    `Payment confirmed — VendorIQ ${planName}`,
    cancelled:  `Your VendorIQ ${planName} has been cancelled`,
    halted:     `Action required: VendorIQ payment failed`,
  };
  const subject = subjects[event] || `VendorIQ subscription update`;

  const html = baseHtml(subject, `
    <div class="header">
      <h1>VendorIQ</h1>
      <p>Subscription update</p>
    </div>
    <div class="body">
      <p>Hello ${userName || 'there'},</p>
      <p>${getSubscriptionMessage(event, planName, nextBillingDate)}</p>
      <a href="https://vendoriq.in/settings/billing" class="btn">Manage Billing →</a>
    </div>
    <div class="footer"><p>VendorIQ · <a href="https://vendoriq.in" style="color:#1A56DB">vendoriq.in</a></p></div>
  `);

  return sendEmail({ to: userEmail, subject, html });
}

function getSubscriptionMessage(event, planName, nextBillingDate) {
  const date = nextBillingDate ? new Date(nextBillingDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const msgs = {
    activated:  `Your <strong>${planName}</strong> subscription is now active. Enjoy unlimited vendor reports and monitoring. Next billing date: ${date}.`,
    charged:    `Your payment for <strong>${planName}</strong> was successful. Next billing date: ${date}.`,
    cancelled:  `Your <strong>${planName}</strong> subscription has been cancelled. You'll retain access until your current period ends.`,
    halted:     `We couldn't process your payment for <strong>${planName}</strong>. Please update your payment method to avoid losing access.`,
  };
  return msgs[event] || `Your subscription status has been updated.`;
}

module.exports = {
  sendEmail,
  sendWhatsApp,
  notifyReportComplete,
  notifyMonitorAlert,
  notifyBulkAuditComplete,
  notifySubscriptionEvent,
};

/**
 * notify.js — Real notification dispatch
 *
 * P1 → Email to digitalsocial2022@gmail.com + 0xxxcxy@gmail.com
 *       WhatsApp to +60163504840 AND +601121907916 (via UltraMsg bot)
 * P2 → Email to digitalsocial2022@gmail.com only
 *
 * Gmail sender: yynarrator@gmail.com
 *
 * ════════════════════════════════════════════
 * SETUP STEPS
 * ════════════════════════════════════════════
 *
 * ── 1. Gmail App Password (for email sending) ──────────────────────────────
 *   a. Sign in to yynarrator@gmail.com
 *   b. Go to: https://myaccount.google.com/apppasswords
 *   c. Create an App Password → App: "Mail", Device: "Other (ticketing)"
 *   d. Copy the 16-character password
 *   e. Set it in GMAIL_APP_PASSWORD below (or env var GMAIL_APP_PASSWORD)
 *
 * ── 2. UltraMsg WhatsApp Bot (sends to any number, no opt-in needed) ───────
 *   a. Go to https://app.ultramsg.com → Sign up (free trial available)
 *   b. Create an Instance → scan QR code with a dedicated WhatsApp number
 *      (use a spare phone or WhatsApp Business account for the bot)
 *   c. After connecting, go to Settings → get your Instance ID and Token
 *   d. Set ULTRAMSG_INSTANCE and ULTRAMSG_TOKEN below
 *
 *   API reference: https://docs.ultramsg.com/api/post/messages/chat
 * ════════════════════════════════════════════
 */

"use strict";

const nodemailer = require("nodemailer");
const https = require("https");

// ─── Configuration ────────────────────────────────────────────────────────────

const GMAIL_USER = process.env.GMAIL_USER || "yynarrator@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "hlua pdbk uclc flqu"; // ← 16-char Gmail App Password

const P1_EMAIL_RECIPIENTS = ["digitalsocial2022@gmail.com", "0xxxcxy@gmail.com"];
const P2_EMAIL_RECIPIENTS = ["digitalsocial2022@gmail.com", "0xxxcxy@gmail.com"];

// WhatsApp recipients for P1 (UltraMsg bot will message all of these)
const WHATSAPP_RECIPIENTS = [
  "60163504840",   // +60 16-350 4840
  "601121907916",  // +60 11-2190 7916
];

// UltraMsg credentials — get from https://app.ultramsg.com
const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || ""; // e.g. "instance12345"
const ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || ""; // e.g. "abc123xyz"

// ─────────────────────────────────────────────────────────────────────────────

function createEmailTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
}

function emailBody(ticket, user) {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨  NEW SUPPORT TICKET  [P${ticket.priority}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ticket ID  : ${ticket.id}
Priority   : P${ticket.priority}
Category   : ${ticket.issueType}
Department : ${ticket.department}

Summary:
  ${ticket.summary}

Submitted by:
  Name    : ${user.name}
  Email   : ${user.email}
  Phone   : ${ticket.contactPhone || user.phone || "-"}

Submitted at: ${new Date(ticket.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}

───────────────────────────
Log in to the admin console to review and respond.
───────────────────────────
  `.trim();
}

function whatsappMessage(ticket, user) {
  return (
    `🚨 *P${ticket.priority} TICKET ALERT*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `*ID:* ${ticket.id}\n` +
    `*Category:* ${ticket.issueType}\n` +
    `*Department:* ${ticket.department}\n\n` +
    `*Summary:*\n${ticket.summary}\n\n` +
    `*From:* ${user.name}\n` +
    `*Email:* ${user.email}\n` +
    `*Phone:* ${ticket.contactPhone || user.phone || "-"}\n\n` +
    `⏰ ${new Date(ticket.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}`
  );
}

async function sendEmail(recipients, ticket, user) {
  if (!GMAIL_APP_PASSWORD) {
    console.warn("[notify] GMAIL_APP_PASSWORD not set — skipping email.");
    return;
  }
  const transport = createEmailTransport();
  await transport.sendMail({
    from: `"SKM Support System" <${GMAIL_USER}>`,
    to: recipients.join(", "),
    subject: `[P${ticket.priority}] Support Ticket ${ticket.id} — ${ticket.issueType}`,
    text: emailBody(ticket, user),
  });
  console.log(`[notify] ✉️  Email sent to: ${recipients.join(", ")}`);
}

/**
 * Send a WhatsApp message to a single phone number via UltraMsg.
 * @param {string} phone   - Phone number without '+' e.g. "60163504840"
 * @param {string} message - Plain text message body
 */
function sendWhatsAppToNumber(phone, message) {
  return new Promise((resolve) => {
    const body = JSON.stringify({
      token: ULTRAMSG_TOKEN,
      to: phone,
      body: message,
    });

    const options = {
      hostname: "api.ultramsg.com",
      path: `/${ULTRAMSG_INSTANCE}/messages/chat`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        console.log(`[notify] 📱 WhatsApp → +${phone} | HTTP ${res.statusCode} | ${data.slice(0, 80)}`);
        resolve();
      });
    });

    req.on("error", (err) => {
      console.error(`[notify] WhatsApp error → +${phone}:`, err.message);
      resolve(); // don't let one failure block others
    });

    req.write(body);
    req.end();
  });
}

/**
 * Send a WhatsApp message to ALL configured WHATSAPP_RECIPIENTS in parallel.
 */
async function sendWhatsAppAll(ticket, user) {
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN) {
    console.warn("[notify] ULTRAMSG_INSTANCE or ULTRAMSG_TOKEN not set — skipping WhatsApp.");
    return;
  }
  const message = whatsappMessage(ticket, user);
  await Promise.all(WHATSAPP_RECIPIENTS.map((phone) => sendWhatsAppToNumber(phone, message)));
}

/**
 * Main entry point — dispatch notifications based on ticket priority.
 *
 * @param {object} ticket
 * @param {object} user
 */
async function dispatchNotification(ticket, user) {
  try {
    if (ticket.priority === 1) {
      // P1: email + WhatsApp to all configured recipients
      await Promise.all([
        sendEmail(P1_EMAIL_RECIPIENTS, ticket, user),
        sendWhatsAppAll(ticket, user),
      ]);
    } else if (ticket.priority === 2) {
      // P2: email only
      await sendEmail(P2_EMAIL_RECIPIENTS, ticket, user);
    }
    // P3: silent — no notification
  } catch (err) {
    console.error("[notify] Dispatch failed:", err.message);
  }
}

module.exports = { dispatchNotification };

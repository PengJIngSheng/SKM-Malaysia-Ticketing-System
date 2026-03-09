const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const { buildPdf, buildReport, reportToCsv } = require("./reporting");
const {
  classifyPriority,
  computeSlaDeadlines,
  normalizeKeywordList,
  validateAttachment,
} = require("./rules");
const {
  createId,
  createOtpCode,
  createSessionToken,
  hashPassword,
  loadEncryptedAttachment,
  saveEncryptedAttachment,
} = require("./security");
const { getAttachmentBucket } = require("./mongo");
const { ensureDataFile, mutateData, nowIso, readData } = require("./store");

const PUBLIC_DIR = path.join(process.cwd(), "public");
const PORT = Number(process.env.PORT || 3000);
const JSON_LIMIT_BYTES = 40 * 1024 * 1024;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, { "Content-Type": contentType });
  res.end(payload);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > JSON_LIMIT_BYTES) {
        reject(new Error("Request body too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new Error("Invalid JSON payload."));
      }
    });

    req.on("error", reject);
  });
}

function readStaticFile(filePath) {
  const resolved = path.normalize(filePath);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    return null;
  }
  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return null;
  }
  return fs.readFileSync(resolved);
}

function mimeTypeFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const map = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  return map[extension] || "application/octet-stream";
}

function getToken(req, urlObject) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  return urlObject.searchParams.get("token");
}

function sanitizeUser(user) {
  return {
    id: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    department: user.department,
    phone: user.phone,
    lastLoginAt: user.lastLoginAt || null,
  };
}

function sortDescByDate(items, field) {
  return [...items].sort((left, right) => new Date(right[field]) - new Date(left[field]));
}

function ticketSort(left, right) {
  return new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt);
}

function findSession(data, token) {
  if (!token) {
    return null;
  }

  const now = Date.now();
  data.sessions = data.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  const session = data.sessions.find((item) => item.token === token);
  if (!session) {
    return null;
  }

  const user = data.users.find((item) => item.id === session.userId);
  if (!user) {
    return null;
  }

  return { session, user };
}

function requireAuth(data, req, urlObject, allowedRoles) {
  const token = getToken(req, urlObject);
  const auth = findSession(data, token);
  if (!auth) {
    const error = new Error("Authentication required.");
    error.statusCode = 401;
    throw error;
  }

  if (allowedRoles && !allowedRoles.includes(auth.user.role)) {
    const error = new Error("Insufficient permissions.");
    error.statusCode = 403;
    throw error;
  }

  return { ...auth, token };
}

function respondError(res, error) {
  const statusCode = error.statusCode || 400;
  sendJson(res, statusCode, { error: error.message || "Unexpected error." });
}

function makeTicketId(data) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sameDayCount = data.tickets.filter((ticket) => ticket.id.includes(stamp)).length + 1;
  return `TKT-${stamp}-${String(sameDayCount).padStart(4, "0")}`;
}

function cleanBase64(value) {
  return String(value).includes(",") ? String(value).split(",").pop() : String(value);
}

function logAudit(data, { actorId, actorRole, action, entityType, entityId, details }) {
  data.auditLogs.unshift({
    id: createId("log"),
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    details,
    createdAt: nowIso(),
  });
  data.auditLogs = data.auditLogs.slice(0, 500);
}

function pushNotification(data, ticket, user, channel, payload) {
  data.notifications.unshift({
    id: createId("notif"),
    ticketId: ticket.id,
    channel,
    status: "queued",
    priority: ticket.priority,
    createdAt: nowIso(),
    payload,
  });
  data.notifications = data.notifications.slice(0, 200);

  logAudit(data, {
    actorId: "system",
    actorRole: "system",
    action: "notification_queued",
    entityType: "ticket",
    entityId: ticket.id,
    details: `${channel.toUpperCase()} notification queued for ${user.name}.`,
  });
}

function queueNotificationsForTicket(data, ticket) {
  const user = data.users.find((item) => item.id === ticket.userId);
  if (!user) {
    return;
  }

  if (ticket.priority === 1 && data.settings.notifications.enableWhatsappForP1) {
    pushNotification(
      data,
      ticket,
      user,
      "whatsapp",
      `Ticket ${ticket.id} | ${user.phone} | ${ticket.summary} | Attachments: ${ticket.attachments.length}`
    );
    return;
  }

  if (ticket.priority === 2 && data.settings.notifications.enableEmailForP2) {
    pushNotification(
      data,
      ticket,
      user,
      "email",
      `Email alert for ${ticket.id} (${ticket.department}) to ${data.settings.supportTeam.emailRecipients.join(", ")}`
    );
    return;
  }

  pushNotification(
    data,
    ticket,
    user,
    "dashboard",
    `Dashboard highlight for ${ticket.id} with priority ${ticket.priority}.`
  );
}

function normalizeStatus(status) {
  const allowed = new Set(["pending", "in_progress", "replied", "resolved"]);
  if (!allowed.has(status)) {
    throw new Error("Invalid ticket status.");
  }
  return status;
}

async function saveAttachments(data, { ticketId, uploader, attachments, role }) {
  const created = [];
  const bucket = await getAttachmentBucket();

  for (const attachment of attachments || []) {
    const buffer = Buffer.from(cleanBase64(attachment.base64), "base64");
    const normalizedAttachment = {
      ...attachment,
      size: buffer.length,
    };
    const errors = validateAttachment({ role, attachment: normalizedAttachment });
    if (errors.length > 0) {
      throw new Error(errors.join(" "));
    }
    const attachmentId = createId("att");
    await saveEncryptedAttachment({
      bucket,
      attachmentId,
      fileName: attachment.fileName,
      buffer,
      metadata: {
        ticketId,
        mimeType: attachment.mimeType,
        uploadedBy: uploader.id,
      },
    });

    created.push({
      id: attachmentId,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: buffer.length,
      kind: attachment.kind,
      durationSec: attachment.durationSec || null,
      createdAt: nowIso(),
      uploadedBy: uploader.id,
      uploadedByRole: uploader.role,
      storageId: attachmentId,
      encrypted: true,
      ticketId,
    });
  }

  return created;
}

function attachmentView(attachment, token) {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    kind: attachment.kind,
    createdAt: attachment.createdAt,
    durationSec: attachment.durationSec || null,
    url: `/api/attachments/${attachment.id}?token=${encodeURIComponent(token)}`,
  };
}

function makeWhatsappEscalationLink(ticket, settings) {
  const number = String(settings.supportTeam.whatsappNumber || "").replace(/[^\d]/g, "");
  const message = encodeURIComponent(
    `Ticket ${ticket.id} remains unresolved. Please contact me regarding: ${ticket.subject}`
  );
  return number ? `https://wa.me/${number}?text=${message}` : null;
}

function mapConversationEntries(entries, token) {
  return entries.map((entry) => ({
    id: entry.id,
    authorId: entry.authorId,
    authorRole: entry.authorRole,
    message: entry.message,
    createdAt: entry.createdAt,
    system: entry.system || false,
    attachments: (entry.attachments || []).map((attachment) => attachmentView(attachment, token)),
  }));
}

function mapTicketForUser(ticket, data, token) {
  const restricted = ticket.priority === 1 && ticket.recordState === "active";
  const base = {
    id: ticket.id,
    subject: ticket.subject,
    summary: ticket.summary,
    issueType: ticket.issueType,
    priority: ticket.priority,
    department: ticket.department,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    recordState: ticket.recordState,
    mergedInto: ticket.mergedInto,
    restricted,
    canEscalateToWhatsapp: ticket.status === "replied" && ticket.recordState === "active",
    whatsappEscalationLink:
      ticket.status === "replied" && ticket.recordState === "active"
        ? makeWhatsappEscalationLink(ticket, data.settings)
        : null,
  };

  if (restricted) {
    return {
      ...base,
      status: "restricted",
      replies: [],
      supplements: [],
      attachments: [],
      responseDeadline: null,
      resolutionDeadline: null,
      restrictedMessage:
        "Priority 1 incidents are handled directly by WhatsApp or phone. Progress tracking is hidden for this ticket.",
    };
  }

  return {
    ...base,
    status: ticket.status,
    description: ticket.description,
    attachments: ticket.attachments.map((attachment) => attachmentView(attachment, token)),
    supplements: mapConversationEntries(ticket.supplements, token),
    replies: mapConversationEntries(ticket.replies, token),
    responseDeadline: ticket.responseDeadline,
    resolutionDeadline: ticket.resolutionDeadline,
    archivedAt: ticket.archivedAt || null,
  };
}

function mapTicketForAdmin(ticket, data, token) {
  const user = data.users.find((item) => item.id === ticket.userId);
  return {
    id: ticket.id,
    subject: ticket.subject,
    summary: ticket.summary,
    description: ticket.description,
    issueType: ticket.issueType,
    priority: ticket.priority,
    status: ticket.status,
    department: ticket.department,
    contactPhone: ticket.contactPhone,
    recordState: ticket.recordState,
    mergedInto: ticket.mergedInto,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    respondedAt: ticket.respondedAt || null,
    resolvedAt: ticket.resolvedAt || null,
    archivedAt: ticket.archivedAt || null,
    responseDeadline: ticket.responseDeadline,
    resolutionDeadline: ticket.resolutionDeadline,
    user: user ? sanitizeUser(user) : null,
    attachments: ticket.attachments.map((attachment) => attachmentView(attachment, token)),
    supplements: mapConversationEntries(ticket.supplements, token),
    replies: mapConversationEntries(ticket.replies, token),
    priorityHistory: ticket.priorityHistory,
  };
}

function getBootstrapPayload(data, auth, token) {
  if (auth.user.role === "user") {
    const tickets = data.tickets
      .filter((ticket) => ticket.userId === auth.user.id && ticket.recordState !== "merged")
      .sort(ticketSort)
      .map((ticket) => mapTicketForUser(ticket, data, token));

    return {
      role: "user",
      session: sanitizeUser(auth.user),
      support: {
        companyName: data.settings.supportTeam.companyName,
        whatsappNumber: data.settings.supportTeam.whatsappNumber,
      },
      tickets,
    };
  }

  return {
    role: "admin",
    session: sanitizeUser(auth.user),
    settings: data.settings,
    report: buildReport(data),
    notifications: sortDescByDate(data.notifications, "createdAt").slice(0, 20),
    auditLogs: sortDescByDate(data.auditLogs, "createdAt").slice(0, 30),
    tickets: data.tickets.sort(ticketSort).map((ticket) => mapTicketForAdmin(ticket, data, token)),
  };
}

function findTicketById(data, ticketId) {
  const ticket = data.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    throw new Error("Ticket not found.");
  }
  return ticket;
}

function findOrCreatePublicUser(data, profile) {
  const email = String(profile.email || "").trim().toLowerCase();
  let user = data.users.find((item) => item.email === email && item.role === "user");

  if (!user) {
    user = {
      id: createId("user"),
      role: "user",
      email,
      name: String(profile.name || "").trim(),
      department: String(profile.department || "").trim(),
      phone: String(profile.phone || "").trim(),
      createdAt: nowIso(),
      lastLoginAt: null,
    };
    data.users.push(user);
    return user;
  }

  user.name = String(profile.name || user.name).trim();
  user.department = String(profile.department || user.department).trim();
  user.phone = String(profile.phone || user.phone).trim();
  return user;
}

function createUserSession(data, user) {
  user.lastLoginAt = nowIso();
  const token = createSessionToken();
  data.sessions.push({
    token,
    userId: user.id,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });
  return token;
}

function attachReply(ticket, uploader, message, attachments) {
  ticket.replies.unshift({
    id: createId("reply"),
    authorId: uploader.id,
    authorRole: uploader.role,
    message,
    attachments,
    createdAt: nowIso(),
  });
}

function attachSupplement(ticket, uploader, message, attachments) {
  ticket.supplements.unshift({
    id: createId("supp"),
    authorId: uploader.id,
    authorRole: uploader.role,
    message,
    attachments,
    createdAt: nowIso(),
  });
}

function updateSettings(current, incoming) {
  return {
    ...current,
    supportTeam: {
      ...current.supportTeam,
      companyName: incoming.supportTeam?.companyName || current.supportTeam.companyName,
      whatsappNumber: incoming.supportTeam?.whatsappNumber || current.supportTeam.whatsappNumber,
      whatsappGroupLabel:
        incoming.supportTeam?.whatsappGroupLabel || current.supportTeam.whatsappGroupLabel,
      emailRecipients:
        normalizeKeywordList(incoming.supportTeam?.emailRecipients || current.supportTeam.emailRecipients),
    },
    priorityRules: {
      highKeywords: normalizeKeywordList(
        incoming.priorityRules?.highKeywords || current.priorityRules.highKeywords
      ),
      mediumKeywords: normalizeKeywordList(
        incoming.priorityRules?.mediumKeywords || current.priorityRules.mediumKeywords
      ),
    },
    notifications: {
      ...current.notifications,
      enableWhatsappForP1:
        incoming.notifications?.enableWhatsappForP1 ?? current.notifications.enableWhatsappForP1,
      enableEmailForP2:
        incoming.notifications?.enableEmailForP2 ?? current.notifications.enableEmailForP2,
      enableSummaryEmailForP3:
        incoming.notifications?.enableSummaryEmailForP3 ??
        current.notifications.enableSummaryEmailForP3,
      p3SummaryFrequency:
        incoming.notifications?.p3SummaryFrequency || current.notifications.p3SummaryFrequency,
    },
    slaHours: {
      "1": {
        response: Number(incoming.slaHours?.["1"]?.response ?? current.slaHours["1"].response),
        resolve: Number(incoming.slaHours?.["1"]?.resolve ?? current.slaHours["1"].resolve),
      },
      "2": {
        response: Number(incoming.slaHours?.["2"]?.response ?? current.slaHours["2"].response),
        resolve: Number(incoming.slaHours?.["2"]?.resolve ?? current.slaHours["2"].resolve),
      },
      "3": {
        response: Number(incoming.slaHours?.["3"]?.response ?? current.slaHours["3"].response),
        resolve: Number(incoming.slaHours?.["3"]?.resolve ?? current.slaHours["3"].resolve),
      },
    },
    retentionDays: Number(incoming.retentionDays ?? current.retentionDays),
  };
}

function routeMatch(pathname, regex) {
  const match = pathname.match(regex);
  return match ? match.slice(1) : null;
}

function findAttachmentContext(data, attachmentId) {
  for (const ticket of data.tickets) {
    for (const attachment of ticket.attachments) {
      if (attachment.id === attachmentId) {
        return { ticket, attachment };
      }
    }

    for (const reply of ticket.replies) {
      for (const attachment of reply.attachments || []) {
        if (attachment.id === attachmentId) {
          return { ticket, attachment };
        }
      }
    }

    for (const supplement of ticket.supplements) {
      for (const attachment of supplement.attachments || []) {
        if (attachment.id === attachmentId) {
          return { ticket, attachment };
        }
      }
    }
  }

  return null;
}

function canAccessTicket(user, ticket) {
  return user.role === "admin" || ticket.userId === user.id;
}

async function handleRequest(req, res) {
  const urlObject = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);
  const { pathname } = urlObject;

  try {
    if (req.method === "GET" && pathname === "/api/bootstrap") {
      const data = await readData();
      const auth = requireAuth(data, req, urlObject);
      sendJson(res, 200, getBootstrapPayload(data, auth, auth.token));
      return;
    }

    if (req.method === "POST" && pathname === "/api/logout") {
      const token = getToken(req, urlObject);
      await mutateData((data) => {
        data.sessions = data.sessions.filter((session) => session.token !== token);
      });
      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/request-otp") {
      const body = await parseBody(req);
      if (!body.email) {
        throw new Error("Email is required.");
      }

      const otpCode = createOtpCode();
      await mutateData((data) => {
        data.otpCodes = data.otpCodes.filter((entry) => entry.email !== body.email);
        data.otpCodes.push({
          email: String(body.email).trim().toLowerCase(),
          code: otpCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          profile: {
            name: String(body.name || "").trim(),
            department: String(body.department || "").trim(),
            phone: String(body.phone || "").trim(),
          },
        });
      });

      sendJson(res, 200, {
        success: true,
        message: "Demo mode: OTP is returned directly because email delivery is not configured.",
        otpCode,
        expiresInMinutes: 10,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/verify-otp") {
      const body = await parseBody(req);
      if (!body.email || !body.otp) {
        throw new Error("Email and OTP are required.");
      }

      const result = await mutateData((data) => {
        const email = String(body.email).trim().toLowerCase();
        const otpRecord = data.otpCodes.find(
          (entry) => entry.email === email && entry.code === String(body.otp).trim()
        );

        if (!otpRecord || new Date(otpRecord.expiresAt) < new Date()) {
          throw new Error("OTP is invalid or expired.");
        }

        let user = data.users.find((item) => item.email === email && item.role === "user");
        if (!user) {
          user = {
            id: createId("user"),
            role: "user",
            email,
            name: otpRecord.profile.name || email.split("@")[0],
            department: otpRecord.profile.department || "Unassigned Department",
            phone: otpRecord.profile.phone || "",
            createdAt: nowIso(),
            lastLoginAt: null,
          };
          data.users.push(user);
        }

        user.name = otpRecord.profile.name || user.name;
        user.department = otpRecord.profile.department || user.department;
        user.phone = otpRecord.profile.phone || user.phone;
        user.lastLoginAt = nowIso();

        const token = createUserSession(data, user);
        data.otpCodes = data.otpCodes.filter((entry) => entry.email !== email);

        logAudit(data, {
          actorId: user.id,
          actorRole: "user",
          action: "user_login",
          entityType: "session",
          entityId: token,
          details: `OTP login completed for ${email}.`,
        });

        return { token, user: sanitizeUser(user) };
      });

      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/auth/admin-login") {
      const body = await parseBody(req);
      if (!body.email || !body.password) {
        throw new Error("Admin email and password are required.");
      }

      const result = await mutateData((data) => {
        const email = String(body.email).trim().toLowerCase();
        const admin = data.users.find((item) => item.email === email && item.role === "admin");
        if (!admin || admin.passwordHash !== hashPassword(String(body.password))) {
          throw new Error("Invalid admin credentials.");
        }

        admin.lastLoginAt = nowIso();
        const token = createUserSession(data, admin);

        logAudit(data, {
          actorId: admin.id,
          actorRole: "admin",
          action: "admin_login",
          entityType: "session",
          entityId: token,
          details: `Admin login for ${email}.`,
        });

        return { token, user: sanitizeUser(admin) };
      });

      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/public/tickets/lookup") {
      const body = await parseBody(req);
      const result = await mutateData((data) => {
        if (!body.ticketId || !body.email) {
          throw new Error("Ticket ID and email are required.");
        }

        const email = String(body.email).trim().toLowerCase();
        const user = data.users.find((item) => item.email === email && item.role === "user");
        if (!user) {
          throw new Error("Ticket lookup failed.");
        }

        const ticket = data.tickets.find(
          (item) => item.id === String(body.ticketId).trim() && item.userId === user.id
        );
        if (!ticket) {
          throw new Error("Ticket lookup failed.");
        }

        const token = createUserSession(data, user);
        logAudit(data, {
          actorId: user.id,
          actorRole: "public",
          action: "ticket_lookup",
          entityType: "ticket",
          entityId: ticket.id,
          details: "Public ticket lookup generated a temporary session.",
        });

        return {
          token,
          ticketId: ticket.id,
        };
      });

      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (req.method === "POST" && pathname === "/api/public/tickets") {
      const body = await parseBody(req);
      const result = await mutateData(async (data) => {
        if (
          !body.name ||
          !body.email ||
          !body.phone ||
          !body.department ||
          !body.subject ||
          !body.description ||
          !body.issueType
        ) {
          throw new Error(
            "Name, email, phone, department, subject, description, and issue type are required."
          );
        }

        const attachments = body.attachments || [];
        const imageCount = attachments.filter((item) => item.kind === "image").length;
        const recordingCount = attachments.filter((item) => item.kind === "recording").length;
        if (imageCount > 1 || recordingCount > 1) {
          throw new Error("Submit at most one screenshot and one recording per ticket.");
        }

        const user = findOrCreatePublicUser(data, body);
        const priorityDecision = classifyPriority({
          settings: data.settings,
          subject: body.subject,
          description: body.description,
          issueType: body.issueType,
          attachments,
        });

        const ticketId = makeTicketId(data);
        const savedAttachments = await saveAttachments(data, {
          ticketId,
          uploader: user,
          attachments,
          role: "user",
        });

        const timestamp = nowIso();
        const ticket = {
          id: ticketId,
          userId: user.id,
          contactPhone: user.phone,
          department: user.department,
          subject: String(body.subject).trim(),
          description: String(body.description).trim(),
          issueType: String(body.issueType).trim(),
          priority: priorityDecision.priority,
          status: "pending",
          summary: `${String(body.subject).trim().slice(0, 80)} | ${String(body.description)
            .trim()
            .slice(0, 90)}`,
          attachments: savedAttachments,
          supplements: [],
          replies: [],
          priorityHistory: [
            {
              from: null,
              to: priorityDecision.priority,
              reason: priorityDecision.reasons.join(" "),
              changedBy: "system",
              changedAt: timestamp,
              automatic: true,
            },
          ],
          recordState: "active",
          mergedInto: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          respondedAt: null,
          resolvedAt: null,
          archivedAt: null,
          submissionChannel: "public_form",
        };

        const deadlines = computeSlaDeadlines(ticket, data.settings);
        ticket.responseDeadline = deadlines.responseDeadline;
        ticket.resolutionDeadline = deadlines.resolutionDeadline;
        data.tickets.push(ticket);
        const token = createUserSession(data, user);

        queueNotificationsForTicket(data, ticket);
        logAudit(data, {
          actorId: user.id,
          actorRole: "public",
          action: "ticket_created_public",
          entityType: "ticket",
          entityId: ticket.id,
          details: `Public ticket created with automatic priority ${ticket.priority}.`,
        });

        return {
          ticketId: ticket.id,
          priority: ticket.priority,
          token,
          whatsappLink:
            ticket.priority === 1 ? makeWhatsappEscalationLink(ticket, data.settings) : null,
        };
      });

      sendJson(res, 201, {
        success: true,
        ...result,
        message: "Ticket submitted successfully. Keep the ticket ID for follow-up.",
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/user/tickets") {
      const body = await parseBody(req);
      const result = await mutateData(async (data) => {
        const auth = requireAuth(data, req, urlObject, ["user"]);
        if (!body.subject || !body.description || !body.issueType) {
          throw new Error("Subject, description, and issue type are required.");
        }

        const attachments = body.attachments || [];
        const imageCount = attachments.filter((item) => item.kind === "image").length;
        const recordingCount = attachments.filter((item) => item.kind === "recording").length;
        if (imageCount > 1 || recordingCount > 1) {
          throw new Error("Submit at most one screenshot and one recording per ticket.");
        }

        const priorityDecision = classifyPriority({
          settings: data.settings,
          subject: body.subject,
          description: body.description,
          issueType: body.issueType,
          attachments,
        });

        const ticketId = makeTicketId(data);
        const savedAttachments = await saveAttachments(data, {
          ticketId,
          uploader: auth.user,
          attachments,
          role: "user",
        });

        const summary = `${String(body.subject).trim().slice(0, 80)} | ${String(body.description)
          .trim()
          .slice(0, 90)}`;
        const timestamp = nowIso();
        const ticket = {
          id: ticketId,
          userId: auth.user.id,
          contactPhone: auth.user.phone,
          department: auth.user.department,
          subject: String(body.subject).trim(),
          description: String(body.description).trim(),
          issueType: String(body.issueType).trim(),
          priority: priorityDecision.priority,
          status: "pending",
          summary,
          attachments: savedAttachments,
          supplements: [],
          replies: [],
          priorityHistory: [
            {
              from: null,
              to: priorityDecision.priority,
              reason: priorityDecision.reasons.join(" "),
              changedBy: "system",
              changedAt: timestamp,
              automatic: true,
            },
          ],
          recordState: "active",
          mergedInto: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          respondedAt: null,
          resolvedAt: null,
          archivedAt: null,
        };

        const deadlines = computeSlaDeadlines(ticket, data.settings);
        ticket.responseDeadline = deadlines.responseDeadline;
        ticket.resolutionDeadline = deadlines.resolutionDeadline;
        data.tickets.push(ticket);

        queueNotificationsForTicket(data, ticket);
        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "user",
          action: "ticket_created",
          entityType: "ticket",
          entityId: ticket.id,
          details: `Ticket created with automatic priority ${ticket.priority}.`,
        });

        return { ticketId: ticket.id, priority: ticket.priority };
      });

      sendJson(res, 201, { success: true, ...result });
      return;
    }

    const userSupplementMatch = routeMatch(pathname, /^\/api\/user\/tickets\/([^/]+)\/supplement$/);
    if (req.method === "POST" && userSupplementMatch) {
      const [ticketId] = userSupplementMatch;
      const body = await parseBody(req);
      await mutateData(async (data) => {
        const auth = requireAuth(data, req, urlObject, ["user"]);
        const ticket = findTicketById(data, ticketId);
        if (ticket.userId !== auth.user.id) {
          const error = new Error("You can only update your own tickets.");
          error.statusCode = 403;
          throw error;
        }
        if (!body.message) {
          throw new Error("Supplement message is required.");
        }

        const attachments = await saveAttachments(data, {
          ticketId,
          uploader: auth.user,
          attachments: body.attachments || [],
          role: "user",
        });
        attachSupplement(ticket, auth.user, String(body.message).trim(), attachments);
        ticket.updatedAt = nowIso();

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "user",
          action: "ticket_supplemented",
          entityType: "ticket",
          entityId: ticket.id,
          details: "User added supplementary information.",
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    const userResolveMatch = routeMatch(pathname, /^\/api\/user\/tickets\/([^/]+)\/resolve$/);
    if (req.method === "POST" && userResolveMatch) {
      const [ticketId] = userResolveMatch;
      await mutateData((data) => {
        const auth = requireAuth(data, req, urlObject, ["user"]);
        const ticket = findTicketById(data, ticketId);
        if (ticket.userId !== auth.user.id) {
          const error = new Error("You can only update your own tickets.");
          error.statusCode = 403;
          throw error;
        }

        ticket.status = "resolved";
        ticket.recordState = "archived";
        ticket.resolvedAt = ticket.resolvedAt || nowIso();
        ticket.archivedAt = nowIso();
        ticket.updatedAt = nowIso();

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "user",
          action: "ticket_resolved_by_user",
          entityType: "ticket",
          entityId: ticket.id,
          details: "User confirmed the issue was resolved and ticket was archived.",
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    const adminReplyMatch = routeMatch(pathname, /^\/api\/admin\/tickets\/([^/]+)\/reply$/);
    if (req.method === "POST" && adminReplyMatch) {
      const [ticketId] = adminReplyMatch;
      const body = await parseBody(req);
      await mutateData(async (data) => {
        const auth = requireAuth(data, req, urlObject, ["admin"]);
        const ticket = findTicketById(data, ticketId);
        if (!body.message) {
          throw new Error("Reply message is required.");
        }

        const attachments = await saveAttachments(data, {
          ticketId,
          uploader: auth.user,
          attachments: body.attachments || [],
          role: "admin",
        });

        attachReply(ticket, auth.user, String(body.message).trim(), attachments);
        ticket.respondedAt = ticket.respondedAt || nowIso();
        ticket.status = body.nextStatus ? normalizeStatus(body.nextStatus) : "replied";
        ticket.updatedAt = nowIso();

        if (ticket.status === "resolved") {
          ticket.resolvedAt = ticket.resolvedAt || nowIso();
          ticket.recordState = "archived";
          ticket.archivedAt = ticket.archivedAt || nowIso();
        }

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "admin",
          action: "ticket_replied",
          entityType: "ticket",
          entityId: ticket.id,
          details: `Admin replied and moved status to ${ticket.status}.`,
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    const adminStatusMatch = routeMatch(pathname, /^\/api\/admin\/tickets\/([^/]+)\/status$/);
    if (req.method === "POST" && adminStatusMatch) {
      const [ticketId] = adminStatusMatch;
      const body = await parseBody(req);
      await mutateData((data) => {
        const auth = requireAuth(data, req, urlObject, ["admin"]);
        const ticket = findTicketById(data, ticketId);
        const status = normalizeStatus(body.status);

        ticket.status = status;
        ticket.updatedAt = nowIso();
        if ((status === "replied" || status === "resolved") && !ticket.respondedAt) {
          ticket.respondedAt = nowIso();
        }
        if (status === "resolved") {
          ticket.resolvedAt = ticket.resolvedAt || nowIso();
          ticket.recordState = "archived";
          ticket.archivedAt = ticket.archivedAt || nowIso();
        } else if (ticket.recordState === "archived") {
          ticket.recordState = "active";
          ticket.archivedAt = null;
        }

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "admin",
          action: "ticket_status_changed",
          entityType: "ticket",
          entityId: ticket.id,
          details: `Status updated to ${status}.`,
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    const adminPriorityMatch = routeMatch(pathname, /^\/api\/admin\/tickets\/([^/]+)\/priority$/);
    if (req.method === "POST" && adminPriorityMatch) {
      const [ticketId] = adminPriorityMatch;
      const body = await parseBody(req);
      await mutateData((data) => {
        const auth = requireAuth(data, req, urlObject, ["admin"]);
        const ticket = findTicketById(data, ticketId);
        const nextPriority = Number(body.priority);
        if (![1, 2, 3].includes(nextPriority)) {
          throw new Error("Priority must be 1, 2, or 3.");
        }
        if (!body.reason) {
          throw new Error("Priority change reason is required.");
        }

        const previousPriority = ticket.priority;
        ticket.priority = nextPriority;
        ticket.priorityHistory.unshift({
          from: previousPriority,
          to: nextPriority,
          reason: String(body.reason).trim(),
          changedBy: auth.user.id,
          changedAt: nowIso(),
          automatic: false,
        });
        const deadlines = computeSlaDeadlines(ticket, data.settings);
        ticket.responseDeadline = deadlines.responseDeadline;
        ticket.resolutionDeadline = deadlines.resolutionDeadline;
        ticket.updatedAt = nowIso();

        queueNotificationsForTicket(data, ticket);
        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "admin",
          action: "ticket_priority_changed",
          entityType: "ticket",
          entityId: ticket.id,
          details: `Priority changed from ${previousPriority} to ${nextPriority}. Reason: ${body.reason}`,
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    const adminMergeMatch = routeMatch(pathname, /^\/api\/admin\/tickets\/([^/]+)\/merge$/);
    if (req.method === "POST" && adminMergeMatch) {
      const [sourceTicketId] = adminMergeMatch;
      const body = await parseBody(req);
      await mutateData((data) => {
        const auth = requireAuth(data, req, urlObject, ["admin"]);
        const source = findTicketById(data, sourceTicketId);
        const target = findTicketById(data, String(body.targetTicketId || "").trim());
        if (source.id === target.id) {
          throw new Error("Cannot merge a ticket into itself.");
        }

        attachSupplement(
          target,
          auth.user,
          `Merged duplicate ${source.id}. ${body.reason ? `Reason: ${body.reason}` : ""} Original summary: ${source.summary}`,
          []
        );

        source.recordState = "merged";
        source.mergedInto = target.id;
        source.archivedAt = nowIso();
        source.updatedAt = nowIso();

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "admin",
          action: "ticket_merged",
          entityType: "ticket",
          entityId: source.id,
          details: `Merged into ${target.id}.`,
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === "POST" && pathname === "/api/admin/settings") {
      const body = await parseBody(req);
      await mutateData((data) => {
        const auth = requireAuth(data, req, urlObject, ["admin"]);
        data.settings = updateSettings(data.settings, body);

        logAudit(data, {
          actorId: auth.user.id,
          actorRole: "admin",
          action: "settings_updated",
          entityType: "system",
          entityId: "settings",
          details: "Priority rules, notification channels, or SLA settings were updated.",
        });
      });

      sendJson(res, 200, { success: true });
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/reports/export.csv") {
      const data = await readData();
      requireAuth(data, req, urlObject, ["admin"]);
      const csv = reportToCsv(data);
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="ticketing-report.csv"',
      });
      res.end(csv);
      return;
    }

    if (req.method === "GET" && pathname === "/api/admin/reports/export.pdf") {
      const data = await readData();
      requireAuth(data, req, urlObject, ["admin"]);
      const pdf = buildPdf(data);
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ticketing-report.pdf"',
      });
      res.end(pdf);
      return;
    }

    const attachmentMatch = routeMatch(pathname, /^\/api\/attachments\/([^/]+)$/);
    if (req.method === "GET" && attachmentMatch) {
      const [attachmentId] = attachmentMatch;
      const data = await readData();
      const auth = requireAuth(data, req, urlObject);
      const context = findAttachmentContext(data, attachmentId);
      if (!context) {
        res.writeHead(404);
        res.end();
        return;
      }
      if (!canAccessTicket(auth.user, context.ticket)) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (
        auth.user.role === "user" &&
        context.ticket.priority === 1 &&
        context.ticket.recordState === "active"
      ) {
        res.writeHead(403);
        res.end();
        return;
      }

      const bucket = await getAttachmentBucket();
      const buffer = await loadEncryptedAttachment({
        bucket,
        storageId: context.attachment.storageId || context.attachment.id,
      });
      res.writeHead(200, {
        "Content-Type": context.attachment.mimeType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          context.attachment.fileName
        )}"`,
      });
      res.end(buffer);
      return;
    }

    if (req.method === "GET") {
      const staticPath =
        pathname === "/" ? path.join(PUBLIC_DIR, "index.html") : path.join(PUBLIC_DIR, pathname);
      const file = readStaticFile(staticPath);
      if (file) {
        sendText(res, 200, file, mimeTypeFor(staticPath));
        return;
      }

      const indexFile = readStaticFile(path.join(PUBLIC_DIR, "index.html"));
      if (indexFile) {
        sendText(res, 200, indexFile, "text/html; charset=utf-8");
        return;
      }
    }

    res.writeHead(404);
    res.end();
  } catch (error) {
    respondError(res, error);
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    respondError(res, error);
  });
});

if (require.main === module) {
  ensureDataFile()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`Ticketing MVP running at http://localhost:${PORT}`);
        console.log("Admin demo login: admin@gov-support.local / Admin123!");
      });
    })
    .catch((error) => {
      console.error("Failed to initialize MongoDB-backed storage.");
      console.error(error.stack || error.message);
      process.exit(1);
    });
}

module.exports = {
  server,
};

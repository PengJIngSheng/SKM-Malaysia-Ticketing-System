const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const { ensureCollections, getDb } = require("./mongo");

const DATA_FILE = path.join(process.cwd(), "data", "app-data.json");

function nowIso() {
  return new Date().toISOString();
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function defaultSettings() {
  return {
    supportTeam: {
      companyName: "Google Enterprise Support Desk",
      whatsappNumber: "85260000000",
      whatsappGroupLabel: "Enterprise Support Group",
      emailRecipients: ["support-team@example.gov"],
    },
    priorityRules: {
      highKeywords: [
        "outage",
        "cannot login",
        "cannot access",
        "service down",
        "security",
        "data loss",
        "多人",
        "核心业务",
      ],
      mediumKeywords: ["permission", "sync", "error", "slow", "setting", "培训", "权限"],
    },
    notifications: {
      enableWhatsappForP1: true,
      enableEmailForP2: true,
      enableSummaryEmailForP3: true,
      p3SummaryFrequency: "daily",
    },
    slaHours: {
      "1": { response: 1, resolve: 4 },
      "2": { response: 4, resolve: 24 },
      "3": { response: 8, resolve: 48 },
    },
    retentionDays: 365,
  };
}

function createSeedData() {
  const adminId = "admin_001";
  const userA = "user_001";
  const userB = "user_002";

  return {
    users: [
      {
        id: adminId,
        role: "admin",
        email: "admin@gov-support.local",
        name: "Support Lead",
        department: "Support Operations",
        phone: "+85260000000",
        passwordHash: hashPassword("Admin123!"),
        createdAt: hoursAgo(240),
        lastLoginAt: null,
      },
      {
        id: userA,
        role: "user",
        email: "amy.chan@gov.example",
        name: "Amy Chan",
        department: "Housing Department",
        phone: "+85261112222",
        createdAt: hoursAgo(120),
        lastLoginAt: null,
      },
      {
        id: userB,
        role: "user",
        email: "kevin.lee@gov.example",
        name: "Kevin Lee",
        department: "Education Bureau",
        phone: "+85263334444",
        createdAt: hoursAgo(96),
        lastLoginAt: null,
      },
    ],
    sessions: [],
    otpCodes: [],
    settings: defaultSettings(),
    notifications: [
      {
        id: "notif_001",
        ticketId: "TKT-20260309-0001",
        channel: "email",
        status: "queued",
        priority: 2,
        createdAt: hoursAgo(5),
        payload: "Queued email notification for Amy Chan ticket.",
      },
    ],
    auditLogs: [
      {
        id: "log_001",
        actorId: adminId,
        actorRole: "admin",
        action: "seed_data_created",
        entityType: "system",
        entityId: "bootstrap",
        createdAt: hoursAgo(1),
        details: "Seed dataset initialised for local demo.",
      },
    ],
    tickets: [
      {
        id: "TKT-20260309-0001",
        userId: userA,
        contactPhone: "+85261112222",
        department: "Housing Department",
        subject: "Shared Drive permission error",
        description: "Several team members cannot upload files to the shared drive after role changes.",
        issueType: "access",
        priority: 2,
        status: "in_progress",
        summary: "Shared Drive permission failure affecting team uploads.",
        attachments: [],
        supplements: [],
        replies: [],
        priorityHistory: [
          {
            from: null,
            to: 2,
            reason: "Automatic classification from keyword match and access issue.",
            changedBy: "system",
            changedAt: hoursAgo(5),
            automatic: true,
          },
        ],
        recordState: "active",
        mergedInto: null,
        createdAt: hoursAgo(5),
        updatedAt: hoursAgo(2),
        respondedAt: hoursAgo(4.5),
        resolvedAt: null,
        responseDeadline: hoursAgo(1),
        resolutionDeadline: hoursAgo(-19),
      },
      {
        id: "TKT-20260309-0002",
        userId: userB,
        contactPhone: "+85263334444",
        department: "Education Bureau",
        subject: "Gmail service down for district office",
        description: "District office cannot send or receive email. Impacting multiple staff and front desk services.",
        issueType: "outage",
        priority: 1,
        status: "pending",
        summary: "Email outage impacting district office.",
        attachments: [],
        supplements: [],
        replies: [],
        priorityHistory: [
          {
            from: null,
            to: 1,
            reason: "Automatic classification from outage issue affecting multiple users.",
            changedBy: "system",
            changedAt: hoursAgo(1.5),
            automatic: true,
          },
        ],
        recordState: "active",
        mergedInto: null,
        createdAt: hoursAgo(1.5),
        updatedAt: hoursAgo(1.5),
        respondedAt: null,
        resolvedAt: null,
        responseDeadline: hoursAgo(-0.5),
        resolutionDeadline: hoursAgo(-2.5),
      },
    ],
  };
}

function readLocalSeedFile() {
  if (!fs.existsSync(DATA_FILE)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

async function ensureDataFile() {
  await ensureCollections();
  const db = await getDb();
  const userCount = await db.collection("users").countDocuments();
  if (userCount > 0) {
    return;
  }

  const seed = readLocalSeedFile() || createSeedData();
  await writeData(seed);
}

async function readData() {
  await ensureDataFile();
  const db = await getDb();
  const [users, tickets, settingsDocs, notifications, auditLogs, sessions, otpCodes] =
    await Promise.all([
      db.collection("users").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("tickets").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("settings").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("notifications").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("auditLogs").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("sessions").find({}, { projection: { _id: 0 } }).toArray(),
      db.collection("otpCodes").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

  return {
    users,
    tickets,
    settings: settingsDocs[0] || defaultSettings(),
    notifications,
    auditLogs,
    sessions,
    otpCodes,
  };
}

async function replaceCollection(db, name, docs) {
  await db.collection(name).deleteMany({});
  if (docs.length > 0) {
    await db.collection(name).insertMany(docs);
  }
}

async function writeData(data) {
  await ensureCollections();
  const db = await getDb();

  await Promise.all([
    replaceCollection(db, "users", data.users || []),
    replaceCollection(db, "tickets", data.tickets || []),
    replaceCollection(db, "notifications", data.notifications || []),
    replaceCollection(db, "auditLogs", data.auditLogs || []),
    replaceCollection(db, "sessions", data.sessions || []),
    replaceCollection(db, "otpCodes", data.otpCodes || []),
    db.collection("settings").replaceOne({}, data.settings || defaultSettings(), {
      upsert: true,
    }),
  ]);
}

async function mutateData(mutator) {
  const data = await readData();
  const result = await mutator(data);
  await writeData(data);
  return result;
}

module.exports = {
  DATA_FILE,
  defaultSettings,
  ensureDataFile,
  mutateData,
  nowIso,
  readData,
  writeData,
};

const { GridFSBucket, MongoClient } = require("mongodb");

const DEFAULT_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DEFAULT_DB_NAME = process.env.MONGODB_DB_NAME || "ticketing_system";

let clientPromise = null;
let bucket = null;

async function getClient() {
  if (!clientPromise) {
    const client = new MongoClient(DEFAULT_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

async function getDb() {
  const client = await getClient();
  return client.db(DEFAULT_DB_NAME);
}

async function getAttachmentBucket() {
  if (!bucket) {
    const db = await getDb();
    bucket = new GridFSBucket(db, { bucketName: "attachments" });
  }
  return bucket;
}

async function closeMongo() {
  if (!clientPromise) {
    return;
  }

  const client = await clientPromise;
  await client.close();
  clientPromise = null;
  bucket = null;
}

async function ensureCollections() {
  const db = await getDb();
  const existing = new Set(await db.listCollections({}, { nameOnly: true }).toArray().then((items) => items.map((item) => item.name)));

  const required = ["users", "tickets", "settings", "notifications", "auditLogs", "sessions", "otpCodes"];
  for (const name of required) {
    if (!existing.has(name)) {
      await db.createCollection(name);
    }
  }

  await db.collection("users").createIndex({ email: 1, role: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ id: 1 }, { unique: true });
  await db.collection("tickets").createIndex({ createdAt: -1 });
  await db.collection("tickets").createIndex({ priority: 1, status: 1, department: 1 });
  await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 });
  await db.collection("otpCodes").createIndex({ email: 1 });
  await db.collection("notifications").createIndex({ createdAt: -1 });
  await db.collection("auditLogs").createIndex({ createdAt: -1 });

  await getAttachmentBucket();
}

module.exports = {
  DEFAULT_DB_NAME,
  DEFAULT_URI,
  closeMongo,
  ensureCollections,
  getAttachmentBucket,
  getDb,
};

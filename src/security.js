const crypto = require("crypto");

const DEFAULT_ENCRYPTION_SECRET = "demo-ticketing-encryption-secret";

function createId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getEncryptionKey() {
  const key = process.env.APP_ENCRYPTION_KEY;
  if (key && /^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  return crypto.createHash("sha256").update(DEFAULT_ENCRYPTION_SECRET).digest();
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptBuffer(payload) {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

async function saveEncryptedAttachment({ bucket, attachmentId, fileName, buffer, metadata }) {
  const payload = encryptBuffer(buffer);

  await new Promise((resolve, reject) => {
    const upload = bucket.openUploadStreamWithId(attachmentId, fileName, {
      contentType: "application/octet-stream",
      metadata: metadata || {},
    });

    upload.on("finish", resolve);
    upload.on("error", reject);
    upload.end(payload);
  });

  return attachmentId;
}

async function loadEncryptedAttachment({ bucket, storageId }) {
  const chunks = [];

  await new Promise((resolve, reject) => {
    const download = bucket.openDownloadStream(storageId);
    download.on("data", (chunk) => chunks.push(chunk));
    download.on("error", reject);
    download.on("end", resolve);
  });

  return decryptBuffer(Buffer.concat(chunks));
}

module.exports = {
  createId,
  createOtpCode,
  createSessionToken,
  hashPassword,
  loadEncryptedAttachment,
  saveEncryptedAttachment,
};

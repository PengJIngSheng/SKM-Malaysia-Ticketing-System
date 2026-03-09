const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);
const ADMIN_FILE_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  "application/pdf",
]);

const ISSUE_TYPE_PRIORITY = {
  outage: 4,
  security: 4,
  data_loss: 4,
  access: 2,
  configuration: 2,
  training: 1,
  consultation: 1,
};

function normalizeKeywordList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateAttachment({ role, attachment }) {
  const errors = [];
  const isVideo = attachment.kind === "recording";
  const isImage = attachment.kind === "image";
  const fileLabel = attachment.fileName || "attachment";

  if (!attachment.base64 || !attachment.mimeType) {
    errors.push(`${fileLabel}: missing file content.`);
    return errors;
  }

  if (role === "admin") {
    if (!ADMIN_FILE_MIME_TYPES.has(attachment.mimeType)) {
      errors.push(`${fileLabel}: unsupported attachment type.`);
    }
  } else if (isImage) {
    if (!IMAGE_MIME_TYPES.has(attachment.mimeType)) {
      errors.push(`${fileLabel}: only JPG and PNG screenshots are allowed.`);
    }
    if (attachment.size > 5 * 1024 * 1024) {
      errors.push(`${fileLabel}: screenshots must be 5MB or smaller.`);
    }
  } else if (isVideo) {
    if (!VIDEO_MIME_TYPES.has(attachment.mimeType)) {
      errors.push(`${fileLabel}: only MP4 and WebM recordings are allowed.`);
    }
    if (attachment.size > 20 * 1024 * 1024) {
      errors.push(`${fileLabel}: recordings must be 20MB or smaller.`);
    }
    if (!Number.isFinite(attachment.durationSec) || attachment.durationSec > 60) {
      errors.push(`${fileLabel}: recordings must be within 60 seconds.`);
    }
  } else {
    errors.push(`${fileLabel}: invalid attachment category.`);
  }

  if (role === "admin" && attachment.size > 20 * 1024 * 1024) {
    errors.push(`${fileLabel}: admin attachments must be 20MB or smaller.`);
  }

  return errors;
}

function classifyPriority({ settings, subject, description, issueType, attachments }) {
  const combinedText = `${subject || ""}\n${description || ""}`.toLowerCase();
  const highKeywords = normalizeKeywordList(settings.priorityRules.highKeywords);
  const mediumKeywords = normalizeKeywordList(settings.priorityRules.mediumKeywords);
  const reasons = [];
  let score = ISSUE_TYPE_PRIORITY[issueType] || 0;

  const highMatches = highKeywords.filter((keyword) => combinedText.includes(keyword.toLowerCase()));
  const mediumMatches = mediumKeywords.filter((keyword) =>
    combinedText.includes(keyword.toLowerCase())
  );

  if (highMatches.length > 0) {
    score += 4;
    reasons.push(`Matched urgent keywords: ${highMatches.join(", ")}`);
  }

  if (mediumMatches.length > 0) {
    score += 2;
    reasons.push(`Matched medium keywords: ${mediumMatches.join(", ")}`);
  }

  if (attachments.some((attachment) => attachment.kind === "recording")) {
    score += 2;
    reasons.push("Screen recording attached.");
  }

  if (attachments.some((attachment) => attachment.kind === "image")) {
    score += 1;
    reasons.push("Error screenshot attached.");
  }

  if (attachments.length >= 2) {
    score += 1;
  }

  if (["outage", "security", "data_loss"].includes(issueType)) {
    reasons.push(`Issue type ${issueType} is treated as business-critical.`);
  }

  const priority = score >= 5 ? 1 : score >= 2 ? 2 : 3;
  return {
    priority,
    reasons: reasons.length > 0 ? reasons : ["Default rule set classified the ticket."],
  };
}

function computeSlaDeadlines(ticket, settings) {
  const hours = settings.slaHours[String(ticket.priority)] || settings.slaHours["3"];
  const createdAt = new Date(ticket.createdAt).getTime();
  const responseDeadline = new Date(createdAt + hours.response * 60 * 60 * 1000).toISOString();
  const resolutionDeadline = new Date(createdAt + hours.resolve * 60 * 60 * 1000).toISOString();
  return { responseDeadline, resolutionDeadline };
}

module.exports = {
  ADMIN_FILE_MIME_TYPES,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  classifyPriority,
  computeSlaDeadlines,
  normalizeKeywordList,
  validateAttachment,
};

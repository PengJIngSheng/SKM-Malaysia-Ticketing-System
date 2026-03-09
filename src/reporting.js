function msToHours(value) {
  return Number((value / (1000 * 60 * 60)).toFixed(2));
}

function average(numbers) {
  if (numbers.length === 0) {
    return null;
  }

  const total = numbers.reduce((sum, value) => sum + value, 0);
  return Number((total / numbers.length).toFixed(2));
}

function buildReport(data) {
  const tickets = data.tickets.filter((ticket) => ticket.recordState !== "merged");
  const unresolved = tickets.filter(
    (ticket) => ticket.recordState === "active" && ticket.status !== "resolved"
  );
  const responseDurations = tickets
    .filter((ticket) => ticket.respondedAt)
    .map((ticket) => new Date(ticket.respondedAt) - new Date(ticket.createdAt))
    .map(msToHours);
  const resolutionDurations = tickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => new Date(ticket.resolvedAt) - new Date(ticket.createdAt))
    .map(msToHours);

  const responseEligible = tickets.filter((ticket) => ticket.respondedAt);
  const resolutionEligible = tickets.filter((ticket) => ticket.resolvedAt);

  const responseMet = responseEligible.filter(
    (ticket) => new Date(ticket.respondedAt) <= new Date(ticket.responseDeadline)
  ).length;
  const resolutionMet = resolutionEligible.filter(
    (ticket) => new Date(ticket.resolvedAt) <= new Date(ticket.resolutionDeadline)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    unresolvedCount: unresolved.length,
    priorityDistribution: {
      1: tickets.filter((ticket) => ticket.priority === 1 && ticket.recordState === "active").length,
      2: tickets.filter((ticket) => ticket.priority === 2 && ticket.recordState === "active").length,
      3: tickets.filter((ticket) => ticket.priority === 3 && ticket.recordState === "active").length,
    },
    averageResponseHours: average(responseDurations),
    averageResolutionHours: average(resolutionDurations),
    sla: {
      responseMet,
      responseTotal: responseEligible.length,
      responseRate:
        responseEligible.length > 0 ? Number(((responseMet / responseEligible.length) * 100).toFixed(1)) : null,
      resolutionMet,
      resolutionTotal: resolutionEligible.length,
      resolutionRate:
        resolutionEligible.length > 0
          ? Number(((resolutionMet / resolutionEligible.length) * 100).toFixed(1))
          : null,
    },
  };
}

function reportToCsv(data) {
  const report = buildReport(data);
  const lines = [
    "metric,value",
    `generated_at,${report.generatedAt}`,
    `unresolved_count,${report.unresolvedCount}`,
    `priority_1_active,${report.priorityDistribution[1]}`,
    `priority_2_active,${report.priorityDistribution[2]}`,
    `priority_3_active,${report.priorityDistribution[3]}`,
    `average_response_hours,${report.averageResponseHours ?? ""}`,
    `average_resolution_hours,${report.averageResolutionHours ?? ""}`,
    `sla_response_rate,${report.sla.responseRate ?? ""}`,
    `sla_resolution_rate,${report.sla.resolutionRate ?? ""}`,
    "",
    "ticket_id,department,priority,status,record_state,created_at,responded_at,resolved_at",
  ];

  data.tickets.forEach((ticket) => {
    lines.push(
      [
        ticket.id,
        ticket.department,
        ticket.priority,
        ticket.status,
        ticket.recordState,
        ticket.createdAt,
        ticket.respondedAt || "",
        ticket.resolvedAt || "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    );
  });

  return lines.join("\n");
}

function escapePdfText(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(data) {
  const report = buildReport(data);
  const ticketLines = data.tickets
    .filter((ticket) => ticket.recordState !== "merged")
    .slice(0, 18)
    .map(
      (ticket) =>
        `${ticket.id} | P${ticket.priority} | ${ticket.status} | ${ticket.department} | ${ticket.recordState}`
    );

  const lines = [
    "Enterprise Ticketing Report",
    `Generated: ${report.generatedAt}`,
    `Unresolved: ${report.unresolvedCount}`,
    `Priority distribution: P1 ${report.priorityDistribution[1]}, P2 ${report.priorityDistribution[2]}, P3 ${report.priorityDistribution[3]}`,
    `Average response hours: ${report.averageResponseHours ?? "n/a"}`,
    `Average resolution hours: ${report.averageResolutionHours ?? "n/a"}`,
    `SLA response rate: ${report.sla.responseRate ?? "n/a"}%`,
    `SLA resolution rate: ${report.sla.resolutionRate ?? "n/a"}%`,
    "Open tickets snapshot:",
    ...ticketLines,
  ];

  const content = [
    "BT",
    "/F1 11 Tf",
    "50 790 Td",
    ...lines.flatMap((line, index) =>
      index === 0 ? [`(${escapePdfText(line)}) Tj`] : ["0 -16 Td", `(${escapePdfText(line)}) Tj`]
    ),
    "ET",
  ].join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${Buffer.byteLength(content, "utf8")} >> stream\n${content}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

module.exports = {
  buildPdf,
  buildReport,
  reportToCsv,
};

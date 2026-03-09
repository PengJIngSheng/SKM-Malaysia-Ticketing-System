const app = document.getElementById("app");

const state = {
  token: localStorage.getItem("ticketing_token") || "",
  bootstrap: null,
  flash: null,
  userFilter: "active",
  adminFilters: {
    priority: "all",
    status: "all",
    department: "all",
    search: "",
  },
};

const ISSUE_TYPES = [
  ["outage", "系统中断 / 多人受影响"],
  ["access", "权限 / 登录问题"],
  ["configuration", "配置问题"],
  ["security", "安全 / 风险事件"],
  ["data_loss", "资料遗失 / 同步异常"],
  ["training", "培训操作问题"],
  ["consultation", "一般咨询"],
];

const STATUS_LABELS = {
  pending: "待处理",
  in_progress: "处理中",
  replied: "已回复",
  resolved: "已解决",
  restricted: "直接联络",
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-Hans", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value) {
  if (!value && value !== 0) {
    return "-";
  }
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

function setFlash(type, message) {
  state.flash = { type, message };
  render();
}

function renderFlash() {
  if (!state.flash) {
    return "";
  }

  const tone =
    state.flash.type === "error"
      ? "banner--error"
      : state.flash.type === "warning"
        ? "banner--warning"
        : "banner--info";

  return `<div class="banner ${tone}">${escapeHtml(state.flash.message)}</div>`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

async function loadBootstrap() {
  if (!state.token) {
    state.bootstrap = null;
    render();
    return;
  }

  try {
    state.bootstrap = await api("/api/bootstrap");
  } catch (error) {
    localStorage.removeItem("ticketing_token");
    state.token = "";
    state.bootstrap = null;
    setFlash("error", error.message);
    return;
  }

  render();
}

function renderTopbar(mode) {
  const modeLabel =
    mode === "public"
      ? "Public Feedback"
      : mode === "admin"
        ? "Admin Console"
        : "Client Workspace";

  const actions =
    mode === "public"
      ? `
          <a class="topbar__link" href="#submit-ticket">Submit Request</a>
          <a class="topbar__link" href="#ticket-lookup">Lookup Ticket</a>
          <a class="topbar__link" href="#admin-entry">Support Desk</a>
        `
      : `
          <span class="topbar__meta">${escapeHtml(modeLabel)}</span>
          <button class="button button--ghost" data-action="logout">Return Home</button>
        `;

  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand__mark">S</div>
        <div class="brand__text">
          <div class="brand__name">SKM Ticketing</div>
          <div class="brand__sub">${escapeHtml(modeLabel)}</div>
        </div>
      </div>
      <div class="topbar__actions">${actions}</div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div>
        <div class="footer__title">Support Elevated.</div>
        <div class="footer__text">Delivering premium enterprise assistance with calm and clarity.</div>
      </div>
    </footer>
  `;
}

function statusBadge(status) {
  return `<span class="pill pill--status pill--${status}">${STATUS_LABELS[status] || status}</span>`;
}

function priorityBadge(priority) {
  return `<span class="pill pill--priority pill--p${priority}">P${priority}</span>`;
}

function attachmentList(items) {
  if (!items || items.length === 0) {
    return "";
  }

  return `
    <div class="attachment-list">
      ${items
      .map(
        (item) => `
            <a class="attachment-chip" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
              <span>${escapeHtml(item.fileName)}</span>
              <span class="attachment-chip__meta">${escapeHtml(formatBytes(item.size))}</span>
            </a>
          `
      )
      .join("")}
    </div>
  `;
}

function conversation(entries, emptyLabel = "暂无更新。") {
  if (!entries || entries.length === 0) {
    return `<div class="soft-empty">${escapeHtml(emptyLabel)}</div>`;
  }

  return `
    <div class="timeline">
      ${entries
      .map(
        (entry) => `
            <article class="timeline__item ${entry.authorRole === "admin" ? "timeline__item--admin" : ""}">
              <div class="timeline__meta">
                <span>${escapeHtml(entry.authorRole === "admin" ? "Support Team" : "User")}</span>
                <span>${escapeHtml(formatDate(entry.createdAt))}</span>
              </div>
              <div class="timeline__body">${nl2br(entry.message)}</div>
              ${attachmentList(entry.attachments)}
            </article>
          `
      )
      .join("")}
    </div>
  `;
}

function heroMetric(label, value, tone = "default") {
  return `
    <div class="metric metric--${tone}">
      <div class="metric__label">${escapeHtml(label)}</div>
      <div class="metric__value">${escapeHtml(String(value))}</div>
    </div>
  `;
}

function renderPublicPage() {
  app.innerHTML = `
    <div class="site-shell site-shell--public">
      ${renderTopbar("public")}
      ${renderFlash()}

      <div class="public-layout">
        <section class="public-hero">
          <h1 class="public-hero__title">
            Exceptional<br>
            <i>Support</i><br>
            Delivered.
          </h1>
          <p class="public-hero__text">
            Submit your request below. We handle priority operations with focus, ensuring your workflows remain uninterrupted.
          </p>
          <div class="hero-actions">
            <a class="button button--primary" href="#submit-ticket">New Request</a>
            <a class="button button--secondary" href="#ticket-lookup">Track Status</a>
          </div>
        </section>

        <section class="form-stage" id="submit-ticket">
          <article class="surface-card form-card form-card--primary">
            <span class="eyebrow">Intake Form</span>
            <h3 class="form-card__title">Tell us what you need</h3>
            <form id="public-ticket-form" class="form-grid">
              <div class="form-row">
                <label class="field">
                  <span class="field__label">Full Name</span>
                  <input name="name" type="text" placeholder="e.g. Jane Doe" required />
                </label>
                <label class="field">
                  <span class="field__label">Email Address</span>
                  <input name="email" type="email" placeholder="name@department.gov" required />
                </label>
              </div>
              <div class="form-row">
                <label class="field">
                  <span class="field__label">Phone Number</span>
                  <input name="phone" type="text" placeholder="+60 ..." required />
                </label>
                <label class="field">
                  <span class="field__label">Department</span>
                  <input name="department" type="text" placeholder="Your Agency or Team" required />
                </label>
              </div>
              <div class="form-row">
                <label class="field">
                  <span class="field__label">Category</span>
                  <select name="issueType" required>
                    ${ISSUE_TYPES.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}
                  </select>
                </label>
                <label class="field">
                  <span class="field__label">Subject</span>
                  <input name="subject" type="text" placeholder="Brief summary" required />
                </label>
              </div>
              <label class="field">
                <span class="field__label">Detailed Description</span>
                <textarea name="description" placeholder="Describe the impact, urgency, and steps you have already tried." required></textarea>
              </label>
              <div class="form-row">
                <label class="field">
                  <span class="field__label">Attach Image (Optional)</span>
                  <input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                </label>
                <label class="field">
                  <span class="field__label">Record Screen (Max 60s)</span>
                  <input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" />
                </label>
              </div>
              <button class="button button--primary button--full" type="submit">Submit Request</button>
            </form>
          </article>
        </section>
      </div>

      <div class="public-layout" style="margin-top: 120px; align-items: start;">
        <section class="public-hero">
          <h2 class="public-hero__title" style="font-size: 3rem;">
            Existing<br>
            <i>Tickets</i>
          </h2>
          <p class="public-hero__text">
            Track your ongoing request, or log in as an administrator.
          </p>
        </section>
        
        <div class="side-stack">
          <article class="surface-card form-card" id="ticket-lookup" style="margin-bottom: 32px;">
            <span class="eyebrow">Client Validation</span>
            <h3 class="form-card__title">Track your ticket</h3>
            <form id="public-lookup-form" class="form-grid">
              <label class="field">
                <span class="field__label">Ticket ID</span>
                <input name="ticketId" type="text" placeholder="TKT-XXXX..." required />
              </label>
              <label class="field">
                <span class="field__label">Associated Email</span>
                <input name="email" type="email" placeholder="Email used during submission" required />
              </label>
              <button class="button button--secondary button--full" type="submit">Lookup Ticket</button>
            </form>
          </article>

          <article class="surface-card form-card" id="admin-entry">
            <span class="eyebrow">Staff Access</span>
            <h3 class="form-card__title">Admin Login</h3>
            <form id="admin-login-form" class="form-grid">
              <label class="field">
                <span class="field__label">Admin Email</span>
                <input name="email" type="email" value="admin@gov-support.local" required />
              </label>
              <label class="field">
                <span class="field__label">Secure Password</span>
                <input name="password" type="password" value="Admin123!" required />
              </label>
              <button class="button button--ghost button--full" type="submit">Enter Workspace</button>
            </form>
          </article>
        </div>
      </div>

      ${renderFooter()}
    </div>
  `;
}

function renderUserTicket(ticket) {
  return `
    <article class="ticket-card">
      <div class="ticket-card__header">
        <div>
          <h3 class="ticket-card__title">${escapeHtml(ticket.subject)}</h3>
          <div class="badges-group" style="margin-bottom: 16px;">
            ${priorityBadge(ticket.priority)}
            ${statusBadge(ticket.status)}
            <span class="pill pill--neutral">${escapeHtml(ticket.id)}</span>
          </div>
          <p class="workspace-card__copy" style="font-size: 1.1rem; color: var(--text-soft);">${escapeHtml(ticket.summary)}</p>
        </div>
        ${ticket.canEscalateToWhatsapp && ticket.whatsappEscalationLink
      ? `<a class="button button--secondary" href="${escapeHtml(ticket.whatsappEscalationLink)}" target="_blank" rel="noreferrer">Contact Escalation Team</a>`
      : ""
    }
      </div>

      ${ticket.restricted
      ? `<div class="banner banner--warning">${escapeHtml(ticket.restrictedMessage)}</div>`
      : `
            <div class="ticket-card__meta">
              <div class="ticket-card__meta-item">
                <span class="meta-label">Submitted On</span>
                <span class="meta-value">${escapeHtml(formatDate(ticket.createdAt))}</span>
              </div>
              <div class="ticket-card__meta-item">
                <span class="meta-label">Last Updated</span>
                <span class="meta-value">${escapeHtml(formatDate(ticket.updatedAt))}</span>
              </div>
              <div class="ticket-card__meta-item">
                <span class="meta-label">Department</span>
                <span class="meta-value">${escapeHtml(ticket.department)}</span>
              </div>
            </div>
            
            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">Original Request</h4>
              <p style="color: var(--text-soft); line-height: 1.8;">${nl2br(ticket.description)}</p>
              ${attachmentList(ticket.attachments)}
            </div>

            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">Communication Thread</h4>
              ${conversation(ticket.replies)}
            </div>

            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">Client Additions</h4>
              ${conversation(ticket.supplements, "No supplementary files or notes added yet.")}
            </div>

            ${ticket.recordState === "active"
        ? `
                  <form class="surface-form supplement-form" data-ticket-id="${escapeHtml(ticket.id)}" style="margin-top: 56px;">
                    <div class="surface-form__title">Provide More Context</div>
                    <label class="field">
                      <span class="field__label">Additional Details</span>
                      <textarea name="message" placeholder="Add any new symptoms, scope changes, or clarifications..." required></textarea>
                    </label>
                    <div class="form-row">
                      <label class="field">
                        <span class="field__label">Attach Image</span>
                        <input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                      </label>
                      <label class="field">
                        <span class="field__label">Attach Video</span>
                        <input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" />
                      </label>
                    </div>
                    <div style="display: flex; gap: 16px; margin-top: 24px;">
                      <button class="button button--secondary" type="submit">Submit Context</button>
                      ${ticket.status === "replied"
          ? `<button class="button button--primary" type="button" data-action="resolve-ticket" data-ticket-id="${escapeHtml(ticket.id)}">Mark as Solved</button>`
          : ""
        }
                    </div>
                  </form>
                `
        : ""
      }
          `
    }
    </article>
  `;
}

function renderUserView() {
  const tickets = state.bootstrap.tickets || [];
  const visibleTickets = tickets.filter((ticket) => {
    if (state.userFilter === "active") {
      return ticket.recordState === "active";
    }
    if (state.userFilter === "archived") {
      return ticket.recordState === "archived";
    }
    return true;
  });

  const activeCount = tickets.filter((ticket) => ticket.recordState === "active").length;
  const repliedCount = tickets.filter((ticket) => ticket.status === "replied").length;
  const archivedCount = tickets.filter((ticket) => ticket.recordState === "archived").length;

  app.innerHTML = `
    <div class="site-shell site-shell--workspace">
      ${renderTopbar("user")}
      ${renderFlash()}

      <section class="workspace-hero">
        <div class="workspace-hero__copy">
          <div class="eyebrow">Client Workspace</div>
          <h1 class="workspace-hero__title">Every update in one quiet place.</h1>
          <p class="workspace-hero__text">
            View replies, add context, and archive tickets only when you are satisfied the issue is closed.
          </p>
        </div>
        <div class="workspace-hero__stats">
          ${heroMetric("Active", activeCount)}
          ${heroMetric("Awaiting review", repliedCount, "accent")}
          ${heroMetric("Archived", archivedCount, "warm")}
        </div>
      </section>

      <section class="surface-card filter-bar">
        <div>
          <div class="eyebrow">Ticket view</div>
          <h2 class="filter-bar__title">${escapeHtml(state.bootstrap.session.name)}</h2>
        </div>
        <div class="filter-bar__controls">
          <select id="user-filter">
            <option value="active" ${state.userFilter === "active" ? "selected" : ""}>Active only</option>
            <option value="archived" ${state.userFilter === "archived" ? "selected" : ""}>Archived only</option>
            <option value="all" ${state.userFilter === "all" ? "selected" : ""}>Everything</option>
          </select>
          <span class="pill pill--neutral">${escapeHtml(state.bootstrap.session.email)}</span>
        </div>
      </section>

      <section class="workspace-list">
        ${visibleTickets.length ? visibleTickets.map(renderUserTicket).join("") : `<div class="soft-empty">No tickets found for this filter.</div>`}
      </section>

      ${renderFooter()}
    </div>
  `;
}

function filteredAdminTickets() {
  const tickets = state.bootstrap.tickets || [];
  return tickets.filter((ticket) => {
    const search = state.adminFilters.search.trim().toLowerCase();
    const matchesPriority =
      state.adminFilters.priority === "all" || String(ticket.priority) === state.adminFilters.priority;
    const matchesStatus =
      state.adminFilters.status === "all" || ticket.status === state.adminFilters.status;
    const matchesDepartment =
      state.adminFilters.department === "all" || ticket.department === state.adminFilters.department;
    const haystack = `${ticket.id} ${ticket.subject} ${ticket.department} ${ticket.user?.name || ""}`.toLowerCase();
    return matchesPriority && matchesStatus && matchesDepartment && (!search || haystack.includes(search));
  });
}

function renderAdminTicket(ticket) {
  return `
    <article class="ticket-card ticket-card--admin">
      <div class="ticket-card__header">
        <div>
          <h3 class="ticket-card__title">${escapeHtml(ticket.subject)}</h3>
          <div class="badges-group" style="margin-bottom: 16px;">
            ${priorityBadge(ticket.priority)}
            ${statusBadge(ticket.status)}
            <span class="pill pill--neutral">${escapeHtml(ticket.id)}</span>
            <span class="pill pill--neutral">${escapeHtml(ticket.department)}</span>
          </div>
          <p class="workspace-card__copy" style="font-size: 1.1rem; color: var(--text-soft);">${nl2br(ticket.description)}</p>
        </div>
      </div>

      <div class="ticket-card__meta">
        <div class="ticket-card__meta-item">
          <span class="meta-label">Assigned User</span>
          <span class="meta-value">${escapeHtml(ticket.user?.name || "-")}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">User Email</span>
          <span class="meta-value">${escapeHtml(ticket.user?.email || "-")}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">Phone</span>
          <span class="meta-value">${escapeHtml(ticket.contactPhone || "-")}</span>
        </div>
      </div>

      <div class="ticket-card__meta" style="border-top: none; padding-top: 16px; margin-top: 0;">
        <div class="ticket-card__meta-item">
          <span class="meta-label">Created At</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.createdAt))}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">Response SLA</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.responseDeadline))}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">Resolution SLA</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.resolutionDeadline))}</span>
        </div>
      </div>

      <div style="margin-top: 24px;">
        ${attachmentList(ticket.attachments)}
      </div>

      <div class="admin-layout">
        <div>
          <div style="margin-bottom: 48px;">
            <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">Client Supplements</h4>
            ${conversation(ticket.supplements)}
          </div>
          <div>
            <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">Internal Replies</h4>
            ${conversation(ticket.replies)}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          <form class="surface-form admin-reply-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">Draft Reply</h4>
            <label class="field">
              <span class="field__label">Message Context</span>
              <textarea name="message" placeholder="Provide diagnosis, steps taken, or final resolution..." required></textarea>
            </label>
            <label class="field">
              <span class="field__label">Upload Documents</span>
              <input name="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.webm,.pdf,image/jpeg,image/png,video/mp4,video/webm,application/pdf" />
            </label>
            <label class="field">
              <span class="field__label">Post-Reply Status</span>
              <select name="nextStatus">
                <option value="replied" ${ticket.status === "replied" ? "selected" : ""}>Awaiting Client (Replied)</option>
                <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>In Progress</option>
                <option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>Mark Resolved</option>
              </select>
            </label>
            <button class="button button--primary button--full" style="margin-top: 16px;" type="submit">Deploy Message</button>
          </form>

          <form class="surface-form admin-priority-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">Adjust Urgency</h4>
            <label class="field">
              <span class="field__label">Priority Level</span>
              <select name="priority">
                <option value="1" ${ticket.priority === 1 ? "selected" : ""}>Priority 1 (Critical)</option>
                <option value="2" ${ticket.priority === 2 ? "selected" : ""}>Priority 2 (High)</option>
                <option value="3" ${ticket.priority === 3 ? "selected" : ""}>Priority 3 (Standard)</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">Justification</span>
              <textarea style="min-height: 80px;" name="reason" placeholder="Brief reason for adjustment..." required></textarea>
            </label>
            <button class="button button--secondary button--full" style="margin-top: 16px;" type="submit">Save Priority</button>
          </form>

          <form class="surface-form admin-status-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">Quick Status</h4>
            <label class="field">
              <span class="field__label">State Override</span>
              <select name="status">
                <option value="pending" ${ticket.status === "pending" ? "selected" : ""}>Pending Review</option>
                <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>In Progress</option>
                <option value="replied" ${ticket.status === "replied" ? "selected" : ""}>Awaiting Client</option>
                <option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>Resolved / Closed</option>
              </select>
            </label>
            <button class="button button--ghost button--full" style="margin-top: 16px;" type="submit">Force Update</button>
          </form>
        </div>
      </div>
    </article>
  `;
}

function renderAdminView() {
  const report = state.bootstrap.report;
  const departments = [...new Set((state.bootstrap.tickets || []).map((ticket) => ticket.department))];
  const tickets = filteredAdminTickets();

  app.innerHTML = `
    <div class="site-shell site-shell--workspace">
      ${renderTopbar("admin")}
      ${renderFlash()}

      <section class="workspace-hero workspace-hero--admin">
        <div class="workspace-hero__copy">
          <div class="eyebrow">Operational Command</div>
          <h1 class="workspace-hero__title">Elegant triage for complex support volume.</h1>
          <p class="workspace-hero__text">
            Review tickets, respond with evidence, tune priorities, and keep the service layer composed under pressure.
          </p>
        </div>
        <div class="workspace-hero__stats workspace-hero__stats--admin">
          ${heroMetric("Unresolved", report.unresolvedCount)}
          ${heroMetric("Avg. response", report.averageResponseHours ?? "-", "accent")}
          ${heroMetric("Avg. resolve", report.averageResolutionHours ?? "-", "warm")}
          ${heroMetric("SLA response", `${report.sla.responseRate ?? "-"}%`, "calm")}
        </div>
      </section>

      <section class="surface-card filter-bar filter-bar--admin">
        <div>
          <div class="eyebrow">Filter set</div>
          <h2 class="filter-bar__title">Ticket overview</h2>
        </div>
        <div class="filter-bar__controls filter-bar__controls--grid">
          <select id="admin-filter-priority">
            <option value="all">All priorities</option>
            <option value="1" ${state.adminFilters.priority === "1" ? "selected" : ""}>P1</option>
            <option value="2" ${state.adminFilters.priority === "2" ? "selected" : ""}>P2</option>
            <option value="3" ${state.adminFilters.priority === "3" ? "selected" : ""}>P3</option>
          </select>
          <select id="admin-filter-status">
            <option value="all">All statuses</option>
            <option value="pending" ${state.adminFilters.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="in_progress" ${state.adminFilters.status === "in_progress" ? "selected" : ""}>In progress</option>
            <option value="replied" ${state.adminFilters.status === "replied" ? "selected" : ""}>Replied</option>
            <option value="resolved" ${state.adminFilters.status === "resolved" ? "selected" : ""}>Resolved</option>
          </select>
          <select id="admin-filter-department">
            <option value="all">All departments</option>
            ${departments.map((item) => `<option value="${escapeHtml(item)}" ${state.adminFilters.department === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
          <input id="admin-filter-search" type="search" value="${escapeHtml(state.adminFilters.search)}" placeholder="Search by ticket, subject, or user" />
        </div>
      </section>

      <section class="workspace-list">
        ${tickets.length ? tickets.map(renderAdminTicket).join("") : `<div class="soft-empty">No tickets match the current filter set.</div>`}
      </section>

      ${renderFooter()}
    </div>
  `;
}

function render() {
  if (!state.bootstrap) {
    renderPublicPage();
    return;
  }

  if (state.bootstrap.role === "admin") {
    renderAdminView();
    return;
  }

  renderUserView();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Unable to read file ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Unable to inspect video ${file.name}.`));
    };
    video.src = url;
  });
}

async function filePayload(file) {
  const isVideo = file.type.startsWith("video/");
  return {
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    base64: await readFileAsDataUrl(file),
    kind: isVideo ? "recording" : file.type === "application/pdf" ? "document" : "image",
    durationSec: isVideo ? await readVideoDuration(file) : null,
  };
}

async function collectUserAttachments(form) {
  const items = [];
  const image = form.querySelector('input[name="image"]')?.files?.[0];
  const recording = form.querySelector('input[name="recording"]')?.files?.[0];
  if (image) {
    items.push(await filePayload(image));
  }
  if (recording) {
    items.push(await filePayload(recording));
  }
  return items;
}

async function collectAdminAttachments(form) {
  const files = Array.from(form.querySelector('input[name="attachments"]')?.files || []);
  const items = [];
  for (const file of files) {
    items.push(await filePayload(file));
  }
  return items;
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();

  try {
    if (form.id === "public-ticket-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectUserAttachments(form);
      const result = await api("/api/public/tickets", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      state.flash = { type: "info", message: `Ticket created: ${result.ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.id === "public-lookup-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/public/tickets/lookup", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      state.flash = { type: "info", message: `Ticket opened: ${result.ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.id === "admin-login-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/admin-login", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      state.flash = { type: "info", message: "Admin console opened." };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("supplement-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectUserAttachments(form);
      await api(`/api/user/tickets/${ticketId}/supplement`, { method: "POST", body });
      state.flash = { type: "info", message: `Update added to ${ticketId}.` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-reply-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectAdminAttachments(form);
      await api(`/api/admin/tickets/${ticketId}/reply`, { method: "POST", body });
      state.flash = { type: "info", message: `Reply sent for ${ticketId}.` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-priority-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/priority`, { method: "POST", body });
      state.flash = { type: "info", message: `Priority updated for ${ticketId}.` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-status-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/status`, { method: "POST", body });
      state.flash = { type: "info", message: `Status updated for ${ticketId}.` };
      await loadBootstrap();
    }
  } catch (error) {
    setFlash("error", error.message);
  }
}

async function handleClick(event) {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) {
    return;
  }

  try {
    if (trigger.dataset.action === "logout") {
      try {
        await api("/api/logout", { method: "POST" });
      } catch (error) {
        console.warn(error);
      }

      state.token = "";
      state.bootstrap = null;
      localStorage.removeItem("ticketing_token");
      state.flash = { type: "info", message: "Returned to the public homepage." };
      render();
      return;
    }

    if (trigger.dataset.action === "resolve-ticket") {
      const ticketId = trigger.dataset.ticketId;
      await api(`/api/user/tickets/${ticketId}/resolve`, { method: "POST" });
      state.flash = { type: "info", message: `${ticketId} archived successfully.` };
      await loadBootstrap();
    }
  } catch (error) {
    setFlash("error", error.message);
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.id === "user-filter") {
    state.userFilter = target.value;
    render();
    return;
  }

  if (target.id === "admin-filter-priority") {
    state.adminFilters.priority = target.value;
    render();
    return;
  }

  if (target.id === "admin-filter-status") {
    state.adminFilters.status = target.value;
    render();
    return;
  }

  if (target.id === "admin-filter-department") {
    state.adminFilters.department = target.value;
    render();
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  if (target.id === "admin-filter-search") {
    state.adminFilters.search = target.value;
    render();
  }
}

document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("input", handleInput);

loadBootstrap();

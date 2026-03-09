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

function setFlash(type, message) {
  state.flash = { type, message };
  render();
}

function renderFlash() {
  if (!state.flash) {
    return "";
  }
  const className =
    state.flash.type === "error"
      ? "notice notice--error"
      : state.flash.type === "warning"
        ? "notice notice--warning"
        : "notice";
  return `<div class="${className}">${escapeHtml(state.flash.message)}</div>`;
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
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${(value / 1024).toFixed(1)} KB`;
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

function renderHeader(title, subtitle, rightContent) {
  return `
    <section class="panel header">
      <div>
        <div class="header__eyebrow">Google Enterprise Ticketing</div>
        <h1 class="header__title">${escapeHtml(title)}</h1>
        <p class="header__subtitle">${escapeHtml(subtitle)}</p>
      </div>
      <div class="header__meta">${rightContent}</div>
    </section>
  `;
}

function statusBadge(status) {
  const labels = {
    pending: "待处理",
    in_progress: "处理中",
    replied: "已回复",
    resolved: "已解决",
    restricted: "直接联络",
  };
  return `<span class="status-pill status-pill--${status}">${labels[status] || status}</span>`;
}

function priorityBadge(priority) {
  return `<span class="status-pill status-pill--p${priority}">P${priority}</span>`;
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
              <span class="muted">${escapeHtml(formatBytes(item.size))}</span>
            </a>
          `
        )
        .join("")}
    </div>
  `;
}

function conversation(entries) {
  if (!entries || entries.length === 0) {
    return `<div class="empty">暂无更新。</div>`;
  }
  return `
    <div class="conversation">
      ${entries
        .map(
          (entry) => `
            <div class="bubble ${entry.authorRole === "admin" ? "bubble--admin" : ""} ${entry.system ? "bubble--system" : ""}">
              <div class="bubble__meta">
                <span>${escapeHtml(entry.authorRole === "admin" ? "Support Team" : "User")}</span>
                <span>${escapeHtml(formatDate(entry.createdAt))}</span>
              </div>
              <div>${nl2br(entry.message)}</div>
              ${attachmentList(entry.attachments)}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPublicPage() {
  app.innerHTML = `
    <div class="shell">
      ${renderHeader(
        "公开反馈入口",
        "用户无需登录即可提交问题。提交成功后会自动进入自己的 ticket 视图；后续也可以用 ticket ID + email 查进度。",
        `
          <span class="badge">No user login</span>
          <span class="badge">MongoDB ready</span>
          <span class="badge">Mobile friendly</span>
        `
      )}
      ${renderFlash()}
      <section class="panel section auth-grid">
        <div class="card-list">
          <div class="panel auth-card">
            <h2 class="auth-card__title">提交问题</h2>
            <p class="auth-card__copy">公开提交后系统会自动建档，并按关键字、问题类型、截图、录屏做优先级初判。</p>
            <form id="public-ticket-form" class="form">
              <div class="row">
                <div class="field">
                  <label>姓名</label>
                  <input name="name" type="text" required />
                </div>
                <div class="field">
                  <label>Email</label>
                  <input name="email" type="email" required />
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label>联系电话</label>
                  <input name="phone" type="text" required />
                </div>
                <div class="field">
                  <label>部门</label>
                  <input name="department" type="text" required />
                </div>
              </div>
              <div class="row">
                <div class="field">
                  <label>问题类型</label>
                  <select name="issueType" required>
                    ${ISSUE_TYPES.map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join("")}
                  </select>
                </div>
                <div class="field">
                  <label>问题标题</label>
                  <input name="subject" type="text" required />
                </div>
              </div>
              <div class="field">
                <label>问题描述</label>
                <textarea name="description" required></textarea>
              </div>
              <div class="row">
                <div class="field">
                  <label>截图</label>
                  <input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                </div>
                <div class="field">
                  <label>录屏</label>
                  <input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" />
                </div>
              </div>
              <div class="actions">
                <button class="btn btn--primary" type="submit">提交 ticket</button>
              </div>
            </form>
          </div>
        </div>
        <div class="card-list">
          <div class="panel auth-card">
            <h2 class="auth-card__title">查进度</h2>
            <p class="auth-card__copy">不登录，直接用 ticket ID 和 email 取回自己的 ticket 视图。</p>
            <form id="public-lookup-form" class="form">
              <div class="field">
                <label>Ticket ID</label>
                <input name="ticketId" type="text" placeholder="TKT-20260309-0001" required />
              </div>
              <div class="field">
                <label>Email</label>
                <input name="email" type="email" required />
              </div>
              <div class="actions">
                <button class="btn btn--secondary" type="submit">查询 ticket</button>
              </div>
            </form>
          </div>
          <div class="panel auth-card">
            <h2 class="auth-card__title">管理员后台</h2>
            <p class="auth-card__copy">管理员仍然使用账号密码登录，公开用户不需要。</p>
            <form id="admin-login-form" class="form">
              <div class="field">
                <label>Email</label>
                <input name="email" type="email" value="admin@gov-support.local" required />
              </div>
              <div class="field">
                <label>密码</label>
                <input name="password" type="password" value="Admin123!" required />
              </div>
              <div class="actions">
                <button class="btn btn--primary" type="submit">管理员登录</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderUserView() {
  const tickets = (state.bootstrap.tickets || []).filter((ticket) => {
    if (state.userFilter === "active") {
      return ticket.recordState === "active";
    }
    if (state.userFilter === "archived") {
      return ticket.recordState === "archived";
    }
    return true;
  });

  app.innerHTML = `
    <div class="shell">
      ${renderHeader(
        "我的 tickets",
        "公开提交后自动生成的用户会话。你可以直接补充信息、看回复、封存已解决 ticket。",
        `
          <span class="badge">${escapeHtml(state.bootstrap.session.name)}</span>
          <span class="badge">${escapeHtml(state.bootstrap.session.email)}</span>
          <button class="btn btn--secondary" data-action="logout">返回公开入口</button>
        `
      )}
      ${renderFlash()}
      <section class="panel section">
        <div class="filters">
          <select id="user-filter">
            <option value="active" ${state.userFilter === "active" ? "selected" : ""}>活跃中</option>
            <option value="archived" ${state.userFilter === "archived" ? "selected" : ""}>封存区</option>
            <option value="all" ${state.userFilter === "all" ? "selected" : ""}>全部</option>
          </select>
        </div>
        <div class="card-list">
          ${tickets.length ? tickets.map(renderUserTicket).join("") : `<div class="empty">没有 ticket。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderUserTicket(ticket) {
  return `
    <article class="ticket-card">
      <div class="ticket-card__head">
        <div>
          <div class="ticket-card__meta">
            ${priorityBadge(ticket.priority)}
            ${statusBadge(ticket.status)}
            <span class="badge">${escapeHtml(ticket.id)}</span>
          </div>
          <h3 class="ticket-card__title">${escapeHtml(ticket.subject)}</h3>
          <p class="ticket-card__summary">${escapeHtml(ticket.summary)}</p>
        </div>
        ${ticket.canEscalateToWhatsapp && ticket.whatsappEscalationLink ? `<a class="btn btn--danger" href="${escapeHtml(ticket.whatsappEscalationLink)}" target="_blank" rel="noreferrer">仍未解决？直接联系我们</a>` : ""}
      </div>
      ${ticket.restricted ? `<div class="notice notice--warning">${escapeHtml(ticket.restrictedMessage)}</div>` : `
        <p class="ticket-card__summary">${nl2br(ticket.description)}</p>
        ${attachmentList(ticket.attachments)}
        <div><strong>管理员回复</strong>${conversation(ticket.replies)}</div>
        <div><strong>补充信息</strong>${conversation(ticket.supplements)}</div>
        ${ticket.recordState === "active" ? `
          <form class="form supplement-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <div class="field">
              <label>补充说明</label>
              <textarea name="message" required></textarea>
            </div>
            <div class="row">
              <div class="field"><label>补充截图</label><input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" /></div>
              <div class="field"><label>补充录屏</label><input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" /></div>
            </div>
            <div class="actions">
              <button class="btn btn--secondary" type="submit">提交补充</button>
              ${ticket.status === "replied" ? `<button class="btn btn--primary" type="button" data-action="resolve-ticket" data-ticket-id="${escapeHtml(ticket.id)}">已解决，封存</button>` : ""}
            </div>
          </form>
        ` : ""}
      `}
    </article>
  `;
}

function filteredAdminTickets() {
  const tickets = state.bootstrap.tickets || [];
  return tickets.filter((ticket) => {
    const search = state.adminFilters.search.trim().toLowerCase();
    const matchesPriority = state.adminFilters.priority === "all" || String(ticket.priority) === state.adminFilters.priority;
    const matchesStatus = state.adminFilters.status === "all" || ticket.status === state.adminFilters.status;
    const matchesDepartment =
      state.adminFilters.department === "all" || ticket.department === state.adminFilters.department;
    const matchesSearch =
      !search ||
      `${ticket.id} ${ticket.subject} ${ticket.department} ${ticket.user?.name || ""}`
        .toLowerCase()
        .includes(search);
    return matchesPriority && matchesStatus && matchesDepartment && matchesSearch;
  });
}

function renderAdminView() {
  const report = state.bootstrap.report;
  const departments = [...new Set((state.bootstrap.tickets || []).map((ticket) => ticket.department))];
  const tickets = filteredAdminTickets();

  app.innerHTML = `
    <div class="shell">
      ${renderHeader(
        "管理员后台",
        "MongoDB 持久化、公开提交入口、P1/P2/P3 规则、封存、合并、报表都在这里处理。",
        `
          <span class="badge">${escapeHtml(state.bootstrap.session.name)}</span>
          <a class="btn btn--secondary" href="/api/admin/reports/export.csv?token=${encodeURIComponent(state.token)}">CSV</a>
          <a class="btn btn--secondary" href="/api/admin/reports/export.pdf?token=${encodeURIComponent(state.token)}">PDF</a>
          <button class="btn btn--primary" data-action="logout">登出</button>
        `
      )}
      ${renderFlash()}
      <section class="panel section">
        <div class="stats">
          <div class="stat-card"><div class="stat-card__label">未结案</div><div class="stat-card__value">${report.unresolvedCount}</div></div>
          <div class="stat-card"><div class="stat-card__label">平均响应</div><div class="stat-card__value">${report.averageResponseHours ?? "-"}</div></div>
          <div class="stat-card"><div class="stat-card__label">平均解决</div><div class="stat-card__value">${report.averageResolutionHours ?? "-"}</div></div>
          <div class="stat-card"><div class="stat-card__label">SLA 响应率</div><div class="stat-card__value">${report.sla.responseRate ?? "-" }%</div></div>
        </div>
      </section>
      <section class="panel section">
        <div class="filters">
          <select id="admin-filter-priority">
            <option value="all">全部优先级</option>
            <option value="1" ${state.adminFilters.priority === "1" ? "selected" : ""}>P1</option>
            <option value="2" ${state.adminFilters.priority === "2" ? "selected" : ""}>P2</option>
            <option value="3" ${state.adminFilters.priority === "3" ? "selected" : ""}>P3</option>
          </select>
          <select id="admin-filter-status">
            <option value="all">全部状态</option>
            <option value="pending" ${state.adminFilters.status === "pending" ? "selected" : ""}>待处理</option>
            <option value="in_progress" ${state.adminFilters.status === "in_progress" ? "selected" : ""}>处理中</option>
            <option value="replied" ${state.adminFilters.status === "replied" ? "selected" : ""}>已回复</option>
            <option value="resolved" ${state.adminFilters.status === "resolved" ? "selected" : ""}>已解决</option>
          </select>
          <select id="admin-filter-department">
            <option value="all">全部部门</option>
            ${departments.map((item) => `<option value="${escapeHtml(item)}" ${state.adminFilters.department === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
          <input id="admin-filter-search" type="search" value="${escapeHtml(state.adminFilters.search)}" placeholder="搜索 ticket / 部门 / 用户" />
        </div>
      </section>
      <section class="panel section">
        <div class="card-list">
          ${tickets.length ? tickets.map(renderAdminTicket).join("") : `<div class="empty">没有符合条件的 ticket。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderAdminTicket(ticket) {
  return `
    <article class="ticket-card">
      <div class="ticket-card__head">
        <div>
          <div class="ticket-card__meta">
            ${priorityBadge(ticket.priority)}
            ${statusBadge(ticket.status)}
            <span class="badge">${escapeHtml(ticket.id)}</span>
            <span class="badge">${escapeHtml(ticket.department)}</span>
          </div>
          <h3 class="ticket-card__title">${escapeHtml(ticket.subject)}</h3>
          <p class="ticket-card__summary">${nl2br(ticket.description)}</p>
        </div>
      </div>
      <div class="ticket-card__detail-grid">
        <div class="detail-item"><span class="detail-item__label">用户</span>${escapeHtml(ticket.user?.name || "-")}</div>
        <div class="detail-item"><span class="detail-item__label">Email</span>${escapeHtml(ticket.user?.email || "-")}</div>
        <div class="detail-item"><span class="detail-item__label">电话</span>${escapeHtml(ticket.contactPhone || "-")}</div>
        <div class="detail-item"><span class="detail-item__label">建立时间</span>${escapeHtml(formatDate(ticket.createdAt))}</div>
        <div class="detail-item"><span class="detail-item__label">响应 SLA</span>${escapeHtml(formatDate(ticket.responseDeadline))}</div>
        <div class="detail-item"><span class="detail-item__label">解决 SLA</span>${escapeHtml(formatDate(ticket.resolutionDeadline))}</div>
      </div>
      ${attachmentList(ticket.attachments)}
      <div class="split">
        <div class="card-list">
          <div><strong>用户补充</strong>${conversation(ticket.supplements)}</div>
          <div><strong>管理员回复</strong>${conversation(ticket.replies)}</div>
        </div>
        <div class="card-list">
          <form class="form admin-reply-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <div class="field"><label>回复</label><textarea name="message" required></textarea></div>
            <div class="field"><label>附件</label><input name="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.webm,.pdf,image/jpeg,image/png,video/mp4,video/webm,application/pdf" /></div>
            <div class="field">
              <label>状态</label>
              <select name="nextStatus">
                <option value="replied">已回复</option>
                <option value="in_progress">处理中</option>
                <option value="resolved">已解决</option>
              </select>
            </div>
            <div class="actions"><button class="btn btn--primary" type="submit">发送回复</button></div>
          </form>
          <form class="inline-form admin-priority-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <div class="field">
              <label>优先级</label>
              <select name="priority">
                <option value="1" ${ticket.priority === 1 ? "selected" : ""}>P1</option>
                <option value="2" ${ticket.priority === 2 ? "selected" : ""}>P2</option>
                <option value="3" ${ticket.priority === 3 ? "selected" : ""}>P3</option>
              </select>
            </div>
            <div class="field"><label>原因</label><textarea name="reason" required></textarea></div>
            <div class="actions"><button class="btn btn--secondary" type="submit">更新优先级</button></div>
          </form>
          <form class="inline-form admin-status-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <div class="field">
              <label>状态</label>
              <select name="status">
                <option value="pending">待处理</option>
                <option value="in_progress">处理中</option>
                <option value="replied">已回复</option>
                <option value="resolved">已解决</option>
              </select>
            </div>
            <div class="actions"><button class="btn btn--ghost" type="submit">更新状态</button></div>
          </form>
        </div>
      </div>
    </article>
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
  const files = [];
  const image = form.querySelector('input[name="image"]')?.files?.[0];
  const recording = form.querySelector('input[name="recording"]')?.files?.[0];
  if (image) {
    files.push(await filePayload(image));
  }
  if (recording) {
    files.push(await filePayload(recording));
  }
  return files;
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
      state.flash = { type: "info", message: `Ticket 已提交：${result.ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.id === "public-lookup-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/public/tickets/lookup", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      state.flash = { type: "info", message: `已打开 ${result.ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.id === "admin-login-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/admin-login", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      state.flash = { type: "info", message: "管理员登录成功。" };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("supplement-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectUserAttachments(form);
      await api(`/api/user/tickets/${ticketId}/supplement`, { method: "POST", body });
      state.flash = { type: "info", message: `已补充 ${ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-reply-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectAdminAttachments(form);
      await api(`/api/admin/tickets/${ticketId}/reply`, { method: "POST", body });
      state.flash = { type: "info", message: `已回复 ${ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-priority-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/priority`, { method: "POST", body });
      state.flash = { type: "info", message: `已更新优先级 ${ticketId}` };
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-status-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/status`, { method: "POST", body });
      state.flash = { type: "info", message: `已更新状态 ${ticketId}` };
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
      state.flash = { type: "info", message: "已返回公开入口。" };
      render();
      return;
    }

    if (trigger.dataset.action === "resolve-ticket") {
      const ticketId = trigger.dataset.ticketId;
      await api(`/api/user/tickets/${ticketId}/resolve`, { method: "POST" });
      state.flash = { type: "info", message: `${ticketId} 已封存。` };
      await loadBootstrap();
    }
  } catch (error) {
    setFlash("error", error.message);
  }
}

function handleChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) {
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

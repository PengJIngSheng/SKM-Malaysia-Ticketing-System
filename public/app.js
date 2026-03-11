const app = document.getElementById("app");

const state = {
  token: localStorage.getItem("ticketing_token") || "",
  lang: localStorage.getItem("ticketing_lang") || "en",
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

const TRANSLATIONS = {
  en: {
    publicFeedback: "Swift solutions, Real results",
    adminConsole: "Admin Console",
    clientWorkspace: "Client Workspace",
    submitRequest: "Submit Request",
    lookupTicket: "Lookup Ticket",
    supportDesk: "Support Desk",
    returnHome: "Return Home",
    ticketing: "Ticketing",
    // --- Public Page ---
    heroExc: "Exceptional",
    heroSup: "Support",
    heroDel: "Delivered.",
    heroSub: "Submit your request below. We handle priority operations with focus, ensuring your workflows remain uninterrupted.",
    newReq: "NEW REQUEST",
    trackStat: "Track Status",
    intakeForm: "Intake Form",
    tellNeed: "Tell us what you need",
    fullName: "Full Name",
    emailAdd: "Email Address",
    phoneNum: "Phone Number",
    dept: "Department",
    category: "Category",
    subject: "Subject",
    desc: "Detailed Description",
    atchImg: "Attach Image (Optional)",
    atchVid: "Record Screen (Max 60s)",
    extTkts: "Existing Tickets",
    extSub: "Track your ongoing request, or log in as an administrator.",
    clientVal: "Client Validation",
    trkYourTkt: "Track your ticket",
    tktId: "Ticket ID",
    assocEmail: "Associated Email",
    staffAcc: "Staff Access",
    adminLog: "Admin Login",
    adminEmail: "Admin Email",
    secPass: "Secure Password",
    enterWsp: "Enter Workspace",
    // --- Footer ---
    footTitle: "Support Elevated.",
    footText: "Delivering premium enterprise assistance with calm and clarity.",
    // --- Issue Types ---
    isOutage: "System Outage / Wide Impact",
    isAccess: "Access / Login Issue",
    isConfig: "Configuration Issue",
    isSec: "Security / Risk Incident",
    isData: "Data Loss / Sync Error",
    isTrain: "Training / Operation Issue",
    isCons: "General Consultation",
    // --- Statuses ---
    stPend: "Pending",
    stProg: "In Progress",
    stRep: "Replied",
    stRes: "Resolved",
    stRestr: "Contact Directly",
    // --- User Ticket ---
    escTeam: "Contact Escalation Team",
    submOn: "Submitted On",
    lastUpd: "Last Updated",
    origReq: "Original Request",
    commThrd: "Communication Thread",
    clientAdd: "Client Additions",
    noSupp: "No supplementary files or notes added yet.",
    provCtx: "Provide More Context",
    addDet: "Additional Details",
    addDetPh: "Add any new symptoms, scope changes, or clarifications...",
    atchVd: "Attach Video",
    subCtx: "Submit Context",
    markSolv: "Mark as Solved",
    supTeam: "Support Team",
    usr: "User",
    // --- User View ---
    quietPlc: "Every update in one quiet place.",
    viewRep: "View replies, add context, and archive tickets only when you are satisfied the issue is closed.",
    actve: "Active",
    awaitRev: "Awaiting review",
    archvd: "Archived",
    tktView: "Ticket view",
    actveOnly: "Active only",
    archOnly: "Archived only",
    everythg: "Everything",
    noTkts: "No tickets found for this filter.",
    // --- Admin Ticket ---
    asgnUsr: "Assigned User",
    usrEmail: "User Email",
    phone: "Phone",
    creAt: "Created At",
    respSla: "Response SLA",
    resoSla: "Resolution SLA",
    cliSup: "Client Supplements",
    intRep: "Internal Replies",
    drfRep: "Draft Reply",
    msgCtx: "Message Context",
    msgCtxPh: "Provide diagnosis, steps taken, or final resolution...",
    uplDoc: "Upload Documents",
    postRep: "Post-Reply Status",
    awtCli: "Awaiting Client (Replied)",
    inPrg: "In Progress",
    mrkRes: "Mark Resolved",
    depMsg: "Deploy Message",
    adjUrg: "Adjust Urgency",
    priLvl: "Priority Level",
    p1: "Priority 1 (Critical)",
    p2: "Priority 2 (High)",
    p3: "Priority 3 (Standard)",
    jus: "Justification",
    jusPh: "Brief reason for adjustment...",
    svPri: "Save Priority",
    qStt: "Quick Status",
    stOvr: "State Override",
    penRev: "Pending Review",
    resClo: "Resolved / Closed",
    frcUpd: "Force Update",
    // --- Admin View ---
    opCmd: "Operational Command",
    eleTrg: "Elegant triage for complex support volume.",
    revTks: "Review tickets, respond with evidence, tune priorities, and keep the service layer composed under pressure.",
    unres: "Unresolved",
    avgRes: "Avg. response",
    avgReso: "Avg. resolve",
    slaRes: "SLA response",
    fltSet: "Filter set",
    tktOv: "Ticket overview",
    allPri: "All priorities",
    allStat: "All statuses",
    allDep: "All departments",
    srchTk: "Search by ticket, subject, or user",
    noMtc: "No tickets match the current filter set."
  },
  ms: {
    publicFeedback: "Maklum Balas Awam",
    adminConsole: "Konsol Pentadbir",
    clientWorkspace: "Ruang Klien",
    submitRequest: "Hantar Permintaan",
    lookupTicket: "Semak Tiket",
    supportDesk: "Meja Bantuan",
    returnHome: "Kembali ke Laman Utama",
    ticketing: "Sistem Tiket",
    heroExc: "Penyelesaian",
    heroSup: "Sokongan",
    heroDel: "Luar Biasa.",
    heroSub: "Hantarkan permintaan anda di bawah. Kami menguruskan operasi keutamaan dengan fokus, memastikan aliran kerja anda tidak terganggu.",
    newReq: "PERMINTAAN BARU",
    trackStat: "Jejak Status",
    intakeForm: "Borang Permintaan",
    tellNeed: "Beritahu kami keperluan anda",
    fullName: "Nama Penuh",
    emailAdd: "Alamat E-mel",
    phoneNum: "Nombor Telefon",
    dept: "Agensi/syarikat",
    category: "Kategori",
    subject: "Subjek",
    desc: "Penerangan Terperinci",
    atchImg: "Lampirkan Imej (Pilihan)",
    atchVid: "Rakam Skrin (Max 60s)",
    extTkts: "Tiket Sedia Ada",
    extSub: "Jejak permintaan semasa anda, atau log masuk sebagai pentadbir.",
    clientVal: "Pengesahan Klien",
    trkYourTkt: "Jejak tiket anda",
    tktId: "ID Tiket",
    assocEmail: "E-mel Berkaitan",
    staffAcc: "Akses Pekerja",
    adminLog: "Log Masuk Pentadbir",
    adminEmail: "E-mel Pentadbir",
    secPass: "Kata Laluan Selamat",
    enterWsp: "Masuk ke Ruang Kerja",
    footTitle: "Sokongan Dipertingkatkan.",
    footText: "Menyampaikan bantuan perusahaan premium dengan tenang dan jelas.",
    isOutage: "Gangguan Sistem / Kesan Meluas",
    isAccess: "Masalah Akses / Log Masuk",
    isConfig: "Masalah Konfigurasi",
    isSec: "Keselamatan / Insiden Risiko",
    isData: "Kehilangan Data / Ralat Penyegerakan",
    isTrain: "Latihan / Masalah Operasi",
    isCons: "Perundingan Umum",
    stPend: "Belum Selesai",
    stProg: "Dalam Proses",
    stRep: "Telah Dibalas",
    stRes: "Diselesaikan",
    stRestr: "Hubungi Terus",
    escTeam: "Hubungi Pasukan Eskalasi",
    submOn: "Dihantar Pada",
    lastUpd: "Kemas Kini Terakhir",
    origReq: "Permintaan Asal",
    commThrd: "Urutan Komunikasi",
    clientAdd: "Tambahan Klien",
    noSupp: "Tiada fail atau nota tambahan setakat ini.",
    provCtx: "Berikan Konteks Tambahan",
    addDet: "Butiran Tambahan",
    addDetPh: "Tambah mana-mana gejala baharu, perubahan skop, atau penjelasan...",
    atchVd: "Lampirkan Video",
    subCtx: "Hantar Konteks",
    markSolv: "Tandakan Selesai",
    supTeam: "Pasukan Sokongan",
    usr: "Pengguna",
    quietPlc: "Setiap kemas kini di satu tempat yang tenang.",
    viewRep: "Lihat balasan, tambah konteks, dan arkib tiket hanya apabila anda berpuas hati isu tersebut telah ditutup.",
    actve: "Aktif",
    awaitRev: "Menunggu semakan",
    archvd: "Diarkibkan",
    tktView: "Paparan tiket",
    actveOnly: "Aktif sahaja",
    archOnly: "Diarkibkan sahaja",
    everythg: "Semuanya",
    noTkts: "Tiada tiket untuk penapis ini.",
    asgnUsr: "Pengguna Ditugaskan",
    usrEmail: "E-mel Pengguna",
    phone: "Telefon",
    creAt: "Dicipta Pada",
    respSla: "SLA Respons",
    resoSla: "SLA Penyelesaian",
    cliSup: "Tambahan Klien",
    intRep: "Balasan Dalaman",
    drfRep: "Draf Balasan",
    msgCtx: "Konteks Mesej",
    msgCtxPh: "Berikan diagnosis, langkah yang diambil, atau penyelesaian akhir...",
    uplDoc: "Muat Naik Dokumen",
    postRep: "Status Selepas Balasan",
    awtCli: "Menunggu Klien (Dibalas)",
    inPrg: "Sedang Berlangsung",
    mrkRes: "Tandakan Selesai",
    depMsg: "Hantar Mesej",
    adjUrg: "Selaraskan Keutamaan",
    priLvl: "Tahap Keutamaan",
    p1: "Keutamaan 1 (Kritikal)",
    p2: "Keutamaan 2 (Tinggi)",
    p3: "Keutamaan 3 (Standard)",
    jus: "Justifikasi",
    jusPh: "Sebab ringkas untuk pelarasan...",
    svPri: "Simpan Keutamaan",
    qStt: "Status Pantas",
    stOvr: "Timpa Status",
    penRev: "Menunggu Semakan",
    resClo: "Diselesaikan / Ditutup",
    frcUpd: "Paksa Kemas Kini",
    opCmd: "Arahan Operasi",
    eleTrg: "Saringan elegan untuk volum sokongan yang kompleks.",
    revTks: "Semak tiket, balas dengan bukti, selaraskan keutamaan, dan pastikan lapisan perkhidmatan tenang di bawah tekanan.",
    unres: "Belum Selesai",
    avgRes: "Purata respons",
    avgReso: "Purata penyelesaian",
    slaRes: "Respons SLA",
    fltSet: "Set penapis",
    tktOv: "Gambaran tiket",
    allPri: "Semua keutamaan",
    allStat: "Semua status",
    allDep: "Semua jabatan",
    srchTk: "Cari fail tiket, subjek, pengguna",
    noMtc: "Tiada tiket sepadan dengan penapis."
  },
  zh: {
    publicFeedback: "公众反馈",
    adminConsole: "管理控制台",
    clientWorkspace: "客户工作区",
    submitRequest: "提交请求",
    lookupTicket: "查询工单",
    supportDesk: "支持中心",
    returnHome: "返回首页",
    ticketing: "工单系统",
    heroExc: "交付前所未有的",
    heroSup: "支持体验",
    heroDel: "与保障。",
    heroSub: "在下方提交您的请求。我们将高度专注处理紧急操作，确保您的工作流不被打断。",
    newReq: "新建请求",
    trackStat: "追踪状态",
    intakeForm: "需求表单",
    tellNeed: "告诉我们您的需求",
    fullName: "全名",
    emailAdd: "电子邮件",
    phoneNum: "电话号码",
    dept: "部门",
    category: "问题分类",
    subject: "主旨",
    desc: "详细描述",
    atchImg: "上传图片 (可选)",
    atchVid: "录制屏幕 (最长 60秒)",
    extTkts: "已有工单",
    extSub: "追踪您的当前进度，或作为管理员登录。",
    clientVal: "客户验证",
    trkYourTkt: "查询您的工单",
    tktId: "工单编号",
    assocEmail: "关联邮箱",
    staffAcc: "员工通道",
    adminLog: "管理员登录",
    adminEmail: "管理员邮箱",
    secPass: "安全密码",
    enterWsp: "进入工作区",
    footTitle: "支持，重新定义。",
    footText: "以冷静与清晰的态度，提供顶级企业支援方案。",
    isOutage: "系统中断 / 多人受影响",
    isAccess: "权限 / 登录问题",
    isConfig: "配置问题",
    isSec: "安全 / 风险事件",
    isData: "资料遗失 / 同步异常",
    isTrain: "培训 / 操作问题",
    isCons: "一般咨询",
    stPend: "待处理",
    stProg: "处理中",
    stRep: "已回复",
    stRes: "已解决",
    stRestr: "直接联络",
    escTeam: "联络升级团队",
    submOn: "提交时间",
    lastUpd: "最后更新",
    origReq: "原始请求",
    commThrd: "沟通记录",
    clientAdd: "客户补充",
    noSupp: "暂未添加任何附加说明或文件。",
    provCtx: "提供更多背景",
    addDet: "详细补充",
    addDetPh: "添加任何新症状、范围变更或澄清...",
    atchVd: "上传视频",
    subCtx: "提交说明",
    markSolv: "标记为已解决",
    supTeam: "支持团队",
    usr: "用户",
    quietPlc: "让每个更新井然有序。",
    viewRep: "查看回复、补充说明，仅在您满意时才将问题归档。",
    actve: "活跃",
    awaitRev: "等待审阅",
    archvd: "已归档",
    tktView: "工单视图",
    actveOnly: "仅活跃",
    archOnly: "仅归档",
    everythg: "全部",
    noTkts: "在该筛选条件下未找到工单。",
    asgnUsr: "分配用户",
    usrEmail: "用户邮箱",
    phone: "联系电话",
    creAt: "创建于",
    respSla: "响应 SLA",
    resoSla: "解决 SLA",
    cliSup: "客户补充",
    intRep: "内部回复",
    drfRep: "草拟回复",
    msgCtx: "消息内容",
    msgCtxPh: "提供诊断、采取的步骤或最终解决方案...",
    uplDoc: "上传文档",
    postRep: "回复后状态",
    awtCli: "等待客户 (已回复)",
    inPrg: "正在处理",
    mrkRes: "标记已解决",
    depMsg: "发送消息",
    adjUrg: "调整紧急度",
    priLvl: "优先级别",
    p1: "P1 (危急)",
    p2: "P2 (高)",
    p3: "P3 (标准)",
    jus: "调整理由",
    jusPh: "简述调整的理由...",
    svPri: "保存优先级",
    qStt: "快速状态",
    stOvr: "强制覆盖",
    penRev: "等待审阅 (Pending)",
    resClo: "已解决 / 关闭",
    frcUpd: "强制更新",
    opCmd: "运营指挥舱",
    eleTrg: "以优雅姿态应对复杂的海量支持。",
    revTks: "审阅工单，带证回复，调整优先级，让服务层在压力下保持从容。",
    unres: "未解决",
    avgRes: "平均响应时效",
    avgReso: "平均解决时效",
    slaRes: "SLA响应达标率",
    fltSet: "筛选集",
    tktOv: "工单概览",
    allPri: "所有优先级",
    allStat: "所有状态",
    allDep: "所有部门",
    srchTk: "通过工单ID、主旨或用户进行搜索",
    noMtc: "当前筛选集未匹配到工单。"
  }
};

function t(key) {
  return TRANSLATIONS[state.lang][key] || key;
}

function getIssueTypes() {
  return [
    ["outage", t("isOutage")],
    ["access", t("isAccess")],
    ["configuration", t("isConfig")],
    ["security", t("isSec")],
    ["data_loss", t("isData")],
    ["training", t("isTrain")],
    ["consultation", t("isCons")],
  ];
}

function getStatusLabels() {
  return {
    pending: t("stPend"),
    in_progress: t("stProg"),
    replied: t("stRep"),
    resolved: t("stRes"),
    restricted: t("stRestr"),
  };
}

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

let flashTimeout = null;
function setFlash(type, message) {
  state.flash = { type, message, id: Date.now() };
  render();
  if (flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => {
    state.flash = null;
    render();
  }, 3000);
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
      ? t("publicFeedback")
      : mode === "admin"
        ? t("adminConsole")
        : t("clientWorkspace");

  const actions =
    mode === "public"
      ? `
          <a class="topbar__link topbar__link--btn" href="#submit-ticket">${t("newReq")}</a>
          <button class="topbar__link topbar__link--btn" data-action="open-contact-modal">${t("CONTACT US")}</button>
        `
      : `
          <span class="topbar__meta">${escapeHtml(modeLabel)}</span>
          <button class="button button--ghost" data-action="logout">${t("returnHome")}</button>
        `;

  return `
    <header class="topbar">
      <div class="brand">
        <img src="https://i.ibb.co/0yZ9dYbt/pepperlabs-logo.png" alt="Pepper Labs" class="brand__logo" />
        <div class="brand__text">
          <div class="brand__name">Pepper Labs</div>
          <div class="brand__sub">${escapeHtml(modeLabel)}</div>
        </div>
      </div>
      <div class="topbar__actions">
        ${actions}
        <div class="language-select-wrapper">
          <button class="language-btn">
            ${state.lang === 'en' ? 'EN' : state.lang === 'ms' ? 'MS' : '中文'}
          </button>
          <div class="language-menu">
            <button class="language-option ${state.lang === 'en' ? 'is-active' : ''}" onclick="window.setLanguage('en')">EN</button>
            <button class="language-option ${state.lang === 'ms' ? 'is-active' : ''}" onclick="window.setLanguage('ms')">MS</button>
            <button class="language-option ${state.lang === 'zh' ? 'is-active' : ''}" onclick="window.setLanguage('zh')">中文</button>
          </div>
        </div>
      </div>
    </header>
  `;
}

window.setLanguage = function (lang) {
  if (state.lang === lang) return;
  
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    state.lang = lang;
    localStorage.setItem("ticketing_lang", lang);
    render();
    return;
  }

  // 1. Trigger Exit Blur-Fade Animation
  appContainer.classList.add('lang-transition-exit');
  
  setTimeout(() => {
    // 2. Change language and render DOM while hidden/blurred
    state.lang = lang;
    localStorage.setItem("ticketing_lang", lang);
    render();
    
    // 3. Immediately prepare entrance state
    appContainer.classList.remove('lang-transition-exit');
    appContainer.classList.add('lang-transition-enter');
    
    // 4. Force reflow, then remove enter class to animate normally
    void appContainer.offsetWidth; 
    appContainer.classList.remove('lang-transition-enter');
  }, 400); // 0.4s matches the slower, gentle drop-out animation defined in CSS
};

function renderFooter() {
  return `
    <footer class="footer">
      <div>
        <div class="footer__title">${t("footTitle")}</div>
        <div class="footer__text">${t("footText")}</div>
      </div>
    </footer>
  `;
}

function statusBadge(status) {
  const lbls = getStatusLabels();
  return `<span class="pill pill--status pill--${status}">${lbls[status] || status}</span>`;
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

function conversation(entries, emptyLabel) {
  if (!entries || entries.length === 0) {
    return `<div class="soft-empty">${escapeHtml(emptyLabel || "暂无记录")}</div>`;
  }

  return `
    <div class="timeline">
      ${entries
      .map(
        (entry) => `
            <article class="timeline__item ${entry.authorRole === "admin" ? "timeline__item--admin" : ""}">
              <div class="timeline__meta">
                <span>${escapeHtml(entry.authorRole === "admin" ? t("supTeam") : t("usr"))}</span>
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

  <div class="public-dashboard-layout">
    <section class="form-stage" id="submit-ticket">
      <article class="surface-card form-card form-card--primary">
        <span class="eyebrow">${t("intakeForm")}</span>
        <h3 class="form-card__title">${t("tellNeed")}</h3>
        <form id="public-ticket-form" class="form-grid">
          <div class="form-row">
            <label class="field">
              <span class="field__label">${t("fullName")}</span>
              <input name="name" type="text" placeholder="e.g. Jane Doe" required />
            </label>
            <label class="field">
              <span class="field__label">${t("emailAdd")}</span>
              <input name="email" type="email" placeholder="name@department.gov" required />
            </label>
          </div>
          <div class="form-row">
            <label class="field">
              <span class="field__label">${t("phoneNum")}</span>
              <input name="phone" type="text" placeholder="+60 ..." required />
            </label>
            <label class="field">
              <span class="field__label">${t("dept")}</span>
              <input name="department" type="text" placeholder="Your Agency or Team" required />
            </label>
          </div>
          <div class="form-row">
            <label class="field">
              <span class="field__label">${t("category")}</span>
              <div class="faux-select-wrapper" id="category-select">
                <input type="hidden" name="issueType" required />
                <button type="button" class="faux-select-btn" data-action="toggle-dropdown">
                  <span class="faux-select-value">Select Category...</span>
                  <span class="faux-select-arrow"></span>
                </button>
                <div class="faux-select-menu">
                  ${getIssueTypes().map(([value, label]) => `<button type="button" class="faux-select-option" data-action="select-option" data-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`).join("")}
                </div>
              </div>
            </label>
            <label class="field">
              <span class="field__label">${t("subject")}</span>
              <input name="subject" type="text" placeholder="Brief summary" required />
            </label>
          </div>
          <label class="field">
            <span class="field__label">${t("desc")} <span class="size-hint" style="opacity: 0.6; font-size: 0.8em; margin-left: 4px;">(Max 150 characters)</span></span>
            <textarea name="description" placeholder="Describe the impact..." maxlength="150" required></textarea>
          </label>
          <div class="form-row">
            <div class="field">
              <span class="field__label">${t("atchImg")} <span class="size-hint">(Max 5MB)</span></span>
              <label class="file-drop-area" id="drop-image">
                <span class="file-msg">Choose Image or drag & drop</span>
                <input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
              </label>
            </div>
            <div class="field">
              <span class="field__label">${t("atchVid")} <span class="size-hint">(Max 50MB)</span></span>
              <label class="file-drop-area" id="drop-video">
                <span class="file-msg">Choose Video or drag & drop</span>
                <input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" />
              </label>
            </div>
          </div>
          <button class="button button--primary button--full" type="submit" style="margin-top: 16px;">${t("submitRequest")}</button>
        </form>
      </article>
    </section>

    <aside class="side-stack">
      <article class="surface-card form-card" id="ticket-lookup" style="margin-bottom: 32px;">
        <span class="eyebrow">${t("clientVal")}</span>
        <h3 class="form-card__title">${t("trkYourTkt")}</h3>
        <form id="public-lookup-form" class="form-grid">
          <label class="field">
            <span class="field__label">${t("tktId")}</span>
            <input name="ticketId" type="text" placeholder="TKT-XXXX..." required />
          </label>
          <label class="field">
            <span class="field__label">${t("assocEmail")}</span>
            <input name="email" type="email" placeholder="Email used during submission" required />
          </label>
          <button class="button button--secondary button--full" type="submit" style="margin-top: 8px;">${t("lookupTicket")}</button>
        </form>
      </article>

    </aside>
  </div>

      ${renderFooter()}

      <!--Contact Us Glass Modal-->
    <div id="contact-modal" class="modal-overlay" data-action="close-contact-modal">
      <div class="modal-content">
        <button class="modal-close" data-action="close-contact-modal">×</button>
        <img src="https://i.ibb.co/0yZ9dYbt/pepperlabs-logo.png" alt="Pepper Labs Logo" class="modal-logo" />
        <h2 class="modal-title">Contact Us</h2>
        <div class="modal-details">
          <p><strong>Email:</strong> demo@gmail.com</p>
          <p><strong>Phone:</strong> +60 1234567</p>
        </div>
      </div>
    </div>
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
      ? `<a class="button button--secondary" href="${escapeHtml(ticket.whatsappEscalationLink)}" target="_blank" rel="noreferrer">${t("escTeam")}</a>`
      : ""
    }
      </div>

      ${ticket.restricted
      ? `<div class="banner banner--warning">${escapeHtml(ticket.restrictedMessage)}</div>`
      : `
            <div class="ticket-card__meta">
              <div class="ticket-card__meta-item">
                <span class="meta-label">${t("submOn")}</span>
                <span class="meta-value">${escapeHtml(formatDate(ticket.createdAt))}</span>
              </div>
              <div class="ticket-card__meta-item">
                <span class="meta-label">${t("lastUpd")}</span>
                <span class="meta-value">${escapeHtml(formatDate(ticket.updatedAt))}</span>
              </div>
              <div class="ticket-card__meta-item">
                <span class="meta-label">${t("dept")}</span>
                <span class="meta-value">${escapeHtml(ticket.department)}</span>
              </div>
            </div>
            
            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">${t("origReq")}</h4>
              <p style="color: var(--text-soft); line-height: 1.8;">${nl2br(ticket.description)}</p>
              ${attachmentList(ticket.attachments)}
            </div>

            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">${t("commThrd")}</h4>
              ${conversation(ticket.replies)}
            </div>

            <div style="margin-top: 48px;">
              <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">${t("clientAdd")}</h4>
              ${conversation(ticket.supplements, t("noSupp"))}
            </div>

            ${ticket.recordState === "active"
        ? `
                  <form class="surface-form supplement-form" data-ticket-id="${escapeHtml(ticket.id)}" style="margin-top: 56px;">
                    <div class="surface-form__title">${t("provCtx")}</div>
                    <label class="field">
                      <span class="field__label">${t("addDet")}</span>
                      <textarea name="message" placeholder="${t("addDetPh")}" required></textarea>
                    </label>
                    <div class="form-row">
                      <label class="field">
                        <span class="field__label">${t("atchImg")}</span>
                        <input name="image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
                      </label>
                      <label class="field">
                        <span class="field__label">${t("atchVd")}</span>
                        <input name="recording" type="file" accept=".mp4,.webm,video/mp4,video/webm" />
                      </label>
                    </div>
                    <div style="display: flex; gap: 16px; margin-top: 24px;">
                      <button class="button button--secondary" type="submit">${t("subCtx")}</button>
                      ${ticket.status === "replied"
          ? `<button class="button button--primary" type="button" data-action="resolve-ticket" data-ticket-id="${escapeHtml(ticket.id)}">${t("markSolv")}</button>`
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
          <div class="eyebrow">${t("clientWorkspace")}</div>
          <h1 class="workspace-hero__title">${t("quietPlc")}</h1>
          <p class="workspace-hero__text">
            ${t("viewRep")}
          </p>
        </div>
        <div class="workspace-hero__stats">
          ${heroMetric(t("actve"), activeCount)}
          ${heroMetric(t("awaitRev"), repliedCount, "accent")}
          ${heroMetric(t("archvd"), archivedCount, "warm")}
        </div>
      </section>

      <section class="surface-card filter-bar">
        <div>
          <div class="eyebrow">${t("tktView")}</div>
          <h2 class="filter-bar__title">${escapeHtml(state.bootstrap.session.name)}</h2>
        </div>
        <div class="filter-bar__controls">
          <select id="user-filter">
            <option value="active" ${state.userFilter === "active" ? "selected" : ""}>${t("actveOnly")}</option>
            <option value="archived" ${state.userFilter === "archived" ? "selected" : ""}>${t("archOnly")}</option>
            <option value="all" ${state.userFilter === "all" ? "selected" : ""}>${t("everythg")}</option>
          </select>
          <span class="pill pill--neutral">${escapeHtml(state.bootstrap.session.email)}</span>
        </div>
      </section>

      <section class="workspace-list">
        ${visibleTickets.length ? visibleTickets.map(renderUserTicket).join("") : `<div class="soft-empty">${t("noTkts")}</div>`}
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
    const haystack = `${ticket.id} ${ticket.subject} ${ticket.department} ${ticket.user?.name || ""} `.toLowerCase();
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
          <span class="meta-label">${t("asgnUsr")}</span>
          <span class="meta-value">${escapeHtml(ticket.user?.name || "-")}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">${t("usrEmail")}</span>
          <span class="meta-value">${escapeHtml(ticket.user?.email || "-")}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">${t("phone")}</span>
          <span class="meta-value">${escapeHtml(ticket.contactPhone || "-")}</span>
        </div>
      </div>

      <div class="ticket-card__meta" style="border-top: none; padding-top: 16px; margin-top: 0;">
        <div class="ticket-card__meta-item">
          <span class="meta-label">${t("creAt")}</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.createdAt))}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">${t("respSla")}</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.responseDeadline))}</span>
        </div>
        <div class="ticket-card__meta-item">
          <span class="meta-label">${t("resoSla")}</span>
          <span class="meta-value">${escapeHtml(formatDate(ticket.resolutionDeadline))}</span>
        </div>
      </div>

      <div style="margin-top: 24px;">
        ${attachmentList(ticket.attachments)}
      </div>

      <div class="admin-layout">
        <div>
          <div style="margin-bottom: 48px;">
            <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">${t("cliSup")}</h4>
            ${conversation(ticket.supplements)}
          </div>
          <div>
            <h4 style="font-family: var(--serif); font-size: 1.4rem; font-weight: 400; margin-bottom: 16px;">${t("intRep")}</h4>
            ${conversation(ticket.replies)}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          <form class="surface-form admin-reply-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">${t("drfRep")}</h4>
            <label class="field">
              <span class="field__label">${t("msgCtx")}</span>
              <textarea name="message" placeholder="${t("msgCtxPh")}" required></textarea>
            </label>
            <label class="field">
              <span class="field__label">${t("uplDoc")}</span>
              <input name="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.mp4,.webm,.pdf,image/jpeg,image/png,video/mp4,video/webm,application/pdf" />
            </label>
            <label class="field">
              <span class="field__label">${t("postRep")}</span>
              <select name="nextStatus">
                <option value="replied" ${ticket.status === "replied" ? "selected" : ""}>${t("awtCli")}</option>
                <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>${t("inPrg")}</option>
                <option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>${t("mrkRes")}</option>
              </select>
            </label>
            <button class="button button--primary button--full" style="margin-top: 16px;" type="submit">${t("depMsg")}</button>
          </form>

          <form class="surface-form admin-priority-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">${t("adjUrg")}</h4>
            <label class="field">
              <span class="field__label">${t("priLvl")}</span>
              <select name="priority">
                <option value="1" ${ticket.priority === 1 ? "selected" : ""}>${t("p1")}</option>
                <option value="2" ${ticket.priority === 2 ? "selected" : ""}>${t("p2")}</option>
                <option value="3" ${ticket.priority === 3 ? "selected" : ""}>${t("p3")}</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">${t("jus")}</span>
              <textarea style="min-height: 80px;" name="reason" placeholder="${t("jusPh")}" required></textarea>
            </label>
            <button class="button button--secondary button--full" style="margin-top: 16px;" type="submit">${t("svPri")}</button>
          </form>

          <form class="surface-form admin-status-form" data-ticket-id="${escapeHtml(ticket.id)}">
            <h4 class="surface-form__title">${t("qStt")}</h4>
            <label class="field">
              <span class="field__label">${t("stOvr")}</span>
              <select name="status">
                <option value="pending" ${ticket.status === "pending" ? "selected" : ""}>${t("penRev")}</option>
                <option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>${t("inPrg")}</option>
                <option value="replied" ${ticket.status === "replied" ? "selected" : ""}>${t("awtCli")}</option>
                <option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>${t("resClo")}</option>
              </select>
            </label>
            <button class="button button--ghost button--full" style="margin-top: 16px;" type="submit">${t("frcUpd")}</button>
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
          <div class="eyebrow">${t("opCmd")}</div>
          <h1 class="workspace-hero__title">${t("eleTrg")}</h1>
          <p class="workspace-hero__text">
            ${t("revTks")}
          </p>
        </div>
        <div class="workspace-hero__stats workspace-hero__stats--admin">
          ${heroMetric(t("unres"), report.unresolvedCount)}
          ${heroMetric(t("avgRes"), report.averageResponseHours ?? "-", "accent")}
          ${heroMetric(t("avgReso"), report.averageResolutionHours ?? "-", "warm")}
          ${heroMetric(t("slaRes"), `${report.sla.responseRate ?? "-"}%`, "calm")}
        </div>
      </section>

      <section class="surface-card filter-bar filter-bar--admin">
        <div>
          <div class="eyebrow">${t("fltSet")}</div>
          <h2 class="filter-bar__title">${t("tktOv")}</h2>
        </div>
        <div class="filter-bar__controls filter-bar__controls--grid">
          <select id="admin-filter-priority">
            <option value="all">${t("allPri")}</option>
            <option value="1" ${state.adminFilters.priority === "1" ? "selected" : ""}>${t("p1")}</option>
            <option value="2" ${state.adminFilters.priority === "2" ? "selected" : ""}>${t("p2")}</option>
            <option value="3" ${state.adminFilters.priority === "3" ? "selected" : ""}>${t("p3")}</option>
          </select>
          <select id="admin-filter-status">
            <option value="all">${t("allStat")}</option>
            <option value="pending" ${state.adminFilters.status === "pending" ? "selected" : ""}>${t("stPend")}</option>
            <option value="in_progress" ${state.adminFilters.status === "in_progress" ? "selected" : ""}>${t("stProg")}</option>
            <option value="replied" ${state.adminFilters.status === "replied" ? "selected" : ""}>${t("stRep")}</option>
            <option value="resolved" ${state.adminFilters.status === "resolved" ? "selected" : ""}>${t("stRes")}</option>
          </select>
          <select id="admin-filter-department">
            <option value="all">${t("allDep")}</option>
            ${departments.map((item) => `<option value="${escapeHtml(item)}" ${state.adminFilters.department === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
          <input id="admin-filter-search" type="search" value="${escapeHtml(state.adminFilters.search)}" placeholder="${t("srchTk")}" />
        </div>
      </section>

      <section class="workspace-list">
        ${tickets.length ? tickets.map(renderAdminTicket).join("") : `<div class="soft-empty">${t("noMtc")}</div>`}
      </section>

      ${renderFooter()}
    </div>
  `;
}

function renderAdminLogin() {
  app.innerHTML = `
    <div class="site-shell site-shell--public">
      ${renderTopbar("admin")}
      ${renderFlash()}
      <div class="public-dashboard-layout" style="display: flex; justify-content: center; padding-top: 60px;">
        <article class="surface-card form-card" id="admin-entry" style="max-width: 400px; width: 100%;">
          <span class="eyebrow">${t("staffAcc")}</span>
          <h3 class="form-card__title">${t("adminLog")}</h3>
          <form id="admin-login-form" class="form-grid">
            <label class="field">
              <span class="field__label">${t("adminEmail")}</span>
              <input name="email" type="email" value="admin@gov-support.local" required />
            </label>
            <label class="field">
              <span class="field__label">${t("secPass")}</span>
              <input name="password" type="password" value="Admin123!" required />
            </label>
            <button class="button button--ghost button--full" type="submit" style="margin-top: 8px;">${t("enterWsp")}</button>
          </form>
        </article>
      </div>
      ${renderFooter()}
    </div>
  `;
}

function render() {
  if (!state.bootstrap) {
    if (window.IS_ADMIN_APP) {
      renderAdminLogin();
      return;
    }
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
      setFlash("info", `Ticket created: ${result.ticketId}`);
      await loadBootstrap();
      return;
    }

    if (form.id === "public-lookup-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/public/tickets/lookup", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      setFlash("info", `Ticket opened: ${result.ticketId}`);
      await loadBootstrap();
      return;
    }

    if (form.id === "admin-login-form") {
      const body = Object.fromEntries(new FormData(form).entries());
      const result = await api("/api/auth/admin-login", { method: "POST", body });
      state.token = result.token;
      localStorage.setItem("ticketing_token", result.token);
      setFlash("info", "Admin console opened.");
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("supplement-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectUserAttachments(form);
      await api(`/ api / user / tickets / ${ticketId}/supplement`, { method: "POST", body });
      setFlash("info", `Update added to ${ticketId}.`);
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-reply-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      body.attachments = await collectAdminAttachments(form);
      await api(`/api/admin/tickets/${ticketId}/reply`, { method: "POST", body });
      setFlash("info", `Reply sent for ${ticketId}.`);
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-priority-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/priority`, { method: "POST", body });
      setFlash("info", `Priority updated for ${ticketId}.`);
      await loadBootstrap();
      return;
    }

    if (form.classList.contains("admin-status-form")) {
      const ticketId = form.dataset.ticketId;
      const body = Object.fromEntries(new FormData(form).entries());
      await api(`/api/admin/tickets/${ticketId}/status`, { method: "POST", body });
      setFlash("info", `Status updated for ${ticketId}.`);
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
      setFlash("info", "Returned to the public homepage.");
      render();
      return;
    }

    if (trigger.dataset.action === "resolve-ticket") {
      const ticketId = trigger.dataset.ticketId;
      await api(`/api/user/tickets/${ticketId}/resolve`, { method: "POST" });
      setFlash("info", `${ticketId} archived successfully.`);
      await loadBootstrap();
      return;
    }

    if (trigger.dataset.action === "toggle-dropdown") {
      const wrapper = trigger.closest(".faux-select-wrapper");
      const wasOpen = wrapper.classList.contains("is-open");
      document.querySelectorAll(".faux-select-wrapper").forEach(el => el.classList.remove("is-open"));
      if (!wasOpen) {
        wrapper.classList.add("is-open");
      }
      return;
    }

    if (trigger.dataset.action === "select-option") {
      const wrapper = trigger.closest(".faux-select-wrapper");
      const value = trigger.dataset.value;
      const label = trigger.textContent;

      const input = wrapper.querySelector("input[type='hidden']");
      const display = wrapper.querySelector(".faux-select-value");

      display.textContent = label;
      wrapper.classList.remove("is-open");
      return;
    }

    if (trigger.dataset.action === "open-contact-modal") {
      const modal = document.getElementById("contact-modal");
      if (modal) modal.classList.add("is-active");
      return;
    }

    if (trigger.dataset.action === "close-contact-modal") {
      // Only close if clicking the actual background overlay or the X close button
      if (event.target.classList.contains('modal-overlay') || trigger.classList.contains('modal-close')) {
        const modal = document.getElementById("contact-modal");
        if (modal) modal.classList.remove("is-active");
      }
      return;
    }
  } catch (error) {
    setFlash("error", error.message);
  }
}

// Close artificial dropdowns on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".faux-select-wrapper")) {
    document.querySelectorAll(".faux-select-wrapper").forEach(el => el.classList.remove("is-open"));
  }
});

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

function handleFileChange(event) {
  const target = event.target;
  if (target.type !== "file") {
    return;
  }

  const dropArea = target.closest(".file-drop-area");
  if (!dropArea) {
    return;
  }

  const fileInfo = dropArea.querySelector(".file-msg");
  const file = target.files?.[0];

  dropArea.classList.remove("glow-error", "has-file");

  if (!file) {
    fileInfo.textContent = target.name === "image" ? "Choose Image or drag & drop" : "Choose Video or drag & drop";
    return;
  }

  // 5MB limit for images, 50MB for video
  const limitMB = target.name === "image" ? 5 : 50;
  const limitBytes = limitMB * 1024 * 1024;

  if (file.size > limitBytes) {
    dropArea.classList.add("glow-error");
    fileInfo.textContent = `File too large (${formatBytes(file.size)}). Max ${limitMB}MB.`;
    target.value = ""; // Clear selection
    return;
  }

  dropArea.classList.add("has-file");
  fileInfo.textContent = `${file.name} (${formatBytes(file.size)})`;
}

document.addEventListener("submit", handleSubmit);
document.addEventListener("click", handleClick);
document.addEventListener("change", (e) => {
  if (e.target.type === "file") {
    handleFileChange(e);
  } else {
    handleChange(e);
  }
});
document.addEventListener("input", handleInput);

loadBootstrap();

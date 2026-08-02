/* ==========================================================================
   admin.js — Beacon Help Center (Admin Dashboard + Login)
   FAQs and categories live in MySQL now, reached through the PHP files in
   /api. Only the login session flag and the dark-mode preference stay in
   LocalStorage — everything else is a real database read/write.
   ========================================================================== */
"use strict";

/* ---------------------------------------------------------------------- */
/* 1. API LAYER (shared shape with script.js)                             */
/* ---------------------------------------------------------------------- */
const API_BASE = "api/";

async function apiRequest(endpoint, options = {}) {
  try {
    const res = await fetch(API_BASE + endpoint, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      throw new Error(data.error || `Request to ${endpoint} failed (${res.status})`);
    }
    return data;
  } catch (err) {
    showToast(`Couldn't reach the database. Is your PHP/MySQL server running? (${err.message})`, "error");
    throw err;
  }
}
const apiGet = (endpoint) => apiRequest(endpoint);
const apiPost = (endpoint, body) => apiRequest(endpoint, { method: "POST", body: JSON.stringify(body) });

let FAQS_CACHE = [];
let CATEGORIES_CACHE = [];
let MESSAGES_CACHE = [];
async function loadData() {
  const [faqRes, catRes] = await Promise.all([apiGet("get_faqs.php"), apiGet("get_categories.php")]);
  FAQS_CACHE = faqRes.faqs || [];
  CATEGORIES_CACHE = catRes.categories || [];
}
async function loadMessages() {
  const res = await apiGet("get_messages.php");
  MESSAGES_CACHE = res.messages || [];
}
function getFaqs() { return FAQS_CACHE; }
function getCats() { return CATEGORIES_CACHE; }
function getMessages() { return MESSAGES_CACHE; }

/* ---------------------------------------------------------------------- */
/* 1b. LOCALSTORAGE — session flag + theme only                           */
/* ---------------------------------------------------------------------- */
const AdminStore = {
  keys: { admin: "beacon_admin_session", theme: "beacon_theme" },
  get(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
};

function showToast(message, type = "success") {
  const stack = document.getElementById("toastStack");
  if (!stack) return;
  const icons = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" };
  const colors = { success: "#35C99B", error: "#FF6B6B", info: "#FFB238" };
  const el = document.createElement("div");
  el.style.cssText = `background:var(--surface);border:1px solid var(--border);border-left:4px solid ${colors[type]};
    color:var(--text);padding:.8rem 1.1rem;border-radius:12px;box-shadow:var(--shadow-soft);
    display:flex;align-items:center;gap:.6rem;min-width:240px;font-size:.88rem;`;
  el.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]}"></i><span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s ease"; setTimeout(() => el.remove(), 300); }, 3200);
}

/* Apply saved theme on both login & admin pages */
document.documentElement.setAttribute("data-theme", AdminStore.get(AdminStore.keys.theme, document.documentElement.getAttribute("data-theme") || "light"));

/* ======================================================================
   LOGIN PAGE LOGIC — checked against the admins table in MySQL
   ====================================================================== */
function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  // already logged in this browser? skip straight to dashboard
  if (AdminStore.get(AdminStore.keys.admin, null)) { window.location.href = "admin.html"; return; }

  document.getElementById("togglePass")?.addEventListener("click", () => {
    const input = document.getElementById("loginPass");
    const icon = document.querySelector("#togglePass i");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    icon.className = show ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;
    const alertBox = document.getElementById("loginAlert");
    const submitBtn = form.querySelector("button[type=submit]");
    alertBox.classList.add("d-none");
    submitBtn.disabled = true;

    try {
      const res = await fetch(API_BASE + "login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, password: pass })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        AdminStore.set(AdminStore.keys.admin, { user, since: Date.now() });
        showToast("Login successful — redirecting…", "success");
        setTimeout(() => { window.location.href = "admin.html"; }, 500);
      } else {
        alertBox.textContent = data.error || "Invalid username or password.";
        alertBox.classList.remove("d-none");
        showToast("Login failed. Check your credentials.", "error");
      }
    } catch (err) {
      alertBox.textContent = "Couldn't reach the database. Is your PHP/MySQL server running?";
      alertBox.classList.remove("d-none");
      showToast("Database connection error.", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

/* ======================================================================
   ADMIN DASHBOARD LOGIC
   ====================================================================== */
let categoryChartRef = null;
let viewsChartRef = null;

async function initAdminDashboard() {
  const shell = document.querySelector(".admin-shell");
  if (!shell) return;

  // auth guard
  if (!AdminStore.get(AdminStore.keys.admin, null)) { window.location.href = "login.html"; return; }

  bindSidebarNav();
  bindTopbar();
  bindFaqModal();
  bindCategoryModal();
  bindImportExport();

  try {
    await loadData();
    await loadMessages();
  } catch (e) {
    return; // apiRequest already showed a toast explaining the connection problem
  }

  renderDashboardView();
  renderFaqTable();
  renderCategoryManageGrid();
  populateCategorySelect();
  renderMessagesTable();
  updateMessageBadge();

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem(AdminStore.keys.admin);
    window.location.href = "login.html";
  });

  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    AdminStore.set(AdminStore.keys.theme, next);
    renderDashboardView(); // repaint charts with new theme colors
  });
}

/* ---------------------- Sidebar / view switching ---------------------- */
function bindSidebarNav() {
  const links = document.querySelectorAll(".admin-nav-link[data-view]");
  links.forEach(link => {
    link.addEventListener("click", async e => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const view = link.dataset.view;
      document.querySelectorAll(".admin-view").forEach(v => v.classList.add("d-none"));
      document.getElementById(`view-${view}`)?.classList.remove("d-none");
      document.getElementById("viewTitle").textContent = (link.querySelector(".nav-label")?.textContent || link.textContent).trim();
      document.getElementById("adminSidebar").classList.remove("open");

      try {
        if (view === "dashboard") { await loadData(); await loadMessages(); renderDashboardView(); updateMessageBadge(); }
        if (view === "faqs") { await loadData(); renderFaqTable(); }
        if (view === "categories") { await loadData(); renderCategoryManageGrid(); }
        if (view === "messages") { await loadMessages(); renderMessagesTable(); updateMessageBadge(); }
      } catch (err) { /* apiRequest already showed the error toast */ }
    });
  });
}
function bindTopbar() {
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("adminSidebar").classList.toggle("open");
  });
}

/* ---------------------- Dashboard: stats + charts ---------------------- */
function renderDashboardView() {
  const faqs = getFaqs();
  const cats = getCats();
  document.getElementById("cardTotalFaqs").textContent = faqs.length;
  document.getElementById("cardTotalCats").textContent = cats.length;
  document.getElementById("cardTotalViews").textContent = faqs.reduce((a, f) => a + f.views, 0).toLocaleString();
  document.getElementById("cardTotalHelpful").textContent = faqs.reduce((a, f) => a + f.helpful, 0).toLocaleString();

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#EAF2FA" : "#1F2937";
  const gridColor = isDark ? "rgba(255,255,255,.08)" : "rgba(11,30,51,.08)";
  const palette = ["#FFB238", "#FF6B6B", "#35C99B", "#4F91FF", "#B98CFF", "#FF9F68", "#5BD1D7", "#F45B9E"];

  const catLabels = cats.map(c => c.name);
  const catCounts = cats.map(c => faqs.filter(f => f.category === c.id).length);
  const catViews = cats.map(c => faqs.filter(f => f.category === c.id).reduce((a, f) => a + f.views, 0));

  if (typeof Chart === "undefined") {
    // Chart.js couldn't load (usually a blocked/offline CDN). Don't crash
    // the dashboard — show a plain message in its place instead; every
    // other panel (stats, tables, FAQ/category management) still works.
    const msg = `<div class="chart-fallback-msg text-center text-muted py-4 small">
      <i class="fa-solid fa-chart-simple mb-2 d-block fs-3"></i>
      Charts couldn't load (Chart.js library unreachable — check your internet connection).
    </div>`;
    [document.getElementById("categoryChart"), document.getElementById("viewsChart")].forEach(canvas => {
      const panel = canvas?.closest(".admin-panel");
      if (!panel) return;
      panel.querySelector(".chart-fallback-msg")?.remove();
      panel.insertAdjacentHTML("beforeend", msg);
    });
  } else {
    if (categoryChartRef) categoryChartRef.destroy();
    if (viewsChartRef) viewsChartRef.destroy();

    categoryChartRef = new Chart(document.getElementById("categoryChart"), {
      type: "doughnut",
      data: { labels: catLabels, datasets: [{ data: catCounts, backgroundColor: palette, borderWidth: 0 }] },
      options: { plugins: { legend: { position: "bottom", labels: { color: textColor, font: { size: 11 } } } } }
    });
    viewsChartRef = new Chart(document.getElementById("viewsChart"), {
      type: "bar",
      data: { labels: catLabels, datasets: [{ label: "Views", data: catViews, backgroundColor: "#FFB238", borderRadius: 6 }] },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 10 } }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  const top = [...faqs].sort((a, b) => b.views - a.views).slice(0, 5);
  document.querySelector("#topFaqsTable tbody").innerHTML = top.map(f => {
    const cat = cats.find(c => c.id === f.category);
    return `<tr><td class="q-cell">${f.question}</td><td>${cat?.name || f.category}</td><td>${f.views}</td><td>${f.helpful}</td></tr>`;
  }).join("");
}

/* ---------------------- Manage FAQs table ---------------------- */
function renderFaqTable(filter = "") {
  const tbody = document.querySelector("#faqTable tbody");
  if (!tbody) return;
  const cats = getCats();
  let faqs = getFaqs();
  if (filter.trim()) {
    const t = filter.toLowerCase();
    faqs = faqs.filter(f => f.question.toLowerCase().includes(t) || f.tags.some(tag => tag.toLowerCase().includes(t)));
  }
  tbody.innerHTML = faqs.map(f => {
    const cat = cats.find(c => c.id === f.category);
    return `
    <tr>
      <td class="q-cell">${f.question}</td>
      <td><span class="badge-tag">${cat?.name || f.category}</span></td>
      <td>${f.views}</td>
      <td>${f.helpful}</td>
      <td class="small text-muted">${f.date}</td>
      <td class="text-end">
        <button class="row-action-btn me-1" data-edit="${f.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="row-action-btn danger" data-del="${f.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;
  }).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">No FAQs match your search.</td></tr>`;

  tbody.querySelectorAll("[data-edit]").forEach(btn => btn.addEventListener("click", () => openFaqModal(parseInt(btn.dataset.edit))));
  tbody.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => confirmDelete("faq", parseInt(btn.dataset.del))));
}
document.getElementById("adminFaqSearch")?.addEventListener("input", e => renderFaqTable(e.target.value));

/* ---------------------- FAQ Add/Edit Modal ---------------------- */
function populateCategorySelect() {
  const sel = document.getElementById("faqCategory");
  if (!sel) return;
  sel.innerHTML = getCats().map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}
function openFaqModal(id) {
  populateCategorySelect();
  const modalTitle = document.getElementById("faqModalLabel");
  document.getElementById("faqForm").reset();
  document.getElementById("faqId").value = "";
  if (id) {
    const faq = getFaqs().find(f => f.id === id);
    if (!faq) return;
    modalTitle.textContent = "Edit FAQ";
    document.getElementById("faqId").value = faq.id;
    document.getElementById("faqQuestion").value = faq.question;
    document.getElementById("faqAnswer").value = faq.answer;
    document.getElementById("faqCategory").value = faq.category;
    document.getElementById("faqTags").value = faq.tags.join(", ");
  } else {
    modalTitle.textContent = "Add FAQ";
  }
  updateFaqPreview();
  bootstrap.Modal.getOrCreateInstance(document.getElementById("faqModal")).show();
}
function updateFaqPreview() {
  const q = document.getElementById("faqQuestion").value || "Your question preview…";
  const a = document.getElementById("faqAnswer").value || "Your answer preview…";
  document.getElementById("faqPreview").innerHTML = `<strong>${q}</strong><p class="mb-0 mt-1 text-muted">${a}</p>`;
}
function bindFaqModal() {
  document.getElementById("addFaqBtn")?.addEventListener("click", () => openFaqModal(null));
  ["faqQuestion", "faqAnswer"].forEach(id => document.getElementById(id)?.addEventListener("input", updateFaqPreview));

  document.getElementById("saveFaqBtn")?.addEventListener("click", async () => {
    const question = document.getElementById("faqQuestion").value.trim();
    const answer = document.getElementById("faqAnswer").value.trim();
    const category = document.getElementById("faqCategory").value;
    const tags = document.getElementById("faqTags").value.split(",").map(t => t.trim()).filter(Boolean);
    const idVal = document.getElementById("faqId").value;

    if (!question || !answer || !category) { showToast("Please fill in question, answer and category.", "error"); return; }

    const saveBtn = document.getElementById("saveFaqBtn");
    saveBtn.disabled = true;
    try {
      if (idVal) {
        await apiPost("update_faq.php", { id: parseInt(idVal), question, answer, category, tags });
        showToast("FAQ updated & saved to the database.", "success");
      } else {
        await apiPost("add_faq.php", { question, answer, category, tags });
        showToast("FAQ added to the database!", "success");
      }
      await loadData();
      bootstrap.Modal.getInstance(document.getElementById("faqModal"))?.hide();
      renderFaqTable();
      renderDashboardView();
      renderCategoryManageGrid();
    } catch (e) { /* apiRequest already showed the error toast */ }
    finally { saveBtn.disabled = false; }
  });
}

/* ---------------------- Category management ---------------------- */
function renderCategoryManageGrid() {
  const grid = document.getElementById("categoryManageGrid");
  if (!grid) return;
  const cats = getCats();
  const faqs = getFaqs();
  grid.innerHTML = cats.map(c => {
    const count = faqs.filter(f => f.category === c.id).length;
    return `
    <div class="col-md-6 col-lg-4">
      <div class="category-manage-card">
        <div class="cat-icon"><i class="fa-solid ${c.icon}"></i></div>
        <div class="flex-grow-1">
          <h6 class="mb-0">${c.name}</h6>
          <span class="small text-muted">${count} FAQs</span>
        </div>
        <button class="row-action-btn danger" data-delcat="${c.id}" title="Delete category"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join("");
  grid.querySelectorAll("[data-delcat]").forEach(btn => btn.addEventListener("click", () => confirmDelete("category", btn.dataset.delcat)));
}

/* ---------------------- Contact messages ---------------------- */
function updateMessageBadge() {
  const badge = document.getElementById("messageBadge");
  if (!badge) return;
  const newCount = getMessages().filter(m => m.status === "new").length;
  badge.textContent = newCount;
  badge.classList.toggle("d-none", newCount === 0);
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
function renderMessagesTable() {
  const tbody = document.querySelector("#messagesTable tbody");
  if (!tbody) return;
  const messages = getMessages();
  tbody.innerHTML = messages.map(m => `
    <tr>
      <td>
        <div class="fw-semibold small">${escapeHtml(m.name)}</div>
        <div class="text-muted" style="font-size:.75rem;">${escapeHtml(m.email)}</div>
      </td>
      <td class="small">${escapeHtml(m.subject)}</td>
      <td class="small text-muted q-cell">${escapeHtml(m.message)}</td>
      <td><span class="status-pill ${m.status}">${m.status}</span></td>
      <td class="small text-muted">${new Date(m.created_at).toLocaleDateString()}</td>
      <td class="text-end">
        ${m.status !== "read" ? `<button class="row-action-btn me-1" data-msgstatus="${m.id}:read" title="Mark as read"><i class="fa-solid fa-envelope-open"></i></button>` : ""}
        ${m.status !== "replied" ? `<button class="row-action-btn me-1" data-msgstatus="${m.id}:replied" title="Mark as replied"><i class="fa-solid fa-reply"></i></button>` : ""}
        <button class="row-action-btn danger" data-msgdel="${m.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6" class="text-center text-muted py-4">No messages yet.</td></tr>`;

  tbody.querySelectorAll("[data-msgstatus]").forEach(btn => btn.addEventListener("click", async () => {
    const [id, status] = btn.dataset.msgstatus.split(":");
    try {
      await apiPost("update_message_status.php", { id: parseInt(id), status });
      await loadMessages();
      renderMessagesTable();
      updateMessageBadge();
      showToast(`Marked as ${status}.`, "success");
    } catch (e) { /* apiRequest already showed the error toast */ }
  }));
  tbody.querySelectorAll("[data-msgdel]").forEach(btn => btn.addEventListener("click", () => confirmDelete("message", parseInt(btn.dataset.msgdel))));
}
function bindCategoryModal() {
  document.getElementById("addCategoryBtn")?.addEventListener("click", () => {
    document.getElementById("categoryName").value = "";
    document.getElementById("categoryIcon").value = "fa-circle-question";
    bootstrap.Modal.getOrCreateInstance(document.getElementById("categoryModal")).show();
  });
  document.getElementById("saveCategoryBtn")?.addEventListener("click", async () => {
    const name = document.getElementById("categoryName").value.trim();
    const icon = document.getElementById("categoryIcon").value.trim() || "fa-circle-question";
    if (!name) { showToast("Category name is required.", "error"); return; }

    try {
      await apiPost("add_category.php", { name, icon });
      showToast("Category added to the database!", "success");
      await loadData();
      bootstrap.Modal.getInstance(document.getElementById("categoryModal"))?.hide();
      renderCategoryManageGrid();
      populateCategorySelect();
      renderDashboardView();
    } catch (e) { /* apiRequest already showed the error toast */ }
  });
}

/* ---------------------- Delete confirmation (shared) ---------------------- */
let pendingDelete = null;
function confirmDelete(type, id) {
  pendingDelete = { type, id };
  const messages = {
    faq: "Delete this FAQ? This cannot be undone.",
    category: "Delete this category? FAQs inside it will also be removed (foreign key cascade).",
    message: "Delete this contact message? This cannot be undone."
  };
  document.getElementById("confirmMessage").textContent = messages[type];
  bootstrap.Modal.getOrCreateInstance(document.getElementById("confirmModal")).show();
}
document.getElementById("confirmActionBtn")?.addEventListener("click", async () => {
  if (!pendingDelete) return;
  try {
    if (pendingDelete.type === "faq") {
      await apiPost("delete_faq.php", { id: pendingDelete.id });
      showToast("FAQ deleted from the database.", "success");
      await loadData();
      renderFaqTable();
      renderDashboardView();
    } else if (pendingDelete.type === "category") {
      await apiPost("delete_category.php", { id: pendingDelete.id });
      showToast("Category deleted from the database.", "success");
      await loadData();
      renderCategoryManageGrid();
      populateCategorySelect();
      renderDashboardView();
    } else if (pendingDelete.type === "message") {
      await apiPost("delete_message.php", { id: pendingDelete.id });
      showToast("Message deleted.", "success");
      await loadMessages();
      renderMessagesTable();
      updateMessageBadge();
    }
  } catch (e) { /* apiRequest already showed the error toast */ }
  finally {
    bootstrap.Modal.getInstance(document.getElementById("confirmModal"))?.hide();
    pendingDelete = null;
  }
});

/* ---------------------- Import / Export ---------------------- */
function bindImportExport() {
  document.getElementById("exportBtn")?.addEventListener("click", () => {
    // api/export.php streams the JSON as a file download directly.
    window.location.href = API_BASE + "export.php";
    showToast("Export started — check your downloads.", "success");
  });

  document.getElementById("importBtn")?.addEventListener("click", () => {
    const fileInput = document.getElementById("importFile");
    const file = fileInput.files[0];
    if (!file) { showToast("Choose a JSON file first.", "error"); return; }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const result = await apiPost("import.php", { categories: parsed.categories || [], faqs: parsed.faqs || [] });
        showToast(`Imported ${result.importedFaqs} FAQ(s) and ${result.importedCategories} categor${result.importedCategories === 1 ? "y" : "ies"}.`, "success");
        await loadData();
        renderFaqTable(); renderCategoryManageGrid(); populateCategorySelect(); renderDashboardView();
      } catch (err) {
        showToast(err.message?.includes("reach the database") ? err.message : "Invalid JSON file.", "error");
      }
    };
    reader.readAsText(file);
  });
}

/* ======================================================================
   INIT
   ====================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initLoginPage();
  initAdminDashboard();
});

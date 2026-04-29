(function () {
  "use strict";

  var ADMIN_EMAIL = "automly1@gmail.com";
  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var SESSION_KEY = "rankforge-auth-session-v1";
  var OVERRIDE_KEY = "rankforge-admin-user-overrides-v1";
  var DATA = { users: [], searches: [], final_leads: [], lead_feedback: [] };

  var KNOWN_USER_EMAILS = {
    "95a6a7cf-6fef-45af-8b63-6b6a2cae7cd3": "automly1@gmail.com",
    "105ac365-6bde-47d9-a669-c0b23bea92e0": "automly2@gmail.com"
  };

  var HIDDEN_USER_IDS = { "usr_demo_owner": true, "usr_mvp": true, "usr_dashboard": true };

  var PLAN_RULES = {
    free: { label: "Free", searchLimit: 1, leadLimit: 10, maxPerBatch: 10 },
    starter: { label: "Starter", searchLimit: 5, leadLimit: 50, maxPerBatch: 25 },
    growth: { label: "Growth", searchLimit: 15, leadLimit: 250, maxPerBatch: 50 },
    agency_intelligence: { label: "Agency Intelligence", searchLimit: 9999, leadLimit: 750, maxPerBatch: 50 },
    admin_unlimited: { label: "Admin Unlimited", searchLimit: 9999, leadLimit: 999999, maxPerBatch: 50 }
  };

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } }
  function getSession() { if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") return window.rankforgeAuth.getSession(); return safeParse(localStorage.getItem(SESSION_KEY), null); }
  function currentEmail() { var s = getSession(); return clean(s && (s.email || s.userEmail)).toLowerCase(); }
  function isAdmin() { return currentEmail() === ADMIN_EMAIL; }
  function escapeHtml(value) { return clean(value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]; }); }
  function monthStart() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1).getTime(); }
  function inCurrentMonth(value) { var t = new Date(value || "").getTime(); return Number.isFinite(t) && t >= monthStart(); }
  function normalizePlan(value) {
    var raw = clean(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (["admin", "admin_unlimited", "unlimited"].indexOf(raw) >= 0) return "admin_unlimited";
    if (["agency", "agency_intelligence", "enterprise"].indexOf(raw) >= 0) return "agency_intelligence";
    if (["growth", "pro", "founding", "founding_plan"].indexOf(raw) >= 0) return "growth";
    if (["starter", "start", "basic", "starter_plan"].indexOf(raw) >= 0) return "starter";
    return "free";
  }
  function userId(row) { return clean(row.user_id || row.userId || row.id || row.email || row.user_email); }
  function userEmail(row) { return clean(row.email || row.user_email || row.userEmail || row.account_email || row.signed_in_email); }
  function knownEmail(id) { return KNOWN_USER_EMAILS[clean(id)] || ""; }
  function billingStatusFromUserRow(row) { return clean(row.billing_status || row.subscription_status || row.plan_status || row.account_status || ""); }
  function planValue(row) { return clean(row.plan || row.current_plan || row.subscription_plan || row.package || row.tier || ""); }
  function numberValue(value) { var n = Number(value || 0); return Number.isFinite(n) ? n : 0; }

  function loadOverrides() { return safeParse(localStorage.getItem(OVERRIDE_KEY), {}) || {}; }
  function saveOverrides(overrides) { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); }

  function parseGvizTable(parsed) {
    var cols = ((parsed.table && parsed.table.cols) || []).map(function (col) { return col.label || col.id; });
    return ((parsed.table && parsed.table.rows) || []).map(function (row) {
      var record = {}; var cells = row.c || [];
      cols.forEach(function (key, index) { var cell = cells[index]; record[key] = cell ? clean(cell.f || cell.v || "") : ""; });
      return record;
    });
  }

  function fetchSheetRows(sheetName) {
    return new Promise(function (resolve) {
      var callbackName = "rankforgeAdminControls_" + sheetName + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () { cleanup(); resolve([]); }, 15000);
      function cleanup() { window.clearTimeout(timeout); script.remove(); try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; } }
      window[callbackName] = function (parsed) { try { cleanup(); resolve(parseGvizTable(parsed)); } catch (error) { cleanup(); resolve([]); } };
      script.src = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) + "/gviz/tq?sheet=" + encodeURIComponent(sheetName) + "&tqx=responseHandler:" + encodeURIComponent(callbackName);
      script.async = true;
      script.onerror = function () { cleanup(); resolve([]); };
      document.body.appendChild(script);
    });
  }

  function getKnownUsers() {
    var map = {};

    (DATA.users || []).forEach(function (row) {
      var id = userId(row); if (!id || HIDDEN_USER_IDS[id]) return;
      map[id] = {
        user_id: id,
        email: userEmail(row) || knownEmail(id),
        sourcePlan: planValue(row),
        billing_status: billingStatusFromUserRow(row),
        raw: row
      };
    });

    [DATA.searches, DATA.final_leads, DATA.lead_feedback].forEach(function (list) {
      (list || []).forEach(function (row) {
        var id = userId(row); if (!id || HIDDEN_USER_IDS[id]) return;
        if (!map[id]) map[id] = { user_id: id, email: userEmail(row) || knownEmail(id), sourcePlan: "", billing_status: "", raw: row };
        if (!map[id].email && (userEmail(row) || knownEmail(id))) map[id].email = userEmail(row) || knownEmail(id);
      });
    });

    Object.keys(KNOWN_USER_EMAILS).forEach(function (id) {
      if (!map[id]) map[id] = { user_id: id, email: KNOWN_USER_EMAILS[id], sourcePlan: "", billing_status: "", raw: {} };
    });

    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function usageForUser(id) {
    var searches = DATA.searches.filter(function (row) { return userId(row) === id && inCurrentMonth(row.created_at || row.createdAt || row.lastRun || row.updated_at); });
    var qualified = DATA.final_leads.filter(function (row) {
      var status = clean(row.qualification_status || row.status).toLowerCase();
      return userId(row) === id && status === "qualified" && inCurrentMonth(row.created_at || row.createdAt || row.scored_at || row.updated_at);
    });
    var review = DATA.final_leads.filter(function (row) {
      var status = clean(row.qualification_status || row.status).toLowerCase();
      return userId(row) === id && status === "review_needed" && inCurrentMonth(row.created_at || row.createdAt || row.scored_at || row.updated_at);
    });
    return { searches: searches.length, qualified: qualified.length, review: review.length };
  }

  function effectiveUser(user) {
    var overrides = loadOverrides();
    var id = user.user_id;
    var override = overrides[id] || {};
    var email = clean(user.email || override.email || knownEmail(id));
    var defaultPlan = email.toLowerCase() === ADMIN_EMAIL ? "admin_unlimited" : "free";
    if (email.toLowerCase() === "automly2@gmail.com") defaultPlan = "growth";
    var planKey = normalizePlan(override.plan || user.sourcePlan || defaultPlan);
    var rule = PLAN_RULES[planKey] || PLAN_RULES.free;
    var extraSearch = numberValue(override.extra_search_credits);
    var extraLead = numberValue(override.extra_qualified_lead_credits);
    var usage = usageForUser(id);
    var searchLimit = rule.searchLimit >= 9999 ? 9999 : Math.max(0, rule.searchLimit + extraSearch);
    var leadLimit = rule.leadLimit >= 999999 ? 999999 : Math.max(0, rule.leadLimit + extraLead);
    var defaultStatus = planKey === "free" ? "free" : "active";
    return {
      user_id: id,
      email: email,
      plan: planKey,
      plan_label: rule.label,
      billing_status: clean(override.billing_status || user.billing_status || defaultStatus),
      searchLimit: searchLimit,
      leadLimit: leadLimit,
      maxPerBatch: rule.maxPerBatch,
      usedSearches: usage.searches,
      usedQualified: usage.qualified,
      reviewNeeded: usage.review,
      remainingSearches: searchLimit >= 9999 ? "∞" : Math.max(0, searchLimit - usage.searches),
      remainingQualified: leadLimit >= 999999 ? "∞" : Math.max(0, leadLimit - usage.qualified),
      extra_search_credits: extraSearch,
      extra_qualified_lead_credits: extraLead,
      admin_note: clean(override.admin_note),
      override_updated_at: clean(override.updated_at)
    };
  }

  function panelHtml() {
    return '<section class="panel" id="adminUserControlsPanel">' +
      '<div class="panel-header"><div><p class="panel-eyebrow">Billing Admin</p><h2>User plans, credits, and usage</h2></div>' +
      '<div class="panel-actions"><button class="button ghost small" type="button" id="adminReloadUsersButton">Reload</button><button class="button ghost small" type="button" id="adminExportOverridesButton">Copy Overrides JSON</button></div></div>' +
      '<p class="panel-copy">Manage test/user plan overrides and credit adjustments. Qualified leads count against lead credits; review_needed and rejected do not.</p>' +
      '<div class="saved-list-table-wrap"><table class="data-table quality-table" id="adminUserControlsTable"><thead><tr>' +
      '<th>User</th><th>Plan</th><th>Status</th><th>Searches</th><th>Qualified Credits</th><th>Review Needed</th><th>Manual Adjust</th><th>Action</th>' +
      '</tr></thead><tbody></tbody></table></div>' +
      '<p class="form-status" id="adminUserControlsStatus"></p>' +
      '<textarea id="adminOverrideOutput" style="display:none;width:100%;min-height:160px;margin-top:12px;border-radius:14px;padding:12px"></textarea>' +
    '</section>';
  }

  function ensurePanel() {
    if (document.getElementById("adminUserControlsPanel")) return;
    var usersPanel = document.querySelector("#adminUsersTable") ? document.querySelector("#adminUsersTable").closest("section") : null;
    if (usersPanel) usersPanel.insertAdjacentHTML("beforebegin", panelHtml());
    else {
      var main = document.querySelector(".dashboard-main");
      if (main) main.insertAdjacentHTML("beforeend", panelHtml());
    }
    var reload = document.getElementById("adminReloadUsersButton"); if (reload) reload.addEventListener("click", load);
    var exportBtn = document.getElementById("adminExportOverridesButton"); if (exportBtn) exportBtn.addEventListener("click", exportOverrides);
  }

  function render() {
    ensurePanel();
    var tbody = document.querySelector("#adminUserControlsTable tbody"); if (!tbody) return;
    var users = getKnownUsers().map(effectiveUser).sort(function (a, b) { return (b.usedSearches + b.usedQualified) - (a.usedSearches + a.usedQualified); });
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="8" class="quality-note-muted">No users found yet.</td></tr>'; return; }
    tbody.innerHTML = users.map(function (u) {
      return '<tr data-user-id="' + escapeHtml(u.user_id) + '">' +
        '<td><strong>' + escapeHtml(u.email || "No email recorded") + '</strong><br><small>' + escapeHtml(u.user_id) + '</small></td>' +
        '<td><select class="admin-plan-select"><option value="free"' + (u.plan === "free" ? " selected" : "") + '>Free</option><option value="starter"' + (u.plan === "starter" ? " selected" : "") + '>Starter</option><option value="growth"' + (u.plan === "growth" ? " selected" : "") + '>Growth</option><option value="agency_intelligence"' + (u.plan === "agency_intelligence" ? " selected" : "") + '>Agency Intelligence</option><option value="admin_unlimited"' + (u.plan === "admin_unlimited" ? " selected" : "") + '>Admin Unlimited</option></select><br><small>Max/batch: ' + escapeHtml(u.maxPerBatch) + '</small></td>' +
        '<td><select class="admin-status-select"><option value="free"' + (u.billing_status === "free" ? " selected" : "") + '>free</option><option value="active"' + (u.billing_status === "active" ? " selected" : "") + '>active</option><option value="pending_payment"' + (u.billing_status === "pending_payment" ? " selected" : "") + '>pending</option><option value="past_due"' + (u.billing_status === "past_due" ? " selected" : "") + '>past_due</option><option value="canceled"' + (u.billing_status === "canceled" ? " selected" : "") + '>canceled</option></select></td>' +
        '<td><strong>' + escapeHtml(u.usedSearches) + ' / ' + escapeHtml(u.searchLimit >= 9999 ? "∞" : u.searchLimit) + '</strong><br><small>Remaining: ' + escapeHtml(u.remainingSearches) + '</small></td>' +
        '<td><strong>' + escapeHtml(u.usedQualified) + ' / ' + escapeHtml(u.leadLimit >= 999999 ? "∞" : u.leadLimit) + '</strong><br><small>Remaining: ' + escapeHtml(u.remainingQualified) + '</small></td>' +
        '<td>' + escapeHtml(u.reviewNeeded) + '<br><small>Does not use credits</small></td>' +
        '<td><label><small>Search +/-</small><input class="admin-extra-search" type="number" step="1" value="' + escapeHtml(u.extra_search_credits) + '"></label><label><small>Lead +/-</small><input class="admin-extra-lead" type="number" step="1" value="' + escapeHtml(u.extra_qualified_lead_credits) + '"></label><label><small>Note</small><input class="admin-note" type="text" value="' + escapeHtml(u.admin_note) + '" placeholder="Reason"></label></td>' +
        '<td><button class="button ghost small admin-save-user" type="button">Save</button><br><small>' + escapeHtml(u.override_updated_at || "No override") + '</small></td>' +
      '</tr>';
    }).join("");
    tbody.querySelectorAll(".admin-save-user").forEach(function (button) { button.addEventListener("click", saveRow); });
  }

  function saveRow(event) {
    var tr = event.target.closest("tr"); if (!tr) return;
    var id = tr.getAttribute("data-user-id"); if (!id) return;
    var overrides = loadOverrides();
    overrides[id] = {
      user_id: id,
      email: clean(tr.querySelector("td strong") ? tr.querySelector("td strong").textContent : ""),
      plan: tr.querySelector(".admin-plan-select").value,
      billing_status: tr.querySelector(".admin-status-select").value,
      extra_search_credits: Number(tr.querySelector(".admin-extra-search").value || 0),
      extra_qualified_lead_credits: Number(tr.querySelector(".admin-extra-lead").value || 0),
      admin_note: clean(tr.querySelector(".admin-note").value),
      updated_at: new Date().toISOString(),
      updated_by: ADMIN_EMAIL
    };
    saveOverrides(overrides);
    setStatus("Saved override for " + id + ".", "success");
    render();
  }

  function setStatus(text, tone) {
    var node = document.getElementById("adminUserControlsStatus"); if (!node) return;
    node.textContent = text;
    node.classList.remove("is-error", "is-success");
    if (tone === "error") node.classList.add("is-error");
    if (tone === "success") node.classList.add("is-success");
  }

  function exportOverrides() {
    var out = document.getElementById("adminOverrideOutput"); if (!out) return;
    var payload = {
      generated_at: new Date().toISOString(),
      note: "Use this payload for a future n8n admin webhook or users sheet update. Only qualified leads should count against monthly lead credits.",
      overrides: loadOverrides()
    };
    out.style.display = "block";
    out.value = JSON.stringify(payload, null, 2);
    out.focus(); out.select();
    try { document.execCommand("copy"); setStatus("Overrides JSON copied. Paste into n8n/admin update when ready.", "success"); }
    catch (error) { setStatus("Overrides JSON prepared. Copy it manually.", "success"); }
  }

  async function load() {
    if (!isAdmin()) return;
    ensurePanel(); setStatus("Loading users and usage...", "");
    var names = ["users", "searches", "final_leads", "lead_feedback"];
    var results = await Promise.all(names.map(function (name) { return fetchSheetRows(name).then(function (rows) { return [name, rows]; }); }));
    results.forEach(function (pair) { DATA[pair[0]] = pair[1] || []; });
    render(); setStatus("User billing controls loaded.", "success");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { window.setTimeout(load, 800); });
  else window.setTimeout(load, 800);
})();

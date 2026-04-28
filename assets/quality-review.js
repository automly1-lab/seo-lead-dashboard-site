(function () {
  "use strict";

  var ADMIN_EMAIL = "automly1@gmail.com";
  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var SESSION_KEY = "rankforge-auth-session-v1";
  var USER_KEY = "rankforge-current-user-id-v1";
  var data = { users: [], searches: [], final_leads: [], lead_feedback: [] };
  var rows = [];

  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function getSession() { if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") return window.rankforgeAuth.getSession(); return safeParse(localStorage.getItem(SESSION_KEY), null); }
  function currentEmail() { var s = getSession(); return clean(s && (s.email || s.userEmail)).toLowerCase(); }
  function isAdmin() { return currentEmail() === ADMIN_EMAIL; }
  function currentUserId() { var s = getSession(); var id = clean(s && s.userId); if (/^[0-9a-f-]{36}$/i.test(id)) return id; var stored = clean(localStorage.getItem(USER_KEY)); return /^[0-9a-f-]{36}$/i.test(stored) ? stored : ""; }
  function setText(id, value) { var node = document.getElementById(id); if (node) node.textContent = value; }
  function setStatus(text, tone) { var node = document.getElementById("qualityStatus"); if (!node) return; node.textContent = text; node.classList.remove("is-success", "is-error"); if (tone === "success") node.classList.add("is-success"); if (tone === "error") node.classList.add("is-error"); }

  function guardAdmin() {
    if (isAdmin()) return true;
    setStatus("Admin access only.", "error");
    document.querySelectorAll("main .workspace-strip, main .quality-grid, main .panel").forEach(function (node) { node.style.display = "none"; });
    var main = document.querySelector(".dashboard-main");
    if (main && !document.querySelector(".admin-denied-panel")) {
      var panel = document.createElement("section");
      panel.className = "panel admin-denied-panel";
      panel.innerHTML = '<div class="panel-header"><div><p class="panel-eyebrow">Admin Only</p><h2>This page is restricted.</h2></div></div><p class="panel-copy">Quality and account metrics are only available to the RankForge admin account.</p><div class="panel-actions top-space"><a class="button primary" href="../dashboard/">Back to Dashboard</a></div>';
      main.appendChild(panel);
    }
    window.setTimeout(function () { window.location.href = "../dashboard/"; }, 1800);
    return false;
  }

  function humanize(value) {
    var text = clean(value);
    if (!text) return "Unknown";
    var map = { good_lead: "Good lead", bad_lead: "Bad lead", wrong_niche: "Wrong niche", wrong_location: "Wrong location", bad_contact: "Bad contact", weak_seo_opportunity: "Weak SEO opportunity", duplicate: "Duplicate", already_contacted: "Already contacted", not_relevant: "Not relevant", founding: "Founding Plan", launch: "Launch Plan", sample: "Sample Batch", guided: "Guided Setup" };
    return map[text.toLowerCase()] || text.replace(/_/g, " ").replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }
  function toneForType(type) { if (type === "good_lead") return "is-good"; if (["bad_lead", "bad_contact", "wrong_niche", "wrong_location", "weak_seo_opportunity"].indexOf(type) >= 0) return "is-bad"; return ""; }
  function parseDate(value) { var d = new Date(value || ""); return Number.isNaN(d.getTime()) ? 0 : d.getTime(); }
  function formatDate(value) { var d = new Date(value || ""); if (Number.isNaN(d.getTime())) return "-"; return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d); }
  function escapeHtml(value) { return clean(value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]; }); }

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
      var callbackName = "rankforgeAdminCallback_" + sheetName + "_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () { cleanup(); resolve([]); }, 15000);
      function cleanup() { window.clearTimeout(timeout); script.remove(); try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; } }
      window[callbackName] = function (parsed) { try { var parsedRows = parseGvizTable(parsed); cleanup(); resolve(parsedRows); } catch (error) { cleanup(); resolve([]); } };
      script.src = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) + "/gviz/tq?sheet=" + encodeURIComponent(sheetName) + "&tqx=responseHandler:" + encodeURIComponent(callbackName);
      script.async = true;
      script.onerror = function () { cleanup(); resolve([]); };
      document.body.appendChild(script);
    });
  }

  function countsByType(items) { return items.reduce(function (acc, row) { var type = clean(row.feedback_type || "unknown"); acc[type] = (acc[type] || 0) + 1; return acc; }, {}); }
  function sortedEntries(counts) { return Object.keys(counts).map(function (key) { return [key, counts[key]]; }).sort(function (a, b) { return b[1] - a[1]; }); }
  function userKey(row) { return clean(row.user_id || row.userId || row.id || row.email || row.user_email); }
  function planValue(row) { return clean(row.plan || row.current_plan || row.subscription_plan || row.package || row.tier || "Launch Plan"); }

  function uniqueUsers() {
    var map = {};
    [data.users, data.searches, data.final_leads, data.lead_feedback].forEach(function (list) {
      (list || []).forEach(function (row) {
        var id = userKey(row); if (!id) return;
        if (!map[id]) map[id] = { user_id: id, email: clean(row.email || row.user_email), plan: planValue(row), searches: 0, leads: 0, feedback: 0 };
        if (!map[id].email && clean(row.email || row.user_email)) map[id].email = clean(row.email || row.user_email);
        if (map[id].plan === "Launch Plan" && planValue(row) !== "Launch Plan") map[id].plan = planValue(row);
      });
    });
    data.searches.forEach(function (row) { var u = map[userKey(row)]; if (u) u.searches += 1; });
    data.final_leads.forEach(function (row) { var u = map[userKey(row)]; if (u) u.leads += 1; });
    data.lead_feedback.forEach(function (row) { var u = map[userKey(row)]; if (u) u.feedback += 1; });
    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) { return b.searches + b.leads + b.feedback - (a.searches + a.leads + a.feedback); });
  }

  function renderPlans(users) {
    var grid = document.getElementById("adminPlanGrid"); if (!grid) return;
    var counts = users.reduce(function (acc, user) { var p = humanize(user.plan || "Launch Plan"); acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    if (!entries.length) { grid.innerHTML = '<div class="quality-type-card"><span>No users</span><strong>0</strong><small>No workspace users found yet.</small></div>'; return; }
    grid.innerHTML = entries.map(function (entry) { return '<article class="quality-type-card"><span>' + escapeHtml(entry[0]) + '</span><strong>' + entry[1] + '</strong><small>user(s)</small></article>'; }).join("");
  }

  function renderUsers(users) {
    var tbody = document.querySelector("#adminUsersTable tbody"); if (!tbody) return;
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="5" class="quality-note-muted">No users found yet.</td></tr>'; return; }
    tbody.innerHTML = users.slice(0, 100).map(function (u) {
      return '<tr><td><strong>' + escapeHtml(u.email || "No email") + '</strong><br><small>' + escapeHtml(u.user_id) + '</small></td><td>' + escapeHtml(humanize(u.plan)) + '</td><td>' + u.searches + '</td><td>' + u.leads + '</td><td>' + u.feedback + '</td></tr>';
    }).join("");
  }

  function populateFilter(counts) {
    var select = document.getElementById("qualityTypeFilter"); if (!select) return;
    var current = select.value || "all";
    select.innerHTML = '<option value="all">All feedback</option>';
    sortedEntries(counts).forEach(function (entry) { var option = document.createElement("option"); option.value = entry[0]; option.textContent = humanize(entry[0]) + " (" + entry[1] + ")"; select.appendChild(option); });
    select.value = current;
  }

  function filteredRows() {
    var type = document.getElementById("qualityTypeFilter") ? document.getElementById("qualityTypeFilter").value : "all";
    var query = clean(document.getElementById("qualitySearchFilter") ? document.getElementById("qualitySearchFilter").value : "").toLowerCase();
    return rows.filter(function (row) {
      if (type !== "all" && clean(row.feedback_type) !== type) return false;
      if (!query) return true;
      return [row.company_name, row.search_id, row.feedback_note, row.website_url, row.feedback_type, row.user_email, row.user_id].map(clean).join(" ").toLowerCase().indexOf(query) >= 0;
    });
  }

  function renderTypeGrid(counts) {
    var grid = document.getElementById("qualityTypeGrid"); if (!grid) return;
    var entries = sortedEntries(counts);
    if (!entries.length) { grid.innerHTML = '<div class="quality-type-card"><span>No feedback</span><strong>0</strong><small>Feedback will appear after users review leads.</small></div>'; return; }
    grid.innerHTML = entries.slice(0, 8).map(function (entry) { return '<article class="quality-type-card"><span>' + escapeHtml(humanize(entry[0])) + '</span><strong>' + entry[1] + '</strong><small>' + escapeHtml(entry[0]) + '</small></article>'; }).join("");
  }

  function renderInsight(entries) {
    var card = document.getElementById("qualityInsightCard"); if (!card) return;
    if (!entries.length) { card.innerHTML = '<strong>No feedback loaded yet.</strong><p>Refresh admin data to see the most common issue.</p>'; return; }
    var type = entries[0][0];
    var copy = "Review recent feedback and use it to tune search rules.";
    if (type === "bad_contact") copy = "Contact quality is the top issue. Check contact extraction, evidence URLs, and contact requirement settings.";
    if (type === "wrong_niche") copy = "Niche matching is the top issue. Tighten business type, primary keyword, and rejection rules.";
    if (type === "wrong_location") copy = "Location matching is the top issue. Check city/metro query construction and local result filtering.";
    if (type === "weak_seo_opportunity") copy = "SEO opportunity strength is the top issue. Revisit audit scoring and threshold rules.";
    if (type === "duplicate") copy = "Duplicate feedback is the top issue. Improve domain/company dedupe before final leads are written.";
    if (type === "good_lead") copy = "Good lead feedback is the top signal. Use these examples to identify what should be approved more often.";
    card.innerHTML = '<strong>Top signal: ' + escapeHtml(humanize(type)) + '</strong><p>' + escapeHtml(copy) + '</p>';
  }

  function renderTable() {
    var tbody = document.querySelector("#qualityFeedbackTable tbody"); if (!tbody) return;
    var visible = filteredRows().sort(function (a, b) { return parseDate(b.created_at) - parseDate(a.created_at); }).slice(0, 75);
    if (!visible.length) { tbody.innerHTML = '<tr><td colspan="6" class="quality-note-muted">No matching feedback yet.</td></tr>'; return; }
    tbody.innerHTML = visible.map(function (row) {
      var type = clean(row.feedback_type || "unknown");
      return '<tr><td><span class="quality-feedback-type ' + toneForType(type) + '">' + escapeHtml(humanize(type)) + '</span></td><td><strong>' + escapeHtml(row.company_name || "Unknown company") + '</strong><br><small>' + escapeHtml(row.website_url || "") + '</small></td><td><small>' + escapeHtml(row.user_email || row.user_id || "-") + '</small></td><td><small>' + escapeHtml(row.search_id || "-") + '</small></td><td>' + (row.feedback_note ? escapeHtml(row.feedback_note) : '<span class="quality-note-muted">No note</span>') + '</td><td><small>' + escapeHtml(formatDate(row.created_at)) + '</small></td></tr>';
    }).join("");
  }

  function render() {
    var users = uniqueUsers();
    rows = data.lead_feedback || [];
    var counts = countsByType(rows); var entries = sortedEntries(counts);
    setText("adminTotalUsers", String(users.length));
    setText("adminTotalSearches", String(data.searches.length));
    setText("adminTotalLeads", String(data.final_leads.length));
    setText("qualityTotalFeedback", String(rows.length));
    setText("qualityGoodLeadCount", (counts.good_lead || 0) + " good lead signals");
    setText("qualityBadContactCount", String(counts.bad_contact || 0));
    setText("qualityTopIssue", entries.length ? humanize(entries[0][0]) : "No issue yet");
    setText("qualityTopIssueMeta", entries.length ? entries[0][1] + " feedback item(s)" : "Feedback will appear after sync.");
    renderPlans(users); renderUsers(users); populateFilter(counts); renderTypeGrid(counts); renderInsight(entries); renderTable();
  }

  async function load() {
    if (!guardAdmin()) return;
    setStatus("Syncing admin data...", "");
    var sheetNames = ["users", "searches", "final_leads", "lead_feedback"];
    var results = await Promise.all(sheetNames.map(function (name) { return fetchSheetRows(name).then(function (r) { return [name, r]; }); }));
    results.forEach(function (pair) { data[pair[0]] = pair[1] || []; });
    render();
    setStatus("Admin data synced.", "success");
  }

  function bind() {
    var refresh = document.getElementById("refreshQualityButton"); if (refresh) refresh.addEventListener("click", load);
    var type = document.getElementById("qualityTypeFilter"); if (type) type.addEventListener("change", renderTable);
    var search = document.getElementById("qualitySearchFilter"); if (search) search.addEventListener("input", renderTable);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { bind(); load(); });
  else { bind(); load(); }
})();

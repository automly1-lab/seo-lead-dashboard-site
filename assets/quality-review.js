(function () {
  "use strict";

  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var SESSION_KEY = "rankforge-auth-session-v1";
  var USER_KEY = "rankforge-current-user-id-v1";
  var rows = [];

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function getSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      return window.rankforgeAuth.getSession();
    }
    return safeParse(localStorage.getItem(SESSION_KEY), null);
  }

  function currentUserId() {
    var session = getSession();
    var id = clean(session && session.userId);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
    var stored = clean(localStorage.getItem(USER_KEY));
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored)) return stored;
    return "";
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function setStatus(text, tone) {
    var node = document.getElementById("qualityStatus");
    if (!node) return;
    node.textContent = text;
    node.classList.remove("is-success", "is-error");
    if (tone === "success") node.classList.add("is-success");
    if (tone === "error") node.classList.add("is-error");
  }

  function humanize(value) {
    var text = clean(value);
    if (!text) return "Unknown";
    var map = {
      good_lead: "Good lead",
      bad_lead: "Bad lead",
      wrong_niche: "Wrong niche",
      wrong_location: "Wrong location",
      bad_contact: "Bad contact",
      weak_seo_opportunity: "Weak SEO opportunity",
      duplicate: "Duplicate",
      already_contacted: "Already contacted",
      not_relevant: "Not relevant"
    };
    return map[text] || text.replace(/_/g, " ").replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function toneForType(type) {
    if (type === "good_lead") return "is-good";
    if (["bad_lead", "bad_contact", "wrong_niche", "wrong_location", "weak_seo_opportunity"].indexOf(type) >= 0) return "is-bad";
    return "";
  }

  function parseDate(value) {
    var d = new Date(value || "");
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  function formatDate(value) {
    var d = new Date(value || "");
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function parseGvizTable(parsed) {
    var cols = ((parsed.table && parsed.table.cols) || []).map(function (col) { return col.label || col.id; });
    return ((parsed.table && parsed.table.rows) || []).map(function (row) {
      var record = {};
      var cells = row.c || [];
      cols.forEach(function (key, index) {
        var cell = cells[index];
        record[key] = cell ? clean(cell.f || cell.v || "") : "";
      });
      return record;
    });
  }

  function fetchFeedbackRows() {
    return new Promise(function (resolve, reject) {
      var previousGoogle = window.google;
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("feedback-timeout"));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timeout);
        script.remove();
        if (previousGoogle === undefined) delete window.google;
        else window.google = previousGoogle;
      }

      window.google = window.google || {};
      window.google.visualization = window.google.visualization || {};
      window.google.visualization.Query = window.google.visualization.Query || {};
      window.google.visualization.Query.setResponse = function (parsed) {
        try {
          var parsedRows = parseGvizTable(parsed);
          cleanup();
          resolve(parsedRows);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      script.src = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) + "/gviz/tq?sheet=" + encodeURIComponent("lead_feedback") + "&tqx=out:json";
      script.async = true;
      script.onerror = function () {
        cleanup();
        reject(new Error("feedback-script-load"));
      };
      document.body.appendChild(script);
    });
  }

  function countsByType(items) {
    return items.reduce(function (acc, row) {
      var type = clean(row.feedback_type || "unknown");
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }

  function sortedEntries(counts) {
    return Object.keys(counts).map(function (key) { return [key, counts[key]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }

  function populateFilter(counts) {
    var select = document.getElementById("qualityTypeFilter");
    if (!select || select.dataset.loaded === "true") return;
    sortedEntries(counts).forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry[0];
      option.textContent = humanize(entry[0]) + " (" + entry[1] + ")";
      select.appendChild(option);
    });
    select.dataset.loaded = "true";
  }

  function filteredRows() {
    var type = document.getElementById("qualityTypeFilter") ? document.getElementById("qualityTypeFilter").value : "all";
    var query = clean(document.getElementById("qualitySearchFilter") ? document.getElementById("qualitySearchFilter").value : "").toLowerCase();
    return rows.filter(function (row) {
      if (type !== "all" && clean(row.feedback_type) !== type) return false;
      if (!query) return true;
      var haystack = [row.company_name, row.search_id, row.feedback_note, row.website_url, row.feedback_type].map(clean).join(" ").toLowerCase();
      return haystack.indexOf(query) >= 0;
    });
  }

  function renderTypeGrid(counts) {
    var grid = document.getElementById("qualityTypeGrid");
    if (!grid) return;
    var entries = sortedEntries(counts);
    if (!entries.length) {
      grid.innerHTML = '<div class="quality-type-card"><span>No feedback</span><strong>0</strong><small>Feedback will appear after users review leads.</small></div>';
      return;
    }
    grid.innerHTML = entries.slice(0, 8).map(function (entry) {
      return '<article class="quality-type-card"><span>' + escapeHtml(humanize(entry[0])) + '</span><strong>' + entry[1] + '</strong><small>' + escapeHtml(entry[0]) + '</small></article>';
    }).join("");
  }

  function renderInsight(entries) {
    var card = document.getElementById("qualityInsightCard");
    if (!card) return;
    if (!entries.length) {
      card.innerHTML = '<strong>No feedback loaded yet.</strong><p>Refresh feedback to see the most common issue in this workspace.</p>';
      return;
    }
    var top = entries[0];
    var type = top[0];
    var copy = "Review recent feedback and use it to tune search rules.";
    if (type === "bad_contact") copy = "Contact quality is the top issue. Check contact extraction, evidence URLs, and contact requirement settings.";
    if (type === "wrong_niche") copy = "Niche matching is the top issue. Tighten business type, primary keyword, and rejection rules for this search pattern.";
    if (type === "wrong_location") copy = "Location matching is the top issue. Check city/metro query construction and local result filtering.";
    if (type === "weak_seo_opportunity") copy = "SEO opportunity strength is the top issue. Revisit audit scoring and threshold rules.";
    if (type === "duplicate") copy = "Duplicate feedback is the top issue. Improve domain/company dedupe before final leads are written.";
    if (type === "good_lead") copy = "Good lead feedback is the top signal. Use these examples to identify what should be approved more often.";
    card.innerHTML = '<strong>Top signal: ' + escapeHtml(humanize(type)) + '</strong><p>' + escapeHtml(copy) + '</p>';
  }

  function renderTable() {
    var tbody = document.querySelector("#qualityFeedbackTable tbody");
    if (!tbody) return;
    var visible = filteredRows().sort(function (a, b) { return parseDate(b.created_at) - parseDate(a.created_at); }).slice(0, 50);
    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="quality-note-muted">No matching feedback yet.</td></tr>';
      return;
    }
    tbody.innerHTML = visible.map(function (row) {
      var type = clean(row.feedback_type || "unknown");
      return '<tr>' +
        '<td><span class="quality-feedback-type ' + toneForType(type) + '">' + escapeHtml(humanize(type)) + '</span></td>' +
        '<td><strong>' + escapeHtml(row.company_name || "Unknown company") + '</strong><br><small>' + escapeHtml(row.website_url || "") + '</small></td>' +
        '<td><small>' + escapeHtml(row.search_id || "-") + '</small></td>' +
        '<td>' + (row.feedback_note ? escapeHtml(row.feedback_note) : '<span class="quality-note-muted">No note</span>') + '</td>' +
        '<td><small>' + escapeHtml(formatDate(row.created_at)) + '</small></td>' +
      '</tr>';
    }).join("");
  }

  function render() {
    var counts = countsByType(rows);
    var entries = sortedEntries(counts);
    var good = counts.good_lead || 0;
    var badContact = counts.bad_contact || 0;
    setText("qualityTotalFeedback", String(rows.length));
    setText("qualityGoodLeadCount", String(good));
    setText("qualityBadContactCount", String(badContact));
    setText("qualityTopIssue", entries.length ? humanize(entries[0][0]) : "No issue yet");
    setText("qualityTopIssueMeta", entries.length ? entries[0][1] + " feedback item(s)" : "Feedback will appear after sync.");
    populateFilter(counts);
    renderTypeGrid(counts);
    renderInsight(entries);
    renderTable();
  }

  async function load() {
    var userId = currentUserId();
    if (!userId) {
      setStatus("Please sign in to view quality feedback.", "error");
      return;
    }
    setStatus("Syncing feedback...", "");
    try {
      var all = await fetchFeedbackRows();
      rows = all.filter(function (row) { return clean(row.user_id) === userId; });
      render();
      setStatus(rows.length ? "Feedback synced." : "No feedback found for this workspace yet.", "success");
    } catch (error) {
      console.error("[RankForge Quality Review] feedback sync failed", error);
      setStatus("Could not load feedback. Try again later.", "error");
    }
  }

  function bind() {
    var refresh = document.getElementById("refreshQualityButton");
    if (refresh) refresh.addEventListener("click", load);
    var type = document.getElementById("qualityTypeFilter");
    if (type) type.addEventListener("change", renderTable);
    var search = document.getElementById("qualitySearchFilter");
    if (search) search.addEventListener("input", renderTable);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bind(); load(); });
  } else {
    bind();
    load();
  }
})();

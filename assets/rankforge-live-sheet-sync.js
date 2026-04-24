(function () {
  "use strict";

  var STORAGE_KEY = "rankforge-dashboard-state-v3";
  var CURRENT_USER_STORAGE_KEY = "rankforge-current-user-id-v1";
  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var TABS = ["searches", "raw_prospects", "seo_audits", "contacts", "final_leads"];

  function log() {
    try { console.log.apply(console, ["[RankForge Live Sheet Sync]"].concat([].slice.call(arguments))); } catch (e) {}
  }

  function byId(id) { return document.getElementById(id); }
  function setText(id, text) { var el = byId(id); if (el) el.textContent = text; }

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }

  function loadState() {
    var state = parseJson(localStorage.getItem(STORAGE_KEY), {});
    if (!Array.isArray(state.localLists)) state.localLists = [];
    if (!Array.isArray(state.localLeads)) state.localLeads = [];
    if (!Array.isArray(state.archivedListIds)) state.archivedListIds = [];
    return state;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function currentUserId() {
    var session = parseJson(localStorage.getItem("rankforge-auth-session-v1"), null);
    var userId = session && session.userId ? session.userId : (localStorage.getItem(CURRENT_USER_STORAGE_KEY) || "usr_mvp");
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId);
    return userId;
  }

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function num(value) { var n = Number(value || 0); return Number.isFinite(n) ? Math.round(n) : 0; }

  function titleCase(value) {
    return clean(value).replace(/_/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
  }

  function signature(row) {
    return [row.userId || row.user_id, row.name || row.search_name, row.niche, row.businessType || row.business_type, row.city, row.country]
      .map(lower)
      .join("|");
  }

  function fetchGviz(sheetName) {
    var url = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?sheet=" + encodeURIComponent(sheetName) + "&tqx=out:json&_=" + Date.now();
    return fetch(url, { cache: "no-store" })
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var cleaned = text.replace(/^[\s\S]*?setResponse\(/, "").replace(/\);\s*$/, "");
        var parsed = JSON.parse(cleaned);
        var table = parsed.table || {};
        var cols = (table.cols || []).map(function (col) { return col.label || col.id || ""; });
        return (table.rows || []).map(function (row) {
          var record = {};
          var cells = row.c || [];
          cols.forEach(function (key, index) {
            var cell = cells[index];
            record[key] = cell ? (cell.f || cell.v || "") : "";
          });
          return record;
        });
      });
  }

  function fetchLiveSheets() {
    return Promise.all(TABS.map(fetchGviz)).then(function (rows) {
      var data = {};
      TABS.forEach(function (tab, index) { data[tab] = rows[index] || []; });
      return buildRuntimeData(data, "google-sheets-live");
    });
  }

  function fetchSnapshot() {
    var paths = ["../data/dashboard-data.json", "/data/dashboard-data.json", "data/dashboard-data.json"];
    var attempt = function (index) {
      if (index >= paths.length) return Promise.reject(new Error("dashboard-data.json bulunamadi"));
      return fetch(paths[index] + "?_=" + Date.now(), { cache: "no-store" })
        .then(function (res) { if (!res.ok) throw new Error("snapshot yok"); return res.json(); })
        .catch(function () { return attempt(index + 1); });
    };
    return attempt(0).then(function (data) {
      data.source = data.source || "github-static-refresh";
      return data;
    });
  }

  function buildRuntimeData(sheetData, sourceName) {
    var searches = sheetData.searches || [];
    var raw = sheetData.raw_prospects || [];
    var audits = sheetData.seo_audits || [];
    var contacts = sheetData.contacts || [];
    var finalLeads = sheetData.final_leads || [];

    var auditsById = {};
    audits.forEach(function (a) { if (a.audit_id) auditsById[a.audit_id] = a; });

    var contactsById = {};
    contacts.forEach(function (c) { if (c.contact_id) contactsById[c.contact_id] = c; });

    var contactByProspect = {};
    contacts.forEach(function (c) {
      var pid = c.prospect_id;
      if (!pid) return;
      var old = contactByProspect[pid];
      if (!old || num(c.contact_confidence_score) > num(old.contact_confidence_score)) contactByProspect[pid] = c;
    });

    var prospectsById = {};
    raw.forEach(function (p) { if (p.prospect_id) prospectsById[p.prospect_id] = p; });

    function resolveSearchId(lead, audit, prospect, contact) {
      return clean((lead && lead.search_id) || (audit && audit.search_id) || (prospect && prospect.search_id) || (contact && contact.search_id));
    }

    var leads = [];
    var seen = {};
    function pushLead(lead) {
      if (!lead.listId) return;
      var key = lead.id || [lead.listId, lead.company, lead.website].map(lower).join("|");
      if (seen[key]) return;
      seen[key] = true;
      leads.push(lead);
    }

    finalLeads.forEach(function (lead, index) {
      var audit = auditsById[lead.audit_id] || {};
      var prospect = prospectsById[lead.prospect_id] || {};
      var contact = contactsById[lead.primary_contact_id] || contactByProspect[lead.prospect_id] || {};
      pushLead({
        id: lead.lead_id || "remote_lead_" + index,
        listId: resolveSearchId(lead, audit, prospect, contact),
        userId: lead.user_id || audit.user_id || prospect.user_id || contact.user_id || "usr_mvp",
        company: lead.company_name || audit.company_name || prospect.company_name || "Unknown company",
        website: lead.website_url || audit.website_url || prospect.website_url || "",
        decisionMaker: lead.decision_maker_name || contact.contact_name || "",
        role: lead.decision_maker_role || contact.contact_role || "",
        email: lead.decision_maker_email || contact.email || "",
        phone: lead.decision_maker_phone || contact.phone || "",
        seoScore: num(lead.seo_need_score || audit.seo_need_score),
        overallScore: num(lead.overall_lead_score || lead.seo_need_score || audit.seo_need_score),
        commercialFit: num(lead.commercial_fit_score || audit.commercial_fit_score),
        contactConfidence: num(lead.contact_confidence_score || contact.contact_confidence_score),
        status: lead.qualification_status || lead.status || "review_needed",
        outreachReadiness: lead.outreach_readiness || ((contact.email || contact.phone) ? "ready" : "needs_review"),
        paidAdsDetected: lower(lead.paid_ads_detected || audit.paid_ads_detected) === "true",
        primaryProblem: lead.primary_problem || "",
        secondaryProblem: lead.secondary_problem || "",
        whyItMatters: lead.qualification_reason || audit.audit_summary || "",
        outreachAngle: lead.outreach_angle || audit.recommended_outreach_angle || "",
        valueHypothesis: lead.client_value_hypothesis || "",
        firstLine: lead.first_line_personalization || "",
        recommendedOffer: lead.recommended_offer || "",
        recommendedChannel: lead.recommended_channel || ""
      });
    });

    audits.forEach(function (audit, index) {
      var prospect = prospectsById[audit.prospect_id] || {};
      var contact = contactByProspect[audit.prospect_id] || {};
      var seoScore = num(audit.seo_need_score);
      pushLead({
        id: "audit_" + (audit.audit_id || index),
        listId: resolveSearchId(null, audit, prospect, contact),
        userId: audit.user_id || prospect.user_id || contact.user_id || "usr_mvp",
        company: audit.company_name || prospect.company_name || "Unknown company",
        website: audit.website_url || prospect.website_url || "",
        decisionMaker: contact.contact_name || "",
        role: contact.contact_role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        seoScore: seoScore,
        overallScore: seoScore,
        commercialFit: num(audit.commercial_fit_score),
        contactConfidence: num(contact.contact_confidence_score),
        status: seoScore >= num(audit.min_lead_score || 70) ? "review_needed" : "rejected",
        outreachReadiness: (contact.email || contact.phone) ? "ready" : "needs_review",
        paidAdsDetected: lower(audit.paid_ads_detected) === "true",
        whyItMatters: audit.audit_summary || "",
        outreachAngle: audit.recommended_outreach_angle || ""
      });
    });

    var lists = searches.map(function (s) {
      var sid = clean(s.search_id);
      var searchProspects = raw.filter(function (r) { return clean(r.search_id) === sid; });
      var searchAudits = audits.filter(function (a) { return clean(a.search_id) === sid && lower(a.status) === "completed"; });
      var searchContacts = contacts.filter(function (c) { return clean(c.search_id) === sid && lower(c.status) !== "pending"; });
      var searchLeads = leads.filter(function (l) { return clean(l.listId) === sid; });
      var qualified = searchLeads.filter(function (l) { return lower(l.status) === "qualified"; }).length;
      var rejected = searchLeads.filter(function (l) { return lower(l.status) === "rejected"; }).length;
      var inferredStatus = s.status || "active";
      if (searchLeads.length || searchAudits.length) inferredStatus = "completed";
      else if (searchProspects.length || searchContacts.length) inferredStatus = "running";
      return {
        id: sid,
        userId: s.user_id || "usr_mvp",
        name: s.search_name || (titleCase(s.niche) + " - " + s.city),
        niche: s.niche || "",
        businessType: s.business_type || "",
        city: s.city || "",
        country: s.country || "",
        description: titleCase(s.niche) + " opportunities for " + (s.city || "selected market") + ", kept as a persistent saved list.",
        status: inferredStatus,
        lastRun: s.completed_at || s.started_at || s.updated_at || s.created_at || new Date().toISOString(),
        discovered: searchProspects.length,
        audited: searchAudits.length,
        enriched: searchContacts.length,
        qualified: qualified,
        rejected: rejected,
        minSeoScore: num(s.min_audit_score || 55),
        minLeadScore: num(s.min_lead_score || 70),
        archived: false,
        isRemote: true
      };
    }).filter(function (list) { return !!list.id; });

    return { lists: lists, leads: leads, source: sourceName };
  }

  function mergeRuntimeData(runtime) {
    var state = loadState();
    var userId = currentUserId();
    var existingLists = state.localLists || [];
    var existingLeads = state.localLeads || [];
    var remoteLists = (runtime.lists || []).filter(function (l) { return (l.userId || userId) === userId; });
    var remoteLeads = (runtime.leads || []).filter(function (l) { return (l.userId || userId) === userId; });

    var byId = {};
    var bySig = {};
    existingLists.forEach(function (list) {
      byId[list.id] = list;
      bySig[signature(list)] = list;
    });

    remoteLists.forEach(function (remote) {
      var match = byId[remote.id] || bySig[signature(remote)];
      if (match) {
        var oldId = match.id;
        Object.assign(match, remote, { id: remote.id, isRemote: true });
        if (state.activeListId === oldId) state.activeListId = remote.id;
        existingLeads.forEach(function (lead) { if (lead.listId === oldId) lead.listId = remote.id; });
      } else {
        existingLists.unshift(remote);
      }
    });

    var leadById = {};
    existingLeads.forEach(function (lead) { leadById[lead.id] = lead; });
    remoteLeads.forEach(function (lead) {
      if (leadById[lead.id]) Object.assign(leadById[lead.id], lead, { isRemote: true });
      else existingLeads.unshift(Object.assign({ isRemote: true }, lead));
    });

    state.localLists = existingLists;
    state.localLeads = existingLeads;
    state.currentUserId = userId;
    state.lastLiveSheetSyncAt = new Date().toISOString();
    state.lastLiveSheetSource = runtime.source || "unknown";

    if (!state.activeListId && existingLists.length) state.activeListId = existingLists[0].id;
    saveState(state);
    return state;
  }

  function runOriginalRender() {
    try {
      if (window.__rankforgeOriginalSyncSheets) return window.__rankforgeOriginalSyncSheets({ preventDefault: function () {} });
    } catch (e) {}
  }

  function syncSheets(event) {
    if (event && event.preventDefault) event.preventDefault();
    setText("dataStatus", "Syncing Sheets...");
    setText("workspaceDataSource", "Syncing Sheets...");

    return fetchLiveSheets()
      .catch(function (liveError) {
        log("Live Sheets okunamadi, snapshot deneniyor:", liveError.message || liveError);
        return fetchSnapshot();
      })
      .then(function (runtime) {
        var state = mergeRuntimeData(runtime);
        setText("dataStatus", "Sheets synced");
        setText("workspaceDataSource", runtime.source === "google-sheets-live" ? "Live Google Sheets" : "GitHub snapshot");
        setText("workspaceLastSync", "Last sync: " + new Date().toLocaleString());
        runOriginalRender();
        log("Sync tamam", { source: runtime.source, lists: (runtime.lists || []).length, leads: (runtime.leads || []).length, activeListId: state.activeListId });
        return false;
      })
      .catch(function (error) {
        setText("dataStatus", "Sync failed");
        setText("workspaceDataSource", "Local fallback");
        setText("workspaceLastSync", "Sheets could not be loaded");
        log("Sync failed", error);
        return false;
      });
  }

  function install() {
    if (window.rankforgeDashboardActions && window.rankforgeDashboardActions.syncSheets && !window.__rankforgeOriginalSyncSheets) {
      window.__rankforgeOriginalSyncSheets = window.rankforgeDashboardActions.syncSheets;
    }
    window.rankforgeDashboardActions = window.rankforgeDashboardActions || {};
    window.rankforgeDashboardActions.syncSheets = syncSheets;
    var btn = byId("syncSheetsButton");
    if (btn) btn.onclick = syncSheets;
    setTimeout(syncSheets, 1200);
    log("active v1");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
})();

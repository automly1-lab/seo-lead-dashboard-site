/*
  RankForge dashboard stability layer
  Load this AFTER assets/auth.js and assets/dashboard.js on dashboard/index.html.

  Purpose:
  - keep the existing fallback behavior
  - add duplicate protection for saved lists
  - mark webhook-created searches as pending/sent/failed instead of blindly "successful"
  - keep webhook URL configurable
  - allow Sync Sheets to merge ../data/dashboard-data.json into local state
*/
(function () {
  "use strict";

  var STORAGE_KEY = "rankforge-dashboard-state-v3";
  var WEBHOOK_STORAGE_KEY = "rankforge-search-submit-webhook-v1";
  var CURRENT_USER_STORAGE_KEY = "rankforge-current-user-id-v1";
  var AUTH_SESSION_KEY = "rankforge-auth-session-v1";
  var DEFAULT_SEARCH_WEBHOOK_URL = "https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search";
  var SNAPSHOT_URL = "../data/dashboard-data.json";

  function byId(id) {
    return document.getElementById(id);
  }

  function parseJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function status(id, text) {
    var node = byId(id);
    if (node) node.textContent = text;
  }

  function currentUserId() {
    var session = parseJson(localStorage.getItem(AUTH_SESSION_KEY), null);
    if (session && session.userId) {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, session.userId);
      return session.userId;
    }
    return localStorage.getItem(CURRENT_USER_STORAGE_KEY) || "usr_mvp";
  }

  function loadState() {
    var state = parseJson(localStorage.getItem(STORAGE_KEY), {});
    if (!Array.isArray(state.localLists)) state.localLists = [];
    if (!Array.isArray(state.localLeads)) state.localLeads = [];
    if (!Array.isArray(state.archivedListIds)) state.archivedListIds = [];
    state.currentUserId = currentUserId();
    return state;
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureWebhook() {
    var current = (localStorage.getItem(WEBHOOK_STORAGE_KEY) || "").trim();
    if (!current) {
      current = DEFAULT_SEARCH_WEBHOOK_URL;
      localStorage.setItem(WEBHOOK_STORAGE_KEY, current);
    }
    return current;
  }

  function formatDate(value) {
    if (!value) return "No run yet";
    try {
      return new Date(value).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return "No run yet";
    }
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function listSignature(values, userId) {
    return [
      userId,
      normalize(values.name || values.search_name),
      normalize(values.niche),
      normalize(values.businessType || values.business_type),
      normalize(values.city),
      normalize(values.country)
    ].join("|");
  }

  function visibleLists(state) {
    var userId = state.currentUserId;
    return state.localLists.filter(function (item) {
      return state.archivedListIds.indexOf(item.id) === -1 && (item.userId || userId) === userId;
    });
  }

  function getActiveList(state, lists) {
    var activeId = state.activeListId || (lists[0] && lists[0].id);
    var activeList = null;
    lists.forEach(function (item) {
      if (item.id === activeId) activeList = item;
    });
    return activeList || lists[0] || null;
  }

  function leadStatusIs(lead, value) {
    return normalize(lead.status || lead.qualification_status) === normalize(value);
  }

  function renderFallback() {
    var state = loadState();
    var userId = state.currentUserId;
    var lists = visibleLists(state);
    var activeList = getActiveList(state, lists);
    var leads = state.localLeads.filter(function (lead) {
      return activeList && lead.listId === activeList.id && (lead.userId || userId) === userId;
    });

    status("workspaceUserBadge", userId);
    var userInput = byId("currentUserIdInput");
    if (userInput) userInput.value = userId;
    status("currentUserStatus", "Signed-in workspace user loaded.");
    status("workspaceDataSource", state.lastRemoteSyncAt ? "Sheet snapshot + local fallback" : "Local fallback");
    status("workspaceLastSync", state.lastRemoteSyncAt ? "Last sync " + formatDate(state.lastRemoteSyncAt) : "Local fallback active");
    status("metricSavedLists", String(lists.length));

    var qualifiedTotal = 0;
    var reviewNeededTotal = 0;
    var scoreTotal = 0;
    var scoreCount = 0;

    state.localLeads.forEach(function (lead) {
      if ((lead.userId || userId) !== userId) return;
      if (leadStatusIs(lead, "qualified")) qualifiedTotal += 1;
      if (leadStatusIs(lead, "review_needed")) reviewNeededTotal += 1;
      if (Number(lead.overallScore || 0)) {
        scoreTotal += Number(lead.overallScore || 0);
        scoreCount += 1;
      }
    });

    lists.forEach(function (list) {
      qualifiedTotal += Number(list.qualified || 0);
    });

    status("metricQualified", String(qualifiedTotal));
    status("metricReviewNeeded", String(reviewNeededTotal));
    status("metricAverageScore", String(scoreCount ? Math.round(scoreTotal / scoreCount) : 0));

    if (activeList) {
      status("activeListName", activeList.name);
      status("activeListStatus", activeList.status || "queued");
      status("activeListDescription", activeList.description || "Saved search list in workspace.");
      status("activeListMarket", [activeList.niche, activeList.city, activeList.country].filter(Boolean).join(" - "));
      status("activeListRun", formatDate(activeList.lastRun || activeList.updatedAt));
      status("pipelineDiscovered", String(activeList.discovered || 0));
      status("pipelineAudited", String(activeList.audited || 0));
      status("pipelineEnriched", String(activeList.enriched || 0));
      status("pipelineQualified", String(activeList.qualified || 0));
      status("pipelineRejected", String(activeList.rejected || 0));
      status("visibleLeadCount", String(leads.length) + " leads");
      status("activeLeadSummary", [activeList.city, activeList.country, activeList.status].filter(Boolean).join(" - "));
      status("workspaceSelectedListHealth", activeList.webhookSyncStatus === "failed" ? "Webhook needs attention" : "List loaded");
      status("workspaceSelectedListMeta", String(activeList.qualified || 0) + " qualified, " + String(activeList.rejected || 0) + " rejected.");
    }

    var listBody = document.querySelector("#savedListsTable tbody");
    if (listBody) {
      if (!lists.length) {
        listBody.innerHTML = '<tr><td colspan="5" class="empty-state">No local lists yet.</td></tr>';
      } else {
        listBody.innerHTML = lists.slice(0, 5).map(function (list) {
          return "<tr><td><span class='list-name'>" + escapeHtml(list.name || "Untitled list") + "</span></td><td>" +
            escapeHtml([list.niche, list.city].filter(Boolean).join(" - ")) + "</td><td><span class='status-pill status-qualified'>" +
            escapeHtml(list.status || "queued") + "</span></td><td>" + escapeHtml(formatDate(list.lastRun || list.updatedAt)) +
            "</td><td>" + String(list.qualified || 0) + "</td></tr>";
        }).join("");
      }
    }

    var leadBody = document.querySelector("#leadsTable tbody");
    if (leadBody) {
      if (!leads.length) {
        leadBody.innerHTML = '<tr><td colspan="5" class="empty-state">No visible leads for this local list yet.</td></tr>';
      } else {
        leadBody.innerHTML = leads.slice(0, 6).map(function (lead) {
          return "<tr><td class='company-cell'><strong>" + escapeHtml(lead.company || "Unknown company") + "</strong><span>" +
            escapeHtml(lead.website || "") + "</span></td><td><strong>" + escapeHtml(lead.decisionMaker || "No named contact yet") +
            "</strong><span class='status-note'>" + escapeHtml(lead.role || "Needs review") + "</span></td><td class='contact-stack'><span>" +
            escapeHtml(lead.email || "No email") + "</span><span>" + escapeHtml(lead.phone || "No phone") +
            "</span></td><td><span class='score-pill'>" + String(lead.overallScore || 0) +
            "</span></td><td><span class='status-pill status-qualified'>" + escapeHtml(lead.status || "review_needed") + "</span></td></tr>";
        }).join("");
      }
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function addList(values) {
    var state = loadState();
    var userId = state.currentUserId;
    var incomingId = values.id || "list_" + Date.now();
    var signature = listSignature(values, userId);
    var existingIndex = -1;

    state.localLists.forEach(function (item, index) {
      if (state.archivedListIds.indexOf(item.id) !== -1) return;
      if ((item.userId || userId) !== userId) return;
      if (listSignature(item, userId) === signature) existingIndex = index;
    });

    var record = {
      id: incomingId,
      userId: userId,
      name: values.name,
      niche: values.niche,
      businessType: values.businessType,
      city: values.city,
      country: values.country,
      description: values.description || "Saved search list in workspace.",
      status: values.status || "queued",
      lastRun: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      discovered: values.discovered || 0,
      audited: values.audited || 0,
      enriched: values.enriched || 0,
      qualified: values.qualified || 0,
      rejected: values.rejected || 0,
      minSeoScore: values.minSeoScore || 60,
      minLeadScore: values.minLeadScore || 70,
      webhookSyncStatus: values.webhookSyncStatus || "not_sent",
      archived: false,
      isRemote: false
    };

    if (existingIndex >= 0) {
      record = Object.assign({}, state.localLists[existingIndex], record, {
        id: state.localLists[existingIndex].id,
        discovered: state.localLists[existingIndex].discovered || record.discovered,
        audited: state.localLists[existingIndex].audited || record.audited,
        enriched: state.localLists[existingIndex].enriched || record.enriched,
        qualified: state.localLists[existingIndex].qualified || record.qualified,
        rejected: state.localLists[existingIndex].rejected || record.rejected
      });
      state.localLists.splice(existingIndex, 1);
    }

    state.localLists.unshift(record);
    state.activeListId = record.id;
    saveState(state);
    return { id: record.id, userId: userId, deduped: existingIndex >= 0 };
  }

  function updateListStatus(listId, nextStatus, extra) {
    var state = loadState();
    state.localLists = state.localLists.map(function (item) {
      if (item.id !== listId) return item;
      return Object.assign({}, item, extra || {}, {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    });
    saveState(state);
    renderFallback();
  }

  function saveWebhook(event) {
    if (event && event.preventDefault) event.preventDefault();
    var input = byId("webhookUrlInput");
    var value = ((input && input.value) || "").trim() || DEFAULT_SEARCH_WEBHOOK_URL;
    localStorage.setItem(WEBHOOK_STORAGE_KEY, value);
    if (input) input.value = value;
    status("webhookStatus", "Webhook saved.");
    return false;
  }

  function addDemo(event) {
    if (event && event.preventDefault) event.preventDefault();
    var created = addList({
      name: "Berlin Roofers - Expansion Batch",
      niche: "roof repair",
      businessType: "roofing company",
      city: "Berlin",
      country: "Germany",
      description: "Saved expansion list for local roof repair companies.",
      status: "completed",
      discovered: 27,
      audited: 18,
      enriched: 10,
      qualified: 4,
      rejected: 7,
      minSeoScore: 57,
      minLeadScore: 71
    });

    var state = loadState();
    var exists = state.localLeads.some(function (lead) {
      return lead.listId === created.id && lead.company === "NordDach Berlin";
    });

    if (!exists) {
      state.localLeads.push({
        id: "lead_" + Date.now(),
        listId: created.id,
        userId: created.userId,
        company: "NordDach Berlin",
        website: "https://norddach-berlin.de",
        decisionMaker: "Managing Director",
        role: "Managing Director",
        email: "info@norddach-berlin.de",
        phone: "+49 30 5554 8821",
        overallScore: 79,
        status: "qualified"
      });
      saveState(state);
    }

    renderFallback();
    status("dataStatus", created.deduped ? "Demo list already existed; refreshed" : "Demo list added");
    return false;
  }

  function submitCreate(event) {
    if (event && event.preventDefault) event.preventDefault();

    var payload = {
      search_id: "srch_" + Date.now(),
      user_id: currentUserId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "active",
      search_name: ((byId("searchNameInput") && byId("searchNameInput").value) || "").trim(),
      niche: ((byId("nicheInput") && byId("nicheInput").value) || "").trim(),
      business_type: ((byId("businessTypeInput") && byId("businessTypeInput").value) || "").trim(),
      city: ((byId("cityInput") && byId("cityInput").value) || "").trim(),
      country: ((byId("countryInput") && byId("countryInput").value) || "").trim(),
      primary_keyword: ((byId("nicheInput") && byId("nicheInput").value) || "").trim(),
      secondary_keywords: "",
      discovery_query_limit: "1",
      discovery_page_limit: "1",
      max_results_requested: "20",
      min_audit_score: String((byId("seoThresholdInput") && byId("seoThresholdInput").value) || 60),
      min_lead_score: String((byId("leadThresholdInput") && byId("leadThresholdInput").value) || 70),
      started_at: "",
      completed_at: "",
      failed_at: "",
      failure_reason: ""
    };

    if (!payload.search_name || !payload.niche || !payload.business_type || !payload.city || !payload.country) {
      status("createSearchStatus", "Please fill all required fields.");
      return false;
    }

    var created = addList({
      id: payload.search_id,
      name: payload.search_name,
      niche: payload.niche,
      businessType: payload.business_type,
      city: payload.city,
      country: payload.country,
      minSeoScore: Number(payload.min_audit_score),
      minLeadScore: Number(payload.min_lead_score),
      status: "pending_sync",
      webhookSyncStatus: "pending"
    });

    renderFallback();
    status("createSearchStatus", created.deduped ? "Existing list updated. Sending latest request to n8n..." : "List saved locally. Sending to n8n...");

    try {
      var webhook = ensureWebhook();
      var body = new URLSearchParams();
      Object.keys(payload).forEach(function (key) {
        body.set(key, payload[key] == null ? "" : String(payload[key]));
      });

      fetch(webhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString()
      }).then(function () {
        updateListStatus(created.id, "sent_to_n8n", {
          webhookSyncStatus: "sent",
          webhookLastAttemptAt: new Date().toISOString()
        });
        status("createSearchStatus", "List saved. Request sent to n8n; next sheet sync will confirm live results.");
      }).catch(function () {
        updateListStatus(created.id, "sync_failed", {
          webhookSyncStatus: "failed",
          webhookLastAttemptAt: new Date().toISOString()
        });
        status("createSearchStatus", "List saved locally, but webhook send failed. Check the webhook URL and retry.");
      });
    } catch (error) {
      updateListStatus(created.id, "sync_failed", {
        webhookSyncStatus: "failed",
        webhookLastAttemptAt: new Date().toISOString()
      });
      status("createSearchStatus", "List saved locally, but webhook send failed. Check the webhook URL and retry.");
    }

    return false;
  }

  function mergeRemoteData(remoteData) {
    var state = loadState();
    var userId = state.currentUserId;
    var archived = state.archivedListIds || [];
    var remoteLists = Array.isArray(remoteData.lists) ? remoteData.lists : [];
    var remoteLeads = Array.isArray(remoteData.leads) ? remoteData.leads : [];
    var byId = {};

    remoteLists.forEach(function (item) {
      if (!item || !item.id) return;
      if ((item.userId || userId) !== userId) return;
      if (archived.indexOf(item.id) !== -1) return;
      byId[item.id] = Object.assign({}, item, { isRemote: true });
    });

    state.localLists.forEach(function (item) {
      if (!item || !item.id) return;
      if ((item.userId || userId) !== userId) return;
      if (archived.indexOf(item.id) !== -1) return;
      if (item.isRemote && byId[item.id]) return;
      byId[item.id] = Object.assign({}, byId[item.id] || {}, item, {
        isRemote: Boolean(byId[item.id])
      });
    });

    state.localLists = Object.keys(byId).map(function (id) {
      return byId[id];
    }).sort(function (a, b) {
      return new Date(b.lastRun || b.updatedAt || 0) - new Date(a.lastRun || a.updatedAt || 0);
    });

    var localLeadKeys = {};
    var mergedLeads = [];

    remoteLeads.forEach(function (lead) {
      if ((lead.userId || userId) !== userId) return;
      var key = lead.id || [lead.listId, lead.company, lead.website].join("|");
      localLeadKeys[key] = true;
      mergedLeads.push(Object.assign({}, lead, { isRemote: true }));
    });

    state.localLeads.forEach(function (lead) {
      if ((lead.userId || userId) !== userId) return;
      var key = lead.id || [lead.listId, lead.company, lead.website].join("|");
      if (localLeadKeys[key]) return;
      mergedLeads.push(lead);
    });

    state.localLeads = mergedLeads;
    state.lastRemoteSyncAt = new Date().toISOString();
    saveState(state);
  }

  function sync(event) {
    if (event && event.preventDefault) event.preventDefault();
    status("dataStatus", "Syncing sheet snapshot...");

    fetch(SNAPSHOT_URL + "?ts=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error("Snapshot unavailable");
        return response.json();
      })
      .then(function (remoteData) {
        mergeRemoteData(remoteData || {});
        renderFallback();
        status("dataStatus", "Sheet snapshot synced");
        status("workspaceDataSource", (remoteData && remoteData.source) || "Sheet snapshot");
        status("workspaceLastSync", "Synced " + formatDate(new Date().toISOString()));
      })
      .catch(function () {
        renderFallback();
        status("dataStatus", "Local fallback active");
        status("workspaceLastSync", "Could not reach sheet snapshot; using local state.");
      });

    return false;
  }

  function bindControls() {
    var webhookInput = byId("webhookUrlInput");
    if (webhookInput) webhookInput.value = ensureWebhook();

    var bindings = [
      ["syncSheetsButton", sync],
      ["seedListsButton", addDemo],
      ["createListButton", submitCreate],
      ["quickCreateForm", submitCreate],
      ["saveWebhookButton", saveWebhook],
      ["webhookConfigForm", saveWebhook]
    ];

    bindings.forEach(function (pair) {
      var node = byId(pair[0]);
      if (!node) return;
      if (node.tagName === "FORM") {
        node.onsubmit = pair[1];
      } else {
        node.onclick = pair[1];
      }
    });

    window.rankforgeDashboardActions = {
      syncSheets: sync,
      addDemoList: addDemo,
      handleCreateListButtonClick: submitCreate,
      submitQuickCreateForm: submitCreate,
      saveWebhook: saveWebhook,
      renderFallback: renderFallback
    };

    renderFallback();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindControls);
  } else {
    bindControls();
  }
})();

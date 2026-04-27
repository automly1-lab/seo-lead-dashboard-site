(function () {
  "use strict";

  var APP_STORAGE_KEY = "rankforge-clean-app-state-v1";
  var APP_WEBHOOK_KEY = "rankforge-search-submit-webhook-v1";
  var FEEDBACK_WEBHOOK_KEY = "rankforge-lead-feedback-webhook-v1";
  var PAGE_NAME = document.body.dataset.page || "";

  var FEEDBACK_TYPES = [
    { key: "good_lead", label: "Good lead", tone: "good" },
    { key: "bad_lead", label: "Bad lead", tone: "bad" },
    { key: "wrong_niche", label: "Wrong niche" },
    { key: "wrong_location", label: "Wrong location" },
    { key: "bad_contact", label: "Bad contact" },
    { key: "weak_seo_opportunity", label: "Weak SEO" },
    { key: "duplicate", label: "Duplicate" },
    { key: "already_contacted", label: "Already contacted" }
  ];

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function getSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      return window.rankforgeAuth.getSession();
    }
    return safeParse(localStorage.getItem("rankforge-auth-session-v1"), null);
  }

  function getUserId() {
    var session = getSession();
    return String((session && session.userId) || localStorage.getItem("rankforge-current-user-id-v1") || "").trim();
  }

  function getUserEmail() {
    var session = getSession();
    return String((session && (session.email || session.userEmail)) || "").trim();
  }

  function getState() {
    return safeParse(localStorage.getItem(APP_STORAGE_KEY), {}) || {};
  }

  function allLeads() {
    var state = getState();
    var remote = state.remoteCache && Array.isArray(state.remoteCache.leads) ? state.remoteCache.leads : [];
    var local = Array.isArray(state.localLeads) ? state.localLeads : [];
    var byId = {};
    remote.concat(local).forEach(function (lead) {
      if (lead && lead.id) byId[String(lead.id)] = lead;
    });
    return byId;
  }

  function selectedLead() {
    var state = getState();
    var selectedId = String(state.selectedLeadId || "").trim();
    var map = allLeads();
    if (selectedId && map[selectedId]) return map[selectedId];
    var keys = Object.keys(map);
    return keys.length ? map[keys[0]] : null;
  }

  function getSearchWebhook() {
    return String(localStorage.getItem(APP_WEBHOOK_KEY) || "").trim();
  }

  function defaultFeedbackWebhook() {
    var searchWebhook = getSearchWebhook();
    if (searchWebhook && searchWebhook.indexOf("rankforge-create-search") >= 0) {
      return searchWebhook.replace("rankforge-create-search", "rankforge-lead-feedback");
    }
    return "";
  }

  function getFeedbackWebhook() {
    return String(localStorage.getItem(FEEDBACK_WEBHOOK_KEY) || "").trim() || defaultFeedbackWebhook();
  }

  function setStatus(node, text, tone) {
    if (!node) return;
    node.textContent = text || "";
    node.classList.remove("is-success", "is-error", "is-saving");
    if (tone === "success") node.classList.add("is-success");
    if (tone === "error") node.classList.add("is-error");
    if (tone === "saving") node.classList.add("is-saving");
  }

  function feedbackLabel(feedbackType) {
    var match = FEEDBACK_TYPES.find(function (type) { return type.key === feedbackType; });
    return match ? match.label : String(feedbackType || "Feedback").replace(/_/g, " ");
  }

  function successMessage(feedbackType, lead) {
    var label = feedbackLabel(feedbackType);
    var company = String((lead && lead.company) || "this lead").trim() || "this lead";
    if (feedbackType === "good_lead") {
      return "Feedback saved: " + label + ". This helps RankForge learn what a strong lead looks like for this search.";
    }
    if (feedbackType === "bad_contact") {
      return "Feedback saved: " + label + ". We’ll use this to improve contact filtering for " + company + " and similar leads.";
    }
    if (feedbackType === "wrong_niche" || feedbackType === "wrong_location") {
      return "Feedback saved: " + label + ". This helps tighten future search matching for this batch.";
    }
    if (feedbackType === "duplicate") {
      return "Feedback saved: " + label + ". This helps improve duplicate detection in future results.";
    }
    if (feedbackType === "already_contacted") {
      return "Feedback saved: " + label + ". This will help keep review and outreach context cleaner.";
    }
    if (feedbackType === "weak_seo_opportunity") {
      return "Feedback saved: " + label + ". This helps improve SEO opportunity scoring for similar businesses.";
    }
    return "Feedback saved: " + label + ". This will help improve future lead filtering for this search.";
  }

  function basePayload(lead, feedbackType, note) {
    var state = getState();
    var selectedListId = String((lead && lead.listId) || state.selectedListId || "").trim();
    return {
      feedback_id: "fb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      user_id: getUserId(),
      user_email: getUserEmail(),
      lead_id: String((lead && lead.id) || "").trim(),
      search_id: selectedListId,
      company_name: String((lead && lead.company) || "").trim(),
      website_url: String((lead && lead.website) || "").trim(),
      feedback_type: feedbackType,
      feedback_note: note || "",
      page: PAGE_NAME,
      created_at: new Date().toISOString()
    };
  }

  async function submitFeedback(lead, feedbackType, note, statusNode) {
    var webhook = getFeedbackWebhook();
    if (!webhook) {
      setStatus(statusNode, "Feedback webhook is not configured yet.", "error");
      return;
    }
    if (!getUserId()) {
      setStatus(statusNode, "Please sign in before sending feedback.", "error");
      return;
    }
    var payload = basePayload(lead, feedbackType, note || "", statusNode);
    setStatus(statusNode, "Saving feedback: " + feedbackLabel(feedbackType) + "...", "saving");
    try {
      var body = new URLSearchParams();
      Object.keys(payload).forEach(function (key) { body.set(key, payload[key] == null ? "" : String(payload[key])); });
      await fetch(webhook, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: body.toString()
      });
      setStatus(statusNode, successMessage(feedbackType, lead), "success");
    } catch (error) {
      setStatus(statusNode, "Could not send feedback. Try again later.", "error");
    }
  }

  function makeButtons(lead, compact) {
    var wrap = document.createElement("div");
    wrap.className = compact ? "lead-row-feedback" : "lead-feedback-actions";
    var status = document.createElement("p");
    status.className = "lead-feedback-status";

    FEEDBACK_TYPES.forEach(function (type) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lead-feedback-btn" + (type.tone === "good" ? " is-good" : "") + (type.tone === "bad" ? " is-bad" : "");
      btn.textContent = type.label;
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        var note = "";
        if (!compact && ["bad_lead", "wrong_niche", "wrong_location", "bad_contact", "weak_seo_opportunity"].indexOf(type.key) >= 0) {
          note = window.prompt("Optional note for this feedback:", "") || "";
        }
        submitFeedback(lead, type.key, note, status);
      });
      wrap.appendChild(btn);
    });

    return { buttons: wrap, status: status };
  }

  function installDetailFeedback() {
    if (PAGE_NAME !== "lead-detail") return;
    if (document.querySelector(".lead-feedback-panel")) return;
    var lead = selectedLead();
    if (!lead) return;
    var target = document.querySelector(".detail-hero-panel") || document.querySelector(".panel");
    if (!target || !target.parentNode) return;
    var panel = document.createElement("section");
    panel.className = "lead-feedback-panel";
    panel.innerHTML = '<p class="lead-feedback-title">Lead quality feedback</p><p class="lead-feedback-help">Mark what looks right or wrong. Feedback is saved to improve future filtering and review quality.</p>';
    var controls = makeButtons(lead, false);
    panel.appendChild(controls.buttons);
    panel.appendChild(controls.status);
    target.parentNode.insertBefore(panel, target.nextSibling);
  }

  function installListFeedback() {
    if (PAGE_NAME !== "leads") return;
    var map = allLeads();
    document.querySelectorAll("#leadsTable tbody tr[data-lead-id]").forEach(function (row) {
      if (row.dataset.feedbackInstalled === "true") return;
      var leadId = row.dataset.leadId;
      var lead = map[leadId];
      if (!lead) return;
      var lastCell = row.querySelector("td:last-child");
      if (!lastCell) return;
      var controls = makeButtons(lead, true);
      lastCell.appendChild(controls.buttons);
      lastCell.appendChild(controls.status);
      row.dataset.feedbackInstalled = "true";
    });
  }

  function install() {
    installDetailFeedback();
    installListFeedback();
  }

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(install, 600);
    setTimeout(install, 1800);
  });
  window.addEventListener("focus", function () { setTimeout(install, 500); });
  document.addEventListener("click", function () { setTimeout(install, 400); }, true);

  window.rankforgeLeadFeedback = {
    install: install,
    getFeedbackWebhook: getFeedbackWebhook
  };
})();

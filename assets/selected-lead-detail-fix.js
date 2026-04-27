/* RankForge selected lead persistence + lead detail sidebar fix */
(function () {
  const STATE_KEY = "rankforge-clean-app-state-v1";
  const SELECTED_LEAD_KEY = "rankforge-selected-lead-id-v1";
  const SELECTED_LIST_KEY = "rankforge-selected-list-id-v1";
  const PAGE = document.body?.dataset?.page || "";

  function parse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; }
  }

  function norm(value) {
    return String(value || "").trim();
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function numberValue(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function getSessionUserId() {
    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
        const session = window.rankforgeAuth.getSession();
        if (session && session.userId) return norm(session.userId);
      }
    } catch (_) {}
    const stored = parse(localStorage.getItem("rankforge-auth-session-v1"), null);
    return norm(stored && stored.userId);
  }

  function loadState() {
    const state = parse(localStorage.getItem(STATE_KEY), {});
    if (!Array.isArray(state.localLists)) state.localLists = [];
    if (!Array.isArray(state.localLeads)) state.localLeads = [];
    if (!state.remoteCache || typeof state.remoteCache !== "object") state.remoteCache = { lists: [], leads: [] };
    if (!Array.isArray(state.remoteCache.lists)) state.remoteCache.lists = [];
    if (!Array.isArray(state.remoteCache.leads)) state.remoteCache.leads = [];
    return state;
  }

  function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function userIdOf(item) {
    return norm(item && (item.userId || item.user_id));
  }

  function currentUserId(state) {
    return getSessionUserId() || norm(state.currentUserId);
  }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
      const key = norm(keyFn(item));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  function getLists(state) {
    const uid = currentUserId(state);
    return uniqueBy([...(state.remoteCache.lists || []), ...(state.localLists || [])], x => x.id)
      .filter(x => !uid || userIdOf(x) === uid)
      .filter(x => !(state.archivedListIds || []).includes(x.id))
      .filter(x => !(state.deletedListIds || []).includes(x.id));
  }

  function getLeads(state, listId) {
    const uid = currentUserId(state);
    return uniqueBy([...(state.remoteCache.leads || []), ...(state.localLeads || [])], x => x.id)
      .filter(x => !uid || userIdOf(x) === uid)
      .filter(x => !listId || norm(x.listId) === norm(listId))
      .filter(x => x.email || x.phone || x.decision_maker_email || x.decision_maker_phone);
  }

  function selectedIds(state) {
    const storedLead = norm(sessionStorage.getItem(SELECTED_LEAD_KEY) || localStorage.getItem(SELECTED_LEAD_KEY));
    const storedList = norm(sessionStorage.getItem(SELECTED_LIST_KEY) || localStorage.getItem(SELECTED_LIST_KEY));
    return {
      listId: storedList || norm(state.selectedListId),
      leadId: storedLead || norm(state.selectedLeadId),
    };
  }

  function persistSelected(listId, leadId) {
    const state = loadState();
    if (listId) {
      state.selectedListId = listId;
      localStorage.setItem(SELECTED_LIST_KEY, listId);
      sessionStorage.setItem(SELECTED_LIST_KEY, listId);
    }
    if (leadId) {
      state.selectedLeadId = leadId;
      localStorage.setItem(SELECTED_LEAD_KEY, leadId);
      sessionStorage.setItem(SELECTED_LEAD_KEY, leadId);
    }
    saveState(state);
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value == null || value === "" ? "-" : String(value);
  }

  function setHtml(selector, html) {
    const node = document.querySelector(selector);
    if (node) node.innerHTML = html;
  }

  function leadField(lead, ...keys) {
    for (const key of keys) {
      if (lead && lead[key] != null && String(lead[key]).trim() !== "") return lead[key];
    }
    return "";
  }

  function applyLeadDetail(lead, list) {
    if (!lead) return;

    const company = leadField(lead, "company", "company_name") || "Unknown company";
    const website = leadField(lead, "website", "website_url") || "";
    const email = leadField(lead, "email", "decision_maker_email") || "";
    const phone = leadField(lead, "phone", "decision_maker_phone") || "";

    setText("detailCompany", company);
    setText("detailStatus", leadField(lead, "status", "qualification_status") || "review_needed");

    const websiteNode = document.getElementById("detailWebsite");
    if (websiteNode) {
      websiteNode.textContent = website ? String(website).replace(/^https?:\/\//, "") : "-";
      websiteNode.href = website || "#";
    }

    setText("detailLocation", list ? [list.city, list.country].filter(Boolean).join(", ") : "-");
    setText("detailPrimaryProblem", leadField(lead, "primaryProblem", "primary_problem") || "Not set");
    setText("detailOffer", leadField(lead, "recommendedOffer", "recommended_offer") || "Not set");
    setText("detailReason", leadField(lead, "whyItMatters", "qualification_reason") || "No qualification reason yet.");
    setText("detailAngle", leadField(lead, "outreachAngle", "outreach_angle") || "No outreach angle yet.");
    setText("detailValue", leadField(lead, "valueHypothesis", "client_value_hypothesis") || "No value hypothesis yet.");
    setText("detailPersonalization", leadField(lead, "firstLine", "first_line_personalization") || "No personalization yet.");

    setText("detailSeoScore", numberValue(leadField(lead, "seoScore", "seo_need_score")));
    setText("detailOverallScore", numberValue(leadField(lead, "overallScore", "overall_lead_score")));
    setText("detailCommercialFit", numberValue(leadField(lead, "commercialFit", "commercial_fit_score")));
    setText("detailContactConfidence", numberValue(leadField(lead, "contactConfidence", "contact_confidence_score")));

    setText("detailOutreachReadiness", "Outreach: " + titleCase(leadField(lead, "outreachReadiness", "outreach_readiness") || "needs_review"));
    setText("detailPaidAds", "Paid ads: " + (lead.paidAdsDetected || String(lead.paid_ads_detected || "").toLowerCase() === "true" ? "detected" : "not detected"));
    setText("detailSecondaryProblem", leadField(lead, "secondaryProblem", "secondary_problem") || "Secondary issue not set");

    const decisionMaker = leadField(lead, "decisionMaker", "decision_maker_name");
    const role = leadField(lead, "role", "decision_maker_role");

    setText("detailDecisionMaker", decisionMaker || (email || phone ? "Business contact available" : "No named contact yet"));
    setText("detailDecisionRole", role || "No named decision maker found yet");

    const contactHtml = `
      <span class="detail-contact-line"><strong>Email</strong><span>${email || "Not found"}</span></span>
      <span class="detail-contact-line"><strong>Phone</strong><span>${phone || "Not found"}</span></span>
    `;
    const contactNode = document.getElementById("detailContactLine");
    if (contactNode) contactNode.innerHTML = contactHtml;

    setText("detailContactChannel", leadField(lead, "recommendedChannel", "recommended_channel")
      ? "Recommended channel: " + titleCase(leadField(lead, "recommendedChannel", "recommended_channel"))
      : (email ? "Recommended channel: Email" : (phone ? "Recommended channel: Phone" : "Recommended channel not set")));

    setText("detailNextAction", email || phone ? "Reach out with the selected SEO angle." : "Prioritize manual contact enrichment first.");
    setText("detailRiskNote", email || phone ? "Main risk is moderate; focus on message quality and offer fit." : "Main risk: contact path is still weak.");

    setHtml("#detailSignalList", `
      <li>${leadField(lead, "primaryProblem", "primary_problem") || "Review SEO weakness signals."}</li>
      <li>${leadField(lead, "secondaryProblem", "secondary_problem") || "Review secondary issues."}</li>
      <li>${lead.paidAdsDetected || String(lead.paid_ads_detected || "").toLowerCase() === "true" ? "Paid ads budget signal detected." : "No paid ads signal detected."}</li>
    `);

    setHtml("#detailPlaybookList", `
      <li>${leadField(lead, "outreachAngle", "outreach_angle") || "Define an outreach angle."}</li>
      <li>${leadField(lead, "recommendedOffer", "recommended_offer") || "Choose the right offer."}</li>
      <li>${leadField(lead, "firstLine", "first_line_personalization") || "Prepare a first-line personalization."}</li>
    `);
  }

  function installLeadsClickCapture() {
    if (PAGE !== "leads" && PAGE !== "dashboard") return;

    document.addEventListener("click", function (event) {
      const row = event.target.closest("#leadsTable tbody tr[data-lead-id]");
      if (!row) return;

      const state = loadState();
      const selectedListId = norm(state.selectedListId);
      const leadId = norm(row.dataset.leadId);

      persistSelected(selectedListId, leadId);
    }, true);
  }

  function renderLeadSideList(leads, selectedLeadId, selectedListId) {
    if (PAGE !== "lead-detail") return;
    if (!leads.length) return;
    if (document.querySelector(".rf-detail-lead-sidebar")) return;

    const sideHost =
      document.querySelector(".panel.panel-compact .detail-side-stack") ||
      document.querySelector(".panel.panel-compact") ||
      document.querySelector(".detail-grid > article:last-child");

    if (!sideHost) return;

    const box = document.createElement("div");
    box.className = "rf-detail-lead-sidebar";
    box.innerHTML = `
      <div class="rf-detail-lead-sidebar-head">
        <span class="workspace-label">Other leads</span>
        <strong>Switch lead</strong>
        <small>Open another lead from this selected list.</small>
      </div>
      <div class="rf-detail-lead-list"></div>
    `;

    const listNode = box.querySelector(".rf-detail-lead-list");
    leads.slice(0, 18).forEach((lead) => {
      const id = norm(lead.id || lead.lead_id);
      const company = leadField(lead, "company", "company_name") || "Unknown company";
      const score = numberValue(leadField(lead, "overallScore", "overall_lead_score"));
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rf-detail-lead-item" + (id === selectedLeadId ? " is-active" : "");
      button.innerHTML = `<strong>${company}</strong><span>Score ${score || 0}</span>`;
      button.addEventListener("click", function () {
        persistSelected(selectedListId, id);
        window.location.reload();
      });
      listNode.appendChild(button);
    });

    sideHost.insertAdjacentElement("afterbegin", box);
  }

  function fixLeadDetailSelection() {
    if (PAGE !== "lead-detail") return;

    const state = loadState();
    const lists = getLists(state);
    const ids = selectedIds(state);
    const selectedListId = ids.listId || (lists[0] && lists[0].id) || "";
    const selectedList = lists.find(l => norm(l.id) === norm(selectedListId)) || lists[0] || null;
    const leads = getLeads(state, selectedListId || (selectedList && selectedList.id));
    const selectedLeadId = ids.leadId || (leads[0] && leads[0].id) || "";
    const selectedLead = leads.find(lead => norm(lead.id || lead.lead_id) === norm(selectedLeadId)) || leads[0];

    if (selectedList) persistSelected(selectedList.id, selectedLead ? (selectedLead.id || selectedLead.lead_id) : "");
    if (selectedLead) {
      applyLeadDetail(selectedLead, selectedList);
      renderLeadSideList(leads, norm(selectedLead.id || selectedLead.lead_id), selectedList ? selectedList.id : "");
    }
  }

  function init() {
    installLeadsClickCapture();
    // App.js sometimes renders after this script. Retry safely.
    let tries = 0;
    const run = () => {
      tries += 1;
      fixLeadDetailSelection();
      if (tries < 8) setTimeout(run, 500);
    };
    run();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

const STORAGE_KEY = "rankforge-dashboard-state-v3";
const WEBHOOK_STORAGE_KEY = "rankforge-search-submit-webhook-v1";
const CURRENT_USER_STORAGE_KEY = "rankforge-current-user-id-v1";
const DEFAULT_SEARCH_WEBHOOK_URL = "https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search";
const SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
const DASHBOARD_SHEET_TABS = ["searches", "raw_prospects", "seo_audits", "contacts", "final_leads"];
const DASHBOARD_API_URL = "/api/dashboard-data";
const STATIC_DATA_URL = "/data/dashboard-data.json";

const seededState = {
  lists: [
    {
      id: "list_london_dentists",
      name: "London Dentists - Priority Opportunities",
      niche: "dentist",
      businessType: "dental clinic",
      city: "London",
      country: "United Kingdom",
      description: "Dental clinics with visible local SEO gaps, active websites, and usable contact paths.",
      status: "running",
      lastRun: "2026-04-24T10:14:00+03:00",
      discovered: 48,
      audited: 31,
      enriched: 18,
      qualified: 9,
      rejected: 13,
      minSeoScore: 60,
      minLeadScore: 70,
      archived: false,
    },
    {
      id: "list_miami_restoration",
      name: "Miami Restoration Companies",
      niche: "home restoration",
      businessType: "restoration contractor",
      city: "Miami",
      country: "United States",
      description: "Emergency and water-damage businesses where SEO improvements can reduce dependency on paid acquisition.",
      status: "completed",
      lastRun: "2026-04-23T18:05:00+03:00",
      discovered: 42,
      audited: 28,
      enriched: 14,
      qualified: 7,
      rejected: 12,
      minSeoScore: 58,
      minLeadScore: 72,
      archived: false,
    },
    {
      id: "list_chicago_injury",
      name: "Chicago PI Lawyers",
      niche: "personal injury lawyer",
      businessType: "law firm",
      city: "Chicago",
      country: "United States",
      description: "High-value inbound businesses where local SEO and paid search mix can justify premium outreach.",
      status: "reviewing",
      lastRun: "2026-04-22T16:40:00+03:00",
      discovered: 36,
      audited: 24,
      enriched: 11,
      qualified: 5,
      rejected: 10,
      minSeoScore: 65,
      minLeadScore: 75,
      archived: false,
    },
  ],
  leads: [
    {
      id: "lead_001",
      listId: "list_london_dentists",
      company: "Dental Smiles London | Euston Practice",
      website: "https://www.dentalsmileslondon.co.uk/",
      decisionMaker: "Practice Manager",
      role: "Practice Manager",
      email: "hello@dentalsmileslondon.co.uk",
      phone: "+44 20 3757 5272",
      seoScore: 78,
      overallScore: 82,
      commercialFit: 76,
      contactConfidence: 71,
      status: "qualified",
      outreachReadiness: "ready",
      paidAdsDetected: true,
      primaryProblem: "Weak local SEO execution",
      secondaryProblem: "Paid ads without strong SEO foundation",
      whyItMatters: "The practice appears commercially viable, uses strong service intent, and still has thin treatment depth that limits organic capture.",
      outreachAngle: "Lead with missed treatment-page coverage and local landing-page expansion.",
      valueHypothesis: "Improving treatment pages and internal linking should convert existing demand into lower-cost organic bookings.",
      firstLine: "Noticed the Euston practice has strong intent terms in play but limited treatment-page depth for local rankings.",
      recommendedOffer: "Local SEO audit",
      recommendedChannel: "email",
    },
    {
      id: "lead_002",
      listId: "list_london_dentists",
      company: "London Dental Centre",
      website: "http://www.thelondondentalcentre.co.uk/",
      decisionMaker: null,
      role: null,
      email: null,
      phone: "+44 20 3667 7070",
      seoScore: 74,
      overallScore: 68,
      commercialFit: 70,
      contactConfidence: 44,
      status: "review_needed",
      outreachReadiness: "needs_review",
      paidAdsDetected: false,
      primaryProblem: "Weak service page coverage",
      secondaryProblem: "Limited contact coverage",
      whyItMatters: "Good market fit and clear SEO need, but still needs stronger contact resolution before outreach is ready.",
      outreachAngle: "Position as a service-page rebuild plus metadata cleanup opportunity.",
      valueHypothesis: "A stronger service architecture would help the clinic rank for more treatment-intent keywords.",
      firstLine: "Saw a solid clinic footprint but thin service targeting that likely limits visibility for specific treatment searches.",
      recommendedOffer: "Service page rebuild",
      recommendedChannel: "phone",
    },
  ],
  activeListId: "list_london_dentists",
};

function cloneSeededState() {
  return JSON.parse(JSON.stringify(seededState));
}

function createDefaultUiState() {
  return {
    activeListId: seededState.activeListId,
    archivedListIds: [],
    localLists: [],
    localLeads: [],
    lastSyncAt: null,
    syncMode: "demo",
    currentUserId: "usr_mvp",
  };
}

function loadUiState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createDefaultUiState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return { ...createDefaultUiState(), ...JSON.parse(raw) };
  } catch {
    const fallback = createDefaultUiState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function saveUiState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(uiState));
}

function loadWebhookUrl() {
  try {
    return localStorage.getItem(WEBHOOK_STORAGE_KEY) || DEFAULT_SEARCH_WEBHOOK_URL;
  } catch {
    return DEFAULT_SEARCH_WEBHOOK_URL;
  }
}

function saveWebhookUrl(url) {
  localStorage.setItem(WEBHOOK_STORAGE_KEY, url);
}

function loadCurrentUserId() {
  try {
    return localStorage.getItem(CURRENT_USER_STORAGE_KEY) || "usr_mvp";
  } catch {
    return "usr_mvp";
  }
}

function saveCurrentUserId(userId) {
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, userId);
}

function buildDemoRuntimeData() {
  const cloned = cloneSeededState();
  cloned.lists = cloned.lists.map((list) => ({ ...list, userId: "usr_demo" }));
  cloned.leads = cloned.leads.map((lead) => ({ ...lead, userId: "usr_demo" }));
  return {
    lists: cloned.lists,
    leads: cloned.leads,
    source: "demo",
  };
}

function mergeRuntimeData(remoteData) {
  const baseData = remoteData?.lists?.length ? remoteData : buildDemoRuntimeData();
  const archived = new Set(uiState.archivedListIds || []);
  const currentUserId = uiState.currentUserId || loadCurrentUserId();
  const lists = [...(uiState.localLists || []), ...baseData.lists].filter((list) => !archived.has(list.id) && (list.userId || currentUserId) === currentUserId);
  const leads = [...(uiState.localLeads || []), ...baseData.leads].filter((lead) => !archived.has(lead.listId) && (lead.userId || currentUserId) === currentUserId);

  runtimeData = {
    lists,
    leads,
    source: baseData.source || "demo",
  };

  if (!lists.find((list) => list.id === uiState.activeListId)) {
    uiState.activeListId = lists[0]?.id || null;
    saveUiState();
  }
}

function updateDataStatus(message) {
  const node = document.getElementById("dataStatus");
  if (node) node.textContent = message;
}

function updateMessageNode(id, message, tone = "") {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.classList.remove("is-success", "is-error");
  if (tone === "success") node.classList.add("is-success");
  if (tone === "error") node.classList.add("is-error");
}

function hydrateCurrentUserUi() {
  const currentUserId = uiState.currentUserId || loadCurrentUserId();
  const input = document.getElementById("currentUserIdInput");
  if (input) input.value = currentUserId;
  updateMessageNode("currentUserStatus", `Current workspace user: ${currentUserId}`, "success");
}

async function syncFromApi() {
  updateDataStatus("Syncing live data...");
  try {
    const liveRuntime = await syncFromSheets();
    uiState.lastSyncAt = new Date().toISOString();
    uiState.syncMode = "sheets";
    saveUiState();
    mergeRuntimeData(liveRuntime);
    render();
    updateDataStatus(`Live Sheets synced - ${formatRunDate(uiState.lastSyncAt)}`);
    return;
  } catch {
    // Fall back to API/static JSON.
  }

  try {
    const response = await fetch(DASHBOARD_API_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`dashboard-api ${response.status}`);
    }
    const runtime = await response.json();
    uiState.lastSyncAt = new Date().toISOString();
    uiState.syncMode = "api";
    saveUiState();
    mergeRuntimeData(runtime);
    render();
    updateDataStatus(`Live API synced - ${formatRunDate(uiState.lastSyncAt)}`);
  } catch {
    try {
      const staticResponse = await fetch(STATIC_DATA_URL, {
        headers: { Accept: "application/json" },
      });
      if (!staticResponse.ok) {
        throw new Error(`static-data ${staticResponse.status}`);
      }
      const staticRuntime = await staticResponse.json();
      mergeRuntimeData(staticRuntime);
      render();
      updateDataStatus("Static dashboard data");
    } catch {
      mergeRuntimeData(buildDemoRuntimeData());
      render();
      updateDataStatus("Demo data (API unavailable)");
    }
  }
}

function formatRunDate(iso) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

async function fetchSheetRows(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const response = await fetch(url, {
    headers: { Accept: "text/plain, application/json, */*" },
  });
  if (!response.ok) throw new Error(`sheet-${sheetName} ${response.status}`);
  const payload = await response.text();
  const cleaned = payload.replace(/^[\s\S]*?setResponse\(/, "").replace(/\);\s*$/, "");
  const parsed = JSON.parse(cleaned);
  const cols = (parsed.table?.cols || []).map((col) => col.label || col.id);
  return (parsed.table?.rows || []).map((row) => {
    const record = {};
    const cells = row.c || [];
    cols.forEach((key, index) => {
      const cell = cells[index];
      record[key] = !cell ? "" : cell.f || cell.v || "";
    });
    return record;
  });
}

function buildRuntimeFromSheets(sheetData) {
  const searches = sheetData.searches || [];
  const rawProspects = sheetData.raw_prospects || [];
  const seoAudits = sheetData.seo_audits || [];
  const contacts = sheetData.contacts || [];
  const finalLeads = sheetData.final_leads || [];

  const prospectsById = Object.fromEntries(rawProspects.filter((row) => row.prospect_id).map((row) => [row.prospect_id, row]));
  const contactByProspect = {};
  for (const contact of contacts) {
    const prospectId = contact.prospect_id;
    if (!prospectId) continue;
    const current = contactByProspect[prospectId];
    if (!current || safeNumber(contact.contact_confidence_score) > safeNumber(current.contact_confidence_score)) {
      contactByProspect[prospectId] = contact;
    }
  }

  const auditsById = Object.fromEntries(seoAudits.filter((row) => row.audit_id).map((row) => [row.audit_id, row]));
  const contactsById = Object.fromEntries(contacts.filter((row) => row.contact_id).map((row) => [row.contact_id, row]));
  const leads = [];
  const seenLeadKeys = new Set();

  function resolveSearchId({ lead = {}, audit = {}, prospect = {}, contact = {} }) {
    return lead.search_id || audit.search_id || prospect.search_id || contact.search_id || "";
  }

  function pushLead(candidate) {
    const key = candidate.id || `${candidate.listId}|${candidate.company}|${candidate.website}`;
    if (!candidate.listId || seenLeadKeys.has(key)) return;
    seenLeadKeys.add(key);
    leads.push(candidate);
  }

  for (let index = 0; index < finalLeads.length; index += 1) {
    const lead = finalLeads[index];
    const audit = auditsById[lead.audit_id] || {};
    const prospect = prospectsById[lead.prospect_id] || {};
    const contact = contactsById[lead.primary_contact_id] || contactByProspect[lead.prospect_id] || {};
    const listId = resolveSearchId({ lead, audit, prospect, contact });
    pushLead({
      id: lead.lead_id || `remote_lead_${index + 1}`,
      listId,
      userId: lead.user_id || audit.user_id || prospect.user_id || contact.user_id || "usr_mvp",
      company: lead.company_name || audit.company_name || prospect.company_name || "Unknown company",
      website: lead.website_url || audit.website_url || prospect.website_url || "",
      decisionMaker: lead.decision_maker_name || contact.contact_name || null,
      role: lead.decision_maker_role || contact.contact_role || null,
      email: lead.decision_maker_email || contact.email || null,
      phone: lead.decision_maker_phone || contact.phone || null,
      seoScore: safeNumber(lead.seo_need_score || audit.seo_need_score),
      overallScore: safeNumber(lead.overall_lead_score || lead.seo_need_score || audit.seo_need_score),
      commercialFit: safeNumber(lead.commercial_fit_score || audit.commercial_fit_score),
      contactConfidence: safeNumber(lead.contact_confidence_score || contact.contact_confidence_score),
      status: lead.qualification_status || lead.status || "review_needed",
      outreachReadiness: lead.outreach_readiness || (contact.email || contact.phone ? "ready" : "needs_review"),
      paidAdsDetected: String(lead.paid_ads_detected || audit.paid_ads_detected || "").toLowerCase() === "true",
      primaryProblem: lead.primary_problem || "",
      secondaryProblem: lead.secondary_problem || "",
      whyItMatters: lead.qualification_reason || audit.audit_summary || "",
      outreachAngle: lead.outreach_angle || audit.recommended_outreach_angle || "",
      valueHypothesis: lead.client_value_hypothesis || "",
      firstLine: lead.first_line_personalization || "",
      recommendedOffer: lead.recommended_offer || "",
      recommendedChannel: lead.recommended_channel || "",
    });
  }

  for (let index = 0; index < seoAudits.length; index += 1) {
    const audit = seoAudits[index];
    const prospect = prospectsById[audit.prospect_id] || {};
    const contact = contactByProspect[audit.prospect_id] || {};
    const listId = resolveSearchId({ audit, prospect, contact });
    const seoScore = safeNumber(audit.seo_need_score);
    const contactConfidence = safeNumber(contact.contact_confidence_score);
    const overallScore = Math.round((seoScore * 0.7) + (safeNumber(audit.commercial_fit_score) * 0.2) + (contactConfidence * 0.1));
    pushLead({
      id: `audit_${audit.audit_id || index + 1}`,
      listId,
      userId: audit.user_id || prospect.user_id || contact.user_id || "usr_mvp",
      company: audit.company_name || prospect.company_name || "Unknown company",
      website: audit.website_url || prospect.website_url || "",
      decisionMaker: contact.contact_name || null,
      role: contact.contact_role || null,
      email: contact.email || null,
      phone: contact.phone || null,
      seoScore,
      overallScore,
      commercialFit: safeNumber(audit.commercial_fit_score),
      contactConfidence,
      status: seoScore >= safeNumber(audit.min_lead_score || 70) ? "review_needed" : "rejected",
      outreachReadiness: contact.email || contact.phone ? "ready" : "needs_review",
      paidAdsDetected: String(audit.paid_ads_detected || "").toLowerCase() === "true",
      primaryProblem: "",
      secondaryProblem: "",
      whyItMatters: audit.audit_summary || "",
      outreachAngle: audit.recommended_outreach_angle || "",
      valueHypothesis: "",
      firstLine: "",
      recommendedOffer: "",
      recommendedChannel: contact.email ? "email" : contact.phone ? "phone" : "",
    });
  }

  const lists = searches.map((search) => {
    const searchId = search.search_id;
    const searchProspects = rawProspects.filter((row) => row.search_id === searchId);
    const searchAudits = seoAudits.filter((row) => row.search_id === searchId && row.status === "completed");
    const searchContacts = contacts.filter((row) => row.search_id === searchId && row.status !== "pending");
    const searchLeads = leads.filter((row) => row.listId === searchId);
    return {
      id: searchId,
      userId: search.user_id || "usr_mvp",
      name: search.search_name || `${titleCase(search.niche)} - ${search.city}`,
      niche: search.niche || "",
      businessType: search.business_type || "",
      city: search.city || "",
      country: search.country || "",
      description: `${titleCase(search.niche)} opportunities for ${search.city}, kept as a persistent saved list.`,
      status: search.status || "draft",
      lastRun: search.completed_at || search.started_at || search.updated_at || search.created_at || "",
      discovered: searchProspects.length,
      audited: searchAudits.length,
      enriched: searchContacts.length,
      qualified: searchLeads.filter((lead) => (lead.qualification_status || lead.status) === "qualified").length,
      rejected: searchLeads.filter((lead) => (lead.qualification_status || lead.status) === "rejected").length,
      minSeoScore: safeNumber(search.min_audit_score || 55),
      minLeadScore: safeNumber(search.min_lead_score || 70),
      archived: false,
    };
  });

  return {
    lists,
    leads,
    source: "google-sheets-live",
  };
}

async function syncFromSheets() {
  const results = await Promise.all(
    DASHBOARD_SHEET_TABS.map(async (tab) => [tab, await fetchSheetRows(tab)]),
  );
  return buildRuntimeFromSheets(Object.fromEntries(results));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function createSearchRecordId(name, city) {
  return `srch_${slugify(name)}_${slugify(city)}_${Date.now()}`;
}

function buildSearchPayload(formValues) {
  const createdAt = new Date().toISOString();
  const primaryKeyword = `${formValues.niche} ${formValues.city}`.trim();
  return {
    search_id: createSearchRecordId(formValues.name, formValues.city),
    user_id: uiState.currentUserId || loadCurrentUserId(),
    created_at: createdAt,
    updated_at: createdAt,
    status: "active",
    search_name: formValues.name,
    niche: formValues.niche,
    business_type: formValues.businessType,
    city: formValues.city,
    country: formValues.country,
    primary_keyword: primaryKeyword,
    secondary_keywords: "",
    discovery_query_limit: 1,
    discovery_page_limit: 1,
    max_results_requested: 20,
    min_audit_score: formValues.minSeoScore,
    min_lead_score: formValues.minLeadScore,
    started_at: "",
    completed_at: "",
    failed_at: "",
    failure_reason: "",
  };
}

async function submitSearchToWebhook(searchPayload) {
  const webhookUrl = loadWebhookUrl().trim();
  if (!webhookUrl) {
    updateMessageNode(
      "createSearchStatus",
      "Liste kaydedildi ama henuz n8n webhook bagli degil. Webhook URL eklenince yeni listeler canli pipeline'a da gider.",
      "error",
    );
    return { ok: false, reason: "missing_webhook" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
      Accept: "application/json, text/plain, */*",
    },
    body: JSON.stringify(searchPayload),
  });

  if (!response.ok) {
    throw new Error(`submit-search ${response.status}`);
  }

  updateMessageNode(
    "createSearchStatus",
    "Liste dashboard'a kaydedildi ve n8n workflow'una gonderildi. Birazdan sync edince searches tab'inda gorunmeli.",
    "success",
  );

  return { ok: true };
}

function hydrateWebhookUi() {
  const webhookUrl = loadWebhookUrl();
  const input = document.getElementById("webhookUrlInput");
  if (input) input.value = webhookUrl;
  if (webhookUrl) {
    updateMessageNode("webhookStatus", "Webhook bagli. Dashboard'dan olusturulan listeler n8n'e gonderilecek.", "success");
  } else {
    updateMessageNode("webhookStatus", "Webhook not connected yet.", "");
  }
}

function getVisibleLists() {
  return runtimeData.lists.filter((list) => !list.archived);
}

function getActiveList() {
  return getVisibleLists().find((list) => list.id === uiState.activeListId) || getVisibleLists()[0];
}

function getLeadsForActiveList() {
  const activeList = getActiveList();
  if (!activeList) return [];

  const statusFilter = document.getElementById("qualificationFilter").value;
  const scoreFilter = Number(document.getElementById("scoreFilter").value || 0);
  const contactReadyOnly = document.getElementById("contactReadyFilter").checked;
  const paidAdsOnly = document.getElementById("paidAdsFilter").checked;

  return runtimeData.leads.filter((lead) => {
    if (lead.listId !== activeList.id) return false;
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (lead.overallScore < scoreFilter) return false;
    if (contactReadyOnly && !lead.email && !lead.phone) return false;
    if (paidAdsOnly && !lead.paidAdsDetected) return false;
    return true;
  });
}

function updateHero() {
  const activeList = getActiveList();
  if (!activeList) return;
  document.getElementById("activeListName").textContent = activeList.name;
  document.getElementById("activeListStatus").textContent = activeList.status;
  document.getElementById("activeListDescription").textContent = activeList.description;
  document.getElementById("activeListMarket").textContent = `${titleCase(activeList.niche)} - ${activeList.city} - ${activeList.country}`;
  document.getElementById("activeListRun").textContent = formatRunDate(activeList.lastRun);
  document.getElementById("pipelineListTitle").textContent = `${activeList.name} funnel`;
}

function updateMetrics() {
  const lists = getVisibleLists();
  const leads = runtimeData.leads.filter((lead) => lists.some((list) => list.id === lead.listId));
  const qualified = leads.filter((lead) => lead.status === "qualified");
  const reviewNeeded = leads.filter((lead) => lead.status === "review_needed");
  const averageScore = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.overallScore, 0) / leads.length) : 0;

  document.getElementById("metricSavedLists").textContent = String(lists.length);
  document.getElementById("metricQualified").textContent = String(qualified.length);
  document.getElementById("metricReviewNeeded").textContent = String(reviewNeeded.length);
  document.getElementById("metricAverageScore").textContent = String(averageScore);
}

function renderSavedLists() {
  const tbody = document.querySelector("#savedListsTable tbody");
  const lists = getVisibleLists();
  tbody.innerHTML = "";

  if (!lists.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Bu user icin henuz kayitli liste yok.</td></tr>';
    return;
  }

  for (const list of lists) {
    const statusClass =
      list.status === "completed" || list.status === "qualified"
        ? "qualified"
        : list.status === "reviewing" || list.status === "review_needed"
          ? "review_needed"
          : list.status === "draft" || list.status === "submission_failed"
            ? "rejected"
            : "qualified";
    const row = document.createElement("tr");
    row.className = list.id === uiState.activeListId ? "active-row" : "";
    row.innerHTML = `
      <td>
        <span class="list-name">${list.name}</span>
        <span class="list-subline">${titleCase(list.businessType)}</span>
      </td>
      <td>${titleCase(list.niche)} - ${list.city}</td>
      <td><span class="status-pill status-${statusClass}">${titleCase(list.status)}</span></td>
      <td>${formatRunDate(list.lastRun)}</td>
      <td>${list.discovered}</td>
      <td>${list.qualified}</td>
    `;
    row.addEventListener("click", () => {
      uiState.activeListId = list.id;
      saveUiState();
      render();
    });
    tbody.appendChild(row);
  }
}

function renderPipeline() {
  const activeList = getActiveList();
  if (!activeList) return;
  document.getElementById("pipelineDiscovered").textContent = activeList.discovered;
  document.getElementById("pipelineAudited").textContent = activeList.audited;
  document.getElementById("pipelineEnriched").textContent = activeList.enriched;
  document.getElementById("pipelineQualified").textContent = activeList.qualified;
  document.getElementById("pipelineRejected").textContent = activeList.rejected;
}

function renderLeads() {
  const tbody = document.querySelector("#leadsTable tbody");
  const leads = getLeadsForActiveList();
  tbody.innerHTML = "";

  const selectedLead = leads[0] || runtimeData.leads.find((lead) => lead.listId === uiState.activeListId) || null;
  updateLeadDetail(selectedLead);

  if (!leads.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Bu liste icin gosterilecek lead bulunamadi.</td></tr>';
    return;
  }

  for (const lead of leads) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="company-cell">
        <strong>${lead.company}</strong>
        <span>${String(lead.website || "").replace(/^https?:\/\//, "")}</span>
      </td>
      <td>
        <strong>${lead.decisionMaker || "No named contact yet"}</strong>
        <span class="status-note">${lead.role || "Needs enrichment / review"}</span>
      </td>
      <td class="contact-stack">
        <span>${lead.email || "No email"}</span>
        <span>${lead.phone || "No phone"}</span>
      </td>
      <td><span class="score-pill">${lead.seoScore}</span></td>
      <td><span class="score-pill">${lead.overallScore}</span></td>
      <td><span class="status-pill status-${lead.status}">${titleCase(lead.status)}</span></td>
      <td>${titleCase(lead.outreachReadiness)}</td>
    `;
    row.addEventListener("click", () => updateLeadDetail(lead));
    tbody.appendChild(row);
  }
}

function updateLeadDetail(lead) {
  if (!lead) {
    document.getElementById("detailCompany").textContent = "No lead selected";
    document.getElementById("detailStatus").textContent = "empty";
    document.getElementById("detailWebsite").textContent = "-";
    document.getElementById("detailLocation").textContent = "-";
    document.getElementById("detailPrimaryProblem").textContent = "-";
    document.getElementById("detailOffer").textContent = "-";
    document.getElementById("detailReason").textContent = "No lead data available for the current selection yet.";
    document.getElementById("detailAngle").textContent = "-";
    document.getElementById("detailValue").textContent = "-";
    document.getElementById("detailPersonalization").textContent = "-";
    return;
  }
  document.getElementById("detailCompany").textContent = lead.company;
  document.getElementById("detailStatus").textContent = titleCase(lead.status);
  document.getElementById("detailWebsite").textContent = String(lead.website || "").replace(/^https?:\/\//, "");
  document.getElementById("detailLocation").textContent = `${getActiveList()?.city || ""}, ${getActiveList()?.country || ""}`;
  document.getElementById("detailPrimaryProblem").textContent = titleCase(lead.primaryProblem || "not set");
  document.getElementById("detailOffer").textContent = titleCase(lead.recommendedOffer || "not set");
  document.getElementById("detailReason").textContent = lead.whyItMatters || "No qualification reason recorded yet.";
  document.getElementById("detailAngle").textContent = lead.outreachAngle || "No outreach angle recorded yet.";
  document.getElementById("detailValue").textContent = lead.valueHypothesis || "No value hypothesis recorded yet.";
  document.getElementById("detailPersonalization").textContent = lead.firstLine || "No personalization generated yet.";
}

async function createListFromForm(event) {
  event.preventDefault();
  const name = document.getElementById("searchNameInput").value.trim();
  const niche = document.getElementById("nicheInput").value.trim();
  const businessType = document.getElementById("businessTypeInput").value.trim();
  const city = document.getElementById("cityInput").value.trim();
  const country = document.getElementById("countryInput").value.trim();
  const minSeoScore = Number(document.getElementById("seoThresholdInput").value || 60);
  const minLeadScore = Number(document.getElementById("leadThresholdInput").value || 70);
  if (!name || !niche || !businessType || !city || !country) return;

  const searchPayload = buildSearchPayload({
    name,
    niche,
    businessType,
    city,
    country,
    minSeoScore,
    minLeadScore,
  });

  const id = searchPayload.search_id;
  uiState.localLists.unshift({
    id,
    userId: uiState.currentUserId || loadCurrentUserId(),
    name,
    niche,
    businessType,
    city,
    country,
    description: `${titleCase(niche)} opportunities saved for later review and reruns.`,
    status: loadWebhookUrl().trim() ? "queued" : "draft",
    lastRun: new Date().toISOString(),
    discovered: 0,
    audited: 0,
    enriched: 0,
    qualified: 0,
    rejected: 0,
    minSeoScore,
    minLeadScore,
    archived: false,
    isRemote: false,
  });
  uiState.activeListId = id;
  saveUiState();
  mergeRuntimeData(runtimeData);
  render();
  try {
    await submitSearchToWebhook(searchPayload);
  } catch (error) {
    updateMessageNode(
      "createSearchStatus",
      "Liste dashboard'a kaydedildi ama n8n'e gonderilemedi. Webhook URL veya CORS ayarini kontrol et.",
      "error",
    );
    const localList = uiState.localLists.find((list) => list.id === id);
    if (localList) localList.status = "draft";
    saveUiState();
    mergeRuntimeData(runtimeData);
    render();
    console.error(error);
  }
  event.target.reset();
  if (loadWebhookUrl().trim()) {
    window.setTimeout(() => {
      syncFromApi();
    }, 2500);
  }
}

function saveWebhookFromInput() {
  const input = document.getElementById("webhookUrlInput");
  const webhookUrl = input?.value.trim() || "";
  saveWebhookUrl(webhookUrl);
  hydrateWebhookUi();
}

function saveCurrentUserFromInput() {
  const input = document.getElementById("currentUserIdInput");
  const currentUserId = String(input?.value || "").trim() || "usr_mvp";
  uiState.currentUserId = currentUserId;
  saveCurrentUserId(currentUserId);
  saveUiState();
  mergeRuntimeData(runtimeData);
  hydrateCurrentUserUi();
  render();
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function exportSelectedListCsv() {
  const activeList = getActiveList();
  const leads = getLeadsForActiveList();
  if (!activeList || !leads.length) {
    updateMessageNode("exportStatus", "Export icin secili listede gorunen lead yok.", "error");
    return;
  }
  const headers = [
    "company_name","website","decision_maker","role","email","phone","seo_score","overall_score","commercial_fit",
    "contact_confidence","status","outreach_readiness","paid_ads_detected","primary_problem","secondary_problem",
    "why_it_matters","outreach_angle","value_hypothesis","first_line","recommended_offer","recommended_channel"
  ];
  const rows = leads.map((lead) => [
    lead.company, lead.website, lead.decisionMaker, lead.role, lead.email, lead.phone, lead.seoScore, lead.overallScore,
    lead.commercialFit, lead.contactConfidence, lead.status, lead.outreachReadiness, lead.paidAdsDetected ? "true" : "false",
    lead.primaryProblem, lead.secondaryProblem, lead.whyItMatters, lead.outreachAngle, lead.valueHypothesis, lead.firstLine,
    lead.recommendedOffer, lead.recommendedChannel,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(activeList.name || "rankforge_export") || "rankforge_export"}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  updateMessageNode("exportStatus", `${leads.length} lead CSV olarak export edildi.`, "success");
}

function rerunSelectedList() {
  const activeList = getActiveList();
  if (!activeList) return;
  activeList.status = "running";
  activeList.lastRun = new Date().toISOString();
  render();
}

function duplicateSelectedList() {
  const activeList = getActiveList();
  if (!activeList) return;
  const duplicate = {
    ...activeList,
    id: `list_${Date.now()}`,
    name: `${activeList.name} Copy`,
    status: "draft",
    lastRun: new Date().toISOString(),
    isRemote: false,
  };
  uiState.localLists.unshift(duplicate);
  uiState.activeListId = duplicate.id;
  saveUiState();
  mergeRuntimeData(runtimeData);
  render();
}

function archiveSelectedList() {
  const activeList = getActiveList();
  if (!activeList) return;
  uiState.archivedListIds = [...new Set([...(uiState.archivedListIds || []), activeList.id])];
  const nextVisible = getVisibleLists().filter((list) => list.id !== activeList.id)[0];
  uiState.activeListId = nextVisible?.id || null;
  saveUiState();
  mergeRuntimeData(runtimeData);
  render();
}

function addDemoList() {
  const id = `list_${Date.now()}`;
  uiState.localLists.unshift({
    id,
    userId: uiState.currentUserId || loadCurrentUserId(),
    name: "Berlin Roofers - Expansion Batch",
    niche: "roof repair",
    businessType: "roofing company",
    city: "Berlin",
    country: "Germany",
    description: "Saved expansion list for local roof repair companies that can be revisited later without losing prior runs.",
    status: "completed",
    lastRun: new Date().toISOString(),
    discovered: 27,
    audited: 18,
    enriched: 10,
    qualified: 4,
    rejected: 7,
    minSeoScore: 57,
    minLeadScore: 71,
    archived: false,
    isRemote: false,
  });

  uiState.localLeads.push({
    id: `lead_${Date.now()}`,
    listId: id,
    userId: uiState.currentUserId || loadCurrentUserId(),
    company: "NordDach Berlin",
    website: "https://norddach-berlin.de",
    decisionMaker: "Managing Director",
    role: "Managing Director",
    email: "info@norddach-berlin.de",
    phone: "+49 30 5554 8821",
    seoScore: 77,
    overallScore: 79,
    commercialFit: 74,
    contactConfidence: 75,
    status: "qualified",
    outreachReadiness: "ready",
    paidAdsDetected: false,
    primaryProblem: "Weak local service architecture",
    secondaryProblem: "Thin location intent coverage",
    whyItMatters: "Good fit for local service SEO and already reachable with a usable contact path.",
    outreachAngle: "Offer a local service-page expansion with stronger metadata and map-supporting content.",
    valueHypothesis: "A tighter service architecture should increase organic visibility for emergency and repair intent.",
    firstLine: "Saw clear roofing-service intent but a site structure that likely limits local organic capture.",
    recommendedOffer: "Local SEO audit",
    recommendedChannel: "email",
  });

  uiState.activeListId = id;
  saveUiState();
  mergeRuntimeData(runtimeData);
  render();
}

function render() {
  if (!getActiveList()) return;
  updateHero();
  updateMetrics();
  renderSavedLists();
  renderPipeline();
  renderLeads();
  document.getElementById("scoreFilterValue").textContent = document.getElementById("scoreFilter").value;
}

const uiState = loadUiState();
let runtimeData = buildDemoRuntimeData();

document.getElementById("quickCreateForm").addEventListener("submit", createListFromForm);
document.getElementById("createListButton").addEventListener("click", () => {
  document.getElementById("searchNameInput").focus();
});
document.getElementById("syncSheetsButton").addEventListener("click", syncFromApi);
document.getElementById("seedListsButton").addEventListener("click", addDemoList);
document.getElementById("saveWebhookButton").addEventListener("click", saveWebhookFromInput);
document.getElementById("saveCurrentUserButton").addEventListener("click", saveCurrentUserFromInput);
document.getElementById("rerunListButton").addEventListener("click", rerunSelectedList);
document.getElementById("duplicateListButton").addEventListener("click", duplicateSelectedList);
document.getElementById("archiveListButton").addEventListener("click", archiveSelectedList);
document.getElementById("exportSelectedListButton").addEventListener("click", exportSelectedListCsv);
document.getElementById("qualificationFilter").addEventListener("change", renderLeads);
document.getElementById("scoreFilter").addEventListener("input", () => {
  document.getElementById("scoreFilterValue").textContent = document.getElementById("scoreFilter").value;
  renderLeads();
});
document.getElementById("contactReadyFilter").addEventListener("change", renderLeads);
document.getElementById("paidAdsFilter").addEventListener("change", renderLeads);

mergeRuntimeData(runtimeData);
hydrateWebhookUi();
uiState.currentUserId = uiState.currentUserId || loadCurrentUserId();
hydrateCurrentUserUi();
render();
syncFromApi();

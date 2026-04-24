const APP_STORAGE_KEY = "rankforge-clean-app-state-v1";
const APP_USER_ID_KEY = "rankforge-current-user-id-v1";
const APP_WEBHOOK_KEY = "rankforge-search-submit-webhook-v1";
const DEFAULT_WEBHOOK_URL = "https://lastaccount1907.app.n8n.cloud/webhook/rankforge-create-search";
const SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
const PAGE_NAME = document.body.dataset.page || "dashboard";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function cleanCellValue(value) {
  if (typeof value === "string") return value.trim();
  return value;
}

function normalizeKey(value) {
  return String(value || "").trim();
}

function getSession() {
  if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
    return window.rankforgeAuth.getSession();
  }
  return safeParse(localStorage.getItem("rankforge-auth-session-v1"), null);
}

function getCurrentUserId() {
  const session = getSession();
  if (session && session.userId) {
    const normalized = normalizeKey(session.userId);
    localStorage.setItem(APP_USER_ID_KEY, normalized);
    return normalized;
  }
  return normalizeKey(localStorage.getItem(APP_USER_ID_KEY) || "usr_mvp");
}

function loadState() {
  const state = safeParse(localStorage.getItem(APP_STORAGE_KEY), {});
  if (!Array.isArray(state.localLists)) state.localLists = [];
  if (!Array.isArray(state.localLeads)) state.localLeads = [];
  if (!Array.isArray(state.archivedListIds)) state.archivedListIds = [];
  state.selectedListId = state.selectedListId || null;
  state.selectedLeadId = state.selectedLeadId || null;
  state.syncMode = state.syncMode || "local";
  state.lastSyncAt = state.lastSyncAt || null;
  state.currentUserId = getCurrentUserId();
  return state;
}

function saveState(state) {
  localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
}

let appState = loadState();
let runtimeData = { lists: [], leads: [] };

function getWebhookUrl() {
  const stored = (localStorage.getItem(APP_WEBHOOK_KEY) || "").trim();
  if (stored) return stored;
  localStorage.setItem(APP_WEBHOOK_KEY, DEFAULT_WEBHOOK_URL);
  return DEFAULT_WEBHOOK_URL;
}

function setWebhookUrl(url) {
  localStorage.setItem(APP_WEBHOOK_KEY, (url || "").trim() || DEFAULT_WEBHOOK_URL);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function formatDate(value) {
  if (!value) return "No run yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No run yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function statusClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "qualified" || normalized === "completed" || normalized === "active") {
    return "status-qualified";
  }
  if (normalized === "review_needed" || normalized === "running" || normalized === "queued" || normalized === "draft") {
    return "status-review";
  }
  if (normalized === "rejected" || normalized === "archived" || normalized === "failed") {
    return "status-rejected";
  }
  return "status-review";
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setHtml(selector, html) {
  const node = document.querySelector(selector);
  if (node) node.innerHTML = html;
}

function updateStatus(id, message, tone) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message;
  node.classList.remove("is-success", "is-error");
  if (tone === "success") node.classList.add("is-success");
  if (tone === "error") node.classList.add("is-error");
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function upsertLocalList(nextList) {
  const index = appState.localLists.findIndex((item) => item.id === nextList.id);
  if (index >= 0) {
    appState.localLists[index] = { ...appState.localLists[index], ...nextList };
  } else {
    appState.localLists.unshift(nextList);
  }
}

function mergeRuntime(remote) {
  const currentUserId = getCurrentUserId();
  appState.currentUserId = currentUserId;
  const archived = new Set(appState.archivedListIds);
  const localLists = (appState.localLists || []).filter((item) => normalizeKey(item.userId || currentUserId) === currentUserId);
  const remoteLists = (remote.lists || []).filter((item) => normalizeKey(item.userId || currentUserId) === currentUserId);
  const localLeads = (appState.localLeads || []).filter((item) => normalizeKey(item.userId || currentUserId) === currentUserId);
  const remoteLeads = (remote.leads || []).filter((item) => normalizeKey(item.userId || currentUserId) === currentUserId);

  runtimeData = {
    lists: uniqueBy([...remoteLists, ...localLists], (item) => item.id).filter((item) => !archived.has(item.id)),
    leads: uniqueBy([...remoteLeads, ...localLeads], (item) => item.id),
  };

  if (!runtimeData.lists.find((item) => item.id === appState.selectedListId)) {
    appState.selectedListId = runtimeData.lists[0] ? runtimeData.lists[0].id : null;
  }
  if (!runtimeData.leads.find((item) => item.id === appState.selectedLeadId)) {
    appState.selectedLeadId = null;
  }
  saveState(appState);
}

function getSelectedList() {
  return runtimeData.lists.find((item) => item.id === appState.selectedListId) || runtimeData.lists[0] || null;
}

function getVisibleLeads() {
  const selectedList = getSelectedList();
  if (!selectedList) return [];
  const statusFilter = document.getElementById("qualificationFilter")?.value || "all";
  const minScore = Number(document.getElementById("scoreFilter")?.value || 0);
  const contactReady = document.getElementById("contactReadyFilter")?.checked || false;
  const paidAdsOnly = document.getElementById("paidAdsFilter")?.checked || false;
  return runtimeData.leads.filter((lead) => {
    if (lead.listId !== selectedList.id) return false;
    if (statusFilter !== "all" && lead.status !== statusFilter) return false;
    if (numberValue(lead.overallScore) < minScore) return false;
    if (contactReady && !lead.email && !lead.phone) return false;
    if (paidAdsOnly && !lead.paidAdsDetected) return false;
    return true;
  });
}

function getSelectedLead() {
  const visibleLeads = getVisibleLeads();
  return visibleLeads.find((item) => item.id === appState.selectedLeadId) || visibleLeads[0] || null;
}

function createLocalList(values) {
  const id = values.id || `list_${Date.now()}`;
  const list = {
    id,
    userId: getCurrentUserId(),
    name: values.name,
    niche: values.niche,
    businessType: values.businessType,
    city: values.city,
    country: values.country,
    description: values.description || `${titleCase(values.niche)} opportunities saved for later review and reruns.`,
    status: values.status || "queued",
    lastRun: new Date().toISOString(),
    discovered: values.discovered || 0,
    audited: values.audited || 0,
    enriched: values.enriched || 0,
    qualified: values.qualified || 0,
    rejected: values.rejected || 0,
    minSeoScore: values.minSeoScore || 60,
    minLeadScore: values.minLeadScore || 70,
    archived: false,
    isRemote: false,
  };
  upsertLocalList(list);
  appState.selectedListId = id;
  saveState(appState);
  return list;
}

function addDemoList() {
  const list = createLocalList({
    name: "Berlin Roofers - Expansion Batch",
    niche: "roof repair",
    businessType: "roofing company",
    city: "Berlin",
    country: "Germany",
    description: "Saved expansion list for local roof repair companies that can be revisited later without losing prior runs.",
    status: "completed",
    discovered: 27,
    audited: 18,
    enriched: 10,
    qualified: 4,
    rejected: 7,
    minSeoScore: 57,
    minLeadScore: 71,
  });
  appState.localLeads.push({
    id: `lead_${Date.now()}`,
    listId: list.id,
    userId: getCurrentUserId(),
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
  saveState(appState);
  mergeRuntime(runtimeData);
  renderAll();
  updateStatus("dataStatus", "Demo list added", "success");
}

function buildSearchPayload() {
  return {
    search_id: `srch_${Date.now()}`,
    user_id: getCurrentUserId(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "active",
    search_name: document.getElementById("searchNameInput")?.value.trim() || "",
    niche: document.getElementById("nicheInput")?.value.trim() || "",
    business_type: document.getElementById("businessTypeInput")?.value.trim() || "",
    city: document.getElementById("cityInput")?.value.trim() || "",
    country: document.getElementById("countryInput")?.value.trim() || "",
    primary_keyword: document.getElementById("nicheInput")?.value.trim() || "",
    secondary_keywords: "",
    discovery_query_limit: "1",
    discovery_page_limit: "1",
    max_results_requested: "20",
    min_audit_score: String(document.getElementById("seoThresholdInput")?.value || 60),
    min_lead_score: String(document.getElementById("leadThresholdInput")?.value || 70),
    started_at: "",
    completed_at: "",
    failed_at: "",
    failure_reason: "",
  };
}

async function sendSearchToWebhook(payload) {
  const webhook = getWebhookUrl();
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([key, value]) => {
    body.set(key, value == null ? "" : String(value));
  });
  await fetch(webhook, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
}

async function createSearch(event) {
  if (event) event.preventDefault();
  const payload = buildSearchPayload();
  if (!payload.search_name || !payload.niche || !payload.business_type || !payload.city || !payload.country) {
    updateStatus("createSearchStatus", "Please fill List Name, Niche, Business Type, City, and Country.", "error");
    return false;
  }
  createLocalList({
    id: payload.search_id,
    name: payload.search_name,
    niche: payload.niche,
    businessType: payload.business_type,
    city: payload.city,
    country: payload.country,
    status: "queued",
    minSeoScore: numberValue(payload.min_audit_score),
    minLeadScore: numberValue(payload.min_lead_score),
  });
  mergeRuntime(runtimeData);
  renderAll();
  updateStatus("createSearchStatus", "List created locally. Sending to n8n...", "success");
  try {
    await sendSearchToWebhook(payload);
    updateStatus("createSearchStatus", "List created and sent to n8n.", "success");
  } catch {
    updateStatus("createSearchStatus", "List created locally but webhook send failed.", "error");
  }
  return false;
}

function refreshView(event) {
  if (event) event.preventDefault();
  renderAll();
  return false;
}

function saveWebhook(event) {
  if (event) event.preventDefault();
  const input = document.getElementById("webhookUrlInput");
  const value = (input?.value || "").trim() || DEFAULT_WEBHOOK_URL;
  setWebhookUrl(value);
  if (input) input.value = value;
  updateStatus("webhookStatus", "Webhook saved.", "success");
  return false;
}

function parseGvizTable(parsed) {
  const cols = (parsed.table?.cols || []).map((col) => col.label || col.id);
  return (parsed.table?.rows || []).map((row) => {
    const record = {};
    const cells = row.c || [];
    cols.forEach((key, index) => {
      const cell = cells[index];
      record[key] = cleanCellValue(!cell ? "" : cell.f || cell.v || "");
    });
    return record;
  });
}

function parseGvizText(payload) {
  const cleaned = payload.replace(/^[\s\S]*?setResponse\(/, "").replace(/\);\s*$/, "");
  return parseGvizTable(JSON.parse(cleaned));
}

async function fetchSheetRowsViaScript(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  return new Promise((resolve, reject) => {
    const previousGoogle = window.google;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`sheet-${sheetName}-timeout`));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      if (previousGoogle === undefined) {
        delete window.google;
      } else {
        window.google = previousGoogle;
      }
    }

    window.google = window.google || {};
    window.google.visualization = window.google.visualization || {};
    window.google.visualization.Query = window.google.visualization.Query || {};
    window.google.visualization.Query.setResponse = (parsed) => {
      try {
        const rows = parseGvizTable(parsed);
        cleanup();
        resolve(rows);
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    script.src = url;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error(`sheet-${sheetName}-script`));
    };
    document.body.appendChild(script);
  });
}

async function fetchSheetRows(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  try {
    const response = await fetch(url, { headers: { Accept: "text/plain, application/json, */*" } });
    if (!response.ok) throw new Error(`sheet-${sheetName}`);
    const payload = await response.text();
    return parseGvizText(payload);
  } catch {
    return fetchSheetRowsViaScript(sheetName);
  }
}

async function fetchSheetRowsSafe(sheetName) {
  try {
    const rows = await fetchSheetRows(sheetName);
    return { ok: true, sheetName, rows };
  } catch (error) {
    return {
      ok: false,
      sheetName,
      rows: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchSheetsSequential(sheetNames) {
  const results = [];
  for (const sheetName of sheetNames) {
    results.push(await fetchSheetRowsSafe(sheetName));
  }
  return results;
}

async function fetchStaticDashboardData() {
  const response = await fetch("../data/dashboard-data.json", {
    headers: { Accept: "application/json, text/plain, */*" },
  });
  if (!response.ok) throw new Error("static-dashboard-data");
  return response.json();
}

function buildRemoteData(data) {
  const searches = data.searches || [];
  const rawProspects = data.raw_prospects || [];
  const audits = data.seo_audits || [];
  const contacts = data.contacts || [];
  const finalLeads = data.final_leads || [];

  const contactByProspect = {};
  for (const contact of contacts) {
    if (!contact.prospect_id) continue;
    const current = contactByProspect[contact.prospect_id];
    if (!current || numberValue(contact.contact_confidence_score) > numberValue(current.contact_confidence_score)) {
      contactByProspect[contact.prospect_id] = contact;
    }
  }

  const auditById = {};
  for (const audit of audits) {
    if (audit.audit_id) auditById[audit.audit_id] = audit;
  }

  const auditHasFinalLead = new Set(finalLeads.map((item) => item.audit_id).filter(Boolean));

  const searchMap = new Map();
  for (const search of searches) {
    const searchId = normalizeKey(search.search_id);
    if (searchId) searchMap.set(searchId, search);
  }
  for (const row of rawProspects) {
    const searchId = normalizeKey(row.search_id);
    if (searchId && !searchMap.has(searchId)) searchMap.set(searchId, row);
  }
  for (const row of audits) {
    const searchId = normalizeKey(row.search_id);
    if (searchId && !searchMap.has(searchId)) searchMap.set(searchId, row);
  }
  for (const row of finalLeads) {
    const searchId = normalizeKey(row.search_id);
    if (searchId && !searchMap.has(searchId)) searchMap.set(searchId, row);
  }

  const lists = Array.from(searchMap.values()).map((search) => {
    const searchId = normalizeKey(search.search_id);
    const searchAudits = audits.filter((item) => normalizeKey(item.search_id) === searchId);
    const searchProspects = rawProspects.filter((item) => normalizeKey(item.search_id) === searchId);
    const qualifiedCount = finalLeads.filter((item) => normalizeKey(item.search_id) === searchId && normalizeKey(item.qualification_status) === "qualified").length;
    const reviewNeededCount = finalLeads.filter((item) => normalizeKey(item.search_id) === searchId && normalizeKey(item.qualification_status) === "review_needed").length;
    const rejectedCount = finalLeads.filter((item) => normalizeKey(item.search_id) === searchId && normalizeKey(item.qualification_status) === "rejected").length;
    let derivedStatus = search.status || "active";
    if (qualifiedCount > 0 || reviewNeededCount > 0 || rejectedCount > 0) {
      derivedStatus = "completed";
    } else if (searchAudits.length > 0 || searchProspects.length > 0) {
      derivedStatus = "running";
    } else if (derivedStatus === "active") {
      derivedStatus = "queued";
    }
    return {
      id: searchId,
      userId: normalizeKey(search.user_id || "usr_mvp"),
      name: search.search_name || `${titleCase(search.niche)} - ${search.city}`,
      niche: search.niche || "",
      businessType: search.business_type || "",
      city: search.city || "",
      country: search.country || "",
      description: `${titleCase(search.niche)} opportunities for ${search.city}.`,
      status: derivedStatus,
      lastRun: search.completed_at || search.updated_at || search.created_at || "",
      discovered: searchProspects.length || numberValue(search.max_results_requested),
      audited: searchAudits.length,
      enriched: contacts.filter((item) => item.search_id === search.search_id).length,
      qualified: qualifiedCount,
      rejected: rejectedCount,
      minSeoScore: numberValue(search.min_audit_score || 60),
      minLeadScore: numberValue(search.min_lead_score || 70),
      isRemote: true,
    };
  }).filter((item) => item.id);

  const leads = finalLeads.map((lead, index) => {
    const audit = auditById[lead.audit_id] || {};
    const contact = contacts.find((item) => item.contact_id === lead.primary_contact_id) || contactByProspect[lead.prospect_id] || {};
    return {
      id: lead.lead_id || `remote_lead_${index + 1}`,
      listId: normalizeKey(lead.search_id || audit.search_id || ""),
      userId: normalizeKey(lead.user_id || audit.user_id || contact.user_id || "usr_mvp"),
      company: lead.company_name || audit.company_name || "Unknown company",
      website: lead.website_url || audit.website_url || "",
      decisionMaker: lead.decision_maker_name || contact.contact_name || "",
      role: lead.decision_maker_role || contact.contact_role || "",
      email: lead.decision_maker_email || contact.email || "",
      phone: lead.decision_maker_phone || contact.phone || "",
      seoScore: numberValue(lead.seo_need_score || audit.seo_need_score),
      overallScore: numberValue(lead.overall_lead_score || lead.seo_need_score || audit.seo_need_score),
      commercialFit: numberValue(lead.commercial_fit_score || audit.commercial_fit_score),
      contactConfidence: numberValue(lead.contact_confidence_score || contact.contact_confidence_score),
      status: lead.qualification_status || lead.status || "review_needed",
      outreachReadiness: lead.outreach_readiness || "needs_review",
      paidAdsDetected: String(lead.paid_ads_detected || audit.paid_ads_detected || "").toLowerCase() === "true",
      primaryProblem: lead.primary_problem || "",
      secondaryProblem: lead.secondary_problem || "",
      whyItMatters: lead.qualification_reason || audit.audit_summary || "",
      outreachAngle: lead.outreach_angle || audit.recommended_outreach_angle || "",
      valueHypothesis: lead.client_value_hypothesis || "",
      firstLine: lead.first_line_personalization || "",
      recommendedOffer: lead.recommended_offer || "",
      recommendedChannel: lead.recommended_channel || "",
    };
  });

  const fallbackLeads = audits
    .filter((audit) => !auditHasFinalLead.has(audit.audit_id))
    .map((audit, index) => {
      const contact = contactByProspect[audit.prospect_id] || {};
      const fallbackStatus = numberValue(audit.seo_need_score) >= numberValue(audit.min_lead_score || 70) ? "review_needed" : "rejected";
      return {
        id: `audit_fallback_${audit.audit_id || index + 1}`,
        listId: normalizeKey(audit.search_id || ""),
        userId: normalizeKey(audit.user_id || contact.user_id || "usr_mvp"),
        company: audit.company_name || "Unknown company",
        website: audit.website_url || audit.final_url || "",
        decisionMaker: contact.contact_name || "",
        role: contact.contact_role || "",
        email: contact.email || audit.homepage_primary_email || "",
        phone: contact.phone || audit.homepage_primary_phone || "",
        seoScore: numberValue(audit.seo_need_score),
        overallScore: numberValue(audit.seo_need_score),
        commercialFit: numberValue(audit.commercial_fit_score),
        contactConfidence: numberValue(contact.contact_confidence_score),
        status: fallbackStatus,
        outreachReadiness: fallbackStatus === "review_needed" ? "needs_review" : "not_ready",
        paidAdsDetected: String(audit.paid_ads_detected || "").toLowerCase() === "true",
        primaryProblem: (audit.seo_need_reasons || "").split("|")[0]?.trim() || "",
        secondaryProblem: (audit.seo_need_reasons || "").split("|")[1]?.trim() || "",
        whyItMatters: audit.audit_summary || "",
        outreachAngle: audit.recommended_outreach_angle || "",
        valueHypothesis: "",
        firstLine: "",
        recommendedOffer: "SEO audit",
        recommendedChannel: contact.email ? "email" : (contact.phone ? "phone" : "manual_review"),
      };
    });

  return { lists, leads: uniqueBy([...leads, ...fallbackLeads], (item) => item.id) };
}

async function syncSheets(event) {
  if (event) event.preventDefault();
  updateStatus("dataStatus", "Syncing sheets...", "");
  try {
    const results = await fetchSheetsSequential([
      "raw_prospects",
      "searches",
      "seo_audits",
      "contacts",
      "final_leads",
    ]);

    const map = Object.fromEntries(results.map((item) => [item.sheetName, item]));
    const failedSheets = results.filter((item) => !item.ok).map((item) => item.sheetName);
    const hasCoreData = (map.searches?.rows?.length || 0) > 0 || (map.seo_audits?.rows?.length || 0) > 0 || (map.final_leads?.rows?.length || 0) > 0;

    if (hasCoreData) {
      appState.lastSyncAt = new Date().toISOString();
      appState.syncMode = "sheets";
      saveState(appState);
      mergeRuntime(buildRemoteData({
        raw_prospects: map.raw_prospects?.rows || [],
        searches: map.searches?.rows || [],
        seo_audits: map.seo_audits?.rows || [],
        contacts: map.contacts?.rows || [],
        final_leads: map.final_leads?.rows || [],
      }));
      renderAll();
      if (failedSheets.length) {
        updateStatus("dataStatus", `Partial sync: ${failedSheets.join(", ")} failed`, "error");
      } else {
        updateStatus("dataStatus", "Live Sheets synced", "success");
      }
      return false;
    }

    const staticData = await fetchStaticDashboardData();
    appState.lastSyncAt = new Date().toISOString();
    appState.syncMode = "local";
    saveState(appState);
    mergeRuntime({
      lists: staticData.lists || [],
      leads: staticData.leads || [],
    });
    renderAll();
    updateStatus("dataStatus", "Sheets unavailable, static workspace shown", "error");
  } catch {
    mergeRuntime(runtimeData);
    renderAll();
    updateStatus("dataStatus", "Sheet sync failed, local workspace shown", "error");
  }
  return false;
}

function rerunSelectedList() {
  const selected = getSelectedList();
  if (!selected) return;
  upsertLocalList({
    ...selected,
    userId: getCurrentUserId(),
    status: "running",
    lastRun: new Date().toISOString(),
    isRemote: false,
  });
  appState.selectedListId = selected.id;
  saveState(appState);
  mergeRuntime(runtimeData);
  renderAll();
}

function duplicateSelectedList() {
  const selected = getSelectedList();
  if (!selected) return;
  createLocalList({
    name: `${selected.name} Copy`,
    niche: selected.niche,
    businessType: selected.businessType,
    city: selected.city,
    country: selected.country,
    description: selected.description,
    status: "draft",
    minSeoScore: selected.minSeoScore,
    minLeadScore: selected.minLeadScore,
  });
  mergeRuntime(runtimeData);
  renderAll();
}

function archiveSelectedList() {
  const selected = getSelectedList();
  if (!selected) return;
  appState.archivedListIds.push(selected.id);
  saveState(appState);
  mergeRuntime(runtimeData);
  renderAll();
}

function exportCsv() {
  const selected = getSelectedList();
  const leads = getVisibleLeads();
  if (!selected || !leads.length) {
    updateStatus("exportStatus", "No visible leads to export.", "error");
    return;
  }
  const headers = [
    "company_name","website","decision_maker","role","email","phone","seo_score","overall_score","commercial_fit",
    "contact_confidence","status","outreach_readiness","paid_ads_detected","primary_problem","secondary_problem",
    "why_it_matters","outreach_angle","value_hypothesis","first_line","recommended_offer","recommended_channel",
  ];
  const rows = leads.map((lead) => [
    lead.company, lead.website, lead.decisionMaker, lead.role, lead.email, lead.phone, lead.seoScore, lead.overallScore,
    lead.commercialFit, lead.contactConfidence, lead.status, lead.outreachReadiness, lead.paidAdsDetected ? "true" : "false",
    lead.primaryProblem, lead.secondaryProblem, lead.whyItMatters, lead.outreachAngle, lead.valueHypothesis, lead.firstLine,
    lead.recommendedOffer, lead.recommendedChannel,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(selected.name)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  updateStatus("exportStatus", `${leads.length} leads exported.`, "success");
}

function renderDashboardPage() {
  const selected = getSelectedList();
  const leads = getVisibleLeads();
  const lists = runtimeData.lists;
  const qualified = runtimeData.leads.filter((item) => item.status === "qualified").length;
  const reviewNeeded = runtimeData.leads.filter((item) => item.status === "review_needed").length;
  const averageScore = runtimeData.leads.length
    ? Math.round(runtimeData.leads.reduce((sum, item) => sum + numberValue(item.overallScore), 0) / runtimeData.leads.length)
    : 0;

  setText("workspaceUserBadge", getCurrentUserId());
  setText("workspaceDataSource", appState.syncMode === "sheets" ? "Live Sheets" : "Local workspace");
  setText("workspaceLastSync", appState.lastSyncAt ? `Last sync ${formatDate(appState.lastSyncAt)}` : "Waiting for first sync");
  setText("metricSavedLists", String(lists.length));
  setText("metricQualified", String(qualified));
  setText("metricReviewNeeded", String(reviewNeeded));
  setText("metricAverageScore", String(averageScore));
  setText("visibleLeadCount", `${leads.length} leads`);

  if (!selected) return;
  setText("workspaceSelectedListHealth", selected.qualified > 0 ? "List has qualified leads" : "List needs review");
  setText("workspaceSelectedListMeta", `${selected.qualified} qualified, ${selected.rejected} rejected.`);
  setText("activeListName", selected.name);
  setText("activeListStatus", selected.status);
  setText("activeListDescription", selected.description);
  setText("activeListMarket", `${titleCase(selected.niche)} - ${selected.city} - ${selected.country}`);
  setText("activeListRun", formatDate(selected.lastRun));
  setText("pipelineListTitle", `${selected.name} funnel`);
  setText("pipelineDiscovered", String(selected.discovered));
  setText("pipelineAudited", String(selected.audited));
  setText("pipelineEnriched", String(selected.enriched));
  setText("pipelineQualified", String(selected.qualified));
  setText("pipelineRejected", String(selected.rejected));
  setText("activeLeadSummary", `${selected.city}, ${selected.country} - ${selected.status}`);
  setText("topbarInsightOne", `${selected.name} stays visible until archived`);
  setText("topbarInsightTwo", `Workspace scoped to ${getCurrentUserId()}`);
  setText("topbarInsightThree", `Min thresholds: SEO ${selected.minSeoScore} / Lead ${selected.minLeadScore}`);

  setHtml("#savedListsTable tbody", lists.length
    ? lists.slice(0, 5).map((item) => `
      <tr>
        <td><span class="list-name">${item.name}</span></td>
        <td>${titleCase(item.niche)} - ${item.city}</td>
        <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
        <td>${formatDate(item.lastRun)}</td>
        <td>${item.qualified}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">No saved lists yet.</td></tr>`);

  setHtml("#leadsTable tbody", leads.length
    ? leads.slice(0, 6).map((lead) => `
      <tr>
        <td class="company-cell"><strong>${lead.company}</strong><span>${String(lead.website || "").replace(/^https?:\/\//, "")}</span></td>
        <td><strong>${lead.decisionMaker || "No named contact yet"}</strong><span class="status-note">${lead.role || "Needs review"}</span></td>
        <td class="contact-stack"><span>${lead.email || "No email"}</span><span>${lead.phone || "No phone"}</span></td>
        <td><span class="score-pill">${lead.overallScore || 0}</span></td>
        <td><span class="status-pill ${statusClass(lead.status)}">${lead.status}</span></td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">No visible leads for this list yet.</td></tr>`);

  document.querySelectorAll("#savedListsTable tbody tr").forEach((row, index) => {
    const list = lists[index];
    if (!list) return;
    row.addEventListener("click", () => {
      appState.selectedListId = list.id;
      saveState(appState);
      renderAll();
    });
  });

  document.querySelectorAll("#leadsTable tbody tr").forEach((row, index) => {
    const lead = leads[index];
    if (!lead) return;
    row.addEventListener("click", () => {
      appState.selectedLeadId = lead.id;
      saveState(appState);
      window.location.href = "../lead-detail/";
    });
  });
}

function renderListsPage() {
  const selected = getSelectedList();
  const lists = runtimeData.lists;
  setText("workspaceUserBadge", getCurrentUserId());
  setText("workspaceDataSource", appState.syncMode === "sheets" ? "Live Sheets" : "Local workspace");
  setText("workspaceLastSync", appState.lastSyncAt ? `Last sync ${formatDate(appState.lastSyncAt)}` : "Waiting for first sync");
  if (selected) {
    setText("workspaceSelectedListHealth", selected.qualified > 0 ? "List has qualified leads" : "List needs review");
    setText("workspaceSelectedListMeta", `${selected.qualified} qualified, ${selected.rejected} rejected.`);
    setText("pipelineListTitle", `${selected.name} funnel`);
    setText("pipelineDiscovered", String(selected.discovered));
    setText("pipelineAudited", String(selected.audited));
    setText("pipelineEnriched", String(selected.enriched));
    setText("pipelineQualified", String(selected.qualified));
    setText("pipelineRejected", String(selected.rejected));
    setText("listThresholdSummary", `SEO ${selected.minSeoScore} / Lead ${selected.minLeadScore}`);
    setText("listCoverageSummary", `${selected.discovered} discovered / ${selected.audited} audited`);
    setText("listQualificationSummary", `${selected.qualified} qualified / ${selected.rejected} rejected`);
  }
  setHtml("#savedListsTable tbody", lists.length
    ? lists.map((item) => `
      <tr data-list-id="${item.id}">
        <td><span class="list-name">${item.name}</span></td>
        <td>${titleCase(item.niche)} - ${item.city}</td>
        <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
        <td>${formatDate(item.lastRun)}</td>
        <td>${item.discovered}</td>
        <td>${item.qualified}</td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="empty-state">No saved lists yet.</td></tr>`);
  document.querySelectorAll("#savedListsTable tbody tr[data-list-id]").forEach((row) => {
    row.addEventListener("click", () => {
      appState.selectedListId = row.dataset.listId;
      saveState(appState);
      renderAll();
    });
  });
}

function renderLeadsPage() {
  const selected = getSelectedList();
  const leads = getVisibleLeads();
  setText("workspaceUserBadge", getCurrentUserId());
  setText("workspaceDataSource", appState.syncMode === "sheets" ? "Live Sheets" : "Local workspace");
  setText("workspaceLastSync", appState.lastSyncAt ? `Last sync ${formatDate(appState.lastSyncAt)}` : "Waiting for first sync");
  setText("visibleLeadCount", `${leads.length} leads`);
  setText("exportTargetList", selected ? selected.name : "No selected list");
  setText("exportTargetListMirror", selected ? selected.name : "No selected list");
  setText("exportTargetMeta", selected ? `${leads.length} visible leads from ${titleCase(selected.niche)} in ${selected.city}.` : "0 visible leads ready for export.");
  setText("activeLeadSummary", selected ? `${selected.city}, ${selected.country} - ${selected.status}` : "No active list selected yet.");
  setHtml("#leadsTable tbody", leads.length
    ? leads.map((lead) => `
      <tr data-lead-id="${lead.id}">
        <td class="company-cell"><strong>${lead.company}</strong><span>${String(lead.website || "").replace(/^https?:\/\//, "")}</span></td>
        <td><strong>${lead.decisionMaker || "No named contact yet"}</strong><span class="status-note">${lead.role || "Needs review"}</span></td>
        <td class="contact-stack"><span>${lead.email || "No email"}</span><span>${lead.phone || "No phone"}</span></td>
        <td><span class="score-pill">${lead.seoScore || 0}</span></td>
        <td><span class="score-pill">${lead.overallScore || 0}</span></td>
        <td><span class="status-pill ${statusClass(lead.status)}">${lead.status}</span></td>
        <td>${titleCase(lead.outreachReadiness || "needs_review")}</td>
      </tr>`).join("")
    : `<tr><td colspan="7" class="empty-state">No visible leads for this list yet.</td></tr>`);
  document.querySelectorAll("#leadsTable tbody tr[data-lead-id]").forEach((row) => {
    row.addEventListener("click", () => {
      appState.selectedLeadId = row.dataset.leadId;
      saveState(appState);
      window.location.href = "../lead-detail/";
    });
  });
}

function renderLeadDetailPage() {
  const selectedList = getSelectedList();
  const selectedLead = getSelectedLead();
  setText("workspaceUserBadge", getCurrentUserId());
  setText("workspaceDataSource", appState.syncMode === "sheets" ? "Live Sheets" : "Local workspace");
  setText("workspaceLastSync", appState.lastSyncAt ? `Last sync ${formatDate(appState.lastSyncAt)}` : "Waiting for first sync");
  if (!selectedLead) return;
  setText("detailCompany", selectedLead.company || "Unknown company");
  setText("detailStatus", selectedLead.status || "review_needed");
  const websiteNode = document.getElementById("detailWebsite");
  if (websiteNode) {
    websiteNode.textContent = String(selectedLead.website || "").replace(/^https?:\/\//, "");
    websiteNode.href = selectedLead.website || "#";
  }
  setText("detailLocation", selectedList ? `${selectedList.city}, ${selectedList.country}` : "-");
  setText("detailPrimaryProblem", selectedLead.primaryProblem || "Not set");
  setText("detailOffer", selectedLead.recommendedOffer || "Not set");
  setText("detailReason", selectedLead.whyItMatters || "No qualification reason yet.");
  setText("detailAngle", selectedLead.outreachAngle || "No outreach angle yet.");
  setText("detailValue", selectedLead.valueHypothesis || "No value hypothesis yet.");
  setText("detailPersonalization", selectedLead.firstLine || "No personalization yet.");
  setText("detailSeoScore", String(selectedLead.seoScore || 0));
  setText("detailOverallScore", String(selectedLead.overallScore || 0));
  setText("detailCommercialFit", String(selectedLead.commercialFit || 0));
  setText("detailContactConfidence", String(selectedLead.contactConfidence || 0));
  setText("detailOutreachReadiness", `Outreach: ${titleCase(selectedLead.outreachReadiness || "needs_review")}`);
  setText("detailPaidAds", `Paid ads: ${selectedLead.paidAdsDetected ? "detected" : "not detected"}`);
  setText("detailSecondaryProblem", selectedLead.secondaryProblem || "Secondary issue not set");
  setText("detailDecisionMaker", selectedLead.decisionMaker || "No named contact yet");
  setText("detailDecisionRole", selectedLead.role || "Needs contact enrichment");
  setText("detailContactLine", [selectedLead.email, selectedLead.phone].filter(Boolean).join(" | ") || "No direct contact captured");
  setText("detailContactChannel", selectedLead.recommendedChannel ? `Recommended channel: ${titleCase(selectedLead.recommendedChannel)}` : "Recommended channel not set");
  setText("detailNextAction", selectedLead.email || selectedLead.phone ? "Reach out with the selected SEO angle." : "Prioritize manual contact enrichment first.");
  setText("detailRiskNote", selectedLead.email || selectedLead.phone ? "Main risk is moderate; focus on message quality and offer fit." : "Main risk: contact path is still weak.");
  setHtml("#detailSignalList", `<li>${selectedLead.primaryProblem || "Review SEO weakness signals."}</li><li>${selectedLead.secondaryProblem || "Review secondary issues."}</li><li>${selectedLead.paidAdsDetected ? "Paid ads budget signal detected." : "No paid ads signal detected."}</li>`);
  setHtml("#detailPlaybookList", `<li>${selectedLead.outreachAngle || "Define an outreach angle."}</li><li>${selectedLead.recommendedOffer || "Choose the right offer."}</li><li>${selectedLead.firstLine || "Prepare a first-line personalization."}</li>`);
  setText("exportTargetList", selectedList ? selectedList.name : "No selected list");
  setText("exportTargetListMirror", selectedList ? selectedList.name : "No selected list");
  setText("exportTargetMeta", selectedList ? `${getVisibleLeads().length} visible leads in this selected list.` : "0 visible leads ready for export.");
}

function renderAll() {
  if (document.getElementById("webhookUrlInput")) {
    document.getElementById("webhookUrlInput").value = getWebhookUrl();
  }
  if (PAGE_NAME === "dashboard") renderDashboardPage();
  if (PAGE_NAME === "lists") renderListsPage();
  if (PAGE_NAME === "leads") renderLeadsPage();
  if (PAGE_NAME === "lead-detail") renderLeadDetailPage();
}

window.rankforgeApp = {
  sync: syncSheets,
  refresh: refreshView,
  saveWebhook,
  addDemoList,
  createSearch,
  rerunSelectedList,
  duplicateSelectedList,
  archiveSelectedList,
  exportCsv,
};

mergeRuntime({ lists: [], leads: [] });
renderAll();

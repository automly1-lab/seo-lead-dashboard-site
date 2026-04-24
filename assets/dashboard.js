const STORAGE_KEY = "rankforge-dashboard-state-v3";
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

function buildDemoRuntimeData() {
  const cloned = cloneSeededState();
  return {
    lists: cloned.lists,
    leads: cloned.leads,
    source: "demo",
  };
}

function mergeRuntimeData(remoteData) {
  const baseData = remoteData?.lists?.length ? remoteData : buildDemoRuntimeData();
  const archived = new Set(uiState.archivedListIds || []);
  const lists = [...(uiState.localLists || []), ...baseData.lists].filter((list) => !archived.has(list.id));
  const leads = [...(uiState.localLeads || []), ...baseData.leads].filter((lead) => !archived.has(lead.listId));

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

async function syncFromApi() {
  updateDataStatus("Syncing API...");
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

  for (const list of lists) {
    const row = document.createElement("tr");
    row.className = list.id === uiState.activeListId ? "active-row" : "";
    row.innerHTML = `
      <td>
        <span class="list-name">${list.name}</span>
        <span class="list-subline">${titleCase(list.businessType)}</span>
      </td>
      <td>${titleCase(list.niche)} - ${list.city}</td>
      <td><span class="status-pill status-${list.status === "completed" ? "qualified" : list.status === "reviewing" ? "review_needed" : "qualified"}">${titleCase(list.status)}</span></td>
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
  if (!lead) return;
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

function createListFromForm(event) {
  event.preventDefault();
  const name = document.getElementById("searchNameInput").value.trim();
  const niche = document.getElementById("nicheInput").value.trim();
  const businessType = document.getElementById("businessTypeInput").value.trim();
  const city = document.getElementById("cityInput").value.trim();
  const country = document.getElementById("countryInput").value.trim();
  const minSeoScore = Number(document.getElementById("seoThresholdInput").value || 60);
  const minLeadScore = Number(document.getElementById("leadThresholdInput").value || 70);
  if (!name || !niche || !businessType || !city || !country) return;

  const id = `list_${Date.now()}`;
  uiState.localLists.unshift({
    id,
    name,
    niche,
    businessType,
    city,
    country,
    description: `${titleCase(niche)} opportunities saved for later review and reruns.`,
    status: "draft",
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
  event.target.reset();
  render();
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
document.getElementById("rerunListButton").addEventListener("click", rerunSelectedList);
document.getElementById("duplicateListButton").addEventListener("click", duplicateSelectedList);
document.getElementById("archiveListButton").addEventListener("click", archiveSelectedList);
document.getElementById("qualificationFilter").addEventListener("change", renderLeads);
document.getElementById("scoreFilter").addEventListener("input", () => {
  document.getElementById("scoreFilterValue").textContent = document.getElementById("scoreFilter").value;
  renderLeads();
});
document.getElementById("contactReadyFilter").addEventListener("change", renderLeads);
document.getElementById("paidAdsFilter").addEventListener("change", renderLeads);

mergeRuntimeData(runtimeData);
render();
syncFromApi();

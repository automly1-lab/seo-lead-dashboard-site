const GOOGLE_SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
const GOOGLE_SHEETS_TABS = ["searches", "raw_prospects", "seo_audits", "contacts", "final_leads"];

export function safeNumber(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export function titleCase(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseGvizJson(text) {
  const cleaned = text
    .replace(/^[\s\S]*?setResponse\(/, "")
    .replace(/\);\s*$/, "");
  const payload = JSON.parse(cleaned);
  const cols = (payload.table.cols || []).map((col) => col.label || col.id);
  return (payload.table.rows || []).map((row) => {
    const record = {};
    cols.forEach((key, index) => {
      const cell = row.c?.[index];
      record[key] = cell ? (cell.f ?? cell.v ?? "") : "";
    });
    return record;
  });
}

async function fetchSheetRows(sheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(sheetName)}&tqx=out:json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${sheetName} ${response.status}`);
  }
  return parseGvizJson(await response.text());
}

export async function fetchAllSheetData() {
  const results = await Promise.all(GOOGLE_SHEETS_TABS.map((tab) => fetchSheetRows(tab)));
  return Object.fromEntries(GOOGLE_SHEETS_TABS.map((tab, index) => [tab, results[index]]));
}

export function buildRuntimeDataFromSheets(sheetData) {
  const searches = sheetData.searches || [];
  const rawProspects = sheetData.raw_prospects || [];
  const seoAudits = sheetData.seo_audits || [];
  const contacts = sheetData.contacts || [];
  const finalLeads = sheetData.final_leads || [];

  const contactByProspect = new Map();
  contacts.forEach((contact) => {
    if (!contact.prospect_id) return;
    const existing = contactByProspect.get(contact.prospect_id);
    if (!existing || safeNumber(contact.contact_confidence_score) > safeNumber(existing.contact_confidence_score)) {
      contactByProspect.set(contact.prospect_id, contact);
    }
  });

  const auditById = Object.fromEntries(seoAudits.map((audit) => [audit.audit_id, audit]));
  const contactsById = Object.fromEntries(contacts.map((contact) => [contact.contact_id, contact]));

  const lists = searches.map((search) => {
    const searchId = search.search_id;
    const searchProspects = rawProspects.filter((row) => row.search_id === searchId);
    const searchAudits = seoAudits.filter((row) => row.search_id === searchId && row.status === "completed");
    const searchContacts = contacts.filter((row) => row.search_id === searchId && row.status !== "pending");
    const searchLeads = finalLeads.filter((row) => row.search_id === searchId);

    return {
      id: searchId,
      name: search.search_name || `${titleCase(search.niche)} - ${search.city}`,
      niche: search.niche || "",
      businessType: search.business_type || "",
      city: search.city || "",
      country: search.country || "",
      description: `${titleCase(search.niche)} opportunities for ${search.city}, kept as a persistent saved list.`,
      status: search.status || "draft",
      lastRun: search.completed_at || search.started_at || search.updated_at || search.created_at || new Date().toISOString(),
      discovered: searchProspects.length,
      audited: searchAudits.length,
      enriched: searchContacts.length,
      qualified: searchLeads.filter((lead) => lead.qualification_status === "qualified").length,
      rejected: searchLeads.filter((lead) => lead.qualification_status === "rejected").length,
      minSeoScore: safeNumber(search.min_audit_score || 55),
      minLeadScore: safeNumber(search.min_lead_score || 70),
      archived: false,
      isRemote: true,
    };
  });

  const leads = finalLeads.map((lead, index) => {
    const audit = auditById[lead.audit_id] || {};
    const contact = contactsById[lead.primary_contact_id] || contactByProspect.get(lead.prospect_id) || {};

    return {
      id: lead.lead_id || `remote_lead_${index + 1}`,
      listId: lead.search_id,
      company: lead.company_name || audit.company_name || "Unknown company",
      website: lead.website_url || audit.website_url || "",
      decisionMaker: lead.decision_maker_name || contact.contact_name || null,
      role: lead.decision_maker_role || contact.contact_role || null,
      email: lead.decision_maker_email || contact.email || null,
      phone: lead.decision_maker_phone || contact.phone || null,
      seoScore: safeNumber(lead.seo_need_score),
      overallScore: safeNumber(lead.overall_lead_score),
      commercialFit: safeNumber(lead.commercial_fit_score),
      contactConfidence: safeNumber(lead.contact_confidence_score),
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

  return {
    lists,
    leads,
    auditsById: auditById,
    contactsById,
    source: "api",
    syncedAt: new Date().toISOString(),
  };
}


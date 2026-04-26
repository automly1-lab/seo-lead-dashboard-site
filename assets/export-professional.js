/*
  RankForge Professional Export
  Load AFTER assets/app.js on pages that use export.
  Purpose:
  - export a professional, outreach-ready CSV from live Google Sheets
  - prioritize contacts from final_leads, raw_prospects, contacts, seo_audits
  - avoid exporting leads with no email and no phone
*/
(function () {
  "use strict";

  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var STATE_KEY = "rankforge-clean-app-state-v1";
  var SESSION_KEY = "rankforge-auth-session-v1";
  var USER_KEY = "rankforge-current-user-id-v1";
  var originalExportCsv = window.rankforgeApp && window.rankforgeApp.exportCsv;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function key(value) {
    return clean(value).toLowerCase();
  }

  function num(value) {
    var parsed = Number(value || 0);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  function currentUserId() {
    var session = safeParse(localStorage.getItem(SESSION_KEY), null);
    if (session && session.userId) return clean(session.userId);
    return clean(localStorage.getItem(USER_KEY) || "usr_mvp");
  }

  function selectedListId() {
    var state = safeParse(localStorage.getItem(STATE_KEY), {});
    return clean(state.selectedListId || "");
  }

  function updateStatus(message, tone) {
    var node = document.getElementById("exportStatus") || document.getElementById("dataStatus");
    if (!node) return;
    node.textContent = message;
    node.classList.remove("is-success", "is-error");
    if (tone === "success") node.classList.add("is-success");
    if (tone === "error") node.classList.add("is-error");
  }

  function parseGvizTable(parsed) {
    var cols = ((parsed.table && parsed.table.cols) || []).map(function (col) { return col.label || col.id; });
    return ((parsed.table && parsed.table.rows) || []).map(function (row) {
      var record = {};
      var cells = row.c || [];
      cols.forEach(function (col, index) {
        var cell = cells[index];
        record[col] = cell ? clean(cell.f || cell.v || "") : "";
      });
      return record;
    });
  }

  function fetchSheetRowsViaScript(sheetName) {
    return new Promise(function (resolve, reject) {
      var callbackName = "rankforgeExportCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
      var script = document.createElement("script");
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("Timeout loading " + sheetName));
      }, 15000);

      function cleanup() {
        window.clearTimeout(timeout);
        script.remove();
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      }

      window[callbackName] = function (parsed) {
        try {
          var rows = parseGvizTable(parsed);
          cleanup();
          resolve(rows);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      var url = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) +
        "/gviz/tq?sheet=" + encodeURIComponent(sheetName) +
        "&tqx=responseHandler:" + encodeURIComponent(callbackName);
      script.src = url;
      script.async = true;
      script.onerror = function () {
        cleanup();
        reject(new Error("Script load failed for " + sheetName));
      };
      document.body.appendChild(script);
    });
  }

  async function fetchSheetRows(sheetName) {
    var url = "https://docs.google.com/spreadsheets/d/" + encodeURIComponent(SHEET_ID) +
      "/gviz/tq?sheet=" + encodeURIComponent(sheetName) + "&tqx=out:json";
    try {
      var response = await fetch(url, { headers: { Accept: "text/plain, application/json, */*" }, cache: "no-store" });
      if (!response.ok) throw new Error("Fetch failed");
      var text = await response.text();
      var cleaned = text.replace(/^[\s\S]*?setResponse\(/, "").replace(/\);\s*$/, "");
      return parseGvizTable(JSON.parse(cleaned));
    } catch (error) {
      return fetchSheetRowsViaScript(sheetName);
    }
  }

  async function fetchAllSheets() {
    var names = ["searches", "raw_prospects", "seo_audits", "contacts", "final_leads"];
    var results = await Promise.all(names.map(async function (name) {
      try { return [name, await fetchSheetRows(name)]; }
      catch (error) { return [name, []]; }
    }));
    var data = {};
    results.forEach(function (pair) { data[pair[0]] = pair[1]; });
    return data;
  }

  function domainFromUrl(value) {
    try {
      var raw = clean(value);
      if (!raw) return "";
      if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
      return new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
    } catch (e) {
      return "";
    }
  }

  function companyKey(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function humanize(value) {
    var text = clean(value);
    if (!text) return "";
    var dictionary = {
      "high_seo_need_contact_missing": "Strong SEO opportunity, but direct email is missing",
      "website_access_issue": "Website access or crawl quality issue detected",
      "local_seo_opportunity_audit": "Local SEO Opportunity Audit",
      "review_needed": "Review Needed",
      "qualified": "Qualified",
      "rejected": "Rejected",
      "phone": "Phone",
      "email": "Email",
      "manual_review": "Manual Review"
    };
    if (dictionary[text]) return dictionary[text];
    return text.replace(/_/g, " ").replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function bestBy(list, predicate) {
    return (list || []).find(predicate) || {};
  }

  function buildLookups(data) {
    var rawByProspect = {};
    var rawByDomain = {};
    var rawByRootDomain = {};
    var rawByCompany = {};
    var rawBySearchCompany = {};
    (data.raw_prospects || []).forEach(function (row) {
      var prospectId = clean(row.prospect_id);
      var domain = key(row.domain || domainFromUrl(row.website_url));
      var root = key(row.root_domain || domain);
      var company = companyKey(row.company_name);
      var search = clean(row.search_id);
      if (prospectId) rawByProspect[prospectId] = row;
      if (domain) rawByDomain[domain] = row;
      if (root) rawByRootDomain[root] = row;
      if (company) rawByCompany[company] = row;
      if (search && company) rawBySearchCompany[search + "|" + company] = row;
    });

    var contactById = {};
    var contactByProspect = {};
    (data.contacts || []).forEach(function (row) {
      var contactId = clean(row.contact_id);
      var prospectId = clean(row.prospect_id);
      if (contactId) contactById[contactId] = row;
      if (prospectId && !contactByProspect[prospectId]) contactByProspect[prospectId] = row;
    });

    var auditById = {};
    var auditByProspect = {};
    (data.seo_audits || []).forEach(function (row) {
      var auditId = clean(row.audit_id);
      var prospectId = clean(row.prospect_id);
      if (auditId) auditById[auditId] = row;
      if (prospectId && !auditByProspect[prospectId]) auditByProspect[prospectId] = row;
    });

    var searchById = {};
    (data.searches || []).forEach(function (row) {
      var searchId = clean(row.search_id);
      if (searchId) searchById[searchId] = row;
    });

    return { rawByProspect, rawByDomain, rawByRootDomain, rawByCompany, rawBySearchCompany, contactById, contactByProspect, auditById, auditByProspect, searchById };
  }

  function pickContact(lead, raw, contact, audit) {
    var email = clean(raw.raw_email) ||
      clean(lead.decision_maker_email) ||
      clean(contact.email) ||
      clean(audit.homepage_primary_email) ||
      clean(audit.contact_primary_email) ||
      "";

    var phone = clean(raw.raw_phone) ||
      clean(raw.place_phone) ||
      clean(lead.decision_maker_phone) ||
      clean(contact.phone) ||
      clean(audit.homepage_primary_phone) ||
      clean(audit.contact_primary_phone) ||
      "";

    var source = clean(raw.raw_contact_source) ||
      clean(lead.contact_source) ||
      clean(contact.contact_source) ||
      clean(audit.contact_source) ||
      (email ? "website_email" : "") ||
      (phone ? "phone_fallback" : "");

    var evidence = clean(raw.raw_contact_evidence_url) ||
      clean(lead.contact_evidence_url) ||
      clean(contact.contact_evidence_url) ||
      clean(audit.contact_page_candidate) ||
      clean(raw.website_url) ||
      clean(lead.website_url) ||
      "";

    return { email: email, phone: phone, source: source, evidence: evidence };
  }

  function enrichLead(lead, lookups) {
    var prospectId = clean(lead.prospect_id);
    var auditId = clean(lead.audit_id);
    var contactId = clean(lead.primary_contact_id);
    var searchId = clean(lead.search_id);
    var domain = key(lead.domain || domainFromUrl(lead.website_url));
    var root = domain;
    var company = companyKey(lead.company_name);

    var raw = lookups.rawByProspect[prospectId] ||
      lookups.rawBySearchCompany[searchId + "|" + company] ||
      lookups.rawByDomain[domain] ||
      lookups.rawByRootDomain[root] ||
      lookups.rawByCompany[company] ||
      {};

    var contact = lookups.contactById[contactId] || lookups.contactByProspect[prospectId] || {};
    var audit = lookups.auditById[auditId] || lookups.auditByProspect[prospectId] || {};
    var search = lookups.searchById[searchId] || {};

    var contactInfo = pickContact(lead, raw, contact, audit);

    return {
      "Company": clean(lead.company_name || raw.company_name || audit.company_name),
      "Website": clean(lead.website_url || raw.website_url || audit.website_url),
      "Domain": clean(lead.domain || raw.domain || audit.domain),
      "Email": contactInfo.email,
      "Phone": contactInfo.phone,
      "Contact Source": humanize(contactInfo.source),
      "Contact Evidence URL": contactInfo.evidence,
      "Status": humanize(lead.qualification_status || lead.status),
      "Lead Priority": humanize(lead.lead_priority),
      "SEO Need Score": num(lead.seo_need_score || audit.seo_need_score),
      "Commercial Fit Score": num(lead.commercial_fit_score || audit.commercial_fit_score),
      "Contact Confidence Score": num(lead.contact_confidence_score || contact.contact_confidence_score || raw.raw_contact_confidence),
      "Overall Lead Score": num(lead.overall_lead_score || lead.seo_need_score || audit.seo_need_score),
      "Primary Problem": humanize(lead.primary_problem),
      "Secondary Problem": humanize(lead.secondary_problem),
      "Qualification Reason": clean(lead.qualification_reason || audit.audit_summary),
      "Recommended Offer": humanize(lead.recommended_offer),
      "Recommended Channel": humanize(lead.recommended_channel || (contactInfo.email ? "email" : contactInfo.phone ? "phone" : "")),
      "Outreach Angle": clean(lead.outreach_angle || audit.recommended_outreach_angle),
      "First Line Personalization": clean(lead.first_line_personalization),
      "Next Action": clean(lead.next_action),
      "Paid Ads Detected": clean(lead.paid_ads_detected || audit.paid_ads_detected),
      "Paid Ads Fit Score": num(lead.paid_ads_fit_score || audit.paid_ads_fit_score),
      "Niche": clean(lead.niche || search.niche || raw.niche),
      "City": clean(lead.city || search.city || raw.city),
      "Country": clean(lead.country || search.country || raw.country),
      "Search ID": searchId,
      "Lead ID": clean(lead.lead_id),
      "Prospect ID": prospectId,
      "Audit ID": auditId,
      "Exported At": new Date().toISOString()
    };
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    var headers = Object.keys(rows[0]);
    var lines = [headers];
    rows.forEach(function (row) {
      lines.push(headers.map(function (header) {
        var value = String(row[header] == null ? "" : row[header]);
        return /[",\n\r]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
      }));
    });
    return lines.map(function (line) { return line.join(","); }).join("\n");
  }

  function download(filename, content) {
    var blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function slug(value) {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "rankforge_export";
  }

  async function exportProfessionalCsv() {
    updateStatus("Preparing professional export...", "");
    try {
      var data = await fetchAllSheets();
      var userId = currentUserId();
      var listId = selectedListId();

      if (!listId) {
        var firstSearch = (data.searches || []).find(function (row) { return clean(row.user_id || userId) === userId; }) || (data.searches || [])[0];
        listId = clean(firstSearch && firstSearch.search_id);
      }

      var lookups = buildLookups(data);
      var selectedSearch = lookups.searchById[listId] || {};

      var rows = (data.final_leads || [])
        .filter(function (lead) {
          if (listId && clean(lead.search_id) !== listId) return false;
          if (clean(lead.user_id || userId) !== userId) return false;
          return true;
        })
        .map(function (lead) { return enrichLead(lead, lookups); })
        .filter(function (row) { return clean(row.Email) || clean(row.Phone); });

      if (!rows.length) {
        updateStatus("No contact-ready leads found for export.", "error");
        return;
      }

      rows.sort(function (a, b) {
        return num(b["Overall Lead Score"]) - num(a["Overall Lead Score"]);
      });

      var csv = toCsv(rows);
      var name = slug(selectedSearch.search_name || selectedSearch.niche || listId || "rankforge_leads") + "_professional_export.csv";
      download(name, csv);
      updateStatus(rows.length + " contact-ready leads exported.", "success");
    } catch (error) {
      console.error("[RankForge Professional Export] failed", error);
      updateStatus("Professional export failed; using standard export.", "error");
      if (typeof originalExportCsv === "function") originalExportCsv();
    }
  }

  window.rankforgeProfessionalExport = exportProfessionalCsv;

  if (window.rankforgeApp) {
    window.rankforgeApp.exportCsv = exportProfessionalCsv;
  }
})();

(function () {
  "use strict";

  var STATE_KEY = "rankforge-clean-app-state-v1";
  var PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (["dashboard", "leads"].indexOf(PAGE) < 0) return;

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function humanize(value) {
    var text = clean(value);
    if (!text) return "";
    var dictionary = {
      high_seo_need: "high SEO need",
      competitive_local_opportunity: "competitive local opportunity",
      manual_review_needed: "manual review needed",
      local_seo_growth_audit: "local SEO growth audit",
      competitive_local_seo_audit: "competitive local SEO audit",
      direct_email: "direct email found",
      phone_only: "phone found",
      missing: "contact missing",
      ready: "ready for outreach",
      needs_review: "needs review",
      not_ready: "not ready"
    };
    return dictionary[text] || text.replace(/_/g, " ").replace(/\b\w/g, function (char) { return char.toUpperCase(); });
  }

  function shortText(value, max) {
    var text = clean(value).replace(/\s+/g, " ");
    if (!text) return "";
    return text.length > max ? text.slice(0, max - 1).trim() + "…" : text;
  }

  function getState() {
    return safeParse(localStorage.getItem(STATE_KEY), {}) || {};
  }

  function allLeadsById() {
    var state = getState();
    var remote = state.remoteCache && Array.isArray(state.remoteCache.leads) ? state.remoteCache.leads : [];
    var local = Array.isArray(state.localLeads) ? state.localLeads : [];
    var map = {};
    remote.concat(local).forEach(function (lead) {
      if (!lead) return;
      var id = clean(lead.id || lead.lead_id);
      if (id) map[id] = lead;
    });
    return map;
  }

  function buildReason(lead) {
    if (!lead) return "";
    var status = clean(lead.status || lead.qualification_status).toLowerCase();
    var problem = humanize(lead.primaryProblem || lead.primary_problem);
    var offer = humanize(lead.recommendedOffer || lead.recommended_offer);
    var reason = shortText(lead.whyItMatters || lead.qualification_reason, 118);
    var contact = humanize(lead.contactCoverage || lead.contact_coverage);
    var readiness = humanize(lead.outreachReadiness || lead.outreach_readiness);

    if (status === "qualified") {
      if (problem && offer) return "Qualified: " + problem + " · Offer: " + offer;
      if (reason) return "Qualified: " + reason;
      return "Qualified: reachable lead with meaningful SEO opportunity.";
    }

    if (status === "review_needed") {
      if (reason) return "Review needed: " + reason;
      if (problem) return "Review needed: " + problem + (offer ? " · Offer: " + offer : "");
      return "Review needed: valid signals found, manual check recommended.";
    }

    if (status === "rejected") {
      var rejection = shortText(lead.rejectionReason || lead.rejection_reason || reason, 118);
      return rejection ? "Rejected: " + rejection : "Rejected: did not meet quality rules.";
    }

    var parts = [];
    if (problem) parts.push("Issue: " + problem);
    if (offer) parts.push("Offer: " + offer);
    if (contact) parts.push(contact);
    if (readiness) parts.push(readiness);
    return parts.join(" · ") || reason;
  }

  function enhanceRows() {
    var table = document.getElementById("leadsTable");
    if (!table) return;
    var map = allLeadsById();
    table.querySelectorAll("tbody tr[data-lead-id]").forEach(function (row) {
      var firstCell = row.querySelector("td:first-child");
      if (!firstCell) return;
      var leadId = clean(row.dataset.leadId);
      var lead = map[leadId];
      var text = buildReason(lead);
      var existing = firstCell.querySelector(".lead-quality-reason");
      if (!text) {
        if (existing) existing.remove();
        return;
      }
      if (!existing) {
        existing = document.createElement("div");
        existing.className = "lead-quality-reason";
        firstCell.appendChild(existing);
      }
      existing.textContent = text;
    });
  }

  function installStyles() {
    if (document.getElementById("leadQualityReasonStyles")) return;
    var style = document.createElement("style");
    style.id = "leadQualityReasonStyles";
    style.textContent = [
      ".lead-quality-reason{margin-top:6px;color:#667085;font-size:12px;line-height:1.45;max-width:360px;}",
      ".app-page-dashboard .lead-quality-reason{max-width:420px;}",
      ".lead-quality-reason::before{content:'Quality note';display:inline-flex;margin-right:6px;padding:2px 6px;border-radius:999px;background:rgba(21,94,239,.08);color:#155eef;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;vertical-align:1px;}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    enhanceRows();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();

  var timerCount = 0;
  var timer = window.setInterval(function () {
    timerCount += 1;
    install();
    if (timerCount > 20) window.clearInterval(timer);
  }, 700);

  var tableObserver = new MutationObserver(function () { install(); });
  window.setTimeout(function () {
    var table = document.getElementById("leadsTable");
    if (table) tableObserver.observe(table, { childList: true, subtree: true });
  }, 500);
})();

(function () {
  "use strict";

  var PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "lead-detail") return;

  var STATE_KEY = "rankforge-clean-app-state-v1";
  var SELECTED_LEAD_KEY = "rankforge-selected-lead-id-v1";
  var lastRenderedLeadId = "";

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function numberValue(value) {
    var n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function humanize(value) {
    var text = clean(value);
    if (!text) return "";
    var dictionary = {
      high_seo_need: "high SEO need",
      competitive_local_opportunity: "competitive local opportunity",
      paid_ads_without_strong_seo_foundation: "paid ads without a strong SEO foundation",
      competitive_local_market: "competitive local market",
      manual_review_needed: "manual review needed",
      local_seo_growth_audit: "local SEO growth audit",
      competitive_local_seo_audit: "competitive local SEO audit",
      local_seo_audit: "local SEO audit",
      start_outreach: "start outreach",
      manual_review: "manual review",
      reject: "reject",
      direct_email: "direct email found",
      phone_only: "phone path found",
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

  function getRequestedLeadId() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var fromUrl = clean(params.get("lead_id") || "");
      if (fromUrl) return fromUrl;
    } catch (error) {}

    try {
      var fromSession = clean(sessionStorage.getItem(SELECTED_LEAD_KEY) || "");
      if (fromSession) return fromSession;
    } catch (error) {}

    try {
      var fromLocal = clean(localStorage.getItem(SELECTED_LEAD_KEY) || "");
      if (fromLocal) return fromLocal;
    } catch (error) {}

    return clean(getState().selectedLeadId || "");
  }

  function getAllLeads() {
    var state = getState();
    var remote = state.remoteCache && Array.isArray(state.remoteCache.leads) ? state.remoteCache.leads : [];
    var local = Array.isArray(state.localLeads) ? state.localLeads : [];
    return remote.concat(local).filter(Boolean);
  }

  function getSelectedLead() {
    var requestedLeadId = getRequestedLeadId();
    var leads = getAllLeads();
    if (requestedLeadId) {
      var exact = leads.find(function (lead) { return clean(lead.id || lead.lead_id) === requestedLeadId; });
      if (exact) return exact;
    }

    var companyName = clean(document.getElementById("detailCompany") && document.getElementById("detailCompany").textContent);
    if (companyName && companyName !== "No lead selected") {
      var byCompany = leads.find(function (lead) {
        return clean(lead.company || lead.company_name).toLowerCase() === companyName.toLowerCase();
      });
      if (byCompany) return byCompany;
    }

    return null;
  }

  function getLeadField(lead, camelName, snakeName) {
    return clean(lead && (lead[camelName] != null ? lead[camelName] : lead[snakeName]));
  }

  function scoreBand(score) {
    if (score >= 80) return "high";
    if (score >= 60) return "solid";
    if (score >= 40) return "moderate";
    return "low";
  }

  function contactSummary(lead) {
    var email = getLeadField(lead, "email", "decision_maker_email");
    var phone = getLeadField(lead, "phone", "decision_maker_phone");
    if (email && phone) return "The lead has both email and phone paths, which makes it easier to validate before outreach.";
    if (email) return "The lead has a direct email path, so it can be reviewed for outreach without relying only on phone follow-up.";
    if (phone) return "The lead has a phone path, but no email is available yet, so it is better suited for review or call-first outreach.";
    return "No usable email or phone is currently attached, so this should not be treated as outreach-ready.";
  }

  function statusSummary(status) {
    if (status === "qualified") return "This lead is strong enough to consider for outreach, but the pitch should still reference the visible SEO issue rather than using a generic sales message.";
    if (status === "review_needed") return "This is a review candidate, not an automatic outreach target. The signals are useful, but an operator should confirm fit before pitching.";
    if (status === "rejected") return "This lead is not recommended for normal outreach under the current quality rules.";
    return "This lead should be reviewed using the contact path, SEO need, and commercial fit together.";
  }

  function buildExplanation(lead) {
    var status = getLeadField(lead, "status", "qualification_status").toLowerCase() || "review_needed";
    var seo = numberValue(lead.seoScore || lead.seo_need_score);
    var overall = numberValue(lead.overallScore || lead.overall_lead_score);
    var commercial = numberValue(lead.commercialFit || lead.commercial_fit_score);
    var contactConfidence = numberValue(lead.contactConfidence || lead.contact_confidence_score);
    var problem = humanize(getLeadField(lead, "primaryProblem", "primary_problem"));
    var secondary = humanize(getLeadField(lead, "secondaryProblem", "secondary_problem"));
    var offer = humanize(getLeadField(lead, "recommendedOffer", "recommended_offer"));
    var channel = humanize(getLeadField(lead, "recommendedChannel", "recommended_channel"));
    var reason = shortText(getLeadField(lead, "whyItMatters", "qualification_reason"), 180);
    var value = shortText(getLeadField(lead, "valueHypothesis", "client_value_hypothesis"), 160);
    var paidAds = String(lead.paidAdsDetected || lead.paid_ads_detected || "").toLowerCase() === "true";
    var rejectedReason = shortText(getLeadField(lead, "rejectionReason", "rejection_reason"), 160);

    var intro = "";
    if (status === "qualified") {
      intro = "This looks like a practical outreach candidate because the account combines reachability with enough SEO and commercial signal to justify a focused review.";
    } else if (status === "review_needed") {
      intro = "This is worth checking manually before outreach. It has useful opportunity signals, but the data is not strong enough to treat it as fully sales-ready yet.";
    } else if (status === "rejected") {
      intro = "This lead is currently filtered out by the quality rules" + (rejectedReason ? ": " + rejectedReason + "." : ".");
    } else {
      intro = "This lead should be judged by its SEO need, contact path, and commercial fit rather than by company name alone.";
    }

    var bullets = [];
    if (seo) bullets.push("SEO need is " + scoreBand(seo) + " (" + seo + "/100), so the opportunity should be framed around a specific search visibility gap.");
    if (overall) bullets.push("Overall lead score is " + scoreBand(overall) + " (" + overall + "/100), which helps prioritize it against the rest of the batch.");
    if (commercial) bullets.push("Commercial fit is " + scoreBand(commercial) + " (" + commercial + "/100), so the account should be evaluated for likely service value before outreach.");
    if (contactConfidence) bullets.push("Contact confidence is " + scoreBand(contactConfidence) + " (" + contactConfidence + "/100). " + contactSummary(lead));
    else bullets.push(contactSummary(lead));
    if (problem) bullets.push("Primary issue: " + problem + "." + (secondary ? " Secondary signal: " + secondary + "." : ""));
    if (offer) bullets.push("Recommended offer: " + offer + (channel ? " via " + channel + "." : "."));
    if (paidAds) bullets.push("Paid ads were detected, which may indicate budget exists, but it should not be treated as proof that SEO is already solved.");
    if (value) bullets.push("Value hypothesis: " + value);
    if (reason && status !== "rejected") bullets.push("Qualification note: " + reason);

    return {
      status: status,
      intro: intro,
      bullets: bullets.slice(0, 6),
      verdict: statusSummary(status)
    };
  }

  function ensurePanel() {
    var scoringSection = document.querySelector(".detail-score-grid") || document.getElementById("detailReason");
    var mainPanel = document.querySelector(".detail-grid-single article.panel") || document.querySelector("main");
    if (!mainPanel) return null;

    var existing = document.getElementById("rfLeadDetailQualityPanel");
    if (existing) return existing;

    var section = document.createElement("section");
    section.id = "rfLeadDetailQualityPanel";
    section.className = "detail-section rf-lead-detail-quality";
    section.innerHTML = [
      '<div class="detail-section-head"><div><p class="panel-eyebrow">Lead Quality Explanation</p><h3>Why this lead?</h3></div></div>',
      '<div class="rf-lead-quality-card">',
      '<p class="rf-lead-quality-intro">Select a lead to generate a quality explanation.</p>',
      '<ul class="rf-lead-quality-list"></ul>',
      '<p class="rf-lead-quality-verdict"></p>',
      '</div>'
    ].join("");

    var scoringParent = scoringSection && scoringSection.closest ? scoringSection.closest(".detail-section") : null;
    if (scoringParent && scoringParent.parentNode) {
      scoringParent.insertAdjacentElement("afterend", section);
    } else {
      mainPanel.appendChild(section);
    }
    return section;
  }

  function installStyles() {
    if (document.getElementById("rfLeadDetailQualityStyles")) return;
    var style = document.createElement("style");
    style.id = "rfLeadDetailQualityStyles";
    style.textContent = [
      ".rf-lead-detail-quality{scroll-margin-top:24px;}",
      ".rf-lead-quality-card{display:grid;gap:14px;padding:18px;border:1px solid rgba(21,94,239,.16);border-radius:22px;background:linear-gradient(135deg,rgba(21,94,239,.07),rgba(13,148,136,.05)),#fff;}",
      ".rf-lead-quality-intro{margin:0;color:#344054;font-size:15px;line-height:1.65;}",
      ".rf-lead-quality-list{display:grid;gap:10px;margin:0;padding:0;list-style:none;}",
      ".rf-lead-quality-list li{position:relative;padding-left:20px;color:#475467;font-size:13px;line-height:1.55;}",
      ".rf-lead-quality-list li::before{content:'';position:absolute;left:0;top:.65em;width:7px;height:7px;border-radius:999px;background:#155eef;}",
      ".rf-lead-quality-verdict{margin:0;padding-top:12px;border-top:1px solid rgba(15,23,42,.08);color:#0f172a;font-size:13px;font-weight:750;line-height:1.55;}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function render() {
    installStyles();
    var lead = getSelectedLead();
    var panel = ensurePanel();
    if (!panel) return;

    if (!lead) {
      panel.querySelector(".rf-lead-quality-intro").textContent = "Select a lead to see a practical quality explanation.";
      panel.querySelector(".rf-lead-quality-list").innerHTML = "";
      panel.querySelector(".rf-lead-quality-verdict").textContent = "";
      return;
    }

    var leadId = clean(lead.id || lead.lead_id);
    var explanation = buildExplanation(lead);
    var signature = leadId + "|" + explanation.intro + "|" + explanation.bullets.join("|") + "|" + explanation.verdict;
    if (signature === lastRenderedLeadId) return;
    lastRenderedLeadId = signature;

    panel.querySelector(".rf-lead-quality-intro").textContent = explanation.intro;
    panel.querySelector(".rf-lead-quality-list").innerHTML = explanation.bullets.map(function (item) {
      return "<li>" + item.replace(/[&<>]/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]; }) + "</li>";
    }).join("");
    panel.querySelector(".rf-lead-quality-verdict").textContent = explanation.verdict;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();

  var count = 0;
  var timer = window.setInterval(function () {
    count += 1;
    render();
    if (count >= 10) window.clearInterval(timer);
  }, 900);
})();

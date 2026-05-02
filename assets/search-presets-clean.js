(function () {
  "use strict";

  var PAGE = document.body && document.body.dataset ? document.body.dataset.page : "";
  if (PAGE !== "dashboard") return;

  var activePreset = null;
  var createPatched = false;
  var PRESETS = [
    { label: "Restoration", badge: "High value", searchName: "Restoration Companies", niche: "restoration", businessType: "water damage restoration company", city: "Miami", country: "United States", seo: 65, lead: 70 },
    { label: "Roofing", badge: "Local service", searchName: "Roofing Contractors", niche: "roof repair", businessType: "roofing contractor", city: "Dallas", country: "United States", seo: 60, lead: 70 },
    { label: "Dental", badge: "Clinic", searchName: "Dental Clinics", niche: "dentist", businessType: "dental clinic", city: "Miami", country: "United States", seo: 60, lead: 70 },
    { label: "HVAC", badge: "Emergency", searchName: "HVAC Repair Companies", niche: "hvac repair", businessType: "HVAC contractor", city: "Austin", country: "United States", seo: 60, lead: 70 },
    { label: "Plumbing", badge: "Emergency", searchName: "Plumbing Companies", niche: "plumber", businessType: "plumbing company", city: "Phoenix", country: "United States", seo: 60, lead: 70 },
    { label: "Law Firms", badge: "High CPC", searchName: "Personal Injury Law Firms", niche: "personal injury lawyer", businessType: "law firm", city: "Miami", country: "United States", seo: 65, lead: 75 },
    { label: "Med Spa", badge: "Premium local", searchName: "Med Spas", niche: "med spa", businessType: "medical spa", city: "Los Angeles", country: "United States", seo: 60, lead: 70 },
    { label: "Pest Control", badge: "Local service", searchName: "Pest Control Companies", niche: "pest control", businessType: "pest control company", city: "Orlando", country: "United States", seo: 60, lead: 70 }
  ];

  function $(id) { return document.getElementById(id); }
  function clean(value) { return String(value || "").trim(); }
  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; } }

  function session() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") return window.rankforgeAuth.getSession();
    return safeParse(localStorage.getItem("rankforge-auth-session-v1"), null);
  }

  function currentUserId() {
    var currentSession = session();
    return clean(currentSession && currentSession.userId) || clean(localStorage.getItem("rankforge-current-user-id-v1"));
  }

  function searchUsage() {
    var state = safeParse(localStorage.getItem("rankforge-clean-app-state-v1"), {}) || {};
    var lists = [];
    if (Array.isArray(state.localLists)) lists.push.apply(lists, state.localLists);
    if (state.remoteCache && Array.isArray(state.remoteCache.lists)) lists.push.apply(lists, state.remoteCache.lists);
    var userId = currentUserId();
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    var ids = {};
    var total = 0;
    lists.forEach(function (item) {
      if (!item) return;
      if (userId && clean(item.userId || item.user_id) !== userId) return;
      var stamp = new Date(item.lastRun || item.created_at || item.createdAt || item.updated_at || "").getTime();
      if (!Number.isFinite(stamp) || stamp < monthStart) return;
      var key = clean(item.id || item.search_id);
      if (!key || ids[key]) return;
      ids[key] = true;
      total += 1;
    });
    return total;
  }

  async function planInfo() {
    if (window.rankforgeMvpCreditSystem && typeof window.rankforgeMvpCreditSystem.planInfo === "function") {
      return window.rankforgeMvpCreditSystem.planInfo({ force: true });
    }
    return {
      key: "starter",
      name: "Starter",
      limit: 3,
      leadLimit: 50,
      maxLeadsPerBatch: 25,
      label: "3 search batches/month",
      usage: {
        searchesThisMonth: searchUsage(),
        qualifiedLeadsThisMonth: 0,
        remainingSearches: Math.max(0, 3 - searchUsage()),
        remainingQualifiedLeadCredits: 50
      }
    };
  }

  function setValue(id, value) {
    var node = $(id);
    if (!node) return;
    node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function loc(preset) {
    return {
      city: clean(document.querySelector(".rf-clean-preset-city") && document.querySelector(".rf-clean-preset-city").value) || preset.city,
      country: clean(document.querySelector(".rf-clean-preset-country") && document.querySelector(".rf-clean-preset-country").value) || preset.country
    };
  }

  function ensurePlanUsage() {
    var form = $("quickCreateForm");
    if (!form) return;
    var box = form.querySelector(".rf-plan-usage-warning");
    if (!box) {
      box = document.createElement("div");
      box.className = "rf-plan-usage-warning";
      box.innerHTML = '<span class="rf-plan-usage-label">Plan usage</span><strong class="rf-plan-usage-title">Checking usage…</strong><small class="rf-plan-usage-copy">Loading current plan limits…</small>';
      form.insertBefore(box, form.firstChild);
    }
  }

  async function updatePlanUsage() {
    var box = document.querySelector(".rf-plan-usage-warning");
    if (!box) return;
    var info = await planInfo();
    var used = searchUsage();
    var remaining = Math.max(0, (info.limit >= 9999 ? info.limit : info.limit) - used);
    box.classList.remove("is-warning", "is-over", "is-admin");

    var title = info.name + ": " + used + " / " + (info.limit >= 9999 ? "∞" : info.limit) + " search batches this month";
    var copy = info.label + ". Max " + info.maxLeadsPerBatch + " leads per batch.";

    if (info.limit >= 9999) {
      box.classList.add("is-admin");
      title = info.name + ": unlimited internal access";
      copy = "Admin or admin-managed access is active. Search guard and batch size follow the resolved profile.";
    } else if (used >= info.limit) {
      box.classList.add("is-over");
      copy = "You have reached the resolved monthly search limit. Create Search is now blocked until limits change.";
    } else if (used >= Math.max(1, info.limit - 1)) {
      box.classList.add("is-warning");
      copy = remaining + " search batch remaining this month. Max " + info.maxLeadsPerBatch + " leads per batch.";
    }

    box.querySelector(".rf-plan-usage-title").textContent = title;
    box.querySelector(".rf-plan-usage-copy").textContent = copy;
  }

  function ensureOptions() {
    var form = $("quickCreateForm");
    if (!form || form.querySelector(".rf-search-quality-options")) return;
    var status = $("createSearchStatus");
    var box = document.createElement("div");
    box.className = "rf-search-quality-options";
    box.innerHTML = '<label><span>Max Leads Requested</span><input id="maxResultsInput" type="number" min="5" max="50" step="1" value="50"></label><label><span>Contact Requirement</span><select id="contactRequirementInput"><option value="either">Email or phone</option><option value="email">Email required</option><option value="phone">Phone required</option><option value="any">Any contact path</option></select></label><label class="rf-search-option-toggle"><input id="excludeChainsInput" type="checkbox" checked><span>Exclude chains / franchises</span></label>';
    if (status) form.insertBefore(box, status);
    else form.appendChild(box);
  }

  async function applyProfileLimitsToForm() {
    var input = $("maxResultsInput");
    if (!input) return;
    var info = await planInfo();
    var maxLeads = Math.max(5, Number(info.maxLeadsPerBatch || 50));
    input.max = String(maxLeads);
    if (Number(input.value || 0) > maxLeads) input.value = String(maxLeads);
  }

  function ensureBridge() {
    var form = $("quickCreateForm");
    if (!form || form.querySelector(".rf-active-preset-bridge")) return;
    var bridge = document.createElement("div");
    bridge.className = "rf-active-preset-bridge";
    bridge.hidden = true;
    bridge.innerHTML = '<div><span class="rf-active-preset-label">Preset selected</span><strong class="rf-active-preset-name">No preset selected</strong><small class="rf-active-preset-meta">Choose a preset below to fill this form faster.</small></div><button class="rf-active-preset-clear" type="button">Clear preset</button>';
    bridge.querySelector("button").addEventListener("click", function () {
      activePreset = null;
      bridge.hidden = true;
      cards();
      var status = document.querySelector(".rf-clean-presets-status");
      if (status) status.textContent = "Preset cleared. You can edit the Create Search form manually.";
    });
    form.insertBefore(bridge, form.firstChild);
  }

  function ensureProgress() {
    var hero = document.querySelector(".create-search-top");
    if (!hero) return null;
    var panel = document.querySelector(".rf-search-progress-panel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.className = "rf-search-progress-panel";
    panel.hidden = true;
    panel.innerHTML = '<div class="rf-search-progress-copy"><span class="rf-search-progress-kicker">Search running</span><strong class="rf-search-progress-title">Search started</strong><p class="rf-search-progress-body">We are finding businesses, checking websites, and looking for contact paths. New leads will appear automatically as they are found.</p><small class="rf-search-progress-meta"></small></div><div class="rf-search-progress-actions"><button class="rf-search-progress-button" type="button">Sync now</button><a class="rf-search-progress-link" href="#savedListsTable">View latest results</a></div>';
    panel.querySelector("button").addEventListener("click", function () {
      if (window.rankforgeApp && window.rankforgeApp.sync) window.rankforgeApp.sync();
      setTimeout(updatePlanUsage, 1200);
    });
    panel.querySelector("a").addEventListener("click", function (event) {
      event.preventDefault();
      var target = $("savedListsTable") || $("leadsTable");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    hero.insertAdjacentElement("afterend", panel);
    return panel;
  }

  function showProgress() {
    var panel = ensureProgress();
    if (!panel) return;
    var name = clean($("searchNameInput") && $("searchNameInput").value) || "Search batch";
    var city = clean($("cityInput") && $("cityInput").value);
    var country = clean($("countryInput") && $("countryInput").value);
    var max = clean($("maxResultsInput") && $("maxResultsInput").value) || "50";
    var ruleNode = $("contactRequirementInput");
    var rule = ruleNode && ruleNode.selectedOptions && ruleNode.selectedOptions[0] ? ruleNode.selectedOptions[0].textContent : "Email or phone";
    panel.hidden = false;
    panel.querySelector(".rf-search-progress-title").textContent = name + " is running";
    panel.querySelector(".rf-search-progress-meta").textContent = (([city, country].filter(Boolean).join(", ")) || "Selected market") + " · " + max + " leads requested · " + rule;
    var status = $("createSearchStatus");
    if (status) status.textContent = "Search started. New leads will appear automatically as they are found.";
    setTimeout(function () { panel.scrollIntoView({ behavior: "smooth", block: "center" }); }, 200);
    setTimeout(updatePlanUsage, 1200);
  }

  function patchCreate() {
    if (createPatched || !window.rankforgeApp || typeof window.rankforgeApp.createSearch !== "function") return;
    var original = window.rankforgeApp.createSearch;
    window.rankforgeApp.createSearch = async function () {
      await updatePlanUsage();
      var result = await original.apply(this, arguments);
      showProgress();
      return result;
    };
    createPatched = true;
  }

  function cards() {
    Array.prototype.forEach.call(document.querySelectorAll(".rf-clean-preset-card"), function (card) {
      var active = activePreset && card.dataset.presetLabel === activePreset.label;
      card.classList.toggle("is-selected", Boolean(active));
      card.setAttribute("aria-pressed", active ? "true" : "false");
      var status = card.querySelector(".rf-clean-preset-selected");
      if (status) status.textContent = active ? "Selected" : "Apply preset";
    });
  }

  function updateBridge(preset, city, country) {
    ensureBridge();
    var bridge = document.querySelector(".rf-active-preset-bridge");
    if (!bridge) return;
    bridge.hidden = false;
    bridge.querySelector(".rf-active-preset-name").textContent = "Using preset: " + preset.label;
    bridge.querySelector(".rf-active-preset-meta").textContent = (city || "No city") + ", " + (country || "No country") + " · " + preset.businessType;
  }

  function applyPreset(preset, options) {
    activePreset = preset;
    var location = loc(preset);
    setValue("searchNameInput", location.city ? location.city + " " + preset.searchName : preset.searchName);
    setValue("nicheInput", preset.niche);
    setValue("businessTypeInput", preset.businessType);
    setValue("cityInput", location.city);
    setValue("countryInput", location.country);
    setValue("seoThresholdInput", preset.seo);
    setValue("leadThresholdInput", preset.lead);
    updateBridge(preset, location.city, location.country);
    cards();
    var status = document.querySelector(".rf-clean-presets-status");
    if (status) status.textContent = preset.label + " preset applied to the form above. Review the city, country, lead count, contact rule, and thresholds.";
    var createStatus = $("createSearchStatus");
    if (createStatus) createStatus.textContent = preset.label + " preset applied. Confirm the search options and create the search batch.";
    if (!options || !options.skipFocus) {
      var focusTarget = $("cityInput") || $("searchNameInput");
      if (focusTarget && focusTarget.focus) focusTarget.focus({ preventScroll: true });
    }
  }

  function bindOverrides() {
    Array.prototype.forEach.call(document.querySelectorAll(".rf-clean-preset-city,.rf-clean-preset-country"), function (input) {
      if (input.dataset.rfPresetBound === "true") return;
      input.dataset.rfPresetBound = "true";
      input.addEventListener("input", function () {
        if (activePreset) applyPreset(activePreset, { skipFocus: true });
      });
    });
  }

  function mount() {
    ensureBridge();
    ensurePlanUsage();
    ensureOptions();
    ensureProgress();
    applyProfileLimitsToForm();
    patchCreate();

    if (document.querySelector(".rf-clean-presets")) {
      bindOverrides();
      cards();
      updatePlanUsage();
      return;
    }

    var hero = document.querySelector(".create-search-top");
    var form = $("quickCreateForm");
    if (!hero || !form) return;

    var section = document.createElement("section");
    section.className = "rf-clean-presets";
    section.innerHTML = '<div class="rf-clean-presets-head"><div><p class="panel-eyebrow">Search presets</p><h2>Start with a proven local SEO category.</h2><p>Pick a template below. It fills the Create Search form above, then you only adjust the location, lead count, contact rule, and thresholds.</p></div><div class="rf-clean-presets-location"><label><span>City / metro override</span><input class="rf-clean-preset-city" type="text" placeholder="e.g. Miami"></label><label><span>Country override</span><input class="rf-clean-preset-country" type="text" placeholder="e.g. United States"></label></div></div><div class="rf-clean-preset-grid"></div><p class="rf-clean-presets-status">Choose a preset to fill the Create Search form above.</p>';

    var grid = section.querySelector(".rf-clean-preset-grid");
    PRESETS.forEach(function (preset) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "rf-clean-preset-card";
      button.dataset.presetLabel = preset.label;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = "<span>" + preset.badge + "</span><strong>" + preset.label + "</strong><small>" + preset.businessType + "</small><em class=\"rf-clean-preset-selected\">Apply preset</em>";
      button.addEventListener("click", function () { applyPreset(preset); });
      grid.appendChild(button);
    });

    var progress = document.querySelector(".rf-search-progress-panel");
    if (progress) progress.insertAdjacentElement("afterend", section);
    else hero.insertAdjacentElement("afterend", section);

    bindOverrides();
    updatePlanUsage();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  var tries = 0;
  var timer = setInterval(function () {
    tries += 1;
    mount();
    if (document.querySelector(".rf-clean-presets") || tries > 10) clearInterval(timer);
  }, 500);
})();

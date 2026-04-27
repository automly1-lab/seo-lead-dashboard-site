/* RankForge clean search presets - works with top Create Search section */
(function () {
  const PAGE = document.body?.dataset?.page || "";
  let activePreset = null;
  let payloadPatched = false;

  const PRESETS = [
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

  function setValue(id, value) {
    const node = $(id);
    if (!node) return;
    node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function currentLocationForPreset(preset) {
    const cityOverride = document.querySelector(".rf-clean-preset-city")?.value.trim();
    const countryOverride = document.querySelector(".rf-clean-preset-country")?.value.trim();
    return { city: cityOverride || preset.city, country: countryOverride || preset.country };
  }

  function updateSelectedCards() {
    document.querySelectorAll(".rf-clean-preset-card").forEach((card) => {
      const isSelected = activePreset && card.dataset.presetLabel === activePreset.label;
      card.classList.toggle("is-selected", Boolean(isSelected));
      card.setAttribute("aria-pressed", isSelected ? "true" : "false");
      const badge = card.querySelector(".rf-clean-preset-selected");
      if (badge) badge.textContent = isSelected ? "Selected" : "Apply preset";
    });
  }

  function ensureSearchOptions() {
    const form = document.getElementById("quickCreateForm");
    if (!form || form.querySelector(".rf-search-quality-options")) return;
    const status = document.getElementById("createSearchStatus");
    const options = document.createElement("div");
    options.className = "rf-search-quality-options";
    options.innerHTML = `
      <label><span>Max Leads Requested</span><input id="maxResultsInput" type="number" min="5" max="250" step="5" value="50"></label>
      <label><span>Contact Requirement</span><select id="contactRequirementInput"><option value="either">Email or phone</option><option value="email">Email required</option><option value="phone">Phone required</option><option value="any">Any contact path</option></select></label>
      <label class="rf-search-option-toggle"><input id="excludeChainsInput" type="checkbox" checked><span>Exclude chains / franchises</span></label>
    `;
    if (status) form.insertBefore(options, status);
    else form.appendChild(options);
  }

  function patchSearchPayload() {
    if (payloadPatched || typeof window.buildSearchPayload !== "function") return;
    const originalBuildSearchPayload = window.buildSearchPayload;
    window.buildSearchPayload = function () {
      const payload = originalBuildSearchPayload();
      payload.max_results_requested = String(document.getElementById("maxResultsInput")?.value || 50);
      payload.contact_requirement = document.getElementById("contactRequirementInput")?.value || "either";
      payload.exclude_chains_franchises = document.getElementById("excludeChainsInput")?.checked ? "true" : "false";
      return payload;
    };
    payloadPatched = true;
  }

  function ensurePresetBridge() {
    const form = document.getElementById("quickCreateForm");
    if (!form || form.querySelector(".rf-active-preset-bridge")) return;
    const bridge = document.createElement("div");
    bridge.className = "rf-active-preset-bridge";
    bridge.hidden = true;
    bridge.innerHTML = `<div><span class="rf-active-preset-label">Preset selected</span><strong class="rf-active-preset-name">No preset selected</strong><small class="rf-active-preset-meta">Choose a preset below to fill this form faster.</small></div><button class="rf-active-preset-clear" type="button">Clear preset</button>`;
    bridge.querySelector(".rf-active-preset-clear").addEventListener("click", () => {
      activePreset = null;
      bridge.hidden = true;
      updateSelectedCards();
      const status = document.querySelector(".rf-clean-presets-status");
      if (status) status.textContent = "Preset cleared. You can edit the Create Search form manually.";
    });
    form.insertBefore(bridge, form.firstChild);
  }

  function updatePresetBridge(preset, city, country) {
    ensurePresetBridge();
    const bridge = document.querySelector(".rf-active-preset-bridge");
    if (!bridge) return;
    bridge.hidden = false;
    bridge.querySelector(".rf-active-preset-name").textContent = `Using preset: ${preset.label}`;
    bridge.querySelector(".rf-active-preset-meta").textContent = `${city || "No city"}, ${country || "No country"} · ${preset.businessType}`;
  }

  function applyPreset(preset, options) {
    const shouldFocus = !(options && options.skipFocus);
    activePreset = preset;
    const { city, country } = currentLocationForPreset(preset);
    setValue("searchNameInput", city ? `${city} ${preset.searchName}` : preset.searchName);
    setValue("nicheInput", preset.niche);
    setValue("businessTypeInput", preset.businessType);
    setValue("cityInput", city);
    setValue("countryInput", country);
    setValue("seoThresholdInput", preset.seo);
    setValue("leadThresholdInput", preset.lead);
    updatePresetBridge(preset, city, country);
    updateSelectedCards();
    const status = document.querySelector(".rf-clean-presets-status");
    if (status) status.textContent = `${preset.label} preset applied to the form above. Review the city, country, lead count, contact rule, and thresholds.`;
    const createStatus = document.getElementById("createSearchStatus");
    if (createStatus) createStatus.textContent = `${preset.label} preset applied. Confirm the search options and create the search batch.`;
    if (shouldFocus) {
      const focusTarget = document.getElementById("cityInput") || document.getElementById("searchNameInput");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }
  }

  function bindLocationOverrides() {
    document.querySelectorAll(".rf-clean-preset-city, .rf-clean-preset-country").forEach((input) => {
      if (input.dataset.rfPresetBound === "true") return;
      input.dataset.rfPresetBound = "true";
      input.addEventListener("input", () => { if (activePreset) applyPreset(activePreset, { skipFocus: true }); });
    });
  }

  function mount() {
    if (PAGE !== "dashboard") return;
    ensurePresetBridge();
    ensureSearchOptions();
    patchSearchPayload();
    if (document.querySelector(".rf-clean-presets")) {
      bindLocationOverrides();
      updateSelectedCards();
      return;
    }
    const hero = document.querySelector(".create-search-top");
    const form = document.getElementById("quickCreateForm");
    if (!hero || !form) return;
    const section = document.createElement("section");
    section.className = "rf-clean-presets";
    section.innerHTML = `<div class="rf-clean-presets-head"><div><p class="panel-eyebrow">Search presets</p><h2>Start with a proven local SEO category.</h2><p>Pick a template below. It fills the Create Search form above, then you only adjust the location, lead count, contact rule, and thresholds.</p></div><div class="rf-clean-presets-location"><label><span>City / metro override</span><input class="rf-clean-preset-city" type="text" placeholder="e.g. Miami"></label><label><span>Country override</span><input class="rf-clean-preset-country" type="text" placeholder="e.g. United States"></label></div></div><div class="rf-clean-preset-grid"></div><p class="rf-clean-presets-status">Choose a preset to fill the Create Search form above.</p>`;
    const grid = section.querySelector(".rf-clean-preset-grid");
    PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rf-clean-preset-card";
      button.dataset.presetLabel = preset.label;
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = `<span>${preset.badge}</span><strong>${preset.label}</strong><small>${preset.businessType}</small><em class="rf-clean-preset-selected">Apply preset</em>`;
      button.addEventListener("click", () => applyPreset(preset));
      grid.appendChild(button);
    });
    hero.insertAdjacentElement("afterend", section);
    bindLocationOverrides();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    mount();
    if (document.querySelector(".rf-clean-presets") || tries > 10) clearInterval(timer);
  }, 500);
})();

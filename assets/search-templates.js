/* RankForge search presets / guided search helper */
(function () {
  const PAGE = document.body?.dataset?.page || "";

  const PRESETS = [
    {
      key: "restoration-us",
      label: "Restoration",
      badge: "High value",
      niche: "restoration",
      businessType: "water damage restoration company",
      searchName: "Restoration Companies",
      city: "Miami",
      country: "United States",
      seo: 65,
      lead: 70,
      note: "Emergency/local service niche with strong commercial intent."
    },
    {
      key: "roofing-us",
      label: "Roofing",
      badge: "Local service",
      niche: "roof repair",
      businessType: "roofing contractor",
      searchName: "Roof Repair Companies",
      city: "Dallas",
      country: "United States",
      seo: 60,
      lead: 70,
      note: "Good for local SEO, emergency repair, and quote-driven outreach."
    },
    {
      key: "dental-uk",
      label: "Dental",
      badge: "Clinic",
      niche: "dentist",
      businessType: "dental clinic",
      searchName: "Dental Clinics",
      city: "Manchester",
      country: "United Kingdom",
      seo: 60,
      lead: 70,
      note: "Strong commercial value, but contact quality should be checked."
    },
    {
      key: "hvac-us",
      label: "HVAC",
      badge: "Emergency",
      niche: "hvac repair",
      businessType: "HVAC contractor",
      searchName: "HVAC Repair Companies",
      city: "Austin",
      country: "United States",
      seo: 60,
      lead: 70,
      note: "High-intent local search market with service page opportunities."
    },
    {
      key: "plumbing-us",
      label: "Plumbing",
      badge: "Emergency",
      niche: "plumber",
      businessType: "plumbing company",
      searchName: "Plumbing Companies",
      city: "Phoenix",
      country: "United States",
      seo: 60,
      lead: 70,
      note: "Works best in larger cities with many independent operators."
    },
    {
      key: "law-us",
      label: "Law Firms",
      badge: "High CPC",
      niche: "personal injury lawyer",
      businessType: "law firm",
      searchName: "Personal Injury Law Firms",
      city: "Miami",
      country: "United States",
      seo: 65,
      lead: 75,
      note: "High value, but quality filtering should be stricter."
    },
    {
      key: "medspa-us",
      label: "Med Spa",
      badge: "Premium local",
      niche: "med spa",
      businessType: "medical spa",
      searchName: "Med Spas",
      city: "Los Angeles",
      country: "United States",
      seo: 60,
      lead: 70,
      note: "Good for local SEO and paid/local offer positioning."
    },
    {
      key: "pest-us",
      label: "Pest Control",
      badge: "Local service",
      niche: "pest control",
      businessType: "pest control company",
      searchName: "Pest Control Companies",
      city: "Orlando",
      country: "United States",
      seo: 60,
      lead: 70,
      note: "Good commercial fit with location/service page gaps."
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function setValue(id, value) {
    const node = $(id);
    if (!node) return;
    node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyPreset(preset) {
    setValue("searchNameInput", preset.searchName);
    setValue("nicheInput", preset.niche);
    setValue("businessTypeInput", preset.businessType);
    setValue("cityInput", preset.city);
    setValue("countryInput", preset.country);
    setValue("seoThresholdInput", preset.seo);
    setValue("leadThresholdInput", preset.lead);

    const customCity = document.querySelector(".rf-preset-city-input");
    const customCountry = document.querySelector(".rf-preset-country-input");
    if (customCity) customCity.value = preset.city;
    if (customCountry) customCountry.value = preset.country;

    const status = document.querySelector(".rf-search-helper-status");
    if (status) {
      status.textContent = `${preset.label} preset loaded. You can change city/country before creating the search.`;
    }
  }

  function applyCurrentLocationOverrides() {
    const city = document.querySelector(".rf-preset-city-input")?.value.trim();
    const country = document.querySelector(".rf-preset-country-input")?.value.trim();
    if (city) setValue("cityInput", city);
    if (country) setValue("countryInput", country);
  }

  function createHelper() {
    if (document.querySelector(".rf-search-helper")) return;

    const form =
      $("createSearchForm") ||
      $("searchForm") ||
      document.querySelector("form:has(#nicheInput)") ||
      document.querySelector("#nicheInput")?.closest("form");

    if (!form) return;

    const box = document.createElement("section");
    box.className = "rf-search-helper";
    box.innerHTML = `
      <div class="rf-search-helper-head">
        <span class="workspace-label">Guided search</span>
        <h2>Start with a high-intent niche</h2>
        <p>Use a preset to avoid weak searches. You can adjust the city, country, and thresholds before submitting.</p>
      </div>

      <div class="rf-search-helper-controls">
        <label>
          <span>City / metro</span>
          <input class="rf-preset-city-input" type="text" placeholder="e.g. Miami" />
        </label>
        <label>
          <span>Country</span>
          <input class="rf-preset-country-input" type="text" placeholder="e.g. United States" />
        </label>
        <button class="rf-apply-location" type="button">Apply location</button>
      </div>

      <div class="rf-preset-grid"></div>
      <p class="rf-search-helper-status">Choose a preset, then create your search.</p>
    `;

    const grid = box.querySelector(".rf-preset-grid");

    PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rf-preset-card";
      button.innerHTML = `
        <span class="rf-preset-badge">${preset.badge}</span>
        <strong>${preset.label}</strong>
        <small>${preset.businessType}</small>
        <p>${preset.note}</p>
      `;
      button.addEventListener("click", () => {
        const cityOverride = box.querySelector(".rf-preset-city-input")?.value.trim();
        const countryOverride = box.querySelector(".rf-preset-country-input")?.value.trim();
        applyPreset({
          ...preset,
          city: cityOverride || preset.city,
          country: countryOverride || preset.country
        });
      });
      grid.appendChild(button);
    });

    box.querySelector(".rf-apply-location").addEventListener("click", applyCurrentLocationOverrides);

    form.insertAdjacentElement("beforebegin", box);
  }

  function improveFormHints() {
    const hints = [
      ["nicheInput", "Use the service/category customers search for, e.g. roof repair, dentist, water damage restoration."],
      ["businessTypeInput", "Use the business entity type, e.g. roofing contractor, dental clinic, restoration company."],
      ["cityInput", "Use a city or metro area. Avoid very small towns until lead quality is proven."],
      ["countryInput", "Use full country name, e.g. United States, United Kingdom, Germany."]
    ];

    hints.forEach(([id, text]) => {
      const input = $(id);
      if (!input || input.dataset.rfHinted) return;
      input.dataset.rfHinted = "true";
      const hint = document.createElement("small");
      hint.className = "rf-input-hint";
      hint.textContent = text;
      input.insertAdjacentElement("afterend", hint);
    });
  }

  function init() {
    if (PAGE !== "dashboard") return;
    createHelper();
    improveFormHints();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    init();
    if (document.querySelector(".rf-search-helper") || tries > 8) clearInterval(timer);
  }, 700);
})();

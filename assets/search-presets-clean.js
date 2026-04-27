/* RankForge clean search presets - works with top Create Search section */
(function () {
  const PAGE = document.body?.dataset?.page || "";

  const PRESETS = [
    {
      label: "Restoration",
      badge: "High value",
      searchName: "Restoration Companies",
      niche: "restoration",
      businessType: "water damage restoration company",
      city: "Miami",
      country: "United States",
      seo: 65,
      lead: 70
    },
    {
      label: "Roofing",
      badge: "Local service",
      searchName: "Roofing Contractors",
      niche: "roof repair",
      businessType: "roofing contractor",
      city: "Dallas",
      country: "United States",
      seo: 60,
      lead: 70
    },
    {
      label: "Dental",
      badge: "Clinic",
      searchName: "Dental Clinics",
      niche: "dentist",
      businessType: "dental clinic",
      city: "Miami",
      country: "United States",
      seo: 60,
      lead: 70
    },
    {
      label: "HVAC",
      badge: "Emergency",
      searchName: "HVAC Repair Companies",
      niche: "hvac repair",
      businessType: "HVAC contractor",
      city: "Austin",
      country: "United States",
      seo: 60,
      lead: 70
    },
    {
      label: "Plumbing",
      badge: "Emergency",
      searchName: "Plumbing Companies",
      niche: "plumber",
      businessType: "plumbing company",
      city: "Phoenix",
      country: "United States",
      seo: 60,
      lead: 70
    },
    {
      label: "Law Firms",
      badge: "High CPC",
      searchName: "Personal Injury Law Firms",
      niche: "personal injury lawyer",
      businessType: "law firm",
      city: "Miami",
      country: "United States",
      seo: 65,
      lead: 75
    },
    {
      label: "Med Spa",
      badge: "Premium local",
      searchName: "Med Spas",
      niche: "med spa",
      businessType: "medical spa",
      city: "Los Angeles",
      country: "United States",
      seo: 60,
      lead: 70
    },
    {
      label: "Pest Control",
      badge: "Local service",
      searchName: "Pest Control Companies",
      niche: "pest control",
      businessType: "pest control company",
      city: "Orlando",
      country: "United States",
      seo: 60,
      lead: 70
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
    const cityOverride = document.querySelector(".rf-clean-preset-city")?.value.trim();
    const countryOverride = document.querySelector(".rf-clean-preset-country")?.value.trim();

    const city = cityOverride || preset.city;
    const country = countryOverride || preset.country;

    setValue("searchNameInput", city ? `${city} ${preset.searchName}` : preset.searchName);
    setValue("nicheInput", preset.niche);
    setValue("businessTypeInput", preset.businessType);
    setValue("cityInput", city);
    setValue("countryInput", country);
    setValue("seoThresholdInput", preset.seo);
    setValue("leadThresholdInput", preset.lead);

    const status = document.querySelector(".rf-clean-presets-status");
    if (status) {
      status.textContent = `${preset.label} preset loaded. Review the city/country and click Create Search Batch.`;
    }
  }

  function mount() {
    if (PAGE !== "dashboard") return;
    if (document.querySelector(".rf-clean-presets")) return;

    const hero = document.querySelector(".create-search-top");
    const form = document.getElementById("quickCreateForm");
    if (!hero || !form) return;

    const section = document.createElement("section");
    section.className = "rf-clean-presets";
    section.innerHTML = `
      <div class="rf-clean-presets-head">
        <div>
          <p class="panel-eyebrow">Search presets</p>
          <h2>Start with a proven local SEO category.</h2>
          <p>Pick a template, optionally change city/country, then run a focused search.</p>
        </div>
        <div class="rf-clean-presets-location">
          <label><span>City / metro override</span><input class="rf-clean-preset-city" type="text" placeholder="e.g. Miami"></label>
          <label><span>Country override</span><input class="rf-clean-preset-country" type="text" placeholder="e.g. United States"></label>
        </div>
      </div>
      <div class="rf-clean-preset-grid"></div>
      <p class="rf-clean-presets-status">Choose a preset to fill the Create Search form above.</p>
    `;

    const grid = section.querySelector(".rf-clean-preset-grid");
    PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rf-clean-preset-card";
      button.innerHTML = `
        <span>${preset.badge}</span>
        <strong>${preset.label}</strong>
        <small>${preset.businessType}</small>
      `;
      button.addEventListener("click", () => applyPreset(preset));
      grid.appendChild(button);
    });

    hero.insertAdjacentElement("afterend", section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    mount();
    if (document.querySelector(".rf-clean-presets") || tries > 10) clearInterval(timer);
  }, 500);
})();

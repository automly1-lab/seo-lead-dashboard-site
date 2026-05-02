(function () {
  const DISMISS_KEY = "rankforge-onboarding-dismissed-v1";

  function getBasePrefix() {
    const page = document.body?.dataset?.page || "";
    return ["dashboard", "lists", "searches", "leads", "lead-detail", "settings", "quality", "opportunities", "competitors"].includes(page) ? "../" : "";
  }

  function loadStylesheetOnce(href, markerName) {
    if (document.querySelector(`link[data-${markerName}="true"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[markerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true";
    document.head.appendChild(link);
  }

  function loadScriptOnce(src, markerName) {
    if (document.querySelector(`script[data-${markerName}="true"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[markerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true";
    document.body.appendChild(script);
  }

  function loadMobileBrandPolish() {
    loadStylesheetOnce(`${getBasePrefix()}assets/mobile-brand-polish.css?v=mobile-brand-1`, "rf-mobile-brand-polish");
  }

  function loadMvpCleanupStyles() {
    loadStylesheetOnce(`${getBasePrefix()}assets/mvp-cleanup.css?v=mvp-cleanup-1`, "rf-mvp-cleanup");
  }

  function loadMvpCreditSystem() {
    const page = document.body?.dataset?.page || "";
    if (!["dashboard", "lists", "searches", "leads", "lead-detail", "settings", "quality"].includes(page)) return;
    loadStylesheetOnce(`${getBasePrefix()}assets/mvp-credit-system.css?v=mvp-credit-1`, "rf-mvp-credit-css");
    loadScriptOnce(`${getBasePrefix()}assets/mvp-credit-system.js?v=mvp-credit-1`, "rf-mvp-credit-js");
  }

  function loadLeadQualityReasons() {
    const page = document.body?.dataset?.page || "";
    if (!["dashboard", "leads"].includes(page)) return;
    loadScriptOnce(`${getBasePrefix()}assets/lead-quality-reasons.js?v=lead-quality-reasons-2`, "rf-lead-quality-reasons");
  }

  function loadLeadDetailQuality() {
    const page = document.body?.dataset?.page || "";
    if (page !== "lead-detail") return;
    loadScriptOnce(`${getBasePrefix()}assets/lead-detail-quality.js?v=lead-detail-quality-1`, "rf-lead-detail-quality");
  }

  function loadMvpCleanupScript() {
    loadScriptOnce(`${getBasePrefix()}assets/mvp-cleanup.js?v=mvp-cleanup-1`, "rf-mvp-cleanup-js");
  }

  function addDashboardOnboarding() {
    if ((document.body?.dataset?.page || "") !== "dashboard") return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (document.querySelector(".rf-onboarding-panel")) return;
    const createTop = document.querySelector(".create-search-top");
    const main = document.querySelector(".dashboard-main");
    if (!createTop || !main) return;
    const panel = document.createElement("section");
    panel.className = "rf-onboarding-panel";
    panel.innerHTML = `<div class="rf-onboarding-head"><div><p class="panel-eyebrow">Getting Started</p><h2>Run one focused search, then review only contact-ready leads.</h2><p>Start narrow: choose one service category, one city, and a realistic lead target. Review qualified leads first, then export when the list is ready.</p></div><button class="rf-onboarding-dismiss" type="button" aria-label="Dismiss onboarding">×</button></div>`;
    createTop.insertAdjacentElement("afterend", panel);
    const dismiss = panel.querySelector(".rf-onboarding-dismiss");
    if (dismiss) dismiss.addEventListener("click", () => { localStorage.setItem(DISMISS_KEY, "true"); panel.remove(); });
  }

  function init() {
    /* Shell/menu rendering now belongs only to assets/app-shell.js, loaded by brand-consistency.js. */
    loadMobileBrandPolish();
    loadMvpCleanupStyles();
    loadMvpCreditSystem();
    addDashboardOnboarding();
    loadLeadQualityReasons();
    loadLeadDetailQuality();
    loadMvpCleanupScript();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.setTimeout(init, 800);
})();

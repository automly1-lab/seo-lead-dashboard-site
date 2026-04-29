(function () {
  const DISMISS_KEY = "rankforge-onboarding-dismissed-v1";
  const ADMIN_EMAIL = "automly1@gmail.com";

  function isProtectedAppPage() { return document.body && document.body.dataset && document.body.dataset.auth === "protected"; }
  function getBasePrefix() { const page = document.body?.dataset?.page || ""; return ["dashboard", "lists", "leads", "lead-detail", "settings", "quality"].includes(page) ? "../" : ""; }
  function loadStylesheetOnce(href, markerName) { if (document.querySelector(`link[data-${markerName}="true"]`)) return; const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; link.dataset[markerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true"; document.head.appendChild(link); }
  function loadScriptOnce(src, markerName) { if (document.querySelector(`script[data-${markerName}="true"]`)) return; const script = document.createElement("script"); script.src = src; script.defer = true; script.dataset[markerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true"; document.body.appendChild(script); }
  function loadMobileBrandPolish() { loadStylesheetOnce(`${getBasePrefix()}assets/mobile-brand-polish.css?v=mobile-brand-1`, "rf-mobile-brand-polish"); }
  function loadMvpCleanupStyles() { loadStylesheetOnce(`${getBasePrefix()}assets/mvp-cleanup.css?v=mvp-cleanup-1`, "rf-mvp-cleanup"); }
  function loadAppShellStyles() { loadStylesheetOnce(`${getBasePrefix()}assets/app-shell.css?v=app-shell-1`, "rf-app-shell"); }
  function loadAppShellScript() { loadScriptOnce(`${getBasePrefix()}assets/app-shell.js?v=app-shell-1`, "rf-app-shell-js"); }

  function getSession() { if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") return window.rankforgeAuth.getSession(); try { return JSON.parse(localStorage.getItem("rankforge-auth-session-v1") || "null"); } catch { return null; } }
  function currentEmail() { const session = getSession(); return String((session && (session.email || session.userEmail)) || "").trim().toLowerCase(); }
  function isAdmin() { return currentEmail() === ADMIN_EMAIL; }

  function addQualityLinkForAdmin() { if (!isProtectedAppPage() || !isAdmin()) return; const nav = document.querySelector(".sidebar-nav"); if (!nav || nav.querySelector('a[href$="quality/"]')) return; const settingsLink = nav.querySelector('a[href$="settings/"]'); const link = document.createElement("a"); link.href = `${getBasePrefix()}quality/`; link.textContent = "Quality"; link.className = "rf-sidebar-quality-link"; if ((document.body?.dataset?.page || "") === "quality") link.classList.add("active"); if (settingsLink) nav.insertBefore(link, settingsLink); else nav.appendChild(link); }
  function removeQualityLinkForNonAdmin() { if (isAdmin()) return; document.querySelectorAll('.sidebar-nav a[href$="quality/"]').forEach((link) => link.remove()); }
  function addSettingsLink() { if (!isProtectedAppPage()) return; const nav = document.querySelector(".sidebar-nav"); if (!nav || nav.querySelector('a[href$="settings/"]')) return; const link = document.createElement("a"); link.href = `${getBasePrefix()}settings/`; link.textContent = "Settings"; link.className = "rf-sidebar-settings-link"; if ((document.body?.dataset?.page || "") === "settings") link.classList.add("active"); nav.appendChild(link); }
  function loadLeadQualityReasons() { const page = document.body?.dataset?.page || ""; if (!["dashboard", "leads"].includes(page)) return; loadScriptOnce(`${getBasePrefix()}assets/lead-quality-reasons.js?v=lead-quality-reasons-2`, "rf-lead-quality-reasons"); }
  function loadLeadDetailQuality() { const page = document.body?.dataset?.page || ""; if (page !== "lead-detail") return; loadScriptOnce(`${getBasePrefix()}assets/lead-detail-quality.js?v=lead-detail-quality-1`, "rf-lead-detail-quality"); }
  function loadMvpCleanupScript() { loadScriptOnce(`${getBasePrefix()}assets/mvp-cleanup.js?v=mvp-cleanup-1`, "rf-mvp-cleanup-js"); }

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
    loadAppShellStyles();
    loadMobileBrandPolish();
    loadMvpCleanupStyles();
    addSettingsLink();
    addQualityLinkForAdmin();
    removeQualityLinkForNonAdmin();
    addDashboardOnboarding();
    loadLeadQualityReasons();
    loadLeadDetailQuality();
    loadMvpCleanupScript();
    loadAppShellScript();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  window.setTimeout(init, 800);
})();

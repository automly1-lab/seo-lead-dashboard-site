(function () {
  const DISMISS_KEY = "rankforge-onboarding-dismissed-v1";
  const ADMIN_EMAIL = "automly1@gmail.com";

  function isProtectedAppPage() {
    return document.body && document.body.dataset && document.body.dataset.auth === "protected";
  }

  function getBasePrefix() {
    const page = document.body?.dataset?.page || "";
    if (["dashboard", "lists", "leads", "lead-detail", "settings", "quality"].includes(page)) return "../";
    return "";
  }

  function getSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      return window.rankforgeAuth.getSession();
    }
    try {
      return JSON.parse(localStorage.getItem("rankforge-auth-session-v1") || "null");
    } catch {
      return null;
    }
  }

  function currentEmail() {
    const session = getSession();
    return String((session && (session.email || session.userEmail)) || "").trim().toLowerCase();
  }

  function isAdmin() {
    return currentEmail() === ADMIN_EMAIL;
  }

  function addQualityLinkForAdmin() {
    if (!isProtectedAppPage() || !isAdmin()) return;
    const nav = document.querySelector(".sidebar-nav");
    if (!nav || nav.querySelector('a[href$="quality/"]')) return;

    const settingsLink = nav.querySelector('a[href$="settings/"]');
    const link = document.createElement("a");
    link.href = `${getBasePrefix()}quality/`;
    link.textContent = "Quality";
    link.className = "rf-sidebar-quality-link";

    if ((document.body?.dataset?.page || "") === "quality") {
      link.classList.add("active");
    }

    if (settingsLink) nav.insertBefore(link, settingsLink);
    else nav.appendChild(link);
  }

  function removeQualityLinkForNonAdmin() {
    if (isAdmin()) return;
    document.querySelectorAll('.sidebar-nav a[href$="quality/"]').forEach((link) => link.remove());
  }

  function addSettingsLink() {
    if (!isProtectedAppPage()) return;
    const nav = document.querySelector(".sidebar-nav");
    if (!nav || nav.querySelector('a[href$="settings/"]')) return;

    const link = document.createElement("a");
    link.href = `${getBasePrefix()}settings/`;
    link.textContent = "Settings";
    link.className = "rf-sidebar-settings-link";

    if ((document.body?.dataset?.page || "") === "settings") {
      link.classList.add("active");
    }

    nav.appendChild(link);
  }

  function loadScriptOnce(src, markerName) {
    if (document.querySelector(`script[data-${markerName}="true"]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.dataset[markerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = "true";
    document.body.appendChild(script);
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

  function addDashboardOnboarding() {
    if ((document.body?.dataset?.page || "") !== "dashboard") return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;
    if (document.querySelector(".rf-onboarding-panel")) return;

    const workspaceStrip = document.querySelector(".workspace-strip");
    const main = document.querySelector(".dashboard-main");
    if (!workspaceStrip || !main) return;

    const panel = document.createElement("section");
    panel.className = "rf-onboarding-panel";
    panel.innerHTML = `
      <div class="rf-onboarding-head">
        <div>
          <p class="panel-eyebrow">Getting Started</p>
          <h2>Run one focused search, then review only contact-ready leads.</h2>
          <p>RankForge works best when you choose a clear niche, a specific city, and a commercial service category. Start narrow, review the qualified leads, then export the best opportunities.</p>
        </div>
        <button class="rf-onboarding-dismiss" type="button" aria-label="Dismiss onboarding">×</button>
      </div>
      <div class="rf-onboarding-steps">
        <article class="rf-onboarding-step"><span>1</span><strong>Choose niche</strong><small>Pick a service category agencies can realistically sell SEO to.</small></article>
        <article class="rf-onboarding-step"><span>2</span><strong>Choose city</strong><small>Use one city at a time so the list stays focused and reviewable.</small></article>
        <article class="rf-onboarding-step"><span>3</span><strong>Create search</strong><small>The request is sent to the search workflow and saved under your workspace.</small></article>
        <article class="rf-onboarding-step"><span>4</span><strong>Review leads</strong><small>Check contact path, SEO need, commercial fit, and lead priority.</small></article>
        <article class="rf-onboarding-step"><span>5</span><strong>Export</strong><small>Download a clean CSV for outreach once the list is ready.</small></article>
      </div>
    `;

    main.insertBefore(panel, workspaceStrip);

    const dismiss = panel.querySelector(".rf-onboarding-dismiss");
    if (dismiss) {
      dismiss.addEventListener("click", () => {
        localStorage.setItem(DISMISS_KEY, "true");
        panel.remove();
      });
    }
  }

  function init() {
    addSettingsLink();
    addQualityLinkForAdmin();
    removeQualityLinkForNonAdmin();
    addDashboardOnboarding();
    loadLeadQualityReasons();
    loadLeadDetailQuality();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.setTimeout(init, 800);
})();

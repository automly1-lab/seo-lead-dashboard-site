/* RankForge dashboard home polish */
(function () {
  const PAGE = document.body?.dataset?.page || "";

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function createSearchForm() {
    return $("#createSearchForm") ||
      $("#searchForm") ||
      $("#searchNameInput")?.closest("form") ||
      $("#nicheInput")?.closest("form");
  }

  function moveCreateSearchToTop() {
    if (PAGE !== "dashboard") return;
    const form = createSearchForm();
    if (!form || form.dataset.rfHomePolished === "true") return;

    form.dataset.rfHomePolished = "true";

    const existingShell = $(".rf-dashboard-search-hero");
    if (existingShell) return;

    const shell = document.createElement("section");
    shell.className = "rf-dashboard-search-hero";
    shell.innerHTML = `
      <div class="rf-dashboard-search-copy">
        <span class="workspace-label">Start a lead search</span>
        <h1>Find SEO-ready local businesses.</h1>
        <p>Create a focused search by niche and city. RankForge will find, score, and organize contact-ready opportunities for review.</p>
      </div>
    `;

    const formWrap = document.createElement("div");
    formWrap.className = "rf-dashboard-search-form";
    form.parentNode.insertBefore(shell, form);
    formWrap.appendChild(form);
    shell.appendChild(formWrap);

    const main =
      $(".dashboard-main") ||
      $("main") ||
      document.body;

    const firstGoodSpot =
      $(".rf-search-helper") ||
      $(".dashboard-grid") ||
      $(".workspace-summary") ||
      main.firstElementChild;

    if (firstGoodSpot && firstGoodSpot.parentNode) {
      firstGoodSpot.parentNode.insertBefore(shell, firstGoodSpot);
    } else {
      main.insertAdjacentElement("afterbegin", shell);
    }

    // Rename submit button for clarity.
    const submit = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submit && submit.tagName === "BUTTON") submit.textContent = "Create search";
    if (submit && submit.tagName === "INPUT") submit.value = "Create search";
  }

  function simplifyDashboard() {
    if (PAGE !== "dashboard") return;
    document.body.classList.add("rf-dashboard-polished");

    // Hide duplicated low-value top insights if present.
    [
      "#topbarInsightOne",
      "#topbarInsightTwo",
      "#topbarInsightThree"
    ].forEach((selector) => {
      const node = $(selector);
      const card = node?.closest(".metric-card, .insight-card, article, .card");
      if (card) card.classList.add("rf-soft-hidden");
    });

    // Make webhook/settings/debug panels quieter if they exist on dashboard.
    document.querySelectorAll('[id*="webhook" i], .webhook-panel, .debug-panel').forEach((node) => {
      const panel = node.closest("section, article, .panel, .card") || node;
      panel.classList.add("rf-admin-quiet");
    });
  }

  function init() {
    moveCreateSearchToTop();
    simplifyDashboard();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    init();
    if ($(".rf-dashboard-search-hero") || tries > 10) clearInterval(timer);
  }, 600);
})();

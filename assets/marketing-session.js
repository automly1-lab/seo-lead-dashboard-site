(function () {
  "use strict";

  const SELECTED_PLAN_KEY = "rankforge-selected-plan-v1";
  const BILLING_STATUS_KEY = "rankforge-billing-status-v1";
  const CHECKOUT_INTENT_KEY = "rankforge-post-auth-intent-v1";
  const CHECKOUT_PLAN_KEY = "rankforge-post-auth-plan-v1";

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function normalizePlan(value) { const raw = clean(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_"); if (raw === "growth" || raw === "pro") return "growth"; if (raw === "agency" || raw === "agency_intelligence") return "agency_intelligence"; return "starter"; }
  function isNested() { return /\/(how-it-works|pricing|status|privacy|terms|refund-policy|login|signup|checkout-success|checkout-cancelled|checkout-pending)\//.test(location.pathname || "") || /\/404\.html$/.test(location.pathname || ""); }
  function rootPrefix() { return isNested() ? "../" : ""; }
  function urlFromRoot(path) { return rootPrefix() + path; }

  function loadScriptOnce(src, marker) { if (document.querySelector('script[data-' + marker + '="true"]')) return; const script = document.createElement("script"); script.src = src; script.defer = true; script.setAttribute('data-' + marker, 'true'); document.body.appendChild(script); }
  function loadStylesheetOnce(href, marker) { if (document.querySelector('link[data-' + marker + '="true"]')) return; const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; link.setAttribute('data-' + marker, 'true'); document.head.appendChild(link); }
  function loadMarketingShell() { loadStylesheetOnce(urlFromRoot("assets/marketing-shell.css?v=marketing-shell-4"), "rf-marketing-shell-css"); loadScriptOnce(urlFromRoot("assets/marketing-shell.js?v=marketing-shell-4"), "rf-marketing-shell"); }
  function loadSeo() { loadScriptOnce(urlFromRoot("assets/seo.js?v=seo-1"), "rf-seo"); }
  function loadCopyPositioning() { loadScriptOnce(urlFromRoot("assets/copy-positioning.js?v=copy-positioning-1"), "rf-copy-positioning"); loadScriptOnce(urlFromRoot("assets/copy-final-cleanup.js?v=copy-final-2"), "rf-copy-final-cleanup"); }

  function getSession() { if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") return window.rankforgeAuth.getSession(); return null; }
  async function refreshSession() { if (window.rankforgeAuth && typeof window.rankforgeAuth.refreshSession === "function") return window.rankforgeAuth.refreshSession(); return getSession(); }
  function getBillingConfig() { return window.RANKFORGE_BILLING || {}; }
  function paymentLinkForPlan(planKey) { const config = getBillingConfig(); if (planKey === "starter") return clean(config.starterPaymentLink); if (planKey === "growth") return clean(config.growthPaymentLink); return ""; }
  function setCheckoutIntent(planKey) { const normalizedPlan = normalizePlan(planKey); localStorage.setItem(SELECTED_PLAN_KEY, normalizedPlan); localStorage.setItem(BILLING_STATUS_KEY, normalizedPlan === "agency_intelligence" ? "waitlist" : "pending_payment"); localStorage.setItem(CHECKOUT_PLAN_KEY, normalizedPlan); localStorage.setItem(CHECKOUT_INTENT_KEY, normalizedPlan === "agency_intelligence" ? "waitlist" : "checkout"); }

  function bindPricingLinks(session) {
    document.querySelectorAll("[data-plan-key]").forEach(function (node) {
      if (node.dataset.checkoutBound === "true") return;
      node.dataset.checkoutBound = "true";
      node.addEventListener("click", function (event) {
        const planKey = normalizePlan(node.dataset.planKey); setCheckoutIntent(planKey);
        if (planKey === "agency_intelligence") { event.preventDefault(); window.location.href = session && session.userId ? urlFromRoot("settings/") : urlFromRoot("signup/?plan=agency_intelligence&intent=waitlist"); return; }
        const paymentLink = paymentLinkForPlan(planKey);
        if (session && session.userId && paymentLink) { event.preventDefault(); window.location.href = paymentLink; return; }
        if (!(session && session.userId)) { event.preventDefault(); window.location.href = urlFromRoot("login/?intent=checkout&plan=" + encodeURIComponent(planKey)); return; }
        if (!paymentLink) { event.preventDefault(); window.location.href = urlFromRoot("settings/"); }
      });
    });
  }

  async function boot() { loadSeo(); loadMarketingShell(); loadCopyPositioning(); const session = await refreshSession(); bindPricingLinks(session); setTimeout(function(){ window.dispatchEvent(new CustomEvent('rankforge:session-ready', { detail: session || null })); }, 0); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
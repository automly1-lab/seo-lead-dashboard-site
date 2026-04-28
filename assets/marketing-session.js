(function () {
  "use strict";

  const SELECTED_PLAN_KEY = "rankforge-selected-plan-v1";
  const BILLING_STATUS_KEY = "rankforge-billing-status-v1";
  const CHECKOUT_INTENT_KEY = "rankforge-post-auth-intent-v1";
  const CHECKOUT_PLAN_KEY = "rankforge-post-auth-plan-v1";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizePlan(value) {
    const raw = clean(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (raw === "growth" || raw === "pro") return "growth";
    if (raw === "agency" || raw === "agency_intelligence") return "agency_intelligence";
    return "starter";
  }

  function getSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      return window.rankforgeAuth.getSession();
    }
    return null;
  }

  async function refreshSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.refreshSession === "function") {
      return window.rankforgeAuth.refreshSession();
    }
    return getSession();
  }

  function getBillingConfig() {
    return window.RANKFORGE_BILLING || {};
  }

  function paymentLinkForPlan(planKey) {
    const config = getBillingConfig();
    if (planKey === "starter") return clean(config.starterPaymentLink);
    if (planKey === "growth") return clean(config.growthPaymentLink);
    return "";
  }

  function appRootUrl() {
    const brand = document.querySelector(".brand");
    if (brand && brand.href) return new URL(brand.href, window.location.href).toString();
    return new URL("./", window.location.href).toString();
  }

  function urlFromRoot(path) {
    return new URL(path, appRootUrl()).toString();
  }

  function setCheckoutIntent(planKey) {
    const normalizedPlan = normalizePlan(planKey);
    localStorage.setItem(SELECTED_PLAN_KEY, normalizedPlan);
    localStorage.setItem(BILLING_STATUS_KEY, normalizedPlan === "agency_intelligence" ? "waitlist" : "pending_payment");
    localStorage.setItem(CHECKOUT_PLAN_KEY, normalizedPlan);
    localStorage.setItem(CHECKOUT_INTENT_KEY, normalizedPlan === "agency_intelligence" ? "waitlist" : "checkout");
  }

  function updateNav(session) {
    const actions = document.querySelector(".nav-actions");
    if (!actions) return;

    if (session && session.userId) {
      actions.innerHTML = [
        '<a class="button secondary" href="' + urlFromRoot("dashboard/") + '">Dashboard</a>',
        '<a class="button secondary" href="' + urlFromRoot("settings/") + '">Settings</a>',
        '<button class="button primary" type="button" id="marketingLogoutButton">Log out</button>'
      ].join("");
      const logoutButton = document.getElementById("marketingLogoutButton");
      if (logoutButton) {
        logoutButton.addEventListener("click", async function () {
          try {
            if (window.rankforgeAuth && typeof window.rankforgeAuth.getSupabaseClient === "function") {
              const client = window.rankforgeAuth.getSupabaseClient();
              if (client) await client.auth.signOut();
            }
          } catch {}
          localStorage.removeItem("rankforge-auth-session-v1");
          localStorage.removeItem("rankforge-current-user-id-v1");
          window.location.href = urlFromRoot("login/");
        });
      }
      return;
    }

    actions.innerHTML = [
      '<a class="button secondary" href="' + urlFromRoot("login/") + '">Log in</a>',
      '<a class="button primary" href="' + urlFromRoot("signup/") + '">Start finding leads</a>'
    ].join("");
  }

  function bindPricingLinks(session) {
    document.querySelectorAll("[data-plan-key]").forEach(function (node) {
      if (node.dataset.checkoutBound === "true") return;
      node.dataset.checkoutBound = "true";
      node.addEventListener("click", function (event) {
        const planKey = normalizePlan(node.dataset.planKey);
        setCheckoutIntent(planKey);

        if (planKey === "agency_intelligence") {
          event.preventDefault();
          window.location.href = session && session.userId
            ? urlFromRoot("settings/")
            : urlFromRoot("signup/?plan=agency_intelligence&intent=waitlist");
          return;
        }

        const paymentLink = paymentLinkForPlan(planKey);
        if (session && session.userId && paymentLink) {
          event.preventDefault();
          window.location.href = paymentLink;
          return;
        }

        if (!(session && session.userId)) {
          event.preventDefault();
          window.location.href = urlFromRoot("login/?intent=checkout&plan=" + encodeURIComponent(planKey));
          return;
        }

        if (!paymentLink) {
          event.preventDefault();
          window.location.href = urlFromRoot("settings/");
        }
      });
    });
  }

  async function boot() {
    const session = await refreshSession();
    updateNav(session);
    bindPricingLinks(session);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

(function () {
  const ADMIN_EMAIL = "automly1@gmail.com";
  const APP_STORAGE_KEYS = [
    "rankforge-clean-app-state-v1",
    "rankforge-dashboard-state-v3",
    "rankforge-current-user-id-v1",
    "rankforge-auth-session-v1"
  ];
  const SELECTED_PLAN_KEY = "rankforge-selected-plan-v1";
  const BILLING_STATUS_KEY = "rankforge-billing-status-v1";

  const PLAN_DEFINITIONS = {
    starter: {
      name: "Starter",
      price: "$29/month",
      leadLimit: "50 prioritized leads/month",
      searchLimit: "3 active search batches · 3 searches/month",
      status: "Active",
      description: "For testing a few focused niches or cities with automated scoring and CSV export. Manual lead review is not included."
    },
    growth: {
      name: "Growth",
      price: "$79/month",
      leadLimit: "250 prioritized leads/month",
      searchLimit: "5 active search batches · 15 searches/month",
      status: "Active",
      description: "For agencies that want a steady monthly flow of prioritized local SEO opportunities. Manual lead review is not included."
    },
    agency_intelligence: {
      name: "Agency Intelligence",
      price: "Coming soon",
      leadLimit: "750+ prioritized leads/month",
      searchLimit: "More active search batches",
      status: "Coming soon",
      description: "Planned for deeper SEO analysis, competitor visibility signals, priority processing, and advanced agency workflows."
    },
    admin_unlimited: {
      name: "Admin Unlimited",
      price: "Internal admin account",
      leadLimit: "Unlimited internal lead access",
      searchLimit: "Unlimited internal search access",
      status: "Admin",
      description: "Full RankForge admin access for testing, quality review, admin portal visibility, and all current/future workspace capabilities."
    }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  function normalizePlan(value) {
    const raw = clean(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (["admin", "admin_unlimited", "unlimited"].includes(raw)) return "admin_unlimited";
    if (["starter", "start", "basic", "starter_plan"].includes(raw)) return "starter";
    if (["growth", "pro", "founding", "founding_plan"].includes(raw)) return "growth";
    if (["agency", "agency_intelligence", "enterprise"].includes(raw)) return "agency_intelligence";
    return "starter";
  }

  function getStoredWebhook() {
    return localStorage.getItem("rankforge-search-submit-webhook-v1") || "Default webhook";
  }

  function getBillingConfig() {
    return window.RANKFORGE_BILLING || {
      starterPaymentLink: "",
      growthPaymentLink: "",
      supportEmail: "support@crestlineops.com"
    };
  }

  function getAppState() {
    return safeParse(localStorage.getItem("rankforge-clean-app-state-v1"), {}) || {};
  }

  function createSupabaseClient() {
    if (!window.supabase || !window.RANKFORGE_SUPABASE_URL || !window.RANKFORGE_SUPABASE_ANON_KEY) {
      return null;
    }
    return window.supabase.createClient(window.RANKFORGE_SUPABASE_URL, window.RANKFORGE_SUPABASE_ANON_KEY);
  }

  async function getSupabaseSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      const appSession = window.rankforgeAuth.getSession();
      if (appSession && appSession.userId) return appSession;
    }

    const client = createSupabaseClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    const user = data && data.session && data.session.user;
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email || "Signed-in user",
      raw: data.session
    };
  }

  function monthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  function inCurrentMonth(value) {
    const time = new Date(value || "").getTime();
    return Number.isFinite(time) && time >= monthStart();
  }

  function usageForUser(userId) {
    const state = getAppState();
    const lists = [];
    const leads = [];
    if (Array.isArray(state.localLists)) lists.push(...state.localLists);
    if (state.remoteCache && Array.isArray(state.remoteCache.lists)) lists.push(...state.remoteCache.lists);
    if (Array.isArray(state.localLeads)) leads.push(...state.localLeads);
    if (state.remoteCache && Array.isArray(state.remoteCache.leads)) leads.push(...state.remoteCache.leads);

    const userLists = lists.filter((item) => clean(item.userId || item.user_id) === userId && inCurrentMonth(item.lastRun || item.created_at || item.createdAt));
    const userLeads = leads.filter((item) => clean(item.userId || item.user_id) === userId && inCurrentMonth(item.created_at || item.createdAt || item.updated_at || item.lastRun));
    return {
      searchesThisMonth: new Set(userLists.map((item) => clean(item.id || item.search_id)).filter(Boolean)).size,
      leadsThisMonth: new Set(userLeads.map((item) => clean(item.id || item.lead_id)).filter(Boolean)).size
    };
  }

  function planKeyForSession(session) {
    const email = clean(session && session.email).toLowerCase();
    if (email === ADMIN_EMAIL) return "admin_unlimited";
    return normalizePlan(localStorage.getItem("rankforge-current-plan-v1") || localStorage.getItem(SELECTED_PLAN_KEY) || "starter");
  }

  function getSelectedPlanKey(session) {
    const email = clean(session && session.email).toLowerCase();
    if (email === ADMIN_EMAIL) return "admin_unlimited";
    return normalizePlan(localStorage.getItem(SELECTED_PLAN_KEY) || localStorage.getItem("rankforge-current-plan-v1") || "starter");
  }

  function getBillingStatus(session, selectedPlanKey) {
    const email = clean(session && session.email).toLowerCase();
    if (email === ADMIN_EMAIL || selectedPlanKey === "admin_unlimited") return "admin";
    return clean(localStorage.getItem(BILLING_STATUS_KEY) || "pending_payment").toLowerCase();
  }

  function paymentLinkForPlan(planKey) {
    const config = getBillingConfig();
    if (planKey === "starter") return clean(config.starterPaymentLink);
    if (planKey === "growth") return clean(config.growthPaymentLink);
    return "";
  }

  function renderBillingSection(session) {
    const selectedPlanKey = getSelectedPlanKey(session);
    const selectedPlan = PLAN_DEFINITIONS[selectedPlanKey] || PLAN_DEFINITIONS.starter;
    const billingStatus = getBillingStatus(session, selectedPlanKey);
    const checkoutLink = paymentLinkForPlan(selectedPlanKey);
    const checkoutButton = byId("billingCheckoutButton");
    const pricingButton = byId("billingPricingButton");

    setText("billingSelectedPlan", selectedPlan.name);
    setText("billingSelectedPlanMeta", `${selectedPlan.price} · ${selectedPlan.leadLimit}`);
    setText("billingStatusValue", billingStatus.replace(/_/g, " "));

    if (checkoutButton) {
      checkoutButton.hidden = true;
      checkoutButton.removeAttribute("href");
    }

    if (billingStatus === "admin") {
      setText("accountPlanStatus", "Admin");
      setText("accountPlanMeta", "Internal admin account with unlimited internal access.");
      setText("billingStatusMessage", "Internal admin account. Billing is not required for workspace access.");
      setText("billingActionStatus", "Admin Unlimited bypasses checkout and billing restrictions.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (selectedPlanKey === "agency_intelligence" || billingStatus === "waitlist") {
      setText("accountPlanStatus", "Waitlist");
      setText("accountPlanMeta", "Agency Intelligence remains a coming-soon / waitlist plan until launch.");
      setText("billingStatusMessage", "Agency Intelligence is not active yet. This selection should remain waitlist-only until launch.");
      setText("billingActionStatus", "This plan should not activate through checkout yet.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (billingStatus === "active") {
      setText("accountPlanStatus", "Active");
      setText("accountPlanMeta", "Plan access should reflect confirmed billing state.");
      setText("billingStatusMessage", "Your plan is active. Plan access should come from confirmed billing, not query parameters.");
      setText("billingActionStatus", "Stripe activation is expected to be confirmed by a trusted backend update.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (billingStatus === "past_due" || billingStatus === "canceled") {
      setText("accountPlanStatus", billingStatus === "past_due" ? "Past due" : "Canceled");
      setText("accountPlanMeta", "Billing needs attention before this plan should be treated as active.");
      setText("billingStatusMessage", "Billing needs attention before this plan should be treated as active.");
      if (checkoutLink && checkoutButton) {
        checkoutButton.href = checkoutLink;
        checkoutButton.hidden = false;
      }
      setText("billingActionStatus", checkoutLink ? "Use checkout to reactivate or refresh billing once Stripe links are configured." : "Checkout is not connected yet. Add Stripe Payment Links in assets/billing-config.js.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    setText("accountPlanStatus", "Pending payment");
    setText("accountPlanMeta", "Complete checkout to activate this selected plan.");
    setText("billingStatusMessage", "Your selected plan is pending payment. Complete checkout to activate this plan.");
    if (checkoutLink && checkoutButton) {
      checkoutButton.href = checkoutLink;
      checkoutButton.hidden = false;
    }
    setText("billingActionStatus", checkoutLink ? "Plan access should only become active after payment confirmation from a trusted backend source." : "Checkout is not connected yet. Add real Stripe Payment Links in assets/billing-config.js.");
    if (pricingButton) pricingButton.textContent = "View Pricing";
  }

  function renderPlan(session) {
    const planKey = session ? planKeyForSession(session) : "starter";
    const plan = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.starter;
    const usage = session && session.userId ? usageForUser(session.userId) : { searchesThisMonth: 0, leadsThisMonth: 0 };

    setText("accountPlanName", plan.name);
    setText("accountPlanPrice", plan.price);
    setText("accountLeadLimit", plan.leadLimit);
    setText("accountLeadUsage", usage.leadsThisMonth + " lead(s) visible this month. Usage visibility only; limits are not enforced yet.");
    setText("accountSearchLimit", plan.searchLimit);
    setText("accountSearchUsage", usage.searchesThisMonth + " search batch(es) visible this month.");
    setText("accountPlanStatus", plan.status);
    setText("accountPlanMeta", plan.description);
    setText("accountPlanDescription", plan.description);
  }

  async function renderAccount() {
    const session = await getSupabaseSession();
    const webhook = getStoredWebhook();
    setText("accountWebhookStatus", webhook ? "Configured" : "Not configured");
    setText("accountWebhookValue", webhook ? webhook : "No webhook URL stored yet.");

    if (!session || !session.userId) {
      setText("accountEmail", "Not signed in");
      setText("accountUserId", "No active session");
    setText("accountSessionStatus", "Signed out");
    setText("accountSessionMeta", "Redirecting to login may be required.");
    setText("settingsStatus", "No active session");
    renderPlan(null);
    renderBillingSection(null);
    return;
  }

    setText("accountEmail", session.email || "Signed-in user");
    setText("accountUserId", session.userId);
    setText("accountSessionStatus", "Active session");
    setText("accountSessionMeta", "This user ID is used for dashboard data filtering.");
    setText("settingsStatus", clean(session.email).toLowerCase() === ADMIN_EMAIL ? "Admin session active" : "Session active");
    renderPlan(session);
    renderBillingSection(session);
  }

  async function logout() {
    const status = byId("logoutStatus");
    if (status) {
      status.textContent = "Signing out...";
      status.classList.remove("is-error", "is-success");
    }

    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.signOut === "function") {
        await window.rankforgeAuth.signOut();
      } else if (window.rankforgeAuth && typeof window.rankforgeAuth.logout === "function") {
        await window.rankforgeAuth.logout();
      } else {
        const client = createSupabaseClient();
        if (client) await client.auth.signOut();
      }
    } catch (error) {
      console.warn("RankForge logout warning", error);
    }

    APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (status) {
      status.textContent = "Signed out. Redirecting...";
      status.classList.add("is-success");
    }
    window.location.href = "../login/";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAccount();
    const button = byId("logoutButton");
    if (button) button.addEventListener("click", logout);
  });
})();

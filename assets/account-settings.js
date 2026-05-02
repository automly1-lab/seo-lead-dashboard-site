(function () {
  "use strict";

  var ADMIN_EMAIL = "automly1@gmail.com";

  var PLAN_DEFINITIONS = {
    free: {
      name: "Free",
      price: "$0",
      leadLimit: "10 qualified lead previews/month",
      searchLimit: "1 search batch/month",
      status: "Free",
      description: "Use one test search to review the workflow before upgrading."
    },
    starter: {
      name: "Starter",
      price: "$29/month",
      leadLimit: "50 qualified leads/month",
      searchLimit: "3 search batches/month",
      status: "Active",
      description: "For solo consultants validating a few niches or cities."
    },
    growth: {
      name: "Growth",
      price: "$79/month",
      leadLimit: "250 qualified leads/month",
      searchLimit: "15 search batches/month",
      status: "Active",
      description: "For agencies running outbound across multiple local markets."
    },
    agency_intelligence: {
      name: "Agency Intelligence",
      price: "Coming soon",
      leadLimit: "750+ qualified leads/month",
      searchLimit: "Higher search volume",
      status: "Coming soon",
      description: "Planned for deeper intelligence, priority processing, and advanced agency workflows."
    },
    admin_unlimited: {
      name: "Admin Unlimited",
      price: "Internal admin account",
      leadLimit: "Unlimited internal lead access",
      searchLimit: "Unlimited internal search access",
      status: "Admin",
      description: "Full internal access for testing, override review, and admin workflows."
    }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var node = byId(id);
    if (node) node.textContent = value;
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function createSupabaseClient() {
    if (!window.supabase || !window.RANKFORGE_SUPABASE_URL || !window.RANKFORGE_SUPABASE_ANON_KEY) return null;
    return window.supabase.createClient(window.RANKFORGE_SUPABASE_URL, window.RANKFORGE_SUPABASE_ANON_KEY);
  }

  async function getSupabaseSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      var appSession = window.rankforgeAuth.getSession();
      if (appSession && appSession.userId) return appSession;
    }

    var client = createSupabaseClient();
    if (!client) return null;
    var result = await client.auth.getSession();
    var data = result && result.data;
    var user = data && data.session && data.session.user;
    if (!user) return null;
    return {
      userId: user.id,
      email: user.email || "",
      raw: data.session
    };
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

  function monthStart() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }

  function inCurrentMonth(value) {
    var time = new Date(value || "").getTime();
    return Number.isFinite(time) && time >= monthStart();
  }

  function usageForUser(userId) {
    var state = getAppState();
    var lists = [];
    var leads = [];
    if (Array.isArray(state.localLists)) lists.push.apply(lists, state.localLists);
    if (state.remoteCache && Array.isArray(state.remoteCache.lists)) lists.push.apply(lists, state.remoteCache.lists);
    if (Array.isArray(state.localLeads)) leads.push.apply(leads, state.localLeads);
    if (state.remoteCache && Array.isArray(state.remoteCache.leads)) leads.push.apply(leads, state.remoteCache.leads);

    var searches = {};
    var searchCount = 0;
    var leadCount = 0;

    lists.forEach(function (item) {
      if (clean(item.userId || item.user_id) !== userId) return;
      if (!inCurrentMonth(item.lastRun || item.created_at || item.createdAt || item.updated_at)) return;
      var key = clean(item.id || item.search_id);
      if (!key || searches[key]) return;
      searches[key] = true;
      searchCount += 1;
    });

    leads.forEach(function (item) {
      if (clean(item.userId || item.user_id) !== userId) return;
      if (!inCurrentMonth(item.created_at || item.createdAt || item.updated_at || item.lastRun)) return;
      if (lower(item.status) !== "qualified") return;
      leadCount += 1;
    });

    return {
      searchesThisMonth: searchCount,
      leadsThisMonth: leadCount
    };
  }

  function paymentLinkForPlan(planKey) {
    var config = getBillingConfig();
    if (planKey === "starter") return clean(config.starterPaymentLink);
    if (planKey === "growth") return clean(config.growthPaymentLink);
    return "";
  }

  function billingLabel(profile) {
    var status = clean(profile && profile.billing_status);
    if (!status) return "Unknown";
    if (status === "admin_override") return "Admin override";
    if (status === "admin") return "Admin";
    return status.replace(/_/g, " ");
  }

  function planDefinition(profile) {
    var key = clean(profile && profile.plan) || "starter";
    return PLAN_DEFINITIONS[key] || PLAN_DEFINITIONS.starter;
  }

  function renderBillingSection(profile) {
    var selectedPlan = planDefinition(profile);
    var checkoutLink = paymentLinkForPlan(clean(profile && profile.plan));
    var checkoutButton = byId("billingCheckoutButton");
    var pricingButton = byId("billingPricingButton");
    var status = clean(profile && profile.billing_status);
    var isOverride = clean(profile && profile.source_row_source) === "admin_override" || clean(profile && profile.source_row_source) === "admin_managed";

    setText("billingSelectedPlan", selectedPlan.name);
    setText("billingSelectedPlanMeta", selectedPlan.price + " · " + selectedPlan.leadLimit);
    setText("billingStatusValue", billingLabel(profile));

    if (checkoutButton) {
      checkoutButton.hidden = true;
      checkoutButton.removeAttribute("href");
    }

    if (clean(profile && profile.plan) === "admin_unlimited" || lower(profile && profile.email) === ADMIN_EMAIL) {
      setText("accountPlanStatus", "Admin");
      setText("accountPlanMeta", "Internal admin account with unlimited access.");
      setText("billingStatusMessage", "Admin sessions bypass standard billing checks.");
      setText("billingActionStatus", "Admin Unlimited is managed internally and does not rely on checkout.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (isOverride) {
      setText("accountPlanStatus", "Admin managed");
      setText("accountPlanMeta", "Plan and credits are currently managed by an admin override row.");
      setText("billingStatusMessage", "Sheet-based admin override is active for this user. The override remains effective even if the raw billing_status cell says free.");
      setText("billingActionStatus", "Dashboard, search guard, and monthly limits now follow the latest admin override row.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (status === "waitlist" || clean(profile && profile.plan) === "agency_intelligence") {
      setText("accountPlanStatus", "Waitlist");
      setText("accountPlanMeta", "Agency Intelligence remains a coming-soon plan.");
      setText("billingStatusMessage", "This workspace is waitlisted for Agency Intelligence until launch.");
      setText("billingActionStatus", "This plan should not activate through checkout yet.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (status === "active") {
      setText("accountPlanStatus", "Active");
      setText("accountPlanMeta", "Sheet-based profile is active and currently driving limits.");
      setText("billingStatusMessage", "This plan is active and should be treated as the effective workspace profile.");
      setText("billingActionStatus", "Search limits and qualified lead credits follow the resolved sheet profile.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (status === "past_due" || status === "canceled") {
      setText("accountPlanStatus", status === "past_due" ? "Past due" : "Canceled");
      setText("accountPlanMeta", "Billing needs attention before this plan should be treated as active.");
      setText("billingStatusMessage", "Billing needs attention before this plan should be treated as active.");
      if (checkoutLink && checkoutButton) {
        checkoutButton.href = checkoutLink;
        checkoutButton.hidden = false;
      }
      setText("billingActionStatus", checkoutLink ? "Use checkout to reactivate or refresh billing." : "Checkout is not connected yet. Add Stripe Payment Links in assets/billing-config.js.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    if (status === "free" || status === "pending_payment" || !status) {
      setText("accountPlanStatus", status === "free" ? "Free" : "Pending payment");
      setText("accountPlanMeta", "No admin override is active, so billing state still matters.");
      setText("billingStatusMessage", status === "free" ? "This user currently resolves to a free/non-paid billing state." : "This selected plan is still pending payment.");
      if (checkoutLink && checkoutButton) {
        checkoutButton.href = checkoutLink;
        checkoutButton.hidden = false;
      }
      setText("billingActionStatus", checkoutLink ? "Complete checkout to activate paid access." : "Checkout is not connected yet. Add Stripe Payment Links in assets/billing-config.js.");
      if (pricingButton) pricingButton.textContent = "View Pricing";
      return;
    }

    setText("accountPlanStatus", "Resolved");
    setText("accountPlanMeta", "This plan is being driven by the resolved sheet profile.");
    setText("billingStatusMessage", "The current profile comes from the most recent matching user row.");
    setText("billingActionStatus", "If values look wrong, inspect rankforge-profile-debug-v1 in localStorage.");
  }

  function renderPlan(session, profile) {
    var plan = planDefinition(profile);
    var usage = session && session.userId ? usageForUser(session.userId) : { searchesThisMonth: 0, leadsThisMonth: 0 };

    setText("accountPlanName", plan.name);
    setText("accountPlanPrice", plan.price);
    setText("accountLeadLimit", String(profile.monthly_qualified_lead_credit_limit));
    setText("accountLeadUsage", usage.leadsThisMonth + " qualified lead(s) this month · " + profile.remaining_qualified_lead_credits + " remaining.");
    setText("accountSearchLimit", String(profile.monthly_search_limit));
    setText("accountSearchUsage", usage.searchesThisMonth + " search batch(es) this month · " + profile.remaining_searches + " remaining.");
    setText("accountPlanModel", plan.name);
    setText("accountPlanDescription", plan.description);
  }

  async function resolveProfile() {
    if (window.rankforgeUserPlanResolver && typeof window.rankforgeUserPlanResolver.resolveProfile === "function") {
      return window.rankforgeUserPlanResolver.resolveProfile({ force: true });
    }
    return {
      plan: "starter",
      plan_label: "Starter",
      billing_status: "pending_payment",
      monthly_search_limit: 3,
      monthly_qualified_lead_credit_limit: 50,
      max_leads_per_batch: 25,
      remaining_searches: 3,
      remaining_qualified_lead_credits: 50,
      email: "",
      source_row_source: "local_fallback"
    };
  }

  async function renderAccount() {
    var session = await getSupabaseSession();
    var webhook = getStoredWebhook();
    var profile = await resolveProfile();

    setText("accountWebhookStatus", webhook ? "Configured" : "Not configured");
    setText("accountWebhookValue", webhook ? webhook : "No webhook URL stored yet.");

    if (!session || !session.userId) {
      setText("accountEmail", "Not signed in");
      setText("accountUserId", "No active session");
      setText("accountSessionStatus", "Signed out");
      setText("accountSessionMeta", "Redirecting to login may be required.");
      setText("settingsStatus", "No active session");
      renderPlan(null, profile);
      renderBillingSection(profile);
      return;
    }

    setText("accountEmail", session.email || "Signed-in user");
    setText("accountUserId", session.userId);
    setText("accountSessionStatus", "Active session");
    setText("accountSessionMeta", "This user ID is used for dashboard data filtering.");
    setText("settingsStatus", lower(session.email) === ADMIN_EMAIL ? "Admin session active" : "Session active");
    renderPlan(session, profile);
    renderBillingSection(profile);
  }

  async function logout() {
    var status = byId("logoutStatus");
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
        var client = createSupabaseClient();
        if (client) await client.auth.signOut();
      }
    } catch (error) {
      console.warn("RankForge logout warning", error);
    }

    [
      "rankforge-clean-app-state-v1",
      "rankforge-dashboard-state-v3",
      "rankforge-current-user-id-v1",
      "rankforge-auth-session-v1"
    ].forEach(function (key) {
      localStorage.removeItem(key);
    });

    if (status) {
      status.textContent = "Signed out. Redirecting...";
      status.classList.add("is-success");
    }
    window.location.href = "../login/";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAccount();
    var button = byId("logoutButton");
    if (button) button.addEventListener("click", logout);
  });
})();

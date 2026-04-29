(function () {
  const ADMIN_EMAIL = "automly1@gmail.com";
  const APP_STORAGE_KEYS = [
    "rankforge-clean-app-state-v1",
    "rankforge-dashboard-state-v3",
    "rankforge-current-user-id-v1",
    "rankforge-auth-session-v1"
  ];
  const BILLING_STATUS_KEY = "rankforge-billing-status-v1";

  const PLAN_DEFINITIONS = {
    free: {
      name: "Free",
      price: "$0 · no paid plan active",
      leadLimit: "Up to 10 qualified lead previews",
      searchLimit: "1 search batch total",
      status: "Free",
      description: "Free workspace access lets you test one focused search before choosing Starter or Growth. Paid access activates only after checkout confirmation."
    },
    starter: {
      name: "Starter",
      price: "$29/month",
      leadLimit: "Up to 50 qualified lead opportunities/month",
      searchLimit: "5 search batches/month · max 25 leads per batch",
      status: "Active",
      description: "For freelancers and small agencies testing focused niches and cities. Includes search batch credits and qualified lead opportunity credits."
    },
    growth: {
      name: "Growth",
      price: "$79/month",
      leadLimit: "Up to 250 qualified lead opportunities/month",
      searchLimit: "15 search batches/month · max 50 leads per batch",
      status: "Active",
      description: "For agencies that want a steady monthly flow of prioritized local SEO opportunities across multiple markets."
    },
    agency_intelligence: {
      name: "Agency Intelligence",
      price: "Coming soon",
      leadLimit: "750+ qualified lead opportunities/month",
      searchLimit: "More search batches",
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

  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { const node = byId(id); if (node) node.textContent = value; }
  function clean(value) { return String(value == null ? "" : value).trim(); }
  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function normalizePlan(value) {
    const raw = clean(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (["admin", "admin_unlimited", "unlimited"].includes(raw)) return "admin_unlimited";
    if (["growth", "pro", "founding", "founding_plan"].includes(raw)) return "growth";
    if (["starter", "start", "basic", "starter_plan"].includes(raw)) return "starter";
    if (["agency", "agency_intelligence", "enterprise"].includes(raw)) return "agency_intelligence";
    return "free";
  }

  function getStoredWebhook() { return localStorage.getItem("rankforge-search-submit-webhook-v1") || "Default webhook"; }
  function getAppState() { return safeParse(localStorage.getItem("rankforge-clean-app-state-v1"), {}) || {}; }
  function createSupabaseClient() {
    if (!window.supabase || !window.RANKFORGE_SUPABASE_URL || !window.RANKFORGE_SUPABASE_ANON_KEY) return null;
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
    return { userId: user.id, email: user.email || "Signed-in user", raw: data.session };
  }

  function monthStart() { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1).getTime(); }
  function inCurrentMonth(value) { const time = new Date(value || "").getTime(); return Number.isFinite(time) && time >= monthStart(); }
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

  function getActivePlanKey(session) {
    const email = clean(session && session.email).toLowerCase();
    if (email === ADMIN_EMAIL) return "admin_unlimited";
    const billingStatus = clean(localStorage.getItem(BILLING_STATUS_KEY)).toLowerCase();
    const stored = clean(localStorage.getItem("rankforge-current-plan-v1"));
    if (billingStatus === "active" && stored) return normalizePlan(stored);
    return "free";
  }

  function renderPlan(session) {
    const planKey = session ? getActivePlanKey(session) : "free";
    const plan = PLAN_DEFINITIONS[planKey] || PLAN_DEFINITIONS.free;
    const usage = session && session.userId ? usageForUser(session.userId) : { searchesThisMonth: 0, leadsThisMonth: 0 };

    setText("accountPlanName", plan.name);
    setText("accountPlanPrice", plan.price);
    setText("accountLeadLimit", plan.leadLimit);
    setText("accountLeadUsage", usage.leadsThisMonth + " lead(s) visible this month.");
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
      return;
    }

    setText("accountEmail", session.email || "Signed-in user");
    setText("accountUserId", session.userId);
    setText("accountSessionStatus", "Active session");
    setText("accountSessionMeta", "This user ID is used for dashboard data filtering.");
    setText("settingsStatus", clean(session.email).toLowerCase() === ADMIN_EMAIL ? "Admin session active" : "Session active");
    renderPlan(session);
  }

  async function logout() {
    const status = byId("logoutStatus");
    if (status) {
      status.textContent = "Signing out...";
      status.classList.remove("is-error", "is-success");
    }
    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.signOut === "function") await window.rankforgeAuth.signOut();
      else if (window.rankforgeAuth && typeof window.rankforgeAuth.logout === "function") await window.rankforgeAuth.logout();
      else {
        const client = createSupabaseClient();
        if (client) await client.auth.signOut();
      }
    } catch (error) { console.warn("RankForge logout warning", error); }
    APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (status) { status.textContent = "Signed out. Redirecting..."; status.classList.add("is-success"); }
    window.location.href = "../login/";
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderAccount();
    const button = byId("logoutButton");
    if (button) button.addEventListener("click", logout);
  });
})();

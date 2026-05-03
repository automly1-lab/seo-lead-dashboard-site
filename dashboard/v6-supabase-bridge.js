(function () {
  "use strict";

  const ADMIN_EMAILS = new Set(["automly1@gmail.com", "omrkulaksiz1@gmail.com"]);
  const FREE_PLAN = { name: "Free", batchesLimit: 1, batchesUsed: 0, creditsLimit: 10, creditsUsed: 0 };
  const ADMIN_PLAN = { name: "Admin", batchesLimit: Number.MAX_SAFE_INTEGER, batchesUsed: 0, creditsLimit: Number.MAX_SAFE_INTEGER, creditsUsed: 0, unlimited: true };
  const USER_SYNC_HOOK_KEY = "rankforge-user-sync-webhook-v1";
  const USER_SYNC_SENT_KEY = "rankforge-user-sync-sent-v1";
  const USER_SYNC_HOOK = "https://lastaccount1907.app.n8n.cloud/webhook/rankforge-user-sync";

  function initials(email) {
    const raw = String(email || "").trim();
    if (!raw) return "RF";
    const local = raw.split("@")[0] || raw;
    return local.replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || raw.slice(0, 2).toUpperCase();
  }

  function isAdminEmail(email) { return ADMIN_EMAILS.has(String(email || "").toLowerCase()); }
  function webhookUrl() {
    const saved = String(localStorage.getItem(USER_SYNC_HOOK_KEY) || "").trim();
    if (!saved || saved.includes("rankforge-create-user")) {
      localStorage.setItem(USER_SYNC_HOOK_KEY, USER_SYNC_HOOK);
      return USER_SYNC_HOOK;
    }
    return saved;
  }
  function pendingMeta() { try { return JSON.parse(localStorage.getItem("rankforge-pending-user-sync-v1") || "{}"); } catch { return {}; } }

  function applyPlan(session) {
    const email = session && session.email ? session.email : "";
    const isAdmin = isAdminEmail(email);
    if (!window.state) return;
    window.state.user = Object.assign({}, window.state.user || {}, {
      email,
      userId: session && session.userId ? session.userId : "",
      role: isAdmin ? "admin" : "user",
      plan: isAdmin ? "Admin" : "Free"
    });
    window.state.plan = Object.assign({}, isAdmin ? ADMIN_PLAN : FREE_PLAN, window.state.plan || {});
    if (isAdmin) {
      window.state.plan.name = "Admin";
      window.state.plan.unlimited = true;
      window.state.plan.batchesLimit = Number.MAX_SAFE_INTEGER;
      window.state.plan.creditsLimit = Number.MAX_SAFE_INTEGER;
    } else {
      window.state.plan.name = window.state.plan.name || "Free";
      window.state.plan.batchesLimit = Number(window.state.plan.batchesLimit || FREE_PLAN.batchesLimit);
      window.state.plan.creditsLimit = Number(window.state.plan.creditsLimit || FREE_PLAN.creditsLimit);
    }
  }

  function updateCreditUi(session) {
    const email = session && session.email ? session.email : "";
    const isAdmin = isAdminEmail(email) || (window.state && window.state.plan && window.state.plan.unlimited);
    const used = window.state && window.state.plan ? Number(window.state.plan.creditsUsed || 0) : 0;
    const limit = window.state && window.state.plan ? Number(window.state.plan.creditsLimit || 0) : FREE_PLAN.creditsLimit;
    const usedNode = document.getElementById("creditsUsed");
    const limitNode = document.getElementById("creditsLimit");
    const bar = document.getElementById("creditsBar");
    if (usedNode) usedNode.textContent = isAdmin ? "Unlimited" : String(used);
    if (limitNode) limitNode.textContent = isAdmin ? "" : " / " + limit;
    if (bar) bar.style.width = isAdmin ? "100%" : (limit ? Math.min(100, used / limit * 100) + "%" : "0%");
  }

  function buildUserSyncPayload(session) {
    const meta = pendingMeta();
    const email = String((session && session.email) || meta.email || "").trim();
    const userId = String((session && session.userId) || (session && session.id) || "").trim();
    const admin = isAdminEmail(email);
    const now = new Date().toISOString();
    return {
      event: "user_synced",
      source: "rankforge_dashboard_ui_signup_fallback",
      user_id: userId,
      user_email: email,
      email: email,
      full_name: String(meta.full_name || "").trim(),
      agency_name: String(meta.agency_name || "").trim(),
      workspace_name: String(meta.agency_name || meta.full_name || email || "").trim(),
      role: admin ? "admin" : "user",
      status: "active",
      plan: admin ? "Admin" : "Free",
      billing_status: admin ? "admin_unlimited" : "free",
      search_batches_limit: admin ? "999999" : "1",
      search_batches_used: "0",
      qualified_lead_credits_limit: admin ? "999999" : "10",
      qualified_lead_credits_used: "0",
      effective_search_limit: admin ? "999999" : "1",
      effective_qualified_lead_limit: admin ? "999999" : "10",
      csv_export: admin ? "true" : "false",
      user_agent: navigator.userAgent || "",
      created_at: String(meta.created_at || now),
      updated_at: now,
      synced_at: now
    };
  }

  async function syncUserToN8n(session) {
    if (!session || !session.email) return;
    const meta = pendingMeta();
    if (!meta || !meta.email) return;
    const key = session.userId || session.email;
    if (localStorage.getItem(USER_SYNC_SENT_KEY) === key) return;
    if (window.rankforgeUserSync && typeof window.rankforgeUserSync.trySync === "function") {
      try { await window.rankforgeUserSync.trySync(session); } catch {}
      if (localStorage.getItem(USER_SYNC_SENT_KEY) === key) return;
    }
    const payload = buildUserSyncPayload(session);
    const body = new URLSearchParams();
    Object.keys(payload).forEach((field) => body.set(field, payload[field] == null ? "" : String(payload[field])));
    localStorage.setItem("rankforge-selected-plan-v1", payload.plan.toLowerCase());
    localStorage.setItem("rankforge-billing-status-v1", payload.billing_status);
    localStorage.setItem("rankforge-user-plan-v1", JSON.stringify(payload));
    await fetch(webhookUrl(), { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: body.toString() });
    localStorage.setItem(USER_SYNC_SENT_KEY, key);
    localStorage.removeItem("rankforge-pending-user-sync-v1");
  }

  function updateAccountUi(session) {
    const email = session && session.email ? session.email : "";
    const isAdmin = isAdminEmail(email);
    applyPlan(session);
    document.querySelectorAll(".account span, .avatar").forEach((node) => { node.textContent = initials(email); });
    document.querySelectorAll(".account strong").forEach((node) => { node.textContent = isAdmin ? "RankForge Admin" : "RankForge Workspace"; });
    document.querySelectorAll(".account small").forEach((node) => { node.textContent = email || "Redirecting to login"; });
    document.querySelectorAll(".nav.admin").forEach((node) => { node.style.display = isAdmin ? "flex" : "none"; });
    updateCreditUi(session);
    if (typeof window.render === "function") { try { window.render(); updateCreditUi(session); } catch {} }
  }

  async function getSession() {
    if (window.rankforgeAuth && typeof window.rankforgeAuth.refreshSession === "function") {
      const session = await window.rankforgeAuth.refreshSession();
      if (session && session.userId) return session;
    }
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
      const session = window.rankforgeAuth.getSession();
      if (session && session.userId) return session;
    }
    return null;
  }

  function bindLogout() {
    const logout = document.getElementById("logoutButton") || document.getElementById("logoutBtn") || document.querySelector("[data-logout]");
    if (!logout || logout.dataset.supabaseBridgeBound === "true") return;
    logout.id = "logoutButton";
    logout.setAttribute("data-logout", "true");
    logout.dataset.supabaseBridgeBound = "true";
    logout.addEventListener("click", async function (event) {
      event.preventDefault(); event.stopPropagation();
      if (window.rankforgeAuth && typeof window.rankforgeAuth.logout === "function") { await window.rankforgeAuth.logout(event); return; }
      localStorage.removeItem("rankforge-auth-session-v1");
      localStorage.removeItem("rankforge-current-user-id-v1");
      window.location.href = "../login/";
    }, true);
  }

  async function boot() {
    document.body.dataset.auth = "protected";
    bindLogout();
    const session = await getSession();
    if (!session || !session.userId) { window.location.replace("../login/"); return; }
    updateAccountUi(session);
    syncUserToN8n(session).catch((error) => console.warn("RankForge user sync failed", error));
    window.dispatchEvent(new CustomEvent("rankforge:dashboard-session", { detail: session }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
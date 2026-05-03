(function () {
  "use strict";

  const ADMIN_EMAILS = new Set(["automly1@gmail.com", "omrkulaksiz1@gmail.com"]);
  const FREE_PLAN = { name: "Free", batchesLimit: 1, batchesUsed: 0, creditsLimit: 10, creditsUsed: 0 };
  const ADMIN_PLAN = { name: "Admin", batchesLimit: Number.MAX_SAFE_INTEGER, batchesUsed: 0, creditsLimit: Number.MAX_SAFE_INTEGER, creditsUsed: 0, unlimited: true };

  function initials(email) {
    const raw = String(email || "").trim();
    if (!raw) return "RF";
    const local = raw.split("@")[0] || raw;
    return local.replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || raw.slice(0, 2).toUpperCase();
  }

  function isAdminEmail(email) {
    return ADMIN_EMAILS.has(String(email || "").toLowerCase());
  }

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
    const isAdmin = isAdminEmail(email);
    const used = window.state && window.state.plan ? Number(window.state.plan.creditsUsed || 0) : 0;
    const usedNode = document.getElementById("creditsUsed");
    const limitNode = document.getElementById("creditsLimit");
    const bar = document.getElementById("creditsBar");

    if (usedNode) usedNode.textContent = isAdmin ? "Unlimited" : String(used);
    if (limitNode) limitNode.textContent = isAdmin ? "" : " / " + (window.state && window.state.plan ? window.state.plan.creditsLimit : FREE_PLAN.creditsLimit);
    if (bar) bar.style.width = isAdmin ? "100%" : (window.state && window.state.plan && window.state.plan.creditsLimit ? Math.min(100, used / window.state.plan.creditsLimit * 100) + "%" : "0%");
  }

  function updateAccountUi(session) {
    const email = session && session.email ? session.email : "";
    const isAdmin = isAdminEmail(email);
    applyPlan(session);

    document.querySelectorAll(".account span, .avatar").forEach((node) => {
      node.textContent = initials(email);
    });
    document.querySelectorAll(".account strong").forEach((node) => {
      node.textContent = isAdmin ? "RankForge Admin" : "RankForge Workspace";
    });
    document.querySelectorAll(".account small").forEach((node) => {
      node.textContent = email || "Redirecting to login";
    });

    document.querySelectorAll(".nav.admin").forEach((node) => {
      node.style.display = isAdmin ? "flex" : "none";
    });

    updateCreditUi(session);
    if (typeof window.render === "function") {
      try { window.render(); updateCreditUi(session); } catch {}
    }
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
      event.preventDefault();
      event.stopPropagation();
      if (window.rankforgeAuth && typeof window.rankforgeAuth.logout === "function") {
        await window.rankforgeAuth.logout(event);
        return;
      }
      localStorage.removeItem("rankforge-auth-session-v1");
      localStorage.removeItem("rankforge-current-user-id-v1");
      window.location.href = "../login/";
    }, true);
  }

  async function boot() {
    document.body.dataset.auth = "protected";
    bindLogout();
    const session = await getSession();
    if (!session || !session.userId) {
      window.location.replace("../login/");
      return;
    }
    updateAccountUi(session);
    window.dispatchEvent(new CustomEvent("rankforge:dashboard-session", { detail: session }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
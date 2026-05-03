(function () {
  "use strict";

  const ADMIN_EMAILS = new Set(["automly1@gmail.com", "omrkulaksiz1@gmail.com"]);

  function initials(email) {
    const raw = String(email || "").trim();
    if (!raw) return "RF";
    const local = raw.split("@")[0] || raw;
    return local.replace(/[^a-z0-9]/gi, " ").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || raw.slice(0, 2).toUpperCase();
  }

  function updateAccountUi(session) {
    const email = session && session.email ? session.email : "";
    if (window.state) {
      window.state.user = Object.assign({}, window.state.user || {}, {
        email,
        userId: session && session.userId ? session.userId : ""
      });
    }

    document.querySelectorAll(".account span, .avatar").forEach((node) => {
      node.textContent = initials(email);
    });
    document.querySelectorAll(".account strong").forEach((node) => {
      node.textContent = email ? "RankForge Workspace" : "Signed out";
    });
    document.querySelectorAll(".account small").forEach((node) => {
      node.textContent = email || "Redirecting to login";
    });

    const isAdmin = ADMIN_EMAILS.has(String(email || "").toLowerCase());
    document.querySelectorAll(".nav.admin").forEach((node) => {
      node.style.display = isAdmin ? "flex" : "none";
    });
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
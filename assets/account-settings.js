(function () {
  const APP_STORAGE_KEYS = [
    "rankforge-clean-app-state-v1",
    "rankforge-dashboard-state-v3",
    "rankforge-current-user-id-v1",
    "rankforge-auth-session-v1"
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const node = byId(id);
    if (node) node.textContent = value;
  }

  function getStoredWebhook() {
    return localStorage.getItem("rankforge-search-submit-webhook-v1") || "Default webhook";
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
      return;
    }

    setText("accountEmail", session.email || "Signed-in user");
    setText("accountUserId", session.userId);
    setText("accountSessionStatus", "Active session");
    setText("accountSessionMeta", "This user ID is used for dashboard data filtering.");
    setText("settingsStatus", "Session active");
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

/*
  RankForge Supabase Auth Adapter
  Replaces localStorage-only auth with Supabase Auth while keeping the old app contract:
  - window.rankforgeAuth.getSession()
  - localStorage rankforge-auth-session-v1
  - localStorage rankforge-current-user-id-v1
  - protected pages with body[data-auth="protected"]
*/

(function () {
  "use strict";

  const AUTH_SESSION_KEY = "rankforge-auth-session-v1";
  const CURRENT_USER_KEY = "rankforge-current-user-id-v1";
  const SUPABASE_URL = window.RANKFORGE_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.RANKFORGE_SUPABASE_ANON_KEY || "";
  const DASHBOARD_PATH = "../dashboard/";
  const LOGIN_PATH = "../login/";

  function byId(id) {
    return document.getElementById(id);
  }

  function safeJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setStatus(message, tone) {
    const ids = ["authStatus", "loginStatus", "signupStatus", "formStatus"];
    ids.forEach((id) => {
      const node = byId(id);
      if (!node) return;
      node.textContent = message;
      node.classList.remove("is-success", "is-error");
      if (tone === "success") node.classList.add("is-success");
      if (tone === "error") node.classList.add("is-error");
    });
  }

  function getClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("[RankForge Auth] Missing Supabase config. Fill assets/supabase-config.js");
      return null;
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      console.warn("[RankForge Auth] Supabase JS library is not loaded. Add CDN script before auth.js.");
      return null;
    }
    if (!window.rankforgeSupabaseClient) {
      window.rankforgeSupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return window.rankforgeSupabaseClient;
  }

  function normalizeSession(supabaseSession) {
    if (!supabaseSession || !supabaseSession.user) return null;
    const user = supabaseSession.user;
    return {
      userId: user.id,
      email: user.email || "",
      provider: "supabase",
      createdAt: user.created_at || "",
      expiresAt: supabaseSession.expires_at || null
    };
  }

  function saveSession(session) {
    if (!session) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(CURRENT_USER_KEY, session.userId);
  }

  async function refreshSession() {
    const client = getClient();
    if (!client) {
      return safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);
    }

    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn("[RankForge Auth] getSession error:", error.message);
      return safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);
    }

    const session = normalizeSession(data && data.session);
    saveSession(session);
    return session;
  }

  async function requireAuthIfNeeded() {
    const isProtected = document.body && document.body.dataset.auth === "protected";
    if (!isProtected) return;

    const session = await refreshSession();
    if (!session || !session.userId) {
      window.location.replace(LOGIN_PATH);
    }
  }

  function readAuthFields() {
    const email =
      byId("emailInput")?.value ||
      byId("loginEmail")?.value ||
      byId("signupEmail")?.value ||
      document.querySelector('input[type="email"]')?.value ||
      "";

    const password =
      byId("passwordInput")?.value ||
      byId("loginPassword")?.value ||
      byId("signupPassword")?.value ||
      document.querySelector('input[type="password"]')?.value ||
      "";

    const name =
      byId("nameInput")?.value ||
      byId("signupName")?.value ||
      byId("fullNameInput")?.value ||
      "";

    return {
      email: String(email).trim(),
      password: String(password),
      name: String(name).trim()
    };
  }

  async function login(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (!client) {
      setStatus("Supabase config is missing. Check assets/supabase-config.js.", "error");
      return false;
    }

    const { email, password } = readAuthFields();
    if (!email || !password) {
      setStatus("Enter your email and password.", "error");
      return false;
    }

    setStatus("Signing in...", "");
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus(error.message || "Sign in failed.", "error");
      return false;
    }

    const session = normalizeSession(data.session);
    saveSession(session);
    setStatus("Signed in. Opening dashboard...", "success");
    window.location.href = DASHBOARD_PATH;
    return false;
  }

  async function signup(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (!client) {
      setStatus("Supabase config is missing. Check assets/supabase-config.js.", "error");
      return false;
    }

    const { email, password, name } = readAuthFields();
    if (!email || !password) {
      setStatus("Enter your email and password.", "error");
      return false;
    }
    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.", "error");
      return false;
    }

    setStatus("Creating account...", "");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || ""
        },
        emailRedirectTo: window.location.origin + "/dashboard/"
      }
    });

    if (error) {
      setStatus(error.message || "Signup failed.", "error");
      return false;
    }

    const session = normalizeSession(data.session);
    if (session) {
      saveSession(session);
      setStatus("Account created. Opening dashboard...", "success");
      window.location.href = DASHBOARD_PATH;
    } else {
      setStatus("Account created. Check your email to confirm your account.", "success");
    }
    return false;
  }

  async function logout(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (client) {
      await client.auth.signOut();
    }
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = LOGIN_PATH;
  }

  function bindForms() {
    const loginForm =
      byId("loginForm") ||
      document.querySelector('form[data-auth-form="login"]') ||
      (document.body?.classList.contains("app-page-login") ? document.querySelector("form") : null);

    const signupForm =
      byId("signupForm") ||
      document.querySelector('form[data-auth-form="signup"]') ||
      (document.body?.classList.contains("app-page-signup") ? document.querySelector("form") : null);

    if (loginForm) loginForm.onsubmit = login;
    if (signupForm) signupForm.onsubmit = signup;

    document.querySelectorAll("[data-logout], #logoutButton").forEach((node) => {
      node.addEventListener("click", logout);
    });
  }

  window.rankforgeAuth = {
    getSession: function () {
      return safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);
    },
    refreshSession,
    login,
    signup,
    logout,
    getSupabaseClient: getClient
  };

  async function boot() {
    bindForms();
    await requireAuthIfNeeded();

    const client = getClient();
    if (client) {
      client.auth.onAuthStateChange((_event, supabaseSession) => {
        saveSession(normalizeSession(supabaseSession));
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

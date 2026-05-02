/*
  RankForge Supabase Auth Adapter
  Keeps the old app contract while powering premium login/signup pages:
  - window.rankforgeAuth.getSession()
  - localStorage rankforge-auth-session-v1
  - localStorage rankforge-current-user-id-v1
  - protected pages with body[data-auth="protected"]
*/

(function () {
  "use strict";

  const AUTH_SESSION_KEY = "rankforge-auth-session-v1";
  const CURRENT_USER_KEY = "rankforge-current-user-id-v1";
  const SELECTED_PLAN_KEY = "rankforge-selected-plan-v1";
  const BILLING_STATUS_KEY = "rankforge-billing-status-v1";
  const CHECKOUT_INTENT_KEY = "rankforge-post-auth-intent-v1";
  const CHECKOUT_PLAN_KEY = "rankforge-post-auth-plan-v1";
  const SUPABASE_URL = window.RANKFORGE_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.RANKFORGE_SUPABASE_ANON_KEY || "";
  const DASHBOARD_PATH = "../dashboard/";
  const ONBOARDING_PATH = "../onboarding/";
  const LOGIN_PATH = "../login/";

  function byId(id) { return document.getElementById(id); }
  function safeJson(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
  function safeInternalPath(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("//")) return "";
    if (!raw.startsWith("/")) return "";
    return raw;
  }
  function relativeFromRoot(path) {
    const clean = String(path || "").replace(/^\/+/, "");
    return "../" + clean;
  }
  function friendlyError(error) {
    const msg = String((error && error.message) || error || "").toLowerCase();
    if (msg.includes("invalid login credentials")) return "The email or password is incorrect.";
    if (msg.includes("email not confirmed")) return "Please confirm your email before logging in.";
    if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already registered")) return "An account with this email may already exist. Try logging in.";
    if (msg.includes("password") && (msg.includes("weak") || msg.includes("at least"))) return "Please use a stronger password.";
    if (msg.includes("invalid email")) return "Enter a valid email address.";
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) return "Could not reach authentication service. Try again.";
    return error && error.message ? "Something went wrong. Please try again." : "Something went wrong. Please try again.";
  }
  function setStatus(message, tone) {
    const ids = ["authStatus", "loginStatus", "signupStatus", "formStatus", "authFormStatus"];
    ids.forEach((id) => {
      const node = byId(id);
      if (!node) return;
      node.textContent = message;
      node.hidden = false;
      node.classList.remove("is-success", "is-error");
      if (tone === "success") node.classList.add("is-success");
      if (tone === "error") node.classList.add("is-error");
    });
  }
  function setSubmitting(isSubmitting, fallbackText) {
    const btn = byId("authSubmitButton") || document.querySelector(".rf-auth-button") || document.querySelector(".auth-form button[type='submit']");
    if (!btn) return;
    if (!btn.dataset.defaultText) btn.dataset.defaultText = btn.textContent.trim() || fallbackText || "Submit";
    btn.disabled = !!isSubmitting;
    btn.textContent = isSubmitting ? (btn.dataset.loadingText || fallbackText || "Working…") : btn.dataset.defaultText;
  }

  function isNestedPage() {
    return /\/(dashboard|searches|leads|lead-detail|settings|quality|login|signup|onboarding|checkout-success|checkout-cancelled|checkout-pending|how-it-works|pricing|status|privacy|terms|refund-policy)\//.test(location.pathname || "") || /\/404\.html$/.test(location.pathname || "");
  }
  function seoPrefix() { return isNestedPage() ? "../" : ""; }
  function loadScriptOnce(src, marker) {
    if (document.querySelector('script[data-' + marker + '="true"]')) return;
    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    script.setAttribute('data-' + marker, 'true');
    document.body.appendChild(script);
  }
  function privateSeoPath() {
    return /\/(dashboard|searches|leads|lead-detail|settings|quality|onboarding|checkout-success|checkout-cancelled|checkout-pending)\//.test(location.pathname || "") || /\/404\.html$/.test(location.pathname || "");
  }
  function ensureNoindexForPrivatePages() {
    if (!privateSeoPath()) return;
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, follow");
  }
  function loadSeo() {
    loadScriptOnce(seoPrefix() + "assets/seo.js?v=seo-1", "rf-seo");
    ensureNoindexForPrivatePages();
  }

  function billingConfig() { return window.RANKFORGE_BILLING || {}; }
  function normalizePlan(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    if (raw === "growth" || raw === "pro") return "growth";
    if (raw === "agency" || raw === "agency_intelligence") return "agency_intelligence";
    return "starter";
  }
  function checkoutLinkForPlan(planKey) {
    const config = billingConfig();
    if (planKey === "starter") return String(config.starterPaymentLink || "").trim();
    if (planKey === "growth") return String(config.growthPaymentLink || "").trim();
    return "";
  }

  function preserveIntentLinks() {
    const search = window.location.search || "";
    if (!search) return;
    document.querySelectorAll(".auth-switch a,.rf-auth-switch a").forEach((link) => {
      try {
        const url = new URL(link.getAttribute("href"), window.location.href);
        const current = new URLSearchParams(search);
        current.forEach((value, key) => url.searchParams.set(key, value));
        link.setAttribute("href", url.pathname + url.search);
      } catch {}
    });
  }
  function clearPostAuthIntent() {
    localStorage.removeItem(CHECKOUT_INTENT_KEY);
    localStorage.removeItem(CHECKOUT_PLAN_KEY);
  }
  function resolvePostAuthDestination(defaultPath) {
    const params = new URLSearchParams(window.location.search || "");
    const returnTo = safeInternalPath(params.get("returnTo"));
    if (returnTo) return relativeFromRoot(returnTo);

    const intent = String(params.get("intent") || localStorage.getItem(CHECKOUT_INTENT_KEY) || "").trim().toLowerCase();
    const plan = normalizePlan(params.get("plan") || localStorage.getItem(CHECKOUT_PLAN_KEY) || localStorage.getItem(SELECTED_PLAN_KEY) || "starter");

    if (!intent) {
      clearPostAuthIntent();
      return defaultPath || DASHBOARD_PATH;
    }

    localStorage.setItem(SELECTED_PLAN_KEY, plan);
    localStorage.setItem(BILLING_STATUS_KEY, plan === "agency_intelligence" ? "waitlist" : "pending_payment");

    if (intent === "checkout" && plan !== "agency_intelligence") {
      const paymentLink = checkoutLinkForPlan(plan);
      clearPostAuthIntent();
      return paymentLink || "../settings/";
    }

    clearPostAuthIntent();
    return "../settings/";
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
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
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
      localStorage.removeItem(CURRENT_USER_KEY);
      return;
    }
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    localStorage.setItem(CURRENT_USER_KEY, session.userId);
  }

  async function refreshSession() {
    const client = getClient();
    if (!client) return safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);

    const { data, error } = await client.auth.getSession();
    if (error) {
      console.warn("[RankForge Auth] getSession error:", error.message);
      return safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);
    }

    const session = normalizeSession(data && data.session);
    if (session) saveSession(session);
    return session || safeJson(localStorage.getItem(AUTH_SESSION_KEY), null);
  }

  async function requireAuthIfNeeded() {
    const isProtected = document.body && document.body.dataset.auth === "protected";
    if (!isProtected) return;
    const session = await refreshSession();
    if (!session || !session.userId) window.location.replace(LOGIN_PATH);
  }

  async function redirectAuthPagesIfSignedIn() {
    const isAuthPage = document.body && document.body.dataset.authPage === "true";
    if (!isAuthPage) return;
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("intent") || params.get("plan") || params.get("returnTo")) return;
    const session = await refreshSession();
    if (session && session.userId) window.location.replace(DASHBOARD_PATH);
  }

  function readAuthFields() {
    const email = byId("emailInput")?.value || byId("loginEmail")?.value || byId("signupEmail")?.value || document.querySelector('input[type="email"]')?.value || "";
    const password = byId("passwordInput")?.value || byId("loginPassword")?.value || byId("signupPassword")?.value || document.querySelector('input[type="password"]')?.value || "";
    const confirm = byId("confirmPassword")?.value || document.querySelector('input[name="confirm_password"]')?.value || "";
    const name = byId("nameInput")?.value || byId("signupName")?.value || byId("fullNameInput")?.value || document.querySelector('input[name="full_name"]')?.value || "";
    return { email: String(email).trim(), password: String(password), confirm: String(confirm), name: String(name).trim() };
  }

  async function login(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (!client) { setStatus("Could not reach authentication service. Try again.", "error"); return false; }
    const { email, password } = readAuthFields();
    if (!email || !password) { setStatus("Enter your email and password.", "error"); return false; }
    setSubmitting(true, "Logging in…");
    setStatus("Logging in…", "");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) { setSubmitting(false); setStatus(friendlyError(error), "error"); return false; }
    const session = normalizeSession(data.session);
    saveSession(session);
    setStatus("Logged in. Redirecting…", "success");
    window.location.href = resolvePostAuthDestination(DASHBOARD_PATH);
    return false;
  }

  async function signup(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (!client) { setStatus("Could not reach authentication service. Try again.", "error"); return false; }
    const { email, password, confirm, name } = readAuthFields();
    if (!email || !password) { setStatus("Enter your email and password.", "error"); return false; }
    if (confirm && password !== confirm) { setStatus("Passwords do not match.", "error"); return false; }
    if (password.length < 6) { setStatus("Please use a stronger password.", "error"); return false; }
    setSubmitting(true, "Creating workspace…");
    setStatus("Creating workspace…", "");
    const redirectTo = window.location.origin + window.location.pathname.replace(/\/signup\/.*/, "/onboarding/");
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: name || "" }, emailRedirectTo: redirectTo } });
    if (error) { setSubmitting(false); setStatus(friendlyError(error), "error"); return false; }
    const session = normalizeSession(data.session);
    if (session) {
      saveSession(session);
      setStatus("Workspace created. Redirecting…", "success");
      window.location.href = resolvePostAuthDestination(ONBOARDING_PATH);
    } else {
      setSubmitting(false);
      setStatus("Workspace created. Check your email to confirm your account.", "success");
    }
    return false;
  }

  async function logout(event) {
    if (event && event.preventDefault) event.preventDefault();
    const client = getClient();
    if (client) await client.auth.signOut();
    saveSession(null);
    window.location.href = LOGIN_PATH;
  }

  function bindPasswordToggles() {
    document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
      if (btn.dataset.bound === "true") return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", () => {
        const input = byId(btn.getAttribute("data-toggle-password"));
        if (!input) return;
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Hide" : "Show";
        btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      });
    });
  }

  function bindForms() {
    preserveIntentLinks();
    bindPasswordToggles();
    const loginForm = byId("loginForm") || document.querySelector('form[data-auth-form="login"]') || (document.body?.classList.contains("app-page-login") ? document.querySelector("form") : null);
    const signupForm = byId("signupForm") || document.querySelector('form[data-auth-form="signup"]') || (document.body?.classList.contains("app-page-signup") ? document.querySelector("form") : null);
    if (loginForm) loginForm.onsubmit = login;
    if (signupForm) signupForm.onsubmit = signup;
    document.querySelectorAll("[data-logout], #logoutButton").forEach((node) => node.addEventListener("click", logout));
  }

  window.rankforgeAuth = { getSession: () => safeJson(localStorage.getItem(AUTH_SESSION_KEY), null), refreshSession, login, signup, logout, getSupabaseClient: getClient };

  async function boot() {
    loadSeo();
    bindForms();
    await redirectAuthPagesIfSignedIn();
    await requireAuthIfNeeded();
    const client = getClient();
    if (client) {
      client.auth.onAuthStateChange((event, supabaseSession) => {
        const normalized = normalizeSession(supabaseSession);
        if (normalized) saveSession(normalized);
        else if (event === "SIGNED_OUT") saveSession(null);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
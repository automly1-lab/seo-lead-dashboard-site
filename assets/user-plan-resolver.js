(function () {
  "use strict";

  var DEBUG_KEY = "rankforge-profile-debug-v1";
  var CACHE_KEY = "rankforge-resolved-profile-v1";
  var LEGACY_CACHE_KEY = "rankforge-user-profile-cache-v1";
  var CURRENT_PLAN_KEY = "rankforge-current-plan-v1";
  var SELECTED_PLAN_KEY = "rankforge-selected-plan-v1";
  var BILLING_STATUS_KEY = "rankforge-billing-status-v1";
  var AUTH_SESSION_KEY = "rankforge-auth-session-v1";
  var CURRENT_USER_KEY = "rankforge-current-user-id-v1";
  var SEARCH_LIMIT_KEY = "rankforge-monthly-search-limit-v1";
  var LEAD_LIMIT_KEY = "rankforge-monthly-qualified-credit-limit-v1";
  var MAX_BATCH_KEY = "rankforge-max-leads-per-batch-v1";
  var ADMIN_MANAGED_KEY = "rankforge-admin-plan-managed-v1";
  var SHEET_ID = "1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco";
  var USERS_SHEET = "users";
  var ADMIN_EMAIL = "automly1@gmail.com";
  var CACHE_TTL_MS = 2 * 60 * 1000;
  var MAX_AUTH_RETRIES = 30;
  var lastResolvedProfile = null;
  var lastResolvedAt = 0;
  var inflightPromise = null;
  var authRetryCount = 0;

  var PLAN_DEFAULTS = {
    free: { plan: "free", plan_label: "Free", monthly_search_limit: 2, monthly_qualified_lead_credit_limit: 10, max_leads_per_batch: 10, access_label: "Free workspace" },
    starter: { plan: "starter", plan_label: "Starter", monthly_search_limit: 50, monthly_qualified_lead_credit_limit: 50, max_leads_per_batch: 25, access_label: "Starter plan" },
    growth: { plan: "growth", plan_label: "Growth", monthly_search_limit: 150, monthly_qualified_lead_credit_limit: 250, max_leads_per_batch: 50, access_label: "Growth plan" },
    agency_intelligence: { plan: "agency_intelligence", plan_label: "Agency Intelligence", monthly_search_limit: 750, monthly_qualified_lead_credit_limit: 1000, max_leads_per_batch: 100, access_label: "Agency Intelligence" },
    admin_unlimited: { plan: "admin_unlimited", plan_label: "Admin Unlimited", monthly_search_limit: Infinity, monthly_qualified_lead_credit_limit: Infinity, max_leads_per_batch: 50, access_label: "Admin unlimited" }
  };

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function lower(value) { return clean(value).toLowerCase(); }
  function safeParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch (_) { return fallback; } }
  function first() { for (var i = 0; i < arguments.length; i += 1) { var value = clean(arguments[i]); if (value) return value; } return ""; }
  function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value)); }
  function numberValue(value, fallback) {
    var raw = clean(value);
    if (/^(infinity|unlimited|∞)$/i.test(raw)) return Infinity;
    var parsed = Number(raw.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed)) return Math.max(0, Math.round(parsed));
    return fallback === Infinity ? Infinity : (Number.isFinite(fallback) ? fallback : 0);
  }

  function getSession() {
    try {
      if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === "function") {
        var authSession = window.rankforgeAuth.getSession();
        if (authSession && (authSession.userId || authSession.id || authSession.email || authSession.userEmail)) return authSession;
      }
      var stored = safeParse(localStorage.getItem(AUTH_SESSION_KEY), null);
      if (stored && (stored.userId || stored.id || stored.email || stored.userEmail)) return stored;
    } catch (_) {}
    return null;
  }

  function getCurrentUserId() {
    var session = getSession() || {};
    var sessionUserId = clean(session.userId || session.id);
    if (isUuid(sessionUserId)) {
      localStorage.setItem(CURRENT_USER_KEY, sessionUserId);
      return sessionUserId;
    }
    var stored = clean(localStorage.getItem(CURRENT_USER_KEY));
    return isUuid(stored) ? stored : "";
  }

  function getCurrentEmail() {
    var session = getSession() || {};
    return lower(session.email || session.userEmail);
  }

  function normalizePlan(value) {
    var raw = lower(value).replace(/\s+/g, "_").replace(/-/g, "_");
    if (!raw) return "";
    if (/admin|unlimited/.test(raw)) return "admin_unlimited";
    if (["free", "trial"].indexOf(raw) >= 0) return "free";
    if (["starter", "start", "basic", "starter_plan", "launch", "launch_plan"].indexOf(raw) >= 0) return "starter";
    if (["growth", "pro", "founding", "founding_plan"].indexOf(raw) >= 0) return "growth";
    if (["agency", "agency_intelligence", "enterprise"].indexOf(raw) >= 0) return "agency_intelligence";
    return raw;
  }

  function normalizeBillingStatus(value) {
    var raw = lower(value).replace(/\s+/g, "_").replace(/-/g, "_");
    if (!raw) return "free";
    if (/admin|unlimited/.test(raw)) return "admin_unlimited";
    if (["active", "paid", "confirmed", "trialing", "complete", "checkout_complete", "subscription_active"].indexOf(raw) >= 0) return "active";
    if (["free", "free_plan"].indexOf(raw) >= 0) return "free";
    if (["pending", "pending_payment", "unpaid", "incomplete"].indexOf(raw) >= 0) return "pending_payment";
    if (["waitlist", "coming_soon"].indexOf(raw) >= 0) return "waitlist";
    if (["canceled", "cancelled"].indexOf(raw) >= 0) return "canceled";
    if (["past_due", "pastdue"].indexOf(raw) >= 0) return "past_due";
    return raw;
  }

  function planDefaults(planKey) {
    return PLAN_DEFAULTS[planKey] || PLAN_DEFAULTS.free;
  }

  function isAdminEmail(email) {
    return lower(email) === ADMIN_EMAIL;
  }

  function parseRows(payload) {
    var cols = ((payload.table && payload.table.cols) || []).map(function (c) { return c.label || c.id || ""; });
    return ((payload.table && payload.table.rows) || []).map(function (row, index) {
      var record = { __sheetRow: index + 2, _row_index: index + 2 };
      (row.c || []).forEach(function (cell, i) {
        record[cols[i]] = cell ? clean(cell.f || cell.v || "") : "";
      });
      return record;
    });
  }

  function fetchUsersSheet() {
    return new Promise(function (resolve) {
      var callbackName = "rfPlan_" + Date.now() + "_" + Math.floor(Math.random() * 9999);
      var script = document.createElement("script");
      var finished = false;
      var timeout = setTimeout(function () { done([]); }, 10000);

      function done(rows) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (_) {}
        resolve(rows || []);
      }

      window[callbackName] = function (payload) {
        try { done(parseRows(payload)); } catch (_) { done([]); }
      };
      script.src = "https://docs.google.com/spreadsheets/d/" + SHEET_ID + "/gviz/tq?sheet=" + encodeURIComponent(USERS_SHEET) + "&tqx=responseHandler:" + callbackName + "&cacheBust=" + Date.now();
      script.onerror = function () { done([]); };
      document.body.appendChild(script);
    });
  }

  function rowTimestamp(row) {
    var values = [row.synced_at, row.updated_at, row.created_at, row.last_login_at];
    for (var i = 0; i < values.length; i += 1) {
      var time = new Date(values[i] || "").getTime();
      if (Number.isFinite(time) && time > 0) return time;
    }
    return 0;
  }

  function rowSource(row) { return lower(first(row.source, row.admin_override, row.override_active)); }
  function rowPlan(row) { return normalizePlan(first(row.plan, row.current_plan, row.plan_name)); }
  function rowBilling(row) { return normalizeBillingStatus(first(row.billing_status, row.subscription_status)); }

  function isAdminManagedRow(row) {
    var source = rowSource(row);
    return source === "admin_override" || source === "admin_managed" || source === "true" || source === "rankforge_admin_quality_override";
  }

  function profilePriority(row) {
    if (rowSource(row) === "admin_override") return 3;
    if (rowSource(row) === "admin_managed" || isAdminManagedRow(row)) return 2;
    if (rowSource(row) === "frontend_user_sync") return 1;
    return 0;
  }

  function rowMatchesSession(row, userId, email) {
    var rowUserId = clean(first(row.user_id, row.userId, row.owner_user_id, row.id));
    var rowEmail = lower(first(row.email, row.user_email));
    var matchesUserId = Boolean(userId && rowUserId && rowUserId === userId);
    var matchesEmail = Boolean(email && rowEmail && rowEmail === email);
    return matchesUserId || matchesEmail;
  }

  function chooseWinningRow(rows, userId, email) {
    var matches = rows.filter(function (row) { return rowMatchesSession(row, userId, email); });
    if (!matches.length) return null;
    var overrides = matches.filter(isAdminManagedRow);
    var candidates = overrides.length ? overrides : matches;
    candidates.sort(function (left, right) {
      var priorityDelta = profilePriority(right) - profilePriority(left);
      if (priorityDelta !== 0) return priorityDelta;
      var timeDelta = rowTimestamp(right) - rowTimestamp(left);
      if (timeDelta !== 0) return timeDelta;
      return numberValue(right.__sheetRow || right._row_index, 0) - numberValue(left.__sheetRow || left._row_index, 0);
    });
    return { row: candidates[0] || null, matchedCount: matches.length };
  }

  function fallbackProfile(userId, email) {
    var selectedPlan = normalizePlan(localStorage.getItem(CURRENT_PLAN_KEY) || localStorage.getItem(SELECTED_PLAN_KEY) || localStorage.getItem("rankforge-plan-v1") || "free") || "free";
    if (isAdminEmail(email)) selectedPlan = "admin_unlimited";
    var defaults = planDefaults(selectedPlan);
    var billingStatus = isAdminEmail(email) ? "admin_unlimited" : normalizeBillingStatus(localStorage.getItem(BILLING_STATUS_KEY) || "free");
    return {
      profile_source: "local",
      source_row_source: "local_storage",
      source_sheet_row: 0,
      user_id: userId,
      email: email,
      plan: defaults.plan,
      plan_label: defaults.plan_label,
      current_plan: defaults.plan,
      billing_status: billingStatus,
      billing_status_raw: billingStatus,
      subscription_status: billingStatus,
      monthly_search_limit: defaults.monthly_search_limit,
      monthly_qualified_lead_credit_limit: defaults.monthly_qualified_lead_credit_limit,
      max_leads_per_batch: defaults.max_leads_per_batch,
      base_search_limit: defaults.monthly_search_limit,
      base_qualified_lead_limit: defaults.monthly_qualified_lead_credit_limit,
      extra_search_credits: 0,
      extra_qualified_lead_credits: 0,
      matched_by: isAdminEmail(email) ? "admin_email" : "local_fallback",
      matched_rows_count: 0,
      admin_managed: false,
      is_admin: defaults.plan === "admin_unlimited"
    };
  }

  function cachedMatchesSession(profile, userId, email) {
    if (!profile || typeof profile !== "object") return false;
    var profileUserId = clean(profile.user_id);
    var profileEmail = lower(profile.email);
    return Boolean((userId && profileUserId && profileUserId === userId) || (email && profileEmail && profileEmail === email));
  }

  function adminProfile(userId, email) {
    var defaults = planDefaults("admin_unlimited");
    return {
      profile_source: "sheet",
      source_row_source: "admin_override",
      source_sheet_row: 0,
      user_id: userId,
      email: email,
      plan: defaults.plan,
      plan_label: defaults.plan_label,
      current_plan: defaults.plan,
      billing_status: "admin_unlimited",
      billing_status_raw: "admin_unlimited",
      subscription_status: "admin_unlimited",
      monthly_search_limit: defaults.monthly_search_limit,
      monthly_qualified_lead_credit_limit: defaults.monthly_qualified_lead_credit_limit,
      max_leads_per_batch: defaults.max_leads_per_batch,
      base_search_limit: defaults.monthly_search_limit,
      base_qualified_lead_limit: defaults.monthly_qualified_lead_credit_limit,
      extra_search_credits: 0,
      extra_qualified_lead_credits: 0,
      matched_by: "admin_email",
      matched_rows_count: 1,
      admin_managed: true,
      is_admin: true
    };
  }

  function buildProfileFromRow(row, userId, email, matchedRowsCount) {
    var normalizedPlan = rowPlan(row) || normalizePlan(localStorage.getItem(CURRENT_PLAN_KEY) || localStorage.getItem(SELECTED_PLAN_KEY) || "free") || "free";
    var defaults = planDefaults(normalizedPlan);
    var baseSearchLimit = numberValue(first(row.base_search_limit, row.monthly_search_limit), defaults.monthly_search_limit);
    var baseLeadLimit = numberValue(first(row.base_qualified_lead_limit, row.monthly_qualified_lead_credit_limit), defaults.monthly_qualified_lead_credit_limit);
    var extraSearchCredits = numberValue(row.extra_search_credits, 0);
    var extraLeadCredits = numberValue(row.extra_qualified_lead_credits, 0);
    var effectiveSearchLimit = numberValue(first(row.effective_search_limit, row.monthly_search_limit), baseSearchLimit + extraSearchCredits);
    var effectiveLeadLimit = numberValue(first(row.effective_qualified_lead_limit, row.monthly_qualified_lead_credit_limit), baseLeadLimit + extraLeadCredits);
    var maxLeadsPerBatch = numberValue(row.max_leads_per_batch, defaults.max_leads_per_batch);
    var source = rowSource(row) || "unknown";
    var rawBilling = first(row.billing_status, row.subscription_status);
    var normalizedBilling = rowBilling(row);
    var adminManaged = isAdminManagedRow(row);

    if (adminManaged && normalizedPlan !== "free" && normalizedPlan !== "admin_unlimited") {
      normalizedBilling = normalizedBilling || "free";
    }

    return {
      profile_source: "sheet",
      source_row_source: source,
      source_sheet_row: numberValue(row.__sheetRow || row._row_index, 0),
      user_id: clean(first(row.user_id, row.userId, userId)),
      email: lower(first(row.email, row.user_email, email)),
      plan: normalizedPlan,
      plan_label: defaults.plan_label,
      current_plan: normalizedPlan,
      plan_name: normalizedPlan,
      billing_status: normalizedBilling,
      billing_status_raw: clean(rawBilling || normalizedBilling),
      subscription_status: normalizedBilling,
      monthly_search_limit: effectiveSearchLimit,
      monthly_qualified_lead_credit_limit: effectiveLeadLimit,
      max_leads_per_batch: maxLeadsPerBatch,
      base_search_limit: baseSearchLimit,
      base_qualified_lead_limit: baseLeadLimit,
      effective_search_limit: effectiveSearchLimit,
      effective_qualified_lead_limit: effectiveLeadLimit,
      extra_search_credits: extraSearchCredits,
      extra_qualified_lead_credits: extraLeadCredits,
      matched_by: clean(first(row.user_id, row.userId)) === userId ? "user_id_or_email" : "email",
      matched_rows_count: matchedRowsCount,
      synced_at: clean(row.synced_at),
      updated_at: clean(row.updated_at),
      source_row: row,
      admin_managed: adminManaged,
      is_admin: normalizedPlan === "admin_unlimited"
    };
  }

  function monthStart() { var now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1).getTime(); }
  function inCurrentMonth(value) { var time = new Date(value || "").getTime(); return Number.isFinite(time) && time >= monthStart(); }

  function collectAppState() {
    var state = safeParse(localStorage.getItem("rankforge-clean-app-state-v1"), {}) || {};
    var lists = [];
    var leads = [];
    if (Array.isArray(state.localLists)) lists.push.apply(lists, state.localLists);
    if (state.remoteCache && Array.isArray(state.remoteCache.lists)) lists.push.apply(lists, state.remoteCache.lists);
    if (Array.isArray(state.localLeads)) leads.push.apply(leads, state.localLeads);
    if (state.remoteCache && Array.isArray(state.remoteCache.leads)) leads.push.apply(leads, state.remoteCache.leads);
    return { lists: lists, leads: leads };
  }

  function calculateUsage(profile) {
    var snapshot = collectAppState();
    var userId = clean(profile && profile.user_id);
    var searchesSeen = new Set();
    var leadIds = new Set();
    snapshot.lists.forEach(function (item) {
      if (!item) return;
      if (userId && clean(item.userId || item.user_id) !== userId) return;
      if (!inCurrentMonth(item.lastRun || item.created_at || item.createdAt || item.updated_at)) return;
      var searchId = clean(item.id || item.search_id);
      if (searchId) searchesSeen.add(searchId);
    });
    snapshot.leads.forEach(function (item) {
      if (!item) return;
      if (userId && clean(item.userId || item.user_id) !== userId) return;
      if (!inCurrentMonth(item.created_at || item.createdAt || item.updated_at || item.lastRun)) return;
      if (lower(item.status) !== "qualified") return;
      var leadId = clean(item.id || item.lead_id);
      if (leadId) leadIds.add(leadId);
    });
    return { searches_this_month: searchesSeen.size, qualified_leads_this_month: leadIds.size };
  }

  function writeProfileToStorage(profile) {
    localStorage.setItem(CURRENT_PLAN_KEY, profile.plan);
    localStorage.setItem(SELECTED_PLAN_KEY, profile.plan);
    localStorage.setItem("rankforge-plan-v1", profile.plan);
    localStorage.setItem(BILLING_STATUS_KEY, profile.billing_status);
    localStorage.setItem(SEARCH_LIMIT_KEY, String(profile.monthly_search_limit));
    localStorage.setItem(LEAD_LIMIT_KEY, String(profile.monthly_qualified_lead_credit_limit));
    localStorage.setItem(MAX_BATCH_KEY, String(profile.max_leads_per_batch));
    localStorage.setItem(ADMIN_MANAGED_KEY, profile.admin_managed ? "true" : "false");
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
    localStorage.setItem(LEGACY_CACHE_KEY, JSON.stringify(profile));
    localStorage.setItem(DEBUG_KEY, JSON.stringify(profile));
  }

  function finalizeProfile(profile, shouldDispatch) {
    var usage = calculateUsage(profile);
    var finalized = Object.assign({}, profile, {
      searches_this_month: usage.searches_this_month,
      qualified_leads_this_month: usage.qualified_leads_this_month,
      remaining_searches: profile.monthly_search_limit === Infinity ? Infinity : Math.max(0, numberValue(profile.monthly_search_limit, 0) - usage.searches_this_month),
      remaining_qualified_lead_credits: profile.monthly_qualified_lead_credit_limit === Infinity ? Infinity : Math.max(0, numberValue(profile.monthly_qualified_lead_credit_limit, 0) - usage.qualified_leads_this_month),
      resolved_at: new Date().toISOString()
    });
    lastResolvedProfile = finalized;
    lastResolvedAt = Date.now();
    writeProfileToStorage(finalized);
    window.rankforgeUserProfile = finalized;
    if (shouldDispatch !== false) {
      try { document.dispatchEvent(new CustomEvent("rankforge-profile-resolved", { detail: finalized })); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent("rankforge:user-profile-resolved", { detail: finalized })); } catch (_) {}
    }
    return finalized;
  }

  function getCachedProfile() {
    var cached = safeParse(localStorage.getItem(CACHE_KEY), null) || safeParse(localStorage.getItem(LEGACY_CACHE_KEY), null);
    if (!cached || typeof cached !== "object") return null;
    return finalizeProfile(cached, false);
  }

  function scheduleAuthRetry() {
    if (authRetryCount >= MAX_AUTH_RETRIES) return;
    authRetryCount += 1;
    setTimeout(function () {
      resolveProfile({ force: true, allowRetry: true });
    }, 500);
  }

  function resolveProfile(options) {
    options = options || {};
    var force = Boolean(options.force);
    if (!force && lastResolvedProfile && Date.now() - lastResolvedAt < CACHE_TTL_MS) return Promise.resolve(finalizeProfile(lastResolvedProfile));
    if (!force && inflightPromise) return inflightPromise;

    var userId = getCurrentUserId();
    var email = getCurrentEmail();
    if (!userId && !email) {
      if (options.allowRetry !== false) scheduleAuthRetry();
      return Promise.resolve(null);
    }
    authRetryCount = 0;
    if (isAdminEmail(email)) return Promise.resolve(finalizeProfile(adminProfile(userId, email), true));

    var cached = !force ? (safeParse(localStorage.getItem(CACHE_KEY), null) || safeParse(localStorage.getItem(LEGACY_CACHE_KEY), null)) : null;
    inflightPromise = fetchUsersSheet()
      .then(function (rows) {
        var winner = chooseWinningRow(rows, userId, email);
        if (!winner || !winner.row) {
          if (cachedMatchesSession(cached, userId, email)) return finalizeProfile(cached, true);
          return finalizeProfile(fallbackProfile(userId, email), true);
        }
        return finalizeProfile(buildProfileFromRow(winner.row, userId, email, winner.matchedCount), true);
      })
      .catch(function () {
        if (cachedMatchesSession(cached, userId, email)) return finalizeProfile(cached, true);
        return finalizeProfile(fallbackProfile(userId, email), true);
      })
      .finally(function () {
        inflightPromise = null;
      });

    return inflightPromise;
  }

  function getResolvedProfileSync() {
    if (lastResolvedProfile) return finalizeProfile(lastResolvedProfile, false);
    var cached = safeParse(localStorage.getItem(CACHE_KEY), null) || safeParse(localStorage.getItem(LEGACY_CACHE_KEY), null);
    if (cachedMatchesSession(cached, getCurrentUserId(), getCurrentEmail())) return finalizeProfile(cached, false);
    return finalizeProfile(fallbackProfile(getCurrentUserId(), getCurrentEmail()), false);
  }

  function getPlanInfo(options) {
    return resolveProfile(options).then(function (profile) {
      if (!profile) profile = fallbackProfile(getCurrentUserId(), getCurrentEmail());
      return {
        key: profile.plan,
        name: profile.plan_label,
        limit: profile.monthly_search_limit,
        leadLimit: profile.monthly_qualified_lead_credit_limit,
        maxLeadsPerBatch: profile.max_leads_per_batch,
        label: profile.monthly_search_limit === Infinity ? "Unlimited search batches" : profile.monthly_search_limit + " search batches/month",
        usage: {
          searchesThisMonth: profile.searches_this_month,
          qualifiedLeadsThisMonth: profile.qualified_leads_this_month,
          remainingSearches: profile.remaining_searches,
          remainingQualifiedLeadCredits: profile.remaining_qualified_lead_credits
        },
        profile: profile
      };
    });
  }

  window.rankforgeUserPlanResolver = {
    resolveProfile: resolveProfile,
    getResolvedProfileSync: getResolvedProfileSync,
    getCachedProfile: getCachedProfile,
    getPlanInfo: getPlanInfo,
    normalizePlan: normalizePlan,
    normalizeBillingStatus: normalizeBillingStatus,
    getCurrentUserId: getCurrentUserId,
    getCurrentEmail: getCurrentEmail,
    isAdminEmail: isAdminEmail,
    planDefaults: planDefaults
  };

  window.rankforgeResolveUserPlan = function () {
    return resolveProfile({ force: true });
  };

  function boot() {
    authRetryCount = 0;
    resolveProfile({ force: false, allowRetry: true });
    setTimeout(function () { resolveProfile({ force: true, allowRetry: true }); }, 1500);
    setTimeout(function () { resolveProfile({ force: true, allowRetry: true }); }, 4000);
    setTimeout(function () { resolveProfile({ force: true, allowRetry: true }); }, 8000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.addEventListener("focus", function () { resolveProfile({ force: true }); });
  window.addEventListener("storage", function (event) {
    if (event.key === AUTH_SESSION_KEY) resolveProfile({ force: true });
  });
})();

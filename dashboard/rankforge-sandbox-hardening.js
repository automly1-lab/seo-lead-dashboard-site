(function(){
  'use strict';

  var CFG = window.RANKFORGE_CONFIG || {};
  var BASE = String(CFG.N8N_BASE_URL || 'https://rankforge1907.app.n8n.cloud').replace(/\/$/, '');
  var WEBHOOKS = CFG.WEBHOOKS || {};
  var ADMIN_EMAIL = String(CFG.ADMIN_EMAIL || 'automly1@gmail.com').toLowerCase();
  var CREDIT_RULE = CFG.CREDIT_RULE || 'Credits are consumed ONLY when a lead is marked as Qualified.';
  var LOGOUT_MARKER = 'rankforge-explicit-logout-v1';
  var PROD_HOSTS = ['lastaccount1907.app.n8n.cloud', 'rankforge1907.app.n8n.cloud'];
  var PROD_PATHS = {
    '/webhook/rankforge-create-search': WEBHOOKS.CREATE_SEARCH || '/webhook/rankforge-demo-create-search',
    '/webhook/rankforge-current-state': WEBHOOKS.CURRENT_STATE || '/webhook/rankforge-demo-current-state',
    '/webhook/rankforge-search-results': WEBHOOKS.SEARCH_RESULTS || '/webhook/rankforge-demo-search-results'
  };

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function safeJson(v, f){ try { return JSON.parse(v || ''); } catch(e) { return f; } }
  function cfgUrl(path){ return BASE + path; }
  function demoCreateUrl(){ return cfgUrl(PROD_PATHS['/webhook/rankforge-create-search']); }
  function demoStateUrl(){ return cfgUrl(PROD_PATHS['/webhook/rankforge-current-state']); }
  function demoResultsUrl(){ return cfgUrl(PROD_PATHS['/webhook/rankforge-search-results']); }
  function isWebhookUrl(url){ return /\/webhook\/rankforge-/.test(String(url || '')); }
  function rewriteUrl(raw){
    var url = String(raw || '');
    if (!isWebhookUrl(url)) return url;
    PROD_HOSTS.forEach(function(host){ url = url.replace('https://' + host, BASE).replace('http://' + host, BASE); });
    Object.keys(PROD_PATHS).forEach(function(prodPath){ url = url.replace(prodPath, PROD_PATHS[prodPath]); });
    return url;
  }
  function urlOf(input){ try { return typeof input === 'string' ? input : (input && input.url) || ''; } catch(e){ return ''; } }
  function session(){
    try { if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') return window.rankforgeAuth.getSession() || {}; } catch(e) {}
    var s = safeJson(localStorage.getItem('rankforge-auth-session-v1'), {}) || {};
    if (s && (s.userId || s.id || s.email)) return s;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i) || '';
        if (key.indexOf('sb-') !== 0) continue;
        var raw = safeJson(localStorage.getItem(key), {}) || {};
        var user = raw.user || (raw.currentSession && raw.currentSession.user) || (raw.session && raw.session.user);
        if (user && (user.id || user.email)) return { userId: user.id || user.user_id || '', id: user.id || '', email: user.email || '' };
      }
    } catch(e) {}
    return {};
  }
  function currentIdentity(){
    var s = session() || {};
    return { userId: clean(s.userId || s.id || s.user_id), email: lower(s.email || s.user_email || s.owner_email) };
  }
  function hasUser(){ var id = currentIdentity(); return !!(id.userId || id.email); }
  function isAdminEmail(email){ return lower(email) === ADMIN_EMAIL; }
  function isAdmin(){ return isAdminEmail(currentIdentity().email); }
  function scopedKey(kind){
    var id = currentIdentity();
    var userKey = clean(id.userId || id.email);
    return userKey ? 'rankforge:' + userKey + ':' + kind : '';
  }
  function readScoped(kind){ var k = scopedKey(kind); return k ? safeJson(localStorage.getItem(k), []) || [] : []; }
  function writeScoped(kind, value){ var k = scopedKey(kind); if (k) localStorage.setItem(k, JSON.stringify(value || [])); }
  function normalizeSearchId(row){ return clean(row && (row.search_id || row.searchId || row.id)); }
  function rowMatchesUser(row){
    var id = currentIdentity();
    var uid = clean(row && (row.user_id || row.owner_user_id || row.created_by));
    var email = lower(row && (row.email || row.user_email || row.owner_email || row.email_user));
    if (uid || email) return (!!uid && !!id.userId && uid === id.userId) || (!!email && !!id.email && email === id.email);
    return false;
  }
  function rowMatchesSearch(row, allowedIds){
    var sid = normalizeSearchId(row);
    return !!(sid && allowedIds && allowedIds.has(sid));
  }
  function allowedSearchIds(){
    var ids = new Set();
    readScoped('searches').forEach(function(x){ var id = normalizeSearchId(x); if (id) ids.add(id); });
    try { ((window.state && window.state.searches) || []).forEach(function(x){ var id = normalizeSearchId(x); if (id) ids.add(id); }); } catch(e) {}
    return ids;
  }
  function keepAllowed(rows){
    if (!hasUser()) return [];
    var ids = allowedSearchIds();
    return (Array.isArray(rows) ? rows : []).filter(function(row){ return rowMatchesUser(row) || rowMatchesSearch(row, ids); });
  }
  function emptyLike(json){ return Array.isArray(json) ? [] : {}; }
  function filterPayload(json){
    if (!json || typeof json !== 'object') return json;
    if (!hasUser()) return emptyLike(json);
    var out = Array.isArray(json) ? keepAllowed(json) : Object.assign({}, json);
    if (Array.isArray(json)) return out;
    ['searches','batches','search_batches','leads','prospects','results','raw_prospects','final_leads','rows'].forEach(function(key){
      if (Array.isArray(out[key])) out[key] = keepAllowed(out[key]);
    });
    if (out.data && typeof out.data === 'object') {
      out.data = Object.assign({}, out.data);
      ['searches','batches','leads','prospects','results'].forEach(function(key){
        if (Array.isArray(out.data[key])) out.data[key] = keepAllowed(out.data[key]);
      });
    }
    if (out.current_search && !(rowMatchesUser(out.current_search) || rowMatchesSearch(out.current_search, allowedSearchIds()))) delete out.current_search;
    if (out.search && !(rowMatchesUser(out.search) || rowMatchesSearch(out.search, allowedSearchIds()))) delete out.search;
    if (out.current_state && Array.isArray(out.current_state)) out.current_state = keepAllowed(out.current_state);
    if (out.user && Array.isArray(out.user)) out.user = keepAllowed(out.user);
    return out;
  }
  function forceDemoEndpointKeys(){
    try {
      localStorage.setItem('rankforge-search-submit-webhook-v1', demoCreateUrl());
      localStorage.setItem('rankforge-search-results-endpoint-v1', demoResultsUrl());
      localStorage.setItem('rankforge-current-state-endpoint-v1', demoStateUrl());
    } catch(e) {}
  }
  function syncStateUser(){
    var id = currentIdentity();
    try {
      if (window.state) {
        window.state.user = Object.assign({}, window.state.user || {}, { email: id.email || '', userId: id.userId || '', isAdmin: isAdminEmail(id.email) });
        if (!hasUser()) {
          window.state.searches = [];
          window.state.leads = [];
          window.state.exports = new Set();
        }
      }
    } catch(e) {}
  }
  function clearRankForgeStores(){
    var markerValue = new Date().toISOString();
    function cleanStore(store){
      if (!store) return;
      var remove = [];
      for (var i = 0; i < store.length; i++) {
        var k = store.key(i) || '';
        var low = k.toLowerCase();
        if (k === LOGOUT_MARKER) continue;
        if (k.indexOf('rankforge:') === 0 || k.indexOf('rankforge-') === 0 || k.indexOf('sb-') === 0 || low.indexOf('supabase') > -1) remove.push(k);
      }
      remove.forEach(function(k){ try { store.removeItem(k); } catch(e) {} });
    }
    try { cleanStore(localStorage); } catch(e) {}
    try { cleanStore(sessionStorage); } catch(e) {}
    try { localStorage.setItem(LOGOUT_MARKER, markerValue); } catch(e) {}
  }
  function patchFetch(){
    if (!window.fetch || window.fetch.__rfDemoSandbox) return;
    var nativeFetch = window.fetch.bind(window);
    var guarded = function(input, init){
      var oldUrl = urlOf(input), newUrl = rewriteUrl(oldUrl);
      if (oldUrl && newUrl !== oldUrl) {
        if (typeof input === 'string') input = newUrl;
        else { try { input = new Request(newUrl, input); } catch(e) {} }
      }
      return nativeFetch(input, init).then(function(response){
        var finalUrl = rewriteUrl(newUrl || (response && response.url) || '');
        if (!/rankforge-demo-(current-state|search-results)/.test(finalUrl || '')) return response;
        var originalJson = response.json.bind(response);
        response.json = function(){ return originalJson().then(filterPayload); };
        return response;
      });
    };
    guarded.__rfDemoSandbox = true;
    window.fetch = guarded;
  }
  function patchXhr(){
    if (!window.XMLHttpRequest || window.XMLHttpRequest.__rfDemoSandbox) return;
    var proto = window.XMLHttpRequest.prototype;
    var open = proto.open;
    proto.open = function(method, url){
      arguments[1] = rewriteUrl(url);
      return open.apply(this, arguments);
    };
    window.XMLHttpRequest.__rfDemoSandbox = true;
  }
  function patchAdminUi(){
    var admin = isAdmin();
    document.body.classList.toggle('rf-is-admin', admin);
    Array.prototype.slice.call(document.querySelectorAll('.nav.admin')).forEach(function(node){ node.style.display = admin ? '' : 'none'; });
    var activeAdmin = document.getElementById('admin');
    if (!admin && activeAdmin && activeAdmin.classList.contains('active')) {
      var overview = document.querySelector('[data-view="overview"]');
      if (overview) overview.click();
    }
    if (admin) {
      try {
        if (window.state) {
          window.state.plan = Object.assign({}, window.state.plan || {}, { key:'admin_unlimited', name:'Admin Unlimited', batchesLimit:999999, creditsLimit:999999, batchesUsed:0, creditsUsed:0, unlimited:true });
        }
      } catch(e) {}
      var used = document.getElementById('creditsUsed'), lim = document.getElementById('creditsLimit'), bar = document.getElementById('creditsBar'), small = document.querySelector('.usage small');
      if (used) used.textContent = 'Unlimited';
      if (lim) lim.textContent = '';
      if (bar) bar.style.width = '100%';
      if (small) small.textContent = 'Admin Unlimited';
    }
  }
  function patchCreditRule(){
    var usage = document.querySelector('.usage');
    if (usage && !document.getElementById('rf-credit-rule-note')) {
      var note = document.createElement('small');
      note.id = 'rf-credit-rule-note';
      note.textContent = CREDIT_RULE;
      note.style.display = 'block';
      note.style.marginTop = '8px';
      note.style.lineHeight = '1.35';
      usage.appendChild(note);
    }
  }
  function patchDashboardData(){
    if (window.rankforgeDashboardData && !window.rankforgeDashboardData.__rfDemoScoped) {
      var api = window.rankforgeDashboardData;
      var oldSaveSearch = api.saveSearch;
      var oldPersist = api.persist;
      var oldHydrate = api.hydrate;
      api.saveSearch = function(payload){
        if (!hasUser()) return null;
        var result = oldSaveSearch ? oldSaveSearch.apply(this, arguments) : payload;
        var searches = readScoped('searches');
        var id = normalizeSearchId(payload || result);
        if (id) searches = [payload || result].concat(searches.filter(function(x){ return normalizeSearchId(x) !== id; }));
        writeScoped('searches', searches);
        return result;
      };
      api.persist = function(){
        if (!hasUser()) return false;
        var ret = oldPersist ? oldPersist.apply(this, arguments) : true;
        try { writeScoped('searches', (window.state && window.state.searches) || []); writeScoped('leads', (window.state && window.state.leads) || []); } catch(e) {}
        return ret;
      };
      api.hydrate = function(){
        if (!hasUser()) { syncStateUser(); return false; }
        try {
          if (window.state) {
            var searches = readScoped('searches'), leads = readScoped('leads');
            if (searches.length) window.state.searches = searches;
            if (leads.length) window.state.leads = leads;
          }
        } catch(e) {}
        return oldHydrate ? oldHydrate.apply(this, arguments) : true;
      };
      api.__rfDemoScoped = true;
    }
  }
  function patchLogout(){
    window.rankforgeClearAuthStores = clearRankForgeStores;
    window.rankforgeLogout = function(){ clearRankForgeStores(); window.location.href = '../?logged_out=1'; };
    var btn = document.getElementById('logoutBtn');
    if (btn && !btn.__rfDemoLogout) {
      btn.__rfDemoLogout = true;
      btn.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); window.rankforgeLogout(); }, true);
    }
  }
  function harden(){
    forceDemoEndpointKeys();
    syncStateUser();
    patchAdminUi();
    patchCreditRule();
    patchDashboardData();
    patchLogout();
  }

  window.RankForgeSandbox = {
    config: CFG,
    rewriteUrl: rewriteUrl,
    scopedKey: scopedKey,
    currentIdentity: currentIdentity,
    keepAllowed: keepAllowed,
    clearRankForgeStores: clearRankForgeStores,
    forceDemoEndpointKeys: forceDemoEndpointKeys,
    harden: harden
  };

  forceDemoEndpointKeys();
  patchFetch();
  patchXhr();
  syncStateUser();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', harden); else harden();
  window.addEventListener('rankforge:dashboard-session', function(){ setTimeout(harden, 50); });
  window.addEventListener('rankforge:auth-changed', function(){ setTimeout(harden, 50); });
  document.addEventListener('rankforge:rendered', function(){ harden(); });
  window.addEventListener('storage', function(e){ if (!e || e.key === 'rankforge-auth-session-v1' || /^sb-/.test(e.key || '')) harden(); });
  setTimeout(harden, 250);
  setTimeout(harden, 1200);
})();

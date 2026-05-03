(function(){
  var STORAGE_KEY = 'rankforge-pending-user-sync-v1';
  var SENT_KEY = 'rankforge-user-sync-sent-v1';
  var HOOK_KEY = 'rankforge-user-sync-webhook-v1';
  var DEFAULT_HOOK = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-user-sync';

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function el(id){ return document.getElementById(id); }
  function hook(){
    var saved = clean(localStorage.getItem(HOOK_KEY));
    if (!saved || saved.indexOf('rankforge-create-user') !== -1) {
      localStorage.setItem(HOOK_KEY, DEFAULT_HOOK);
      return DEFAULT_HOOK;
    }
    return saved;
  }
  function readSignupMeta(){
    return {
      full_name: clean(el('signupName') && el('signupName').value),
      agency_name: clean(el('agencyName') && el('agencyName').value),
      email: clean(el('signupEmail') && el('signupEmail').value)
    };
  }
  function rememberSignupMeta(){
    var meta = readSignupMeta();
    if (!meta.email) return;
    meta.created_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  }
  function pendingMeta(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function sessionFromLocal(){
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') return window.rankforgeAuth.getSession();
    try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1') || 'null'); } catch(e) { return null; }
  }
  function payloadFromSession(session){
    var meta = pendingMeta();
    var email = clean(session && session.email) || clean(meta.email);
    var userId = clean(session && session.userId) || clean(session && session.id);
    var now = new Date().toISOString();
    return {
      event: 'user_created',
      source: 'rankforge_signup_ui',
      user_id: userId,
      user_email: email,
      email: email,
      full_name: clean(meta.full_name),
      agency_name: clean(meta.agency_name),
      workspace_name: clean(meta.agency_name) || clean(meta.full_name) || email,
      role: 'user',
      status: 'active',
      plan: 'Free',
      billing_status: 'free',
      search_batches_limit: '1',
      search_batches_used: '0',
      qualified_lead_credits_limit: '10',
      qualified_lead_credits_used: '0',
      csv_export: 'false',
      created_at: clean(meta.created_at) || now,
      updated_at: now
    };
  }
  function postToN8n(payload){
    if (!payload.email) return Promise.resolve(false);
    var sentKey = payload.user_id || payload.email;
    if (localStorage.getItem(SENT_KEY) === sentKey) return Promise.resolve(false);
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function(key){ body.set(key, payload[key]); });
    localStorage.setItem('rankforge-selected-plan-v1', 'free');
    localStorage.setItem('rankforge-billing-status-v1', 'free');
    localStorage.setItem('rankforge-user-plan-v1', JSON.stringify(payload));
    return fetch(hook(), { method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body: body.toString() }).then(function(){
      localStorage.setItem(SENT_KEY, sentKey);
      localStorage.removeItem(STORAGE_KEY);
      return true;
    });
  }
  function trySync(sessionOverride){
    var session = sessionOverride || sessionFromLocal();
    if (!session || !(session.userId || session.id || session.email)) return Promise.resolve(false);
    return postToN8n(payloadFromSession(session));
  }
  function bind(){
    var form = el('signupForm');
    if (form) form.addEventListener('submit', rememberSignupMeta, true);
    setTimeout(function(){ trySync(); }, 800);
    setTimeout(function(){ trySync(); }, 2000);
  }
  window.rankforgeUserSync = { rememberSignupMeta: rememberSignupMeta, trySync: trySync, webhookUrl: hook };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
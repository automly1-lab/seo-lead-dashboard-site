(function(){
  'use strict';

  var ENDPOINT_KEY = 'rankforge-current-state-endpoint-v1';
  var DEFAULT_ENDPOINT = 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-current-state';

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function num(v, fallback){
    var raw = clean(v);
    if (/^(unlimited|infinity|∞)$/i.test(raw)) return 999999;
    var n = Number(raw.replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : (fallback || 0);
  }
  function endpoint(){
    var saved = clean(localStorage.getItem(ENDPOINT_KEY));
    if (saved) return saved;
    localStorage.setItem(ENDPOINT_KEY, DEFAULT_ENDPOINT);
    return DEFAULT_ENDPOINT;
  }
  function session(){
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') return window.rankforgeAuth.getSession();
    try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1') || 'null'); } catch(e){ return null; }
  }
  function isAdmin(email){ return ['automly1@gmail.com','omrkulaksiz1@gmail.com'].indexOf(lower(email)) !== -1; }
  function planKey(v){
    var raw = lower(v).replace(/\s+/g,'_').replace(/-/g,'_');
    if (raw.indexOf('admin') !== -1 || raw.indexOf('unlimited') !== -1) return 'admin_unlimited';
    if (['growth','pro','founding','founding_plan'].indexOf(raw) !== -1) return 'growth';
    if (['starter','start','basic','starter_plan'].indexOf(raw) !== -1) return 'starter';
    if (['agency','agency_intelligence','enterprise'].indexOf(raw) !== -1) return 'agency_intelligence';
    return raw || 'free';
  }
  function label(p){
    return ({admin_unlimited:'Admin',agency_intelligence:'Agency Intelligence',growth:'Growth',starter:'Starter',free:'Free'})[planKey(p)] || clean(p) || 'Free';
  }
  function defaults(p){
    var map = {free:{search:1,credits:10,batch:10,csv:false},starter:{search:50,credits:50,batch:25,csv:true},growth:{search:150,credits:250,batch:50,csv:true},agency_intelligence:{search:9999,credits:999999,batch:50,csv:true},admin_unlimited:{search:999999,credits:999999,batch:50,csv:true}};
    return map[planKey(p)] || map.free;
  }
  function getState(){ return window.state || null; }
  function setMessage(text){
    var usage = document.querySelector('.usage');
    if (!usage) return;
    var msg = document.getElementById('rfCurrentStateSync');
    if (!msg) {
      msg = document.createElement('div');
      msg.id = 'rfCurrentStateSync';
      msg.style.cssText = 'margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';
      usage.appendChild(msg);
    }
    msg.textContent = text;
  }
  function paint(plan, ok){
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    var bar = document.getElementById('creditsBar');
    var usage = document.querySelector('.usage');
    var unlimited = !!plan.unlimited;
    if (used) used.textContent = unlimited ? 'Unlimited' : String(plan.creditsUsed || 0);
    if (limit) limit.textContent = unlimited ? '' : ' / ' + String(plan.creditsLimit || 0);
    if (bar) bar.style.width = unlimited ? '100%' : (plan.creditsLimit ? Math.min(100, (plan.creditsUsed || 0) / plan.creditsLimit * 100) + '%' : '0%');
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = ok ? ('Plan: ' + (plan.name || 'Free') + (plan.billingStatus ? ' · ' + plan.billingStatus : '')) : 'Plan sync failed';
    }
    var accountStrong = document.querySelector('.account strong');
    if (accountStrong && plan.name) accountStrong.textContent = unlimited ? 'RankForge Admin' : 'RankForge ' + plan.name;
    setMessage(ok ? 'Plan synced from n8n current state' : 'Current state endpoint missing or unreachable');
  }
  function apply(data, sess){
    var email = lower(data.email || data.user_email || (sess && sess.email));
    var admin = isAdmin(email);
    var p = admin ? 'admin_unlimited' : planKey(data.plan || data.current_plan || data.plan_name);
    var d = defaults(p);
    var plan = {
      name: label(p),
      key: p,
      billingStatus: clean(data.billing_status || data.subscription_status || (p === 'free' ? 'free' : 'active')),
      batchesLimit: admin ? 999999 : num(data.effective_search_limit || data.search_batches_limit || data.base_search_limit, d.search),
      batchesUsed: num(data.search_batches_used || data.searches_used_this_month, 0),
      creditsLimit: admin ? 999999 : num(data.effective_qualified_lead_limit || data.qualified_lead_credits_limit || data.qualified_leads_limit || data.base_qualified_lead_limit, d.credits),
      creditsUsed: num(data.qualified_lead_credits_used || data.qualified_leads_used, 0),
      maxLeadsPerBatch: admin ? 50 : num(data.max_leads_per_batch, d.batch),
      csvExport: admin || /^(true|yes|1|enabled)$/i.test(clean(data.csv_export)) || d.csv,
      unlimited: admin || p === 'admin_unlimited'
    };
    var st = getState();
    if (st) {
      st.user = Object.assign({}, st.user || {}, { email: email, userId: data.user_id || (sess && sess.userId) || '', plan: plan.name, billingStatus: plan.billingStatus });
      st.plan = Object.assign({}, st.plan || {}, plan);
    }
    localStorage.setItem('rankforge-user-plan-v1', JSON.stringify(plan));
    localStorage.setItem('rankforge-selected-plan-v1', p);
    localStorage.setItem('rankforge-billing-status-v1', plan.billingStatus);
    paint(plan, true);
  }
  async function refresh(){
    var sess = session();
    if (!sess || !(sess.email || sess.userId)) return;
    setMessage('Syncing plan from n8n…');
    try {
      var body = new URLSearchParams();
      body.set('email', sess.email || '');
      body.set('user_id', sess.userId || '');
      body.set('event', 'get_current_state');
      var res = await fetch(endpoint(), { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','Accept':'application/json'}, body: body.toString() });
      if (!res.ok) throw new Error('current_state_endpoint_' + res.status);
      var json = await res.json();
      var row = json.current_state || json.user || json.row || json.data || json;
      if (!row || (!row.email && !row.user_email && !row.plan)) throw new Error('empty_current_state_response');
      apply(row, sess);
    } catch(error) {
      console.warn('RankForge current state endpoint failed', error);
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem('rankforge-user-plan-v1') || 'null'); } catch(e) {}
      if (saved && saved.name && saved.creditsLimit && saved.name !== 'Free') paint(saved, true);
      else paint({name:'Unknown', creditsUsed:0, creditsLimit:0, billingStatus:'sync_failed'}, false);
    }
  }
  window.rankforgeRefreshCurrentState = refresh;
  window.addEventListener('rankforge:dashboard-session', function(){ setTimeout(refresh, 500); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(refresh, 1200); }); else setTimeout(refresh, 1200);
})();
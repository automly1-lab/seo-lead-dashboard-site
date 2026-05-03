(function(){
  'use strict';

  var SHEET_ID = '1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var SHEET_NAME = 'user_current_state';
  var REFRESH_MS = 45000;

  function clean(v){ return String(v == null ? '' : v).trim(); }
  function lower(v){ return clean(v).toLowerCase(); }
  function num(v, fallback){
    var raw = clean(v);
    if (/^(unlimited|infinity|∞)$/i.test(raw)) return 999999;
    var n = Number(raw.replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : (fallback || 0);
  }
  function isAdminEmail(email){ return ['automly1@gmail.com','omrkulaksiz1@gmail.com'].indexOf(lower(email)) !== -1; }
  function normalizePlan(v){
    var raw = lower(v).replace(/\s+/g,'_').replace(/-/g,'_');
    if (raw.indexOf('admin') !== -1 || raw.indexOf('unlimited') !== -1) return 'admin_unlimited';
    if (raw.indexOf('stack') !== -1) return 'stacked';
    if (raw === 'growth' || raw === 'pro' || raw === 'founding' || raw === 'founding_plan') return 'growth';
    if (raw === 'starter' || raw === 'start' || raw === 'basic' || raw === 'starter_plan') return 'starter';
    if (raw === 'agency' || raw === 'agency_intelligence' || raw === 'enterprise') return 'agency_intelligence';
    return raw || 'free';
  }
  function planLabel(plan){
    var map = { admin_unlimited:'Admin', stacked:'Stacked', agency_intelligence:'Agency Intelligence', growth:'Growth', starter:'Starter', free:'Free' };
    return map[normalizePlan(plan)] || clean(plan) || 'Free';
  }
  function planDefaults(plan){
    var map = {
      free:{search:2,credits:10,batch:10,csv:false},
      starter:{search:50,credits:50,batch:25,csv:true},
      growth:{search:150,credits:250,batch:50,csv:true},
      stacked:{search:0,credits:0,batch:50,csv:true},
      agency_intelligence:{search:9999,credits:999999,batch:50,csv:true},
      admin_unlimited:{search:999999,credits:999999,batch:50,csv:true}
    };
    return map[normalizePlan(plan)] || map.free;
  }
  function session(){
    if (window.rankforgeAuth && typeof window.rankforgeAuth.getSession === 'function') return window.rankforgeAuth.getSession();
    try { return JSON.parse(localStorage.getItem('rankforge-auth-session-v1') || 'null'); } catch(e){ return null; }
  }
  function latestDate(row){ return Date.parse(row.updated_at || row.synced_at || row.created_at || 0) || 0; }
  function currentKey(row){ return lower(row.user_key || row.email || row.user_email || row.account_email || row.customer_email || row.user_id); }
  function rowEmails(row){ return [row.email,row.user_email,row.account_email,row.customer_email,row.billing_email,row.owner_email].map(lower).filter(Boolean); }
  function matches(row, sess){
    var email = lower(sess && sess.email);
    var userId = clean((sess && (sess.userId || sess.id)) || '');
    var emails = rowEmails(row);
    var key = currentKey(row);
    var rowUserId = clean(row.user_id || row.userId || row.owner_user_id || '');
    return (email && (emails.indexOf(email) !== -1 || key === email || lower(rowUserId) === email)) || (userId && rowUserId === userId);
  }
  function gvizUrl(callbackName){
    return 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(SHEET_ID) + '/gviz/tq?tqx=responseHandler:' + encodeURIComponent(callbackName) + '&sheet=' + encodeURIComponent(SHEET_NAME) + '&tq=' + encodeURIComponent('select *');
  }
  function loadSheetRows(){
    return new Promise(function(resolve, reject){
      var cb = '__rankforgeCurrentState_' + Date.now() + '_' + Math.floor(Math.random()*100000);
      var script = document.createElement('script');
      var done = false;
      window[cb] = function(payload){
        if (done) return;
        done = true;
        cleanup();
        try {
          var cols = (payload.table && payload.table.cols || []).map(function(col){ return clean(col.label || col.id); });
          var rows = (payload.table && payload.table.rows || []).map(function(row){
            var out = {};
            (row.c || []).forEach(function(cell, i){
              var key = cols[i] || ('col_' + i);
              out[key] = cell ? clean(cell.f != null ? cell.f : cell.v) : '';
            });
            return out;
          });
          resolve(rows);
        } catch(error){ reject(error); }
      };
      function cleanup(){
        try { delete window[cb]; } catch(e){ window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      script.onerror = function(){ if(done) return; done = true; cleanup(); reject(new Error('Could not load user_current_state sheet.')); };
      script.src = gvizUrl(cb);
      document.body.appendChild(script);
      setTimeout(function(){ if(done) return; done = true; cleanup(); reject(new Error('Timed out loading user_current_state.')); }, 12000);
    });
  }
  function selectedState(rows, sess){
    return rows.filter(function(row){ return matches(row, sess); }).sort(function(a,b){ return latestDate(b) - latestDate(a); })[0] || null;
  }
  function applyCurrentState(row, sess){
    if (!row || !window.state) return false;
    var email = lower(row.email || row.user_email || (sess && sess.email));
    var admin = isAdminEmail(email);
    var plan = admin ? 'admin_unlimited' : normalizePlan(row.plan || row.current_plan || row.plan_name);
    var defaults = planDefaults(plan);
    var billing = clean(row.billing_status || row.subscription_status || (plan === 'free' ? 'free' : 'active'));
    var searchLimit = admin ? 999999 : num(row.effective_search_limit || row.search_batches_limit || row.base_search_limit || row.monthly_search_limit, defaults.search);
    var creditLimit = admin ? 999999 : num(row.effective_qualified_lead_limit || row.qualified_lead_credits_limit || row.base_qualified_lead_limit || row.monthly_qualified_lead_credit_limit, defaults.credits);
    var searchUsed = num(row.search_batches_used || row.searches_used_this_month || row.usage_searches_this_month, 0);
    var creditUsed = num(row.qualified_lead_credits_used || row.lead_credits_used_this_month || row.usage_qualified_leads_this_month, 0);
    window.state.user = Object.assign({}, window.state.user || {}, { email: email || (sess && sess.email) || '', userId: row.user_id || (sess && sess.userId) || '', plan: planLabel(plan), billingStatus: billing });
    window.state.plan = Object.assign({}, window.state.plan || {}, { name: planLabel(plan), key: plan, billingStatus: billing, batchesLimit: searchLimit, batchesUsed: searchUsed, creditsLimit: creditLimit, creditsUsed: creditUsed, maxLeadsPerBatch: admin ? 50 : num(row.max_leads_per_batch, defaults.batch), csvExport: admin ? true : /^(true|yes|1|enabled)$/i.test(clean(row.csv_export)) || defaults.csv, unlimited: admin || plan === 'admin_unlimited' });
    localStorage.setItem('rankforge-user-current-state-v1', JSON.stringify(row));
    localStorage.setItem('rankforge-selected-plan-v1', plan);
    localStorage.setItem('rankforge-billing-status-v1', billing);
    localStorage.setItem('rankforge-user-plan-v1', JSON.stringify(window.state.plan));
    updatePlanUi(row, sess);
    if (typeof window.render === 'function') {
      try { window.render(); } catch(e) {}
      updatePlanUi(row, sess);
    }
    window.dispatchEvent(new CustomEvent('rankforge:current-state-ready', { detail: { row: row, plan: window.state.plan } }));
    return true;
  }
  function updatePlanUi(row, sess){
    var plan = (window.state && window.state.plan) || {};
    var admin = plan.unlimited || isAdminEmail((sess && sess.email) || (window.state && window.state.user && window.state.user.email));
    var usedNode = document.getElementById('creditsUsed');
    var limitNode = document.getElementById('creditsLimit');
    var bar = document.getElementById('creditsBar');
    if (usedNode) usedNode.textContent = admin ? 'Unlimited' : String(plan.creditsUsed || 0);
    if (limitNode) limitNode.textContent = admin ? '' : ' / ' + String(plan.creditsLimit || 0);
    if (bar) bar.style.width = admin ? '100%' : (plan.creditsLimit ? Math.min(100, (plan.creditsUsed || 0) / plan.creditsLimit * 100) + '%' : '0%');
    var usage = document.querySelector('.usage');
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan: ' + (plan.name || 'Free') + (plan.billingStatus ? ' · ' + plan.billingStatus : '');
    }
    var accountStrong = document.querySelector('.account strong');
    if (accountStrong) accountStrong.textContent = admin ? 'RankForge Admin' : 'RankForge ' + (plan.name || 'Free');
    var syncText = document.getElementById('rfCurrentStateSync');
    if (!syncText && usage) {
      syncText = document.createElement('div');
      syncText.id = 'rfCurrentStateSync';
      syncText.style.cssText = 'margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';
      usage.appendChild(syncText);
    }
    if (syncText) syncText.textContent = row ? 'Synced from user_current_state' : 'Could not sync current state';
  }
  async function refreshCurrentState(){
    var sess = session();
    if (!sess || !(sess.email || sess.userId || sess.id)) return;
    try {
      var rows = await loadSheetRows();
      var row = selectedState(rows, sess);
      if (row) applyCurrentState(row, sess);
      else updatePlanUi(null, sess);
    } catch(error){
      console.warn('RankForge current state sync failed', error);
      updatePlanUi(null, sess);
    }
  }
  window.rankforgeRefreshCurrentState = refreshCurrentState;
  window.addEventListener('rankforge:dashboard-session', function(){ refreshCurrentState(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ setTimeout(refreshCurrentState, 1200); });
  else setTimeout(refreshCurrentState, 1200);
  setInterval(refreshCurrentState, REFRESH_MS);
})();
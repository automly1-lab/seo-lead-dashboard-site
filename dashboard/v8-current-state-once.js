(function(){
  'use strict';
  function loadScript(src, marker){
    if (document.querySelector('script[data-' + marker + '="true"]')) return;
    var s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.setAttribute('data-' + marker, 'true');
    document.body.appendChild(s);
  }
  function cachedPlan(){
    try { return JSON.parse(localStorage.getItem('rankforge-user-plan-v1') || 'null'); } catch(e) { return null; }
  }
  function planKey(plan){
    return String((plan && (plan.key || plan.name)) || '').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
  }
  function isPaid(plan){
    var key = planKey(plan);
    return key && key !== 'free' && Number(plan && plan.creditsLimit || 0) > 10;
  }
  function label(value){
    var key = String(value || '').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
    if (key === 'growth') return 'Growth';
    if (key === 'starter') return 'Starter';
    if (key === 'agency_intelligence') return 'Agency Intelligence';
    if (key.indexOf('admin') !== -1) return 'Admin';
    return value || 'Free';
  }
  function hideSyncText(){
    var msg = document.getElementById('rfCurrentStateSync');
    if (msg) {
      msg.textContent = '';
      msg.style.display = 'none';
    }
  }
  function watchSyncText(){
    var usage = document.querySelector('.usage');
    if (!usage || window.__rfPlanTextWatcher) return;
    window.__rfPlanTextWatcher = true;
    new MutationObserver(hideSyncText).observe(usage, { childList:true, subtree:true, characterData:true });
  }
  function paintPlan(plan){
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    var bar = document.getElementById('creditsBar');
    var usage = document.querySelector('.usage');
    var unlimited = !!plan.unlimited || planKey(plan).indexOf('admin') !== -1;
    if (used) used.textContent = unlimited ? 'Unlimited' : String(plan.creditsUsed || 0);
    if (limit) limit.textContent = unlimited ? '' : ' / ' + String(plan.creditsLimit || 0);
    if (bar) bar.style.width = unlimited ? '100%' : (plan.creditsLimit ? Math.min(100,(plan.creditsUsed || 0) / plan.creditsLimit * 100) + '%' : '0%');
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan: ' + label(plan.key || plan.name) + (plan.billingStatus ? ' · ' + plan.billingStatus : '');
    }
    var title = document.querySelector('.account strong');
    if (title && plan.name) title.textContent = unlimited ? 'RankForge Admin' : 'RankForge ' + label(plan.key || plan.name);
    hideSyncText();
  }
  function setPending(){
    var plan = cachedPlan();
    if (isPaid(plan)) { paintPlan(plan); return; }
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    var usage = document.querySelector('.usage');
    if (used) used.textContent = '…';
    if (limit) limit.textContent = '';
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan';
    }
    hideSyncText();
  }
  function boot(){
    watchSyncText();
    setPending();
    loadScript('./v10-current-state-endpoint.js?v=endpoint-4', 'rf-current-state-endpoint');
    setTimeout(function(){ var plan = cachedPlan(); if (isPaid(plan)) paintPlan(plan); hideSyncText(); }, 400);
    setTimeout(function(){ var plan = cachedPlan(); if (isPaid(plan)) paintPlan(plan); hideSyncText(); }, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
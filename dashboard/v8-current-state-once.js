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
  function isPaid(plan){
    var key = String((plan && (plan.key || plan.name)) || '').toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
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
  function paintPlan(plan){
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    var bar = document.getElementById('creditsBar');
    var usage = document.querySelector('.usage');
    var unlimited = !!plan.unlimited;
    if (used) used.textContent = unlimited ? 'Unlimited' : String(plan.creditsUsed || 0);
    if (limit) limit.textContent = unlimited ? '' : ' / ' + String(plan.creditsLimit || 0);
    if (bar) bar.style.width = unlimited ? '100%' : (plan.creditsLimit ? Math.min(100,(plan.creditsUsed || 0) / plan.creditsLimit * 100) + '%' : '0%');
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan: ' + label(plan.key || plan.name) + (plan.billingStatus ? ' · ' + plan.billingStatus : '');
      var msg = document.getElementById('rfCurrentStateSync');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'rfCurrentStateSync';
        msg.style.cssText = 'margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';
        usage.appendChild(msg);
      }
      msg.textContent = 'Checking latest plan…';
    }
  }
  function setPending(){
    var plan = cachedPlan();
    if (isPaid(plan)) { paintPlan(plan); return; }
    var usage = document.querySelector('.usage');
    var used = document.getElementById('creditsUsed');
    var limit = document.getElementById('creditsLimit');
    if (used) used.textContent = '…';
    if (limit) limit.textContent = '';
    if (usage) {
      var small = usage.querySelector('small');
      if (small) small.textContent = 'Plan sync pending';
      var msg = document.getElementById('rfCurrentStateSync');
      if (!msg) {
        msg = document.createElement('div');
        msg.id = 'rfCurrentStateSync';
        msg.style.cssText = 'margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.35';
        usage.appendChild(msg);
      }
      msg.textContent = 'Syncing plan from n8n…';
    }
  }
  function boot(){
    setPending();
    loadScript('./v10-current-state-endpoint.js?v=endpoint-3', 'rf-current-state-endpoint');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
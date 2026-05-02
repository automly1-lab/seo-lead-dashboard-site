(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function clean(v){return String(v==null?'':v).trim();}
  function email(){
    try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function'){var s=window.rankforgeAuth.getSession();if(s&&(s.email||s.userEmail))return clean(s.email||s.userEmail).toLowerCase();}}catch(_){}
    var legacy=parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
    return clean(legacy.email||legacy.userEmail).toLowerCase();
  }
  function isAdmin(){return email()===ADMIN_EMAIL;}
  function planFromStorage(){
    var raw=clean(localStorage.getItem('rankforge-plan-v1')||localStorage.getItem('rankforge-selected-plan-v1')||'');
    if(/growth/i.test(raw))return 'Growth';
    if(/starter/i.test(raw))return 'Starter';
    return 'Free';
  }
  function fixBadges(){
    if(isAdmin())return;
    var plan=planFromStorage();
    var credit=plan==='Growth'?'250 credits/month':plan==='Starter'?'50 credits/month':'Free preview access';
    ['rfPlanBadge','rfSearchPlanBadge','planBadge','workspacePlanBadge','rfProspectPlanBadge'].forEach(function(id){var el=document.getElementById(id);if(el&&/admin|unlimited/i.test(el.textContent||''))el.textContent=plan+' Plan';});
    ['rfCreditBadge','rfSearchUsageBadge','usageBadge','rfProspectCreditBadge'].forEach(function(id){var el=document.getElementById(id);if(el&&/admin|unlimited/i.test(el.textContent||''))el.textContent=credit;});
    document.querySelectorAll('.rf-mvp-pill,.rf-badge').forEach(function(el){if(/admin unlimited|admin plan|unlimited batches|unlimited credits|unlimited access/i.test(el.textContent||''))el.textContent=credit;});
  }
  function patchGlobal(){
    window.rankforgeAdmin=window.rankforgeAdmin||{};
    window.rankforgeAdmin.ADMIN_EMAIL=ADMIN_EMAIL;
    window.rankforgeAdmin.isRankForgeAdmin=function(user){var e=clean(user&&user.email||user&&user.userEmail||email()).toLowerCase();return e===ADMIN_EMAIL;};
  }
  function init(){patchGlobal();fixBadges();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setInterval(init,350);
})();

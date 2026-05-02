(function(){
  'use strict';

  var SELECTED_PLAN_KEY='rankforge-selected-plan-v1';
  var BILLING_STATUS_KEY='rankforge-billing-status-v1';
  var CHECKOUT_PLAN_KEY='rankforge-post-auth-plan-v1';
  var CHECKOUT_INTENT_KEY='rankforge-post-auth-intent-v1';
  var CHECKOUT_STARTED_KEY='rankforge-checkout-started-v1';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';

  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function session(){try{if(window.rankforgeAuth&&window.rankforgeAuth.getSession){var s=window.rankforgeAuth.getSession();if(s&&(s.userId||s.id||s.email||s.userEmail))return s;}return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function normalizePlan(v){v=low(v||'').replace(/\s+/g,'_').replace(/-/g,'_');if(v==='growth'||v==='pro')return'growth';if(v==='starter'||v==='basic')return'starter';return v||'starter';}
  function selectedPlan(){var params=new URLSearchParams(location.search||'');var started=parse(localStorage.getItem(CHECKOUT_STARTED_KEY),{})||{};return normalizePlan(params.get('plan')||params.get('rf_plan')||started.plan||localStorage.getItem(CHECKOUT_PLAN_KEY)||localStorage.getItem(SELECTED_PLAN_KEY)||'starter');}
  function note(msg,type){var el=document.querySelector('.rf-checkout-note');if(el){el.textContent=msg;el.style.borderColor=type==='error'?'#fecaca':'#bbf7d0';el.style.background=type==='error'?'#fef2f2':'#ecfdf5';}}
  function hint(plan){var el=document.querySelector('[data-plan-hint]');if(el)el.textContent='Selected plan: '+(plan==='growth'?'Growth':'Starter');}
  function paidActive(plan){var p=window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};var billing=low(p.billing_status);var resolved=normalizePlan(p.plan);return (billing==='active'||billing==='admin_unlimited')&&(resolved===plan||resolved==='admin_unlimited');}
  async function waitForWebhookAndRedirect(){
    var s=session();var plan=selectedPlan();hint(plan);
    localStorage.setItem(SELECTED_PLAN_KEY,plan);localStorage.setItem(CHECKOUT_PLAN_KEY,plan);localStorage.setItem(CHECKOUT_INTENT_KEY,'checkout_success');localStorage.setItem(BILLING_STATUS_KEY,'pending_payment');
    if(!s||(!s.email&&!s.userEmail)){note('Payment completed. Log in with the same email to open your dashboard.','error');return false;}
    note('Payment completed. Waiting for Stripe webhook to update your RankForge plan...','ok');
    var delays=[0,1200,2500,4500,7000];
    for(var i=0;i<delays.length;i++){
      if(delays[i])await new Promise(function(resolve){setTimeout(resolve,delays[i]);});
      if(window.rankforgeResolveEffectiveUserProfile){try{await window.rankforgeResolveEffectiveUserProfile({force:true,reason:'checkout_success'});}catch(e){}}
      if(paidActive(plan)){note('Your plan is active. Opening dashboard...','ok');setTimeout(function(){window.location.replace('../dashboard/?checkout=success');},700);return true;}
    }
    note('Payment completed. Opening dashboard now; billing status will keep syncing from the users sheet.','ok');
    setTimeout(function(){window.location.replace('../dashboard/?checkout=success');},1300);
    return false;
  }
  window.rankforgeActivateCheckoutPlan=waitForWebhookAndRedirect;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForWebhookAndRedirect);else waitForWebhookAndRedirect();
})();
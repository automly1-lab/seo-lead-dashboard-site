(function(){
  'use strict';

  var CHECKOUT_STARTED_KEY='rankforge-checkout-started-v1';
  var SELECTED_PLAN_KEY='rankforge-selected-plan-v1';
  var BILLING_STATUS_KEY='rankforge-billing-status-v1';
  var CHECKOUT_INTENT_KEY='rankforge-post-auth-intent-v1';
  var CHECKOUT_PLAN_KEY='rankforge-post-auth-plan-v1';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var DEBUG_KEY='rankforge-profile-debug-v1';

  function clean(v){return String(v==null?'':v).trim();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function byId(id){return document.getElementById(id);}
  function setText(id,value){var el=byId(id);if(el)el.textContent=value;}
  function normalizePlan(value){var raw=clean(value).toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');if(raw==='growth'||raw==='pro')return'growth';if(raw==='starter'||raw==='start'||raw==='basic')return'starter';return raw||'starter';}
  function planLabel(plan){plan=normalizePlan(plan);return plan==='growth'?'Growth':plan==='starter'?'Starter':'Paid';}
  function getSession(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),null);}catch(e){return null;}}
  function getStarted(){return parse(localStorage.getItem(CHECKOUT_STARTED_KEY),{})||{};}
  function targetPlan(){var params=new URLSearchParams(location.search||'');return normalizePlan(params.get('plan')||params.get('rf_plan')||getStarted().plan||localStorage.getItem(CHECKOUT_PLAN_KEY)||localStorage.getItem(SELECTED_PLAN_KEY)||'starter');}
  function writePending(plan){localStorage.setItem(SELECTED_PLAN_KEY,plan);localStorage.setItem(CHECKOUT_PLAN_KEY,plan);localStorage.setItem(CHECKOUT_INTENT_KEY,'checkout_success');localStorage.setItem(BILLING_STATUS_KEY,'pending_payment');}
  function hasResolvedPaid(plan){var p=window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),null)||{};var billing=clean(p.billing_status).toLowerCase();var resolvedPlan=normalizePlan(p.plan);return (billing==='active'||billing==='admin_unlimited')&&(resolvedPlan===plan||resolvedPlan==='admin_unlimited');}
  function goDashboard(delay){setTimeout(function(){window.location.replace('../dashboard/?checkout=success');},delay||0);}
  async function resolvePlan(){
    var plan=targetPlan();
    writePending(plan);
    setText('checkoutPlanName',planLabel(plan));
    setText('checkoutStatus','Payment received. Activating your '+planLabel(plan)+' workspace...');
    var session=getSession();
    if(!session||!session.userId){
      setText('checkoutStatus','Payment received. Log in to open your dashboard.');
      var login=byId('checkoutLoginLink');if(login)login.hidden=false;
      return;
    }
    var attempts=[0,1500,3500,6500];
    for(var i=0;i<attempts.length;i++){
      if(attempts[i])await new Promise(function(r){setTimeout(r,attempts[i]);});
      if(window.rankforgeResolveEffectiveUserProfile){
        try{await window.rankforgeResolveEffectiveUserProfile({force:true,reason:'checkout_success'});}catch(e){}
      }
      if(hasResolvedPaid(plan)){
        localStorage.removeItem(CHECKOUT_INTENT_KEY);
        setText('checkoutStatus','Your '+planLabel(plan)+' plan is active. Opening dashboard...');
        goDashboard(700);
        return;
      }
    }
    var debug=parse(localStorage.getItem(DEBUG_KEY),{});
    setText('checkoutStatus','Payment received. Stripe webhook may still be syncing. Opening dashboard now; the plan resolver will keep checking from the users sheet.');
    window.rankforgeCheckoutSuccessDebug=debug;
    goDashboard(1400);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',resolvePlan);else resolvePlan();
})();

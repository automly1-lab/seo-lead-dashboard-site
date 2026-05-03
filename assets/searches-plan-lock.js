(function(){
  'use strict';
  if(!document.body || !document.body.classList.contains('app-page-searches')) return;
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  var started=Date.now();
  var timer=null;
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function session(){try{if(window.rankforgeAuth&&window.rankforgeAuth.getSession)return window.rankforgeAuth.getSession();return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function normPlan(v){v=low(v).replace(/\s+/g,'_').replace(/-/g,'_');if(/admin|unlimited/.test(v))return'admin_unlimited';if(/stack|bundle|combined|multi/.test(v))return'stacked';if(v==='growth'||v==='pro')return'growth';if(v==='starter'||v==='basic'||v==='start')return'starter';return'free';}
  function active(v){v=low(v).replace(/\s+/g,'_').replace(/-/g,'_');return v==='active'||v==='paid'||v==='trialing'||v==='complete'||v==='subscription_active'||v==='admin_unlimited';}
  function label(plan){return plan==='admin_unlimited'?'Admin Unlimited':plan==='stacked'?'Stacked Paid':plan==='growth'?'Growth':plan==='starter'?'Starter':'Free';}
  function fmt(v,suffix){if(v===Infinity)return 'Unlimited '+suffix;var raw=clean(v);if(/^(infinity|unlimited|∞)$/i.test(raw))return 'Unlimited '+suffix;var n=Number(raw.replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n))+' '+suffix:'Loading';}
  function sameUser(p,s){var em=low(s.email||s.userEmail);var uid=clean(s.userId||s.id);return !!p&&((em&&low(p.email)===em)||(uid&&clean(p.user_id)===uid));}
  function getEffective(){
    var s=session();
    var p=profile();
    if(window.rankforgeGetEffectivePlan){var e=window.rankforgeGetEffectivePlan();if(e&&e.ready)return e;}
    if(!p||!p.resolved_at||!sameUser(p,s))return {ready:false,name:'Plan loading',plan:'loading',searchLimit:null,creditLimit:null,isAdmin:false};
    var plan=normPlan(p.plan);var billing=low(p.billing_status);
    var email=low(s.email||s.userEmail||p.email);
    if(email===ADMIN_EMAIL){plan='admin_unlimited';billing='admin_unlimited';}
    else if(plan==='admin_unlimited'){plan='free';billing='free';}
    if(!active(billing))plan='free';
    return {ready:true,plan:plan,name:label(plan),searchLimit:p.monthly_search_limit,creditLimit:p.monthly_qualified_lead_credit_limit,isAdmin:plan==='admin_unlimited'};
  }
  function apply(){
    var e=getEffective();
    var planEl=document.getElementById('rfSearchPlanBadge');
    var usageEl=document.getElementById('rfSearchUsageBadge');
    var remainingEl=document.getElementById('rfKpiSearchesRemaining');
    if(!e.ready){
      if(planEl)planEl.textContent='Plan loading';
      if(usageEl)usageEl.textContent='Batch usage loading';
      return;
    }
    if(planEl)planEl.textContent=e.name+' Plan';
    if(usageEl)usageEl.textContent=e.searchLimit===Infinity||/^(infinity|unlimited|∞)$/i.test(clean(e.searchLimit))?'Unlimited batches':fmt(e.searchLimit,'batches');
    if(remainingEl)remainingEl.textContent=e.searchLimit===Infinity||/^(infinity|unlimited|∞)$/i.test(clean(e.searchLimit))?'Unlimited':clean(e.searchLimit||'—');
  }
  function start(){
    apply();
    if(window.rankforgeResolveEffectiveUserProfile){window.rankforgeResolveEffectiveUserProfile({force:true,reason:'searches_plan_lock'}).then(apply).catch(apply);}
    timer=setInterval(function(){apply();if(Date.now()-started>12000){clearInterval(timer);timer=null;}},250);
  }
  window.rankforgeLockSearchesPlan=apply;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('rankforge:user-profile-resolved',apply);
  window.addEventListener('storage',function(e){if(e.key===PROFILE_KEY)apply();});
})();
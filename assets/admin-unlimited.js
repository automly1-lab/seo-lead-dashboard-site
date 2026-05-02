(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim()}
  function low(v){return clean(v).toLowerCase()}
  function parse(raw,f){try{return raw?JSON.parse(raw):f}catch(_){return f}}
  function session(){
    try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function'){var s=window.rankforgeAuth.getSession();if(s)return s}}catch(_){}
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(!/^sb-.+-auth-token$/.test(k))continue;var p=parse(localStorage.getItem(k),{}),u=p.user||p.currentSession&&p.currentSession.user||p.session&&p.session.user;if(u&&u.id)return{userId:u.id,email:u.email||''}}}catch(_){}
    return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
  }
  function profile(){
    var s=parse(localStorage.getItem('rankforge-clean-app-state-v1'),{})||{},out={};
    ['plan','billing_status','subscription_status','accountPlan','currentPlan','email'].forEach(function(k){if(s[k]!=null)out[k]=s[k]});
    try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i)||'';if(/plan|billing|subscription|admin|user-email|email/i.test(k)){out[k]=localStorage.getItem(k)}}}catch(_){}
    return out;
  }
  function isAdmin(user, prof){
    user=user||session(); prof=prof||profile();
    var email=low(user.email||prof.email||prof['rankforge-user-email']||prof['rankforge_user_email']||localStorage.getItem('rankforge-user-email'));
    var plan=low(prof.plan||prof.plan_name||prof.accountPlan||prof.currentPlan||prof['rankforge-selected-plan-v1']||localStorage.getItem('rankforge-selected-plan-v1'));
    var billing=low(prof.billing_status||prof.subscription_status||prof['rankforge-billing-status-v1']||localStorage.getItem('rankforge-billing-status-v1'));
    return email===ADMIN_EMAIL||plan==='admin_unlimited'||plan==='admin unlimited'||plan==='admin'||plan==='unlimited'||billing==='admin_unlimited'||billing==='admin unlimited'||billing==='admin'||billing==='unlimited';
  }
  function decoratePayload(payload){
    payload=payload||{}; if(!isAdmin())return payload; var s=session();
    payload.email=payload.email||s.email||ADMIN_EMAIL;
    payload.user_email=payload.user_email||s.email||ADMIN_EMAIL;
    payload.owner_email=payload.owner_email||s.email||ADMIN_EMAIL;
    payload.plan='admin_unlimited'; payload.plan_name='admin_unlimited'; payload.billing_status='active'; payload.admin_unlimited='true';
    payload.search_limit_allowed='true'; payload.lead_credit_allowed='true'; payload.search_batches_remaining='unlimited'; payload.qualified_leads_remaining='unlimited'; payload.limit_blocked='false'; payload.can_create_search='true'; payload.max_leads_per_batch=payload.max_leads_per_batch||'100';
    return payload;
  }
  function applyUi(){
    if(!isAdmin())return;
    var ids=['rfSearchPlanBadge','planBadge','workspacePlanBadge','rfProspectPlanBadge'];
    ids.forEach(function(id){var n=document.getElementById(id);if(n)n.textContent='Admin Unlimited'});
    var usage=['rfSearchUsageBadge','usageBadge','rfProspectCreditBadge'];
    usage.forEach(function(id){var n=document.getElementById(id);if(n)n.textContent=id==='rfProspectCreditBadge'?'Unlimited credits':'Unlimited batches'});
    var start=document.getElementById('rfStartSearchButton')||document.querySelector('#quickCreateForm button[type="submit"]');
    if(start){start.disabled=false;start.removeAttribute('aria-disabled');if(/limit/i.test(start.textContent||''))start.textContent='Start Search'}
    var status=document.getElementById('createSearchStatus');
    if(status&&/limit|used your available|free search|no search/i.test(status.textContent||'')){status.textContent='Admin Unlimited: search batches and qualified lead credits are unlimited.';status.classList.remove('is-error')}
    var depth=document.getElementById('searchDepthInput');
    if(depth){Array.from(depth.options||[]).forEach(function(o){o.hidden=false});}
  }
  function patchFormData(){
    if(window.__rankforgeAdminFetchPatched)return; window.__rankforgeAdminFetchPatched=true;
    var nativeFetch=window.fetch;
    window.fetch=function(input,init){
      try{
        if(isAdmin()&&init&&init.body&&typeof URLSearchParams!=='undefined'){
          if(init.body instanceof URLSearchParams){decoratePayload(Object.fromEntries(init.body.entries())); var obj=decoratePayload(Object.fromEntries(init.body.entries())); init.body=new URLSearchParams(obj).toString();}
          else if(typeof init.body==='string'&&/search_id|user_id|niche|city/.test(init.body)){var params=new URLSearchParams(init.body);var obj2={};params.forEach(function(v,k){obj2[k]=v});obj2=decoratePayload(obj2);init.body=new URLSearchParams(obj2).toString();}
        }
      }catch(e){console.warn('[RankForge] Admin unlimited fetch decoration skipped',e)}
      return nativeFetch.apply(this,arguments);
    };
  }
  function init(){applyUi();patchFormData();}
  window.rankforgeAdmin={ADMIN_EMAIL:ADMIN_EMAIL,isRankForgeAdmin:isAdmin,decorateAdminPayload:decoratePayload,applyAdminUnlimitedUi:applyUi};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setInterval(applyUi,1200);
})();

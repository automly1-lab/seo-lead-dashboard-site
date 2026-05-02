(function(){
  'use strict';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(_){return fallback;}}
  function session(){
    try{if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function'){var s=window.rankforgeAuth.getSession();if(s)return s;}}catch(_){}
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i)||'';
        if(!/^sb-.+-auth-token$/.test(k))continue;
        var p=parse(localStorage.getItem(k),{});
        var u=p.user||(p.currentSession&&p.currentSession.user)||(p.session&&p.session.user);
        if(u&&u.email)return{userId:u.id||'',email:u.email||''};
      }
    }catch(_){}
    return parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};
  }
  function activeEmail(user){
    user=user||session()||{};
    return clean(user.email||user.userEmail).toLowerCase();
  }
  function isAdmin(user){
    return activeEmail(user)===ADMIN_EMAIL;
  }
  function decoratePayload(payload){
    payload=payload||{};
    if(!isAdmin())return payload;
    var s=session();
    payload.email=payload.email||s.email||ADMIN_EMAIL;
    payload.user_email=payload.user_email||s.email||ADMIN_EMAIL;
    payload.owner_email=payload.owner_email||s.email||ADMIN_EMAIL;
    payload.plan='admin_unlimited';
    payload.plan_name='admin_unlimited';
    payload.billing_status='active';
    payload.admin_unlimited='true';
    payload.search_limit_allowed='true';
    payload.lead_credit_allowed='true';
    payload.search_batches_remaining='unlimited';
    payload.qualified_leads_remaining='unlimited';
    payload.limit_blocked='false';
    payload.can_create_search='true';
    payload.max_leads_per_batch=payload.max_leads_per_batch||'100';
    return payload;
  }
  function applyUi(){
    if(!isAdmin())return;
    ['rfSearchPlanBadge','planBadge','workspacePlanBadge','rfProspectPlanBadge','rfPlanBadge'].forEach(function(id){var n=document.getElementById(id);if(n)n.textContent='Admin Unlimited';});
    ['rfSearchUsageBadge','usageBadge'].forEach(function(id){var n=document.getElementById(id);if(n)n.textContent='Unlimited batches';});
    ['rfProspectCreditBadge','rfCreditBadge'].forEach(function(id){var n=document.getElementById(id);if(n)n.textContent='Unlimited credits';});
    var start=document.getElementById('rfStartSearchButton')||document.querySelector('#quickCreateForm button[type="submit"]');
    if(start){start.disabled=false;start.removeAttribute('aria-disabled');}
  }
  function patchFetch(){
    if(window.__rankforgeAdminFetchPatched)return;
    window.__rankforgeAdminFetchPatched=true;
    var nativeFetch=window.fetch;
    window.fetch=function(input,init){
      try{
        if(isAdmin()&&init&&init.body&&typeof URLSearchParams!=='undefined'){
          var params=null;
          if(init.body instanceof URLSearchParams)params=init.body;
          else if(typeof init.body==='string'&&/search_id|user_id|niche|city/.test(init.body))params=new URLSearchParams(init.body);
          if(params){var obj={};params.forEach(function(v,k){obj[k]=v;});init.body=new URLSearchParams(decoratePayload(obj)).toString();}
        }
      }catch(e){console.warn('[RankForge] Admin payload decoration skipped',e);}
      return nativeFetch.apply(this,arguments);
    };
  }
  function init(){applyUi();patchFetch();}
  window.rankforgeAdmin={ADMIN_EMAIL:ADMIN_EMAIL,isRankForgeAdmin:isAdmin,decorateAdminPayload:decoratePayload,applyAdminUnlimitedUi:applyUi};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  setInterval(applyUi,1200);
})();

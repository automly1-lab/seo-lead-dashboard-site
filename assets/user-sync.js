(function(){
  'use strict';
  var SYNC_KEY_PREFIX='rankforge-user-sync-sent-v1:';
  var ADMIN_EMAIL='automly1@gmail.com';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  function clean(v){return String(v==null?'':v).trim();}
  function lower(v){return clean(v).toLowerCase();}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function session(){
    try{
      if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();
      return safeParse(localStorage.getItem('rankforge-auth-session-v1'),null);
    }catch(e){return null;}
  }
  function profile(){return window.rankforgeUserProfile||safeParse(localStorage.getItem(PROFILE_KEY),null)||{};}
  function rootWebhook(){
    var stored=clean(localStorage.getItem('rankforge-search-submit-webhook-v1'));
    if(stored&&/\/webhook\//.test(stored))return stored.replace(/\/webhook\/[^/?#]+/,'/webhook/rankforge-user-sync');
    return 'https://lastaccount1907.app.n8n.cloud/webhook/rankforge-user-sync';
  }
  function normalizePlan(value){
    var raw=clean(value).toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');
    if(raw==='growth'||raw==='pro')return 'growth';
    if(raw==='starter'||raw==='start'||raw==='basic')return 'starter';
    if(raw==='agency'||raw==='agency_intelligence')return 'agency_intelligence';
    if(raw==='admin'||raw==='admin_unlimited')return 'admin_unlimited';
    return 'free';
  }
  function billingIsActive(value){
    var b=lower(value).replace(/\s+/g,'_').replace(/-/g,'_');
    return ['active','paid','trialing','complete','checkout_complete','subscription_active','admin_unlimited'].indexOf(b)>=0;
  }
  function shouldSend(userId){
    if(!userId)return false;
    var key=SYNC_KEY_PREFIX+userId;
    var last=Number(localStorage.getItem(key)||0);
    var now=Date.now();
    if(last&&now-last<6*60*60*1000)return false;
    localStorage.setItem(key,String(now));
    return true;
  }
  async function waitForProfile(maxMs){
    var started=Date.now();
    return new Promise(function(resolve){
      (function tick(){
        var p=profile();
        if(p&&p.resolved_at)return resolve(p);
        if(Date.now()-started>=maxMs)return resolve(p||{});
        setTimeout(tick,200);
      })();
    });
  }
  async function sync(force){
    var s=session();
    if(!s||!s.userId||!s.email)return;
    if(!force&&!shouldSend(s.userId))return;

    // Do not force profile resolution here. Forced resolver calls caused dashboard/profile redraws
    // and appended sync rows during page load. The dedicated resolver owns profile refresh.
    await waitForProfile(3500);

    var p=profile();
    var email=lower(s.email||s.userEmail);
    var managed=String((p&&p.admin_managed)||localStorage.getItem('rankforge-admin-plan-managed-v1')||'').toLowerCase()==='true';
    var paidManaged=String((p&&p.paid_managed)||localStorage.getItem('rankforge-paid-plan-managed-v1')||'').toLowerCase()==='true';
    var rawPlan=(managed||paidManaged)&&p.plan?p.plan:(localStorage.getItem('rankforge-current-plan-v1')||localStorage.getItem('rankforge-plan-v1')||localStorage.getItem('rankforge-selected-plan-v1')||'free');
    var selected=normalizePlan(rawPlan);
    var billing=(managed||paidManaged)&&p.billing_status?p.billing_status:(clean(localStorage.getItem('rankforge-billing-status-v1'))||'free');

    if(email===ADMIN_EMAIL){
      selected='admin_unlimited';
      billing='admin_unlimited';
    }else if(managed){
      billing=billing||'active';
    }else if(paidManaged){
      if(selected==='free')selected=normalizePlan(p.plan||'free');
      billing=billingIsActive(billing)?billing:'active';
    }else if(!billingIsActive(billing)){
      selected='free';
      billing=billing||'free';
    }

    var payload={
      user_id:s.userId,
      email:s.email,
      full_name:clean(s.name||s.fullName||''),
      plan:selected,
      current_plan:selected,
      billing_status:billing,
      subscription_status:billing,
      source:managed?'frontend_user_sync_admin_managed':(paidManaged?'frontend_user_sync_paid_confirmed':'frontend_user_sync'),
      synced_at:new Date().toISOString(),
      created_at:clean(s.createdAt||''),
      user_agent:navigator.userAgent||''
    };
    if(managed||paidManaged){
      payload.admin_override=managed?true:false;
      payload.monthly_search_limit=p.monthly_search_limit||localStorage.getItem('rankforge-monthly-search-limit-v1')||'';
      payload.monthly_qualified_lead_credit_limit=p.monthly_qualified_lead_credit_limit||localStorage.getItem('rankforge-monthly-qualified-credit-limit-v1')||'';
      payload.max_leads_per_batch=p.max_leads_per_batch||localStorage.getItem('rankforge-max-leads-per-batch-v1')||'';
    }
    try{
      await fetch(rootWebhook(),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
    }catch(error){
      console.warn('RankForge user sync failed',error);
    }
  }
  window.rankforgeUserSync={sync:sync};
  function boot(){setTimeout(function(){sync(false);},5000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
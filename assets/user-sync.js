(function(){
  'use strict';
  var SYNC_KEY_PREFIX='rankforge-user-sync-sent-v1:';
  function clean(v){return String(v==null?'':v).trim();}
  function safeParse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function session(){
    try{
      if(window.rankforgeAuth&&typeof window.rankforgeAuth.getSession==='function')return window.rankforgeAuth.getSession();
      return safeParse(localStorage.getItem('rankforge-auth-session-v1'),null);
    }catch(e){return null;}
  }
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
  function shouldSend(userId){
    if(!userId)return false;
    var key=SYNC_KEY_PREFIX+userId;
    var last=Number(localStorage.getItem(key)||0);
    var now=Date.now();
    if(last&&now-last<6*60*60*1000)return false;
    localStorage.setItem(key,String(now));
    return true;
  }
  async function sync(force){
    var s=session();
    if(!s||!s.userId||!s.email)return;
    if(!force&&!shouldSend(s.userId))return;
    var selected=normalizePlan(localStorage.getItem('rankforge-current-plan-v1')||localStorage.getItem('rankforge-selected-plan-v1')||'free');
    var billing=clean(localStorage.getItem('rankforge-billing-status-v1'))||'free';
    if(selected==='free')billing='free';
    var payload={
      user_id:s.userId,
      email:s.email,
      full_name:clean(s.name||s.fullName||''),
      plan:selected,
      billing_status:billing,
      source:'frontend_user_sync',
      synced_at:new Date().toISOString(),
      created_at:clean(s.createdAt||''),
      user_agent:navigator.userAgent||''
    };
    try{
      await fetch(rootWebhook(),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
    }catch(error){
      console.warn('RankForge user sync failed',error);
    }
  }
  window.rankforgeUserSync={sync:sync};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){sync(false);},700);});
  else setTimeout(function(){sync(false);},700);
  setTimeout(function(){sync(false);},2500);
})();

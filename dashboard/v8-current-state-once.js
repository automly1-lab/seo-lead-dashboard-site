(function(){
  'use strict';
  var CFG=window.RANKFORGE_CONFIG||{WEBHOOKS:{}};
  var BASE=String(CFG.N8N_BASE_URL||'https://rankforge1907.app.n8n.cloud').replace(/\/$/,'');
  var API=BASE+(CFG.WEBHOOKS&&CFG.WEBHOOKS.CURRENT_STATE||'/webhook/rankforge-demo-current-state');
  var LAST_KEY='rankforge-current-state-last-sync-v1';
  var COOLDOWN=30*1000;
  var inFlight=false;

  function c(v){return String(v==null?'':v).trim()}
  function k(v){var x=c(v).toLowerCase().replace(/\s+/g,'_').replace(/-/g,'_');if(x==='pro'||x==='founding'||x==='founding_plan')return'growth';if(x==='start'||x==='basic'||x==='starter_plan')return'starter';if(x==='agency'||x==='enterprise')return'agency_intelligence';if(x.indexOf('admin')>-1||x.indexOf('unlimited')>-1)return'admin_unlimited';return x||'free'}
  function n(v,d){var x=Number(c(v).replace(/[^0-9.-]/g,''));return Number.isFinite(x)?Math.max(0,Math.round(x)):(d||0)}
  function name(x){return{free:'Free',starter:'Starter',growth:'Growth',agency_intelligence:'Agency Intelligence',admin_unlimited:'Admin'}[k(x)]||c(x)||'Free'}
  function lim(x){return{free:[1,10,10],starter:[50,50,25],growth:[150,250,50],agency_intelligence:[9999,999999,50],admin_unlimited:[999999,999999,50]}[k(x)]||[1,10,10]}
  function stateObj(){try{return state}catch(e){return window.state||null}}
  function sess(){if(window.rankforgeAuth&&window.rankforgeAuth.getSession)return window.rankforgeAuth.getSession();try{return JSON.parse(localStorage.getItem('rankforge-auth-session-v1')||'null')}catch(e){return null}}
  function identity(){var s=sess()||{},st=stateObj()||{};return{userId:c(s.userId||s.id||(st.user&&st.user.userId)),email:c(s.email||(st.user&&st.user.email)).toLowerCase()}}
  function matchesRequest(row){row=unwrap(row);var id=identity(),uid=c(row.user_id||row.owner_user_id||row.created_by),em=c(row.email||row.user_email||row.owner_email||row.email_user).toLowerCase();if(uid||em)return(!!uid&&!!id.userId&&uid===id.userId)||(!!em&&!!id.email&&em===id.email);return true}
  function unwrap(j){var row=j&&((Array.isArray(j.current_state)?j.current_state[0]:j.current_state)||(Array.isArray(j.user)?j.user[0]:j.user)||(Array.isArray(j.row)?j.row[0]:j.row)||(Array.isArray(j.data)?j.data[0]:j.data)||j);return Array.isArray(row)?row[0]||{}:row||{}}
  function plan(row){row=unwrap(row);if(!matchesRequest(row))row={};var key=k(row.key||row.plan||row.current_plan||row.plan_name||row.name||localStorage.getItem('rankforge-selected-plan-v1')),d=lim(key);return{key:key,name:name(key),billingStatus:c(row.billing_status||row.billingStatus||row.subscription_status||(key==='free'?'free':'active')),batchesLimit:n(row.effective_search_limit||row.search_batches_limit||row.search_batch_limit||row.batchesLimit,d[0]),batchesUsed:n(row.search_batches_used||row.batchesUsed,0),creditsLimit:n(row.effective_qualified_lead_limit||row.qualified_lead_credits_limit||row.qualified_leads_limit||row.creditsLimit,d[1]),creditsUsed:n(row.qualified_lead_credits_used||row.qualified_leads_used||row.creditsUsed,0),maxLeadsPerBatch:n(row.max_leads_per_batch||row.maxLeadsPerBatch,d[2]),csvExport:key!=='free',unlimited:key==='admin_unlimited'||identity().email===(CFG.ADMIN_EMAIL||'automly1@gmail.com').toLowerCase()}}
  function isFreePlan(p){return p&&p.key==='free'}
  function updateUpgradeButton(p){var b=document.querySelector('.usage button');if(b)b.style.display=isFreePlan(p)?'':'none'}
  function paint(p){
    if(!p)return;
    var st=stateObj();
    if(st){st.plan=Object.assign({},st.plan||{},p);st.user=Object.assign({},st.user||{},{plan:p.name,billingStatus:p.billingStatus});window.state=st}
    localStorage.setItem('rankforge-user-plan-v1',JSON.stringify(p));
    localStorage.setItem('rankforge-selected-plan-v1',p.key);
    localStorage.setItem('rankforge-billing-status-v1',p.billingStatus||'');
    var u=document.getElementById('creditsUsed'),l=document.getElementById('creditsLimit'),b=document.getElementById('creditsBar'),box=document.querySelector('.usage');
    if(u)u.textContent=p.unlimited?'Unlimited':String(p.creditsUsed||0);
    if(l)l.textContent=p.unlimited?'':' / '+String(p.creditsLimit||0);
    if(b)b.style.width=p.unlimited?'100%':(p.creditsLimit?Math.min(100,(p.creditsUsed||0)/p.creditsLimit*100)+'%':'0%');
    if(box){var sm=box.querySelector('small');if(sm)sm.textContent='Plan: '+p.name+(p.billingStatus?' · '+p.billingStatus:'')}
    var accountTitle=document.querySelector('.account strong');if(accountTitle)accountTitle.textContent=p.unlimited?'RankForge Admin':'RankForge '+p.name;
    var workspaceSmall=document.querySelector('.workspace-identity small');if(workspaceSmall&&workspaceSmall.textContent==='Checking session')workspaceSmall.textContent=(st&&st.user&&st.user.email)||'';
    updateUpgradeButton(p);
    try{if(typeof metrics==='function')metrics()}catch(e){}
  }
  function cached(){try{var x=JSON.parse(localStorage.getItem('rankforge-user-plan-v1')||'null');return x?plan(x):null}catch(e){return null}}
  function pending(){var u=document.getElementById('creditsUsed'),l=document.getElementById('creditsLimit'),box=document.querySelector('.usage');if(u&&u.textContent==='0')u.textContent='...';if(l&&l.textContent===' / 0')l.textContent='';if(box){var sm=box.querySelector('small');if(sm&&/^Credits Used$|^Plan$/.test(c(sm.textContent)))sm.textContent='Checking plan'}}
  function shouldSkip(force){if(force)return false;var last=Date.parse(localStorage.getItem(LAST_KEY)||'')||0;return last&&Date.now()-last<COOLDOWN}
  function bodyParams(){var s=sess()||{},st=stateObj()||{},body=new URLSearchParams();body.set('email',s.email||(st.user&&st.user.email)||'');body.set('user_id',s.userId||s.id||(st.user&&st.user.userId)||'');body.set('event','get_current_state');body.set('reason','dashboard_credit_sync');return body.toString()}
  function xhrJson(url,body){return new Promise(function(resolve,reject){var x=new XMLHttpRequest();x.open('POST',url,true);x.setRequestHeader('Content-Type','application/x-www-form-urlencoded;charset=UTF-8');x.setRequestHeader('Accept','application/json');x.onreadystatechange=function(){if(x.readyState!==4)return;if(x.status>=200&&x.status<300){try{resolve(JSON.parse(x.responseText||'{}'))}catch(e){reject(e)}}else reject(new Error('current_state_'+x.status))};x.onerror=function(){reject(new Error('current_state_network'))};x.send(body)})}
  function load(force){if(inFlight||shouldSkip(force))return Promise.resolve(cached());inFlight=true;return xhrJson(API,bodyParams()).then(function(j){localStorage.setItem(LAST_KEY,new Date().toISOString());return plan(j)}).finally(function(){inFlight=false})}
  function sync(force){var p=cached();if(p&&p.creditsLimit>0)paint(p);else pending();return load(!!force).then(function(x){if(x)paint(x);return x}).catch(function(e){console.warn('RankForge current state sync failed',e);if(p)paint(p);return p})}
  function boot(){sync(true);setTimeout(function(){sync(true)},2500)}

  window.rankforgeCurrentState={refresh:function(){return sync(true)},paint:paint,sync:sync};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)sync(true)});
  window.addEventListener('focus',function(){sync(true)});
  setInterval(function(){if(!document.hidden)sync(false)},60000);
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#refreshResultsBtn,#createBatch,[data-qualify]'))setTimeout(function(){sync(true)},1800)},true);
})();
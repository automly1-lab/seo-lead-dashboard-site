(function(){
  'use strict';
  if(((document.body||{}).dataset||{}).page!=='dashboard')return;
  var SHEET_ID='1mFDJKBexMfMn8NZSq7xhES7pHWt4LCEY2Gq-zATHuco';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var ADMIN_EMAIL='automly1@gmail.com';
  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function parse(raw,f){try{return raw?JSON.parse(raw):f;}catch(e){return f;}}
  function num(v){var n=Number(String(v==null?'':v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}
  function hasValue(v){return clean(v)!==''&&!/^(undefined|null|nan)$/i.test(clean(v));}
  function dateMs(v){var t=Date.parse(clean(v));return Number.isFinite(t)?t:0;}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),{})||{};}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem('rankforge-auth-session-v1'),{})||{};}catch(e){return{};}}
  function userEmail(){var s=session(),p=profile();return low(s.email||s.userEmail||p.email);}
  function userId(){var s=session(),p=profile();return clean(s.userId||s.id||p.user_id||localStorage.getItem('rankforge-current-user-id-v1'));}
  function isAdmin(){return userEmail()===ADMIN_EMAIL||low(profile().plan)==='admin_unlimited'||low(profile().billing_status)==='admin_unlimited';}
  function rowEmail(r){return low(r.email||r.user_email||r.customer_email||r.billing_email||r.owner_email);}
  function rowUser(r){return clean(r.user_id||r.userId||r.owner_user_id||r.id);}
  function matches(r){if(isAdmin())return true;var e=userEmail(),u=userId(),re=rowEmail(r),ru=rowUser(r);return (!!e&&re===e)||(!!u&&ru===u)||(!!e&&ru.toLowerCase()===e);}
  function fetchSheet(sheet){return new Promise(function(resolve){var cb='rfCreditFix_'+sheet+'_'+Date.now()+'_'+Math.floor(Math.random()*99999),sc=document.createElement('script'),done=false,to=setTimeout(function(){finish([]);},9000);function finish(rows){if(done)return;done=true;clearTimeout(to);try{sc.remove();}catch(e){}try{delete window[cb];}catch(e){}resolve(rows||[]);}window[cb]=function(payload){try{var cols=(payload.table&&payload.table.cols||[]).map(function(c){return c.label||c.id;});var rows=(payload.table&&payload.table.rows||[]).map(function(row,i){var o={_row_index:i+2};(row.c||[]).forEach(function(cell,idx){o[cols[idx]]=cell?clean(cell.f||cell.v||''):'';});return o;});finish(rows);}catch(e){finish([]);}};sc.src='https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/gviz/tq?sheet='+encodeURIComponent(sheet)+'&tqx=responseHandler:'+cb+'&headers=1&cacheBust='+Date.now();sc.onerror=function(){finish([]);};document.body.appendChild(sc);});}
  function scoreRow(r){
    var p=0;
    if(rowEmail(r)&&rowEmail(r)===userEmail())p+=1000;
    if(rowUser(r)&&rowUser(r)===userId())p+=500;
    if(rowUser(r)&&rowUser(r).toLowerCase()===userEmail())p+=300;
    if(/stripe|checkout|subscription|billing/i.test(clean(r.source)))p+=250;
    if(/active/i.test(clean(r.billing_status)))p+=100;
    if(/active/i.test(clean(r.subscription_status)))p+=100;
    p+=dateMs(r.updated_at||r.synced_at||r.created_at)/1000000000000;
    return p;
  }
  function pickCurrent(rows){
    var matching=rows.filter(matches);
    if(!matching.length)return {};
    var latestPeriod=Math.max.apply(null,matching.map(function(r){return dateMs(r.billing_period_start||r.created_at||r.updated_at);}));
    var periodRows=matching.filter(function(r){return latestPeriod?dateMs(r.billing_period_start||r.created_at||r.updated_at)===latestPeriod:true;});
    periodRows.sort(function(a,b){
      var remA=hasValue(a.qualified_leads_remaining)?num(a.qualified_leads_remaining):-1;
      var remB=hasValue(b.qualified_leads_remaining)?num(b.qualified_leads_remaining):-1;
      if(remA!==remB)return remB-remA;
      var usedA=hasValue(a.qualified_leads_used)?num(a.qualified_leads_used):999999;
      var usedB=hasValue(b.qualified_leads_used)?num(b.qualified_leads_used):999999;
      if(usedA!==usedB)return usedA-usedB;
      return scoreRow(b)-scoreRow(a);
    });
    return periodRows[0]||matching.sort(function(a,b){return scoreRow(b)-scoreRow(a);})[0]||{};
  }
  async function run(){
    var rows=await fetchSheet('user_current_state');
    var current=pickCurrent(rows);
    if(!current||!Object.keys(current).length)return;
    var limit=hasValue(current.effective_qualified_lead_limit)?num(current.effective_qualified_lead_limit):num(current.base_qualified_lead_limit||current.monthly_qualified_lead_credit_limit||profile().monthly_qualified_lead_credit_limit);
    var used;
    if(hasValue(current.qualified_leads_used)) used=num(current.qualified_leads_used);
    else if(hasValue(current.qualified_leads_remaining)&&limit) used=Math.max(0,limit-num(current.qualified_leads_remaining));
    else used=num(profile().qualified_leads_used);
    var el=document.getElementById('rfKpiCredits');
    if(el&&limit) el.textContent=used+' / '+limit;
    else if(el) el.textContent=String(used);
    var badge=document.getElementById('rfCreditBadge');
    if(badge&&hasValue(current.qualified_leads_remaining)) badge.textContent=num(current.qualified_leads_remaining)+' credits remaining';
  }
  window.rankforgeDashboardCreditUsedFix=run;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('rankforge:user-profile-resolved',run);
  setTimeout(run,800);
  setTimeout(run,1800);
})();
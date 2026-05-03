(function(){
  'use strict';

  var ADMIN_EMAIL='automly1@gmail.com';
  var STATE_KEY='rankforge-clean-app-state-v1';
  var PROFILE_KEY='rankforge-user-profile-cache-v1';
  var AUTH_KEY='rankforge-auth-session-v1';
  var PREF_KEY='rankforge-settings-preferences-v1';

  function clean(v){return String(v==null?'':v).trim();}
  function low(v){return clean(v).toLowerCase();}
  function parse(raw,fallback){try{return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
  function byId(id){return document.getElementById(id);}
  function text(id,value){var el=byId(id);if(el)el.textContent=value;}
  function html(id,value){var el=byId(id);if(el)el.innerHTML=value;}
  function esc(v){return clean(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];});}
  function isInf(v){return v===Infinity||/^(infinity|unlimited|∞)$/i.test(clean(v));}
  function num(v,fallback){if(isInf(v))return Infinity;var n=Number(clean(v).replace(/[^0-9.-]/g,''));return Number.isFinite(n)?Math.max(0,Math.round(n)):(fallback||0);}
  function session(){try{return window.rankforgeAuth&&window.rankforgeAuth.getSession?window.rankforgeAuth.getSession():parse(localStorage.getItem(AUTH_KEY),null);}catch(e){return null;}}
  function profile(){return window.rankforgeUserProfile||parse(localStorage.getItem(PROFILE_KEY),null)||{};}
  function state(){return parse(localStorage.getItem(STATE_KEY),{})||{};}
  function prefs(){return parse(localStorage.getItem(PREF_KEY),{})||{};}
  function savePrefs(p){localStorage.setItem(PREF_KEY,JSON.stringify(p||{}));}
  function normalizePlan(v){var raw=low(v).replace(/\s+/g,'_').replace(/-/g,'_');if(/admin|unlimited/.test(raw))return'admin';if(/stack|bundle|combined|multi/.test(raw))return'stacked';if(raw==='growth'||raw==='pro')return'growth';if(raw==='starter'||raw==='basic')return'starter';return'free';}
  function billingStatus(v){var raw=low(v).replace(/\s+/g,'_').replace(/-/g,'_');if(/admin|unlimited/.test(raw))return'admin_unlimited';if(/active|paid|trialing|complete|subscription_active/.test(raw))return'active';if(/pending|incomplete/.test(raw))return'pending';if(/cancel/.test(raw))return'cancelled';return raw||'free';}
  function paidEntitlement(prof,plan){prof=prof||{};return plan!=='free'&&(prof.paid_managed||prof.admin_managed||prof.csv_export===true||String(prof.csv_export).toLowerCase()==='true'||num(prof.monthly_search_limit,0)>2||num(prof.monthly_qualified_lead_credit_limit,0)>10||/stripe|checkout|billing|subscription|override|paid/i.test(clean(prof.source_row_source)));}
  function isAdmin(sess,prof){return low((sess&&sess.email)||(prof&&prof.email))===ADMIN_EMAIL||billingStatus(prof&&prof.billing_status)==='admin_unlimited';}
  function planMeta(plan,prof){
    prof=prof||{};
    if(plan==='admin')return{name:'Admin Unlimited',copy:'Unlimited internal access for RankForge admin workflows.',search:Infinity,credits:Infinity,batch:50,csv:true,cta:'Admin controls',href:'../quality/'};
    if(plan==='stacked')return{name:'Stacked Paid Plan',copy:'This account has stacked paid allowances for the current billing period.',search:num(prof.monthly_search_limit,0),credits:num(prof.monthly_qualified_lead_credit_limit,0),batch:num(prof.max_leads_per_batch,50),csv:true,cta:'View pricing',href:'../pricing/#plans'};
    if(plan==='growth')return{name:'Growth Plan',copy:'Growth includes 150 search batches and 250 qualified lead credits per month.',search:num(prof.monthly_search_limit,150)||150,credits:num(prof.monthly_qualified_lead_credit_limit,250)||250,batch:num(prof.max_leads_per_batch,50)||50,csv:true,cta:'Agency Intelligence waitlist',href:'../pricing/#plans'};
    if(plan==='starter')return{name:'Starter Plan',copy:'Starter includes 50 search batches and 50 qualified lead credits per month.',search:num(prof.monthly_search_limit,50)||50,credits:num(prof.monthly_qualified_lead_credit_limit,50)||50,batch:num(prof.max_leads_per_batch,25)||25,csv:true,cta:'Upgrade to Growth',href:'../pricing/#plans'};
    return{name:'Free Plan',copy:'Free includes two test searches and limited lead previews.',search:2,credits:10,batch:10,csv:false,cta:'Upgrade to Starter',href:'../pricing/#plans'};
  }
  function effectivePlan(sess,prof){
    if(window.rankforgeGetEffectivePlan){var e=window.rankforgeGetEffectivePlan();if(e&&e.ready){return e.isAdmin?'admin':normalizePlan(e.plan);}}
    if(isAdmin(sess,prof))return'admin';
    var plan=normalizePlan(prof&&prof.plan);var status=billingStatus(prof&&prof.billing_status);
    if(status==='active'||paidEntitlement(prof,plan))return plan;
    return 'free';
  }
  function currentBilling(sess,prof){
    if(isAdmin(sess,prof))return'admin_unlimited';
    var plan=normalizePlan(prof&&prof.plan);var status=billingStatus(prof&&prof.billing_status);
    if(status==='active'||paidEntitlement(prof,plan))return'active';
    return status;
  }
  function effectiveMeta(sess,prof){
    if(window.rankforgeGetEffectivePlan){var e=window.rankforgeGetEffectivePlan();if(e&&e.ready){var plan=e.isAdmin?'admin':normalizePlan(e.plan);return{name:e.name+(e.isAdmin?'':' Plan').replace('Plan Plan','Plan'),copy:plan==='free'?'Free includes two test searches and limited lead previews.':e.name+' access is active for this account.',search:e.searchLimit,credits:e.creditLimit,batch:e.maxBatch,csv:!!e.csv,cta:plan==='growth'?'Agency Intelligence waitlist':plan==='starter'?'Upgrade to Growth':plan==='admin'?'Admin controls':'Upgrade to Starter',href:plan==='admin'?'../quality/':'../pricing/#plans'};}}
    return planMeta(effectivePlan(sess,prof),prof);
  }
  function owned(row,userId){var owner=clean(row&&(row.userId||row.user_id||row.owner_user_id));return !owner||!userId||owner===userId;}
  function leadStatus(l){var s=low(l&&(l.qualification_status||l.status||l.decision));if(s==='qualified')return'qualified';if(s==='qualified_locked'||s==='locked_qualified')return'qualified_locked';if(s==='rejected'||s==='filtered_out'||s==='filtered out')return'rejected';return'review_needed';}
  function usage(sess){var app=state();var userId=clean(sess&&(sess.userId||sess.id));var lists=[].concat(app.localLists||[],app.remoteCache&&app.remoteCache.lists||[]).filter(function(x){return x&&owned(x,userId);});var leads=[].concat(app.localLeads||[],app.remoteCache&&app.remoteCache.leads||[]).filter(function(x){return x&&owned(x,userId);});var qualified=leads.filter(function(l){return leadStatus(l)==='qualified';});return{searches:lists.length,credits:qualified.length};}
  function badge(status){var label='Free',cls='free';if(status==='active'){label='Active';cls='active';}else if(status==='pending'){label='Pending';cls='pending';}else if(status==='cancelled'){label='Cancelled';cls='danger';}else if(status==='admin_unlimited'){label='Admin';cls='enabled';}return'<span class="rf-badge '+cls+'">'+label+'</span>';}
  function accessBadge(enabled){return enabled?'<span class="rf-badge enabled">Enabled</span>':'<span class="rf-badge locked">Locked</span>';}
  function progress(id,used,limit){var root=byId(id);if(!root)return;if(isInf(limit)){root.innerHTML='<div class="rf-unlimited-box">∞ Unlimited</div>';return;}var pct=Math.min(100,Math.round((used/Math.max(1,limit))*100));var tone=pct>=100?'danger':pct>=80?'warn':'';root.innerHTML='<div class="rf-usage-item"><div class="rf-usage-top"><span>'+esc(id==='searchUsageBar'?'Search batches':'Qualified lead credits')+'</span><strong>'+used+' / '+limit+' used</strong></div><div class="rf-progress '+tone+'"><span style="width:'+pct+'%"></span></div></div>';}
  function hide(el){if(!el)return;el.hidden=true;el.setAttribute('aria-hidden','true');el.style.display='none';}
  function show(el){if(!el)return;el.hidden=false;el.removeAttribute('aria-hidden');el.style.display='inline-flex';}
  async function refreshProfile(){if(window.rankforgeResolveEffectiveUserProfile){try{await window.rankforgeResolveEffectiveUserProfile({force:true,reason:'settings_refresh'});}catch(e){}}render();}
  function render(){
    var sess=session()||{};var prof=profile()||{};var admin=isAdmin(sess,prof);var billing=currentBilling(sess,prof);var plan=effectivePlan(sess,prof);var meta=effectiveMeta(sess,prof);var used=usage(sess);var p=prefs();
    document.body.classList.toggle('is-admin',admin);
    text('accountEmail',clean(sess.email||prof.email)||'Signed-in user');text('accountStatus','Active');text('accountRole',admin?'Admin':'User');text('advancedUserId',clean(sess.userId||sess.id||prof.user_id)||'—');text('advancedCreatedAt',clean(sess.createdAt||sess.created_at||prof.created_at)||'—');
    text('planName',meta.name);text('planCopy',meta.copy);html('planBadge',badge(billing));progress('searchUsageBar',used.searches,meta.search);progress('creditUsageBar',used.credits,meta.credits);text('searchLimitLabel',isInf(meta.search)?'Unlimited search batches':meta.search+' search batches/month');text('creditLimitLabel',isInf(meta.credits)?'Unlimited qualified lead credits':meta.credits+' qualified lead credits/month');text('maxBatchLabel',isInf(meta.batch)?'Unlimited batch size':meta.batch+' prospects max per batch');
    var pending=billing==='pending';var pendingBox=byId('pendingWarning');if(pendingBox)pendingBox.hidden=!pending;var cta=byId('planCta');if(cta){if(admin){hide(cta);}else{show(cta);cta.textContent=meta.cta;cta.href=meta.href;}}
    html('billingStatusBadge',badge(billing));text('billingPlan',pending?'Free limits until confirmed':meta.name);text('billingState',billing==='active'?'Active':billing==='pending'?'Pending payment':billing==='cancelled'?'Cancelled':billing==='admin_unlimited'?'Admin unlimited':'Free');text('billingPeriod','Monthly');text('billingRenewal','Available after billing portal is connected');text('billingMessage',billing==='pending'?'Paid features activate after checkout confirmation.':billing==='cancelled'?'Your paid access will not renew.':billing==='active'?'Your paid plan is active.':'No active paid subscription.');
    html('exportBadge',accessBadge(meta.csv));text('exportTitle',meta.csv?'CSV export enabled':'CSV export locked');text('exportCopy',meta.csv?'Export contact-ready prospects from your own workspace. Rejected leads remain hidden from normal users.':'CSV export is available on Starter, Growth, and Admin plans.');var exportCta=byId('exportCta');if(exportCta){if(meta.csv){hide(exportCta);}else{show(exportCta);exportCta.textContent='Upgrade to Starter';exportCta.href='../pricing/#plans';}}
    var country=byId('prefCountry'),niche=byId('prefNiche'),city=byId('prefCity');if(country&&!country.value)country.value=p.country||'';if(niche&&!niche.value)niche.value=p.niche||'';if(city&&!city.value)city.value=p.city||'';
    var adminCard=byId('admin-tools');if(adminCard)adminCard.hidden=!admin;var diagnostics=byId('adminDiagnostics');if(diagnostics)diagnostics.hidden=!admin;
  }
  function bind(){var refresh=byId('refreshAccountButton');if(refresh)refresh.addEventListener('click',function(){refresh.disabled=true;refresh.textContent='Refreshing...';refreshProfile().finally(function(){refresh.disabled=false;refresh.textContent='Refresh account';});});var signOut=byId('settingsSignOut');if(signOut)signOut.addEventListener('click',function(){if(window.rankforgeAuth&&window.rankforgeAuth.logout)window.rankforgeAuth.logout();});var save=byId('savePreferences');if(save)save.addEventListener('click',function(){savePrefs({country:clean(byId('prefCountry')&&byId('prefCountry').value),niche:clean(byId('prefNiche')&&byId('prefNiche').value),city:clean(byId('prefCity')&&byId('prefCity').value),saved_at:new Date().toISOString()});text('preferencesStatus','Preferences saved on this browser.');});var setup=byId('openSetupButton');if(setup)setup.addEventListener('click',function(){localStorage.removeItem('rankforge-dashboard-first-run-complete-v1');window.location.href='../dashboard/?setup=open';});window.addEventListener('rankforge:user-profile-resolved',render);}
  function start(){bind();refreshProfile();setTimeout(render,1200);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
